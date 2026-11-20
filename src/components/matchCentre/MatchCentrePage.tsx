import React, { Suspense, useEffect } from 'react';
import { MatchCentreNavRail } from './MatchCentreNavRail';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { MatchCentreTab } from '../../types/matchCentre';
import { NavigationDestination } from '../../types/homepage';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import { installMatchCentreGlobalErrorTracker } from '../../utils/matchCentreErrorTracker';
import { ChunkLoadErrorBoundary } from '../common/ChunkLoadErrorBoundary';

const TAB_MODULE_NAMES: Record<MatchCentreTab, string> = {
  dashboard: 'MatchCentreDashboard',
  teams: 'TeamsTab',
  simulate: 'MatchCreatorView',
  managers: 'ManagersPage',
  scoreboard: 'ScoreboardPage',
  competitions: 'TournamentMakerPage',
  quiz: 'QuizMainPage',
  world: 'FootballWorldView',
};

const MatchCentreDashboard = lazyWithRetry(
  () => import('./MatchCentreDashboard').then((m) => ({ default: m.MatchCentreDashboard })),
  'MatchCentreDashboard'
);
const TeamsTab = lazyWithRetry(
  () => import('./TeamsTab').then((m) => ({ default: m.TeamsTab })),
  'TeamsTab'
);
const MatchCreatorView = lazyWithRetry(
  () => import('./MatchCreatorView').then((m) => ({ default: m.MatchCreatorView })),
  'MatchCreatorView'
);
const ManagersPage = lazyWithRetry(
  () => import('./managers/ManagersPage').then((m) => ({ default: m.ManagersPage })),
  'ManagersPage'
);
const ScoreboardPage = lazyWithRetry(
  () => import('./scoreboard/ScoreboardPage').then((m) => ({ default: m.ScoreboardPage })),
  'ScoreboardPage'
);
const TournamentMakerPage = lazyWithRetry(
  () =>
    import('./competitionMaker/TournamentMakerPage').then((m) => ({
      default: m.TournamentMakerPage,
    })),
  'TournamentMakerPage'
);
const QuizMainPage = lazyWithRetry(
  () => import('../quiz/QuizMainPage').then((m) => ({ default: m.QuizMainPage })),
  'QuizMainPage'
);
const FootballWorldView = lazyWithRetry(
  () => import('./world/FootballWorldView').then((m) => ({ default: m.FootballWorldView })),
  'FootballWorldView'
);

const TabLoadingFallback: React.FC = () => (
  <div className="min-h-[45vh] flex items-center justify-center py-12">
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="w-7 h-7 rounded-full border-2 border-[#7ADBF0]/30 border-t-[#7ADBF0] animate-spin" />
      <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-400">
        Loading Module...
      </p>
    </div>
  </div>
);

interface MatchCentrePageProps {
  onNavigateHome: () => void;
  onNavigate: (destination: NavigationDestination, payload?: any) => void;
}

export const MatchCentrePage: React.FC<MatchCentrePageProps> = ({
  onNavigateHome,
  onNavigate,
}) => {
  const { activeTab, setActiveTab, closeDossier, openTeamById, openTeamStadium } = useMatchCentre();

  useEffect(() => {
    return installMatchCentreGlobalErrorTracker(() => activeTab);
  }, [activeTab]);

  const handleSelectTab = (tab: MatchCentreTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const targetPath =
        tab === 'scoreboard'
          ? '/match-centre/scoreboard'
          : tab === 'competitions'
          ? window.location.pathname.startsWith('/match-centre/tournaments')
            ? window.location.pathname
            : '/match-centre/tournaments'
          : tab === 'quiz'
          ? '/quiz'
          : tab === 'world'
          ? '/match-centre/world'
          : '/match-centre';
      if (window.location.pathname !== targetPath && tab !== 'managers') {
        window.history.pushState({}, '', targetPath);
      }
    }
    if (tab !== 'managers' && typeof window !== 'undefined' && !window.location.pathname.startsWith('/match-centre') && tab !== 'quiz') {
      onNavigate('match-centre');
    }
  };

  const handleOpenSimulateTab = () => {
    closeDossier();
    handleSelectTab('simulate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Match Centre Navigation Rail */}
      <MatchCentreNavRail
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onNavigateHome={onNavigateHome}
      />

      {/* Main Viewport */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 landscape-mobile:py-3.5">
        <ChunkLoadErrorBoundary
          resetKey={activeTab}
          sectionKey={activeTab}
          moduleName={TAB_MODULE_NAMES[activeTab]}
          fallbackTitle="Match Centre Section Unavailable"
        >
          <Suspense fallback={<TabLoadingFallback />}>
            {activeTab === 'dashboard' ? (
              <MatchCentreDashboard />
            ) : activeTab === 'world' ? (
              <FootballWorldView
                onOpenTeamProfile={(teamId) => openTeamById(teamId, 1)}
                onOpenStadium={(teamId) => openTeamStadium(teamId)}
              />
            ) : activeTab === 'simulate' ? (
              <MatchCreatorView onBackToTeams={() => handleSelectTab('teams')} />
            ) : activeTab === 'managers' ? (
              <ManagersPage onNavigateLogin={() => onNavigate('login')} />
            ) : activeTab === 'scoreboard' ? (
              <ScoreboardPage />
            ) : activeTab === 'competitions' ? (
              <TournamentMakerPage />
            ) : activeTab === 'quiz' ? (
              <QuizMainPage onOpenAdmin={() => onNavigate('admin')} />
            ) : (
              <TeamsTab onOpenMatchCreator={handleOpenSimulateTab} />
            )}
          </Suspense>
        </ChunkLoadErrorBoundary>
      </div>
    </div>
  );
};
