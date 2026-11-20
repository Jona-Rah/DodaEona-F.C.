import React, { Suspense } from 'react';
import { TeamsMasthead } from './TeamsMasthead';
import { TeamControlBar } from './TeamControlBar';
import { SixViewChips } from './SixViewChips';
import { TeamCard } from './TeamCard';
import { FreeAgentsView } from './FreeAgentsView';
import { StadiumExplorerView } from './stadiumExplorer/StadiumExplorerView';
import { BallonDorView } from './ballonDor/BallonDorView';
import { BALLON_DOR_ASSETS, BALLON_DOR_WINNERS_ARCHIVE } from '../../data/ballonDorWinners';
import { TeamDossierPage } from './TeamDossierPage';
import { CreateTeamModal } from './CreateTeamModal';
import { TeamStatisticsView } from './TeamStatisticsView';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { ShieldAlert, RotateCcw, CheckCircle2, Shield, MapPin, BarChart3, Scale, X, ArrowRight } from 'lucide-react';
import { ViewChipType } from '../../types/matchCentre';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { ChunkLoadErrorBoundary } from '../common/ChunkLoadErrorBoundary';

const TeamCompareView = lazyWithRetry(
  () => import('./TeamCompareView').then((m) => ({ default: m.TeamCompareView })),
  'TeamCompareView'
);

interface TeamsTabProps {
  onOpenMatchCreator: () => void;
}

const SECTION_HEADINGS: Record<ViewChipType, { title: string; unit: string }> = {
  'all-teams': { title: 'ALL TEAMS', unit: 'TEAMS' },
  'mens-clubs': { title: "MEN'S CLUBS", unit: 'TEAMS' },
  'mens-nations': { title: "MEN'S NATIONS", unit: 'TEAMS' },
  'womens-clubs': { title: "WOMEN'S CLUBS", unit: 'TEAMS' },
  'womens-nations': { title: "WOMEN'S NATIONS", unit: 'TEAMS' },
  'free-agents': { title: 'FREE AGENTS', unit: 'PLAYERS' },
};

export const TeamsTab: React.FC<TeamsTabProps> = ({ onOpenMatchCreator }) => {
  const {
    teams,
    filteredTeams,
    filteredFreeAgents,
    counts,
    teamsSectionTab,
    setTeamsSectionTab,
    viewChip,
    visibleTeamsCount,
    loadMoreTeams,
    hasMoreTeams,
    resetFilters,
    activeDossierTeam,
    closeDossier,
    simulationMatches,
    competitionMakers,
    pinnedCompareTeamId,
    clearPinnedCompareTeam,
    openCompareTeams,
    toast,
  } = useMatchCentre();

  // If a Team Dossier is actively selected, show the full Dossier Page
  if (activeDossierTeam) {
    return (
      <div className="space-y-6">
        <TeamDossierPage
          team={activeDossierTeam}
          onBack={closeDossier}
          onOpenMatchCreator={onOpenMatchCreator}
        />
        <CreateTeamModal />
      </div>
    );
  }

  const isFreeAgentsView = viewChip === 'free-agents';
  const isDatabaseTab = teamsSectionTab === 'database';
  const isCompareTeamsTab = teamsSectionTab === 'compare-teams';
  const isStadiumExplorerTab = teamsSectionTab === 'stadium-explorer';
  const isBallonDorTab = teamsSectionTab === 'ballon-dor';
  const isTeamStatisticsTab = teamsSectionTab === 'team-statistics';
  const pinnedCompareTeam = pinnedCompareTeamId
    ? teams.find((t) => t.id === pinnedCompareTeamId) || null
    : null;
  const pagedTeams = filteredTeams.slice(0, visibleTeamsCount);
  const activeHeader = SECTION_HEADINGS[viewChip] || SECTION_HEADINGS['all-teams'];
  const activeCount = isFreeAgentsView ? filteredFreeAgents.length : filteredTeams.length;
  const ballonDorAwardedCount = BALLON_DOR_WINNERS_ARCHIVE.filter((e) => !e.notAwarded).length;
  const completedSimCount = simulationMatches.filter((m) => m.status === 'completed').length;
  const completedTournamentFixturesCount = competitionMakers.reduce(
    (sum, t) =>
      sum +
      (t.stages || []).reduce(
        (sSum, st) =>
          sSum +
          (st.fixtures || []).filter((f) => f.status === 'completed' && !f.isBye && !f.importedMatchId)
            .length,
        0
      ),
    0
  );
  const totalStatsMatchesCount = completedSimCount + completedTournamentFixturesCount;

  return (
    <div className="space-y-5 pb-8">
      {/* Toast Feedback Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="px-4 py-3 rounded-2xl bg-[var(--bg-surface)] border border-[#7ADBF0]/60 shadow-2xl flex items-center gap-3 text-xs font-bold text-[var(--text-primary)]">
            <CheckCircle2 className="w-4 h-4 text-[#7ADBF0] shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Sub-Tabs Bar directly under Teams tab: Teams Database | Stadium Explorer | Ballon d'Or */}
      <div
        role="tablist"
        aria-label="Teams sections"
        className="flex flex-wrap items-center gap-2 border-b border-white/10 light:border-slate-300 pb-3"
      >
        <button
          type="button"
          role="tab"
          aria-selected={isDatabaseTab}
          onClick={() => setTeamsSectionTab('database')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-mono uppercase tracking-wider transition-all cursor-pointer border ${
            isDatabaseTab
              ? 'bg-[#0891B2] border-[#06B6D4] text-white shadow-md shadow-cyan-900/25'
              : 'bg-white/[0.04] light:bg-white border-white/10 light:border-slate-300 text-slate-300 light:text-slate-700 hover:bg-white/[0.08] light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900'
          }`}
        >
          <Shield className="w-4 h-4 shrink-0" />
          <span>Teams Database</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
              isDatabaseTab
                ? 'bg-white/20 text-white'
                : 'bg-white/10 light:bg-slate-100 text-slate-300 light:text-slate-600'
            }`}
          >
            {counts.total}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={isStadiumExplorerTab}
          onClick={() => setTeamsSectionTab('stadium-explorer')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-mono uppercase tracking-wider transition-all cursor-pointer border ${
            isStadiumExplorerTab
              ? 'bg-[#0891B2] border-[#06B6D4] text-white shadow-md shadow-cyan-900/25'
              : 'bg-white/[0.04] light:bg-white border-white/10 light:border-slate-300 text-slate-300 light:text-slate-700 hover:bg-white/[0.08] light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900'
          }`}
        >
          <MapPin className="w-4 h-4 shrink-0" />
          <span>Stadium Explorer</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
              isStadiumExplorerTab
                ? 'bg-white/20 text-white'
                : 'bg-white/10 light:bg-slate-100 text-slate-300 light:text-slate-600'
            }`}
          >
            {counts.mensClubs + counts.womensClubs}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={isBallonDorTab}
          onClick={() => setTeamsSectionTab('ballon-dor')}
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-mono uppercase tracking-wider transition-all cursor-pointer border ${
            isBallonDorTab
              ? 'bg-gradient-to-r from-[#1A1307] via-[#261C0A] to-[#171106] border-[#D4AF37] text-[#F7DC88] shadow-lg shadow-amber-950/35'
              : 'bg-[#0B0905]/85 light:bg-white border-[#D4AF37]/35 light:border-[#B48B3E]/45 text-[#E8CF82] light:text-[#6B4D07] hover:border-[#D4AF37]/75 hover:bg-[#161108] light:hover:bg-[#FDF6E2]'
          }`}
        >
          <span className="w-6 h-6 rounded-md overflow-hidden bg-black border border-[#D4AF37]/50 shrink-0 flex items-center justify-center">
            <img
              src={BALLON_DOR_ASSETS.tabLogo}
              alt="Ballon d'Or Logo"
              className="w-full h-full object-cover"
            />
          </span>
          <span>Ballon d&apos;Or</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
              isBallonDorTab
                ? 'bg-[#D4AF37]/25 text-[#FFF5D6]'
                : 'bg-[#D4AF37]/15 light:bg-[#F7ECC8] text-[#D4AF37] light:text-[#785609]'
            }`}
          >
            {ballonDorAwardedCount}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={isCompareTeamsTab}
          onClick={() => setTeamsSectionTab('compare-teams')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-mono uppercase tracking-wider transition-all cursor-pointer border ${
            isCompareTeamsTab
              ? 'bg-[#0891B2] border-[#06B6D4] text-white shadow-md shadow-cyan-900/25'
              : 'bg-white/[0.04] light:bg-white border-white/10 light:border-slate-300 text-slate-300 light:text-slate-700 hover:bg-white/[0.08] light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4 shrink-0" />
          <span>Compare Teams</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isCompareTeamsTab
                ? 'bg-white/20 text-white'
                : 'bg-white/10 light:bg-slate-100 text-slate-300 light:text-slate-600'
            }`}
          >
            RADAR
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={isTeamStatisticsTab}
          onClick={() => setTeamsSectionTab('team-statistics')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-mono uppercase tracking-wider transition-all cursor-pointer border ${
            isTeamStatisticsTab
              ? 'bg-[#0891B2] border-[#06B6D4] text-white shadow-md shadow-cyan-900/25'
              : 'bg-white/[0.04] light:bg-white border-white/10 light:border-slate-300 text-slate-300 light:text-slate-700 hover:bg-white/[0.08] light:hover:bg-slate-100 hover:text-white light:hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-4 h-4 shrink-0" />
          <span>Team Statistics</span>
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] tabular-nums ${
              isTeamStatisticsTab
                ? 'bg-white/20 text-white'
                : 'bg-white/10 light:bg-slate-100 text-slate-300 light:text-slate-600'
            }`}
          >
            {totalStatsMatchesCount}
          </span>
        </button>
      </div>

      {isCompareTeamsTab ? (
        <ChunkLoadErrorBoundary
          resetKey={teamsSectionTab}
          sectionKey={teamsSectionTab}
          moduleName="TeamCompareView"
          fallbackTitle="Compare Teams Unavailable"
        >
          <Suspense
            fallback={
              <div className="min-h-[40vh] flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-7 h-7 rounded-full border-2 border-[#7ADBF0]/30 border-t-[#7ADBF0] animate-spin" />
                  <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-400">
                    Loading Team Radar...
                  </p>
                </div>
              </div>
            }
          >
            <TeamCompareView onOpenMatchCreator={onOpenMatchCreator} />
          </Suspense>
        </ChunkLoadErrorBoundary>
      ) : isStadiumExplorerTab ? (
        <StadiumExplorerView />
      ) : isBallonDorTab ? (
        <BallonDorView />
      ) : isTeamStatisticsTab ? (
        <TeamStatisticsView onOpenMatchCreator={onOpenMatchCreator} />
      ) : (
        <>
          {/* 1. Teams Database Masthead */}
          <TeamsMasthead />

          {/* 2. Team Control Bar (Search, Order, League, Compare Teams, + Create a team) */}
          <TeamControlBar />

          {/* 3. Six Category Filter Chips */}
          <SixViewChips />

          {/* Active Compare Pin Strip */}
          {pinnedCompareTeam && !isFreeAgentsView && (
            <div className="rounded-xl bg-[#0A111C] light:bg-white border border-[#7ADBF0]/40 light:border-cyan-500/40 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs">
                <Scale className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700 shrink-0" />
                <span className="text-slate-300 light:text-slate-700">
                  Selected <strong className="text-white light:text-slate-900">{pinnedCompareTeam.name}</strong> for radar comparison. Click Compare on any second team card, or launch now.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const firstId = pinnedCompareTeam.id;
                    clearPinnedCompareTeam();
                    openCompareTeams(firstId);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7ADBF0] hover:bg-[#99E5F5] light:bg-cyan-600 light:hover:bg-cyan-700 text-[#050A12] light:text-white text-xs font-bold cursor-pointer"
                >
                  <span>Open Radar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={clearPinnedCompareTeam}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
                  aria-label="Cancel team comparison selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 4. Section Heading Banner */}
          <div className="flex items-center justify-between gap-4 pt-1 pb-2">
            <div className="flex items-center gap-3">
              <span className="w-1 h-6 rounded-full bg-[#7ADBF0] light:bg-cyan-600 shrink-0" />
              <h2 className="font-display text-2xl sm:text-3xl text-white light:text-slate-900 uppercase tracking-wide leading-none">
                {activeHeader.title}
              </h2>
              <span className="px-2.5 py-1 rounded-full bg-[#0D1522] light:bg-slate-100 border border-white/[0.08] light:border-slate-200 font-mono text-[10px] tracking-[0.16em] text-slate-300 light:text-slate-700 tabular-nums">
                {activeCount} {activeHeader.unit}
              </span>
            </div>

            {!isFreeAgentsView && filteredTeams.length > 0 && (
              <span className="text-[11px] text-slate-400 light:text-slate-500 font-mono hidden sm:inline tabular-nums">
                Showing 1–{Math.min(visibleTeamsCount, filteredTeams.length)} of {filteredTeams.length}
              </span>
            )}
          </div>

          {/* 5. Main Content Area: Free Agents View OR Team Grid */}
          {isFreeAgentsView ? (
            <FreeAgentsView />
          ) : (
            <div className="space-y-6">
              {pagedTeams.length > 0 ? (
                <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5 landscape-mobile:gap-3.5 items-stretch animate-in fade-in duration-300">
                  {pagedTeams.map((team) => (
                    <TeamCard key={team.id} team={team} />
                  ))}
                </div>
              ) : (
                <div className="p-12 sm:p-16 rounded-3xl bg-[var(--bg-surface)] border border-dashed border-[var(--border-color)] text-center space-y-4 max-w-xl mx-auto shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-[#7ADBF0]/10 text-[#7ADBF0] light:text-cyan-700 flex items-center justify-center mx-auto border border-[#7ADBF0]/30">
                    <ShieldAlert className="w-8 h-8" />
                  </div>
                  <h3 className="font-display text-2xl text-[var(--text-primary)] uppercase tracking-wide">
                    NO REGISTERED TEAMS FOUND
                  </h3>
                  <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                    No teams match your current search criteria or league filter.
                  </p>
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7ADBF0] hover:bg-[#99E5F5] light:bg-cyan-600 light:text-white text-[#050A12] font-semibold text-xs transition-all shadow-md hover:-translate-y-0.5 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset all filters</span>
                  </button>
                </div>
              )}

              {hasMoreTeams && (
                <div className="pt-6 text-center">
                  <button
                    type="button"
                    onClick={loadMoreTeams}
                    className="px-8 py-3 rounded-xl bg-[#7ADBF0] hover:bg-[#99E5F5] light:bg-cyan-600 light:hover:bg-cyan-700 text-[#050A12] light:text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(122,219,240,0.3)] hover:-translate-y-0.5 cursor-pointer"
                  >
                    Show 24 more ({filteredTeams.length - visibleTeamsCount} remaining)
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Team Creation / Edit Modal */}
      <CreateTeamModal />
    </div>
  );
};
