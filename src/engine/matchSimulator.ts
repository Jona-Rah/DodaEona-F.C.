import {
  getPlayerDisplayName,
  getTeamType,
  Player,
  TacticalMentalitySettings,
  Team,
} from '../types/matchCentre';
import { Manager, parsePhilosophyJson } from '../types/manager';
import {
  assignPlayersToFormation,
  FORMATION_TEMPLATES,
  generateStrictStartingXi,
  getFormationBlueprint,
  getPositionalCompatibilityScore,
  getStartingXiPlayers,
  getTacticalIdentityData,
} from '../components/matchCentre/dossier/dossierUtils';
import {
  getEffectiveComposureRating,
  getEffectivePenaltyRating,
  selectInMatchPenaltyTaker,
  selectShootoutPenaltyTakers,
} from '../utils/penaltyOrder';
import type {
  CompleteSimulationOutput,
  DugoutLineupSlot,
  SimCompetitionConfig,
  SimMomentumPoint,
  SimPenaltyKickRecord,
  SimPenaltyShootoutState,
  SimPlanId,
  SimPlayerMatchStats,
  SimPreMatchOdds,
  SimShotEvent,
  SimTacticalOverrideCheckpoint,
  SimTeamMatchStats,
  SimTeamSetup,
  SimTimelineEvent,
  TacticalPlanConfig,
} from '../types/simulation';
import {
  ActivePitchPlayer,
  computeDynamicStoppageMinutes,
  computeDynamicTeamProfile,
  computeFinalPlayerRating,
  DynamicTeamProfile,
} from './tacticalEngine';
import {
  buildEnvironmentConditions,
  buildRefereeProfile,
  CompetitionBenchmarkProfile,
  computePlayerMatchFormDelta,
  computeTacticalMatchupModifiers,
  MatchEnvironmentConditions,
  MatchRefereeProfile,
  resolveCompetitionBenchmark,
  resolveCrowdAtmosphere,
} from './matchIntel';

// ============================================================================
// DETERMINISTIC SEEDED PRNG
// ============================================================================

export function hashSeedString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createSeededRng(seedInput: string): () => number {
  let state = hashSeedString(seedInput) || 1;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateRandomSeed(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SIM-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============================================================================
// DEFAULT DUGOUT & TACTICAL PLANS BUILDERS
// ============================================================================

export function buildDugoutLineup(
  team: Team,
  formation: string,
  preferredIds?: string[]
): { slots: DugoutLineupSlot[]; bench: Player[] } {
  const blueprint = getFormationBlueprint(formation);
  const fitPool = team.squad.filter((p) => p.injuryStatus !== 'injured');
  const candidatePool = fitPool.length >= 11 ? fitPool : team.squad;

  let chosenXi: Player[] = [];
  if (preferredIds && preferredIds.length > 0) {
    const mapped = preferredIds
      .map((id) => candidatePool.find((p) => p.id === id))
      .filter((p): p is Player => Boolean(p));
    if (mapped.length >= 11) {
      chosenXi = mapped.slice(0, 11);
    }
  }
  if (chosenXi.length < 11) {
    chosenXi =
      formation === team.defaultFormation
        ? getStartingXiPlayers({ ...team, squad: candidatePool })
        : generateStrictStartingXi(candidatePool, formation);
  }

  const assigned = assignPlayersToFormation(chosenXi, formation);

  // Fill any vacant slot cleanly if a squad had too few exact fits, prioritizing positional fit first
  const usedIds = new Set(assigned.map((a) => a.player?.id).filter(Boolean) as string[]);
  const slots: DugoutLineupSlot[] = assigned.map((item, idx) => {
    if (item.player) {
      return { slotIndex: idx, node: item.node, player: item.player };
    }
    const remaining = candidatePool
      .filter((p) => !usedIds.has(p.id))
      .sort((a, b) => {
        const sA = getPositionalCompatibilityScore(a, item.node);
        const sB = getPositionalCompatibilityScore(b, item.node);
        if (sA !== sB) return sB - sA;
        if (item.node.line === 'GK' && (a.position === 'GK') !== (b.position === 'GK')) {
          return a.position === 'GK' ? -1 : 1;
        }
        if (a.position !== 'GK' && b.position === 'GK') return -1;
        if (a.position === 'GK' && b.position !== 'GK') return 1;
        return b.overallRating - a.overallRating;
      });
    const pick = remaining[0] || null;
    if (pick) usedIds.add(pick.id);
    return { slotIndex: idx, node: item.node, player: pick };
  });

  // Sort bench sensibly (GK first, then OVR descending, injured at end)
  const bench = team.squad
    .filter((p) => !usedIds.has(p.id))
    .sort((a, b) => {
      const injA = a.injuryStatus === 'injured' ? 1 : 0;
      const injB = b.injuryStatus === 'injured' ? 1 : 0;
      if (injA !== injB) return injA - injB;
      if (a.position === 'GK' && b.position !== 'GK') return -1;
      if (a.position !== 'GK' && b.position === 'GK') return 1;
      return b.overallRating - a.overallRating;
    });

  // Ensure exact blueprint length
  return {
    slots: slots.slice(0, blueprint.nodes.length),
    bench,
  };
}

export interface ManagerTacticalModifiers {
  hasManager: boolean;
  managerId?: string;
  managerName?: string;
  preferredFormation: string | null;
  tacticalStyle: string;
  pressingDelta: number;
  buildUpDelta: number;
  defensiveLineDelta: number;
  widthDelta: number;
  possessionBonus: number;
  attackingBonus: number;
  defensiveBonus: number;
  comebackBoldness: number; // 0 .. 2.4
  mentalityOverride?: string;
}

export function resolveManagerTacticalModifiers(
  manager?: Manager | null
): ManagerTacticalModifiers {
  if (!manager) {
    return {
      hasManager: false,
      preferredFormation: null,
      tacticalStyle: '',
      pressingDelta: 0,
      buildUpDelta: 0,
      defensiveLineDelta: 0,
      widthDelta: 0,
      possessionBonus: 0,
      attackingBonus: 0,
      defensiveBonus: 0,
      comebackBoldness: 0,
    };
  }

  const philosophy = parsePhilosophyJson(manager.philosophy_json);
  const style = (manager.tactical_style || '').toLowerCase();
  const combinedText = [
    style,
    philosophy.possession_passing,
    philosophy.pressing,
    philosophy.defensive_structure,
    philosophy.attacking_approach,
    philosophy.tactical_flexibility,
  ]
    .join(' ')
    .toLowerCase();

  let pressingDelta = ((philosophy.pressing_index ?? 55) - 55) * 0.35;
  let buildUpDelta = ((philosophy.attacking_boldness_index ?? 55) - 55) * 0.25;
  let defensiveLineDelta = ((philosophy.defensive_line_index ?? 55) - 55) * 0.3;
  let widthDelta = 0;
  let possessionBonus = ((philosophy.possession_index ?? 55) - 55) * 0.08;
  let attackingBonus = ((philosophy.attacking_boldness_index ?? 55) - 55) * 0.06;
  let defensiveBonus = 0;
  let comebackBoldness =
    0.45 +
    ((philosophy.attacking_boldness_index ?? 55) / 100) * 0.8 +
    ((philosophy.flexibility_index ?? 55) / 100) * 0.55;
  let mentalityOverride: string | undefined;

  if (
    combinedText.includes('gegenpress') ||
    combinedText.includes('high press') ||
    combinedText.includes('intense press') ||
    combinedText.includes('relentless')
  ) {
    pressingDelta += 14;
    defensiveLineDelta += 10;
    attackingBonus += 1.4;
    comebackBoldness += 0.35;
    mentalityOverride = 'Attacking';
  }

  if (
    combinedText.includes('possession') ||
    combinedText.includes('tiki-taka') ||
    combinedText.includes('short pass') ||
    combinedText.includes('juego de posic') ||
    combinedText.includes('dominate the ball')
  ) {
    possessionBonus += 3.8;
    buildUpDelta -= 6;
    widthDelta += 5;
    mentalityOverride = mentalityOverride || 'Positive';
  }

  if (
    combinedText.includes('low block') ||
    combinedText.includes('counter') ||
    combinedText.includes('compact') ||
    combinedText.includes('catenaccio') ||
    combinedText.includes('park the bus')
  ) {
    defensiveLineDelta -= 14;
    pressingDelta -= 10;
    defensiveBonus += 1.8;
    buildUpDelta += 8;
    mentalityOverride = mentalityOverride || 'Cautious';
  }

  if (
    combinedText.includes('attacking') ||
    combinedText.includes('vertical') ||
    combinedText.includes('aggressive') ||
    combinedText.includes('overrun') ||
    combinedText.includes('bold')
  ) {
    attackingBonus += 1.8;
    buildUpDelta += 9;
    comebackBoldness += 0.45;
    mentalityOverride = 'Attacking';
  }

  if (
    combinedText.includes('pragmatic') ||
    combinedText.includes('adaptive') ||
    combinedText.includes('flexible') ||
    combinedText.includes('fluid')
  ) {
    comebackBoldness += 0.3;
    defensiveBonus += 0.7;
    attackingBonus += 0.7;
  }

  const rawFormation = (manager.preferred_formation || '').trim();
  const preferredFormation =
    rawFormation && (FORMATION_TEMPLATES[rawFormation] || /^\d-\d(-\d){1,2}$/.test(rawFormation))
      ? rawFormation
      : null;

  return {
    hasManager: true,
    managerId: manager.id,
    managerName: manager.name,
    preferredFormation,
    tacticalStyle: manager.tactical_style?.trim() || '',
    pressingDelta,
    buildUpDelta,
    defensiveLineDelta,
    widthDelta,
    possessionBonus,
    attackingBonus,
    defensiveBonus,
    comebackBoldness: Math.min(2.4, Math.max(0.25, comebackBoldness)),
    mentalityOverride,
  };
}

export function buildDefaultTeamPlans(
  team: Team,
  manager?: Manager | null
): Record<SimPlanId, TacticalPlanConfig> {
  const idData = getTacticalIdentityData(team);
  const tp = team.tacticalProfile;
  const mods = resolveManagerTacticalModifiers(manager);

  const baseFormation = mods.preferredFormation || team.defaultFormation || '4-3-3';
  const baseStyle = mods.tacticalStyle || idData.styleLabel;
  const basePress = Math.min(96, Math.max(30, Math.round((tp?.pressingIntensity ?? 72) + mods.pressingDelta)));
  const baseBuild = Math.min(96, Math.max(32, Math.round((tp?.buildUpSpeed ?? 70) + mods.buildUpDelta)));
  const baseLine = Math.min(94, Math.max(26, Math.round((tp?.defensiveLine ?? 66) + mods.defensiveLineDelta)));
  const baseWidth = Math.min(94, Math.max(36, Math.round((tp?.width ?? 68) + mods.widthDelta)));

  const planA: TacticalPlanConfig = {
    id: 'A',
    label: mods.hasManager ? `Plan A · ${mods.managerName}` : 'Plan A · Base Identity',
    formation: baseFormation,
    playingStyle: baseStyle,
    pressingIntensity: basePress,
    buildUpSpeed: baseBuild,
    defensiveLine: baseLine,
    width: baseWidth,
    mentalitySettings: {
      ...idData.mentalitySettings,
      mentality: mods.mentalityOverride || idData.mentalitySettings.mentality,
    },
  };

  const altAttacking =
    idData.alternativeFormations?.[0]?.formation ||
    (baseFormation === '4-2-3-1' ? '4-3-3' : '4-2-3-1');

  const planB: TacticalPlanConfig = {
    id: 'B',
    label: 'Plan B · High-Press Chase',
    formation: altAttacking,
    playingStyle: 'High Press & Vertical Attack',
    pressingIntensity: Math.min(98, basePress + 16),
    buildUpSpeed: Math.min(96, baseBuild + 15),
    defensiveLine: Math.min(94, baseLine + 14),
    width: Math.min(92, baseWidth + 8),
    mentalitySettings: {
      ...idData.mentalitySettings,
      mentality: 'Attacking',
      buildUp: 'Direct passing',
      tempo: 'Fast',
      chanceCreation: 'Through balls',
      passingRisk: 'Ambitious',
      defensiveLine: 'High',
      pressingIntensityLabel: 'Extreme press',
      attackingTransition: 'Counter-attack quickly',
      overlappingFullBacks: 'Frequent',
    },
  };

  const altDefensive =
    baseFormation === '5-4-1'
      ? '4-5-1'
      : baseFormation === '4-5-1'
      ? '5-3-2'
      : '4-5-1';

  const planC: TacticalPlanConfig = {
    id: 'C',
    label: 'Plan C · Low Block Lockout',
    formation: altDefensive,
    playingStyle: 'Compact Mid-Block & Counter',
    pressingIntensity: Math.max(30, basePress - 22),
    buildUpSpeed: Math.max(36, baseBuild - 12),
    defensiveLine: Math.max(26, baseLine - 24),
    width: Math.max(38, baseWidth - 14),
    mentalitySettings: {
      ...idData.mentalitySettings,
      mentality: 'Cautious',
      buildUp: 'Short passing',
      tempo: 'Controlled',
      chanceCreation: 'Counter-attacks',
      passingRisk: 'Safe',
      defensiveLine: 'Deep block',
      pressingIntensityLabel: 'Medium press',
      attackingTransition: 'Retain shape & counter',
      overlappingFullBacks: 'Conservative',
    },
  };

  return { A: planA, B: planB, C: planC };
}

export function buildInitialTeamSetup(team: Team, manager?: Manager | null): SimTeamSetup {
  const plans = buildDefaultTeamPlans(team, manager);
  const { slots, bench } = buildDugoutLineup(team, plans.A.formation, team.preferredXiIds);
  return {
    teamId: team.id,
    formation: plans.A.formation,
    slots,
    bench,
    activePlan: 'A',
    plans,
    penaltyOrderIds: team.penaltyOrderIds,
  };
}

export function formatTacticalSummaryLine(code: string, plan: TacticalPlanConfig): string {
  const m = plan.mentalitySettings;
  return `${code} · ${m.mentality} · ${m.buildUp.toLowerCase()} · ${m.chanceCreation.toLowerCase()} · ${m.pressingIntensityLabel.toLowerCase()}`;
}

export function getSetupXiAverage(setup: SimTeamSetup): number {
  const players = setup.slots.map((s) => s.player).filter((p): p is Player => Boolean(p));
  if (players.length === 0) return 0;
  return Math.round(players.reduce((s, p) => s + p.overallRating, 0) / players.length);
}

// ============================================================================
// PRE-MATCH STRENGTH & PROBABILITY MODEL
// ============================================================================

function computeEffectiveTeamPower(
  setup: SimTeamSetup,
  isHome: boolean,
  managerMods?: ManagerTacticalModifiers,
  lateComebackBoost = 0,
  homeAdvantageOverride?: number
) {
  const profile = computeDynamicTeamProfile(setup, null, isHome, managerMods, {
    minute: 1,
    goalDiff: 0,
    isKnockout: false,
    homeAdvantageVal: homeAdvantageOverride,
    lateComebackBoost,
  });
  return {
    att: profile.att,
    mid: profile.mid,
    def: profile.def,
    gkRating: profile.gkRating,
    overall: profile.overall,
  };
}

export function computePreMatchOdds(
  homeSetup: SimTeamSetup,
  awaySetup: SimTeamSetup,
  homeManager?: Manager | null,
  awayManager?: Manager | null
): SimPreMatchOdds {
  const h = computeEffectiveTeamPower(
    homeSetup,
    true,
    resolveManagerTacticalModifiers(homeManager)
  );
  const a = computeEffectiveTeamPower(
    awaySetup,
    false,
    resolveManagerTacticalModifiers(awayManager)
  );
  const diff = h.overall - a.overall;

  const drawRaw = Math.max(0.14, 0.27 - Math.abs(diff) * 0.0055);
  const homeShare = 1 / (1 + Math.exp(-diff / 6.8));
  const homeWinPct = Math.round((1 - drawRaw) * homeShare * 100);
  const drawPct = Math.round(drawRaw * 100);
  const awayWinPct = Math.max(1, 100 - homeWinPct - drawPct);

  const projectedHomeXg = Number(
    Math.max(0.32, Math.min(3.5, 1.32 + (h.att - a.def) * 0.044 + (h.mid - a.mid) * 0.015)).toFixed(2)
  );
  const projectedAwayXg = Number(
    Math.max(0.26, Math.min(3.2, 1.08 + (a.att - h.def) * 0.044 + (a.mid - h.mid) * 0.015)).toFixed(2)
  );

  return {
    homeWinPct,
    drawPct,
    awayWinPct,
    projectedHomeXg,
    projectedAwayXg,
  };
}

// ============================================================================
// FULL DETERMINISTIC MATCH SIMULATOR ENGINE (v3.0 Tactical Intelligence)
// ============================================================================

export interface SimulationInput {
  seed: string;
  competition: SimCompetitionConfig;
  homeTeam: Team;
  awayTeam: Team;
  initialHomeSetup: SimTeamSetup;
  initialAwaySetup: SimTeamSetup;
  homeManager?: Manager | null;
  awayManager?: Manager | null;
  tacticalOverrides?: SimTacticalOverrideCheckpoint[];
}

interface InternalPlayerState {
  stat: SimPlayerMatchStats;
  player: Player;
  onPitch: boolean;
  slotIndex: number | null;
  nodeRole: string;
  stamina: number;
  sentOff: boolean;
  yellows: number;
  runMeters: number;
  sprintMeters: number;
  sprints: number;
  bigChancesMissed: number;
  penaltySaves: number;
  penaltiesMissed: number;
  lateWinnerGoals: number;
  matchFormDelta: number;
}

interface ShotPhysicsInput {
  shooter: Player;
  shooterStamina: number;
  shooterFormDelta: number;
  keeper: Player | null;
  keeperFormDelta: number;
  attProfile: DynamicTeamProfile;
  defProfile: DynamicTeamProfile;
  attPlan: TacticalPlanConfig;
  defPlan: TacticalPlanConfig;
  isCounter: boolean;
  isSetPiece: boolean;
  isPenalty: boolean;
  isCornerHeader: boolean;
  attConfidence: number;
  environment?: MatchEnvironmentConditions;
  benchmark?: CompetitionBenchmarkProfile;
  rng: () => number;
}

function getShotOutcomeAttributes(input: ShotPhysicsInput) {
  const {
    shooter,
    shooterStamina,
    shooterFormDelta,
    keeper,
    keeperFormDelta,
    attProfile,
    defProfile,
    attPlan,
    isCounter,
    isSetPiece,
    isPenalty,
    isCornerHeader,
    attConfidence,
    environment,
    benchmark,
    rng,
  } = input;

  // Determine tactical build method first so shot coordinates & xG align with how it was created
  const buildMethod: SimShotEvent['buildMethod'] = isSetPiece
    ? 'cross-set-piece'
    : isCounter
    ? 'counter'
    : (() => {
        const throughWeight =
          (attProfile.style.isThroughBallFocus ? 0.34 : 0.2) +
          Math.max(0, (defProfile.style.effectiveDefLine - 62) * 0.0045);
        const crossWeight =
          attProfile.style.isCrossFocus || attPlan.width >= 72
            ? 0.36
            : attPlan.width <= 50
            ? 0.16
            : 0.24;
        const bRoll = rng();
        if (bRoll < throughWeight) return 'through-ball';
        if (bRoll < throughWeight + crossWeight) return 'cross-set-piece';
        return 'patient';
      })();

  const wideBias =
    attProfile.style.effectiveWidth >= 72
      ? 0.27
      : attProfile.style.effectiveWidth <= 50
      ? 0.14
      : 0.2;
  const channelRoll = rng();
  const channel: 'left' | 'central' | 'right' =
    isPenalty || isCornerHeader || buildMethod === 'through-ball' || channelRoll >= wideBias * 2
      ? 'central'
      : channelRoll < wideBias
      ? 'left'
      : 'right';

  // Shot placement conditioned by build-up, defensive compactness, and attacker-vs-defender superiority
  let x = 50;
  let y = 14;
  const compactnessPush = defProfile.style.isLowBlock ? 3.2 : 0;
  const attVsDefEdge = attProfile.att - defProfile.defensiveWall;
  const spacePush = Math.max(-2.6, Math.min(2.6, -attVsDefEdge * 0.12));

  if (isPenalty) {
    x = 50;
    y = 11;
  } else if (isCounter || buildMethod === 'through-ball') {
    x = 38 + rng() * 24;
    const highLineRoom = Math.max(0, (defProfile.style.effectiveDefLine - 60) * 0.09);
    y = Math.max(5.5, 7.2 + Math.max(-2.2, spacePush * 0.35 - highLineRoom) + rng() * 14);
  } else if (isSetPiece || buildMethod === 'cross-set-piece') {
    x = channel === 'central' ? 39 + rng() * 22 : channel === 'left' ? 28 + rng() * 15 : 57 + rng() * 15;
    y = Math.max(5.5, 6.2 + spacePush * 0.4 + rng() * 14);
  } else if (channel === 'central') {
    x = 35 + rng() * 30;
    // Stronger attackers work closer openings; weaker attackers are forced into longer speculative efforts
    y = Math.max(6.5, 9.2 + compactnessPush + spacePush + rng() * 18.5);
  } else if (channel === 'left') {
    x = 24 + rng() * 16;
    y = Math.max(6.5, 8.8 + compactnessPush * 0.8 + spacePush * 0.7 + rng() * 18);
  } else {
    x = 60 + rng() * 16;
    y = Math.max(6.5, 8.8 + compactnessPush * 0.8 + spacePush * 0.7 + rng() * 18);
  }

  // Distance & angle -> authentic football xG (average shot ~0.115 xG)
  const dx = Math.abs(x - 50) * 0.69;
  const dy = y * 0.93;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angleFactor = Math.max(0.24, 1 - dx / Math.max(10.5, dist * 1.1));

  let rawXg: number;
  if (isPenalty) {
    rawXg = 0.78;
  } else {
    const teamQualityChanceMod = Math.max(0.72, Math.min(1.34, 1 + attVsDefEdge * 0.013));
    rawXg = Math.exp(-dist * 0.157) * angleFactor * teamQualityChanceMod;
    if (isCounter) {
      const paceEdge = Math.max(-0.04, (shooter.attributes.pace - 70) * 0.0024);
      rawXg *= 1.24 + paceEdge;
    } else if (buildMethod === 'through-ball') {
      const highLineExposure = Math.max(0, (defProfile.style.effectiveDefLine - 62) * 0.0075);
      rawXg *= 1.14 + highLineExposure;
    } else if (isSetPiece) {
      rawXg *= 0.88;
    } else if (defProfile.style.isLowBlock && y > 13) {
      rawXg *= 0.84;
    }
    rawXg = Math.max(0.02, Math.min(0.6, rawXg));
  }

  // Shooter quality, consistency form, composure, confidence & stamina fatigue
  const penaltyComposite =
    getEffectivePenaltyRating(shooter) * 0.72 + getEffectiveComposureRating(shooter) * 0.28;
  const staminaPenalty = shooterStamina < 60 ? (60 - shooterStamina) * 0.0018 : 0;
  const confidenceTerm = attConfidence * 0.0022;
  const formFinishingMod = shooterFormDelta * 0.0028;
  const weatherCrossPenalty = isSetPiece || buildMethod === 'cross-set-piece' ? (environment?.crossAccuracyMod || 0) * 0.4 : 0;
  const longShotSkid = y > 17 ? environment?.longShotSkidMod || 0 : 0;
  const shooterDelta = isPenalty
    ? (penaltyComposite - 73) * 0.0032 - staminaPenalty * 0.65 + formFinishingMod * 0.5
    : ((shooter.attributes.shooting || shooter.overallRating) - 72) * 0.0026 +
      confidenceTerm +
      formFinishingMod -
      staminaPenalty;

  const xg = Number(
    Math.max(0.02, Math.min(0.84, rawXg + (isPenalty ? 0 : shooterDelta * 0.4 + weatherCrossPenalty))).toFixed(2)
  );
  const isBigChance = isPenalty || xg >= 0.26;

  // Defensive blocks happen BEFORE shot reaches keeper
  const centralFactor = Math.abs(x - 50) < 16 && y >= 11 ? 1.22 : 0.85;
  const lowBlockBonus = defProfile.style.isLowBlock ? 0.07 : 0;
  const fiveBackBonus = defProfile.formationShape.defCount >= 5 ? 0.03 : 0;
  const defBlockSkillEdge = Math.max(-0.03, Math.min(0.045, (defProfile.def - attProfile.att) * 0.002));
  const staminaDefSlip = defProfile.avgStamina < 58 ? -0.035 : 0;
  const blockProb = isPenalty || isCornerHeader
    ? 0
    : Math.max(
        0.08,
        Math.min(0.36, (0.165 + lowBlockBonus + fiveBackBonus + defBlockSkillEdge + staminaDefSlip) * centralFactor * (isCounter ? 0.52 : 1))
      );

  // Goalkeeper quality + matchday form suppresses conversion around calibrated midpoint 76
  const gkSkill =
    (defProfile.gkShotStopping || keeper?.gkAttributes?.reflexes || keeper?.overallRating || 70) +
    keeperFormDelta * 0.45;
  const gkMod = ((gkSkill - 76) / 100) * 0.36;
  const compShotEdge = benchmark?.shotQualityEdge || 0;

  // Calibrated conversion around xG + finishing quality - keeper brilliance
  const rawGoalProb = isPenalty
    ? Math.max(0.58, Math.min(0.88, 0.78 + shooterDelta - gkMod * 0.45))
    : Math.max(0.015, Math.min(0.75, xg * (1.01 + shooterDelta * 1.4 - gkMod + longShotSkid * 0.6 + compShotEdge)));

  // Split remaining probability realistically into Saved (~24%), Woodwork (~2.5%), Blocked (~24%), Off-target (~38%)
  const onTargetNonGoalProb = isPenalty
    ? Math.max(0.11, 0.145 + gkMod * 0.25)
    : Math.max(0.12, Math.min(0.36, 0.178 + xg * 0.28 + gkMod * 0.26));
  const woodworkProb = isPenalty ? 0.032 : Math.min(0.046, 0.019 + xg * 0.05 + longShotSkid * 0.12);

  const roll = rng();
  let outcome: SimShotEvent['outcome'];

  if (roll < rawGoalProb) {
    outcome = 'goal';
  } else if (roll < rawGoalProb + onTargetNonGoalProb) {
    outcome = 'saved';
  } else if (roll < rawGoalProb + onTargetNonGoalProb + woodworkProb) {
    outcome = 'woodwork';
  } else if (!isPenalty && roll < rawGoalProb + onTargetNonGoalProb + woodworkProb + blockProb) {
    outcome = 'blocked';
  } else {
    outcome = 'off-target';
  }

  const xgot =
    outcome === 'goal'
      ? Number(Math.min(0.98, Math.max(xg + 0.08, xg * (1.26 + rng() * 0.42))).toFixed(2))
      : outcome === 'saved'
      ? Number(Math.min(0.89, Math.max(0.05, xg * (0.86 + rng() * 0.54))).toFixed(2))
      : null;

  const preferredFoot = (shooter as { preferredFoot?: 'Right' | 'Left' }).preferredFoot;
  const bodyPart: SimShotEvent['bodyPart'] =
    isCornerHeader || ((isSetPiece || buildMethod === 'cross-set-piece') && rng() < 0.48)
      ? 'Header'
      : preferredFoot === 'Left'
      ? rng() < 0.76
        ? 'Left foot'
        : 'Right foot'
      : preferredFoot === 'Right'
      ? rng() < 0.78
        ? 'Right foot'
        : 'Left foot'
      : ['LB', 'LWB', 'LM', 'LW'].includes(shooter.positionDetail) || rng() < 0.28
      ? 'Left foot'
      : 'Right foot';

  return {
    x: Number(x.toFixed(1)),
    y: Number(y.toFixed(1)),
    xg,
    xgot,
    outcome,
    channel,
    buildMethod,
    isBigChance,
    bodyPart,
  };
}

function buildPenaltyShootout(
  seed: string,
  homeTeam: Team,
  awayTeam: Team,
  homeSetup: SimTeamSetup,
  awaySetup: SimTeamSetup,
  homePool: InternalPlayerState[],
  awayPool: InternalPlayerState[],
  events: SimTimelineEvent[],
  lastMinute: number
): SimPenaltyShootoutState {
  const rng = createSeededRng(`${seed}::penalties`);

  // Strictly follow club Penalty Kick Order for all eligible on-pitch players (never subbed-off, injured, or sent-off)
  const homeTakers = selectShootoutPenaltyTakers(
    homeSetup.penaltyOrderIds?.length ? homeSetup.penaltyOrderIds : homeTeam.penaltyOrderIds,
    homeTeam.id,
    homePool
  );
  const awayTakers = selectShootoutPenaltyTakers(
    awaySetup.penaltyOrderIds?.length ? awaySetup.penaltyOrderIds : awayTeam.penaltyOrderIds,
    awayTeam.id,
    awayPool
  );
  const homeGkState =
    homePool.find((p) => p.onPitch && !p.sentOff && p.nodeRole === 'GK') ||
    homePool.find((p) => p.onPitch && !p.sentOff) ||
    null;
  const awayGkState =
    awayPool.find((p) => p.onPitch && !p.sentOff && p.nodeRole === 'GK') ||
    awayPool.find((p) => p.onPitch && !p.sentOff) ||
    null;
  const homeGk = homeGkState?.player || homeSetup.slots[0]?.player || homeTakers[homeTakers.length - 1]?.player;
  const awayGk = awayGkState?.player || awaySetup.slots[0]?.player || awayTakers[awayTakers.length - 1]?.player;

  const kicks: SimPenaltyKickRecord[] = [];
  let homeScore = 0;
  let awayScore = 0;
  let homeTaken = 0;
  let awayTaken = 0;
  let winner: 'home' | 'away' | null = null;
  let round = 1;

  const takeKick = (side: 'home' | 'away', kickIdxInTeam: number) => {
    const takers = side === 'home' ? homeTakers : awayTakers;
    const keeper = side === 'home' ? awayGk : homeGk;
    if (takers.length === 0) {
      if (side === 'home') homeTaken++;
      else awayTaken++;
      return;
    }

    const takerState = takers[kickIdxInTeam % takers.length];
    const taker = takerState.player;
    const takerName = getPlayerDisplayName(taker);
    const keeperName = keeper ? getPlayerDisplayName(keeper) : 'Goalkeeper';

    // Incorporate penalty skill, composure, fatigue in the legs after 120', and shootout round nerves
    const takerSkill =
      getEffectivePenaltyRating(taker) * 0.68 + getEffectiveComposureRating(taker) * 0.32;
    const fatiguePenalty = takerState.stamina < 60 ? (60 - takerState.stamina) * 0.0014 : 0;
    const pressurePenalty = round >= 5 ? 0.025 : 0;
    const finishQuality = (takerSkill - 72) * 0.004;

    const gkShootoutSkill = keeper?.gkAttributes
      ? keeper.gkAttributes.reflexes * 0.55 + keeper.gkAttributes.diving * 0.35 + keeper.gkAttributes.positioning * 0.1
      : keeper?.overallRating || 70;
    const keeperQuality = (gkShootoutSkill - 72) * 0.0032;

    const convertProb = Math.max(
      0.56,
      Math.min(0.89, 0.77 + finishQuality - keeperQuality - fatiguePenalty - pressurePenalty)
    );

    const sideDirs: Array<'left' | 'center' | 'right'> = ['left', 'center', 'right'];
    const aimRoll = rng();
    const aimDir: 'left' | 'center' | 'right' =
      aimRoll < 0.42 ? 'left' : aimRoll < 0.84 ? 'right' : 'center';

    const r = rng();
    let outcome: SimPenaltyKickRecord['outcome'];
    let keeperDive: 'left' | 'center' | 'right';

    if (r < convertProb) {
      outcome = 'scored';
      keeperDive =
        rng() < 0.68
          ? sideDirs.filter((d) => d !== aimDir)[Math.floor(rng() * 2)]
          : aimDir;
    } else if (r < convertProb + 0.145) {
      outcome = 'saved';
      keeperDive = aimDir;
    } else if (r < convertProb + 0.19) {
      outcome = 'post';
      keeperDive = sideDirs[Math.floor(rng() * 3)];
    } else {
      outcome = 'missed';
      keeperDive = sideDirs[Math.floor(rng() * 3)];
    }

    const rollNaturalKeeperDiveCoords = (dive: 'left' | 'center' | 'right') => {
      if (dive === 'left') {
        return { kx: 17 + rng() * 14, ky: 44 + rng() * 36 };
      }
      if (dive === 'right') {
        return { kx: 69 + rng() * 14, ky: 44 + rng() * 36 };
      }
      return { kx: 46 + rng() * 8, ky: 48 + rng() * 28 };
    };

    let targetX = 50;
    let targetY = 50;
    let keeperTargetX = 50;
    let keeperTargetY = 60;
    let missDetail: SimPenaltyKickRecord['missDetail'];

    if (outcome === 'saved') {
      // Keeper guessed the right direction and got gloves to the ball
      keeperDive = aimDir;
      if (aimDir === 'left') {
        targetX = 12 + rng() * 21;
        targetY = 24 + rng() * 60;
      } else if (aimDir === 'right') {
        targetX = 67 + rng() * 21;
        targetY = 24 + rng() * 60;
      } else {
        targetX = 40 + rng() * 20;
        targetY = 26 + rng() * 58;
      }
      keeperTargetX = targetX;
      keeperTargetY = targetY;
    } else if (outcome === 'scored') {
      if (keeperDive !== aimDir) {
        // Keeper dived the wrong way
        targetX =
          aimDir === 'left'
            ? 8 + rng() * 25
            : aimDir === 'right'
            ? 67 + rng() * 25
            : 40 + rng() * 20;
        targetY = 14 + rng() * 68;
        const diveCoords = rollNaturalKeeperDiveCoords(keeperDive);
        keeperTargetX = diveCoords.kx;
        keeperTargetY = diveCoords.ky;
      } else {
        // Keeper guessed the right way, but the shot was placed out of reach
        if (aimDir === 'left') {
          const highCorner = rng() < 0.65;
          targetX = 4 + rng() * 7;
          targetY = highCorner ? 8 + rng() * 17 : 76 + rng() * 14;
          keeperTargetX = 21 + rng() * 11;
          keeperTargetY = highCorner ? 56 + rng() * 24 : 30 + rng() * 18;
        } else if (aimDir === 'right') {
          const highCorner = rng() < 0.65;
          targetX = 89 + rng() * 7;
          targetY = highCorner ? 8 + rng() * 17 : 76 + rng() * 14;
          keeperTargetX = 68 + rng() * 11;
          keeperTargetY = highCorner ? 56 + rng() * 24 : 30 + rng() * 18;
        } else {
          // Rifled high into the roof of the net over a diving/crouching keeper
          targetX = 43 + rng() * 14;
          targetY = 7 + rng() * 11;
          keeperTargetX = 46 + rng() * 8;
          keeperTargetY = 66 + rng() * 16;
        }
      }
    } else if (outcome === 'post') {
      const diveCoords = rollNaturalKeeperDiveCoords(keeperDive);
      keeperTargetX = diveCoords.kx;
      keeperTargetY = diveCoords.ky;

      if (aimDir === 'center') {
        missDetail = 'crossbar';
        targetX = 28 + rng() * 44;
        targetY = 0;
      } else if (aimDir === 'left') {
        if (rng() < 0.65) {
          missDetail = 'left-post';
          targetX = 0;
          targetY = 6 + rng() * 76;
        } else {
          missDetail = 'crossbar';
          targetX = 8 + rng() * 34;
          targetY = 0;
        }
      } else {
        if (rng() < 0.65) {
          missDetail = 'right-post';
          targetX = 100;
          targetY = 6 + rng() * 76;
        } else {
          missDetail = 'crossbar';
          targetX = 58 + rng() * 34;
          targetY = 0;
        }
      }
    } else {
      // Missed / Out: strictly outside the goalposts or above the crossbar
      const diveCoords = rollNaturalKeeperDiveCoords(keeperDive);
      keeperTargetX = diveCoords.kx;
      keeperTargetY = diveCoords.ky;

      if (aimDir === 'center') {
        missDetail = 'over';
        targetX = 26 + rng() * 48;
        targetY = -20 + rng() * 11;
      } else if (aimDir === 'left') {
        if (rng() < 0.6) {
          missDetail = 'wide-left';
          targetX = -15 + rng() * 8;
          targetY = 10 + rng() * 74;
        } else {
          missDetail = 'over';
          targetX = 6 + rng() * 34;
          targetY = -20 + rng() * 11;
        }
      } else {
        if (rng() < 0.6) {
          missDetail = 'wide-right';
          targetX = 107 + rng() * 8;
          targetY = 10 + rng() * 74;
        } else {
          missDetail = 'over';
          targetX = 60 + rng() * 34;
          targetY = -20 + rng() * 11;
        }
      }
    }

    if (outcome === 'scored') {
      if (side === 'home') homeScore++;
      else awayScore++;
    }
    if (side === 'home') homeTaken++;
    else awayTaken++;

    const kickNum = kicks.length + 1;
    const commentary =
      outcome === 'scored'
        ? keeperDive === aimDir
          ? `${keeperName} guesses ${keeperDive}, but ${takerName}'s strike is tucked completely out of reach!`
          : `${takerName} sends ${keeperName} the wrong way and buries the spot-kick!`
        : outcome === 'saved'
        ? keeperDive === 'center'
          ? `SAVE! ${keeperName} stands tall in the center and palms away ${takerName}'s penalty!`
          : `SAVE! ${keeperName} dives ${keeperDive} and gets a strong hand to ${takerName}'s penalty!`
        : outcome === 'post'
        ? missDetail === 'crossbar'
          ? `CROSSBAR! ${takerName}'s strike rattles off the top of the bar and stays out!`
          : missDetail === 'left-post'
          ? `OFF THE POST! ${takerName}'s shot crashes against the left upright!`
          : `OFF THE POST! ${takerName}'s shot crashes against the right upright!`
        : missDetail === 'over'
        ? `OVER THE BAR! ${takerName} blazes the penalty high above the crossbar!`
        : missDetail === 'wide-left'
        ? `OUT WIDE! ${takerName} drags the penalty outside the left post!`
        : `OUT WIDE! ${takerName} drags the penalty outside the right post!`;

    kicks.push({
      kickNumber: kickNum,
      round,
      teamSide: side,
      takerId: taker.id,
      takerName,
      keeperId: keeper?.id || `${side}-gk`,
      keeperName,
      targetX: Number(targetX.toFixed(1)),
      targetY: Number(targetY.toFixed(1)),
      keeperDive,
      keeperTargetX: Number(keeperTargetX.toFixed(1)),
      keeperTargetY: Number(keeperTargetY.toFixed(1)),
      missDetail,
      outcome,
      commentary,
    });
  };

  while (!winner && round <= 14) {
    takeKick('home', round - 1);
    if (round <= 5) {
      const remHome = 5 - homeTaken;
      const remAway = 5 - awayTaken;
      if (homeScore > awayScore + remAway) {
        winner = 'home';
        break;
      }
      if (awayScore > homeScore + remHome) {
        winner = 'away';
        break;
      }
    }

    takeKick('away', round - 1);
    if (round <= 5) {
      const remHome = 5 - homeTaken;
      const remAway = 5 - awayTaken;
      if (homeScore > awayScore + remAway) {
        winner = 'home';
        break;
      }
      if (awayScore > homeScore + remHome) {
        winner = 'away';
        break;
      }
    } else {
      if (homeScore !== awayScore) {
        winner = homeScore > awayScore ? 'home' : 'away';
        break;
      }
    }
    round++;
  }

  if (!winner) {
    winner = homeScore >= awayScore ? 'home' : 'away';
  }

  events.push({
    id: `ev-pen-end`,
    minute: lastMinute,
    period: 'PEN',
    type: 'full-time',
    teamSide: winner,
    headline: `Penalty Shootout Decided (${homeScore} - ${awayScore})`,
    commentary: `Shootout concludes ${homeScore}-${awayScore} after ${kicks.length} kicks.`,
    isKeyMoment: true,
  });

  return {
    homeScore,
    awayScore,
    kicks,
    winner,
    suddenDeath: round > 5,
  };
}

function finalizeTeamStats(
  acc: {
    possessionTicks: number;
    totalTicks: number;
    shots: number;
    shotsOnTarget: number;
    xg: number;
    xgot: number;
    openPlayXg: number;
    setPieceXg: number;
    bigChances: number;
    bigChancesMissed: number;
    touchesInBox: number;
    corners: number;
    yellowCards: number;
    redCards: number;
    fouls: number;
    offsides: number;
    passesAttempted: number;
    passesCompleted: number;
    duelsWon: number;
    duelsTotal: number;
    tacklesWon: number;
    tacklesTotal: number;
    interceptions: number;
    clearances: number;
    blocks: number;
    throughPasses: number;
    throughPassesCompleted: number;
    possessionLost: number;
    saves: number;
    runningMeters: number;
    sprintMeters: number;
    sprints: number;
    zoneLeft: number;
    zoneCentral: number;
    zoneRight: number;
    buildPatient: number;
    buildThrough: number;
    buildCross: number;
    buildCounter: number;
  },
  possessionPct: number
): SimTeamMatchStats {
  const shotTotalZones = acc.zoneLeft + acc.zoneCentral + acc.zoneRight;
  const leftPct = shotTotalZones > 0 ? Math.round((acc.zoneLeft / shotTotalZones) * 100) : 33;
  const centralPct = shotTotalZones > 0 ? Math.round((acc.zoneCentral / shotTotalZones) * 100) : 34;
  const rightPct = shotTotalZones > 0 ? Math.max(0, 100 - leftPct - centralPct) : 33;

  const bTotal = acc.buildPatient + acc.buildThrough + acc.buildCross + acc.buildCounter;
  const pPatient = bTotal > 0 ? Math.round((acc.buildPatient / bTotal) * 100) : 25;
  const pThrough = bTotal > 0 ? Math.round((acc.buildThrough / bTotal) * 100) : 25;
  const pCross = bTotal > 0 ? Math.round((acc.buildCross / bTotal) * 100) : 25;
  const pCounter = bTotal > 0 ? Math.max(0, 100 - pPatient - pThrough - pCross) : 25;

  return {
    possession: possessionPct,
    shots: acc.shots,
    shotsOnTarget: acc.shotsOnTarget,
    xg: Number(acc.xg.toFixed(2)),
    xgot: Number(acc.xgot.toFixed(2)),
    openPlayXg: Number(acc.openPlayXg.toFixed(2)),
    setPieceXg: Number(acc.setPieceXg.toFixed(2)),
    bigChances: acc.bigChances,
    bigChancesMissed: acc.bigChancesMissed,
    touchesInBox: acc.touchesInBox,
    corners: acc.corners,
    yellowCards: acc.yellowCards,
    redCards: acc.redCards,
    fouls: acc.fouls,
    offsides: acc.offsides,
    passesAttempted: acc.passesAttempted,
    passesCompleted: acc.passesCompleted,
    passAccuracy:
      acc.passesAttempted > 0
        ? Math.round((acc.passesCompleted / acc.passesAttempted) * 100)
        : 0,
    duelsWon: acc.duelsWon,
    duelsTotal: acc.duelsTotal,
    tacklesWon: acc.tacklesWon,
    tacklesTotal: acc.tacklesTotal,
    interceptions: acc.interceptions,
    clearances: acc.clearances,
    blocks: acc.blocks,
    throughPasses: acc.throughPasses,
    throughPassesCompleted: acc.throughPassesCompleted,
    possessionLost: acc.possessionLost,
    saves: acc.saves,
    runningDistanceKm: Number((acc.runningMeters / 1000).toFixed(1)),
    sprintingDistanceKm: Number((acc.sprintMeters / 1000).toFixed(1)),
    sprints: acc.sprints,
    attackingZones: {
      left: leftPct,
      central: centralPct,
      right: rightPct,
    },
    buildMethods: {
      patient: pPatient,
      throughBall: pThrough,
      crossSetPiece: pCross,
      counter: pCounter,
    },
  };
}

export function simulateMatch(input: SimulationInput): CompleteSimulationOutput {
  const {
    seed,
    competition,
    homeTeam,
    awayTeam,
    initialHomeSetup,
    initialAwaySetup,
    homeManager,
    awayManager,
  } = input;
  const overrides = [...(input.tacticalOverrides || [])].sort((a, b) => a.minute - b.minute);

  const homeMods = resolveManagerTacticalModifiers(homeManager);
  const awayMods = resolveManagerTacticalModifiers(awayManager);

  const preMatchOdds = computePreMatchOdds(
    initialHomeSetup,
    initialAwaySetup,
    homeManager,
    awayManager
  );

  let homeSetup: SimTeamSetup = JSON.parse(JSON.stringify(initialHomeSetup));
  let awaySetup: SimTeamSetup = JSON.parse(JSON.stringify(initialAwaySetup));

  const compBenchmark = resolveCompetitionBenchmark(competition);
  const refereeProfile: MatchRefereeProfile = buildRefereeProfile(
    competition,
    createSeededRng(`${seed}::referee`)
  );
  const environment: MatchEnvironmentConditions = buildEnvironmentConditions(
    homeTeam,
    competition,
    createSeededRng(`${seed}::environment`)
  );

  const buildPool = (setup: SimTeamSetup, side: 'home' | 'away'): InternalPlayerState[] => {
    const map = new Map<string, InternalPlayerState>();
    setup.slots.forEach((slot) => {
      if (!slot.player) return;
      const p = slot.player;
      const formRng = createSeededRng(`${seed}::form::${p.id}`);
      const matchFormDelta = computePlayerMatchFormDelta(p, formRng);
      map.set(p.id, {
        player: p,
        onPitch: true,
        slotIndex: slot.slotIndex,
        nodeRole: slot.node.role,
        stamina: p.injuryStatus === 'doubtful' ? 84 : 100,
        sentOff: false,
        yellows: 0,
        runMeters: 0,
        sprintMeters: 0,
        sprints: 0,
        bigChancesMissed: 0,
        penaltySaves: 0,
        penaltiesMissed: 0,
        lateWinnerGoals: 0,
        matchFormDelta,
        stat: {
          playerId: p.id,
          playerName: p.name,
          shortName: p.shortName || getPlayerDisplayName(p),
          shirtNumber: p.shirtNumber,
          positionDetail: p.positionDetail,
          roleSlot: slot.node.role,
          teamSide: side,
          started: true,
          subbedInMinute: null,
          subbedOutMinute: null,
          minutesPlayed: 0,
          rating: 6.2,
          goals: 0,
          assists: 0,
          shots: 0,
          shotsOnTarget: 0,
          xg: 0,
          keyPasses: 0,
          passesCompleted: 0,
          passesAttempted: 0,
          throughPasses: 0,
          throughPassesCompleted: 0,
          blocks: 0,
          tackles: 0,
          interceptions: 0,
          clearances: 0,
          foulsCommitted: 0,
          possessionLost: 0,
          saves: 0,
          yellowCards: 0,
          redCards: 0,
        },
      });
    });
    setup.bench.forEach((p) => {
      if (map.has(p.id)) return;
      const formRng = createSeededRng(`${seed}::form::${p.id}`);
      const matchFormDelta = computePlayerMatchFormDelta(p, formRng);
      map.set(p.id, {
        player: p,
        onPitch: false,
        slotIndex: null,
        nodeRole: p.positionDetail || p.position,
        stamina: 100,
        sentOff: false,
        yellows: 0,
        runMeters: 0,
        sprintMeters: 0,
        sprints: 0,
        bigChancesMissed: 0,
        penaltySaves: 0,
        penaltiesMissed: 0,
        lateWinnerGoals: 0,
        matchFormDelta,
        stat: {
          playerId: p.id,
          playerName: p.name,
          shortName: p.shortName || getPlayerDisplayName(p),
          shirtNumber: p.shirtNumber,
          positionDetail: p.positionDetail,
          roleSlot: p.positionDetail || p.position,
          teamSide: side,
          started: false,
          subbedInMinute: null,
          subbedOutMinute: null,
          minutesPlayed: 0,
          rating: 6.0,
          goals: 0,
          assists: 0,
          shots: 0,
          shotsOnTarget: 0,
          xg: 0,
          keyPasses: 0,
          passesCompleted: 0,
          passesAttempted: 0,
          throughPasses: 0,
          throughPassesCompleted: 0,
          blocks: 0,
          tackles: 0,
          interceptions: 0,
          clearances: 0,
          foulsCommitted: 0,
          possessionLost: 0,
          saves: 0,
          yellowCards: 0,
          redCards: 0,
        },
      });
    });
    return Array.from(map.values());
  };

  const homePool = buildPool(homeSetup, 'home');
  const awayPool = buildPool(awaySetup, 'away');
  const homePoolMap = new Map(homePool.map((p) => [p.player.id, p]));
  const awayPoolMap = new Map(awayPool.map((p) => [p.player.id, p]));

  const makeAcc = () => ({
    possessionTicks: 0,
    totalTicks: 0,
    shots: 0,
    shotsOnTarget: 0,
    xg: 0,
    xgot: 0,
    openPlayXg: 0,
    setPieceXg: 0,
    bigChances: 0,
    bigChancesMissed: 0,
    touchesInBox: 0,
    corners: 0,
    yellowCards: 0,
    redCards: 0,
    fouls: 0,
    offsides: 0,
    passesAttempted: 0,
    passesCompleted: 0,
    duelsWon: 0,
    duelsTotal: 0,
    tacklesWon: 0,
    tacklesTotal: 0,
    interceptions: 0,
    clearances: 0,
    blocks: 0,
    throughPasses: 0,
    throughPassesCompleted: 0,
    possessionLost: 0,
    saves: 0,
    runningMeters: 0,
    sprintMeters: 0,
    sprints: 0,
    zoneLeft: 0,
    zoneCentral: 0,
    zoneRight: 0,
    buildPatient: 0,
    buildThrough: 0,
    buildCross: 0,
    buildCounter: 0,
  });

  const homeAcc = makeAcc();
  const awayAcc = makeAcc();
  const microRng = createSeededRng(`${seed}::player-micro`);

  const events: SimTimelineEvent[] = [];
  const shots: SimShotEvent[] = [];
  const rawMomentum: Array<{
    minute: number;
    addedMinute?: number;
    period: '1H' | '2H' | 'ET1' | 'ET2';
    displayLabel: string;
    homeThreat: number;
    awayThreat: number;
    rawDiff: number;
    goalSide?: 'home' | 'away';
  }> = [];

  const awayStartPlayers = awaySetup.slots
    .map((s) => s.player)
    .filter((p): p is Player => Boolean(p));
  const crowdAtmosphere = resolveCrowdAtmosphere(
    environment.stadiumCapacity,
    homeTeam,
    awayStartPlayers,
    competition,
    compBenchmark,
    refereeProfile.crowdResistance,
    createSeededRng(`${seed}::crowd`)
  );

  let homeScore = 0;
  let awayScore = 0;
  let halfTimeHomeScore = 0;
  let halfTimeAwayScore = 0;
  let homeSubsUsed = 0;
  let awaySubsUsed = 0;
  let overrideIdx = 0;

  // Dynamic match intelligence state (evolving naturally minute by minute)
  let spellControl = 0; // -1 (away territory) .. +1 (home territory)
  let homeConfidence =
    (preMatchOdds.homeWinPct - preMatchOdds.awayWinPct >= 14 ? 1.5 : 0) +
    (preMatchOdds.homeWinPct + 15 < preMatchOdds.awayWinPct ? compBenchmark.cupUpsetBelief : 0);
  let awayConfidence =
    (preMatchOdds.awayWinPct - preMatchOdds.homeWinPct >= 14 ? 1.5 : 0) +
    (preMatchOdds.awayWinPct + 15 < preMatchOdds.homeWinPct ? compBenchmark.cupUpsetBelief : 0);
  let homeShockTicks = 0;
  let awayShockTicks = 0;
  let homeCounterShotsConceded = 0;
  let awayCounterShotsConceded = 0;
  let homeManualOverrideMinute = -1;
  let awayManualOverrideMinute = -1;
  let homeAiShiftCooldownUntil = 0;
  let awayAiShiftCooldownUntil = 0;

  const homeGoalLog: Array<{ minute: number; scorerId: string }> = [];
  const awayGoalLog: Array<{ minute: number; scorerId: string }> = [];

  events.push({
    id: 'ev-kickoff',
    minute: 1,
    period: '1H',
    type: 'kickoff',
    headline: `Kick-off at ${environment.stadiumName}`,
    commentary: `${competition.competitionName} gets underway in ${environment.weather.toLowerCase()} conditions (${environment.temperatureC}°C, ${environment.pitch.toLowerCase()} pitch) under referee ${refereeProfile.name}. ${homeTeam.name} (${homeSetup.formation}) face ${awayTeam.name} (${awaySetup.formation}).`,
    isKeyMoment: true,
  });

  const performSubstitution = (
    side: 'home' | 'away',
    outPlayer: InternalPlayerState,
    inPlayer: InternalPlayerState,
    minute: number,
    addedMinute: number | undefined,
    period: SimTimelineEvent['period'],
    reasonTag?: string
  ) => {
    const setup = side === 'home' ? homeSetup : awaySetup;
    const team = side === 'home' ? homeTeam : awayTeam;

    outPlayer.onPitch = false;
    outPlayer.stat.subbedOutMinute = minute;
    const oldSlotIdx = outPlayer.slotIndex;
    outPlayer.slotIndex = null;

    inPlayer.onPitch = true;
    inPlayer.slotIndex = oldSlotIdx;
    inPlayer.nodeRole = outPlayer.nodeRole;
    inPlayer.stat.subbedInMinute = minute;
    inPlayer.stat.roleSlot = outPlayer.nodeRole;

    if (oldSlotIdx !== null && setup.slots[oldSlotIdx]) {
      setup.slots[oldSlotIdx] = {
        ...setup.slots[oldSlotIdx],
        player: inPlayer.player,
      };
    }

    if (side === 'home') homeSubsUsed++;
    else awaySubsUsed++;

    const used = side === 'home' ? homeSubsUsed : awaySubsUsed;
    const reasonText = reasonTag ? ` (${reasonTag})` : '';

    events.push({
      id: `ev-sub-auto-${side}-${minute}-${addedMinute || 0}-${used}`,
      minute,
      addedMinute,
      period,
      type: 'sub',
      teamSide: side,
      playerId: inPlayer.player.id,
      playerName: getPlayerDisplayName(inPlayer.player),
      secondaryPlayerId: outPlayer.player.id,
      secondaryPlayerName: getPlayerDisplayName(outPlayer.player),
      headline: `Substitution (${team.code})`,
      commentary: `Fresh legs for ${team.shortName}${reasonText}: ${getPlayerDisplayName(inPlayer.player)} replaces ${getPlayerDisplayName(outPlayer.player)}.`,
      isKeyMoment: false,
    });
  };

  const applyCheckpoint = (cp: SimTacticalOverrideCheckpoint) => {
    const isHome = cp.teamSide === 'home';
    const pool = isHome ? homePool : awayPool;
    const poolMap = isHome ? homePoolMap : awayPoolMap;
    const prevSetup = isHome ? homeSetup : awaySetup;

    if (isHome) homeManualOverrideMinute = cp.minute;
    else awayManualOverrideMinute = cp.minute;

    const prevOnPitchIds = new Set(pool.filter((p) => p.onPitch).map((p) => p.player.id));
    const nextIds = new Set(cp.slots.map((s) => s.player?.id).filter(Boolean) as string[]);

    const leftPitch = pool.filter((p) => prevOnPitchIds.has(p.player.id) && !nextIds.has(p.player.id));
    const enteredPitch = cp.slots
      .map((s) => (s.player ? poolMap.get(s.player.id) : undefined))
      .filter((p): p is InternalPlayerState => Boolean(p) && !prevOnPitchIds.has(p!.player.id));

    leftPitch.forEach((outPlayer, i) => {
      outPlayer.onPitch = false;
      outPlayer.slotIndex = null;
      outPlayer.stat.subbedOutMinute = cp.minute;
      const inPlayer = enteredPitch[i];
      if (inPlayer) {
        if (isHome) homeSubsUsed++;
        else awaySubsUsed++;
        events.push({
          id: `ev-sub-manual-${cp.teamSide}-${cp.minute}-${i}`,
          minute: cp.minute,
          period: cp.minute <= 45 ? '1H' : cp.minute <= 90 ? '2H' : cp.minute <= 105 ? 'ET1' : 'ET2',
          type: 'sub',
          teamSide: cp.teamSide,
          playerId: inPlayer.player.id,
          playerName: getPlayerDisplayName(inPlayer.player),
          secondaryPlayerId: outPlayer.player.id,
          secondaryPlayerName: getPlayerDisplayName(outPlayer.player),
          headline: `Substitution (${isHome ? homeTeam.code : awayTeam.code})`,
          commentary: `${getPlayerDisplayName(inPlayer.player)} replaces ${getPlayerDisplayName(outPlayer.player)}.`,
          isKeyMoment: false,
        });
      }
    });

    cp.slots.forEach((s) => {
      if (!s.player) return;
      const entry = poolMap.get(s.player.id);
      if (entry && !entry.sentOff) {
        if (!entry.onPitch) {
          entry.onPitch = true;
          entry.stat.subbedInMinute = entry.stat.subbedInMinute ?? cp.minute;
        }
        entry.slotIndex = s.slotIndex;
        entry.nodeRole = s.node.role;
      }
    });

    const nextSetup: SimTeamSetup = {
      ...prevSetup,
      formation: cp.formation,
      activePlan: cp.planId || prevSetup.activePlan,
      slots: cp.slots,
      bench: cp.bench,
      plans: {
        ...prevSetup.plans,
        [cp.planId || prevSetup.activePlan]: cp.planConfig,
      },
    };
    if (isHome) homeSetup = nextSetup;
    else awaySetup = nextSetup;

    events.push({
      id: `ev-tactic-${cp.teamSide}-${cp.minute}-${overrideIdx}`,
      minute: cp.minute,
      period: cp.minute <= 45 ? '1H' : cp.minute <= 90 ? '2H' : cp.minute <= 105 ? 'ET1' : 'ET2',
      type: 'tactical-change',
      teamSide: cp.teamSide,
      headline: `Tactical Shift (${isHome ? homeTeam.code : awayTeam.code})`,
      commentary: `${isHome ? homeTeam.shortName : awayTeam.shortName} adjust to ${cp.formation} (${cp.planConfig.playingStyle}).`,
      isKeyMoment: false,
    });
  };

  // Autonomous manager tactical decision when a side hasn't received a recent user instruction
  const maybeAiTacticalShift = (
    side: 'home' | 'away',
    minute: number,
    addedMinute: number | undefined,
    period: SimTimelineEvent['period'],
    rng: () => number
  ) => {
    if (addedMinute || minute < 50) return;
    const manualMin = side === 'home' ? homeManualOverrideMinute : awayManualOverrideMinute;
    const cooldown = side === 'home' ? homeAiShiftCooldownUntil : awayAiShiftCooldownUntil;
    if (manualMin >= 0 && minute - manualMin <= 30) return;
    if (minute < cooldown) return;

    const setup = side === 'home' ? homeSetup : awaySetup;
    const team = side === 'home' ? homeTeam : awayTeam;
    const mods = side === 'home' ? homeMods : awayMods;
    const pool = side === 'home' ? homePool : awayPool;
    const goalDiff = side === 'home' ? homeScore - awayScore : awayScore - homeScore;
    const sentOffCount = pool.filter((p) => p.sentOff).length;

    const counterConceded = side === 'home' ? homeCounterShotsConceded : awayCounterShotsConceded;
    const activePlanCfg = setup.plans[setup.activePlan];

    let desiredPlan: SimPlanId | null = null;
    let reason = '';

    if (sentOffCount > 0 && goalDiff >= 0 && setup.activePlan !== 'C') {
      desiredPlan = 'C';
      reason = 'reshaping into a compact block after the dismissal';
    } else if (
      counterConceded >= 3 &&
      (activePlanCfg?.defensiveLine ?? 60) >= 66 &&
      goalDiff >= 0 &&
      setup.activePlan !== 'C' &&
      rng() < 0.45
    ) {
      desiredPlan = 'C';
      reason = 'dropping the defensive line after getting caught on transitions';
    } else if (goalDiff <= -2 && minute >= 54 && setup.activePlan !== 'B') {
      desiredPlan = 'B';
      reason = 'pushing high to chase the deficit';
    } else if (goalDiff === -1 && minute >= 64 && setup.activePlan === 'A' && rng() < 0.25 + mods.comebackBoldness * 0.14) {
      desiredPlan = 'B';
      reason = 'committing extra numbers in search of an equaliser';
    } else if (goalDiff === 1 && minute >= 75 && setup.activePlan !== 'C' && rng() < (mods.defensiveBonus > 0.6 ? 0.32 : 0.18)) {
      desiredPlan = 'C';
      reason = 'tightening structure to protect the narrow lead';
    } else if (goalDiff === 0 && setup.activePlan === 'C' && minute >= 70 && mods.comebackBoldness >= 1.1) {
      desiredPlan = 'A';
      reason = 'returning to base shape to seek a late winner';
    }

    if (!desiredPlan || desiredPlan === setup.activePlan) return;

    const nextPlan = setup.plans[desiredPlan];
    if (!nextPlan) return;

    const currentIds = pool
      .filter((p) => p.onPitch && !p.sentOff)
      .map((p) => p.player.id);
    const { slots, bench } = buildDugoutLineup(team, nextPlan.formation, currentIds);

    // Sync slots to live pool without unintentionally pulling sent-off or subbed players
    const onPitchById = new Map(pool.filter((p) => p.onPitch && !p.sentOff).map((p) => [p.player.id, p]));
    const updatedSetup: SimTeamSetup = {
      ...setup,
      activePlan: desiredPlan,
      formation: nextPlan.formation,
      slots: slots.map((s) => {
        const liveMatch = s.player ? onPitchById.get(s.player.id) : undefined;
        if (liveMatch) {
          liveMatch.slotIndex = s.slotIndex;
          liveMatch.nodeRole = s.node.role;
          liveMatch.stat.roleSlot = s.node.role;
          return { ...s, player: liveMatch.player };
        }
        return s;
      }),
      bench,
    };

    if (side === 'home') {
      homeSetup = updatedSetup;
      homeAiShiftCooldownUntil = minute + 16;
    } else {
      awaySetup = updatedSetup;
      awayAiShiftCooldownUntil = minute + 16;
    }

    events.push({
      id: `ev-tactic-ai-${side}-${minute}`,
      minute,
      period,
      type: 'tactical-change',
      teamSide: side,
      headline: `Manager Adjustment (${team.code})`,
      commentary: `${mods.managerName || team.shortName + ' dugout'} switches to ${nextPlan.formation} (${nextPlan.playingStyle}), ${reason}.`,
      isKeyMoment: false,
    });
  };

  const maybeAutoSub = (
    side: 'home' | 'away',
    minute: number,
    addedMinute: number | undefined,
    period: SimTimelineEvent['period'],
    rng: () => number
  ) => {
    const used = side === 'home' ? homeSubsUsed : awaySubsUsed;
    const maxSubs = period === 'ET1' || period === 'ET2' ? 6 : 5;
    if (used >= maxSubs) return;

    const pool = side === 'home' ? homePool : awayPool;
    const goalDiff = side === 'home' ? homeScore - awayScore : awayScore - homeScore;

    // 1. Emergency GK cover if goalkeeper was sent off
    const onPitchGk = pool.find((p) => p.onPitch && !p.sentOff && p.nodeRole === 'GK');
    if (onPitchGk && onPitchGk.player.position !== 'GK') {
      const benchGk = pool.find(
        (p) => !p.onPitch && p.stat.subbedOutMinute === null && p.player.position === 'GK' && p.player.injuryStatus !== 'injured'
      );
      const sacrificeOut = pool
        .filter((p) => p.onPitch && !p.sentOff && p.nodeRole !== 'GK')
        .sort((a, b) => a.player.overallRating - b.player.overallRating)[0];
      if (benchGk && sacrificeOut) {
        performSubstitution(side, sacrificeOut, benchGk, minute, addedMinute, period, 'tactical GK cover');
        return;
      }
    }

    if (minute < 55) return;

    const subChance =
      period === 'ET1' || period === 'ET2'
        ? 0.16
        : minute >= 74
        ? 0.13
        : minute >= 63
        ? 0.08
        : 0.045;
    if (rng() > subChance) return;

    const eligibleBench = pool.filter(
      (p) => !p.onPitch && p.stat.subbedOutMinute === null && p.player.position !== 'GK' && p.player.injuryStatus !== 'injured'
    );
    if (eligibleBench.length === 0) return;

    const outfieldActive = pool.filter((p) => p.onPitch && !p.sentOff && p.nodeRole !== 'GK');
    if (outfieldActive.length === 0) return;

    let outCandidate: InternalPlayerState | undefined;
    let inCandidate: InternalPlayerState | undefined;
    let reason = '';

    // 2. Card-risk protection (prevent second yellow in intense battles)
    if (minute >= 58 && minute <= 80 && rng() < 0.38) {
      const cautioned = outfieldActive
        .filter((p) => p.yellows === 1 && p.stamina < 80)
        .sort((a, b) => a.stamina - b.stamina)[0];
      if (cautioned) {
        outCandidate = cautioned;
        reason = 'avoiding a second yellow card';
      }
    }

    // 3. Chasing a goal -> take off tired defender/CDM or underperformer for fresh ATT / attacking MID
    if (!outCandidate && goalDiff < 0 && minute >= 60) {
      outCandidate = outfieldActive
        .sort((a, b) => {
          const scoreA = (a.player.position === 'DEF' || a.nodeRole.includes('CDM') ? -8 : 0) + a.stamina + (a.stat.rating - 6) * 6;
          const scoreB = (b.player.position === 'DEF' || b.nodeRole.includes('CDM') ? -8 : 0) + b.stamina + (b.stat.rating - 6) * 6;
          return scoreA - scoreB;
        })[0];

      if (outCandidate && (outCandidate.stamina <= 82 || minute >= 68)) {
        inCandidate = [...eligibleBench].sort((a, b) => {
          const atkA = a.player.position === 'ATT' ? 16 : a.player.positionDetail === 'CAM' || a.player.positionDetail === 'LW' || a.player.positionDetail === 'RW' ? 12 : 0;
          const atkB = b.player.position === 'ATT' ? 16 : b.player.positionDetail === 'CAM' || b.player.positionDetail === 'LW' || b.player.positionDetail === 'RW' ? 12 : 0;
          return b.player.overallRating + atkB - (a.player.overallRating + atkA);
        })[0];
        reason = 'chasing a goal';
      }
    }

    // 4. Protecting a narrow lead late -> bring on fresh DEF / CDM for tired forward
    if (!outCandidate && goalDiff === 1 && minute >= 73) {
      outCandidate = outfieldActive
        .sort((a, b) => {
          const atkPenaltyA = a.player.position === 'ATT' ? -10 : 0;
          const atkPenaltyB = b.player.position === 'ATT' ? -10 : 0;
          return a.stamina + atkPenaltyA - (b.stamina + atkPenaltyB);
        })[0];

      if (outCandidate && outCandidate.stamina <= 79) {
        inCandidate = [...eligibleBench].sort((a, b) => {
          const defA = a.player.position === 'DEF' || a.player.positionDetail === 'CDM' ? 16 : 0;
          const defB = b.player.position === 'DEF' || b.player.positionDetail === 'CDM' ? 16 : 0;
          return b.player.overallRating + defB - (a.player.overallRating + defA);
        })[0];
        reason = 'reinforcing defensive shape';
      }
    }

    // 5. General fatigue replacement
    if (!outCandidate) {
      const threshold = period === 'ET1' || period === 'ET2' ? 78 : 71;
      const mostTired = [...outfieldActive].sort((a, b) => a.stamina - b.stamina)[0];
      if (!mostTired || mostTired.stamina > threshold) return;
      outCandidate = mostTired;
    }

    if (!inCandidate && outCandidate) {
      inCandidate = [...eligibleBench].sort((a, b) => {
        const lineBonusA = a.player.position === outCandidate!.player.position ? 12 : 0;
        const lineBonusB = b.player.position === outCandidate!.player.position ? 12 : 0;
        return b.player.overallRating + lineBonusB - (a.player.overallRating + lineBonusA);
      })[0];
    }

    if (!outCandidate || !inCandidate) return;
    performSubstitution(side, outCandidate, inCandidate, minute, addedMinute, period, reason || undefined);
  };

  const toActiveEntries = (pool: InternalPlayerState[]): ActivePitchPlayer[] =>
    pool
      .filter((p) => p.onPitch && !p.sentOff)
      .map((p) => ({
        player: p.player,
        nodeRole: p.nodeRole,
        slotIndex: p.slotIndex,
        stamina: p.stamina,
        subbedInMinute: p.stat.subbedInMinute,
        yellows: p.yellows,
        sentOff: p.sentOff,
        matchFormDelta: p.matchFormDelta,
      }));

  const hTeamType = getTeamType(homeTeam);
  const aTeamType = getTeamType(awayTeam);

  const simulateMinuteTick = (
    minute: number,
    addedMinute: number | undefined,
    period: SimTimelineEvent['period'],
    tickId: string
  ) => {
    while (overrideIdx < overrides.length && overrides[overrideIdx].minute <= minute) {
      applyCheckpoint(overrides[overrideIdx]);
      overrideIdx++;
    }

    const rng = createSeededRng(`${seed}::${tickId}`);

    // AI Managers consider tactical responses to live match developments
    maybeAiTacticalShift('home', minute, addedMinute, period, rng);
    maybeAiTacticalShift('away', minute, addedMinute, period, rng);

    const homePlan = homeSetup.plans[homeSetup.activePlan];
    const awayPlan = awaySetup.plans[awaySetup.activePlan];

    // Late-match comeback drive when trailing in 2H or ET
    const latePhaseIntensity = minute >= 76 ? 1.0 : minute >= 58 ? 0.55 : 0;
    const aggDiff =
      competition.isTwoLegged && competition.legNumber === 2
        ? (competition.firstLegHomeGoals ?? 0) + homeScore - ((competition.firstLegAwayGoals ?? 0) + awayScore)
        : homeScore - awayScore;

    const hComebackBoost =
      aggDiff < 0 && latePhaseIntensity > 0 ? homeMods.comebackBoldness * latePhaseIntensity : 0;
    const aComebackBoost =
      aggDiff > 0 && latePhaseIntensity > 0 ? awayMods.comebackBoldness * latePhaseIntensity : 0;

    // Crowd momentum wave: opening intensity + chasing boost at home stadium
    const crowdSurge =
      crowdAtmosphere.homeEnergyBase > 0 && (minute <= 14 || (minute >= 74 && homeScore <= awayScore))
        ? 0.35
        : 0;
    const homeBoostVal = crowdAtmosphere.homeEnergyBase + crowdSurge;

    const hPlayersOnPitch = homePool.filter((p) => p.onPitch && !p.sentOff);
    const aPlayersOnPitch = awayPool.filter((p) => p.onPitch && !p.sentOff);

    const hProfile = computeDynamicTeamProfile(homeSetup, toActiveEntries(homePool), true, homeMods, {
      minute,
      goalDiff: homeScore - awayScore,
      isKnockout: competition.isKnockout,
      homeAdvantageVal: homeBoostVal,
      lateComebackBoost: hComebackBoost,
      psychologyBoost: homeConfidence - homeShockTicks * 0.7,
      teamType: hTeamType,
      cohesionScale: compBenchmark.chemistryCohesionBase,
    });

    const aProfile = computeDynamicTeamProfile(awaySetup, toActiveEntries(awayPool), false, awayMods, {
      minute,
      goalDiff: awayScore - homeScore,
      isKnockout: competition.isKnockout,
      homeAdvantageVal: 0,
      lateComebackBoost: aComebackBoost,
      psychologyBoost: awayConfidence - awayShockTicks * 0.7,
      teamType: aTeamType,
      cohesionScale: compBenchmark.chemistryCohesionBase,
    });

    // Natural decay of shock windows and confidence toward neutral
    if (homeShockTicks > 0) homeShockTicks--;
    if (awayShockTicks > 0) awayShockTicks--;
    homeConfidence *= 0.982;
    awayConfidence *= 0.982;

    // Sustained possession spell shifts organically with realistic competition distribution
    spellControl *= 0.82;

    const manDiff = (hPlayersOnPitch.length - aPlayersOnPitch.length) * 5.6;
    const hLeadConservation =
      homeScore - awayScore >= 1 && minute >= 70 ? -(minute >= 80 ? 3.2 : 1.8) : 0;
    const aLeadConservation =
      awayScore - homeScore >= 1 && minute >= 70 ? -(minute >= 80 ? 3.2 : 1.8) : 0;

    const hPossPower = hProfile.possessionCraft + spellControl * 3.8 + manDiff + hLeadConservation;
    const aPossPower = aProfile.possessionCraft - spellControl * 3.8 + aLeadConservation;

    const hPossProb = Math.max(
      0.26,
      Math.min(0.74, 1 / (1 + Math.exp(-(hPossPower - aPossPower) / 12.0)))
    );
    const homeHasBall = rng() < hPossProb;

    homeAcc.totalTicks++;
    awayAcc.totalTicks++;
    if (homeHasBall) {
      homeAcc.possessionTicks++;
      spellControl = Math.min(1, spellControl + 0.14);
    } else {
      awayAcc.possessionTicks++;
      spellControl = Math.max(-1, spellControl - 0.14);
    }

    // Per-minute stamina drain, physical distance, and attribute/environment-calibrated passing telemetry
    const updateTeamTickTelemetry = (
      players: InternalPlayerState[],
      profile: DynamicTeamProfile,
      oppProfile: DynamicTeamProfile,
      _plan: TacticalPlanConfig,
      acc: ReturnType<typeof makeAcc>,
      hasBall: boolean
    ) => {
      const tempoFactor =
        (0.84 +
          (profile.style.effectivePressing / 100) * 0.24 +
          (profile.style.effectiveBuildSpeed / 100) * 0.14) *
        compBenchmark.tempoFactor;
      const possPassVolume = profile.style.isPossession ? 7 : profile.style.isDirectCounter ? 4 : 5.5;
      const basePasses = hasBall
        ? Math.round((possPassVolume + rng() * 4.5) * compBenchmark.tempoFactor)
        : Math.round(1.5 + rng() * 2.5);

      const styleAccMod = profile.style.isPossession ? 0.04 : profile.style.isDirectCounter ? -0.042 : 0;
      const netPressDisrupt =
        Math.max(-0.015, (oppProfile.pressingEfficiency - 68) * 0.0016 - profile.pressResistance * 0.0028);
      const fatigueAccPenalty = profile.fatiguePenalty * 0.0038;
      const passSuccessRate = Math.max(
        0.71,
        Math.min(
          0.95,
          0.848 +
            (profile.passingSkill - 72) * 0.0036 +
            styleAccMod +
            environment.passingMod -
            netPressDisrupt -
            fatigueAccPenalty
        )
      );

      // Avoid downward rounding bias on small off-ball pass batches
      const completedFloat = basePasses * (passSuccessRate + (rng() - 0.5) * 0.05);
      const completed = Math.min(
        basePasses,
        Math.floor(completedFloat) + (rng() < completedFloat - Math.floor(completedFloat) ? 1 : 0)
      );
      acc.passesAttempted += basePasses;
      acc.passesCompleted += completed;

      // Assign passes & physical stamina expenditure to on-pitch players
      players.forEach((ps) => {
        ps.stat.minutesPlayed++;
        const isGk = ps.nodeRole === 'GK';
        const runM = isGk ? 40 + rng() * 12 : (96 + rng() * 32) * tempoFactor;
        const sprintM = isGk ? 3 + rng() * 3 : (13 + rng() * 17) * tempoFactor;
        const sprintCount = isGk ? (rng() < 0.07 ? 1 : 0) : rng() < 0.33 * tempoFactor ? 1 : 0;

        ps.runMeters += runM;
        ps.sprintMeters += sprintM;
        ps.sprints += sprintCount;

        // Natural fatigue affected by physical stamina, pressing workload, weather & competition tempo
        const physResilience = 1.15 - ((ps.player.attributes.physical || 72) - 65) * 0.0048;
        const offBallPressDrain = !hasBall && profile.style.isHighPress ? 1.12 : 1.0;
        const drain = isGk
          ? 0.1
          : 0.36 * tempoFactor * physResilience * offBallPressDrain * environment.staminaDrainMod * compBenchmark.staminaDrainFactor;
        ps.stamina = Math.max(32, ps.stamina - drain);

        acc.runningMeters += runM;
        acc.sprintMeters += sprintM;
        acc.sprints += sprintCount;

        if (!isGk && rng() < (hasBall ? 0.62 : 0.32)) {
          ps.stat.passesAttempted += 1;
          if (rng() < passSuccessRate) {
            ps.stat.passesCompleted += 1;
            // Through-pass attempts by playmakers, attacking mids, and forward creators
            const isCreator =
              ps.player.position === 'MID' ||
              ps.nodeRole.includes('CAM') ||
              ps.nodeRole === 'LW' ||
              ps.nodeRole === 'RW' ||
              ps.nodeRole === 'LM' ||
              ps.nodeRole === 'RM';
            const tbRate =
              (isCreator ? 0.045 : 0.012) *
              (profile.style.isThroughBallFocus ? 1.55 : 1.0) *
              (oppProfile.style.effectiveDefLine > 60 ? 1.25 : 0.9);
            if (hasBall && microRng() < tbRate) {
              ps.stat.throughPasses = (ps.stat.throughPasses || 0) + 1;
              acc.throughPasses += 1;
              const tbSuccess = Math.max(
                0.28,
                Math.min(0.68, 0.42 + ((ps.player.attributes.passing || 70) - 70) * 0.008)
              );
              if (microRng() < tbSuccess) {
                ps.stat.throughPassesCompleted = (ps.stat.throughPassesCompleted || 0) + 1;
                acc.throughPassesCompleted += 1;
              } else {
                ps.stat.possessionLost = (ps.stat.possessionLost || 0) + 1;
                acc.possessionLost += 1;
              }
            }
          } else if (microRng() < 0.72) {
            // Misplaced pass resulting in lost possession
            ps.stat.possessionLost = (ps.stat.possessionLost || 0) + 1;
            acc.possessionLost += 1;
          }
        }
      });

      // Midfield/ground duels & interceptions influenced by defending & physical attributes
      acc.duelsTotal += 1 + (rng() < 0.45 ? 1 : 0);
      const duelProb = Math.max(
        0.34,
        Math.min(0.68, 0.5 + (profile.mid - oppProfile.mid) * 0.008 + (hasBall ? 0.03 : -0.02))
      );
      if (rng() < duelProb) acc.duelsWon += 1;
      if (!hasBall && rng() < 0.18 + (profile.style.effectivePressing - 60) * 0.0022) {
        acc.interceptions += 1;
        const interceptCandidates = players.filter((p) => p.nodeRole !== 'GK');
        if (interceptCandidates.length > 0 && rng() < 0.55) {
          interceptCandidates[Math.floor(rng() * interceptCandidates.length)].stat.interceptions++;
        }
      }
    };

    updateTeamTickTelemetry(hPlayersOnPitch, hProfile, aProfile, homePlan, homeAcc, homeHasBall);
    updateTeamTickTelemetry(aPlayersOnPitch, aProfile, hProfile, awayPlan, awayAcc, !homeHasBall);

    // Smart Context-Aware Substitutions
    const prevHomeSubs = homeSubsUsed;
    const prevAwaySubs = awaySubsUsed;
    maybeAutoSub('home', minute, addedMinute, period, rng);
    maybeAutoSub('away', minute, addedMinute, period, rng);

    // In-match injury risk (slightly higher when fatigued players sprint heavily)
    const hAvgTired = hProfile.avgStamina < 58 ? 1.35 : 1.0;
    const aAvgTired = aProfile.avgStamina < 58 ? 1.35 : 1.0;
    if (minute >= 10 && rng() < 0.00058 * Math.max(hAvgTired, aAvgTired) * compBenchmark.injuryFactor) {
      const injSide: 'home' | 'away' = rng() < hAvgTired / (hAvgTired + aAvgTired) ? 'home' : 'away';
      const injPool = injSide === 'home' ? homePool : awayPool;
      const injTeam = injSide === 'home' ? homeTeam : awayTeam;
      const usedSubs = injSide === 'home' ? homeSubsUsed : awaySubsUsed;
      const maxSubs = period === 'ET1' || period === 'ET2' ? 6 : 5;
      const activeOutfield = injPool.filter((p) => p.onPitch && !p.sentOff && p.nodeRole !== 'GK');
      const victim = activeOutfield.length
        ? activeOutfield[Math.floor(rng() * activeOutfield.length)]
        : null;
      if (victim) {
        const repl =
          usedSubs < maxSubs
            ? injPool
                .filter(
                  (p) =>
                    !p.onPitch &&
                    p.stat.subbedOutMinute === null &&
                    p.player.position !== 'GK' &&
                    p.player.injuryStatus !== 'injured'
                )
                .sort((a, b) => {
                  const posFitA = a.player.position === victim.player.position ? 12 : 0;
                  const posFitB = b.player.position === victim.player.position ? 12 : 0;
                  return b.player.overallRating + posFitB - (a.player.overallRating + posFitA);
                })[0] || null
            : null;
        if (repl) {
          performSubstitution(injSide, victim, repl, minute, addedMinute, period, 'forced injury');
        } else {
          victim.stamina = Math.max(32, victim.stamina - 24);
        }
        events.push({
          id: `ev-inj-${tickId}-${injSide}`,
          minute,
          addedMinute,
          period,
          type: 'injury',
          teamSide: injSide,
          playerId: victim.player.id,
          playerName: getPlayerDisplayName(victim.player),
          secondaryPlayerId: repl?.player.id,
          secondaryPlayerName: repl ? getPlayerDisplayName(repl.player) : undefined,
          headline: `Injury Concern — ${getPlayerDisplayName(victim.player)} (${injTeam.code})`,
          commentary: repl
            ? `${getPlayerDisplayName(victim.player)} picks up a knock and has to come off; ${getPlayerDisplayName(repl.player)} replaces him for ${injTeam.shortName}.`
            : `${getPlayerDisplayName(victim.player)} suffers a knock and has to soldier on for ${injTeam.shortName}.`,
          isKeyMoment: true,
        });
      }
    }

    // Event-driven minute pressure & tactical exchanges
    let homeThreat = 0;
    let awayThreat = 0;
    let tickGoalSide: 'home' | 'away' | undefined;
    let forcedPenaltyAward: { side: 'home' | 'away'; causedBy?: InternalPlayerState } | null = null;
    let cornerCreatedBonusFor: 'home' | 'away' | null = null;

    if (homeSubsUsed > prevHomeSubs) {
      homeThreat += 4.5;
      spellControl = Math.min(1, spellControl + 0.1);
    }
    if (awaySubsUsed > prevAwaySubs) {
      awayThreat += 4.5;
      spellControl = Math.max(-1, spellControl - 0.1);
    }

    const possSide: 'home' | 'away' = homeHasBall ? 'home' : 'away';
    const defSide: 'home' | 'away' = homeHasBall ? 'away' : 'home';
    const possProfile = homeHasBall ? hProfile : aProfile;
    const oppProfile = homeHasBall ? aProfile : hProfile;

    // Cross-team tactical matchup evaluation (wide overloads, central overloads, press resistance)
    const matchup = computeTacticalMatchupModifiers({
      attWidth: possProfile.style.effectiveWidth,
      attWidePlayers: possProfile.formationShape.wideCount,
      attCentralMids: possProfile.formationShape.centralMidCount,
      attPressResistance: possProfile.pressResistance,
      attPace: possProfile.paceCounterThreat,
      defWidth: oppProfile.style.effectiveWidth,
      defWidePlayers: oppProfile.formationShape.wideCount,
      defCentralMids: oppProfile.formationShape.centralMidCount,
      defLine: oppProfile.style.effectiveDefLine,
      defPressing: oppProfile.style.effectivePressing,
      defBackCount: oppProfile.formationShape.defCount,
      defStamina: oppProfile.avgStamina,
    });

    // 1. Possession territorial pressure (tempered so sterile possession doesn't inflate threat unfairly)
    const possEdge = Math.abs(hPossProb - 0.5) * 18;
    const linePush = Math.max(0, (possProfile.style.effectiveDefLine - 58) * 0.08);
    if (homeHasBall) {
      homeThreat += 5.0 + possEdge + linePush + Math.max(0, manDiff * 0.45);
      awayThreat += 1.6;
    } else {
      awayThreat += 5.0 + possEdge + linePush + Math.max(0, -manDiff * 0.45);
      homeThreat += 1.6;
    }

    // 2. Final-third penetration vs Compactness/Pressing turnovers (factors tactical matchups!)
    const penetrationProb = Math.max(
      0.16,
      Math.min(
        0.68,
        0.3 +
          (possProfile.att - oppProfile.defensiveWall) * 0.011 +
          (possProfile.dribblingSkill - 70) * 0.0025 +
          matchup.attWideOverloadBonus +
          matchup.attCentralOverloadBonus +
          matchup.pressBrokenSpaceBonus -
          (oppProfile.style.isLowBlock ? 0.05 : 0)
      )
    );

    if (rng() < penetrationProb) {
      const boxEntry = rng() < 0.44 + (possProfile.style.effectiveBuildSpeed - 64) * 0.0025;
      const attCredit = boxEntry ? 9.5 : 4.5;
      if (possSide === 'home') homeThreat += attCredit;
      else awayThreat += attCredit;
      if (boxEntry) {
        (possSide === 'home' ? homeAcc : awayAcc).touchesInBox += 1;
      }
    } else if (rng() < Math.max(0.12, 0.25 + (oppProfile.pressingEfficiency - 62) * 0.0036 + matchup.pressDisruptionMod)) {
      // Defensive tackle/turnover -> launches potential transition threat
      const dAcc = defSide === 'home' ? homeAcc : awayAcc;
      const defList = defSide === 'home' ? hPlayersOnPitch : aPlayersOnPitch;
      const tacklerPool = defList.filter((p) => p.player.position === 'DEF' || p.player.position === 'MID');
      dAcc.tacklesTotal += 1;
      const winTackleProb = Math.max(0.42, Math.min(0.76, 0.58 + (oppProfile.def - possProfile.att) * 0.007));
      if (rng() < winTackleProb) {
        dAcc.tacklesWon += 1;
        if (tacklerPool.length > 0 && rng() < 0.55) {
          tacklerPool[Math.floor(rng() * tacklerPool.length)].stat.tackles++;
        }
        // Credit dispossessed carrier turnover on the team losing the ball
        const possOutfield = (possSide === 'home' ? hPlayersOnPitch : aPlayersOnPitch).filter(
          (p) => p.nodeRole !== 'GK'
        );
        if (possOutfield.length > 0) {
          const carrier = possOutfield[Math.floor(microRng() * possOutfield.length)];
          carrier.stat.possessionLost = (carrier.stat.possessionLost || 0) + 1;
          (possSide === 'home' ? homeAcc : awayAcc).possessionLost += 1;
        }
        if (defSide === 'home') {
          homeThreat += 5.5;
          spellControl = Math.min(1, spellControl + 0.16);
        } else {
          awayThreat += 5.5;
          spellControl = Math.max(-1, spellControl - 0.16);
        }
      }
    }

    const displayLabel = addedMinute ? `${minute}+${addedMinute}'` : `${minute}'`;

    // 3. Offside traps vs High Defensive Lines + Calibrated Corners (~10.2/match)
    const offsideTrapRate =
      0.02 + Math.max(0, (oppProfile.style.effectiveDefLine - 58) * 0.00095) + (possProfile.style.isThroughBallFocus ? 0.01 : 0);
    if (rng() < offsideTrapRate) {
      const attOutfield = (possSide === 'home' ? hPlayersOnPitch : aPlayersOnPitch).filter(
        (p) => p.player.position === 'ATT' || p.nodeRole === 'LW' || p.nodeRole === 'RW'
      );
      if (attOutfield.length > 0) {
        const caught = attOutfield[Math.floor(microRng() * attOutfield.length)];
        caught.stat.possessionLost = (caught.stat.possessionLost || 0) + 1;
        (possSide === 'home' ? homeAcc : awayAcc).possessionLost += 1;
      }
      if (possSide === 'home') {
        homeAcc.offsides++;
        awayThreat += 3;
      } else {
        awayAcc.offsides++;
        homeThreat += 3;
      }
    } else if (rng() < 0.06 + (possProfile.style.isCrossFocus ? 0.014 : 0) + matchup.attWideOverloadBonus * 0.18) {
      if (homeHasBall) {
        homeAcc.corners++;
        homeThreat += 8.5;
      } else {
        awayAcc.corners++;
        awayThreat += 8.5;
      }
      cornerCreatedBonusFor = possSide;
    }

    // 4. Fouls, Referee Strictness & Advantage Rule, Box Fouls & Disciplinary Cards
    const fatigueFoulExtra = Math.max(0, oppProfile.fatiguePenalty * 0.008);
    const aggressiveFoulExtra = oppProfile.style.isAggressiveTackling ? 0.042 : 0;
    const foulBase = (0.255 + fatigueFoulExtra + aggressiveFoulExtra + environment.foulRiskMod) *
      refereeProfile.foulThreshold *
      compBenchmark.foulFactor;
    const foulProb = Math.min(0.42, foulBase);
    let advantageBonusProb = 0;

    if (rng() < foulProb) {
      const foulAcc = defSide === 'home' ? homeAcc : awayAcc;
      const foulTeam = defSide === 'home' ? homeTeam : awayTeam;
      const foulPool = (defSide === 'home' ? hPlayersOnPitch : aPlayersOnPitch).filter(
        (p) => p.nodeRole !== 'GK'
      );

      // Was it a clumsy foul inside the penalty box against fast/tricky attackers?
      const paceMismatchPenalty = Math.max(0, (possProfile.paceCounterThreat - 72) * 0.0004);
      const tirednessPenaltyRisk = oppProfile.avgStamina < 60 ? 0.006 : 0;
      const homePenTilt =
        possSide === 'home'
          ? 1 + crowdAtmosphere.refereeCrowdTilt * 1.4
          : 1 - crowdAtmosphere.refereeCrowdTilt * 0.6;
      const boxFoulProb = Math.min(
        0.025,
        (0.0075 + paceMismatchPenalty + tirednessPenaltyRisk) * refereeProfile.penaltyStrictness * homePenTilt
      );
      const isBoxPenaltyFoul = rng() < boxFoulProb;

      // Referee Advantage Rule on non-penalty mid-pitch fouls when possession side breaks forward
      const playedAdvantage =
        !isBoxPenaltyFoul && rng() < refereeProfile.advantageTendency;

      if (!playedAdvantage) {
        foulAcc.fouls++;
      } else {
        advantageBonusProb = 0.065;
        if (possSide === 'home') homeThreat += 6.5;
        else awayThreat += 6.5;
      }

      const culprit = foulPool.length > 0 ? foulPool[Math.floor(rng() * foulPool.length)] : undefined;
      if (culprit && !playedAdvantage) {
        culprit.stat.foulsCommitted = (culprit.stat.foulsCommitted || 0) + 1;
      }

      if (isBoxPenaltyFoul) {
        forcedPenaltyAward = { side: possSide, causedBy: culprit };
        const attTeamName = (possSide === 'home' ? homeTeam : awayTeam).shortName;
        const penTeamCode = (possSide === 'home' ? homeTeam : awayTeam).code;
        if (possSide === 'home') homeThreat += 24;
        else awayThreat += 24;

        events.push({
          id: `ev-pen-award-${tickId}-${possSide}`,
          minute,
          addedMinute,
          period,
          type: 'penalty-awarded',
          teamSide: possSide,
          secondaryPlayerId: culprit?.player.id,
          secondaryPlayerName: culprit ? getPlayerDisplayName(culprit.player) : undefined,
          headline: `PENALTY AWARDED (${penTeamCode})`,
          commentary: culprit
            ? `Penalty to ${attTeamName}! ${refereeProfile.name} points to the spot after ${getPlayerDisplayName(culprit.player)} brings down the attacker inside the box.`
            : `Penalty awarded to ${attTeamName} after a clumsy challenge inside the area!`,
          isKeyMoment: true,
        });
      } else if (!playedAdvantage) {
        const inDangerousArea = rng() < 0.36;
        const foulShift = inDangerousArea ? 8.0 : 3.0;
        if (possSide === 'home') homeThreat += foulShift;
        else awayThreat += foulShift;
      }

      // Disciplinary card probability shaped by referee strictness, competition & crowd bias
      const crowdCardBias =
        defSide === 'away'
          ? 1 + crowdAtmosphere.refereeCrowdTilt
          : 1 - crowdAtmosphere.refereeCrowdTilt * 0.5;
      const baseCardChance = playedAdvantage
        ? 0.05
        : isBoxPenaltyFoul
        ? 0.36
        : 0.135 + (oppProfile.style.isAggressiveTackling ? 0.036 : 0) + (minute >= 70 ? 0.022 : 0);
      const cardChance = Math.min(
        0.6,
        baseCardChance * refereeProfile.cardStrictness * compBenchmark.cardFactor * crowdCardBias
      );

      if (culprit && rng() < cardChance) {
        const straightRedProb =
          (isBoxPenaltyFoul ? 0.026 : 0.015) *
          compBenchmark.redFactor *
          (0.85 + refereeProfile.cardStrictness * 0.15);
        const cardRoll = rng();
        if (cardRoll < straightRedProb && culprit.yellows === 0) {
          culprit.sentOff = true;
          culprit.stat.redCards += 1;
          foulAcc.redCards++;
          if (possSide === 'home') {
            homeThreat += 26;
            awayConfidence = Math.max(-8, awayConfidence - 3.2);
          } else {
            awayThreat += 26;
            homeConfidence = Math.max(-8, homeConfidence - 3.2);
          }
          events.push({
            id: `ev-red-${tickId}-${defSide}`,
            minute,
            addedMinute,
            period,
            type: 'red',
            teamSide: defSide,
            playerId: culprit.player.id,
            playerName: getPlayerDisplayName(culprit.player),
            headline: `Red Card — ${getPlayerDisplayName(culprit.player)} (${foulTeam.code})`,
            commentary: `RED CARD! ${refereeProfile.name} dismisses ${getPlayerDisplayName(culprit.player)} for a reckless challenge! ${foulTeam.shortName} are down to ten.`,
            isKeyMoment: true,
          });
        } else if (culprit.yellows === 0 || rng() < 0.38) {
          culprit.yellows += 1;
          culprit.stat.yellowCards += 1;
          foulAcc.yellowCards++;
          if (culprit.yellows >= 2) {
            culprit.sentOff = true;
            culprit.stat.redCards += 1;
            foulAcc.redCards++;
            if (possSide === 'home') {
              homeThreat += 26;
              awayConfidence = Math.max(-8, awayConfidence - 2.8);
            } else {
              awayThreat += 26;
              homeConfidence = Math.max(-8, homeConfidence - 2.8);
            }
            events.push({
              id: `ev-y2r-${tickId}-${defSide}`,
              minute,
              addedMinute,
              period,
              type: 'second-yellow',
              teamSide: defSide,
              playerId: culprit.player.id,
              playerName: getPlayerDisplayName(culprit.player),
              headline: `Second Yellow & Red — ${getPlayerDisplayName(culprit.player)}`,
              commentary: `${getPlayerDisplayName(culprit.player)} sees a second yellow card from ${refereeProfile.name} and marches off for ${foulTeam.shortName}!`,
              isKeyMoment: true,
            });
          } else {
            if (possSide === 'home') homeThreat += 4;
            else awayThreat += 4;
            events.push({
              id: `ev-yel-${tickId}-${defSide}`,
              minute,
              addedMinute,
              period,
              type: 'yellow',
              teamSide: defSide,
              playerId: culprit.player.id,
              playerName: getPlayerDisplayName(culprit.player),
              headline: `Yellow Card — ${getPlayerDisplayName(culprit.player)}`,
              commentary: `${getPlayerDisplayName(culprit.player)} (${foulTeam.code}) is booked by ${refereeProfile.name}${playedAdvantage ? ' after advantage was played' : ''}.`,
              isKeyMoment: false,
            });
          }
        }
      }
    }

    // 5. Attack & Counterattack Shot Generation (competition tempo, tactical matchups & transitions)
    const oppHighLineSpace = Math.max(0, (possProfile.style.effectiveDefLine - 58) * 0.0014);
    const oppOvercommit = Math.max(0, possProfile.style.mentalityScore * 0.0072);
    const counterSpeedEdge = Math.max(0, (oppProfile.paceCounterThreat - 68) * 0.001);
    const counterQualityEdge = Math.max(-0.014, Math.min(0.018, (oppProfile.att - possProfile.def) * 0.00085));
    const counterTriggerProb = Math.max(
      0.004,
      ((oppProfile.style.isDirectCounter
        ? 0.023 + oppHighLineSpace + oppOvercommit + counterSpeedEdge
        : 0.009 + oppHighLineSpace * 0.6 + oppOvercommit * 0.5) +
        counterQualityEdge) *
        compBenchmark.shotRateFactor
    );

    const possCreativeEdge = (possProfile.att - oppProfile.defensiveWall) * 0.0044;
    const possBuildTempo = (possProfile.style.effectiveBuildSpeed - 64) * 0.001;
    const lateUrgencyBoost =
      (possSide === 'home' ? hComebackBoost : aComebackBoost) * 0.015 +
      (minute >= 82 ? 0.012 : 0);
    const cornerFollowUpBoost = cornerCreatedBonusFor === possSide ? 0.07 : 0;

    const possShotProb = Math.max(
      0.05,
      Math.min(
        0.35,
        (0.128 +
          possCreativeEdge +
          possBuildTempo +
          lateUrgencyBoost +
          cornerFollowUpBoost +
          advantageBonusProb +
          matchup.attWideOverloadBonus * 0.5 +
          matchup.pressBrokenSpaceBonus * 0.45 +
          matchup.highLineThroughBallBonus * 0.35) *
          compBenchmark.shotRateFactor
      )
    );

    let attSide: 'home' | 'away' | null = null;
    let isCounterShot = false;
    let isSetPieceShot = false;
    let isPenaltyShot = false;
    let isCornerHeader = false;

    if (forcedPenaltyAward) {
      attSide = forcedPenaltyAward.side;
      isPenaltyShot = true;
    } else if (rng() < counterTriggerProb) {
      // Defending team exploits space behind attacking opponent
      attSide = defSide;
      isCounterShot = true;
      if (possSide === 'home') homeCounterShotsConceded++;
      else awayCounterShotsConceded++;
    } else if (rng() < possShotProb) {
      attSide = possSide;
      if (cornerCreatedBonusFor === possSide && rng() < 0.42) {
        isSetPieceShot = true;
        isCornerHeader = true;
      } else if (rng() < 0.16) {
        isSetPieceShot = true;
      } else if (possProfile.style.isDirectCounter && rng() < 0.28) {
        isCounterShot = true;
        if (defSide === 'home') homeCounterShotsConceded++;
        else awayCounterShotsConceded++;
      }
    }

    if (attSide) {
      const isAttHome = attSide === 'home';
      const attProfile = isAttHome ? hProfile : aProfile;
      const defProfile = isAttHome ? aProfile : hProfile;
      const attPlan = isAttHome ? homePlan : awayPlan;
      const defPlan = isAttHome ? awayPlan : homePlan;
      const attTeam = isAttHome ? homeTeam : awayTeam;
      const defTeam = isAttHome ? awayTeam : homeTeam;
      const attAcc = isAttHome ? homeAcc : awayAcc;
      const defAcc = isAttHome ? awayAcc : homeAcc;
      const attPlayers = isAttHome ? hPlayersOnPitch : aPlayersOnPitch;
      const defPlayers = isAttHome ? aPlayersOnPitch : hPlayersOnPitch;
      const attSetup = isAttHome ? homeSetup : awaySetup;
      const attPool = isAttHome ? homePool : awayPool;
      const attConf = isAttHome ? homeConfidence : awayConfidence;

      if (!isPenaltyShot) {
        attAcc.touchesInBox += 1 + (rng() < 0.44 ? 1 : 0);
      } else {
        attAcc.touchesInBox += 1;
      }

      // Select shooter weighted by role, shooting skill, pace (for counters), physical (for corners), and fresh energy
      const outfield = attPlayers.filter((p) => p.nodeRole !== 'GK');
      const weightedPool: InternalPlayerState[] = [];
      outfield.forEach((p) => {
        let w = 1;
        if (isCornerHeader) {
          w =
            p.player.position === 'ATT'
              ? 6
              : p.nodeRole.includes('CB')
              ? 5
              : p.player.position === 'MID'
              ? 3
              : 1;
        } else if (isCounterShot) {
          w =
            p.player.position === 'ATT'
              ? 9
              : p.nodeRole.includes('CAM') || p.nodeRole === 'LW' || p.nodeRole === 'RW' || p.nodeRole === 'LM' || p.nodeRole === 'RM'
              ? 6
              : p.player.position === 'MID'
              ? 2
              : 1;
        } else {
          w =
            p.player.position === 'ATT'
              ? 8
              : p.nodeRole.includes('CAM') || p.nodeRole === 'LM' || p.nodeRole === 'RM'
              ? 5
              : p.player.position === 'MID'
              ? 3
              : 1;
        }
        if (p.stat.subbedInMinute !== null && minute - p.stat.subbedInMinute <= 18) w += 1;
        for (let k = 0; k < w; k++) weightedPool.push(p);
      });
      const openPlayShooter =
        weightedPool[Math.floor(rng() * Math.max(1, weightedPool.length))] || attPlayers[0];

      const keeperState = defPlayers.find((p) => p.nodeRole === 'GK') || defPlayers[0] || null;

      // Assister weighted towards midfield playmakers & wide creators
      const assistCandidates = outfield.filter((p) => p.player.id !== openPlayShooter?.player.id);
      const assistWeighted: InternalPlayerState[] = [];
      assistCandidates.forEach((p) => {
        const w =
          p.nodeRole.includes('CAM') || p.nodeRole === 'LW' || p.nodeRole === 'RW'
            ? 5
            : p.player.position === 'MID'
            ? 4
            : p.nodeRole === 'LB' || p.nodeRole === 'RB' || p.nodeRole === 'LWB' || p.nodeRole === 'RWB'
            ? attProfile.style.isFrequentOverlap
              ? 4
              : 2
            : 2;
        for (let k = 0; k < w; k++) assistWeighted.push(p);
      });
      const assisterState =
        !isPenaltyShot && assistWeighted.length > 0 && rng() < 0.72
          ? assistWeighted[Math.floor(rng() * assistWeighted.length)]
          : null;

      const penaltyOrderIds = attSetup.penaltyOrderIds?.length
        ? attSetup.penaltyOrderIds
        : attTeam.penaltyOrderIds;
      const shooterState = isPenaltyShot
        ? selectInMatchPenaltyTaker(penaltyOrderIds, attTeam.id, attPool) || openPlayShooter
        : openPlayShooter;

      if (isSetPieceShot && !isCornerHeader && rng() < 0.4) {
        attAcc.corners++;
      }

      if (shooterState) {
        const shotData = getShotOutcomeAttributes({
          shooter: shooterState.player,
          shooterStamina: shooterState.stamina,
          shooterFormDelta: shooterState.matchFormDelta,
          keeper: keeperState?.player || null,
          keeperFormDelta: keeperState?.matchFormDelta ?? 0,
          attProfile,
          defProfile,
          attPlan,
          defPlan,
          isCounter: isCounterShot,
          isSetPiece: isSetPieceShot,
          isPenalty: isPenaltyShot,
          isCornerHeader,
          attConfidence: attConf,
          environment,
          benchmark: compBenchmark,
          rng,
        });

        const shotRecord: SimShotEvent = {
          id: `shot-${tickId}-${shots.length + 1}`,
          minute,
          addedMinute,
          teamSide: attSide,
          playerId: shooterState.player.id,
          playerName: getPlayerDisplayName(shooterState.player),
          assistPlayerId: isPenaltyShot ? undefined : assisterState?.player.id,
          assistPlayerName: isPenaltyShot
            ? undefined
            : assisterState
            ? getPlayerDisplayName(assisterState.player)
            : undefined,
          x: shotData.x,
          y: shotData.y,
          xg: shotData.xg,
          xgot: shotData.xgot,
          outcome: shotData.outcome,
          situation: isPenaltyShot
            ? 'penalty'
            : isSetPieceShot
            ? 'set-piece'
            : isCounterShot
            ? 'counter'
            : 'open-play',
          channel: shotData.channel,
          buildMethod: shotData.buildMethod,
          isBigChance: shotData.isBigChance,
          bodyPart: shotData.bodyPart,
        };
        shots.push(shotRecord);

        // Synchronize Team & Player Shot Stats
        attAcc.shots++;
        attAcc.xg += shotData.xg;
        if (shotData.xgot !== null) attAcc.xgot += shotData.xgot;
        if (isSetPieceShot) attAcc.setPieceXg += shotData.xg;
        else attAcc.openPlayXg += shotData.xg;
        if (shotData.isBigChance) {
          attAcc.bigChances++;
          if (shotData.outcome !== 'goal') {
            attAcc.bigChancesMissed++;
            shooterState.bigChancesMissed++;
          }
        }
        if (isPenaltyShot && shotData.outcome !== 'goal') {
          shooterState.penaltiesMissed++;
        }

        if (shotData.channel === 'left') attAcc.zoneLeft++;
        else if (shotData.channel === 'right') attAcc.zoneRight++;
        else attAcc.zoneCentral++;

        if (shotData.buildMethod === 'patient') attAcc.buildPatient++;
        else if (shotData.buildMethod === 'through-ball') attAcc.buildThrough++;
        else if (shotData.buildMethod === 'cross-set-piece') attAcc.buildCross++;
        else attAcc.buildCounter++;

        shooterState.stat.shots++;
        shooterState.stat.xg = Number((shooterState.stat.xg + shotData.xg).toFixed(2));
        if (assisterState && !isPenaltyShot) {
          assisterState.stat.keyPasses++;
          if (shotData.buildMethod === 'through-ball') {
            assisterState.stat.throughPasses = (assisterState.stat.throughPasses || 0) + 1;
            assisterState.stat.throughPassesCompleted =
              (assisterState.stat.throughPassesCompleted || 0) + 1;
            attAcc.throughPasses += 1;
            attAcc.throughPassesCompleted += 1;
          }
        }

        const defenderPool = defPlayers.filter(
          (p) => p.player.position === 'DEF' || p.player.position === 'MID'
        );
        const activeDef = defenderPool.length
          ? defenderPool[Math.floor(rng() * defenderPool.length)]
          : null;
        if (activeDef && shotData.outcome === 'blocked') {
          defAcc.clearances++;
          defAcc.blocks++;
          activeDef.stat.interceptions++;
          activeDef.stat.blocks = (activeDef.stat.blocks || 0) + 1;
          activeDef.stat.clearances = (activeDef.stat.clearances || 0) + 1;
        } else if (activeDef && rng() < 0.35) {
          defAcc.tacklesTotal++;
          if (rng() < 0.62) {
            defAcc.tacklesWon++;
            activeDef.stat.tackles++;
          }
        } else if (activeDef && isSetPieceShot && microRng() < 0.35) {
          defAcc.clearances++;
          activeDef.stat.clearances = (activeDef.stat.clearances || 0) + 1;
        }

        // Authentic momentum weight from chance quality & outcome
        const counterBonus = isCounterShot ? 9 : 0;
        const setPieceBonus = isSetPieceShot ? 4.5 : 0;
        const bigChanceWeight = shotData.isBigChance ? 9.5 : 0;
        const outcomeAttWeight =
          shotData.outcome === 'goal'
            ? 40
            : shotData.outcome === 'woodwork'
            ? 21
            : shotData.outcome === 'saved'
            ? 13
            : shotData.outcome === 'blocked'
            ? 8
            : 7;
        const totalAttWeight =
          outcomeAttWeight + shotData.xg * 34 + counterBonus + setPieceBonus + bigChanceWeight;

        if (isAttHome) homeThreat += totalAttWeight;
        else awayThreat += totalAttWeight;

        if (shotData.outcome === 'saved') {
          const saveCredit = shotData.isBigChance ? 7.5 : 4.5;
          if (isAttHome) awayThreat += saveCredit;
          else homeThreat += saveCredit;
        } else if (shotData.outcome === 'blocked') {
          if (isAttHome) awayThreat += 4;
          else homeThreat += 4;
        }

        const sName = getPlayerDisplayName(shooterState.player);
        const aName = assisterState ? getPlayerDisplayName(assisterState.player) : '';
        const kName = keeperState ? getPlayerDisplayName(keeperState.player) : 'the keeper';

        if (shotData.outcome === 'goal') {
          tickGoalSide = attSide;
          attAcc.shotsOnTarget++;
          shooterState.stat.shotsOnTarget++;
          shooterState.stat.goals++;

          if (assisterState && !isPenaltyShot) {
            assisterState.stat.assists++;
          }

          if (isAttHome) {
            homeScore++;
            homeGoalLog.push({ minute, scorerId: shooterState.player.id });
            homeConfidence = Math.min(8, homeConfidence + 2.8);
            awayConfidence = Math.max(-8, awayConfidence - 1.9);
            awayShockTicks = 4;
            spellControl = Math.min(1, spellControl + 0.35);
          } else {
            awayScore++;
            awayGoalLog.push({ minute, scorerId: shooterState.player.id });
            awayConfidence = Math.min(8, awayConfidence + 2.8);
            homeConfidence = Math.max(-8, homeConfidence - 1.9);
            homeShockTicks = 4;
            spellControl = Math.max(-1, spellControl - 0.35);
          }

          const tacticalDesc = isCounterShot
            ? 'on a clinical counter-attack'
            : isCornerHeader
            ? 'from the corner delivery'
            : shotData.buildMethod === 'through-ball'
            ? 'splitting the high line with a through ball'
            : `(${shotData.bodyPart.toLowerCase()}, ${shotData.xg.toFixed(2)} xG)`;

          events.push({
            id: `ev-goal-${tickId}-${events.length}`,
            minute,
            addedMinute,
            period,
            type: 'goal',
            teamSide: attSide,
            playerId: shooterState.player.id,
            playerName: sName,
            assistPlayerId: !isPenaltyShot ? assisterState?.player.id : undefined,
            assistPlayerName: !isPenaltyShot ? aName || undefined : undefined,
            headline: isPenaltyShot
              ? `GOAL! ${sName} (P) (${attTeam.code})`
              : `GOAL! ${sName} (${attTeam.code})`,
            commentary: isPenaltyShot
              ? `GOAL! ${sName} (P) dispatches the penalty into the corner for ${attTeam.shortName}! (${homeScore}-${awayScore})`
              : aName
              ? `GOAL! ${sName} finishes ${tacticalDesc} after an incisive pass from ${aName}! (${homeScore}-${awayScore})`
              : `GOAL! ${sName} scores ${tacticalDesc} for ${attTeam.shortName}! (${homeScore}-${awayScore})`,
            xg: shotData.xg,
            isPenalty: isPenaltyShot || undefined,
            isKeyMoment: true,
          });
        } else if (shotData.outcome === 'saved') {
          attAcc.shotsOnTarget++;
          shooterState.stat.shotsOnTarget++;
          defAcc.saves++;
          if (keeperState) {
            keeperState.stat.saves++;
            if (isPenaltyShot) keeperState.penaltySaves++;
          }
          // Handling skill + wet pitch condition affect rebound/corner spill frequency
          const gkHandling = keeperState?.player.gkAttributes?.handling ?? 72;
          const spillCornerProb = Math.max(
            0.14,
            0.35 - (gkHandling - 70) * 0.007 + environment.gkSpillMod
          );
          if (!isPenaltyShot && rng() < spillCornerProb) attAcc.corners++;

          if (isAttHome) {
            awayConfidence = Math.min(8, awayConfidence + (shotData.isBigChance ? 1.2 : 0.4));
          } else {
            homeConfidence = Math.min(8, homeConfidence + (shotData.isBigChance ? 1.2 : 0.4));
          }

          events.push({
            id: `ev-save-${tickId}-${events.length}`,
            minute,
            addedMinute,
            period,
            type: isPenaltyShot
              ? 'penalty-missed'
              : shotData.isBigChance
              ? 'big-chance-missed'
              : 'shot-saved',
            teamSide: attSide,
            playerId: shooterState.player.id,
            playerName: sName,
            secondaryPlayerId: keeperState?.player.id,
            secondaryPlayerName: kName,
            headline: isPenaltyShot
              ? `Penalty Saved — ${sName} (${attTeam.code})`
              : `Save by ${kName} (${defTeam.code})`,
            commentary: isPenaltyShot
              ? `PENALTY SAVED! ${kName} guesses right and pushes away ${sName}'s spot-kick for ${attTeam.shortName}!`
              : `${sName} tests ${kName} (${shotData.xg.toFixed(2)} xG), who makes a crucial stop to keep it out.`,
            xg: shotData.xg,
            isPenalty: isPenaltyShot || undefined,
            isKeyMoment: isPenaltyShot || shotData.isBigChance,
          });
        } else if (shotData.outcome === 'woodwork') {
          events.push({
            id: `ev-wood-${tickId}-${events.length}`,
            minute,
            addedMinute,
            period,
            type: isPenaltyShot ? 'penalty-missed' : 'woodwork',
            teamSide: attSide,
            playerId: shooterState.player.id,
            playerName: sName,
            headline: isPenaltyShot
              ? `Penalty Off the Woodwork — ${sName} (${attTeam.code})`
              : `Off the Woodwork — ${sName}`,
            commentary: isPenaltyShot
              ? `PENALTY MISSED! ${sName}'s spot-kick crashes against the frame of ${defTeam.shortName}'s goal!`
              : `${sName} crashes an effort against the frame of ${defTeam.shortName}'s goal!`,
            xg: shotData.xg,
            isPenalty: isPenaltyShot || undefined,
            isKeyMoment: true,
          });
        } else if (shotData.isBigChance || isPenaltyShot) {
          events.push({
            id: `ev-miss-${tickId}-${events.length}`,
            minute,
            addedMinute,
            period,
            type: isPenaltyShot ? 'penalty-missed' : 'big-chance-missed',
            teamSide: attSide,
            playerId: shooterState.player.id,
            playerName: sName,
            headline: isPenaltyShot
              ? `Penalty Missed — ${sName} (${attTeam.code})`
              : `Big Chance Missed — ${sName}`,
            commentary: isPenaltyShot
              ? `PENALTY MISSED! ${sName} drags the spot-kick off target for ${attTeam.shortName}!`
              : `Huge opening for ${attTeam.shortName}, but ${sName} steers the effort off target (${shotData.xg.toFixed(2)} xG).`,
            xg: shotData.xg,
            isPenalty: isPenaltyShot || undefined,
            isKeyMoment: true,
          });
        }
      }
    }

    const netMinuteDiff = Math.max(-100, Math.min(100, homeThreat - awayThreat));
    rawMomentum.push({
      minute,
      addedMinute,
      period: (period === '1H' || period === '2H' || period === 'ET1' || period === 'ET2' ? period : '1H'),
      displayLabel,
      homeThreat: Math.min(100, Math.round(homeThreat)),
      awayThreat: Math.min(100, Math.round(awayThreat)),
      rawDiff: Number(netMinuteDiff.toFixed(1)),
      goalSide: tickGoalSide,
    });
  };

  // --- 1ST HALF (1..45 + Dynamic Stoppage 1H) ---
  for (let m = 1; m <= 45; m++) {
    simulateMinuteTick(m, undefined, '1H', `1H-${m}`);
  }
  const stopRng = createSeededRng(`${seed}::stoppage`);
  const stoppage1H = computeDynamicStoppageMinutes(
    events.filter((e) => e.period === '1H'),
    '1H',
    stopRng,
    { refereeStoppageGenerosity: refereeProfile.stoppageGenerosity }
  );
  for (let add = 1; add <= stoppage1H; add++) {
    simulateMinuteTick(45, add, '1H', `1H-45+${add}`);
  }
  halfTimeHomeScore = homeScore;
  halfTimeAwayScore = awayScore;
  events.push({
    id: 'ev-ht',
    minute: 45,
    addedMinute: stoppage1H,
    period: 'HT',
    type: 'half-time',
    headline: `Half-Time (${homeScore} - ${awayScore})`,
    commentary: `${refereeProfile.name} blows for half-time at ${environment.stadiumName}. ${homeTeam.shortName} ${homeScore} - ${awayScore} ${awayTeam.shortName}.`,
    isKeyMoment: true,
  });

  // Half-time interval breather recovers partial stamina and resets extreme momentum
  [...homePool, ...awayPool].forEach((p) => {
    if (p.onPitch && !p.sentOff) {
      p.stamina = Math.min(96, p.stamina + 7);
    }
  });
  spellControl *= 0.25;
  homeShockTicks = 0;
  awayShockTicks = 0;

  // --- 2ND HALF (46..90 + Dynamic Stoppage 2H) ---
  for (let m = 46; m <= 90; m++) {
    simulateMinuteTick(m, undefined, '2H', `2H-${m}`);
  }
  const stoppage2H = computeDynamicStoppageMinutes(
    events.filter((e) => e.period === '2H'),
    '2H',
    stopRng,
    {
      isCloseLeadLate: Math.abs(homeScore - awayScore) === 1,
      refereeStoppageGenerosity: refereeProfile.stoppageGenerosity,
    }
  );
  for (let add = 1; add <= stoppage2H; add++) {
    simulateMinuteTick(90, add, '2H', `2H-90+${add}`);
  }

  // Check if level and Extra Time is required
  const computeAggregate = (h: number, a: number) => {
    if (competition.isTwoLegged && competition.legNumber === 2) {
      return {
        aggHome: (competition.firstLegHomeGoals ?? 0) + h,
        aggAway: (competition.firstLegAwayGoals ?? 0) + a,
      };
    }
    return { aggHome: h, aggAway: a };
  };

  const after90Agg = computeAggregate(homeScore, awayScore);
  const canPlayDeciderPeriods = !competition.isTwoLegged || competition.legNumber === 2;
  const awayGoalsDecidesAfter90 =
    canPlayDeciderPeriods &&
    competition.isTwoLegged &&
    competition.awayGoalsRule &&
    after90Agg.aggHome === after90Agg.aggAway &&
    (competition.firstLegHomeGoals ?? 0) !== awayScore;

  const needsExtraTimeAfter90 =
    canPlayDeciderPeriods &&
    competition.allowExtraTime &&
    after90Agg.aggHome === after90Agg.aggAway &&
    !awayGoalsDecidesAfter90;

  let wentToExtraTime = false;
  let extraTimeHomeScore: number | null = null;
  let extraTimeAwayScore: number | null = null;
  let finalMinute = 90;
  let stoppageET1 = 0;
  let stoppageET2 = 0;

  if (needsExtraTimeAfter90) {
    wentToExtraTime = true;
    [...homePool, ...awayPool].forEach((p) => {
      if (p.onPitch && !p.sentOff) {
        p.stamina = Math.min(90, p.stamina + 5);
      }
    });
    spellControl *= 0.25;

    events.push({
      id: 'ev-et-start',
      minute: 90,
      addedMinute: stoppage2H,
      period: 'ET1',
      type: 'extra-time-start',
      headline: 'End of 90 Minutes — Extra Time Required',
      commentary: `All square after regulation time! 30 minutes of extra time coming up.`,
      isKeyMoment: true,
    });

    for (let m = 91; m <= 105; m++) {
      simulateMinuteTick(m, undefined, 'ET1', `ET1-${m}`);
    }
    stoppageET1 = computeDynamicStoppageMinutes(
      events.filter((e) => e.period === 'ET1'),
      'ET1',
      stopRng,
      { refereeStoppageGenerosity: refereeProfile.stoppageGenerosity }
    );
    for (let add = 1; add <= stoppageET1; add++) {
      simulateMinuteTick(105, add, 'ET1', `ET1-105+${add}`);
    }
    events.push({
      id: 'ev-et-ht',
      minute: 105,
      addedMinute: stoppageET1,
      period: 'ETHT',
      type: 'et-half-time',
      headline: `Extra Time Half-Time (${homeScore} - ${awayScore})`,
      commentary: `Sides swap ends for the final 15 minutes of extra time.`,
      isKeyMoment: true,
    });

    spellControl *= 0.3;
    for (let m = 106; m <= 120; m++) {
      simulateMinuteTick(m, undefined, 'ET2', `ET2-${m}`);
    }
    stoppageET2 = computeDynamicStoppageMinutes(
      events.filter((e) => e.period === 'ET2'),
      'ET2',
      stopRng,
      {
        isCloseLeadLate: Math.abs(homeScore - awayScore) <= 1,
        refereeStoppageGenerosity: refereeProfile.stoppageGenerosity,
      }
    );
    for (let add = 1; add <= stoppageET2; add++) {
      simulateMinuteTick(120, add, 'ET2', `ET2-120+${add}`);
    }

    extraTimeHomeScore = homeScore;
    extraTimeAwayScore = awayScore;
    finalMinute = 120;
  }

  const afterMatchAgg = computeAggregate(homeScore, awayScore);
  const awayGoalsWinner: 'home' | 'away' | null =
    canPlayDeciderPeriods &&
    competition.isTwoLegged &&
    competition.awayGoalsRule &&
    afterMatchAgg.aggHome === afterMatchAgg.aggAway &&
    (competition.firstLegHomeGoals ?? 0) !== awayScore
      ? (competition.firstLegHomeGoals ?? 0) > awayScore
        ? 'home'
        : 'away'
      : null;

  const needsPenalties =
    canPlayDeciderPeriods &&
    competition.allowPenalties &&
    afterMatchAgg.aggHome === afterMatchAgg.aggAway &&
    awayGoalsWinner === null;

  let penaltyShootout: SimPenaltyShootoutState | null = null;
  if (needsPenalties) {
    events.push({
      id: 'ev-pen-start',
      minute: finalMinute,
      period: 'PEN',
      type: 'penalties-start',
      headline: 'Penalty Shootout',
      commentary: `Nothing can separate the sides after ${finalMinute} minutes — a penalty shootout will decide the winner!`,
      isKeyMoment: true,
    });
    penaltyShootout = buildPenaltyShootout(
      seed,
      homeTeam,
      awayTeam,
      homeSetup,
      awaySetup,
      homePool,
      awayPool,
      events,
      finalMinute
    );
  } else {
    events.push({
      id: 'ev-ft',
      minute: finalMinute,
      addedMinute: wentToExtraTime ? stoppageET2 : stoppage2H,
      period: 'FT',
      type: 'full-time',
      headline: `Full-Time (${homeScore} - ${awayScore})`,
      commentary: `Full-time whistle! ${homeTeam.name} ${homeScore} - ${awayScore} ${awayTeam.name}.`,
      isKeyMoment: true,
    });
  }

  // Compute realistic event-driven sustained momentum with period-break resets and goal wave decay
  let sustainedPressure = 0;
  let goalImpulse = 0;
  let prevPeriod: '1H' | '2H' | 'ET1' | 'ET2' = '1H';

  const momentum: SimMomentumPoint[] = rawMomentum.map((pt) => {
    if (pt.period !== prevPeriod) {
      sustainedPressure *= 0.2;
      goalImpulse = 0;
      prevPeriod = pt.period;
    }

    sustainedPressure = Math.max(
      -85,
      Math.min(85, sustainedPressure * 0.64 + pt.rawDiff * 0.58)
    );

    if (pt.goalSide) {
      const surge = pt.goalSide === 'home' ? 32 : -32;
      goalImpulse =
        pt.goalSide === 'home'
          ? Math.max(surge, goalImpulse + 18)
          : Math.min(surge, goalImpulse - 18);
    } else {
      goalImpulse *= 0.54;
    }

    const combined = Math.max(-100, Math.min(100, sustainedPressure + goalImpulse));
    const hDecayBase = Math.max(0, sustainedPressure + goalImpulse);
    const aDecayBase = Math.max(0, -(sustainedPressure + goalImpulse));

    return {
      minute: pt.minute,
      addedMinute: pt.addedMinute,
      period: pt.period,
      displayLabel: pt.displayLabel,
      rawDiff: pt.rawDiff,
      smoothedDiff: Number(combined.toFixed(1)),
      homeMomentum: Math.min(100, Math.round(pt.homeThreat * 0.55 + hDecayBase * 0.55)),
      awayMomentum: Math.min(100, Math.round(pt.awayThreat * 0.55 + aDecayBase * 0.55)),
    };
  });

  const winner: 'home' | 'away' | 'draw' =
    penaltyShootout?.winner
      ? penaltyShootout.winner
      : awayGoalsWinner
      ? awayGoalsWinner
      : afterMatchAgg.aggHome > afterMatchAgg.aggAway
      ? 'home'
      : afterMatchAgg.aggAway > afterMatchAgg.aggHome
      ? 'away'
      : 'draw';

  // Attribute decisive late-winner credit to final winning scorer if match won by 1 goal >= 78'
  const lateWinningScorerId =
    homeScore > awayScore && homeScore - awayScore === 1 && homeGoalLog.length > 0
      ? homeGoalLog[homeGoalLog.length - 1].minute >= 78
        ? homeGoalLog[homeGoalLog.length - 1].scorerId
        : null
      : awayScore > homeScore && awayScore - homeScore === 1 && awayGoalLog.length > 0
      ? awayGoalLog[awayGoalLog.length - 1].minute >= 78
        ? awayGoalLog[awayGoalLog.length - 1].scorerId
        : null
      : null;

  if (lateWinningScorerId) {
    const pState = homePoolMap.get(lateWinningScorerId) || awayPoolMap.get(lateWinningScorerId);
    if (pState) pState.lateWinnerGoals++;
  }

  const computeSideOutcome = (side: 'home' | 'away'): 'win' | 'draw' | 'loss' => {
    if (winner === 'draw') return 'draw';
    return winner === side ? 'win' : 'loss';
  };

  const allPlayerStats: SimPlayerMatchStats[] = [...homePool, ...awayPool]
    .filter((p) => p.stat.started || p.stat.subbedInMinute !== null)
    .map((p) => {
      const isHomeSide = p.stat.teamSide === 'home';
      const goalsFor = isHomeSide ? homeScore : awayScore;
      const goalsAgainst = isHomeSide ? awayScore : homeScore;
      const oppXgot = isHomeSide ? awayAcc.xgot : homeAcc.xgot;
      const computedRating = computeFinalPlayerRating({
        stat: p.stat,
        isGk: p.nodeRole === 'GK',
        isDef: p.player.position === 'DEF',
        isMid: p.player.position === 'MID',
        teamGoalsFor: goalsFor,
        teamGoalsAgainst: goalsAgainst,
        opponentXgotFaced: oppXgot,
        bigChancesMissed: p.bigChancesMissed,
        penaltySaves: p.penaltySaves,
        penaltiesMissed: p.penaltiesMissed,
        lateWinnerGoals: p.lateWinnerGoals,
        teamOutcome: computeSideOutcome(p.stat.teamSide),
      });
      return {
        ...p.stat,
        rating: computedRating,
        bigChancesMissed: p.bigChancesMissed,
        staminaRemaining: Math.round(p.stamina),
      };
    });

  const homePossPct =
    homeAcc.totalTicks > 0
      ? Math.max(20, Math.min(80, Math.round((homeAcc.possessionTicks / homeAcc.totalTicks) * 100)))
      : 50;
  const awayPossPct = 100 - homePossPct;

  const motmPool = allPlayerStats
    .filter((p) => (winner === 'draw' ? true : p.teamSide === winner))
    .sort((a, b) => b.rating - a.rating || b.goals - a.goals || b.assists - a.assists);
  const motmPlayerId = motmPool[0]?.playerId || allPlayerStats[0]?.playerId || null;

  const hCapt =
    homeTeam.captainName ||
    getPlayerDisplayName(homePool.find((p) => p.player.isCaptain)?.player) ||
    'Team Captain';
  const aCapt =
    awayTeam.captainName ||
    getPlayerDisplayName(awayPool.find((p) => p.player.isCaptain)?.player) ||
    'Team Captain';

  const finalHomeProfile = computeDynamicTeamProfile(homeSetup, toActiveEntries(homePool), true, homeMods, {
    minute: finalMinute,
    goalDiff: homeScore - awayScore,
    isKnockout: competition.isKnockout,
    teamType: hTeamType,
    cohesionScale: compBenchmark.chemistryCohesionBase,
  });
  const finalAwayProfile = computeDynamicTeamProfile(awaySetup, toActiveEntries(awayPool), false, awayMods, {
    minute: finalMinute,
    goalDiff: awayScore - homeScore,
    isKnockout: competition.isKnockout,
    teamType: aTeamType,
    cohesionScale: compBenchmark.chemistryCohesionBase,
  });

  return {
    seed,
    engineVersion: 'DodaEona SimEngine v3.1 Tactical Intelligence',
    competition,
    homeTeamId: homeTeam.id,
    homeTeamName: homeTeam.name,
    homeCode: homeTeam.code,
    homeColor: homeTeam.primaryColor,
    homeFormation: homeSetup.formation,
    homeManager: homeManager?.name
      ? `Manager · ${homeManager.name}`
      : homeTeam.manager?.trim()
      ? `Manager · ${homeTeam.manager}`
      : 'No manager on record',
    homeManagerId: homeManager?.id,
    homeTeamType: hTeamType,
    homeCaptainName: hCapt,
    awayTeamId: awayTeam.id,
    awayTeamName: awayTeam.name,
    awayCode: awayTeam.code,
    awayColor: awayTeam.primaryColor,
    awayFormation: awaySetup.formation,
    awayManager: awayManager?.name
      ? `Manager · ${awayManager.name}`
      : awayTeam.manager?.trim()
      ? `Manager · ${awayTeam.manager}`
      : 'No manager on record',
    awayManagerId: awayManager?.id,
    awayTeamType: aTeamType,
    awayCaptainName: aCapt,
    homeScore,
    awayScore,
    halfTimeHomeScore,
    halfTimeAwayScore,
    extraTimeHomeScore,
    extraTimeAwayScore,
    wentToExtraTime,
    stoppage1H,
    stoppage2H,
    stoppageET1,
    stoppageET2,
    finalMinute,
    winner,
    aggregateHomeScore:
      competition.isTwoLegged && competition.legNumber === 2 ? afterMatchAgg.aggHome : undefined,
    aggregateAwayScore:
      competition.isTwoLegged && competition.legNumber === 2 ? afterMatchAgg.aggAway : undefined,
    penaltyShootout,
    preMatchOdds,
    homeStats: finalizeTeamStats(homeAcc, homePossPct),
    awayStats: finalizeTeamStats(awayAcc, awayPossPct),
    shots,
    momentum,
    events,
    playerStats: allPlayerStats,
    lineupPlayerIds: {
      home: homePool
        .filter((p) => p.stat.started || p.stat.subbedInMinute !== null)
        .map((p) => p.player.id),
      away: awayPool
        .filter((p) => p.stat.started || p.stat.subbedInMinute !== null)
        .map((p) => p.player.id),
    },
    tacticalSummaryHome: formatTacticalSummaryLine(
      homeTeam.code,
      homeSetup.plans[homeSetup.activePlan]
    ),
    tacticalSummaryAway: formatTacticalSummaryLine(
      awayTeam.code,
      awaySetup.plans[awaySetup.activePlan]
    ),
    motmPlayerId,
    matchConditions: {
      weather: environment.weather,
      pitch: environment.pitch,
      temperatureC: environment.temperatureC,
      stadiumName: environment.stadiumName,
      stadiumCapacity: environment.stadiumCapacity,
      crowdAttendance: crowdAtmosphere.attendance,
      crowdIntensity: crowdAtmosphere.crowdIntensity,
      refereeName: refereeProfile.name,
      refereeArchetype: refereeProfile.archetype,
      refereeStrictness: refereeProfile.strictnessScore,
      homeChemistryScore: finalHomeProfile.chemistryScore,
      awayChemistryScore: finalAwayProfile.chemistryScore,
      chemistrySummaryHome: finalHomeProfile.chemistryBreakdown.summary,
      chemistrySummaryAway: finalAwayProfile.chemistryBreakdown.summary,
    },
  };
}

export const createMatchSimulation = simulateMatch;
