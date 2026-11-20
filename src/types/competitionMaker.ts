import type { SimPenaltyShootoutState, SimTimelineEventType } from './simulation';
import type { GenderType, TacticalProfile, TeamTypeCode } from './matchCentre';

export type TournamentPresetId =
  | 'world-cup-2026'
  | 'euros-24'
  | 'continental-championship'
  | 'international-knockout'
  | 'domestic-league'
  | 'domestic-cup'
  | 'ucl-36'
  | 'knockout-cup'
  | 'round-robin'
  | 'custom';

export type TournamentStageType = 'league' | 'group' | 'knockout';

export type TieBreakerKey =
  | 'points'
  | 'head-to-head'
  | 'goal-diff'
  | 'goals-for'
  | 'wins'
  | 'away-goals'
  | 'rating';

export type TeamScopeMode = 'club' | 'country' | 'mixed';

export type TrophyCategory =
  | 'Domestic League'
  | 'Domestic Cup'
  | 'Super Cup'
  | 'Continental'
  | 'International'
  | 'Other';

export type TrophyDisplayStyle =
  | 'gold'
  | 'silver'
  | 'crystal'
  | 'metal'
  | 'grand-cup'
  | 'medal';

export type TrophySilhouette =
  | 'chalice'
  | 'amphora'
  | 'globe'
  | 'crown'
  | 'shield'
  | 'obelisk'
  | 'plate'
  | 'medal';

export type TrophyMaterial =
  | 'gold'
  | 'silver'
  | 'platinum'
  | 'obsidian-gold'
  | 'rose-gold'
  | 'crystal'
  | 'metal';

export type TrophyPrestigeTier = 'Legendary' | 'Major' | 'Domestic' | 'Invitational';

export interface TrophyDesignConfig {
  id: string;
  presetId?: string;
  name: string;
  category?: TrophyCategory;
  displayStyle?: TrophyDisplayStyle;
  engraving: string;
  silhouette: TrophySilhouette;
  material: TrophyMaterial;
  primaryColor: string;
  accentColor: string;
  prestigeTier: TrophyPrestigeTier;
  imageUrl?: string;
  isCustom?: boolean;
  createdAt?: string;
}

export interface TournamentTeamSnapshot {
  id: string;
  name: string;
  shortName: string;
  code: string;
  team_type: TeamTypeCode;
  country: string;
  league?: string;
  confederation?: string;
  gender: GenderType;
  crestUrl: string;
  stadium: string;
  primaryColor: string;
  secondaryColor: string;
  overallRating: number;
  attackRating: number;
  midfieldRating: number;
  defenceRating: number;
  defaultFormation: string;
  playingStyle: string;
  tacticalProfile?: TacticalProfile;
  preferredXiIds?: string[];
  penaltyOrderIds?: string[];
  managerId?: string | null;
  managerName?: string | null;
  capturedAt: string;
}

export interface TournamentInjuryEntry {
  playerId: string;
  playerName: string;
  teamId: string;
  positionDetail?: string;
  matchesRemaining: number;
  totalMatchesOut: number;
  reason: string;
  recordedAt: string;
  fixtureId?: string;
}

export interface TournamentDrawOptions {
  preventSameCountry?: boolean;
  lastMode?: 'seeded' | 'bracket' | 'random' | 'official';
  lastWarning?: string;
}

export interface TournamentStageConfig {
  id: string;
  order: number; // 0..5 (up to 6 connected stages)
  name: string;
  type: TournamentStageType;
  inputTeamCount: number;
  advanceCount: number; // How many teams advance to next stage (1 if final stage)
  // League / Group settings
  roundsMode?: 'single-rr' | 'double-rr' | 'swiss-n';
  matchesPerTeam?: number; // e.g. 8 for UCL 36 league phase
  homeAndAway: boolean;
  // League Phase qualification splits (e.g. UCL Top 8 direct + 9th-24th playoff)
  directQualifyCount?: number;
  playoffQualifyCount?: number;
  byeTopCount?: number; // Top N skip immediate next stage (e.g. Top 8 skip KO Play-offs straight to R16)
  byeTargetStageOrder?: number;
  // Group Stage settings
  groupCount?: number;
  groupSize?: number;
  qualifyPerGroup?: number;
  bestThirdPlacedCount?: number;
  neutralVenue?: boolean;
  // Knockout settings
  twoLegged?: boolean;
  finalSingleLeg?: boolean;
  awayGoalsRule?: boolean;
  extraTimeEnabled?: boolean;
  penaltiesEnabled?: boolean;
  seedingMode?: 'seeded' | 'bracket' | 'random';
  thirdPlacePlayoff?: boolean;
}

export interface CompetitionCompactEvent {
  id: string;
  minute: number;
  addedMinute?: number;
  type: SimTimelineEventType;
  teamSide?: 'home' | 'away';
  playerId?: string;
  playerName?: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  secondaryPlayerId?: string;
  secondaryPlayerName?: string;
  headline: string;
  isPenalty?: boolean;
}

export interface CompetitionPlayerFixtureStat {
  playerId: string;
  playerName: string;
  shortName: string;
  teamId: string;
  teamCode: string;
  positionDetail: string;
  started: boolean;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  saves: number;
  injured?: boolean;
  cleanSheet?: boolean;
  rating: number;
  isMotm?: boolean;
}

export interface CompetitionFixtureMatch {
  id: string;
  stageId: string;
  stageOrder: number;
  stageName: string;
  stageType: TournamentStageType;
  groupId?: string;
  groupName?: string;
  roundIndex: number; // 1-based matchday or knockout round index
  roundLabel: string;
  bracketSlot?: number;
  tieId?: string;
  legNumber: 1 | 2;
  isTwoLegged: boolean;
  isKnockout: boolean;
  isFinal?: boolean;
  isThirdPlace?: boolean;
  isBye?: boolean;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homePlaceholder?: string;
  awayPlaceholder?: string;
  neutralVenue: boolean;
  status: 'pending' | 'scheduled' | 'completed';
  seed?: string;
  importedMatchId?: string;
  homeScore?: number;
  awayScore?: number;
  halfTimeHomeScore?: number;
  halfTimeAwayScore?: number;
  wentToExtraTime?: boolean;
  extraTimeHomeScore?: number | null;
  extraTimeAwayScore?: number | null;
  penaltyShootout?: {
    homeScore: number;
    awayScore: number;
    winner: 'home' | 'away' | null;
    summary: string;
    kicks?: SimPenaltyShootoutState['kicks'];
  } | null;
  winnerTeamId?: string | null;
  possessionHome?: number;
  possessionAway?: number;
  shotsHome?: number;
  shotsAway?: number;
  shotsOnTargetHome?: number;
  shotsOnTargetAway?: number;
  cornersHome?: number;
  cornersAway?: number;
  foulsHome?: number;
  foulsAway?: number;
  xgHome?: number;
  xgAway?: number;
  timelineEvents?: CompetitionCompactEvent[];
  playerPerformances?: CompetitionPlayerFixtureStat[];
  settledAt?: string;
}

export interface CompetitionStandingEntry {
  position: number;
  teamId: string;
  teamName: string;
  teamCode: string;
  crestUrl: string;
  groupId?: string;
  groupName?: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  awayGoals: number;
  points: number;
  form: Array<'W' | 'D' | 'L'>;
  zone: 'direct' | 'playoff' | 'third-best' | 'eliminated' | 'active';
  tieBreakNote?: string;
}

export interface TournamentGroup {
  id: string;
  name: string;
  teamIds: string[];
  potMap?: Record<string, number>;
}

export interface CompetitionStageRuntime {
  config: TournamentStageConfig;
  status: 'locked' | 'drawn' | 'active' | 'completed';
  participantIds: string[];
  directByeIds?: string[]; // e.g., UCL Top 8 waiting in R16
  groups?: TournamentGroup[];
  leaguePots?: string[][];
  fixtures: CompetitionFixtureMatch[];
  standings?: CompetitionStandingEntry[];
  thirdPlaceTable?: CompetitionStandingEntry[];
  qualifiedIds: string[];
  playoffIds?: string[];
  eliminatedIds: string[];
}

export interface CompetitionPlayerLeaderboardRow {
  playerId: string;
  playerName: string;
  shortName: string;
  teamId: string;
  teamCode: string;
  teamName: string;
  crestUrl?: string;
  positionDetail: string;
  appearances: number;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  cleanSheets: number;
  saves: number;
  injuries: number;
  avgRating: number;
  motmCount: number;
}

export interface CompetitionEditionHistoryEntry {
  id: string;
  competitionId: string;
  competitionName: string;
  season: string;
  presetId: TournamentPresetId;
  championTeamId: string;
  championName: string;
  championCode: string;
  championCrestUrl?: string;
  runnerUpTeamId?: string;
  runnerUpName?: string;
  runnerUpCode?: string;
  thirdPlaceTeamId?: string;
  thirdPlaceName?: string;
  thirdPlaceCode?: string;
  finalScore: string;
  topScorerName?: string;
  topScorerGoals?: number;
  topAssisterName?: string;
  topAssisterAssists?: number;
  totalMatches: number;
  totalGoals: number;
  awardedAt: string;
  trophy: TrophyDesignConfig;
}

export interface CompetitionLogEntry {
  id: string;
  timestamp: string;
  type: 'created' | 'draw' | 'match' | 'stage' | 'reset' | 'trophy' | 'injury';
  message: string;
}

export interface CompetitionChampionSummary {
  teamId: string;
  teamName: string;
  teamCode: string;
  crestUrl: string;
  primaryColor?: string;
  runnerUpTeamId?: string;
  runnerUpName?: string;
  runnerUpCode?: string;
  runnerUpCrestUrl?: string;
  thirdPlaceTeamId?: string;
  thirdPlaceName?: string;
  thirdPlaceCode?: string;
  thirdPlaceCrestUrl?: string;
  finalScore: string;
  awardedAt: string;
  topScorerName?: string;
  topScorerGoals?: number;
}

export interface CompetitionMakerTournament {
  id: string;
  name: string;
  shortName: string;
  season: string;
  description: string;
  customLogoUrl?: string;
  presetId: TournamentPresetId;
  teamScope: TeamScopeMode;
  status: 'setup' | 'in-progress' | 'completed';
  teamIds: string[];
  teamSnapshots?: Record<string, TournamentTeamSnapshot>;
  tieBreakers: TieBreakerKey[];
  homeAdvantageBoost: number; // 0..10 (0 = Neutral, 5 = Standard, 10 = Fortress)
  drawOptions?: TournamentDrawOptions;
  injuryTracker?: Record<string, TournamentInjuryEntry>;
  trophy: TrophyDesignConfig;
  stages: CompetitionStageRuntime[];
  currentStageOrder: number;
  champion?: CompetitionChampionSummary | null;
  awardedTrophyTeamId?: string | null;
  awardedTrophyRecordId?: string | null;
  history: CompetitionEditionHistoryEntry[];
  logs: CompetitionLogEntry[];
  createdBy: string;
  createdByName?: string;
  createdAt: string;
  updatedAt: string;
}

export type CompetitionHubTab =
  | 'overview'
  | 'fixtures'
  | 'tables'
  | 'bracket'
  | 'draw'
  | 'teams'
  | 'stats'
  | 'qualified'
  | 'history'
  | 'trophy';

export interface TournamentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stageFlowSummary: string[];
  estimatedMatches: number;
}
