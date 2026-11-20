import React, { useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Crown,
  FastForward,
  GitBranch,
  LayoutGrid,
  Lock,
  MonitorPlay,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Trophy,
  X,
} from 'lucide-react';
import type {
  CompetitionFixtureMatch,
  CompetitionMakerTournament,
  CompetitionStageRuntime,
} from '../../../types/competitionMaker';
import type { Team } from '../../../types/matchCentre';
import { isStageLocked } from '../../../utils/competitionEngine';
import { TeamEmblem } from '../TeamEmblem';
import { TrophyArtwork } from './TrophyArtwork';

export interface ResolvedBracketTeam {
  id: string;
  name: string;
  shortName: string;
  code: string;
  crestUrl: string;
  primaryColor: string;
  country: string;
  overallRating: number;
  managerName: string | null;
  teamObj?: Team;
}

interface KnockoutBracketViewProps {
  tournament: CompetitionMakerTournament;
  knockoutStages: CompetitionStageRuntime[];
  busyAction: string | null;
  resolveTeamDisplay: (teamId: string | null) => ResolvedBracketTeam | null;
  onLaunchInSimulator: (fixture: CompetitionFixtureMatch, autoStartLive: boolean) => void;
  onQuickSimFixture: (fixtureId: string) => Promise<void>;
  onSimulateBatch: (
    label: string,
    scope: 'match' | 'matchday' | 'stage' | 'knockout' | 'tournament',
    stageOrder?: number
  ) => Promise<void>;
  onOpenTelemetry: (fixture: CompetitionFixtureMatch) => void;
  onResetFixture: (fixtureId: string) => Promise<void>;
  onOpenTeamCabinet: (teamId: string) => void;
}

interface BracketTieGroup {
  tieKey: string;
  stageOrder: number;
  stageName: string;
  roundIndex: number;
  roundLabel: string;
  legs: CompetitionFixtureMatch[];
  leg1: CompetitionFixtureMatch;
  leg2?: CompetitionFixtureMatch;
  isThirdPlace: boolean;
  isFinal: boolean;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homePlaceholder?: string;
  awayPlaceholder?: string;
  winnerId: string | null;
  isCompleted: boolean;
  isPartiallyPlayed: boolean;
  aggHome: number | null;
  aggAway: number | null;
  nextPlayableFixture: CompetitionFixtureMatch | null;
}

interface BracketColumn {
  columnKey: string;
  stageOrder: number;
  stageName: string;
  roundIndex: number;
  roundLabel: string;
  stageLocked: boolean;
  ties: BracketTieGroup[];
}

function buildTieGroupsForRound(
  stage: CompetitionStageRuntime,
  roundIndex: number,
  fixtures: CompetitionFixtureMatch[]
): BracketTieGroup[] {
  const tieMap = new Map<string, CompetitionFixtureMatch[]>();
  for (const m of fixtures) {
    const key = m.tieId || m.id;
    const list = tieMap.get(key) || [];
    list.push(m);
    tieMap.set(key, list);
  }

  return Array.from(tieMap.entries()).map(([tieKey, legs]) => {
    const sortedLegs = [...legs].sort((a, b) => a.legNumber - b.legNumber);
    const leg1 = sortedLegs.find((l) => l.legNumber === 1) || sortedLegs[0];
    const leg2 = sortedLegs.find((l) => l.legNumber === 2);

    const isCompleted = sortedLegs.every((l) => l.status === 'completed');
    const isPartiallyPlayed =
      !isCompleted && sortedLegs.some((l) => l.status === 'completed');
    const winnerId = (leg2 ? leg2.winnerTeamId : leg1.winnerTeamId) || null;

    let aggHome: number | null = null;
    let aggAway: number | null = null;
    if (leg2) {
      if (leg1.status === 'completed' && leg2.status === 'completed') {
        aggHome = (leg1.homeScore ?? 0) + (leg2.awayScore ?? 0);
        aggAway = (leg1.awayScore ?? 0) + (leg2.homeScore ?? 0);
      } else if (leg1.status === 'completed') {
        aggHome = leg1.homeScore ?? 0;
        aggAway = leg1.awayScore ?? 0;
      }
    } else if (leg1.status === 'completed') {
      aggHome = leg1.homeScore ?? 0;
      aggAway = leg1.awayScore ?? 0;
    }

    const nextPlayableFixture =
      sortedLegs.find((l) => l.status !== 'completed' && l.homeTeamId && l.awayTeamId) ||
      null;

    return {
      tieKey,
      stageOrder: stage.config.order,
      stageName: stage.config.name,
      roundIndex,
      roundLabel: leg1.roundLabel || stage.config.name,
      legs: sortedLegs,
      leg1,
      leg2,
      isThirdPlace: Boolean(leg1.isThirdPlace),
      isFinal: Boolean(leg1.isFinal),
      homeTeamId: leg1.homeTeamId,
      awayTeamId: leg1.awayTeamId,
      homePlaceholder: leg1.homePlaceholder,
      awayPlaceholder: leg1.awayPlaceholder,
      winnerId,
      isCompleted,
      isPartiallyPlayed,
      aggHome,
      aggAway,
      nextPlayableFixture,
    };
  });
}

function buildPreviewColumnsForLockedStage(
  stage: CompetitionStageRuntime,
  projectedTeamIds: string[]
): BracketColumn[] {
  const count = Math.max(2, stage.config.inputTeamCount || projectedTeamIds.length || 8);
  const advanceTarget = Math.max(1, stage.config.advanceCount || 1);
  const columns: BracketColumn[] = [];

  let activeTeams = count;
  let rIdx = 1;
  while (activeTeams > advanceTarget && rIdx <= 6) {
    const tieCount = Math.max(1, Math.floor(activeTeams / 2));
    const roundLabel =
      advanceTarget > 1
        ? stage.config.name
        : activeTeams === 2
        ? 'Final'
        : activeTeams === 4
        ? 'Semi-Finals'
        : activeTeams === 8
        ? 'Quarter-Finals'
        : activeTeams === 16
        ? 'Round of 16'
        : activeTeams === 32
        ? 'Round of 32'
        : `Round ${rIdx}`;

    const ties: BracketTieGroup[] = Array.from({ length: tieCount }).map((_, idx) => {
      const hId = rIdx === 1 ? projectedTeamIds[idx] || null : null;
      const aId =
        rIdx === 1
          ? projectedTeamIds[activeTeams - 1 - idx] || null
          : null;
      const placeholderFixture: CompetitionFixtureMatch = {
        id: `preview-${stage.config.order}-${rIdx}-${idx}`,
        stageId: stage.config.id,
        stageOrder: stage.config.order,
        stageName: stage.config.name,
        stageType: 'knockout',
        roundIndex: rIdx,
        roundLabel,
        legNumber: 1,
        isTwoLegged: Boolean(
          stage.config.twoLegged && !(stage.config.finalSingleLeg && activeTeams === 2)
        ),
        isKnockout: true,
        isFinal: activeTeams === 2 && advanceTarget === 1,
        homeTeamId: hId,
        awayTeamId: aId,
        homePlaceholder: hId ? undefined : rIdx === 1 ? `Seed #${idx + 1}` : `Winner R${rIdx - 1}-${idx * 2 + 1}`,
        awayPlaceholder: aId
          ? undefined
          : rIdx === 1
          ? `Seed #${activeTeams - idx}`
          : `Winner R${rIdx - 1}-${idx * 2 + 2}`,
        neutralVenue: activeTeams === 2,
        status: 'pending',
      };

      return {
        tieKey: placeholderFixture.id,
        stageOrder: stage.config.order,
        stageName: stage.config.name,
        roundIndex: rIdx,
        roundLabel,
        legs: [placeholderFixture],
        leg1: placeholderFixture,
        isThirdPlace: false,
        isFinal: Boolean(placeholderFixture.isFinal),
        homeTeamId: hId,
        awayTeamId: aId,
        homePlaceholder: placeholderFixture.homePlaceholder,
        awayPlaceholder: placeholderFixture.awayPlaceholder,
        winnerId: null,
        isCompleted: false,
        isPartiallyPlayed: false,
        aggHome: null,
        aggAway: null,
        nextPlayableFixture: null,
      };
    });

    columns.push({
      columnKey: `preview-${stage.config.order}-${rIdx}`,
      stageOrder: stage.config.order,
      stageName: stage.config.name,
      roundIndex: rIdx,
      roundLabel,
      stageLocked: true,
      ties,
    });

    activeTeams = Math.floor(activeTeams / 2);
    rIdx += 1;
  }

  return columns;
}

export const KnockoutBracketView: React.FC<KnockoutBracketViewProps> = ({
  tournament,
  knockoutStages,
  busyAction,
  resolveTeamDisplay,
  onLaunchInSimulator,
  onQuickSimFixture,
  onSimulateBatch,
  onOpenTelemetry,
  onResetFixture,
  onOpenTeamCabinet,
}) => {
  const [viewMode, setViewMode] = useState<'tree' | 'cards'>('tree');
  const [highlightedTeamId, setHighlightedTeamId] = useState<string | null>(null);
  const [selectedStageFilter, setSelectedStageFilter] = useState<'all' | number>('all');

  // Projected qualifiers from active league/group stage if knockout is still locked
  const projectedQualifiers = useMemo(() => {
    const preStage = tournament.stages.find((s) => s.config.type !== 'knockout');
    if (!preStage) return tournament.teamIds;
    if (preStage.qualifiedIds.length > 0) return preStage.qualifiedIds;
    if (preStage.standings && preStage.standings.length > 0) {
      const qualifyingRows = preStage.standings.filter(
        (r) => r.zone === 'direct' || r.zone === 'playoff' || r.zone === 'third-best'
      );
      if (qualifyingRows.length > 0) {
        return qualifyingRows.map((r) => r.teamId);
      }
      return preStage.standings.map((r) => r.teamId);
    }
    return preStage.participantIds.length > 0 ? preStage.participantIds : tournament.teamIds;
  }, [tournament]);

  // Build unified bracket columns across all knockout stages
  const { mainColumns, thirdPlaceTie, allBracketTeams } = useMemo(() => {
    const cols: BracketColumn[] = [];
    let foundThirdPlace: BracketTieGroup | null = null;
    const teamSet = new Set<string>();

    const targetStages =
      selectedStageFilter === 'all'
        ? knockoutStages
        : knockoutStages.filter((s) => s.config.order === selectedStageFilter);

    for (const ko of targetStages) {
      const locked = isStageLocked(tournament, ko.config.order);
      if (ko.fixtures.length === 0) {
        // Generate live projected bracket columns so the diagram is always rich & visual
        const projectedForStage =
          ko.participantIds.length > 0
            ? ko.participantIds
            : ko.config.order === 1 && knockoutStages.length > 1
            ? projectedQualifiers.slice(
                tournament.stages[0]?.config.directQualifyCount || 0,
                (tournament.stages[0]?.config.directQualifyCount || 0) + ko.config.inputTeamCount
              )
            : projectedQualifiers.slice(0, ko.config.inputTeamCount);
        projectedForStage.forEach((id) => teamSet.add(id));
        const previewCols = buildPreviewColumnsForLockedStage(ko, projectedForStage);
        cols.push(...previewCols);
        continue;
      }

      const roundIndices = Array.from(new Set(ko.fixtures.map((f) => f.roundIndex))).sort(
        (a, b) => a - b
      );

      for (const rIdx of roundIndices) {
        const roundFixtures = ko.fixtures.filter((f) => f.roundIndex === rIdx);
        const tieGroups = buildTieGroupsForRound(ko, rIdx, roundFixtures);

        const mainTies: BracketTieGroup[] = [];
        for (const t of tieGroups) {
          if (t.homeTeamId) teamSet.add(t.homeTeamId);
          if (t.awayTeamId) teamSet.add(t.awayTeamId);
          if (t.isThirdPlace) {
            foundThirdPlace = t;
          } else {
            mainTies.push(t);
          }
        }

        if (mainTies.length > 0) {
          cols.push({
            columnKey: `${ko.config.order}-${rIdx}`,
            stageOrder: ko.config.order,
            stageName: ko.config.name,
            roundIndex: rIdx,
            roundLabel: mainTies[0].roundLabel,
            stageLocked: locked,
            ties: mainTies,
          });
        }
      }
    }

    return {
      mainColumns: cols,
      thirdPlaceTie: foundThirdPlace,
      allBracketTeams: Array.from(teamSet),
    };
  }, [knockoutStages, selectedStageFilter, tournament, projectedQualifiers]);

  const totalKoFixtures = useMemo(
    () => knockoutStages.reduce((sum, s) => sum + s.fixtures.length, 0),
    [knockoutStages]
  );
  const completedKoFixtures = useMemo(
    () =>
      knockoutStages.reduce(
        (sum, s) => sum + s.fixtures.filter((f) => f.status === 'completed').length,
        0
      ),
    [knockoutStages]
  );
  const anyKnockoutUnlocked = useMemo(
    () => knockoutStages.some((s) => !isStageLocked(tournament, s.config.order)),
    [knockoutStages, tournament]
  );

  const renderTieNode = (tie: BracketTieGroup, stageLocked: boolean, compactTree: boolean) => {
    const h = resolveTeamDisplay(tie.homeTeamId);
    const a = resolveTeamDisplay(tie.awayTeamId);

    const homeWon = Boolean(tie.winnerId && tie.winnerId === tie.homeTeamId);
    const awayWon = Boolean(tie.winnerId && tie.winnerId === tie.awayTeamId);

    const isTeamHighlighted =
      highlightedTeamId !== null &&
      (tie.homeTeamId === highlightedTeamId || tie.awayTeamId === highlightedTeamId);
    const isDimmed = highlightedTeamId !== null && !isTeamHighlighted;

    // Win probability bar for upcoming ties with both teams known
    let homeWinProb = 50;
    if (h && a) {
      const ratingDelta = (h.overallRating - a.overallRating) * 2.4;
      const homeBoost = tie.leg1.neutralVenue ? 0 : (tournament.homeAdvantageBoost || 5) * 0.8;
      homeWinProb = Math.max(15, Math.min(85, Math.round(50 + ratingDelta + homeBoost)));
    }

    const leg1ScoreForHome = tie.leg1.status === 'completed' ? tie.leg1.homeScore ?? 0 : null;
    const leg1ScoreForAway = tie.leg1.status === 'completed' ? tie.leg1.awayScore ?? 0 : null;
    const leg2ScoreForHome =
      tie.leg2 && tie.leg2.status === 'completed' ? tie.leg2.awayScore ?? 0 : null;
    const leg2ScoreForAway =
      tie.leg2 && tie.leg2.status === 'completed' ? tie.leg2.homeScore ?? 0 : null;

    const penSummary =
      tie.leg2?.penaltyShootout?.summary || tie.leg1.penaltyShootout?.summary || null;
    const wentAet = Boolean(tie.leg2?.wentToExtraTime || tie.leg1.wentToExtraTime);

    return (
      <div
        key={tie.tieKey}
        className={`relative rounded-xl border transition-all duration-150 overflow-hidden ${
          isTeamHighlighted
            ? 'border-[#7ADBF0] bg-[#091526] light:bg-cyan-50/70 shadow-[0_0_24px_rgba(122,219,240,0.22)] ring-1 ring-[#7ADBF0]/50'
            : tie.isFinal
            ? 'border-amber-400/55 bg-gradient-to-b from-[#13110A] via-[#08101C] to-[#050A12] light:from-amber-50/80 light:to-white shadow-[0_10px_28px_rgba(0,0,0,0.45)]'
            : 'border-white/12 light:border-slate-200 bg-[#060C16] light:bg-white hover:border-white/25'
        } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
      >
        {/* Top Meta Header Strip */}
        <div className="px-3 py-1.5 border-b border-white/[0.07] light:border-slate-200 bg-[#040810] light:bg-slate-50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider text-slate-400 light:text-slate-600 truncate">
            {tie.isFinal ? (
              <span className="text-amber-300 light:text-amber-700 font-bold inline-flex items-center gap-1">
                <Crown className="w-3 h-3" />
                GRAND FINAL
              </span>
            ) : tie.isThirdPlace ? (
              <span className="text-amber-300 light:text-amber-700 font-bold">
                3RD-PLACE PLAY-OFF
              </span>
            ) : (
              <span>{tie.roundLabel}</span>
            )}
            {tie.leg2 && (
              <>
                <span>·</span>
                <span>2 LEGS</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0 font-mono text-[9px] uppercase">
            {penSummary ? (
              <span className="text-amber-300 light:text-amber-700 font-bold">PENS</span>
            ) : wentAet ? (
              <span className="text-[#7ADBF0] light:text-cyan-700 font-bold">AET</span>
            ) : tie.isCompleted ? (
              <span className="text-emerald-400 light:text-emerald-700 font-semibold">FT</span>
            ) : tie.isPartiallyPlayed ? (
              <span className="text-amber-300 light:text-amber-700 font-semibold">LEG 2 NEXT</span>
            ) : stageLocked ? (
              <span className="text-slate-500">PROJECTED</span>
            ) : (
              <span className="text-[#7ADBF0] light:text-cyan-700">UPCOMING</span>
            )}
          </div>
        </div>

        {/* Team Rows Container */}
        <div className="divide-y divide-white/[0.06] light:divide-slate-100">
          {/* HOME / TOP TEAM ROW */}
          <div
            onClick={() =>
              tie.homeTeamId &&
              setHighlightedTeamId((prev) => (prev === tie.homeTeamId ? null : tie.homeTeamId))
            }
            className={`px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
              tie.homeTeamId ? 'cursor-pointer' : ''
            } ${
              homeWon
                ? 'bg-emerald-500/[0.16] light:bg-emerald-500/15 text-emerald-100 light:text-emerald-950'
                : tie.isCompleted && !homeWon
                ? 'bg-transparent text-slate-400 light:text-slate-500'
                : 'hover:bg-white/[0.03] light:hover:bg-slate-50 text-white light:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className="w-1 h-5 rounded-full shrink-0"
                style={{
                  backgroundColor: homeWon
                    ? '#10B981'
                    : h?.primaryColor || '#334155',
                }}
              />
              {h ? (
                <TeamEmblem
                  team={h.teamObj}
                  crestUrl={h.crestUrl}
                  code={h.code}
                  className="w-5 h-5 shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full border border-dashed border-white/20 flex items-center justify-center font-mono text-[8px] text-slate-500 shrink-0">
                  ?
                </div>
              )}
              <span
                className={`text-xs truncate ${
                  homeWon ? 'font-bold text-emerald-200 light:text-emerald-900' : 'font-semibold'
                }`}
              >
                {compactTree
                  ? h?.shortName || tie.homePlaceholder || 'TBD'
                  : h?.name || tie.homePlaceholder || 'TBD'}
              </span>
              {homeWon && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600 shrink-0" />
              )}
            </div>

            {/* Score Columns (Leg 1, Leg 2, Aggregate) */}
            <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums shrink-0">
              {tie.leg2 && (leg1ScoreForHome !== null || leg2ScoreForHome !== null) && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400 light:text-slate-600">
                  <span className="w-4 text-center">{leg1ScoreForHome ?? '-'}</span>
                  <span>·</span>
                  <span className="w-4 text-center">{leg2ScoreForHome ?? '-'}</span>
                </div>
              )}
              <span
                className={`min-w-[24px] h-6 px-1.5 rounded flex items-center justify-center font-bold ${
                  homeWon
                    ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 light:bg-emerald-600 light:text-white'
                    : tie.aggHome !== null
                    ? 'bg-white/[0.06] light:bg-slate-100 text-slate-200 light:text-slate-800'
                    : 'text-slate-500'
                }`}
              >
                {tie.aggHome !== null ? tie.aggHome : h ? `${h.overallRating}` : '-'}
              </span>
            </div>
          </div>

          {/* AWAY / BOTTOM TEAM ROW */}
          <div
            onClick={() =>
              tie.awayTeamId &&
              setHighlightedTeamId((prev) => (prev === tie.awayTeamId ? null : tie.awayTeamId))
            }
            className={`px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
              tie.awayTeamId ? 'cursor-pointer' : ''
            } ${
              awayWon
                ? 'bg-emerald-500/[0.16] light:bg-emerald-500/15 text-emerald-100 light:text-emerald-950'
                : tie.isCompleted && !awayWon
                ? 'bg-transparent text-slate-400 light:text-slate-500'
                : 'hover:bg-white/[0.03] light:hover:bg-slate-50 text-white light:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                className="w-1 h-5 rounded-full shrink-0"
                style={{
                  backgroundColor: awayWon
                    ? '#10B981'
                    : a?.primaryColor || '#334155',
                }}
              />
              {a ? (
                <TeamEmblem
                  team={a.teamObj}
                  crestUrl={a.crestUrl}
                  code={a.code}
                  className="w-5 h-5 shrink-0"
                />
              ) : (
                <div className="w-5 h-5 rounded-full border border-dashed border-white/20 flex items-center justify-center font-mono text-[8px] text-slate-500 shrink-0">
                  ?
                </div>
              )}
              <span
                className={`text-xs truncate ${
                  awayWon ? 'font-bold text-emerald-200 light:text-emerald-900' : 'font-semibold'
                }`}
              >
                {compactTree
                  ? a?.shortName || tie.awayPlaceholder || 'TBD'
                  : a?.name || tie.awayPlaceholder || 'TBD'}
              </span>
              {awayWon && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600 shrink-0" />
              )}
            </div>

            <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums shrink-0">
              {tie.leg2 && (leg1ScoreForAway !== null || leg2ScoreForAway !== null) && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400 light:text-slate-600">
                  <span className="w-4 text-center">{leg1ScoreForAway ?? '-'}</span>
                  <span>·</span>
                  <span className="w-4 text-center">{leg2ScoreForAway ?? '-'}</span>
                </div>
              )}
              <span
                className={`min-w-[24px] h-6 px-1.5 rounded flex items-center justify-center font-bold ${
                  awayWon
                    ? 'bg-emerald-500/25 border border-emerald-400/50 text-emerald-200 light:bg-emerald-600 light:text-white'
                    : tie.aggAway !== null
                    ? 'bg-white/[0.06] light:bg-slate-100 text-slate-200 light:text-slate-800'
                    : 'text-slate-500'
                }`}
              >
                {tie.aggAway !== null ? tie.aggAway : a ? `${a.overallRating}` : '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Upcoming Win Probability Bar OR Shootout/Aggregate Sub-bar */}
        {!tie.isCompleted && h && a && !stageLocked && (
          <div className="px-3 pt-1.5 pb-1 bg-[#040810]/70 light:bg-slate-50 space-y-1">
            <div className="flex items-center justify-between font-mono text-[9px] text-slate-400 tabular-nums">
              <span>
                {h.code} {homeWinProb}%
              </span>
              <span>WIN PROBABILITY</span>
              <span>
                {100 - homeWinProb}% {a.code}
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/10 overflow-hidden flex">
              <div
                className="h-full transition-all"
                style={{
                  width: `${homeWinProb}%`,
                  backgroundColor: h.primaryColor || '#38BDF8',
                }}
              />
              <div
                className="h-full transition-all"
                style={{
                  width: `${100 - homeWinProb}%`,
                  backgroundColor: a.primaryColor || '#F59E0B',
                }}
              />
            </div>
          </div>
        )}

        {/* Action Controls Footer */}
        <div className="px-3 py-1.5 border-t border-white/[0.06] light:border-slate-200 bg-[#040810] light:bg-slate-50 flex items-center justify-between gap-2 text-[10px]">
          <span className="font-mono text-slate-400 light:text-slate-600 truncate">
            {penSummary
              ? penSummary
              : tie.leg2 && tie.isCompleted
              ? `Agg ${tie.aggHome}-${tie.aggAway}`
              : tie.isPartiallyPlayed
              ? `Leg 1: ${tie.leg1.homeScore}-${tie.leg1.awayScore}`
              : stageLocked
              ? 'Projected Seed'
              : h && a
              ? `OVR ${h.overallRating} vs ${a.overallRating}`
              : 'Awaiting qualifier'}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {tie.leg1.status === 'completed' && (
              <button
                type="button"
                onClick={() =>
                  onOpenTelemetry(
                    tie.leg2 && tie.leg2.status === 'completed' ? tie.leg2 : tie.leg1
                  )
                }
                className="px-2 py-0.5 rounded bg-white/[0.06] hover:bg-white/12 light:bg-slate-200 text-[#7ADBF0] light:text-cyan-800 font-semibold cursor-pointer"
              >
                Report
              </button>
            )}

            {!stageLocked && tie.nextPlayableFixture && (
              <>
                <button
                  type="button"
                  onClick={() => onLaunchInSimulator(tie.nextPlayableFixture!, false)}
                  className="px-1.5 py-0.5 rounded border border-white/15 hover:border-[#7ADBF0]/50 text-slate-200 light:text-slate-800 font-semibold cursor-pointer inline-flex items-center gap-1"
                  title="Prepare in tactical Dugout"
                >
                  <SlidersHorizontal className="w-2.5 h-2.5" />
                  <span>Prep</span>
                </button>
                <button
                  type="button"
                  onClick={() => onLaunchInSimulator(tie.nextPlayableFixture!, true)}
                  className="px-1.5 py-0.5 rounded border border-emerald-400/35 bg-emerald-500/10 text-emerald-300 light:text-emerald-700 font-semibold cursor-pointer inline-flex items-center gap-1"
                  title="Watch Live Simulation"
                >
                  <MonitorPlay className="w-2.5 h-2.5" />
                  <span>Live</span>
                </button>
                <button
                  type="button"
                  disabled={Boolean(busyAction)}
                  onClick={() => onQuickSimFixture(tie.nextPlayableFixture!.id)}
                  className="px-2 py-0.5 rounded bg-[#7ADBF0] text-slate-950 font-bold hover:bg-[#9CE7F7] disabled:opacity-40 cursor-pointer inline-flex items-center gap-0.5"
                >
                  <Play className="w-2.5 h-2.5" />
                  <span>{busyAction === tie.nextPlayableFixture.id ? '...' : 'Sim'}</span>
                </button>
              </>
            )}

            {tie.isCompleted && !stageLocked && (
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() =>
                  onResetFixture(tie.leg2 ? tie.leg2.id : tie.leg1.id)
                }
                className="p-1 rounded text-slate-400 hover:text-rose-400 cursor-pointer"
                title="Reset tie result"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* ================================================================== */}
      {/* BRACKET COMMAND HEADER & TEAM PATH TRACKER                         */}
      {/* ================================================================== */}
      <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl border border-amber-400/40 bg-amber-500/10 flex items-center justify-center text-amber-300 shrink-0">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-amber-300 light:text-amber-700">
                <span>ROAD TO THE FINAL</span>
                <span>·</span>
                <span className="tabular-nums">
                  {totalKoFixtures > 0
                    ? `${completedKoFixtures}/${totalKoFixtures} KNOCKOUT MATCHES SETTLED`
                    : 'PROJECTED BRACKET TREE'}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white light:text-slate-950">
                {tournament.name} Knockout Bracket
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Stage Filter when multiple knockout stages exist (e.g., Play-Offs + R16..Final) */}
            {knockoutStages.length > 1 && (
              <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedStageFilter('all')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                    selectedStageFilter === 'all'
                      ? 'bg-[#7ADBF0] text-slate-950'
                      : 'text-slate-400 hover:text-white light:text-slate-600'
                  }`}
                >
                  Full Bracket
                </button>
                {knockoutStages.map((s) => (
                  <button
                    key={s.config.id}
                    type="button"
                    onClick={() => setSelectedStageFilter(s.config.order)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                      selectedStageFilter === s.config.order
                        ? 'bg-[#7ADBF0] text-slate-950'
                        : 'text-slate-400 hover:text-white light:text-slate-600'
                    }`}
                  >
                    {s.config.name}
                  </button>
                ))}
              </div>
            )}

            {/* View Mode Toggle: Bracket Tree vs Matchup Grid */}
            <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-100">
              <button
                type="button"
                onClick={() => setViewMode('tree')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                  viewMode === 'tree'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:text-white light:text-slate-600'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Bracket Diagram</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                  viewMode === 'cards'
                    ? 'bg-amber-400 text-slate-950'
                    : 'text-slate-400 hover:text-white light:text-slate-600'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Round Grid</span>
              </button>
            </div>

            {/* Direct Simulation Controls inside Bracket Tab */}
            {tournament.status !== 'completed' && (
              <button
                type="button"
                disabled={Boolean(busyAction)}
                onClick={() => onSimulateBatch('knockout', 'knockout')}
                className="px-3.5 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>
                  {busyAction === 'knockout'
                    ? 'Simulating...'
                    : anyKnockoutUnlocked
                    ? 'Sim Knockout Phase'
                    : 'Sim to Knockout & Play'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Interactive Team Path Highlighter Bar */}
        {allBracketTeams.length > 0 && (
          <div className="pt-3 border-t border-white/[0.07] light:border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 shrink-0">
              Trace Club Path:
            </span>
            {highlightedTeamId && (
              <button
                type="button"
                onClick={() => setHighlightedTeamId(null)}
                className="px-2.5 py-1 rounded-lg border border-rose-400/40 bg-rose-500/15 text-rose-200 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1 shrink-0"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
            {allBracketTeams.slice(0, 24).map((tid) => {
              const d = resolveTeamDisplay(tid);
              if (!d) return null;
              const active = highlightedTeamId === tid;
              return (
                <button
                  key={tid}
                  type="button"
                  onClick={() => setHighlightedTeamId((prev) => (prev === tid ? null : tid))}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1.5 shrink-0 transition-colors ${
                    active
                      ? 'border-[#7ADBF0] bg-[#7ADBF0]/20 text-white light:text-slate-950'
                      : 'border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 text-slate-300 light:text-slate-700 hover:border-white/25'
                  }`}
                >
                  <TeamEmblem
                    team={d.teamObj}
                    crestUrl={d.crestUrl}
                    code={d.code}
                    className="w-4 h-4 shrink-0"
                  />
                  <span>{d.shortName}</span>
                </button>
              );
            })}
          </div>
        )}

        {!anyKnockoutUnlocked && (
          <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 light:bg-amber-50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-200 light:text-amber-900">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Showing live <strong>Projected Knockout Bracket</strong> based on current standings. Complete the current stage or click <strong>Sim to Knockout &amp; Play</strong> to lock in official ties.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================== */}
      {/* VIEW 1: INTERACTIVE BRACKET TREE DIAGRAM WITH CONNECTOR LINES      */}
      {/* ================================================================== */}
      {viewMode === 'tree' ? (
        <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-gradient-to-b from-[#070E1A] via-[#050A13] to-[#04070E] light:from-slate-50 light:to-white p-5 overflow-x-auto">
          <div className="flex items-stretch gap-0 min-w-max pb-3">
            {mainColumns.map((col, colIdx) => {
              const nextCol = mainColumns[colIdx + 1];
              const pairsIntoNext =
                nextCol && col.ties.length === nextCol.ties.length * 2;
              const sameCountIntoNext =
                nextCol && col.ties.length === nextCol.ties.length;

              return (
                <React.Fragment key={col.columnKey}>
                  {/* Round Column */}
                  <div className="w-[290px] shrink-0 flex flex-col">
                    {/* Column Header */}
                    <div className="mb-4 rounded-xl border border-white/10 light:border-slate-200 bg-[#081120] light:bg-white px-3.5 py-2.5 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#7ADBF0] light:text-cyan-700">
                          {col.stageName}
                        </div>
                        <div className="text-xs font-bold text-white light:text-slate-950">
                          {col.roundLabel}
                        </div>
                      </div>
                      <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                        {col.ties.length} {col.ties.length === 1 ? 'TIE' : 'TIES'}
                      </span>
                    </div>

                    {/* Vertically Balanced Ties */}
                    <div className="flex-1 flex flex-col justify-around gap-4 py-2">
                      {col.ties.map((tie) => renderTieNode(tie, col.stageLocked, true))}
                    </div>
                  </div>

                  {/* Bracket Tree Connector Column Between Rounds */}
                  {nextCol && (
                    <div className="w-12 shrink-0 flex flex-col pt-14 pb-2">
                      {pairsIntoNext ? (
                        Array.from({ length: nextCol.ties.length }).map((_, pairIdx) => {
                          const topTie = col.ties[pairIdx * 2];
                          const botTie = col.ties[pairIdx * 2 + 1];
                          const pairHasHighlight =
                            highlightedTeamId !== null &&
                            (topTie?.homeTeamId === highlightedTeamId ||
                              topTie?.awayTeamId === highlightedTeamId ||
                              botTie?.homeTeamId === highlightedTeamId ||
                              botTie?.awayTeamId === highlightedTeamId);
                          const pairSettled =
                            Boolean(topTie?.winnerId) && Boolean(botTie?.winnerId);
                          const strokeColor = pairHasHighlight
                            ? '#7ADBF0'
                            : pairSettled
                            ? '#10B981'
                            : 'rgba(148,163,184,0.28)';

                          return (
                            <div
                              key={pairIdx}
                              className="flex-1 flex items-center justify-center relative min-h-[120px]"
                            >
                              <svg
                                className="w-full h-full overflow-visible"
                                viewBox="0 0 48 100"
                                preserveAspectRatio="none"
                              >
                                <path
                                  d="M 0 25 H 24 V 75 H 0 M 24 50 H 48"
                                  fill="none"
                                  stroke={strokeColor}
                                  strokeWidth={pairHasHighlight ? '2.6' : '1.8'}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle cx="24" cy="50" r="3" fill={strokeColor} />
                              </svg>
                            </div>
                          );
                        })
                      ) : sameCountIntoNext ? (
                        col.ties.map((tie, idx) => {
                          const hasHighlight =
                            highlightedTeamId !== null &&
                            (tie.homeTeamId === highlightedTeamId ||
                              tie.awayTeamId === highlightedTeamId);
                          const strokeColor = hasHighlight
                            ? '#7ADBF0'
                            : tie.winnerId
                            ? '#10B981'
                            : 'rgba(148,163,184,0.28)';
                          return (
                            <div
                              key={idx}
                              className="flex-1 flex items-center justify-center min-h-[80px]"
                            >
                              <svg
                                className="w-full h-6"
                                viewBox="0 0 48 24"
                                preserveAspectRatio="none"
                              >
                                <path
                                  d="M 0 12 H 48"
                                  fill="none"
                                  stroke={strokeColor}
                                  strokeWidth={hasHighlight ? '2.5' : '1.8'}
                                  strokeDasharray={col.stageLocked ? '4 3' : undefined}
                                />
                                <polygon points="48,12 41,8 41,16" fill={strokeColor} />
                              </svg>
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="h-3/4 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                        </div>
                      )}
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {/* Connector to Trophy Podium */}
            <div className="w-10 shrink-0 flex items-center justify-center pt-12">
              <div className="w-full h-0.5 bg-gradient-to-r from-amber-400/40 to-amber-400" />
            </div>

            {/* ============================================================== */}
            {/* GRAND FINAL CHAMPION & SILVERWARE PODIUM COLUMN                */}
            {/* ============================================================== */}
            <div className="w-[280px] shrink-0 flex flex-col justify-center pt-2">
              <div className="rounded-2xl border border-amber-400/50 bg-gradient-to-b from-[#171208] via-[#09101D] to-[#050912] light:from-amber-50 light:to-white p-5 space-y-4 shadow-[0_0_35px_rgba(245,158,11,0.15)]">
                <div className="flex items-center justify-between border-b border-amber-400/20 pb-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-300 light:text-amber-800 font-bold">
                    CHAMPION PODIUM
                  </span>
                  <Trophy className="w-4 h-4 text-amber-400" />
                </div>

                <div className="flex flex-col items-center text-center space-y-3">
                  <TrophyArtwork trophy={tournament.trophy} size="xl" />
                  <div>
                    <div className="text-sm font-bold text-white light:text-slate-950">
                      {tournament.trophy.name}
                    </div>
                    <div className="font-mono text-[9.5px] uppercase tracking-wider text-amber-300/80 light:text-amber-700">
                      &ldquo;{tournament.trophy.engraving}&rdquo;
                    </div>
                  </div>
                </div>

                {tournament.champion ? (
                  <div className="rounded-xl border border-emerald-400/45 bg-emerald-500/15 light:bg-emerald-50 p-3.5 space-y-2.5 text-center">
                    <div className="font-mono text-[9.5px] uppercase tracking-widest text-emerald-300 light:text-emerald-800 font-bold">
                      CROWNED CHAMPION
                    </div>
                    <div className="flex items-center justify-center gap-2.5">
                      <TeamEmblem
                        crestUrl={tournament.champion.crestUrl}
                        code={tournament.champion.teamCode}
                        className="w-8 h-8 shrink-0"
                      />
                      <span className="text-base font-bold text-white light:text-slate-950 truncate">
                        {tournament.champion.teamName}
                      </span>
                    </div>
                    <div className="font-mono text-[10.5px] text-emerald-200 light:text-emerald-800">
                      Final: {tournament.champion.finalScore}
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenTeamCabinet(tournament.champion!.teamId)}
                      className="w-full py-1.5 rounded-lg bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 cursor-pointer inline-flex items-center justify-center gap-1.5"
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span>Champion Cabinet</span>
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-[#050A12]/90 light:bg-white p-3 text-center space-y-1.5">
                    <div className="font-mono text-[10px] uppercase text-slate-400">
                      Awaiting Final Winner
                    </div>
                    <p className="text-[11px] text-slate-400 light:text-slate-600">
                      Simulate or play through the knockout rounds to crown the champion and etch their name on the {tournament.trophy.name}.
                    </p>
                  </div>
                )}

                {thirdPlaceTie && (
                  <div className="pt-3 border-t border-white/10 space-y-2">
                    <div className="font-mono text-[9.5px] uppercase tracking-wider text-amber-300">
                      Bronze Medal Match
                    </div>
                    {renderTieNode(thirdPlaceTie, false, true)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================================================================ */
        /* VIEW 2: DETAILED ROUND-BY-ROUND MATCHUP CARDS                    */
        /* ================================================================ */
        <div className="space-y-5">
          {mainColumns.map((col) => (
            <div
              key={col.columnKey}
              className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/10 light:border-slate-200">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg border border-amber-400/35 bg-amber-500/10 flex items-center justify-center text-amber-300">
                    <Swords className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-amber-300 light:text-amber-700">
                      {col.stageName}
                    </div>
                    <h4 className="text-sm font-bold text-white light:text-slate-950">
                      {col.roundLabel}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {col.stageLocked ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase text-slate-400">
                      <Lock className="w-3 h-3" />
                      <span>Projected Ties</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={Boolean(busyAction)}
                      onClick={() => onSimulateBatch('stage', 'stage', col.stageOrder)}
                      className="px-3 py-1.5 rounded-lg border border-[#7ADBF0]/40 bg-[#7ADBF0]/10 text-xs font-semibold text-[#7ADBF0] hover:bg-[#7ADBF0]/20 cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      <span>Simulate {col.stageName}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                {col.ties.map((tie) => renderTieNode(tie, col.stageLocked, false))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
