import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Crown,
  ExternalLink,
  Eye,
  EyeOff,
  FastForward,
  GitBranch,
  HeartPulse,
  History,
  Import,
  Layers,
  ListOrdered,
  Lock,
  MonitorPlay,
  Play,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import type {
  CompetitionFixtureMatch,
  CompetitionMakerTournament,
  TournamentGroup,
} from '../../../types/competitionMaker';
import type { Manager } from '../../../types/manager';
import type { SimCompetitionPreset } from '../../../types/simulation';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import { useAuth } from '../../../context/AuthContext';
import {
  COMPETITION_PRESETS,
  computeCompetitionPlayerLeaderboard,
  isStageLocked,
} from '../../../utils/competitionEngine';
import { TeamEmblem } from '../TeamEmblem';
import { TrophyArtwork } from './TrophyArtwork';
import { MatchTelemetryModal } from './MatchTelemetryModal';
import { KnockoutBracketView } from './KnockoutBracketView';
import { WinnerCelebrationModal, WinnerCoronationBanner } from './WinnerCelebrationModal';

type HubTabId =
  | 'overview'
  | 'fixtures'
  | 'tables'
  | 'teams'
  | 'draw'
  | 'stats'
  | 'bracket'
  | 'qualified'
  | 'history'
  | 'trophy';

const HUB_TABS: Array<{ id: HubTabId; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'overview', label: 'DASHBOARD', icon: Layers },
  { id: 'fixtures', label: 'FIXTURES', icon: Calendar },
  { id: 'tables', label: 'TABLES', icon: ListOrdered },
  { id: 'teams', label: 'TEAMS', icon: Users },
  { id: 'draw', label: 'DRAW', icon: Shuffle },
  { id: 'stats', label: 'STATS', icon: BarChart3 },
  { id: 'bracket', label: 'BRACKET', icon: GitBranch },
  { id: 'qualified', label: 'QUALIFIED', icon: CheckCircle2 },
  { id: 'history', label: 'HISTORY', icon: History },
  { id: 'trophy', label: 'TROPHY', icon: Trophy },
];

interface CompetitionHubPageProps {
  tournament: CompetitionMakerTournament;
  onBackToDirectory: () => void;
  onOpenHallOfFame: () => void;
}

function mapPresetToSimPreset(presetId: CompetitionMakerTournament['presetId']): SimCompetitionPreset {
  if (presetId === 'ucl-36') return 'champions-league';
  if (presetId === 'world-cup-2026' || presetId === 'euros-24' || presetId === 'continental-championship') {
    return 'international';
  }
  if (presetId === 'domestic-league') return 'premier-league';
  if (presetId === 'domestic-cup') return 'national-cup';
  return 'custom';
}

export const CompetitionHubPage: React.FC<CompetitionHubPageProps> = ({
  tournament,
  onBackToDirectory,
  onOpenHallOfFame,
}) => {
  const {
    teams,
    simulationMatches,
    simulateCompetitionAction,
    importMatchIntoCompetition,
    drawCompetitionStage,
    resetCompetitionAction,
    deleteCompetitionMaker,
    launchTournamentMatchInSimulator,
    openTeamById,
    getManagerForTeam,
  } = useMatchCentre();
  const { isAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<HubTabId>('overview');
  const [selectedStageOrder, setSelectedStageOrder] = useState<number>(
    tournament.currentStageOrder || 0
  );
  const [hidePlayed, setHidePlayed] = useState<boolean>(false);
  const [fixtureGroupFilter, setFixtureGroupFilter] = useState<string>('all');
  const [fixtureRoundFilter, setFixtureRoundFilter] = useState<string>('all');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [telemetryFixture, setTelemetryFixture] = useState<CompetitionFixtureMatch | null>(null);
  const [importTargetFixture, setImportTargetFixture] = useState<CompetitionFixtureMatch | null>(null);
  const [statMetric, setStatMetric] = useState<
    'goals' | 'assists' | 'avgRating' | 'cleanSheets' | 'yellowCards' | 'saves'
  >('goals');
  const [preventSameCountry, setPreventSameCountry] = useState<boolean>(
    tournament.drawOptions?.preventSameCountry ?? true
  );
  const [swapPick, setSwapPick] = useState<{ groupId: string; teamId: string } | null>(null);
  const [winnerModalOpen, setWinnerModalOpen] = useState<boolean>(false);
  const prevChampionTeamIdRef = useRef<string | undefined>(tournament.champion?.teamId);

  // Automatically open Winner Celebration Animation when champion is newly decided
  useEffect(() => {
    const currentChampId = tournament.champion?.teamId;
    if (currentChampId && !prevChampionTeamIdRef.current) {
      setWinnerModalOpen(true);
    }
    prevChampionTeamIdRef.current = currentChampId;
  }, [tournament.champion?.teamId]);

  const teamsMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);
  const managersByTeam = useMemo(() => {
    const map = new Map<string, Manager | null>();
    for (const t of teams) {
      map.set(t.id, getManagerForTeam(t));
    }
    return map;
  }, [teams, getManagerForTeam]);

  const currentStage = useMemo(
    () =>
      tournament.stages.find((s) => s.config.order === selectedStageOrder) ||
      tournament.stages[tournament.currentStageOrder] ||
      tournament.stages[0],
    [tournament, selectedStageOrder]
  );

  const activeUnfinishedStage = useMemo(
    () =>
      tournament.stages.find((s) => s.status !== 'completed') ||
      tournament.stages[tournament.stages.length - 1],
    [tournament]
  );

  useEffect(() => {
    if (isStageLocked(tournament, selectedStageOrder)) {
      setSelectedStageOrder(activeUnfinishedStage?.config.order ?? 0);
    }
  }, [tournament, selectedStageOrder, activeUnfinishedStage]);

  const hasKnockoutToSimulate = useMemo(
    () =>
      tournament.stages.some(
        (s) => s.config.type === 'knockout' && s.status !== 'completed'
      ),
    [tournament]
  );

  const allFixtures = useMemo(
    () => tournament.stages.flatMap((s) => s.fixtures),
    [tournament.stages]
  );
  const completedCount = useMemo(
    () => allFixtures.filter((f) => f.status === 'completed').length,
    [allFixtures]
  );
  const totalGoals = useMemo(
    () =>
      allFixtures.reduce(
        (sum, f) => sum + (f.status === 'completed' ? (f.homeScore ?? 0) + (f.awayScore ?? 0) : 0),
        0
      ),
    [allFixtures]
  );
  const progressPct = allFixtures.length > 0 ? Math.round((completedCount / allFixtures.length) * 100) : 0;
  const goalsPerMatch = completedCount > 0 ? (totalGoals / completedCount).toFixed(2) : '0';

  const nextPendingRoundLabel = useMemo(() => {
    const pending = activeUnfinishedStage?.fixtures.find((f) => f.status !== 'completed');
    return pending?.roundLabel || activeUnfinishedStage?.config.name || 'COMPLETE';
  }, [activeUnfinishedStage]);

  const playerLeaderboard = useMemo(
    () => computeCompetitionPlayerLeaderboard(tournament, teamsMap),
    [tournament, teamsMap]
  );

  const activeInjuries = useMemo(
    () => Object.values(tournament.injuryTracker || {}),
    [tournament.injuryTracker]
  );

  const resolveTeamDisplay = (teamId: string | null) => {
    if (!teamId) return null;
    const live = teamsMap.get(teamId);
    const snap = tournament.teamSnapshots?.[teamId];
    return {
      id: teamId,
      name: live?.name || snap?.name || teamId,
      shortName: live?.shortName || snap?.shortName || snap?.code || teamId,
      code: live?.code || snap?.code || teamId.slice(0, 3).toUpperCase(),
      crestUrl: live?.crestUrl || snap?.crestUrl || '',
      primaryColor: live?.primaryColor || snap?.primaryColor || '#38BDF8',
      country: live?.country || snap?.country || '',
      overallRating: live?.overallRating ?? snap?.overallRating ?? 75,
      managerName:
        managersByTeam.get(teamId)?.name ||
        live?.manager_name ||
        live?.manager ||
        snap?.managerName ||
        null,
      teamObj: live,
    };
  };

  // Compute aggregate competition record per team for TEAMS tab cards
  const teamTournamentStats = useMemo(() => {
    const map = new Map<
      string,
      { played: number; won: number; drawn: number; lost: number; points: number; lastResult?: string }
    >();
    for (const id of tournament.teamIds) {
      map.set(id, { played: 0, won: 0, drawn: 0, lost: 0, points: 0 });
    }
    for (const f of allFixtures) {
      if (f.status !== 'completed' || !f.homeTeamId || !f.awayTeamId) continue;
      const hs = f.homeScore ?? 0;
      const as = f.awayScore ?? 0;
      const hRec = map.get(f.homeTeamId);
      const aRec = map.get(f.awayTeamId);
      if (hRec) {
        hRec.played += 1;
        if (hs > as) {
          hRec.won += 1;
          hRec.points += 3;
          hRec.lastResult = `W ${hs}-${as}`;
        } else if (hs === as) {
          hRec.drawn += 1;
          hRec.points += 1;
          hRec.lastResult = `D ${hs}-${as}`;
        } else {
          hRec.lost += 1;
          hRec.lastResult = `L ${hs}-${as}`;
        }
      }
      if (aRec) {
        aRec.played += 1;
        if (as > hs) {
          aRec.won += 1;
          aRec.points += 3;
          aRec.lastResult = `W ${as}-${hs}`;
        } else if (as === hs) {
          aRec.drawn += 1;
          aRec.points += 1;
          aRec.lastResult = `D ${as}-${hs}`;
        } else {
          aRec.lost += 1;
          aRec.lastResult = `L ${as}-${hs}`;
        }
      }
    }
    return map;
  }, [tournament.teamIds, allFixtures]);

  // Launch fixture into Match Creator Simulator ("Prepare" opens Dugout, "Live" starts live match)
  const handleLaunchFixtureInSimulator = (f: CompetitionFixtureMatch, autoStartLive: boolean) => {
    if (!f.homeTeamId || !f.awayTeamId) return;
    if (isStageLocked(tournament, f.stageOrder)) return;
    const stageRuntime = tournament.stages.find((s) => s.config.order === f.stageOrder);
    let firstLegHomeGoals: number | undefined;
    let firstLegAwayGoals: number | undefined;
    if (f.isTwoLegged && f.legNumber === 2 && f.tieId && stageRuntime) {
      const leg1 = stageRuntime.fixtures.find(
        (m) => m.tieId === f.tieId && m.legNumber === 1 && m.status === 'completed'
      );
      if (leg1) {
        // Leg 1 homeTeam was away in leg 2; leg 1 awayTeam is home in leg 2
        firstLegHomeGoals = leg1.awayScore ?? 0;
        firstLegAwayGoals = leg1.homeScore ?? 0;
      }
    }

    launchTournamentMatchInSimulator({
      competitionId: tournament.id,
      competitionName: tournament.name,
      stageLabel: `${f.stageName} · ${f.roundLabel}${f.isTwoLegged ? ` (Leg ${f.legNumber})` : ''}`,
      fixtureId: f.id,
      homeTeamId: f.homeTeamId,
      awayTeamId: f.awayTeamId,
      isKnockout: f.isKnockout,
      allowExtraTime: f.isKnockout && stageRuntime?.config.extraTimeEnabled !== false,
      allowPenalties: f.isKnockout && stageRuntime?.config.penaltiesEnabled !== false,
      isTwoLegged: f.isTwoLegged,
      legNumber: f.legNumber,
      firstLegHomeGoals,
      firstLegAwayGoals,
      awayGoalsRule: Boolean(stageRuntime?.config.awayGoalsRule),
      neutralVenue: f.neutralVenue,
      homeAdvantageBoost: tournament.homeAdvantageBoost,
      preset: mapPresetToSimPreset(tournament.presetId),
      autoStartLive,
    });
  };

  // Simulation triggers
  const runBatch = async (
    label: string,
    scope: 'match' | 'matchday' | 'stage' | 'knockout' | 'tournament',
    stageOrder?: number
  ) => {
    const hadChampion = Boolean(tournament.champion?.teamId);
    setBusyAction(label);
    const res = await simulateCompetitionAction(tournament.id, {
      scope,
      stageOrder: stageOrder ?? activeUnfinishedStage?.config.order,
    });
    if (res.ok && res.data) {
      const nextActiveStage =
        res.data.stages.find((s) => s.status !== 'completed') ||
        res.data.stages[res.data.currentStageOrder] ||
        res.data.stages[res.data.stages.length - 1];
      if (nextActiveStage) {
        setSelectedStageOrder(nextActiveStage.config.order);
      }
      if (!hadChampion && res.data.champion?.teamId) {
        prevChampionTeamIdRef.current = res.data.champion.teamId;
        setWinnerModalOpen(true);
      }
    }
    setBusyAction(null);
  };

  const runSingleFixture = async (fixtureId: string) => {
    const hadChampion = Boolean(tournament.champion?.teamId);
    setBusyAction(fixtureId);
    const res = await simulateCompetitionAction(tournament.id, { fixtureId });
    if (res.ok && res.data) {
      const nextActiveStage =
        res.data.stages.find((s) => s.status !== 'completed') ||
        res.data.stages[res.data.currentStageOrder];
      if (nextActiveStage && isStageLocked(res.data, selectedStageOrder)) {
        setSelectedStageOrder(nextActiveStage.config.order);
      }
      if (!hadChampion && res.data.champion?.teamId) {
        prevChampionTeamIdRef.current = res.data.champion.teamId;
        setWinnerModalOpen(true);
      }
    }
    setBusyAction(null);
  };

  const runDraw = async (
    stageOrder: number,
    mode: 'seeded' | 'bracket' | 'random' | 'official',
    customGroups?: TournamentGroup[]
  ) => {
    setBusyAction(`draw-${mode}`);
    await drawCompetitionStage(tournament.id, {
      stageOrder,
      mode,
      customGroups,
      preventSameCountry,
    });
    setBusyAction(null);
  };

  const runReset = async (
    scope: 'fixture' | 'stage' | 'tournament',
    opts?: { fixtureId?: string; stageOrder?: number }
  ) => {
    setBusyAction(`reset-${scope}`);
    await resetCompetitionAction(tournament.id, {
      scope,
      fixtureId: opts?.fixtureId,
      stageOrder: opts?.stageOrder,
    });
    setBusyAction(null);
  };

  const handleDeleteCompetition = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusyAction('delete');
    await deleteCompetitionMaker(tournament.id, true);
    setBusyAction(null);
    setConfirmDelete(false);
    onBackToDirectory();
  };

  const handleGroupTeamSwap = async (groupId: string, teamId: string) => {
    if (!currentStage?.groups || currentStage.fixtures.some((f) => f.status === 'completed')) {
      return;
    }
    if (!swapPick) {
      setSwapPick({ groupId, teamId });
      return;
    }
    if (swapPick.teamId === teamId) {
      setSwapPick(null);
      return;
    }
    const nextGroups = currentStage.groups.map((g) => ({
      ...g,
      teamIds: g.teamIds.map((id) => {
        if (g.id === swapPick.groupId && id === swapPick.teamId) return teamId;
        if (g.id === groupId && id === teamId) return swapPick.teamId;
        return id;
      }),
    }));
    setSwapPick(null);
    await runDraw(currentStage.config.order, 'seeded', nextGroups);
  };

  // Matching existing Match Centre simulations for Import modal
  const compatibleSimMatches = useMemo(() => {
    if (!importTargetFixture || !importTargetFixture.homeTeamId || !importTargetFixture.awayTeamId) {
      return [];
    }
    const h = importTargetFixture.homeTeamId;
    const a = importTargetFixture.awayTeamId;
    return simulationMatches.filter(
      (m) =>
        (m.homeTeamId === h && m.awayTeamId === a) ||
        (m.homeTeamId === a && m.awayTeamId === h)
    );
  }, [importTargetFixture, simulationMatches]);

  // Fixtures rounds breakdown for current stage
  const stageRounds = useMemo(() => {
    const list = currentStage?.fixtures || [];
    const seen = new Map<number, { label: string; total: number; done: number }>();
    for (const f of list) {
      const cur = seen.get(f.roundIndex) || { label: f.roundLabel, total: 0, done: 0 };
      cur.total += 1;
      if (f.status === 'completed') cur.done += 1;
      seen.set(f.roundIndex, cur);
    }
    return Array.from(seen.entries()).sort((a, b) => a[0] - b[0]);
  }, [currentStage]);

  const stageFixtures = useMemo(() => {
    const list = currentStage?.fixtures || [];
    return list.filter((f) => {
      if (hidePlayed && f.status === 'completed') return false;
      if (fixtureGroupFilter !== 'all' && f.groupId !== fixtureGroupFilter) return false;
      if (fixtureRoundFilter !== 'all' && String(f.roundIndex) !== fixtureRoundFilter) return false;
      return true;
    });
  }, [currentStage, hidePlayed, fixtureGroupFilter, fixtureRoundFilter]);

  // Group filtered fixtures by roundIndex so Matchday Header renders cleanly
  const groupedFixturesByRound = useMemo(() => {
    const groups = new Map<number, { label: string; fixtures: CompetitionFixtureMatch[]; totalInRound: number; doneInRound: number }>();
    for (const f of stageFixtures) {
      let g = groups.get(f.roundIndex);
      if (!g) {
        const meta = stageRounds.find(([rIdx]) => rIdx === f.roundIndex)?.[1];
        g = {
          label: f.roundLabel,
          fixtures: [],
          totalInRound: meta?.total || 0,
          doneInRound: meta?.done || 0,
        };
        groups.set(f.roundIndex, g);
      }
      g.fixtures.push(f);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  }, [stageFixtures, stageRounds]);

  const tableStage = useMemo(() => {
    if (
      currentStage &&
      currentStage.config.type !== 'knockout' &&
      !isStageLocked(tournament, currentStage.config.order)
    ) {
      return currentStage;
    }
    return (
      tournament.stages.find(
        (s) => s.config.type !== 'knockout' && !isStageLocked(tournament, s.config.order)
      ) || tournament.stages[0]
    );
  }, [currentStage, tournament]);

  const knockoutStages = useMemo(
    () => tournament.stages.filter((s) => s.config.type === 'knockout'),
    [tournament.stages]
  );

  const isWorldCup = tournament.presetId === 'world-cup-2026';
  const presetInfo = COMPETITION_PRESETS[tournament.presetId] || COMPETITION_PRESETS.custom;

  const sortedStats = useMemo(() => {
    return [...playerLeaderboard]
      .sort((a, b) => {
        if (statMetric === 'avgRating') return b.avgRating - a.avgRating || b.goals - a.goals;
        if (statMetric === 'cleanSheets') return b.cleanSheets - a.cleanSheets || b.saves - a.saves;
        if (statMetric === 'saves') return b.saves - a.saves || b.cleanSheets - a.cleanSheets;
        if (statMetric === 'yellowCards') return b.yellowCards - a.yellowCards || b.redCards - a.redCards;
        if (statMetric === 'assists') return b.assists - a.assists || b.goals - a.goals;
        return b.goals - a.goals || b.assists - a.assists;
      })
      .slice(0, 40);
  }, [playerLeaderboard, statMetric]);

  const renderFixtureCard = (f: CompetitionFixtureMatch) => {
    const h = resolveTeamDisplay(f.homeTeamId);
    const a = resolveTeamDisplay(f.awayTeamId);
    const stageLocked = isStageLocked(tournament, f.stageOrder);
    return (
      <div
        key={f.id}
        className="rounded-xl border border-white/10 light:border-slate-200 bg-[#070D17] light:bg-white p-4 flex flex-col justify-between gap-3.5"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-2">
          <span
            className={`px-2 py-0.5 rounded-full border font-mono text-[9px] uppercase tracking-wider font-semibold ${
              f.status === 'completed'
                ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300 light:bg-emerald-50 light:text-emerald-700'
                : stageLocked
                ? 'border-white/15 bg-white/[0.04] text-slate-400 light:bg-slate-100 light:text-slate-600'
                : 'border-[#7ADBF0]/40 bg-[#7ADBF0]/10 text-[#7ADBF0] light:bg-cyan-50 light:text-cyan-700'
            }`}
          >
            {f.status === 'completed'
              ? f.penaltyShootout
                ? 'PENS'
                : f.wentToExtraTime
                ? 'AET'
                : 'FULL TIME'
              : stageLocked
              ? 'LOCKED'
              : 'UPCOMING'}
          </span>

          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
            {f.groupName ? `${f.groupName} · ` : ''}
            {f.roundLabel.toUpperCase()}
            {f.isTwoLegged ? ` · LEG ${f.legNumber}` : ''}
          </span>
        </div>

        {/* Center Matchup Line */}
        <div className="flex items-center justify-center gap-3 py-1">
          <div className="flex items-center justify-end gap-2.5 flex-1 min-w-0 text-right">
            <span className="text-xs sm:text-sm font-bold text-white light:text-slate-900 truncate">
              {h?.shortName || f.homePlaceholder || 'TBD'}
            </span>
            {h && (
              <TeamEmblem
                team={h.teamObj}
                crestUrl={h.crestUrl}
                code={h.code}
                className="w-7 h-7 shrink-0"
              />
            )}
          </div>

          <div
            className={`w-10 h-8 rounded-lg border flex items-center justify-center font-mono text-xs font-bold tabular-nums shrink-0 ${
              f.status === 'completed'
                ? 'border-white/20 bg-[#050A12] light:bg-slate-100 text-white light:text-slate-950'
                : 'border-white/10 bg-[#04070D] light:bg-slate-50 text-slate-400 light:text-slate-600'
            }`}
          >
            {f.status === 'completed' ? `${f.homeScore}–${f.awayScore}` : 'V'}
          </div>

          <div className="flex items-center justify-start gap-2.5 flex-1 min-w-0 text-left">
            {a && (
              <TeamEmblem
                team={a.teamObj}
                crestUrl={a.crestUrl}
                code={a.code}
                className="w-7 h-7 shrink-0"
              />
            )}
            <span className="text-xs sm:text-sm font-bold text-white light:text-slate-900 truncate">
              {a?.shortName || f.awayPlaceholder || 'TBD'}
            </span>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/[0.06] light:border-slate-200">
          <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500 light:text-slate-600">
            {f.status === 'completed'
              ? f.penaltyShootout
                ? f.penaltyShootout.summary
                : f.importedMatchId
                ? 'IMPORTED RESULT'
                : 'MATCH COMPLETED'
              : stageLocked
              ? 'PREVIOUS STAGE ACTIVE'
              : 'NOT PLAYED YET'}
          </span>

          {f.status === 'completed' ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTelemetryFixture(f)}
                className="px-2.5 py-1 rounded-lg border border-white/15 light:border-slate-300 bg-white/[0.03] light:bg-slate-50 text-[11px] font-semibold text-white light:text-slate-900 hover:border-[#7ADBF0]/50 cursor-pointer"
              >
                Report
              </button>
              {isAdmin && (
                <button
                  type="button"
                  disabled={Boolean(busyAction)}
                  onClick={() => runReset('fixture', { fixtureId: f.id })}
                  className="px-2 py-1 rounded-lg border border-rose-500/30 text-rose-300 light:text-rose-700 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          ) : stageLocked ? (
            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-500">
              <Lock className="w-3 h-3" />
              <span>Locked</span>
            </span>
          ) : f.homeTeamId && f.awayTeamId ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleLaunchFixtureInSimulator(f, false)}
                className="px-2.5 py-1 rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 text-[11px] font-semibold text-slate-200 light:text-slate-800 hover:border-[#7ADBF0]/50 cursor-pointer inline-flex items-center gap-1"
                title="Open tactical Dugout with both teams pre-loaded"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Prepare</span>
              </button>
              <button
                type="button"
                onClick={() => handleLaunchFixtureInSimulator(f, true)}
                className="px-2.5 py-1 rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 text-[11px] font-semibold text-slate-200 light:text-slate-800 hover:border-emerald-400/50 cursor-pointer inline-flex items-center gap-1"
                title="Launch Match Creator in Live Playback mode"
              >
                <MonitorPlay className="w-3 h-3" />
                <span>Live</span>
              </button>
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() => runSingleFixture(f.id)}
                className="px-3 py-1 rounded-lg bg-[#7ADBF0] text-slate-950 text-[11px] font-bold hover:bg-[#9BE6F6] disabled:opacity-40 cursor-pointer inline-flex items-center gap-1"
              >
                <Play className="w-3 h-3" />
                <span>{busyAction === f.id ? '...' : 'Quick sim'}</span>
              </button>
              <button
                type="button"
                onClick={() => setImportTargetFixture(f)}
                className="p-1.5 rounded-lg border border-white/10 light:border-slate-300 text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
                title="Import existing simulated match"
              >
                <Import className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span className="font-mono text-[10px] text-slate-500">Awaiting draw</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* ================================================================== */}
      {/* HERO COMPETITION BANNER (Obsidian-Navy + Progress + Controls)      */}
      {/* ================================================================== */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 light:border-slate-200 bg-gradient-to-br from-[#070E1D] via-[#070E1A] to-[#12121F] light:from-slate-900 light:to-slate-800 shadow-2xl">
        {/* Top Spectrum Gradient Line */}
        <div className="h-1 w-full bg-gradient-to-r from-[#7ADBF0] via-fuchsia-500 to-amber-400" />

        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
            {/* Left Info Column */}
            <div className="space-y-2.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onBackToDirectory}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-white cursor-pointer mr-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Tournaments</span>
                </button>
                <span className="px-2.5 py-0.5 rounded-full border border-[#7ADBF0]/40 bg-[#7ADBF0]/10 font-mono text-[10px] uppercase tracking-wider text-[#7ADBF0] font-semibold">
                  {presetInfo.name.toUpperCase()}
                </span>
                <span className="px-2.5 py-0.5 rounded-full border border-sky-400/35 bg-sky-500/10 font-mono text-[10px] uppercase tracking-wider text-sky-300 font-semibold">
                  {activeUnfinishedStage?.config.name.toUpperCase() || 'ACTIVE'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full border border-white/15 bg-white/[0.04] font-mono text-[10px] uppercase tracking-wider text-slate-300 tabular-nums">
                  {tournament.season}
                </span>
              </div>

              <div className="flex items-center gap-3.5">
                {tournament.customLogoUrl && (
                  <img
                    src={tournament.customLogoUrl}
                    alt={`${tournament.name} logo`}
                    className="w-12 h-12 rounded-xl object-contain border border-white/15 bg-[#040811] p-1.5 shrink-0"
                  />
                )}
                <h1 className="font-display text-3xl sm:text-5xl tracking-wide uppercase text-white truncate">
                  {tournament.name}
                </h1>
              </div>

              <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 tabular-nums">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-slate-400" />
                  <span>{tournament.teamIds.length} teams</span>
                </span>
                <span className="text-slate-600">·</span>
                <span>
                  {completedCount} of {allFixtures.length} matches
                </span>
                <span className="text-slate-600">·</span>
                <span>{totalGoals} goals</span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-slate-300">
                <span className="px-2.5 py-1 rounded-full border border-white/10 bg-[#050A12]">
                  {tournament.stages.some((s) => s.config.twoLegged)
                    ? 'TWO-LEGGED KNOCKOUT'
                    : 'SINGLE MATCH TIES'}
                </span>
                <span className="px-2.5 py-1 rounded-full border border-white/10 bg-[#050A12]">
                  EXTRA TIME · PENALTIES
                </span>
                <span className="px-2.5 py-1 rounded-full border border-white/10 bg-[#050A12]">
                  {tournament.homeAdvantageBoost > 0 ? 'HOME ADVANTAGE' : 'NEUTRAL VENUES'}
                </span>
                {tournament.champion && (
                  <span className="px-2.5 py-1 rounded-full border border-amber-400/50 bg-amber-500/15 text-amber-300 font-bold">
                    CHAMPION: {tournament.champion.teamName.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Right KPI Cards & Sim Action Buttons */}
            <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl border border-white/10 bg-[#050A12] px-4 py-2 min-w-[100px]">
                  <div className="font-display text-2xl text-emerald-400 tabular-nums leading-none">
                    {progressPct}%
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400 mt-1">
                    PROGRESS
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#050A12] px-4 py-2 min-w-[100px]">
                  <div className="font-display text-2xl text-white tabular-nums leading-none">
                    {goalsPerMatch}
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400 mt-1">
                    PER MATCH
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {tournament.status !== 'completed' && (
                  <>
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() => runBatch('stage', 'stage')}
                      className="px-3.5 py-2 rounded-xl bg-[#7ADBF0] text-slate-950 text-xs font-bold hover:bg-[#9BE6F6] disabled:opacity-40 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      <span>
                        {busyAction === 'stage'
                          ? 'Simulating...'
                          : `Simulate ${activeUnfinishedStage?.config.name.toLowerCase()}`}
                      </span>
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() => runBatch('matchday', 'matchday')}
                      className="px-3 py-2 rounded-xl border border-white/15 bg-[#050A12] text-xs font-semibold text-white hover:border-[#7ADBF0]/50 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <FastForward className="w-3.5 h-3.5 text-slate-300" />
                      <span>{busyAction === 'matchday' ? '...' : 'Matchday'}</span>
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() => runBatch('next-match', 'match')}
                      className="px-3 py-2 rounded-xl border border-white/15 bg-[#050A12] text-xs font-semibold text-white hover:border-[#7ADBF0]/50 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 text-slate-300" />
                      <span>{busyAction === 'next-match' ? '...' : 'Next match'}</span>
                    </button>

                    {hasKnockoutToSimulate && (
                      <button
                        type="button"
                        disabled={Boolean(busyAction)}
                        onClick={() => runBatch('knockout', 'knockout')}
                        className="px-3 py-2 rounded-xl border border-amber-400/40 bg-amber-500/10 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 disabled:opacity-40 cursor-pointer"
                      >
                        {busyAction === 'knockout' ? '...' : 'Knockout'}
                      </button>
                    )}

                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() => runBatch('tournament', 'tournament')}
                      className="px-3 py-2 rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40 cursor-pointer"
                    >
                      {busyAction === 'tournament' ? 'Finishing...' : 'Sim all'}
                    </button>
                  </>
                )}

                {tournament.champion && (
                  <button
                    type="button"
                    onClick={() => setWinnerModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-slate-950 text-xs font-extrabold hover:brightness-110 cursor-pointer inline-flex items-center gap-1.5 shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Winner Animation</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={() => runReset('tournament')}
                    className="p-2 rounded-xl border border-white/15 bg-[#050A12] text-slate-300 hover:text-amber-300 hover:border-amber-400/50 cursor-pointer"
                    title="Admin Reset Tournament"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}

                {confirmDelete ? (
                  <div className="inline-flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={handleDeleteCompetition}
                      className="px-3 py-2 rounded-xl border border-rose-400 bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 cursor-pointer transition-colors text-[11px] font-bold"
                      title="Click to permanently delete competition"
                    >
                      {busyAction === 'delete' ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="px-2.5 py-2 rounded-xl border border-white/15 bg-[#050A12] text-slate-300 hover:text-white cursor-pointer text-[11px] font-semibold"
                      title="Cancel delete"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={handleDeleteCompetition}
                    className="p-2 rounded-xl border border-white/15 bg-[#050A12] text-slate-300 hover:text-rose-400 hover:border-rose-400/50 cursor-pointer transition-colors"
                    title="Delete competition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Full-Width Progress Footer Track */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate-400 tabular-nums">
              <span>
                {tournament.status === 'completed'
                  ? 'TOURNAMENT COMPLETED'
                  : `NEXT: ${nextPendingRoundLabel.toUpperCase()}`}
              </span>
              <span>
                {completedCount}/{allFixtures.length}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#7ADBF0] to-emerald-400 transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* COMPETITION STRUCTURE TIMELINE BAR                                 */}
      {/* ================================================================== */}
      <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-600 tabular-nums">
          <span>COMPETITION STRUCTURE</span>
          <span>
            STAGE {(currentStage?.config.order ?? 0) + 1} OF {tournament.stages.length}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {tournament.stages.map((s) => {
            const done = s.fixtures.filter((f) => f.status === 'completed').length;
            const tot = s.fixtures.length;
            const pct = tot > 0 ? Math.round((done / tot) * 100) : 0;
            const locked = isStageLocked(tournament, s.config.order);
            const selected = !locked && currentStage?.config.order === s.config.order;
            const prevStageName =
              tournament.stages.find((p) => p.config.order === s.config.order - 1)?.config.name ||
              'previous stage';
            return (
              <button
                key={s.config.id}
                type="button"
                disabled={locked}
                onClick={() => {
                  if (locked) return;
                  setSelectedStageOrder(s.config.order);
                  setFixtureGroupFilter('all');
                  setFixtureRoundFilter('all');
                }}
                title={
                  locked
                    ? `Locked until ${prevStageName} is fully cleared and completed`
                    : s.config.name
                }
                className={`text-left rounded-xl border p-3.5 space-y-2.5 transition-all ${
                  locked
                    ? 'border-white/[0.06] light:border-slate-200 bg-[#040810] light:bg-slate-100/70 opacity-60 cursor-not-allowed'
                    : selected
                    ? 'border-emerald-400/70 bg-gradient-to-b from-emerald-500/[0.08] to-[#050A12] light:from-emerald-50 light:to-white cursor-pointer'
                    : 'border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 hover:border-white/25 cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {locked ? (
                      <Lock className="w-3 h-3 shrink-0 text-slate-500" />
                    ) : s.status === 'completed' ? (
                      <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-400" />
                    ) : (
                      <Play
                        className={`w-3 h-3 shrink-0 ${
                          selected ? 'text-emerald-400' : 'text-slate-400'
                        }`}
                      />
                    )}
                    <span className="text-xs font-bold text-white light:text-slate-900 truncate">
                      {s.config.name}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[9px] uppercase font-semibold shrink-0 ${
                      locked
                        ? 'bg-white/[0.05] text-slate-400 border border-white/10 light:bg-slate-200 light:text-slate-600'
                        : s.config.type === 'league'
                        ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/40 light:bg-emerald-100 light:text-emerald-800'
                        : s.config.type === 'group'
                        ? 'bg-sky-500/15 text-sky-300 border border-sky-400/40 light:bg-sky-100 light:text-sky-800'
                        : 'bg-amber-500/15 text-amber-300 border border-amber-400/40 light:bg-amber-100 light:text-amber-800'
                    }`}
                  >
                    {locked ? 'LOCKED' : s.config.type.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-white/[0.06] light:bg-slate-200 overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 tabular-nums shrink-0">
                    {locked ? 'LOCKED' : `${done}/${tot}`}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ================================================================== */}
      {/* ENCLOSED ROUNDED TAB NAVIGATION BAR                                */}
      {/* ================================================================== */}
      <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {HUB_TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-mono text-[10.5px] tracking-wider font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                active
                  ? isWorldCup
                    ? 'border border-amber-400/60 bg-amber-500/15 text-amber-300 light:bg-amber-50 light:border-amber-500 light:text-amber-800'
                    : 'border border-[#7ADBF0]/60 bg-[#7ADBF0]/15 text-[#7ADBF0] light:bg-cyan-50 light:border-cyan-600 light:text-cyan-800'
                  : 'border border-transparent text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================================================================== */}
      {/* TAB 1: DASHBOARD / OVERVIEW                                        */}
      {/* ================================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Animated Winner Coronation Stage when Champion is Decided */}
          {tournament.champion && (
            <WinnerCoronationBanner
              tournament={tournament}
              teamsMap={teamsMap}
              onPlayFullAnimation={() => setWinnerModalOpen(true)}
              onOpenTeamCabinet={(teamId) => openTeamById(teamId, 5)}
            />
          )}

          {/* Featured TOURNAMENT TROPHY Showcase Card */}
          <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-5 min-w-0">
              <div className="w-24 h-24 rounded-2xl border border-amber-400/30 bg-[#050A12] flex items-center justify-center p-2 shrink-0">
                <TrophyArtwork trophy={tournament.trophy} size="md" />
              </div>

              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
                  <span className="text-[#7ADBF0] light:text-cyan-700">TOURNAMENT TROPHY</span>
                  <span className="px-2 py-0.5 rounded-full border border-white/15 bg-white/[0.04] text-slate-300 light:text-slate-700">
                    {(tournament.trophy.displayStyle || tournament.trophy.material).toUpperCase()}
                  </span>
                  <span className="px-2 py-0.5 rounded-full border border-white/15 bg-white/[0.04] text-slate-300 light:text-slate-700">
                    {(tournament.trophy.category || 'Competition').toUpperCase()}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-white light:text-slate-950 truncate">
                  {tournament.trophy.name}
                </h2>
                <p className="text-xs text-slate-400 light:text-slate-600">
                  {tournament.champion
                    ? `Awarded permanently to ${tournament.champion.teamName} (${tournament.champion.finalScore})`
                    : `Will be permanently awarded to the confirmed champion · "${tournament.trophy.engraving}"`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onOpenHallOfFame}
                className="px-3.5 py-2 rounded-xl border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 text-xs font-semibold text-white light:text-slate-900 hover:border-amber-400/50 cursor-pointer inline-flex items-center gap-1.5"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Hall of Fame</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('trophy')}
                className="px-3.5 py-2 rounded-xl border border-amber-400/40 bg-amber-500/10 text-xs font-semibold text-amber-300 light:text-amber-800 hover:bg-amber-500/20 cursor-pointer"
              >
                Trophy Podium
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Next & Recent Fixtures */}
            <div className="lg:col-span-2 rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white light:text-slate-950">
                  Upcoming &amp; Recent Fixtures
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('fixtures')}
                  className="text-xs font-semibold text-[#7ADBF0] light:text-cyan-700 cursor-pointer"
                >
                  Open Fixtures →
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(activeUnfinishedStage?.fixtures || [])
                  .slice()
                  .sort(
                    (a, b) =>
                      Number(a.status === 'completed') - Number(b.status === 'completed') ||
                      a.roundIndex - b.roundIndex
                  )
                  .slice(0, 4)
                  .map((f) => renderFixtureCard(f))}
              </div>
            </div>

            {/* Golden Boot & Activity */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white light:text-slate-950">
                    Golden Boot Leaders
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('stats')}
                    className="text-xs font-semibold text-[#7ADBF0] light:text-cyan-700 cursor-pointer"
                  >
                    Stats →
                  </button>
                </div>
                {playerLeaderboard.length === 0 ? (
                  <p className="text-xs text-slate-400 light:text-slate-600">
                    Play or quick-sim matches to track goalscorers, assists &amp; ratings.
                  </p>
                ) : (
                  <div className="divide-y divide-white/[0.06] light:divide-slate-200">
                    {[...playerLeaderboard]
                      .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
                      .slice(0, 5)
                      .map((p, idx) => (
                        <div key={`${p.teamId}-${p.playerId}`} className="py-2 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[10px] text-slate-500 w-4 tabular-nums">
                              {idx + 1}.
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{p.shortName || p.playerName}</div>
                              <div className="text-[10px] text-slate-400">{p.teamCode}</div>
                            </div>
                          </div>
                          <span className="font-mono font-bold text-emerald-400 light:text-emerald-700 tabular-nums">
                            {p.goals}G · {p.assists}A
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-5 space-y-3">
                <h3 className="text-sm font-bold text-white light:text-slate-950">Latest Activity</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {tournament.logs.slice(0, 8).map((log) => (
                    <div key={log.id} className="text-xs border-b border-white/[0.05] light:border-slate-100 pb-2 last:border-0">
                      <div className="text-slate-200 light:text-slate-800">{log.message}</div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 2: FIXTURES (MATCHDAY PILLS + HIDE PLAYED + PREPARE/LIVE/SIM)  */}
      {/* ================================================================== */}
      {activeTab === 'fixtures' && (
        <div className="space-y-4">
          {/* Top Stage + Matchday Filter Card */}
          <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Stage Chips */}
              <div className="flex flex-wrap items-center gap-2">
                {tournament.stages.map((s) => {
                  const done = s.fixtures.filter((f) => f.status === 'completed').length;
                  const locked = isStageLocked(tournament, s.config.order);
                  const active = !locked && currentStage?.config.order === s.config.order;
                  const prevStageName =
                    tournament.stages.find((p) => p.config.order === s.config.order - 1)?.config.name ||
                    'previous stage';
                  return (
                    <button
                      key={s.config.id}
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        if (locked) return;
                        setSelectedStageOrder(s.config.order);
                        setFixtureGroupFilter('all');
                        setFixtureRoundFilter('all');
                      }}
                      title={
                        locked
                          ? `Locked until ${prevStageName} is fully completed`
                          : s.config.name
                      }
                      className={`px-3 py-1.5 rounded-xl border text-left transition-colors inline-flex items-center gap-2 ${
                        locked
                          ? 'border-white/[0.07] light:border-slate-200 bg-[#040810] light:bg-slate-100 text-slate-500 opacity-55 cursor-not-allowed'
                          : active
                          ? 'border-emerald-400/60 bg-emerald-500/10 text-white light:bg-emerald-50 light:text-slate-950 cursor-pointer'
                          : 'border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 text-slate-400 light:text-slate-600 cursor-pointer'
                      }`}
                    >
                      {locked ? (
                        <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      ) : (
                        <ListOrdered className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <div>
                        <div className="font-mono text-[10px] uppercase font-bold">
                          {s.config.name.toUpperCase()}
                        </div>
                        <div className="font-mono text-[9px] text-slate-400 tabular-nums">
                          {locked ? 'LOCKED' : `${done}/${s.fixtures.length} PLAYED`}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {currentStage?.groups && currentStage.groups.length > 0 && (
                  <select
                    value={fixtureGroupFilter}
                    onChange={(e) => setFixtureGroupFilter(e.target.value)}
                    className="rounded-xl border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 px-3 py-2 text-xs text-white light:text-slate-900"
                  >
                    <option value="all">All Groups</option>
                    {currentStage.groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {isAdmin && currentStage && (
                <button
                  type="button"
                  disabled={Boolean(busyAction)}
                  onClick={() => runReset('stage', { stageOrder: currentStage.config.order })}
                  className="px-3 py-1.5 rounded-lg border border-rose-500/35 bg-rose-500/10 light:bg-rose-50 text-xs font-semibold text-rose-300 light:text-rose-700 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Stage</span>
                </button>
              )}
            </div>

            {/* Matchday Pill Selector */}
            <div className="pt-3 border-t border-white/[0.07] light:border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setFixtureRoundFilter('all')}
                className={`px-3 py-1 rounded-full border font-mono text-[10px] uppercase tracking-wider cursor-pointer shrink-0 ${
                  fixtureRoundFilter === 'all'
                    ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300 light:bg-emerald-50 light:text-emerald-800'
                    : 'border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 text-slate-400 light:text-slate-600'
                }`}
              >
                ALL
              </button>
              {stageRounds.map(([rIdx, meta]) => {
                const active = fixtureRoundFilter === String(rIdx);
                return (
                  <button
                    key={rIdx}
                    type="button"
                    onClick={() => setFixtureRoundFilter(String(rIdx))}
                    className={`px-3 py-1 rounded-full border font-mono text-[10px] uppercase tracking-wider cursor-pointer shrink-0 inline-flex items-center gap-1.5 tabular-nums ${
                      active
                        ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300 light:bg-emerald-50 light:text-emerald-800'
                        : 'border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        meta.done === meta.total && meta.total > 0
                          ? 'bg-emerald-400'
                          : 'bg-slate-500'
                      }`}
                    />
                    <span>
                      {meta.label.toUpperCase()} {meta.done}/{meta.total}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Stage / Selection Summary Strip + HIDE PLAYED */}
          <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            {(() => {
              const tot = currentStage?.fixtures.length || 0;
              const done = currentStage?.fixtures.filter((f) => f.status === 'completed').length || 0;
              const pct = tot > 0 ? Math.round((done / tot) * 100) : 0;
              return (
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full border-2 border-white/15 flex items-center justify-center font-mono text-[10px] font-bold text-white light:text-slate-900 tabular-nums">
                    {pct}%
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white light:text-slate-950">
                      {fixtureRoundFilter === 'all'
                        ? currentStage?.config.name || 'All Matchdays'
                        : stageRounds.find(([i]) => String(i) === fixtureRoundFilter)?.[1].label ||
                          'Matchday'}
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 tabular-nums">
                      {done} OF {tot} PLAYED
                    </div>
                  </div>
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => setHidePlayed((v) => !v)}
              className={`px-3.5 py-1.5 rounded-full border font-mono text-[10px] uppercase tracking-wider cursor-pointer inline-flex items-center gap-1.5 ${
                hidePlayed
                  ? 'border-[#7ADBF0]/60 bg-[#7ADBF0]/15 text-[#7ADBF0] light:bg-cyan-50 light:text-cyan-800'
                  : 'border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 text-slate-300 light:text-slate-700'
              }`}
            >
              {hidePlayed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{hidePlayed ? 'SHOW PLAYED' : 'HIDE PLAYED'}</span>
            </button>
          </div>

          {/* Matchday Grouped Cards */}
          {groupedFixturesByRound.length === 0 ? (
            <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-10 text-center text-xs text-slate-400 light:text-slate-600">
              No fixtures match the active filter.
            </div>
          ) : (
            <div className="space-y-4">
              {groupedFixturesByRound.map(([rIdx, rGroup]) => (
                <div
                  key={rIdx}
                  className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4 sm:p-5 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.07] light:border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg border border-[#7ADBF0]/30 bg-[#7ADBF0]/10 flex items-center justify-center text-[#7ADBF0]">
                        <Calendar className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-sm font-bold text-white light:text-slate-950">
                        {rGroup.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 tabular-nums">
                        {rGroup.doneInRound}/{rGroup.totalInRound} PLAYED
                      </span>
                      <div className="w-16 h-1 rounded-full bg-white/[0.07] light:bg-slate-200 overflow-hidden">
                        <div
                          className="h-full bg-[#7ADBF0]"
                          style={{
                            width: `${
                              rGroup.totalInRound > 0
                                ? Math.round((rGroup.doneInRound / rGroup.totalInRound) * 100)
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {rGroup.fixtures.map((f) => renderFixtureCard(f))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 3: TABLES (CLEAN DARK STANDINGS + TIE-BREAK FOOTER)            */}
      {/* ================================================================== */}
      {activeTab === 'tables' && (
        <div className="space-y-5">
          {/* Qualification Zone Key */}
          <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 light:bg-emerald-100 border border-emerald-400/50 text-emerald-200 light:text-emerald-900 font-semibold text-[11px] shadow-[inset_3px_0_0_0_#34d399]">
                  Club Section Highlighted
                </span>
                <span className="text-slate-300 light:text-slate-700 font-medium">
                  Direct Qualification to Next Round
                </span>
              </div>
              {(tableStage?.standings?.some((s) => s.zone === 'playoff' || s.zone === 'third-best') ||
                (tableStage?.config.bestThirdPlacedCount || 0) > 0) && (
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 light:bg-amber-100 border border-amber-400/50 text-amber-200 light:text-amber-900 font-semibold text-[11px] shadow-[inset_3px_0_0_0_#fbbf24]">
                    Club Section Highlighted
                  </span>
                  <span className="text-slate-300 light:text-slate-700 font-medium">
                    Knockout Play-Off / Best 3rd Place Contender
                  </span>
                </div>
              )}
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
              {tableStage?.config.name || 'Standings'}
            </span>
          </div>

          {tableStage?.config.type === 'group' && tableStage.groups ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {tableStage.groups.map((grp) => {
                const rows = (tableStage.standings || [])
                  .filter((r) => r.groupId === grp.id)
                  .sort((a, b) => a.position - b.position);
                return (
                  <div
                    key={grp.id}
                    className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wider">{grp.name}</span>
                      <span className="font-mono text-[10px] text-emerald-400 light:text-emerald-700 font-semibold">
                        Top {tableStage.config.qualifyPerGroup || 2} qualify
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs tabular-nums">
                        <thead>
                          <tr className="border-b border-white/[0.06] light:border-slate-200 text-slate-400 light:text-slate-600 font-mono text-[10px] uppercase">
                            <th className="py-2.5 px-3 text-left w-10">#</th>
                            <th className="py-2.5 px-2 text-left">CLUB / NATION</th>
                            <th className="py-2.5 px-2 text-center">P</th>
                            <th className="py-2.5 px-2 text-center">W</th>
                            <th className="py-2.5 px-2 text-center">D</th>
                            <th className="py-2.5 px-2 text-center">L</th>
                            <th className="py-2.5 px-2 text-center">GF</th>
                            <th className="py-2.5 px-2 text-center">GA</th>
                            <th className="py-2.5 px-2 text-center">GD</th>
                            <th className="py-2.5 px-3 text-right">PTS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05] light:divide-slate-100">
                          {rows.map((r) => {
                            const teamObj = teamsMap.get(r.teamId);
                            const isDirect = r.zone === 'direct';
                            const isThirdBest = r.zone === 'third-best';
                            return (
                              <tr
                                key={r.teamId}
                                className={`transition-colors ${
                                  isDirect
                                    ? 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.14] light:bg-emerald-50/70 light:hover:bg-emerald-100/70'
                                    : isThirdBest
                                    ? 'bg-amber-500/[0.08] hover:bg-amber-500/[0.14] light:bg-amber-50/70 light:hover:bg-amber-100/70'
                                    : 'hover:bg-white/[0.02] light:hover:bg-slate-50'
                                }`}
                              >
                                <td className="py-2 px-3 font-mono font-bold text-slate-400 light:text-slate-600">
                                  {r.position}
                                </td>
                                <td className="py-1.5 px-2">
                                  <div
                                    className={`flex items-center justify-between gap-2 min-w-0 px-2.5 py-1.5 rounded-xl transition-all ${
                                      isDirect
                                        ? 'bg-emerald-500/25 light:bg-emerald-100 border border-emerald-400/50 text-emerald-100 light:text-emerald-950 shadow-[inset_3px_0_0_0_#34d399]'
                                        : isThirdBest
                                        ? 'bg-amber-500/25 light:bg-amber-100 border border-amber-400/50 text-amber-100 light:text-amber-950 shadow-[inset_3px_0_0_0_#fbbf24]'
                                        : 'text-slate-200 light:text-slate-800'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <TeamEmblem
                                        team={teamObj}
                                        crestUrl={r.crestUrl}
                                        code={r.teamCode}
                                        className="w-6 h-6 shrink-0"
                                      />
                                      <span className="font-bold truncate max-w-[135px]">
                                        {r.teamName}
                                      </span>
                                    </div>
                                    {isDirect && (
                                      <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-400/25 text-emerald-200 light:bg-emerald-600 light:text-white font-mono text-[8px] font-bold uppercase tracking-wider">
                                        QUALIFIED
                                      </span>
                                    )}
                                    {isThirdBest && (
                                      <span className="shrink-0 px-1.5 py-0.5 rounded bg-amber-400/25 text-amber-200 light:bg-amber-600 light:text-white font-mono text-[8px] font-bold uppercase tracking-wider">
                                        3RD CONTENDER
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-2 text-center">{r.played}</td>
                                <td className="py-2 px-2 text-center">{r.won}</td>
                                <td className="py-2 px-2 text-center">{r.drawn}</td>
                                <td className="py-2 px-2 text-center">{r.lost}</td>
                                <td className="py-2 px-2 text-center">{r.goalsFor}</td>
                                <td className="py-2 px-2 text-center">{r.goalsAgainst}</td>
                                <td className="py-2 px-2 text-center">
                                  {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                                </td>
                                <td className="py-2 px-3 text-right font-bold">{r.points}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-white/[0.08] light:border-slate-200 text-slate-400 light:text-slate-600 font-mono text-[10px] uppercase tracking-wider">
                      <th className="py-3 px-4 text-left w-10">#</th>
                      <th className="py-3 px-3 text-left">CLUB / NATION</th>
                      <th className="py-3 px-2.5 text-center">P</th>
                      <th className="py-3 px-2.5 text-center">W</th>
                      <th className="py-3 px-2.5 text-center">D</th>
                      <th className="py-3 px-2.5 text-center">L</th>
                      <th className="py-3 px-2.5 text-center">GF</th>
                      <th className="py-3 px-2.5 text-center">GA</th>
                      <th className="py-3 px-2.5 text-center">GD</th>
                      <th className="py-3 px-4 text-right">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] light:divide-slate-100">
                    {(tableStage?.standings || []).map((r) => {
                      const teamObj = teamsMap.get(r.teamId);
                      const isDirect = r.zone === 'direct';
                      const isPlayoff = r.zone === 'playoff';
                      return (
                        <tr
                          key={r.teamId}
                          className={`transition-colors ${
                            isDirect
                              ? 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.14] light:bg-emerald-50/70 light:hover:bg-emerald-100/70'
                              : isPlayoff
                              ? 'bg-amber-500/[0.08] hover:bg-amber-500/[0.14] light:bg-amber-50/70 light:hover:bg-amber-100/70'
                              : 'hover:bg-white/[0.02] light:hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-400 light:text-slate-600">
                            {r.position}
                          </td>
                          <td className="py-1.5 px-3">
                            <div
                              className={`flex items-center justify-between gap-3 px-3 py-1.5 rounded-xl transition-all ${
                                isDirect
                                  ? 'bg-emerald-500/25 light:bg-emerald-100 border border-emerald-400/50 text-emerald-100 light:text-emerald-950 shadow-[inset_3px_0_0_0_#34d399]'
                                  : isPlayoff
                                  ? 'bg-amber-500/25 light:bg-amber-100 border border-amber-400/50 text-amber-100 light:text-amber-950 shadow-[inset_3px_0_0_0_#fbbf24]'
                                  : 'text-white light:text-slate-900'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <TeamEmblem
                                  team={teamObj}
                                  crestUrl={r.crestUrl}
                                  code={r.teamCode}
                                  className="w-6 h-6 shrink-0"
                                />
                                <span className="font-bold truncate">{r.teamName}</span>
                              </div>
                              {isDirect && (
                                <span className="shrink-0 px-2 py-0.5 rounded bg-emerald-400/25 text-emerald-200 light:bg-emerald-600 light:text-white font-mono text-[9px] font-bold uppercase tracking-wider">
                                  DIRECT QUALIFIED
                                </span>
                              )}
                              {isPlayoff && (
                                <span className="shrink-0 px-2 py-0.5 rounded bg-amber-400/25 text-amber-200 light:bg-amber-600 light:text-white font-mono text-[9px] font-bold uppercase tracking-wider">
                                  PLAY-OFF SEED
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-2.5 text-center text-slate-300 light:text-slate-700">{r.played}</td>
                          <td className="py-2.5 px-2.5 text-center text-slate-300 light:text-slate-700">{r.won}</td>
                          <td className="py-2.5 px-2.5 text-center text-slate-300 light:text-slate-700">{r.drawn}</td>
                          <td className="py-2.5 px-2.5 text-center text-slate-300 light:text-slate-700">{r.lost}</td>
                          <td className="py-2.5 px-2.5 text-center text-slate-300 light:text-slate-700">{r.goalsFor}</td>
                          <td className="py-2.5 px-2.5 text-center text-slate-300 light:text-slate-700">{r.goalsAgainst}</td>
                          <td className="py-2.5 px-2.5 text-center text-slate-300 light:text-slate-700">
                            {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-white light:text-slate-950">{r.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-2.5 border-t border-white/[0.08] light:border-slate-200 bg-[#050A12] light:bg-slate-50 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                TIE-BREAK:{' '}
                {tournament.tieBreakers[1] === 'goals-for'
                  ? 'GOALS SCORED'
                  : tournament.tieBreakers[1] === 'wins'
                  ? 'MOST WINS'
                  : 'GOAL DIFFERENCE'}
              </div>
            </div>
          )}

          {/* Best Third-Placed Teams Table */}
          {tableStage?.thirdPlaceTable && tableStage.thirdPlaceTable.length > 0 && (
            <div className="rounded-2xl border border-amber-400/30 bg-[#08101C] light:bg-white overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/10 light:border-slate-200 bg-amber-500/10 light:bg-amber-50 flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider text-amber-300 light:text-amber-800">
                  Best Third-Placed Teams Ranking (Top {tableStage.config.bestThirdPlacedCount || 0} Advance)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs tabular-nums">
                  <thead>
                    <tr className="border-b border-white/[0.06] light:border-slate-200 text-slate-400 light:text-slate-600 font-mono text-[10px] uppercase">
                      <th className="py-2 px-3 text-left w-10">#</th>
                      <th className="py-2 px-2 text-left">CLUB / NATION</th>
                      <th className="py-2 px-2 text-left">GROUP</th>
                      <th className="py-2 px-2 text-center">P</th>
                      <th className="py-2 px-2 text-center">GD</th>
                      <th className="py-2 px-2 text-center">GF</th>
                      <th className="py-2 px-3 text-right">PTS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] light:divide-slate-100">
                    {tableStage.thirdPlaceTable.map((r, idx) => {
                      const teamObj = teamsMap.get(r.teamId);
                      const qualifies = idx < (tableStage.config.bestThirdPlacedCount || 0);
                      return (
                        <tr
                          key={r.teamId}
                          className={
                            qualifies
                              ? 'bg-emerald-500/[0.08] hover:bg-emerald-500/[0.14] light:bg-emerald-50/70'
                              : 'hover:bg-white/[0.02]'
                          }
                        >
                          <td className="py-2 px-3 font-mono font-bold text-slate-400 light:text-slate-600">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-2">
                            <div
                              className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl ${
                                qualifies
                                  ? 'bg-emerald-500/25 light:bg-emerald-100 border border-emerald-400/50 text-emerald-100 light:text-emerald-950 shadow-[inset_3px_0_0_0_#34d399]'
                                  : 'text-slate-300 light:text-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <TeamEmblem
                                  team={teamObj}
                                  crestUrl={r.crestUrl}
                                  code={r.teamCode}
                                  className="w-6 h-6 shrink-0"
                                />
                                <span className="font-bold truncate">{r.teamName}</span>
                              </div>
                              {qualifies && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-400/25 text-emerald-200 light:bg-emerald-600 light:text-white font-mono text-[8px] font-bold uppercase tracking-wider">
                                  QUALIFIED
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-2 text-slate-400 light:text-slate-600">{r.groupName}</td>
                          <td className="py-2 px-2 text-center">{r.played}</td>
                          <td className="py-2 px-2 text-center">
                            {r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}
                          </td>
                          <td className="py-2 px-2 text-center">{r.goalsFor}</td>
                          <td className="py-2 px-3 text-right font-bold">{r.points}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 4: TEAMS (COLORED TOP STRIPE + SEED · MANAGER + PTS BOX)       */}
      {/* ================================================================== */}
      {activeTab === 'teams' && (
        <div className="space-y-5">
          {activeInjuries.length > 0 && (
            <div className="rounded-2xl border border-rose-500/35 bg-[#08101C] light:bg-white p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-300 light:text-rose-700">
                <HeartPulse className="w-4 h-4" />
                <span>Active Tournament Injury Report ({activeInjuries.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {activeInjuries.map((inj) => {
                  const d = resolveTeamDisplay(inj.teamId);
                  return (
                    <div
                      key={inj.playerId}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{inj.playerName}</div>
                        <div className="text-[11px] text-slate-400 light:text-slate-600 truncate">
                          {d?.shortName} · {inj.reason}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-rose-400 light:text-rose-700 font-bold shrink-0 tabular-nums">
                        {inj.matchesRemaining} match{inj.matchesRemaining > 1 ? 'es' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {tournament.teamIds.map((tid, idx) => {
              const d = resolveTeamDisplay(tid);
              if (!d) return null;
              const stats = teamTournamentStats.get(tid) || {
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                points: 0,
              };
              const teamInjCount = activeInjuries.filter((i) => i.teamId === tid).length;

              return (
                <div
                  key={tid}
                  className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white overflow-hidden flex flex-col justify-between"
                >
                  {/* Club/Nation Top Color Stripe */}
                  <div
                    className="h-1 w-full"
                    style={{ backgroundColor: d.primaryColor || '#38BDF8' }}
                  />

                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <TeamEmblem
                        team={d.teamObj}
                        crestUrl={d.crestUrl}
                        code={d.code}
                        className="w-10 h-10 shrink-0"
                      />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => d.teamObj && openTeamById(d.teamObj.id, 0)}
                          className="text-sm font-bold text-white light:text-slate-950 hover:text-[#7ADBF0] truncate block text-left cursor-pointer"
                        >
                          {d.name}
                        </button>
                        <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 truncate mt-0.5">
                          SEED {idx + 1} · {(d.managerName || 'MANAGER').toUpperCase()}
                        </div>
                        {teamInjCount > 0 && (
                          <div className="font-mono text-[9.5px] text-rose-400 light:text-rose-700 mt-0.5">
                            {teamInjCount} injured
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 px-3 py-1.5 text-center shrink-0 min-w-[54px]">
                      <div className="font-display text-xl text-white light:text-slate-950 tabular-nums leading-none">
                        {stats.points}
                      </div>
                      <div className="font-mono text-[8.5px] uppercase tracking-wider text-slate-400 mt-0.5">
                        PTS
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-2.5 border-t border-white/[0.06] light:border-slate-200 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 tabular-nums">
                    <span>
                      {stats.played}P · {stats.won}W · {stats.drawn}D · {stats.lost}L
                    </span>
                    <span className="text-slate-500">
                      {stats.lastResult || 'NO MATCHES'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 5: DRAW & MANUAL PLACEMENT                                     */}
      {/* ================================================================== */}
      {activeTab === 'draw' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-sm font-bold text-white light:text-slate-950">
                Stage Draw Engine — {currentStage?.config.name}
              </div>
              <p className="text-xs text-slate-400 light:text-slate-600">
                Seeded by rating, random balanced draw, or click two teams below to swap group slots manually.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {currentStage && isStageLocked(tournament, currentStage.config.order) && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/35 bg-amber-500/10 text-amber-300 light:text-amber-800 text-xs font-semibold">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Stage Locked Until Previous Stage Finishes</span>
                </span>
              )}

              <button
                type="button"
                onClick={() => setPreventSameCountry((v) => !v)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                  preventSameCountry
                    ? 'border-[#7ADBF0]/50 bg-[#7ADBF0]/15 text-[#7ADBF0] light:bg-cyan-50 light:text-cyan-800'
                    : 'border-white/15 light:border-slate-300 text-slate-400 light:text-slate-700'
                }`}
              >
                Same-Country Guard: {preventSameCountry ? 'On' : 'Off'}
              </button>

              {isWorldCup && currentStage?.config.order === 0 && (
                <button
                  type="button"
                  disabled={
                    Boolean(busyAction) ||
                    isStageLocked(tournament, currentStage.config.order) ||
                    currentStage.fixtures.some((f) => f.status === 'completed')
                  }
                  onClick={() => runDraw(currentStage.config.order, 'official')}
                  className="px-3 py-1.5 rounded-lg border border-amber-400/40 bg-amber-500/15 text-amber-300 light:bg-amber-50 light:text-amber-800 text-xs font-semibold disabled:opacity-40 cursor-pointer"
                >
                  Official WC 2026 Groups A–L
                </button>
              )}

              <button
                type="button"
                disabled={
                  Boolean(busyAction) ||
                  !currentStage ||
                  isStageLocked(tournament, currentStage.config.order) ||
                  currentStage.fixtures.some((f) => f.status === 'completed')
                }
                onClick={() => currentStage && runDraw(currentStage.config.order, 'seeded')}
                className="px-3 py-1.5 rounded-lg border border-white/15 light:border-slate-300 bg-white/[0.04] light:bg-white text-xs font-semibold disabled:opacity-40 cursor-pointer"
              >
                Seeded Draw
              </button>

              <button
                type="button"
                disabled={
                  Boolean(busyAction) ||
                  !currentStage ||
                  isStageLocked(tournament, currentStage.config.order) ||
                  currentStage.fixtures.some((f) => f.status === 'completed')
                }
                onClick={() => currentStage && runDraw(currentStage.config.order, 'random')}
                className="px-3 py-1.5 rounded-lg bg-[#7ADBF0] text-slate-950 text-xs font-bold disabled:opacity-40 cursor-pointer"
              >
                Random Draw
              </button>
            </div>
          </div>

          {tournament.drawOptions?.lastWarning && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 light:bg-amber-50 p-3.5 text-xs text-amber-200 light:text-amber-800">
              {tournament.drawOptions.lastWarning}
            </div>
          )}

          {currentStage?.groups && currentStage.groups.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {currentStage.groups.map((grp) => (
                <div
                  key={grp.id}
                  className="rounded-xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-white/10 light:border-slate-200 pb-2">
                    <span className="font-bold text-xs uppercase">{grp.name}</span>
                    {!currentStage.fixtures.some((f) => f.status === 'completed') && (
                      <span className="font-mono text-[10px] text-slate-500">Click 2 to swap</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {grp.teamIds.map((tid) => {
                      const d = resolveTeamDisplay(tid);
                      const isPicked = swapPick?.teamId === tid;
                      const locked = currentStage.fixtures.some((f) => f.status === 'completed');
                      return (
                        <button
                          key={tid}
                          type="button"
                          disabled={locked}
                          onClick={() => handleGroupTeamSwap(grp.id, tid)}
                          className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs text-left cursor-pointer disabled:cursor-default ${
                            isPicked
                              ? 'border-[#7ADBF0] bg-[#7ADBF0]/15 text-[#7ADBF0] light:bg-cyan-50 light:text-cyan-800'
                              : 'border-white/[0.06] light:border-slate-200 bg-[#050A12] light:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {d && <TeamEmblem team={d.teamObj} crestUrl={d.crestUrl} code={d.code} className="w-5 h-5 shrink-0" />}
                            <span className="truncate font-medium">{d?.name || tid}</span>
                          </div>
                          {!locked && <ArrowLeftRight className="w-3 h-3 text-slate-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4 space-y-3">
              <div className="text-xs font-semibold">
                Seeding Order ({currentStage?.participantIds.length || 0} Teams)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {(currentStage?.participantIds || []).map((tid, idx) => {
                  const d = resolveTeamDisplay(tid);
                  return (
                    <div
                      key={tid}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 text-xs"
                    >
                      <span className="font-mono text-[10px] text-slate-500 tabular-nums">{idx + 1}</span>
                      {d && <TeamEmblem team={d.teamObj} crestUrl={d.crestUrl} code={d.code} className="w-5 h-5 shrink-0" />}
                      <span className="truncate font-medium">{d?.code}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 6: STATS                                                       */}
      {/* ================================================================== */}
      {activeTab === 'stats' && (
        <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold">Tournament Player Statistics</h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'goals', label: 'Top Scorers' },
                { id: 'assists', label: 'Top Assists' },
                { id: 'avgRating', label: 'Avg Rating' },
                { id: 'cleanSheets', label: 'Clean Sheets' },
                { id: 'saves', label: 'Saves' },
                { id: 'yellowCards', label: 'Discipline' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setStatMetric(m.id as any)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    statMetric === m.id
                      ? 'bg-[#7ADBF0] text-slate-950'
                      : 'bg-white/[0.04] light:bg-slate-200 text-slate-300 light:text-slate-700'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="border-b border-white/[0.06] light:border-slate-200 text-slate-400 light:text-slate-600 font-mono text-[10px] uppercase">
                  <th className="py-2.5 px-3 text-left">#</th>
                  <th className="py-2.5 px-3 text-left">Player</th>
                  <th className="py-2.5 px-2 text-left">Team</th>
                  <th className="py-2.5 px-2 text-center">Apps</th>
                  <th className="py-2.5 px-2 text-center">Goals</th>
                  <th className="py-2.5 px-2 text-center">Assists</th>
                  <th className="py-2.5 px-2 text-center">CS / SV</th>
                  <th className="py-2.5 px-2 text-center">Y / R</th>
                  <th className="py-2.5 px-3 text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] light:divide-slate-100">
                {sortedStats.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 light:text-slate-600">
                      No completed matches yet.
                    </td>
                  </tr>
                ) : (
                  sortedStats.map((row, idx) => (
                    <tr key={`${row.teamId}-${row.playerId}`}>
                      <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-2 px-3 font-semibold">{row.shortName || row.playerName}</td>
                      <td className="py-2 px-2 text-slate-400 light:text-slate-600">{row.teamCode}</td>
                      <td className="py-2 px-2 text-center">{row.appearances}</td>
                      <td className="py-2 px-2 text-center font-bold text-emerald-400 light:text-emerald-700">
                        {row.goals}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-[#7ADBF0] light:text-cyan-700">
                        {row.assists}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {row.cleanSheets} / {row.saves}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {row.yellowCards} / {row.redCards}
                      </td>
                      <td className="py-2 px-3 text-right font-mono font-bold">
                        {row.avgRating.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 7: KNOCKOUT BRACKET                                            */}
      {/* ================================================================== */}
      {activeTab === 'bracket' && (
        <div className="space-y-5">
          {knockoutStages.length === 0 ? (
            <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-10 text-center text-xs text-slate-400 light:text-slate-600">
              This league/round-robin competition does not include a knockout bracket stage.
            </div>
          ) : (
            <KnockoutBracketView
              tournament={tournament}
              knockoutStages={knockoutStages}
              busyAction={busyAction}
              resolveTeamDisplay={resolveTeamDisplay}
              onLaunchInSimulator={handleLaunchFixtureInSimulator}
              onQuickSimFixture={runSingleFixture}
              onSimulateBatch={runBatch}
              onOpenTelemetry={(f) => setTelemetryFixture(f)}
              onResetFixture={(fid) => runReset('fixture', { fixtureId: fid })}
              onOpenTeamCabinet={(teamId) => openTeamById(teamId, 5)}
            />
          )}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 8: QUALIFIED & ELIMINATED                                      */}
      {/* ================================================================== */}
      {activeTab === 'qualified' && (
        <div className="space-y-4">
          {tournament.stages.map((s) => (
            <div
              key={s.config.id}
              className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-white/10 light:border-slate-200 pb-2">
                <span className="text-sm font-bold">
                  {s.config.order + 1}. {s.config.name}
                </span>
                <span className="font-mono text-[10px] uppercase text-slate-400 light:text-slate-600">
                  {s.qualifiedIds.length} Qualified · {s.eliminatedIds.length} Eliminated
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="font-mono text-[10px] uppercase text-emerald-400 light:text-emerald-700">
                    Qualified ({s.qualifiedIds.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.qualifiedIds.map((id) => {
                      const d = resolveTeamDisplay(id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-emerald-500/30 bg-emerald-500/10 light:bg-emerald-50 text-xs"
                        >
                          {d && <TeamEmblem team={d.teamObj} crestUrl={d.crestUrl} code={d.code} className="w-5 h-5 shrink-0" />}
                          <span>{d?.shortName || id}</span>
                        </span>
                      );
                    })}
                    {s.qualifiedIds.length === 0 && (
                      <span className="text-xs text-slate-500">Not yet determined</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-mono text-[10px] uppercase text-slate-400 light:text-slate-600">
                    Eliminated ({s.eliminatedIds.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {s.eliminatedIds.map((id) => {
                      const d = resolveTeamDisplay(id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-100 text-xs text-slate-400 light:text-slate-600"
                        >
                          {d && <TeamEmblem team={d.teamObj} crestUrl={d.crestUrl} code={d.code} className="w-5 h-5 shrink-0" />}
                          <span>{d?.shortName || id}</span>
                        </span>
                      );
                    })}
                    {s.eliminatedIds.length === 0 && (
                      <span className="text-xs text-slate-500">None yet</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 9: HISTORY & LOG                                               */}
      {/* ================================================================== */}
      {activeTab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-5 space-y-3">
            <h3 className="text-sm font-bold">Edition Roll of Honour</h3>
            {tournament.history.length === 0 ? (
              <p className="text-xs text-slate-400 light:text-slate-600">
                Completed editions will be etched permanently here once the Final settles.
              </p>
            ) : (
              <div className="space-y-2.5">
                {tournament.history.map((ed) => (
                  <div
                    key={ed.id}
                    className="rounded-lg border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 p-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-mono text-[10px] uppercase text-amber-400 light:text-amber-700">
                        {ed.season} · {ed.finalScore}
                      </div>
                      <div className="text-sm font-bold">{ed.championName}</div>
                      {ed.runnerUpName && (
                        <div className="text-[11px] text-slate-400 light:text-slate-600">
                          Runner-up: {ed.runnerUpName}
                          {ed.thirdPlaceName ? ` · 3rd: ${ed.thirdPlaceName}` : ''}
                        </div>
                      )}
                    </div>
                    <TrophyArtwork trophy={ed.trophy} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-5 space-y-3">
            <h3 className="text-sm font-bold">Competition Activity Log</h3>
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {tournament.logs.map((log) => (
                <div
                  key={log.id}
                  className="text-xs py-2 border-b border-white/[0.06] light:border-slate-100 last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase text-[#7ADBF0] light:text-cyan-700">
                      {log.type}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-0.5 text-slate-200 light:text-slate-800">{log.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* TAB 10: TROPHY & WINNER PODIUM                                     */}
      {/* ================================================================== */}
      {activeTab === 'trophy' && (
        <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6 items-center">
            <div className="rounded-2xl border border-amber-400/30 bg-[#050A12] light:bg-amber-50/40 p-6 flex flex-col items-center gap-2">
              <TrophyArtwork trophy={tournament.trophy} size="xl" />
              <div className="font-mono text-[10px] uppercase tracking-widest text-amber-400 light:text-amber-700 text-center">
                {tournament.trophy.category || 'Other'} · {tournament.trophy.prestigeTier}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                  Official Competition Silverware
                </div>
                <h2 className="font-display text-3xl text-white light:text-slate-950">
                  {tournament.trophy.name}
                </h2>
                <p className="font-mono text-xs text-amber-300 light:text-amber-700 mt-0.5">
                  &ldquo;{tournament.trophy.engraving}&rdquo;
                </p>
              </div>

              {tournament.champion ? (
                <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 light:bg-amber-50 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {tournament.champion.crestUrl && (
                        <TeamEmblem
                          crestUrl={tournament.champion.crestUrl}
                          code={tournament.champion.teamCode}
                          className="w-10 h-10 shrink-0"
                        />
                      )}
                      <div>
                        <div className="font-mono text-[10px] uppercase text-amber-300 light:text-amber-800">
                          Tournament Champion
                        </div>
                        <div className="text-lg font-bold">{tournament.champion.teamName}</div>
                        <div className="text-xs text-slate-300 light:text-slate-700">
                          {tournament.champion.finalScore}
                          {tournament.champion.runnerUpName
                            ? ` · Runner-Up: ${tournament.champion.runnerUpName}`
                            : ''}
                          {tournament.champion.thirdPlaceName
                            ? ` · 3rd Place: ${tournament.champion.thirdPlaceName}`
                            : ''}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => openTeamById(tournament.champion!.teamId, 5)}
                      className="px-3.5 py-2 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Open Champion Cabinet</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 p-4 text-xs text-slate-400 light:text-slate-600">
                  The {tournament.trophy.name} will be permanently awarded to the Champion&apos;s club cabinet and Hall of Fame once the Final settles.
                </div>
              )}

              <div>
                <button
                  type="button"
                  onClick={onOpenHallOfFame}
                  className="px-4 py-2 rounded-lg border border-white/15 light:border-slate-300 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Browse Global Hall of Fame</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Telemetry Modal */}
      <MatchTelemetryModal
        tournament={tournament}
        fixture={telemetryFixture}
        teamsMap={teamsMap}
        managersByTeam={managersByTeam}
        onClose={() => setTelemetryFixture(null)}
      />

      {/* Import Recorded Match Centre Simulation Modal */}
      {importTargetFixture && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setImportTargetFixture(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-white/15 light:border-slate-200 bg-[#08101C] light:bg-white p-5 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 light:border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold">Import Simulated Match Report</h3>
                <p className="text-xs text-slate-400 light:text-slate-600">
                  Link an existing Match Centre simulation between these two clubs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportTargetFixture(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {compatibleSimMatches.length === 0 ? (
              <div className="py-5 space-y-4 text-center">
                <p className="text-xs text-slate-400 light:text-slate-600">
                  No completed Match Centre simulation matches found between{' '}
                  <span className="font-semibold text-white light:text-slate-900">
                    {resolveTeamDisplay(importTargetFixture.homeTeamId)?.name}
                  </span>{' '}
                  and{' '}
                  <span className="font-semibold text-white light:text-slate-900">
                    {resolveTeamDisplay(importTargetFixture.awayTeamId)?.name}
                  </span>
                  . You can simulate or play this fixture directly:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const target = importTargetFixture;
                      setImportTargetFixture(null);
                      handleLaunchFixtureInSimulator(target, false);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-white/15 bg-[#050A12] text-xs font-semibold text-slate-200 hover:border-[#7ADBF0]/50 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Prepare in Dugout</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const target = importTargetFixture;
                      setImportTargetFixture(null);
                      handleLaunchFixtureInSimulator(target, true);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <MonitorPlay className="w-3.5 h-3.5" />
                    <span>Simulate Live</span>
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={async () => {
                      const targetId = importTargetFixture.id;
                      setImportTargetFixture(null);
                      await runSingleFixture(targetId);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-[#7ADBF0] text-slate-950 text-xs font-bold hover:bg-[#9BE6F6] cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Quick Sim Now</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {compatibleSimMatches.map((sm) => (
                  <button
                    key={sm.id}
                    type="button"
                    disabled={Boolean(busyAction)}
                    onClick={async () => {
                      setBusyAction('import');
                      await importMatchIntoCompetition(tournament.id, {
                        fixtureId: importTargetFixture.id,
                        simulationMatchId: sm.id,
                      });
                      setBusyAction(null);
                      setImportTargetFixture(null);
                    }}
                    className="w-full text-left p-3 rounded-xl border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 hover:border-[#7ADBF0] flex items-center justify-between gap-3 text-xs cursor-pointer"
                  >
                    <div>
                      <div className="font-bold">
                        {sm.homeTeamName} {sm.homeScore} – {sm.awayScore} {sm.awayTeamName}
                      </div>
                      <div className="text-[11px] text-slate-400 light:text-slate-600">
                        {sm.competitionName} · {sm.date ? new Date(sm.date).toLocaleDateString() : 'Recorded'}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-[#7ADBF0] text-slate-950 font-bold text-[11px]">
                      Import
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full-Screen Broadcast Winner Celebration Animation Modal */}
      <WinnerCelebrationModal
        isOpen={winnerModalOpen}
        tournament={tournament}
        teamsMap={teamsMap}
        onClose={() => setWinnerModalOpen(false)}
        onOpenTeamCabinet={(teamId) => openTeamById(teamId, 5)}
      />
    </div>
  );
};
