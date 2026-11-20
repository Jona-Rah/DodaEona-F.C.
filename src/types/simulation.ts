import type { Player, TacticalMentalitySettings } from './matchCentre';
import type { PitchNode } from '../components/matchCentre/dossier/dossierUtils';

export type SimCompetitionPreset =
  | 'friendly'
  | 'champions-league'
  | 'premier-league'
  | 'national-cup'
  | 'international'
  | 'custom';

export type SimPlanId = 'A' | 'B' | 'C';

export type SimPresentationMode = 'live' | 'highlights' | 'next-break' | 'instant';

export type SimMatchPhase =
  | 'pre-match'
  | 'first-half'
  | 'half-time'
  | 'second-half'
  | 'end-of-90'
  | 'extra-time-1'
  | 'et-interval'
  | 'extra-time-2'
  | 'penalties-intro'
  | 'penalties'
  | 'full-time';

export interface TacticalPlanConfig {
  id: SimPlanId;
  label: string;
  formation: string;
  playingStyle: string;
  pressingIntensity: number;
  buildUpSpeed: number;
  defensiveLine: number;
  width: number;
  mentalitySettings: TacticalMentalitySettings;
}

export interface DugoutLineupSlot {
  slotIndex: number;
  node: PitchNode;
  player: Player | null;
}

export interface SimTeamSetup {
  teamId: string;
  formation: string;
  slots: DugoutLineupSlot[];
  bench: Player[];
  activePlan: SimPlanId;
  plans: Record<SimPlanId, TacticalPlanConfig>;
  penaltyOrderIds?: string[];
}

export interface SimCompetitionConfig {
  preset: SimCompetitionPreset;
  competitionId: string;
  competitionName: string;
  fixtureId?: string;
  stageLabel: string;
  isKnockout: boolean;
  allowExtraTime: boolean;
  allowPenalties: boolean;
  isTwoLegged: boolean;
  legNumber: 1 | 2;
  firstLegHomeGoals?: number; // goals scored in leg 1 by current match's HOME team (when they were away in leg 1)
  firstLegAwayGoals?: number; // goals scored in leg 1 by current match's AWAY team (when they were home in leg 1)
  awayGoalsRule: boolean;
  neutralVenue?: boolean;
  homeAdvantageBoost?: number; // 0 (neutral) .. 10 (fortress), default 5
  weatherOverride?: SimWeatherCondition;
  pitchOverride?: SimPitchCondition;
  refereeStrictnessOverride?: 'lenient' | 'balanced' | 'strict';
}

export type SimWeatherCondition =
  | 'Clear'
  | 'Overcast'
  | 'Light Rain'
  | 'Heavy Rain'
  | 'Windy'
  | 'Warm'
  | 'Cold';

export type SimPitchCondition = 'Pristine' | 'Good' | 'Slick' | 'Heavy';

export type SimRefereeArchetype = 'Let-It-Flow' | 'Balanced' | 'Strict' | 'Card-Happy';

export interface SimMatchConditionsMetadata {
  weather: SimWeatherCondition;
  pitch: SimPitchCondition;
  temperatureC: number;
  stadiumName: string;
  stadiumCapacity: number;
  crowdAttendance: number;
  crowdIntensity: number; // 0..100
  refereeName: string;
  refereeArchetype: SimRefereeArchetype;
  refereeStrictness: number; // 0..100
  homeChemistryScore: number; // 0..100
  awayChemistryScore: number; // 0..100
  chemistrySummaryHome: string;
  chemistrySummaryAway: string;
}

export interface SimShotEvent {
  id: string;
  minute: number;
  addedMinute?: number;
  teamSide: 'home' | 'away';
  playerId: string;
  playerName: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  x: number; // 0-100 across width of attacking half (50 = goal center)
  y: number; // 0-100 where 0 = goal line, 100 = halfway line
  xg: number;
  xgot: number | null;
  outcome: 'goal' | 'saved' | 'blocked' | 'off-target' | 'woodwork';
  situation: 'open-play' | 'set-piece' | 'counter' | 'penalty';
  channel: 'left' | 'central' | 'right';
  buildMethod: 'patient' | 'through-ball' | 'cross-set-piece' | 'counter';
  isBigChance: boolean;
  bodyPart: 'Right foot' | 'Left foot' | 'Header';
}

export interface SimMomentumPoint {
  minute: number; // 1..45, 46..90, 91..105, 106..120 (use addedMinute for stoppage)
  addedMinute?: number;
  period?: '1H' | '2H' | 'ET1' | 'ET2';
  displayLabel: string;
  rawDiff: number; // + home event delta, - away event delta
  smoothedDiff: number; // sustained event-driven momentum (-100..+100)
  homeMomentum?: number; // 0..100 home team attacking intensity
  awayMomentum?: number; // 0..100 away team attacking intensity
}

export type SimTimelineEventType =
  | 'kickoff'
  | 'goal'
  | 'own-goal'
  | 'yellow'
  | 'red'
  | 'second-yellow'
  | 'sub'
  | 'shot-saved'
  | 'woodwork'
  | 'shot-missed'
  | 'big-chance-missed'
  | 'penalty-awarded'
  | 'penalty-missed'
  | 'injury'
  | 'tactical-change'
  | 'half-time'
  | 'full-time'
  | 'extra-time-start'
  | 'et-half-time'
  | 'penalties-start';

export interface SimTimelineEvent {
  id: string;
  minute: number;
  addedMinute?: number;
  period: '1H' | 'HT' | '2H' | 'ET1' | 'ETHT' | 'ET2' | 'FT' | 'PEN';
  type: SimTimelineEventType;
  teamSide?: 'home' | 'away';
  playerId?: string;
  playerName?: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  secondaryPlayerId?: string;
  secondaryPlayerName?: string;
  headline: string;
  commentary: string;
  xg?: number;
  isPenalty?: boolean;
  isKeyMoment: boolean;
}

export interface SimPenaltyKickRecord {
  kickNumber: number;
  round: number;
  teamSide: 'home' | 'away';
  takerId: string;
  takerName: string;
  keeperId: string;
  keeperName: string;
  targetX: number; // 0-100 across goal mouth (0 left post, 100 right post; <0 wide left, >100 wide right)
  targetY: number; // 0-100 from top crossbar (0) to ground (100); <0 over crossbar
  keeperDive: 'left' | 'center' | 'right';
  keeperTargetX?: number; // 0-100 across goal mouth where keeper's gloves reach
  keeperTargetY?: number; // 0-100 vertical reach of keeper's dive
  missDetail?: 'crossbar' | 'left-post' | 'right-post' | 'over' | 'wide-left' | 'wide-right';
  outcome: 'scored' | 'saved' | 'post' | 'missed';
  commentary: string;
}

export interface SimPenaltyShootoutState {
  homeScore: number;
  awayScore: number;
  kicks: SimPenaltyKickRecord[];
  winner: 'home' | 'away' | null;
  suddenDeath: boolean;
}

export interface SimTeamMatchStats {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  xgot: number | null;
  openPlayXg: number | null;
  setPieceXg: number | null;
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
  passAccuracy: number;
  duelsWon: number;
  duelsTotal: number;
  tacklesWon: number;
  tacklesTotal: number;
  interceptions: number;
  clearances: number;
  blocks?: number;
  throughPasses?: number;
  throughPassesCompleted?: number;
  possessionLost?: number;
  saves: number;
  runningDistanceKm: number | null;
  sprintingDistanceKm: number | null;
  sprints: number | null;
  attackingZones: {
    left: number;
    central: number;
    right: number;
  };
  buildMethods: {
    patient: number;
    throughBall: number;
    crossSetPiece: number;
    counter: number;
  };
}

export interface SimPlayerMatchStats {
  playerId: string;
  playerName: string;
  shortName: string;
  shirtNumber: number;
  positionDetail: string;
  roleSlot: string;
  teamSide: 'home' | 'away';
  started: boolean;
  subbedInMinute: number | null;
  subbedOutMinute: number | null;
  minutesPlayed: number;
  rating: number;
  goals: number;
  assists: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  keyPasses: number;
  passesCompleted: number;
  passesAttempted: number;
  throughPasses?: number;
  throughPassesCompleted?: number;
  blocks?: number;
  tackles: number;
  interceptions: number;
  clearances?: number;
  foulsCommitted?: number;
  possessionLost?: number;
  bigChancesMissed?: number;
  staminaRemaining?: number;
  saves: number;
  yellowCards: number;
  redCards: number;
}

export interface SimPreMatchOdds {
  homeWinPct: number;
  drawPct: number;
  awayWinPct: number;
  projectedHomeXg: number;
  projectedAwayXg: number;
}

export interface SimTacticalOverrideCheckpoint {
  minute: number;
  teamSide: 'home' | 'away';
  planId?: SimPlanId;
  formation: string;
  planConfig: TacticalPlanConfig;
  slots: DugoutLineupSlot[];
  bench: Player[];
}

export interface CompleteSimulationOutput {
  seed: string;
  engineVersion: string;
  competition: SimCompetitionConfig;
  homeTeamId: string;
  homeTeamName: string;
  homeCode: string;
  homeColor: string;
  homeFormation: string;
  homeManager: string;
  homeManagerId?: string;
  homeTeamType?: 'club' | 'country';
  homeCaptainName: string;
  awayTeamId: string;
  awayTeamName: string;
  awayCode: string;
  awayColor: string;
  awayFormation: string;
  awayManager: string;
  awayManagerId?: string;
  awayTeamType?: 'club' | 'country';
  awayCaptainName: string;
  homeScore: number;
  awayScore: number;
  halfTimeHomeScore: number;
  halfTimeAwayScore: number;
  extraTimeHomeScore: number | null;
  extraTimeAwayScore: number | null;
  wentToExtraTime: boolean;
  stoppage1H: number;
  stoppage2H: number;
  stoppageET1: number;
  stoppageET2: number;
  finalMinute: number;
  winner: 'home' | 'away' | 'draw';
  aggregateHomeScore?: number;
  aggregateAwayScore?: number;
  penaltyShootout: SimPenaltyShootoutState | null;
  preMatchOdds: SimPreMatchOdds;
  homeStats: SimTeamMatchStats;
  awayStats: SimTeamMatchStats;
  shots: SimShotEvent[];
  momentum: SimMomentumPoint[];
  events: SimTimelineEvent[];
  playerStats: SimPlayerMatchStats[];
  lineupPlayerIds: {
    home: string[];
    away: string[];
  };
  tacticalSummaryHome: string;
  tacticalSummaryAway: string;
  motmPlayerId: string | null;
  matchConditions?: SimMatchConditionsMetadata;
}

export interface CompetitionFixtureItem {
  id: string;
  competitionId: string;
  round: string;
  homeTeamId: string;
  awayTeamId: string;
  isKnockout: boolean;
  isTwoLegged: boolean;
  legNumber: 1 | 2;
  firstLegHomeGoals?: number;
  firstLegAwayGoals?: number;
  settled: boolean;
  settledMatchId?: string;
  homeScore?: number;
  awayScore?: number;
  penaltySummary?: string;
  settledAt?: string;
}

export interface SavedSimulationPayload {
  id: string;
  savedAt: string;
  label: string;
  output: CompleteSimulationOutput;
}
