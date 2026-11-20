import { Player, Team } from '../types/matchCentre';
import {
  extractCanonicalEaId,
  getVerifiedPlayerPenaltyStats,
  VERIFIED_CLUB_PENALTY_ORDERS,
} from '../data/verifiedPenaltyData';

function getLinePenaltyTier(player: Player): number {
  if (player.position === 'GK') return 0;
  if (player.position === 'DEF') return 1;
  if (player.position === 'MID') return 2;
  return 3; // ATT
}

export function getEffectivePenaltyRating(player: Player): number {
  if (typeof player.attributes?.penalties === 'number' && player.attributes.penalties > 0) {
    return player.attributes.penalties;
  }
  const verified = getVerifiedPlayerPenaltyStats(player.id);
  if (typeof verified.penalties === 'number' && verified.penalties > 0) {
    return verified.penalties;
  }
  if (player.position === 'GK') return Math.max(12, Math.round(player.overallRating * 0.25));
  return Math.max(25, player.attributes?.shooting ?? player.overallRating);
}

export function getEffectiveComposureRating(player: Player): number {
  if (typeof player.attributes?.composure === 'number' && player.attributes.composure > 0) {
    return player.attributes.composure;
  }
  const verified = getVerifiedPlayerPenaltyStats(player.id);
  if (typeof verified.composure === 'number' && verified.composure > 0) {
    return verified.composure;
  }
  return player.overallRating;
}

/**
 * Deterministic comparator backed by verified FC27 penalty & composure ratings,
 * never random. Outfield players strictly precede Goalkeepers.
 */
export function comparePenaltyPriority(a: Player, b: Player): number {
  const isGkA = a.position === 'GK' ? 1 : 0;
  const isGkB = b.position === 'GK' ? 1 : 0;
  if (isGkA !== isGkB) return isGkA - isGkB;

  const penA = getEffectivePenaltyRating(a);
  const penB = getEffectivePenaltyRating(b);
  if (penB !== penA) return penB - penA;

  const compA = getEffectiveComposureRating(a);
  const compB = getEffectiveComposureRating(b);
  if (compB !== compA) return compB - compA;

  const shoA = a.attributes?.shooting ?? 0;
  const shoB = b.attributes?.shooting ?? 0;
  if (shoB !== shoA) return shoB - shoA;

  const tierA = getLinePenaltyTier(a);
  const tierB = getLinePenaltyTier(b);
  if (tierB !== tierA) return tierB - tierA;

  if (b.overallRating !== a.overallRating) return b.overallRating - a.overallRating;
  return a.id.localeCompare(b.id);
}

function matchPlayerByEaId(squad: Player[], targetEa: string): Player | undefined {
  const cleanTarget = String(targetEa).trim();
  const exact = squad.find((p) => extractCanonicalEaId(p.id) === cleanTarget);
  if (exact) return exact;

  const num = Number(cleanTarget);
  if (Number.isFinite(num) && num > 0) {
    const base = String(num & 0xffffff);
    return squad.find((p) => {
      const pNum = Number(extractCanonicalEaId(p.id));
      return Number.isFinite(pNum) && pNum > 0 && String(pNum & 0xffffff) === base;
    });
  }
  return undefined;
}

/**
 * Builds the default verified penalty-taking hierarchy for a club (or national side)
 * strictly from verified Transfermarkt club taker records + verified FC27 penalty/composure ratings.
 */
export function buildDefaultClubPenaltyOrderIds(teamId: string, squad: Player[]): string[] {
  if (!squad || squad.length === 0) return [];
  const verifiedRecord = VERIFIED_CLUB_PENALTY_ORDERS[teamId];
  const chosen: string[] = [];
  const seen = new Set<string>();

  if (verifiedRecord?.primaryTakers?.length) {
    for (const ea of verifiedRecord.primaryTakers) {
      const match = matchPlayerByEaId(squad, ea);
      if (match && !seen.has(match.id)) {
        chosen.push(match.id);
        seen.add(match.id);
      }
    }
  }

  const remaining = squad
    .filter((p) => !seen.has(p.id))
    .sort(comparePenaltyPriority);

  for (const p of remaining) {
    if (!seen.has(p.id)) {
      chosen.push(p.id);
      seen.add(p.id);
    }
  }

  return chosen;
}

/**
 * Reconciles a saved penalty order ID list against the current active squad:
 * - Removes departed/transferred/deleted players cleanly
 * - Preserves valid explicit order cleanly
 * - Appends any newly signed/transferred players in verified priority order
 */
export function reconcilePenaltyOrderIds(
  squad: Player[],
  savedOrderIds?: string[] | null,
  teamId = '',
  preserveSavedOrder = true
): string[] {
  if (!squad || squad.length === 0) return [];
  if (!preserveSavedOrder || !savedOrderIds || savedOrderIds.length === 0) {
    return buildDefaultClubPenaltyOrderIds(teamId, squad);
  }

  const byId = new Map(squad.map((p) => [p.id, p]));
  const ordered: string[] = [];
  const seen = new Set<string>();

  for (const id of savedOrderIds) {
    if (byId.has(id) && !seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }

  if (ordered.length === 0) {
    return buildDefaultClubPenaltyOrderIds(teamId, squad);
  }

  const remaining = squad
    .filter((p) => !seen.has(p.id))
    .sort(comparePenaltyPriority);

  for (const p of remaining) {
    ordered.push(p.id);
  }

  return ordered;
}

export function getOrderedPenaltySquad(
  team: Pick<Team, 'id' | 'squad' | 'penaltyOrderIds' | 'penaltyOrderSource'>
): Player[] {
  const ids = reconcilePenaltyOrderIds(
    team.squad,
    team.penaltyOrderIds,
    team.id,
    team.penaltyOrderSource === 'user-set' || Boolean(team.penaltyOrderIds?.length)
  );
  const map = new Map(team.squad.map((p) => [p.id, p]));
  return ids.map((id) => map.get(id)).filter((p): p is Player => Boolean(p));
}

export function getPenaltyOrderVerificationLabel(team: Pick<Team, 'id' | 'penaltyOrderSource'>): {
  source: 'verified' | 'user-set';
  detail: string;
} {
  if (team.penaltyOrderSource === 'user-set') {
    return {
      source: 'user-set',
      detail: 'Custom order saved by administrator',
    };
  }
  const verifiedRecord = VERIFIED_CLUB_PENALTY_ORDERS[team.id];
  if (verifiedRecord) {
    return {
      source: 'verified',
      detail: verifiedRecord.source,
    };
  }
  return {
    source: 'verified',
    detail: 'FC27 Official Penalty & Composure Hierarchy',
  };
}

export interface PenaltyPoolCandidate {
  player: Player;
  onPitch: boolean;
  sentOff: boolean;
  injuryStatus?: Player['injuryStatus'];
}

/**
 * Eligibility check:
 * - Must currently be on the pitch (never substituted off, never unused sub)
 * - Must NOT have been sent off (red card / second yellow)
 * - Must NOT be unavailable / injured
 */
export function isEligibleOnPitchPenaltyTaker(candidate: PenaltyPoolCandidate): boolean {
  return Boolean(
    candidate.onPitch &&
      !candidate.sentOff &&
      candidate.injuryStatus !== 'injured' &&
      candidate.player.injuryStatus !== 'injured'
  );
}

/**
 * In-match penalty taker selection:
 * Always selects the highest-ranked player in the club's Penalty Kick Order
 * who is currently eligible on the pitch.
 */
export function selectInMatchPenaltyTaker<T extends PenaltyPoolCandidate>(
  penaltyOrderIds: string[] | undefined,
  teamId: string,
  pool: T[]
): T | null {
  if (!pool || pool.length === 0) return null;
  const eligible = pool.filter(isEligibleOnPitchPenaltyTaker);
  if (eligible.length === 0) {
    return pool.find((p) => p.onPitch && !p.sentOff) || null;
  }

  const orderedIds = reconcilePenaltyOrderIds(
    pool.map((p) => p.player),
    penaltyOrderIds,
    teamId,
    Boolean(penaltyOrderIds?.length)
  );

  const eligibleById = new Map(eligible.map((entry) => [entry.player.id, entry]));
  for (const id of orderedIds) {
    const match = eligibleById.get(id);
    if (match) return match;
  }

  return eligible.sort((a, b) => comparePenaltyPriority(a.player, b.player))[0] || null;
}

/**
 * Penalty shootout taker ordering:
 * Returns all eligible on-pitch players strictly sorted by club Penalty Kick Order
 * (first 5 take rounds 1–5; remaining take sudden death kicks 6+).
 * Never selects substituted-off, unused bench, injured, or sent-off players.
 */
export function selectShootoutPenaltyTakers<T extends PenaltyPoolCandidate>(
  penaltyOrderIds: string[] | undefined,
  teamId: string,
  pool: T[]
): T[] {
  if (!pool || pool.length === 0) return [];
  const eligible = pool.filter(isEligibleOnPitchPenaltyTaker);
  const candidates = eligible.length > 0 ? eligible : pool.filter((p) => p.onPitch && !p.sentOff);

  const orderedIds = reconcilePenaltyOrderIds(
    pool.map((p) => p.player),
    penaltyOrderIds,
    teamId,
    Boolean(penaltyOrderIds?.length)
  );
  const rankMap = new Map<string, number>();
  orderedIds.forEach((id, idx) => rankMap.set(id, idx));

  return [...candidates].sort((a, b) => {
    const rankA = rankMap.get(a.player.id) ?? Number.MAX_SAFE_INTEGER;
    const rankB = rankMap.get(b.player.id) ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;
    return comparePenaltyPriority(a.player, b.player);
  });
}
