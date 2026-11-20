import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  User,
  Menu,
  X,
  Search,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  BookOpen,
  Trophy,
  Home,
  Sparkles,
  Award,
  ChevronRight,
  LogIn,
  LogOut,
  Swords,
  Target,
  LayoutDashboard,
  Briefcase,
  MapPin,
} from 'lucide-react';
import { OFFICIAL_ASSETS } from '../data/mockData';
import { NavigationDestination } from '../types/homepage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useReads } from '../context/ReadsContext';
import { useMatchCentre } from '../context/MatchCentreContext';
import { getAllStadiums } from '../data/stadiumsDatabase';
import { searchWholeDatabase, warmWholeDatabaseSearchIndex } from '../utils/globalDatabaseSearch';
import { PWAInstallButton } from './common/PWAInstallButton';

interface NavbarProps {
  currentTab: NavigationDestination;
  onNavigate: (destination: NavigationDestination, payload?: any) => void;
  onOpenAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate, onOpenAdmin }) => {
  const { theme, toggleTheme, isAudioPlaying, toggleAudio, activeTrack, musicTracks, togglePlayer, activePillar, setActivePillar, globalSearch, setGlobalSearch } = useTheme();
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const isAdmin = isAuthenticated && user?.role === 'admin';
  const isMatchCentreSection =
    currentTab === 'match-centre' ||
    currentTab === 'managers' ||
    currentTab === 'manager-profile' ||
    currentTab === 'player-profile';

  const { publishedBooks, publishedSeries } = useReads();
  const {
    teams,
    registry,
    managers,
    managerAppointments,
    representedLeagues,
    openTeamById,
    openPlayerProfile,
    openManagerProfile,
    openTeamStadium,
    openLeagueDirectory,
  } = useMatchCentre();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSearchFocused, setDesktopSearchFocused] = useState(false);
  const [drawerSearchFocused, setDrawerSearchFocused] = useState(false);
  const [searchInput, setSearchInput] = useState(globalSearch);
  const deferredSearchInput = useDeferredValue(searchInput);
  const globalSyncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setSearchInput(globalSearch);
  }, [globalSearch]);

  useEffect(() => {
    return () => {
      if (globalSyncTimerRef.current) window.clearTimeout(globalSyncTimerRef.current);
    };
  }, []);

  const handleSearchInputChange = useCallback(
    (next: string) => {
      setSearchInput(next);
      if (globalSyncTimerRef.current) window.clearTimeout(globalSyncTimerRef.current);
      globalSyncTimerRef.current = window.setTimeout(() => {
        setGlobalSearch(next);
      }, 200);
    },
    [setGlobalSearch]
  );

  const flushSearchAndOpenModal = useCallback(() => {
    if (globalSyncTimerRef.current) window.clearTimeout(globalSyncTimerRef.current);
    setGlobalSearch(searchInput);
    window.dispatchEvent(new CustomEvent('dodaeona:open-search-modal'));
  }, [searchInput, setGlobalSearch]);

  const allStadiums = useMemo(() => getAllStadiums(), []);

  const handleWarmSearchIndex = useCallback(() => {
    window.setTimeout(() => {
      warmWholeDatabaseSearchIndex({
        teams,
        registry,
        managers,
        managerAppointments,
        publishedBooks,
        publishedSeries,
        representedLeagues,
        stadiums: allStadiums,
      });
    }, 0);
  }, [
    teams,
    registry,
    managers,
    managerAppointments,
    publishedBooks,
    publishedSeries,
    representedLeagues,
    allStadiums,
  ]);

  const isAnySearchFocused = desktopSearchFocused || drawerSearchFocused;

  const liveDatabaseResults = useMemo(() => {
    if (!isAnySearchFocused || deferredSearchInput.trim().length < 2) return null;
    return searchWholeDatabase(
      deferredSearchInput,
      {
        teams,
        registry,
        managers,
        managerAppointments,
        publishedBooks,
        publishedSeries,
        representedLeagues,
        stadiums: allStadiums,
      },
      {
        clubs: 4,
        players: 5,
        managers: 3,
        stadiums: 3,
        leagues: 2,
        books: 3,
        series: 2,
      }
    );
  }, [
    isAnySearchFocused,
    deferredSearchInput,
    teams,
    registry,
    managers,
    managerAppointments,
    publishedBooks,
    publishedSeries,
    representedLeagues,
    allStadiums,
  ]);

  const handleNavClick = (dest: NavigationDestination, payload?: any) => {
    onNavigate(dest, payload);
    if (dest === 'reads') setActivePillar('reads');
    if (dest === 'match-centre') setActivePillar('match-centre');
    setMobileMenuOpen(false);
    setDesktopSearchFocused(false);
    setDrawerSearchFocused(false);
  };

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await logout();
    if (currentTab === 'my-library' || currentTab === 'admin') {
      onNavigate('home');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      flushSearchAndOpenModal();
      setMobileMenuOpen(false);
      setDesktopSearchFocused(false);
      setDrawerSearchFocused(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setDesktopSearchFocused(false);
      setDrawerSearchFocused(false);
      return;
    }
    if (e.key === 'Enter' || e.key === '=') {
      e.preventDefault();
      if (searchInput.trim()) {
        flushSearchAndOpenModal();
        setMobileMenuOpen(false);
        setDesktopSearchFocused(false);
        setDrawerSearchFocused(false);
      }
    }
  };

  const renderSearchOptionsList = () => {
    if (!liveDatabaseResults) return null;
    if (liveDatabaseResults.totalCount === 0) {
      return (
        <div className="px-4 py-4 text-center text-xs text-slate-400 light:text-slate-600">
          No database matches for &ldquo;{deferredSearchInput.trim()}&rdquo;
        </div>
      );
    }

    return (
      <div className="max-h-[420px] overflow-y-auto divide-y divide-white/[0.06] light:divide-slate-100">
        {/* Clubs & Nations */}
        {liveDatabaseResults.clubs.length > 0 && (
          <div className="py-1">
            <div className="px-3 py-1 font-mono text-[9px] tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold">
              Clubs &amp; Nations
            </div>
            {liveDatabaseResults.clubs.map((team) => (
              <button
                key={`nav-club-${team.id}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDesktopSearchFocused(false);
                  setDrawerSearchFocused(false);
                  setMobileMenuOpen(false);
                  openTeamById(team.id, 1);
                }}
                className="w-full px-3 py-2 flex items-center justify-between gap-2.5 hover:bg-white/[0.05] light:hover:bg-slate-50 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={team.crestUrl}
                    alt={team.name}
                    className="w-6 h-6 object-contain rounded shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white light:text-slate-900 truncate block">
                      {team.name}
                    </span>
                    <span className="text-[10px] text-slate-400 light:text-slate-500 truncate block">
                      {team.country}
                      {team.league ? ` · ${team.league}` : ' · National Team'}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-[11px] font-bold text-[#7ADBF0] light:text-cyan-700 shrink-0">
                  {team.overallRating}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Players */}
        {liveDatabaseResults.players.length > 0 && (
          <div className="py-1">
            <div className="px-3 py-1 font-mono text-[9px] tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold">
              Players
            </div>
            {liveDatabaseResults.players.map((p) => (
              <button
                key={`nav-player-${p.id}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDesktopSearchFocused(false);
                  setDrawerSearchFocused(false);
                  setMobileMenuOpen(false);
                  openPlayerProfile(p.id);
                }}
                className="w-full px-3 py-2 flex items-center justify-between gap-2.5 hover:bg-white/[0.05] light:hover:bg-slate-50 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <User className="w-4 h-4 text-[#7ADBF0] light:text-cyan-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white light:text-slate-900 truncate block">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-slate-400 light:text-slate-500 truncate block">
                      {p.position} · {p.nationality} · {p.currentTeamName}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-[11px] font-bold text-[#7ADBF0] light:text-cyan-700 shrink-0">
                  {p.overallRating}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Managers */}
        {liveDatabaseResults.managers.length > 0 && (
          <div className="py-1">
            <div className="px-3 py-1 font-mono text-[9px] tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold">
              Managers
            </div>
            {liveDatabaseResults.managers.map(({ manager, currentTeamName }) => (
              <button
                key={`nav-mgr-${manager.id}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDesktopSearchFocused(false);
                  setDrawerSearchFocused(false);
                  setMobileMenuOpen(false);
                  openManagerProfile(manager.id);
                }}
                className="w-full px-3 py-2 flex items-center justify-between gap-2.5 hover:bg-white/[0.05] light:hover:bg-slate-50 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Briefcase className="w-4 h-4 text-[#7ADBF0] light:text-cyan-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white light:text-slate-900 truncate block">
                      {manager.name}
                    </span>
                    <span className="text-[10px] text-slate-400 light:text-slate-500 truncate block">
                      {manager.nationality}
                      {currentTeamName ? ` · ${currentTeamName}` : ''}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Stadiums & Leagues */}
        {(liveDatabaseResults.stadiums.length > 0 || liveDatabaseResults.leagues.length > 0) && (
          <div className="py-1">
            <div className="px-3 py-1 font-mono text-[9px] tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold">
              Stadiums &amp; Leagues
            </div>
            {liveDatabaseResults.leagues.map((lg) => (
              <button
                key={`nav-lg-${lg.name}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDesktopSearchFocused(false);
                  setDrawerSearchFocused(false);
                  setMobileMenuOpen(false);
                  openLeagueDirectory(lg.name);
                }}
                className="w-full px-3 py-2 flex items-center justify-between gap-2.5 hover:bg-white/[0.05] light:hover:bg-slate-50 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Award className="w-4 h-4 text-[#7ADBF0] light:text-cyan-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white light:text-slate-900 truncate block">
                      {lg.name}
                    </span>
                    <span className="text-[10px] text-slate-400 light:text-slate-500 truncate block">
                      League · {lg.count} clubs
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>
            ))}
            {liveDatabaseResults.stadiums.map((st) => (
              <button
                key={`nav-stad-${st.id}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDesktopSearchFocused(false);
                  setDrawerSearchFocused(false);
                  setMobileMenuOpen(false);
                  openTeamStadium(st.clubId);
                }}
                className="w-full px-3 py-2 flex items-center justify-between gap-2.5 hover:bg-white/[0.05] light:hover:bg-slate-50 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MapPin className="w-4 h-4 text-[#7ADBF0] light:text-cyan-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white light:text-slate-900 truncate block">
                      {st.name}
                    </span>
                    <span className="text-[10px] text-slate-400 light:text-slate-500 truncate block">
                      {st.clubName} · {st.city}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* Books & Series */}
        {(liveDatabaseResults.books.length > 0 || liveDatabaseResults.series.length > 0) && (
          <div className="py-1">
            <div className="px-3 py-1 font-mono text-[9px] tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold">
              Books &amp; Series
            </div>
            {liveDatabaseResults.series.map((s) => (
              <button
                key={`nav-ser-${s.id}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleNavClick('reads', { seriesId: s.id });
                }}
                className="w-full px-3 py-2 flex items-center justify-between gap-2.5 hover:bg-white/[0.05] light:hover:bg-slate-50 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BookOpen className="w-4 h-4 text-[#7ADBF0] light:text-cyan-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white light:text-slate-900 truncate block">
                      {s.title}
                    </span>
                    <span className="text-[10px] text-slate-400 light:text-slate-500 truncate block">
                      Series · {s.volumeCount} volumes
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>
            ))}
            {liveDatabaseResults.books.map((b) => (
              <button
                key={`nav-book-${b.id}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleNavClick('reads', { bookId: b.id });
                }}
                className="w-full px-3 py-2 flex items-center justify-between gap-2.5 hover:bg-white/[0.05] light:hover:bg-slate-50 text-left cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <BookOpen className="w-4 h-4 text-[#7ADBF0] light:text-cyan-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-white light:text-slate-900 truncate block">
                      {b.title}
                    </span>
                    <span className="text-[10px] text-slate-400 light:text-slate-500 truncate block">
                      {b.seriesTitle} · Vol. {b.volumeNumber}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              </button>
            ))}
          </div>
        )}

        {/* View All Full Modal Trigger */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            setDesktopSearchFocused(false);
            setDrawerSearchFocused(false);
            setMobileMenuOpen(false);
            flushSearchAndOpenModal();
          }}
          className="w-full px-3.5 py-2.5 bg-[#09121F] light:bg-slate-50 hover:bg-[#7ADBF0]/15 text-[#7ADBF0] light:text-cyan-700 text-xs font-bold flex items-center justify-between cursor-pointer transition-colors"
        >
          <span>Search all matching database results</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  };

  return (
    <header className="sticky top-0 z-50 transition-colors duration-200">
      
      {/* 1. PRIMARY GLOBAL HEADER */}
      <div className="relative bg-[#050A12]/98 dark:bg-[#050A12]/98 light:bg-[#FFFFFF]/98 border-b border-white/[0.08] dark:border-white/[0.08] light:border-slate-200 shadow-[0_4px_30px_rgba(0,0,0,0.45)] light:shadow-[0_2px_16px_rgba(15,23,42,0.06)]">
        
        {/* Subtle top cyan floodlight wash */}
        <div className="absolute top-0 left-0 w-72 h-16 bg-[#7ADBF0]/8 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-0 right-0 w-72 h-16 bg-[#7ADBF0]/6 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-18 landscape-mobile:h-12 gap-4 landscape-mobile:gap-3">
            
            {/* LEFT: Official Crest, Tall Condensed Anton Brand Title, Tracked Tagline */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => handleNavClick('home')}
                className="flex items-center gap-3 landscape-mobile:gap-2 text-left group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ADBF0] rounded-xl p-1 landscape-mobile:p-0.5 transition-all"
                aria-label="DodaEona F.C. Homepage"
              >
                <div className="relative p-1 rounded-lg bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-200 shadow-sm">
                  <img
                    src={OFFICIAL_ASSETS.emblem}
                    alt="DodaEona F.C. Crest"
                    className="relative w-8 h-8 sm:w-9 sm:h-9 landscape-mobile:w-7 landscape-mobile:h-7 object-contain transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                
                <div className="flex flex-col">
                  <span className="font-display text-lg sm:text-xl landscape-mobile:text-base text-white dark:text-white light:text-slate-900 tracking-wide leading-none">
                    DODAEONA <span className="text-[#7ADBF0] light:text-cyan-700">F.C.</span>
                  </span>
                  <span className="eyebrow-mono text-[9px] text-slate-400 dark:text-slate-400 light:text-slate-600 hidden xl:flex items-center gap-1.5 mt-1">
                    <span className="w-1 h-1 rounded-full bg-[#7ADBF0] light:bg-cyan-600" />
                    <span>Dare To Dream · Est. 2020</span>
                  </span>
                </div>
              </button>
            </div>

            {/* CENTRE: Sleek Dark Search Bar with Whole-Database Options */}
            <div className="hidden md:flex flex-1 max-w-lg mx-3 relative">
              <form onSubmit={handleSearchSubmit} className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 light:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchInput}
                  onFocus={() => {
                    setDesktopSearchFocused(true);
                    handleWarmSearchIndex();
                  }}
                  onBlur={() => setTimeout(() => setDesktopSearchFocused(false), 180)}
                  onChange={(e) => {
                    handleSearchInputChange(e.target.value);
                    setDesktopSearchFocused(true);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Search clubs, players, managers, stadiums, books..."
                  className="w-full bg-[#09121F] dark:bg-[#09121F] light:bg-slate-100 border border-white/[0.1] dark:border-white/[0.1] light:border-slate-300 text-xs sm:text-sm text-slate-100 dark:text-slate-100 light:text-slate-900 placeholder:text-slate-400 light:placeholder:text-slate-500 rounded-xl pl-10 pr-20 py-2 focus:outline-none focus:border-[#7ADBF0] light:focus:border-cyan-600 focus:ring-1 focus:ring-[#7ADBF0] light:focus:ring-cyan-600 transition-all"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      if (globalSyncTimerRef.current) window.clearTimeout(globalSyncTimerRef.current);
                      setSearchInput('');
                      setGlobalSearch('');
                    }}
                    aria-label="Clear search"
                    className="absolute right-10 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  aria-label="Search whole database"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-[#7ADBF0]/15 hover:bg-[#7ADBF0]/25 text-[#7ADBF0] light:text-cyan-700 text-[10px] font-mono font-bold uppercase cursor-pointer transition-colors"
                >
                  All
                </button>
              </form>

              {desktopSearchFocused && liveDatabaseResults && (
                <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-[#0C131F] dark:bg-[#0C131F] light:bg-white border border-white/[0.14] light:border-slate-200 shadow-2xl overflow-hidden">
                  {renderSearchOptionsList()}
                </div>
              )}
            </div>

            {/* RIGHT: Dashboard / Account + Grouped Audio, Theme & Menu Controls */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              
              {/* Dashboard / My library / Sign in Control per Section 2 */}
              {isLoading ? (
                <div
                  aria-hidden="true"
                  className="w-24 h-8 rounded-xl bg-[#09121F] dark:bg-[#09121F] light:bg-slate-100 border border-white/10 light:border-slate-200 animate-pulse"
                />
              ) : isAdmin ? (
                <a
                  href="/admin"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenAdmin) onOpenAdmin();
                    else onNavigate('admin');
                  }}
                  title="Publishing Control Room"
                  className="px-3.5 py-2 rounded-xl bg-[#09121F] dark:bg-[#09121F] light:bg-slate-100 hover:bg-[#7ADBF0]/15 border border-white/15 dark:border-white/15 light:border-slate-300 hover:border-[#7ADBF0]/60 text-slate-200 dark:text-slate-200 light:text-slate-800 hover:text-[#7ADBF0] light:hover:text-cyan-700 text-[11px] font-bold tracking-widest uppercase transition-all flex items-center gap-2"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
                  <span className="hidden sm:inline">Dashboard</span>
                </a>
              ) : isAuthenticated ? (
                <a
                  href="/my-library"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('my-library');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#09121F] dark:bg-[#09121F] light:bg-slate-100 hover:bg-[#7ADBF0]/15 border border-white/15 dark:border-white/15 light:border-slate-300 hover:border-[#7ADBF0]/60 text-[11px] font-bold uppercase tracking-widest text-slate-200 dark:text-slate-200 light:text-slate-800 hover:text-[#7ADBF0] transition-all flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
                  <span className="hidden sm:inline">My library</span>
                </a>
              ) : (
                <a
                  href="/login"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('login');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#09121F] dark:bg-[#09121F] light:bg-slate-100 hover:bg-[#7ADBF0]/15 border border-white/15 dark:border-white/15 light:border-slate-300 hover:border-[#7ADBF0]/60 text-[11px] font-bold uppercase tracking-widest text-slate-200 dark:text-slate-200 light:text-slate-800 hover:text-[#7ADBF0] transition-all flex items-center gap-2"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
                  <span className="hidden sm:inline">Sign in</span>
                </a>
              )}

              {/* Sign-out icon at top of ribbon when signed in */}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="Sign out"
                  aria-label="Sign out"
                  className="p-2 rounded-xl bg-[#09121F] dark:bg-[#09121F] light:bg-slate-100 hover:bg-rose-500/15 border border-white/15 dark:border-white/15 light:border-slate-300 hover:border-rose-500/50 text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-rose-400 light:hover:text-rose-600 transition-all cursor-pointer flex items-center justify-center"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Install App PWA CTA */}
              <PWAInstallButton variant="navbar" />

              {/* Grouped Audio & Theme Utility Pill */}
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-[#09121F] dark:bg-[#09121F] light:bg-slate-100 border border-white/10 dark:border-white/10 light:border-slate-300">
                <button
                  type="button"
                  onClick={toggleAudio}
                  title={
                    musicTracks.length === 0
                      ? 'No background audio tracks available — open audio console'
                      : isAudioPlaying
                      ? `Playing: ${activeTrack?.title || 'Audio'} (Click to pause)`
                      : 'Play background audio'
                  }
                  aria-label="Ambient matchday audio toggle"
                  className={`p-1.5 rounded-full transition-all cursor-pointer ${
                    isAudioPlaying
                      ? 'text-[#7ADBF0] bg-[#7ADBF0]/20 shadow-sm'
                      : 'text-slate-400 hover:text-white light:text-slate-600 light:hover:text-slate-900'
                  }`}
                >
                  {isAudioPlaying ? <Volume2 className="w-3.5 h-3.5 animate-pulse text-[#7ADBF0]" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={togglePlayer}
                  title="Open audio player console"
                  className="text-[10px] font-mono uppercase tracking-wider text-slate-400 hover:text-white light:hover:text-slate-900 px-1 transition-colors cursor-pointer"
                >
                  {isAudioPlaying ? (
                    <span className="text-[#7ADBF0] font-bold">PLAYING</span>
                  ) : (
                    <span>AUDIO</span>
                  )}
                </button>

                <span className="w-[1px] h-3.5 bg-white/10 light:bg-slate-300" />

                <button
                  onClick={toggleTheme}
                  title={theme === 'dark' ? 'Switch to Daylight Shelf (Light Mode)' : 'Switch to Floodlit Archive (Dark Mode)'}
                  aria-label="Toggle visual theme"
                  className="p-1.5 rounded-full text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-[#7ADBF0] light:hover:text-cyan-700 transition-all"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-3.5 h-3.5 text-[#7ADBF0]" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-slate-700" />
                  )}
                </button>
              </div>

              {/* Menu Drawer Toggle Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation drawer"
                className="p-2 rounded-full text-slate-300 dark:text-slate-300 light:text-slate-800 hover:text-[#7ADBF0] transition-all border border-white/15 dark:border-white/15 light:border-slate-300 hover:border-[#7ADBF0]/60 bg-[#09121F] dark:bg-[#09121F] light:bg-slate-100 cursor-pointer flex items-center gap-1.5"
                title="Open Navigation Drawer"
              >
                {mobileMenuOpen ? <X className="w-4 h-4 text-[#7ADBF0]" /> : <Menu className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />}
              </button>

            </div>

          </div>
        </div>

      </div>

      {/* 2. SECONDARY NAVIGATION RIBBON (On larger screens >= 1024px) */}
      <div className="hidden lg:block bg-[#050A12]/90 dark:bg-[#050A12]/90 light:bg-[#F4F7FA]/95 backdrop-blur-md border-b border-white/[0.07] dark:border-white/[0.07] light:border-slate-200 py-2.5 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs font-medium">
          
          <nav className="flex items-center gap-2.5">
            
            {/* Standard / Active link: Home */}
            <button
              onClick={() => handleNavClick('home')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 cursor-pointer hover:-translate-y-0.5 ${
                currentTab === 'home'
                  ? 'bg-[radial-gradient(ellipse_at_center,rgba(122,219,240,0.22)_0%,rgba(122,219,240,0.06)_80%)] border border-[#7ADBF0]/60 text-[#E0F7FF] shadow-[0_0_14px_rgba(122,219,240,0.22)] light:bg-none light:bg-cyan-50 light:border-cyan-600/50 light:text-cyan-800'
                  : 'text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-950 hover:bg-white/[0.04] light:hover:bg-slate-200/70'
              }`}
            >
              Home
            </button>

            {/* Frosted Cyan Capsule 1: Book Library */}
            <button
              onClick={() => handleNavClick('reads')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5 ${
                currentTab === 'reads'
                  ? 'bg-[radial-gradient(ellipse_at_center,rgba(122,219,240,0.34)_0%,rgba(122,219,240,0.12)_80%)] border-[#7ADBF0]/80 text-[#E0F7FF] shadow-[0_0_18px_rgba(122,219,240,0.32)] light:bg-none light:bg-cyan-600 light:text-white light:border-cyan-600'
                  : 'bg-[radial-gradient(ellipse_at_center,rgba(122,219,240,0.2)_0%,rgba(122,219,240,0.05)_80%)] border-[#7ADBF0]/45 text-[#BAE6FD] shadow-[0_0_12px_rgba(122,219,240,0.16)] hover:border-[#7ADBF0]/80 hover:shadow-[0_0_18px_rgba(122,219,240,0.28)] light:bg-none light:bg-cyan-50 light:border-cyan-500/45 light:text-cyan-800 light:hover:bg-cyan-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Book Library (Series &amp; Volumes)</span>
            </button>

            {/* Frosted Cyan Capsule 2: Match Centre */}
            <button
              onClick={() => handleNavClick('match-centre')}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5 ${
                isMatchCentreSection
                  ? 'bg-[radial-gradient(ellipse_at_center,rgba(122,219,240,0.34)_0%,rgba(122,219,240,0.12)_80%)] border-[#7ADBF0]/80 text-[#E0F7FF] shadow-[0_0_18px_rgba(122,219,240,0.32)] light:bg-none light:bg-cyan-600 light:text-white light:border-cyan-600'
                  : 'bg-[radial-gradient(ellipse_at_center,rgba(122,219,240,0.2)_0%,rgba(122,219,240,0.05)_80%)] border-[#7ADBF0]/45 text-[#BAE6FD] shadow-[0_0_12px_rgba(122,219,240,0.16)] hover:border-[#7ADBF0]/80 hover:shadow-[0_0_18px_rgba(122,219,240,0.28)] light:bg-none light:bg-cyan-50 light:border-cyan-500/45 light:text-cyan-800 light:hover:bg-cyan-100'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Match Centre</span>
            </button>



            {/* Standard / Active link: What's New */}
            <a
              href="/whats-new"
              onClick={(e) => {
                e.preventDefault();
                handleNavClick('announcements');
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer hover:-translate-y-0.5 ${
                currentTab === 'announcements'
                  ? 'bg-[radial-gradient(ellipse_at_center,rgba(122,219,240,0.22)_0%,rgba(122,219,240,0.06)_80%)] border border-[#7ADBF0]/60 text-[#E0F7FF] shadow-[0_0_14px_rgba(122,219,240,0.22)] light:bg-none light:bg-cyan-50 light:border-cyan-600/50 light:text-cyan-800'
                  : 'text-slate-300 dark:text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-950 hover:bg-white/[0.04] light:hover:bg-slate-200/70'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
              <span>What&apos;s New</span>
            </a>

          </nav>

          {/* Right Segmented Pillar Switcher: READS | MATCH CENTRE matching screenshot */}
          <div className="flex items-center p-1 rounded-xl bg-[#070E18] dark:bg-[#070E18] light:bg-slate-200 border border-white/10 light:border-slate-300 text-[10px] font-mono font-bold tracking-[0.16em] uppercase shrink-0">
            <button
              onClick={() => handleNavClick('reads')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                currentTab === 'reads' || (!isMatchCentreSection && activePillar === 'reads')
                  ? 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white font-extrabold shadow-[0_0_12px_rgba(122,219,240,0.3)]'
                  : 'text-slate-400 hover:text-white light:text-slate-600 light:hover:text-slate-950'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>READS</span>
            </button>
            <button
              onClick={() => handleNavClick('match-centre')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                isMatchCentreSection || activePillar === 'match-centre'
                  ? 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white font-extrabold shadow-[0_0_12px_rgba(122,219,240,0.3)]'
                  : 'text-slate-400 hover:text-white light:text-slate-600 light:hover:text-slate-950'
              }`}
            >
              <Target className="w-3 h-3" />
              <span>MATCH CENTRE</span>
            </button>
          </div>

        </div>
      </div>

      {/* 3. COMPACT FLOATING SIDE DRAWER (Matches reference styling, compact screen footprint, interactive hover & active tabs only) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          
          {/* Darkened Clickable Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-300 cursor-pointer"
            aria-label="Close side menu overlay"
          />

          {/* Compact Floating Drawer Panel */}
          <div className="fixed top-0 right-0 bottom-0 h-full w-80 sm:w-[340px] landscape-mobile:w-[440px] max-w-[88vw] bg-[#070F1B]/98 light:bg-white/98 backdrop-blur-2xl border-l border-white/[0.08] light:border-slate-200 shadow-[-16px_0_50px_rgba(0,0,0,0.75)] light:shadow-[-16px_0_40px_rgba(15,23,42,0.16)] p-5 landscape-mobile:p-3.5 pr-[max(1.25rem,env(safe-area-inset-right))] flex flex-col justify-between overflow-y-auto z-50 animate-in slide-in-from-right duration-300 ease-out">
            
            {/* Subtle glowing hairline along left edge */}
            <div className="absolute top-0 bottom-0 left-0 w-[2px] bg-gradient-to-b from-[#7ADBF0] via-sky-400/50 light:from-cyan-600 light:via-cyan-400/40 to-transparent pointer-events-none" />

            <div className="relative z-10 space-y-4 landscape-mobile:space-y-2.5">
              
              {/* Top Minimal Close Row */}
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-2">
                  <img
                    src={OFFICIAL_ASSETS.emblem}
                    alt="DodaEona F.C."
                    className="w-6 h-6 object-contain drop-shadow"
                  />
                  <span className="font-display text-sm text-white light:text-slate-900 tracking-wide">
                    DODAEONA <span className="text-[var(--accent-cyan)]">F.C.</span>
                  </span>
                </div>

                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-white/[0.04] light:bg-slate-100 hover:bg-[#7ADBF0]/20 border border-white/10 light:border-slate-200 hover:border-[#7ADBF0]/60 text-slate-400 hover:text-[var(--accent-cyan)] transition-all transform hover:rotate-90 cursor-pointer"
                  aria-label="Close side menu"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. Search Bar with Live Database Options */}
              <div className="relative w-full">
                <form onSubmit={handleSearchSubmit} className="relative w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchInput}
                    onFocus={() => {
                      setDrawerSearchFocused(true);
                      handleWarmSearchIndex();
                    }}
                    onBlur={() => setTimeout(() => setDrawerSearchFocused(false), 180)}
                    onChange={(e) => {
                      handleSearchInputChange(e.target.value);
                      setDrawerSearchFocused(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Search clubs, players, managers, books..."
                    className="w-full bg-[#0B1525] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900 placeholder:text-slate-400 rounded-xl pl-10 pr-12 py-2.5 focus:outline-none focus:border-[#7ADBF0] transition-all"
                  />
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => {
                        if (globalSyncTimerRef.current) window.clearTimeout(globalSyncTimerRef.current);
                        setSearchInput('');
                        setGlobalSearch('');
                      }}
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </form>
                {drawerSearchFocused && liveDatabaseResults && (
                  <div className="mt-1.5 rounded-xl bg-[#0C131F] light:bg-white border border-white/15 light:border-slate-200 shadow-2xl overflow-hidden">
                    {renderSearchOptionsList()}
                  </div>
                )}
              </div>

              {/* 2. Segmented Pillar Switcher (READS | MATCH CENTRE) */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0B1525] light:bg-slate-200 border border-white/10 light:border-slate-300 text-[11px] font-bold tracking-wider uppercase">
                <button
                  onClick={() => handleNavClick('reads')}
                  className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    currentTab === 'reads'
                      ? 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white font-bold shadow-[0_0_15px_rgba(122,219,240,0.3)]'
                      : 'text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 hover:bg-white/[0.06]'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>READS</span>
                </button>
                <button
                  onClick={() => handleNavClick('match-centre')}
                  className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    currentTab === 'match-centre'
                      ? 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white font-bold shadow-[0_0_15px_rgba(122,219,240,0.3)]'
                      : 'text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 hover:bg-white/[0.06]'
                  }`}
                >
                  <Target className="w-3.5 h-3.5 shrink-0" />
                  <span>MATCH CENTRE</span>
                </button>
              </div>

              {/* 3. Two Prominent Experience Portal Cards */}
              <div className="space-y-2.5 landscape-mobile:space-y-0 landscape-mobile:grid landscape-mobile:grid-cols-2 landscape-mobile:gap-2">
                {/* Card 1: Book Library (Series & Volumes) */}
                <button
                  onClick={() => handleNavClick('reads')}
                  className={`group w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                    currentTab === 'reads'
                      ? 'bg-[#7ADBF0]/[0.08] border-[#7ADBF0]/60 shadow-[0_0_20px_rgba(122,219,240,0.16)] translate-x-1'
                      : 'bg-[#0B1525]/80 light:bg-white border-white/10 light:border-slate-200 hover:border-[#7ADBF0]/60 hover:bg-[#7ADBF0]/[0.05] hover:translate-x-1 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                        currentTab === 'reads'
                          ? 'bg-[#7ADBF0]/20 border-[#7ADBF0]/50 text-[#7ADBF0] light:text-cyan-700'
                          : 'bg-white/[0.04] light:bg-slate-100 border-white/10 light:border-slate-200 text-slate-300 light:text-slate-600 group-hover:bg-[#7ADBF0]/15 group-hover:border-[#7ADBF0]/40 group-hover:text-[var(--accent-cyan)] group-hover:scale-105'
                      }`}
                    >
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-[13px] text-white light:text-slate-900 group-hover:text-[var(--accent-cyan)] transition-colors block truncate">
                        Book Library (Series &amp; Volumes)
                      </span>
                      <span className="text-[9px] font-bold tracking-[0.18em] text-slate-400 uppercase block mt-0.5 truncate">
                        SERIES &amp; VOLUMES
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      currentTab === 'reads'
                        ? 'text-[var(--accent-cyan)] translate-x-0.5'
                        : 'text-slate-500 group-hover:text-[var(--accent-cyan)] group-hover:translate-x-1'
                    }`}
                  />
                </button>

                {/* Card 2: Match Centre */}
                <button
                  onClick={() => handleNavClick('match-centre')}
                  className={`group w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                    currentTab === 'match-centre'
                      ? 'bg-[#7ADBF0]/[0.08] border-[#7ADBF0]/60 shadow-[0_0_20px_rgba(122,219,240,0.16)] translate-x-1'
                      : 'bg-[#0B1525]/80 light:bg-white border-white/10 light:border-slate-200 hover:border-[#7ADBF0]/60 hover:bg-[#7ADBF0]/[0.05] hover:translate-x-1 hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all ${
                        currentTab === 'match-centre'
                          ? 'bg-[#7ADBF0]/20 border-[#7ADBF0]/50 text-[#7ADBF0] light:text-cyan-700'
                          : 'bg-[#7ADBF0]/10 border-[#7ADBF0]/30 text-[var(--accent-cyan)] group-hover:bg-[#7ADBF0]/20 group-hover:scale-105'
                      }`}
                    >
                      <Swords className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-[13px] text-white light:text-slate-900 group-hover:text-[var(--accent-cyan)] transition-colors block truncate">
                        Match Centre
                      </span>
                      <span className="text-[9px] font-bold tracking-[0.18em] text-slate-400 uppercase block mt-0.5 truncate">
                        MATCH ENGINE &amp; ANALYSIS
                      </span>
                    </div>
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 shrink-0 transition-transform ${
                      currentTab === 'match-centre'
                        ? 'text-[var(--accent-cyan)] translate-x-0.5'
                        : 'text-[var(--accent-cyan)] group-hover:translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Subtle Hairline Divider */}
              <div className="border-t border-white/10 light:border-slate-200 my-1" />

              {/* 4. Clean List of Active Platform Links (Only implemented tabs kept) */}
              <div className="space-y-1">
                {[
                  { label: 'Home', key: 'home' as NavigationDestination, icon: Home, accentColor: 'group-hover:text-[var(--accent-cyan)]' },
                  { label: "What's New", key: 'announcements' as NavigationDestination, icon: Sparkles, accentColor: 'group-hover:text-[var(--accent-cyan)]' },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => handleNavClick(item.key)}
                      className={`group w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-3.5 cursor-pointer ${
                        isActive
                          ? 'text-[var(--accent-cyan)] bg-[#7ADBF0]/10 font-bold translate-x-1'
                          : 'text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 hover:bg-white/[0.06] hover:translate-x-1.5'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-all duration-200 ${
                          isActive
                            ? 'text-[var(--accent-cyan)]'
                            : `text-slate-400 group-hover:scale-110 ${item.accentColor}`
                        }`}
                      />
                      <span>{item.label}</span>
                    </button>
                  );
                })}

                {isAdmin ? (
                  <a
                    href="/admin"
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      if (onOpenAdmin) onOpenAdmin();
                      else onNavigate('admin');
                    }}
                    className="group w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold text-[var(--accent-cyan)] hover:bg-[#7ADBF0]/15 transition-all duration-200 flex items-center gap-3.5 cursor-pointer hover:translate-x-1.5 mt-1"
                  >
                    <LayoutDashboard className="w-4 h-4 shrink-0 text-[var(--accent-cyan)] group-hover:scale-110 transition-transform" />
                    <span>Dashboard</span>
                  </a>
                ) : isAuthenticated ? (
                  <a
                    href="/my-library"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick('my-library');
                    }}
                    className="group w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold text-[var(--accent-cyan)] hover:bg-[#7ADBF0]/15 transition-all duration-200 flex items-center gap-3.5 cursor-pointer hover:translate-x-1.5 mt-1"
                  >
                    <User className="w-4 h-4 shrink-0 text-[var(--accent-cyan)] group-hover:scale-110 transition-transform" />
                    <span>My library</span>
                  </a>
                ) : (
                  <a
                    href="/login"
                    onClick={(e) => {
                      e.preventDefault();
                      handleNavClick('login');
                    }}
                    className="group w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-bold text-[var(--accent-cyan)] hover:bg-[#7ADBF0]/15 transition-all duration-200 flex items-center gap-3.5 cursor-pointer hover:translate-x-1.5 mt-1"
                  >
                    <LogIn className="w-4 h-4 shrink-0 text-[var(--accent-cyan)] group-hover:scale-110 transition-transform" />
                    <span>Sign in</span>
                  </a>
                )}

                {isAuthenticated && (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="group w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold text-rose-400 light:text-rose-600 hover:bg-rose-500/10 transition-all duration-200 flex items-center gap-3.5 cursor-pointer hover:translate-x-1.5 mt-1"
                  >
                    <LogOut className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
                    <span>Sign out</span>
                  </button>
                )}

                <div className="pt-2">
                  <PWAInstallButton variant="hero" className="w-full justify-center" />
                </div>
              </div>

            </div>

            {/* Controls Footer */}
            <div className="pt-4 border-t border-white/10 light:border-slate-200 flex items-center justify-between text-xs mt-6">
              <button
                onClick={toggleTheme}
                className="flex items-center gap-2 text-slate-300 light:text-slate-700 hover:text-[var(--accent-cyan)] transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06]"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4 text-[var(--accent-cyan)]" /> : <Moon className="w-4 h-4" />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>

              <button
                onClick={toggleAudio}
                className="flex items-center gap-1.5 text-slate-400 hover:text-[var(--accent-cyan)] transition-colors cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-white/[0.06]"
                title={
                  musicTracks.length === 0
                    ? 'Open audio console'
                    : isAudioPlaying
                    ? 'Mute audio'
                    : 'Play audio'
                }
              >
                {isAudioPlaying ? <Volume2 className="w-4 h-4 text-[var(--accent-cyan)] animate-pulse" /> : <VolumeX className="w-4 h-4" />}
                <span>{isAudioPlaying ? 'Mute' : 'Audio'}</span>
              </button>
            </div>

          </div>

        </div>
      )}

    </header>
  );
};
