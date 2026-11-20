import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Search, Plus, ChevronDown, User, Briefcase, MapPin, Award, ChevronRight, Scale } from 'lucide-react';
import { type ConfederationType } from '../../types/matchCentre';
import { getAllStadiums } from '../../data/stadiumsDatabase';
import { searchWholeDatabase, warmWholeDatabaseSearchIndex } from '../../utils/globalDatabaseSearch';

export const TeamControlBar: React.FC = () => {
  const {
    viewChip,
    ordering,
    setOrdering,
    searchQuery,
    setSearchQuery,
    leagueFilter,
    setLeagueFilter,
    confederationFilter,
    setConfederationFilter,
    representedLeagues,
    representedConfederations,
    registry,
    teams,
    managers,
    managerAppointments,
    openCreateModal,
    openPlayerProfile,
    openTeamById,
    openManagerProfile,
    openTeamStadium,
    openLeagueDirectory,
    openCompareTeams,
  } = useMatchCentre();

  const { isAuthenticated } = useAuth();
  const { setGlobalSearch } = useTheme();
  const [searchFocused, setSearchFocused] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const deferredLocalQuery = useDeferredValue(localQuery);
  const syncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, []);

  const handleQueryChange = useCallback(
    (next: string) => {
      setLocalQuery(next);
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
      syncTimerRef.current = window.setTimeout(() => {
        setSearchQuery(next);
      }, 150);
    },
    [setSearchQuery]
  );

  const isFreeAgentsView = viewChip === 'free-agents';
  const showConfederationFilter =
    viewChip === 'all-teams' || viewChip === 'mens-nations' || viewChip === 'womens-nations';
  const showLeagueFilter =
    viewChip === 'all-teams' || viewChip === 'mens-clubs' || viewChip === 'womens-clubs';
  const isUserAuthenticated = isAuthenticated;

  const allStadiums = useMemo(() => getAllStadiums(), []);

  const handleWarmSearchIndex = useCallback(() => {
    window.setTimeout(() => {
      warmWholeDatabaseSearchIndex({
        teams,
        registry,
        managers,
        managerAppointments,
        representedLeagues,
        stadiums: allStadiums,
      });
    }, 0);
  }, [teams, registry, managers, managerAppointments, representedLeagues, allStadiums]);

  const quickResults = useMemo(() => {
    if (!searchFocused) return null;
    const q = deferredLocalQuery.trim();
    if (q.length < 2) return null;
    return searchWholeDatabase(
      q,
      {
        teams,
        registry,
        managers,
        managerAppointments,
        representedLeagues,
        stadiums: allStadiums,
      },
      {
        leagues: 2,
        clubs: 5,
        players: 6,
        managers: 4,
        stadiums: 4,
        books: 2,
        series: 1,
      }
    );
  }, [
    searchFocused,
    deferredLocalQuery,
    teams,
    registry,
    managers,
    managerAppointments,
    representedLeagues,
    allStadiums,
  ]);

  return (
    <div className="rounded-2xl bg-[#0A111C] light:bg-white border border-white/[0.08] light:border-slate-200 p-3 sm:px-4 sm:py-3 mb-5 shadow-lg transition-colors">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Left: Search Input + Whole-Database Quick-Jump */}
        <div className="relative flex-1 min-w-0 lg:max-w-xs">
          <Search className="w-4 h-4 text-slate-400 light:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={localQuery}
            onFocus={() => {
              setSearchFocused(true);
              handleWarmSearchIndex();
            }}
            onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSearchFocused(false);
              else if (e.key === 'Enter' && localQuery.trim()) {
                e.preventDefault();
                setSearchFocused(false);
                setGlobalSearch(localQuery.trim());
                window.dispatchEvent(new CustomEvent('dodaeona:open-search-modal'));
              }
            }}
            onChange={(e) => {
              handleQueryChange(e.target.value);
              setSearchFocused(true);
            }}
            placeholder={
              isFreeAgentsView
                ? 'Search free agents, players, clubs, managers...'
                : 'Search teams, players, managers, stadiums...'
            }
            className="w-full pl-10 pr-12 py-2.5 rounded-xl bg-[#060B13] light:bg-slate-50 border border-white/[0.08] light:border-slate-200 text-xs sm:text-sm text-slate-100 light:text-slate-900 placeholder:text-slate-400 light:placeholder:text-slate-500 focus:outline-none focus:border-[#7ADBF0] light:focus:border-cyan-600 transition-all"
          />
          {localQuery && (
            <button
              type="button"
              onClick={() => {
                if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
                setLocalQuery('');
                setSearchQuery('');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
            >
              Clear
            </button>
          )}

          {/* Whole-Database Quick-Jump Popover */}
          {searchFocused && quickResults && quickResults.totalCount > 0 && (
            <div className="absolute left-0 right-0 lg:w-[400px] top-full mt-1.5 z-40 rounded-xl bg-[#0C131F] light:bg-white border border-white/[0.12] light:border-slate-200 shadow-2xl overflow-hidden">
              <div className="px-3 py-1.5 border-b border-white/[0.06] light:border-slate-200 flex items-center justify-between">
                <span className="font-mono text-[9px] tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold">
                  DATABASE OPTIONS
                </span>
                <span className="font-mono text-[9px] text-slate-500">
                  CLICK TO OPEN
                </span>
              </div>
              <div className="divide-y divide-white/[0.05] light:divide-slate-100 max-h-80 overflow-y-auto">
                {/* Leagues */}
                {quickResults.leagues.map((lg) => (
                  <button
                    key={`tcb-lg-${lg.name}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchFocused(false);
                      openLeagueDirectory(lg.name);
                    }}
                    className="w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-white/[0.04] light:hover:bg-slate-50 text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Award className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-600 shrink-0" />
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

                {/* Clubs & National Teams */}
                {quickResults.clubs.map((t) => (
                  <button
                    key={`tcb-team-${t.id}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchFocused(false);
                      openTeamById(t.id, 1);
                    }}
                    className="w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-white/[0.04] light:hover:bg-slate-50 text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={t.crestUrl}
                        alt={t.name}
                        className="w-4 h-4 object-contain shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white light:text-slate-900 truncate block">
                          {t.name}
                        </span>
                        <span className="text-[10px] text-slate-400 light:text-slate-500 truncate block">
                          {t.type === 'national' ? 'National Team' : t.league || 'Club'} · {t.country}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#7ADBF0] light:text-cyan-700 tabular-nums shrink-0">
                      {t.overallRating}
                    </span>
                  </button>
                ))}

                {/* Players */}
                {quickResults.players.map((p) => (
                  <button
                    key={`tcb-player-${p.id}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchFocused(false);
                      openPlayerProfile(p.id);
                    }}
                    className="w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-white/[0.04] light:hover:bg-slate-50 text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white light:text-slate-900 truncate block">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-slate-400 light:text-slate-500 truncate block">
                          Player · {p.position} · {p.nationality} · {p.currentTeamName}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#7ADBF0] light:text-cyan-700 tabular-nums shrink-0">
                      {p.overallRating}
                    </span>
                  </button>
                ))}

                {/* Managers */}
                {quickResults.managers.map(({ manager, currentTeamName }) => (
                  <button
                    key={`tcb-mgr-${manager.id}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchFocused(false);
                      openManagerProfile(manager.id);
                    }}
                    className="w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-white/[0.04] light:hover:bg-slate-50 text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Briefcase className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white light:text-slate-900 truncate block">
                          {manager.name}
                        </span>
                        <span className="text-[10px] text-slate-400 light:text-slate-500 truncate block">
                          Manager · {manager.nationality}
                          {currentTeamName ? ` · ${currentTeamName}` : ''}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  </button>
                ))}

                {/* Stadiums */}
                {quickResults.stadiums.map((st) => (
                  <button
                    key={`tcb-stad-${st.id}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setSearchFocused(false);
                      openTeamStadium(st.clubId);
                    }}
                    className="w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-white/[0.04] light:hover:bg-slate-50 text-left cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white light:text-slate-900 truncate block">
                          {st.name}
                        </span>
                        <span className="text-[10px] text-slate-400 light:text-slate-500 truncate block">
                          Stadium · {st.clubName} · {st.city}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center Controls: ORDER + CONFEDERATION / LEAGUE */}
        {!isFreeAgentsView && (
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* ORDER Segmented Control */}
            <div className="flex items-center gap-1.5 rounded-xl bg-[#060B13] light:bg-slate-100 border border-white/[0.08] light:border-slate-200 p-1 pl-3">
              <span className="font-mono text-[10px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase mr-1">
                ORDER
              </span>
              <button
                type="button"
                onClick={() => setOrdering('listed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  ordering === 'listed'
                    ? 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white shadow-[0_0_12px_rgba(122,219,240,0.28)]'
                    : 'text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-950'
                }`}
              >
                Listed
              </button>
              <button
                type="button"
                onClick={() => setOrdering('overall')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  ordering === 'overall'
                    ? 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white shadow-[0_0_12px_rgba(122,219,240,0.28)]'
                    : 'text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-950'
                }`}
              >
                Overall
              </button>
            </div>

            {/* CONFEDERATION Dropdown */}
            {showConfederationFilter && representedConfederations.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase hidden sm:inline">
                  CONFED
                </span>
                <div className="relative">
                  <select
                    value={confederationFilter}
                    onChange={(e) => setConfederationFilter(e.target.value as 'all' | ConfederationType)}
                    className="appearance-none pl-3.5 pr-9 py-2.5 rounded-xl bg-[#060B13] light:bg-slate-50 border border-white/[0.08] light:border-slate-200 text-xs font-semibold text-slate-100 light:text-slate-900 focus:outline-none focus:border-[#7ADBF0] light:focus:border-cyan-600 cursor-pointer transition-all"
                  >
                    <option value="all">All confederations</option>
                    {representedConfederations.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.count})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 light:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            {/* LEAGUE Dropdown */}
            {showLeagueFilter && (
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase hidden sm:inline">
                  LEAGUE
                </span>
                <div className="relative">
                  <select
                    value={leagueFilter}
                    onChange={(e) => setLeagueFilter(e.target.value)}
                    className="appearance-none pl-3.5 pr-9 py-2.5 rounded-xl bg-[#060B13] light:bg-slate-50 border border-white/[0.08] light:border-slate-200 text-xs font-semibold text-slate-100 light:text-slate-900 focus:outline-none focus:border-[#7ADBF0] light:focus:border-cyan-600 cursor-pointer transition-all"
                  >
                    <option value="all">All leagues</option>
                    {representedLeagues.map((lg) => (
                      <option key={lg.name} value={lg.name}>
                        {lg.name} ({lg.count})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 light:text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Right: Compare Teams + Create a team CTAs */}
        <div className="shrink-0 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => openCompareTeams()}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] light:bg-slate-100 light:hover:bg-slate-200 border border-white/[0.1] light:border-slate-300 text-slate-100 light:text-slate-900 font-semibold text-xs transition-all duration-200 cursor-pointer whitespace-nowrap"
            title="Open Comparative Radar Chart (Attack, Defense, Midfield, Form)"
          >
            <Scale className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
            <span>Compare Teams</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateModal()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#7ADBF0] hover:bg-[#99E5F5] light:bg-cyan-600 light:hover:bg-cyan-700 text-[#050A12] light:text-white font-semibold text-xs transition-all duration-200 shadow-[0_0_18px_rgba(122,219,240,0.28)] hover:-translate-y-0.5 cursor-pointer whitespace-nowrap"
            title={isUserAuthenticated ? 'Create a custom team' : 'Create a custom team'}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Create a team</span>
          </button>
        </div>
      </div>
    </div>
  );
};
