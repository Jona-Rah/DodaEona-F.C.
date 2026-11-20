import { getAllStadiums, StadiumRecord } from '../data/stadiumsDatabase';
import { Player, Team } from '../types/matchCentre';
// Note: computeTeamChemistryBreakdown infers country vs club cleanly via teamType or teamId prefix
import type {
  SimCompetitionConfig,
  SimCompetitionPreset,
  SimPitchCondition,
  SimRefereeArchetype,
  SimTeamSetup,
  SimWeatherCondition,
} from '../types/simulation';
import { getEffectiveComposureRating } from '../utils/penaltyOrder';

// Cached O(1) lookup map built lazily once per runtime
let _stadiumByClubMap: Map<string, StadiumRecord> | null = null;
function getCachedStadium(clubId: string): StadiumRecord | undefined {
  if (!_stadiumByClubMap) {
    _stadiumByClubMap = new Map(getAllStadiums().map((s) => [s.clubId, s]));
  }
  return _stadiumByClubMap.get(clubId);
}

// ============================================================================
// 1. COMPETITION BENCHMARKS
// ============================================================================

export interface CompetitionBenchmarkProfile {
  preset: SimCompetitionPreset;
  tempoFactor: number; // Match pace & pass/action rhythm
  shotRateFactor: number; // Slight openness vs caginess
  foulFactor: number; // Refereeing & physical challenge intensity
  cardFactor: number; // Booking frequency multiplier
  redFactor: number; // Red card rarity multiplier
  injuryFactor: number; // In-match injury probability multiplier
  staminaDrainFactor: number; // Physical exhaustion rate
  homeCrowdFactor: number; // Competition home crowd relevance
  chemistryCohesionBase: number; // Club vs national tactical familiarity
  cupUpsetBelief: number; // Knockout underdog intensity boost
  shotQualityEdge: number; // Defensive sharpness modifier (negative = sharper defenses)
}

export function resolveCompetitionBenchmark(
  comp: SimCompetitionConfig
): CompetitionBenchmarkProfile {
  switch (comp.preset) {
    case 'premier-league':
      return {
        preset: 'premier-league',
        tempoFactor: 1.04,
        shotRateFactor: 1.0,
        foulFactor: 1.04,
        cardFactor: 1.06,
        redFactor: 1.0,
        injuryFactor: 1.05,
        staminaDrainFactor: 1.04,
        homeCrowdFactor: 1.06,
        chemistryCohesionBase: 1.0,
        cupUpsetBelief: 0.0,
        shotQualityEdge: 0.0,
      };
    case 'champions-league':
      return {
        preset: 'champions-league',
        tempoFactor: 1.01,
        shotRateFactor: 0.99,
        foulFactor: 0.96,
        cardFactor: 1.05,
        redFactor: 0.95,
        injuryFactor: 0.98,
        staminaDrainFactor: 1.01,
        homeCrowdFactor: comp.isKnockout ? 1.12 : 1.04,
        chemistryCohesionBase: 1.02,
        cupUpsetBelief: comp.isKnockout ? 0.35 : 0.0,
        shotQualityEdge: -0.015, // Sharper defensive concentration
      };
    case 'national-cup':
      return {
        preset: 'national-cup',
        tempoFactor: 1.02,
        shotRateFactor: 1.04,
        foulFactor: 1.07,
        cardFactor: 1.04,
        redFactor: 1.08,
        injuryFactor: 1.0,
        staminaDrainFactor: 1.02,
        homeCrowdFactor: 1.05,
        chemistryCohesionBase: 0.98,
        cupUpsetBelief: 0.75,
        shotQualityEdge: 0.01,
      };
    case 'international':
      return {
        preset: 'international',
        tempoFactor: 0.97,
        shotRateFactor: 0.99,
        foulFactor: 0.98,
        cardFactor: 0.98,
        redFactor: 0.88,
        injuryFactor: 0.9,
        staminaDrainFactor: 0.97,
        homeCrowdFactor: comp.neutralVenue ? 0.25 : 0.94,
        chemistryCohesionBase: 0.92,
        cupUpsetBelief: comp.isKnockout ? 0.5 : 0.15,
        shotQualityEdge: -0.005,
      };
    case 'friendly':
      return {
        preset: 'friendly',
        tempoFactor: 0.89,
        shotRateFactor: 1.02,
        foulFactor: 0.74,
        cardFactor: 0.52,
        redFactor: 0.28,
        injuryFactor: 0.65,
        staminaDrainFactor: 0.84,
        homeCrowdFactor: 0.42,
        chemistryCohesionBase: 0.9,
        cupUpsetBelief: 0.0,
        shotQualityEdge: 0.035, // Slightly looser defensive intensity in friendlies
      };
    default:
      return {
        preset: comp.preset || 'custom',
        tempoFactor: 1.0,
        shotRateFactor: 1.0,
        foulFactor: 1.0,
        cardFactor: 1.0,
        redFactor: 1.0,
        injuryFactor: 1.0,
        staminaDrainFactor: 1.0,
        homeCrowdFactor: 1.0,
        chemistryCohesionBase: 0.98,
        cupUpsetBelief: comp.isKnockout ? 0.4 : 0.0,
        shotQualityEdge: 0.0,
      };
  }
}

// ============================================================================
// 2. REFEREE BEHAVIOUR & PROFILE
// ============================================================================

export interface MatchRefereeProfile {
  name: string;
  archetype: SimRefereeArchetype;
  strictnessScore: number; // 0..100
  foulThreshold: number; // 0.86 .. 1.18
  cardStrictness: number; // 0.78 .. 1.28
  advantageTendency: number; // 0.18 .. 0.52 (prob of playing advantage on tactical mid-pitch foul)
  penaltyStrictness: number; // 0.88 .. 1.14
  stoppageGenerosity: number; // 0.88 .. 1.16
  crowdResistance: number; // 0.60 .. 0.95
}

const REFEREE_POOL = [
  'M. Oliver',
  'A. Taylor',
  'C. Turpin',
  'S. Marciniak',
  'D. Orsato',
  'F. Zwayer',
  'J. Gil Manzano',
  'M. Guida',
  'S. Vincic',
  'C. Kavanagh',
  'F. Letexier',
  'W. Roldan',
  'R. Claus',
  'M. Mariani',
  'I. Kovacs',
  'J. Brooks',
];

export function buildRefereeProfile(
  comp: SimCompetitionConfig,
  rng: () => number
): MatchRefereeProfile {
  const name = REFEREE_POOL[Math.floor(rng() * REFEREE_POOL.length)];
  const r = rng();

  let archetype: SimRefereeArchetype = 'Balanced';
  if (comp.refereeStrictnessOverride === 'lenient') archetype = 'Let-It-Flow';
  else if (comp.refereeStrictnessOverride === 'strict') archetype = r < 0.55 ? 'Strict' : 'Card-Happy';
  else if (comp.refereeStrictnessOverride === 'balanced') archetype = 'Balanced';
  else if (r < 0.24) archetype = 'Let-It-Flow';
  else if (r < 0.68) archetype = 'Balanced';
  else if (r < 0.88) archetype = 'Strict';
  else archetype = 'Card-Happy';

  switch (archetype) {
    case 'Let-It-Flow':
      return {
        name,
        archetype,
        strictnessScore: Math.round(32 + rng() * 14),
        foulThreshold: 0.86 + rng() * 0.08,
        cardStrictness: 0.78 + rng() * 0.12,
        advantageTendency: 0.42 + rng() * 0.12,
        penaltyStrictness: 0.88 + rng() * 0.08,
        stoppageGenerosity: 0.9 + rng() * 0.1,
        crowdResistance: 0.72 + rng() * 0.18,
      };
    case 'Strict':
      return {
        name,
        archetype,
        strictnessScore: Math.round(68 + rng() * 14),
        foulThreshold: 1.07 + rng() * 0.09,
        cardStrictness: 1.12 + rng() * 0.12,
        advantageTendency: 0.22 + rng() * 0.1,
        penaltyStrictness: 1.04 + rng() * 0.09,
        stoppageGenerosity: 1.04 + rng() * 0.1,
        crowdResistance: 0.76 + rng() * 0.16,
      };
    case 'Card-Happy':
      return {
        name,
        archetype,
        strictnessScore: Math.round(78 + rng() * 14),
        foulThreshold: 1.08 + rng() * 0.08,
        cardStrictness: 1.2 + rng() * 0.12,
        advantageTendency: 0.2 + rng() * 0.08,
        penaltyStrictness: 1.06 + rng() * 0.08,
        stoppageGenerosity: 1.06 + rng() * 0.1,
        crowdResistance: 0.66 + rng() * 0.2,
      };
    default:
      return {
        name,
        archetype: 'Balanced',
        strictnessScore: Math.round(48 + rng() * 16),
        foulThreshold: 0.96 + rng() * 0.08,
        cardStrictness: 0.96 + rng() * 0.1,
        advantageTendency: 0.3 + rng() * 0.1,
        penaltyStrictness: 0.96 + rng() * 0.08,
        stoppageGenerosity: 0.96 + rng() * 0.08,
        crowdResistance: 0.7 + rng() * 0.2,
      };
  }
}

// ============================================================================
// 3. ENVIRONMENTAL CONDITIONS (WEATHER & PITCH)
// ============================================================================

export interface MatchEnvironmentConditions {
  weather: SimWeatherCondition;
  pitch: SimPitchCondition;
  temperatureC: number;
  stadiumName: string;
  stadiumCapacity: number;
  passingMod: number; // -0.025 .. +0.01
  crossAccuracyMod: number; // -0.03 .. 0
  longShotSkidMod: number; // 0 .. +0.04
  foulRiskMod: number; // -0.01 .. +0.09
  staminaDrainMod: number; // 0.97 .. 1.09
  gkSpillMod: number; // 0 .. +0.08
}

export function buildEnvironmentConditions(
  homeTeam: Team,
  comp: SimCompetitionConfig,
  rng: () => number
): MatchEnvironmentConditions {
  const stadium = getCachedStadium(homeTeam.id);
  const stadiumName = comp.neutralVenue
    ? `${comp.competitionName} Arena`
    : stadium?.name || homeTeam.stadium || `${homeTeam.shortName} Stadium`;
  const stadiumCapacity =
    stadium?.capacity || Math.round(18000 + Math.max(0, homeTeam.overallRating - 60) * 1800);
  const lat = Math.abs(stadium?.coordinates?.lat ?? 45);
  const country = (stadium?.country || homeTeam.country || '').toLowerCase();

  let weather: SimWeatherCondition;
  if (comp.weatherOverride) {
    weather = comp.weatherOverride;
  } else {
    const r = rng();
    const isWarmBelt =
      lat < 36 ||
      country.includes('spain') ||
      country.includes('brazil') ||
      country.includes('saudi') ||
      country.includes('mexico') ||
      country.includes('italy');
    const isWetBelt =
      country.includes('england') ||
      country.includes('scotland') ||
      country.includes('netherlands') ||
      country.includes('ireland') ||
      country.includes('germany');

    if (isWarmBelt) {
      if (r < 0.48) weather = 'Clear';
      else if (r < 0.68) weather = 'Warm';
      else if (r < 0.84) weather = 'Overcast';
      else if (r < 0.93) weather = 'Light Rain';
      else weather = 'Windy';
    } else if (isWetBelt) {
      if (r < 0.28) weather = 'Clear';
      else if (r < 0.55) weather = 'Overcast';
      else if (r < 0.78) weather = 'Light Rain';
      else if (r < 0.88) weather = 'Heavy Rain';
      else if (r < 0.95) weather = 'Windy';
      else weather = 'Cold';
    } else {
      if (r < 0.36) weather = 'Clear';
      else if (r < 0.62) weather = 'Overcast';
      else if (r < 0.78) weather = 'Light Rain';
      else if (r < 0.85) weather = 'Heavy Rain';
      else if (r < 0.92) weather = 'Windy';
      else if (r < 0.96) weather = 'Cold';
      else weather = 'Warm';
    }
  }

  let pitch: SimPitchCondition;
  if (comp.pitchOverride) {
    pitch = comp.pitchOverride;
  } else if (weather === 'Heavy Rain') {
    pitch = rng() < 0.55 ? 'Heavy' : 'Slick';
  } else if (weather === 'Light Rain') {
    pitch = rng() < 0.75 ? 'Slick' : 'Good';
  } else if (homeTeam.overallRating >= 80 && stadium?.isVerifiedStadium !== false) {
    pitch = rng() < 0.72 ? 'Pristine' : 'Good';
  } else {
    const pRoll = rng();
    pitch = pRoll < 0.34 ? 'Pristine' : pRoll < 0.86 ? 'Good' : 'Heavy';
  }

  const temperatureC =
    weather === 'Warm'
      ? Math.round(25 + rng() * 8)
      : weather === 'Cold'
      ? Math.round(1 + rng() * 6)
      : weather === 'Heavy Rain'
      ? Math.round(8 + rng() * 7)
      : Math.round(12 + rng() * 11);

  let passingMod = 0;
  let crossAccuracyMod = 0;
  let longShotSkidMod = 0;
  let foulRiskMod = 0;
  let staminaDrainMod = 1.0;
  let gkSpillMod = 0;

  if (weather === 'Clear' && pitch === 'Pristine') {
    passingMod += 0.008;
  } else if (weather === 'Light Rain') {
    passingMod -= 0.006;
    longShotSkidMod += 0.025;
    foulRiskMod += 0.025;
    gkSpillMod += 0.04;
  } else if (weather === 'Heavy Rain') {
    passingMod -= 0.024;
    crossAccuracyMod -= 0.015;
    longShotSkidMod += 0.035;
    foulRiskMod += 0.075;
    staminaDrainMod += 0.05;
    gkSpillMod += 0.08;
  } else if (weather === 'Windy') {
    passingMod -= 0.012;
    crossAccuracyMod -= 0.03;
  } else if (weather === 'Warm') {
    staminaDrainMod += 0.085;
  } else if (weather === 'Cold') {
    staminaDrainMod += 0.02;
  }

  if (pitch === 'Heavy') {
    passingMod -= 0.012;
    staminaDrainMod += 0.045;
    foulRiskMod += 0.03;
  } else if (pitch === 'Slick') {
    longShotSkidMod += 0.015;
  }

  return {
    weather,
    pitch,
    temperatureC,
    stadiumName,
    stadiumCapacity,
    passingMod,
    crossAccuracyMod,
    longShotSkidMod,
    foulRiskMod,
    staminaDrainMod,
    gkSpillMod,
  };
}

// ============================================================================
// 4. HOME ADVANTAGE & CROWD INFLUENCE
// ============================================================================

export interface CrowdAtmosphereState {
  attendance: number;
  crowdIntensity: number; // 0..100
  homeEnergyBase: number; // Balanced baseline rating boost (~0 .. 2.3)
  awayCrowdImmunity: number; // 0.3 .. 1.0 based on away composure/experience
  refereeCrowdTilt: number; // Subtle 0..0.04 marginal foul sway
}

export function resolveCrowdAtmosphere(
  stadiumCapacity: number,
  homeTeam: Team,
  awayLineup: Player[],
  comp: SimCompetitionConfig,
  benchProfile: CompetitionBenchmarkProfile,
  refereeCrowdResistance: number,
  rng: () => number
): CrowdAtmosphereState {
  if (comp.neutralVenue || comp.homeAdvantageBoost === 0) {
    const attendance = Math.round(stadiumCapacity * (0.72 + rng() * 0.24));
    return {
      attendance,
      crowdIntensity: 35,
      homeEnergyBase: 0,
      awayCrowdImmunity: 1.0,
      refereeCrowdTilt: 0,
    };
  }

  const fillRatio =
    comp.preset === 'friendly'
      ? 0.42 + rng() * 0.34
      : comp.isKnockout
      ? 0.88 + rng() * 0.11
      : 0.78 + rng() * 0.2;
  const attendance = Math.round(stadiumCapacity * Math.min(0.99, fillRatio));

  const sizeTier = Math.max(0.75, Math.min(1.22, 0.72 + Math.log10(Math.max(5000, stadiumCapacity)) * 0.095));
  const boostFactor =
    typeof comp.homeAdvantageBoost === 'number'
      ? Math.max(0, Math.min(12, comp.homeAdvantageBoost)) / 5
      : 1.0;

  // Away experience & composure dampen intimidating atmospheres
  const avgAwayComposure =
    awayLineup.length > 0
      ? awayLineup.reduce((s, p) => s + getEffectiveComposureRating(p), 0) / awayLineup.length
      : 72;
  const avgAwayAge =
    awayLineup.length > 0
      ? awayLineup.reduce((s, p) => s + (p.age || 25), 0) / awayLineup.length
      : 25;
  const awayCrowdImmunity = Math.max(
    0.45,
    Math.min(1.0, 0.62 + (avgAwayComposure - 70) * 0.012 + Math.max(0, avgAwayAge - 23) * 0.015)
  );

  const rawIntensity =
    (48 + Math.min(35, stadiumCapacity / 2200) + (homeTeam.overallRating >= 82 ? 10 : 0)) *
    benchProfile.homeCrowdFactor *
    (0.65 + boostFactor * 0.35);
  const crowdIntensity = Math.round(Math.max(15, Math.min(99, rawIntensity)));

  const homeEnergyBase = Number(
    (
      1.85 *
      boostFactor *
      sizeTier *
      benchProfile.homeCrowdFactor *
      (1.18 - awayCrowdImmunity * 0.28)
    ).toFixed(2)
  );

  const refereeCrowdTilt =
    (crowdIntensity / 100) * (1 - refereeCrowdResistance) * 0.08 * benchProfile.homeCrowdFactor;

  return {
    attendance,
    crowdIntensity,
    homeEnergyBase,
    awayCrowdImmunity,
    refereeCrowdTilt,
  };
}

// ============================================================================
// 5. INDIVIDUAL PLAYER PERFORMANCE CONSISTENCY & MATCH-DAY FORM
// ============================================================================

export function computePlayerMatchFormDelta(
  player: Player,
  rng: () => number
): number {
  const composure = getEffectiveComposureRating(player);
  const age = player.age || 25;
  const primeStability = age >= 25 && age <= 31 ? 0.14 : age <= 20 ? -0.18 : 0;
  // Consistency 0.35 .. 0.95
  const consistency = Math.max(
    0.35,
    Math.min(0.95, 0.56 + (composure - 72) * 0.012 + (player.overallRating - 75) * 0.005 + primeStability)
  );

  // Bell-curved draw around 0 (sum of 3 uniforms - 1.5 -> approx std ~0.5)
  const bell = rng() + rng() + rng() - 1.5;
  const maxSwing = 4.4 - consistency * 2.2; // High consistency ~±2.3, raw young ~±3.6
  const delta = bell * (maxSwing / 1.15);
  return Math.max(-4.2, Math.min(4.4, Number(delta.toFixed(2))));
}

// ============================================================================
// 6. ADVANCED PLAYER CHEMISTRY & POSITIONAL PARTNERSHIPS
// ============================================================================

export interface TeamChemistryBreakdown {
  score: number; // 0..100
  chemistryFactor: number; // ~0.88 .. 1.07
  cbPairSynergy: number; // -2 .. +4
  gkDefComm: number; // -1 .. +3
  leftFlankSynergy: number; // 0 .. +3.5
  rightFlankSynergy: number; // 0 .. +3.5
  midfieldBalance: number; // -2 .. +4
  creatorFinisherLink: number; // -1 .. +4
  pressResistanceEdge: number; // -3 .. +5
  summary: string;
}

export interface ChemistryInputPlayer {
  player: Player;
  nodeRole: string;
  fitMultiplier: number;
}

export function computeTeamChemistryBreakdown(
  entries: ChemistryInputPlayer[],
  teamType: 'club' | 'country' | undefined,
  setup: SimTeamSetup,
  cohesionScale: number
): TeamChemistryBreakdown {
  const isNational =
    teamType ? teamType === 'country' : setup.teamId.startsWith('nat-') || setup.teamId.startsWith('country-');
  const effectiveCohesion = isNational ? Math.min(0.92, cohesionScale) : cohesionScale;

  const gks: ChemistryInputPlayer[] = [];
  const cbs: ChemistryInputPlayer[] = [];
  const leftBacks: ChemistryInputPlayer[] = [];
  const rightBacks: ChemistryInputPlayer[] = [];
  const leftWings: ChemistryInputPlayer[] = [];
  const rightWings: ChemistryInputPlayer[] = [];
  const centralMids: ChemistryInputPlayer[] = [];
  const strikers: ChemistryInputPlayer[] = [];

  for (const e of entries) {
    const r = (e.nodeRole || '').toUpperCase();
    if (r === 'GK') gks.push(e);
    else if (r.includes('CB')) cbs.push(e);
    else if (r === 'LB' || r === 'LWB') leftBacks.push(e);
    else if (r === 'RB' || r === 'RWB') rightBacks.push(e);
    else if (r === 'LW' || r === 'LM') leftWings.push(e);
    else if (r === 'RW' || r === 'RM') rightWings.push(e);
    else if (r.includes('ST') || r.includes('CF')) strikers.push(e);
    else centralMids.push(e);
  }

  // 1. CB-CB Partnership Synergy (natural fit + shared nationality + pace/defending blend)
  let cbPairSynergy = 0;
  if (cbs.length >= 2) {
    const avgCbFit = cbs.reduce((s, c) => s + c.fitMultiplier, 0) / cbs.length;
    const avgCbComp = cbs.reduce((s, c) => s + getEffectiveComposureRating(c.player), 0) / cbs.length;
    const maxCbPace = Math.max(...cbs.map((c) => c.player.attributes.pace || 65));
    const maxCbDef = Math.max(...cbs.map((c) => c.player.attributes.defending || 65));
    const sameNat = cbs.some((a, i) =>
      cbs.slice(i + 1).some((b) => a.player.nationality && a.player.nationality === b.player.nationality)
    );
    cbPairSynergy =
      (avgCbFit >= 0.95 ? 1.3 : -0.8) +
      (avgCbComp >= 74 ? 0.65 : 0) +
      (maxCbPace >= 74 && maxCbDef >= 80 ? 0.85 : 0.25) +
      (sameNat ? 0.7 : 0);
  } else if (cbs.length === 1) {
    cbPairSynergy = -0.9;
  }

  // 2. GK-CB Communication
  let gkDefComm = 0;
  const gk = gks[0];
  if (gk) {
    const gkPos = gk.player.gkAttributes?.positioning ?? gk.player.overallRating;
    const gkComp = getEffectiveComposureRating(gk.player);
    const sharedNatWithCb = cbs.some(
      (c) => c.player.nationality && c.player.nationality === gk.player.nationality
    );
    gkDefComm =
      (gk.fitMultiplier >= 0.9 ? 0.6 : -1.0) +
      (gkPos >= 78 ? 0.7 : 0) +
      (gkComp >= 76 ? 0.45 : 0) +
      (sharedNatWithCb ? 0.55 : 0);
  }

  // 3. Flank Partnerships (LB/LWB + LW/LM, RB/RWB + RW/RM)
  const calcFlank = (fbs: ChemistryInputPlayer[], ws: ChemistryInputPlayer[]) => {
    if (fbs.length === 0 || ws.length === 0) return fbs.length > 0 || ws.length > 0 ? 0.55 : 0;
    const fb = fbs[0];
    const w = ws[0];
    const paceAvg = ((fb.player.attributes.pace || 72) + (w.player.attributes.pace || 72)) / 2;
    const passAvg = ((fb.player.attributes.passing || 70) + (w.player.attributes.passing || 70)) / 2;
    const natLink = fb.player.nationality === w.player.nationality ? 0.45 : 0;
    return (
      fb.fitMultiplier *
      w.fitMultiplier *
      (1.1 + Math.max(0, (paceAvg - 72) * 0.045) + Math.max(0, (passAvg - 70) * 0.04) + natLink)
    );
  };
  const leftFlankSynergy = Number(Math.min(3.5, calcFlank(leftBacks, leftWings)).toFixed(2));
  const rightFlankSynergy = Number(Math.min(3.5, calcFlank(rightBacks, rightWings)).toFixed(2));

  // 4. Midfield Triangle / Anchor + Controller + Creator Synergy
  let midfieldBalance = 0;
  let pressResistanceEdge = 0;
  if (centralMids.length > 0) {
    const hasDestroyer = centralMids.some(
      (m) => (m.nodeRole || '').toUpperCase().includes('CDM') || (m.player.attributes.defending || 0) >= 75
    );
    const hasCreator = centralMids.some(
      (m) => (m.nodeRole || '').toUpperCase().includes('CAM') || (m.player.attributes.passing || 0) >= 78
    );
    const avgMidDrib = centralMids.reduce((s, m) => s + (m.player.attributes.dribbling || 70), 0) / centralMids.length;
    const avgMidPass = centralMids.reduce((s, m) => s + (m.player.attributes.passing || 70), 0) / centralMids.length;
    const avgMidComp = centralMids.reduce((s, m) => s + getEffectiveComposureRating(m.player), 0) / centralMids.length;

    midfieldBalance =
      (hasDestroyer ? 1.1 : -0.6) +
      (hasCreator ? 1.0 : -0.3) +
      (centralMids.length >= 3 ? 0.9 : centralMids.length === 2 ? 0.45 : -0.8);

    pressResistanceEdge =
      (avgMidDrib - 72) * 0.09 +
      (avgMidPass - 72) * 0.09 +
      (avgMidComp - 72) * 0.08 +
      (centralMids.length >= 3 ? 0.7 : 0);
  }

  // 5. Playmaker - Striker Link
  let creatorFinisherLink = 0;
  if (strikers.length > 0) {
    const leadSt = strikers[0];
    const creators = [...centralMids, ...leftWings, ...rightWings];
    const bestCreator = creators.sort(
      (a, b) => (b.player.attributes.passing || 0) - (a.player.attributes.passing || 0)
    )[0];
    if (bestCreator) {
      const linkQuality =
        ((bestCreator.player.attributes.passing || 72) - 70) * 0.055 +
        ((leadSt.player.attributes.shooting || 72) - 70) * 0.045;
      const sameNat = bestCreator.player.nationality === leadSt.player.nationality ? 0.45 : 0;
      creatorFinisherLink = Math.max(-0.5, Math.min(3.6, 0.9 + linkQuality + sameNat));
    }
  }

  const avgFit = entries.length > 0 ? entries.reduce((s, e) => s + e.fitMultiplier, 0) / entries.length : 1;
  const captainOnPitch = entries.some((e) => e.player.isCaptain);

  const rawChemistryFactor =
    (0.915 +
      (avgFit - 0.88) * 0.42 +
      (captainOnPitch ? 0.015 : -0.01) +
      (cbPairSynergy + midfieldBalance + creatorFinisherLink) * 0.0042) *
    (0.94 + effectiveCohesion * 0.06);

  const chemistryFactor = Math.max(0.87, Math.min(1.065, rawChemistryFactor));

  const rawScore =
    56 +
    (avgFit - 0.85) * 45 +
    cbPairSynergy * 2.5 +
    gkDefComm * 1.8 +
    (leftFlankSynergy + rightFlankSynergy) * 1.35 +
    midfieldBalance * 2.6 +
    creatorFinisherLink * 2.2 +
    (captainOnPitch ? 4 : -2) -
    (isNational ? 5 : 0);

  const score = Math.round(Math.max(38, Math.min(98, rawScore)));

  const strongestBond =
    Math.max(cbPairSynergy, midfieldBalance, creatorFinisherLink, leftFlankSynergy, rightFlankSynergy);
  const summary =
    strongestBond === midfieldBalance
      ? `Balanced midfield unit (${score}/100) anchoring ${setup.formation}`
      : strongestBond === creatorFinisherLink
      ? `Sharp #9–creator link (${score}/100)`
      : strongestBond === cbPairSynergy
      ? `Disciplined CB defensive pairing (${score}/100)`
      : `Coordinated flank overlaps (${score}/100)`;

  return {
    score,
    chemistryFactor,
    cbPairSynergy: Number(cbPairSynergy.toFixed(2)),
    gkDefComm: Number(gkDefComm.toFixed(2)),
    leftFlankSynergy,
    rightFlankSynergy,
    midfieldBalance: Number(midfieldBalance.toFixed(2)),
    creatorFinisherLink: Number(creatorFinisherLink.toFixed(2)),
    pressResistanceEdge: Number(Math.max(-4, Math.min(6, pressResistanceEdge)).toFixed(2)),
    summary,
  };
}

// ============================================================================
// 7. ADVANCED TACTICAL MATCHUP ANALYZER
// ============================================================================

export interface TacticalMatchupModifiers {
  attWideOverloadBonus: number; // + when attacking wide channels vs narrow shape
  attCentralOverloadBonus: number; // + when extra mids dominate thin opposing midfield
  pressDisruptionMod: number; // Positive = defense disrupts attacker passing; negative = press broken!
  pressBrokenSpaceBonus: number; // Space behind broken high press
  highLineThroughBallBonus: number; // Extra through-ball threat behind high line
}

export function computeTacticalMatchupModifiers(input: {
  attWidth: number;
  attWidePlayers: number;
  attCentralMids: number;
  attPressResistance: number;
  attPace: number;
  defWidth: number;
  defWidePlayers: number;
  defCentralMids: number;
  defLine: number;
  defPressing: number;
  defBackCount: number;
  defStamina: number;
}): TacticalMatchupModifiers {
  // Wide overload: wide attacking system vs narrow defensive shape
  const narrowTargetPenalty = input.defWidth <= 48 || input.defWidePlayers <= 2 ? 1 : 0;
  const attWideOverloadBonus =
    narrowTargetPenalty && input.attWidth >= 66 && input.attWidePlayers >= 3
      ? Math.min(0.055, ((input.attWidth - input.defWidth) / 100) * 0.11)
      : 0;

  // Midfield overload
  const midDiff = input.attCentralMids - input.defCentralMids;
  const attCentralOverloadBonus = midDiff >= 1 ? Math.min(0.04, midDiff * 0.018) : 0;

  // Press effectiveness vs Press Resistance (tired high press loses bite & gets played through!)
  const pressFatigueLoss = input.defStamina < 64 ? (64 - input.defStamina) * 0.08 : 0;
  const effectiveOppPress = Math.max(0, input.defPressing - 62 - pressFatigueLoss);
  const netPressEdge = effectiveOppPress * 0.0018 - input.attPressResistance * 0.0042;
  const pressDisruptionMod = Math.max(-0.025, Math.min(0.045, netPressEdge));

  // If high press gets bypassed by press-resistant midfielders, attackers sprint into exposed space
  const pressBrokenSpaceBonus =
    input.defPressing >= 72 && input.attPressResistance >= 2.0
      ? Math.min(0.045, (input.attPressResistance - 1.5) * 0.01 + (pressFatigueLoss > 0 ? 0.012 : 0))
      : 0;

  const highLineThroughBallBonus =
    input.defLine >= 68
      ? Math.min(0.05, ((input.defLine - 66) / 30) * 0.032 + Math.max(0, (input.attPace - 74) * 0.0012))
      : 0;

  return {
    attWideOverloadBonus,
    attCentralOverloadBonus,
    pressDisruptionMod,
    pressBrokenSpaceBonus,
    highLineThroughBallBonus,
  };
}
