/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, useState, useMemo, useEffect, useCallback } from 'react';
import { AuthProvider } from './context/AuthContext';
import { ReadsProvider, useReads } from './context/ReadsContext';
import { AdminProvider, useAdmin } from './context/AdminContext';
import { Navbar } from './components/Navbar';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { HeroSection } from './components/HeroSection';
import { WelcomeSection, WelcomeCopyData } from './components/WelcomeSection';
import { ExperienceAccessPoints } from './components/ExperienceAccessPoints';
import { FeaturedReadsSection } from './components/FeaturedReadsSection';
import { NewsletterSection } from './components/NewsletterSection';
import { FinalCtaSection } from './components/FinalCtaSection';
import { Footer } from './components/Footer';
import { AppUpdateNotification } from './components/common/AppUpdateNotification';
import { ChunkLoadErrorBoundary } from './components/common/ChunkLoadErrorBoundary';
import { lazyWithRetry } from './utils/lazyWithRetry';

import { ThemeProvider } from './context/ThemeContext';
import { MatchCentreProvider, useMatchCentre } from './context/MatchCentreContext';
import { BackgroundMusicPlayer } from './components/common/BackgroundMusicPlayer';

const ReadsPage = lazyWithRetry(
  () => import('./components/reads/ReadsPage').then((m) => ({ default: m.ReadsPage })),
  'ReadsPage'
);
const AdminDashboardPage = lazyWithRetry(
  () => import('./components/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })),
  'AdminDashboardPage'
);
const LoginPage = lazyWithRetry(
  () => import('./components/LoginPage').then((m) => ({ default: m.LoginPage })),
  'LoginPage'
);
const MyLibraryPage = lazyWithRetry(
  () => import('./components/MyLibraryPage').then((m) => ({ default: m.MyLibraryPage })),
  'MyLibraryPage'
);
const WhatsNewPage = lazyWithRetry(
  () => import('./components/WhatsNewPage').then((m) => ({ default: m.WhatsNewPage })),
  'WhatsNewPage'
);
const DestinationPreviewModal = lazyWithRetry(
  () => import('./components/DestinationPreviewModal').then((m) => ({ default: m.DestinationPreviewModal })),
  'DestinationPreviewModal'
);
const GlobalSearchResultsModal = lazyWithRetry(
  () => import('./components/GlobalSearchResultsModal').then((m) => ({ default: m.GlobalSearchResultsModal })),
  'GlobalSearchResultsModal'
);
const MatchCentrePage = lazyWithRetry(
  () => import('./components/matchCentre/MatchCentrePage').then((m) => ({ default: m.MatchCentrePage })),
  'MatchCentrePage'
);
const PlayerProfilePage = lazyWithRetry(
  () => import('./components/matchCentre/PlayerProfilePage').then((m) => ({ default: m.PlayerProfilePage })),
  'PlayerProfilePage'
);
const ManagerProfilePage = lazyWithRetry(
  () =>
    import('./components/matchCentre/managers/ManagerProfilePage').then((m) => ({
      default: m.ManagerProfilePage,
    })),
  'ManagerProfilePage'
);


const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="w-8 h-8 rounded-full border-2 border-[#7ADBF0]/30 border-t-[#7ADBF0] animate-spin" />
      <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400">
        Loading Section...
      </p>
    </div>
  </div>
);

import {
  DEFAULT_HERO_COPY,
  DEFAULT_WELCOME_COPY,
} from './data/mockData';
import { Announcement, NavigationDestination, ReadingSeries, Volume } from './types/homepage';
import type { ManagedAnnouncement } from '../server/types';

function extractPlayerIdFromPath(pathname: string): string | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const match = clean.match(/^\/match-centre\/players\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function extractManagerIdFromPath(pathname: string): string | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const match = clean.match(/^\/match-centre\/managers\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function resolveDestinationFromPath(pathname: string): NavigationDestination {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/admin' || clean.startsWith('/admin/')) return 'admin';
  if (clean === '/login') return 'login';
  if (clean === '/my-library') return 'my-library';
  if (clean === '/library' || clean === '/reads' || clean === '/series' || clean === '/books' || clean.startsWith('/series/') || clean.startsWith('/books/')) return 'reads';
  if (clean.startsWith('/match-centre/players/')) return 'player-profile';
  if (clean.startsWith('/match-centre/managers/')) return 'manager-profile';
  if (clean === '/match-centre/managers') return 'managers';
  if (clean === '/quiz' || clean === '/match-centre/quiz') return 'match-centre';
  if (clean === '/match-centre' || clean.startsWith('/match-centre/')) return 'match-centre';
  if (clean === '/whats-new' || clean === '/announcements') return 'announcements';
  return 'home';
}

function getPathForDestination(dest: NavigationDestination): string {
  switch (dest) {
    case 'admin':
      return '/admin';
    case 'login':
      return '/login';
    case 'my-library':
      return '/my-library';
    case 'reads':
      return '/reads';
    case 'managers':
      return '/match-centre/managers';
    case 'match-centre':
      return '/match-centre';
    case 'announcements':
      return '/whats-new';
    default:
      return '/';
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ReadsProvider>
          <AdminProvider>
            <MatchCentreProvider>
              <MainApp />
            </MatchCentreProvider>
          </AdminProvider>
        </ReadsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function MainApp() {
  const { homepageConfig } = useAdmin();
  const { publishedSeries, publishedBooks } = useReads();
  const { openTeamById, closeDossier, setActiveTab: setMatchCentreTab, setTeamsSectionTab } = useMatchCentre();

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenSearchModal = () => {
      setIsSearchModalOpen(true);
    };
    window.addEventListener('dodaeona:open-search-modal', handleOpenSearchModal);
    return () => {
      window.removeEventListener('dodaeona:open-search-modal', handleOpenSearchModal);
    };
  }, []);

  const [currentPath, setCurrentPath] = useState<string>(() => {
    return typeof window !== 'undefined' ? window.location.pathname || '/' : '/';
  });

  // Navigation & View states synced with pathname
  const [currentTab, setCurrentTab] = useState<NavigationDestination>(() =>
    resolveDestinationFromPath(
      typeof window !== 'undefined' ? window.location.pathname || '/' : '/'
    )
  );
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? extractPlayerIdFromPath(window.location.pathname || '/') : null
  );
  const [selectedManagerId, setSelectedManagerId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? extractManagerIdFromPath(window.location.pathname || '/') : null
  );
  const [activeModalDest, setActiveModalDest] = useState<NavigationDestination | null>(null);
  const [modalPayload, setModalPayload] = useState<any>(null);

  useEffect(() => {
    if (currentTab === 'managers') {
      setMatchCentreTab('managers');
    } else if (typeof window !== 'undefined' && window.location.pathname.startsWith('/match-centre/world')) {
      setMatchCentreTab('world');
    } else if (typeof window !== 'undefined' && window.location.pathname.startsWith('/match-centre/tournaments')) {
      setMatchCentreTab('competitions');
    } else if (typeof window !== 'undefined' && window.location.pathname.includes('/match-centre/scoreboard')) {
      setMatchCentreTab('scoreboard');
    } else if (typeof window !== 'undefined' && (window.location.pathname === '/quiz' || window.location.pathname.startsWith('/match-centre/quiz'))) {
      setMatchCentreTab('quiz');
    } else if (typeof window !== 'undefined' && window.location.pathname.includes('/match-centre/stadiums')) {
      setMatchCentreTab('teams');
      setTeamsSectionTab('stadium-explorer');
    }
  }, [currentTab, setMatchCentreTab, setTeamsSectionTab]);

  const pushPath = useCallback((nextPath: string) => {
    setCurrentPath(nextPath);
    if (typeof window !== 'undefined' && window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const nextPath = window.location.pathname || '/';
      setCurrentPath(nextPath);
      const nextDest = resolveDestinationFromPath(nextPath);
      setCurrentTab(nextDest);
      if (nextDest === 'managers') {
        setMatchCentreTab('managers');
      } else if (nextPath.startsWith('/match-centre/world')) {
        setMatchCentreTab('world');
      } else if (nextPath.startsWith('/match-centre/tournaments')) {
        setMatchCentreTab('competitions');
      } else if (nextPath.includes('/match-centre/scoreboard')) {
        setMatchCentreTab('scoreboard');
      } else if (nextPath === '/quiz' || nextPath.startsWith('/match-centre/quiz')) {
        setMatchCentreTab('quiz');
      } else if (nextPath.includes('/match-centre/stadiums')) {
        setMatchCentreTab('teams');
        setTeamsSectionTab('stadium-explorer');
      }
      setSelectedPlayerId(extractPlayerIdFromPath(nextPath));
      setSelectedManagerId(extractManagerIdFromPath(nextPath));
      setActiveModalDest(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setMatchCentreTab, setTeamsSectionTab]);

  useEffect(() => {
    const handleNavigatePlayer = (event: Event) => {
      const playerId = (event as CustomEvent<{ playerId?: string }>).detail?.playerId;
      if (!playerId) return;
      setSelectedPlayerId(playerId);
      setCurrentTab('player-profile');
      setActiveModalDest(null);
      pushPath(`/match-centre/players/${encodeURIComponent(playerId)}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const handleNavigateManager = (event: Event) => {
      const managerId = (event as CustomEvent<{ managerId?: string }>).detail?.managerId;
      if (!managerId) return;
      setSelectedManagerId(managerId);
      setCurrentTab('manager-profile');
      setActiveModalDest(null);
      pushPath(`/match-centre/managers/${encodeURIComponent(managerId)}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const handleOpenManagersDirectory = () => {
      setMatchCentreTab('managers');
      setCurrentTab('managers');
      setActiveModalDest(null);
      pushPath('/match-centre/managers');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const handleOpenMatchCentre = () => {
      setCurrentTab('match-centre');
      setActiveModalDest(null);
      pushPath('/match-centre');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const handleOpenReads = (event: Event) => {
      const detail = (event as CustomEvent<{ bookId?: string; seriesId?: string }>).detail;
      setCurrentTab('reads');
      setActiveModalDest(null);
      setModalPayload(detail ? { ...detail, _ts: Date.now() } : null);
      pushPath('/reads');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('dodaeona:navigate-player', handleNavigatePlayer);
    window.addEventListener('dodaeona:navigate-manager', handleNavigateManager);
    window.addEventListener('dodaeona:open-managers-directory', handleOpenManagersDirectory);
    window.addEventListener('dodaeona:open-match-centre', handleOpenMatchCentre);
    window.addEventListener('dodaeona:open-reads', handleOpenReads);
    return () => {
      window.removeEventListener('dodaeona:navigate-player', handleNavigatePlayer);
      window.removeEventListener('dodaeona:navigate-manager', handleNavigateManager);
      window.removeEventListener('dodaeona:open-managers-directory', handleOpenManagersDirectory);
      window.removeEventListener('dodaeona:open-match-centre', handleOpenMatchCentre);
      window.removeEventListener('dodaeona:open-reads', handleOpenReads);
    };
  }, [pushPath, setMatchCentreTab]);

  // Global navigation handler
  const handleNavigate = useCallback(
    (destination: NavigationDestination, payload?: any) => {
      if (destination === 'player-profile' && payload?.playerId) {
        setSelectedPlayerId(payload.playerId);
        setCurrentTab('player-profile');
        setActiveModalDest(null);
        setModalPayload(payload);
        pushPath(`/match-centre/players/${encodeURIComponent(payload.playerId)}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (destination === 'manager-profile' && payload?.managerId) {
        setSelectedManagerId(payload.managerId);
        setCurrentTab('manager-profile');
        setActiveModalDest(null);
        setModalPayload(payload);
        pushPath(`/match-centre/managers/${encodeURIComponent(payload.managerId)}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      const fullPageDestinations: NavigationDestination[] = [
        'home',
        'reads',
        'match-centre',
        'managers',
        'announcements',
        'admin',
        'login',
        'my-library',
      ];

      if (fullPageDestinations.includes(destination)) {
        if (destination === 'managers') {
          closeDossier();
          setMatchCentreTab('managers');
        } else if (destination === 'match-centre' && payload?.matchCentreTab) {
          closeDossier();
          setMatchCentreTab(payload.matchCentreTab);
          if (payload.teamsSectionTab) {
            setTeamsSectionTab(payload.teamsSectionTab);
          } else if (payload.matchCentreTab === 'teams') {
            setTeamsSectionTab('database');
          }
        }
        setCurrentTab(destination);
        setActiveModalDest(null);
        setModalPayload(payload || null);
        let nextPath = getPathForDestination(destination);
        if (destination === 'match-centre' && payload?.matchCentreTab) {
          const mcTab = payload.matchCentreTab;
          nextPath =
            mcTab === 'world'
              ? '/match-centre/world'
              : mcTab === 'scoreboard'
              ? '/match-centre/scoreboard'
              : mcTab === 'competitions'
              ? '/match-centre/tournaments'
              : mcTab === 'managers'
              ? '/match-centre/managers'
              : mcTab === 'quiz'
              ? '/quiz'
              : payload.teamsSectionTab === 'stadium-explorer'
              ? '/match-centre/stadiums'
              : '/match-centre';
        }
        pushPath(nextPath);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Modal preview for supporting stages (Quiz, Community, Profile, About, Privacy, Terms, etc.)
      setCurrentTab(destination);
      setActiveModalDest(destination);
      setModalPayload(payload || null);
    },
    [pushPath, closeDossier, setMatchCentreTab, setTeamsSectionTab]
  );

  const handleCloseModal = () => {
    setActiveModalDest(null);
    if (
      currentTab !== 'reads' &&
      currentTab !== 'admin' &&
      currentTab !== 'match-centre' &&
      currentTab !== 'managers' &&
      currentTab !== 'manager-profile' &&
      currentTab !== 'player-profile' &&
      currentTab !== 'announcements' &&
      currentTab !== 'login' &&
      currentTab !== 'my-library'
    ) {
      setCurrentTab('home');
    }
  };

  const [publishedAnnouncements, setPublishedAnnouncements] = useState<ManagedAnnouncement[]>([]);

  const fetchPublishedAnnouncements = useCallback(async () => {
    try {
      const res = await fetch('/api/public/announcements');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.announcements)) {
        // Strictly keep only published announcements on public views
        setPublishedAnnouncements(
          data.announcements.filter((a: ManagedAnnouncement) => a.status === 'published')
        );
      }
    } catch {
      // ignore network error
    }
  }, []);

  useEffect(() => {
    fetchPublishedAnnouncements();
    const handleAnnouncementsUpdated = () => {
      fetchPublishedAnnouncements();
    };
    window.addEventListener('dodaeona:announcements-updated', handleAnnouncementsUpdated);
    return () => {
      window.removeEventListener('dodaeona:announcements-updated', handleAnnouncementsUpdated);
    };
  }, [fetchPublishedAnnouncements]);

  // Most recent published announcement with the site-banner setting enabled
  const activeBannerAnnouncement: Announcement | null = useMemo(() => {
    const candidate = publishedAnnouncements.find(
      (a) => a.status === 'published' && Boolean(a.showBanner)
    );
    if (!candidate) return null;
    return {
      id: candidate.id,
      badge: 'OFFICIAL BROADCAST',
      title: candidate.title,
      message: candidate.message,
      active: true,
      actionText: candidate.ctaLabel || undefined,
      actionUrl: candidate.ctaUrl || candidate.ctaDest || undefined,
      date: candidate.date,
    };
  }, [publishedAnnouncements]);

  // Welcome copy resolved from Admin database
  const activeWelcomeCopy: WelcomeCopyData = {
    heading: homepageConfig.welcome.heading || DEFAULT_WELCOME_COPY.heading,
    subheading: homepageConfig.welcome.subheading || DEFAULT_WELCOME_COPY.subheading,
    paragraphs: homepageConfig.welcome.paragraphs || DEFAULT_WELCOME_COPY.paragraphs,
    tagline: homepageConfig.welcome.tagline || DEFAULT_WELCOME_COPY.tagline,
    signoff: homepageConfig.welcome.signoff || DEFAULT_WELCOME_COPY.signoff,
  };

  // Live Featured Reading Series & Latest Volumes synced with Admin Panel deletions/edits
  const liveFeaturedSeries: ReadingSeries[] = useMemo(() => {
    const featuredIds = homepageConfig.featuredReads.featuredSeriesIds || [];
    return publishedSeries
      .map((s) => {
        const activeVolCount = publishedBooks.filter((b) => b.seriesId === s.id).length;
        return { s, activeVolCount };
      })
      .filter(({ s, activeVolCount }) => {
        if (activeVolCount <= 0) return false;
        if (featuredIds.includes(s.id)) return true;
        return Boolean(s.featured);
      })
      .map(({ s, activeVolCount }) => ({
        id: s.id,
        seriesNumber: s.seriesNumber,
        title: s.title,
        description: s.description,
        coverUrl: s.coverUrl,
        volumeCount: activeVolCount,
        slug: s.slug,
      }));
  }, [publishedSeries, publishedBooks, homepageConfig.featuredReads.featuredSeriesIds]);

  const liveLatestVolumes: Volume[] = useMemo(() => {
    return publishedBooks.slice(0, 4).map((b) => ({
      id: b.id,
      volumeNumber: b.volumeNumber,
      title: b.title,
      seriesTitle: b.seriesTitle,
      description: b.description,
      coverUrl: b.coverUrl,
      publishedDate: b.publishedDate,
      slug: b.slug,
    }));
  }, [publishedBooks]);

  // If in Admin Portal (/admin or /admin/*), render the protected Control Room shell
  if (currentTab === 'admin' || currentPath.startsWith('/admin')) {
    return (
      <>
        {homepageConfig.sections['sec-2']?.visible !== false && activeBannerAnnouncement && (
          <AnnouncementBanner announcement={activeBannerAnnouncement} onNavigate={handleNavigate} />
        )}
        <ChunkLoadErrorBoundary resetKey={currentPath} fallbackTitle="Admin Dashboard Unavailable">
          <Suspense fallback={<RouteLoadingFallback />}>
            <AdminDashboardPage
              currentPath={currentPath.startsWith('/admin') ? currentPath : '/admin'}
              onNavigatePath={(path) => pushPath(path)}
              onReturnToPublic={() => handleNavigate('home')}
              onOpenPublicReads={() => handleNavigate('reads')}
              onNavigateLogin={() => handleNavigate('login')}
            />
          </Suspense>
        </ChunkLoadErrorBoundary>
      </>
    );
  }

  return (
    <div className="min-h-screen floodlit-canvas-atmosphere transition-colors duration-200 text-[var(--text-primary)] bg-[var(--bg-primary)] flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Global Navigation Bar */}
      {homepageConfig.sections['sec-1']?.visible !== false && (
        <Navbar
          currentTab={currentTab}
          onNavigate={handleNavigate}
          onOpenAdmin={() => handleNavigate('admin')}
        />
      )}

      {/* 2. Dismissible Announcement Banner (Most recent published banner-enabled announcement) */}
      {homepageConfig.sections['sec-2']?.visible !== false && activeBannerAnnouncement && (
        <AnnouncementBanner announcement={activeBannerAnnouncement} onNavigate={handleNavigate} />
      )}

      {/* Main Content */}
      <main className="flex-1">
        <ChunkLoadErrorBoundary resetKey={`${currentTab}:${currentPath}`} fallbackTitle="Page Section Unavailable">
          <Suspense fallback={<RouteLoadingFallback />}>
          {currentTab === 'login' ? (
            <LoginPage
              onNavigate={handleNavigate}
              onAdminRedirect={() => handleNavigate('admin')}
            />
          ) : currentTab === 'my-library' ? (
            <MyLibraryPage onNavigate={handleNavigate} />
          ) : currentTab === 'announcements' ? (
            <WhatsNewPage
              announcements={publishedAnnouncements}
              onNavigate={handleNavigate}
              onNavigateAdminAnnouncements={() => {
                setCurrentTab('admin');
                setActiveModalDest(null);
                pushPath('/admin/announcements');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          ) : currentTab === 'reads' ? (
            <ReadsPage
              onNavigateHome={() => handleNavigate('home')}
              onOpenOwnerDashboard={() => handleNavigate('admin')}
              initialBookId={modalPayload?.bookId ?? null}
              initialSeriesId={modalPayload?.seriesId ?? null}
            />
          ) : currentTab === 'match-centre' || currentTab === 'managers' ? (
            <MatchCentrePage
              onNavigateHome={() => handleNavigate('home')}
              onNavigate={handleNavigate}
            />

          ) : currentTab === 'manager-profile' && selectedManagerId ? (
            <ManagerProfilePage
              managerId={selectedManagerId}
              onBackToManagers={() => handleNavigate('managers')}
              onOpenMatchCentre={() => {
                setMatchCentreTab('dashboard');
                handleNavigate('match-centre');
              }}
              onOpenTeam={(teamId) => {
                setMatchCentreTab('teams');
                openTeamById(teamId, 1);
              }}
            />
          ) : currentTab === 'player-profile' && selectedPlayerId ? (
            <PlayerProfilePage
              playerId={selectedPlayerId}
              onBack={() => handleNavigate('match-centre')}
              onOpenTeam={(teamId) => {
                setMatchCentreTab('teams');
                openTeamById(teamId, 1);
              }}
              onDeleted={() => handleNavigate('match-centre')}
            />
          ) : (
            <>
            {/* 3. Cinematic Hero Section */}
            {homepageConfig.sections['sec-3']?.visible !== false && (
              <HeroSection
                subtext={homepageConfig.hero.subtext || DEFAULT_HERO_COPY.subtext}
                latestVolumes={liveLatestVolumes}
                onNavigate={handleNavigate}
              />
            )}

            {/* 4. Welcome Message */}
            {homepageConfig.sections['sec-4']?.visible !== false && (
              <WelcomeSection
                copy={activeWelcomeCopy}
                onEditTrigger={() => handleNavigate('admin')}
              />
            )}

            {/* 5. Access Points to Reads and Match Centre */}
            {homepageConfig.sections['sec-5']?.visible !== false && (
              <ExperienceAccessPoints onNavigate={handleNavigate} />
            )}

            {/* 6. Featured Reading Series and Latest Volumes */}
            {homepageConfig.sections['sec-6']?.visible !== false && (
              <FeaturedReadsSection
                seriesList={liveFeaturedSeries}
                latestVolumes={liveLatestVolumes}
                onNavigate={handleNavigate}
              />
            )}

            {/* 8. Newsletter Section */}
            {homepageConfig.sections['sec-8']?.visible !== false && <NewsletterSection />}

            {/* 9. Final Call-to-Action Section */}
            {homepageConfig.sections['sec-9']?.visible !== false && (
              <FinalCtaSection onNavigate={handleNavigate} />
            )}
            </>
          )}
          </Suspense>
        </ChunkLoadErrorBoundary>
      </main>

      {/* 10. Footer and Supporting Navigation */}
      {homepageConfig.sections['sec-10']?.visible !== false && (
        <Footer onNavigate={handleNavigate} />
      )}

      {/* Destination Preview Modal for supporting pillars */}
      {activeModalDest && activeModalDest !== 'home' && (
        <ChunkLoadErrorBoundary resetKey={activeModalDest}>
          <Suspense fallback={null}>
            <DestinationPreviewModal
              destination={activeModalDest}
              payload={modalPayload}
              onClose={handleCloseModal}
            />
          </Suspense>
        </ChunkLoadErrorBoundary>
      )}

      {/* Global Search Results Modal */}
      {isSearchModalOpen && (
        <ChunkLoadErrorBoundary resetKey="search-modal">
          <Suspense fallback={null}>
            <GlobalSearchResultsModal
              isOpen={isSearchModalOpen}
              onClose={() => setIsSearchModalOpen(false)}
              onNavigate={handleNavigate}
            />
          </Suspense>
        </ChunkLoadErrorBoundary>
      )}

      {/* Redesigned Background Music & Matchday Atmosphere Player */}
      <BackgroundMusicPlayer />

      {/* New Website Update Notification */}
      <AppUpdateNotification />
    </div>
  );
}
