import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  Dices,
  FolderOpen,
  History,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { getPlayerDisplayName, Player, Team } from '../../../types/matchCentre';
import type { CompetitionRecord } from '../../../../server/types';
import {
  AVAILABLE_FORMATIONS,
  FormationCategory,
  FORMATION_TEMPLATES,
  getPositionalCompatibilityScore,
  isLightHex,
  normalizeHex,
  normalizePositionDetail,
} from '../dossier/dossierUtils';
import {
  buildDugoutLineup,
  buildInitialTeamSetup,
  computePreMatchOdds,
  generateRandomSeed,
  getSetupXiAverage,
} from '../../../engine/matchSimulator';
import type {
  SimCompetitionConfig,
  SimCompetitionPreset,
  SimPlanId,
  SimPresentationMode,
  SimTeamSetup,
} from '../../../types/simulation';
import { TeamEmblem } from '../TeamEmblem';
import { MiniFormationPitch } from './MiniFormationPitch';
import { selectInMatchPenaltyTaker } from '../../../utils/penaltyOrder';
import { filterTeamsFast } from '../../../utils/globalDatabaseSearch';

interface SimulationDugoutProps {
  homeTeam: Team;
  awayTeam: Team;
  allTeams: Team[];
  competitions: CompetitionRecord[];
  homeSetup: SimTeamSetup;
  awaySetup: SimTeamSetup;
  competition: SimCompetitionConfig;
  seed: string;
  startMode: SimPresentationMode;
  savedCount: number;
  recentCount: number;
  onBack: () => void;
  onSwapTeams: () => void;
  onChangeTeam: (side: 'home' | 'away', team: Team) => void;
  onUpdateSetup: (side: 'home' | 'away', next: SimTeamSetup) => void;
  onChangeCompetition: (next: SimCompetitionConfig) => void;
  onChangeSeed: (seed: string) => void;
  onChangeStartMode: (mode: SimPresentationMode) => void;
  onOpenSavedModal: () => void;
  onKickOff: () => void;
}

const SHAPE_CATEGORIES: Array<'ALL SHAPES' | FormationCategory> = [
  'ALL SHAPES',
  'POSSESSION-FIRST',
  'PRESSING-COMPACT',
  'DEFENSIVE-SOLID',
  'WING-BACK',
  'HYBRID',
];

export const SimulationDugout: React.FC<SimulationDugoutProps> = ({
  homeTeam,
  awayTeam,
  allTeams,
  competitions,
  homeSetup,
  awaySetup,
  competition,
  seed,
  startMode,
  savedCount,
  recentCount,
  onBack,
  onSwapTeams,
  onChangeTeam,
  onUpdateSetup,
  onChangeCompetition,
  onChangeSeed,
  onChangeStartMode,
  onOpenSavedModal,
  onKickOff,
}) => {
  const [activeRoom, setActiveRoom] = useState<'home' | 'away'>('home');
  const [shapeCategory, setShapeCategory] = useState<'ALL SHAPES' | FormationCategory>('ALL SHAPES');
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null);
  const [instructionsExpanded, setInstructionsExpanded] = useState(false);
  const [showTeamPickerSide, setShowTeamPickerSide] = useState<'home' | 'away' | null>(null);
  const [teamSearch, setTeamSearch] = useState('');
  const deferredTeamSearch = useDeferredValue(teamSearch);

  const isUcl = competition.preset === 'champions-league';
  const homeColor = normalizeHex(homeTeam.primaryColor || '#EF4444');
  const awayColor = normalizeHex(awayTeam.primaryColor || '#38BDF8');

  const activeTeam = activeRoom === 'home' ? homeTeam : awayTeam;
  const activeSetup = activeRoom === 'home' ? homeSetup : awaySetup;
  const activeAccent = activeRoom === 'home' ? homeColor : awayColor;
  const activePlan = activeSetup.plans[activeSetup.activePlan];

  const homeAvg = useMemo(() => getSetupXiAverage(homeSetup), [homeSetup]);
  const awayAvg = useMemo(() => getSetupXiAverage(awaySetup), [awaySetup]);
  const homeSetCount = homeSetup.slots.filter((s) => Boolean(s.player)).length;
  const awaySetCount = awaySetup.slots.filter((s) => Boolean(s.player)).length;
  const isReady = homeSetCount === 11 && awaySetCount === 11;

  const preOdds = useMemo(() => computePreMatchOdds(homeSetup, awaySetup), [homeSetup, awaySetup]);

  const filteredFormations = useMemo(() => {
    return AVAILABLE_FORMATIONS.filter((f) => {
      if (shapeCategory === 'ALL SHAPES') return true;
      return FORMATION_TEMPLATES[f]?.category === shapeCategory;
    });
  }, [shapeCategory]);

  const filteredPickerTeams = useMemo(() => {
    return filterTeamsFast(allTeams, deferredTeamSearch, undefined, 24);
  }, [allTeams, deferredTeamSearch]);

  // Competition fixtures for currently selected competition
  const selectedServerComp = useMemo(
    () => competitions.find((c) => c.id === competition.competitionId),
    [competitions, competition.competitionId]
  );

  // Handlers
  const handleSelectFormation = (formation: string) => {
    const currentPlan = activeSetup.plans[activeSetup.activePlan];
    const currentIds = activeSetup.slots
      .map((s) => s.player?.id)
      .filter((id): id is string => Boolean(id));
    const { slots, bench } = buildDugoutLineup(activeTeam, formation, currentIds);
    onUpdateSetup(activeRoom, {
      ...activeSetup,
      formation,
      slots,
      bench,
      plans: {
        ...activeSetup.plans,
        [activeSetup.activePlan]: {
          ...currentPlan,
          formation,
        },
      },
    });
    setSelectedSlotIdx(null);
  };

  const handleBestXi = () => {
    const { slots, bench } = buildDugoutLineup(activeTeam, activeSetup.formation);
    onUpdateSetup(activeRoom, {
      ...activeSetup,
      slots,
      bench,
    });
    setSelectedSlotIdx(null);
  };

  const handleResetRoom = () => {
    const fresh = buildInitialTeamSetup(activeTeam);
    onUpdateSetup(activeRoom, fresh);
    setSelectedSlotIdx(null);
  };

  const handleClickPitchSlot = (slotIdx: number) => {
    if (selectedSlotIdx === null) {
      setSelectedSlotIdx(slotIdx);
      return;
    }
    if (selectedSlotIdx === slotIdx) {
      setSelectedSlotIdx(null);
      return;
    }
    // Swap two on-pitch players cleanly while preserving nodes
    const nextSlots = [...activeSetup.slots];
    const aPlayer = nextSlots[selectedSlotIdx]?.player || null;
    const bPlayer = nextSlots[slotIdx]?.player || null;
    nextSlots[selectedSlotIdx] = { ...nextSlots[selectedSlotIdx], player: bPlayer };
    nextSlots[slotIdx] = { ...nextSlots[slotIdx], player: aPlayer };
    onUpdateSetup(activeRoom, { ...activeSetup, slots: nextSlots });
    setSelectedSlotIdx(null);
  };

  const handleSwapBenchPlayer = (benchPlayer: Player) => {
    if (selectedSlotIdx === null) {
      // Auto-find best compatible pitch slot or weakest slot
      let bestIdx = 0;
      let bestScore = -999999;
      activeSetup.slots.forEach((slot, idx) => {
        const compat = getPositionalCompatibilityScore(benchPlayer, slot.node);
        if (compat > bestScore) {
          bestScore = compat;
          bestIdx = idx;
        }
      });
      const outgoing = activeSetup.slots[bestIdx]?.player || null;
      const nextSlots = [...activeSetup.slots];
      nextSlots[bestIdx] = { ...nextSlots[bestIdx], player: benchPlayer };
      const nextBench = [
        ...activeSetup.bench.filter((p) => p.id !== benchPlayer.id),
        ...(outgoing ? [outgoing] : []),
      ];
      onUpdateSetup(activeRoom, { ...activeSetup, slots: nextSlots, bench: nextBench });
      return;
    }

    const outgoing = activeSetup.slots[selectedSlotIdx]?.player || null;
    const nextSlots = [...activeSetup.slots];
    nextSlots[selectedSlotIdx] = { ...nextSlots[selectedSlotIdx], player: benchPlayer };
    const nextBench = [
      ...activeSetup.bench.filter((p) => p.id !== benchPlayer.id),
      ...(outgoing ? [outgoing] : []),
    ];
    onUpdateSetup(activeRoom, { ...activeSetup, slots: nextSlots, bench: nextBench });
    setSelectedSlotIdx(null);
  };

  const handleSelectPlan = (planId: SimPlanId) => {
    const plan = activeSetup.plans[planId];
    const currentIds = activeSetup.slots
      .map((s) => s.player?.id)
      .filter((id): id is string => Boolean(id));
    const { slots, bench } = buildDugoutLineup(activeTeam, plan.formation, currentIds);
    onUpdateSetup(activeRoom, {
      ...activeSetup,
      activePlan: planId,
      formation: plan.formation,
      slots,
      bench,
    });
    setSelectedSlotIdx(null);
  };

  const updateActivePlanField = (patch: Partial<typeof activePlan>) => {
    onUpdateSetup(activeRoom, {
      ...activeSetup,
      plans: {
        ...activeSetup.plans,
        [activeSetup.activePlan]: {
          ...activePlan,
          ...patch,
        },
      },
    });
  };

  const applyPreset = (preset: SimCompetitionPreset) => {
    if (preset === 'champions-league') {
      onChangeCompetition({
        preset,
        competitionId: 'comp-ucl',
        competitionName: 'UEFA Champions League',
        stageLabel: 'Knockout Phase',
        isKnockout: true,
        allowExtraTime: true,
        allowPenalties: true,
        isTwoLegged: true,
        legNumber: 2,
        firstLegHomeGoals: 1,
        firstLegAwayGoals: 1,
        awayGoalsRule: false,
      });
    } else if (preset === 'premier-league') {
      onChangeCompetition({
        preset,
        competitionId: 'comp-epl',
        competitionName: 'Premier League',
        stageLabel: 'League Matchday',
        isKnockout: false,
        allowExtraTime: false,
        allowPenalties: false,
        isTwoLegged: false,
        legNumber: 1,
        awayGoalsRule: false,
      });
    } else if (preset === 'national-cup') {
      onChangeCompetition({
        preset,
        competitionId: 'comp-intl-club',
        competitionName: 'DodaEona Global Club Cup',
        stageLabel: 'Cup Knockout',
        isKnockout: true,
        allowExtraTime: true,
        allowPenalties: true,
        isTwoLegged: false,
        legNumber: 1,
        awayGoalsRule: false,
      });
    } else if (preset === 'international') {
      onChangeCompetition({
        preset,
        competitionId: 'comp-world-intl',
        competitionName: 'International Nations Cup',
        stageLabel: 'Tournament Match',
        isKnockout: true,
        allowExtraTime: true,
        allowPenalties: true,
        isTwoLegged: false,
        legNumber: 1,
        awayGoalsRule: false,
      });
    } else {
      onChangeCompetition({
        preset: 'friendly',
        competitionId: 'comp-friendly',
        competitionName: 'Friendly',
        stageLabel: 'Exhibition',
        isKnockout: false,
        allowExtraTime: false,
        allowPenalties: false,
        isTwoLegged: false,
        legNumber: 1,
        awayGoalsRule: false,
      });
    }
  };

  const activeCategoryLabel =
    FORMATION_TEMPLATES[activeSetup.formation]?.category || 'TACTICAL';

  return (
    <div
      className={`relative rounded-2xl border overflow-hidden transition-all ${
        isUcl
          ? 'bg-[#030A1C] border-blue-400/30 shadow-[0_0_50px_rgba(37,99,235,0.22)]'
          : 'bg-[#050A14] light:bg-white border-white/10 light:border-slate-200 shadow-2xl'
      }`}
    >
      {/* Champions League subtle star-ball background motif */}
      {isUcl && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-25">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-blue-600/25 blur-[110px]" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-cyan-500/20 blur-[110px]" />
          <svg
            viewBox="0 0 240 240"
            className="absolute right-8 top-10 w-72 h-72 text-blue-300/15"
            fill="currentColor"
          >
            <circle cx="120" cy="120" r="95" fill="none" stroke="currentColor" strokeWidth="1.2" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
              const rad = (deg * Math.PI) / 180;
              const cx = 120 + Math.cos(rad) * 58;
              const cy = 120 + Math.sin(rad) * 58;
              return <polygon key={deg} points={`${cx},${cy - 10} ${cx + 3},${cy - 3} ${cx + 10},${cy - 3} ${cx + 4},${cy + 2} ${cx + 6},${cy + 9} ${cx},${cy + 5} ${cx - 6},${cy + 9} ${cx - 4},${cy + 2} ${cx - 10},${cy - 3} ${cx - 3},${cy - 3}`} />;
            })}
          </svg>
        </div>
      )}

      <div className="relative z-10 p-4 landscape-mobile:p-3 sm:p-6 space-y-5 landscape-mobile:space-y-3.5">
        {/* Top Breadcrumb + Saved / History Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-widest uppercase text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-950 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Fixture Builder</span>
            </button>
            {isUcl && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-gradient-to-r from-blue-600/30 to-cyan-500/20 border border-cyan-400/40 font-mono text-[10px] font-bold tracking-widest uppercase text-cyan-300">
                <Sparkles className="w-3 h-3" />
                MATCH SIMULATION
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onSwapTeams}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] light:bg-slate-100 hover:bg-white/[0.09] light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-[11px] font-semibold text-slate-200 light:text-slate-800 transition-colors cursor-pointer shadow-xs"
            >
              <ArrowLeftRight className="w-3.5 h-3.5 text-slate-400 light:text-slate-600" />
              <span>Swap Sides</span>
            </button>
            <button
              type="button"
              onClick={onOpenSavedModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] light:bg-slate-100 hover:bg-white/[0.09] light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-[11px] font-semibold text-slate-200 light:text-slate-800 transition-colors cursor-pointer shadow-xs"
            >
              <FolderOpen className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
              <span>Saved ({savedCount})</span>
              <span className="text-slate-500">·</span>
              <History className="w-3.5 h-3.5 text-cyan-400 light:text-cyan-600" />
              <span>History ({recentCount})</span>
            </button>
          </div>
        </div>

        {/* Competition Selector & Two-Legged Knockout Settings */}
        <div
          className={`rounded-xl border p-3.5 sm:p-4 space-y-3 ${
            isUcl
              ? 'bg-[#07132E]/90 border-blue-400/25'
              : 'bg-[#08101D]/90 light:bg-slate-50 border-white/[0.08] light:border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className={`w-4 h-4 ${isUcl ? 'text-cyan-400' : 'text-amber-400 light:text-amber-600'}`} />
              <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-slate-200 light:text-slate-800">
                Competition & Rules
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'friendly', label: 'Friendly' },
                  { id: 'champions-league', label: 'UEFA Champions League' },
                  { id: 'premier-league', label: 'Premier League' },
                  { id: 'national-cup', label: 'Knockout Cup' },
                  { id: 'international', label: 'Nations Cup' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => applyPreset(item.id)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide transition-all cursor-pointer border ${
                    competition.preset === item.id
                      ? item.id === 'champions-league'
                        ? 'bg-blue-600/30 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                        : 'bg-white/15 light:bg-slate-900 border-white/40 light:border-slate-900 text-white light:text-white'
                      : 'bg-white/[0.03] light:bg-white border-white/10 light:border-slate-200 text-slate-400 light:text-slate-700 hover:text-white light:hover:text-slate-950'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                Fixture Mode
              </span>
              <select
                value={
                  competition.isTwoLegged
                    ? `two-leg-${competition.legNumber}`
                    : competition.allowPenalties
                    ? 'single-ko'
                    : competition.allowExtraTime
                    ? 'et-only'
                    : '90-min'
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '90-min') {
                    onChangeCompetition({
                      ...competition,
                      isKnockout: false,
                      allowExtraTime: false,
                      allowPenalties: false,
                      isTwoLegged: false,
                      legNumber: 1,
                    });
                  } else if (val === 'et-only') {
                    onChangeCompetition({
                      ...competition,
                      isKnockout: false,
                      allowExtraTime: true,
                      allowPenalties: false,
                      isTwoLegged: false,
                      legNumber: 1,
                    });
                  } else if (val === 'single-ko') {
                    onChangeCompetition({
                      ...competition,
                      isKnockout: true,
                      allowExtraTime: true,
                      allowPenalties: true,
                      isTwoLegged: false,
                      legNumber: 1,
                    });
                  } else if (val === 'two-leg-1') {
                    onChangeCompetition({
                      ...competition,
                      isKnockout: false,
                      allowExtraTime: false,
                      allowPenalties: false,
                      isTwoLegged: true,
                      legNumber: 1,
                    });
                  } else {
                    onChangeCompetition({
                      ...competition,
                      isKnockout: true,
                      allowExtraTime: true,
                      allowPenalties: true,
                      isTwoLegged: true,
                      legNumber: 2,
                      firstLegHomeGoals: competition.firstLegHomeGoals ?? 1,
                      firstLegAwayGoals: competition.firstLegAwayGoals ?? 1,
                    });
                  }
                }}
                className="bg-slate-950/90 light:bg-white border border-white/15 light:border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-white light:text-slate-900 focus:outline-none focus:border-cyan-400 shadow-xs"
              >
                <option value="90-min">Full Ninety (Draw Possible)</option>
                <option value="et-only">Extra Time Only (90&apos; + 2×15&apos;, Draw Possible)</option>
                <option value="single-ko">Extra Time &amp; Penalties (Winner Decided)</option>
                <option value="two-leg-1">Two-Legged Tie · 1st Leg</option>
                <option value="two-leg-2">Two-Legged Tie · 2nd Leg (ET + Pens on Agg)</option>
              </select>
            </label>

            {competition.isTwoLegged && competition.legNumber === 2 ? (
              <div className="flex items-end gap-2">
                <label className="flex-1 flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                    Leg 1 · {homeTeam.code}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={competition.firstLegHomeGoals ?? 0}
                    onChange={(e) =>
                      onChangeCompetition({
                        ...competition,
                        firstLegHomeGoals: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full bg-slate-950/90 light:bg-white border border-white/15 light:border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white light:text-slate-900 shadow-xs"
                  />
                </label>
                <label className="flex-1 flex flex-col gap-1">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                    Leg 1 · {awayTeam.code}
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={competition.firstLegAwayGoals ?? 0}
                    onChange={(e) =>
                      onChangeCompetition({
                        ...competition,
                        firstLegAwayGoals: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="w-full bg-slate-950/90 light:bg-white border border-white/15 light:border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white light:text-slate-900 shadow-xs"
                  />
                </label>
              </div>
            ) : (
              <label className="flex flex-col gap-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                  Stage / Round Label
                </span>
                <input
                  type="text"
                  value={competition.stageLabel}
                  onChange={(e) =>
                    onChangeCompetition({ ...competition, stageLabel: e.target.value })
                  }
                  className="bg-slate-950/90 light:bg-white border border-white/15 light:border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-white light:text-slate-900 shadow-xs"
                />
              </label>
            )}

            {/* Official Scheduled Competition Fixture Loader */}
            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                Competition Schedule ({selectedServerComp?.fixtures?.length || 0} Fixtures)
              </span>
              <select
                value={competition.fixtureId || ''}
                onChange={(e) => {
                  const fixId = e.target.value;
                  if (!fixId) {
                    onChangeCompetition({ ...competition, fixtureId: undefined });
                    return;
                  }
                  const fix = selectedServerComp?.fixtures?.find((f) => f.id === fixId);
                  if (!fix) return;
                  const h = allTeams.find((t) => t.id === fix.homeTeamId);
                  const a = allTeams.find((t) => t.id === fix.awayTeamId);
                  if (h) onChangeTeam('home', h);
                  if (a) onChangeTeam('away', a);
                  onChangeCompetition({
                    ...competition,
                    fixtureId: fix.id,
                    stageLabel: fix.round,
                    isKnockout: fix.isKnockout,
                    allowExtraTime: fix.isKnockout,
                    allowPenalties: fix.isKnockout,
                    isTwoLegged: fix.isTwoLegged,
                    legNumber: fix.legNumber,
                    firstLegHomeGoals: fix.firstLegHomeGoals,
                    firstLegAwayGoals: fix.firstLegAwayGoals,
                  });
                }}
                className="bg-slate-950/90 light:bg-white border border-white/15 light:border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-white light:text-slate-900 shadow-xs"
              >
                <option value="">Custom Matchup ({homeTeam.code} vs {awayTeam.code})</option>
                {(selectedServerComp?.fixtures || []).map((fix) => {
                  const h = allTeams.find((t) => t.id === fix.homeTeamId);
                  const a = allTeams.find((t) => t.id === fix.awayTeamId);
                  return (
                    <option key={fix.id} value={fix.id}>
                      {fix.round}: {h?.code || fix.homeTeamId} vs {a?.code || fix.awayTeamId}{' '}
                      {fix.settled ? `[Settled ${fix.homeScore}-${fix.awayScore}]` : '[Open]'}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
        </div>

        {/* Atmospheric Two-Team Dugout Banner */}
        <div
          className="rounded-2xl border border-white/15 overflow-hidden relative"
          style={{
            background: `linear-gradient(90deg, ${homeColor}38 0%, rgba(7,12,24,0.96) 50%, ${awayColor}38 100%)`,
          }}
        >
          <div className="px-4 py-1.5 border-b border-white/[0.06] light:border-slate-200 flex items-center justify-center gap-2 text-[10px] font-mono tracking-[0.22em] text-slate-300 light:text-slate-700 font-bold uppercase">
            <span>DUGOUT</span>
            <span>·</span>
            <span>PRE-MATCH</span>
            <span>·</span>
            <span>{competition.competitionName}</span>
          </div>

          <div className="p-3 grid grid-cols-1 landscape-mobile:grid-cols-[1fr_auto_1fr] lg:grid-cols-[1fr_auto_1fr] items-center gap-3">
            {/* Home Dressing Room Switcher Card */}
            <div
              onClick={() => {
                setActiveRoom('home');
                setSelectedSlotIdx(null);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setActiveRoom('home')}
              className={`rounded-xl p-3 border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                activeRoom === 'home'
                  ? 'bg-slate-950/80 light:bg-white border-white/50 light:border-cyan-600 shadow-lg'
                  : 'bg-slate-950/45 light:bg-white/80 border-white/10 light:border-slate-200 hover:border-white/25 light:hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-slate-900/90 light:bg-slate-100 border border-white/15 light:border-slate-200 p-1.5 shrink-0 flex items-center justify-center">
                  <TeamEmblem team={homeTeam} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-white light:text-slate-900 truncate">
                      {homeTeam.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTeamPickerSide(showTeamPickerSide === 'home' ? null : 'home');
                        setTeamSearch('');
                      }}
                      className="text-[10px] font-mono uppercase text-cyan-300 light:text-cyan-700 font-semibold hover:underline shrink-0 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="px-2 py-0.5 rounded font-mono text-[10px] font-black"
                      style={{
                        backgroundColor: homeColor,
                        color: isLightHex(homeColor) ? '#050A12' : '#FFFFFF',
                      }}
                    >
                      {homeSetup.formation}
                    </span>
                    <span className="font-mono text-[11px] text-slate-300 light:text-slate-700 font-bold tabular-nums">
                      {homeAvg} AVG
                    </span>
                    <span className="text-[11px] text-slate-400 light:text-slate-600 truncate hidden sm:inline">
                      · {homeTeam.manager || 'No manager'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 11-segment readiness bar */}
              <div className="flex items-center gap-0.5 shrink-0" title={`${homeSetCount}/11 set`}>
                {Array.from({ length: 11 }, (_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-5 rounded-sm transition-colors ${
                      i < homeSetCount ? 'bg-emerald-400' : 'bg-white/15 light:bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Center Swap Indicator */}
            <div className="hidden landscape-mobile:flex lg:flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-slate-950/90 light:bg-white border border-white/15 light:border-slate-300 flex items-center justify-center text-[10px] font-mono font-black text-slate-400 light:text-slate-600 shadow-xs">
                VS
              </div>
            </div>

            {/* Away Dressing Room Switcher Card */}
            <div
              onClick={() => {
                setActiveRoom('away');
                setSelectedSlotIdx(null);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setActiveRoom('away')}
              className={`rounded-xl p-3 border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                activeRoom === 'away'
                  ? 'bg-slate-950/80 light:bg-white border-white/50 light:border-cyan-600 shadow-lg'
                  : 'bg-slate-950/45 light:bg-white/80 border-white/10 light:border-slate-200 hover:border-white/25 light:hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-slate-900/90 light:bg-slate-100 border border-white/15 light:border-slate-200 p-1.5 shrink-0 flex items-center justify-center">
                  <TeamEmblem team={awayTeam} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-white light:text-slate-900 truncate">
                      {awayTeam.name}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTeamPickerSide(showTeamPickerSide === 'away' ? null : 'away');
                        setTeamSearch('');
                      }}
                      className="text-[10px] font-mono uppercase text-cyan-300 light:text-cyan-700 font-semibold hover:underline shrink-0 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="px-2 py-0.5 rounded font-mono text-[10px] font-black"
                      style={{
                        backgroundColor: awayColor,
                        color: isLightHex(awayColor) ? '#050A12' : '#FFFFFF',
                      }}
                    >
                      {awaySetup.formation}
                    </span>
                    <span className="font-mono text-[11px] text-slate-300 light:text-slate-700 font-bold tabular-nums">
                      {awayAvg} AVG
                    </span>
                    <span className="text-[11px] text-slate-400 light:text-slate-600 truncate hidden sm:inline">
                      · {awayTeam.manager || 'No manager'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-0.5 shrink-0" title={`${awaySetCount}/11 set`}>
                {Array.from({ length: 11 }, (_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-5 rounded-sm transition-colors ${
                      i < awaySetCount ? 'bg-emerald-400' : 'bg-white/15 light:bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Dual team color bottom accent strip */}
          <div className="grid grid-cols-2 h-1">
            <div style={{ backgroundColor: homeColor }} />
            <div style={{ backgroundColor: awayColor }} />
          </div>
        </div>

        {/* Inline Team Picker Drawer if requested */}
        {showTeamPickerSide && (
          <div className="rounded-xl bg-[#071121] light:bg-white border border-cyan-400/35 light:border-cyan-500/40 p-4 space-y-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-cyan-300 light:text-cyan-800">
                Select {showTeamPickerSide === 'home' ? 'Home' : 'Away'} Team
              </span>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && teamSearch.trim()) {
                      const firstAvailable = filteredPickerTeams.find(
                        (t) =>
                          !(showTeamPickerSide === 'home' && t.id === awayTeam.id) &&
                          !(showTeamPickerSide === 'away' && t.id === homeTeam.id)
                      );
                      if (firstAvailable && showTeamPickerSide) {
                        e.preventDefault();
                        onChangeTeam(showTeamPickerSide, firstAvailable);
                        setShowTeamPickerSide(null);
                      }
                    }
                  }}
                  placeholder="Search club or nation..."
                  className="w-full bg-slate-950 light:bg-slate-50 border border-white/15 light:border-slate-300 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white light:text-slate-900 placeholder:text-slate-500 shadow-xs focus:outline-none focus:border-[#7ADBF0]"
                />
                {teamSearch && (
                  <button
                    type="button"
                    onClick={() => setTeamSearch('')}
                    className="p-0.5 text-slate-400 hover:text-white light:hover:text-slate-900 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                    aria-label="Clear team search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 landscape-mobile:grid-cols-4 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 landscape-mobile:max-h-36 overflow-y-auto pr-1">
              {filteredPickerTeams.map((t) => {
                const disabled =
                  (showTeamPickerSide === 'home' && t.id === awayTeam.id) ||
                  (showTeamPickerSide === 'away' && t.id === homeTeam.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onChangeTeam(showTeamPickerSide, t);
                      setShowTeamPickerSide(null);
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                      disabled
                        ? 'opacity-40 cursor-not-allowed border-white/5 bg-slate-950/30'
                        : 'bg-slate-950/75 light:bg-slate-50 border-white/10 light:border-slate-200 hover:border-cyan-400/50 light:hover:border-cyan-500 cursor-pointer shadow-xs'
                    }`}
                  >
                    <div className="w-6 h-6 shrink-0">
                      <TeamEmblem team={t} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-white light:text-slate-900 truncate">{t.shortName}</div>
                      <div className="font-mono text-[9px] text-slate-400 light:text-slate-600">
                        {t.code} · {t.overallRating}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Dressing Room Workspace: Starting XI Pitch + Shape Selector + Bench */}
        <div className="grid grid-cols-1 landscape-mobile:grid-cols-[290px_1fr] lg:grid-cols-[360px_1fr] gap-5 landscape-mobile:gap-3.5 items-start">
          {/* Left Panel: Starting XI Pitch + Interactive Player Swap */}
          <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-600">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{activeTeam.code} STARTING XI</span>
                </div>
                <div className="text-xs font-mono font-bold text-emerald-400 light:text-emerald-700 mt-0.5">
                  {activeSetup.formation} · {activeRoom === 'home' ? homeAvg : awayAvg} rating ·{' '}
                  {activeRoom === 'home' ? homeSetCount : awaySetCount}/11 set
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleBestXi}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.06] light:bg-slate-100 hover:bg-white/[0.12] light:hover:bg-slate-200 border border-white/15 light:border-slate-300 text-[11px] font-bold text-white light:text-slate-900 cursor-pointer shadow-xs"
                >
                  <Shuffle className="w-3.5 h-3.5 text-cyan-300 light:text-cyan-700" />
                  <span>Best XI</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetRoom}
                  title="Reset XI & Tactics"
                  className="p-1.5 rounded-lg bg-white/[0.05] light:bg-slate-100 hover:bg-white/[0.12] light:hover:bg-slate-200 border border-white/15 light:border-slate-300 text-slate-300 light:text-slate-700 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Starting XI Pitch */}
            <div className="relative w-full aspect-[4/4.8] rounded-xl overflow-hidden border border-white/10 bg-[#0D2B1B] select-none shadow-inner">
              <div
                className="absolute inset-0 pointer-events-none opacity-45"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(to bottom, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 38px, transparent 38px, transparent 76px)',
                }}
              />
              <div className="absolute inset-3 border border-white/20 rounded pointer-events-none" />
              <div className="absolute top-1/2 inset-x-3 h-px bg-white/20 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/20 pointer-events-none" />
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-12 border-b border-x border-white/20 pointer-events-none" />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-32 h-12 border-t border-x border-white/20 pointer-events-none" />

              {activeSetup.slots.map((slot) => {
                const p = slot.player;
                const isSelected = selectedSlotIdx === slot.slotIndex;
                const isCover = Boolean(
                  p && normalizePositionDetail(p.positionDetail, p.position) !== slot.node.posReq
                );
                const outOfPos = Boolean(p && getPositionalCompatibilityScore(p, slot.node) < 0);

                return (
                  <button
                    key={slot.slotIndex}
                    type="button"
                    onClick={() => handleClickPitchSlot(slot.slotIndex)}
                    style={{ left: `${slot.node.x}%`, top: `${slot.node.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer transition-transform ${
                      isSelected ? 'scale-115 z-20' : 'hover:scale-105 z-10'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-[11px] font-black shadow-lg relative ${
                        isSelected
                          ? 'ring-2 ring-amber-400 border-2 border-white'
                          : outOfPos
                          ? 'border-2 border-amber-400'
                          : p
                          ? 'border-2 border-white'
                          : 'border-2 border-dashed border-white/40 bg-black/50 text-white/60'
                      }`}
                      style={
                        p
                          ? {
                              backgroundColor: activeAccent,
                              color: isLightHex(activeAccent) ? '#050A12' : '#FFFFFF',
                            }
                          : undefined
                      }
                    >
                      {p ? p.shirtNumber : '—'}
                      {p?.isCaptain && (
                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[8px] font-black flex items-center justify-center">
                          C
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 px-1 rounded bg-black/65 text-[9px] font-bold text-white truncate max-w-[68px] leading-tight">
                      {p ? p.shortName || getPlayerDisplayName(p) : 'Vacant'}
                    </span>
                    <span
                      className={`font-mono text-[8px] font-bold px-1 rounded leading-tight ${
                        outOfPos
                          ? 'text-amber-300 bg-amber-950/80'
                          : isCover
                          ? 'text-cyan-300 bg-black/60'
                          : 'text-slate-300 bg-black/50'
                      }`}
                    >
                      {slot.node.role}
                      {p ? ` · ${p.overallRating}` : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 light:text-slate-600 leading-snug">
              {selectedSlotIdx !== null
                ? `Selected ${activeSetup.slots[selectedSlotIdx]?.node.role} (${
                    activeSetup.slots[selectedSlotIdx]?.player?.shortName || 'Vacant'
                  }). Tap another pitch node or a bench player below to swap.`
                : 'Tap any pitch player to swap positions or bring on a player from the dressing room bench.'}
            </p>
          </div>

          {/* Right Panel: Formation Shape Selector + Plan A/B/C + Tactical Instructions + Dressing Room Bench */}
          <div className="space-y-4">
            {/* SHAPE Selector */}
            <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-white light:text-slate-900">
                  {activeTeam.name} Shape
                </span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-400 light:text-emerald-700">
                  {activeCategoryLabel}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {SHAPE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setShapeCategory(cat)}
                    className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold tracking-wider uppercase border transition-all cursor-pointer ${
                      shapeCategory === cat
                        ? 'bg-cyan-500/15 light:bg-cyan-50 border-cyan-400 light:border-cyan-600 text-cyan-200 light:text-cyan-900 font-bold'
                        : 'bg-white/[0.02] light:bg-slate-100 border-white/10 light:border-slate-200 text-slate-400 light:text-slate-700 hover:text-white light:hover:text-slate-950'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 landscape-mobile:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                {filteredFormations.map((f) => (
                  <MiniFormationPitch
                    key={f}
                    formation={f}
                    family={FORMATION_TEMPLATES[f]?.family || 'TACTICAL'}
                    selected={activeSetup.formation === f}
                    accentColor={activeAccent}
                    onSelect={() => handleSelectFormation(f)}
                  />
                ))}
              </div>
            </div>

            {/* Tactical Plans (Plan A / B / C) + Expandable Instructions */}
            <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 space-y-3 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                  <span className="font-mono text-xs font-bold uppercase tracking-widest text-white light:text-slate-900">
                    Tactical Plans & Instructions
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setInstructionsExpanded((p) => !p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/[0.05] light:bg-slate-100 hover:bg-white/[0.1] light:hover:bg-slate-200 border border-white/15 light:border-slate-300 text-[11px] font-semibold text-cyan-300 light:text-cyan-800 cursor-pointer shadow-xs"
                >
                  <span>{instructionsExpanded ? 'Hide Instructions' : 'Edit Instructions'}</span>
                  {instructionsExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Plan A / B / C Selector */}
              <div className="grid grid-cols-1 landscape-mobile:grid-cols-3 sm:grid-cols-3 gap-2">
                {(['A', 'B', 'C'] as SimPlanId[]).map((pid) => {
                  const p = activeSetup.plans[pid];
                  const isActive = activeSetup.activePlan === pid;
                  return (
                    <button
                      key={pid}
                      type="button"
                      onClick={() => handleSelectPlan(pid)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 light:bg-cyan-50/70 border-cyan-400/70 light:border-cyan-600 shadow-sm'
                          : 'bg-slate-950/60 light:bg-slate-50 border-white/10 light:border-slate-200 hover:border-white/25 light:hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-black uppercase text-cyan-300 light:text-cyan-800">
                          Plan {pid}
                        </span>
                        <span className="font-mono text-[10px] text-slate-300 light:text-slate-700 font-bold">
                          {p.formation}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-white light:text-slate-900 truncate mt-0.5">
                        {p.mentalitySettings.mentality} · {p.playingStyle}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Expandable Tactical Sliders & Mentality Dropdowns */}
              {instructionsExpanded && (
                <div className="pt-3 border-t border-white/10 light:border-slate-200 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {(
                      [
                        { key: 'pressingIntensity', label: 'Pressing Intensity' },
                        { key: 'buildUpSpeed', label: 'Build-Up Speed' },
                        { key: 'defensiveLine', label: 'Defensive Line' },
                        { key: 'width', label: 'Attacking Width' },
                      ] as const
                    ).map((slider) => (
                      <label key={slider.key} className="flex flex-col gap-1">
                        <div className="flex justify-between font-mono text-[10px] text-slate-300 light:text-slate-700">
                          <span>{slider.label}</span>
                          <span className="font-bold text-cyan-300 light:text-cyan-700">{activePlan[slider.key]}</span>
                        </div>
                        <input
                          type="range"
                          min={20}
                          max={99}
                          value={activePlan[slider.key]}
                          onChange={(e) =>
                            updateActivePlanField({ [slider.key]: Number(e.target.value) })
                          }
                          className="accent-cyan-400 cursor-pointer"
                        />
                      </label>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      {
                        label: 'Mentality',
                        field: 'mentality' as const,
                        options: ['Cautious', 'Disciplined', 'Balanced', 'Positive', 'Attacking'],
                      },
                      {
                        label: 'Build-Up',
                        field: 'buildUp' as const,
                        options: ['Short & patient', 'Mixed progression', 'Direct passing'],
                      },
                      {
                        label: 'Chance Creation',
                        field: 'chanceCreation' as const,
                        options: ['Through balls', 'Crosses & half-spaces', 'Counter-attacks', 'Possession patience'],
                      },
                      {
                        label: 'Pressing Label',
                        field: 'pressingIntensityLabel' as const,
                        options: ['Low press', 'Medium press', 'High press', 'Extreme press'],
                      },
                      {
                        label: 'Tempo',
                        field: 'tempo' as const,
                        options: ['Controlled', 'Standard', 'Fast'],
                      },
                      {
                        label: 'Transition',
                        field: 'attackingTransition' as const,
                        options: ['Retain possession', 'Balanced transition', 'Counter-attack quickly'],
                      },
                    ].map((ctl) => (
                      <label key={ctl.field} className="flex flex-col gap-1">
                        <span className="font-mono text-[10px] uppercase text-slate-400 light:text-slate-600">
                          {ctl.label}
                        </span>
                        <select
                          value={activePlan.mentalitySettings[ctl.field]}
                          onChange={(e) =>
                            updateActivePlanField({
                              mentalitySettings: {
                                ...activePlan.mentalitySettings,
                                [ctl.field]: e.target.value,
                              },
                            })
                          }
                          className="bg-slate-950 light:bg-slate-50 border border-white/15 light:border-slate-300 rounded-lg px-2 py-1 text-xs text-white light:text-slate-900 shadow-xs"
                        >
                          {ctl.options.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Dressing Room Substitutes & Squad Depth */}
            <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-widest text-white light:text-slate-900">
                  {activeTeam.code} Dressing Room Bench ({activeSetup.bench.length})
                </span>
                <span className="font-mono text-[10px] text-slate-400 light:text-slate-600">
                  {selectedSlotIdx !== null
                    ? 'Click a player to place into selected slot'
                    : 'Click any sub to auto-swap into XI'}
                </span>
              </div>

              <div className="grid grid-cols-2 landscape-mobile:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-40 landscape-mobile:max-h-32 overflow-y-auto pr-1">
                {activeSetup.bench.map((player) => {
                  const injured = player.injuryStatus === 'injured';
                  const doubtful = player.injuryStatus === 'doubtful';
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => handleSwapBenchPlayer(player)}
                      className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 shadow-xs ${
                        injured
                          ? 'bg-rose-950/30 light:bg-rose-50 border-rose-500/30 light:border-rose-300 hover:border-rose-400'
                          : 'bg-slate-950/75 light:bg-slate-50 border-white/10 light:border-slate-200 hover:border-cyan-400/50 light:hover:border-cyan-500'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-white light:text-slate-900 truncate">
                          {player.shortName || getPlayerDisplayName(player)}
                        </div>
                        <div className="font-mono text-[9px] text-slate-400 light:text-slate-600 flex items-center gap-1">
                          <span>#{player.shirtNumber}</span>
                          <span>·</span>
                          <span>{player.positionDetail}</span>
                          {injured && <span className="text-rose-400 light:text-rose-600 font-bold">INJ</span>}
                          {doubtful && <span className="text-amber-400 light:text-amber-600 font-bold">DOUBT</span>}
                        </div>
                      </div>
                      <span className="font-mono text-xs font-black text-cyan-300 light:text-cyan-700 shrink-0">
                        {player.overallRating}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Tactical Brief Comparing Both Teams */}
        <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 landscape-mobile:p-3 grid grid-cols-1 landscape-mobile:grid-cols-3 md:grid-cols-3 gap-4 landscape-mobile:gap-3 items-center shadow-xs">
          {(() => {
            const homePenTaker = selectInMatchPenaltyTaker(
              homeSetup.penaltyOrderIds?.length ? homeSetup.penaltyOrderIds : homeTeam.penaltyOrderIds,
              homeTeam.id,
              homeSetup.slots
                .map((s) => s.player)
                .filter((p): p is Player => Boolean(p))
                .map((player) => ({
                  player,
                  onPitch: true,
                  sentOff: false,
                  injuryStatus: player.injuryStatus,
                }))
            );
            const awayPenTaker = selectInMatchPenaltyTaker(
              awaySetup.penaltyOrderIds?.length ? awaySetup.penaltyOrderIds : awayTeam.penaltyOrderIds,
              awayTeam.id,
              awaySetup.slots
                .map((s) => s.player)
                .filter((p): p is Player => Boolean(p))
                .map((player) => ({
                  player,
                  onPitch: true,
                  sentOff: false,
                  injuryStatus: player.injuryStatus,
                }))
            );
            return (
              <>
                <div className="space-y-1.5">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-600">
                    {homeTeam.code} Tactical Brief
                  </div>
                  <div className="text-xs font-bold text-white light:text-slate-900">
                    {homeSetup.formation} · {homeSetup.plans[homeSetup.activePlan].playingStyle}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 light:text-slate-600">
                    ATT {homeTeam.attackRating} · MID {homeTeam.midfieldRating} · DEF {homeTeam.defenceRating}
                  </div>
                  {homePenTaker && (
                    <div className="font-mono text-[10px] text-amber-300/90 light:text-amber-700 font-medium">
                      1st Pen Taker: {homePenTaker.player.shortName || getPlayerDisplayName(homePenTaker.player)}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-slate-300 light:text-slate-700 font-bold">
                    <span>{homeTeam.code} {preOdds.homeWinPct}%</span>
                    <span>DRAW {preOdds.drawPct}%</span>
                    <span>{preOdds.awayWinPct}% {awayTeam.code}</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden flex bg-slate-900 light:bg-slate-200 border border-white/10 light:border-slate-300">
                    <div style={{ width: `${preOdds.homeWinPct}%`, backgroundColor: homeColor }} />
                    <div style={{ width: `${preOdds.drawPct}%`, backgroundColor: '#64748B' }} />
                    <div style={{ width: `${preOdds.awayWinPct}%`, backgroundColor: awayColor }} />
                  </div>
                  <div className="text-center font-mono text-[10px] text-slate-400 light:text-slate-600">
                    Projected xG: {preOdds.projectedHomeXg} – {preOdds.projectedAwayXg}
                  </div>
                </div>

                <div className="space-y-1.5 md:text-right">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-600">
                    {awayTeam.code} Tactical Brief
                  </div>
                  <div className="text-xs font-bold text-white light:text-slate-900">
                    {awaySetup.formation} · {awaySetup.plans[awaySetup.activePlan].playingStyle}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400 light:text-slate-600">
                    ATT {awayTeam.attackRating} · MID {awayTeam.midfieldRating} · DEF {awayTeam.defenceRating}
                  </div>
                  {awayPenTaker && (
                    <div className="font-mono text-[10px] text-amber-300/90 light:text-amber-700 font-medium">
                      1st Pen Taker: {awayPenTaker.player.shortName || getPlayerDisplayName(awayPenTaker.player)}
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </div>

        {/* Sticky Kick-Off Bar */}
        <div className="sticky bottom-2 landscape-mobile:static z-30 rounded-2xl bg-[#040914]/95 light:bg-white/95 backdrop-blur-md border border-white/15 light:border-slate-300 px-4 py-3 landscape-mobile:py-2 shadow-2xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-bold ${
                isReady ? 'text-emerald-400 light:text-emerald-700' : 'text-amber-400 light:text-amber-700'
              }`}
            >
              {isReady ? (
                <ShieldCheck className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              <span>
                {isReady
                  ? 'Squads Ready (11v11 Validated)'
                  : `Incomplete XI (${homeSetCount}/11 vs ${awaySetCount}/11)`}
              </span>
            </div>

            {/* Seed Input + Randomize */}
            <div className="flex items-center gap-1.5 bg-slate-950 light:bg-slate-100 border border-white/15 light:border-slate-300 rounded-lg px-2.5 py-1 shadow-xs">
              <span className="font-mono text-[10px] uppercase text-slate-400 light:text-slate-600">Seed</span>
              <input
                type="text"
                value={seed}
                onChange={(e) => onChangeSeed(e.target.value.toUpperCase())}
                className="w-24 bg-transparent font-mono text-xs font-bold text-cyan-300 light:text-cyan-800 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => onChangeSeed(generateRandomSeed())}
                title="Randomize Seed"
                className="text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-950 cursor-pointer"
              >
                <Dices className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Presentation Mode */}
            <div className="flex items-center gap-1 bg-slate-950 light:bg-slate-100 border border-white/15 light:border-slate-300 rounded-lg p-1 shadow-xs">
              {(
                [
                  { id: 'live', label: 'Live' },
                  { id: 'highlights', label: 'Highlights' },
                  { id: 'next-break', label: 'Next Break' },
                  { id: 'instant', label: 'Instant' },
                ] as Array<{ id: SimPresentationMode; label: string }>
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChangeStartMode(m.id)}
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                    startMode === m.id
                      ? 'bg-cyan-500 text-slate-950 shadow-xs'
                      : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-950'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!isReady}
            onClick={onKickOff}
            className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-display font-black text-sm uppercase tracking-widest transition-all ${
              isReady
                ? isUcl
                  ? 'bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 text-slate-950 shadow-[0_0_25px_rgba(34,211,238,0.45)] hover:scale-[1.02] cursor-pointer'
                  : 'bg-gradient-to-r from-[#C5A059] via-[#E5C384] to-[#C5A059] text-slate-950 shadow-[0_0_20px_rgba(197,160,89,0.4)] hover:scale-[1.02] cursor-pointer'
                : 'bg-slate-800 light:bg-slate-200 text-slate-500 light:text-slate-400 cursor-not-allowed'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Kick Off Match</span>
          </button>
        </div>
      </div>
    </div>
  );
};
