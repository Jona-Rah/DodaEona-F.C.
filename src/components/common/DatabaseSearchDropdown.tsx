import React, { useCallback, useDeferredValue, useMemo } from 'react';
import {
  Award,
  BookOpen,
  Briefcase,
  ChevronRight,
  MapPin,
  User,
} from 'lucide-react';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { useReads } from '../../context/ReadsContext';
import { useTheme } from '../../context/ThemeContext';
import { getAllStadiums } from '../../data/stadiumsDatabase';
import {
  GlobalSearchLimits,
  searchWholeDatabase,
  warmWholeDatabaseSearchIndex,
} from '../../utils/globalDatabaseSearch';
import { BookVolume, ReadingSeriesItem } from '../../types/reads';

export function useWholeDatabaseQuickSearch(
  query: string,
  enabled: boolean,
  limits?: GlobalSearchLimits
) {
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
  const { setGlobalSearch } = useTheme();

  const deferredQuery = useDeferredValue(query);
  const allStadiums = useMemo(() => getAllStadiums(), []);

  const warmIndex = useCallback(() => {
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

  const results = useMemo(() => {
    if (!enabled) return null;
    const trimmed = deferredQuery.trim();
    if (trimmed.length < 2) return null;
    return searchWholeDatabase(
      trimmed,
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
      limits ?? {
        clubs: 5,
        players: 5,
        managers: 4,
        stadiums: 3,
        leagues: 2,
        books: 3,
        series: 2,
      }
    );
  }, [
    enabled,
    deferredQuery,
    teams,
    registry,
    managers,
    managerAppointments,
    publishedBooks,
    publishedSeries,
    representedLeagues,
    allStadiums,
    limits,
  ]);

  const openFullSearchModal = useCallback(
    (overrideQuery?: string) => {
      const q = (overrideQuery ?? query).trim();
      setGlobalSearch(q);
      window.dispatchEvent(new CustomEvent('dodaeona:open-search-modal'));
    },
    [query, setGlobalSearch]
  );

  return {
    results,
    deferredQuery,
    warmIndex,
    openTeamById,
    openPlayerProfile,
    openManagerProfile,
    openTeamStadium,
    openLeagueDirectory,
    openFullSearchModal,
  };
}

interface DatabaseSearchDropdownProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  limits?: GlobalSearchLimits;
  prioritizeReads?: boolean;
  prioritizeManagers?: boolean;
  onSelectBook?: (book: BookVolume) => void;
  onSelectSeries?: (series: ReadingSeriesItem) => void;
  onOpenLibrary?: () => void;
  className?: string;
}

export const DatabaseSearchDropdown: React.FC<DatabaseSearchDropdownProps> = ({
  query,
  isOpen,
  onClose,
  limits,
  prioritizeReads = false,
  prioritizeManagers = false,
  onSelectBook,
  onSelectSeries,
  onOpenLibrary,
  className = '',
}) => {
  const {
    results,
    deferredQuery,
    openTeamById,
    openPlayerProfile,
    openManagerProfile,
    openTeamStadium,
    openLeagueDirectory,
    openFullSearchModal,
  } = useWholeDatabaseQuickSearch(query, isOpen, limits);

  if (!isOpen || !results) return null;

  const navigateToReads = (payload: { bookId?: string; seriesId?: string }) => {
    window.dispatchEvent(new CustomEvent('dodaeona:open-reads', { detail: payload }));
  };

  const renderClubsSection = () =>
    results.clubs.length > 0 ? (
      <div key="clubs" className="py-1">
        <div className="px-3 py-1 font-mono text-[9px] tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold">
          Clubs &amp; Nations
        </div>
        {results.clubs.map((team) => (
          <button
            key={`dsd-club-${team.id}`}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onClose();
              openTeamById(team.id, 1);
            }}
            className="w-full px-3 py-2 flex items-center justify-between gap-2.5 hover:bg-white/[0.05] light:hover:bg-slate-50 text-left cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={team.crestUrl}
                alt={team.name}
                className="w-5 h-5 object-contain rounded shrink-0"
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
            <span className="font-mono text-[11px] font-bold text-[#7ADBF0] light:text-cyan-700 shrink-0 tabular-nums">
              {team.overallRating}
            </span>
          </button>
        ))}
      </div>
    ) : null;

  const renderPlayersSection = () =>
    results.players.length > 0 ? (
      <div key="players" className="py-1">
        <div className="px-3 py-1 font-mono text-[9px] tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold">
          Players
        </div>
        {results.players.map((p) => (
          <button
            key={`dsd-player-${p.id}`}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onClose();
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
            <span className="font-mono text-[11px] font-bold text-[#7ADBF0] light:text-cyan-700 shrink-0 tabular-nums">
              {p.overallRating}
            </span>
          </button>
        ))}
      </div>
    ) : null;

  const renderManagersSection = () =>
    results.managers.length > 0 ? (
      <div key="managers" className="py-1">
        <div className="px-3 py-1 font-mono text-[9px] tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold">
          Managers
        </div>
        {results.managers.map(({ manager, currentTeamName }) => (
          <button
            key={`dsd-mgr-${manager.id}`}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onClose();
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
    ) : null;

  const renderStadiumsAndLeaguesSection = () =>
    results.stadiums.length > 0 || results.leagues.length > 0 ? (
      <div key="stadiums-leagues" className="py-1">
        <div className="px-3 py-1 font-mono text-[9px] tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold">
          Stadiums &amp; Leagues
        </div>
        {results.leagues.map((lg) => (
          <button
            key={`dsd-lg-${lg.name}`}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onClose();
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
        {results.stadiums.map((st) => (
          <button
            key={`dsd-stad-${st.id}`}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onClose();
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
    ) : null;

  const renderReadsSection = () =>
    results.books.length > 0 || results.series.length > 0 ? (
      <div key="reads" className="py-1">
        <div className="px-3 py-1 font-mono text-[9px] tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold">
          Books &amp; Series
        </div>
        {results.series.map((s) => (
          <button
            key={`dsd-ser-${s.id}`}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onClose();
              if (onSelectSeries) onSelectSeries(s);
              else navigateToReads({ seriesId: s.id });
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
        {results.books.map((b) => (
          <button
            key={`dsd-book-${b.id}`}
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onClose();
              if (onSelectBook) onSelectBook(b);
              else navigateToReads({ bookId: b.id });
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
    ) : null;

  const sections = prioritizeReads
    ? [
        renderReadsSection(),
        renderClubsSection(),
        renderPlayersSection(),
        renderManagersSection(),
        renderStadiumsAndLeaguesSection(),
      ]
    : prioritizeManagers
    ? [
        renderManagersSection(),
        renderClubsSection(),
        renderPlayersSection(),
        renderStadiumsAndLeaguesSection(),
        renderReadsSection(),
      ]
    : [
        renderClubsSection(),
        renderPlayersSection(),
        renderManagersSection(),
        renderStadiumsAndLeaguesSection(),
        renderReadsSection(),
      ];

  return (
    <div
      className={`rounded-2xl bg-[#0C131F] dark:bg-[#0C131F] light:bg-white border border-white/[0.14] light:border-slate-200 shadow-2xl overflow-hidden text-left ${className}`}
    >
      <div className="px-3 py-1.5 border-b border-white/[0.06] light:border-slate-200 flex items-center justify-between">
        <span className="font-mono text-[9px] tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold">
          WHOLE DATABASE OPTIONS
        </span>
        <span className="font-mono text-[9px] text-slate-400 light:text-slate-500">
          CLICK TO OPEN
        </span>
      </div>
      {results.totalCount === 0 ? (
        <div className="px-4 py-4 text-center text-xs text-slate-400 light:text-slate-600">
          No database matches for &ldquo;{deferredQuery.trim()}&rdquo;
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto divide-y divide-white/[0.06] light:divide-slate-100">
          {sections}
          {onOpenLibrary && prioritizeReads && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onClose();
                onOpenLibrary();
              }}
              className="w-full px-3.5 py-2 bg-white/[0.02] light:bg-slate-50 hover:bg-white/[0.06] text-slate-300 light:text-slate-700 text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors"
            >
              <span>Filter books &amp; series library</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              onClose();
              openFullSearchModal();
            }}
            className="w-full px-3.5 py-2.5 bg-[#09121F] light:bg-slate-50 hover:bg-[#7ADBF0]/15 text-[#7ADBF0] light:text-cyan-700 text-xs font-bold flex items-center justify-between cursor-pointer transition-colors"
          >
            <span>Search all matching database results</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
