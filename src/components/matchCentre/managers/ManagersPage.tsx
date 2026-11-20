import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Globe,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  UserCog,
  X,
} from 'lucide-react';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import { useAuth } from '../../../context/AuthContext';
import { ManagerCard } from './ManagerCard';
import { ManagerFormDialog } from './ManagerFormDialog';
import { normalizeDatabaseSearchText } from '../../../utils/globalDatabaseSearch';
import {
  DatabaseSearchDropdown,
  useWholeDatabaseQuickSearch,
} from '../../common/DatabaseSearchDropdown';

type TeamTypeFilter = 'all' | 'clubs' | 'national';
type ManagerSortOption = 'name' | 'team' | 'appointment_date';

interface ManagersPageProps {
  onNavigateLogin?: () => void;
}

export const ManagersPage: React.FC<ManagersPageProps> = ({ onNavigateLogin }) => {
  const {
    managers,
    managerAppointments,
    teams,
    openManagerProfile,
    createManagerRecord,
  } = useMatchCentre();
  const { isAuthenticated, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const { warmIndex, openFullSearchModal } = useWholeDatabaseQuickSearch(searchQuery, false);
  const [teamTypeFilter, setTeamTypeFilter] = useState<TeamTypeFilter>('all');
  const [nationalityFilter, setNationalityFilter] = useState('all');
  const [competitionFilter, setCompetitionFilter] = useState('all');
  const [tacticalStyleFilter, setTacticalStyleFilter] = useState('all');
  const [sortBy, setSortBy] = useState<ManagerSortOption>('name');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    setVisibleCount(24);
  }, [
    searchQuery,
    teamTypeFilter,
    nationalityFilter,
    competitionFilter,
    tacticalStyleFilter,
    sortBy,
  ]);

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const appointmentsByManager = useMemo(() => {
    const map = new Map<string, typeof managerAppointments>();
    for (const appt of managerAppointments) {
      const list = map.get(appt.manager_id) || [];
      list.push(appt);
      map.set(appt.manager_id, list);
    }
    return map;
  }, [managerAppointments]);

  const summary = useMemo(() => {
    const clubIds = new Set<string>();
    const nationalIds = new Set<string>();
    for (const appt of managerAppointments) {
      if (!appt.is_current) continue;
      if (appt.team_type === 'club') clubIds.add(appt.manager_id);
      if (appt.team_type === 'country') nationalIds.add(appt.manager_id);
    }
    return {
      total: managers.length,
      clubs: clubIds.size,
      national: nationalIds.size,
    };
  }, [managers.length, managerAppointments]);

  const filterOptions = useMemo(() => {
    const nationalities = new Set<string>();
    const competitions = new Set<string>();
    const tacticalStyles = new Set<string>();

    for (const m of managers) {
      if (m.nationality?.trim()) nationalities.add(m.nationality.trim());
      if (m.tactical_style?.trim()) tacticalStyles.add(m.tactical_style.trim());
    }
    for (const appt of managerAppointments) {
      for (const comp of appt.competitions || []) {
        if (comp?.trim()) competitions.add(comp.trim());
      }
      const team = teamMap.get(appt.team_id);
      if (team?.league?.trim()) competitions.add(team.league.trim());
      if (team?.confederation?.trim()) competitions.add(team.confederation.trim());
    }

    return {
      nationalities: Array.from(nationalities).sort((a, b) => a.localeCompare(b)),
      competitions: Array.from(competitions).sort((a, b) => a.localeCompare(b)),
      tacticalStyles: Array.from(tacticalStyles).sort((a, b) => a.localeCompare(b)),
    };
  }, [managers, managerAppointments, teamMap]);

  const filteredManagers = useMemo(() => {
    const q = normalizeDatabaseSearchText(deferredSearchQuery);

    const matched = managers.filter((m) => {
      const appts = appointmentsByManager.get(m.id) || [];
      const currentAppts = appts.filter((a) => a.is_current);

      if (teamTypeFilter === 'clubs' && !currentAppts.some((a) => a.team_type === 'club')) {
        return false;
      }
      if (teamTypeFilter === 'national' && !currentAppts.some((a) => a.team_type === 'country')) {
        return false;
      }

      if (nationalityFilter !== 'all' && m.nationality.trim() !== nationalityFilter) {
        return false;
      }

      if (tacticalStyleFilter !== 'all' && m.tactical_style.trim() !== tacticalStyleFilter) {
        return false;
      }

      if (competitionFilter !== 'all') {
        const compSet = new Set<string>();
        for (const a of appts) {
          for (const c of a.competitions || []) {
            if (c?.trim()) compSet.add(c.trim());
          }
          const team = teamMap.get(a.team_id);
          if (team?.league?.trim()) compSet.add(team.league.trim());
          if (team?.confederation?.trim()) compSet.add(team.confederation.trim());
        }
        if (!compSet.has(competitionFilter)) return false;
      }

      if (q) {
        const inName = normalizeDatabaseSearchText(m.name).includes(q);
        const inNat = normalizeDatabaseSearchText(m.nationality).includes(q);
        const inStyle = normalizeDatabaseSearchText(m.tactical_style).includes(q);
        const inCurrentTeam = currentAppts.some((a) =>
          normalizeDatabaseSearchText(a.team_name).includes(q)
        );
        if (!inName && !inNat && !inStyle && !inCurrentTeam) {
          return false;
        }
      }

      return true;
    });

    matched.sort((a, b) => {
      const aCurr = (appointmentsByManager.get(a.id) || []).filter((x) => x.is_current);
      const bCurr = (appointmentsByManager.get(b.id) || []).filter((x) => x.is_current);

      if (sortBy === 'team') {
        const aTeam = (
          aCurr.find((x) => x.team_type === 'club')?.team_name ||
          aCurr[0]?.team_name ||
          'ZZZ'
        ).toLowerCase();
        const bTeam = (
          bCurr.find((x) => x.team_type === 'club')?.team_name ||
          bCurr[0]?.team_name ||
          'ZZZ'
        ).toLowerCase();
        if (aTeam !== bTeam) return aTeam.localeCompare(bTeam);
      }

      if (sortBy === 'appointment_date') {
        const aDate =
          aCurr
            .map((x) => x.start_date)
            .sort((x, y) => y.localeCompare(x))[0] || '';
        const bDate =
          bCurr
            .map((x) => x.start_date)
            .sort((x, y) => y.localeCompare(x))[0] || '';
        if (aDate !== bDate) return bDate.localeCompare(aDate);
      }

      return a.name.localeCompare(b.name);
    });

    return matched;
  }, [
    managers,
    appointmentsByManager,
    teamMap,
    deferredSearchQuery,
    teamTypeFilter,
    nationalityFilter,
    competitionFilter,
    tacticalStyleFilter,
    sortBy,
  ]);

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    teamTypeFilter !== 'all' ||
    nationalityFilter !== 'all' ||
    competitionFilter !== 'all' ||
    tacticalStyleFilter !== 'all';

  return (
    <div className="space-y-6 landscape-mobile:space-y-4 pb-12 landscape-mobile:pb-8">
      {/* Top Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 light:border-slate-200 bg-[#060E1B] light:bg-white shadow-xl p-6 sm:p-8 landscape-mobile:p-4">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#7ADBF0] via-sky-400 to-[#D6B56E]"
        />
        <div className="flex flex-col landscape-mobile:flex-row lg:flex-row landscape-mobile:items-center lg:items-center justify-between gap-6 landscape-mobile:gap-4">
          <div className="space-y-2 landscape-mobile:space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[#7ADBF0] light:text-cyan-700 font-bold">
              <UserCog className="w-3.5 h-3.5" />
              <span>MATCH CENTRE · MANAGERIAL DIRECTORY</span>
            </div>
            <h1 className="font-display text-3xl sm:text-4xl landscape-mobile:text-2xl tracking-wide text-white light:text-slate-950 uppercase leading-none">
              MANAGERS &amp; HEAD COACHES
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 light:text-slate-600 leading-relaxed">
              Every manager holds one permanent entity connected across club and national-team appointments, career history, statistics, and the match simulation engine.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row landscape-mobile:flex-col items-stretch sm:items-center landscape-mobile:items-end gap-3 landscape-mobile:gap-2 shrink-0">
            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl bg-white/[0.04] light:bg-slate-50 border border-white/10 light:border-slate-200 px-3.5 py-2.5 text-center min-w-[84px]">
                <span className="block font-mono text-[9px] tracking-[0.16em] text-slate-400 uppercase">
                  TOTAL
                </span>
                <span className="font-display text-2xl text-white light:text-slate-900 tabular-nums leading-tight block">
                  {summary.total}
                </span>
              </div>
              <div className="rounded-xl bg-white/[0.04] light:bg-slate-50 border border-white/10 light:border-slate-200 px-3.5 py-2.5 text-center min-w-[84px]">
                <span className="block font-mono text-[9px] tracking-[0.16em] text-slate-400 uppercase">
                  CLUBS
                </span>
                <span className="font-display text-2xl text-[#7ADBF0] light:text-cyan-700 tabular-nums leading-tight block">
                  {summary.clubs}
                </span>
              </div>
              <div className="rounded-xl bg-sky-500/[0.08] light:bg-sky-50 border border-sky-400/25 light:border-sky-200 px-3.5 py-2.5 text-center min-w-[84px]">
                <span className="block font-mono text-[9px] tracking-[0.16em] text-sky-300 light:text-sky-700 uppercase">
                  NATIONAL
                </span>
                <span className="font-display text-2xl text-sky-300 light:text-sky-700 tabular-nums leading-tight block">
                  {summary.national}
                </span>
              </div>
            </div>

            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => setIsAddDialogOpen(true)}
                className="px-4 py-3 rounded-xl bg-[#7ADBF0] hover:bg-[#95E4F5] text-[#050A12] font-bold text-xs inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 shadow-[0_4px_18px_rgba(122,219,240,0.22)] cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Manager</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (onNavigateLogin) {
                    onNavigateLogin();
                  } else {
                    window.history.pushState({}, '', '/login');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }
                }}
                className="px-4 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] light:bg-slate-100 light:hover:bg-slate-200 border border-white/15 light:border-slate-300 text-xs font-semibold text-white light:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
              >
                Sign in to add manager
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Search, Team-type Toggles & 4 Filter Dropdowns */}
      <section className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-4 sm:p-5 landscape-mobile:p-3.5 space-y-4 landscape-mobile:space-y-3">
        <div className="flex flex-col landscape-mobile:flex-row lg:flex-row items-stretch landscape-mobile:items-center lg:items-center justify-between gap-3">
          {/* Search Input with Instant Clickable Whole-Database Options */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => {
                setSearchFocused(true);
                warmIndex();
              }}
              onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchFocused(false);
                else if (e.key === 'Enter' && searchQuery.trim()) {
                  e.preventDefault();
                  setSearchFocused(false);
                  openFullSearchModal();
                }
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchFocused(true);
              }}
              placeholder="Search managers, clubs, players, stadiums..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs sm:text-sm text-white light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#7ADBF0]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear manager search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {searchFocused && searchQuery.trim().length >= 2 && (
              <DatabaseSearchDropdown
                query={searchQuery}
                isOpen={searchFocused}
                onClose={() => setSearchFocused(false)}
                prioritizeManagers
                limits={{
                  managers: 6,
                  clubs: 4,
                  players: 4,
                  stadiums: 3,
                  leagues: 2,
                  books: 2,
                  series: 1,
                }}
                className="absolute left-0 right-0 top-full mt-1.5 z-50"
              />
            )}
          </div>

          {/* Team-Type Toggle Buttons */}
          <div className="inline-flex items-center gap-1.5 p-1 rounded-xl bg-[#080E18] light:bg-slate-100 border border-white/10 light:border-slate-200 shrink-0">
            {(
              [
                { id: 'all', label: 'All', icon: SlidersHorizontal },
                { id: 'clubs', label: 'Clubs', icon: Shield },
                { id: 'national', label: 'National teams', icon: Globe },
              ] as Array<{ id: TeamTypeFilter; label: string; icon: React.ComponentType<any> }>
            ).map((opt) => {
              const Icon = opt.icon;
              const active = teamTypeFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTeamTypeFilter(opt.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                    active
                      ? opt.id === 'national'
                        ? 'bg-sky-500/20 text-sky-200 border border-sky-400/50 light:bg-sky-600 light:text-white'
                        : 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white'
                      : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Four Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 landscape-mobile:grid-cols-4 lg:grid-cols-4 gap-3 landscape-mobile:gap-2.5">
          <label className="space-y-1 block">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 light:text-slate-500 block">
              NATIONALITY
            </span>
            <select
              value={nationalityFilter}
              onChange={(e) => setNationalityFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
            >
              <option value="all">All nationalities</option>
              {filterOptions.nationalities.map((nat) => (
                <option key={nat} value={nat}>
                  {nat}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 block">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 light:text-slate-500 block">
              COMPETITION
            </span>
            <select
              value={competitionFilter}
              onChange={(e) => setCompetitionFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
            >
              <option value="all">All competitions</option>
              {filterOptions.competitions.map((comp) => (
                <option key={comp} value={comp}>
                  {comp}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 block">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 light:text-slate-500 block">
              TACTICAL STYLE
            </span>
            <select
              value={tacticalStyleFilter}
              onChange={(e) => setTacticalStyleFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
            >
              <option value="all">All tactical styles</option>
              {filterOptions.tacticalStyles.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 block">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-400 light:text-slate-500 block">
              SORTING
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ManagerSortOption)}
              className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
            >
              <option value="name">Name (A–Z)</option>
              <option value="team">Current team</option>
              <option value="appointment_date">Appointment date (newest)</option>
            </select>
          </label>
        </div>
      </section>

      {/* Managers Directory Grid or Empty State */}
      {managers.length === 0 ? (
        <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-dashed border-white/15 light:border-slate-300 p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#7ADBF0]/10 border border-[#7ADBF0]/25 text-[#7ADBF0] light:text-cyan-700 mx-auto flex items-center justify-center">
            <UserCog className="w-6 h-6" />
          </div>
          <p className="text-sm sm:text-base font-semibold text-white light:text-slate-900 max-w-lg mx-auto">
            Nothing is invented to fill the directory — add a manager and appoint them to a team.
          </p>
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => setIsAddDialogOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#7ADBF0] hover:bg-[#95E4F5] text-[#050A12] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Manager</span>
            </button>
          )}
        </div>
      ) : filteredManagers.length === 0 ? (
        <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-200 p-8 text-center space-y-3">
          <p className="text-sm text-slate-300 light:text-slate-700">
            No managers match the active search or filter criteria.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTeamTypeFilter('all');
                setNationalityFilter('all');
                setCompetitionFilter('all');
                setTacticalStyleFilter('all');
              }}
              className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] light:bg-slate-100 border border-white/10 light:border-slate-300 text-xs font-semibold text-[#7ADBF0] light:text-cyan-700 cursor-pointer"
            >
              Reset filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-600 tabular-nums">
              Showing 1–{Math.min(visibleCount, filteredManagers.length)} of {filteredManagers.length}{' '}
              {filteredManagers.length === 1 ? 'manager' : 'managers'}
            </span>
          </div>

          <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-4 landscape-mobile:gap-3">
            {filteredManagers.slice(0, visibleCount).map((manager) => (
              <ManagerCard
                key={manager.id}
                manager={manager}
                appointments={appointmentsByManager.get(manager.id) || []}
                teams={teams}
                onSelectManager={openManagerProfile}
              />
            ))}
          </div>

          {filteredManagers.length > visibleCount && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 24)}
                className="px-8 py-3 rounded-xl bg-[#7ADBF0] hover:bg-[#99E5F5] light:bg-cyan-600 light:hover:bg-cyan-700 text-[#050A12] light:text-white font-semibold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(122,219,240,0.3)] hover:-translate-y-0.5 cursor-pointer"
              >
                Show 24 more ({filteredManagers.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Manager Modal */}
      {isAddDialogOpen && (
        <ManagerFormDialog
          mode="create"
          isAdmin={isAdmin}
          onSave={(payload) => createManagerRecord(payload)}
          onClose={() => setIsAddDialogOpen(false)}
        />
      )}
    </div>
  );
};

export const Managers = ManagersPage;
