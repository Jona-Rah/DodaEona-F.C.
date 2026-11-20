import type { CompetitionFixtureMatch, CompetitionMakerTournament } from '../../src/types/competitionMaker';
import type { Manager } from '../../src/types/manager';
import type { Team } from '../../src/types/matchCentre';
import type { CompleteSimulationOutput } from '../../src/types/simulation';
import type { TeamAggregateStatistics, TeamStatisticsResponse } from '../../src/types/teamStats';
import { rebuildMatchFullOutput } from '../../src/utils/competitionEngine';
import { computeTeamStatistics } from '../../src/utils/teamStatisticsEngine';
import type { ServerDatabase } from '../types';
import { ensureManagerCollections } from './managerService';
import { buildLiveRegistryBundle } from './playerRegistryService';

const rebuiltFixtureCache = new Map<string, CompleteSimulationOutput | null>();
const MAX_FIXTURE_CACHE_ENTRIES = 1200;

let lastResponseSignature = '';
let lastCachedResponse: TeamStatisticsResponse | null = null;

function memoizedRebuildMatchFullOutput(
  tournament: CompetitionMakerTournament,
  fixture: CompetitionFixtureMatch,
  teamsMap: Map<string, Team>,
  managersByTeam?: Map<string, Manager | null>
): CompleteSimulationOutput | null {
  const cacheKey = `${tournament.id}|${fixture.id}|${fixture.seed || ''}|${fixture.settledAt || ''}|${tournament.homeAdvantageBoost}`;
  if (rebuiltFixtureCache.has(cacheKey)) {
    return rebuiltFixtureCache.get(cacheKey) || null;
  }

  const rebuilt = rebuildMatchFullOutput(tournament, fixture, teamsMap, managersByTeam);
  if (rebuiltFixtureCache.size >= MAX_FIXTURE_CACHE_ENTRIES) {
    const firstKey = rebuiltFixtureCache.keys().next().value;
    if (firstKey) rebuiltFixtureCache.delete(firstKey);
  }
  rebuiltFixtureCache.set(cacheKey, rebuilt);
  return rebuilt;
}

function buildStateSignature(db: ServerDatabase): string {
  const sims = db.simulationMatches || [];
  const cms = db.competitionMakers || [];
  const comps = db.competitions || [];
  const simSig = `${sims.length}:${sims[0]?.id || ''}:${sims[sims.length - 1]?.id || ''}`;
  const cmSig = cms.map((c) => `${c.id}@${c.updatedAt}:${c.status}`).join(',');
  const compSig = comps.map((c) => `${c.id}:${c.matchesPlayed}:${c.updatedAt}`).join(',');
  const teamSig = `${Object.keys(db.teamOverrides || {}).length}:${(db.customTeams || []).length}:${(db.deletedTeamIds || []).length}`;
  return `${simSig}|${cmSig}|${compSig}|${teamSig}`;
}

export function computeAllTeamStatistics(db: ServerDatabase): TeamStatisticsResponse {
  const signature = buildStateSignature(db);
  if (lastCachedResponse && lastResponseSignature === signature) {
    return lastCachedResponse;
  }

  ensureManagerCollections(db);
  const { projectedTeams } = buildLiveRegistryBundle(db);
  const mgrById = new Map<string, Manager>((db.managers || []).map((m) => [m.id, m]));
  const managersByTeam = new Map<string, Manager | null>();
  for (const appt of db.managerAppointments || []) {
    if (appt.is_current) {
      managersByTeam.set(appt.team_id, mgrById.get(appt.manager_id) || null);
    }
  }

  const response = computeTeamStatistics({
    teams: projectedTeams,
    simulationMatches: db.simulationMatches || [],
    competitionMakers: db.competitionMakers || [],
    competitions: db.competitions || [],
    managersByTeam,
    rebuiltOutputResolver: memoizedRebuildMatchFullOutput,
  });

  lastResponseSignature = signature;
  lastCachedResponse = response;
  return response;
}

export function getTeamStatisticsList(
  db: ServerDatabase,
  filters?: {
    teamType?: 'all' | 'club' | 'country';
    gender?: 'all' | 'men' | 'women';
    search?: string;
    onlyWithMatches?: boolean;
  }
): TeamStatisticsResponse {
  const base = computeAllTeamStatistics(db);
  const teamType = filters?.teamType || 'all';
  const gender = filters?.gender || 'all';
  const search = (filters?.search || '').trim().toLowerCase();
  const onlyWithMatches = Boolean(filters?.onlyWithMatches);

  if (teamType === 'all' && gender === 'all' && !search && !onlyWithMatches) {
    return base;
  }

  const filteredTeams = base.teams.filter((entry) => {
    if (teamType !== 'all' && entry.team.team_type !== teamType) return false;
    if (gender !== 'all' && entry.team.gender !== gender) return false;
    if (onlyWithMatches && entry.combined.matchesPlayed === 0 && entry.tournamentsList.length === 0) {
      return false;
    }
    if (search) {
      const hay = `${entry.team.name} ${entry.team.shortName} ${entry.team.code} ${entry.team.country} ${entry.team.league || ''} ${entry.team.confederation || ''}`.toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });

  return {
    generatedAt: base.generatedAt,
    summary: base.summary,
    teams: filteredTeams,
  };
}

export function getSingleTeamStatistics(
  db: ServerDatabase,
  teamId: string
): TeamAggregateStatistics | null {
  const all = computeAllTeamStatistics(db);
  return all.teams.find((t) => t.team.id === teamId) || null;
}
