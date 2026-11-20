import type { Team } from '../../src/types/matchCentre';
import type { ServerDatabase } from '../types';
import { appendUserActivity, saveDb } from '../store';
import { buildLiveRegistryBundle } from './playerRegistryService';
import { listManagers, managerStatistics } from './managerService';

export interface RankedClubRow {
  rank: number;
  teamId: string;
  name: string;
  shortName: string;
  code: string;
  country: string;
  league: string;
  type: 'club' | 'national';
  gender: 'men' | 'women';
  overallRating: number;
  attackRating: number;
  midfieldRating: number;
  defenceRating: number;
  squadCount: number;
  simMatches: number;
  simWins: number;
  simDraws: number;
  simLosses: number;
  rankingPoints: number;
  pinned: boolean;
  editorialNote?: string;
}

export interface EnrichedManagerRow {
  teamId: string;
  teamName: string;
  league: string;
  managerName: string;
  nationality: string;
  role: string;
  verified: boolean;
  preferredFormation: string;
  playingStyle: string;
  squadOverall: number;
  simMatches: number;
  simWins: number;
  winRatePercent: number;
}

export function computeClubRankings(
  db: ServerDatabase,
  options?: { type?: 'all' | 'club' | 'national'; gender?: 'all' | 'men' | 'women'; search?: string }
): RankedClubRow[] {
  const search = (options?.search || '').trim().toLowerCase();
  const { projectedTeams } = buildLiveRegistryBundle(db);

  const rows: Omit<RankedClubRow, 'rank'>[] = projectedTeams.filter((t) => {
    if (options?.type && options.type !== 'all' && t.type !== options.type) return false;
    if (options?.gender && options.gender !== 'all' && t.gender !== options.gender) return false;
    if (search) {
      const hit =
        t.name.toLowerCase().includes(search) ||
        t.code.toLowerCase().includes(search) ||
        (t.league || '').toLowerCase().includes(search) ||
        t.country.toLowerCase().includes(search);
      if (!hit) return false;
    }
    return true;
  }).map((team: Team) => {
    const teamMatches = db.simulationMatches.filter(
      (m) => m.status === 'completed' && (m.homeTeamId === team.id || m.awayTeamId === team.id)
    );
    let simWins = 0;
    let simDraws = 0;
    let simLosses = 0;
    let goalDiff = 0;

    for (const m of teamMatches) {
      const isHome = m.homeTeamId === team.id;
      const gf = isHome ? m.homeScore : m.awayScore;
      const ga = isHome ? m.awayScore : m.homeScore;
      goalDiff += gf - ga;
      if (gf > ga) simWins += 1;
      else if (gf === ga) simDraws += 1;
      else simLosses += 1;
    }

    const override = db.rankingOverrides[team.id];
    const basePoints = (team.rankingPoints ?? team.overallRating * 20) + simWins * 18 + simDraws * 6 + goalDiff * 2;
    const rankingPoints = basePoints + (override?.bonusPoints || 0);

    const overallRating = team.overallRating;
    const attackRating = team.attackRating;
    const midfieldRating = team.midfieldRating;
    const defenceRating = team.defenceRating;

    return {
      teamId: team.id,
      name: team.name,
      shortName: team.shortName,
      code: team.code,
      country: team.country,
      league: team.league || (team.type === 'national' ? team.confederation || 'International' : 'Independent'),
      type: team.type,
      gender: team.gender,
      overallRating,
      attackRating,
      midfieldRating,
      defenceRating,
      squadCount: team.squad.length,
      simMatches: teamMatches.length,
      simWins,
      simDraws,
      simLosses,
      rankingPoints,
      pinned: Boolean(override?.pinned),
      editorialNote: override?.editorialNote,
    };
  });

  rows.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (b.rankingPoints !== a.rankingPoints) return b.rankingPoints - a.rankingPoints;
    if (b.overallRating !== a.overallRating) return b.overallRating - a.overallRating;
    return a.name.localeCompare(b.name);
  });

  return rows.map((r, idx) => ({ ...r, rank: idx + 1 }));
}

export function enrichManagers(db: ServerDatabase): EnrichedManagerRow[] {
  const { projectedTeams } = buildLiveRegistryBundle(db);
  const teamsById = new Map<string, Team>(projectedTeams.map((t) => [t.id, t]));
  const { managers } = listManagers(db);
  const rows: EnrichedManagerRow[] = [];

  for (const mgr of managers) {
    const stats = managerStatistics(db, mgr.id);
    const activeAppt = mgr.clubAppointment || mgr.nationalAppointment || null;
    const team = activeAppt ? teamsById.get(activeAppt.team_id) : undefined;
    const legacyProfile = team?.managerProfile;

    // Rule: Verified manager records must never be overwritten by unverified team/legacy data
    const useLegacySupplemental = Boolean(
      !mgr.verified && legacyProfile && legacyProfile.verified === true
    );

    const managerName = mgr.verified ? mgr.name : useLegacySupplemental ? legacyProfile?.name || mgr.name : mgr.name;
    const nationality = mgr.verified
      ? mgr.nationality
      : mgr.nationality || legacyProfile?.nationality || team?.country || '';
    const verified = Boolean(mgr.verified);
    const preferredFormation = mgr.verified
      ? mgr.preferred_formation || team?.defaultFormation || '4-3-3'
      : mgr.preferred_formation || team?.defaultFormation || '4-3-3';
    const playingStyle = mgr.verified
      ? mgr.tactical_style || team?.playingStyle || ''
      : mgr.tactical_style || team?.playingStyle || '';

    const simMatches = stats?.careerTotals.matchesPlayed ?? 0;
    const simWins = stats?.careerTotals.wins ?? 0;
    const winRatePercent = simMatches > 0 ? Math.round((simWins / simMatches) * 100) : 0;

    rows.push({
      teamId: team?.id || activeAppt?.team_id || '',
      teamName: team?.name || activeAppt?.team_name || 'Unattached',
      league: team?.league || team?.confederation || team?.country || 'Unattached',
      managerName,
      nationality,
      role: activeAppt?.role || mgr.status,
      verified,
      preferredFormation,
      playingStyle,
      squadOverall: team?.overallRating ?? 0,
      simMatches,
      simWins,
      winRatePercent,
    });
  }

  return rows;
}

export function footballIntelligence(db: ServerDatabase) {
  const { projectedTeams, registry } = buildLiveRegistryBundle(db);
  const rankings = computeClubRankings(db);
  const managers = enrichManagers(db);

  const formationDistribution: Record<string, number> = {};
  for (const t of projectedTeams) {
    const f = t.defaultFormation || '4-3-3';
    formationDistribution[f] = (formationDistribution[f] || 0) + 1;
  }

  const publishedLeaguesCount = db.leagueStatuses.filter((l) => l.stage === 'published').length;
  const completedMatches = db.simulationMatches.filter((m) => m.status === 'completed');
  const avgGoalsPerMatch =
    completedMatches.length > 0
      ? Number(
          (
            completedMatches.reduce((acc, m) => acc + m.homeScore + m.awayScore, 0) / completedMatches.length
          ).toFixed(2)
        )
      : 0;

  return {
    totalClubs: projectedTeams.filter((t) => t.type === 'club').length,
    totalNations: projectedTeams.filter((t) => t.type === 'national').length,
    totalPlayers: registry.identities.size,
    topRankedClub: rankings[0] || null,
    formationDistribution,
    publishedLeaguesCount,
    completedMatchesCount: completedMatches.length,
    avgGoalsPerMatch,
    topManagers: managers.slice(0, 8),
  };
}

export function adminSimulationDatabase(db: ServerDatabase) {
  const { projectedTeams } = buildLiveRegistryBundle(db);
  return {
    summary: {
      totalTeams: projectedTeams.length,
      totalMatches: db.simulationMatches.length,
      totalCompetitions: db.competitions.length,
      publishedCompetitions: db.competitions.filter((c) => c.status === 'published').length,
    },
    matches: db.simulationMatches,
    competitions: db.competitions,
    teamsIndex: projectedTeams.map((t) => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      code: t.code,
      country: t.country,
      league: t.league || t.confederation || 'International',
      type: t.type,
      gender: t.gender,
      overallRating: t.overallRating,
      defaultFormation: t.defaultFormation,
      manager: t.manager,
      squadCount: t.squad.length,
      primaryColor: t.primaryColor,
      secondaryColor: t.secondaryColor,
    })),
  };
}

export function adminUserActivity(
  db: ServerDatabase,
  filters?: { category?: string; userId?: string; search?: string }
) {
  const category = filters?.category || 'all';
  const userId = filters?.userId || 'all';
  const search = (filters?.search || '').trim().toLowerCase();

  const events = db.activityLogs.filter((ev) => {
    if (category !== 'all' && ev.category !== category) return false;
    if (userId !== 'all' && ev.userId !== userId) return false;
    if (search) {
      const hit =
        ev.userName.toLowerCase().includes(search) ||
        ev.userEmail.toLowerCase().includes(search) ||
        ev.action.toLowerCase().includes(search) ||
        ev.target.toLowerCase().includes(search);
      if (!hit) return false;
    }
    return true;
  });

  const countsByCategory = {
    reading: db.activityLogs.filter((e) => e.category === 'reading').length,
    simulation: db.activityLogs.filter((e) => e.category === 'simulation').length,
    quiz: db.activityLogs.filter((e) => e.category === 'quiz').length,
    auth: db.activityLogs.filter((e) => e.category === 'auth').length,
    admin: db.activityLogs.filter((e) => e.category === 'admin').length,
  };

  return {
    totalEvents: db.activityLogs.length,
    countsByCategory,
    events,
  };
}

export function quizSubmit(
  db: ServerDatabase,
  input: {
    userId: string;
    userName: string;
    userEmail: string;
    answers: Array<{ questionId: string; selectedIndex: number }>;
    timeTakenSec: number;
    category?: string;
    isDaily?: boolean;
  }
) {
  let score = 0;
  const breakdown = input.answers.map((ans) => {
    const q = db.quizQuestions.find((item) => item.id === ans.questionId);
    const correct = q ? q.correctIndex === ans.selectedIndex : false;
    if (correct) score += 1;
    return {
      questionId: ans.questionId,
      correct,
      correctIndex: q?.correctIndex ?? -1,
      explanation: q?.explanation || '',
    };
  });

  const submission = {
    id: `qsub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId: input.userId,
    userName: input.userName,
    userEmail: input.userEmail,
    score,
    totalQuestions: input.answers.length,
    timeTakenSec: Math.max(1, Math.round(input.timeTakenSec || 15)),
    category: input.category || 'Mixed',
    isDaily: Boolean(input.isDaily),
    submittedAt: new Date().toISOString(),
  };

  db.quizSubmissions = [submission, ...db.quizSubmissions].slice(0, 300);
  appendUserActivity(db, {
    userId: input.userId,
    userName: input.userName,
    userEmail: input.userEmail,
    category: 'quiz',
    action: input.isDaily ? 'Completed Daily Quiz' : 'Submitted Quiz Run',
    target: `${submission.category} (${score}/${submission.totalQuestions})`,
    details: `Completed in ${submission.timeTakenSec}s`,
  });
  saveDb(db);

  return { submission, breakdown };
}

export function quizLeaderboard(db: ServerDatabase) {
  const bestByUser = new Map<
    string,
    {
      userId: string;
      userName: string;
      userEmail: string;
      bestScore: number;
      attempts: number;
      bestTimeSec: number;
      lastSubmittedAt: string;
    }
  >();

  for (const sub of db.quizSubmissions) {
    const existing = bestByUser.get(sub.userId);
    if (!existing) {
      bestByUser.set(sub.userId, {
        userId: sub.userId,
        userName: sub.userName,
        userEmail: sub.userEmail,
        bestScore: sub.score,
        attempts: 1,
        bestTimeSec: sub.timeTakenSec,
        lastSubmittedAt: sub.submittedAt,
      });
    } else {
      existing.attempts += 1;
      if (
        sub.score > existing.bestScore ||
        (sub.score === existing.bestScore && sub.timeTakenSec < existing.bestTimeSec)
      ) {
        existing.bestScore = sub.score;
        existing.bestTimeSec = sub.timeTakenSec;
      }
      if (sub.submittedAt > existing.lastSubmittedAt) {
        existing.lastSubmittedAt = sub.submittedAt;
      }
    }
  }

  return Array.from(bestByUser.values())
    .sort((a, b) => b.bestScore - a.bestScore || a.bestTimeSec - b.bestTimeSec)
    .map((row, idx) => ({ rank: idx + 1, ...row }));
}
