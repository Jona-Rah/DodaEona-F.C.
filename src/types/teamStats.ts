import type { GenderType, TeamTypeCode } from './matchCentre';

export type TeamStatsSourceScope = 'all' | 'simulate' | 'tournaments';

export interface TeamRecentMatchStat {
  matchId: string;
  source: 'simulate' | 'tournament';
  competitionId: string;
  competitionName: string;
  stageLabel?: string;
  date: string;
  venue: 'home' | 'away' | 'neutral';
  opponentId: string;
  opponentName: string;
  opponentCode: string;
  opponentCrestUrl?: string;
  goalsFor: number;
  goalsAgainst: number;
  halfTimeGoalsFor?: number;
  halfTimeGoalsAgainst?: number;
  wentToExtraTime: boolean;
  penaltySummary?: string;
  penaltyWon?: boolean | null;
  result: 'W' | 'D' | 'L';
  xgFor?: number;
  xgAgainst?: number;
  possession?: number;
}

export interface TeamMatchExtremeRecord {
  matchId: string;
  source: 'simulate' | 'tournament';
  scoreline: string;
  opponentId: string;
  opponentName: string;
  opponentCode: string;
  competitionName: string;
  date: string;
  goalMargin: number;
}

export interface TeamTopContributor {
  playerId: string;
  playerName: string;
  shortName: string;
  goals: number;
  assists: number;
  appearances: number;
}

export interface TeamTournamentParticipation {
  tournamentId: string;
  tournamentName: string;
  shortName: string;
  season: string;
  presetId: string;
  status: 'setup' | 'in-progress' | 'completed';
  placement: 'champion' | 'runner-up' | 'third-place' | 'active' | 'eliminated' | 'setup';
  stageReached: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  avgPossession: number;
  xgFor: number;
  xgAgainst: number;
  trophyName?: string;
}

export interface TeamStatMetrics {
  // Core Record
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  winRatePct: number;
  drawRatePct: number;
  lossRatePct: number;
  points: number;
  pointsPerMatch: number;

  // Venue Splits
  homeMatches: number;
  homeWins: number;
  homeDraws: number;
  homeLosses: number;
  awayMatches: number;
  awayWins: number;
  awayDraws: number;
  awayLosses: number;
  neutralMatches: number;
  neutralWins: number;
  neutralDraws: number;
  neutralLosses: number;

  // Goals & Scoring Splits
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  avgGoalsFor: number;
  avgGoalsAgainst: number;
  cleanSheets: number;
  cleanSheetPct: number;
  failedToScore: number;
  failedToScorePct: number;
  halfTimeGoalsFor: number;
  halfTimeGoalsAgainst: number;
  secondHalfGoalsFor: number;
  secondHalfGoalsAgainst: number;
  extraTimeMatches: number;
  extraTimeGoalsFor: number;
  extraTimeGoalsAgainst: number;
  ownGoalsFor: number;
  ownGoalsConceded: number;

  // Penalty Shootouts & In-Match Penalties
  penaltyShootoutsPlayed: number;
  penaltyShootoutWins: number;
  penaltyShootoutLosses: number;
  penaltyShootoutGoalsScored: number;
  penaltyShootoutGoalsConceded: number;
  penaltyShootoutKicksTaken: number;
  penaltyShootoutKicksScored: number;
  penaltiesAwardedScored: number;
  penaltiesMissed: number;

  // Shooting & Expected Goals
  shots: number;
  shotsPerMatch: number;
  shotsOnTarget: number;
  shotsOnTargetPerMatch: number;
  shotAccuracyPct: number;
  shotConversionPct: number;
  shotsConceded: number;
  shotsConcededPerMatch: number;
  shotsOnTargetConceded: number;
  xg: number;
  xgPerMatch: number;
  xgAgainst: number;
  xgAgainstPerMatch: number;
  xgDifference: number; // goalsFor - xg
  netXg: number; // xg - xgAgainst
  xgot: number;
  xgotPerMatch: number;
  openPlayXg: number;
  openPlayXgPerMatch: number;
  setPieceXg: number;
  setPieceXgPerMatch: number;
  bigChances: number;
  bigChancesPerMatch: number;
  bigChancesMissed: number;
  bigChanceConversionPct: number;
  touchesInBox: number;
  touchesInBoxPerMatch: number;
  corners: number;
  cornersPerMatch: number;
  offsides: number;
  offsidesPerMatch: number;

  // Attacking Channels & Build-Up (averaged across telemetry-rich matches)
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

  // Possession & Passing
  avgPossession: number;
  passesAttempted: number;
  passesCompleted: number;
  passesAttemptedPerMatch: number;
  passesCompletedPerMatch: number;
  passAccuracyPct: number;

  // Defence & Goalkeeping
  tacklesWon: number;
  tacklesTotal: number;
  tackleSuccessPct: number;
  tacklesPerMatch: number;
  duelsWon: number;
  duelsTotal: number;
  duelWinPct: number;
  interceptions: number;
  interceptionsPerMatch: number;
  clearances: number;
  clearancesPerMatch: number;
  saves: number;
  savesPerMatch: number;
  savePct: number;

  // Physical
  runningDistanceKm: number;
  avgRunningDistanceKm: number;
  sprintingDistanceKm: number;
  avgSprintingDistanceKm: number;
  sprints: number;
  avgSprintsPerMatch: number;

  // Discipline, Subs, Injuries & Player Performance
  fouls: number;
  foulsPerMatch: number;
  yellowCards: number;
  yellowCardsPerMatch: number;
  redCards: number;
  substitutionsUsed: number;
  injuriesSuffered: number;
  motmAwards: number;
  avgMatchRating: number;

  // Tournament Summary Counters
  tournamentsEntered: number;
  tournamentTitlesWon: number;
  tournamentRunnerUps: number;
  tournamentThirdPlaces: number;

  // Coverage & Form
  telemetryRichMatches: number;
  recentForm: TeamRecentMatchStat[];
  biggestWin: TeamMatchExtremeRecord | null;
  heaviestDefeat: TeamMatchExtremeRecord | null;
  topScorer: TeamTopContributor | null;
  topAssister: TeamTopContributor | null;
}

export interface TeamStatsSummaryTeamInfo {
  id: string;
  name: string;
  shortName: string;
  code: string;
  team_type: TeamTypeCode;
  country: string;
  flag?: string;
  league?: string;
  confederation?: string;
  gender: GenderType;
  crestUrl: string;
  primaryColor: string;
  secondaryColor: string;
  overallRating: number;
  attackRating: number;
  midfieldRating: number;
  defenceRating: number;
  stadium: string;
  manager: string;
  trophiesCount: number;
}

export interface TeamAggregateStatistics {
  team: TeamStatsSummaryTeamInfo;
  simulatedMatchCount: number;
  tournamentMatchCount: number;
  linkedImportedCount: number;
  combined: TeamStatMetrics;
  simulate: TeamStatMetrics;
  tournaments: TeamStatMetrics;
  tournamentsList: TeamTournamentParticipation[];
}

export interface TeamStatisticsGlobalSummary {
  totalTeamsOnFile: number;
  teamsWithMatches: number;
  teamsWithSimulatedMatches: number;
  teamsWithTournamentMatches: number;
  totalCombinedMatches: number;
  totalSimulatedMatches: number;
  totalTournamentMatches: number;
  linkedImportedMatches: number;
  totalTournaments: number;
  completedTournaments: number;
  totalGoalsCombined: number;
  totalCleanSheetsCombined: number;
  avgGoalsPerMatchCombined: number;
  totalGoalsSimulate: number;
  totalCleanSheetsSimulate: number;
  avgGoalsPerMatchSimulate: number;
  totalGoalsTournaments: number;
  totalCleanSheetsTournaments: number;
  avgGoalsPerMatchTournaments: number;
}

export interface TeamStatisticsResponse {
  generatedAt: string;
  summary: TeamStatisticsGlobalSummary;
  teams: TeamAggregateStatistics[];
}
