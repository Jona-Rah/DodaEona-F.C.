import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Award,
  Crown,
  FastForward,
  Globe,
  LayoutDashboard,
  Layers,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import type {
  CompetitionMakerTournament,
  TournamentPresetId,
  TrophyDesignConfig,
} from '../../../types/competitionMaker';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import {
  autoPickTeamsForPreset,
  COMPETITION_PRESETS,
  UCL_36_CLUB_IDS,
  WORLD_CUP_2026_TEAM_IDS,
} from '../../../utils/competitionEngine';
import { TeamEmblem } from '../TeamEmblem';
import { TrophyArtwork } from './TrophyArtwork';
import { TrophyGalleryModal } from './TrophyGalleryModal';
import { TrophyGalleryView } from './TrophyGalleryView';
import { TournamentWizard } from './TournamentWizard';
import { CompetitionHubPage } from './CompetitionHubPage';
import { WinnerCelebrationModal, WinnerCoronationBanner } from './WinnerCelebrationModal';
import { normalizeDatabaseSearchText } from '../../../utils/globalDatabaseSearch';

type SubRouteState =
  | { view: 'directory' }
  | { view: 'new' }
  | { view: 'detail'; id: string };

type MakerTopTab = 'dashboard' | 'structure' | 'gallery';

function parseTournamentSubRoute(pathname: string): SubRouteState {
  const clean = pathname.replace(/\/+$/, '');
  if (clean === '/match-centre/tournaments/new') {
    return { view: 'new' };
  }
  const match = clean.match(/^\/match-centre\/tournaments\/([^/]+)$/);
  if (match && match[1] && match[1] !== 'new') {
    return { view: 'detail', id: decodeURIComponent(match[1]) };
  }
  return { view: 'directory' };
}

export const TournamentMakerPage: React.FC = () => {
  const {
    teams,
    competitionMakers,
    hallOfFame,
    competitionTrophies,
    refreshCompetitionMakers,
    createCompetitionMaker,
    simulateCompetitionAction,
    deleteCompetitionMaker,
    openTeamById,
  } = useMatchCentre();

  const [subRoute, setSubRoute] = useState<SubRouteState>(() =>
    typeof window !== 'undefined'
      ? parseTournamentSubRoute(window.location.pathname)
      : { view: 'directory' }
  );
  const [activeMakerTab, setActiveMakerTab] = useState<MakerTopTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [statusFilter, setStatusFilter] = useState<'all' | 'in-progress' | 'completed'>('all');
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryTab, setGalleryTab] = useState<'trophies' | 'hall-of-fame'>('trophies');
  const [wizardInitialTrophy, setWizardInitialTrophy] = useState<TrophyDesignConfig | null>(null);
  const [quickCreatingPreset, setQuickCreatingPreset] = useState<TournamentPresetId | null>(null);
  const [simulatingCompId, setSimulatingCompId] = useState<string | null>(null);

  // Winner Celebration Animation state for Dashboard & Directory
  const [celebratingTournamentId, setCelebratingTournamentId] = useState<string | null>(null);
  const [spotlightChampionCompId, setSpotlightChampionCompId] = useState<string | null>(null);
  const knownChampionCompIdsRef = useRef<Set<string>>(new Set());
  const initializedChampionsRef = useRef(false);

  const teamsMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  useEffect(() => {
    void refreshCompetitionMakers();
  }, [refreshCompetitionMakers]);

  useEffect(() => {
    const syncFromLocation = () => {
      setSubRoute(parseTournamentSubRoute(window.location.pathname));
    };
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, []);

  // Automatically trigger Winner Celebration Modal when any tournament newly crowns a champion
  useEffect(() => {
    const crowned = competitionMakers.filter((c) => Boolean(c.champion?.teamId));
    if (!initializedChampionsRef.current) {
      for (const c of crowned) {
        knownChampionCompIdsRef.current.add(c.id);
      }
      if (crowned.length > 0 && !spotlightChampionCompId) {
        setSpotlightChampionCompId(crowned[0].id);
      }
      if (competitionMakers.length > 0) {
        initializedChampionsRef.current = true;
      }
      return;
    }

    for (const c of crowned) {
      if (!knownChampionCompIdsRef.current.has(c.id)) {
        knownChampionCompIdsRef.current.add(c.id);
        setSpotlightChampionCompId(c.id);
        setCelebratingTournamentId(c.id);
      }
    }
  }, [competitionMakers, spotlightChampionCompId]);

  const navigateSubRoute = (next: SubRouteState) => {
    setSubRoute(next);
    if (typeof window !== 'undefined') {
      const targetPath =
        next.view === 'new'
          ? '/match-centre/tournaments/new'
          : next.view === 'detail'
          ? `/match-centre/tournaments/${encodeURIComponent(next.id)}`
          : '/match-centre/tournaments';
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const selectedCompetition = useMemo(
    () =>
      subRoute.view === 'detail'
        ? competitionMakers.find((c) => c.id === subRoute.id) || null
        : null,
    [competitionMakers, subRoute]
  );

  const crownedCompetitions = useMemo(
    () =>
      competitionMakers
        .filter((c) => Boolean(c.champion))
        .sort((a, b) =>
          (b.champion?.awardedAt || b.updatedAt).localeCompare(
            a.champion?.awardedAt || a.updatedAt
          )
        ),
    [competitionMakers]
  );

  const activeCompetitions = useMemo(
    () => competitionMakers.filter((c) => c.status !== 'completed'),
    [competitionMakers]
  );

  const spotlightChampionTournament = useMemo(() => {
    if (crownedCompetitions.length === 0) return null;
    return (
      crownedCompetitions.find((c) => c.id === spotlightChampionCompId) ||
      crownedCompetitions[0]
    );
  }, [crownedCompetitions, spotlightChampionCompId]);

  const celebratingTournament = useMemo(
    () =>
      celebratingTournamentId
        ? competitionMakers.find((c) => c.id === celebratingTournamentId) || null
        : null,
    [competitionMakers, celebratingTournamentId]
  );

  const dashboardMetrics = useMemo(() => {
    let totalMatches = 0;
    let completedMatches = 0;
    let totalGoals = 0;
    for (const comp of competitionMakers) {
      for (const stage of comp.stages) {
        for (const f of stage.fixtures) {
          totalMatches += 1;
          if (f.status === 'completed') {
            completedMatches += 1;
            totalGoals += (f.homeScore ?? 0) + (f.awayScore ?? 0);
          }
        }
      }
    }
    return {
      totalCompetitions: competitionMakers.length,
      activeCount: activeCompetitions.length,
      crownedCount: crownedCompetitions.length,
      totalMatches,
      completedMatches,
      totalGoals,
    };
  }, [competitionMakers, activeCompetitions.length, crownedCompetitions.length]);

  const filteredCompetitions = useMemo(() => {
    const q = normalizeDatabaseSearchText(deferredSearchQuery);
    return competitionMakers.filter((c) => {
      if (statusFilter === 'completed' && c.status !== 'completed') return false;
      if (statusFilter === 'in-progress' && c.status === 'completed') return false;
      if (!q) return true;
      return (
        normalizeDatabaseSearchText(c.name).includes(q) ||
        normalizeDatabaseSearchText(c.season).includes(q) ||
        normalizeDatabaseSearchText(c.shortName).includes(q)
      );
    });
  }, [competitionMakers, deferredSearchQuery, statusFilter]);

  const handleOneClickLaunch = async (presetId: 'world-cup-2026' | 'ucl-36' | 'domestic-league') => {
    if (quickCreatingPreset) return;
    setQuickCreatingPreset(presetId);
    const def = COMPETITION_PRESETS[presetId];
    let pickedIds: string[] = [];

    if (presetId === 'world-cup-2026') {
      pickedIds = WORLD_CUP_2026_TEAM_IDS.filter((id) => teamsMap.has(id));
      if (pickedIds.length < 48) {
        pickedIds = autoPickTeamsForPreset('world-cup-2026', teams, 48).map((t) => t.id);
      }
    } else if (presetId === 'ucl-36') {
      pickedIds = UCL_36_CLUB_IDS.filter((id) => teamsMap.has(id));
      if (pickedIds.length < 36) {
        pickedIds = autoPickTeamsForPreset('ucl-36', teams, 36).map((t) => t.id);
      }
    } else {
      pickedIds = autoPickTeamsForPreset('domestic-league', teams, 20).map((t) => t.id);
    }

    const galleryTrophy =
      competitionTrophies.find(
        (t) => t.id === def.defaultTrophy.id || t.presetId === presetId
      ) || def.defaultTrophy;

    const res = await createCompetitionMaker({
      name:
        presetId === 'world-cup-2026'
          ? 'FIFA World Cup 2026'
          : presetId === 'ucl-36'
          ? 'UEFA Champions League'
          : 'Domestic Premier League',
      shortName: def.shortName,
      season: presetId === 'world-cup-2026' ? '2026' : '2026/27',
      description: def.description,
      presetId,
      teamScope: def.teamScope,
      teamIds: pickedIds,
      tieBreakers: def.tieBreakers,
      homeAdvantageBoost: def.homeAdvantageBoost,
      preventSameCountry: presetId === 'world-cup-2026',
      trophy: galleryTrophy,
      stages: def.buildStages(pickedIds.length),
    });

    setQuickCreatingPreset(null);
    if (res.ok && res.data) {
      navigateSubRoute({ view: 'detail', id: res.data.id });
    }
  };

  const handleQuickCrownTournament = async (compId: string) => {
    if (simulatingCompId) return;
    setSimulatingCompId(compId);
    const res = await simulateCompetitionAction(compId, { scope: 'tournament' });
    setSimulatingCompId(null);
    if (res.ok && res.data?.champion) {
      knownChampionCompIdsRef.current.add(res.data.id);
      setSpotlightChampionCompId(res.data.id);
      setCelebratingTournamentId(res.data.id);
    }
  };

  if (subRoute.view === 'detail' && selectedCompetition) {
    return (
      <>
        <CompetitionHubPage
          tournament={selectedCompetition}
          onBackToDirectory={() => navigateSubRoute({ view: 'directory' })}
          onOpenHallOfFame={() => {
            setGalleryTab('hall-of-fame');
            setGalleryOpen(true);
          }}
        />
        <TrophyGalleryModal
          isOpen={galleryOpen}
          initialTab={galleryTab}
          onClose={() => setGalleryOpen(false)}
          onSelectTrophyForNewCompetition={(tr) => {
            setWizardInitialTrophy(tr);
            setActiveMakerTab('structure');
            navigateSubRoute({ view: 'new' });
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      {/* Directory Hero Header + Primary Three-Tab Navigation Bar */}
      <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-gradient-to-r from-[#091224] via-[#0B111E] to-[#1A140B] light:from-slate-900 light:to-slate-800 p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full border border-[#7ADBF0]/30 bg-[#7ADBF0]/10 font-mono text-[10px] uppercase tracking-[0.18em] text-[#7ADBF0]">
              Match Centre · Competition Architecture
            </div>
            <h1 className="font-display text-3xl sm:text-4xl tracking-wide uppercase text-white">
              Tournament Maker
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Monitor champion coronations in the Dashboard, build and simulate tournaments in Tournament Structure, or curate silverware in the Trophy Gallery.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {spotlightChampionTournament && (
              <button
                type="button"
                onClick={() => setCelebratingTournamentId(spotlightChampionTournament.id)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-slate-950 text-xs font-extrabold hover:brightness-110 cursor-pointer inline-flex items-center gap-1.5 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Winner Animation</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setGalleryTab('hall-of-fame');
                setGalleryOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl border border-white/15 bg-white/[0.04] text-xs font-semibold text-white hover:border-amber-400/50 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Hall of Fame ({hallOfFame.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setWizardInitialTrophy(null);
                setActiveMakerTab('structure');
                navigateSubRoute({ view: 'new' });
              }}
              className="px-4 py-2 rounded-xl bg-[#7ADBF0] text-slate-950 text-xs font-bold hover:bg-[#9BE6F6] cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Competition</span>
            </button>
          </div>
        </div>

        {/* Primary Tabs under Tournament Maker: Dashboard, Tournament Structure, Trophy Gallery */}
        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setActiveMakerTab('dashboard');
              if (subRoute.view === 'new') navigateSubRoute({ view: 'directory' });
            }}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold cursor-pointer inline-flex items-center gap-2 transition-all ${
              activeMakerTab === 'dashboard'
                ? 'bg-emerald-400 text-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.28)]'
                : 'border border-white/15 bg-white/[0.04] text-slate-300 hover:text-white hover:border-emerald-400/40'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
            {crownedCompetitions.length > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] ${
                  activeMakerTab === 'dashboard'
                    ? 'bg-slate-950/20 text-slate-950'
                    : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                {crownedCompetitions.length} Crowned
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveMakerTab('structure')}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold cursor-pointer inline-flex items-center gap-2 transition-all ${
              activeMakerTab === 'structure'
                ? 'bg-[#7ADBF0] text-slate-950 shadow-[0_0_20px_rgba(122,219,240,0.25)]'
                : 'border border-white/15 bg-white/[0.04] text-slate-300 hover:text-white hover:border-white/30'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Tournament Structure</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                activeMakerTab === 'structure'
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-white/10 text-slate-300'
              }`}
            >
              {competitionMakers.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMakerTab('gallery');
              if (subRoute.view === 'new') navigateSubRoute({ view: 'directory' });
            }}
            className={`px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold cursor-pointer inline-flex items-center gap-2 transition-all ${
              activeMakerTab === 'gallery'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
                : 'border border-white/15 bg-white/[0.04] text-slate-300 hover:text-white hover:border-amber-400/40'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>Trophy Gallery</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                activeMakerTab === 'gallery'
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {competitionTrophies.length}
            </span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: DASHBOARD (Winner Animation Stage + Champions + Active Sims)  */}
      {/* ==================================================================== */}
      {activeMakerTab === 'dashboard' ? (
        <div className="space-y-6">
          {/* Top KPI Telemetry Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4">
              <div className="font-mono text-[9.5px] uppercase tracking-wider text-slate-400">
                Total Tournaments
              </div>
              <div className="font-display text-3xl text-white light:text-slate-950 tabular-nums mt-1">
                {dashboardMetrics.totalCompetitions}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4">
              <div className="font-mono text-[9.5px] uppercase tracking-wider text-[#7ADBF0] light:text-cyan-700">
                Active Seasons
              </div>
              <div className="font-display text-3xl text-[#7ADBF0] light:text-cyan-700 tabular-nums mt-1">
                {dashboardMetrics.activeCount}
              </div>
            </div>
            <div className="rounded-2xl border border-amber-400/35 bg-amber-500/[0.07] light:bg-amber-50 p-4">
              <div className="font-mono text-[9.5px] uppercase tracking-wider text-amber-300 light:text-amber-800">
                Crowned Champions
              </div>
              <div className="font-display text-3xl text-amber-300 light:text-amber-700 tabular-nums mt-1">
                {dashboardMetrics.crownedCount}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4">
              <div className="font-mono text-[9.5px] uppercase tracking-wider text-emerald-400 light:text-emerald-700">
                Matches Played
              </div>
              <div className="font-display text-3xl text-emerald-400 light:text-emerald-700 tabular-nums mt-1">
                {dashboardMetrics.completedMatches}
                <span className="text-sm text-slate-500 font-mono">
                  /{dashboardMetrics.totalMatches}
                </span>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4">
              <div className="font-mono text-[9.5px] uppercase tracking-wider text-slate-400">
                Goals Scored
              </div>
              <div className="font-display text-3xl text-white light:text-slate-950 tabular-nums mt-1">
                {dashboardMetrics.totalGoals}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4">
              <div className="font-mono text-[9.5px] uppercase tracking-wider text-amber-300 light:text-amber-700">
                Gallery Silverware
              </div>
              <div className="font-display text-3xl text-amber-300 light:text-amber-700 tabular-nums mt-1">
                {competitionTrophies.length}
              </div>
            </div>
          </div>

          {/* Winner Coronation Animation Stage inside Dashboard Tab */}
          {spotlightChampionTournament ? (
            <div className="space-y-3">
              {crownedCompetitions.length > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-amber-300 font-bold">
                    <Crown className="w-3.5 h-3.5 text-amber-400" />
                    <span>Select Champion Coronation to Showcase</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {crownedCompetitions.map((comp) => {
                      const active = comp.id === spotlightChampionTournament.id;
                      return (
                        <button
                          key={comp.id}
                          type="button"
                          onClick={() => setSpotlightChampionCompId(comp.id)}
                          className={`px-3 py-1 rounded-xl font-mono text-[10px] uppercase tracking-wider font-semibold cursor-pointer transition-all ${
                            active
                              ? 'bg-amber-400 text-slate-950 font-bold shadow-[0_0_14px_rgba(251,191,36,0.3)]'
                              : 'border border-white/15 bg-[#08101C] text-slate-300 hover:border-amber-400/50'
                          }`}
                        >
                          {comp.name} ({comp.champion?.teamName})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <WinnerCoronationBanner
                tournament={spotlightChampionTournament}
                teamsMap={teamsMap}
                onPlayFullAnimation={() =>
                  setCelebratingTournamentId(spotlightChampionTournament.id)
                }
                onOpenTeamCabinet={(teamId) => openTeamById(teamId, 5)}
              />
            </div>
          ) : (
            /* When no tournament has crowned a winner yet, show an interactive Coronation Stage readiness card */
            <div className="relative overflow-hidden rounded-2xl border border-amber-400/35 bg-gradient-to-r from-[#140F05] via-[#0A1324] to-[#120D05] p-6 flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/40 bg-amber-500/15 font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                  <span>Tournament Winner Coronation Stage</span>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl uppercase tracking-wide text-white">
                  Awaiting Tournament Champion Decision
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  As soon as the final match of any competition is decided, the broadcast Winner Celebration Animation will launch automatically right here in the Dashboard and add the trophy to the winning club&apos;s Trophy Cabinet.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
                {activeCompetitions.length > 0 ? (
                  <button
                    type="button"
                    disabled={Boolean(simulatingCompId)}
                    onClick={() => handleQuickCrownTournament(activeCompetitions[0].id)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-slate-950 text-xs font-extrabold hover:brightness-110 disabled:opacity-50 cursor-pointer inline-flex items-center gap-2 shadow-[0_0_24px_rgba(251,191,36,0.3)]"
                  >
                    <FastForward className="w-4 h-4" />
                    <span>
                      {simulatingCompId === activeCompetitions[0].id
                        ? 'Simulating to Final...'
                        : `Sim All & Crown Winner (${activeCompetitions[0].shortName || activeCompetitions[0].name})`}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveMakerTab('structure')}
                    className="px-4 py-2.5 rounded-xl bg-[#7ADBF0] text-slate-950 text-xs font-bold hover:bg-[#9BE6F6] cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Launch a Tournament in Structure Tab</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reigning Champions & Club Trophy Cabinet Honors Grid */}
          {crownedCompetitions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white light:text-slate-950">
                    Reigning Tournament Champions
                  </h3>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                  Automatically Added to Club Trophy Cabinets
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {crownedCompetitions.map((comp) => {
                  const champ = comp.champion!;
                  const liveTeam = teamsMap.get(champ.teamId);
                  return (
                    <div
                      key={comp.id}
                      className="rounded-2xl border border-amber-400/35 bg-gradient-to-br from-[#130F06] via-[#091220] to-[#070D18] light:from-amber-50/70 light:via-white light:to-white p-4 flex flex-col justify-between gap-4 shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <TrophyArtwork trophy={comp.trophy} size="md" />
                            <div className=" -bottom-1 -right-1 w-7 h-7 rounded-full border border-amber-300/60 bg-[#050A12] p-0.5 flex items-center justify-center shadow-md">
                              <TeamEmblem
                                team={liveTeam}
                                crestUrl={liveTeam?.crestUrl || champ.crestUrl}
                                code={liveTeam?.code || champ.teamCode || champ.teamName.slice(0, 3).toUpperCase()}
                                className="w-5 h-5"
                              />
                            </div>
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <span className="font-mono text-[9.5px] uppercase tracking-wider text-amber-300 light:text-amber-700 font-bold">
                              {comp.name} · {comp.season}
                            </span>
                            <h4 className="font-display text-xl uppercase tracking-wide text-white light:text-slate-950 truncate">
                              {liveTeam?.name || champ.teamName}
                            </h4>
                            <p className="text-[11px] text-slate-300 light:text-slate-600 truncate">
                              Final: <span className="font-mono font-bold text-amber-300 light:text-amber-700">{champ.finalScore}</span>
                              {champ.runnerUpName ? ` vs ${champ.runnerUpName}` : ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-white/10 light:border-slate-200">
                        <button
                          type="button"
                          onClick={() => setCelebratingTournamentId(comp.id)}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-400 text-slate-950 text-[11px] font-extrabold hover:bg-amber-300 cursor-pointer inline-flex items-center justify-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Winner Animation</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openTeamById(champ.teamId, 5)}
                          className="py-1.5 px-2.5 rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-200 light:text-amber-800 text-[11px] font-semibold hover:bg-amber-500/20 cursor-pointer inline-flex items-center gap-1"
                          title="Open Club Trophy Cabinet"
                        >
                          <Award className="w-3 h-3" />
                          <span>Cabinet</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => navigateSubRoute({ view: 'detail', id: comp.id })}
                          className="py-1.5 px-2.5 rounded-lg border border-white/15 bg-white/[0.04] text-slate-200 light:text-slate-800 text-[11px] font-semibold hover:border-[#7ADBF0]/50 cursor-pointer"
                        >
                          Hub
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Tournaments In Progress Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#7ADBF0]" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white light:text-slate-950">
                  Active Tournaments &amp; Quick Coronation
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveMakerTab('structure')}
                className="text-xs font-semibold text-[#7ADBF0] hover:underline cursor-pointer"
              >
                Open Tournament Structure →
              </button>
            </div>

            {activeCompetitions.length === 0 ? (
              <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-8 text-center space-y-3">
                <Trophy className="w-7 h-7 text-[#7ADBF0] mx-auto" />
                <div className="text-sm font-bold text-white light:text-slate-950">
                  No active tournaments in progress
                </div>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Switch to Tournament Structure to launch a 48-nation World Cup, 36-club Champions League, Domestic League, or custom cup competition.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveMakerTab('structure')}
                  className="px-4 py-2 rounded-xl bg-[#7ADBF0] text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Go to Tournament Structure</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeCompetitions.map((comp) => {
                  const allMatches = comp.stages.flatMap((s) => s.fixtures);
                  const played = allMatches.filter((f) => f.status === 'completed').length;
                  const pct = allMatches.length > 0 ? Math.round((played / allMatches.length) * 100) : 0;
                  const isSimming = simulatingCompId === comp.id;
                  return (
                    <div
                      key={comp.id}
                      className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4 flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <TrophyArtwork trophy={comp.trophy} size="md" />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] uppercase text-[#7ADBF0]">
                              {comp.season} · {comp.teamIds.length} teams
                            </span>
                            <span className="font-mono text-[10px] text-emerald-400 font-bold tabular-nums">
                              {pct}%
                            </span>
                          </div>
                          <h4 className="font-bold text-sm text-white light:text-slate-950 truncate">
                            {comp.name}
                          </h4>
                          <div className="text-[11px] text-slate-400 tabular-nums">
                            {played}/{allMatches.length} matches completed
                          </div>
                          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-1">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-[#7ADBF0] to-emerald-400 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                        <button
                          type="button"
                          onClick={() => navigateSubRoute({ view: 'detail', id: comp.id })}
                          className="flex-1 py-1.5 rounded-lg bg-[#7ADBF0]/15 border border-[#7ADBF0]/40 text-[#7ADBF0] text-xs font-semibold hover:bg-[#7ADBF0]/25 cursor-pointer"
                        >
                          Open Hub
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(simulatingCompId)}
                          onClick={() => handleQuickCrownTournament(comp.id)}
                          className="py-1.5 px-3 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 text-xs font-bold hover:bg-emerald-500/25 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1"
                          title="Simulate remaining matches and launch Winner Animation"
                        >
                          <Play className="w-3 h-3" />
                          <span>{isSimming ? 'Simming...' : 'Sim & Crown'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : activeMakerTab === 'gallery' ? (
        /* ================================================================== */
        /* TAB 3: TROPHY GALLERY                                              */
        /* ================================================================== */
        <TrophyGalleryView
          onSelectTrophyForNewCompetition={(tr) => {
            setWizardInitialTrophy(tr);
            setActiveMakerTab('structure');
            navigateSubRoute({ view: 'new' });
          }}
        />
      ) : subRoute.view === 'new' ? (
        /* TAB 2 (Sub-view: Creation Wizard inside Tournament Structure) */
        <TournamentWizard
          initialTrophy={wizardInitialTrophy}
          onCancel={() => {
            setWizardInitialTrophy(null);
            navigateSubRoute({ view: 'directory' });
          }}
          onCreated={(created) => {
            setWizardInitialTrophy(null);
            navigateSubRoute({ view: 'detail', id: created.id });
          }}
        />
      ) : (
        /* ================================================================== */
        /* TAB 2: TOURNAMENT STRUCTURE (Normal Tournament Making + Directory) */
        /* ================================================================== */
        <div className="space-y-6">
          {/* One-Click Iconic Presets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-amber-400/35 bg-gradient-to-br from-[#141108] via-[#0B1522] to-[#071019] light:from-amber-50 light:via-white light:to-white p-4 flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-amber-300 light:text-amber-700 font-semibold">
                    Official 2026 Format · 48 Nations
                  </div>
                  <h3 className="font-bold text-base text-white light:text-slate-950">
                    FIFA World Cup 2026
                  </h3>
                  <p className="text-xs text-slate-400 light:text-slate-600">
                    Official Groups A–L draw, 8 best 3rd-placed qualifiers, Round of 32 bracket &amp; 3rd-Place Play-Off.
                  </p>
                </div>
                <Globe className="w-6 h-6 text-amber-400 light:text-amber-600 shrink-0" />
              </div>

              <button
                type="button"
                disabled={Boolean(quickCreatingPreset)}
                onClick={() => handleOneClickLaunch('world-cup-2026')}
                className="w-full py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 disabled:opacity-50 cursor-pointer"
              >
                {quickCreatingPreset === 'world-cup-2026'
                  ? 'Drawing 48 Nations...'
                  : 'Launch World Cup (48 Teams)'}
              </button>
            </div>

            <div className="rounded-2xl border border-[#38BDF8]/35 bg-gradient-to-br from-[#040C24] via-[#08173A] to-[#060E20] light:from-indigo-50 light:via-white light:to-white p-4 flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-[#7ADBF0] light:text-indigo-700 font-semibold">
                    Swiss League Phase · 36 Clubs
                  </div>
                  <h3 className="font-bold text-base text-white light:text-slate-950">
                    UEFA Champions League
                  </h3>
                  <p className="text-xs text-slate-400 light:text-slate-600">
                    8 matchdays for 36 clubs, Top 8 direct to R16, 9–24 two-legged KO Play-Offs &amp; single Final.
                  </p>
                </div>
                <Sparkles className="w-6 h-6 text-[#7ADBF0] light:text-indigo-600 shrink-0" />
              </div>

              <button
                type="button"
                disabled={Boolean(quickCreatingPreset)}
                onClick={() => handleOneClickLaunch('ucl-36')}
                className="w-full py-2 rounded-xl bg-[#7ADBF0] text-slate-950 text-xs font-bold hover:bg-[#9BE6F6] disabled:opacity-50 cursor-pointer"
              >
                {quickCreatingPreset === 'ucl-36'
                  ? 'Drawing 36 Clubs...'
                  : 'Launch Champions League (36 Clubs)'}
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4 flex flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-emerald-400 light:text-emerald-700 font-semibold">
                    Double Round-Robin · 20 Clubs
                  </div>
                  <h3 className="font-bold text-base text-white light:text-slate-950">
                    Domestic League (20 Clubs)
                  </h3>
                  <p className="text-xs text-slate-400 light:text-slate-600">
                    Full 38-matchday home &amp; away season with real clubs, managers, and goal-difference tie-breakers.
                  </p>
                </div>
                <Users className="w-6 h-6 text-emerald-400 light:text-emerald-600 shrink-0" />
              </div>

              <button
                type="button"
                disabled={Boolean(quickCreatingPreset)}
                onClick={() => handleOneClickLaunch('domestic-league')}
                className="w-full py-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 light:bg-emerald-50 light:border-emerald-400 text-emerald-300 light:text-emerald-800 text-xs font-bold hover:bg-emerald-500/25 disabled:opacity-50 cursor-pointer"
              >
                {quickCreatingPreset === 'domestic-league'
                  ? 'Generating 38 Matchdays...'
                  : 'Launch Domestic League (20 Clubs)'}
              </button>
            </div>
          </div>

          {/* Filter Bar & Active Competitions Grid */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 min-w-[220px] max-w-md">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim() && filteredCompetitions.length > 0) {
                      e.preventDefault();
                      navigateSubRoute({ view: 'detail', id: filteredCompetitions[0].id });
                    }
                  }}
                  placeholder="Search your tournaments by name or season..."
                  className="w-full rounded-xl border border-white/15 light:border-slate-300 bg-[#08101C] light:bg-white pl-8 pr-8 py-2 text-xs text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 text-slate-400 hover:text-white light:hover:text-slate-900 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                    aria-label="Clear tournament search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {(['all', 'in-progress', 'completed'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#7ADBF0]/15 border border-[#7ADBF0]/50 text-[#7ADBF0] light:bg-cyan-50 light:border-cyan-600 light:text-cyan-800'
                        : 'border border-white/10 light:border-slate-200 text-slate-400 light:text-slate-600'
                    }`}
                  >
                    {st === 'all' ? 'All' : st === 'in-progress' ? 'Active' : 'Completed'}
                  </button>
                ))}
              </div>
            </div>

            {filteredCompetitions.length === 0 ? (
              <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-12 text-center space-y-3">
                <Trophy className="w-8 h-8 text-amber-400/70 mx-auto" />
                <div className="text-sm font-bold">No competitions created yet</div>
                <p className="text-xs text-slate-400 light:text-slate-600 max-w-md mx-auto">
                  Launch an official World Cup or Champions League above, or open the 5-step Tournament Creation Wizard to build any custom competition from scratch.
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigateSubRoute({ view: 'new' })}
                    className="px-4 py-2 rounded-xl bg-[#7ADBF0] text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Open Creation Wizard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMakerTab('gallery')}
                    className="px-4 py-2 rounded-xl border border-amber-400/40 bg-amber-500/10 text-amber-300 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Browse Trophy Gallery</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCompetitions.map((comp: CompetitionMakerTournament) => {
                  const allMatches = comp.stages.flatMap((s) => s.fixtures);
                  const played = allMatches.filter((f) => f.status === 'completed').length;
                  return (
                    <div
                      key={comp.id}
                      className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4 flex flex-col justify-between gap-4 hover:border-white/25 light:hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {comp.customLogoUrl ? (
                          <img
                            src={comp.customLogoUrl}
                            alt={comp.name}
                            className="w-12 h-12 rounded-xl object-contain border border-white/10 bg-[#050A12] p-1.5 shrink-0"
                          />
                        ) : (
                          <TrophyArtwork trophy={comp.trophy} size="md" />
                        )}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10px] uppercase text-[#7ADBF0] light:text-cyan-700">
                              {comp.season} · {comp.teamIds.length} teams
                            </span>
                            <span
                              className={`font-mono text-[10px] uppercase px-1.5 py-0.5 rounded font-semibold ${
                                comp.status === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 light:bg-emerald-100 light:text-emerald-800'
                                  : 'bg-white/[0.06] text-slate-300 light:bg-slate-100 light:text-slate-700'
                              }`}
                            >
                              {comp.status === 'completed' ? 'Completed' : 'Active'}
                            </span>
                          </div>
                          <h3 className="font-bold text-sm text-white light:text-slate-950 truncate">
                            {comp.name}
                          </h3>
                          <div className="text-[11px] text-slate-400 light:text-slate-600 tabular-nums">
                            {played} / {allMatches.length} fixtures · {comp.stages.length} stage{comp.stages.length > 1 ? 's' : ''}
                          </div>
                          {comp.champion && (
                            <div className="text-[11px] font-semibold text-amber-300 light:text-amber-700 truncate">
                              Champion: {comp.champion.teamName}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06] light:border-slate-200">
                        <button
                          type="button"
                          onClick={() => navigateSubRoute({ view: 'detail', id: comp.id })}
                          className="flex-1 py-1.5 rounded-lg bg-[#7ADBF0]/15 border border-[#7ADBF0]/40 text-[#7ADBF0] light:bg-cyan-50 light:border-cyan-300 light:text-cyan-800 text-xs font-semibold hover:bg-[#7ADBF0]/25 cursor-pointer"
                        >
                          Open Tournament Hub
                        </button>
                        {comp.champion && (
                          <button
                            type="button"
                            onClick={() => setCelebratingTournamentId(comp.id)}
                            className="p-1.5 rounded-lg border border-amber-400/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 cursor-pointer"
                            title="Play Winner Animation"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteCompetitionMaker(comp.id, false)}
                          className="p-1.5 rounded-lg border border-white/10 light:border-slate-200 text-slate-400 hover:text-rose-400 light:hover:text-rose-600 cursor-pointer"
                          title="Delete Tournament"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <TrophyGalleryModal
        isOpen={galleryOpen}
        initialTab={galleryTab}
        onClose={() => setGalleryOpen(false)}
        onSelectTrophyForNewCompetition={(tr) => {
          setWizardInitialTrophy(tr);
          setActiveMakerTab('structure');
          navigateSubRoute({ view: 'new' });
        }}
      />

      {/* Full-Screen Broadcast Winner Celebration Animation Modal */}
      {celebratingTournament && (
        <WinnerCelebrationModal
          isOpen={Boolean(celebratingTournament)}
          tournament={celebratingTournament}
          teamsMap={teamsMap}
          onClose={() => setCelebratingTournamentId(null)}
          onOpenTeamCabinet={(teamId) => openTeamById(teamId, 5)}
        />
      )}
    </div>
  );
};
