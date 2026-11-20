import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Search,
  X,
  BookOpen,
  Trophy,
  Users,
  ChevronRight,
  MapPin,
  Briefcase,
  Layers,
  Award,
} from 'lucide-react';
import { useReads } from '../context/ReadsContext';
import { useMatchCentre } from '../context/MatchCentreContext';
import { useTheme } from '../context/ThemeContext';
import { getAllStadiums } from '../data/stadiumsDatabase';
import { searchWholeDatabase } from '../utils/globalDatabaseSearch';

interface GlobalSearchResultsModalProps {
  isOpen: boolean;
  searchQuery?: string;
  onClose: () => void;
  onNavigate: (destination: any, payload?: any) => void;
}

type SearchCategoryFilter =
  | 'all'
  | 'clubs'
  | 'players'
  | 'managers'
  | 'stadiums'
  | 'leagues'
  | 'reads';

export const GlobalSearchResultsModal: React.FC<GlobalSearchResultsModalProps> = ({
  isOpen,
  searchQuery,
  onClose,
  onNavigate,
}) => {
  if (!isOpen) return null;

  return (
    <GlobalSearchResultsModalContent
      initialQueryProp={searchQuery}
      onClose={onClose}
      onNavigate={onNavigate}
    />
  );
};

interface GlobalSearchResultsModalContentProps {
  initialQueryProp?: string;
  onClose: () => void;
  onNavigate: (destination: any, payload?: any) => void;
}

const GlobalSearchResultsModalContent: React.FC<GlobalSearchResultsModalContentProps> = ({
  initialQueryProp,
  onClose,
  onNavigate,
}) => {
  const { publishedBooks, publishedSeries } = useReads();
  const {
    teams,
    registry,
    managers,
    managerAppointments,
    representedLeagues,
    openPlayerProfile,
    openTeamById,
    openManagerProfile,
    openTeamStadium,
    openLeagueDirectory,
  } = useMatchCentre();
  const { globalSearch, setGlobalSearch } = useTheme();

  const effectiveGlobal = initialQueryProp ?? globalSearch;
  const [localQuery, setLocalQuery] = useState(effectiveGlobal);
  const deferredQuery = useDeferredValue(localQuery);
  const [categoryFilter, setCategoryFilter] = useState<SearchCategoryFilter>('all');
  const syncTimerRef = useRef<number | null>(null);
  const allStadiums = useMemo(() => getAllStadiums(), []);

  useEffect(() => {
    setLocalQuery(effectiveGlobal);
  }, [effectiveGlobal]);

  useEffect(() => {
    setCategoryFilter('all');
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [onClose]);

  const handleQueryChange = (next: string) => {
    setLocalQuery(next);
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      setGlobalSearch(next);
    }, 180);
  };

  const results = useMemo(() => {
    return searchWholeDatabase(
      deferredQuery,
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
        books: 12,
        series: 8,
        leagues: 12,
        clubs: 24,
        players: 30,
        managers: 18,
        stadiums: 18,
      }
    );
  }, [
    deferredQuery,
    teams,
    registry,
    managers,
    managerAppointments,
    publishedBooks,
    publishedSeries,
    representedLeagues,
    allStadiums,
  ]);

  const readsCount = results.books.length + results.series.length;

  const filterChips: Array<{ id: SearchCategoryFilter; label: string; count: number }> = [
    { id: 'all', label: 'All Results', count: results.totalCount },
    { id: 'clubs', label: 'Clubs & Nations', count: results.clubs.length },
    { id: 'players', label: 'Players', count: results.players.length },
    { id: 'managers', label: 'Managers', count: results.managers.length },
    { id: 'stadiums', label: 'Stadiums', count: results.stadiums.length },
    { id: 'leagues', label: 'Leagues', count: results.leagues.length },
    { id: 'reads', label: 'Books & Series', count: readsCount },
  ];

  const showSection = (id: Exclude<SearchCategoryFilter, 'all'>) =>
    categoryFilter === 'all' || categoryFilter === id;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
        aria-label="Close search results"
      />

      {/* Modal Dialog */}
      <div className="relative min-h-[100dvh] flex items-center justify-center p-4 sm:p-6 landscape-mobile:p-2.5 lg:p-10">
        <div className="relative w-full max-w-5xl max-h-[calc(100dvh-1.5rem)] flex flex-col bg-[#070F1B] dark:bg-[#070F1B] light:bg-white border border-white/15 dark:border-white/15 light:border-slate-300 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.8)] light:shadow-[0_20px_50px_rgba(15,23,42,0.2)] overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Header with Live Database Input */}
          <div className="px-6 py-4 landscape-mobile:px-4 landscape-mobile:py-3 border-b border-white/10 dark:border-white/10 light:border-slate-200 bg-[#0B1525]/85 dark:bg-[#0B1525]/85 light:bg-slate-50 shrink-0 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 landscape-mobile:w-8 landscape-mobile:h-8 rounded-xl bg-[#7ADBF0]/15 border border-[#7ADBF0]/40 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700 shadow-sm shrink-0">
                  <Search className="w-5 h-5 landscape-mobile:w-4 landscape-mobile:h-4" />
                </div>
                <div className="relative flex-1 max-w-2xl">
                  <input
                    type="text"
                    value={localQuery}
                    onChange={(e) => handleQueryChange(e.target.value)}
                    placeholder="Search the whole database: clubs, players, managers, stadiums, leagues, books..."
                    autoFocus
                    className="w-full bg-[#060C16] dark:bg-[#060C16] light:bg-white border border-white/15 light:border-slate-300 rounded-xl px-4 py-2.5 pr-9 text-sm text-white light:text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#7ADBF0] light:focus:border-cyan-600"
                  />
                  {localQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalQuery('');
                        setGlobalSearch('');
                      }}
                      aria-label="Clear search query"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/[0.05] light:bg-slate-200 hover:bg-[#7ADBF0]/20 border border-white/10 light:border-slate-300 text-slate-300 light:text-slate-700 hover:text-[#7ADBF0] transition-all cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Filter Chips + Match Summary */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {filterChips.map((chip) => {
                  const active = categoryFilter === chip.id;
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setCategoryFilter(chip.id)}
                      className={`px-3 py-1 rounded-full text-[11px] font-mono font-semibold transition-all cursor-pointer border ${
                        active
                          ? 'bg-[#7ADBF0] text-[#050A12] border-[#7ADBF0] light:bg-cyan-600 light:text-white light:border-cyan-600'
                          : 'bg-white/[0.04] light:bg-white border-white/10 light:border-slate-300 text-slate-300 light:text-slate-700 hover:border-[#7ADBF0]/50'
                      }`}
                    >
                      {chip.label} ({chip.count})
                    </button>
                  );
                })}
              </div>
              <span className="text-[11px] font-mono text-slate-400 light:text-slate-600">
                Click any result to open it directly
              </span>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 landscape-mobile:p-4 space-y-7 landscape-mobile:space-y-4 flex-1 overflow-y-auto">
            {!localQuery.trim() ? (
              <div className="text-center py-14 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-[#7ADBF0]/10 border border-[#7ADBF0]/30 flex items-center justify-center mx-auto text-[#7ADBF0]">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
                  Search Across the Entire Database
                </h3>
                <p className="text-xs text-slate-400 light:text-slate-600 max-w-md mx-auto">
                  Start typing to find any club, national team, player, manager, stadium, league, or book volume and click any option to open it immediately.
                </p>
              </div>
            ) : results.totalCount === 0 ? (
              <div className="text-center py-14 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto text-slate-500">
                  <Search className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-white dark:text-white light:text-slate-900">
                  No matches found
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  No books, leagues, clubs, players, managers, or stadiums matched &ldquo;{localQuery}&rdquo;. Try searching for a club name, player name, coach, city, or league.
                </p>
              </div>
            ) : (
              <>
                {/* 1. CLUBS & NATIONAL TEAMS SECTION */}
                {showSection('clubs') && results.clubs.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 light:border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
                        <h3 className="text-xs font-mono font-bold tracking-wider text-white dark:text-white light:text-slate-900 uppercase">
                          Clubs &amp; National Teams ({results.clubs.length})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate('match-centre');
                        }}
                        className="text-[11px] text-[#7ADBF0] light:text-cyan-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <span>Open Match Centre</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {results.clubs.map((team) => (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() => {
                            onClose();
                            openTeamById(team.id, 1);
                          }}
                          className="group p-3 rounded-2xl bg-[#0B1525] dark:bg-[#0B1525] light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 hover:border-[#7ADBF0]/60 hover:shadow-lg transition-all cursor-pointer flex items-center gap-3 text-left"
                        >
                          <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center p-1 shrink-0">
                            <img
                              src={team.crestUrl}
                              alt={team.name}
                              className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-white dark:text-white light:text-slate-900 group-hover:text-[#7ADBF0] light:group-hover:text-cyan-700 transition-colors truncate">
                              {team.name}
                            </h4>
                            <p className="text-[10px] text-slate-400 light:text-slate-600 font-mono truncate mt-0.5">
                              {team.type === 'national' ? 'National Team · ' : ''}
                              {team.country}
                              {team.league ? ` · ${team.league}` : ''}
                            </p>
                          </div>
                          <div className="px-2 py-1 rounded-lg bg-[#7ADBF0]/10 border border-[#7ADBF0]/30 text-[11px] font-mono font-bold text-[#7ADBF0] light:text-cyan-700 shrink-0">
                            {team.overallRating}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. PLAYERS SECTION */}
                {showSection('players') && results.players.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 light:border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
                        <h3 className="text-xs font-mono font-bold tracking-wider text-white dark:text-white light:text-slate-900 uppercase">
                          Players ({results.players.length})
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 gap-2.5">
                      {results.players.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => {
                            onClose();
                            openPlayerProfile(player.id);
                          }}
                          className="group p-3 rounded-xl bg-[#0B1525] dark:bg-[#0B1525] light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 hover:border-[#7ADBF0]/60 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#7ADBF0]/15 border border-[#7ADBF0]/30 flex items-center justify-center font-mono font-bold text-xs text-[#7ADBF0] light:text-cyan-700 shrink-0">
                              {player.overallRating}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white dark:text-white light:text-slate-900 group-hover:text-[#7ADBF0] light:group-hover:text-cyan-700 transition-colors truncate">
                                {player.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 light:text-slate-600 font-mono truncate mt-0.5">
                                {player.position} · {player.nationality} ·{' '}
                                <span className="text-slate-300 light:text-slate-700">
                                  {player.currentTeamName}
                                </span>
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#7ADBF0] group-hover:translate-x-0.5 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. MANAGERS SECTION */}
                {showSection('managers') && results.managers.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 light:border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
                        <h3 className="text-xs font-mono font-bold tracking-wider text-white dark:text-white light:text-slate-900 uppercase">
                          Managers ({results.managers.length})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate('managers');
                        }}
                        className="text-[11px] text-[#7ADBF0] light:text-cyan-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <span>View Managers Directory</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {results.managers.map(({ manager, currentTeamName }) => (
                        <button
                          key={manager.id}
                          type="button"
                          onClick={() => {
                            onClose();
                            openManagerProfile(manager.id);
                          }}
                          className="group p-3 rounded-xl bg-[#0B1525] dark:bg-[#0B1525] light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 hover:border-[#7ADBF0]/60 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#7ADBF0]/12 border border-[#7ADBF0]/30 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700 shrink-0">
                              <Briefcase className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white dark:text-white light:text-slate-900 group-hover:text-[#7ADBF0] light:group-hover:text-cyan-700 transition-colors truncate">
                                {manager.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 light:text-slate-600 font-mono truncate mt-0.5">
                                {manager.nationality}
                                {currentTeamName ? ` · ${currentTeamName}` : ''}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#7ADBF0] group-hover:translate-x-0.5 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. STADIUMS SECTION */}
                {showSection('stadiums') && results.stadiums.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 light:border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
                        <h3 className="text-xs font-mono font-bold tracking-wider text-white dark:text-white light:text-slate-900 uppercase">
                          Stadiums ({results.stadiums.length})
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {results.stadiums.map((stadium) => (
                        <button
                          key={stadium.id}
                          type="button"
                          onClick={() => {
                            onClose();
                            openTeamStadium(stadium.clubId);
                          }}
                          className="group p-3 rounded-xl bg-[#0B1525] dark:bg-[#0B1525] light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 hover:border-[#7ADBF0]/60 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#7ADBF0]/12 border border-[#7ADBF0]/30 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700 shrink-0">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white dark:text-white light:text-slate-900 group-hover:text-[#7ADBF0] light:group-hover:text-cyan-700 transition-colors truncate">
                                {stadium.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 light:text-slate-600 font-mono truncate mt-0.5">
                                {stadium.clubName} · {stadium.city} · {stadium.capacity.toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#7ADBF0] group-hover:translate-x-0.5 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. LEAGUES SECTION */}
                {showSection('leagues') && results.leagues.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 light:border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
                        <h3 className="text-xs font-mono font-bold tracking-wider text-white dark:text-white light:text-slate-900 uppercase">
                          Leagues ({results.leagues.length})
                        </h3>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {results.leagues.map((lg) => (
                        <button
                          key={lg.name}
                          type="button"
                          onClick={() => {
                            onClose();
                            openLeagueDirectory(lg.name);
                          }}
                          className="group p-3 rounded-xl bg-[#0B1525] dark:bg-[#0B1525] light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 hover:border-[#7ADBF0]/60 hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-[#7ADBF0]/12 border border-[#7ADBF0]/30 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700 shrink-0">
                              <Award className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white dark:text-white light:text-slate-900 group-hover:text-[#7ADBF0] light:group-hover:text-cyan-700 transition-colors truncate">
                                {lg.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 light:text-slate-600 font-mono truncate mt-0.5">
                                {lg.country ? `${lg.country} · ` : ''}
                                {lg.count} clubs
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#7ADBF0] group-hover:translate-x-0.5 transition-all shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. BOOKS & SERIES SECTION */}
                {showSection('reads') && readsCount > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 dark:border-white/10 light:border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
                        <h3 className="text-xs font-mono font-bold tracking-wider text-white dark:text-white light:text-slate-900 uppercase">
                          Books &amp; Series ({readsCount})
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onNavigate('reads');
                        }}
                        className="text-[11px] text-[#7ADBF0] light:text-cyan-700 hover:underline flex items-center gap-1 font-semibold cursor-pointer"
                      >
                        <span>View Library</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    {results.series.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {results.series.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              onClose();
                              onNavigate('reads', { seriesId: s.id });
                            }}
                            className="group p-3.5 rounded-2xl bg-[#0B1525] dark:bg-[#0B1525] light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 hover:border-[#7ADBF0]/60 hover:shadow-lg transition-all cursor-pointer flex items-center gap-3.5 text-left"
                          >
                            <div className="w-10 h-10 rounded-xl bg-[#7ADBF0]/12 border border-[#7ADBF0]/30 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700 shrink-0">
                              <Layers className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-mono font-bold tracking-wider text-[#7ADBF0] light:text-cyan-700 uppercase block truncate">
                                SERIES · {s.volumeCount} VOLUMES
                              </span>
                              <h4 className="text-sm font-bold text-white dark:text-white light:text-slate-900 group-hover:text-[#7ADBF0] light:group-hover:text-cyan-700 transition-colors truncate mt-0.5">
                                {s.title}
                              </h4>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-[#7ADBF0] shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {results.books.length > 0 && (
                      <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-3">
                        {results.books.map((book) => (
                          <button
                            key={book.id}
                            type="button"
                            onClick={() => {
                              onClose();
                              onNavigate('reads', { bookId: book.id });
                            }}
                            className="group p-3.5 rounded-2xl bg-[#0B1525] dark:bg-[#0B1525] light:bg-slate-50 border border-white/10 dark:border-white/10 light:border-slate-200 hover:border-[#7ADBF0]/60 hover:shadow-lg transition-all cursor-pointer flex items-start gap-3.5 text-left"
                          >
                            <img
                              src={book.coverUrl || '/assets/aistudio/image_40b4a5be.png'}
                              alt={book.title}
                              className="w-12 h-16 sm:w-14 sm:h-20 object-cover rounded-xl border border-white/10 shrink-0 shadow"
                            />
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] font-mono font-bold tracking-wider text-[#7ADBF0] light:text-cyan-700 uppercase block truncate">
                                {book.seriesTitle} · Vol. {book.volumeNumber}
                              </span>
                              <h4 className="text-sm font-bold text-white dark:text-white light:text-slate-900 group-hover:text-[#7ADBF0] light:group-hover:text-cyan-700 transition-colors truncate mt-0.5">
                                {book.title}
                              </h4>
                              <p className="text-xs text-slate-400 dark:text-slate-400 light:text-slate-600 line-clamp-2 mt-1">
                                {book.description}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3.5 landscape-mobile:px-4 landscape-mobile:py-2.5 bg-[#0B1525]/80 dark:bg-[#0B1525]/80 light:bg-slate-50 border-t border-white/10 dark:border-white/10 light:border-slate-200 flex items-center justify-between text-xs shrink-0">
            <span className="text-slate-400 light:text-slate-600">
              Press Esc or click outside to close
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl btn-primary-theme font-bold transition-all shadow-sm cursor-pointer"
            >
              Close Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
