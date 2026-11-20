import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Award,
  BarChart3,
  ChevronRight,
  Compass,
  Crosshair,
  Flame,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { normalizeDatabaseSearchText } from '../../utils/globalDatabaseSearch';
import {
  DatabaseSearchDropdown,
  useWholeDatabaseQuickSearch,
} from '../common/DatabaseSearchDropdown';
import { useMatchCentre } from '../../context/MatchCentreContext';
import type {
  TeamAggregateStatistics,
  TeamStatMetrics,
  TeamStatisticsResponse,
  TeamStatsSourceScope,
} from '../../types/teamStats';
import { TeamEmblem } from './TeamEmblem';

interface TeamStatisticsViewProps {
  onOpenMatchCreator: () => void;
}

type LeaderboardGroup =
  | 'overview'
  | 'attack'
  | 'possession'
  | 'defence'
  | 'discipline'
  | 'tournaments';

type SortDirection = 'asc' | 'desc';

interface ColumnDef {
  key: string;
  label: string;
  title: string;
  align?: 'left' | 'right' | 'center';
  getValue: (entry: TeamAggregateStatistics, m: TeamStatMetrics) => number | string;
  renderCell: (entry: TeamAggregateStatistics, m: TeamStatMetrics) => React.ReactNode;
}

function getScopedMetrics(
  entry: TeamAggregateStatistics,
  scope: TeamStatsSourceScope
): TeamStatMetrics {
  if (scope === 'simulate') return entry.simulate;
  if (scope === 'tournaments') return entry.tournaments;
  return entry.combined;
}

function formatSigned(val: number, decimals = 0): string {
  const formatted = decimals > 0 ? val.toFixed(decimals) : String(val);
  return val > 0 ? `+${formatted}` : formatted;
}

export const TeamStatisticsView: React.FC<TeamStatisticsViewProps> = ({
  onOpenMatchCreator,
}) => {
  const {
    fetchTeamStatistics,
    simulationMatches,
    competitionMakers,
    openTeamById,
    setActiveTab,
  } = useMatchCentre();

  const [data, setData] = useState<TeamStatisticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [sourceScope, setSourceScope] = useState<TeamStatsSourceScope>('all');
  const [metricGroup, setMetricGroup] = useState<LeaderboardGroup>('overview');
  const [teamTypeFilter, setTeamTypeFilter] = useState<'all' | 'club' | 'country'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'men' | 'women'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const { warmIndex, openFullSearchModal } = useWholeDatabaseQuickSearch(searchQuery, false);
  const [onlyWithMatches, setOnlyWithMatches] = useState<boolean>(true);

  const [sortKey, setSortKey] = useState<string>('points');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  const loadStatistics = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await fetchTeamStatistics();
        setData(res);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchTeamStatistics]
  );

  const tournamentSignature = useMemo(
    () =>
      competitionMakers
        .map((c) => `${c.id}:${c.status}:${c.updatedAt}`)
        .join('|'),
    [competitionMakers]
  );

  useEffect(() => {
    void loadStatistics(false);
  }, [loadStatistics, simulationMatches.length, tournamentSignature]);

  const sourceHasAnyMatches = useMemo(() => {
    if (!data) return false;
    return data.teams.some((t) => getScopedMetrics(t, sourceScope).matchesPlayed > 0);
  }, [data, sourceScope]);

  const columnsByGroup: Record<LeaderboardGroup, ColumnDef[]> = useMemo(
    () => ({
      overview: [
        {
          key: 'matchesPlayed',
          label: 'MP',
          title: 'Matches Played',
          getValue: (_e, m) => m.matchesPlayed,
          renderCell: (_e, m) => <span className="font-semibold">{m.matchesPlayed}</span>,
        },
        {
          key: 'wins',
          label: 'W',
          title: 'Wins',
          getValue: (_e, m) => m.wins,
          renderCell: (_e, m) => <span className="text-emerald-400 light:text-emerald-700 font-semibold">{m.wins}</span>,
        },
        {
          key: 'draws',
          label: 'D',
          title: 'Draws',
          getValue: (_e, m) => m.draws,
          renderCell: (_e, m) => m.draws,
        },
        {
          key: 'losses',
          label: 'L',
          title: 'Losses',
          getValue: (_e, m) => m.losses,
          renderCell: (_e, m) => <span className="text-rose-400 light:text-rose-700">{m.losses}</span>,
        },
        {
          key: 'winRatePct',
          label: 'Win%',
          title: 'Win Percentage',
          getValue: (_e, m) => m.winRatePct,
          renderCell: (_e, m) => `${m.winRatePct.toFixed(1)}%`,
        },
        {
          key: 'goalsFor',
          label: 'GF',
          title: 'Total Goals Scored',
          getValue: (_e, m) => m.goalsFor,
          renderCell: (_e, m) => <span className="font-bold text-white light:text-slate-900">{m.goalsFor}</span>,
        },
        {
          key: 'goalsAgainst',
          label: 'GA',
          title: 'Total Goals Conceded',
          getValue: (_e, m) => m.goalsAgainst,
          renderCell: (_e, m) => m.goalsAgainst,
        },
        {
          key: 'goalDifference',
          label: 'GD',
          title: 'Goal Difference',
          getValue: (_e, m) => m.goalDifference,
          renderCell: (_e, m) => (
            <span
              className={
                m.goalDifference > 0
                  ? 'text-emerald-400 light:text-emerald-700 font-semibold'
                  : m.goalDifference < 0
                  ? 'text-rose-400 light:text-rose-700'
                  : ''
              }
            >
              {formatSigned(m.goalDifference)}
            </span>
          ),
        },
        {
          key: 'cleanSheets',
          label: 'CS',
          title: 'Clean Sheets',
          getValue: (_e, m) => m.cleanSheets,
          renderCell: (_e, m) => (
            <span className="text-[#7ADBF0] light:text-cyan-700 font-semibold">{m.cleanSheets}</span>
          ),
        },
        {
          key: 'cleanSheetPct',
          label: 'CS%',
          title: 'Clean Sheet Percentage',
          getValue: (_e, m) => m.cleanSheetPct,
          renderCell: (_e, m) => `${m.cleanSheetPct.toFixed(0)}%`,
        },
        {
          key: 'avgPossession',
          label: 'Poss%',
          title: 'Average Possession %',
          getValue: (_e, m) => m.avgPossession,
          renderCell: (_e, m) => `${m.avgPossession.toFixed(1)}%`,
        },
        {
          key: 'xg',
          label: 'xG',
          title: 'Total Expected Goals',
          getValue: (_e, m) => m.xg,
          renderCell: (_e, m) => m.xg.toFixed(2),
        },
        {
          key: 'points',
          label: 'Pts',
          title: 'Points (3-pt system)',
          getValue: (_e, m) => m.points,
          renderCell: (_e, m) => <span className="font-bold text-amber-300 light:text-amber-700">{m.points}</span>,
        },
      ],
      attack: [
        {
          key: 'matchesPlayed',
          label: 'MP',
          title: 'Matches Played',
          getValue: (_e, m) => m.matchesPlayed,
          renderCell: (_e, m) => m.matchesPlayed,
        },
        {
          key: 'goalsFor',
          label: 'GF',
          title: 'Total Goals Scored',
          getValue: (_e, m) => m.goalsFor,
          renderCell: (_e, m) => <span className="font-bold text-white light:text-slate-900">{m.goalsFor}</span>,
        },
        {
          key: 'avgGoalsFor',
          label: 'GF/M',
          title: 'Goals Scored per Match',
          getValue: (_e, m) => m.avgGoalsFor,
          renderCell: (_e, m) => m.avgGoalsFor.toFixed(2),
        },
        {
          key: 'xg',
          label: 'xG',
          title: 'Expected Goals',
          getValue: (_e, m) => m.xg,
          renderCell: (_e, m) => m.xg.toFixed(2),
        },
        {
          key: 'xgPerMatch',
          label: 'xG/M',
          title: 'xG per Match',
          getValue: (_e, m) => m.xgPerMatch,
          renderCell: (_e, m) => m.xgPerMatch.toFixed(2),
        },
        {
          key: 'xgDifference',
          label: 'GF−xG',
          title: 'Finishing Over/Underperformance (Goals minus xG)',
          getValue: (_e, m) => m.xgDifference,
          renderCell: (_e, m) => (
            <span
              className={
                m.xgDifference > 0
                  ? 'text-emerald-400 light:text-emerald-700'
                  : m.xgDifference < 0
                  ? 'text-rose-400 light:text-rose-700'
                  : ''
              }
            >
              {formatSigned(m.xgDifference, 2)}
            </span>
          ),
        },
        {
          key: 'xgot',
          label: 'xGOT',
          title: 'Expected Goals on Target',
          getValue: (_e, m) => m.xgot,
          renderCell: (_e, m) => m.xgot.toFixed(2),
        },
        {
          key: 'openPlayXg',
          label: 'OP xG',
          title: 'Open-Play xG',
          getValue: (_e, m) => m.openPlayXg,
          renderCell: (_e, m) => m.openPlayXg.toFixed(2),
        },
        {
          key: 'setPieceXg',
          label: 'SP xG',
          title: 'Set-Piece xG',
          getValue: (_e, m) => m.setPieceXg,
          renderCell: (_e, m) => m.setPieceXg.toFixed(2),
        },
        {
          key: 'shots',
          label: 'Sh',
          title: 'Total Shots',
          getValue: (_e, m) => m.shots,
          renderCell: (_e, m) => m.shots,
        },
        {
          key: 'shotsOnTarget',
          label: 'SoT',
          title: 'Shots on Target',
          getValue: (_e, m) => m.shotsOnTarget,
          renderCell: (_e, m) => m.shotsOnTarget,
        },
        {
          key: 'shotAccuracyPct',
          label: 'SoT%',
          title: 'Shot Accuracy %',
          getValue: (_e, m) => m.shotAccuracyPct,
          renderCell: (_e, m) => `${m.shotAccuracyPct.toFixed(1)}%`,
        },
        {
          key: 'bigChances',
          label: 'BC',
          title: 'Big Chances Created',
          getValue: (_e, m) => m.bigChances,
          renderCell: (_e, m) => m.bigChances,
        },
        {
          key: 'bigChancesMissed',
          label: 'BCM',
          title: 'Big Chances Missed',
          getValue: (_e, m) => m.bigChancesMissed,
          renderCell: (_e, m) => m.bigChancesMissed,
        },
        {
          key: 'touchesInBox',
          label: 'Box',
          title: 'Touches in Opposition Box',
          getValue: (_e, m) => m.touchesInBox,
          renderCell: (_e, m) => m.touchesInBox,
        },
        {
          key: 'corners',
          label: 'Cor',
          title: 'Corners Won',
          getValue: (_e, m) => m.corners,
          renderCell: (_e, m) => m.corners,
        },
        {
          key: 'offsides',
          label: 'Off',
          title: 'Offsides',
          getValue: (_e, m) => m.offsides,
          renderCell: (_e, m) => m.offsides,
        },
      ],
      possession: [
        {
          key: 'matchesPlayed',
          label: 'MP',
          title: 'Matches Played',
          getValue: (_e, m) => m.matchesPlayed,
          renderCell: (_e, m) => m.matchesPlayed,
        },
        {
          key: 'avgPossession',
          label: 'Poss%',
          title: 'Average Possession %',
          getValue: (_e, m) => m.avgPossession,
          renderCell: (_e, m) => (
            <span className="font-bold text-[#7ADBF0] light:text-cyan-700">
              {m.avgPossession.toFixed(1)}%
            </span>
          ),
        },
        {
          key: 'passesCompleted',
          label: 'Pass C',
          title: 'Passes Completed',
          getValue: (_e, m) => m.passesCompleted,
          renderCell: (_e, m) => m.passesCompleted.toLocaleString(),
        },
        {
          key: 'passesAttempted',
          label: 'Pass A',
          title: 'Passes Attempted',
          getValue: (_e, m) => m.passesAttempted,
          renderCell: (_e, m) => m.passesAttempted.toLocaleString(),
        },
        {
          key: 'passesCompletedPerMatch',
          label: 'Pass/M',
          title: 'Completed Passes per Match',
          getValue: (_e, m) => m.passesCompletedPerMatch,
          renderCell: (_e, m) => m.passesCompletedPerMatch.toFixed(1),
        },
        {
          key: 'passAccuracyPct',
          label: 'Pass%',
          title: 'Pass Accuracy %',
          getValue: (_e, m) => m.passAccuracyPct,
          renderCell: (_e, m) => `${m.passAccuracyPct.toFixed(1)}%`,
        },
        {
          key: 'zoneLeft',
          label: 'Left%',
          title: 'Attacking Channel Left %',
          getValue: (_e, m) => m.attackingZones.left,
          renderCell: (_e, m) => `${m.attackingZones.left.toFixed(0)}%`,
        },
        {
          key: 'zoneCentral',
          label: 'Mid%',
          title: 'Attacking Channel Central %',
          getValue: (_e, m) => m.attackingZones.central,
          renderCell: (_e, m) => `${m.attackingZones.central.toFixed(0)}%`,
        },
        {
          key: 'zoneRight',
          label: 'Right%',
          title: 'Attacking Channel Right %',
          getValue: (_e, m) => m.attackingZones.right,
          renderCell: (_e, m) => `${m.attackingZones.right.toFixed(0)}%`,
        },
        {
          key: 'buildPatient',
          label: 'Pat%',
          title: 'Patient Possession Build-Up %',
          getValue: (_e, m) => m.buildMethods.patient,
          renderCell: (_e, m) => `${m.buildMethods.patient.toFixed(0)}%`,
        },
        {
          key: 'buildThrough',
          label: 'Thru%',
          title: 'Through-Ball Build-Up %',
          getValue: (_e, m) => m.buildMethods.throughBall,
          renderCell: (_e, m) => `${m.buildMethods.throughBall.toFixed(0)}%`,
        },
        {
          key: 'buildCross',
          label: 'X/SP%',
          title: 'Crosses & Set-Piece Build-Up %',
          getValue: (_e, m) => m.buildMethods.crossSetPiece,
          renderCell: (_e, m) => `${m.buildMethods.crossSetPiece.toFixed(0)}%`,
        },
        {
          key: 'buildCounter',
          label: 'Cntr%',
          title: 'Counter-Attack Build-Up %',
          getValue: (_e, m) => m.buildMethods.counter,
          renderCell: (_e, m) => `${m.buildMethods.counter.toFixed(0)}%`,
        },
      ],
      defence: [
        {
          key: 'matchesPlayed',
          label: 'MP',
          title: 'Matches Played',
          getValue: (_e, m) => m.matchesPlayed,
          renderCell: (_e, m) => m.matchesPlayed,
        },
        {
          key: 'goalsAgainst',
          label: 'GA',
          title: 'Goals Conceded',
          getValue: (_e, m) => m.goalsAgainst,
          renderCell: (_e, m) => m.goalsAgainst,
        },
        {
          key: 'avgGoalsAgainst',
          label: 'GA/M',
          title: 'Goals Conceded per Match',
          getValue: (_e, m) => m.avgGoalsAgainst,
          renderCell: (_e, m) => m.avgGoalsAgainst.toFixed(2),
        },
        {
          key: 'cleanSheets',
          label: 'CS',
          title: 'Clean Sheets',
          getValue: (_e, m) => m.cleanSheets,
          renderCell: (_e, m) => (
            <span className="font-bold text-[#7ADBF0] light:text-cyan-700">{m.cleanSheets}</span>
          ),
        },
        {
          key: 'cleanSheetPct',
          label: 'CS%',
          title: 'Clean Sheet Rate %',
          getValue: (_e, m) => m.cleanSheetPct,
          renderCell: (_e, m) => `${m.cleanSheetPct.toFixed(1)}%`,
        },
        {
          key: 'xgAgainst',
          label: 'xGA',
          title: 'Expected Goals Conceded',
          getValue: (_e, m) => m.xgAgainst,
          renderCell: (_e, m) => m.xgAgainst.toFixed(2),
        },
        {
          key: 'netXg',
          label: 'Net xG',
          title: 'xG minus xGA',
          getValue: (_e, m) => m.netXg,
          renderCell: (_e, m) => (
            <span
              className={
                m.netXg > 0
                  ? 'text-emerald-400 light:text-emerald-700'
                  : m.netXg < 0
                  ? 'text-rose-400 light:text-rose-700'
                  : ''
              }
            >
              {formatSigned(m.netXg, 2)}
            </span>
          ),
        },
        {
          key: 'shotsConceded',
          label: 'Sh Conc',
          title: 'Shots Faced',
          getValue: (_e, m) => m.shotsConceded,
          renderCell: (_e, m) => m.shotsConceded,
        },
        {
          key: 'saves',
          label: 'Saves',
          title: 'Goalkeeper Saves',
          getValue: (_e, m) => m.saves,
          renderCell: (_e, m) => m.saves,
        },
        {
          key: 'savePct',
          label: 'Save%',
          title: 'Save Percentage',
          getValue: (_e, m) => m.savePct,
          renderCell: (_e, m) => `${m.savePct.toFixed(1)}%`,
        },
        {
          key: 'tacklesWon',
          label: 'Tkl W',
          title: 'Tackles Won / Attempted',
          getValue: (_e, m) => m.tacklesWon,
          renderCell: (_e, m) => `${m.tacklesWon}/${m.tacklesTotal}`,
        },
        {
          key: 'tackleSuccessPct',
          label: 'Tkl%',
          title: 'Tackle Success %',
          getValue: (_e, m) => m.tackleSuccessPct,
          renderCell: (_e, m) => `${m.tackleSuccessPct.toFixed(0)}%`,
        },
        {
          key: 'duelWinPct',
          label: 'Duel%',
          title: 'Duels Won %',
          getValue: (_e, m) => m.duelWinPct,
          renderCell: (_e, m) => `${m.duelWinPct.toFixed(0)}%`,
        },
        {
          key: 'interceptions',
          label: 'Int',
          title: 'Interceptions',
          getValue: (_e, m) => m.interceptions,
          renderCell: (_e, m) => m.interceptions,
        },
        {
          key: 'clearances',
          label: 'Clr',
          title: 'Clearances',
          getValue: (_e, m) => m.clearances,
          renderCell: (_e, m) => m.clearances,
        },
      ],
      discipline: [
        {
          key: 'matchesPlayed',
          label: 'MP',
          title: 'Matches Played',
          getValue: (_e, m) => m.matchesPlayed,
          renderCell: (_e, m) => m.matchesPlayed,
        },
        {
          key: 'fouls',
          label: 'Fouls',
          title: 'Total Fouls Committed',
          getValue: (_e, m) => m.fouls,
          renderCell: (_e, m) => m.fouls,
        },
        {
          key: 'foulsPerMatch',
          label: 'F/M',
          title: 'Fouls per Match',
          getValue: (_e, m) => m.foulsPerMatch,
          renderCell: (_e, m) => m.foulsPerMatch.toFixed(1),
        },
        {
          key: 'yellowCards',
          label: 'YC',
          title: 'Yellow Cards',
          getValue: (_e, m) => m.yellowCards,
          renderCell: (_e, m) => (
            <span className="text-amber-300 light:text-amber-700 font-semibold">{m.yellowCards}</span>
          ),
        },
        {
          key: 'redCards',
          label: 'RC',
          title: 'Red Cards (direct + 2nd yellow)',
          getValue: (_e, m) => m.redCards,
          renderCell: (_e, m) => (
            <span className={m.redCards > 0 ? 'text-rose-400 light:text-rose-700 font-bold' : ''}>
              {m.redCards}
            </span>
          ),
        },
        {
          key: 'penaltiesAwardedScored',
          label: 'Pen+',
          title: 'In-Match Penalties Scored',
          getValue: (_e, m) => m.penaltiesAwardedScored,
          renderCell: (_e, m) => m.penaltiesAwardedScored,
        },
        {
          key: 'penaltiesMissed',
          label: 'Pen-',
          title: 'In-Match Penalties Missed',
          getValue: (_e, m) => m.penaltiesMissed,
          renderCell: (_e, m) => m.penaltiesMissed,
        },
        {
          key: 'extraTimeMatches',
          label: 'ET',
          title: 'Extra-Time Matches Played',
          getValue: (_e, m) => m.extraTimeMatches,
          renderCell: (_e, m) => m.extraTimeMatches,
        },
        {
          key: 'penaltyShootoutWins',
          label: 'PS W-L',
          title: 'Penalty Shootout Wins-Losses',
          getValue: (_e, m) => m.penaltyShootoutWins,
          renderCell: (_e, m) => `${m.penaltyShootoutWins}-${m.penaltyShootoutLosses}`,
        },
        {
          key: 'substitutionsUsed',
          label: 'Subs',
          title: 'Substitutions Used',
          getValue: (_e, m) => m.substitutionsUsed,
          renderCell: (_e, m) => m.substitutionsUsed,
        },
        {
          key: 'injuriesSuffered',
          label: 'Inj',
          title: 'Injuries Suffered',
          getValue: (_e, m) => m.injuriesSuffered,
          renderCell: (_e, m) => m.injuriesSuffered,
        },
        {
          key: 'avgRunningDistanceKm',
          label: 'Run km/M',
          title: 'Avg Running Distance (km/match)',
          getValue: (_e, m) => m.avgRunningDistanceKm,
          renderCell: (_e, m) => m.avgRunningDistanceKm.toFixed(1),
        },
        {
          key: 'avgSprintingDistanceKm',
          label: 'Spr km/M',
          title: 'Avg Sprinting Distance (km/match)',
          getValue: (_e, m) => m.avgSprintingDistanceKm,
          renderCell: (_e, m) => m.avgSprintingDistanceKm.toFixed(1),
        },
        {
          key: 'avgSprintsPerMatch',
          label: 'Spr/M',
          title: 'Avg Sprints per Match',
          getValue: (_e, m) => m.avgSprintsPerMatch,
          renderCell: (_e, m) => m.avgSprintsPerMatch.toFixed(0),
        },
      ],
      tournaments: [
        {
          key: 'matchesPlayed',
          label: 'MP',
          title: 'Matches Played',
          getValue: (_e, m) => m.matchesPlayed,
          renderCell: (_e, m) => m.matchesPlayed,
        },
        {
          key: 'tournamentsEntered',
          label: 'Entered',
          title: 'Tournaments Entered',
          getValue: (_e, m) => m.tournamentsEntered,
          renderCell: (_e, m) => m.tournamentsEntered,
        },
        {
          key: 'tournamentTitlesWon',
          label: 'Titles',
          title: 'Tournament Titles Won',
          getValue: (_e, m) => m.tournamentTitlesWon,
          renderCell: (_e, m) => (
            <span className={m.tournamentTitlesWon > 0 ? 'text-amber-300 light:text-amber-700 font-bold' : ''}>
              {m.tournamentTitlesWon}
            </span>
          ),
        },
        {
          key: 'tournamentRunnerUps',
          label: '2nd',
          title: 'Runner-Up Finishes',
          getValue: (_e, m) => m.tournamentRunnerUps,
          renderCell: (_e, m) => m.tournamentRunnerUps,
        },
        {
          key: 'tournamentThirdPlaces',
          label: '3rd',
          title: '3rd-Place Finishes',
          getValue: (_e, m) => m.tournamentThirdPlaces,
          renderCell: (_e, m) => m.tournamentThirdPlaces,
        },
        {
          key: 'motmAwards',
          label: 'MOTM',
          title: 'Man of the Match Awards',
          getValue: (_e, m) => m.motmAwards,
          renderCell: (_e, m) => m.motmAwards,
        },
        {
          key: 'avgMatchRating',
          label: 'Avg Rtg',
          title: 'Average Player Match Rating',
          getValue: (_e, m) => m.avgMatchRating,
          renderCell: (_e, m) => (m.avgMatchRating > 0 ? m.avgMatchRating.toFixed(2) : '—'),
        },
        {
          key: 'halfTimeGoalsFor',
          label: '1H GF:GA',
          title: '1st Half Goals For : Against',
          getValue: (_e, m) => m.halfTimeGoalsFor,
          renderCell: (_e, m) => `${m.halfTimeGoalsFor}:${m.halfTimeGoalsAgainst}`,
        },
        {
          key: 'secondHalfGoalsFor',
          label: '2H GF:GA',
          title: '2nd Half Goals For : Against',
          getValue: (_e, m) => m.secondHalfGoalsFor,
          renderCell: (_e, m) => `${m.secondHalfGoalsFor}:${m.secondHalfGoalsAgainst}`,
        },
        {
          key: 'extraTimeGoalsFor',
          label: 'ET GF:GA',
          title: 'Extra-Time Goals For : Against',
          getValue: (_e, m) => m.extraTimeGoalsFor,
          renderCell: (_e, m) => `${m.extraTimeGoalsFor}:${m.extraTimeGoalsAgainst}`,
        },
        {
          key: 'homeWins',
          label: 'Home W-D-L',
          title: 'Home Record',
          getValue: (_e, m) => m.homeWins,
          renderCell: (_e, m) => `${m.homeWins}-${m.homeDraws}-${m.homeLosses}`,
        },
        {
          key: 'awayWins',
          label: 'Away W-D-L',
          title: 'Away Record',
          getValue: (_e, m) => m.awayWins,
          renderCell: (_e, m) => `${m.awayWins}-${m.awayDraws}-${m.awayLosses}`,
        },
        {
          key: 'failedToScore',
          label: 'FTS',
          title: 'Failed to Score Matches',
          getValue: (_e, m) => m.failedToScore,
          renderCell: (_e, m) => m.failedToScore,
        },
      ],
    }),
    []
  );

  const activeColumns = columnsByGroup[metricGroup];

  const filteredAndSortedTeams = useMemo(() => {
    if (!data) return [];
    const q = normalizeDatabaseSearchText(deferredSearchQuery);

    const list = data.teams.filter((entry) => {
      if (teamTypeFilter !== 'all' && entry.team.team_type !== teamTypeFilter) return false;
      if (genderFilter !== 'all' && entry.team.gender !== genderFilter) return false;

      const scoped = getScopedMetrics(entry, sourceScope);
      const hasActivity =
        scoped.matchesPlayed > 0 ||
        (sourceScope !== 'simulate' && entry.tournamentsList.length > 0);
      if (onlyWithMatches && sourceHasAnyMatches && !hasActivity) return false;

      if (q) {
        const hay = normalizeDatabaseSearchText(
          `${entry.team.name} ${entry.team.shortName} ${entry.team.code} ${entry.team.country} ${entry.team.league || ''} ${entry.team.confederation || ''} ${entry.team.manager || ''}`
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sortColDef = activeColumns.find((c) => c.key === sortKey);

    return [...list].sort((a, b) => {
      if (sortKey === 'name') {
        const cmp = a.team.name.localeCompare(b.team.name);
        return sortDir === 'asc' ? cmp : -cmp;
      }
      const ma = getScopedMetrics(a, sourceScope);
      const mb = getScopedMetrics(b, sourceScope);
      const va = sortColDef
        ? Number(sortColDef.getValue(a, ma))
        : Number((ma as unknown as Record<string, number>)[sortKey] ?? 0);
      const vb = sortColDef
        ? Number(sortColDef.getValue(b, mb))
        : Number((mb as unknown as Record<string, number>)[sortKey] ?? 0);

      if (va !== vb) {
        return sortDir === 'asc' ? va - vb : vb - va;
      }
      if (mb.matchesPlayed !== ma.matchesPlayed) {
        return mb.matchesPlayed - ma.matchesPlayed;
      }
      if (mb.goalDifference !== ma.goalDifference) {
        return mb.goalDifference - ma.goalDifference;
      }
      return a.team.name.localeCompare(b.team.name);
    });
  }, [
    data,
    deferredSearchQuery,
    teamTypeFilter,
    genderFilter,
    onlyWithMatches,
    sourceHasAnyMatches,
    sourceScope,
    activeColumns,
    sortKey,
    sortDir,
  ]);

  const selectedEntry = useMemo(() => {
    if (!filteredAndSortedTeams.length) {
      if (!data) return null;
      return selectedTeamId
        ? data.teams.find((t) => t.team.id === selectedTeamId) || null
        : null;
    }
    if (selectedTeamId) {
      const hit = filteredAndSortedTeams.find((t) => t.team.id === selectedTeamId);
      if (hit) return hit;
    }
    return filteredAndSortedTeams[0];
  }, [filteredAndSortedTeams, data, selectedTeamId]);

  const handleSortClick = (key: string) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
  };

  const handleMetricGroupChange = (group: LeaderboardGroup) => {
    setMetricGroup(group);
    const cols = columnsByGroup[group];
    if (!cols.some((c) => c.key === sortKey)) {
      const defaultKey =
        group === 'overview'
          ? 'points'
          : group === 'attack'
          ? 'goalsFor'
          : group === 'possession'
          ? 'avgPossession'
          : group === 'defence'
          ? 'cleanSheets'
          : group === 'tournaments'
          ? 'tournamentTitlesWon'
          : 'fouls';
      setSortKey(defaultKey);
      setSortDir('desc');
    }
  };

  const kpiOverview = useMemo(() => {
    const s = data?.summary;
    if (!s) {
      return {
        teamsTracked: 0,
        matchesRecorded: 0,
        totalGoals: 0,
        cleanSheets: 0,
        avgGoals: 0,
        csRate: 0,
        leader: null as TeamAggregateStatistics | null,
      };
    }

    const matchesRecorded =
      sourceScope === 'simulate'
        ? s.totalSimulatedMatches
        : sourceScope === 'tournaments'
        ? s.totalTournamentMatches
        : s.totalCombinedMatches;
    const totalGoals =
      sourceScope === 'simulate'
        ? s.totalGoalsSimulate
        : sourceScope === 'tournaments'
        ? s.totalGoalsTournaments
        : s.totalGoalsCombined;
    const cleanSheets =
      sourceScope === 'simulate'
        ? s.totalCleanSheetsSimulate
        : sourceScope === 'tournaments'
        ? s.totalCleanSheetsTournaments
        : s.totalCleanSheetsCombined;
    const avgGoals =
      sourceScope === 'simulate'
        ? s.avgGoalsPerMatchSimulate
        : sourceScope === 'tournaments'
        ? s.avgGoalsPerMatchTournaments
        : s.avgGoalsPerMatchCombined;
    const teamsTracked =
      sourceScope === 'simulate'
        ? s.teamsWithSimulatedMatches
        : sourceScope === 'tournaments'
        ? s.teamsWithTournamentMatches
        : s.teamsWithMatches;

    const csRate =
      matchesRecorded > 0 ? Number(((cleanSheets / (matchesRecorded * 2)) * 100).toFixed(1)) : 0;

    const activeWithMatches = (data?.teams || []).filter(
      (t) => getScopedMetrics(t, sourceScope).matchesPlayed > 0
    );
    const leader =
      [...activeWithMatches].sort((a, b) => {
        const ma = getScopedMetrics(a, sourceScope);
        const mb = getScopedMetrics(b, sourceScope);
        return mb.avgPossession - ma.avgPossession || mb.goalsFor - ma.goalsFor;
      })[0] || null;

    return {
      teamsTracked,
      matchesRecorded,
      totalGoals,
      cleanSheets,
      avgGoals,
      csRate,
      leader,
    };
  }, [data, sourceScope]);

  const selectedMetrics = selectedEntry ? getScopedMetrics(selectedEntry, sourceScope) : null;

  return (
    <div className="space-y-5 pb-10">
      {/* Header & Global KPI Summary */}
      <section className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="block font-mono text-[10px] tracking-[0.22em] text-[#7ADBF0] light:text-cyan-700 uppercase">
              MATCH CENTRE · PERFORMANCE ANALYTICS
            </span>
            <h1 className="font-display text-2xl sm:text-4xl text-white light:text-slate-900 uppercase tracking-wide leading-none">
              TEAM STATISTICS
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 light:text-slate-600 max-w-2xl">
              Aggregated performance telemetry across Simulate a Match and Tournaments — goals, clean sheets, possession, expected goals, passing, defending, discipline, physical output, and tournament honours.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Source Scope Switcher */}
            <div
              role="group"
              aria-label="Statistics data source"
              className="inline-flex rounded-xl bg-[#080E18] light:bg-slate-100 border border-white/[0.08] light:border-slate-200 p-1"
            >
              {(
                [
                  { id: 'all', label: 'All Sources' },
                  { id: 'simulate', label: 'Simulate a Match' },
                  { id: 'tournaments', label: 'Tournaments' },
                ] as Array<{ id: TeamStatsSourceScope; label: string }>
              ).map((opt) => {
                const active = sourceScope === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSourceScope(opt.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                      active
                        ? 'bg-[#0891B2] text-white'
                        : 'text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => void loadStatistics(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-100 border border-white/[0.08] light:border-slate-200 text-xs font-semibold text-slate-200 light:text-slate-800 hover:border-[#7ADBF0]/50 light:hover:border-cyan-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 5 KPI Summary Cards */}
        {loading && !data ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 rounded-xl bg-[#080E18] light:bg-slate-100 border border-white/[0.06] light:border-slate-200 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 px-4 py-3">
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                <Shield className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
                <span>Teams Tracked</span>
              </div>
              <div className="font-display text-2xl sm:text-3xl text-white light:text-slate-900 tabular-nums mt-1 leading-none">
                {kpiOverview.teamsTracked}
              </div>
              <div className="text-[11px] text-slate-400 light:text-slate-600 mt-1 tabular-nums">
                of {data?.summary.totalTeamsOnFile ?? 0} on file
              </div>
            </div>

            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 px-4 py-3">
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                <Activity className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-700" />
                <span>Matches Recorded</span>
              </div>
              <div className="font-display text-2xl sm:text-3xl text-white light:text-slate-900 tabular-nums mt-1 leading-none">
                {kpiOverview.matchesRecorded}
              </div>
              <div className="text-[11px] text-slate-400 light:text-slate-600 mt-1 tabular-nums">
                Sim {data?.summary.totalSimulatedMatches ?? 0} · Tournaments {data?.summary.totalTournamentMatches ?? 0}
              </div>
            </div>

            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 px-4 py-3">
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                <Target className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
                <span>Total Goals</span>
              </div>
              <div className="font-display text-2xl sm:text-3xl text-white light:text-slate-900 tabular-nums mt-1 leading-none">
                {kpiOverview.totalGoals}
              </div>
              <div className="text-[11px] text-slate-400 light:text-slate-600 mt-1 tabular-nums">
                {kpiOverview.avgGoals.toFixed(2)} goals / match
              </div>
            </div>

            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 px-4 py-3">
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400 light:text-sky-700" />
                <span>Clean Sheets</span>
              </div>
              <div className="font-display text-2xl sm:text-3xl text-white light:text-slate-900 tabular-nums mt-1 leading-none">
                {kpiOverview.cleanSheets}
              </div>
              <div className="text-[11px] text-slate-400 light:text-slate-600 mt-1 tabular-nums">
                {kpiOverview.csRate.toFixed(1)}% of team appearances
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (kpiOverview.leader) setSelectedTeamId(kpiOverview.leader.team.id);
              }}
              disabled={!kpiOverview.leader}
              className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 hover:border-[#7ADBF0]/50 px-4 py-3 text-left transition-colors cursor-pointer disabled:cursor-default col-span-2 sm:col-span-1"
            >
              <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                <Compass className="w-3.5 h-3.5 text-cyan-400 light:text-cyan-700" />
                <span>Possession Leader</span>
              </div>
              {kpiOverview.leader ? (
                <>
                  <div className="font-display text-2xl sm:text-3xl text-[#7ADBF0] light:text-cyan-700 tabular-nums mt-1 leading-none">
                    {getScopedMetrics(kpiOverview.leader, sourceScope).avgPossession.toFixed(1)}%
                  </div>
                  <div className="text-[11px] text-slate-300 light:text-slate-700 mt-1 truncate font-semibold">
                    {kpiOverview.leader.team.name}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-display text-2xl text-slate-500 mt-1 leading-none">—</div>
                  <div className="text-[11px] text-slate-500 mt-1">Awaiting matches</div>
                </>
              )}
            </button>
          </div>
        )}
      </section>

      {/* Empty State Banner when no matches recorded in active source */}
      {!loading && !sourceHasAnyMatches && (
        <section className="rounded-2xl bg-[#0C131F] light:bg-white border border-dashed border-white/15 light:border-slate-300 p-8 sm:p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-[#7ADBF0]/10 border border-[#7ADBF0]/30 text-[#7ADBF0] light:text-cyan-700 flex items-center justify-center mx-auto">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div className="space-y-1.5 max-w-lg mx-auto">
            <h2 className="font-display text-2xl text-white light:text-slate-900 uppercase tracking-wide">
              {sourceScope === 'simulate'
                ? 'No Simulated Match Statistics Yet'
                : sourceScope === 'tournaments'
                ? 'No Tournament Match Statistics Yet'
                : 'No Recorded Match Statistics Yet'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 light:text-slate-600 leading-relaxed">
              Every match finished in Simulate a Match and every fixture settled in Tournaments automatically records team goals, clean sheets, possession, xG, passing, defending, physical distance, discipline, and shootout data here.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={onOpenMatchCreator}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7ADBF0] hover:bg-[#99E5F5] light:bg-cyan-600 light:hover:bg-cyan-700 text-[#050A12] light:text-white font-semibold text-xs uppercase tracking-wider cursor-pointer transition-colors"
            >
              <Zap className="w-4 h-4" />
              <span>Simulate a Match</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('competitions')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] light:bg-slate-100 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-white light:text-slate-900 font-semibold text-xs uppercase tracking-wider cursor-pointer transition-colors"
            >
              <Trophy className="w-4 h-4 text-amber-400 light:text-amber-600" />
              <span>Open Tournaments</span>
            </button>
          </div>
        </section>
      )}

      {/* Filter & Metric Group Controls */}
      <section className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input with Instant Clickable Whole-Database Options */}
          <div className="relative flex-1 max-w-md">
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
              placeholder="Filter teams or search whole database..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.08] light:border-slate-200 text-xs sm:text-sm text-white light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#7ADBF0] light:focus:border-cyan-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear team statistics search"
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
                limits={{
                  clubs: 5,
                  players: 4,
                  managers: 3,
                  stadiums: 3,
                  leagues: 2,
                  books: 2,
                  series: 1,
                }}
                className="absolute left-0 right-0 lg:w-[400px] top-full mt-1.5 z-50"
              />
            )}
          </div>

          {/* Type + Gender + Played Only Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-[#080E18] light:bg-slate-100 border border-white/[0.08] light:border-slate-200 p-0.5">
              {(
                [
                  { id: 'all', label: 'All Types' },
                  { id: 'club', label: 'Clubs' },
                  { id: 'country', label: 'Nations' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTeamTypeFilter(opt.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    teamTypeFilter === opt.id
                      ? 'bg-white/15 light:bg-white text-white light:text-slate-900 shadow-xs'
                      : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <div className="inline-flex rounded-xl bg-[#080E18] light:bg-slate-100 border border-white/[0.08] light:border-slate-200 p-0.5">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'men', label: "Men's" },
                  { id: 'women', label: "Women's" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGenderFilter(opt.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                    genderFilter === opt.id
                      ? 'bg-white/15 light:bg-white text-white light:text-slate-900 shadow-xs'
                      : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {sourceHasAnyMatches && (
              <button
                type="button"
                onClick={() => setOnlyWithMatches((prev) => !prev)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium cursor-pointer transition-colors ${
                  onlyWithMatches
                    ? 'bg-[#7ADBF0]/15 light:bg-cyan-50 border-[#7ADBF0]/45 light:border-cyan-400 text-[#7ADBF0] light:text-cyan-800'
                    : 'bg-[#080E18] light:bg-slate-50 border-white/[0.08] light:border-slate-200 text-slate-400 light:text-slate-600'
                }`}
              >
                {onlyWithMatches ? 'Showing Teams With Matches' : 'Showing All Teams'}
              </button>
            )}
          </div>
        </div>

        {/* Leaderboard Category Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.06] light:border-slate-200">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'overview', label: 'Overview' },
                { id: 'attack', label: 'Attack & xG' },
                { id: 'possession', label: 'Possession & Channels' },
                { id: 'defence', label: 'Defence & GK' },
                { id: 'discipline', label: 'Discipline & Physical' },
                { id: 'tournaments', label: 'Tournaments & Splits' },
              ] as Array<{ id: LeaderboardGroup; label: string }>
            ).map((grp) => {
              const active = metricGroup === grp.id;
              return (
                <button
                  key={grp.id}
                  type="button"
                  onClick={() => handleMetricGroupChange(grp.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer border transition-colors ${
                    active
                      ? 'bg-[#0891B2] border-[#06B6D4] text-white'
                      : 'bg-[#080E18] light:bg-slate-50 border-white/[0.08] light:border-slate-200 text-slate-300 light:text-slate-700 hover:border-white/25 light:hover:border-slate-300'
                  }`}
                >
                  {grp.label}
                </button>
              );
            })}
          </div>

          <span className="text-xs text-slate-400 light:text-slate-600 tabular-nums">
            {filteredAndSortedTeams.length} team{filteredAndSortedTeams.length === 1 ? '' : 's'} shown · Click column headers to sort or any row for full breakdown
          </span>
        </div>

        {/* Sortable Team Performance Table */}
        <div className="overflow-x-auto rounded-xl border border-white/[0.07] light:border-slate-200 bg-[#080E18] light:bg-white">
          <table className="w-full text-left border-collapse text-xs tabular-nums">
            <thead>
              <tr className="border-b border-white/[0.08] light:border-slate-200 bg-[#050A12] light:bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                <th className="py-3 pl-3.5 pr-2 w-10">#</th>
                <th className="py-3 px-2 min-w-[200px]">
                  <button
                    type="button"
                    onClick={() => handleSortClick('name')}
                    className="inline-flex items-center gap-1 hover:text-white light:hover:text-slate-900 cursor-pointer uppercase"
                  >
                    <span>Team</span>
                    {sortKey === 'name' &&
                      (sortDir === 'asc' ? (
                        <ArrowUp className="w-3 h-3 text-[#7ADBF0] light:text-cyan-700" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-[#7ADBF0] light:text-cyan-700" />
                      ))}
                  </button>
                </th>
                {activeColumns.map((col) => {
                  const isSorted = sortKey === col.key;
                  return (
                    <th key={col.key} className="py-3 px-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        title={col.title}
                        onClick={() => handleSortClick(col.key)}
                        className={`inline-flex items-center justify-end gap-1 hover:text-white light:hover:text-slate-900 cursor-pointer uppercase ${
                          isSorted ? 'text-[#7ADBF0] light:text-cyan-700 font-bold' : ''
                        }`}
                      >
                        <span>{col.label}</span>
                        {isSorted &&
                          (sortDir === 'asc' ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          ))}
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] light:divide-slate-100">
              {loading && !data ? (
                <tr>
                  <td
                    colSpan={activeColumns.length + 2}
                    className="py-10 text-center text-slate-400 light:text-slate-500"
                  >
                    Fetching team statistics across Simulated Matches and Tournaments...
                  </td>
                </tr>
              ) : filteredAndSortedTeams.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeColumns.length + 2}
                    className="py-10 text-center text-slate-400 light:text-slate-500"
                  >
                    No teams match your current filters.
                  </td>
                </tr>
              ) : (
                filteredAndSortedTeams.slice(0, 60).map((entry, idx) => {
                  const m = getScopedMetrics(entry, sourceScope);
                  const isSelected = selectedEntry?.team.id === entry.team.id;
                  return (
                    <tr
                      key={entry.team.id}
                      onClick={() => setSelectedTeamId(entry.team.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#7ADBF0]/10 light:bg-cyan-50/90'
                          : 'hover:bg-white/[0.03] light:hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 pl-3.5 pr-2 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 shrink-0 flex items-center justify-center">
                            <TeamEmblem
                              team={{
                                name: entry.team.name,
                                code: entry.team.code,
                                country: entry.team.country,
                                flag: entry.team.flag,
                                crestUrl: entry.team.crestUrl,
                                primaryColor: entry.team.primaryColor,
                                secondaryColor: entry.team.secondaryColor,
                                type: entry.team.team_type === 'country' ? 'national' : 'club',
                                team_type: entry.team.team_type,
                              }}
                              className="w-6 h-6 object-contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-white light:text-slate-900 truncate max-w-[180px]">
                              {entry.team.name}
                            </div>
                            <div className="text-[10px] text-slate-400 light:text-slate-500 truncate max-w-[180px]">
                              {entry.team.code} · {entry.team.league || entry.team.confederation || entry.team.country}
                            </div>
                          </div>
                        </div>
                      </td>
                      {activeColumns.map((col) => (
                        <td
                          key={col.key}
                          className="py-2.5 px-2.5 text-right text-slate-200 light:text-slate-800 whitespace-nowrap"
                        >
                          {col.renderCell(entry, m)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {filteredAndSortedTeams.length > 60 && (
            <div className="px-4 py-2.5 border-t border-white/[0.06] light:border-slate-200 text-[11px] text-slate-400 light:text-slate-600">
              Showing top 60 of {filteredAndSortedTeams.length} teams. Refine search or filters to inspect specific sides.
            </div>
          )}
        </div>
      </section>

      {/* Selected Team Complete Telemetry Breakdown */}
      {selectedEntry && selectedMetrics && (
        <section className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 sm:p-6 space-y-6">
          {/* Team Identity Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.08] light:border-slate-200">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#080E18] light:bg-slate-100 border border-white/[0.08] light:border-slate-200 p-1.5 shrink-0 flex items-center justify-center">
                <TeamEmblem
                  team={{
                    name: selectedEntry.team.name,
                    code: selectedEntry.team.code,
                    country: selectedEntry.team.country,
                    flag: selectedEntry.team.flag,
                    crestUrl: selectedEntry.team.crestUrl,
                    primaryColor: selectedEntry.team.primaryColor,
                    secondaryColor: selectedEntry.team.secondaryColor,
                    type: selectedEntry.team.team_type === 'country' ? 'national' : 'club',
                    team_type: selectedEntry.team.team_type,
                  }}
                  className="w-9 h-9 object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl sm:text-3xl text-white light:text-slate-900 uppercase tracking-wide leading-none truncate">
                    {selectedEntry.team.name}
                  </h2>
                  <span className="font-mono text-xs text-[#7ADBF0] light:text-cyan-700 font-bold">
                    OVR {selectedEntry.team.overallRating}
                  </span>
                </div>
                <div className="text-xs text-slate-400 light:text-slate-600 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>{selectedEntry.team.code}</span>
                  <span>·</span>
                  <span>
                    {selectedEntry.team.team_type === 'country' ? 'National Team' : 'Club'}
                  </span>
                  <span>·</span>
                  <span>
                    {selectedEntry.team.league || selectedEntry.team.confederation || selectedEntry.team.country}
                  </span>
                  <span>·</span>
                  <span>Manager: {selectedEntry.team.manager || 'Vacant'}</span>
                </div>
                <div className="text-[11px] font-mono text-slate-400 light:text-slate-500 mt-1 tabular-nums">
                  Combined: {selectedEntry.combined.matchesPlayed} MP · Simulate a Match: {selectedEntry.simulatedMatchCount} MP · Tournaments: {selectedEntry.tournamentMatchCount} MP
                  {selectedEntry.linkedImportedCount > 0
                    ? ` (${selectedEntry.linkedImportedCount} linked)`
                    : ''}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openTeamById(selectedEntry.team.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#080E18] light:bg-slate-100 border border-white/10 light:border-slate-300 hover:border-[#7ADBF0] light:hover:border-cyan-600 text-xs font-semibold text-white light:text-slate-900 cursor-pointer shrink-0 self-start md:self-center"
            >
              <span>Open Team Dossier</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Headline Summary Tiles for Selected Team */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
            {[
              { label: 'Matches', value: selectedMetrics.matchesPlayed },
              {
                label: 'W-D-L',
                value: `${selectedMetrics.wins}-${selectedMetrics.draws}-${selectedMetrics.losses}`,
              },
              { label: 'Win Rate', value: `${selectedMetrics.winRatePct.toFixed(1)}%` },
              { label: 'Goals For', value: selectedMetrics.goalsFor },
              { label: 'Goals Ag', value: selectedMetrics.goalsAgainst },
              {
                label: 'Clean Sheets',
                value: `${selectedMetrics.cleanSheets} (${selectedMetrics.cleanSheetPct.toFixed(0)}%)`,
              },
              { label: 'Avg Poss', value: `${selectedMetrics.avgPossession.toFixed(1)}%` },
              { label: 'Total xG', value: selectedMetrics.xg.toFixed(2) },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 px-3 py-2.5 text-center"
              >
                <span className="block font-mono text-[9px] tracking-[0.16em] text-slate-400 light:text-slate-500 uppercase">
                  {item.label}
                </span>
                <span className="font-display text-xl text-white light:text-slate-900 tabular-nums mt-0.5 block leading-none">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Recent Form & Highlights */}
          {(selectedMetrics.recentForm.length > 0 ||
            selectedMetrics.topScorer ||
            selectedMetrics.biggestWin) && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Recent Form */}
              <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 p-4 space-y-2.5 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 light:text-slate-600">
                    Recent Match Log ({selectedMetrics.recentForm.length})
                  </span>
                  <span className="text-[11px] text-slate-500">Latest first</span>
                </div>
                {selectedMetrics.recentForm.length === 0 ? (
                  <p className="text-xs text-slate-500">No matches in this source.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedMetrics.recentForm.map((rm) => (
                      <div
                        key={`${rm.source}-${rm.matchId}`}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/[0.06] light:border-slate-200 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                              rm.result === 'W'
                                ? 'bg-emerald-500/20 text-emerald-300 light:bg-emerald-100 light:text-emerald-800'
                                : rm.result === 'D'
                                ? 'bg-amber-500/20 text-amber-300 light:bg-amber-100 light:text-amber-800'
                                : 'bg-rose-500/20 text-rose-300 light:bg-rose-100 light:text-rose-800'
                            }`}
                          >
                            {rm.result}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-white light:text-slate-900 truncate">
                              {rm.venue === 'away' ? '@' : rm.venue === 'neutral' ? 'vs (N)' : 'vs'}{' '}
                              {rm.opponentName}
                            </div>
                            <div className="text-[10px] text-slate-400 light:text-slate-500 truncate">
                              {rm.competitionName}
                              {rm.stageLabel ? ` · ${rm.stageLabel}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right font-mono shrink-0 tabular-nums">
                          <div className="font-bold text-white light:text-slate-900">
                            {rm.goalsFor}–{rm.goalsAgainst}
                            {rm.wentToExtraTime ? ' AET' : ''}
                          </div>
                          {rm.penaltySummary && (
                            <div className="text-[10px] text-amber-300 light:text-amber-700">
                              {rm.penaltySummary}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Team Leaders & Extremes */}
              <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 p-4 space-y-2.5 text-xs">
                <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 light:text-slate-600">
                  Team Benchmarks
                </span>
                <div className="space-y-2 divide-y divide-white/[0.06] light:divide-slate-200 tabular-nums">
                  <div className="flex justify-between gap-2 pt-1">
                    <span className="text-slate-400 light:text-slate-600">Biggest Win</span>
                    <span className="font-semibold text-emerald-400 light:text-emerald-700 text-right">
                      {selectedMetrics.biggestWin
                        ? `${selectedMetrics.biggestWin.scoreline} vs ${selectedMetrics.biggestWin.opponentCode}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 pt-2">
                    <span className="text-slate-400 light:text-slate-600">Heaviest Defeat</span>
                    <span className="font-semibold text-rose-400 light:text-rose-700 text-right">
                      {selectedMetrics.heaviestDefeat
                        ? `${selectedMetrics.heaviestDefeat.scoreline} vs ${selectedMetrics.heaviestDefeat.opponentCode}`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 pt-2">
                    <span className="text-slate-400 light:text-slate-600">Top Scorer</span>
                    <span className="font-semibold text-white light:text-slate-900 text-right">
                      {selectedMetrics.topScorer
                        ? `${selectedMetrics.topScorer.shortName} (${selectedMetrics.topScorer.goals}G)`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 pt-2">
                    <span className="text-slate-400 light:text-slate-600">Top Assister</span>
                    <span className="font-semibold text-white light:text-slate-900 text-right">
                      {selectedMetrics.topAssister
                        ? `${selectedMetrics.topAssister.shortName} (${selectedMetrics.topAssister.assists}A)`
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 pt-2">
                    <span className="text-slate-400 light:text-slate-600">Points / Match</span>
                    <span className="font-semibold text-amber-300 light:text-amber-700">
                      {selectedMetrics.pointsPerMatch.toFixed(2)} PPG ({selectedMetrics.points} pts)
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Complete All-Statistics Grid (6 Domains covering every single metric) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* 1. Scoring, Venue & Shootout Splits */}
            <StatSectionCard
              icon={<Flame className="w-4 h-4 text-amber-400 light:text-amber-600" />}
              title="Results, Scoring & Shootouts"
              rows={[
                ['Matches (W / D / L)', `${selectedMetrics.matchesPlayed} (${selectedMetrics.wins}/${selectedMetrics.draws}/${selectedMetrics.losses})`],
                ['Win / Draw / Loss %', `${selectedMetrics.winRatePct}% / ${selectedMetrics.drawRatePct}% / ${selectedMetrics.lossRatePct}%`],
                ['Home Record (P · W-D-L)', `${selectedMetrics.homeMatches} · ${selectedMetrics.homeWins}-${selectedMetrics.homeDraws}-${selectedMetrics.homeLosses}`],
                ['Away Record (P · W-D-L)', `${selectedMetrics.awayMatches} · ${selectedMetrics.awayWins}-${selectedMetrics.awayDraws}-${selectedMetrics.awayLosses}`],
                ['Neutral Venue (P · W-D-L)', `${selectedMetrics.neutralMatches} · ${selectedMetrics.neutralWins}-${selectedMetrics.neutralDraws}-${selectedMetrics.neutralLosses}`],
                ['Goals For / Against (GD)', `${selectedMetrics.goalsFor} / ${selectedMetrics.goalsAgainst} (${formatSigned(selectedMetrics.goalDifference)})`],
                ['Avg Goals For / Against', `${selectedMetrics.avgGoalsFor.toFixed(2)} / ${selectedMetrics.avgGoalsAgainst.toFixed(2)}`],
                ['1st Half Goals (GF : GA)', `${selectedMetrics.halfTimeGoalsFor} : ${selectedMetrics.halfTimeGoalsAgainst}`],
                ['2nd Half Goals (GF : GA)', `${selectedMetrics.secondHalfGoalsFor} : ${selectedMetrics.secondHalfGoalsAgainst}`],
                ['Extra Time (MP · GF : GA)', `${selectedMetrics.extraTimeMatches} · ${selectedMetrics.extraTimeGoalsFor} : ${selectedMetrics.extraTimeGoalsAgainst}`],
                ['Clean Sheets / Failed to Score', `${selectedMetrics.cleanSheets} (${selectedMetrics.cleanSheetPct}%) / ${selectedMetrics.failedToScore} (${selectedMetrics.failedToScorePct}%)`],
                ['Own Goals For / Conceded', `${selectedMetrics.ownGoalsFor} / ${selectedMetrics.ownGoalsConceded}`],
                ['Penalty Shootouts (P · W-L)', `${selectedMetrics.penaltyShootoutsPlayed} · ${selectedMetrics.penaltyShootoutWins}-${selectedMetrics.penaltyShootoutLosses}`],
                ['Shootout Kicks (Scored/Taken)', `${selectedMetrics.penaltyShootoutKicksScored}/${selectedMetrics.penaltyShootoutKicksTaken} (F:A ${selectedMetrics.penaltyShootoutGoalsScored}:${selectedMetrics.penaltyShootoutGoalsConceded})`],
              ]}
            />

            {/* 2. Expected Goals & Shooting */}
            <StatSectionCard
              icon={<Crosshair className="w-4 h-4 text-emerald-400 light:text-emerald-700" />}
              title="Attacking, Shooting & xG"
              rows={[
                ['Expected Goals (xG / Match)', `${selectedMetrics.xg.toFixed(2)} (${selectedMetrics.xgPerMatch.toFixed(2)}/M)`],
                ['xG vs Goals (Finishing)', formatSigned(selectedMetrics.xgDifference, 2)],
                ['xG Conceded (xGA / Match)', `${selectedMetrics.xgAgainst.toFixed(2)} (${selectedMetrics.xgAgainstPerMatch.toFixed(2)}/M)`],
                ['Net xG (xG − xGA)', formatSigned(selectedMetrics.netXg, 2)],
                ['xGOT (On Target)', `${selectedMetrics.xgot.toFixed(2)} (${selectedMetrics.xgotPerMatch.toFixed(2)}/M)`],
                ['Open-Play xG / Set-Piece xG', `${selectedMetrics.openPlayXg.toFixed(2)} / ${selectedMetrics.setPieceXg.toFixed(2)}`],
                ['Total Shots / Per Match', `${selectedMetrics.shots} (${selectedMetrics.shotsPerMatch.toFixed(1)}/M)`],
                ['Shots on Target / Accuracy', `${selectedMetrics.shotsOnTarget} (${selectedMetrics.shotAccuracyPct.toFixed(1)}%)`],
                ['Shot Conversion %', `${selectedMetrics.shotConversionPct.toFixed(1)}%`],
                ['Big Chances (Created / Missed)', `${selectedMetrics.bigChances} / ${selectedMetrics.bigChancesMissed} (${selectedMetrics.bigChanceConversionPct.toFixed(0)}% conv)`],
                ['Touches in Opp. Box', `${selectedMetrics.touchesInBox} (${selectedMetrics.touchesInBoxPerMatch.toFixed(1)}/M)`],
                ['Corners Won / Offsides', `${selectedMetrics.corners} (${selectedMetrics.cornersPerMatch.toFixed(1)}/M) · ${selectedMetrics.offsides} off`],
                ['In-Match Penalties (Sc / Ms)', `${selectedMetrics.penaltiesAwardedScored} / ${selectedMetrics.penaltiesMissed}`],
                ['Shots Faced (Total / SoT)', `${selectedMetrics.shotsConceded} / ${selectedMetrics.shotsOnTargetConceded}`],
              ]}
            />

            {/* 3. Possession, Passing, Zones & Build-Up */}
            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
                <h3 className="font-bold text-sm text-white light:text-slate-900">
                  Possession, Channels & Build-Up
                </h3>
              </div>
              <div className="divide-y divide-white/[0.05] light:divide-slate-200 text-xs tabular-nums">
                {[
                  ['Average Possession', `${selectedMetrics.avgPossession.toFixed(1)}%`],
                  ['Passes Completed / Attempted', `${selectedMetrics.passesCompleted.toLocaleString()} / ${selectedMetrics.passesAttempted.toLocaleString()}`],
                  ['Passes Completed / Match', `${selectedMetrics.passesCompletedPerMatch.toFixed(1)} (${selectedMetrics.passesAttemptedPerMatch.toFixed(1)} att)`],
                  ['Pass Accuracy', `${selectedMetrics.passAccuracyPct.toFixed(1)}%`],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between gap-2 py-1.5">
                    <span className="text-slate-400 light:text-slate-600">{label}</span>
                    <span className="font-semibold text-white light:text-slate-900">{val}</span>
                  </div>
                ))}
              </div>

              {/* Attacking Channels Bar */}
              <div className="pt-2 border-t border-white/[0.06] light:border-slate-200 space-y-2">
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                  Attacking Zones (Left · Central · Right)
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs tabular-nums">
                  {[
                    ['Left', selectedMetrics.attackingZones.left],
                    ['Central', selectedMetrics.attackingZones.central],
                    ['Right', selectedMetrics.attackingZones.right],
                  ].map(([zLabel, zVal]) => (
                    <div
                      key={String(zLabel)}
                      className="rounded-lg bg-[#0C131F] light:bg-white border border-white/[0.06] light:border-slate-200 py-1.5 px-2"
                    >
                      <span className="block text-[10px] text-slate-400 light:text-slate-500">
                        {zLabel}
                      </span>
                      <span className="font-bold text-white light:text-slate-900">
                        {Number(zVal).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Build-Up Methods */}
              <div className="pt-2 border-t border-white/[0.06] light:border-slate-200 space-y-1.5">
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                  How Attacks Were Built
                </div>
                {[
                  ['Patient possession', selectedMetrics.buildMethods.patient],
                  ['Through balls', selectedMetrics.buildMethods.throughBall],
                  ['Crosses & set pieces', selectedMetrics.buildMethods.crossSetPiece],
                  ['Counter-attacks', selectedMetrics.buildMethods.counter],
                ].map(([label, pct]) => (
                  <div key={String(label)} className="grid grid-cols-[125px_1fr_42px] items-center gap-2 text-[11px] tabular-nums">
                    <span className="text-slate-400 light:text-slate-600 truncate">{label}</span>
                    <div className="h-1.5 rounded-full bg-white/10 light:bg-slate-200 overflow-hidden">
                      <div
                        className="h-full bg-[#7ADBF0] light:bg-cyan-600"
                        style={{ width: `${Math.min(100, Math.max(0, Number(pct)))}%` }}
                      />
                    </div>
                    <span className="text-right font-mono font-semibold text-white light:text-slate-900">
                      {Number(pct).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Defence & Goalkeeping */}
            <StatSectionCard
              icon={<ShieldCheck className="w-4 h-4 text-sky-400 light:text-sky-700" />}
              title="Defence & Goalkeeping"
              rows={[
                ['Tackles Won / Attempted', `${selectedMetrics.tacklesWon} / ${selectedMetrics.tacklesTotal} (${selectedMetrics.tackleSuccessPct.toFixed(1)}%)`],
                ['Tackles per Match', selectedMetrics.tacklesPerMatch.toFixed(1)],
                ['Duels Won / Total', `${selectedMetrics.duelsWon} / ${selectedMetrics.duelsTotal} (${selectedMetrics.duelWinPct.toFixed(1)}%)`],
                ['Interceptions / Per Match', `${selectedMetrics.interceptions} (${selectedMetrics.interceptionsPerMatch.toFixed(1)}/M)`],
                ['Clearances / Per Match', `${selectedMetrics.clearances} (${selectedMetrics.clearancesPerMatch.toFixed(1)}/M)`],
                ['Goalkeeper Saves / Per Match', `${selectedMetrics.saves} (${selectedMetrics.savesPerMatch.toFixed(1)}/M)`],
                ['Goalkeeper Save %', `${selectedMetrics.savePct.toFixed(1)}%`],
                ['Clean Sheets / Rate', `${selectedMetrics.cleanSheets} (${selectedMetrics.cleanSheetPct.toFixed(1)}%)`],
              ]}
            />

            {/* 5. Physical & Discipline */}
            <StatSectionCard
              icon={<Activity className="w-4 h-4 text-rose-400 light:text-rose-600" />}
              title="Physical & Discipline"
              rows={[
                ['Running Distance (Total / Avg)', `${selectedMetrics.runningDistanceKm.toFixed(1)} km (${selectedMetrics.avgRunningDistanceKm.toFixed(1)}/M)`],
                ['Sprinting Distance (Total / Avg)', `${selectedMetrics.sprintingDistanceKm.toFixed(1)} km (${selectedMetrics.avgSprintingDistanceKm.toFixed(1)}/M)`],
                ['Sprints (Total / Per Match)', `${selectedMetrics.sprints.toLocaleString()} (${selectedMetrics.avgSprintsPerMatch.toFixed(1)}/M)`],
                ['Fouls Committed / Per Match', `${selectedMetrics.fouls} (${selectedMetrics.foulsPerMatch.toFixed(1)}/M)`],
                ['Yellow Cards / Per Match', `${selectedMetrics.yellowCards} (${selectedMetrics.yellowCardsPerMatch.toFixed(2)}/M)`],
                ['Red Cards', selectedMetrics.redCards],
                ['Substitutions Used', selectedMetrics.substitutionsUsed],
                ['Injuries Suffered', selectedMetrics.injuriesSuffered],
              ]}
            />

            {/* 6. Tournament Honours & Squad Rating */}
            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-400 light:text-amber-600" />
                <h3 className="font-bold text-sm text-white light:text-slate-900">
                  Tournaments & Awards
                </h3>
              </div>
              <div className="divide-y divide-white/[0.05] light:divide-slate-200 text-xs tabular-nums">
                {[
                  ['Tournaments Entered', selectedMetrics.tournamentsEntered],
                  ['Tournament Titles Won', selectedMetrics.tournamentTitlesWon],
                  ['Runner-Up / 3rd Place', `${selectedMetrics.tournamentRunnerUps} / ${selectedMetrics.tournamentThirdPlaces}`],
                  ['MOTM Awards', selectedMetrics.motmAwards],
                  ['Average Player Match Rating', selectedMetrics.avgMatchRating > 0 ? selectedMetrics.avgMatchRating.toFixed(2) : '—'],
                  ['Club Trophy Cabinet Total', selectedEntry.team.trophiesCount],
                ].map(([label, val]) => (
                  <div key={String(label)} className="flex justify-between gap-2 py-1.5">
                    <span className="text-slate-400 light:text-slate-600">{label}</span>
                    <span className="font-semibold text-white light:text-slate-900">{val}</span>
                  </div>
                ))}
              </div>

              {selectedEntry.tournamentsList.length > 0 && (
                <div className="pt-2 border-t border-white/[0.06] light:border-slate-200 space-y-2">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                    Tournament History ({selectedEntry.tournamentsList.length})
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                    {selectedEntry.tournamentsList.map((tourn) => (
                      <div
                        key={tourn.tournamentId}
                        className="rounded-lg bg-[#0C131F] light:bg-white border border-white/[0.06] light:border-slate-200 px-3 py-2 text-xs flex items-center justify-between gap-2 tabular-nums"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-white light:text-slate-900 truncate">
                            {tourn.tournamentName} ({tourn.season})
                          </div>
                          <div className="text-[10px] text-slate-400 light:text-slate-500">
                            {tourn.stageReached} · {tourn.matchesPlayed} MP ({tourn.wins}-{tourn.draws}-{tourn.losses}) · {tourn.goalsFor}:{tourn.goalsAgainst} · {tourn.cleanSheets} CS
                          </div>
                        </div>
                        <span
                          className={`font-mono text-[10px] font-bold uppercase shrink-0 ${
                            tourn.placement === 'champion'
                              ? 'text-amber-300 light:text-amber-700'
                              : tourn.placement === 'runner-up'
                              ? 'text-slate-200 light:text-slate-700'
                              : tourn.placement === 'active'
                              ? 'text-[#7ADBF0] light:text-cyan-700'
                              : 'text-slate-400 light:text-slate-500'
                          }`}
                        >
                          {tourn.placement === 'champion'
                            ? 'CHAMPION'
                            : tourn.placement.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

const StatSectionCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  rows: Array<[string, string | number]>;
}> = ({ icon, title, rows }) => (
  <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 p-4 space-y-3">
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="font-bold text-sm text-white light:text-slate-900">{title}</h3>
    </div>
    <div className="divide-y divide-white/[0.05] light:divide-slate-200 text-xs tabular-nums">
      {rows.map(([label, val]) => (
        <div key={label} className="flex justify-between gap-2 py-1.5">
          <span className="text-slate-400 light:text-slate-600">{label}</span>
          <span className="font-semibold text-white light:text-slate-900 text-right">{val}</span>
        </div>
      ))}
    </div>
  </div>
);
