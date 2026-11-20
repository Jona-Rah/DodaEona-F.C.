import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  ChevronDown,
  ExternalLink,
  Search,
  Shuffle,
  Swords,
  Trophy,
  X,
} from 'lucide-react';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { useTheme } from '../../context/ThemeContext';
import { getPlayerDisplayName, getTeamType, type Team } from '../../types/matchCentre';
import type { TeamAggregateStatistics } from '../../types/teamStats';
import { computeTeamStatistics } from '../../utils/teamStatisticsEngine';
import {
  RADAR_AXES,
  buildTeamRadarProfile,
  pickDefaultComparisonPair,
  resolveRadarTeamColors,
  type RadarAxisKey,
} from '../../utils/teamCompareMetrics';
import { TeamEmblem } from './TeamEmblem';
import { TeamRadarChart } from './TeamRadarChart';

interface TeamCompareViewProps {
  onOpenMatchCreator: () => void;
}

type TeamScopeFilter = 'all' | 'club' | 'country';

interface SearchableTeamSelectorProps {
  label: string;
  accentColor: string;
  selectedTeam: Team;
  otherTeamId: string;
  teams: Team[];
  onSelect: (team: Team) => void;
  onOpenDossier: (team: Team) => void;
}

const SearchableTeamSelector: React.FC<SearchableTeamSelectorProps> = ({
  label,
  accentColor,
  selectedTeam,
  otherTeamId,
  teams,
  onSelect,
  onOpenDossier,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 20);
    } else {
      setQuery('');
    }
  }, [open]);

  const filteredList = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const pool = teams.filter((t) => t.id !== otherTeamId);
    if (!q) return pool.slice(0, 60);
    return pool
      .filter((t) => {
        const hay = `${t.name} ${t.shortName} ${t.code} ${t.country} ${t.league || ''} ${t.confederation || ''}`.toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 60);
  }, [teams, otherTeamId, deferredQuery]);

  const canonicalType = getTeamType(selectedTeam);

  return (
    <div ref={containerRef} className="relative">
      <div
        className="rounded-2xl bg-[#0A111C] light:bg-white border border-white/[0.08] light:border-slate-200 p-3.5 sm:p-4 transition-colors"
        style={{
          borderTopColor: accentColor,
          borderTopWidth: '2px',
        }}
      >
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="font-mono text-[10px] tracking-[0.18em] uppercase font-bold" style={{ color: accentColor }}>
            {label}
          </span>
          <button
            type="button"
            onClick={() => onOpenDossier(selectedTeam)}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 transition-colors cursor-pointer"
            title={`Open ${selectedTeam.name} Dossier`}
          >
            <span>Dossier</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          className="w-full flex items-center justify-between gap-3 text-left rounded-xl p-2 -mx-2 hover:bg-white/[0.04] light:hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`${
                canonicalType === 'country' ? 'w-12 h-8 p-1' : 'w-11 h-11 p-1.5'
              } rounded-xl bg-[#060B13] light:bg-slate-50 border border-white/[0.08] light:border-slate-200 shrink-0 flex items-center justify-center`}
            >
              <TeamEmblem team={selectedTeam} />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm sm:text-base text-white light:text-slate-900 truncate">
                {selectedTeam.name}
              </div>
              <div className="text-[11px] text-slate-400 light:text-slate-600 truncate">
                {selectedTeam.flag ? `${selectedTeam.flag} ` : ''}
                {selectedTeam.country} ·{' '}
                {canonicalType === 'club'
                  ? selectedTeam.league || 'Club'
                  : selectedTeam.confederation || 'National'}{' '}
                · {selectedTeam.defaultFormation}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right">
              <span className="block font-display text-2xl leading-none text-white light:text-slate-900 tabular-nums">
                {selectedTeam.overallRating}
              </span>
              <span className="block font-mono text-[9px] text-slate-500 uppercase tracking-wider">
                OVR
              </span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </div>
        </button>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 rounded-2xl bg-[#0C1422] light:bg-white border border-white/[0.14] light:border-slate-300 shadow-2xl overflow-hidden">
          <div className="p-2.5 border-b border-white/[0.08] light:border-slate-200 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder="Search club, nation, league, code..."
              className="w-full bg-transparent text-xs sm:text-sm text-white light:text-slate-900 placeholder:text-slate-500 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-white light:hover:text-slate-900 p-1 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.05] light:divide-slate-100">
            {filteredList.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 light:text-slate-500">
                No teams match &ldquo;{query}&rdquo;.
              </div>
            ) : (
              filteredList.map((team) => {
                const isSelected = team.id === selectedTeam.id;
                const tType = getTeamType(team);
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => {
                      onSelect(team);
                      setOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#7ADBF0]/12 light:bg-cyan-50'
                        : 'hover:bg-white/[0.05] light:hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`${
                          tType === 'country' ? 'w-8 h-5' : 'w-7 h-7'
                        } shrink-0 flex items-center justify-center`}
                      >
                        <TeamEmblem team={team} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white light:text-slate-900 truncate">
                          {team.name}
                        </div>
                        <div className="text-[10px] text-slate-400 light:text-slate-600 truncate">
                          {tType === 'club' ? team.league || 'Club' : team.confederation || 'Nation'} ·{' '}
                          {team.country}
                        </div>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#7ADBF0] light:text-cyan-700 tabular-nums shrink-0">
                      {team.overallRating}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const TeamCompareView: React.FC<TeamCompareViewProps> = ({ onOpenMatchCreator }) => {
  const {
    teams,
    simulationMatches,
    competitionMakers,
    competitions,
    getManagerForTeam,
    fetchTeamStatistics,
    compareTeamIds,
    setCompareTeamIds,
    selectTeam,
    openDossier,
    openPlayerProfile,
  } = useMatchCentre();
  const { theme } = useTheme();
  const isLightTheme = theme === 'light';

  const [scopeFilter, setScopeFilter] = useState<TeamScopeFilter>('all');
  const [activeAxis, setActiveAxis] = useState<RadarAxisKey | null>(null);
  const [serverStatsMap, setServerStatsMap] = useState<Map<string, TeamAggregateStatistics> | null>(null);

  // Synchronously compute live client match stats, then merge server stats so simulated matches are always up to date
  const clientStatsMap = useMemo(() => {
    try {
      const managersByTeam = new Map<string, ReturnType<typeof getManagerForTeam>>();
      for (const t of teams) {
        managersByTeam.set(t.id, getManagerForTeam(t));
      }
      const res = computeTeamStatistics({
        teams,
        simulationMatches,
        competitionMakers,
        competitions,
        managersByTeam,
      });
      return new Map(res.teams.map((entry) => [entry.team.id, entry]));
    } catch {
      return new Map<string, TeamAggregateStatistics>();
    }
  }, [teams, simulationMatches, competitionMakers, competitions, getManagerForTeam]);

  useEffect(() => {
    let active = true;
    void fetchTeamStatistics()
      .then((res) => {
        if (!active || !res?.teams) return;
        setServerStatsMap(new Map(res.teams.map((entry) => [entry.team.id, entry])));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [fetchTeamStatistics, simulationMatches.length]);

  const scopedTeams = useMemo(() => {
    if (scopeFilter === 'all') return teams;
    return teams.filter((t) => getTeamType(t) === scopeFilter);
  }, [teams, scopeFilter]);

  // Resolve active pair from context compareTeamIds with safe fallback
  const [teamA, teamB] = useMemo(() => {
    const [rawA, rawB] = pickDefaultComparisonPair(
      scopedTeams.length >= 2 ? scopedTeams : teams,
      compareTeamIds[0],
      compareTeamIds[1]
    );
    return [rawA, rawB];
  }, [scopedTeams, teams, compareTeamIds]);

  const statsMap = serverStatsMap || clientStatsMap;

  const profileA = useMemo(
    () => (teamA ? buildTeamRadarProfile(teamA, statsMap.get(teamA.id) || clientStatsMap.get(teamA.id) || null) : null),
    [teamA, statsMap, clientStatsMap]
  );
  const profileB = useMemo(
    () => (teamB ? buildTeamRadarProfile(teamB, statsMap.get(teamB.id) || clientStatsMap.get(teamB.id) || null) : null),
    [teamB, statsMap, clientStatsMap]
  );

  const radarColors = useMemo(() => {
    if (!teamA || !teamB) {
      return {
        colorA: '#38BDF8',
        fillA: 'rgba(56, 189, 248, 0.22)',
        colorB: '#F59E0B',
        fillB: 'rgba(245, 158, 11, 0.22)',
      };
    }
    return resolveRadarTeamColors(teamA, teamB, isLightTheme);
  }, [teamA, teamB, isLightTheme]);

  if (!teamA || !teamB || !profileA || !profileB) {
    return (
      <div className="rounded-2xl bg-[#0A111C] light:bg-white border border-white/[0.08] light:border-slate-200 p-12 text-center">
        <p className="text-sm text-slate-400 light:text-slate-600">
          At least two teams are required in the database to compare stats.
        </p>
      </div>
    );
  }

  const handleSelectTeamA = (next: Team) => {
    setCompareTeamIds([next.id, teamB.id]);
  };

  const handleSelectTeamB = (next: Team) => {
    setCompareTeamIds([teamA.id, next.id]);
  };

  const handleSwap = () => {
    setCompareTeamIds([teamB.id, teamA.id]);
  };

  const handleRandomPair = () => {
    const pool = scopedTeams.length >= 2 ? scopedTeams : teams;
    if (pool.length < 2) return;
    // Pick among the top 40 teams of the active pool or whole pool for entertaining matchups
    const idxA = Math.floor(Math.random() * Math.min(pool.length, 48));
    let idxB = Math.floor(Math.random() * Math.min(pool.length, 48));
    if (idxB === idxA) idxB = (idxA + 1) % pool.length;
    setCompareTeamIds([pool[idxA].id, pool[idxB].id]);
  };

  const handleSimulateMatchup = () => {
    selectTeam(teamA, 'home');
    selectTeam(teamB, 'away');
    onOpenMatchCreator();
  };

  const avgDelta = profileA.fourAxisAvg - profileB.fourAxisAvg;
  const edgeLeader =
    avgDelta > 0 ? teamA : avgDelta < 0 ? teamB : null;

  const pickerTeams = scopedTeams.length >= 2 ? scopedTeams : teams;

  const specRows: Array<{
    label: string;
    valA: React.ReactNode;
    valB: React.ReactNode;
    winner?: 'A' | 'B' | 'tie';
  }> = [
    {
      label: 'Overall Rating',
      valA: teamA.overallRating,
      valB: teamB.overallRating,
      winner:
        teamA.overallRating > teamB.overallRating
          ? 'A'
          : teamB.overallRating > teamA.overallRating
          ? 'B'
          : 'tie',
    },
    {
      label: 'World Rank',
      valA: teamA.worldRanking ? `#${teamA.worldRanking}` : '—',
      valB: teamB.worldRanking ? `#${teamB.worldRanking}` : '—',
      winner:
        teamA.worldRanking && teamB.worldRanking
          ? teamA.worldRanking < teamB.worldRanking
            ? 'A'
            : teamB.worldRanking < teamA.worldRanking
            ? 'B'
            : 'tie'
          : 'tie',
    },
    {
      label: 'Formation',
      valA: teamA.defaultFormation,
      valB: teamB.defaultFormation,
    },
    {
      label: 'Playing Style',
      valA: teamA.playingStyle,
      valB: teamB.playingStyle,
    },
    {
      label: 'Squad Fit',
      valA: `${profileA.squadBreakdown.fitCount}/${profileA.squadBreakdown.totalCount}`,
      valB: `${profileB.squadBreakdown.fitCount}/${profileB.squadBreakdown.totalCount}`,
    },
    {
      label: 'Trophies',
      valA: teamA.trophiesCount ?? teamA.trophies?.length ?? 0,
      valB: teamB.trophiesCount ?? teamB.trophies?.length ?? 0,
      winner:
        (teamA.trophiesCount ?? teamA.trophies?.length ?? 0) >
        (teamB.trophiesCount ?? teamB.trophies?.length ?? 0)
          ? 'A'
          : (teamB.trophiesCount ?? teamB.trophies?.length ?? 0) >
            (teamA.trophiesCount ?? teamA.trophies?.length ?? 0)
          ? 'B'
          : 'tie',
    },
  ];

  const topPlayersA = [...teamA.squad].sort((a, b) => b.overallRating - a.overallRating).slice(0, 3);
  const topPlayersB = [...teamB.squad].sort((a, b) => b.overallRating - a.overallRating).slice(0, 3);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header & Controls Toolbar */}
      <div className="rounded-2xl bg-[#0A111C] light:bg-white border border-white/[0.08] light:border-slate-200 p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <span className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#7ADBF0] light:text-cyan-700 font-bold">
            MATCH CENTRE · RADAR COMPARISON
          </span>
          <h2 className="font-display text-2xl sm:text-3xl text-white light:text-slate-900 uppercase tracking-wide leading-tight mt-0.5">
            COMPARE TEAMS
          </h2>
          <p className="text-xs text-slate-400 light:text-slate-600 mt-1">
            Interactive Attack, Defense, Midfield, and Form radar comparison across clubs and national teams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Scope Segmented Filter */}
          <div className="flex items-center gap-1 rounded-xl bg-[#060B13] light:bg-slate-100 border border-white/[0.08] light:border-slate-200 p-1">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'club', label: 'Clubs' },
                { id: 'country', label: 'Nations' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setScopeFilter(opt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  scopeFilter === opt.id
                    ? 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white'
                    : 'text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-950'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSwap}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] light:bg-slate-100 hover:bg-white/[0.08] light:hover:bg-slate-200 border border-white/[0.1] light:border-slate-300 text-xs font-semibold text-slate-200 light:text-slate-800 transition-colors cursor-pointer"
            title="Swap Team A and Team B"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
            <span>Swap</span>
          </button>

          <button
            type="button"
            onClick={handleRandomPair}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.04] light:bg-slate-100 hover:bg-white/[0.08] light:hover:bg-slate-200 border border-white/[0.1] light:border-slate-300 text-xs font-semibold text-slate-200 light:text-slate-800 transition-colors cursor-pointer"
            title="Pick two random teams"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
            <span>Randomize</span>
          </button>

          <button
            type="button"
            onClick={handleSimulateMatchup}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#7ADBF0] hover:bg-[#99E5F5] light:bg-cyan-600 light:hover:bg-cyan-700 text-[#050A12] light:text-white text-xs font-bold transition-all shadow-[0_0_16px_rgba(122,219,240,0.24)] cursor-pointer"
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Simulate Matchup</span>
          </button>
        </div>
      </div>

      {/* Team A / Team B Dual Searchable Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchableTeamSelector
          label="TEAM A (HOME / PRIMARY)"
          accentColor={radarColors.colorA}
          selectedTeam={teamA}
          otherTeamId={teamB.id}
          teams={pickerTeams}
          onSelect={handleSelectTeamA}
          onOpenDossier={(t) => openDossier(t, 1)}
        />
        <SearchableTeamSelector
          label="TEAM B (AWAY / CHALLENGER)"
          accentColor={radarColors.colorB}
          selectedTeam={teamB}
          otherTeamId={teamA.id}
          teams={pickerTeams}
          onSelect={handleSelectTeamB}
          onOpenDossier={(t) => openDossier(t, 1)}
        />
      </div>

      {/* Main 12-Col Radar + Breakdown Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 7 Cols: D3.js Comparative Radar Chart */}
        <div className="lg:col-span-7 rounded-2xl bg-[#0A111C] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.07] light:border-slate-200">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: radarColors.colorA }}
                />
                <span className="text-xs sm:text-sm font-bold text-white light:text-slate-900">
                  {teamA.shortName}
                </span>
                <span className="font-mono text-xs text-slate-400 light:text-slate-600 tabular-nums">
                  {profileA.fourAxisAvg} avg
                </span>
              </div>

              <span className="text-slate-600 text-xs">vs</span>

              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: radarColors.colorB }}
                />
                <span className="text-xs sm:text-sm font-bold text-white light:text-slate-900">
                  {teamB.shortName}
                </span>
                <span className="font-mono text-xs text-slate-400 light:text-slate-600 tabular-nums">
                  {profileB.fourAxisAvg} avg
                </span>
              </div>
            </div>

            <div className="font-mono text-[11px] uppercase tracking-wider tabular-nums">
              {edgeLeader ? (
                <span
                  style={{
                    color: edgeLeader.id === teamA.id ? radarColors.colorA : radarColors.colorB,
                  }}
                >
                  +{Math.abs(avgDelta)} EDGE · {edgeLeader.code || edgeLeader.shortName}
                </span>
              ) : (
                <span className="text-slate-400 light:text-slate-600">DEADLOCKED RADAR AVG</span>
              )}
            </div>
          </div>

          <div className="py-2 flex-1 flex flex-col justify-center">
            <TeamRadarChart
              profileA={profileA}
              profileB={profileB}
              colorA={radarColors.colorA}
              fillA={radarColors.fillA}
              colorB={radarColors.colorB}
              fillB={radarColors.fillB}
              activeAxis={activeAxis}
              onHoverAxis={setActiveAxis}
              isLightTheme={isLightTheme}
            />
          </div>
        </div>

        {/* Right 5 Cols: 4-Axis Differential Bars + Profile Specs */}
        <div className="lg:col-span-5 rounded-2xl bg-[#0A111C] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 sm:p-6 flex flex-col justify-between gap-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.07] light:border-slate-200">
              <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-slate-400 light:text-slate-600 font-bold">
                OVERALL ATTRIBUTE DELTA
              </span>
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider">
                <span style={{ color: radarColors.colorA }}>{teamA.code || teamA.shortName}</span>
                <span className="text-slate-500">/</span>
                <span style={{ color: radarColors.colorB }}>{teamB.code || teamB.shortName}</span>
              </div>
            </div>

            <div className="space-y-3.5">
              {RADAR_AXES.map((axis) => {
                const aPt = profileA.axes[axis.key];
                const bPt = profileB.axes[axis.key];
                const delta = aPt.score - bPt.score;
                const isFocused = activeAxis === axis.key;

                return (
                  <div
                    key={axis.key}
                    onMouseEnter={() => setActiveAxis(axis.key)}
                    onMouseLeave={() => setActiveAxis(null)}
                    className={`rounded-xl p-2.5 -mx-2.5 transition-colors cursor-default ${
                      isFocused
                        ? 'bg-white/[0.05] light:bg-slate-100/90'
                        : 'hover:bg-white/[0.03] light:hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold tabular-nums" style={{ color: radarColors.colorA }}>
                          {aPt.score}
                        </span>
                      </div>

                      <div className="text-center">
                        <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-white light:text-slate-900">
                          {axis.label}
                        </span>
                        <span
                          className={`ml-2 font-mono text-[10px] font-bold tabular-nums ${
                            delta > 0
                              ? 'text-emerald-400 light:text-emerald-700'
                              : delta < 0
                              ? 'text-amber-400 light:text-amber-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : 'EVEN'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold tabular-nums" style={{ color: radarColors.colorB }}>
                          {bPt.score}
                        </span>
                      </div>
                    </div>

                    {/* Opposing Normalized Bars */}
                    <div className="grid grid-cols-2 gap-1.5 h-2">
                      <div className="bg-white/[0.06] light:bg-slate-200 rounded-l-full overflow-hidden flex justify-end">
                        <div
                          className="h-full rounded-l-full transition-all duration-300"
                          style={{
                            width: `${aPt.score}%`,
                            backgroundColor: radarColors.colorA,
                          }}
                        />
                      </div>
                      <div className="bg-white/[0.06] light:bg-slate-200 rounded-r-full overflow-hidden flex justify-start">
                        <div
                          className="h-full rounded-r-full transition-all duration-300"
                          style={{
                            width: `${bPt.score}%`,
                            backgroundColor: radarColors.colorB,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1.5 text-[10px] text-slate-400 light:text-slate-600 tabular-nums">
                      <span className="truncate">{aPt.detail}</span>
                      <span className="truncate text-right">{bPt.detail}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compact Team Specs Ledger */}
          <div className="pt-3 border-t border-white/[0.07] light:border-slate-200">
            <span className="block font-mono text-[10px] tracking-[0.18em] uppercase text-slate-400 light:text-slate-600 font-bold mb-2">
              SIDE-BY-SIDE PROFILE
            </span>
            <div className="divide-y divide-white/[0.06] light:divide-slate-100 text-xs">
              {specRows.map((row) => (
                <div key={row.label} className="py-2 grid grid-cols-3 items-center gap-2">
                  <span
                    className={`font-semibold tabular-nums truncate ${
                      row.winner === 'A'
                        ? 'text-white light:text-slate-950 font-bold'
                        : 'text-slate-300 light:text-slate-700'
                    }`}
                  >
                    {row.valA}
                  </span>
                  <span className="text-center font-mono text-[10px] uppercase tracking-wider text-slate-500">
                    {row.label}
                  </span>
                  <span
                    className={`text-right font-semibold tabular-nums truncate ${
                      row.winner === 'B'
                        ? 'text-white light:text-slate-950 font-bold'
                        : 'text-slate-300 light:text-slate-700'
                    }`}
                  >
                    {row.valB}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Row: Form Sequence & Top Squad Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {[
          {
            profile: profileA,
            players: topPlayersA,
            color: radarColors.colorA,
          },
          {
            profile: profileB,
            players: topPlayersB,
            color: radarColors.colorB,
          },
        ].map(({ profile, players, color }) => {
          const { team, recentSequence, formSource, statsMetrics } = profile;
          return (
            <div
              key={team.id}
              className="rounded-2xl bg-[#0A111C] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-4"
            >
              {/* Team Header & Recent Form */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.07] light:border-slate-200">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 shrink-0 flex items-center justify-center">
                    <TeamEmblem team={team} />
                  </div>
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => openDossier(team, 1)}
                      className="text-sm font-bold text-white light:text-slate-900 hover:underline truncate block cursor-pointer text-left"
                    >
                      {team.name}
                    </button>
                    <span className="text-[11px] text-slate-400 light:text-slate-600 block">
                      {formSource === 'baseline'
                        ? 'Form Index: Pre-match rating & squad fitness baseline'
                        : `Form Index: ${profile.axes.form.score}/100 (${recentSequence.length} recent)`}
                    </span>
                  </div>
                </div>

                {/* W-D-L Sequence */}
                <div className="flex items-center gap-1.5">
                  {recentSequence.length > 0 ? (
                    recentSequence.map((m, idx) => (
                      <span
                        key={`${team.id}-form-${idx}`}
                        title={`${m.result} ${m.score} vs ${m.opponent}${m.competition ? ` (${m.competition})` : ''}`}
                        className={`w-6 h-6 rounded-md font-mono text-[11px] font-bold flex items-center justify-center border tabular-nums ${
                          m.result === 'W'
                            ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300 light:bg-emerald-50 light:border-emerald-300 light:text-emerald-700'
                            : m.result === 'D'
                            ? 'bg-amber-500/15 border-amber-400/40 text-amber-300 light:bg-amber-50 light:border-amber-300 light:text-amber-700'
                            : 'bg-rose-500/15 border-rose-400/40 text-rose-300 light:bg-rose-50 light:border-rose-300 light:text-rose-700'
                        }`}
                      >
                        {m.result}
                      </span>
                    ))
                  ) : (
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      0 matches played
                    </span>
                  )}
                </div>
              </div>

              {/* Match Telemetry Strip if recorded */}
              {statsMetrics && statsMetrics.matchesPlayed > 0 && (
                <div className="grid grid-cols-4 gap-2 py-2 px-3 rounded-xl bg-white/[0.02] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 text-center">
                  <div>
                    <span className="block font-mono text-[9px] uppercase text-slate-500">MP</span>
                    <span className="font-mono text-sm font-bold text-white light:text-slate-900 tabular-nums">
                      {statsMetrics.matchesPlayed}
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono text-[9px] uppercase text-slate-500">GF / GA</span>
                    <span className="font-mono text-sm font-bold text-white light:text-slate-900 tabular-nums">
                      {statsMetrics.goalsFor}/{statsMetrics.goalsAgainst}
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono text-[9px] uppercase text-slate-500">xG/m</span>
                    <span className="font-mono text-sm font-bold text-white light:text-slate-900 tabular-nums">
                      {statsMetrics.xgPerMatch.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="block font-mono text-[9px] uppercase text-slate-500">POSS</span>
                    <span className="font-mono text-sm font-bold text-white light:text-slate-900 tabular-nums">
                      {statsMetrics.avgPossession.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Key Squad Talismans */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.16em] text-slate-500">
                  <span>KEY SQUAD TALISMANS</span>
                  <span className="inline-flex items-center gap-1">
                    <Trophy className="w-3 h-3" style={{ color }} />
                    RATING
                  </span>
                </div>
                <div className="divide-y divide-white/[0.05] light:divide-slate-100">
                  {players.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => openPlayerProfile(p.id)}
                      className="w-full py-2 flex items-center justify-between gap-3 text-left hover:bg-white/[0.03] light:hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-white light:text-slate-900 truncate block">
                          {getPlayerDisplayName(p)}
                        </span>
                        <span className="text-[10px] text-slate-400 light:text-slate-600 font-mono">
                          {p.positionDetail} · #{p.shirtNumber} · PAC {p.attributes.pace} · SHO{' '}
                          {p.attributes.shooting} · PAS {p.attributes.passing}
                        </span>
                      </div>
                      <span
                        className="font-display text-xl tabular-nums leading-none shrink-0"
                        style={{ color }}
                      >
                        {p.overallRating}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
