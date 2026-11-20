import type {
  CompetitionFixtureMatch,
  CompetitionMakerTournament,
} from '../types/competitionMaker';
import type { Manager } from '../types/manager';
import { getTeamType, type Team } from '../types/matchCentre';
import type {
  CompleteSimulationOutput,
  SimTeamMatchStats,
} from '../types/simulation';
import type {
  TeamAggregateStatistics,
  TeamMatchExtremeRecord,
  TeamRecentMatchStat,
  TeamStatMetrics,
  TeamStatisticsGlobalSummary,
  TeamStatisticsResponse,
  TeamStatsSummaryTeamInfo,
  TeamTopContributor,
  TeamTournamentParticipation,
} from '../types/teamStats';
import type { CompetitionRecord, SimulationMatchRecord } from '../../server/types';
import { rebuildMatchFullOutput } from './competitionEngine';

export interface TeamStatsBuildOptions {
  teams: Team[];
  simulationMatches: SimulationMatchRecord[];
  competitionMakers: CompetitionMakerTournament[];
  competitions?: CompetitionRecord[];
  managersByTeam?: Map<string, Manager | null>;
  rebuiltOutputResolver?: (
    tournament: CompetitionMakerTournament,
    fixture: CompetitionFixtureMatch,
    teamsMap: Map<string, Team>,
    managersByTeam?: Map<string, Manager | null>
  ) => CompleteSimulationOutput | null;
}

interface ContributorTally {
  playerId: string;
  playerName: string;
  shortName: string;
  goals: number;
  assists: number;
  appearances: number;
}

interface MetricsAccumulator {
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
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

  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  failedToScore: number;
  halfTimeGoalsFor: number;
  halfTimeGoalsAgainst: number;
  halfTimeRecordedCount: number;
  extraTimeMatches: number;
  extraTimeGoalsFor: number;
  extraTimeGoalsAgainst: number;
  ownGoalsFor: number;
  ownGoalsConceded: number;

  penaltyShootoutsPlayed: number;
  penaltyShootoutWins: number;
  penaltyShootoutLosses: number;
  penaltyShootoutGoalsScored: number;
  penaltyShootoutGoalsConceded: number;
  penaltyShootoutKicksTaken: number;
  penaltyShootoutKicksScored: number;
  penaltiesAwardedScored: number;
  penaltiesMissed: number;

  possessionSum: number;
  possessionCount: number;

  shots: number;
  shotsOnTarget: number;
  shotsOnTargetCount: number;
  shotsConceded: number;
  shotsOnTargetConceded: number;

  xg: number;
  xgAgainst: number;
  xgot: number;
  xgotCount: number;
  openPlayXg: number;
  openPlayXgCount: number;
  setPieceXg: number;
  setPieceXgCount: number;

  bigChances: number;
  bigChancesMissed: number;
  touchesInBox: number;
  corners: number;
  cornersCount: number;
  offsides: number;

  zoneLeftSum: number;
  zoneCentralSum: number;
  zoneRightSum: number;
  zoneCount: number;

  buildPatientSum: number;
  buildThroughSum: number;
  buildCrossSetSum: number;
  buildCounterSum: number;
  buildCount: number;

  passesAttempted: number;
  passesCompleted: number;
  passingCount: number;

  tacklesWon: number;
  tacklesTotal: number;
  duelsWon: number;
  duelsTotal: number;
  interceptions: number;
  clearances: number;
  saves: number;
  defenceTelemetryCount: number;

  runningDistanceKm: number;
  sprintingDistanceKm: number;
  sprints: number;
  physicalCount: number;

  fouls: number;
  foulsCount: number;
  yellowCards: number;
  redCards: number;
  substitutionsUsed: number;
  injuriesSuffered: number;
  motmAwards: number;
  ratingSum: number;
  ratingCount: number;

  tournamentsEntered: number;
  tournamentTitlesWon: number;
  tournamentRunnerUps: number;
  tournamentThirdPlaces: number;

  telemetryRichMatches: number;
  recentMatches: TeamRecentMatchStat[];
  biggestWin: TeamMatchExtremeRecord | null;
  heaviestDefeat: TeamMatchExtremeRecord | null;
  contributors: Map<string, ContributorTally>;
}

function createAccumulator(): MetricsAccumulator {
  return {
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    homeMatches: 0,
    homeWins: 0,
    homeDraws: 0,
    homeLosses: 0,
    awayMatches: 0,
    awayWins: 0,
    awayDraws: 0,
    awayLosses: 0,
    neutralMatches: 0,
    neutralWins: 0,
    neutralDraws: 0,
    neutralLosses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    cleanSheets: 0,
    failedToScore: 0,
    halfTimeGoalsFor: 0,
    halfTimeGoalsAgainst: 0,
    halfTimeRecordedCount: 0,
    extraTimeMatches: 0,
    extraTimeGoalsFor: 0,
    extraTimeGoalsAgainst: 0,
    ownGoalsFor: 0,
    ownGoalsConceded: 0,
    penaltyShootoutsPlayed: 0,
    penaltyShootoutWins: 0,
    penaltyShootoutLosses: 0,
    penaltyShootoutGoalsScored: 0,
    penaltyShootoutGoalsConceded: 0,
    penaltyShootoutKicksTaken: 0,
    penaltyShootoutKicksScored: 0,
    penaltiesAwardedScored: 0,
    penaltiesMissed: 0,
    possessionSum: 0,
    possessionCount: 0,
    shots: 0,
    shotsOnTarget: 0,
    shotsOnTargetCount: 0,
    shotsConceded: 0,
    shotsOnTargetConceded: 0,
    xg: 0,
    xgAgainst: 0,
    xgot: 0,
    xgotCount: 0,
    openPlayXg: 0,
    openPlayXgCount: 0,
    setPieceXg: 0,
    setPieceXgCount: 0,
    bigChances: 0,
    bigChancesMissed: 0,
    touchesInBox: 0,
    corners: 0,
    cornersCount: 0,
    offsides: 0,
    zoneLeftSum: 0,
    zoneCentralSum: 0,
    zoneRightSum: 0,
    zoneCount: 0,
    buildPatientSum: 0,
    buildThroughSum: 0,
    buildCrossSetSum: 0,
    buildCounterSum: 0,
    buildCount: 0,
    passesAttempted: 0,
    passesCompleted: 0,
    passingCount: 0,
    tacklesWon: 0,
    tacklesTotal: 0,
    duelsWon: 0,
    duelsTotal: 0,
    interceptions: 0,
    clearances: 0,
    saves: 0,
    defenceTelemetryCount: 0,
    runningDistanceKm: 0,
    sprintingDistanceKm: 0,
    sprints: 0,
    physicalCount: 0,
    fouls: 0,
    foulsCount: 0,
    yellowCards: 0,
    redCards: 0,
    substitutionsUsed: 0,
    injuriesSuffered: 0,
    motmAwards: 0,
    ratingSum: 0,
    ratingCount: 0,
    tournamentsEntered: 0,
    tournamentTitlesWon: 0,
    tournamentRunnerUps: 0,
    tournamentThirdPlaces: 0,
    telemetryRichMatches: 0,
    recentMatches: [],
    biggestWin: null,
    heaviestDefeat: null,
    contributors: new Map(),
  };
}

function round1(n: number): number {
  return Number.isFinite(n) ? Number(n.toFixed(1)) : 0;
}

function round2(n: number): number {
  return Number.isFinite(n) ? Number(n.toFixed(2)) : 0;
}

function safeDiv(num: number, den: number): number {
  if (!den || !Number.isFinite(num) || !Number.isFinite(den)) return 0;
  return num / den;
}

function parsePenaltySummaryText(summary?: string): { home: number; away: number } | null {
  if (!summary) return null;
  const m = summary.match(/(\d+)\s*[-–:]\s*(\d+)/);
  if (!m) return null;
  return { home: Number(m[1]), away: Number(m[2]) };
}

interface NormalizedSideMatchInput {
  matchId: string;
  source: 'simulate' | 'tournament';
  competitionId: string;
  competitionName: string;
  stageLabel?: string;
  date: string;
  sortTimestamp: string;
  side: 'home' | 'away';
  neutralVenue: boolean;
  opponent: {
    id: string;
    name: string;
    code: string;
    crestUrl?: string;
  };
  goalsFor: number;
  goalsAgainst: number;
  halfTimeGoalsFor?: number;
  halfTimeGoalsAgainst?: number;
  wentToExtraTime: boolean;
  extraTimeGoalsFor?: number;
  extraTimeGoalsAgainst?: number;
  penaltySummary?: string;
  penaltyShootout?: {
    goalsFor: number;
    goalsAgainst: number;
    won: boolean;
    kicksTaken?: number;
    kicksScored?: number;
  } | null;
  possession?: number;
  shots?: number;
  shotsOnTarget?: number;
  shotsConceded?: number;
  shotsOnTargetConceded?: number;
  xg?: number;
  xgAgainst?: number;
  corners?: number;
  fouls?: number;
  teamStats?: SimTeamMatchStats | null;
  oppStats?: SimTeamMatchStats | null;
  ownGoalsFor: number;
  ownGoalsConceded: number;
  penaltiesAwardedScored: number;
  penaltiesMissed: number;
  yellowCards: number;
  redCards: number;
  substitutionsUsed: number;
  injuriesSuffered: number;
  motmWon: boolean;
  avgPlayerRating?: number;
  savesFallback?: number;
  contributors: Array<{
    playerId: string;
    playerName: string;
    shortName: string;
    goals: number;
    assists: number;
  }>;
}

function recordContributor(
  acc: MetricsAccumulator,
  item: {
    playerId: string;
    playerName: string;
    shortName: string;
    goals: number;
    assists: number;
  }
) {
  if (!item.playerId && !item.playerName) return;
  const key = item.playerId || item.playerName.toLowerCase();
  const prev = acc.contributors.get(key);
  if (!prev) {
    acc.contributors.set(key, {
      playerId: item.playerId || key,
      playerName: item.playerName,
      shortName: item.shortName || item.playerName,
      goals: item.goals,
      assists: item.assists,
      appearances: 1,
    });
  } else {
    prev.goals += item.goals;
    prev.assists += item.assists;
    prev.appearances += 1;
  }
}

function pushMatchToAccumulator(acc: MetricsAccumulator, m: NormalizedSideMatchInput) {
  acc.matchesPlayed += 1;
  const gf = Math.max(0, Number(m.goalsFor) || 0);
  const ga = Math.max(0, Number(m.goalsAgainst) || 0);
  acc.goalsFor += gf;
  acc.goalsAgainst += ga;
  if (ga === 0) acc.cleanSheets += 1;
  if (gf === 0) acc.failedToScore += 1;

  const result: 'W' | 'D' | 'L' = gf > ga ? 'W' : gf === ga ? 'D' : 'L';
  if (result === 'W') acc.wins += 1;
  else if (result === 'D') acc.draws += 1;
  else acc.losses += 1;

  if (m.neutralVenue) {
    acc.neutralMatches += 1;
    if (result === 'W') acc.neutralWins += 1;
    else if (result === 'D') acc.neutralDraws += 1;
    else acc.neutralLosses += 1;
  } else if (m.side === 'home') {
    acc.homeMatches += 1;
    if (result === 'W') acc.homeWins += 1;
    else if (result === 'D') acc.homeDraws += 1;
    else acc.homeLosses += 1;
  } else {
    acc.awayMatches += 1;
    if (result === 'W') acc.awayWins += 1;
    else if (result === 'D') acc.awayDraws += 1;
    else acc.awayLosses += 1;
  }

  if (typeof m.halfTimeGoalsFor === 'number' && typeof m.halfTimeGoalsAgainst === 'number') {
    acc.halfTimeGoalsFor += Math.max(0, m.halfTimeGoalsFor);
    acc.halfTimeGoalsAgainst += Math.max(0, m.halfTimeGoalsAgainst);
    acc.halfTimeRecordedCount += 1;
  }

  if (m.wentToExtraTime) {
    acc.extraTimeMatches += 1;
    acc.extraTimeGoalsFor += Math.max(0, Number(m.extraTimeGoalsFor) || 0);
    acc.extraTimeGoalsAgainst += Math.max(0, Number(m.extraTimeGoalsAgainst) || 0);
  }

  acc.ownGoalsFor += m.ownGoalsFor;
  acc.ownGoalsConceded += m.ownGoalsConceded;
  acc.penaltiesAwardedScored += m.penaltiesAwardedScored;
  acc.penaltiesMissed += m.penaltiesMissed;

  if (m.penaltyShootout) {
    acc.penaltyShootoutsPlayed += 1;
    if (m.penaltyShootout.won) acc.penaltyShootoutWins += 1;
    else acc.penaltyShootoutLosses += 1;
    acc.penaltyShootoutGoalsScored += m.penaltyShootout.goalsFor;
    acc.penaltyShootoutGoalsConceded += m.penaltyShootout.goalsAgainst;
    acc.penaltyShootoutKicksTaken += m.penaltyShootout.kicksTaken ?? 0;
    acc.penaltyShootoutKicksScored += m.penaltyShootout.kicksScored ?? m.penaltyShootout.goalsFor;
  }

  const ts = m.teamStats;
  const os = m.oppStats;

  const poss = ts?.possession ?? m.possession;
  if (typeof poss === 'number' && Number.isFinite(poss)) {
    acc.possessionSum += poss;
    acc.possessionCount += 1;
  }

  const shots = ts?.shots ?? m.shots ?? 0;
  acc.shots += Math.max(0, shots);
  const shotsConceded = os?.shots ?? m.shotsConceded ?? 0;
  acc.shotsConceded += Math.max(0, shotsConceded);

  const sot = ts?.shotsOnTarget ?? m.shotsOnTarget;
  if (typeof sot === 'number') {
    acc.shotsOnTarget += Math.max(0, sot);
    acc.shotsOnTargetCount += 1;
  }
  const sotConceded = os?.shotsOnTarget ?? m.shotsOnTargetConceded;
  if (typeof sotConceded === 'number') {
    acc.shotsOnTargetConceded += Math.max(0, sotConceded);
  }

  const xg = ts?.xg ?? m.xg ?? 0;
  const xgAgainst = os?.xg ?? m.xgAgainst ?? 0;
  acc.xg += Math.max(0, xg);
  acc.xgAgainst += Math.max(0, xgAgainst);

  const corners = ts?.corners ?? m.corners;
  if (typeof corners === 'number') {
    acc.corners += Math.max(0, corners);
    acc.cornersCount += 1;
  }

  const fouls = ts?.fouls ?? m.fouls;
  if (typeof fouls === 'number') {
    acc.fouls += Math.max(0, fouls);
    acc.foulsCount += 1;
  }

  if (ts) {
    acc.telemetryRichMatches += 1;
    if (typeof ts.xgot === 'number') {
      acc.xgot += ts.xgot;
      acc.xgotCount += 1;
    }
    if (typeof ts.openPlayXg === 'number') {
      acc.openPlayXg += ts.openPlayXg;
      acc.openPlayXgCount += 1;
    }
    if (typeof ts.setPieceXg === 'number') {
      acc.setPieceXg += ts.setPieceXg;
      acc.setPieceXgCount += 1;
    }
    acc.bigChances += ts.bigChances || 0;
    acc.bigChancesMissed += ts.bigChancesMissed || 0;
    acc.touchesInBox += ts.touchesInBox || 0;
    acc.offsides += ts.offsides || 0;

    if (ts.attackingZones) {
      acc.zoneLeftSum += ts.attackingZones.left || 0;
      acc.zoneCentralSum += ts.attackingZones.central || 0;
      acc.zoneRightSum += ts.attackingZones.right || 0;
      acc.zoneCount += 1;
    }
    if (ts.buildMethods) {
      acc.buildPatientSum += ts.buildMethods.patient || 0;
      acc.buildThroughSum += ts.buildMethods.throughBall || 0;
      acc.buildCrossSetSum += ts.buildMethods.crossSetPiece || 0;
      acc.buildCounterSum += ts.buildMethods.counter || 0;
      acc.buildCount += 1;
    }

    acc.passesAttempted += ts.passesAttempted || 0;
    acc.passesCompleted += ts.passesCompleted || 0;
    acc.passingCount += 1;

    acc.tacklesWon += ts.tacklesWon || 0;
    acc.tacklesTotal += ts.tacklesTotal || 0;
    acc.duelsWon += ts.duelsWon || 0;
    acc.duelsTotal += ts.duelsTotal || 0;
    acc.interceptions += ts.interceptions || 0;
    acc.clearances += ts.clearances || 0;
    acc.saves += ts.saves || 0;
    acc.defenceTelemetryCount += 1;

    if (
      typeof ts.runningDistanceKm === 'number' ||
      typeof ts.sprintingDistanceKm === 'number' ||
      typeof ts.sprints === 'number'
    ) {
      acc.runningDistanceKm += ts.runningDistanceKm || 0;
      acc.sprintingDistanceKm += ts.sprintingDistanceKm || 0;
      acc.sprints += ts.sprints || 0;
      acc.physicalCount += 1;
    }

    acc.yellowCards += ts.yellowCards ?? m.yellowCards;
    acc.redCards += ts.redCards ?? m.redCards;
  } else {
    acc.yellowCards += m.yellowCards;
    acc.redCards += m.redCards;
    if (typeof m.savesFallback === 'number') {
      acc.saves += m.savesFallback;
    }
  }

  acc.substitutionsUsed += m.substitutionsUsed;
  acc.injuriesSuffered += m.injuriesSuffered;
  if (m.motmWon) acc.motmAwards += 1;
  if (typeof m.avgPlayerRating === 'number' && m.avgPlayerRating > 0) {
    acc.ratingSum += m.avgPlayerRating;
    acc.ratingCount += 1;
  }

  for (const c of m.contributors) {
    recordContributor(acc, c);
  }

  const margin = gf - ga;
  if (margin > 0) {
    if (
      !acc.biggestWin ||
      margin > acc.biggestWin.goalMargin ||
      (margin === acc.biggestWin.goalMargin && gf > Number(acc.biggestWin.scoreline.split('-')[0] || 0))
    ) {
      acc.biggestWin = {
        matchId: m.matchId,
        source: m.source,
        scoreline: `${gf}-${ga}`,
        opponentId: m.opponent.id,
        opponentName: m.opponent.name,
        opponentCode: m.opponent.code,
        competitionName: m.competitionName,
        date: m.date,
        goalMargin: margin,
      };
    }
  } else if (margin < 0) {
    const lossMargin = Math.abs(margin);
    if (!acc.heaviestDefeat || lossMargin > acc.heaviestDefeat.goalMargin) {
      acc.heaviestDefeat = {
        matchId: m.matchId,
        source: m.source,
        scoreline: `${gf}-${ga}`,
        opponentId: m.opponent.id,
        opponentName: m.opponent.name,
        opponentCode: m.opponent.code,
        competitionName: m.competitionName,
        date: m.date,
        goalMargin: lossMargin,
      };
    }
  }

  acc.recentMatches.push({
    matchId: m.matchId,
    source: m.source,
    competitionId: m.competitionId,
    competitionName: m.competitionName,
    stageLabel: m.stageLabel,
    date: m.date,
    venue: m.neutralVenue ? 'neutral' : m.side,
    opponentId: m.opponent.id,
    opponentName: m.opponent.name,
    opponentCode: m.opponent.code,
    opponentCrestUrl: m.opponent.crestUrl,
    goalsFor: gf,
    goalsAgainst: ga,
    halfTimeGoalsFor: m.halfTimeGoalsFor,
    halfTimeGoalsAgainst: m.halfTimeGoalsAgainst,
    wentToExtraTime: m.wentToExtraTime,
    penaltySummary: m.penaltySummary,
    penaltyWon: m.penaltyShootout ? m.penaltyShootout.won : null,
    result,
    xgFor: ts?.xg ?? m.xg,
    xgAgainst: os?.xg ?? m.xgAgainst,
    possession: poss,
  });
}

function finalizeMetrics(acc: MetricsAccumulator): TeamStatMetrics {
  const mp = acc.matchesPlayed;
  const points = acc.wins * 3 + acc.draws;
  const secondHalfGF = Math.max(
    0,
    acc.goalsFor - acc.halfTimeGoalsFor - acc.extraTimeGoalsFor
  );
  const secondHalfGA = Math.max(
    0,
    acc.goalsAgainst - acc.halfTimeGoalsAgainst - acc.extraTimeGoalsAgainst
  );

  const contributorsArr = Array.from(acc.contributors.values());
  const topScorer =
    contributorsArr
      .filter((c) => c.goals > 0)
      .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.appearances - b.appearances)[0] ||
    null;
  const topAssister =
    contributorsArr
      .filter((c) => c.assists > 0)
      .sort((a, b) => b.assists - a.assists || b.goals - a.goals || a.appearances - b.appearances)[0] ||
    null;

  const richCount = acc.telemetryRichMatches;
  const shotsConcededOnTarget = acc.shotsOnTargetConceded;
  const savesPlusGa = acc.saves + acc.goalsAgainst;

  return {
    matchesPlayed: mp,
    wins: acc.wins,
    draws: acc.draws,
    losses: acc.losses,
    winRatePct: round1(safeDiv(acc.wins * 100, mp)),
    drawRatePct: round1(safeDiv(acc.draws * 100, mp)),
    lossRatePct: round1(safeDiv(acc.losses * 100, mp)),
    points,
    pointsPerMatch: round2(safeDiv(points, mp)),

    homeMatches: acc.homeMatches,
    homeWins: acc.homeWins,
    homeDraws: acc.homeDraws,
    homeLosses: acc.homeLosses,
    awayMatches: acc.awayMatches,
    awayWins: acc.awayWins,
    awayDraws: acc.awayDraws,
    awayLosses: acc.awayLosses,
    neutralMatches: acc.neutralMatches,
    neutralWins: acc.neutralWins,
    neutralDraws: acc.neutralDraws,
    neutralLosses: acc.neutralLosses,

    goalsFor: acc.goalsFor,
    goalsAgainst: acc.goalsAgainst,
    goalDifference: acc.goalsFor - acc.goalsAgainst,
    avgGoalsFor: round2(safeDiv(acc.goalsFor, mp)),
    avgGoalsAgainst: round2(safeDiv(acc.goalsAgainst, mp)),
    cleanSheets: acc.cleanSheets,
    cleanSheetPct: round1(safeDiv(acc.cleanSheets * 100, mp)),
    failedToScore: acc.failedToScore,
    failedToScorePct: round1(safeDiv(acc.failedToScore * 100, mp)),
    halfTimeGoalsFor: acc.halfTimeGoalsFor,
    halfTimeGoalsAgainst: acc.halfTimeGoalsAgainst,
    secondHalfGoalsFor: acc.halfTimeRecordedCount > 0 ? secondHalfGF : 0,
    secondHalfGoalsAgainst: acc.halfTimeRecordedCount > 0 ? secondHalfGA : 0,
    extraTimeMatches: acc.extraTimeMatches,
    extraTimeGoalsFor: acc.extraTimeGoalsFor,
    extraTimeGoalsAgainst: acc.extraTimeGoalsAgainst,
    ownGoalsFor: acc.ownGoalsFor,
    ownGoalsConceded: acc.ownGoalsConceded,

    penaltyShootoutsPlayed: acc.penaltyShootoutsPlayed,
    penaltyShootoutWins: acc.penaltyShootoutWins,
    penaltyShootoutLosses: acc.penaltyShootoutLosses,
    penaltyShootoutGoalsScored: acc.penaltyShootoutGoalsScored,
    penaltyShootoutGoalsConceded: acc.penaltyShootoutGoalsConceded,
    penaltyShootoutKicksTaken: acc.penaltyShootoutKicksTaken,
    penaltyShootoutKicksScored: acc.penaltyShootoutKicksScored,
    penaltiesAwardedScored: acc.penaltiesAwardedScored,
    penaltiesMissed: acc.penaltiesMissed,

    shots: acc.shots,
    shotsPerMatch: round1(safeDiv(acc.shots, mp)),
    shotsOnTarget: acc.shotsOnTarget,
    shotsOnTargetPerMatch: round1(safeDiv(acc.shotsOnTarget, acc.shotsOnTargetCount || mp)),
    shotAccuracyPct: round1(safeDiv(acc.shotsOnTarget * 100, acc.shots)),
    shotConversionPct: round1(safeDiv(acc.goalsFor * 100, acc.shots)),
    shotsConceded: acc.shotsConceded,
    shotsConcededPerMatch: round1(safeDiv(acc.shotsConceded, mp)),
    shotsOnTargetConceded: shotsConcededOnTarget,

    xg: round2(acc.xg),
    xgPerMatch: round2(safeDiv(acc.xg, mp)),
    xgAgainst: round2(acc.xgAgainst),
    xgAgainstPerMatch: round2(safeDiv(acc.xgAgainst, mp)),
    xgDifference: round2(acc.goalsFor - acc.xg),
    netXg: round2(acc.xg - acc.xgAgainst),
    xgot: round2(acc.xgot),
    xgotPerMatch: round2(safeDiv(acc.xgot, acc.xgotCount || richCount || mp)),
    openPlayXg: round2(acc.openPlayXg),
    openPlayXgPerMatch: round2(safeDiv(acc.openPlayXg, acc.openPlayXgCount || richCount || mp)),
    setPieceXg: round2(acc.setPieceXg),
    setPieceXgPerMatch: round2(safeDiv(acc.setPieceXg, acc.setPieceXgCount || richCount || mp)),

    bigChances: acc.bigChances,
    bigChancesPerMatch: round1(safeDiv(acc.bigChances, richCount || mp)),
    bigChancesMissed: acc.bigChancesMissed,
    bigChanceConversionPct: round1(
      safeDiv(Math.max(0, acc.bigChances - acc.bigChancesMissed) * 100, acc.bigChances)
    ),
    touchesInBox: acc.touchesInBox,
    touchesInBoxPerMatch: round1(safeDiv(acc.touchesInBox, richCount || mp)),
    corners: acc.corners,
    cornersPerMatch: round1(safeDiv(acc.corners, acc.cornersCount || mp)),
    offsides: acc.offsides,
    offsidesPerMatch: round1(safeDiv(acc.offsides, richCount || mp)),

    attackingZones: {
      left: round1(safeDiv(acc.zoneLeftSum, acc.zoneCount)),
      central: round1(safeDiv(acc.zoneCentralSum, acc.zoneCount)),
      right: round1(safeDiv(acc.zoneRightSum, acc.zoneCount)),
    },
    buildMethods: {
      patient: round1(safeDiv(acc.buildPatientSum, acc.buildCount)),
      throughBall: round1(safeDiv(acc.buildThroughSum, acc.buildCount)),
      crossSetPiece: round1(safeDiv(acc.buildCrossSetSum, acc.buildCount)),
      counter: round1(safeDiv(acc.buildCounterSum, acc.buildCount)),
    },

    avgPossession: round1(safeDiv(acc.possessionSum, acc.possessionCount)),
    passesAttempted: acc.passesAttempted,
    passesCompleted: acc.passesCompleted,
    passesAttemptedPerMatch: round1(safeDiv(acc.passesAttempted, acc.passingCount || mp)),
    passesCompletedPerMatch: round1(safeDiv(acc.passesCompleted, acc.passingCount || mp)),
    passAccuracyPct: round1(safeDiv(acc.passesCompleted * 100, acc.passesAttempted)),

    tacklesWon: acc.tacklesWon,
    tacklesTotal: acc.tacklesTotal,
    tackleSuccessPct: round1(safeDiv(acc.tacklesWon * 100, acc.tacklesTotal)),
    tacklesPerMatch: round1(safeDiv(acc.tacklesTotal, acc.defenceTelemetryCount || mp)),
    duelsWon: acc.duelsWon,
    duelsTotal: acc.duelsTotal,
    duelWinPct: round1(safeDiv(acc.duelsWon * 100, acc.duelsTotal)),
    interceptions: acc.interceptions,
    interceptionsPerMatch: round1(safeDiv(acc.interceptions, acc.defenceTelemetryCount || mp)),
    clearances: acc.clearances,
    clearancesPerMatch: round1(safeDiv(acc.clearances, acc.defenceTelemetryCount || mp)),
    saves: acc.saves,
    savesPerMatch: round1(safeDiv(acc.saves, acc.defenceTelemetryCount || mp)),
    savePct: round1(safeDiv(acc.saves * 100, shotsConcededOnTarget > 0 ? shotsConcededOnTarget : savesPlusGa)),

    runningDistanceKm: round1(acc.runningDistanceKm),
    avgRunningDistanceKm: round1(safeDiv(acc.runningDistanceKm, acc.physicalCount || mp)),
    sprintingDistanceKm: round1(acc.sprintingDistanceKm),
    avgSprintingDistanceKm: round1(safeDiv(acc.sprintingDistanceKm, acc.physicalCount || mp)),
    sprints: acc.sprints,
    avgSprintsPerMatch: round1(safeDiv(acc.sprints, acc.physicalCount || mp)),

    fouls: acc.fouls,
    foulsPerMatch: round1(safeDiv(acc.fouls, acc.foulsCount || mp)),
    yellowCards: acc.yellowCards,
    yellowCardsPerMatch: round1(safeDiv(acc.yellowCards, mp)),
    redCards: acc.redCards,
    substitutionsUsed: acc.substitutionsUsed,
    injuriesSuffered: acc.injuriesSuffered,
    motmAwards: acc.motmAwards,
    avgMatchRating: round2(safeDiv(acc.ratingSum, acc.ratingCount)),

    tournamentsEntered: acc.tournamentsEntered,
    tournamentTitlesWon: acc.tournamentTitlesWon,
    tournamentRunnerUps: acc.tournamentRunnerUps,
    tournamentThirdPlaces: acc.tournamentThirdPlaces,

    telemetryRichMatches: acc.telemetryRichMatches,
    recentForm: acc.recentMatches.slice(-8).reverse(),
    biggestWin: acc.biggestWin,
    heaviestDefeat: acc.heaviestDefeat,
    topScorer,
    topAssister,
  };
}

function toTeamInfo(team: Team): TeamStatsSummaryTeamInfo {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    code: team.code,
    team_type: getTeamType(team),
    country: team.country,
    flag: team.flag,
    league: team.league,
    confederation: team.confederation,
    gender: team.gender,
    crestUrl: team.crestUrl,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
    overallRating: team.overallRating,
    attackRating: team.attackRating,
    midfieldRating: team.midfieldRating,
    defenceRating: team.defenceRating,
    stadium: team.stadium,
    manager: team.manager || team.manager_name || 'Vacant',
    trophiesCount: team.trophiesCount ?? team.trophies?.length ?? 0,
  };
}

function fallbackTeamInfo(id: string, name?: string, code?: string): TeamStatsSummaryTeamInfo {
  return {
    id,
    name: name || id,
    shortName: name || code || id,
    code: code || id.slice(0, 3).toUpperCase(),
    team_type: 'club',
    country: 'Unknown',
    gender: 'men',
    crestUrl: '',
    primaryColor: '#0E2439',
    secondaryColor: '#38BDF8',
    overallRating: 75,
    attackRating: 75,
    midfieldRating: 75,
    defenceRating: 75,
    stadium: 'Neutral Ground',
    manager: 'Vacant',
    trophiesCount: 0,
  };
}

function extractSimMatchInputs(
  sim: SimulationMatchRecord,
  teamsMap: Map<string, Team>
): { home: NormalizedSideMatchInput; away: NormalizedSideMatchInput } {
  const full = sim.fullPayload as CompleteSimulationOutput | undefined;
  const homeTeam = teamsMap.get(sim.homeTeamId);
  const awayTeam = teamsMap.get(sim.awayTeamId);
  const homeStats = full?.homeStats || null;
  const awayStats = full?.awayStats || null;

  const events = Array.isArray(full?.events) && full.events.length > 0 ? full.events : sim.events || [];

  const countSideEvent = (side: 'home' | 'away') => {
    let yellow = 0;
    let red = 0;
    let subs = 0;
    let injuries = 0;
    let ownGoalsFor = 0;
    let ownGoalsConceded = 0;
    let pensScored = 0;
    let pensMissed = 0;

    for (const ev of events as Array<any>) {
      if (!ev || ev.teamSide !== side) continue;
      if (ev.type === 'yellow') yellow += 1;
      else if (ev.type === 'red' || ev.type === 'second-yellow') red += 1;
      else if (ev.type === 'sub') subs += 1;
      else if (ev.type === 'injury') injuries += 1;
      else if (ev.type === 'goal' && ev.isPenalty) pensScored += 1;
      else if (ev.type === 'penalty-missed') pensMissed += 1;
      else if (ev.type === 'own-goal') ownGoalsFor += 1;
    }

    const oppSide = side === 'home' ? 'away' : 'home';
    for (const ev of events as Array<any>) {
      if (ev && ev.teamSide === oppSide && ev.type === 'own-goal') {
        ownGoalsConceded += 1;
      }
    }

    return { yellow, red, subs, injuries, ownGoalsFor, ownGoalsConceded, pensScored, pensMissed };
  };

  const hCounts = countSideEvent('home');
  const aCounts = countSideEvent('away');

  const penParsed = full?.penaltyShootout
    ? {
        home: full.penaltyShootout.homeScore,
        away: full.penaltyShootout.awayScore,
        winner: full.penaltyShootout.winner,
        kicksHome: full.penaltyShootout.kicks?.filter((k) => k.teamSide === 'home'),
        kicksAway: full.penaltyShootout.kicks?.filter((k) => k.teamSide === 'away'),
      }
    : (() => {
        const p = parsePenaltySummaryText(sim.penaltySummary);
        if (!p) return null;
        return {
          home: p.home,
          away: p.away,
          winner: p.home > p.away ? ('home' as const) : ('away' as const),
          kicksHome: undefined,
          kicksAway: undefined,
        };
      })();

  const extractContribs = (side: 'home' | 'away') => {
    if (full?.playerStats?.length) {
      return full.playerStats
        .filter((ps) => ps.teamSide === side && (ps.minutesPlayed > 0 || ps.goals > 0 || ps.assists > 0))
        .map((ps) => ({
          playerId: ps.playerId,
          playerName: ps.playerName,
          shortName: ps.shortName,
          goals: ps.goals || 0,
          assists: ps.assists || 0,
        }));
    }
    const map = new Map<string, { playerId: string; playerName: string; shortName: string; goals: number; assists: number }>();
    for (const ev of events as Array<any>) {
      if (ev.teamSide === side && ev.type === 'goal') {
        if (ev.playerName) {
          const id = ev.playerId || ev.playerName;
          const prev = map.get(id) || { playerId: id, playerName: ev.playerName, shortName: ev.playerName, goals: 0, assists: 0 };
          prev.goals += 1;
          map.set(id, prev);
        }
        if (ev.assistPlayerName) {
          const aid = ev.assistPlayerId || ev.assistPlayerName;
          const prevA = map.get(aid) || { playerId: aid, playerName: ev.assistPlayerName, shortName: ev.assistPlayerName, goals: 0, assists: 0 };
          prevA.assists += 1;
          map.set(aid, prevA);
        }
      }
    }
    return Array.from(map.values());
  };

  const avgRatingFor = (side: 'home' | 'away'): number | undefined => {
    if (!full?.playerStats?.length) return undefined;
    const list = full.playerStats.filter((ps) => ps.teamSide === side && ps.minutesPlayed > 0 && ps.rating > 0);
    if (!list.length) return undefined;
    return list.reduce((s, x) => s + x.rating, 0) / list.length;
  };

  const motmSide = full?.motmPlayerId
    ? full.playerStats?.find((ps) => ps.playerId === full.motmPlayerId)?.teamSide
    : undefined;

  const neutralVenue = Boolean(full?.competition?.neutralVenue);
  const date = sim.date || new Date().toISOString().slice(0, 10);

  const home: NormalizedSideMatchInput = {
    matchId: sim.id,
    source: 'simulate',
    competitionId: sim.competitionId,
    competitionName: sim.competitionName,
    stageLabel: full?.competition?.stageLabel,
    date,
    sortTimestamp: date,
    side: 'home',
    neutralVenue,
    opponent: {
      id: sim.awayTeamId,
      name: awayTeam?.name || sim.awayTeamName,
      code: awayTeam?.code || sim.awayCode,
      crestUrl: awayTeam?.crestUrl,
    },
    goalsFor: sim.homeScore,
    goalsAgainst: sim.awayScore,
    halfTimeGoalsFor: full?.halfTimeHomeScore ?? sim.halfTimeHomeScore,
    halfTimeGoalsAgainst: full?.halfTimeAwayScore ?? sim.halfTimeAwayScore,
    wentToExtraTime: Boolean(full?.wentToExtraTime ?? sim.wentToExtraTime),
    extraTimeGoalsFor: full?.extraTimeHomeScore ?? undefined,
    extraTimeGoalsAgainst: full?.extraTimeAwayScore ?? undefined,
    penaltySummary: sim.penaltySummary,
    penaltyShootout: penParsed
      ? {
          goalsFor: penParsed.home,
          goalsAgainst: penParsed.away,
          won: penParsed.winner === 'home',
          kicksTaken: penParsed.kicksHome?.length,
          kicksScored: penParsed.kicksHome?.filter((k) => k.outcome === 'scored').length,
        }
      : null,
    possession: homeStats?.possession ?? sim.possessionHome,
    shots: homeStats?.shots ?? sim.shotsHome,
    shotsOnTarget: homeStats?.shotsOnTarget,
    shotsConceded: awayStats?.shots ?? sim.shotsAway,
    shotsOnTargetConceded: awayStats?.shotsOnTarget,
    xg: homeStats?.xg ?? sim.xgHome,
    xgAgainst: awayStats?.xg ?? sim.xgAway,
    corners: homeStats?.corners,
    fouls: homeStats?.fouls,
    teamStats: homeStats,
    oppStats: awayStats,
    ownGoalsFor: hCounts.ownGoalsFor,
    ownGoalsConceded: hCounts.ownGoalsConceded,
    penaltiesAwardedScored: hCounts.pensScored,
    penaltiesMissed: hCounts.pensMissed,
    yellowCards: hCounts.yellow,
    redCards: hCounts.red,
    substitutionsUsed: hCounts.subs,
    injuriesSuffered: hCounts.injuries,
    motmWon: motmSide === 'home',
    avgPlayerRating: avgRatingFor('home'),
    contributors: extractContribs('home'),
  };

  const away: NormalizedSideMatchInput = {
    matchId: sim.id,
    source: 'simulate',
    competitionId: sim.competitionId,
    competitionName: sim.competitionName,
    stageLabel: full?.competition?.stageLabel,
    date,
    sortTimestamp: date,
    side: 'away',
    neutralVenue,
    opponent: {
      id: sim.homeTeamId,
      name: homeTeam?.name || sim.homeTeamName,
      code: homeTeam?.code || sim.homeCode,
      crestUrl: homeTeam?.crestUrl,
    },
    goalsFor: sim.awayScore,
    goalsAgainst: sim.homeScore,
    halfTimeGoalsFor: full?.halfTimeAwayScore ?? sim.halfTimeAwayScore,
    halfTimeGoalsAgainst: full?.halfTimeHomeScore ?? sim.halfTimeHomeScore,
    wentToExtraTime: Boolean(full?.wentToExtraTime ?? sim.wentToExtraTime),
    extraTimeGoalsFor: full?.extraTimeAwayScore ?? undefined,
    extraTimeGoalsAgainst: full?.extraTimeHomeScore ?? undefined,
    penaltySummary: sim.penaltySummary,
    penaltyShootout: penParsed
      ? {
          goalsFor: penParsed.away,
          goalsAgainst: penParsed.home,
          won: penParsed.winner === 'away',
          kicksTaken: penParsed.kicksAway?.length,
          kicksScored: penParsed.kicksAway?.filter((k) => k.outcome === 'scored').length,
        }
      : null,
    possession: awayStats?.possession ?? 100 - sim.possessionHome,
    shots: awayStats?.shots ?? sim.shotsAway,
    shotsOnTarget: awayStats?.shotsOnTarget,
    shotsConceded: homeStats?.shots ?? sim.shotsHome,
    shotsOnTargetConceded: homeStats?.shotsOnTarget,
    xg: awayStats?.xg ?? sim.xgAway,
    xgAgainst: homeStats?.xg ?? sim.xgHome,
    corners: awayStats?.corners,
    fouls: awayStats?.fouls,
    teamStats: awayStats,
    oppStats: homeStats,
    ownGoalsFor: aCounts.ownGoalsFor,
    ownGoalsConceded: aCounts.ownGoalsConceded,
    penaltiesAwardedScored: aCounts.pensScored,
    penaltiesMissed: aCounts.pensMissed,
    yellowCards: aCounts.yellow,
    redCards: aCounts.red,
    substitutionsUsed: aCounts.subs,
    injuriesSuffered: aCounts.injuries,
    motmWon: motmSide === 'away',
    avgPlayerRating: avgRatingFor('away'),
    contributors: extractContribs('away'),
  };

  return { home, away };
}

function extractTournamentFixtureInputs(
  tournament: CompetitionMakerTournament,
  fixture: CompetitionFixtureMatch,
  teamsMap: Map<string, Team>,
  fullOut: CompleteSimulationOutput | null
): { home: NormalizedSideMatchInput; away: NormalizedSideMatchInput } | null {
  if (!fixture.homeTeamId || !fixture.awayTeamId) return null;
  const homeTeam = teamsMap.get(fixture.homeTeamId);
  const awayTeam = teamsMap.get(fixture.awayTeamId);
  const homeSnap = tournament.teamSnapshots?.[fixture.homeTeamId];
  const awaySnap = tournament.teamSnapshots?.[fixture.awayTeamId];

  const homeStats = fullOut?.homeStats || null;
  const awayStats = fullOut?.awayStats || null;
  const events = fixture.timelineEvents || fullOut?.events || [];

  const countSideEvent = (side: 'home' | 'away') => {
    let yellow = 0;
    let red = 0;
    let subs = 0;
    let injuries = 0;
    let ownGoalsFor = 0;
    let ownGoalsConceded = 0;
    let pensScored = 0;
    let pensMissed = 0;

    for (const ev of events) {
      if (!ev || ev.teamSide !== side) continue;
      if (ev.type === 'yellow') yellow += 1;
      else if (ev.type === 'red' || ev.type === 'second-yellow') red += 1;
      else if (ev.type === 'sub') subs += 1;
      else if (ev.type === 'injury') injuries += 1;
      else if (ev.type === 'goal' && ev.isPenalty) pensScored += 1;
      else if (ev.type === 'penalty-missed') pensMissed += 1;
      else if (ev.type === 'own-goal') ownGoalsFor += 1;
    }

    const oppSide = side === 'home' ? 'away' : 'home';
    for (const ev of events) {
      if (ev && ev.teamSide === oppSide && ev.type === 'own-goal') {
        ownGoalsConceded += 1;
      }
    }

    return { yellow, red, subs, injuries, ownGoalsFor, ownGoalsConceded, pensScored, pensMissed };
  };

  const hCounts = countSideEvent('home');
  const aCounts = countSideEvent('away');

  const penSource = fixture.penaltyShootout || fullOut?.penaltyShootout || null;
  const perfs = fixture.playerPerformances || [];

  const buildPerfsSummary = (teamId: string, side: 'home' | 'away') => {
    const teamPerfs = perfs.filter((p) => p.teamId === teamId);
    if (teamPerfs.length > 0) {
      const rated = teamPerfs.filter((p) => p.minutesPlayed > 0 && p.rating > 0);
      return {
        motmWon: teamPerfs.some((p) => Boolean(p.isMotm)),
        avgRating: rated.length
          ? rated.reduce((s, p) => s + p.rating, 0) / rated.length
          : undefined,
        saves: teamPerfs.reduce((s, p) => s + (p.saves || 0), 0),
        contributors: teamPerfs
          .filter((p) => p.minutesPlayed > 0 || p.goals > 0 || p.assists > 0)
          .map((p) => ({
            playerId: p.playerId,
            playerName: p.playerName,
            shortName: p.shortName,
            goals: p.goals || 0,
            assists: p.assists || 0,
          })),
      };
    }

    const simPerfs = fullOut?.playerStats?.filter((ps) => ps.teamSide === side) || [];
    const rated = simPerfs.filter((p) => p.minutesPlayed > 0 && p.rating > 0);
    return {
      motmWon: Boolean(
        fullOut?.motmPlayerId && simPerfs.some((p) => p.playerId === fullOut.motmPlayerId)
      ),
      avgRating: rated.length ? rated.reduce((s, p) => s + p.rating, 0) / rated.length : undefined,
      saves: simPerfs.reduce((s, p) => s + (p.saves || 0), 0),
      contributors: simPerfs
        .filter((p) => p.minutesPlayed > 0 || p.goals > 0 || p.assists > 0)
        .map((p) => ({
          playerId: p.playerId,
          playerName: p.playerName,
          shortName: p.shortName,
          goals: p.goals || 0,
          assists: p.assists || 0,
        })),
    };
  };

  const homePerf = buildPerfsSummary(fixture.homeTeamId, 'home');
  const awayPerf = buildPerfsSummary(fixture.awayTeamId, 'away');

  const settledDate = (fixture.settledAt || tournament.updatedAt || new Date().toISOString()).slice(0, 10);
  const sortTimestamp = fixture.settledAt || tournament.updatedAt || settledDate;
  const stageLabel = `${fixture.stageName} · ${fixture.roundLabel}`;

  const homeScore = fixture.homeScore ?? fullOut?.homeScore ?? 0;
  const awayScore = fixture.awayScore ?? fullOut?.awayScore ?? 0;

  const home: NormalizedSideMatchInput = {
    matchId: fixture.id,
    source: 'tournament',
    competitionId: tournament.id,
    competitionName: tournament.name,
    stageLabel,
    date: settledDate,
    sortTimestamp,
    side: 'home',
    neutralVenue: fixture.neutralVenue,
    opponent: {
      id: fixture.awayTeamId,
      name: awayTeam?.name || awaySnap?.name || fixture.awayTeamId,
      code: awayTeam?.code || awaySnap?.code || fixture.awayTeamId.slice(0, 3).toUpperCase(),
      crestUrl: awayTeam?.crestUrl || awaySnap?.crestUrl,
    },
    goalsFor: homeScore,
    goalsAgainst: awayScore,
    halfTimeGoalsFor: fixture.halfTimeHomeScore ?? fullOut?.halfTimeHomeScore,
    halfTimeGoalsAgainst: fixture.halfTimeAwayScore ?? fullOut?.halfTimeAwayScore,
    wentToExtraTime: Boolean(fixture.wentToExtraTime ?? fullOut?.wentToExtraTime),
    extraTimeGoalsFor: fixture.extraTimeHomeScore ?? fullOut?.extraTimeHomeScore ?? undefined,
    extraTimeGoalsAgainst: fixture.extraTimeAwayScore ?? fullOut?.extraTimeAwayScore ?? undefined,
    penaltySummary: fixture.penaltyShootout?.summary,
    penaltyShootout: penSource
      ? {
          goalsFor: penSource.homeScore,
          goalsAgainst: penSource.awayScore,
          won: penSource.winner === 'home',
          kicksTaken: penSource.kicks?.filter((k) => k.teamSide === 'home').length,
          kicksScored: penSource.kicks?.filter((k) => k.teamSide === 'home' && k.outcome === 'scored')
            .length,
        }
      : null,
    possession: fixture.possessionHome ?? homeStats?.possession,
    shots: fixture.shotsHome ?? homeStats?.shots,
    shotsOnTarget: fixture.shotsOnTargetHome ?? homeStats?.shotsOnTarget,
    shotsConceded: fixture.shotsAway ?? awayStats?.shots,
    shotsOnTargetConceded: fixture.shotsOnTargetAway ?? awayStats?.shotsOnTarget,
    xg: fixture.xgHome ?? homeStats?.xg,
    xgAgainst: fixture.xgAway ?? awayStats?.xg,
    corners: fixture.cornersHome ?? homeStats?.corners,
    fouls: fixture.foulsHome ?? homeStats?.fouls,
    teamStats: homeStats,
    oppStats: awayStats,
    ownGoalsFor: hCounts.ownGoalsFor,
    ownGoalsConceded: hCounts.ownGoalsConceded,
    penaltiesAwardedScored: hCounts.pensScored,
    penaltiesMissed: hCounts.pensMissed,
    yellowCards: hCounts.yellow,
    redCards: hCounts.red,
    substitutionsUsed: hCounts.subs,
    injuriesSuffered: hCounts.injuries,
    motmWon: homePerf.motmWon,
    avgPlayerRating: homePerf.avgRating,
    savesFallback: homePerf.saves,
    contributors: homePerf.contributors,
  };

  const away: NormalizedSideMatchInput = {
    matchId: fixture.id,
    source: 'tournament',
    competitionId: tournament.id,
    competitionName: tournament.name,
    stageLabel,
    date: settledDate,
    sortTimestamp,
    side: 'away',
    neutralVenue: fixture.neutralVenue,
    opponent: {
      id: fixture.homeTeamId,
      name: homeTeam?.name || homeSnap?.name || fixture.homeTeamId,
      code: homeTeam?.code || homeSnap?.code || fixture.homeTeamId.slice(0, 3).toUpperCase(),
      crestUrl: homeTeam?.crestUrl || homeSnap?.crestUrl,
    },
    goalsFor: awayScore,
    goalsAgainst: homeScore,
    halfTimeGoalsFor: fixture.halfTimeAwayScore ?? fullOut?.halfTimeAwayScore,
    halfTimeGoalsAgainst: fixture.halfTimeHomeScore ?? fullOut?.halfTimeHomeScore,
    wentToExtraTime: Boolean(fixture.wentToExtraTime ?? fullOut?.wentToExtraTime),
    extraTimeGoalsFor: fixture.extraTimeAwayScore ?? fullOut?.extraTimeAwayScore ?? undefined,
    extraTimeGoalsAgainst: fixture.extraTimeHomeScore ?? fullOut?.extraTimeHomeScore ?? undefined,
    penaltySummary: fixture.penaltyShootout?.summary,
    penaltyShootout: penSource
      ? {
          goalsFor: penSource.awayScore,
          goalsAgainst: penSource.homeScore,
          won: penSource.winner === 'away',
          kicksTaken: penSource.kicks?.filter((k) => k.teamSide === 'away').length,
          kicksScored: penSource.kicks?.filter((k) => k.teamSide === 'away' && k.outcome === 'scored')
            .length,
        }
      : null,
    possession: fixture.possessionAway ?? awayStats?.possession,
    shots: fixture.shotsAway ?? awayStats?.shots,
    shotsOnTarget: fixture.shotsOnTargetAway ?? awayStats?.shotsOnTarget,
    shotsConceded: fixture.shotsHome ?? homeStats?.shots,
    shotsOnTargetConceded: fixture.shotsOnTargetHome ?? homeStats?.shotsOnTarget,
    xg: fixture.xgAway ?? awayStats?.xg,
    xgAgainst: fixture.xgHome ?? homeStats?.xg,
    corners: fixture.cornersAway ?? awayStats?.corners,
    fouls: fixture.foulsAway ?? awayStats?.fouls,
    teamStats: awayStats,
    oppStats: homeStats,
    ownGoalsFor: aCounts.ownGoalsFor,
    ownGoalsConceded: aCounts.ownGoalsConceded,
    penaltiesAwardedScored: aCounts.pensScored,
    penaltiesMissed: aCounts.pensMissed,
    yellowCards: aCounts.yellow,
    redCards: aCounts.red,
    substitutionsUsed: aCounts.subs,
    injuriesSuffered: aCounts.injuries,
    motmWon: awayPerf.motmWon,
    avgPlayerRating: awayPerf.avgRating,
    savesFallback: awayPerf.saves,
    contributors: awayPerf.contributors,
  };

  return { home, away };
}

function resolveStageReached(tournament: CompetitionMakerTournament, teamId: string): {
  placement: TeamTournamentParticipation['placement'];
  stageReached: string;
} {
  if (tournament.champion?.teamId === teamId) {
    return { placement: 'champion', stageReached: 'Champions' };
  }
  if (tournament.champion?.runnerUpTeamId === teamId) {
    return { placement: 'runner-up', stageReached: 'Final (Runner-up)' };
  }
  if (tournament.champion?.thirdPlaceTeamId === teamId) {
    return { placement: 'third-place', stageReached: '3rd Place' };
  }

  let latestStage = tournament.stages[0]?.config.name || 'Participant';
  let wasEliminated = false;
  for (const stage of tournament.stages) {
    if (
      stage.participantIds.includes(teamId) ||
      stage.qualifiedIds.includes(teamId) ||
      stage.eliminatedIds.includes(teamId) ||
      stage.fixtures.some((f) => f.homeTeamId === teamId || f.awayTeamId === teamId)
    ) {
      latestStage = stage.config.name;
      if (stage.eliminatedIds.includes(teamId)) {
        wasEliminated = true;
      }
    }
  }

  if (tournament.status === 'setup') {
    return { placement: 'setup', stageReached: latestStage };
  }
  if (wasEliminated || tournament.status === 'completed') {
    return { placement: 'eliminated', stageReached: latestStage };
  }
  return { placement: 'active', stageReached: latestStage };
}

export function computeTeamStatistics(options: TeamStatsBuildOptions): TeamStatisticsResponse {
  const {
    teams,
    simulationMatches = [],
    competitionMakers = [],
    competitions = [],
    managersByTeam,
    rebuiltOutputResolver = rebuildMatchFullOutput,
  } = options;

  const teamsMap = new Map<string, Team>(teams.map((t) => [t.id, t]));
  const simById = new Map<string, SimulationMatchRecord>(
    simulationMatches.map((m) => [m.id, m])
  );

  interface TeamBuckets {
    info: TeamStatsSummaryTeamInfo;
    combined: MetricsAccumulator;
    simulate: MetricsAccumulator;
    tournaments: MetricsAccumulator;
    simulatedMatchCount: number;
    tournamentMatchCount: number;
    linkedImportedCount: number;
    tournamentsMap: Map<string, TeamTournamentParticipation & { possSum: number; possCount: number }>;
  }

  const bucketsByTeamId = new Map<string, TeamBuckets>();

  const ensureBucket = (teamId: string, fallbackName?: string, fallbackCode?: string): TeamBuckets => {
    const existing = bucketsByTeamId.get(teamId);
    if (existing) return existing;
    const team = teamsMap.get(teamId);
    const created: TeamBuckets = {
      info: team ? toTeamInfo(team) : fallbackTeamInfo(teamId, fallbackName, fallbackCode),
      combined: createAccumulator(),
      simulate: createAccumulator(),
      tournaments: createAccumulator(),
      simulatedMatchCount: 0,
      tournamentMatchCount: 0,
      linkedImportedCount: 0,
      tournamentsMap: new Map(),
    };
    bucketsByTeamId.set(teamId, created);
    return created;
  };

  for (const t of teams) {
    ensureBucket(t.id);
  }

  const seenSimIds = new Set<string>();
  const seenTournamentFixtureKeys = new Set<string>();

  let totalSimulatedMatches = 0;
  let totalGoalsSimulate = 0;
  let totalCleanSheetsSimulate = 0;

  let totalCombinedMatches = 0;
  let totalGoalsCombined = 0;
  let totalCleanSheetsCombined = 0;

  // 1. Process Simulate a Match records (oldest to newest for chronological recentForm, or sort after)
  const completedSimMatches = simulationMatches.filter((m) => m.status === 'completed');
  // Sort chronological ascending so .slice(-8).reverse() yields newest first
  const orderedSimMatches = [...completedSimMatches].sort((a, b) =>
    (a.date || '').localeCompare(b.date || '')
  );

  for (const sim of orderedSimMatches) {
    seenSimIds.add(sim.id);
    if (sim.competitionFixtureId && sim.competitionId) {
      seenTournamentFixtureKeys.add(`${sim.competitionId}:${sim.competitionFixtureId}`);
    }

    const { home, away } = extractSimMatchInputs(sim, teamsMap);
    const homeBucket = ensureBucket(sim.homeTeamId, sim.homeTeamName, sim.homeCode);
    const awayBucket = ensureBucket(sim.awayTeamId, sim.awayTeamName, sim.awayCode);

    pushMatchToAccumulator(homeBucket.simulate, home);
    pushMatchToAccumulator(awayBucket.simulate, away);
    pushMatchToAccumulator(homeBucket.combined, home);
    pushMatchToAccumulator(awayBucket.combined, away);

    homeBucket.simulatedMatchCount += 1;
    awayBucket.simulatedMatchCount += 1;

    totalSimulatedMatches += 1;
    totalGoalsSimulate += sim.homeScore + sim.awayScore;
    if (sim.awayScore === 0) totalCleanSheetsSimulate += 1;
    if (sim.homeScore === 0) totalCleanSheetsSimulate += 1;

    totalCombinedMatches += 1;
    totalGoalsCombined += sim.homeScore + sim.awayScore;
    if (sim.awayScore === 0) totalCleanSheetsCombined += 1;
    if (sim.homeScore === 0) totalCleanSheetsCombined += 1;
  }

  // 2. Process Tournament Maker tournaments & fixtures
  let totalTournamentMatches = 0;
  let totalGoalsTournaments = 0;
  let totalCleanSheetsTournaments = 0;
  let linkedImportedMatches = 0;

  for (const tournament of competitionMakers) {
    const ensureParticipation = (teamId: string) => {
      const snap = tournament.teamSnapshots?.[teamId];
      const bucket = ensureBucket(teamId, snap?.name, snap?.code);
      let entry = bucket.tournamentsMap.get(tournament.id);
      if (!entry) {
        const { placement, stageReached } = resolveStageReached(tournament, teamId);
        entry = {
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          shortName: tournament.shortName,
          season: tournament.season,
          presetId: tournament.presetId,
          status: tournament.status,
          placement,
          stageReached,
          matchesPlayed: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          cleanSheets: 0,
          avgPossession: 0,
          xgFor: 0,
          xgAgainst: 0,
          trophyName: placement === 'champion' ? tournament.trophy?.name : undefined,
          possSum: 0,
          possCount: 0,
        };
        bucket.tournamentsMap.set(tournament.id, entry);
        bucket.tournaments.tournamentsEntered += 1;
        bucket.combined.tournamentsEntered += 1;
        if (placement === 'champion') {
          bucket.tournaments.tournamentTitlesWon += 1;
          bucket.combined.tournamentTitlesWon += 1;
        } else if (placement === 'runner-up') {
          bucket.tournaments.tournamentRunnerUps += 1;
          bucket.combined.tournamentRunnerUps += 1;
        } else if (placement === 'third-place') {
          bucket.tournaments.tournamentThirdPlaces += 1;
          bucket.combined.tournamentThirdPlaces += 1;
        }
      }
      return { bucket, entry };
    };

    for (const teamId of tournament.teamIds || []) {
      ensureParticipation(teamId);
    }

    const completedFixtures: CompetitionFixtureMatch[] = [];
    for (const stage of tournament.stages || []) {
      for (const fixture of stage.fixtures || []) {
        if (
          fixture.status === 'completed' &&
          !fixture.isBye &&
          fixture.homeTeamId &&
          fixture.awayTeamId
        ) {
          completedFixtures.push(fixture);
        }
      }
    }

    completedFixtures.sort((a, b) =>
      (a.settledAt || tournament.updatedAt || '').localeCompare(
        b.settledAt || tournament.updatedAt || ''
      )
    );

    for (const fixture of completedFixtures) {
      if (!fixture.homeTeamId || !fixture.awayTeamId) continue;

      const linkedSim = fixture.importedMatchId ? simById.get(fixture.importedMatchId) : undefined;
      const isAlreadyInCombined =
        Boolean(fixture.importedMatchId && seenSimIds.has(fixture.importedMatchId)) ||
        seenTournamentFixtureKeys.has(`${tournament.id}:${fixture.id}`);

      let fullOut: CompleteSimulationOutput | null = null;
      if (linkedSim?.fullPayload) {
        fullOut = linkedSim.fullPayload as CompleteSimulationOutput;
      } else {
        fullOut = rebuiltOutputResolver(tournament, fixture, teamsMap, managersByTeam);
      }

      const extracted = extractTournamentFixtureInputs(tournament, fixture, teamsMap, fullOut);
      if (!extracted) continue;

      const { home, away } = extracted;
      const { bucket: homeBucket, entry: homeEntry } = ensureParticipation(fixture.homeTeamId);
      const { bucket: awayBucket, entry: awayEntry } = ensureParticipation(fixture.awayTeamId);

      // Update per-tournament record
      const applyParticipation = (
        entry: TeamTournamentParticipation & { possSum: number; possCount: number },
        side: NormalizedSideMatchInput
      ) => {
        entry.matchesPlayed += 1;
        entry.goalsFor += side.goalsFor;
        entry.goalsAgainst += side.goalsAgainst;
        if (side.goalsFor > side.goalsAgainst) entry.wins += 1;
        else if (side.goalsFor === side.goalsAgainst) entry.draws += 1;
        else entry.losses += 1;
        if (side.goalsAgainst === 0) entry.cleanSheets += 1;
        const p = side.teamStats?.possession ?? side.possession;
        if (typeof p === 'number') {
          entry.possSum += p;
          entry.possCount += 1;
          entry.avgPossession = round1(entry.possSum / entry.possCount);
        }
        entry.xgFor = round2(entry.xgFor + (side.teamStats?.xg ?? side.xg ?? 0));
        entry.xgAgainst = round2(entry.xgAgainst + (side.oppStats?.xg ?? side.xgAgainst ?? 0));
      };

      applyParticipation(homeEntry, home);
      applyParticipation(awayEntry, away);

      // Always record in Tournaments bucket
      pushMatchToAccumulator(homeBucket.tournaments, home);
      pushMatchToAccumulator(awayBucket.tournaments, away);
      homeBucket.tournamentMatchCount += 1;
      awayBucket.tournamentMatchCount += 1;

      totalTournamentMatches += 1;
      totalGoalsTournaments += home.goalsFor + away.goalsFor;
      if (away.goalsFor === 0) totalCleanSheetsTournaments += 1;
      if (home.goalsFor === 0) totalCleanSheetsTournaments += 1;

      if (isAlreadyInCombined) {
        linkedImportedMatches += 1;
        homeBucket.linkedImportedCount += 1;
        awayBucket.linkedImportedCount += 1;
      } else {
        pushMatchToAccumulator(homeBucket.combined, home);
        pushMatchToAccumulator(awayBucket.combined, away);
        totalCombinedMatches += 1;
        totalGoalsCombined += home.goalsFor + away.goalsFor;
        if (away.goalsFor === 0) totalCleanSheetsCombined += 1;
        if (home.goalsFor === 0) totalCleanSheetsCombined += 1;
      }
    }
  }

  // 3. Process legacy competitions settled fixtures (if any not linked to simulationMatches)
  for (const comp of competitions) {
    for (const fix of comp.fixtures || []) {
      if (!fix.settled || !fix.homeTeamId || !fix.awayTeamId) continue;
      if (fix.settledMatchId && seenSimIds.has(fix.settledMatchId)) continue;
      if (seenTournamentFixtureKeys.has(`${comp.id}:${fix.id}`)) continue;

      const homeScore = Number(fix.homeScore ?? 0);
      const awayScore = Number(fix.awayScore ?? 0);
      const homeTeam = teamsMap.get(fix.homeTeamId);
      const awayTeam = teamsMap.get(fix.awayTeamId);
      const date = (fix.settledAt || comp.updatedAt || new Date().toISOString()).slice(0, 10);
      const pen = parsePenaltySummaryText(fix.penaltySummary);

      const base = (
        side: 'home' | 'away',
        gf: number,
        ga: number,
        opp: Team | undefined,
        oppId: string
      ): NormalizedSideMatchInput => ({
        matchId: fix.id,
        source: 'tournament',
        competitionId: comp.id,
        competitionName: comp.name,
        stageLabel: fix.round,
        date,
        sortTimestamp: fix.settledAt || date,
        side,
        neutralVenue: false,
        opponent: {
          id: oppId,
          name: opp?.name || oppId,
          code: opp?.code || oppId.slice(0, 3).toUpperCase(),
          crestUrl: opp?.crestUrl,
        },
        goalsFor: gf,
        goalsAgainst: ga,
        wentToExtraTime: false,
        penaltySummary: fix.penaltySummary,
        penaltyShootout: pen
          ? {
              goalsFor: side === 'home' ? pen.home : pen.away,
              goalsAgainst: side === 'home' ? pen.away : pen.home,
              won: side === 'home' ? pen.home > pen.away : pen.away > pen.home,
            }
          : null,
        ownGoalsFor: 0,
        ownGoalsConceded: 0,
        penaltiesAwardedScored: 0,
        penaltiesMissed: 0,
        yellowCards: 0,
        redCards: 0,
        substitutionsUsed: 0,
        injuriesSuffered: 0,
        motmWon: false,
        contributors: [],
      });

      const homeBucket = ensureBucket(fix.homeTeamId);
      const awayBucket = ensureBucket(fix.awayTeamId);
      const hIn = base('home', homeScore, awayScore, awayTeam, fix.awayTeamId);
      const aIn = base('away', awayScore, homeScore, homeTeam, fix.homeTeamId);

      pushMatchToAccumulator(homeBucket.tournaments, hIn);
      pushMatchToAccumulator(awayBucket.tournaments, aIn);
      pushMatchToAccumulator(homeBucket.combined, hIn);
      pushMatchToAccumulator(awayBucket.combined, aIn);

      homeBucket.tournamentMatchCount += 1;
      awayBucket.tournamentMatchCount += 1;
      totalTournamentMatches += 1;
      totalCombinedMatches += 1;
      totalGoalsTournaments += homeScore + awayScore;
      totalGoalsCombined += homeScore + awayScore;
      if (awayScore === 0) {
        totalCleanSheetsTournaments += 1;
        totalCleanSheetsCombined += 1;
      }
      if (homeScore === 0) {
        totalCleanSheetsTournaments += 1;
        totalCleanSheetsCombined += 1;
      }
    }
  }

  const teamStatsList: TeamAggregateStatistics[] = Array.from(bucketsByTeamId.values()).map((b) => ({
    team: b.info,
    simulatedMatchCount: b.simulatedMatchCount,
    tournamentMatchCount: b.tournamentMatchCount,
    linkedImportedCount: b.linkedImportedCount,
    combined: finalizeMetrics(b.combined),
    simulate: finalizeMetrics(b.simulate),
    tournaments: finalizeMetrics(b.tournaments),
    tournamentsList: Array.from(b.tournamentsMap.values()).map(
      ({ possSum: _ps, possCount: _pc, ...rest }) => rest
    ),
  }));

  teamStatsList.sort(
    (a, b) =>
      b.combined.matchesPlayed - a.combined.matchesPlayed ||
      b.combined.points - a.combined.points ||
      b.combined.goalDifference - a.combined.goalDifference ||
      b.team.overallRating - a.team.overallRating ||
      a.team.name.localeCompare(b.team.name)
  );

  const summary: TeamStatisticsGlobalSummary = {
    totalTeamsOnFile: teams.length,
    teamsWithMatches: teamStatsList.filter((t) => t.combined.matchesPlayed > 0).length,
    teamsWithSimulatedMatches: teamStatsList.filter((t) => t.simulate.matchesPlayed > 0).length,
    teamsWithTournamentMatches: teamStatsList.filter((t) => t.tournaments.matchesPlayed > 0).length,
    totalCombinedMatches,
    totalSimulatedMatches,
    totalTournamentMatches,
    linkedImportedMatches,
    totalTournaments: competitionMakers.length,
    completedTournaments: competitionMakers.filter((c) => c.status === 'completed').length,
    totalGoalsCombined,
    totalCleanSheetsCombined,
    avgGoalsPerMatchCombined: round2(safeDiv(totalGoalsCombined, totalCombinedMatches)),
    totalGoalsSimulate,
    totalCleanSheetsSimulate,
    avgGoalsPerMatchSimulate: round2(safeDiv(totalGoalsSimulate, totalSimulatedMatches)),
    totalGoalsTournaments,
    totalCleanSheetsTournaments,
    avgGoalsPerMatchTournaments: round2(safeDiv(totalGoalsTournaments, totalTournamentMatches)),
  };

  return {
    generatedAt: new Date().toISOString(),
    summary,
    teams: teamStatsList,
  };
}
