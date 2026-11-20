import {
  BallonDorWin,
  FreeAgentPlayer,
  getPlayerDisplayName,
  getTeamType,
  Player,
  PlayerClubRegistration,
  PlayerIdentity,
  PlayerMatchAppearanceSummary,
  PlayerNationalRegistration,
  PlayerProfileView,
  resolvePlayerAge,
  Team,
  TeamTypeCode,
} from '../types/matchCentre';
import { getCountryMetadata, normalizeCountryName } from './countryMetadata';
import type { SimulationMatchRecord } from '../../server/types';
import {
  generateStrictStartingXi,
  selectBestFormationAndXiForSquad,
} from '../components/matchCentre/dossier/dossierUtils';

export interface RegistryDeltaState {
  playerIdentityOverrides?: Record<string, PlayerIdentity>;
  deletedPlayerIdentityIds?: string[];
  clubRegistrations?: PlayerClubRegistration[];
  nationalRegistrations?: PlayerNationalRegistration[];
}

export interface CanonicalRegistry {
  identities: Map<string, PlayerIdentity>;
  clubRegistrations: Map<string, PlayerClubRegistration>;
  nationalRegistrations: Map<string, PlayerNationalRegistration>;
}

export interface MutationResult<T = unknown> {
  ok: boolean;
  status: number;
  error?: string;
  data?: T;
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function playerToIdentity(
  p: Player,
  gender: 'men' | 'women' = 'men'
): PlayerIdentity {
  const displayNickname = (p.nickname && p.nickname.trim()) || p.name;
  const dateOfBirth = p.dateOfBirth?.trim() || undefined;
  return {
    id: p.id,
    name: displayNickname,
    nickname: displayNickname,
    shortName: p.shortName,
    fullName: (p.fullName && p.fullName.trim()) || p.name,
    age: resolvePlayerAge(dateOfBirth, p.age),
    dateOfBirth,
    nationality: normalizeCountryName(p.nationality),
    gender: p.gender || gender,
    position: p.position,
    positionDetail: p.positionDetail,
    overallRating: p.overallRating,
    attributes: { ...p.attributes },
    gkAttributes: p.gkAttributes ? { ...p.gkAttributes } : undefined,
    portraitUrl: p.portraitUrl,
    injuryStatus: p.injuryStatus || 'fit',
    injuryNote: p.injuryNote,
    injuryReturnDate: p.injuryReturnDate,
    injuryHistory: [],
    ballonDorWins: [],
    internationalRetired: Boolean(p.internationalRetired),
    internationalRetiredAt: p.internationalRetiredAt,
  };
}

export function identityToTeamPlayer(
  identity: PlayerIdentity,
  reg: {
    shirtNumber: number | null;
    isCaptain: boolean;
    isViceCaptain: boolean;
    captainSince?: string;
    viceCaptainSince?: string;
  }
): Player {
  const displayNickname = (identity.nickname && identity.nickname.trim()) || identity.name;
  const dateOfBirth = identity.dateOfBirth?.trim() || undefined;
  return {
    id: identity.id,
    name: displayNickname,
    nickname: displayNickname,
    shortName: identity.shortName,
    fullName: identity.fullName || identity.name,
    position: identity.position,
    positionDetail: identity.positionDetail,
    overallRating: identity.overallRating,
    nationality: identity.nationality,
    gender: identity.gender,
    shirtNumber: reg.shirtNumber ?? 99,
    age: resolvePlayerAge(dateOfBirth, identity.age),
    dateOfBirth,
    portraitUrl: identity.portraitUrl,
    isCaptain: reg.isCaptain,
    isViceCaptain: reg.isViceCaptain,
    captainSince: reg.captainSince,
    viceCaptainSince: reg.viceCaptainSince,
    injuryStatus: identity.injuryStatus || 'fit',
    injuryNote: identity.injuryNote,
    injuryReturnDate: identity.injuryReturnDate,
    internationalRetired: Boolean(identity.internationalRetired),
    internationalRetiredAt: identity.internationalRetiredAt,
    attributes: { ...identity.attributes },
    gkAttributes: identity.gkAttributes ? { ...identity.gkAttributes } : undefined,
  };
}

/**
 * Builds the unified canonical registry from base teams + free agents + persisted deltas.
 * Guarantees 1 permanent PlayerIdentity per player ID and strictly separated Club vs National registration tables.
 */
export function buildCanonicalRegistry(params: {
  teams: Team[];
  freeAgents?: FreeAgentPlayer[];
  seededNationalRegistrations?: PlayerNationalRegistration[];
  delta?: RegistryDeltaState;
}): CanonicalRegistry {
  const { teams, freeAgents = [], seededNationalRegistrations = [], delta = {} } = params;
  const identities = new Map<string, PlayerIdentity>();
  const clubRegistrations = new Map<string, PlayerClubRegistration>();
  const nationalRegistrations = new Map<string, PlayerNationalRegistration>();
  const deletedSet = new Set(delta.deletedPlayerIdentityIds || []);

  // 1. Seed permanent identities & club registrations from all clubs
  for (const team of teams) {
    const tType = getTeamType(team);
    if (tType === 'club') {
      for (const p of team.squad) {
        if (deletedSet.has(p.id)) continue;
        if (!identities.has(p.id)) {
          identities.set(p.id, playerToIdentity(p, team.gender));
        }
        const regId = `creg-${team.id}-${p.id}`;
        const isCap = Boolean(team.captainId ? team.captainId === p.id : p.isCaptain);
        const isVc = Boolean(
          team.viceCaptainId ? team.viceCaptainId === p.id && !isCap : p.isViceCaptain && !isCap
        );
        clubRegistrations.set(regId, {
          id: regId,
          playerId: p.id,
          teamId: team.id,
          teamName: team.name,
          teamCode: team.code,
          teamCrestUrl: team.crestUrl,
          team_type: 'club',
          status: 'active',
          shirtNumber: p.shirtNumber || null,
          isCaptain: isCap,
          isViceCaptain: isVc,
          captainSince: isCap ? p.captainSince || team.captainSince || '2024-08-01' : undefined,
          viceCaptainSince: isVc
            ? p.viceCaptainSince || team.viceCaptainSince || '2024-08-01'
            : undefined,
          joinedAt: '2024-08-01',
          appearances: 0,
          goals: 0,
          assists: 0,
        });
      }
    }
  }

  // 2. Seed permanent identities for unattached Free Agents (+ their verified previousClub as former)
  for (const fa of freeAgents) {
    if (deletedSet.has(fa.id)) continue;
    if (!identities.has(fa.id)) {
      identities.set(fa.id, playerToIdentity(fa, fa.gender || 'men'));
    }
    if (fa.previousClub) {
      const prevRegId = `creg-former-${fa.id}`;
      if (!clubRegistrations.has(prevRegId)) {
        clubRegistrations.set(prevRegId, {
          id: prevRegId,
          playerId: fa.id,
          teamId: '',
          teamName: fa.previousClub,
          team_type: 'club',
          status: 'former',
          shirtNumber: fa.shirtNumber || null,
          isCaptain: false,
          isViceCaptain: false,
          joinedAt: undefined,
          leftAt: fa.joinedFreeAgency || '2024-07-01',
          appearances: 0,
          goals: 0,
          assists: 0,
        });
      }
    }
  }

  // 3. Seed National Registrations (seeded records + any non-seeded/custom national team squads)
  const seededNationalPairs = new Set<string>();
  for (const reg of seededNationalRegistrations) {
    if (deletedSet.has(reg.playerId)) continue;
    seededNationalPairs.add(`${reg.teamId}::${reg.playerId}`);
    nationalRegistrations.set(reg.id, { ...reg, team_type: 'country' });
  }

  for (const team of teams) {
    if (getTeamType(team) !== 'country') continue;
    for (const p of team.squad) {
      if (deletedSet.has(p.id)) continue;
      if (!identities.has(p.id)) {
        identities.set(p.id, playerToIdentity(p, team.gender));
      }
      if (seededNationalPairs.has(`${team.id}::${p.id}`)) continue;
      const regId = `nreg-${team.id}-${p.id}`;
      if (nationalRegistrations.has(regId)) continue;
      const isCap = Boolean(team.captainId ? team.captainId === p.id : p.isCaptain);
      const isVc = Boolean(
        team.viceCaptainId ? team.viceCaptainId === p.id && !isCap : p.isViceCaptain && !isCap
      );
      nationalRegistrations.set(regId, {
        id: regId,
        playerId: p.id,
        teamId: team.id,
        teamName: team.name,
        teamCode: team.code,
        teamCountry: team.country,
        teamFlag: team.flag,
        teamCrestUrl: team.crestUrl,
        confederation: team.confederation,
        team_type: 'country',
        status: 'called_up',
        shirtNumber: p.shirtNumber || null,
        isCaptain: isCap,
        isViceCaptain: isVc,
        captainSince: isCap ? p.captainSince || team.captainSince || '2024-09-01' : undefined,
        viceCaptainSince: isVc
          ? p.viceCaptainSince || team.viceCaptainSince || '2024-09-01'
          : undefined,
        calledUpAt: '2024-09-01',
        appearances: 0,
        goals: 0,
        assists: 0,
      });
    }
  }

  // 4. Apply persisted Identity overrides & custom-created identities
  if (delta.playerIdentityOverrides) {
    for (const [id, override] of Object.entries(delta.playerIdentityOverrides)) {
      if (deletedSet.has(id)) continue;
      const base = identities.get(id);
      const resolvedNickname =
        (override.nickname && override.nickname.trim()) ||
        (override.name && override.name !== base?.fullName ? override.name.trim() : '') ||
        (base?.nickname && base.nickname.trim()) ||
        override.name ||
        base?.name ||
        '';
      const resolvedFullName =
        (override.fullName && override.fullName.trim()) ||
        (base?.fullName && base.fullName.trim()) ||
        override.name ||
        base?.name ||
        resolvedNickname;
      const resolvedDob =
        typeof override.dateOfBirth === 'string'
          ? override.dateOfBirth.trim() || undefined
          : base?.dateOfBirth;
      identities.set(id, {
        ...(base || ({} as PlayerIdentity)),
        ...override,
        id,
        name: resolvedNickname,
        nickname: resolvedNickname,
        fullName: resolvedFullName,
        dateOfBirth: resolvedDob,
        age: resolvePlayerAge(resolvedDob, override.age ?? base?.age),
        nationality: normalizeCountryName(override.nationality || base?.nationality || 'International'),
        ballonDorWins: Array.isArray(override.ballonDorWins)
          ? override.ballonDorWins
          : base?.ballonDorWins || [],
      });
    }
  }

  // 5. Apply persisted Club Registration deltas
  if (Array.isArray(delta.clubRegistrations)) {
    for (const reg of delta.clubRegistrations) {
      if (deletedSet.has(reg.playerId)) continue;
      if ((reg as PlayerClubRegistration & { _deleted?: boolean })._deleted) {
        clubRegistrations.delete(reg.id);
        continue;
      }
      clubRegistrations.set(reg.id, { ...reg, team_type: 'club' });
    }
  }

  // 6. Apply persisted National Registration deltas
  if (Array.isArray(delta.nationalRegistrations)) {
    for (const reg of delta.nationalRegistrations) {
      if (deletedSet.has(reg.playerId)) continue;
      if ((reg as PlayerNationalRegistration & { _deleted?: boolean })._deleted) {
        nationalRegistrations.delete(reg.id);
        continue;
      }
      nationalRegistrations.set(reg.id, { ...reg, team_type: 'country' });
    }
  }

  return { identities, clubRegistrations, nationalRegistrations };
}

export function getClubRegistrationsForPlayer(
  registry: CanonicalRegistry,
  playerId: string
): PlayerClubRegistration[] {
  const list: PlayerClubRegistration[] = [];
  for (const reg of registry.clubRegistrations.values()) {
    if (reg.playerId === playerId) list.push(reg);
  }
  return list.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
    return (b.joinedAt || '').localeCompare(a.joinedAt || '');
  });
}

export function getNationalRegistrationsForPlayer(
  registry: CanonicalRegistry,
  playerId: string
): PlayerNationalRegistration[] {
  const list: PlayerNationalRegistration[] = [];
  for (const reg of registry.nationalRegistrations.values()) {
    if (reg.playerId === playerId) list.push(reg);
  }
  return list.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'called_up' ? -1 : 1;
    return (b.calledUpAt || '').localeCompare(a.calledUpAt || '');
  });
}

export function getActiveRegistrationsForTeam(
  registry: CanonicalRegistry,
  team: Pick<Team, 'id' | 'type' | 'team_type'>
): Array<PlayerClubRegistration | PlayerNationalRegistration> {
  const tType = getTeamType(team);
  if (tType === 'club') {
    const out: PlayerClubRegistration[] = [];
    for (const reg of registry.clubRegistrations.values()) {
      if (reg.teamId === team.id && reg.status === 'active') {
        out.push(reg);
      }
    }
    return out;
  }
  const out: PlayerNationalRegistration[] = [];
  for (const reg of registry.nationalRegistrations.values()) {
    if (reg.teamId === team.id && reg.status === 'called_up') {
      out.push(reg);
    }
  }
  return out;
}

function pickAvailableShirtNumber(used: Set<number>, preferred?: number | null): number {
  if (preferred && preferred >= 1 && preferred <= 99 && !used.has(preferred)) {
    return preferred;
  }
  for (let n = 1; n <= 99; n++) {
    if (!used.has(n)) return n;
  }
  return 99;
}

/**
 * Registers an existing player to a club or national team strictly using team.team_type.
 * - Club ('club'): enforces max 1 active club registration at a time.
 * - Country ('country'): calls up player independently while keeping active club untouched.
 */
export function registerPlayerToTeam(
  registry: CanonicalRegistry,
  params: {
    playerId: string;
    team: Team;
    shirtNumber?: number | null;
    isCaptain?: boolean;
    isViceCaptain?: boolean;
    joinedOrCalledUpAt?: string;
  }
): MutationResult<PlayerClubRegistration | PlayerNationalRegistration> {
  const { playerId, team, shirtNumber, isCaptain = false, isViceCaptain = false } = params;
  const identity = registry.identities.get(playerId);
  if (!identity) {
    return { ok: false, status: 404, error: 'Permanent player identity not found.' };
  }

  if (identity.gender !== team.gender) {
    return {
      ok: false,
      status: 400,
      error: `Category mismatch: ${identity.name} (${identity.gender}) cannot be registered to a ${team.gender}'s team.`,
    };
  }

  const teamType: TeamTypeCode = getTeamType(team);
  const activeForTeam = getActiveRegistrationsForTeam(registry, team);
  const usedNumbers = new Set(
    activeForTeam.map((r) => r.shirtNumber).filter((n): n is number => typeof n === 'number')
  );

  if (shirtNumber !== undefined && shirtNumber !== null) {
    if (!Number.isInteger(shirtNumber) || shirtNumber < 1 || shirtNumber > 99) {
      return { ok: false, status: 400, error: 'Shirt number must be between 1 and 99.' };
    }
    if (usedNumbers.has(shirtNumber)) {
      return {
        ok: false,
        status: 409,
        error: `Shirt number #${shirtNumber} is already taken in ${team.name}.`,
      };
    }
  }

  const resolvedNumber = pickAvailableShirtNumber(usedNumbers, shirtNumber);
  const today = params.joinedOrCalledUpAt || todayIsoDate();

  if (teamType === 'club') {
    const existingActiveClub = getClubRegistrationsForPlayer(registry, playerId).find(
      (r) => r.status === 'active'
    );
    if (existingActiveClub) {
      if (existingActiveClub.teamId === team.id) {
        return {
          ok: false,
          status: 409,
          error: `${identity.name} is already actively registered at ${team.name}.`,
        };
      }
      return {
        ok: false,
        status: 409,
        error: `${identity.name} already holds an active club registration at ${existingActiveClub.teamName}. Use a club-to-club transfer or release first.`,
      };
    }

    if (isCaptain) {
      for (const r of activeForTeam) {
        if (r.isCaptain) {
          r.isCaptain = false;
        }
      }
    }
    if (isViceCaptain) {
      for (const r of activeForTeam) {
        if (r.isViceCaptain) {
          r.isViceCaptain = false;
        }
      }
    }

    const regId = `creg-${team.id}-${playerId}`;
    const reg: PlayerClubRegistration = {
      id: regId,
      playerId,
      teamId: team.id,
      teamName: team.name,
      teamCode: team.code,
      teamCrestUrl: team.crestUrl,
      team_type: 'club',
      status: 'active',
      shirtNumber: resolvedNumber,
      isCaptain,
      isViceCaptain: isCaptain ? false : isViceCaptain,
      captainSince: isCaptain ? today : undefined,
      viceCaptainSince: !isCaptain && isViceCaptain ? today : undefined,
      joinedAt: today,
      appearances: 0,
      goals: 0,
      assists: 0,
    };
    registry.clubRegistrations.set(regId, reg);
    return { ok: true, status: 201, data: reg };
  }

  // National team registration (team_type === 'country')
  const existingNational = getNationalRegistrationsForPlayer(registry, playerId).find(
    (r) => r.teamId === team.id && r.status === 'called_up'
  );
  if (existingNational) {
    return {
      ok: false,
      status: 409,
      error: `${identity.name} is already called up for ${team.name}.`,
    };
  }

  if (isCaptain) {
    for (const r of activeForTeam) {
      if (r.isCaptain) r.isCaptain = false;
    }
  }
  if (isViceCaptain) {
    for (const r of activeForTeam) {
      if (r.isViceCaptain) r.isViceCaptain = false;
    }
  }

  const regId = `nreg-${team.id}-${playerId}`;
  const meta = getCountryMetadata(team.country);
  const reg: PlayerNationalRegistration = {
    id: regId,
    playerId,
    teamId: team.id,
    teamName: team.name,
    teamCode: team.code,
    teamCountry: team.country,
    teamFlag: team.flag || meta?.flag,
    teamCrestUrl: team.crestUrl,
    confederation: team.confederation || meta?.confederation,
    team_type: 'country',
    status: 'called_up',
    shirtNumber: resolvedNumber,
    isCaptain,
    isViceCaptain: isCaptain ? false : isViceCaptain,
    captainSince: isCaptain ? today : undefined,
    viceCaptainSince: !isCaptain && isViceCaptain ? today : undefined,
    calledUpAt: today,
    appearances: 0,
    goals: 0,
    assists: 0,
  };
  registry.nationalRegistrations.set(regId, reg);
  return { ok: true, status: 201, data: reg };
}

/**
 * Strictly enforces club-only transfers (fromTeam.team_type === 'club' && toTeam.team_type === 'club').
 * Marks previous club registration as 'former', clears previous club captaincy, creates new active club
 * registration, and preserves any national team registrations and international captaincies intact.
 */
export function transferPlayerClubOnly(
  registry: CanonicalRegistry,
  params: {
    playerId: string;
    fromTeam: Team;
    toTeam: Team;
    shirtNumber?: number | null;
    transferDate?: string;
  }
): MutationResult<{ former: PlayerClubRegistration; current: PlayerClubRegistration }> {
  const { playerId, fromTeam, toTeam, shirtNumber } = params;
  if (getTeamType(fromTeam) !== 'club' || getTeamType(toTeam) !== 'club') {
    return {
      ok: false,
      status: 400,
      error: 'Transfers are strictly club-to-club only. National teams cannot participate in transfers.',
    };
  }
  if (fromTeam.id === toTeam.id) {
    return { ok: false, status: 400, error: 'Source club and destination club must be different.' };
  }

  const identity = registry.identities.get(playerId);
  if (!identity) {
    return { ok: false, status: 404, error: 'Player identity not found.' };
  }
  if (identity.gender !== toTeam.gender) {
    return {
      ok: false,
      status: 400,
      error: `Category mismatch: cannot transfer ${identity.gender} player to ${toTeam.gender} club.`,
    };
  }

  const activeClub = getClubRegistrationsForPlayer(registry, playerId).find(
    (r) => r.status === 'active' && r.teamId === fromTeam.id
  );
  if (!activeClub) {
    return {
      ok: false,
      status: 404,
      error: `${identity.name} does not have an active club registration at ${fromTeam.name}.`,
    };
  }

  const targetActive = getActiveRegistrationsForTeam(registry, toTeam);
  const usedTargetNumbers = new Set(
    targetActive.map((r) => r.shirtNumber).filter((n): n is number => typeof n === 'number')
  );
  if (shirtNumber !== undefined && shirtNumber !== null && usedTargetNumbers.has(shirtNumber)) {
    return {
      ok: false,
      status: 409,
      error: `Shirt number #${shirtNumber} is already assigned in ${toTeam.name}.`,
    };
  }

  const today = params.transferDate || todayIsoDate();

  // Close previous club registration cleanly without deleting or touching national registrations
  activeClub.status = 'former';
  activeClub.leftAt = today;
  activeClub.isCaptain = false;
  activeClub.isViceCaptain = false;

  const newRegId = `creg-${toTeam.id}-${playerId}-${Date.now().toString(36)}`;
  const newClubReg: PlayerClubRegistration = {
    id: newRegId,
    playerId,
    teamId: toTeam.id,
    teamName: toTeam.name,
    teamCode: toTeam.code,
    teamCrestUrl: toTeam.crestUrl,
    team_type: 'club',
    status: 'active',
    shirtNumber: pickAvailableShirtNumber(usedTargetNumbers, shirtNumber ?? activeClub.shirtNumber),
    isCaptain: false,
    isViceCaptain: false,
    joinedAt: today,
    appearances: 0,
    goals: 0,
    assists: 0,
  };
  registry.clubRegistrations.set(newRegId, newClubReg);

  return { ok: true, status: 200, data: { former: activeClub, current: newClubReg } };
}

/**
 * Releases a player ONLY from the specified team (club or national) based on team.team_type.
 * Preserves the permanent PlayerIdentity and keeps the other registration table intact.
 */
export function releasePlayerFromTeam(
  registry: CanonicalRegistry,
  params: {
    playerId: string;
    team: Team;
    releasedAt?: string;
  }
): MutationResult<PlayerClubRegistration | PlayerNationalRegistration> {
  const { playerId, team } = params;
  const tType = getTeamType(team);
  const today = params.releasedAt || todayIsoDate();

  if (tType === 'club') {
    const reg = getClubRegistrationsForPlayer(registry, playerId).find(
      (r) => r.teamId === team.id && r.status === 'active'
    );
    if (!reg) {
      return { ok: false, status: 404, error: 'Active club registration not found.' };
    }
    reg.status = 'former';
    reg.leftAt = today;
    reg.isCaptain = false;
    reg.isViceCaptain = false;
    return { ok: true, status: 200, data: reg };
  }

  const reg = getNationalRegistrationsForPlayer(registry, playerId).find(
    (r) => r.teamId === team.id && r.status === 'called_up'
  );
  if (!reg) {
    return { ok: false, status: 404, error: 'Active national-team registration not found.' };
  }
  reg.status = 'former';
  reg.leftAt = today;
  reg.isCaptain = false;
  reg.isViceCaptain = false;
  return { ok: true, status: 200, data: reg };
}

/**
 * Retires a player from international / national team duty while preserving their
 * permanent PlayerIdentity, club registrations, and historical caps/goals.
 */
export function retirePlayerFromNation(
  registry: CanonicalRegistry,
  params: {
    playerId: string;
    retiredAt?: string;
  }
): MutationResult<{ identity: PlayerIdentity; releasedRegistrations: PlayerNationalRegistration[] }> {
  const { playerId } = params;
  const identity = registry.identities.get(playerId);
  if (!identity) {
    return { ok: false, status: 404, error: 'Player identity not found.' };
  }

  const today = params.retiredAt || todayIsoDate();
  const releasedRegistrations: PlayerNationalRegistration[] = [];

  for (const reg of registry.nationalRegistrations.values()) {
    if (reg.playerId === playerId && (reg.status === 'called_up' || reg.status === 'standby')) {
      reg.status = 'former';
      reg.leftAt = today;
      reg.isCaptain = false;
      reg.isViceCaptain = false;
      releasedRegistrations.push(reg);
    }
  }

  const updatedIdentity: PlayerIdentity = {
    ...identity,
    internationalRetired: true,
    internationalRetiredAt: today,
    updatedAt: new Date().toISOString(),
  };
  registry.identities.set(playerId, updatedIdentity);

  return {
    ok: true,
    status: 200,
    data: { identity: updatedIdentity, releasedRegistrations },
  };
}

/**
 * Ends international retirement for a player (optionally keeps former spells as-is until called up).
 */
export function unretirePlayerFromNation(
  registry: CanonicalRegistry,
  playerId: string
): MutationResult<PlayerIdentity> {
  const identity = registry.identities.get(playerId);
  if (!identity) {
    return { ok: false, status: 404, error: 'Player identity not found.' };
  }
  const updatedIdentity: PlayerIdentity = {
    ...identity,
    internationalRetired: false,
    internationalRetiredAt: undefined,
    updatedAt: new Date().toISOString(),
  };
  registry.identities.set(playerId, updatedIdentity);
  return { ok: true, status: 200, data: updatedIdentity };
}

/**
 * Changes a player's nationality and optionally switches their national team call-up
 * to the new nation's squad (releasing any active call-up for another country).
 */
export function changePlayerNation(
  registry: CanonicalRegistry,
  params: {
    playerId: string;
    newNationality: string;
    newNationalTeam?: Team | null;
    switchNationalSquad?: boolean;
    shirtNumber?: number | null;
    effectiveDate?: string;
  }
): MutationResult<{
  identity: PlayerIdentity;
  modifiedNationalRegistrations: PlayerNationalRegistration[];
}> {
  const { playerId, newNationality, newNationalTeam, switchNationalSquad = true, shirtNumber } = params;
  const identity = registry.identities.get(playerId);
  if (!identity) {
    return { ok: false, status: 404, error: 'Player identity not found.' };
  }
  const normalizedCountry = normalizeCountryName(newNationality.trim());
  if (!normalizedCountry) {
    return { ok: false, status: 400, error: 'Valid destination nation is required.' };
  }

  if (newNationalTeam && getTeamType(newNationalTeam) !== 'country') {
    return { ok: false, status: 400, error: 'Selected team must be a national team.' };
  }
  if (newNationalTeam && newNationalTeam.gender !== identity.gender) {
    return {
      ok: false,
      status: 400,
      error: `Category mismatch: ${identity.name} (${identity.gender}) cannot join ${newNationalTeam.name} (${newNationalTeam.gender}).`,
    };
  }

  const today = params.effectiveDate || todayIsoDate();
  const modifiedNationalRegistrations: PlayerNationalRegistration[] = [];

  if (switchNationalSquad) {
    // End active call-ups for any other national team
    for (const reg of registry.nationalRegistrations.values()) {
      if (
        reg.playerId === playerId &&
        (reg.status === 'called_up' || reg.status === 'standby') &&
        (!newNationalTeam || reg.teamId !== newNationalTeam.id)
      ) {
        reg.status = 'former';
        reg.leftAt = today;
        reg.isCaptain = false;
        reg.isViceCaptain = false;
        modifiedNationalRegistrations.push(reg);
      }
    }

    if (newNationalTeam) {
      const existingSame = getNationalRegistrationsForPlayer(registry, playerId).find(
        (r) => r.teamId === newNationalTeam.id
      );
      const activeForTarget = getActiveRegistrationsForTeam(registry, newNationalTeam);
      const usedNumbers = new Set(
        activeForTarget
          .filter((r) => r.playerId !== playerId)
          .map((r) => r.shirtNumber)
          .filter((n): n is number => typeof n === 'number')
      );

      if (shirtNumber !== undefined && shirtNumber !== null) {
        if (!Number.isInteger(shirtNumber) || shirtNumber < 1 || shirtNumber > 99) {
          return { ok: false, status: 400, error: 'Shirt number must be between 1 and 99.' };
        }
        if (usedNumbers.has(shirtNumber)) {
          return {
            ok: false,
            status: 409,
            error: `Shirt number #${shirtNumber} is already taken in ${newNationalTeam.name}.`,
          };
        }
      }

      if (existingSame) {
        existingSame.status = 'called_up';
        existingSame.leftAt = undefined;
        existingSame.calledUpAt = existingSame.calledUpAt || today;
        existingSame.shirtNumber = pickAvailableShirtNumber(
          usedNumbers,
          shirtNumber ?? existingSame.shirtNumber
        );
        modifiedNationalRegistrations.push(existingSame);
      } else {
        const meta = getCountryMetadata(newNationalTeam.country);
        const regId = `nreg-${newNationalTeam.id}-${playerId}`;
        const reg: PlayerNationalRegistration = {
          id: regId,
          playerId,
          teamId: newNationalTeam.id,
          teamName: newNationalTeam.name,
          teamCode: newNationalTeam.code,
          teamCountry: newNationalTeam.country,
          teamFlag: newNationalTeam.flag || meta?.flag,
          teamCrestUrl: newNationalTeam.crestUrl,
          confederation: newNationalTeam.confederation || meta?.confederation,
          team_type: 'country',
          status: 'called_up',
          shirtNumber: pickAvailableShirtNumber(usedNumbers, shirtNumber),
          isCaptain: false,
          isViceCaptain: false,
          calledUpAt: today,
          appearances: 0,
          goals: 0,
          assists: 0,
        };
        registry.nationalRegistrations.set(regId, reg);
        modifiedNationalRegistrations.push(reg);
      }
    }
  }

  const updatedIdentity: PlayerIdentity = {
    ...identity,
    nationality: normalizedCountry,
    ...(switchNationalSquad && newNationalTeam
      ? { internationalRetired: false, internationalRetiredAt: undefined }
      : {}),
    updatedAt: new Date().toISOString(),
  };
  registry.identities.set(playerId, updatedIdentity);

  return {
    ok: true,
    status: 200,
    data: { identity: updatedIdentity, modifiedNationalRegistrations },
  };
}

/**
 * Updates shirt number, independent team captaincy, status, or registration stats on a single
 * registration (club OR national) without affecting the other registration table.
 */
export function updateTeamRegistration(
  registry: CanonicalRegistry,
  params: {
    registrationId: string;
    teamType: TeamTypeCode;
    team?: Team;
    patch: {
      shirtNumber?: number | null;
      isCaptain?: boolean;
      isViceCaptain?: boolean;
      status?: 'active' | 'former' | 'called_up' | 'standby';
      appearances?: number;
      goals?: number;
      assists?: number;
    };
  }
): MutationResult<PlayerClubRegistration | PlayerNationalRegistration> {
  const { registrationId, teamType, team, patch } = params;
  const table =
    teamType === 'club'
      ? (registry.clubRegistrations as Map<string, PlayerClubRegistration | PlayerNationalRegistration>)
      : (registry.nationalRegistrations as Map<string, PlayerClubRegistration | PlayerNationalRegistration>);

  const reg = table.get(registrationId);
  if (!reg) {
    return { ok: false, status: 404, error: `${teamType} registration not found.` };
  }

  if (patch.shirtNumber !== undefined && patch.shirtNumber !== null) {
    if (!Number.isInteger(patch.shirtNumber) || patch.shirtNumber < 1 || patch.shirtNumber > 99) {
      return { ok: false, status: 400, error: 'Shirt number must be between 1 and 99.' };
    }
    // Check uniqueness within the same team
    const isActiveStatus =
      teamType === 'club' ? reg.status === 'active' : reg.status === 'called_up';
    if (isActiveStatus) {
      for (const peer of table.values()) {
        const peerActive =
          teamType === 'club' ? peer.status === 'active' : peer.status === 'called_up';
        if (
          peer.id !== reg.id &&
          peer.teamId === reg.teamId &&
          peerActive &&
          peer.shirtNumber === patch.shirtNumber
        ) {
          return {
            ok: false,
            status: 409,
            error: `Duplicate shirt number #${patch.shirtNumber} is already worn by another player in ${team?.name || reg.teamName}.`,
          };
        }
      }
    }
    reg.shirtNumber = patch.shirtNumber;
  }

  const today = todayIsoDate();

  if (patch.isCaptain === true) {
    for (const peer of table.values()) {
      if (peer.teamId === reg.teamId && peer.id !== reg.id && peer.isCaptain) {
        peer.isCaptain = false;
      }
    }
    reg.isCaptain = true;
    reg.isViceCaptain = false;
    reg.captainSince = reg.captainSince || today;
  } else if (patch.isCaptain === false) {
    reg.isCaptain = false;
  }

  if (patch.isViceCaptain === true) {
    for (const peer of table.values()) {
      if (peer.teamId === reg.teamId && peer.id !== reg.id && peer.isViceCaptain) {
        peer.isViceCaptain = false;
      }
    }
    reg.isViceCaptain = true;
    if (reg.isCaptain) reg.isCaptain = false;
    reg.viceCaptainSince = reg.viceCaptainSince || today;
  } else if (patch.isViceCaptain === false) {
    reg.isViceCaptain = false;
  }

  if (patch.status) {
    if (teamType === 'club' && (patch.status === 'active' || patch.status === 'former')) {
      if (patch.status === 'active') {
        const otherActive = getClubRegistrationsForPlayer(registry, reg.playerId).find(
          (r) => r.status === 'active' && r.id !== reg.id
        );
        if (otherActive) {
          return {
            ok: false,
            status: 409,
            error: `Player already has an active club registration at ${otherActive.teamName}.`,
          };
        }
      }
      reg.status = patch.status;
    } else if (
      teamType === 'country' &&
      (patch.status === 'called_up' || patch.status === 'former' || patch.status === 'standby')
    ) {
      reg.status = patch.status;
    }
  }

  if (typeof patch.appearances === 'number' && patch.appearances >= 0) {
    reg.appearances = Math.floor(patch.appearances);
  }
  if (typeof patch.goals === 'number' && patch.goals >= 0) {
    reg.goals = Math.floor(patch.goals);
  }
  if (typeof patch.assists === 'number' && patch.assists >= 0) {
    reg.assists = Math.floor(patch.assists);
  }

  return { ok: true, status: 200, data: reg };
}

/**
 * Deletes a permanent PlayerIdentity ONLY when zero club and zero national registrations remain.
 * Enforces: "Never delete the player's identity while another registration exists."
 */
export function deletePlayerIdentitySafe(
  registry: CanonicalRegistry,
  playerId: string
): MutationResult<{ deletedId: string }> {
  const identity = registry.identities.get(playerId);
  if (!identity) {
    return { ok: false, status: 404, error: 'Player identity not found.' };
  }
  const clubRegs = getClubRegistrationsForPlayer(registry, playerId);
  const natRegs = getNationalRegistrationsForPlayer(registry, playerId);

  if (clubRegs.length > 0 || natRegs.length > 0) {
    return {
      ok: false,
      status: 409,
      error: `Cannot delete ${identity.name}'s identity while ${clubRegs.length} club registration(s) and ${natRegs.length} national-team registration(s) exist. Remove registrations first.`,
    };
  }

  registry.identities.delete(playerId);
  return { ok: true, status: 200, data: { deletedId: playerId } };
}

/**
 * Builds the comprehensive Player Profile dossier view for /match-centre/players/:id.
 */
export function buildPlayerProfileView(
  playerId: string,
  registry: CanonicalRegistry,
  teams: Team[],
  simulationMatches: SimulationMatchRecord[] = []
): PlayerProfileView | null {
  const identity = registry.identities.get(playerId);
  if (!identity) return null;

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const clubRegs = getClubRegistrationsForPlayer(registry, playerId).map((r) => {
    const team = r.teamId ? teamById.get(r.teamId) : undefined;
    return team
      ? {
          ...r,
          teamName: team.name,
          teamCode: team.code,
          teamCrestUrl: team.crestUrl,
        }
      : r;
  });

  const activeClub = clubRegs.find((r) => r.status === 'active') || null;
  const formerClubs = clubRegs.filter((r) => r.status === 'former');

  const nationalRegistrations = getNationalRegistrationsForPlayer(registry, playerId).map((r) => {
    const team = teamById.get(r.teamId);
    return team
      ? {
          ...r,
          teamName: team.name,
          teamCode: team.code,
          teamCountry: team.country,
          teamFlag: team.flag,
          teamCrestUrl: team.crestUrl,
          confederation: team.confederation,
        }
      : r;
  });

  // Aggregate simulated matches involving this player
  let simClubApps = 0;
  let simClubGoals = 0;
  let simClubAssists = 0;
  let simIntlApps = 0;
  let simIntlGoals = 0;
  let simIntlAssists = 0;
  const recentMatches: PlayerMatchAppearanceSummary[] = [];

  const lowerName = identity.name.toLowerCase();
  const lowerNickname = (identity.nickname || '').toLowerCase().trim();
  const lowerFull = (identity.fullName || '').toLowerCase().trim();
  const lowerShort = identity.shortName.toLowerCase();

  for (const m of simulationMatches) {
    if (m.status !== 'completed') continue;
    const homeTeam = teamById.get(m.homeTeamId);
    const awayTeam = teamById.get(m.awayTeamId);
    const playerEvents = (m.events || []).filter((ev) => {
      if (ev.playerId && ev.playerId === playerId) return true;
      const n = (ev.playerName || '').toLowerCase().trim();
      return (
        n === lowerName ||
        (lowerNickname && n === lowerNickname) ||
        (lowerFull && n === lowerFull) ||
        (lowerShort.length > 3 && n === lowerShort)
      );
    });
    const detailAssists = (m.events || []).filter((ev) => {
      if (ev.assistPlayerId && ev.assistPlayerId === playerId) return true;
      const aName = (ev.assistPlayerName || '').toLowerCase().trim();
      if (
        aName &&
        (aName === lowerName ||
          (lowerNickname && aName === lowerNickname) ||
          (lowerFull && aName === lowerFull))
      ) {
        return true;
      }
      const d = (ev.detail || '').toLowerCase();
      return (
        d.includes(lowerName) ||
        (lowerNickname && d.includes(lowerNickname)) ||
        (lowerFull && d.includes(lowerFull))
      );
    }).length;

    const hasExplicitLineups = Boolean(
      m.lineupPlayerIds && (m.lineupPlayerIds.home?.length || m.lineupPlayerIds.away?.length)
    );
    const playedHome = hasExplicitLineups
      ? Boolean(m.lineupPlayerIds?.home?.includes(playerId))
      : Boolean(homeTeam?.squad.some((p) => p.id === playerId)) ||
        playerEvents.some((ev) => ev.teamSide === 'home');
    const playedAway = hasExplicitLineups
      ? Boolean(m.lineupPlayerIds?.away?.includes(playerId))
      : Boolean(awayTeam?.squad.some((p) => p.id === playerId)) ||
        playerEvents.some((ev) => ev.teamSide === 'away');

    if (!playedHome && !playedAway && playerEvents.length === 0) continue;

    const side: 'home' | 'away' = playedAway && !playedHome ? 'away' : 'home';
    const matchTeam = side === 'home' ? homeTeam : awayTeam;
    const oppTeam = side === 'home' ? awayTeam : homeTeam;
    const mType: TeamTypeCode = matchTeam ? getTeamType(matchTeam) : 'club';
    const goalsScored = playerEvents.filter((ev) => ev.type === 'goal').length;

    if (mType === 'country') {
      simIntlApps++;
      simIntlGoals += goalsScored;
      simIntlAssists += detailAssists;
    } else {
      simClubApps++;
      simClubGoals += goalsScored;
      simClubAssists += detailAssists;
    }

    recentMatches.push({
      matchId: m.id,
      date: m.date,
      competitionName: m.competitionName,
      teamId: matchTeam?.id || (side === 'home' ? m.homeTeamId : m.awayTeamId),
      teamName: matchTeam?.name || (side === 'home' ? m.homeTeamName : m.awayTeamName),
      team_type: mType,
      opponentName: oppTeam?.name || (side === 'home' ? m.awayTeamName : m.homeTeamName),
      scoreline: `${m.homeScore} - ${m.awayScore}`,
      goals: goalsScored,
      assists: detailAssists,
    });
  }

  // Registration stat entries + legacy career baselines (explicitly never invented if 0)
  const regClubApps = clubRegs.reduce((s, r) => s + (r.appearances || 0), 0);
  const regClubGoals = clubRegs.reduce((s, r) => s + (r.goals || 0), 0);
  const regClubAssists = clubRegs.reduce((s, r) => s + (r.assists || 0), 0);

  const regIntlApps = nationalRegistrations.reduce((s, r) => s + (r.appearances || 0), 0);
  const regIntlGoals = nationalRegistrations.reduce((s, r) => s + (r.goals || 0), 0);
  const regIntlAssists = nationalRegistrations.reduce((s, r) => s + (r.assists || 0), 0);

  const legacyClubApps = (identity.legacyClubStats?.appearances || 0) + regClubApps;
  const legacyClubGoals = (identity.legacyClubStats?.goals || 0) + regClubGoals;
  const legacyClubAssists = (identity.legacyClubStats?.assists || 0) + regClubAssists;

  const legacyIntlApps = (identity.legacyInternationalStats?.appearances || 0) + regIntlApps;
  const legacyIntlGoals = (identity.legacyInternationalStats?.goals || 0) + regIntlGoals;
  const legacyIntlAssists = (identity.legacyInternationalStats?.assists || 0) + regIntlAssists;

  const clubTotalApps = legacyClubApps + simClubApps;
  const clubTotalGoals = legacyClubGoals + simClubGoals;
  const clubTotalAssists = legacyClubAssists + simClubAssists;

  const intlTotalApps = legacyIntlApps + simIntlApps;
  const intlTotalGoals = legacyIntlGoals + simIntlGoals;
  const intlTotalAssists = legacyIntlAssists + simIntlAssists;

  const captaincies = {
    club: clubRegs
      .filter((r) => r.isCaptain || r.isViceCaptain)
      .map((r) => ({
        registrationId: r.id,
        teamId: r.teamId,
        teamName: r.teamName,
        role: (r.isCaptain ? 'C' : 'VC') as 'C' | 'VC',
        since: r.isCaptain ? r.captainSince : r.viceCaptainSince,
        active: r.status === 'active',
      })),
    international: nationalRegistrations
      .filter((r) => r.isCaptain || r.isViceCaptain)
      .map((r) => ({
        registrationId: r.id,
        teamId: r.teamId,
        teamName: r.teamName,
        teamFlag: r.teamFlag,
        role: (r.isCaptain ? 'C' : 'VC') as 'C' | 'VC',
        since: r.isCaptain ? r.captainSince : r.viceCaptainSince,
        active: r.status === 'called_up',
      })),
  };

  return {
    identity,
    activeClub,
    formerClubs,
    nationalRegistrations,
    careerStats: {
      club: {
        appearances: clubTotalApps,
        goals: clubTotalGoals,
        assists: clubTotalAssists,
        legacyAppearances: legacyClubApps,
        legacyGoals: legacyClubGoals,
        legacyAssists: legacyClubAssists,
        simulatedAppearances: simClubApps,
        simulatedGoals: simClubGoals,
        simulatedAssists: simClubAssists,
        hasLegacyRecord:
          Boolean(identity.legacyClubStats && identity.legacyClubStats.appearances > 0) ||
          regClubApps > 0,
      },
      international: {
        appearances: intlTotalApps,
        goals: intlTotalGoals,
        assists: intlTotalAssists,
        legacyAppearances: legacyIntlApps,
        legacyGoals: legacyIntlGoals,
        legacyAssists: legacyIntlAssists,
        simulatedAppearances: simIntlApps,
        simulatedGoals: simIntlGoals,
        simulatedAssists: simIntlAssists,
        hasLegacyRecord:
          Boolean(
            identity.legacyInternationalStats && identity.legacyInternationalStats.appearances > 0
          ) || regIntlApps > 0,
      },
      overall: {
        appearances: clubTotalApps + intlTotalApps,
        goals: clubTotalGoals + intlTotalGoals,
        assists: clubTotalAssists + intlTotalAssists,
      },
      recentMatches: recentMatches.slice(0, 20),
    },
    captaincies,
    canDeleteIdentity: clubRegs.length === 0 && nationalRegistrations.length === 0,
  };
}

/**
 * Projects active registrations back onto team.squad arrays so every team page respects
 * separate club & national shirt numbers, captaincies, and updated player details.
 */
export function projectRegistryOntoTeams(
  teams: Team[],
  registry: CanonicalRegistry
): Team[] {
  // Pre-index active registrations by teamId in O(R) instead of O(T * R)
  const activeClubByTeam = new Map<string, PlayerClubRegistration[]>();
  for (const reg of registry.clubRegistrations.values()) {
    if (reg.status !== 'active') continue;
    let bucket = activeClubByTeam.get(reg.teamId);
    if (!bucket) {
      bucket = [];
      activeClubByTeam.set(reg.teamId, bucket);
    }
    bucket.push(reg);
  }

  const activeNatByTeam = new Map<string, PlayerNationalRegistration[]>();
  for (const reg of registry.nationalRegistrations.values()) {
    if (reg.status !== 'called_up') continue;
    let bucket = activeNatByTeam.get(reg.teamId);
    if (!bucket) {
      bucket = [];
      activeNatByTeam.set(reg.teamId, bucket);
    }
    bucket.push(reg);
  }

  const posRank: Record<string, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };

  return teams.map((team) => {
    const isNat = getTeamType(team) === 'country';
    const activeRegs: Array<PlayerClubRegistration | PlayerNationalRegistration> = isNat
      ? activeNatByTeam.get(team.id) || []
      : activeClubByTeam.get(team.id) || [];

    const projectedSquad: Player[] = [];
    for (const reg of activeRegs) {
      const id = registry.identities.get(reg.playerId);
      if (!id) continue;
      projectedSquad.push(identityToTeamPlayer(id, reg));
    }

    projectedSquad.sort((a, b) => {
      const diff = (posRank[a.position] ?? 9) - (posRank[b.position] ?? 9);
      return diff !== 0 ? diff : b.overallRating - a.overallRating;
    });

    const capReg = activeRegs.find((r) => r.isCaptain);
    const vcReg = activeRegs.find((r) => r.isViceCaptain && r.playerId !== capReg?.playerId);
    const capPlayer = capReg ? projectedSquad.find((p) => p.id === capReg.playerId) : undefined;
    const vcPlayer = vcReg ? projectedSquad.find((p) => p.id === vcReg.playerId) : undefined;

    const squadIds = new Set(projectedSquad.map((p) => p.id));
    let preferredXiIds = (team.preferredXiIds || []).filter((id) => squadIds.has(id));
    let defaultFormation = team.defaultFormation;
    if (projectedSquad.length > 0 && preferredXiIds.length < Math.min(11, projectedSquad.length)) {
      if (team.defaultFormation) {
        preferredXiIds = generateStrictStartingXi(projectedSquad, team.defaultFormation).map((p) => p.id);
      } else {
        const solved = selectBestFormationAndXiForSquad(projectedSquad);
        defaultFormation = solved.formation;
        preferredXiIds = solved.xiPlayers.map((p) => p.id);
      }
    }

    return {
      ...team,
      team_type: isNat ? ('country' as const) : ('club' as const),
      squad: projectedSquad,
      captainId: capPlayer?.id,
      captainName: getPlayerDisplayName(capPlayer) || undefined,
      captainSince: capReg?.captainSince || team.captainSince,
      viceCaptainId: vcPlayer?.id,
      viceCaptainName: getPlayerDisplayName(vcPlayer) || undefined,
      viceCaptainSince: vcReg?.viceCaptainSince || team.viceCaptainSince,
      defaultFormation,
      preferredXiIds,
    };
  });
}

/**
 * Returns free agents derived strictly from identities that have NO active club registration.
 * (Notice: being called up to a national team NEVER disqualifies a player from club free agency!)
 */
export function deriveClubFreeAgents(
  registry: CanonicalRegistry,
  baseFreeAgents: FreeAgentPlayer[]
): FreeAgentPlayer[] {
  const baseMeta = new Map(baseFreeAgents.map((fa) => [fa.id, fa]));
  const activeClubPlayerIds = new Set<string>();
  const formerClubByPlayer = new Map<string, PlayerClubRegistration>();

  for (const reg of registry.clubRegistrations.values()) {
    if (reg.status === 'active') {
      activeClubPlayerIds.add(reg.playerId);
    } else if (!formerClubByPlayer.has(reg.playerId)) {
      formerClubByPlayer.set(reg.playerId, reg);
    }
  }

  const freeAgents: FreeAgentPlayer[] = [];
  for (const identity of registry.identities.values()) {
    if (activeClubPlayerIds.has(identity.id)) continue;
    const meta = baseMeta.get(identity.id);
    const former = formerClubByPlayer.get(identity.id);
    if (!meta && !former) continue; // Only surface explicit or previously club-attached players as Free Agents

    freeAgents.push({
      ...identityToTeamPlayer(identity, {
        shirtNumber: former?.shirtNumber ?? meta?.shirtNumber ?? 99,
        isCaptain: false,
        isViceCaptain: false,
      }),
      previousClub: former?.teamName || meta?.previousClub || 'Free Agency',
      marketValue: meta?.marketValue || 'Free Transfer',
      joinedFreeAgency: former?.leftAt || meta?.joinedFreeAgency || todayIsoDate(),
    });
  }

  return freeAgents.sort((a, b) => b.overallRating - a.overallRating || a.name.localeCompare(b.name));
}

export function addBallonDorToIdentity(
  identity: PlayerIdentity,
  win: Omit<BallonDorWin, 'id'>
): PlayerIdentity {
  const created: BallonDorWin = {
    id: `bdor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    year: win.year,
    teamId: win.teamId,
    teamName: win.teamName,
    team_type: win.team_type,
    note: win.note,
  };
  const nextWins = [...(identity.ballonDorWins || []), created].sort((a, b) => b.year - a.year);
  return {
    ...identity,
    ballonDorWins: nextWins,
    updatedAt: new Date().toISOString(),
  };
}
