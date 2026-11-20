import type { Player } from '../types/matchCentre';
import type {
  SimPlayerMatchStats,
  SimTeamSetup,
  SimTimelineEvent,
  TacticalPlanConfig,
} from '../types/simulation';
import {
  getPositionalCompatibilityScore,
  normalizePositionDetail,
} from '../components/matchCentre/dossier/dossierUtils';
import { getEffectiveComposureRating } from '../utils/penaltyOrder';
import {
  ChemistryInputPlayer,
  computeTeamChemistryBreakdown,
  TeamChemistryBreakdown,
} from './matchIntel';

export interface ActivePitchPlayer {
  player: Player;
  nodeRole: string;
  slotIndex: number | null;
  stamina: number;
  subbedInMinute: number | null;
  yellows: number;
  sentOff: boolean;
  matchFormDelta?: number;
}

export interface FormationShapeMetrics {
  defCount: number;
  midCount: number;
  centralMidCount: number;
  wideCount: number;
  attCount: number;
  isBackThreeOrFive: boolean;
  isDoublePivot: boolean;
}

export interface TacticalStyleFlags {
  isHighPress: boolean;
  isLowBlock: boolean;
  isPossession: boolean;
  isDirectCounter: boolean;
  isThroughBallFocus: boolean;
  isCrossFocus: boolean;
  isAggressiveTackling: boolean;
  isFrequentOverlap: boolean;
  effectiveDefLine: number;
  effectivePressing: number;
  effectiveBuildSpeed: number;
  effectiveWidth: number;
  mentalityScore: number; // -2 (Cautious) .. +2 (Attacking)
}

export interface DynamicTeamProfile {
  att: number;
  mid: number;
  def: number;
  gkRating: number;
  gkShotStopping: number;
  gkSweeperSpeed: number;
  gkComposure: number;
  overall: number;
  possessionCraft: number;
  paceCounterThreat: number;
  defensiveWall: number;
  pressingEfficiency: number;
  passingSkill: number;
  dribblingSkill: number;
  aerialStrength: number;
  teamComposure: number;
  avgStamina: number;
  fatiguePenalty: number; // 0 (fresh) .. ~10 (exhausted)
  chemistryFactor: number; // ~0.88 .. 1.06
  chemistryScore: number; // 0 .. 100
  chemistryBreakdown: TeamChemistryBreakdown;
  pressResistance: number; // -4 .. +6
  freshSubCount: number;
  activeCount: number;
  formationShape: FormationShapeMetrics;
  style: TacticalStyleFlags;
}

export interface MatchManagerTacticalInputs {
  possessionBonus: number;
  attackingBonus: number;
  defensiveBonus: number;
  comebackBoldness: number;
}

export function getStaminaMultiplier(stamina: number, isGk: boolean): number {
  if (isGk) {
    return stamina >= 75 ? 1 : 0.96 + (stamina / 100) * 0.04;
  }
  if (stamina >= 76) return 1.0;
  if (stamina >= 56) {
    // 76 -> 1.00, 56 -> 0.92
    return 0.92 + ((stamina - 56) / 20) * 0.08;
  }
  // 56 -> 0.92, 35 -> 0.815
  return Math.max(0.81, 0.815 + ((stamina - 35) / 21) * 0.105);
}

export function analyzeFormationShape(setup: SimTeamSetup, activePlayers: ActivePitchPlayer[]): FormationShapeMetrics {
  let defCount = 0;
  let midCount = 0;
  let centralMidCount = 0;
  let wideCount = 0;
  let attCount = 0;

  if (activePlayers.length > 0) {
    for (const entry of activePlayers) {
      if (entry.sentOff) continue;
      const role = (entry.nodeRole || '').toUpperCase();
      if (role === 'GK') continue;
      if (role.includes('CB') || role === 'LB' || role === 'RB' || role === 'LWB' || role === 'RWB') {
        defCount++;
        if (role === 'LB' || role === 'RB' || role === 'LWB' || role === 'RWB') wideCount++;
      } else if (role.includes('ST') || role.includes('CF') || role === 'LW' || role === 'RW') {
        attCount++;
        if (role === 'LW' || role === 'RW') wideCount++;
      } else {
        midCount++;
        if (role === 'LM' || role === 'RM') wideCount++;
        else centralMidCount++;
      }
    }
  } else {
    for (const slot of setup.slots) {
      const line = slot.node.line;
      if (line === 'DF') defCount++;
      else if (line === 'MF') {
        midCount++;
        if (slot.node.side === 'center') centralMidCount++;
        else wideCount++;
      } else if (line === 'FW') {
        attCount++;
        if (slot.node.side !== 'center') wideCount++;
      }
    }
  }

  return {
    defCount,
    midCount,
    centralMidCount,
    wideCount,
    attCount,
    isBackThreeOrFive: defCount >= 5 || setup.formation.startsWith('3-') || setup.formation.startsWith('5-'),
    isDoublePivot: centralMidCount >= 2,
  };
}

export function extractTacticalStyleFlags(
  plan: TacticalPlanConfig,
  goalDiff: number,
  minute: number,
  isKnockout: boolean,
  onPitchCount: number
): TacticalStyleFlags {
  const m = plan.mentalitySettings;
  const mentalityLower = (m.mentality || '').toLowerCase();
  const buildLower = (m.buildUp || '').toLowerCase();
  const chanceLower = (m.chanceCreation || '').toLowerCase();
  const crossLower = (m.crossing || '').toLowerCase();
  const lineLower = (m.defensiveLine || '').toLowerCase();
  const pressLower = (m.pressingIntensityLabel || '').toLowerCase();
  const transLower = (m.attackingTransition || '').toLowerCase();
  const tackleLower = (m.tackling || '').toLowerCase();
  const overlapLower = (m.overlappingFullBacks || '').toLowerCase();
  const styleLower = (plan.playingStyle || '').toLowerCase();

  let baseMentality =
    mentalityLower.includes('attack')
      ? 1.7
      : mentalityLower.includes('positive')
      ? 0.85
      : mentalityLower.includes('cautious') || mentalityLower.includes('defensive')
      ? -1.35
      : 0;

  // Game-state organic tactical elasticity:
  // Leading teams gradually tighten up; trailing teams push higher late
  let gameStateLineShift = 0;
  let gameStatePressShift = 0;
  let gameStateBuildShift = 0;

  if (onPitchCount <= 10) {
    // Shorthanded teams naturally compact lines unless chasing very late
    gameStateLineShift -= 9;
    gameStatePressShift -= 8;
    baseMentality -= 0.45;
  }

  if (goalDiff >= 2 && minute >= 62) {
    gameStateLineShift -= 7;
    gameStatePressShift -= 9;
    gameStateBuildShift -= 5;
    baseMentality -= 0.7;
  } else if (goalDiff === 1 && minute >= 72) {
    const knockoutCaution = isKnockout ? 1.25 : 1.0;
    gameStateLineShift -= 5.5 * knockoutCaution;
    gameStatePressShift -= 5 * knockoutCaution;
    baseMentality -= 0.5 * knockoutCaution;
  } else if (goalDiff <= -1 && minute >= 58) {
    const urgency = minute >= 78 ? 1.25 : 0.7;
    gameStateLineShift += 8.5 * urgency;
    gameStatePressShift += 9 * urgency;
    gameStateBuildShift += 8 * urgency;
    baseMentality += 0.85 * urgency;
  }

  const effectiveDefLine = Math.max(20, Math.min(96, plan.defensiveLine + gameStateLineShift));
  const effectivePressing = Math.max(22, Math.min(98, plan.pressingIntensity + gameStatePressShift));
  const effectiveBuildSpeed = Math.max(25, Math.min(98, plan.buildUpSpeed + gameStateBuildShift));
  const effectiveWidth = Math.max(30, Math.min(96, plan.width));

  return {
    isHighPress:
      effectivePressing >= 74 ||
      pressLower.includes('high') ||
      pressLower.includes('extreme') ||
      styleLower.includes('gegenpress'),
    isLowBlock:
      effectiveDefLine <= 46 ||
      lineLower.includes('deep') ||
      styleLower.includes('low block') ||
      styleLower.includes('catenaccio'),
    isPossession:
      buildLower.includes('short') ||
      styleLower.includes('possession') ||
      styleLower.includes('tiki-taka') ||
      effectiveBuildSpeed <= 58,
    isDirectCounter:
      chanceLower.includes('counter') ||
      transLower.includes('counter') ||
      buildLower.includes('direct') ||
      styleLower.includes('counter') ||
      effectiveBuildSpeed >= 74,
    isThroughBallFocus:
      chanceLower.includes('through') ||
      styleLower.includes('vertical'),
    isCrossFocus:
      crossLower.includes('high') ||
      crossLower.includes('early') ||
      effectiveWidth >= 74,
    isAggressiveTackling:
      tackleLower.includes('aggress') ||
      tackleLower.includes('hard') ||
      effectivePressing >= 82,
    isFrequentOverlap:
      overlapLower.includes('frequent') ||
      overlapLower.includes('always'),
    effectiveDefLine,
    effectivePressing,
    effectiveBuildSpeed,
    effectiveWidth,
    mentalityScore: Math.max(-2.4, Math.min(2.6, baseMentality)),
  };
}

export function computeDynamicTeamProfile(
  setup: SimTeamSetup,
  activePlayers: ActivePitchPlayer[] | null,
  isHome: boolean,
  managerMods?: MatchManagerTacticalInputs,
  options?: {
    minute?: number;
    goalDiff?: number;
    isKnockout?: boolean;
    homeAdvantageVal?: number;
    lateComebackBoost?: number;
    psychologyBoost?: number;
    teamType?: 'club' | 'country';
    cohesionScale?: number;
    matchFormMap?: Map<string, number>;
  }
): DynamicTeamProfile {
  const minute = options?.minute ?? 1;
  const goalDiff = options?.goalDiff ?? 0;
  const isKnockout = options?.isKnockout ?? false;
  const psychologyBoost = options?.psychologyBoost ?? 0;
  const lateComebackBoost = options?.lateComebackBoost ?? 0;
  const cohesionScale = options?.cohesionScale ?? 1.0;
  const matchFormMap = options?.matchFormMap;

  const plan = setup.plans[setup.activePlan];

  const entries: ActivePitchPlayer[] = activePlayers
    ? activePlayers.filter((p) => !p.sentOff)
    : setup.slots
        .filter((s): s is typeof s & { player: Player } => Boolean(s.player))
        .map((s) => ({
          player: s.player,
          nodeRole: s.node.role,
          slotIndex: s.slotIndex,
          stamina: s.player.injuryStatus === 'doubtful' ? 84 : 100,
          subbedInMinute: null,
          yellows: 0,
          sentOff: false,
        }));

  const activeCount = Math.max(1, entries.length);
  const shape = analyzeFormationShape(setup, entries);
  const style = extractTacticalStyleFlags(plan, goalDiff, minute, isKnockout, activeCount);

  let attSum = 0;
  let attCount = 0;
  let midSum = 0;
  let midCount = 0;
  let defSum = 0;
  let defCount = 0;

  let gkRating = 65;
  let gkShotStopping = 65;
  let gkSweeperSpeed = 55;
  let gkComposure = 68;

  let paceSum = 0;
  let paceCount = 0;
  let passSum = 0;
  let passCount = 0;
  let dribSum = 0;
  let dribCount = 0;
  let physSum = 0;
  let physCount = 0;
  let compSum = 0;
  let compCount = 0;
  let staminaSum = 0;
  let staminaCount = 0;
  let freshSubCount = 0;
  const chemInputs: ChemistryInputPlayer[] = [];

  for (const entry of entries) {
    const p = entry.player;
    const isGk = entry.nodeRole === 'GK';
    const slotNode =
      entry.slotIndex !== null && setup.slots[entry.slotIndex]
        ? setup.slots[entry.slotIndex].node
        : undefined;

    let fitMultiplier = 1;
    if (slotNode) {
      const compat = getPositionalCompatibilityScore(p, slotNode);
      const exactFit = normalizePositionDetail(p.positionDetail, p.position) === slotNode.posReq;
      fitMultiplier = exactFit ? 1.0 : compat >= 36000 ? 0.96 : compat > 0 ? 0.9 : 0.78;
    } else if (isGk && p.position !== 'GK') {
      fitMultiplier = 0.58;
    }

    if (p.injuryStatus === 'doubtful') fitMultiplier *= 0.94;
    if (p.injuryStatus === 'injured') fitMultiplier *= 0.76;

    chemInputs.push({ player: p, nodeRole: entry.nodeRole, fitMultiplier });

    const staminaMult = getStaminaMultiplier(entry.stamina, isGk);
    const freshSpark =
      entry.subbedInMinute !== null && minute - entry.subbedInMinute <= 18 ? 1.032 : 1.0;
    if (freshSpark > 1) freshSubCount++;

    if (!isGk) {
      staminaSum += entry.stamina;
      staminaCount++;
    }

    const formDelta = entry.matchFormDelta ?? matchFormMap?.get(p.id) ?? 0;
    const eff = Math.max(40, p.overallRating + formDelta * 0.65) * fitMultiplier * staminaMult * freshSpark;
    const attrs = p.attributes;
    const comp = getEffectiveComposureRating(p);
    compSum += comp * staminaMult;
    compCount++;

    if (isGk) {
      gkRating = eff;
      const gka = p.gkAttributes;
      if (gka) {
        gkShotStopping =
          Math.max(40, gka.reflexes * 0.42 + gka.positioning * 0.28 + gka.diving * 0.2 + gka.handling * 0.1 + formDelta * 0.55) *
          fitMultiplier *
          staminaMult;
        gkSweeperSpeed = (gka.speed * 0.65 + gka.kicking * 0.35) * fitMultiplier;
      } else {
        gkShotStopping = eff;
        gkSweeperSpeed = eff * 0.75;
      }
      gkComposure = comp;
      continue;
    }

    const roleUpper = (entry.nodeRole || '').toUpperCase();
    const isDefender =
      roleUpper.includes('CB') ||
      roleUpper === 'LB' ||
      roleUpper === 'RB' ||
      roleUpper === 'LWB' ||
      roleUpper === 'RWB';
    const isAttacker =
      roleUpper.includes('ST') || roleUpper.includes('CF') || roleUpper === 'LW' || roleUpper === 'RW';

    if (isDefender) {
      // Defensive unit weights defending + physical + pace recovery when high line
      const defBlend =
        eff * 0.68 + (attrs.defending * 0.62 + attrs.physical * 0.26 + attrs.pace * 0.12) * fitMultiplier * staminaMult * 0.32;
      defSum += defBlend;
      defCount++;

      physSum += attrs.physical * staminaMult;
      physCount++;
      passSum += attrs.passing;
      passCount++;
    } else if (isAttacker) {
      const attBlend =
        eff * 0.68 + (attrs.shooting * 0.42 + attrs.pace * 0.3 + attrs.dribbling * 0.28) * fitMultiplier * staminaMult * 0.32;
      attSum += attBlend;
      attCount++;

      paceSum += attrs.pace * staminaMult * freshSpark;
      paceCount++;
      dribSum += attrs.dribbling * staminaMult;
      dribCount++;
      physSum += attrs.physical * staminaMult;
      physCount++;
    } else {
      const midBlend =
        eff * 0.66 + (attrs.passing * 0.44 + attrs.dribbling * 0.32 + attrs.defending * 0.24) * fitMultiplier * staminaMult * 0.34;
      midSum += midBlend;
      midCount++;

      passSum += attrs.passing;
      passCount++;
      dribSum += attrs.dribbling * staminaMult;
      dribCount++;
      if (roleUpper === 'LM' || roleUpper === 'RM' || roleUpper.includes('CAM')) {
        paceSum += attrs.pace * staminaMult * freshSpark;
        paceCount++;
      }
    }
  }

  const avgStamina = staminaCount > 0 ? staminaSum / staminaCount : 100;
  const fatiguePenalty = Math.max(0, (82 - avgStamina) * 0.16);
  const chemBreakdown = computeTeamChemistryBreakdown(chemInputs, options?.teamType, setup, cohesionScale);

  // Chemistry combines positional bonds, captaincy leadership, and tactical cohesion
  let chemistryFactor = chemBreakdown.chemistryFactor;
  const paceCounterThreat = paceCount > 0 ? paceSum / paceCount : 68;
  const passingSkill = passCount > 0 ? passSum / passCount : 68;
  const dribblingSkill = dribCount > 0 ? dribSum / dribCount : 68;
  const aerialStrength = physCount > 0 ? physSum / physCount : 68;
  const teamComposure = compCount > 0 ? compSum / compCount : 68;

  // Coherence check: high press with sluggish stamina slightly loses edge; possession with high passing shines
  if (style.isHighPress && avgStamina < 62) {
    chemistryFactor -= 0.028;
  }
  if (style.isPossession && passingSkill >= 76) {
    chemistryFactor += 0.018;
  }
  chemistryFactor = Math.max(0.85, Math.min(1.07, chemistryFactor));

  const homeBonus = isHome
    ? options?.homeAdvantageVal !== undefined
      ? options.homeAdvantageVal
      : 1.65
    : 0;

  // Red card structural penalty scales nonlinearly
  const missingPlayers = Math.max(0, 11 - activeCount);
  const manPenalty = missingPlayers * 4.8;

  // Formation structural contributions
  const midDensityMod = (shape.centralMidCount - 2.5) * 1.15;
  const defDensityMod = (shape.defCount - 4) * 1.35 + (shape.isDoublePivot ? 0.9 : 0);
  const attDensityMod = (shape.attCount - 2.3) * 0.95;

  const mgrAtt = (managerMods?.attackingBonus || 0) + lateComebackBoost * 1.95;
  const mgrMid = (managerMods?.possessionBonus || 0) + lateComebackBoost * 0.95;
  const mgrDef = (managerMods?.defensiveBonus || 0) - lateComebackBoost * 0.4;

  const baseAtt = attCount ? attSum / attCount : midCount ? (midSum / midCount) * 0.92 : 60;
  const baseMid = midCount ? midSum / midCount : 62;
  const baseDef = defCount ? defSum / defCount : 60;

  const flankChemBonus = (chemBreakdown.leftFlankSynergy + chemBreakdown.rightFlankSynergy) * 0.22;

  const att =
    baseAtt * chemistryFactor +
    style.mentalityScore * 1.25 +
    attDensityMod +
    chemBreakdown.creatorFinisherLink * 0.42 +
    flankChemBonus +
    homeBonus * 0.38 +
    mgrAtt +
    psychologyBoost * 0.35 -
    manPenalty * 0.72;

  const mid =
    baseMid * chemistryFactor +
    midDensityMod +
    chemBreakdown.midfieldBalance * 0.48 +
    (style.effectivePressing - 65) * 0.035 +
    homeBonus * 0.34 +
    mgrMid +
    psychologyBoost * 0.28 -
    manPenalty * 0.95;

  const def =
    (baseDef * 0.73 + gkRating * 0.27) * chemistryFactor +
    defDensityMod +
    chemBreakdown.cbPairSynergy * 0.45 +
    chemBreakdown.gkDefComm * 0.35 -
    Math.max(0, style.mentalityScore * 0.85) +
    homeBonus * 0.34 +
    mgrDef +
    psychologyBoost * 0.25 -
    manPenalty * 0.85;

  const possessionCraft =
    mid * 0.56 +
    passingSkill * 0.26 +
    dribblingSkill * 0.18 +
    chemBreakdown.midfieldBalance * 0.65 +
    (style.isPossession ? 3.8 : style.isDirectCounter ? -3.6 : 0) +
    (shape.midCount - 3.5) * 1.35;

  const defensiveWall =
    def * 0.68 +
    aerialStrength * 0.16 +
    gkRating * 0.16 +
    chemBreakdown.cbPairSynergy * 0.5 +
    (style.isLowBlock ? 3.4 : style.effectiveDefLine >= 74 ? -2.2 : 0) +
    (shape.defCount >= 5 ? 2.1 : 0);

  const pressingEfficiency =
    (style.effectivePressing * 0.45 + avgStamina * 0.35 + teamComposure * 0.2) *
    (activeCount / 11);

  return {
    att,
    mid,
    def,
    gkRating,
    gkShotStopping,
    gkSweeperSpeed,
    gkComposure,
    overall: att * 0.34 + mid * 0.34 + def * 0.32,
    possessionCraft,
    paceCounterThreat,
    defensiveWall,
    pressingEfficiency,
    passingSkill,
    dribblingSkill,
    aerialStrength,
    teamComposure,
    avgStamina,
    fatiguePenalty,
    chemistryFactor,
    chemistryScore: chemBreakdown.score,
    chemistryBreakdown: chemBreakdown,
    pressResistance: chemBreakdown.pressResistanceEdge,
    freshSubCount,
    activeCount,
    formationShape: shape,
    style,
  };
}

/**
 * Computes realistic referee stoppage time dynamically from actual match events
 * that occurred in that period (goals, substitutions, injuries, red cards, penalties, fouls/delays).
 */
export function computeDynamicStoppageMinutes(
  periodEvents: SimTimelineEvent[],
  period: '1H' | '2H' | 'ET1' | 'ET2',
  rng: () => number,
  options?: { isCloseLeadLate?: boolean; refereeStoppageGenerosity?: number }
): number {
  let seconds = period === '1H' ? 30 : period === '2H' ? 58 : 22;

  const subTicks = new Set<number>();
  for (const ev of periodEvents) {
    if (ev.type === 'goal' || ev.type === 'own-goal') {
      seconds += 30;
    } else if (ev.type === 'sub') {
      if (subTicks.has(ev.minute)) seconds += 10;
      else {
        subTicks.add(ev.minute);
        seconds += 30;
      }
    } else if (ev.type === 'injury') {
      seconds += 68;
    } else if (ev.type === 'red' || ev.type === 'second-yellow') {
      seconds += 50;
    } else if (ev.type === 'penalty-awarded') {
      seconds += 50;
    } else if (ev.type === 'yellow') {
      seconds += 10;
    }
  }

  if (options?.isCloseLeadLate && (period === '2H' || period === 'ET2')) {
    seconds += 24;
  }

  // Minor natural referee variance (-10s .. +28s), scaled by referee's stoppage generosity
  seconds += (rng() - 0.25) * 35;
  seconds *= options?.refereeStoppageGenerosity ?? 1.0;

  const rawMinutes = Math.round(seconds / 60);
  if (period === '1H') return Math.max(1, Math.min(5, rawMinutes));
  if (period === '2H') return Math.max(2, Math.min(9, rawMinutes));
  return Math.max(1, Math.min(3, rawMinutes));
}

export interface PlayerRatingContext {
  stat: SimPlayerMatchStats;
  isGk: boolean;
  isDef: boolean;
  isMid: boolean;
  teamGoalsFor: number;
  teamGoalsAgainst: number;
  opponentXgotFaced: number;
  bigChancesMissed: number;
  penaltySaves: number;
  penaltiesMissed: number;
  lateWinnerGoals: number;
  teamOutcome: 'win' | 'draw' | 'loss';
}

export function computeFinalPlayerRating(ctx: PlayerRatingContext): number {
  const { stat, isGk, isDef, isMid } = ctx;
  if (stat.minutesPlayed <= 0) return 6.0;

  let rating = stat.started ? 6.2 : stat.minutesPlayed >= 20 ? 6.15 : 6.05;

  // Team outcome & margin influence
  if (ctx.teamOutcome === 'win') rating += 0.24;
  else if (ctx.teamOutcome === 'loss') rating -= 0.16;

  // Attacking impact
  if (stat.goals > 0) {
    rating += 0.95 + Math.max(0, stat.goals - 1) * 0.78;
    rating += ctx.lateWinnerGoals * 0.22;
  }
  if (stat.assists > 0) {
    rating += stat.assists * 0.56;
  }
  rating += Math.min(0.45, stat.keyPasses * 0.11);
  rating += Math.min(0.32, stat.shotsOnTarget * 0.09);

  // Over/underperforming xG slightly
  if (stat.goals === 0 && stat.xg >= 0.45) {
    rating -= Math.min(0.45, (stat.xg - 0.35) * 0.45);
  }
  rating -= Math.min(0.55, ctx.bigChancesMissed * 0.2);
  rating -= ctx.penaltiesMissed * 0.48;

  // Passing contribution (especially for mids/ball-playing defs)
  if (stat.passesAttempted >= 15) {
    const passPct = stat.passesCompleted / stat.passesAttempted;
    if (passPct >= 0.87) rating += isMid ? 0.26 : 0.18;
    else if (passPct < 0.72) rating -= 0.16;
  }

  // Defensive contribution
  rating += Math.min(0.48, stat.tackles * 0.11 + stat.interceptions * 0.12);

  // Goals conceded impact on GK & Defenders
  if (isGk || isDef) {
    if (ctx.teamGoalsAgainst === 0 && stat.minutesPlayed >= 45) {
      rating += isGk ? 0.52 : 0.42;
    } else if (ctx.teamGoalsAgainst >= 2) {
      const leakPenalty = Math.min(0.95, (ctx.teamGoalsAgainst - 1) * (isGk ? 0.22 : 0.18));
      rating -= leakPenalty;
    }
  }

  // Goalkeeper saves & penalty heroics
  if (isGk) {
    rating += Math.min(1.45, stat.saves * 0.22);
    rating += ctx.penaltySaves * 0.85;
    // Reward keepers significantly outperforming xGoT faced
    const goalsPrevented = ctx.opponentXgotFaced - ctx.teamGoalsAgainst;
    if (goalsPrevented > 0.6) {
      rating += Math.min(0.65, goalsPrevented * 0.35);
    }
  }

  // Discipline
  rating -= stat.yellowCards * 0.28;
  rating -= stat.redCards * 1.35;

  // Normalize brief subs so 5-minute cameos don't artificially inflate or sink unless scoring
  if (!stat.started && stat.minutesPlayed < 12 && stat.goals === 0 && stat.assists === 0 && stat.redCards === 0) {
    rating = Math.min(6.45, Math.max(5.85, rating));
  }

  return Number(Math.max(4.2, Math.min(9.9, rating)).toFixed(1));
}
