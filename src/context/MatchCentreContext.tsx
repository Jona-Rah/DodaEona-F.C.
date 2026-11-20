import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Team,
  TeamType,
  TeamTypeCode,
  ConfederationType,
  MatchSelectionState,
  MatchCentreTab,
  TeamsSectionTab,
  TeamFilterState,
  ViewChipType,
  TeamOrdering,
  FreeAgentPlayer,
  Player,
  TacticalProfile,
  ManagerProfile,
  TrophyRecord,
  PlayerIdentity,
  PlayerClubRegistration,
  PlayerNationalRegistration,
  PlayerProfileView,
  calculateAgeFromDob,
  resolvePlayerAge,
  getPlayerDisplayName,
  getTeamType,
} from '../types/matchCentre';
import type {
  Manager,
  ManagerAppointment,
  ManagerStatisticsResponse,
} from '../types/manager';
import type {
  TeamAggregateStatistics,
  TeamStatisticsResponse,
} from '../types/teamStats';
import { computeTeamStatistics } from '../utils/teamStatisticsEngine';
import { makePitchShortName } from '../data/playerNicknames';
import { filterTeamsFast, normalizeDatabaseSearchText } from '../utils/globalDatabaseSearch';
import {
  TEAMS_DATABASE,
  CLUB_TEAMS_DATABASE,
  NATIONAL_TEAMS_DATABASE,
  FREE_AGENTS_DATABASE,
  SEEDED_NATIONAL_REGISTRATIONS,
  calculateDetailedRatings,
  compareTeamsByWorldRanking,
} from '../data/teamsDatabase';
import { buildSeededClubManagers } from '../data/clubManagersDatabase';
import { buildSeededNationalManagers } from '../data/nationalManagersDatabase';
import { getRealFifaRating } from '../data/realFifaRankings';
import { getRealFootballDatabaseRating } from '../data/realFootballDatabaseRankings';
import {
  generateStrictStartingXi,
  selectBestFormationForSquad,
} from '../components/matchCentre/dossier/dossierUtils';
import { fetchBootstrapFull } from '../utils/bootstrapCache';
import {
  buildDefaultClubPenaltyOrderIds,
  reconcilePenaltyOrderIds,
} from '../utils/penaltyOrder';
import { getRealClubLogo } from '../data/realClubLogos';
import {
  createNationalFlagSvgDataUrl,
  getCountryFlag,
  getCountryFlagUrl,
  normalizeCountryName,
} from '../data/countryMetadata';
import {
  buildCanonicalRegistry,
  buildPlayerProfileView,
  CanonicalRegistry,
  changePlayerNation,
  deletePlayerIdentitySafe,
  deriveClubFreeAgents,
  getActiveRegistrationsForTeam,
  getClubRegistrationsForPlayer,
  getNationalRegistrationsForPlayer,
  playerToIdentity,
  projectRegistryOntoTeams,
  registerPlayerToTeam,
  RegistryDeltaState,
  releasePlayerFromTeam,
  retirePlayerFromNation,
  transferPlayerClubOnly,
  unretirePlayerFromNation,
  updateTeamRegistration,
} from '../data/playerRegistry';
import type {
  CompetitionRecord,
  SimulationMatchEvent,
  SimulationMatchRecord,
} from '../../server/types';
import type {
  CompetitionEditionHistoryEntry,
  CompetitionMakerTournament,
  TeamScopeMode,
  TieBreakerKey,
  TournamentGroup,
  TournamentPresetId,
  TournamentStageConfig,
  TrophyDesignConfig,
} from '../types/competitionMaker';
import {
  PRESET_TROPHIES,
  performStageDraw,
  simulateCompetitionFixture,
  simulateCompetitionBatch,
  importSimulationIntoFixture,
  resetCompetitionScope,
} from '../utils/competitionEngine';
import type {
  CompleteSimulationOutput,
  SavedSimulationPayload,
  SimCompetitionPreset,
} from '../types/simulation';
import type { ScoreboardMatchRecord } from '../types/scoreboard';
import { getStoredSessionToken, useAuth } from './AuthContext';
import { buildAuthorizedHeaders } from '../services/firestorePersistence';

const STORAGE_KEYS = {
  CUSTOM_TEAMS: 'dodaeona_custom_teams_v5_tm_shirts',
  TEAM_OVERRIDES: 'dodaeona_team_overrides_v5_tm_shirts',
  DELETED_TEAM_IDS: 'dodaeona_deleted_team_ids_v5_tm_shirts',
  REGISTRY_DELTA: 'dodaeona_registry_delta_v1',
  SELECTION: 'dodaeona_match_selection',
  ORDERING: 'dodaeona_teams_ordering',
  VIEW_CHIP: 'dodaeona_view_chip',
  SAVED_SIMULATIONS: 'dodaeona_saved_simulations_v1',
  SAVED_SCOREBOARDS: 'dodaeona_saved_scoreboards_v1',
  COMPETITION_MAKERS: 'dodaeona_competition_makers_v1',
  COMPETITION_TROPHIES: 'dodaeona_competition_trophies_v1',
};

async function adminApiRequest<T = any>(
  url: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  try {
    const headers = await buildAuthorizedHeaders(
      getStoredSessionToken(),
      body !== undefined ? { 'Content-Type': 'application/json' } : undefined
    );
    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const parsed = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        error: parsed?.error || `Request failed (${res.status}).`,
      };
    }
    return { ok: true, status: res.status, data: parsed as T };
  } catch {
    return { ok: false, status: 0, error: 'Network error communicating with server.' };
  }
}

function recalculateTeamRatings(baseTeam: Team, nextSquad: Player[], explicitOverall?: number) {
  if (typeof explicitOverall === 'number' && explicitOverall > 0) {
    return calculateDetailedRatings(nextSquad, explicitOverall);
  }
  const baseSquad = baseTeam.squad || [];
  if (baseSquad.length === nextSquad.length && baseSquad.every((p, idx) => p.id === nextSquad[idx]?.id && p.overallRating === nextSquad[idx]?.overallRating)) {
    return {
      overallRating: baseTeam.overallRating,
      attackRating: baseTeam.attackRating,
      midfieldRating: baseTeam.midfieldRating,
      defenceRating: baseTeam.defenceRating,
    };
  }
  const prevRaw = baseSquad.length
    ? baseSquad.reduce((s, p) => s + p.overallRating, 0) / baseSquad.length
    : baseTeam.overallRating;
  const nextRaw = nextSquad.length
    ? nextSquad.reduce((s, p) => s + p.overallRating, 0) / nextSquad.length
    : baseTeam.overallRating;
  const delta = nextSquad.length ? nextRaw - prevRaw : 0;
  const targetOvr = Math.max(1, Math.min(99, Math.round(baseTeam.overallRating + delta)));
  return calculateDetailedRatings(nextSquad, targetOvr);
}

function upsertInDeltaArray<T extends { id: string }>(arr: T[] | undefined, item: T): T[] {
  const list = [...(arr || [])];
  const idx = list.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    list[idx] = item;
  } else {
    list.push(item);
  }
  return list;
}

function buildCustomCrestSvgDataUrl(
  code: string,
  primaryColor: string,
  secondaryColor: string,
  flag?: string
): string {
  const cleanCode = (code || 'FC').slice(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'FC';
  const p = /^#[0-9A-Fa-f]{3,8}$/.test(primaryColor) ? primaryColor : '#C5A059';
  const s = /^#[0-9A-Fa-f]{3,8}$/.test(secondaryColor) ? secondaryColor : '#0B1528';
  const subtitle = flag ? `${flag} ${cleanCode}` : cleanCode;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${s}"/><stop offset="100%" stop-color="${p}"/></linearGradient></defs><path d="M60 8 L104 22 V62 C104 88 84 106 60 114 C36 106 16 88 16 62 V22 Z" fill="url(#g)" stroke="${p}" stroke-width="4"/><text x="60" y="68" text-anchor="middle" font-family="Arial,sans-serif" font-weight="400" font-size="24" fill="#FFFFFF">${subtitle}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function isClubLogoAssetUrl(url?: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('transfermarkt') || lower.includes('tmssl.akamaized');
}

interface ToastNotification {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'gold';
}

export interface PendingTournamentMatchLaunch {
  competitionId: string;
  competitionName: string;
  stageLabel: string;
  fixtureId: string;
  homeTeamId: string;
  awayTeamId: string;
  isKnockout: boolean;
  allowExtraTime: boolean;
  allowPenalties: boolean;
  isTwoLegged: boolean;
  legNumber: 1 | 2;
  firstLegHomeGoals?: number;
  firstLegAwayGoals?: number;
  awayGoalsRule: boolean;
  neutralVenue?: boolean;
  homeAdvantageBoost?: number;
  preset: SimCompetitionPreset;
  autoStartLive: boolean;
}

export interface ActionResponse<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}

interface MatchCentreContextType {
  // Database & Registry
  teams: Team[];
  freeAgents: FreeAgentPlayer[];
  registry: CanonicalRegistry;
  simulationMatches: SimulationMatchRecord[];
  scoreboardMatches: ScoreboardMatchRecord[];
  competitions: CompetitionRecord[];
  competitionMakers: CompetitionMakerTournament[];
  competitionTrophies: TrophyDesignConfig[];
  hallOfFame: CompetitionEditionHistoryEntry[];
  refreshCompetitionMakers: () => Promise<void>;
  createCompetitionMaker: (payload: {
    name: string;
    shortName: string;
    season: string;
    description: string;
    customLogoUrl?: string;
    presetId: TournamentPresetId;
    teamScope: TeamScopeMode;
    teamIds: string[];
    tieBreakers: TieBreakerKey[];
    homeAdvantageBoost: number;
    preventSameCountry?: boolean;
    trophy: TrophyDesignConfig;
    stages: TournamentStageConfig[];
  }) => Promise<ActionResponse<CompetitionMakerTournament>>;
  updateCompetitionMaker: (
    id: string,
    patch: Partial<
      Pick<
        CompetitionMakerTournament,
        | 'name'
        | 'shortName'
        | 'season'
        | 'description'
        | 'customLogoUrl'
        | 'tieBreakers'
        | 'homeAdvantageBoost'
        | 'trophy'
      >
    >
  ) => Promise<ActionResponse<CompetitionMakerTournament>>;
  deleteCompetitionMaker: (
    id: string,
    revokeTrophy?: boolean
  ) => Promise<ActionResponse<void>>;
  drawCompetitionStage: (
    id: string,
    params: {
      stageOrder: number;
      mode?: 'seeded' | 'bracket' | 'random' | 'official';
      customGroups?: TournamentGroup[];
      preventSameCountry?: boolean;
    }
  ) => Promise<ActionResponse<CompetitionMakerTournament>>;
  simulateCompetitionAction: (
    id: string,
    params:
      | { fixtureId: string; seed?: string }
      | {
          scope: 'match' | 'matchday' | 'stage' | 'knockout' | 'tournament';
          stageOrder?: number;
          roundIndex?: number;
        }
  ) => Promise<ActionResponse<CompetitionMakerTournament>>;
  importMatchIntoCompetition: (
    id: string,
    params: { fixtureId: string; simulationMatchId: string }
  ) => Promise<ActionResponse<CompetitionMakerTournament>>;
  resetCompetitionAction: (
    id: string,
    params: { scope: 'fixture' | 'stage' | 'tournament'; fixtureId?: string; stageOrder?: number }
  ) => Promise<ActionResponse<CompetitionMakerTournament>>;
  saveCustomTrophyDesign: (
    trophy: Partial<TrophyDesignConfig>
  ) => Promise<ActionResponse<TrophyDesignConfig>>;
  deleteTrophyDesign: (trophyId: string) => Promise<ActionResponse<void>>;
  savedSimulations: SavedSimulationPayload[];
  refreshRegistry: () => Promise<void>;

  // Navigation & Rail
  activeTab: MatchCentreTab;
  setActiveTab: (tab: MatchCentreTab) => void;
  teamsSectionTab: TeamsSectionTab;
  setTeamsSectionTab: (tab: TeamsSectionTab) => void;
  selectedStadiumClubId: string | null;
  openTeamStadium: (teamId: string) => void;
  openLeagueDirectory: (leagueName: string) => void;
  clearSelectedStadiumClubId: () => void;
  pendingSimulationToOpen: CompleteSimulationOutput | null;
  openSimulationReport: (output: CompleteSimulationOutput) => void;
  clearPendingSimulation: () => void;
  pendingTournamentMatch: PendingTournamentMatchLaunch | null;
  launchTournamentMatchInSimulator: (launch: PendingTournamentMatchLaunch) => void;
  clearPendingTournamentMatch: () => void;
  returnToTournamentHub: (competitionId: string) => void;

  // View Chips & Control Bar
  viewChip: ViewChipType;
  setViewChip: (chip: ViewChipType) => void;
  ordering: TeamOrdering;
  setOrdering: (ord: TeamOrdering) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  debouncedSearchQuery: string;
  leagueFilter: string;
  setLeagueFilter: (league: string) => void;
  representedLeagues: Array<{ name: string; count: number }>;
  confederationFilter: 'all' | ConfederationType;
  setConfederationFilter: (confed: 'all' | ConfederationType) => void;
  representedConfederations: Array<{ name: ConfederationType; count: number }>;

  // Dynamic Counts
  counts: {
    total: number;
    clubs: number;
    national: number;
    womens: number;
    freeAgents: number;
    mensClubs: number;
    mensNations: number;
    womensClubs: number;
    womensNations: number;
    activeResults: number;
  };

  // Pagination / Batches (24 per batch)
  visibleTeamsCount: number;
  loadMoreTeams: () => void;
  hasMoreTeams: boolean;
  visibleFreeAgentsCount: number;
  loadMoreFreeAgents: () => void;
  hasMoreFreeAgents: boolean;

  // Filtered Results
  filteredTeams: Team[];
  filteredFreeAgents: FreeAgentPlayer[];

  // Match Selection
  selection: MatchSelectionState;
  selectTeam: (team: Team, target?: 'home' | 'away') => void;
  deselectTeam: (target: 'home' | 'away') => void;
  swapSelections: () => void;
  clearSelections: () => void;

  // Team Dossier Page
  activeDossierTeam: Team | null;
  activeDossierTab: number;
  openDossier: (team: Team, tab?: number) => void;
  openTeamById: (teamId: string, tab?: number) => void;
  closeDossier: () => void;
  setActiveDossierTab: (tab: number) => void;

  // Permanent Managers & ManagerAppointments System (/match-centre/managers)
  managers: Manager[];
  managerAppointments: ManagerAppointment[];
  getManagerById: (managerId: string) => Manager | null;
  getAppointmentsForManager: (managerId: string) => ManagerAppointment[];
  getAppointmentsForTeam: (teamId: string) => ManagerAppointment[];
  getManagerForTeam: (team: Team | null | undefined) => Manager | null;
  openManagerProfile: (managerId: string) => void;
  openManagersDirectory: () => void;
  createManagerRecord: (payload: Record<string, any>) => Promise<ActionResponse<Manager>>;
  updateManagerRecord: (
    managerId: string,
    patch: Record<string, any>
  ) => Promise<ActionResponse<Manager>>;
  assignManagerAction: (params: {
    manager_id: string;
    team_id: string;
    role?: string;
    start_date?: string;
    competitions?: string[];
    honours?: string[];
    notes?: string;
    verified?: boolean;
  }) => Promise<ActionResponse<ManagerAppointment>>;
  endAppointmentByIdAction: (
    appointmentId: string,
    endDate?: string
  ) => Promise<ActionResponse<ManagerAppointment>>;
  addCareerAppointmentAction: (
    managerId: string,
    payload: {
      team_id: string;
      role?: string;
      start_date: string;
      end_date?: string | null;
      is_current?: boolean;
      competitions?: string[];
      honours?: string[];
      notes?: string;
      verified?: boolean;
    }
  ) => Promise<ActionResponse<ManagerAppointment>>;
  fetchManagerStatistics: (managerId: string) => Promise<ManagerStatisticsResponse | null>;
  fetchTeamStatistics: (options?: {
    teamType?: 'all' | 'club' | 'country';
    gender?: 'all' | 'men' | 'women';
    search?: string;
    onlyWithMatches?: boolean;
  }) => Promise<TeamStatisticsResponse>;
  fetchSingleTeamStatistics: (teamId: string) => Promise<TeamAggregateStatistics | null>;

  // Player Profile System (/match-centre/players/:id)
  getPlayerProfile: (playerId: string) => PlayerProfileView | null;
  openPlayerProfile: (playerId: string) => void;
  createPlayerIdentityProfile: (payload: Record<string, any>) => Promise<ActionResponse<PlayerProfileView>>;
  updatePlayerIdentityProfile: (playerId: string, patch: Record<string, any>) => Promise<ActionResponse<PlayerProfileView>>;
  deletePlayerIdentityProfile: (playerId: string) => Promise<ActionResponse<{ deletedId: string }>>;
  registerPlayerToTeamAction: (
    playerId: string,
    teamId: string,
    opts?: { shirtNumber?: number | null; isCaptain?: boolean; isViceCaptain?: boolean }
  ) => Promise<ActionResponse<PlayerProfileView>>;
  updateRegistrationAction: (
    regId: string,
    teamType: TeamTypeCode,
    patch: {
      shirtNumber?: number | null;
      isCaptain?: boolean;
      isViceCaptain?: boolean;
      status?: 'active' | 'former' | 'called_up' | 'standby';
      appearances?: number;
      goals?: number;
      assists?: number;
    }
  ) => Promise<ActionResponse<PlayerProfileView>>;
  releaseRegistrationAction: (
    regId: string,
    teamType: TeamTypeCode
  ) => Promise<ActionResponse<PlayerProfileView>>;
  removeRegistrationAction: (
    regId: string,
    teamType: TeamTypeCode
  ) => Promise<ActionResponse<PlayerProfileView>>;
  transferClubPlayerAction: (
    playerId: string,
    fromTeamId: string,
    toTeamId: string,
    opts?: { shirtNumber?: number | null; transferDate?: string }
  ) => Promise<ActionResponse<PlayerProfileView>>;
  callUpPlayerToNation: (
    nationalTeamId: string,
    playerId: string,
    opts?: { shirtNumber?: number | null }
  ) => Promise<ActionResponse<PlayerProfileView>>;
  retirePlayerFromNationAction: (
    playerId: string,
    opts?: { retiredAt?: string }
  ) => Promise<ActionResponse<PlayerProfileView>>;
  unretirePlayerFromNationAction: (playerId: string) => Promise<ActionResponse<PlayerProfileView>>;
  changePlayerNationAction: (
    playerId: string,
    opts: {
      nationality: string;
      switchNationalSquad?: boolean;
      newNationalTeamId?: string;
      shirtNumber?: number | null;
      effectiveDate?: string;
    }
  ) => Promise<ActionResponse<PlayerProfileView>>;

  // Legacy modal support
  selectedTeamProfile: Team | null;
  openTeamProfile: (team: Team) => void;
  closeTeamProfile: () => void;
  comparisonTeams: [Team, Team] | null;
  openComparison: (teamA: Team, teamB: Team) => void;
  closeComparison: () => void;
  compareTeamIds: [string | null, string | null];
  setCompareTeamIds: React.Dispatch<React.SetStateAction<[string | null, string | null]>>;
  pinnedCompareTeamId: string | null;
  openCompareTeams: (teamAId?: string | null, teamBId?: string | null) => void;
  togglePinCompareTeam: (teamId: string) => void;
  clearPinnedCompareTeam: () => void;

  // Permissions
  canManageTeam: (team: Team | null | undefined) => boolean;

  // Create / Edit Team Modal
  isCreateModalOpen: boolean;
  editingTeam: Team | null;
  openCreateModal: (team?: Team) => void;
  closeCreateModal: () => void;
  saveTeam: (teamData: Partial<Team>) => Team | null;
  deleteTeam: (teamId: string) => void;

  // Squad / Free Agent / Dossier Actions
  signFreeAgent: (teamId: string, player: FreeAgentPlayer) => void;
  releasePlayer: (teamId: string, playerId: string) => void;
  addPlayerToSquad: (teamId: string, player: Omit<Player, 'id'>) => void;
  updatePlayerInSquad: (teamId: string, player: Player) => void;
  deletePlayerFromSquad: (teamId: string, playerId: string) => void;
  transferPlayer: (fromTeamId: string, toTeamId: string, playerId: string) => void;
  togglePlayerInjury: (
    teamId: string,
    playerId: string,
    status: 'fit' | 'doubtful' | 'injured',
    returnDate?: string,
    note?: string
  ) => void;
  updateCaptaincy: (teamId: string, role: 'captain' | 'viceCaptain', playerId: string | null) => void;
  updateLeadershipPair: (teamId: string, captainId: string | null, viceCaptainId: string | null) => void;
  updateTeamCrest: (teamId: string, crestUrl: string) => void;
  updateTeamOverallRating: (teamId: string, newOverall: number) => void;
  appointManager: (teamId: string, managerName: string, managerProfile?: ManagerProfile) => void;
  updateManagerProfile: (teamId: string, managerProfile: ManagerProfile) => void;
  endManagerAppointment: (teamId: string) => void;
  updatePreferredXi: (teamId: string, xiIds: string[], source?: 'verified' | 'user-set' | 'estimated') => void;
  resetPreferredXiToAuto: (teamId: string) => void;
  updatePenaltyOrder: (teamId: string, penaltyOrderIds: string[], source?: 'verified' | 'user-set') => void;
  resetPenaltyOrderToVerified: (teamId: string) => void;
  updateTactics: (teamId: string, tactics: TacticalProfile, defaultFormation?: string) => void;
  recordTeamTrophy: (teamId: string, trophy: Omit<TrophyRecord, 'id'>) => void;
  refreshFootballDatabaseRankings: () => void;
  recordSimulationMatch: (payload: {
    id?: string;
    homeTeamId: string;
    awayTeamId: string;
    homeScore: number;
    awayScore: number;
    halfTimeHomeScore?: number;
    halfTimeAwayScore?: number;
    wentToExtraTime?: boolean;
    penaltySummary?: string;
    seed?: string;
    competitionId?: string;
    competitionName?: string;
    competitionFixtureId?: string;
    venue?: string;
    possessionHome?: number;
    shotsHome?: number;
    shotsAway?: number;
    xgHome?: number;
    xgAway?: number;
    lineupPlayerIds?: { home: string[]; away: string[] };
    events?: SimulationMatchEvent[];
    fullPayload?: CompleteSimulationOutput;
  }) => Promise<{ ok: boolean; match?: SimulationMatchRecord; fixtureFilingStatus?: string }>;
  saveSimulationMatch: (output: CompleteSimulationOutput, customLabel?: string) => SavedSimulationPayload;
  deleteSavedSimulation: (savedId: string) => void;
  saveScoreboardMatchAction: (record: ScoreboardMatchRecord) => Promise<{ ok: boolean; match?: ScoreboardMatchRecord; error?: string }>;
  deleteScoreboardMatchAction: (id: string) => Promise<{ ok: boolean; error?: string }>;

  // Toast
  toast: ToastNotification | null;
  showToast: (message: string, type?: 'success' | 'info' | 'gold') => void;

  // Backward-compatible fields
  teamType: TeamType;
  setTeamType: (t: TeamType) => void;
  filters: TeamFilterState;
  setFilters: React.Dispatch<React.SetStateAction<TeamFilterState>>;
  resetFilters: () => void;
}

const MatchCentreContext = createContext<MatchCentreContextType | undefined>(undefined);

const BUILT_IN_TEAM_MAP = new Map(TEAMS_DATABASE.map((t) => [t.id, t]));

export const MatchCentreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isAdmin } = useAuth();

  const canManageTeam = useCallback(
    (team: Team | null | undefined): boolean => {
      if (!team) return false;
      if (isAdmin) return true;
      return Boolean(isAuthenticated && user?.id && team.creatorId === user.id);
    },
    [isAdmin, isAuthenticated, user?.id]
  );

  // Toast notification
  const [toast, setToast] = useState<ToastNotification | null>(null);
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'gold' = 'gold') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4200);
  }, []);

  // Raw Team Overrides & Custom Teams (React state, no reload needed)
  const [deletedTeamIds, setDeletedTeamIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_TEAM_IDS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [teamOverrides, setTeamOverrides] = useState<Record<string, Team>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TEAM_OVERRIDES);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [customTeams, setCustomTeams] = useState<Team[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_TEAMS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Canonical Player Registry Delta State
  const [registryDelta, setRegistryDelta] = useState<RegistryDeltaState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REGISTRY_DELTA);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const normalizeManagersList = useCallback((list: Manager[]): Manager[] => {
    return list.map((m) => ({
      ...m,
      age: calculateAgeFromDob(m.date_of_birth),
    }));
  }, []);

  const [initialSeededManagers] = useState(() => {
    const clubSeed = buildSeededClubManagers(CLUB_TEAMS_DATABASE);
    const natSeed = buildSeededNationalManagers(NATIONAL_TEAMS_DATABASE, clubSeed.managers);
    return {
      managers: [...clubSeed.managers, ...natSeed.managers].map((m) => ({
        ...m,
        age: calculateAgeFromDob(m.date_of_birth),
      })),
      appointments: [...clubSeed.appointments, ...natSeed.appointments],
    };
  });
  const [managers, setManagers] = useState<Manager[]>(
    () => initialSeededManagers.managers
  );
  const [managerAppointments, setManagerAppointments] = useState<ManagerAppointment[]>(
    () => initialSeededManagers.appointments
  );
  const [simulationMatches, setSimulationMatches] = useState<SimulationMatchRecord[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionRecord[]>([]);
  const [competitionMakers, setCompetitionMakers] = useState<CompetitionMakerTournament[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COMPETITION_MAKERS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [competitionTrophies, setCompetitionTrophies] = useState<TrophyDesignConfig[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COMPETITION_TROPHIES);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return PRESET_TROPHIES;
  });
  const [hallOfFame, setHallOfFame] = useState<CompetitionEditionHistoryEntry[]>([]);
  const [savedSimulations, setSavedSimulations] = useState<SavedSimulationPayload[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVED_SIMULATIONS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [scoreboardMatches, setScoreboardMatches] = useState<ScoreboardMatchRecord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SAVED_SCOREBOARDS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const storageMountFlagsRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    if (!storageMountFlagsRef.current.sb) { storageMountFlagsRef.current.sb = true; return; }
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_SCOREBOARDS, JSON.stringify(scoreboardMatches));
    } catch {
      // ignore
    }
  }, [scoreboardMatches]);

  useEffect(() => {
    if (!storageMountFlagsRef.current.cm) { storageMountFlagsRef.current.cm = true; return; }
    try {
      // Compact fixture playerPerformances before saving to localStorage to stay well within browser quota
      const compactForStorage = competitionMakers.map((cm) => ({
        ...cm,
        stages: (cm.stages || []).map((st) => ({
          ...st,
          fixtures: (st.fixtures || []).map((f) =>
            f.playerPerformances
              ? { ...f, playerPerformances: undefined }
              : f
          ),
        })),
      }));
      localStorage.setItem(STORAGE_KEYS.COMPETITION_MAKERS, JSON.stringify(compactForStorage));
    } catch {
      // ignore quota errors
    }
  }, [competitionMakers]);

  useEffect(() => {
    if (!storageMountFlagsRef.current.tr) { storageMountFlagsRef.current.tr = true; return; }
    try {
      localStorage.setItem(STORAGE_KEYS.COMPETITION_TROPHIES, JSON.stringify(competitionTrophies));
    } catch {
      // ignore quota errors
    }
  }, [competitionTrophies]);

  // Persist local cache cleanly
  useEffect(() => {
    if (!storageMountFlagsRef.current.del) { storageMountFlagsRef.current.del = true; return; }
    try {
      localStorage.setItem(STORAGE_KEYS.DELETED_TEAM_IDS, JSON.stringify(deletedTeamIds));
    } catch {
      // ignore quota errors
    }
  }, [deletedTeamIds]);

  useEffect(() => {
    if (!storageMountFlagsRef.current.ov) { storageMountFlagsRef.current.ov = true; return; }
    try {
      localStorage.setItem(STORAGE_KEYS.TEAM_OVERRIDES, JSON.stringify(teamOverrides));
    } catch {
      // ignore quota errors
    }
  }, [teamOverrides]);

  useEffect(() => {
    if (!storageMountFlagsRef.current.ct) { storageMountFlagsRef.current.ct = true; return; }
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_TEAMS, JSON.stringify(customTeams));
    } catch {
      // ignore quota errors
    }
  }, [customTeams]);

  useEffect(() => {
    if (!storageMountFlagsRef.current.rd) { storageMountFlagsRef.current.rd = true; return; }
    try {
      localStorage.setItem(STORAGE_KEYS.REGISTRY_DELTA, JSON.stringify(registryDelta));
    } catch {
      // ignore quota errors
    }
  }, [registryDelta]);

  const refreshRegistry = useCallback(async () => {
    try {
      const res = await fetch('/api/public/match-centre/registry');
      if (!res.ok) return;
      const data = await res.json();
      if (!data) return;
      setRegistryDelta({
        playerIdentityOverrides: data.playerIdentityOverrides || {},
        deletedPlayerIdentityIds: Array.isArray(data.deletedPlayerIdentityIds)
          ? data.deletedPlayerIdentityIds
          : [],
        clubRegistrations: Array.isArray(data.clubRegistrations) ? data.clubRegistrations : [],
        nationalRegistrations: Array.isArray(data.nationalRegistrations)
          ? data.nationalRegistrations
          : [],
      });
      if (Array.isArray(data.managers)) {
        setManagers(normalizeManagersList(data.managers));
      }
      if (Array.isArray(data.managerAppointments)) {
        setManagerAppointments(data.managerAppointments);
      }
      if (Array.isArray(data.simulationMatches)) {
        setSimulationMatches(data.simulationMatches);
      }
      if (Array.isArray(data.scoreboardMatches)) {
        setScoreboardMatches(data.scoreboardMatches);
      }
    } catch {
      // silent fallback
    }
  }, []);

  // Hydrate teams & canonical registry from server on mount and after cloud reconciliation
  useEffect(() => {
    let active = true;

    const loadAllFromServer = (forceRefresh = false) => {
      fetchBootstrapFull(forceRefresh)
        .then((data) => {
          if (!active || !data) return;
          if (data.teamOverrides && typeof data.teamOverrides === 'object') {
            setTeamOverrides(data.teamOverrides);
          }
          if (Array.isArray(data.customTeams)) {
            setCustomTeams(data.customTeams);
          }
          if (Array.isArray(data.deletedTeamIds)) {
            setDeletedTeamIds(data.deletedTeamIds);
          }
          if (Array.isArray(data.managers)) {
            setManagers(normalizeManagersList(data.managers));
          }
          if (Array.isArray(data.managerAppointments)) {
            setManagerAppointments(data.managerAppointments);
          }
          if (Array.isArray(data.simulationMatches)) {
            setSimulationMatches(data.simulationMatches);
          }
          if (Array.isArray(data.scoreboardMatches)) {
            setScoreboardMatches((prev) => {
              const serverMatches = data.scoreboardMatches as ScoreboardMatchRecord[];
              const serverIds = new Set(serverMatches.map((m) => m.id));
              const localOnly = prev.filter((m) => !serverIds.has(m.id));
              return [...serverMatches, ...localOnly];
            });
          }
          setRegistryDelta((prev) => {
            const serverOverrides = data.playerIdentityOverrides || {};
            const serverDeleted = Array.isArray(data.deletedPlayerIdentityIds)
              ? data.deletedPlayerIdentityIds
              : [];
            const serverClubs = Array.isArray(data.clubRegistrations)
              ? data.clubRegistrations
              : [];
            const serverNats = Array.isArray(data.nationalRegistrations)
              ? data.nationalRegistrations
              : [];

            let mergedClubs = [...(prev.clubRegistrations || [])];
            for (const serverReg of serverClubs) {
              mergedClubs = upsertInDeltaArray(mergedClubs, serverReg);
            }
            let mergedNats = [...(prev.nationalRegistrations || [])];
            for (const serverReg of serverNats) {
              mergedNats = upsertInDeltaArray(mergedNats, serverReg);
            }

            return {
              playerIdentityOverrides: {
                ...(prev.playerIdentityOverrides || {}),
                ...serverOverrides,
              },
              deletedPlayerIdentityIds: Array.from(
                new Set([...serverDeleted, ...(prev.deletedPlayerIdentityIds || [])])
              ),
              clubRegistrations: mergedClubs,
              nationalRegistrations: mergedNats,
            };
          });
        })
        .catch(() => {});

      fetch('/api/simulation/bootstrap')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!active || !data) return;
          if (Array.isArray(data.competitions)) {
            setCompetitions(data.competitions);
          }
        })
        .catch(() => {});

      fetch('/api/competition-maker')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (!active || !data) return;
          if (Array.isArray(data.competitions)) {
            setCompetitionMakers(data.competitions);
          }
          if (Array.isArray(data.customTrophies)) {
            setCompetitionTrophies(data.customTrophies);
          }
          if (Array.isArray(data.hallOfFame)) {
            setHallOfFame(data.hallOfFame);
          }
        })
        .catch(() => {});
    };

    loadAllFromServer(false);
    const handleReconciled = () => {
      loadAllFromServer(true);
    };
    window.addEventListener('dodaeona:cloud-reconciled', handleReconciled);

    return () => {
      active = false;
      window.removeEventListener('dodaeona:cloud-reconciled', handleReconciled);
    };
  }, []);

  // Merge raw teams (built-ins + overrides + custom teams)
  const rawTeams = useMemo<Team[]>(() => {
    const deletedSet = new Set(deletedTeamIds);
    const mergedBuiltIns = TEAMS_DATABASE.filter((t) => !deletedSet.has(t.id)).map((t) => {
      const overridden = teamOverrides[t.id];
      const effectiveType = getTeamType(overridden || t);

      if (effectiveType === 'country') {
        const effectiveCountry = normalizeCountryName(overridden?.country || t.country);
        const flagCrest =
          getCountryFlagUrl(effectiveCountry, 160) ||
          (t.crestUrl && !isClubLogoAssetUrl(t.crestUrl)
            ? t.crestUrl
            : createNationalFlagSvgDataUrl(
                overridden?.code || t.code || 'INT',
                overridden?.primaryColor || t.primaryColor,
                overridden?.secondaryColor || t.secondaryColor,
                overridden?.flag || t.flag || getCountryFlag(effectiveCountry)
              ));
        const customNationalCrest =
          overridden?.crestUrl &&
          !overridden.crestUrl.startsWith('data:image/svg') &&
          !isClubLogoAssetUrl(overridden.crestUrl)
            ? overridden.crestUrl
            : flagCrest;

        if (!overridden) {
          return {
            ...t,
            team_type: 'country' as const,
            flag: t.flag || getCountryFlag(effectiveCountry),
            crestUrl: flagCrest,
          };
        }

        return {
          ...t,
          ...overridden,
          team_type: 'country' as const,
          country: effectiveCountry,
          flag: overridden.flag || t.flag || getCountryFlag(effectiveCountry),
          crestUrl: customNationalCrest,
          worldRanking: overridden.worldRanking ?? t.worldRanking,
          rankingPoints: overridden.rankingPoints ?? t.rankingPoints,
          rankingUpdateDate: overridden.rankingUpdateDate ?? t.rankingUpdateDate,
        };
      }

      // Clubs ONLY: resolve verified club logos via getRealClubLogo
      const realLogo = getRealClubLogo(t.name, t.shortName, t.code) || t.crestUrl;
      if (!overridden) {
        return { ...t, team_type: 'club' as const, crestUrl: realLogo };
      }
      const crestUrl =
        overridden.crestUrl && !overridden.crestUrl.startsWith('data:image/svg')
          ? overridden.crestUrl
          : realLogo;
      return {
        ...t,
        ...overridden,
        team_type: 'club' as const,
        crestUrl,
        worldRanking: overridden.worldRanking ?? t.worldRanking,
        rankingPoints: overridden.rankingPoints ?? t.rankingPoints,
        rankingUpdateDate: overridden.rankingUpdateDate ?? t.rankingUpdateDate,
      };
    });

    const verifiedCustom = customTeams
      .filter((t) => !deletedSet.has(t.id))
      .map((t) => {
        const teamType = getTeamType(t);
        if (teamType === 'country') {
          const effectiveCountry = normalizeCountryName(t.country);
          const flagCrest =
            getCountryFlagUrl(effectiveCountry, 160) ||
            createNationalFlagSvgDataUrl(
              t.code || 'INT',
              t.primaryColor,
              t.secondaryColor,
              t.flag || getCountryFlag(effectiveCountry)
            );
          const crestUrl =
            t.crestUrl &&
            !t.crestUrl.startsWith('data:image/svg') &&
            !isClubLogoAssetUrl(t.crestUrl)
              ? t.crestUrl
              : flagCrest;
          return {
            ...t,
            team_type: 'country' as const,
            country: effectiveCountry,
            flag: t.flag || getCountryFlag(effectiveCountry),
            crestUrl,
          };
        }

        const realLogo = getRealClubLogo(t.name, t.shortName, t.code) || t.crestUrl;
        const crestUrl =
          t.crestUrl && !t.crestUrl.startsWith('data:image/svg') ? t.crestUrl : realLogo;
        return {
          ...t,
          team_type: 'club' as const,
          crestUrl,
        };
      });

    return [...verifiedCustom, ...mergedBuiltIns];
  }, [deletedTeamIds, teamOverrides, customTeams]);

  // Build unified canonical registry (1 permanent PlayerIdentity + separate Club vs National tables)
  const registry = useMemo<CanonicalRegistry>(() => {
    return buildCanonicalRegistry({
      teams: rawTeams,
      freeAgents: FREE_AGENTS_DATABASE,
      seededNationalRegistrations: SEEDED_NATIONAL_REGISTRATIONS,
      delta: registryDelta,
    });
  }, [rawTeams, registryDelta]);

  // Project active club & national registrations + active ManagerAppointments onto teams
  const teams = useMemo<Team[]>(() => {
    const projected = projectRegistryOntoTeams(rawTeams, registry);
    const managersById = new Map(managers.map((m) => [m.id, m]));
    const activeApptByTeamId = new Map<string, ManagerAppointment>();
    const appointmentsByManagerId = new Map<string, ManagerAppointment[]>();
    for (const appt of managerAppointments) {
      if (appt.is_current) {
        activeApptByTeamId.set(appt.team_id, appt);
      }
      let mgrList = appointmentsByManagerId.get(appt.manager_id);
      if (!mgrList) {
        mgrList = [];
        appointmentsByManagerId.set(appt.manager_id, mgrList);
      }
      mgrList.push(appt);
    }

    // Pre-index competition makers once per memo run instead of scanning per team
    const wonTournamentsByTeamId = new Map<string, CompetitionMakerTournament[]>();
    const compById = new Map<string, CompetitionMakerTournament>();
    const compByAwardId = new Map<string, CompetitionMakerTournament>();
    for (const cm of competitionMakers) {
      compById.set(cm.id, cm);
      if (cm.awardedTrophyRecordId) {
        compByAwardId.set(cm.awardedTrophyRecordId, cm);
      }
      if (cm.status === 'completed' && cm.champion?.teamId) {
        let wonList = wonTournamentsByTeamId.get(cm.champion.teamId);
        if (!wonList) {
          wonList = [];
          wonTournamentsByTeamId.set(cm.champion.teamId, wonList);
        }
        wonList.push(cm);
      }
    }

    return projected
      .map((team) => {
        const base = BUILT_IN_TEAM_MAP.get(team.id) || team;
        const overridden = teamOverrides[team.id];
        const explicitOvr =
          overridden?.overallRating && overridden.overallRating !== base.overallRating
            ? overridden.overallRating
            : undefined;
        const detailed = recalculateTeamRatings(base, team.squad, explicitOvr);
        const isUserCustomTactics = team.tacticalProfile?.dataStatus === 'user-set';
        const resolvedFormation = isUserCustomTactics
          ? team.defaultFormation
          : team.defaultFormation || selectBestFormationForSquad(team.squad);

        // projectRegistryOntoTeams already computes & validates preferredXiIds against team.defaultFormation.
        // Only recompute XI if formation differs or user-set/existing XI doesn't fill min(11, squad.length).
        const minTargetXi = Math.min(11, team.squad.length);
        const hasValidProjectedXi =
          Array.isArray(team.preferredXiIds) &&
          team.preferredXiIds.length >= minTargetXi &&
          resolvedFormation === team.defaultFormation;
        const resolvedXiIds =
          team.preferredXiSource === 'user-set' && team.preferredXiIds?.length
            ? team.preferredXiIds
            : hasValidProjectedXi
            ? team.preferredXiIds
            : generateStrictStartingXi(team.squad, resolvedFormation).map((p) => p.id);

        const isUserPenaltyOrder = team.penaltyOrderSource === 'user-set';
        const resolvedPenaltyOrderIds = isUserPenaltyOrder && team.penaltyOrderIds?.length
          ? reconcilePenaltyOrderIds(team.squad, team.penaltyOrderIds, team.id, true)
          : team.squad === base.squad && Array.isArray(base.penaltyOrderIds) && base.penaltyOrderIds.length > 0
          ? base.penaltyOrderIds
          : buildDefaultClubPenaltyOrderIds(team.id, team.squad);
        const resolvedPenaltyOrderSource: 'verified' | 'user-set' = isUserPenaltyOrder
          ? 'user-set'
          : 'verified';

        const activeAppt = activeApptByTeamId.get(team.id);
        const activeMgr = activeAppt ? managersById.get(activeAppt.manager_id) : undefined;
        const syncFields = activeAppt
          ? {
              manager: activeMgr?.name || activeAppt.manager_name,
              manager_id: activeAppt.manager_id,
              manager_name: activeMgr?.name || activeAppt.manager_name,
              manager_since: activeAppt.start_date,
              manager_role: activeAppt.role,
              managerProfile: {
                name: activeMgr?.name || activeAppt.manager_name,
                role: activeAppt.role,
                nationality: activeMgr?.nationality || team.country,
                dateOfBirth: activeMgr?.date_of_birth || undefined,
                age: calculateAgeFromDob(activeMgr?.date_of_birth),
                appointedYear:
                  Number((activeAppt.start_date || '').slice(0, 4)) || new Date().getFullYear(),
                appointedSince: activeAppt.start_date,
                bio: activeMgr?.bio || '',
                verified: Boolean(activeMgr?.verified ?? activeAppt.verified),
                previousClubs: (appointmentsByManagerId.get(activeAppt.manager_id) || [])
                  .filter((a) => a.team_id !== team.id)
                  .map((a) => a.team_name),
                winRate: '0.0%',
                honours: activeMgr?.honours || activeAppt.honours || [],
              },
            }
          : team.manager_id
          ? {
              manager_id: null,
              manager_name: null,
              manager_since: null,
              manager_role: null,
            }
          : {};

        // Reconcile trophies won by this team in user-created tournaments into the team's trophy cabinet
        const wonTournaments = wonTournamentsByTeamId.get(team.id) || [];
        let mergedTrophies: TrophyRecord[] = Array.isArray(team.trophies)
          ? team.trophies.map((tr) => {
              if (tr.trophyDesign) return tr;
              const matchedComp =
                (tr.competitionId ? compById.get(tr.competitionId) : undefined) ||
                compByAwardId.get(tr.id);
              if (matchedComp?.trophy) {
                return {
                  ...tr,
                  engraving: tr.engraving || matchedComp.trophy.engraving,
                  imageUrl: tr.imageUrl || matchedComp.trophy.imageUrl,
                  trophyDesign: matchedComp.trophy,
                };
              }
              return tr;
            })
          : [];

        for (const wonComp of wonTournaments) {
          const seasonSlug = (wonComp.season || '1').replace(/[^a-zA-Z0-9]/g, '') || '1';
          const expectedRecordId = wonComp.awardedTrophyRecordId || `tr-cm-${wonComp.id}-${seasonSlug}`;
          const alreadyRecorded = mergedTrophies.some(
            (tr) => tr.id === expectedRecordId || tr.competitionId === wonComp.id
          );
          if (!alreadyRecorded) {
            const iconType: TrophyRecord['iconType'] =
              wonComp.presetId === 'ucl-36' || wonComp.trophy.silhouette === 'amphora'
                ? 'ucl'
                : wonComp.presetId === 'world-cup-2026' ||
                  wonComp.presetId === 'euros-24' ||
                  wonComp.trophy.silhouette === 'globe'
                ? 'world'
                : wonComp.presetId === 'domestic-league' || wonComp.trophy.silhouette === 'crown'
                ? 'domestic'
                : 'cup';
            mergedTrophies = [
              {
                id: expectedRecordId,
                name: wonComp.trophy.name,
                competition: wonComp.name,
                competitionId: wonComp.id,
                season: wonComp.season,
                count: 1,
                iconType,
                engraving: wonComp.trophy.engraving,
                imageUrl: wonComp.trophy.imageUrl,
                trophyDesign: wonComp.trophy,
              },
              ...mergedTrophies,
            ];
          }
        }

        const liveMergedCount = mergedTrophies
          .filter((tr) => !tr.isDeletedCompetition)
          .reduce((sum, tr) => sum + (tr.count || 1), 0);

        return {
          ...team,
          ...syncFields,
          trophies: mergedTrophies,
          trophiesCount: mergedTrophies.length > 0 ? liveMergedCount : team.trophiesCount,
          defaultFormation: resolvedFormation,
          preferredXiIds: resolvedXiIds,
          penaltyOrderIds: resolvedPenaltyOrderIds,
          penaltyOrderSource: resolvedPenaltyOrderSource,
          ...detailed,
        };
      })
      .sort(compareTeamsByWorldRanking);
  }, [rawTeams, registry, teamOverrides, managers, managerAppointments, competitionMakers]);

  // Free agents strictly derived from identities with zero active club registration
  const freeAgents = useMemo<FreeAgentPlayer[]>(() => {
    return deriveClubFreeAgents(registry, FREE_AGENTS_DATABASE);
  }, [registry]);

  // Persist custom teams + sparse overrides to server when admin
  const persistTeamsPayloadToServer = useCallback(
    (nextOverrides: Record<string, Team>, nextCustom: Team[], nextDeleted: string[]) => {
      if (!isAdmin) return;
      void adminApiRequest('/api/admin/teams-persistence', 'POST', {
        teamOverrides: nextOverrides,
        customTeams: nextCustom,
        deletedTeamIds: nextDeleted,
      });
    },
    [isAdmin]
  );

  // Persist local delta to server when admin uses non-granular updates
  const persistRegistryDeltaToServer = useCallback(
    (nextDelta: RegistryDeltaState) => {
      if (!isAdmin) return;
      void adminApiRequest('/api/admin/teams-persistence', 'POST', {
        playerIdentityOverrides: nextDelta.playerIdentityOverrides || {},
        deletedPlayerIdentityIds: nextDelta.deletedPlayerIdentityIds || [],
        clubRegistrations: nextDelta.clubRegistrations || [],
        nationalRegistrations: nextDelta.nationalRegistrations || [],
      });
    },
    [isAdmin]
  );

  // Navigation & Chips
  const [activeTab, setActiveTab] = useState<MatchCentreTab>(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const p = window.location.pathname;
    if (p.startsWith('/match-centre/tournaments')) return 'competitions';
    if (p.includes('/match-centre/scoreboard')) return 'scoreboard';
    if (p === '/match-centre/managers') return 'managers';
    if (p.includes('/match-centre/stadiums')) return 'teams';
    return 'dashboard';
  });
  const [teamsSectionTab, setTeamsSectionTab] = useState<TeamsSectionTab>('database');
  const [selectedStadiumClubId, setSelectedStadiumClubId] = useState<string | null>(null);
  const [pendingSimulationToOpen, setPendingSimulationToOpen] =
    useState<CompleteSimulationOutput | null>(null);
  const [pendingTournamentMatch, setPendingTournamentMatch] =
    useState<PendingTournamentMatchLaunch | null>(null);

  const clearSelectedStadiumClubId = useCallback(() => {
    setSelectedStadiumClubId(null);
  }, []);

  const openSimulationReport = useCallback((output: CompleteSimulationOutput) => {
    setPendingSimulationToOpen(output);
    setActiveTab('simulate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const clearPendingSimulation = useCallback(() => {
    setPendingSimulationToOpen(null);
  }, []);

  const launchTournamentMatchInSimulator = useCallback(
    (launch: PendingTournamentMatchLaunch) => {
      setActiveDossierTeamId(null);
      setSelectionIds({
        homeId: launch.homeTeamId,
        awayId: launch.awayTeamId,
      });
      setPendingTournamentMatch(launch);
      setActiveTab('simulate');
      if (typeof window !== 'undefined') {
        if (window.location.pathname !== '/match-centre') {
          window.history.pushState({}, '', '/match-centre');
        }
        window.dispatchEvent(new CustomEvent('dodaeona:open-match-centre'));
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const clearPendingTournamentMatch = useCallback(() => {
    setPendingTournamentMatch(null);
  }, []);
  const [viewChip, setViewChipState] = useState<ViewChipType>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.VIEW_CHIP);
    const valid: ViewChipType[] = [
      'free-agents',
      'all-teams',
      'mens-clubs',
      'mens-nations',
      'womens-clubs',
      'womens-nations',
    ];
    return valid.includes(saved as ViewChipType) ? (saved as ViewChipType) : 'all-teams';
  });

  const setViewChip = (chip: ViewChipType) => {
    setViewChipState(chip);
    localStorage.setItem(STORAGE_KEYS.VIEW_CHIP, chip);
    setVisibleTeamsCount(24);
    setVisibleFreeAgentsCount(24);
  };

  const [ordering, setOrderingState] = useState<TeamOrdering>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ORDERING) as TeamOrdering;
    return saved === 'overall' ? 'overall' : 'listed';
  });

  const setOrdering = (ord: TeamOrdering) => {
    setOrderingState(ord);
    localStorage.setItem(STORAGE_KEYS.ORDERING, ord);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setVisibleTeamsCount(24);
      setVisibleFreeAgentsCount(24);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [leagueFilter, setLeagueFilterState] = useState('all');
  const setLeagueFilter = (league: string) => {
    setLeagueFilterState(league);
    setVisibleTeamsCount(24);
  };

  const [confederationFilter, setConfederationFilterState] = useState<'all' | ConfederationType>('all');
  const setConfederationFilter = (confed: 'all' | ConfederationType) => {
    setConfederationFilterState(confed);
    setVisibleTeamsCount(24);
  };

  const [visibleTeamsCount, setVisibleTeamsCount] = useState(24);
  const [visibleFreeAgentsCount, setVisibleFreeAgentsCount] = useState(24);

  const loadMoreTeams = () => setVisibleTeamsCount((prev) => prev + 24);
  const loadMoreFreeAgents = () => setVisibleFreeAgentsCount((prev) => prev + 24);

  // Represented leagues (clubs only)
  const representedLeagues = useMemo(() => {
    const leagueMap = new Map<string, number>();
    teams.forEach((t) => {
      if (getTeamType(t) === 'club' && t.league) {
        leagueMap.set(t.league, (leagueMap.get(t.league) || 0) + 1);
      }
    });
    return Array.from(leagueMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [teams]);

  // Represented confederations (national teams only)
  const representedConfederations = useMemo(() => {
    const confedMap = new Map<ConfederationType, number>();
    teams.forEach((t) => {
      if (getTeamType(t) === 'country' && t.confederation) {
        confedMap.set(t.confederation, (confedMap.get(t.confederation) || 0) + 1);
      }
    });
    return Array.from(confedMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [teams]);

  // Dynamic counts
  const counts = useMemo(() => {
    const clubs = teams.filter((t) => getTeamType(t) === 'club');
    const national = teams.filter((t) => getTeamType(t) === 'country');
    const womens = teams.filter((t) => t.gender === 'women');

    return {
      total: teams.length,
      clubs: clubs.length,
      national: national.length,
      womens: womens.length,
      freeAgents: freeAgents.length,
      mensClubs: clubs.filter((t) => t.gender === 'men').length,
      mensNations: national.filter((t) => t.gender === 'men').length,
      womensClubs: clubs.filter((t) => t.gender === 'women').length,
      womensNations: national.filter((t) => t.gender === 'women').length,
      activeResults: 0,
    };
  }, [teams, freeAgents]);

  // Filtered & Sorted Teams
  const filteredTeams = useMemo(() => {
    const list = filterTeamsFast(
      teams,
      debouncedSearchQuery,
      (team) => {
        const tType = getTeamType(team);
        if (viewChip === 'mens-clubs') {
          if (tType !== 'club' || team.gender !== 'men') return false;
        } else if (viewChip === 'mens-nations') {
          if (tType !== 'country' || team.gender !== 'men') return false;
        } else if (viewChip === 'womens-clubs') {
          if (tType !== 'club' || team.gender !== 'women') return false;
        } else if (viewChip === 'womens-nations') {
          if (tType !== 'country' || team.gender !== 'women') return false;
        }

        if (leagueFilter !== 'all') {
          if (tType !== 'club' || team.league !== leagueFilter) return false;
        }

        if (confederationFilter !== 'all') {
          if (tType !== 'country' || team.confederation !== confederationFilter) return false;
        }

        return true;
      },
      Number.POSITIVE_INFINITY,
      true
    );

    if (ordering === 'overall') {
      list.sort((a, b) => {
        if (b.overallRating !== a.overallRating) {
          return b.overallRating - a.overallRating;
        }
        return compareTeamsByWorldRanking(a, b);
      });
    } else {
      list.sort(compareTeamsByWorldRanking);
    }

    return list;
  }, [teams, viewChip, leagueFilter, confederationFilter, debouncedSearchQuery, ordering]);

  // Filtered Free Agents
  const filteredFreeAgents = useMemo(() => {
    let list = [...freeAgents];
    if (debouncedSearchQuery.trim()) {
      const q = normalizeDatabaseSearchText(debouncedSearchQuery);
      list = list.filter(
        (fa) =>
          normalizeDatabaseSearchText(fa.name).includes(q) ||
          (fa.nickname && normalizeDatabaseSearchText(fa.nickname).includes(q)) ||
          (fa.fullName && normalizeDatabaseSearchText(fa.fullName).includes(q)) ||
          normalizeDatabaseSearchText(fa.shortName).includes(q) ||
          normalizeDatabaseSearchText(fa.nationality).includes(q) ||
          normalizeDatabaseSearchText(fa.positionDetail).includes(q) ||
          (fa.previousClub && normalizeDatabaseSearchText(fa.previousClub).includes(q))
      );
    }
    return list.sort((a, b) => b.overallRating - a.overallRating);
  }, [freeAgents, debouncedSearchQuery]);

  const hasMoreTeams = visibleTeamsCount < filteredTeams.length;
  const hasMoreFreeAgents = visibleFreeAgentsCount < filteredFreeAgents.length;

  // Match Selection (reactive by team ID)
  const [selectionIds, setSelectionIds] = useState<{ homeId: string | null; awayId: string | null }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SELECTION);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { homeId: parsed.homeId || null, awayId: parsed.awayId || null };
      }
    } catch {
      // ignore
    }
    return { homeId: null, awayId: null };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTION, JSON.stringify(selectionIds));
  }, [selectionIds]);

  const selection = useMemo<MatchSelectionState>(
    () => ({
      homeTeam: selectionIds.homeId ? teams.find((t) => t.id === selectionIds.homeId) || null : null,
      awayTeam: selectionIds.awayId ? teams.find((t) => t.id === selectionIds.awayId) || null : null,
      activeTarget: null,
    }),
    [selectionIds, teams]
  );

  const selectTeam = (team: Team, target?: 'home' | 'away') => {
    setSelectionIds((prev) => {
      if (target === 'home') {
        return {
          homeId: team.id,
          awayId: prev.awayId === team.id ? null : prev.awayId,
        };
      }
      if (target === 'away') {
        return {
          homeId: prev.homeId === team.id ? null : prev.homeId,
          awayId: team.id,
        };
      }
      if (!prev.homeId) return { ...prev, homeId: team.id };
      if (!prev.awayId && prev.homeId !== team.id) return { ...prev, awayId: team.id };
      if (prev.homeId === team.id) return { ...prev, homeId: null };
      if (prev.awayId === team.id) return { ...prev, awayId: null };
      return { ...prev, awayId: team.id };
    });
  };

  const deselectTeam = (target: 'home' | 'away') => {
    setSelectionIds((prev) => ({
      homeId: target === 'home' ? null : prev.homeId,
      awayId: target === 'away' ? null : prev.awayId,
    }));
  };

  const swapSelections = () => {
    setSelectionIds((prev) => ({ homeId: prev.awayId, awayId: prev.homeId }));
  };

  const clearSelections = () => {
    setSelectionIds({ homeId: null, awayId: null });
  };

  // Team Dossier Page state (reactive by ID)
  const [activeDossierTeamId, setActiveDossierTeamId] = useState<string | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState<number>(1);
  const activeDossierTeam = useMemo(
    () => (activeDossierTeamId ? teams.find((t) => t.id === activeDossierTeamId) || null : null),
    [teams, activeDossierTeamId]
  );

  const openDossier = useCallback((team: Team, tab: number = 1) => {
    setActiveDossierTeamId(team.id);
    setActiveDossierTab(tab);
    setTeamsSectionTab('database');
    setActiveTab('teams');
    window.dispatchEvent(new CustomEvent('dodaeona:open-match-centre'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openTeamById = useCallback((teamId: string, tab: number = 1) => {
    setActiveDossierTeamId(teamId);
    setActiveDossierTab(tab);
    setTeamsSectionTab('database');
    setActiveTab('teams');
    window.dispatchEvent(new CustomEvent('dodaeona:open-match-centre'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const closeDossier = useCallback(() => {
    setActiveDossierTeamId(null);
  }, []);

  const openTeamStadium = useCallback((teamId: string) => {
    setActiveDossierTeamId(null);
    setSelectedStadiumClubId(teamId);
    setTeamsSectionTab('stadium-explorer');
    setActiveTab('teams');
    window.dispatchEvent(new CustomEvent('dodaeona:open-match-centre'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openLeagueDirectory = useCallback((leagueName: string) => {
    setActiveDossierTeamId(null);
    setViewChipState('all-teams');
    setConfederationFilterState('all');
    setSearchQuery('');
    setLeagueFilterState(leagueName);
    setTeamsSectionTab('database');
    setActiveTab('teams');
    window.dispatchEvent(new CustomEvent('dodaeona:open-match-centre'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Player Profile System
  const getPlayerProfile = useCallback(
    (playerId: string): PlayerProfileView | null => {
      return buildPlayerProfileView(playerId, registry, teams, simulationMatches);
    },
    [registry, teams, simulationMatches]
  );

  const openPlayerProfile = useCallback((playerId: string) => {
    window.dispatchEvent(new CustomEvent('dodaeona:navigate-player', { detail: { playerId } }));
  }, []);

  // Helper to apply a local CanonicalRegistry mutation to registryDelta synchronously
  const applyLocalRegistrationDelta = useCallback(
    (
      mutator: (draftRegistry: CanonicalRegistry) => {
        ok: boolean;
        error?: string;
        clubIds?: string[];
        natIds?: string[];
        identityId?: string;
      }
    ) => {
      const clone: CanonicalRegistry = {
        identities: new Map(
          Array.from(registry.identities.entries()).map(([k, v]) => [
            k,
            { ...v, attributes: { ...v.attributes } },
          ])
        ),
        clubRegistrations: new Map(
          Array.from(registry.clubRegistrations.entries()).map(([k, v]) => [k, { ...v }])
        ),
        nationalRegistrations: new Map(
          Array.from(registry.nationalRegistrations.entries()).map(([k, v]) => [k, { ...v }])
        ),
      };
      const outcome = mutator(clone);
      if (!outcome.ok) {
        if (outcome.error) showToast(outcome.error, 'info');
        return false;
      }

      setRegistryDelta((prev) => {
        let nextClubRegs = [...(prev.clubRegistrations || [])];
        let nextNatRegs = [...(prev.nationalRegistrations || [])];
        const nextOverrides = { ...(prev.playerIdentityOverrides || {}) };

        outcome.clubIds?.forEach((cid) => {
          const rec = clone.clubRegistrations.get(cid);
          if (rec) nextClubRegs = upsertInDeltaArray(nextClubRegs, rec);
        });
        outcome.natIds?.forEach((nid) => {
          const rec = clone.nationalRegistrations.get(nid);
          if (rec) nextNatRegs = upsertInDeltaArray(nextNatRegs, rec);
        });
        if (outcome.identityId) {
          const idObj = clone.identities.get(outcome.identityId);
          if (idObj) nextOverrides[outcome.identityId] = idObj;
        }

        const updated: RegistryDeltaState = {
          ...prev,
          playerIdentityOverrides: nextOverrides,
          clubRegistrations: nextClubRegs,
          nationalRegistrations: nextNatRegs,
        };
        persistRegistryDeltaToServer(updated);
        return updated;
      });
      return true;
    },
    [registry, persistRegistryDeltaToServer, showToast]
  );

  // Granular Admin Registry Actions (enforce backend rules + support local delta fallback)
  const createPlayerIdentityProfile = useCallback(
    async (payload: Record<string, any>): Promise<ActionResponse<PlayerProfileView>> => {
      if (!isAdmin) {
        return { ok: false, error: 'Authorised administrator access required.' };
      }
      const res = await adminApiRequest<{ ok: boolean; profile: PlayerProfileView }>(
        '/api/admin/players',
        'POST',
        payload
      );
      if (!res.ok) {
        showToast(res.error || 'Failed to create player identity.', 'info');
        return { ok: false, error: res.error };
      }
      await refreshRegistry();
      showToast(
        `${getPlayerDisplayName(res.data?.profile?.identity) || 'Player'} created in registry.`,
        'gold'
      );
      return { ok: true, data: res.data?.profile };
    },
    [isAdmin, refreshRegistry, showToast]
  );

  const updatePlayerIdentityProfile = useCallback(
    async (playerId: string, patch: Record<string, any>): Promise<ActionResponse<PlayerProfileView>> => {
      if (!isAdmin) {
        return { ok: false, error: 'Authorised administrator access required.' };
      }
      const res = await adminApiRequest<{ ok: boolean; profile: PlayerProfileView }>(
        `/api/admin/players/${encodeURIComponent(playerId)}`,
        'PATCH',
        patch
      );
      if (!res.ok) {
        showToast(res.error || 'Failed to update player profile.', 'info');
        return { ok: false, error: res.error };
      }
      await refreshRegistry();
      showToast(
        `Player profile updated for ${getPlayerDisplayName(res.data?.profile?.identity) || 'player'}.`,
        'success'
      );
      return { ok: true, data: res.data?.profile };
    },
    [isAdmin, refreshRegistry, showToast]
  );

  const deletePlayerIdentityProfile = useCallback(
    async (playerId: string): Promise<ActionResponse<{ deletedId: string }>> => {
      if (!isAdmin) {
        return { ok: false, error: 'Authorised administrator access required.' };
      }
      const res = await adminApiRequest<{ ok: boolean; deletedId: string }>(
        `/api/admin/players/${encodeURIComponent(playerId)}`,
        'DELETE'
      );
      if (!res.ok) {
        showToast(res.error || 'Cannot delete player identity.', 'info');
        return { ok: false, error: res.error };
      }
      await refreshRegistry();
      showToast('Permanent player identity deleted.', 'info');
      return { ok: true, data: { deletedId: playerId } };
    },
    [isAdmin, refreshRegistry, showToast]
  );

  const registerPlayerToTeamAction = useCallback(
    async (
      playerId: string,
      teamId: string,
      opts?: { shirtNumber?: number | null; isCaptain?: boolean; isViceCaptain?: boolean }
    ): Promise<ActionResponse<PlayerProfileView>> => {
      if (isAdmin) {
        const res = await adminApiRequest<{ ok: boolean; profile: PlayerProfileView }>(
          '/api/admin/registrations',
          'POST',
          {
            playerId,
            teamId,
            ...(opts?.shirtNumber !== undefined ? { shirtNumber: opts.shirtNumber } : {}),
            ...(opts?.isCaptain !== undefined ? { isCaptain: opts.isCaptain } : {}),
            ...(opts?.isViceCaptain !== undefined ? { isViceCaptain: opts.isViceCaptain } : {}),
          }
        );
        if (!res.ok) {
          showToast(res.error || 'Registration failed.', 'info');
          return { ok: false, error: res.error };
        }
        await refreshRegistry();
        showToast('Team registration completed.', 'success');
        return { ok: true, data: res.data?.profile };
      }

      const team = teams.find((t) => t.id === teamId);
      if (!team) {
        showToast('Destination team not found.', 'info');
        return { ok: false, error: 'Destination team not found.' };
      }
      let errMsg: string | undefined;
      const ok = applyLocalRegistrationDelta((draft) => {
        const res = registerPlayerToTeam(draft, {
          playerId,
          team,
          shirtNumber: opts?.shirtNumber,
          isCaptain: opts?.isCaptain,
          isViceCaptain: opts?.isViceCaptain,
        });
        if (!res.ok || !res.data) {
          errMsg = res.error;
          return { ok: false, error: res.error };
        }
        return getTeamType(team) === 'club'
          ? { ok: true, clubIds: [res.data.id] }
          : { ok: true, natIds: [res.data.id] };
      });
      if (!ok) return { ok: false, error: errMsg || 'Registration failed.' };
      showToast(
        getTeamType(team) === 'country'
          ? `Player called up to ${team.name}.`
          : `Player signed for ${team.name}.`,
        'success'
      );
      return { ok: true };
    },
    [isAdmin, teams, applyLocalRegistrationDelta, refreshRegistry, showToast]
  );

  const updateRegistrationAction = useCallback(
    async (
      regId: string,
      teamType: TeamTypeCode,
      patch: {
        shirtNumber?: number | null;
        isCaptain?: boolean;
        isViceCaptain?: boolean;
        status?: 'active' | 'former' | 'called_up' | 'standby';
        appearances?: number;
        goals?: number;
        assists?: number;
      }
    ): Promise<ActionResponse<PlayerProfileView>> => {
      if (isAdmin) {
        const res = await adminApiRequest<{ ok: boolean; profile: PlayerProfileView }>(
          `/api/admin/registrations/${encodeURIComponent(regId)}`,
          'PATCH',
          { team_type: teamType, ...patch }
        );
        if (!res.ok) {
          showToast(res.error || 'Failed to update registration.', 'info');
          return { ok: false, error: res.error };
        }
        await refreshRegistry();
        showToast('Registration updated.', 'success');
        return { ok: true, data: res.data?.profile };
      }

      const existing =
        teamType === 'club'
          ? registry.clubRegistrations.get(regId)
          : registry.nationalRegistrations.get(regId);
      const team = existing ? teams.find((t) => t.id === existing.teamId) : undefined;
      let errMsg: string | undefined;
      const ok = applyLocalRegistrationDelta((draft) => {
        const res = updateTeamRegistration(draft, {
          registrationId: regId,
          teamType,
          team,
          patch,
        });
        if (!res.ok || !res.data) {
          errMsg = res.error;
          return { ok: false, error: res.error };
        }
        return teamType === 'club'
          ? { ok: true, clubIds: [res.data.id] }
          : { ok: true, natIds: [res.data.id] };
      });
      if (!ok) return { ok: false, error: errMsg || 'Failed to update registration.' };
      showToast('Registration updated.', 'success');
      return { ok: true };
    },
    [isAdmin, registry, teams, applyLocalRegistrationDelta, refreshRegistry, showToast]
  );

  const releaseRegistrationAction = useCallback(
    async (regId: string, teamType: TeamTypeCode): Promise<ActionResponse<PlayerProfileView>> => {
      if (isAdmin) {
        const res = await adminApiRequest<{ ok: boolean; profile: PlayerProfileView }>(
          `/api/admin/registrations/${encodeURIComponent(regId)}/release`,
          'POST',
          { team_type: teamType }
        );
        if (!res.ok) {
          showToast(res.error || 'Release failed.', 'info');
          return { ok: false, error: res.error };
        }
        await refreshRegistry();
        showToast(
          teamType === 'country'
            ? 'Player released from national-team call-up (club registration preserved).'
            : 'Player released from club to Free Agency (national call-ups preserved).',
          'info'
        );
        return { ok: true, data: res.data?.profile };
      }

      const existing =
        teamType === 'club'
          ? registry.clubRegistrations.get(regId)
          : registry.nationalRegistrations.get(regId);
      if (!existing) {
        showToast('Registration record not found.', 'info');
        return { ok: false, error: 'Registration record not found.' };
      }
      const team = teams.find((t) => t.id === existing.teamId);
      let errMsg: string | undefined;
      const ok = applyLocalRegistrationDelta((draft) => {
        if (!team) {
          const rec =
            teamType === 'club'
              ? draft.clubRegistrations.get(regId)
              : draft.nationalRegistrations.get(regId);
          if (!rec) return { ok: false, error: 'Registration record not found.' };
          rec.status = 'former';
          rec.leftAt = new Date().toISOString().slice(0, 10);
          rec.isCaptain = false;
          rec.isViceCaptain = false;
          return teamType === 'club'
            ? { ok: true, clubIds: [regId] }
            : { ok: true, natIds: [regId] };
        }
        const res = releasePlayerFromTeam(draft, { playerId: existing.playerId, team });
        if (!res.ok || !res.data) {
          errMsg = res.error;
          return { ok: false, error: res.error };
        }
        return teamType === 'club'
          ? { ok: true, clubIds: [res.data.id] }
          : { ok: true, natIds: [res.data.id] };
      });
      if (!ok) return { ok: false, error: errMsg || 'Release failed.' };
      showToast(
        teamType === 'country'
          ? 'Player released from national-team call-up (club registration preserved).'
          : 'Player released from club to Free Agency (national call-ups preserved).',
        'info'
      );
      return { ok: true };
    },
    [isAdmin, registry, teams, applyLocalRegistrationDelta, refreshRegistry, showToast]
  );

  const removeRegistrationAction = useCallback(
    async (regId: string, teamType: TeamTypeCode): Promise<ActionResponse<PlayerProfileView>> => {
      if (!isAdmin) {
        return { ok: false, error: 'Authorised administrator access required.' };
      }
      const res = await adminApiRequest<{ ok: boolean; profile: PlayerProfileView }>(
        `/api/admin/registrations/${encodeURIComponent(regId)}?team_type=${teamType}`,
        'DELETE'
      );
      if (!res.ok) {
        showToast(res.error || 'Failed to delete registration record.', 'info');
        return { ok: false, error: res.error };
      }
      await refreshRegistry();
      showToast('Registration record deleted.', 'info');
      return { ok: true, data: res.data?.profile };
    },
    [isAdmin, refreshRegistry, showToast]
  );

  const transferClubPlayerAction = useCallback(
    async (
      playerId: string,
      fromTeamId: string,
      toTeamId: string,
      opts?: { shirtNumber?: number | null; transferDate?: string }
    ): Promise<ActionResponse<PlayerProfileView>> => {
      if (isAdmin) {
        const res = await adminApiRequest<{ ok: boolean; profile: PlayerProfileView }>(
          '/api/admin/transfers',
          'POST',
          {
            playerId,
            fromTeamId,
            toTeamId,
            ...(opts?.shirtNumber !== undefined ? { shirtNumber: opts.shirtNumber } : {}),
            ...(opts?.transferDate ? { transferDate: opts.transferDate } : {}),
          }
        );
        if (!res.ok) {
          showToast(res.error || 'Transfer rejected.', 'info');
          return { ok: false, error: res.error };
        }
        await refreshRegistry();
        showToast('Club-to-club transfer completed (international registration intact).', 'gold');
        return { ok: true, data: res.data?.profile };
      }

      const fromTeam = teams.find((t) => t.id === fromTeamId);
      const toTeam = teams.find((t) => t.id === toTeamId);
      if (!fromTeam || !toTeam) {
        showToast('Source or destination club not found.', 'info');
        return { ok: false, error: 'Source or destination club not found.' };
      }
      let errMsg: string | undefined;
      const ok = applyLocalRegistrationDelta((draft) => {
        const res = transferPlayerClubOnly(draft, {
          playerId,
          fromTeam,
          toTeam,
          shirtNumber: opts?.shirtNumber,
          transferDate: opts?.transferDate,
        });
        if (!res.ok || !res.data) {
          errMsg = res.error;
          return { ok: false, error: res.error };
        }
        return { ok: true, clubIds: [res.data.former.id, res.data.current.id] };
      });
      if (!ok) return { ok: false, error: errMsg || 'Transfer rejected.' };
      showToast(
        `Transfer complete: moved to ${toTeam.name} (international status intact).`,
        'gold'
      );
      return { ok: true };
    },
    [isAdmin, teams, applyLocalRegistrationDelta, refreshRegistry, showToast]
  );

  const retirePlayerFromNationAction = useCallback(
    async (
      playerId: string,
      opts?: { retiredAt?: string }
    ): Promise<ActionResponse<PlayerProfileView>> => {
      if (isAdmin) {
        const res = await adminApiRequest<{ ok: boolean; profile: PlayerProfileView }>(
          `/api/admin/players/${encodeURIComponent(playerId)}/retire-nation`,
          'POST',
          { retired: true, retiredAt: opts?.retiredAt }
        );
        if (!res.ok) {
          showToast(res.error || 'Failed to retire player from nation.', 'info');
          return { ok: false, error: res.error };
        }
        await refreshRegistry();
        showToast(
          `${getPlayerDisplayName(res.data?.profile?.identity) || 'Player'} has retired from international duty.`,
          'info'
        );
        return { ok: true, data: res.data?.profile };
      }

      let errMsg: string | undefined;
      const ok = applyLocalRegistrationDelta((draft) => {
        const res = retirePlayerFromNation(draft, { playerId, retiredAt: opts?.retiredAt });
        if (!res.ok || !res.data) {
          errMsg = res.error;
          return { ok: false, error: res.error };
        }
        return {
          ok: true,
          identityId: playerId,
          natIds: res.data.releasedRegistrations.map((r) => r.id),
        };
      });
      if (!ok) return { ok: false, error: errMsg || 'Failed to retire player from nation.' };
      showToast('Player retired from international duty (club career preserved).', 'info');
      return { ok: true };
    },
    [isAdmin, applyLocalRegistrationDelta, refreshRegistry, showToast]
  );

  const unretirePlayerFromNationAction = useCallback(
    async (playerId: string): Promise<ActionResponse<PlayerProfileView>> => {
      if (isAdmin) {
        const res = await adminApiRequest<{ ok: boolean; profile: PlayerProfileView }>(
          `/api/admin/players/${encodeURIComponent(playerId)}/retire-nation`,
          'POST',
          { retired: false }
        );
        if (!res.ok) {
          showToast(res.error || 'Failed to update international status.', 'info');
          return { ok: false, error: res.error };
        }
        await refreshRegistry();
        showToast('Player is available for international selection again.', 'success');
        return { ok: true, data: res.data?.profile };
      }

      let errMsg: string | undefined;
      const ok = applyLocalRegistrationDelta((draft) => {
        const res = unretirePlayerFromNation(draft, playerId);
        if (!res.ok) {
          errMsg = res.error;
          return { ok: false, error: res.error };
        }
        return { ok: true, identityId: playerId };
      });
      if (!ok) return { ok: false, error: errMsg || 'Failed to update international status.' };
      showToast('Player is available for international selection again.', 'success');
      return { ok: true };
    },
    [isAdmin, applyLocalRegistrationDelta, refreshRegistry, showToast]
  );

  const changePlayerNationAction = useCallback(
    async (
      playerId: string,
      opts: {
        nationality: string;
        switchNationalSquad?: boolean;
        newNationalTeamId?: string;
        shirtNumber?: number | null;
        effectiveDate?: string;
      }
    ): Promise<ActionResponse<PlayerProfileView>> => {
      if (isAdmin) {
        const res = await adminApiRequest<{ ok: boolean; profile: PlayerProfileView }>(
          `/api/admin/players/${encodeURIComponent(playerId)}/change-nation`,
          'POST',
          opts
        );
        if (!res.ok) {
          showToast(res.error || 'Failed to change player nation.', 'info');
          return { ok: false, error: res.error };
        }
        await refreshRegistry();
        showToast(
          `Nation updated to ${res.data?.profile?.identity.nationality || opts.nationality}.`,
          'gold'
        );
        return { ok: true, data: res.data?.profile };
      }

      const existing = registry.identities.get(playerId);
      if (!existing) {
        showToast('Player identity not found.', 'info');
        return { ok: false, error: 'Player identity not found.' };
      }
      const normalizedTarget = normalizeCountryName(opts.nationality);
      const targetTeam = opts.newNationalTeamId
        ? teams.find((t) => t.id === opts.newNationalTeamId) || null
        : teams.find(
            (t) =>
              getTeamType(t) === 'country' &&
              t.gender === existing.gender &&
              normalizeCountryName(t.country).toLowerCase() === normalizedTarget.toLowerCase()
          ) || null;

      let errMsg: string | undefined;
      const ok = applyLocalRegistrationDelta((draft) => {
        const res = changePlayerNation(draft, {
          playerId,
          newNationality: opts.nationality,
          newNationalTeam: targetTeam,
          switchNationalSquad: opts.switchNationalSquad ?? true,
          shirtNumber: opts.shirtNumber,
          effectiveDate: opts.effectiveDate,
        });
        if (!res.ok || !res.data) {
          errMsg = res.error;
          return { ok: false, error: res.error };
        }
        return {
          ok: true,
          identityId: playerId,
          natIds: res.data.modifiedNationalRegistrations.map((r) => r.id),
        };
      });
      if (!ok) return { ok: false, error: errMsg || 'Failed to change player nation.' };
      showToast(
        opts.switchNationalSquad !== false && targetTeam
          ? `Nation switched to ${normalizedTarget} & called up to ${targetTeam.name}.`
          : `Nationality changed to ${normalizedTarget}.`,
        'gold'
      );
      return { ok: true };
    },
    [isAdmin, registry, teams, applyLocalRegistrationDelta, refreshRegistry, showToast]
  );

  const callUpPlayerToNation = useCallback(
    async (
      nationalTeamId: string,
      playerId: string,
      opts?: { shirtNumber?: number | null }
    ): Promise<ActionResponse<PlayerProfileView>> => {
      const team = teams.find((t) => t.id === nationalTeamId);
      if (!team || getTeamType(team) !== 'country') {
        return { ok: false, error: 'Target must be a national team (country).' };
      }
      return registerPlayerToTeamAction(playerId, nationalTeamId, opts);
    },
    [teams, registerPlayerToTeamAction]
  );

  // Legacy modal support
  const [selectedTeamProfile, setSelectedTeamProfile] = useState<Team | null>(null);
  const openTeamProfile = (team: Team) => openDossier(team, 1);
  const closeTeamProfile = () => setSelectedTeamProfile(null);

  const [comparisonTeams, setComparisonTeams] = useState<[Team, Team] | null>(null);
  const openComparison = (teamA: Team, teamB: Team) => setComparisonTeams([teamA, teamB]);
  const closeComparison = () => setComparisonTeams(null);

  const [compareTeamIds, setCompareTeamIds] = useState<[string | null, string | null]>([null, null]);
  const [pinnedCompareTeamId, setPinnedCompareTeamId] = useState<string | null>(null);

  const openCompareTeams = useCallback(
    (teamAId?: string | null, teamBId?: string | null) => {
      if (teamAId !== undefined || teamBId !== undefined) {
        setCompareTeamIds((prev) => [
          teamAId !== undefined ? teamAId : prev[0],
          teamBId !== undefined ? teamBId : teamAId && prev[1] === teamAId ? null : prev[1],
        ]);
      }
      setActiveDossierTeamId(null);
      setTeamsSectionTab('compare-teams');
      setActiveTab('teams');
      window.dispatchEvent(new CustomEvent('dodaeona:open-match-centre'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const togglePinCompareTeam = useCallback(
    (teamId: string) => {
      if (!pinnedCompareTeamId) {
        setPinnedCompareTeamId(teamId);
        const target = teams.find((t) => t.id === teamId);
        if (target) {
          showToast(`Selected ${target.shortName} — pick a second team to compare.`, 'info');
        }
        return;
      }
      if (pinnedCompareTeamId === teamId) {
        setPinnedCompareTeamId(null);
        return;
      }
      const firstId = pinnedCompareTeamId;
      setPinnedCompareTeamId(null);
      openCompareTeams(firstId, teamId);
    },
    [pinnedCompareTeamId, teams, showToast, openCompareTeams]
  );

  const clearPinnedCompareTeam = useCallback(() => {
    setPinnedCompareTeamId(null);
  }, []);

  // Create / Edit Team Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const openCreateModal = (teamToEdit?: Team) => {
    if (teamToEdit && !canManageTeam(teamToEdit)) {
      showToast('Only the club owner or creator can edit this team.', 'info');
      return;
    }
    setEditingTeam(teamToEdit || null);
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setEditingTeam(null);
  };

  // Helper to update sparse team override cleanly (without copying huge base squads)
  const updateTeamOverride = useCallback(
    (team: Team, patch: Partial<Team>) => {
      if (team.isCustom) {
        setCustomTeams((prev) => {
          const next = prev.map((c) => (c.id === team.id ? { ...c, ...patch } : c));
          persistTeamsPayloadToServer(teamOverrides, next, deletedTeamIds);
          return next;
        });
      } else {
        setTeamOverrides((prev) => {
          const next = {
            ...prev,
            [team.id]: { ...(prev[team.id] || team), ...patch },
          };
          persistTeamsPayloadToServer(next, customTeams, deletedTeamIds);
          return next;
        });
      }
    },
    [teamOverrides, customTeams, deletedTeamIds, persistTeamsPayloadToServer]
  );

  // Save Custom Team / Edit Team
  const saveTeam = (teamData: Partial<Team>): Team | null => {
    const resolvedType: TeamType = teamData.type || editingTeam?.type || 'club';
    const resolvedTeamType: TeamTypeCode = resolvedType === 'national' ? 'country' : 'club';
    const canonicalCountry = normalizeCountryName(teamData.country || editingTeam?.country || 'Global');
    const resolvedFlag = teamData.flag || getCountryFlag(canonicalCountry);
    const resolvedGender = teamData.gender || editingTeam?.gender || 'men';

    if (resolvedTeamType === 'country') {
      const duplicateNational = teams.find(
        (t) =>
          t.id !== editingTeam?.id &&
          getTeamType(t) === 'country' &&
          t.gender === resolvedGender &&
          normalizeCountryName(t.country).toLowerCase() === canonicalCountry.toLowerCase()
      );
      if (duplicateNational) {
        showToast(
          `Duplicate prevented: ${duplicateNational.name} (${resolvedGender}) is already registered for ${canonicalCountry}.`,
          'info'
        );
        return null;
      }
    }

    if (editingTeam) {
      if (!canManageTeam(editingTeam)) {
        showToast('Owners or team creators only.', 'info');
        closeCreateModal();
        return null;
      }
      const nextFormation = teamData.defaultFormation || editingTeam.defaultFormation;
      const nextNationalCrest =
        resolvedTeamType === 'country'
          ? teamData.crestUrl &&
            !isClubLogoAssetUrl(teamData.crestUrl) &&
            !teamData.crestUrl.includes('flagcdn.com')
            ? teamData.crestUrl
            : getCountryFlagUrl(canonicalCountry, 160) ||
              createNationalFlagSvgDataUrl(
                teamData.code || editingTeam.code || 'INT',
                teamData.primaryColor || editingTeam.primaryColor,
                teamData.secondaryColor || editingTeam.secondaryColor,
                resolvedFlag
              )
          : teamData.crestUrl;
      const patch: Partial<Team> = {
        ...teamData,
        type: resolvedType,
        team_type: resolvedTeamType,
        country: canonicalCountry,
        flag: resolvedFlag,
        crestUrl: nextNationalCrest || editingTeam.crestUrl,
        league: resolvedTeamType === 'club' ? teamData.league : undefined,
        confederation: resolvedTeamType === 'country' ? teamData.confederation : undefined,
        defaultFormation: nextFormation,
      };
      updateTeamOverride(editingTeam, patch);
      showToast(`${teamData.name || editingTeam.name} updated successfully!`, 'success');
      closeCreateModal();
      return { ...editingTeam, ...patch } as Team;
    }

    const squad = teamData.squad || [];
    const targetOvr =
      typeof teamData.overallRating === 'number' && teamData.overallRating > 0
        ? teamData.overallRating
        : undefined;
    const calculated = calculateDetailedRatings(squad, targetOvr);
    const newId = `custom-team-${Date.now()}`;
    const rankingEntry =
      resolvedTeamType === 'club'
        ? getRealFootballDatabaseRating(
            teamData.name || 'Custom Athletic FC',
            teamData.shortName,
            teamData.code,
            teamData.league,
            resolvedGender,
            calculated.overallRating
          )
        : null;
    const primary = teamData.primaryColor || '#C5A059';
    const secondary = teamData.secondaryColor || '#0B1528';
    const code = (teamData.code || 'CUS').toUpperCase();
    const resolvedCrest =
      resolvedTeamType === 'country'
        ? teamData.crestUrl && !isClubLogoAssetUrl(teamData.crestUrl)
          ? teamData.crestUrl
          : getCountryFlagUrl(canonicalCountry, 160) ||
            createNationalFlagSvgDataUrl(code, primary, secondary, resolvedFlag)
        : teamData.crestUrl || buildCustomCrestSvgDataUrl(code, primary, secondary);

    const newTeam: Team = {
      id: newId,
      name: teamData.name || 'Custom Athletic FC',
      shortName: teamData.shortName || teamData.name || 'Custom FC',
      code,
      type: resolvedType,
      country: canonicalCountry,
      flag: resolvedFlag,
      league: resolvedTeamType === 'club' ? teamData.league || 'Custom Invitational' : undefined,
      confederation:
        resolvedTeamType === 'country' ? teamData.confederation || 'UEFA' : undefined,
      gender: resolvedGender,
      isCustom: true,
      creatorId: isAuthenticated && user?.id ? user.id : undefined,
      stadium: teamData.stadium || 'Grand Arena',
      stadiumCapacity: teamData.stadiumCapacity || 55000,
      foundedYear: teamData.foundedYear || new Date().getFullYear(),
      manager: teamData.manager || 'Head Coach',
      playingStyle: teamData.playingStyle || 'Balanced Possession',
      primaryColor: primary,
      secondaryColor: secondary,
      defaultFormation: teamData.defaultFormation || '4-3-3',
      description: teamData.description || 'Custom crafted team in DodaEona F.C.',
      squad,
      trophies: [],
      trophiesCount: 0,
      ...teamData,
      team_type: resolvedTeamType,
      crestUrl: resolvedCrest,
      worldRanking: teamData.worldRanking ?? rankingEntry?.rank,
      rankingPoints: teamData.rankingPoints ?? rankingEntry?.points ?? calculated.overallRating * 20,
      rankingUpdateDate: rankingEntry?.updateDate,
      overallRating: calculated.overallRating,
      attackRating: calculated.attackRating,
      midfieldRating: calculated.midfieldRating,
      defenceRating: calculated.defenceRating,
    } as Team;

    const nextCustom = [newTeam, ...customTeams];
    setCustomTeams(nextCustom);
    persistTeamsPayloadToServer(teamOverrides, nextCustom, deletedTeamIds);

    showToast(`${newTeam.name} created and registered in database!`, 'gold');
    closeCreateModal();
    return newTeam;
  };

  // Delete Team
  const deleteTeam = (teamId: string) => {
    const target = teams.find((t) => t.id === teamId);
    if (!target || !canManageTeam(target)) return;

    const nextCustom = customTeams.filter((t) => t.id !== teamId);
    const nextDeleted = !target.isCustom && !deletedTeamIds.includes(teamId)
      ? [...deletedTeamIds, teamId]
      : deletedTeamIds;

    setCustomTeams(nextCustom);
    setDeletedTeamIds(nextDeleted);
    persistTeamsPayloadToServer(teamOverrides, nextCustom, nextDeleted);

    if (activeDossierTeamId === teamId) setActiveDossierTeamId(null);
    if (selectionIds.homeId === teamId) deselectTeam('home');
    if (selectionIds.awayId === teamId) deselectTeam('away');

    showToast(`${target.name} has been removed from database.`, 'info');
  };

  // Squad operations: Sign Free Agent (club) OR Call up Existing Player (national team via team_type)
  const signFreeAgent = (teamId: string, player: FreeAgentPlayer) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team)) return;

    if (isAdmin) {
      void registerPlayerToTeamAction(player.id, team.id, { shirtNumber: player.shirtNumber });
      return;
    }

    const ok = applyLocalRegistrationDelta((draft) => {
      if (!draft.identities.has(player.id)) {
        draft.identities.set(player.id, playerToIdentity(player, team.gender));
      }
      const res = registerPlayerToTeam(draft, {
        playerId: player.id,
        team,
        shirtNumber: player.shirtNumber,
      });
      if (!res.ok || !res.data) return { ok: false, error: res.error };
      return getTeamType(team) === 'club'
        ? { ok: true, clubIds: [res.data.id], identityId: player.id }
        : { ok: true, natIds: [res.data.id], identityId: player.id };
    });

    if (ok) {
      showToast(
        getTeamType(team) === 'country'
          ? `${player.name} called up to ${team.name}!`
          : `${player.name} signed for ${team.name}!`,
        'success'
      );
    }
  };

  // Squad operations: Release Player from THIS team only (keeps permanent PlayerIdentity & other registration intact)
  const releasePlayer = (teamId: string, playerId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team)) return;
    const tType = getTeamType(team);
    const activeRegs = getActiveRegistrationsForTeam(registry, team);
    const targetReg = activeRegs.find((r) => r.playerId === playerId);
    if (!targetReg) return;

    if (isAdmin) {
      void releaseRegistrationAction(targetReg.id, tType);
      return;
    }

    const ok = applyLocalRegistrationDelta((draft) => {
      const res = releasePlayerFromTeam(draft, { playerId, team });
      if (!res.ok || !res.data) return { ok: false, error: res.error };
      return tType === 'club' ? { ok: true, clubIds: [res.data.id] } : { ok: true, natIds: [res.data.id] };
    });

    if (ok) {
      showToast(
        tType === 'country'
          ? `Player released from ${team.name} call-up.`
          : `Player released from ${team.name} to Free Agency.`,
        'info'
      );
    }
  };

  // Add new player identity + register strictly via team.team_type
  const addPlayerToSquad = (teamId: string, playerData: Omit<Player, 'id'>) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team)) return;

    const displayNickname = (playerData.nickname && playerData.nickname.trim()) || playerData.name;
    const resolvedFullName = (playerData.fullName && playerData.fullName.trim()) || playerData.name;
    const resolvedShortName = playerData.shortName || makePitchShortName(displayNickname);
    const resolvedDob = playerData.dateOfBirth?.trim() || undefined;
    const resolvedAge = resolvePlayerAge(resolvedDob, playerData.age);

    if (isAdmin) {
      void createPlayerIdentityProfile({
        ...playerData,
        name: displayNickname,
        nickname: displayNickname,
        shortName: resolvedShortName,
        fullName: resolvedFullName,
        dateOfBirth: resolvedDob,
        age: resolvedAge,
        gender: team.gender,
        teamId: team.id,
      });
      return;
    }

    const newId = `pl-${Date.now()}`;
    const newPlayer: Player = {
      ...playerData,
      id: newId,
      name: displayNickname,
      nickname: displayNickname,
      shortName: resolvedShortName,
      fullName: resolvedFullName,
      dateOfBirth: resolvedDob,
      age: resolvedAge,
    };
    const ok = applyLocalRegistrationDelta((draft) => {
      draft.identities.set(newId, playerToIdentity(newPlayer, team.gender));
      const res = registerPlayerToTeam(draft, {
        playerId: newId,
        team,
        shirtNumber: playerData.shirtNumber,
      });
      if (!res.ok || !res.data) return { ok: false, error: res.error };
      return getTeamType(team) === 'club'
        ? { ok: true, clubIds: [res.data.id], identityId: newId }
        : { ok: true, natIds: [res.data.id], identityId: newId };
    });

    if (ok) {
      showToast(`${getPlayerDisplayName(newPlayer)} added to ${team.name} squad.`, 'success');
    }
  };

  // Update player identity + team-specific shirt number independently
  const updatePlayerInSquad = (teamId: string, player: Player) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team)) return;
    const tType = getTeamType(team);
    const activeReg = getActiveRegistrationsForTeam(registry, team).find(
      (r) => r.playerId === player.id
    );

    const displayNickname = (player.nickname && player.nickname.trim()) || player.name;
    const resolvedFullName = (player.fullName && player.fullName.trim()) || player.name;
    const resolvedShortName = makePitchShortName(displayNickname) || player.shortName;
    const hasDobField = typeof player.dateOfBirth === 'string';
    const resolvedDob = hasDobField ? player.dateOfBirth!.trim() || undefined : undefined;
    const resolvedAge = resolvePlayerAge(
      hasDobField ? resolvedDob : undefined,
      player.age
    );

    if (isAdmin) {
      void (async () => {
        const idRes = await updatePlayerIdentityProfile(player.id, {
          name: displayNickname,
          nickname: displayNickname,
          fullName: resolvedFullName,
          shortName: resolvedShortName,
          position: player.position,
          positionDetail: player.positionDetail,
          overallRating: player.overallRating,
          nationality: player.nationality,
          ...(hasDobField ? { dateOfBirth: player.dateOfBirth } : {}),
          age: resolvedAge,
          attributes: player.attributes,
        });
        if (idRes.ok && activeReg && activeReg.shirtNumber !== player.shirtNumber) {
          await updateRegistrationAction(activeReg.id, tType, { shirtNumber: player.shirtNumber });
        }
      })();
      return;
    }

    applyLocalRegistrationDelta((draft) => {
      const existing = draft.identities.get(player.id);
      if (existing) {
        const effectiveDob = hasDobField ? resolvedDob : existing.dateOfBirth;
        draft.identities.set(player.id, {
          ...existing,
          name: displayNickname,
          nickname: displayNickname,
          fullName: resolvedFullName,
          shortName: resolvedShortName,
          position: player.position,
          positionDetail: player.positionDetail,
          overallRating: player.overallRating,
          nationality: normalizeCountryName(player.nationality),
          dateOfBirth: effectiveDob,
          age: resolvePlayerAge(effectiveDob, player.age),
          attributes: { ...player.attributes },
        });
      }
      if (activeReg && activeReg.shirtNumber !== player.shirtNumber) {
        const regRes = updateTeamRegistration(draft, {
          registrationId: activeReg.id,
          teamType: tType,
          team,
          patch: { shirtNumber: player.shirtNumber },
        });
        if (!regRes.ok) return { ok: false, error: regRes.error };
        return tType === 'club'
          ? { ok: true, identityId: player.id, clubIds: [activeReg.id] }
          : { ok: true, identityId: player.id, natIds: [activeReg.id] };
      }
      return { ok: true, identityId: player.id };
    });
  };

  // Remove player from THIS squad (releases registration ONLY; never deletes permanent identity)
  const deletePlayerFromSquad = (teamId: string, playerId: string) => {
    releasePlayer(teamId, playerId);
  };

  // Transfer player between CLUBS ONLY (strictly admin & team_type === 'club')
  const transferPlayer = (fromTeamId: string, toTeamId: string, playerId: string) => {
    if (!isAdmin) {
      showToast('Authorised administrator access required for transfers.', 'info');
      return;
    }
    const fromTeam = teams.find((t) => t.id === fromTeamId);
    const toTeam = teams.find((t) => t.id === toTeamId);
    if (!fromTeam || !toTeam) return;
    if (getTeamType(fromTeam) !== 'club' || getTeamType(toTeam) !== 'club') {
      showToast('Transfers are strictly club-to-club only. National teams cannot participate in transfers.', 'info');
      return;
    }
    void transferClubPlayerAction(playerId, fromTeamId, toTeamId);
  };

  // Toggle player injury on permanent PlayerIdentity
  const togglePlayerInjury = (
    teamId: string,
    playerId: string,
    status: 'fit' | 'doubtful' | 'injured',
    returnDate?: string,
    note?: string
  ) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team)) return;

    if (isAdmin) {
      void updatePlayerIdentityProfile(playerId, {
        injuryStatus: status,
        injuryReturnDate: status === 'fit' ? '' : returnDate || 'TBD',
        injuryNote: status === 'fit' ? '' : note || 'Medical evaluation',
      });
      return;
    }

    const ok = applyLocalRegistrationDelta((draft) => {
      const existing = draft.identities.get(playerId);
      if (!existing) return { ok: false, error: 'Player identity not found.' };
      draft.identities.set(playerId, {
        ...existing,
        injuryStatus: status,
        injuryReturnDate: status === 'fit' ? undefined : returnDate || 'TBD',
        injuryNote: status === 'fit' ? undefined : note || 'Medical evaluation',
      });
      return { ok: true, identityId: playerId };
    });

    if (ok) showToast('Medical status updated.', 'info');
  };

  // Update Captain or Vice-Captain independently for Club OR National Team
  const updateCaptaincy = (
    teamId: string,
    role: 'captain' | 'viceCaptain',
    playerId: string | null
  ) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team)) return;
    const tType = getTeamType(team);
    const today = new Date().toISOString().slice(0, 10);
    const activeRegs = getActiveRegistrationsForTeam(registry, team);
    const currentHolder = activeRegs.find((r) =>
      role === 'captain' ? r.isCaptain : r.isViceCaptain
    );
    const targetReg = playerId ? activeRegs.find((r) => r.playerId === playerId) : undefined;

    if (isAdmin) {
      void (async () => {
        if (targetReg) {
          await updateRegistrationAction(
            targetReg.id,
            tType,
            role === 'captain' ? { isCaptain: true } : { isViceCaptain: true }
          );
        } else if (currentHolder) {
          await updateRegistrationAction(
            currentHolder.id,
            tType,
            role === 'captain' ? { isCaptain: false } : { isViceCaptain: false }
          );
        }
      })();
      return;
    }

    const chosenPlayer = playerId ? team.squad.find((p) => p.id === playerId) : undefined;
    const affectedIds: string[] = [];
    applyLocalRegistrationDelta((draft) => {
      const peers = getActiveRegistrationsForTeam(draft, team);
      for (const peer of peers) {
        if (role === 'captain' && peer.isCaptain && peer.playerId !== playerId) {
          updateTeamRegistration(draft, { registrationId: peer.id, teamType: tType, team, patch: { isCaptain: false } });
          affectedIds.push(peer.id);
        }
        if (role === 'viceCaptain' && peer.isViceCaptain && peer.playerId !== playerId) {
          updateTeamRegistration(draft, { registrationId: peer.id, teamType: tType, team, patch: { isViceCaptain: false } });
          affectedIds.push(peer.id);
        }
      }
      if (targetReg) {
        updateTeamRegistration(draft, {
          registrationId: targetReg.id,
          teamType: tType,
          team,
          patch: role === 'captain' ? { isCaptain: true } : { isViceCaptain: true },
        });
        affectedIds.push(targetReg.id);
      }
      return tType === 'club' ? { ok: true, clubIds: affectedIds } : { ok: true, natIds: affectedIds };
    });

    const prevHistory = team.leadershipHistory || [];
    const newHistory = chosenPlayer
      ? [
          {
            id: `lead-${Date.now()}`,
            role: role === 'captain' ? ('C' as const) : ('VC' as const),
            playerName: getPlayerDisplayName(chosenPlayer),
            since: today,
            until: 'present',
          },
          ...prevHistory.map((h) =>
            h.role === (role === 'captain' ? 'C' : 'VC') && h.until === 'present'
              ? { ...h, until: today }
              : h
          ),
        ]
      : prevHistory.map((h) =>
          h.role === (role === 'captain' ? 'C' : 'VC') && h.until === 'present'
            ? { ...h, until: today }
            : h
        );
    updateTeamOverride(team, { leadershipHistory: newHistory });
  };

  // Update both Captain & Vice-Captain independently for Club OR National Team
  const updateLeadershipPair = (
    teamId: string,
    captainId: string | null,
    viceCaptainId: string | null
  ) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team)) return;
    const tType = getTeamType(team);
    const activeRegs = getActiveRegistrationsForTeam(registry, team);
    const capReg = captainId ? activeRegs.find((r) => r.playerId === captainId) : undefined;
    const vcReg =
      viceCaptainId && viceCaptainId !== captainId
        ? activeRegs.find((r) => r.playerId === viceCaptainId)
        : undefined;

    if (isAdmin) {
      void (async () => {
        if (capReg) {
          await updateRegistrationAction(capReg.id, tType, { isCaptain: true });
        } else {
          const oldCap = activeRegs.find((r) => r.isCaptain);
          if (oldCap) await updateRegistrationAction(oldCap.id, tType, { isCaptain: false });
        }
        if (vcReg) {
          await updateRegistrationAction(vcReg.id, tType, { isViceCaptain: true });
        } else {
          const oldVc = activeRegs.find((r) => r.isViceCaptain);
          if (oldVc) await updateRegistrationAction(oldVc.id, tType, { isViceCaptain: false });
        }
      })();
      return;
    }

    const affectedIds: string[] = [];
    applyLocalRegistrationDelta((draft) => {
      for (const r of getActiveRegistrationsForTeam(draft, team)) {
        const wantCap = capReg?.id === r.id;
        const wantVc = vcReg?.id === r.id;
        if (r.isCaptain !== wantCap || r.isViceCaptain !== wantVc) {
          updateTeamRegistration(draft, {
            registrationId: r.id,
            teamType: tType,
            team,
            patch: { isCaptain: wantCap, isViceCaptain: wantVc },
          });
          affectedIds.push(r.id);
        }
      }
      return tType === 'club' ? { ok: true, clubIds: affectedIds } : { ok: true, natIds: affectedIds };
    });

    showToast(`Leadership pair updated for ${team.name}.`, 'gold');
  };

  // Permanent Manager Directory Actions
  const getManagerById = useCallback(
    (managerId: string): Manager | null => {
      return managers.find((m) => m.id === managerId) || null;
    },
    [managers]
  );

  const getAppointmentsForManager = useCallback(
    (managerId: string): ManagerAppointment[] => {
      return [...managerAppointments]
        .filter((a) => a.manager_id === managerId)
        .sort((a, b) => {
          if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
          return (b.start_date || '').localeCompare(a.start_date || '');
        });
    },
    [managerAppointments]
  );

  const getAppointmentsForTeam = useCallback(
    (teamId: string): ManagerAppointment[] => {
      return [...managerAppointments]
        .filter((a) => a.team_id === teamId)
        .sort((a, b) => {
          if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
          return (b.start_date || '').localeCompare(a.start_date || '');
        });
    },
    [managerAppointments]
  );

  const getManagerForTeam = useCallback(
    (team: Team | null | undefined): Manager | null => {
      if (!team) return null;
      const tType = getTeamType(team);
      const appt = managerAppointments.find(
        (a) => a.is_current && a.team_id === team.id && a.team_type === tType
      );
      if (!appt) return null;
      return managers.find((m) => m.id === appt.manager_id) || null;
    },
    [managerAppointments, managers]
  );

  const openManagerProfile = useCallback((managerId: string) => {
    window.dispatchEvent(
      new CustomEvent('dodaeona:navigate-manager', { detail: { managerId } })
    );
  }, []);

  const openManagersDirectory = useCallback(() => {
    setActiveDossierTeamId(null);
    setActiveTab('managers');
    window.dispatchEvent(new CustomEvent('dodaeona:open-managers-directory'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const syncManagerPayloadFromServer = useCallback((data: any) => {
    if (!data) return;
    if (Array.isArray(data.managers)) setManagers(normalizeManagersList(data.managers));
    if (Array.isArray(data.managerAppointments)) setManagerAppointments(data.managerAppointments);
    if (data.teamOverrides && typeof data.teamOverrides === 'object') {
      setTeamOverrides(data.teamOverrides);
    }
    if (Array.isArray(data.customTeams)) {
      setCustomTeams(data.customTeams);
    }
  }, []);

  const createManagerRecord = useCallback(
    async (payload: Record<string, any>): Promise<ActionResponse<Manager>> => {
      if (!isAuthenticated) {
        showToast('Sign in to add a manager to the directory.', 'info');
        return { ok: false, error: 'Sign in required.' };
      }
      const res = await adminApiRequest<{
        ok: boolean;
        manager: Manager;
        managers: Manager[];
        managerAppointments: ManagerAppointment[];
      }>('/api/managers', 'POST', payload);
      if (!res.ok || !res.data?.manager) {
        showToast(res.error || 'Failed to add manager.', 'info');
        return { ok: false, error: res.error };
      }
      syncManagerPayloadFromServer(res.data);
      showToast(`${res.data.manager.name} added to Managers directory.`, 'gold');
      return { ok: true, data: res.data.manager };
    },
    [isAuthenticated, showToast, syncManagerPayloadFromServer]
  );

  const updateManagerRecord = useCallback(
    async (managerId: string, patch: Record<string, any>): Promise<ActionResponse<Manager>> => {
      if (!isAdmin) {
        return { ok: false, error: 'Administrator privileges required to edit manager records.' };
      }
      const res = await adminApiRequest<{
        ok: boolean;
        manager: Manager;
        managers: Manager[];
        managerAppointments: ManagerAppointment[];
        teamOverrides?: Record<string, Team>;
        customTeams?: Team[];
      }>(`/api/managers/${encodeURIComponent(managerId)}`, 'PUT', patch);
      if (!res.ok || !res.data?.manager) {
        showToast(res.error || 'Failed to update manager record.', 'info');
        return { ok: false, error: res.error };
      }
      syncManagerPayloadFromServer(res.data);
      showToast(`Updated record for ${res.data.manager.name}.`, 'success');
      return { ok: true, data: res.data.manager };
    },
    [isAdmin, showToast, syncManagerPayloadFromServer]
  );

  const assignManagerAction = useCallback(
    async (params: {
      manager_id: string;
      team_id: string;
      role?: string;
      start_date?: string;
      competitions?: string[];
      honours?: string[];
      notes?: string;
      verified?: boolean;
    }): Promise<ActionResponse<ManagerAppointment>> => {
      if (!isAdmin) {
        return { ok: false, error: 'Administrator privileges required to assign managers.' };
      }
      const res = await adminApiRequest<{
        ok: boolean;
        appointment: ManagerAppointment;
        managers: Manager[];
        managerAppointments: ManagerAppointment[];
        teamOverrides?: Record<string, Team>;
        customTeams?: Team[];
      }>('/api/managers/assign', 'POST', params);
      if (!res.ok || !res.data?.appointment) {
        showToast(res.error || 'Failed to assign manager.', 'info');
        return { ok: false, error: res.error };
      }
      syncManagerPayloadFromServer(res.data);
      showToast(
        `${res.data.appointment.manager_name} appointed at ${res.data.appointment.team_name}.`,
        'gold'
      );
      return { ok: true, data: res.data.appointment };
    },
    [isAdmin, showToast, syncManagerPayloadFromServer]
  );

  const endAppointmentByIdAction = useCallback(
    async (appointmentId: string, endDate?: string): Promise<ActionResponse<ManagerAppointment>> => {
      if (!isAdmin) {
        return { ok: false, error: 'Administrator privileges required to end appointments.' };
      }
      const res = await adminApiRequest<{
        ok: boolean;
        appointment: ManagerAppointment;
        managers: Manager[];
        managerAppointments: ManagerAppointment[];
        teamOverrides?: Record<string, Team>;
        customTeams?: Team[];
      }>(`/api/manager-appointments/${encodeURIComponent(appointmentId)}/end`, 'POST', {
        end_date: endDate,
      });
      if (!res.ok || !res.data?.appointment) {
        showToast(res.error || 'Failed to end appointment.', 'info');
        return { ok: false, error: res.error };
      }
      syncManagerPayloadFromServer(res.data);
      showToast(
        `Appointment ended for ${res.data.appointment.manager_name} at ${res.data.appointment.team_name}.`,
        'info'
      );
      return { ok: true, data: res.data.appointment };
    },
    [isAdmin, showToast, syncManagerPayloadFromServer]
  );

  const addCareerAppointmentAction = useCallback(
    async (
      managerId: string,
      payload: {
        team_id: string;
        role?: string;
        start_date: string;
        end_date?: string | null;
        is_current?: boolean;
        competitions?: string[];
        honours?: string[];
        notes?: string;
        verified?: boolean;
      }
    ): Promise<ActionResponse<ManagerAppointment>> => {
      if (!isAdmin) {
        return { ok: false, error: 'Administrator privileges required.' };
      }
      const res = await adminApiRequest<{
        ok: boolean;
        appointment: ManagerAppointment;
        managers: Manager[];
        managerAppointments: ManagerAppointment[];
        teamOverrides?: Record<string, Team>;
        customTeams?: Team[];
      }>(`/api/managers/${encodeURIComponent(managerId)}/appointments`, 'POST', payload);
      if (!res.ok || !res.data?.appointment) {
        showToast(res.error || 'Failed to save appointment.', 'info');
        return { ok: false, error: res.error };
      }
      syncManagerPayloadFromServer(res.data);
      showToast(
        `${res.data.appointment.team_name} appointment added for ${res.data.appointment.manager_name}.`,
        'gold'
      );
      return { ok: true, data: res.data.appointment };
    },
    [isAdmin, showToast, syncManagerPayloadFromServer]
  );

  const fetchManagerStatistics = useCallback(
    async (managerId: string): Promise<ManagerStatisticsResponse | null> => {
      try {
        const res = await fetch(`/api/public/managers/${encodeURIComponent(managerId)}/statistics`);
        if (!res.ok) return null;
        const data = await res.json();
        return data?.statistics || null;
      } catch {
        return null;
      }
    },
    []
  );

  const fetchTeamStatistics = useCallback(
    async (options?: {
      teamType?: 'all' | 'club' | 'country';
      gender?: 'all' | 'men' | 'women';
      search?: string;
      onlyWithMatches?: boolean;
    }): Promise<TeamStatisticsResponse> => {
      try {
        const params = new URLSearchParams();
        if (options?.teamType && options.teamType !== 'all') params.set('teamType', options.teamType);
        if (options?.gender && options.gender !== 'all') params.set('gender', options.gender);
        if (options?.search) params.set('search', options.search);
        if (options?.onlyWithMatches) params.set('onlyWithMatches', 'true');
        const qs = params.toString();
        const res = await fetch(`/api/public/teams/statistics${qs ? `?${qs}` : ''}`);
        if (res.ok) {
          const data = (await res.json()) as TeamStatisticsResponse;
          if (data && Array.isArray(data.teams)) {
            return data;
          }
        }
      } catch {
        // fallback to client aggregation if network fails
      }

      const managersByTeam = new Map<string, Manager | null>();
      for (const t of teams) {
        managersByTeam.set(t.id, getManagerForTeam(t));
      }
      return computeTeamStatistics({
        teams,
        simulationMatches,
        competitionMakers,
        competitions,
        managersByTeam,
      });
    },
    [teams, simulationMatches, competitionMakers, competitions, getManagerForTeam]
  );

  const fetchSingleTeamStatistics = useCallback(
    async (teamId: string): Promise<TeamAggregateStatistics | null> => {
      try {
        const res = await fetch(`/api/public/teams/${encodeURIComponent(teamId)}/statistics`);
        if (res.ok) {
          const data = await res.json();
          if (data?.statistics) return data.statistics as TeamAggregateStatistics;
        }
      } catch {
        // fallback to client computation
      }
      const managersByTeam = new Map<string, Manager | null>();
      for (const t of teams) {
        managersByTeam.set(t.id, getManagerForTeam(t));
      }
      const computed = computeTeamStatistics({
        teams,
        simulationMatches,
        competitionMakers,
        competitions,
        managersByTeam,
      });
      return computed.teams.find((entry) => entry.team.id === teamId) || null;
    },
    [teams, simulationMatches, competitionMakers, competitions, getManagerForTeam]
  );

  // Manager / Crest / Overall / Preferred XI / Tactics / Trophies
  const appointManager = (teamId: string, managerName: string, managerProfile?: ManagerProfile) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team)) return;

    const today = new Date().toISOString().slice(0, 10);

    if (isAdmin) {
      void (async () => {
        // Reuse existing permanent Manager by exact name if present, else create one permanent Manager
        const existingMgr = managers.find(
          (m) => m.name.trim().toLowerCase() === managerName.trim().toLowerCase()
        );
        let mgrId = existingMgr?.id;
        if (!mgrId) {
          const created = await createManagerRecord({
            name: managerName.trim(),
            nationality: managerProfile?.nationality || team.country,
            preferred_formation: team.defaultFormation || '4-3-3',
            tactical_style: team.playingStyle || '',
            bio: managerProfile?.bio || '',
            honours: managerProfile?.honours || [],
            status: 'active',
            verified: Boolean(managerProfile?.verified ?? true),
          });
          if (!created.ok || !created.data) return;
          mgrId = created.data.id;
        }
        await assignManagerAction({
          manager_id: mgrId,
          team_id: team.id,
          role: managerProfile?.role || 'head-coach',
          start_date: managerProfile?.appointedSince || today,
          honours: managerProfile?.honours || [],
          verified: Boolean(managerProfile?.verified ?? true),
        });
      })();
      return;
    }

    const existingHistory = team.managerHistory || [];
    const archivedPrev =
      team.manager && team.manager !== 'Vacant' && team.manager !== managerName
        ? [
            {
              id: `mgr-hist-${Date.now()}`,
              name: team.manager,
              role: team.managerProfile?.role || 'Head coach',
              nationality: team.managerProfile?.nationality,
              startDate:
                team.managerProfile?.appointedSince ||
                String(team.managerProfile?.appointedYear || 2023),
              endDate: today,
            },
            ...existingHistory,
          ]
        : existingHistory;

    updateTeamOverride(team, {
      manager: managerName,
      manager_name: managerName,
      manager_since: managerProfile?.appointedSince || today,
      manager_role: managerProfile?.role || 'head-coach',
      managerHistory: archivedPrev,
      managerProfile: managerProfile || {
        name: managerName,
        role: 'Head coach',
        nationality: team.country,
        appointedYear: new Date().getFullYear(),
        appointedSince: today,
        verified: false,
        bio: '',
        previousClubs: [],
        winRate: '0.0%',
        clubStats: { matches: 0, wins: 0, draws: 0, losses: 0, trophies: 0 },
        honours: [],
      },
    });
    showToast(`${managerName} appointed as Manager of ${team.name}.`, 'gold');
  };

  const updateManagerProfile = (teamId: string, managerProfile: ManagerProfile) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team)) return;
    if (isAdmin && team.manager_id) {
      void updateManagerRecord(team.manager_id, {
        name: managerProfile.name,
        nationality: managerProfile.nationality,
        bio: managerProfile.bio || '',
        honours: managerProfile.honours || [],
        verified: managerProfile.verified ?? true,
      });
      return;
    }
    updateTeamOverride(team, {
      manager: managerProfile.name,
      manager_name: managerProfile.name,
      managerProfile,
    });
    showToast(`Manager record updated for ${managerProfile.name}.`, 'success');
  };

  const endManagerAppointment = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team) || !team.manager || team.manager === 'Vacant') return;
    if (isAdmin) {
      const currentAppt = managerAppointments.find(
        (a) => a.team_id === team.id && a.is_current
      );
      if (currentAppt) {
        void endAppointmentByIdAction(currentAppt.id);
        return;
      }
      void adminApiRequest(`/api/teams/${encodeURIComponent(team.id)}/end-manager`, 'POST', {}).then(
        (res) => {
          if (res.ok && res.data) {
            syncManagerPayloadFromServer(res.data);
            showToast(`Appointment ended at ${team.name}. Position is now vacant.`, 'info');
          }
        }
      );
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const archived = {
      id: `mgr-hist-${Date.now()}`,
      name: team.manager,
      role: team.managerProfile?.role || 'Head coach',
      nationality: team.managerProfile?.nationality || team.country,
      startDate:
        team.managerProfile?.appointedSince || String(team.managerProfile?.appointedYear || 2023),
      endDate: today,
    };
    updateTeamOverride(team, {
      manager: '',
      manager_id: null,
      manager_name: null,
      manager_since: null,
      manager_role: null,
      managerProfile: null,
      managerHistory: [archived, ...(team.managerHistory || [])],
    });
    showToast(`Appointment ended for ${archived.name}. Position is now vacant.`, 'info');
  };

  const updateTeamCrest = (teamId: string, crestUrl: string) => {
    if (!isAdmin) return;
    const team = teams.find((t) => t.id === teamId);
    if (!team || !crestUrl.trim()) return;
    updateTeamOverride(team, { crestUrl: crestUrl.trim() });
    showToast(`Crest updated for ${team.name}.`, 'success');
  };

  const updateTeamOverallRating = (teamId: string, newOverall: number) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team)) return;
    const clamped = Math.max(1, Math.min(99, Math.round(newOverall)));
    const detailed = calculateDetailedRatings(team.squad || [], clamped);
    updateTeamOverride(team, detailed);
    showToast(`Overall rating updated for ${team.name} to ${detailed.overallRating} OVR.`, 'success');
  };

  const refreshFootballDatabaseRankings = () => {
    if (!isAdmin) return;
    const nextOverrides: Record<string, Team> = { ...teamOverrides };
    teams.forEach((t) => {
      if (t.isCustom) return;
      const isNat = getTeamType(t) === 'country';
      const fifaOvr = isNat ? getRealFifaRating(t.name, t.country, t.gender) : null;
      const clubEntry = !isNat
        ? getRealFootballDatabaseRating(t.name, t.shortName, t.code, t.league, t.gender, t.overallRating)
        : null;
      const targetOvr = fifaOvr ?? clubEntry?.overall ?? t.overallRating;
      const detailed = calculateDetailedRatings(t.squad, targetOvr);
      nextOverrides[t.id] = {
        ...(nextOverrides[t.id] || t),
        worldRanking: clubEntry?.rank ?? t.worldRanking,
        rankingPoints: clubEntry?.points ?? (fifaOvr ? fifaOvr * 22 : t.rankingPoints),
        rankingUpdateDate: clubEntry?.updateDate ?? t.rankingUpdateDate,
        ...detailed,
      };
    });
    setTeamOverrides(nextOverrides);
    persistTeamsPayloadToServer(nextOverrides, customTeams, deletedTeamIds);
    showToast('Synced rankings across clubs & national teams (highest to lowest)!', 'success');
  };

  const updatePreferredXi = (
    teamId: string,
    xiIds: string[],
    source: 'verified' | 'user-set' | 'estimated' = 'user-set'
  ) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team)) return;
    updateTeamOverride(team, { preferredXiIds: xiIds, preferredXiSource: source });
    showToast(`Preferred XI updated for ${team.name}.`, 'success');
  };

  const resetPreferredXiToAuto = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team)) return;
    const fitPool = team.squad.filter((p) => p.injuryStatus !== 'injured');
    const pool = fitPool.length >= 11 ? fitPool : team.squad;
    const strictXi = generateStrictStartingXi(pool, team.defaultFormation);
    updatePreferredXi(
      teamId,
      strictXi.map((p) => p.id),
      'estimated'
    );
  };

  const updatePenaltyOrder = (
    teamId: string,
    penaltyOrderIds: string[],
    source: 'verified' | 'user-set' = 'user-set'
  ) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team)) return;
    const reconciled = reconcilePenaltyOrderIds(team.squad, penaltyOrderIds, team.id, true);
    updateTeamOverride(team, {
      penaltyOrderIds: reconciled,
      penaltyOrderSource: source,
    });
    showToast(`Penalty kick order saved for ${team.name}.`, 'success');
  };

  const resetPenaltyOrderToVerified = (teamId: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team)) return;
    const verifiedOrder = buildDefaultClubPenaltyOrderIds(team.id, team.squad);
    updateTeamOverride(team, {
      penaltyOrderIds: verifiedOrder,
      penaltyOrderSource: 'verified',
    });
    showToast(`Reset penalty kick order to verified hierarchy for ${team.name}.`, 'success');
  };

  const updateTactics = (teamId: string, tactics: TacticalProfile, defaultFormation?: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || !canManageTeam(team)) return;
    const nextFormation = defaultFormation || team.defaultFormation;
    const formationChanged = nextFormation !== team.defaultFormation;
    const nextXi =
      formationChanged && team.preferredXiSource !== 'user-set'
        ? generateStrictStartingXi(team.squad, nextFormation).map((p) => p.id)
        : team.preferredXiIds;

    updateTeamOverride(team, {
      playingStyle: tactics.playingStyle,
      defaultFormation: nextFormation,
      preferredXiIds: nextXi,
      preferredXiSource:
        formationChanged && team.preferredXiSource !== 'user-set'
          ? 'estimated'
          : team.preferredXiSource,
      tacticalProfile: {
        ...tactics,
        dataStatus: tactics.dataStatus || 'user-set',
      },
    });
    showToast(`Tactical profile saved for ${team.name}.`, 'gold');
  };

  const recordTeamTrophy = (teamId: string, trophy: Omit<TrophyRecord, 'id'>) => {
    if (!isAdmin) return;
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    const newTrophy: TrophyRecord = { ...trophy, id: `tr-${Date.now()}` };
    const nextTrophies = [newTrophy, ...(team.trophies || [])];
    updateTeamOverride(team, {
      trophies: nextTrophies,
      trophiesCount: (team.trophiesCount || 0) + (trophy.count || 1),
    });
    showToast(`${newTrophy.name} added to ${team.name} trophy cabinet.`, 'gold');
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_SIMULATIONS, JSON.stringify(savedSimulations));
    } catch {
      // ignore quota errors
    }
  }, [savedSimulations]);

  const saveSimulationMatch = useCallback(
    (output: CompleteSimulationOutput, customLabel?: string): SavedSimulationPayload => {
      const item: SavedSimulationPayload = {
        id: `saved-${output.homeCode}-${output.awayCode}-${output.seed}-${Date.now()}`,
        savedAt: new Date().toISOString(),
        label:
          customLabel ||
          `${output.homeCode} ${output.homeScore}-${output.awayScore} ${output.awayCode} · ${output.competition.competitionName}`,
        output,
      };
      setSavedSimulations((prev) => [item, ...prev].slice(0, 30));
      showToast('Match telemetry saved cleanly.', 'success');
      return item;
    },
    [showToast]
  );

  const deleteSavedSimulation = useCallback((savedId: string) => {
    setSavedSimulations((prev) => prev.filter((s) => s.id !== savedId));
  }, []);

  const saveScoreboardMatchAction = useCallback(
    async (
      record: ScoreboardMatchRecord
    ): Promise<{ ok: boolean; match?: ScoreboardMatchRecord; error?: string }> => {
      // 1. Instantly update local state and localStorage
      setScoreboardMatches((prev) => [
        record,
        ...prev.filter((m) => m.id !== record.id),
      ]);

      // 2. Persist to server API for cross-device synchronization
      const res = await adminApiRequest<{
        ok: boolean;
        match: ScoreboardMatchRecord;
        matches: ScoreboardMatchRecord[];
      }>('/api/scoreboard/matches', 'POST', { match: record });

      if (res.ok && res.data?.match) {
        setScoreboardMatches((prev) => [
          res.data!.match,
          ...prev.filter((m) => m.id !== record.id && m.id !== res.data!.match.id),
        ]);
        showToast('ScoreBoard match saved to match history.', 'gold');
        return { ok: true, match: res.data.match };
      }

      showToast('ScoreBoard match saved locally.', 'gold');
      return { ok: true, match: record };
    },
    [showToast]
  );

  const deleteScoreboardMatchAction = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      setScoreboardMatches((prev) => prev.filter((m) => m.id !== id));
      const res = await adminApiRequest('/api/scoreboard/matches/' + encodeURIComponent(id), 'DELETE');
      if (!res.ok) {
        showToast('Error removing match from server.', 'info');
        return { ok: false, error: res.error };
      }
      showToast('Match removed from history.', 'info');
      return { ok: true };
    },
    [showToast]
  );

  const recordSimulationMatch = useCallback(
    async (payload: {
      id?: string;
      homeTeamId: string;
      awayTeamId: string;
      homeScore: number;
      awayScore: number;
      halfTimeHomeScore?: number;
      halfTimeAwayScore?: number;
      wentToExtraTime?: boolean;
      penaltySummary?: string;
      seed?: string;
      competitionId?: string;
      competitionName?: string;
      competitionFixtureId?: string;
      venue?: string;
      possessionHome?: number;
      shotsHome?: number;
      shotsAway?: number;
      xgHome?: number;
      xgAway?: number;
      lineupPlayerIds?: { home: string[]; away: string[] };
      events?: SimulationMatchEvent[];
      fullPayload?: CompleteSimulationOutput;
    }) => {
      const home = teams.find((t) => t.id === payload.homeTeamId);
      const away = teams.find((t) => t.id === payload.awayTeamId);
      if (!home || !away || home.id === away.id) return { ok: false };

      const homeMgr = getManagerForTeam(home);
      const awayMgr = getManagerForTeam(away);
      const homeTeamType = getTeamType(home);
      const awayTeamType = getTeamType(away);

      const localMatch: SimulationMatchRecord = {
        id: payload.id || `sim-match-${Date.now()}`,
        homeTeamId: home.id,
        homeTeamName: home.name,
        homeCode: home.code,
        awayTeamId: away.id,
        awayTeamName: away.name,
        awayCode: away.code,
        homeScore: Math.max(0, Number(payload.homeScore) || 0),
        awayScore: Math.max(0, Number(payload.awayScore) || 0),
        halfTimeHomeScore: payload.halfTimeHomeScore,
        halfTimeAwayScore: payload.halfTimeAwayScore,
        wentToExtraTime: payload.wentToExtraTime,
        penaltySummary: payload.penaltySummary,
        seed: payload.seed,
        competitionId:
          payload.competitionId ||
          (homeTeamType === 'country' || awayTeamType === 'country'
            ? 'comp-world-intl'
            : 'comp-intl-club'),
        competitionName:
          payload.competitionName ||
          (homeTeamType === 'country' && awayTeamType === 'country'
            ? 'International Friendly'
            : 'DodaEona Club Exhibition'),
        competitionFixtureId: payload.competitionFixtureId,
        status: 'completed',
        date: new Date().toISOString().slice(0, 10),
        venue: payload.venue || home.stadium || 'Neutral Ground',
        attendance: home.stadiumCapacity || 50000,
        possessionHome:
          typeof payload.possessionHome === 'number' ? Math.round(payload.possessionHome) : 50,
        shotsHome: typeof payload.shotsHome === 'number' ? payload.shotsHome : 0,
        shotsAway: typeof payload.shotsAway === 'number' ? payload.shotsAway : 0,
        xgHome: typeof payload.xgHome === 'number' ? payload.xgHome : 0,
        xgAway: typeof payload.xgAway === 'number' ? payload.xgAway : 0,
        homeManagerId: homeMgr?.id || payload.fullPayload?.homeManagerId,
        awayManagerId: awayMgr?.id || payload.fullPayload?.awayManagerId,
        homeManagerName: homeMgr?.name || home.manager_name || undefined,
        awayManagerName: awayMgr?.name || away.manager_name || undefined,
        homeTeamType,
        awayTeamType,
        lineupPlayerIds: payload.lineupPlayerIds,
        events: payload.events || [],
        fullPayload: payload.fullPayload,
        createdBy: user?.email || 'match-simulator',
      };

      setSimulationMatches((prev) => [localMatch, ...prev]);

      const res = await adminApiRequest<{
        match: SimulationMatchRecord;
        fixtureFilingStatus?: string;
        competitions?: CompetitionRecord[];
        competitionMaker?: CompetitionMakerTournament | null;
        teamOverrides?: Record<string, Team>;
        customTeams?: Team[];
        hallOfFame?: CompetitionEditionHistoryEntry[];
      }>('/api/simulation/matches', 'POST', {
        ...payload,
        homeManagerId: localMatch.homeManagerId,
        awayManagerId: localMatch.awayManagerId,
        homeManagerName: localMatch.homeManagerName,
        awayManagerName: localMatch.awayManagerName,
      });

      if (res.ok && res.data?.match) {
        setSimulationMatches((prev) => [
          res.data!.match,
          ...prev.filter((m) => m.id !== localMatch.id && m.id !== res.data!.match.id),
        ]);
        if (Array.isArray(res.data.competitions)) {
          setCompetitions(res.data.competitions);
        }
        if (res.data.competitionMaker) {
          const updatedComp = res.data.competitionMaker;
          setCompetitionMakers((prev) =>
            prev.map((c) => (c.id === updatedComp.id ? updatedComp : c))
          );
        }
        if (res.data.teamOverrides) setTeamOverrides(res.data.teamOverrides);
        if (Array.isArray(res.data.customTeams)) setCustomTeams(res.data.customTeams);
        if (Array.isArray(res.data.hallOfFame)) setHallOfFame(res.data.hallOfFame);
        return {
          ok: true,
          match: res.data.match,
          fixtureFilingStatus: res.data.fixtureFilingStatus,
        };
      }
      return { ok: true, match: localMatch };
    },
    [teams, user?.email, getManagerForTeam]
  );

  // =========================================================================
  // COMPETITION MAKER ACTIONS
  // =========================================================================
  const refreshCompetitionMakers = useCallback(async () => {
    try {
      const res = await fetch('/api/competition-maker');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.competitions)) {
        const serverList = data.competitions as CompetitionMakerTournament[];
        setCompetitionMakers((prev) => {
          const serverMap = new Map(serverList.map((c) => [c.id, c]));
          const merged = [...serverList];
          for (const localComp of prev) {
            if (!serverMap.has(localComp.id)) {
              merged.push(localComp);
            }
          }
          return merged;
        });
      }
      if (Array.isArray(data?.customTrophies)) {
        setCompetitionTrophies(data.customTrophies);
      }
      if (Array.isArray(data?.hallOfFame)) {
        setHallOfFame(data.hallOfFame);
      }
    } catch {
      // silent fallback
    }
  }, []);

  const returnToTournamentHub = useCallback(
    (competitionId: string) => {
      if (!competitionId) return;
      setPendingTournamentMatch(null);
      const targetPath = `/match-centre/tournaments/${encodeURIComponent(competitionId)}`;
      if (typeof window !== 'undefined') {
        if (window.location.pathname !== targetPath) {
          window.history.pushState({}, '', targetPath);
        }
        window.dispatchEvent(new PopStateEvent('popstate'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setActiveTab('competitions');
      void refreshCompetitionMakers();
    },
    [refreshCompetitionMakers]
  );

  const createCompetitionMaker = useCallback(
    async (payload: {
      name: string;
      shortName: string;
      season: string;
      description: string;
      customLogoUrl?: string;
      presetId: TournamentPresetId;
      teamScope: TeamScopeMode;
      teamIds: string[];
      tieBreakers: TieBreakerKey[];
      homeAdvantageBoost: number;
      preventSameCountry?: boolean;
      trophy: TrophyDesignConfig;
      stages: TournamentStageConfig[];
    }): Promise<ActionResponse<CompetitionMakerTournament>> => {
      const res = await adminApiRequest<{
        ok: boolean;
        competition: CompetitionMakerTournament;
        customTrophies?: TrophyDesignConfig[];
      }>('/api/competition-maker', 'POST', payload);
      if (!res.ok || !res.data?.competition) {
        showToast(res.error || 'Could not create competition.', 'info');
        return { ok: false, error: res.error };
      }
      const created = res.data.competition;
      setCompetitionMakers((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      if (Array.isArray(res.data.customTrophies)) {
        setCompetitionTrophies(res.data.customTrophies);
      }
      showToast(`${created.name} created and drawn.`, 'gold');
      return { ok: true, data: created };
    },
    [showToast]
  );

  const updateCompetitionMaker = useCallback(
    async (
      id: string,
      patch: Partial<
        Pick<
          CompetitionMakerTournament,
          | 'name'
          | 'shortName'
          | 'season'
          | 'description'
          | 'customLogoUrl'
          | 'tieBreakers'
          | 'homeAdvantageBoost'
          | 'trophy'
        >
      >
    ): Promise<ActionResponse<CompetitionMakerTournament>> => {
      const prevComp = competitionMakers.find((c) => c.id === id);
      const res = await adminApiRequest<{
        ok: boolean;
        competition: CompetitionMakerTournament;
      }>(`/api/competition-maker/${encodeURIComponent(id)}`, 'PUT', {
        ...patch,
        tournamentSnapshot: prevComp,
      });
      if (!res.ok || !res.data?.competition) {
        if (prevComp) {
          const localUpdated: CompetitionMakerTournament = {
            ...prevComp,
            ...patch,
            updatedAt: new Date().toISOString(),
          };
          setCompetitionMakers((prev) => prev.map((c) => (c.id === id ? localUpdated : c)));
          showToast('Competition settings updated.', 'success');
          return { ok: true, data: localUpdated };
        }
        return { ok: false, error: res.error };
      }
      const updated = res.data.competition;
      setCompetitionMakers((prev) => prev.map((c) => (c.id === id ? updated : c)));
      showToast('Competition settings updated.', 'success');
      return { ok: true, data: updated };
    },
    [competitionMakers, showToast]
  );

  const deleteCompetitionMaker = useCallback(
    async (id: string, revokeTrophy = false): Promise<ActionResponse<void>> => {
      const url = `/api/competition-maker/${encodeURIComponent(id)}${revokeTrophy ? '?revokeTrophy=true' : ''}`;
      const res = await adminApiRequest<{
        ok: boolean;
        competitions?: CompetitionMakerTournament[];
        teamOverrides?: Record<string, Team>;
        customTeams?: Team[];
        hallOfFame?: CompetitionEditionHistoryEntry[];
      }>(url, 'DELETE');
      setCompetitionMakers((prev) => prev.filter((c) => c.id !== id));
      if (res.data?.teamOverrides) setTeamOverrides(res.data.teamOverrides);
      if (Array.isArray(res.data?.customTeams)) setCustomTeams(res.data.customTeams);
      if (Array.isArray(res.data?.hallOfFame)) setHallOfFame(res.data.hallOfFame);
      showToast('Competition removed.', 'info');
      return { ok: true };
    },
    [showToast]
  );

  const drawCompetitionStage = useCallback(
    async (
      id: string,
      params: {
        stageOrder: number;
        mode?: 'seeded' | 'bracket' | 'random' | 'official';
        customGroups?: TournamentGroup[];
        preventSameCountry?: boolean;
      }
    ): Promise<ActionResponse<CompetitionMakerTournament>> => {
      const prevComp = competitionMakers.find((c) => c.id === id);
      const res = await adminApiRequest<{
        ok: boolean;
        competition: CompetitionMakerTournament;
        drawWarning?: string;
      }>(`/api/competition-maker/${encodeURIComponent(id)}/draw`, 'POST', {
        ...params,
        tournamentSnapshot: prevComp,
      });
      if (!res.ok || !res.data?.competition) {
        if (prevComp) {
          const teamsMap = new Map(teams.map((t) => [t.id, t]));
          const drawn = performStageDraw(
            prevComp,
            params.stageOrder,
            teamsMap,
            params.mode,
            params.customGroups,
            { preventSameCountry: params.preventSameCountry }
          );
          setCompetitionMakers((prev) => prev.map((c) => (c.id === id ? drawn : c)));
          showToast('Stage draw updated.', 'gold');
          return { ok: true, data: drawn };
        }
        showToast(res.error || 'Could not execute stage draw.', 'info');
        return { ok: false, error: res.error };
      }
      const updated = res.data.competition;
      setCompetitionMakers((prev) => prev.map((c) => (c.id === id ? updated : c)));
      showToast(
        res.data.drawWarning ? 'Draw completed with country pairing fallback.' : 'Stage draw updated.',
        res.data.drawWarning ? 'info' : 'gold'
      );
      return { ok: true, data: updated };
    },
    [competitionMakers, teams, showToast]
  );

  const simulateCompetitionAction = useCallback(
    async (
      id: string,
      params:
        | { fixtureId: string; seed?: string }
        | {
            scope: 'match' | 'matchday' | 'stage' | 'knockout' | 'tournament';
            stageOrder?: number;
            roundIndex?: number;
          }
    ): Promise<ActionResponse<CompetitionMakerTournament>> => {
      const prevComp = competitionMakers.find((c) => c.id === id);
      const wasCompleted = prevComp?.status === 'completed';

      const res = await adminApiRequest<{
        ok: boolean;
        competition: CompetitionMakerTournament;
        teamOverrides?: Record<string, Team>;
        customTeams?: Team[];
        hallOfFame?: CompetitionEditionHistoryEntry[];
        customTrophies?: TrophyDesignConfig[];
      }>(`/api/competition-maker/${encodeURIComponent(id)}/simulate`, 'POST', {
        ...params,
        tournamentSnapshot: prevComp,
      });

      let updated: CompetitionMakerTournament | undefined = res.data?.competition;

      if ((!res.ok || !updated) && prevComp) {
        const teamsMap = new Map(teams.map((t) => [t.id, t]));
        const managersByTeam = new Map<string, Manager | null>();
        for (const t of teams) {
          managersByTeam.set(t.id, getManagerForTeam(t));
        }
        if ('fixtureId' in params && params.fixtureId) {
          updated = simulateCompetitionFixture(
            prevComp,
            params.fixtureId,
            teamsMap,
            managersByTeam,
            params.seed
          );
        } else if ('scope' in params) {
          updated = simulateCompetitionBatch(
            prevComp,
            {
              scope: params.scope,
              stageOrder: params.stageOrder,
              roundIndex: params.roundIndex,
            },
            teamsMap,
            managersByTeam
          );
        }
      }

      if (!updated) {
        showToast(res.error || 'Simulation failed.', 'info');
        return { ok: false, error: res.error };
      }

      setCompetitionMakers((prev) => prev.map((c) => (c.id === id ? updated! : c)));
      if (res.data?.teamOverrides) setTeamOverrides(res.data.teamOverrides);
      if (Array.isArray(res.data?.customTeams)) setCustomTeams(res.data.customTeams);
      if (Array.isArray(res.data?.hallOfFame)) setHallOfFame(res.data.hallOfFame);
      if (Array.isArray(res.data?.customTrophies) && res.data.customTrophies.length > 0) {
        setCompetitionTrophies(res.data.customTrophies);
      }

      if (!wasCompleted && updated.status === 'completed' && updated.champion) {
        showToast(
          `${updated.champion.teamName} won ${updated.name} (${updated.trophy.name} awarded)!`,
          'gold'
        );
      }
      return { ok: true, data: updated };
    },
    [competitionMakers, teams, getManagerForTeam, showToast]
  );

  const importMatchIntoCompetition = useCallback(
    async (
      id: string,
      params: { fixtureId: string; simulationMatchId: string }
    ): Promise<ActionResponse<CompetitionMakerTournament>> => {
      const prevComp = competitionMakers.find((c) => c.id === id);
      const res = await adminApiRequest<{
        ok: boolean;
        competition: CompetitionMakerTournament;
        teamOverrides?: Record<string, Team>;
        customTeams?: Team[];
        hallOfFame?: CompetitionEditionHistoryEntry[];
        customTrophies?: TrophyDesignConfig[];
      }>(`/api/competition-maker/${encodeURIComponent(id)}/import-match`, 'POST', {
        ...params,
        tournamentSnapshot: prevComp,
      });
      if (!res.ok || !res.data?.competition) {
        const simRecord = simulationMatches.find((m) => m.id === params.simulationMatchId);
        if (prevComp && simRecord) {
          const teamsMap = new Map(teams.map((t) => [t.id, t]));
          const localRes = importSimulationIntoFixture(
            prevComp,
            params.fixtureId,
            simRecord,
            teamsMap
          );
          if (localRes.ok) {
            setCompetitionMakers((prev) =>
              prev.map((c) => (c.id === id ? localRes.tournament : c))
            );
            showToast('Recorded match imported into tournament fixture.', 'gold');
            return { ok: true, data: localRes.tournament };
          }
        }
        showToast(res.error || 'Could not import match result.', 'info');
        return { ok: false, error: res.error };
      }
      const updated = res.data.competition;
      setCompetitionMakers((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (res.data.teamOverrides) setTeamOverrides(res.data.teamOverrides);
      if (Array.isArray(res.data.customTeams)) setCustomTeams(res.data.customTeams);
      if (Array.isArray(res.data.hallOfFame)) setHallOfFame(res.data.hallOfFame);
      showToast('Recorded match imported into tournament fixture.', 'gold');
      return { ok: true, data: updated };
    },
    [competitionMakers, simulationMatches, teams, showToast]
  );

  const resetCompetitionAction = useCallback(
    async (
      id: string,
      params: { scope: 'fixture' | 'stage' | 'tournament'; fixtureId?: string; stageOrder?: number }
    ): Promise<ActionResponse<CompetitionMakerTournament>> => {
      const prevComp = competitionMakers.find((c) => c.id === id);
      const res = await adminApiRequest<{
        ok: boolean;
        competition: CompetitionMakerTournament;
        teamOverrides?: Record<string, Team>;
        customTeams?: Team[];
        hallOfFame?: CompetitionEditionHistoryEntry[];
      }>(`/api/competition-maker/${encodeURIComponent(id)}/reset`, 'POST', {
        ...params,
        tournamentSnapshot: prevComp,
      });
      if (!res.ok || !res.data?.competition) {
        if (prevComp) {
          const teamsMap = new Map(teams.map((t) => [t.id, t]));
          const { tournament: resetLocal } = resetCompetitionScope(prevComp, params, teamsMap);
          setCompetitionMakers((prev) => prev.map((c) => (c.id === id ? resetLocal : c)));
          showToast('Competition state safely reset for replay.', 'info');
          return { ok: true, data: resetLocal };
        }
        showToast(res.error || 'Could not reset competition scope.', 'info');
        return { ok: false, error: res.error };
      }
      const updated = res.data.competition;
      setCompetitionMakers((prev) => prev.map((c) => (c.id === id ? updated : c)));
      if (res.data.teamOverrides) setTeamOverrides(res.data.teamOverrides);
      if (Array.isArray(res.data.customTeams)) setCustomTeams(res.data.customTeams);
      if (Array.isArray(res.data.hallOfFame)) setHallOfFame(res.data.hallOfFame);
      showToast('Competition state safely reset for replay.', 'info');
      return { ok: true, data: updated };
    },
    [competitionMakers, teams, showToast]
  );

  const saveCustomTrophyDesign = useCallback(
    async (trophy: Partial<TrophyDesignConfig>): Promise<ActionResponse<TrophyDesignConfig>> => {
      const targetId =
        trophy.id && String(trophy.id).trim()
          ? String(trophy.id).trim()
          : `trophy-custom-${Date.now()}`;
      const existing = competitionTrophies.find((t) => t.id === targetId);
      const optimistic: TrophyDesignConfig = {
        id: targetId,
        presetId: trophy.presetId ?? existing?.presetId,
        name: String(trophy.name || existing?.name || 'Custom Trophy').trim().slice(0, 80),
        category: trophy.category || existing?.category || 'Other',
        displayStyle:
          trophy.displayStyle ||
          existing?.displayStyle ||
          (trophy.material === 'silver'
            ? 'silver'
            : trophy.material === 'crystal'
            ? 'crystal'
            : trophy.material === 'metal'
            ? 'metal'
            : 'gold'),
        engraving: String(trophy.engraving || existing?.engraving || 'CHAMPIONS').trim().slice(0, 80),
        silhouette: trophy.silhouette || existing?.silhouette || 'chalice',
        material: trophy.material || existing?.material || 'gold',
        primaryColor: String(trophy.primaryColor || existing?.primaryColor || '#F59E0B'),
        accentColor: String(trophy.accentColor || existing?.accentColor || '#7ADBF0'),
        prestigeTier: trophy.prestigeTier || existing?.prestigeTier || 'Major',
        imageUrl:
          typeof trophy.imageUrl === 'string' && trophy.imageUrl.trim()
            ? trophy.imageUrl.trim()
            : existing?.imageUrl,
        isCustom: existing ? existing.isCustom : true,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };

      const res = await adminApiRequest<{
        ok: boolean;
        trophy: TrophyDesignConfig;
        customTrophies: TrophyDesignConfig[];
      }>('/api/competition-maker/trophies', 'POST', { trophy: optimistic });

      if (res.ok && res.data?.trophy) {
        if (Array.isArray(res.data.customTrophies)) {
          setCompetitionTrophies(res.data.customTrophies);
        }
        showToast(
          existing
            ? `${res.data.trophy.name} updated in Trophy Gallery.`
            : `${res.data.trophy.name} added to Trophy Gallery.`,
          'gold'
        );
        return { ok: true, data: res.data.trophy };
      }

      if (isAdmin) {
        setCompetitionTrophies((prev) => {
          const idx = prev.findIndex((t) => t.id === optimistic.id);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = optimistic;
            return next;
          }
          return [optimistic, ...prev];
        });
        showToast(
          existing
            ? `${optimistic.name} updated in Trophy Gallery.`
            : `${optimistic.name} added to Trophy Gallery.`,
          'gold'
        );
        return { ok: true, data: optimistic };
      }

      return { ok: false, error: res.error || 'Admin permission required.' };
    },
    [competitionTrophies, isAdmin, showToast]
  );

  const deleteTrophyDesign = useCallback(
    async (trophyId: string): Promise<ActionResponse<void>> => {
      if (!isAdmin) {
        return { ok: false, error: 'Admin permission required.' };
      }
      const target = competitionTrophies.find((t) => t.id === trophyId);
      setCompetitionTrophies((prev) => prev.filter((t) => t.id !== trophyId));
      const res = await adminApiRequest<{
        ok: boolean;
        customTrophies?: TrophyDesignConfig[];
      }>(`/api/competition-maker/trophies/${encodeURIComponent(trophyId)}`, 'DELETE');
      if (res.ok && Array.isArray(res.data?.customTrophies)) {
        setCompetitionTrophies(res.data.customTrophies);
      }
      showToast(
        target ? `${target.name} removed from Trophy Gallery.` : 'Trophy removed from Gallery.',
        'info'
      );
      return { ok: true };
    },
    [competitionTrophies, isAdmin, showToast]
  );

  // Backward compatibility filter state
  const [teamType, setTeamType] = useState<TeamType>('club');
  const [filters, setFilters] = useState<TeamFilterState>({
    teamType: 'club',
    searchQuery: '',
    country: 'all',
    league: 'all',
    confederation: 'all',
    gender: 'all',
    clubType: 'all',
    ratingRange: 'all',
    sortBy: 'rating-desc',
  });

  const resetFilters = () => {
    setSearchQuery('');
    setLeagueFilterState('all');
    setConfederationFilterState('all');
    setViewChipState('all-teams');
    setOrderingState('listed');
  };

  return (
    <MatchCentreContext.Provider
      value={{
        teams,
        freeAgents,
        registry,
        simulationMatches,
        scoreboardMatches,
        competitions,
        competitionMakers,
        competitionTrophies,
        hallOfFame,
        refreshCompetitionMakers,
        createCompetitionMaker,
        updateCompetitionMaker,
        deleteCompetitionMaker,
        drawCompetitionStage,
        simulateCompetitionAction,
        importMatchIntoCompetition,
        resetCompetitionAction,
        saveCustomTrophyDesign,
        deleteTrophyDesign,
        savedSimulations,
        refreshRegistry,
        activeTab,
        setActiveTab,
        teamsSectionTab,
        setTeamsSectionTab,
        selectedStadiumClubId,
        openTeamStadium,
        openLeagueDirectory,
        clearSelectedStadiumClubId,
        pendingSimulationToOpen,
        openSimulationReport,
        clearPendingSimulation,
        pendingTournamentMatch,
        launchTournamentMatchInSimulator,
        clearPendingTournamentMatch,
        returnToTournamentHub,
        viewChip,
        setViewChip,
        ordering,
        setOrdering,
        searchQuery,
        setSearchQuery,
        debouncedSearchQuery,
        leagueFilter,
        setLeagueFilter,
        representedLeagues,
        confederationFilter,
        setConfederationFilter,
        representedConfederations,
        counts: {
          ...counts,
          activeResults: viewChip === 'free-agents' ? filteredFreeAgents.length : filteredTeams.length,
        },
        visibleTeamsCount,
        loadMoreTeams,
        hasMoreTeams,
        visibleFreeAgentsCount,
        loadMoreFreeAgents,
        hasMoreFreeAgents,
        filteredTeams,
        filteredFreeAgents,
        selection,
        selectTeam,
        deselectTeam,
        swapSelections,
        clearSelections,
        activeDossierTeam,
        activeDossierTab,
        openDossier,
        openTeamById,
        closeDossier,
        setActiveDossierTab,
        managers,
        managerAppointments,
        getManagerById,
        getAppointmentsForManager,
        getAppointmentsForTeam,
        getManagerForTeam,
        openManagerProfile,
        openManagersDirectory,
        createManagerRecord,
        updateManagerRecord,
        assignManagerAction,
        endAppointmentByIdAction,
        addCareerAppointmentAction,
        fetchManagerStatistics,
        fetchTeamStatistics,
        fetchSingleTeamStatistics,
        getPlayerProfile,
        openPlayerProfile,
        createPlayerIdentityProfile,
        updatePlayerIdentityProfile,
        deletePlayerIdentityProfile,
        registerPlayerToTeamAction,
        updateRegistrationAction,
        releaseRegistrationAction,
        removeRegistrationAction,
        transferClubPlayerAction,
        callUpPlayerToNation,
        retirePlayerFromNationAction,
        unretirePlayerFromNationAction,
        changePlayerNationAction,
        selectedTeamProfile,
        openTeamProfile,
        closeTeamProfile,
        comparisonTeams,
        openComparison,
        closeComparison,
        compareTeamIds,
        setCompareTeamIds,
        pinnedCompareTeamId,
        openCompareTeams,
        togglePinCompareTeam,
        clearPinnedCompareTeam,
        canManageTeam,
        isCreateModalOpen,
        editingTeam,
        openCreateModal,
        closeCreateModal,
        saveTeam,
        deleteTeam,
        signFreeAgent,
        releasePlayer,
        addPlayerToSquad,
        updatePlayerInSquad,
        deletePlayerFromSquad,
        transferPlayer,
        togglePlayerInjury,
        updateCaptaincy,
        updateLeadershipPair,
        updateTeamCrest,
        updateTeamOverallRating,
        appointManager,
        updateManagerProfile,
        endManagerAppointment,
        updatePreferredXi,
        resetPreferredXiToAuto,
        updatePenaltyOrder,
        resetPenaltyOrderToVerified,
        updateTactics,
        recordTeamTrophy,
        refreshFootballDatabaseRankings,
        recordSimulationMatch,
        saveSimulationMatch,
        deleteSavedSimulation,
        saveScoreboardMatchAction,
        deleteScoreboardMatchAction,
        toast,
        showToast,
        teamType,
        setTeamType,
        filters,
        setFilters,
        resetFilters,
      }}
    >
      {children}
    </MatchCentreContext.Provider>
  );
};

export const useMatchCentre = () => {
  const context = useContext(MatchCentreContext);
  if (!context) {
    throw new Error('useMatchCentre must be used within a MatchCentreProvider');
  }
  return context;
};
