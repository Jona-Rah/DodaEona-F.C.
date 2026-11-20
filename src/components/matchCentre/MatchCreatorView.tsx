import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Cpu,
  MessageSquareText,
  Users,
} from 'lucide-react';
import { Team } from '../../types/matchCentre';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { audioAtmosphere } from '../../utils/audioAtmosphereEngine';
import {
  buildDugoutLineup,
  buildInitialTeamSetup,
  generateRandomSeed,
  simulateMatch,
} from '../../engine/matchSimulator';
import type {
  CompleteSimulationOutput,
  SimCompetitionConfig,
  SimMatchPhase,
  SimPlanId,
  SimPresentationMode,
  SimTacticalOverrideCheckpoint,
  SimTeamMatchStats,
  SimTeamSetup,
  SimTimelineEvent,
} from '../../types/simulation';
import { getTickOrder, truncateMomentumForLiveMatch } from '../../utils/clock';
import { SimulationDugout } from './simulation/SimulationDugout';
import { FixtureBuilderView } from './simulation/FixtureBuilderView';
import { SimulationScoreboard } from './simulation/SimulationScoreboard';
import { PenaltyShootoutPanel } from './simulation/PenaltyShootoutPanel';
import {
  CommentaryTab,
  FactsTab,
} from './simulation/AnalyticsTabsFactsAndCommentary';
import {
  LineupTab,
  SimulationTab,
} from './simulation/AnalyticsTabsLineupAndSim';
import { StatsTab } from './simulation/AnalyticsTabsStats';
import { SavedMatchesModal } from './simulation/SavedMatchesModal';
import { BreakTacticsModal } from './simulation/BreakTacticsModal';
import { HalftimeGeminiStudio } from './simulation/HalftimeGeminiStudio';
import {
  fetchMatchBroadcastAudio,
  geminiHalftimeAudio,
  GeminiBroadcastVoiceChoice,
  LiveBroadcastEventPayload,
  LiveMatchContext,
  MatchBroadcastDossier,
  MatchBroadcastRequest,
  MatchBroadcastType,
  MatchPenaltyKickBroadcastEntry,
  MatchPlayerBroadcastStats,
  MatchShotBroadcastEntry,
  MatchTeamBroadcastStats,
  MatchTimelineHighlight,
  resolveVoiceForBroadcastStage,
} from '../../utils/geminiAudioPlayer';

interface MatchCreatorViewProps {
  onBackToTeams?: () => void;
}

type AnalyticsTabId = 'facts' | 'commentary' | 'lineup' | 'stats' | 'simulation';

function scaleLiveTeamStats(
  full: SimTeamMatchStats,
  ratio: number,
  liveShots: number,
  liveSot: number,
  liveXg: number,
  liveYellow: number,
  liveRed: number,
  livePoss: number
): SimTeamMatchStats {
  if (ratio >= 0.999) return full;
  return {
    ...full,
    possession: livePoss,
    shots: liveShots,
    shotsOnTarget: liveSot,
    xg: Number(liveXg.toFixed(2)),
    xgot: full.xgot !== null ? Number((full.xgot * ratio).toFixed(2)) : null,
    openPlayXg: full.openPlayXg !== null ? Number((full.openPlayXg * ratio).toFixed(2)) : null,
    setPieceXg: full.setPieceXg !== null ? Number((full.setPieceXg * ratio).toFixed(2)) : null,
    bigChances: Math.round(full.bigChances * ratio),
    bigChancesMissed: Math.round(full.bigChancesMissed * ratio),
    touchesInBox: Math.round(full.touchesInBox * ratio),
    corners: Math.round(full.corners * ratio),
    yellowCards: liveYellow,
    redCards: liveRed,
    fouls: Math.round(full.fouls * ratio),
    offsides: Math.round(full.offsides * ratio),
    passesAttempted: Math.round(full.passesAttempted * ratio),
    passesCompleted: Math.round(full.passesCompleted * ratio),
    throughPasses:
      typeof full.throughPasses === 'number' ? Math.round(full.throughPasses * ratio) : undefined,
    throughPassesCompleted:
      typeof full.throughPassesCompleted === 'number'
        ? Math.round(full.throughPassesCompleted * ratio)
        : undefined,
    blocks: typeof full.blocks === 'number' ? Math.round(full.blocks * ratio) : undefined,
    duelsWon: Math.round(full.duelsWon * ratio),
    duelsTotal: Math.round(full.duelsTotal * ratio),
    tacklesWon: Math.round(full.tacklesWon * ratio),
    tacklesTotal: Math.round(full.tacklesTotal * ratio),
    interceptions: Math.round(full.interceptions * ratio),
    clearances: Math.round(full.clearances * ratio),
    possessionLost:
      typeof full.possessionLost === 'number'
        ? Math.round(full.possessionLost * ratio)
        : undefined,
    saves: Math.round(full.saves * ratio),
    runningDistanceKm:
      full.runningDistanceKm !== null ? Number((full.runningDistanceKm * ratio).toFixed(1)) : null,
    sprintingDistanceKm:
      full.sprintingDistanceKm !== null
        ? Number((full.sprintingDistanceKm * ratio).toFixed(1))
        : null,
    sprints: full.sprints !== null ? Math.round(full.sprints * ratio) : null,
  };
}

export const MatchCreatorView: React.FC<MatchCreatorViewProps> = ({ onBackToTeams: _onBackToTeams }) => {
  const {
    teams,
    selection,
    swapSelections,
    selectTeam,
    deselectTeam,
    competitions,
    competitionMakers,
    simulationMatches,
    savedSimulations,
    recordSimulationMatch,
    saveSimulationMatch,
    deleteSavedSimulation,
    pendingSimulationToOpen,
    clearPendingSimulation,
    pendingTournamentMatch,
    clearPendingTournamentMatch,
    returnToTournamentHub,
    getManagerForTeam,
  } = useMatchCentre();

  const homeTeam = selection.homeTeam;
  const awayTeam = selection.awayTeam;
  const homeManager = useMemo(
    () => (homeTeam ? getManagerForTeam(homeTeam) : null),
    [getManagerForTeam, homeTeam]
  );
  const awayManager = useMemo(
    () => (awayTeam ? getManagerForTeam(awayTeam) : null),
    [getManagerForTeam, awayTeam]
  );

  // Competition & Seed State
  const [competition, setCompetition] = useState<SimCompetitionConfig>({
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
  const [seed, setSeed] = useState<string>(() => generateRandomSeed());
  const [startMode, setStartMode] = useState<SimPresentationMode>('live');

  // Dugout Setup State
  const [initialHomeSetup, setInitialHomeSetup] = useState<SimTeamSetup | null>(() =>
    homeTeam ? buildInitialTeamSetup(homeTeam, homeManager) : null
  );
  const [initialAwaySetup, setInitialAwaySetup] = useState<SimTeamSetup | null>(() =>
    awayTeam ? buildInitialTeamSetup(awayTeam, awayManager) : null
  );
  const [liveHomeSetup, setLiveHomeSetup] = useState<SimTeamSetup | null>(initialHomeSetup);
  const [liveAwaySetup, setLiveAwaySetup] = useState<SimTeamSetup | null>(initialAwaySetup);
  const [tacticalOverrides, setTacticalOverrides] = useState<SimTacticalOverrideCheckpoint[]>([]);

  // Active simulation output & playback state
  const [screen, setScreen] = useState<'fixture' | 'dugout' | 'match'>('fixture');
  const [activeOutput, setActiveOutput] = useState<CompleteSimulationOutput | null>(null);
  const [phase, setPhase] = useState<SimMatchPhase>('pre-match');
  const [currentMinute, setCurrentMinute] = useState(0);
  const [currentAddedMinute, setCurrentAddedMinute] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 1.5 | 2>(1);
  const [mode, setMode] = useState<SimPresentationMode>('live');
  const [activeTab, setActiveTab] = useState<AnalyticsTabId>('facts');
  const [penaltiesRevealed, setPenaltiesRevealed] = useState(0);

  // Audio, Celebration & Modals
  const [isMuted, setIsMuted] = useState(false);
  const [anthemPlaying, setAnthemPlaying] = useState(false);
  const [goalBannerEvent, setGoalBannerEvent] = useState<SimTimelineEvent | null>(null);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showBreakTacticsModal, setShowBreakTacticsModal] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [filingNotice, setFilingNotice] = useState<string | null>(null);

  // Gemini Match Broadcast & Live Voice Studio State
  const [geminiSoundEnabled, setGeminiSoundEnabled] = useState(true);
  const [geminiVoiceName, setGeminiVoiceName] = useState<GeminiBroadcastVoiceChoice>('Auto');
  const [halftimeAudioStatus, setHalftimeAudioStatus] = useState<
    'idle' | 'generating' | 'ready' | 'playing' | 'error'
  >('idle');
  const [halftimeScript, setHalftimeScript] = useState<string | null>(null);
  const [halftimeStoryline, setHalftimeStoryline] = useState<string | null>(null);
  const [halftimeAudioError, setHalftimeAudioError] = useState<string | null>(null);
  const [prefetchStatus, setPrefetchStatus] = useState<'idle' | 'preparing' | 'ready'>('idle');
  const [prefetchStageLabel, setPrefetchStageLabel] = useState<string | null>(null);
  const [showLiveStudio, setShowLiveStudio] = useState(false);
  const [isPenaltyAudioBusy, setIsPenaltyAudioBusy] = useState(false);

  const recordedKeyRef = useRef<string | null>(null);
  const filingPromiseRef = useRef<Promise<unknown> | null>(null);
  const lastAnnouncedGoalIdRef = useRef<string | null>(null);
  const goalBannerTimerRef = useRef<number | null>(null);
  const phaseDelayTimerRef = useRef<number | null>(null);
  const prefetchedBroadcastKeysRef = useRef<Set<string>>(new Set());
  const announcedPhaseKeyRef = useRef<string | null>(null);
  const broadcastTokenRef = useRef(0);
  const cancelEpochRef = useRef(0);
  const activePlaybackPromiseRef = useRef<Promise<void> | null>(null);
  const skipNextFullTimeWaitRef = useRef(false);
  const announcedLiveEventIdsRef = useRef<Set<string>>(new Set());
  const lastLiveCommentaryAtRef = useRef<number>(0);
  const activeBroadcastPriorityRef = useRef<number>(0);
  const isLiveSpeechActiveRef = useRef<boolean>(false);
  const syncedHomeMgrRef = useRef<string | null>(homeManager?.id || null);
  const syncedAwayMgrRef = useRef<string | null>(awayManager?.id || null);

  useEffect(() => {
    return () => {
      if (goalBannerTimerRef.current) {
        window.clearTimeout(goalBannerTimerRef.current);
      }
      if (phaseDelayTimerRef.current) {
        window.clearTimeout(phaseDelayTimerRef.current);
      }
      geminiHalftimeAudio.stop();
    };
  }, []);

  // Keep setups synced when teams or assigned managers change from outside or fixture builder
  useEffect(() => {
    if (!homeTeam) {
      if (initialHomeSetup !== null) {
        setInitialHomeSetup(null);
        setLiveHomeSetup(null);
      }
      syncedHomeMgrRef.current = null;
      return;
    }
    const nextMgrId = homeManager?.id || null;
    const nextPenKey = (homeTeam.penaltyOrderIds || []).join('|');
    const prevPenKey = (initialHomeSetup?.penaltyOrderIds || []).join('|');
    if (
      !initialHomeSetup ||
      initialHomeSetup.teamId !== homeTeam.id ||
      (screen === 'fixture' && syncedHomeMgrRef.current !== nextMgrId)
    ) {
      const next = buildInitialTeamSetup(homeTeam, homeManager);
      setInitialHomeSetup(next);
      setLiveHomeSetup(next);
      syncedHomeMgrRef.current = nextMgrId;
    } else if (nextPenKey !== prevPenKey) {
      setInitialHomeSetup((prev) =>
        prev ? { ...prev, penaltyOrderIds: homeTeam.penaltyOrderIds } : prev
      );
      setLiveHomeSetup((prev) =>
        prev ? { ...prev, penaltyOrderIds: homeTeam.penaltyOrderIds } : prev
      );
    }
  }, [homeTeam, homeManager, initialHomeSetup, screen]);

  useEffect(() => {
    if (!awayTeam) {
      if (initialAwaySetup !== null) {
        setInitialAwaySetup(null);
        setLiveAwaySetup(null);
      }
      syncedAwayMgrRef.current = null;
      return;
    }
    const nextMgrId = awayManager?.id || null;
    const nextPenKey = (awayTeam.penaltyOrderIds || []).join('|');
    const prevPenKey = (initialAwaySetup?.penaltyOrderIds || []).join('|');
    if (
      !initialAwaySetup ||
      initialAwaySetup.teamId !== awayTeam.id ||
      (screen === 'fixture' && syncedAwayMgrRef.current !== nextMgrId)
    ) {
      const next = buildInitialTeamSetup(awayTeam, awayManager);
      setInitialAwaySetup(next);
      setLiveAwaySetup(next);
      syncedAwayMgrRef.current = nextMgrId;
    } else if (nextPenKey !== prevPenKey) {
      setInitialAwaySetup((prev) =>
        prev ? { ...prev, penaltyOrderIds: awayTeam.penaltyOrderIds } : prev
      );
      setLiveAwaySetup((prev) =>
        prev ? { ...prev, penaltyOrderIds: awayTeam.penaltyOrderIds } : prev
      );
    }
  }, [awayTeam, awayManager, initialAwaySetup, screen]);

  // Ensure Champions League anthem cleanly stops on unmount OR Full-Time OR exiting UCL
  const stopAnthem = useCallback(() => {
    audioAtmosphere.stop();
    setAnthemPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      audioAtmosphere.stop();
    };
  }, []);

  useEffect(() => {
    const isUcl =
      screen === 'match'
        ? activeOutput?.competition.preset === 'champions-league'
        : competition.preset === 'champions-league';

    if (isUcl && !isMuted && phase !== 'full-time' && screen === 'match') {
      if (!anthemPlaying) {
        audioAtmosphere.playSoundscape('champions');
        setAnthemPlaying(true);
      }
    } else if (anthemPlaying && (phase === 'full-time' || isMuted || !isUcl || screen === 'dugout')) {
      stopAnthem();
    }
  }, [
    screen,
    activeOutput?.competition.preset,
    competition.preset,
    isMuted,
    phase,
    anthemPlaying,
    stopAnthem,
  ]);

  const stopBroadcastAudio = useCallback(() => {
    cancelEpochRef.current += 1;
    broadcastTokenRef.current += 1;
    if (phaseDelayTimerRef.current) {
      window.clearTimeout(phaseDelayTimerRef.current);
      phaseDelayTimerRef.current = null;
    }
    geminiHalftimeAudio.stop();
    isLiveSpeechActiveRef.current = false;
    activeBroadcastPriorityRef.current = 0;
    audioAtmosphere.setVolume(0.35);
    setIsPenaltyAudioBusy(false);
    setHalftimeAudioStatus((prev) =>
      prev === 'playing' || prev === 'generating' ? 'ready' : prev
    );
  }, []);

  const buildStageDossier = useCallback(
    (
      stageType: MatchBroadcastType | 'live-now',
      overrideCut?: { minute: number; addedMinute: number; phase: SimMatchPhase }
    ): {
      dossier: MatchBroadcastDossier;
      homeScore: number;
      awayScore: number;
      possessionHome: number;
      shotsHome: number;
      shotsAway: number;
      xgHome: number;
      xgAway: number;
      stoppageMinutes?: number;
      goalsForStage: Array<{
        playerName: string;
        minute: number;
        addedMinute?: number;
        teamSide: 'home' | 'away';
        isPenalty?: boolean;
      }>;
    } | null => {
      if (!activeOutput || !homeTeam || !awayTeam) return null;

      let cutoffMin = activeOutput.finalMinute;
      let cutoffAdded = activeOutput.wentToExtraTime
        ? activeOutput.stoppageET2
        : activeOutput.stoppage2H;
      let isEndStage = true;
      let includePenaltyEvents = false;
      let stoppageMinutes: number | undefined;

      if (stageType === 'half-time') {
        cutoffMin = 45;
        cutoffAdded = activeOutput.stoppage1H;
        isEndStage = false;
        stoppageMinutes = activeOutput.stoppage1H;
      } else if (stageType === 'end-of-90') {
        cutoffMin = 90;
        cutoffAdded = activeOutput.stoppage2H;
        isEndStage = false;
        stoppageMinutes = activeOutput.stoppage2H;
      } else if (stageType === 'et-interval') {
        cutoffMin = 105;
        cutoffAdded = activeOutput.stoppageET1;
        isEndStage = false;
        stoppageMinutes = activeOutput.stoppageET1;
      } else if (stageType === 'penalties-intro' || stageType === 'penalty-kick') {
        isEndStage = true;
        includePenaltyEvents = false;
      } else if (stageType === 'full-time') {
        isEndStage = true;
        includePenaltyEvents = Boolean(activeOutput.penaltyShootout);
        stoppageMinutes = activeOutput.wentToExtraTime
          ? activeOutput.stoppageET2
          : activeOutput.stoppage2H;
      } else if (stageType === 'live-now' && overrideCut) {
        const p = overrideCut.phase;
        if (p === 'full-time') {
          isEndStage = true;
          includePenaltyEvents = Boolean(activeOutput.penaltyShootout);
        } else if (p === 'penalties' || p === 'penalties-intro') {
          isEndStage = true;
          includePenaltyEvents = false;
        } else if (p === 'half-time') {
          cutoffMin = 45;
          cutoffAdded = activeOutput.stoppage1H;
          isEndStage = false;
        } else if (p === 'end-of-90') {
          cutoffMin = 90;
          cutoffAdded = activeOutput.stoppage2H;
          isEndStage = false;
        } else if (p === 'et-interval') {
          cutoffMin = 105;
          cutoffAdded = activeOutput.stoppageET1;
          isEndStage = false;
        } else {
          cutoffMin = overrideCut.minute;
          cutoffAdded = overrideCut.addedMinute;
          isEndStage = false;
        }
      }

      const cutoffOrder = getTickOrder(cutoffMin, cutoffAdded);

      const stageEvents = activeOutput.events.filter((e) => {
        if (!includePenaltyEvents && e.period === 'PEN') return false;
        if (stageType !== 'full-time' && !(stageType === 'live-now' && overrideCut?.phase === 'full-time')) {
          if (e.type === 'full-time') return false;
        }
        if (isEndStage) return true;
        return getTickOrder(e.minute, e.addedMinute) <= cutoffOrder + 1e-6;
      });

      const stageShots = isEndStage
        ? activeOutput.shots
        : activeOutput.shots.filter(
            (s) => getTickOrder(s.minute, s.addedMinute) <= cutoffOrder + 1e-6
          );

      const stageMomentum = isEndStage
        ? activeOutput.momentum
        : truncateMomentumForLiveMatch(activeOutput.momentum, cutoffMin, cutoffAdded);

      const hShots = stageShots.filter((s) => s.teamSide === 'home');
      const aShots = stageShots.filter((s) => s.teamSide === 'away');
      const goalEvents = stageEvents.filter(
        (e) => (e.type === 'goal' || e.type === 'own-goal') && Boolean(e.teamSide)
      );

      let stageHomeScore: number;
      let stageAwayScore: number;
      let homeStatsStage: SimTeamMatchStats;
      let awayStatsStage: SimTeamMatchStats;

      if (isEndStage) {
        stageHomeScore = activeOutput.homeScore;
        stageAwayScore = activeOutput.awayScore;
        homeStatsStage = activeOutput.homeStats;
        awayStatsStage = activeOutput.awayStats;
      } else {
        stageHomeScore =
          stageType === 'half-time'
            ? activeOutput.halfTimeHomeScore
            : goalEvents.filter((e) => e.teamSide === 'home').length;
        stageAwayScore =
          stageType === 'half-time'
            ? activeOutput.halfTimeAwayScore
            : goalEvents.filter((e) => e.teamSide === 'away').length;

        const hSot = hShots.filter((s) => s.outcome === 'goal' || s.outcome === 'saved').length;
        const aSot = aShots.filter((s) => s.outcome === 'goal' || s.outcome === 'saved').length;
        const hXg = hShots.reduce((s, x) => s + x.xg, 0);
        const aXg = aShots.reduce((s, x) => s + x.xg, 0);
        const hYel = stageEvents.filter((e) => e.type === 'yellow' && e.teamSide === 'home').length;
        const aYel = stageEvents.filter((e) => e.type === 'yellow' && e.teamSide === 'away').length;
        const hRed = stageEvents.filter(
          (e) => (e.type === 'red' || e.type === 'second-yellow') && e.teamSide === 'home'
        ).length;
        const aRed = stageEvents.filter(
          (e) => (e.type === 'red' || e.type === 'second-yellow') && e.teamSide === 'away'
        ).length;

        const totalTicks = Math.max(1, activeOutput.momentum.length);
        const ratio = Math.max(0.05, Math.min(1, stageMomentum.length / totalTicks));
        const avgMom =
          stageMomentum.length > 0
            ? stageMomentum.reduce((s, m) => s + m.smoothedDiff, 0) / stageMomentum.length
            : 0;
        const livePossHome =
          cutoffMin < 5
            ? 50
            : Math.max(
                24,
                Math.min(
                  76,
                  Math.round(
                    activeOutput.homeStats.possession * ratio + (50 + avgMom * 0.25) * (1 - ratio)
                  )
                )
              );

        homeStatsStage = scaleLiveTeamStats(
          activeOutput.homeStats,
          ratio,
          hShots.length,
          hSot,
          hXg,
          hYel,
          hRed,
          livePossHome
        );
        awayStatsStage = scaleLiveTeamStats(
          activeOutput.awayStats,
          ratio,
          aShots.length,
          aSot,
          aXg,
          aYel,
          aRed,
          100 - livePossHome
        );
      }

      const toBroadcastStats = (
        st: SimTeamMatchStats,
        teamShots: typeof hShots
      ): MatchTeamBroadcastStats => {
        const bigChancesExact = teamShots.filter((s) => s.isBigChance).length;
        const bigChancesMissedExact = teamShots.filter(
          (s) => s.isBigChance && s.outcome !== 'goal'
        ).length;
        return {
          possession: st.possession,
          shots: st.shots,
          shotsOnTarget: st.shotsOnTarget,
          xg: Number(st.xg.toFixed(2)),
          xgot: st.xgot,
          openPlayXg: st.openPlayXg,
          setPieceXg: st.setPieceXg,
          bigChances: isEndStage ? st.bigChances : bigChancesExact,
          bigChancesMissed: isEndStage ? st.bigChancesMissed : bigChancesMissedExact,
          touchesInBox: st.touchesInBox,
          corners: st.corners,
          offsides: st.offsides,
          fouls: st.fouls,
          yellowCards: st.yellowCards,
          redCards: st.redCards,
          saves: st.saves,
          passesAttempted: st.passesAttempted,
          passesCompleted: st.passesCompleted,
          passAccuracy: st.passAccuracy,
          throughPasses: st.throughPasses,
          throughPassesCompleted: st.throughPassesCompleted,
          blocks: st.blocks,
          duelsWon: st.duelsWon,
          duelsTotal: st.duelsTotal,
          tacklesWon: st.tacklesWon,
          tacklesTotal: st.tacklesTotal,
          interceptions: st.interceptions,
          clearances: st.clearances,
          possessionLost: st.possessionLost,
          runningDistanceKm: st.runningDistanceKm,
          sprintingDistanceKm: st.sprintingDistanceKm,
          attackingZones: st.attackingZones,
          buildMethods: st.buildMethods,
        };
      };

      const shotSituationByKey = new Map<string, string>();
      stageShots.forEach((s) => {
        if (s.outcome === 'goal') {
          shotSituationByKey.set(
            `${s.teamSide}:${s.minute}:${s.addedMinute || 0}:${s.playerId}`,
            s.situation
          );
        }
      });

      const interestingTypes = new Set([
        'goal',
        'own-goal',
        'penalty-awarded',
        'red',
        'second-yellow',
        'yellow',
        'penalty-missed',
        'woodwork',
        'shot-saved',
        'big-chance-missed',
        'sub',
        'injury',
        'tactical-change',
      ]);

      const timelineHighlights: MatchTimelineHighlight[] = stageEvents
        .filter((e) => interestingTypes.has(e.type))
        .map((e) => ({
          minute: e.minute,
          addedMinute: e.addedMinute,
          period: e.period,
          type: e.type,
          teamSide: e.teamSide,
          playerName: e.playerName,
          assistPlayerName: e.assistPlayerName,
          secondaryPlayerName: e.secondaryPlayerName,
          isPenalty: e.isPenalty,
          headline: e.headline,
          commentary: e.commentary,
          situation:
            e.type === 'goal' && e.teamSide && e.playerId
              ? shotSituationByKey.get(`${e.teamSide}:${e.minute}:${e.addedMinute || 0}:${e.playerId}`)
              : undefined,
        }));

      const substitutions = stageEvents
        .filter((e) => e.type === 'sub' && Boolean(e.teamSide))
        .map((e) => ({
          minute: e.minute,
          teamSide: e.teamSide as 'home' | 'away',
          playerIn: e.playerName || 'Substitute',
          playerOut: e.secondaryPlayerName || 'Starter',
        }));

      // Build tactics strictly valid for this stage
      const effectiveOverrides = tacticalOverrides.filter((o) => o.minute <= cutoffMin);
      const latestHomeOv = [...effectiveOverrides]
        .reverse()
        .find((o) => o.teamSide === 'home');
      const latestAwayOv = [...effectiveOverrides]
        .reverse()
        .find((o) => o.teamSide === 'away');

      const hSetupForStage = isEndStage
        ? liveHomeSetup
        : stageType === 'half-time' && !latestHomeOv
        ? initialHomeSetup || liveHomeSetup
        : liveHomeSetup;
      const aSetupForStage = isEndStage
        ? liveAwaySetup
        : stageType === 'half-time' && !latestAwayOv
        ? initialAwaySetup || liveAwaySetup
        : liveAwaySetup;

      const hPlan = latestHomeOv?.planConfig || hSetupForStage?.plans[hSetupForStage.activePlan];
      const aPlan = latestAwayOv?.planConfig || aSetupForStage?.plans[aSetupForStage.activePlan];

      const tacticalChanges: Array<{ minute: number; teamSide: 'home' | 'away'; description: string }> = [
        ...effectiveOverrides.map((o) => ({
          minute: o.minute,
          teamSide: o.teamSide,
          description: `Switched to Plan ${o.planId || ''} (${o.formation}, ${o.planConfig.playingStyle})`.trim(),
        })),
        ...stageEvents
          .filter((e) => e.type === 'tactical-change' && Boolean(e.teamSide))
          .map((e) => ({
            minute: e.minute,
            teamSide: e.teamSide as 'home' | 'away',
            description: e.commentary || e.headline,
          })),
      ].sort((a, b) => a.minute - b.minute);

      // Build performers without leaking second-half/final ratings into earlier stages
      let keyPerformers: MatchBroadcastDossier['keyPerformers'] = [];
      if (isEndStage && activeOutput.playerStats.length > 0) {
        const pickedIds = new Set<string>();
        const pushPlayer = (p: (typeof activeOutput.playerStats)[number]) => {
          if (pickedIds.has(p.playerId)) return;
          pickedIds.add(p.playerId);
          keyPerformers!.push({
            teamSide: p.teamSide,
            name: p.playerName,
            role: p.positionDetail,
            rating: Number(p.rating.toFixed(1)),
            goals: p.goals,
            assists: p.assists,
            saves: p.saves,
            isMotm: p.playerId === activeOutput.motmPlayerId,
          });
        };

        const motm = activeOutput.playerStats.find((p) => p.playerId === activeOutput.motmPlayerId);
        if (motm) pushPlayer(motm);

        (['home', 'away'] as const).forEach((side) => {
          const topSide = activeOutput.playerStats
            .filter((p) => p.teamSide === side)
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 2);
          topSide.forEach(pushPlayer);

          const busyGk = activeOutput.playerStats.find(
            (p) => p.teamSide === side && p.positionDetail === 'GK' && p.saves >= 3
          );
          if (busyGk) pushPlayer(busyGk);
        });
      } else {
        const contribMap = new Map<
          string,
          { teamSide: 'home' | 'away'; name: string; goals: number; assists: number }
        >();
        goalEvents.forEach((e) => {
          if (e.type === 'goal' && e.playerName && e.teamSide) {
            const k = `${e.teamSide}:${e.playerName}`;
            const cur = contribMap.get(k) || {
              teamSide: e.teamSide,
              name: e.playerName,
              goals: 0,
              assists: 0,
            };
            cur.goals += 1;
            contribMap.set(k, cur);
          }
          if (e.assistPlayerName && e.teamSide) {
            const k = `${e.teamSide}:${e.assistPlayerName}`;
            const cur = contribMap.get(k) || {
              teamSide: e.teamSide,
              name: e.assistPlayerName,
              goals: 0,
              assists: 0,
            };
            cur.assists += 1;
            contribMap.set(k, cur);
          }
        });
        keyPerformers = [...contribMap.values()]
          .sort((a, b) => b.goals * 2 + b.assists - (a.goals * 2 + a.assists))
          .slice(0, 5);

        const homeGk = hSetupForStage?.slots.find((s) => s.node.role === 'GK' || s.player?.positionDetail === 'GK')?.player;
        const awayGk = aSetupForStage?.slots.find((s) => s.node.role === 'GK' || s.player?.positionDetail === 'GK')?.player;
        if (homeGk && homeStatsStage.saves >= 3) {
          keyPerformers.push({
            teamSide: 'home',
            name: homeGk.name,
            role: 'GK',
            saves: homeStatsStage.saves,
          });
        }
        if (awayGk && awayStatsStage.saves >= 3) {
          keyPerformers.push({
            teamSide: 'away',
            name: awayGk.name,
            role: 'GK',
            saves: awayStatsStage.saves,
          });
        }
      }

      // Summarize momentum in clean 15-minute windows
      const windows: Array<{ label: string; min: number; max: number }> = [
        { label: "1-15'", min: 1, max: 15 },
        { label: "16-30'", min: 16, max: 30 },
        { label: "31-45'", min: 31, max: 45 },
        { label: "46-60'", min: 46, max: 60 },
        { label: "61-75'", min: 61, max: 75 },
        { label: "76-90'", min: 76, max: 90 },
        { label: 'ET', min: 91, max: 130 },
      ];
      const momentumParts: string[] = [];
      for (const w of windows) {
        const pts = stageMomentum.filter((m) => m.minute >= w.min && m.minute <= w.max);
        if (pts.length === 0) continue;
        const avg = pts.reduce((s, p) => s + p.smoothedDiff, 0) / pts.length;
        if (avg >= 18) {
          momentumParts.push(`${w.label}: ${homeTeam.shortName || homeTeam.name} dominant`);
        } else if (avg >= 7) {
          momentumParts.push(`${w.label}: ${homeTeam.shortName || homeTeam.name} edge`);
        } else if (avg <= -18) {
          momentumParts.push(`${w.label}: ${awayTeam.shortName || awayTeam.name} dominant`);
        } else if (avg <= -7) {
          momentumParts.push(`${w.label}: ${awayTeam.shortName || awayTeam.name} edge`);
        } else {
          momentumParts.push(`${w.label}: Balanced`);
        }
      }

      const hWinPct = activeOutput.preMatchOdds?.homeWinPct;
      const aWinPct = activeOutput.preMatchOdds?.awayWinPct;
      const favouriteSide: 'home' | 'away' | 'even' =
        typeof hWinPct === 'number' && typeof aWinPct === 'number'
          ? hWinPct - aWinPct >= 8
            ? 'home'
            : aWinPct - hWinPct >= 8
            ? 'away'
            : 'even'
          : (homeTeam.overallRating || 75) - (awayTeam.overallRating || 75) >= 4
          ? 'home'
          : (awayTeam.overallRating || 75) - (homeTeam.overallRating || 75) >= 4
          ? 'away'
          : 'even';

      const goalShots = stageShots.filter((s) => s.outcome === 'goal');
      const goalBuildBreakdown = {
        homeCounterGoals: goalShots.filter((s) => s.teamSide === 'home' && s.situation === 'counter').length,
        awayCounterGoals: goalShots.filter((s) => s.teamSide === 'away' && s.situation === 'counter').length,
        homeSetPieceGoals: goalShots.filter((s) => s.teamSide === 'home' && s.situation === 'set-piece').length,
        awaySetPieceGoals: goalShots.filter((s) => s.teamSide === 'away' && s.situation === 'set-piece').length,
      };

      const goalsForStage = goalEvents.map((e) => ({
        playerName: e.playerName || 'Scorer',
        minute: e.minute,
        addedMinute: e.addedMinute,
        teamSide: e.teamSide as 'home' | 'away',
        isPenalty: e.isPenalty,
      }));

      const stagePlayerStats: MatchPlayerBroadcastStats[] = (() => {
        if (isEndStage) {
          return activeOutput.playerStats.map((p) => ({
            playerId: p.playerId,
            name: p.playerName,
            shirtNumber: p.shirtNumber,
            teamSide: p.teamSide,
            position: p.positionDetail,
            roleSlot: p.roleSlot,
            started: p.started,
            subbedInMinute: p.subbedInMinute,
            subbedOutMinute: p.subbedOutMinute,
            minutesPlayed: p.minutesPlayed,
            rating: Number(p.rating.toFixed(1)),
            isMotm: p.playerId === activeOutput.motmPlayerId,
            goals: p.goals,
            assists: p.assists,
            shots: p.shots,
            shotsOnTarget: p.shotsOnTarget,
            xg: Number(p.xg.toFixed(2)),
            bigChancesMissed: p.bigChancesMissed ?? 0,
            keyPasses: p.keyPasses,
            passesCompleted: p.passesCompleted,
            passesAttempted: p.passesAttempted,
            throughPasses: p.throughPasses ?? 0,
            throughPassesCompleted: p.throughPassesCompleted ?? 0,
            blocks: p.blocks ?? 0,
            tackles: p.tackles,
            interceptions: p.interceptions,
            clearances: p.clearances ?? 0,
            foulsCommitted: p.foulsCommitted ?? 0,
            possessionLost: p.possessionLost ?? 0,
            saves: p.saves,
            yellowCards: p.yellowCards,
            redCards: p.redCards,
            staminaRemaining: p.staminaRemaining,
          }));
        }

        // Mid-match / Half-time stage: derive exact stage stats without leaking future goals/cards/subs
        const goalsByPid = new Map<string, number>();
        const assistsByPid = new Map<string, number>();
        const shotsByPid = new Map<string, number>();
        const sotByPid = new Map<string, number>();
        const xgByPid = new Map<string, number>();
        const kpByPid = new Map<string, number>();
        const bcMissByPid = new Map<string, number>();
        const yellowByPid = new Map<string, number>();
        const redByPid = new Map<string, number>();

        stageShots.forEach((s) => {
          shotsByPid.set(s.playerId, (shotsByPid.get(s.playerId) || 0) + 1);
          if (s.outcome === 'goal' || s.outcome === 'saved') {
            sotByPid.set(s.playerId, (sotByPid.get(s.playerId) || 0) + 1);
          }
          xgByPid.set(s.playerId, (xgByPid.get(s.playerId) || 0) + s.xg);
          if (s.outcome === 'goal') {
            goalsByPid.set(s.playerId, (goalsByPid.get(s.playerId) || 0) + 1);
          } else if (s.isBigChance) {
            bcMissByPid.set(s.playerId, (bcMissByPid.get(s.playerId) || 0) + 1);
          }
          if (s.assistPlayerId) {
            kpByPid.set(s.assistPlayerId, (kpByPid.get(s.assistPlayerId) || 0) + 1);
            if (s.outcome === 'goal') {
              assistsByPid.set(s.assistPlayerId, (assistsByPid.get(s.assistPlayerId) || 0) + 1);
            }
          }
        });

        stageEvents.forEach((e) => {
          if (e.type === 'yellow' && e.playerId) {
            yellowByPid.set(e.playerId, (yellowByPid.get(e.playerId) || 0) + 1);
          } else if ((e.type === 'red' || e.type === 'second-yellow') && e.playerId) {
            redByPid.set(e.playerId, (redByPid.get(e.playerId) || 0) + 1);
          }
        });

        return activeOutput.playerStats
          .filter((p) => p.started || (p.subbedInMinute !== null && p.subbedInMinute <= cutoffMin))
          .map((p) => {
            const subIn = p.subbedInMinute !== null && p.subbedInMinute <= cutoffMin ? p.subbedInMinute : null;
            const subOut =
              p.subbedOutMinute !== null && p.subbedOutMinute <= cutoffMin ? p.subbedOutMinute : null;
            const startMin = p.started ? 0 : (subIn ?? cutoffMin);
            const endMin = subOut ?? cutoffMin;
            const minsNow = Math.max(1, endMin - startMin);
            const pRatio = Math.min(1, minsNow / Math.max(1, p.minutesPlayed || 1));

            const goals = goalsByPid.get(p.playerId) || 0;
            const assists = assistsByPid.get(p.playerId) || 0;
            const shots = shotsByPid.get(p.playerId) || 0;
            const shotsOnTarget = sotByPid.get(p.playerId) || 0;
            const xg = Number((xgByPid.get(p.playerId) || 0).toFixed(2));
            const keyPasses = kpByPid.get(p.playerId) || 0;
            const bigChancesMissed = bcMissByPid.get(p.playerId) || 0;
            const yellowCards = yellowByPid.get(p.playerId) || 0;
            const redCards = redByPid.get(p.playerId) || 0;
            const saves =
              p.positionDetail === 'GK'
                ? p.teamSide === 'home'
                  ? homeStatsStage.saves
                  : awayStatsStage.saves
                : 0;
            const tackles = Math.round(p.tackles * pRatio);
            const interceptions = Math.round(p.interceptions * pRatio);
            const blocks = Math.round((p.blocks ?? 0) * pRatio);
            const clearances = Math.round((p.clearances ?? 0) * pRatio);
            const passesAttempted = Math.round(p.passesAttempted * pRatio);
            const passesCompleted = Math.min(passesAttempted, Math.round(p.passesCompleted * pRatio));
            const throughPasses = Math.round((p.throughPasses ?? 0) * pRatio);
            const throughPassesCompleted = Math.min(
              throughPasses,
              Math.round((p.throughPassesCompleted ?? 0) * pRatio)
            );
            const possessionLost = Math.round((p.possessionLost ?? 0) * pRatio);
            const foulsCommitted = Math.round((p.foulsCommitted ?? 0) * pRatio);

            const liveRating = Math.max(
              4.2,
              Math.min(
                9.9,
                Number(
                  (
                    6.3 +
                    goals * 0.9 +
                    assists * 0.55 +
                    saves * 0.22 +
                    keyPasses * 0.14 +
                    blocks * 0.12 +
                    tackles * 0.08 +
                    interceptions * 0.06 -
                    bigChancesMissed * 0.25 -
                    yellowCards * 0.2 -
                    redCards * 1.1 -
                    Math.max(0, possessionLost - 4) * 0.03
                  ).toFixed(1)
                )
              )
            );

            return {
              playerId: p.playerId,
              name: p.playerName,
              shirtNumber: p.shirtNumber,
              teamSide: p.teamSide,
              position: p.positionDetail,
              roleSlot: p.roleSlot,
              started: p.started,
              subbedInMinute: subIn,
              subbedOutMinute: subOut,
              minutesPlayed: minsNow,
              rating: liveRating,
              isMotm: false,
              goals,
              assists,
              shots,
              shotsOnTarget,
              xg,
              bigChancesMissed,
              keyPasses,
              passesCompleted,
              passesAttempted,
              throughPasses,
              throughPassesCompleted,
              blocks,
              tackles,
              interceptions,
              clearances,
              foulsCommitted,
              possessionLost,
              saves,
              yellowCards,
              redCards,
              staminaRemaining:
                typeof p.staminaRemaining === 'number'
                  ? Math.round(100 - (100 - p.staminaRemaining) * pRatio)
                  : undefined,
            };
          });
      })();

      const shotsLogForDossier: MatchShotBroadcastEntry[] = stageShots.map((s) => ({
        minute: s.minute,
        addedMinute: s.addedMinute,
        teamSide: s.teamSide,
        playerName: s.playerName,
        assistPlayerName: s.assistPlayerName,
        outcome: s.outcome,
        xg: Number(s.xg.toFixed(2)),
        situation: s.situation,
        buildMethod: s.buildMethod,
        channel: s.channel,
        isBigChance: s.isBigChance,
        bodyPart: s.bodyPart,
      }));

      const penaltyKicksForDossier: MatchPenaltyKickBroadcastEntry[] | undefined =
        includePenaltyEvents && activeOutput.penaltyShootout?.kicks?.length
          ? activeOutput.penaltyShootout.kicks.map((k) => ({
              kickNumber: k.kickNumber,
              round: k.round,
              teamSide: k.teamSide,
              takerName: k.takerName,
              keeperName: k.keeperName,
              keeperDive: k.keeperDive,
              outcome: k.outcome,
              missDetail: k.missDetail,
            }))
          : undefined;

      const dossier: MatchBroadcastDossier = {
        matchId: `${activeOutput.seed}::${activeOutput.homeTeamId}-${activeOutput.awayTeamId}`,
        stateVersion: `ov${tacticalOverrides.length}`,
        halfTimeScore:
          stageType !== 'half-time' && !(stageType === 'live-now' && overrideCut?.phase === 'first-half')
            ? {
                home: activeOutput.halfTimeHomeScore,
                away: activeOutput.halfTimeAwayScore,
              }
            : undefined,
        aggregateScore:
          activeOutput.competition.isTwoLegged &&
          isEndStage &&
          typeof activeOutput.aggregateHomeScore === 'number' &&
          typeof activeOutput.aggregateAwayScore === 'number'
            ? {
                home: activeOutput.aggregateHomeScore,
                away: activeOutput.aggregateAwayScore,
              }
            : undefined,
        preMatchContext: {
          homeRating: homeTeam.overallRating,
          awayRating: awayTeam.overallRating,
          homeWinPct: activeOutput.preMatchOdds?.homeWinPct,
          drawPct: activeOutput.preMatchOdds?.drawPct,
          awayWinPct: activeOutput.preMatchOdds?.awayWinPct,
          favouriteSide,
        },
        matchConditions: activeOutput.matchConditions,
        tactics: {
          homeFormation: latestHomeOv?.formation || hSetupForStage?.formation || activeOutput.homeFormation,
          awayFormation: latestAwayOv?.formation || aSetupForStage?.formation || activeOutput.awayFormation,
          homeManager: activeOutput.homeManager,
          awayManager: activeOutput.awayManager,
          homePlayingStyle: hPlan?.playingStyle || homeTeam.playingStyle,
          awayPlayingStyle: aPlan?.playingStyle || awayTeam.playingStyle,
          homePressing: hPlan?.pressingIntensity,
          awayPressing: aPlan?.pressingIntensity,
          homeDefensiveLine: hPlan?.defensiveLine,
          awayDefensiveLine: aPlan?.defensiveLine,
          homeTacticalSummary: activeOutput.tacticalSummaryHome,
          awayTacticalSummary: activeOutput.tacticalSummaryAway,
          tacticalChanges,
        },
        statsAvailable: true,
        stats: {
          home: toBroadcastStats(homeStatsStage, hShots),
          away: toBroadcastStats(awayStatsStage, aShots),
        },
        timelineHighlights,
        shotsLog: shotsLogForDossier,
        playerStats: stagePlayerStats,
        penaltyShootoutKicks: penaltyKicksForDossier,
        substitutions,
        keyPerformers,
        momentumSummary: momentumParts.join(' | '),
        goalBuildBreakdown,
      };

      return {
        dossier,
        homeScore: stageHomeScore,
        awayScore: stageAwayScore,
        possessionHome: homeStatsStage.possession,
        shotsHome: homeStatsStage.shots,
        shotsAway: awayStatsStage.shots,
        xgHome: Number(homeStatsStage.xg.toFixed(2)),
        xgAway: Number(awayStatsStage.xg.toFixed(2)),
        stoppageMinutes,
        goalsForStage,
      };
    },
    [activeOutput, homeTeam, awayTeam, tacticalOverrides, liveHomeSetup, liveAwaySetup, initialHomeSetup, initialAwaySetup]
  );

  const buildBroadcastPayload = useCallback(
    (
      announcementType: MatchBroadcastType,
      kickIndex?: number,
      liveOptions?: {
        liveEvent?: LiveBroadcastEventPayload;
        liveCut?: { minute: number; addedMinute: number; phase: SimMatchPhase };
      }
    ): MatchBroadcastRequest | null => {
      if (!activeOutput || !homeTeam || !awayTeam) return null;
      const snap =
        announcementType === 'live-event' && liveOptions?.liveCut
          ? buildStageDossier('live-now', liveOptions.liveCut)
          : buildStageDossier(announcementType);
      if (!snap) return null;

      const resolvedVoice = resolveVoiceForBroadcastStage(
        geminiVoiceName,
        announcementType,
        `${activeOutput.seed}:${kickIndex ?? ''}`
      );

      const base = {
        announcementType,
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        competitionName: activeOutput.competition.competitionName,
        stageLabel: activeOutput.competition.stageLabel,
        venueName: homeTeam.stadium,
        voiceName: resolvedVoice,
        voiceChoice: geminiVoiceName,
        possessionHome: snap.possessionHome,
        dossier: snap.dossier,
      };

      if (announcementType === 'live-event') {
        const cutPhase = liveOptions?.liveCut?.phase;
        return {
          ...base,
          homeScore: snap.homeScore,
          awayScore: snap.awayScore,
          firstHalfGoals: snap.goalsForStage,
          wentToExtraTime:
            cutPhase === 'extra-time-1' ||
            cutPhase === 'extra-time-2' ||
            cutPhase === 'et-interval',
          liveEvent: liveOptions?.liveEvent,
        };
      }

      if (announcementType === 'half-time') {
        return {
          ...base,
          homeScore: snap.homeScore,
          awayScore: snap.awayScore,
          stoppageMinutes: snap.stoppageMinutes,
          firstHalfGoals: snap.goalsForStage,
        };
      }

      if (announcementType === 'end-of-90' || announcementType === 'et-interval') {
        return {
          ...base,
          homeScore: snap.homeScore,
          awayScore: snap.awayScore,
          stoppageMinutes: snap.stoppageMinutes,
          firstHalfGoals: snap.goalsForStage,
          wentToExtraTime: true,
        };
      }

      if (announcementType === 'penalties-intro') {
        return {
          ...base,
          homeScore: activeOutput.homeScore,
          awayScore: activeOutput.awayScore,
          wentToExtraTime: activeOutput.wentToExtraTime,
          firstHalfGoals: snap.goalsForStage,
        };
      }

      if (announcementType === 'penalty-kick' && activeOutput.penaltyShootout) {
        const kicks = activeOutput.penaltyShootout.kicks;
        const idx =
          typeof kickIndex === 'number'
            ? Math.max(0, Math.min(kicks.length - 1, kickIndex))
            : Math.max(0, kicks.length - 1);
        const kick = kicks[idx];
        if (!kick) return null;
        const slice = kicks.slice(0, idx + 1);
        const homePenScore = slice.filter(
          (k) => k.teamSide === 'home' && k.outcome === 'scored'
        ).length;
        const awayPenScore = slice.filter(
          (k) => k.teamSide === 'away' && k.outcome === 'scored'
        ).length;
        return {
          ...base,
          homeScore: activeOutput.homeScore,
          awayScore: activeOutput.awayScore,
          wentToExtraTime: activeOutput.wentToExtraTime,
          firstHalfGoals: snap.goalsForStage,
          penaltyKick: {
            kickNumber: kick.kickNumber,
            round: kick.round,
            suddenDeath: kick.round > 5,
            teamSide: kick.teamSide,
            takerName: kick.takerName,
            keeperName: kick.keeperName,
            outcome: kick.outcome,
            homePenScore,
            awayPenScore,
            isDecisiveWinner: idx === kicks.length - 1,
          },
        };
      }

      return {
        ...base,
        homeScore: activeOutput.homeScore,
        awayScore: activeOutput.awayScore,
        stoppageMinutes: snap.stoppageMinutes,
        wentToExtraTime: activeOutput.wentToExtraTime,
        firstHalfGoals: snap.goalsForStage,
        penaltyShootout: activeOutput.penaltyShootout
          ? {
              homeScore: activeOutput.penaltyShootout.homeScore,
              awayScore: activeOutput.penaltyShootout.awayScore,
              winner: activeOutput.penaltyShootout.winner,
            }
          : undefined,
      };
    },
    [activeOutput, homeTeam, awayTeam, geminiVoiceName, buildStageDossier]
  );

  const prefetchBroadcast = useCallback(
    (
      announcementType: MatchBroadcastType,
      kickIndex?: number,
      liveOptions?: {
        liveEvent?: LiveBroadcastEventPayload;
        liveCut?: { minute: number; addedMinute: number; phase: SimMatchPhase };
      }
    ) => {
      if (screen !== 'match' || !activeOutput || !geminiSoundEnabled || isMuted) return;
      const cacheKey = `${activeOutput.seed}::${tacticalOverrides.length}::${geminiVoiceName}::${announcementType}::${
        kickIndex ?? (liveOptions?.liveEvent?.id || liveOptions?.liveEvent?.minute || '')
      }`;
      if (prefetchedBroadcastKeysRef.current.has(cacheKey)) return;
      const payload = buildBroadcastPayload(announcementType, kickIndex, liveOptions);
      if (!payload) return;
      prefetchedBroadcastKeysRef.current.add(cacheKey);

      const labelMap: Record<MatchBroadcastType, string> = {
        'live-event': 'Live Match Commentary',
        'half-time': 'Half-Time Report',
        'end-of-90': 'End of 90\' Report',
        'et-interval': 'Extra-Time Break Report',
        'penalties-intro': 'Shootout Intro',
        'penalty-kick': 'Penalty Commentary',
        'full-time': 'Full-Time Report',
      };

      const isPrimaryStage =
        announcementType !== 'penalty-kick' && announcementType !== 'live-event';
      if (isPrimaryStage) {
        setPrefetchStageLabel(labelMap[announcementType]);
        setPrefetchStatus('preparing');
      }

      void fetchMatchBroadcastAudio(payload)
        .then((res) => {
          if (isPrimaryStage) {
            setPrefetchStageLabel(labelMap[announcementType]);
            setPrefetchStatus('ready');
            setHalftimeScript((prev) => prev || res.script);
            if (res.storyline) {
              setHalftimeStoryline((prev) => prev || res.storyline || null);
            }
          }
        })
        .catch(() => {
          prefetchedBroadcastKeysRef.current.delete(cacheKey);
          if (isPrimaryStage) {
            setPrefetchStatus((prev) => (prev === 'preparing' ? 'idle' : prev));
          }
        });
    },
    [
      screen,
      activeOutput,
      tacticalOverrides.length,
      geminiSoundEnabled,
      isMuted,
      geminiVoiceName,
      buildBroadcastPayload,
    ]
  );

  const playMatchBroadcast = useCallback(
    async (
      announcementType: MatchBroadcastType,
      options?: {
        forceReplay?: boolean;
        kickIndex?: number;
        waitForPrevious?: boolean;
        lockPenaltyQueue?: boolean;
        delayAfterPreviousMs?: number;
        priority?: number;
        liveEvent?: LiveBroadcastEventPayload;
        liveCut?: { minute: number; addedMinute: number; phase: SimMatchPhase };
      }
    ) => {
      const payload = buildBroadcastPayload(
        announcementType,
        options?.kickIndex,
        options?.liveEvent && options?.liveCut
          ? { liveEvent: options.liveEvent, liveCut: options.liveCut }
          : undefined
      );
      if (!payload) return;
      if (!options?.forceReplay && (!geminiSoundEnabled || isMuted)) return;

      const callPriority = options?.priority ?? 4;
      const epoch = cancelEpochRef.current;

      const run = (async () => {
        let token = 0;
        if (options?.lockPenaltyQueue) {
          setIsPenaltyAudioBusy(true);
        }

        try {
          if (options?.waitForPrevious) {
            const prior = activePlaybackPromiseRef.current;
            if (prior) {
              await prior.catch(() => {});
            }
            if (geminiHalftimeAudio.isPlaying()) {
              await geminiHalftimeAudio.waitForIdle();
            }
            if (cancelEpochRef.current !== epoch) return;
            if (options.delayAfterPreviousMs && options.delayAfterPreviousMs > 0) {
              await new Promise((r) => window.setTimeout(r, options.delayAfterPreviousMs));
              if (cancelEpochRef.current !== epoch) return;
            }
          }

          token = ++broadcastTokenRef.current;
          activeBroadcastPriorityRef.current = callPriority;
          isLiveSpeechActiveRef.current = true;
          geminiHalftimeAudio.unlock();
          setHalftimeAudioError(null);
          setHalftimeAudioStatus('generating');

          const res = await fetchMatchBroadcastAudio(payload);
          if (token !== broadcastTokenRef.current || cancelEpochRef.current !== epoch) return;

          setHalftimeScript(res.script);
          if (res.storyline) {
            setHalftimeStoryline(res.storyline);
          }
          if (announcementType !== 'penalty-kick' && announcementType !== 'live-event') {
            setPrefetchStatus('ready');
          }
          await geminiHalftimeAudio.playBroadcastResponse(res, {
            onStart: () => {
              if (token === broadcastTokenRef.current) {
                isLiveSpeechActiveRef.current = true;
                audioAtmosphere.setVolume(announcementType === 'live-event' ? 0.16 : 0.1);
                setHalftimeAudioStatus('playing');
              }
            },
            onEnd: () => {
              if (token === broadcastTokenRef.current) {
                isLiveSpeechActiveRef.current = false;
                activeBroadcastPriorityRef.current = 0;
                audioAtmosphere.setVolume(0.35);
                setHalftimeAudioStatus('ready');
              }
            },
            onError: (msg) => {
              if (token === broadcastTokenRef.current) {
                isLiveSpeechActiveRef.current = false;
                activeBroadcastPriorityRef.current = 0;
                audioAtmosphere.setVolume(0.35);
                setHalftimeAudioError(msg);
                setHalftimeAudioStatus('error');
              }
            },
          });
        } catch (err) {
          if (token === broadcastTokenRef.current && cancelEpochRef.current === epoch) {
            isLiveSpeechActiveRef.current = false;
            activeBroadcastPriorityRef.current = 0;
            audioAtmosphere.setVolume(0.35);
            setHalftimeAudioError(
              err instanceof Error ? err.message : 'Unable to play Gemini broadcast audio.'
            );
            setHalftimeAudioStatus('error');
          }
        } finally {
          if (token === broadcastTokenRef.current) {
            isLiveSpeechActiveRef.current = false;
            activeBroadcastPriorityRef.current = 0;
          }
          if (options?.lockPenaltyQueue && cancelEpochRef.current === epoch) {
            setIsPenaltyAudioBusy(false);
          }
        }
      })();

      activePlaybackPromiseRef.current = run;
      await run;
      if (activePlaybackPromiseRef.current === run) {
        activePlaybackPromiseRef.current = null;
      }
    },
    [buildBroadcastPayload, geminiSoundEnabled, isMuted]
  );

  // Background prefetch early (one stage at a time) so AI audio is ready cleanly at each whistle
  useEffect(() => {
    if (screen !== 'match' || !activeOutput || !geminiSoundEnabled || isMuted) return;

    if (phase === 'first-half' && currentMinute >= 22) {
      prefetchBroadcast('half-time');
    } else if (
      phase === 'half-time' ||
      (phase === 'second-half' && currentMinute >= 66)
    ) {
      if (activeOutput.wentToExtraTime) {
        prefetchBroadcast('end-of-90');
      } else if (activeOutput.penaltyShootout) {
        prefetchBroadcast('penalties-intro');
      } else {
        prefetchBroadcast('full-time');
      }
    } else if (
      phase === 'end-of-90' ||
      (phase === 'extra-time-1' && currentMinute >= 96)
    ) {
      prefetchBroadcast('et-interval');
    } else if (
      phase === 'et-interval' ||
      (phase === 'extra-time-2' && currentMinute >= 112)
    ) {
      if (activeOutput.penaltyShootout) {
        prefetchBroadcast('penalties-intro');
      } else {
        prefetchBroadcast('full-time');
      }
    } else if (
      (phase === 'penalties' || phase === 'penalties-intro') &&
      activeOutput.penaltyShootout
    ) {
      const kicks = activeOutput.penaltyShootout.kicks;
      if (penaltiesRevealed < kicks.length) {
        prefetchBroadcast('penalty-kick', penaltiesRevealed);
      }
      if (penaltiesRevealed >= Math.max(0, kicks.length - 1)) {
        prefetchBroadcast('full-time');
      }
    }
  }, [
    screen,
    phase,
    currentMinute,
    penaltiesRevealed,
    activeOutput,
    geminiSoundEnabled,
    isMuted,
    prefetchBroadcast,
  ]);

  // Automatic Gemini broadcasts on phase breaks, penalties intro, and full-time
  useEffect(() => {
    if (screen !== 'match' || !activeOutput) {
      if (phaseDelayTimerRef.current) {
        window.clearTimeout(phaseDelayTimerRef.current);
        phaseDelayTimerRef.current = null;
      }
      return;
    }

    let targetType: MatchBroadcastType | null = null;
    let delayMs = 800;
    let waitForPrev = false;
    let lockPenaltyQueue = false;

    if (phase === 'half-time') {
      targetType = 'half-time';
      delayMs = 800;
    } else if (phase === 'end-of-90') {
      targetType = 'end-of-90';
      delayMs = 800;
    } else if (phase === 'et-interval') {
      targetType = 'et-interval';
      delayMs = 800;
    } else if (phase === 'penalties' || phase === 'penalties-intro') {
      targetType = 'penalties-intro';
      delayMs = 700;
      lockPenaltyQueue = true;
    } else if (phase === 'full-time') {
      targetType = 'full-time';
      const hasLiveShootoutKickPlaying =
        Boolean(activeOutput.penaltyShootout) && !skipNextFullTimeWaitRef.current;
      waitForPrev = hasLiveShootoutKickPlaying;
      delayMs = hasLiveShootoutKickPlaying ? 50 : 900;
      skipNextFullTimeWaitRef.current = false;
    }

    if (!targetType) {
      if (phaseDelayTimerRef.current) {
        window.clearTimeout(phaseDelayTimerRef.current);
        phaseDelayTimerRef.current = null;
      }
      return;
    }

    if (!geminiSoundEnabled || isMuted) return;

    const phaseKey = `${activeOutput.seed}::${tacticalOverrides.length}::${targetType}::${geminiVoiceName}`;
    if (announcedPhaseKeyRef.current === phaseKey) return;
    announcedPhaseKeyRef.current = phaseKey;

    if (lockPenaltyQueue) {
      setIsPenaltyAudioBusy(true);
    }

    const scheduledType = targetType;
    phaseDelayTimerRef.current = window.setTimeout(() => {
      phaseDelayTimerRef.current = null;
      void playMatchBroadcast(scheduledType, {
        waitForPrevious: waitForPrev,
        delayAfterPreviousMs: waitForPrev ? 450 : 0,
        lockPenaltyQueue,
      });
    }, delayMs);

    return () => {
      if (phaseDelayTimerRef.current) {
        window.clearTimeout(phaseDelayTimerRef.current);
        phaseDelayTimerRef.current = null;
      }
    };
  }, [
    screen,
    phase,
    activeOutput,
    tacticalOverrides.length,
    geminiSoundEnabled,
    isMuted,
    geminiVoiceName,
    playMatchBroadcast,
  ]);

  useEffect(() => {
    if (isMuted || screen !== 'match') {
      stopBroadcastAudio();
    }
  }, [isMuted, screen, stopBroadcastAudio]);

  const handleChangeTeam = (side: 'home' | 'away', team: Team) => {
    selectTeam(team, side);
  };

  // Start Match from Dugout
  const startMatchWithParams = useCallback(
    (
      overrideSeed?: string,
      overrideHome?: SimTeamSetup,
      overrideAway?: SimTeamSetup
    ) => {
      if (!homeTeam || !awayTeam) return;
      const rawHome = overrideHome || initialHomeSetup || buildInitialTeamSetup(homeTeam, homeManager);
      const rawAway = overrideAway || initialAwaySetup || buildInitialTeamSetup(awayTeam, awayManager);
      const hSetup: SimTeamSetup = {
        ...rawHome,
        penaltyOrderIds: homeTeam.penaltyOrderIds?.length ? homeTeam.penaltyOrderIds : rawHome.penaltyOrderIds,
      };
      const aSetup: SimTeamSetup = {
        ...rawAway,
        penaltyOrderIds: awayTeam.penaltyOrderIds?.length ? awayTeam.penaltyOrderIds : rawAway.penaltyOrderIds,
      };
      const runSeed = overrideSeed || seed || generateRandomSeed();

      const result = simulateMatch({
        seed: runSeed,
        competition,
        homeTeam,
        awayTeam,
        homeManager,
        awayManager,
        initialHomeSetup: hSetup,
        initialAwaySetup: aSetup,
        tacticalOverrides: [],
      });

      setTacticalOverrides([]);
      setLiveHomeSetup(hSetup);
      setLiveAwaySetup(aSetup);
      setActiveOutput(result);
      setScreen('match');
      setMode(startMode);
      setSavedNotice(null);
      setFilingNotice(null);
      setHalftimeScript(null);
      setHalftimeStoryline(null);
      setHalftimeAudioError(null);
      setHalftimeAudioStatus('idle');
      setPrefetchStatus('idle');
      setPrefetchStageLabel(null);
      prefetchedBroadcastKeysRef.current.clear();
      announcedLiveEventIdsRef.current.clear();
      lastLiveCommentaryAtRef.current = 0;
      activeBroadcastPriorityRef.current = 0;
      isLiveSpeechActiveRef.current = false;
      announcedPhaseKeyRef.current = null;
      skipNextFullTimeWaitRef.current = startMode === 'instant';
      stopBroadcastAudio();
      geminiHalftimeAudio.unlock();
      recordedKeyRef.current = null;
      lastAnnouncedGoalIdRef.current = null;
      setGoalBannerEvent(null);

      if (!isMuted) {
        audioAtmosphere.playSoundEffect('whistle');
      }

      if (startMode === 'instant') {
        setCurrentMinute(result.finalMinute);
        setCurrentAddedMinute(result.wentToExtraTime ? result.stoppageET2 : result.stoppage2H);
        setPhase('full-time');
        setIsPlaying(false);
        setPenaltiesRevealed(result.penaltyShootout?.kicks.length || 0);
      } else if (startMode === 'next-break') {
        setCurrentMinute(45);
        setCurrentAddedMinute(result.stoppage1H);
        setPhase('half-time');
        setIsPlaying(false);
        setPenaltiesRevealed(0);
      } else {
        setCurrentMinute(1);
        setCurrentAddedMinute(0);
        setPhase('first-half');
        setIsPlaying(true);
        setPenaltiesRevealed(0);
      }
    },
    [homeTeam, awayTeam, homeManager, awayManager, initialHomeSetup, initialAwaySetup, seed, competition, startMode, isMuted]
  );

  // Playback Timer (Live & Highlights modes — steps smoothly through regular & stoppage minutes)
  useEffect(() => {
    if (screen !== 'match' || !activeOutput || !isPlaying) return;
    if (
      phase === 'half-time' ||
      phase === 'end-of-90' ||
      phase === 'et-interval' ||
      phase === 'penalties-intro' ||
      phase === 'penalties' ||
      phase === 'full-time'
    ) {
      return;
    }

    const baseDelay = mode === 'highlights' ? 280 : 720;
    const delayMs = Math.max(120, Math.round(baseDelay / speed));

    const timer = setTimeout(() => {
      const periodTicks: Array<{ minute: number; addedMinute: number }> = [];
      if (phase === 'first-half') {
        for (let m = 1; m <= 45; m++) periodTicks.push({ minute: m, addedMinute: 0 });
        for (let a = 1; a <= activeOutput.stoppage1H; a++) periodTicks.push({ minute: 45, addedMinute: a });
      } else if (phase === 'second-half') {
        for (let m = 46; m <= 90; m++) periodTicks.push({ minute: m, addedMinute: 0 });
        for (let a = 1; a <= activeOutput.stoppage2H; a++) periodTicks.push({ minute: 90, addedMinute: a });
      } else if (phase === 'extra-time-1') {
        for (let m = 91; m <= 105; m++) periodTicks.push({ minute: m, addedMinute: 0 });
        for (let a = 1; a <= activeOutput.stoppageET1; a++) periodTicks.push({ minute: 105, addedMinute: a });
      } else if (phase === 'extra-time-2') {
        for (let m = 106; m <= 120; m++) periodTicks.push({ minute: m, addedMinute: 0 });
        for (let a = 1; a <= activeOutput.stoppageET2; a++) periodTicks.push({ minute: 120, addedMinute: a });
      }

      const curIdx = periodTicks.findIndex(
        (t) => t.minute === currentMinute && t.addedMinute === currentAddedMinute
      );

      let step = 1;
      if (mode === 'highlights') {
        const curOrder = getTickOrder(currentMinute, currentAddedMinute);
        const nextKey = activeOutput.events.find(
          (e) =>
            e.isKeyMoment &&
            getTickOrder(e.minute, e.addedMinute) > curOrder + 1e-6 &&
            ((phase === 'first-half' && e.minute <= 45) ||
              (phase === 'second-half' && e.minute >= 46 && e.minute <= 90) ||
              (phase === 'extra-time-1' && e.minute >= 91 && e.minute <= 105) ||
              (phase === 'extra-time-2' && e.minute >= 106))
        );
        if (nextKey) {
          const targetIdx = periodTicks.findIndex(
            (t) => t.minute === nextKey.minute && t.addedMinute === (nextKey.addedMinute || 0)
          );
          step = targetIdx > curIdx ? Math.min(8, targetIdx - curIdx) : 1;
        } else {
          step = 4;
        }
      }

      const nextIdx = (curIdx >= 0 ? curIdx : 0) + step;

      if (nextIdx >= periodTicks.length - 1) {
        const lastTick = periodTicks[periodTicks.length - 1];
        if (lastTick) {
          setCurrentMinute(lastTick.minute);
          setCurrentAddedMinute(lastTick.addedMinute);
        }
        if (phase === 'first-half') {
          setPhase('half-time');
          setIsPlaying(false);
        } else if (phase === 'second-half') {
          if (activeOutput.wentToExtraTime) {
            setPhase('end-of-90');
          } else if (activeOutput.penaltyShootout) {
            setPhase('penalties');
          } else {
            setPhase('full-time');
          }
          setIsPlaying(false);
        } else if (phase === 'extra-time-1') {
          setPhase('et-interval');
          setIsPlaying(false);
        } else if (phase === 'extra-time-2') {
          setPhase(activeOutput.penaltyShootout ? 'penalties' : 'full-time');
          setIsPlaying(false);
        }
        if (!isMuted) audioAtmosphere.playSoundEffect('whistle');
        return;
      }

      const nextTick = periodTicks[nextIdx];
      setCurrentMinute(nextTick.minute);
      setCurrentAddedMinute(nextTick.addedMinute);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [screen, activeOutput, isPlaying, phase, currentMinute, currentAddedMinute, mode, speed, isMuted]);

  // Trigger Goal Celebration Banner & Audio SFX cleanly when crossing a goal minute
  useEffect(() => {
    if (screen !== 'match' || !activeOutput) return;
    if (phase === 'full-time' && mode === 'instant') return;

    const curOrder = getTickOrder(currentMinute, currentAddedMinute);
    const latestGoal = [...activeOutput.events]
      .reverse()
      .find(
        (e) =>
          (e.type === 'goal' || e.type === 'own-goal') &&
          getTickOrder(e.minute, e.addedMinute) <= curOrder + 1e-6
      );

    if (latestGoal && latestGoal.id !== lastAnnouncedGoalIdRef.current) {
      lastAnnouncedGoalIdRef.current = latestGoal.id;
      setGoalBannerEvent(latestGoal);
      if (!isMuted) audioAtmosphere.playSoundEffect('roar');
      if (goalBannerTimerRef.current) {
        window.clearTimeout(goalBannerTimerRef.current);
      }
      const duration = speed >= 2 ? 2000 : 2800;
      goalBannerTimerRef.current = window.setTimeout(() => {
        setGoalBannerEvent(null);
        goalBannerTimerRef.current = null;
      }, duration);
    }
  }, [screen, activeOutput, currentMinute, currentAddedMinute, phase, mode, speed, isMuted]);

  // Synchronized live two-commentator match commentary during active play
  useEffect(() => {
    if (
      screen !== 'match' ||
      !activeOutput ||
      !isPlaying ||
      !geminiSoundEnabled ||
      isMuted ||
      mode === 'instant'
    ) {
      return;
    }
    if (
      phase !== 'first-half' &&
      phase !== 'second-half' &&
      phase !== 'extra-time-1' &&
      phase !== 'extra-time-2'
    ) {
      return;
    }

    const curOrder = getTickOrder(currentMinute, currentAddedMinute);

    const priorityOf = (type: string): number => {
      if (type === 'goal' || type === 'own-goal' || type === 'red' || type === 'second-yellow') {
        return 3;
      }
      if (type === 'penalty-missed' || type === 'woodwork' || type === 'big-chance-missed') {
        return 2;
      }
      if (type === 'shot-saved' || type === 'tactical-change' || type === 'sub') {
        return 1;
      }
      return 0;
    };

    // Warm-prefetch upcoming critical events (1..5 mins ahead) so voice starts promptly
    if (speed <= 1.5) {
      const nextMajor = activeOutput.events.find((e) => {
        if (announcedLiveEventIdsRef.current.has(e.id)) return false;
        if (priorityOf(e.type) < 2) return false;
        const diff = getTickOrder(e.minute, e.addedMinute) - curOrder;
        return diff > 0.25 && diff <= 4.5;
      });
      if (nextMajor) {
        prefetchBroadcast('live-event', undefined, {
          liveCut: {
            minute: nextMajor.minute,
            addedMinute: nextMajor.addedMinute || 0,
            phase,
          },
          liveEvent: {
            id: nextMajor.id,
            type: nextMajor.type,
            minute: nextMajor.minute,
            addedMinute: nextMajor.addedMinute,
            teamSide: nextMajor.teamSide,
            playerName: nextMajor.playerName,
            assistPlayerName: nextMajor.assistPlayerName,
            secondaryPlayerName: nextMajor.secondaryPlayerName,
            isPenalty: nextMajor.isPenalty,
            commentary: nextMajor.commentary,
          },
        });
      }
    }

    const crossedEvents = activeOutput.events.filter(
      (e) =>
        priorityOf(e.type) > 0 &&
        !announcedLiveEventIdsRef.current.has(e.id) &&
        getTickOrder(e.minute, e.addedMinute) <= curOrder + 1e-6
    );

    if (crossedEvents.length > 0) {
      // Mark all newly crossed events as seen so stale highlights never backlog
      for (const ev of crossedEvents) {
        announcedLiveEventIdsRef.current.add(ev.id);
      }

      // Pick the single highest-priority recent event within 3 minutes of playback clock
      const freshCandidates = crossedEvents
        .filter((e) => curOrder - getTickOrder(e.minute, e.addedMinute) <= 3.1)
        .sort((a, b) => {
          const pd = priorityOf(b.type) - priorityOf(a.type);
          if (pd !== 0) return pd;
          return getTickOrder(b.minute, b.addedMinute) - getTickOrder(a.minute, a.addedMinute);
        });

      const chosen = freshCandidates[0];
      if (chosen) {
        const pri = priorityOf(chosen.type);
        const now = Date.now();
        const msSinceLast = now - lastLiveCommentaryAtRef.current;
        const isCurrentlyBusy =
          isLiveSpeechActiveRef.current || geminiHalftimeAudio.isPlaying();

        const canSpeak =
          pri === 3
            ? !isCurrentlyBusy || activeBroadcastPriorityRef.current <= 2
            : pri === 2
            ? !isCurrentlyBusy && msSinceLast >= 5500 && speed <= 2
            : !isCurrentlyBusy && msSinceLast >= 9000 && speed <= 1.5;

        if (canSpeak) {
          lastLiveCommentaryAtRef.current = now;
          const liveGoalsSoFar = activeOutput.events.filter(
            (e) =>
              (e.type === 'goal' || e.type === 'own-goal') &&
              getTickOrder(e.minute, e.addedMinute) <= curOrder + 1e-6
          );
          const hLive = liveGoalsSoFar.filter((e) => e.teamSide === 'home').length;
          const aLive = liveGoalsSoFar.filter((e) => e.teamSide === 'away').length;
          const isLateClose =
            chosen.minute >= 82 && Math.abs(hLive - aLive) <= 1;

          void playMatchBroadcast('live-event', {
            priority: pri,
            liveCut: {
              minute: currentMinute,
              addedMinute: currentAddedMinute,
              phase,
            },
            liveEvent: {
              id: chosen.id,
              type: chosen.type,
              minute: chosen.minute,
              addedMinute: chosen.addedMinute,
              teamSide: chosen.teamSide,
              playerName: chosen.playerName,
              assistPlayerName: chosen.assistPlayerName,
              secondaryPlayerName: chosen.secondaryPlayerName,
              isPenalty: chosen.isPenalty,
              commentary: chosen.commentary,
              isLateClose,
            },
          });
          return;
        }
      }
    }

    // Late-match tension observation once around minute 85-87 if close game & idle
    if (
      phase === 'second-half' &&
      currentMinute >= 85 &&
      currentMinute <= 87 &&
      !announcedLiveEventIdsRef.current.has('late-tension-85') &&
      speed <= 1.5 &&
      !isLiveSpeechActiveRef.current &&
      !geminiHalftimeAudio.isPlaying() &&
      Date.now() - lastLiveCommentaryAtRef.current >= 9000
    ) {
      const liveGoalsSoFar = activeOutput.events.filter(
        (e) =>
          (e.type === 'goal' || e.type === 'own-goal') &&
          getTickOrder(e.minute, e.addedMinute) <= curOrder + 1e-6
      );
      const hLive = liveGoalsSoFar.filter((e) => e.teamSide === 'home').length;
      const aLive = liveGoalsSoFar.filter((e) => e.teamSide === 'away').length;
      announcedLiveEventIdsRef.current.add('late-tension-85');
      if (Math.abs(hLive - aLive) <= 1) {
        lastLiveCommentaryAtRef.current = Date.now();
        void playMatchBroadcast('live-event', {
          priority: 1,
          liveCut: {
            minute: currentMinute,
            addedMinute: currentAddedMinute,
            phase,
          },
          liveEvent: {
            id: 'late-tension-85',
            type: 'late-tension',
            minute: currentMinute,
            addedMinute: currentAddedMinute,
            isLateClose: true,
          },
        });
      }
    }
  }, [
    screen,
    activeOutput,
    isPlaying,
    geminiSoundEnabled,
    isMuted,
    mode,
    phase,
    currentMinute,
    currentAddedMinute,
    speed,
    prefetchBroadcast,
    playMatchBroadcast,
  ]);

  // Automatic Completion Recording & Competition Fixture Filing at Full-Time
  useEffect(() => {
    if (screen !== 'match' || !activeOutput || phase !== 'full-time') return;
    const key = `${activeOutput.seed}::${activeOutput.homeTeamId}::${activeOutput.awayTeamId}::${tacticalOverrides.length}`;
    if (recordedKeyRef.current === key) return;
    recordedKeyRef.current = key;

    const penaltySummary = activeOutput.penaltyShootout
      ? `${activeOutput.penaltyShootout.homeScore}-${activeOutput.penaltyShootout.awayScore} pens (${
          activeOutput.penaltyShootout.winner === 'home'
            ? activeOutput.homeCode
            : activeOutput.awayCode
        })`
      : undefined;

    const mappedEvents = activeOutput.events
      .filter(
        (e): e is SimTimelineEvent & { type: 'goal' | 'yellow' | 'red' | 'sub' } =>
          (e.type === 'goal' || e.type === 'yellow' || e.type === 'red' || e.type === 'sub') &&
          Boolean(e.teamSide)
      )
      .map((e) => ({
        minute: e.minute,
        type: e.type,
        teamSide: e.teamSide!,
        playerId: e.playerId,
        playerName: e.playerName || 'Player',
        assistPlayerId: e.assistPlayerId,
        assistPlayerName: e.assistPlayerName,
        detail: e.isPenalty
          ? 'Penalty'
          : e.assistPlayerName
          ? `Assist: ${e.assistPlayerName}`
          : e.commentary,
      }));

    const pendingFiling = recordSimulationMatch({
      homeTeamId: activeOutput.homeTeamId,
      awayTeamId: activeOutput.awayTeamId,
      homeScore: activeOutput.homeScore,
      awayScore: activeOutput.awayScore,
      halfTimeHomeScore: activeOutput.halfTimeHomeScore,
      halfTimeAwayScore: activeOutput.halfTimeAwayScore,
      wentToExtraTime: activeOutput.wentToExtraTime,
      penaltySummary,
      seed: activeOutput.seed,
      competitionId: activeOutput.competition.competitionId,
      competitionName: activeOutput.competition.competitionName,
      competitionFixtureId: activeOutput.competition.fixtureId,
      venue: homeTeam?.stadium,
      possessionHome: activeOutput.homeStats.possession,
      shotsHome: activeOutput.homeStats.shots,
      shotsAway: activeOutput.awayStats.shots,
      xgHome: activeOutput.homeStats.xg,
      xgAway: activeOutput.awayStats.xg,
      lineupPlayerIds: activeOutput.lineupPlayerIds,
      events: mappedEvents,
      fullPayload: activeOutput,
    })
      .then((res) => {
        if (res.fixtureFilingStatus === 'filed') {
          setFilingNotice(
            `Result filed automatically to ${activeOutput.competition.competitionName} (${activeOutput.competition.stageLabel}).`
          );
        } else if (res.fixtureFilingStatus === 'already-settled') {
          setFilingNotice(
            `Replay saved — official already-settled fixture in ${activeOutput.competition.competitionName} was preserved without overwriting.`
          );
        }
      })
      .finally(() => {
        if (filingPromiseRef.current === pendingFiling) {
          filingPromiseRef.current = null;
        }
      });

    filingPromiseRef.current = pendingFiling;
  }, [screen, activeOutput, phase, tacticalOverrides.length, homeTeam?.stadium, recordSimulationMatch]);

  // Visible Slice Computation (Guaranteed synced with activeOutput & stoppage minutes)
  const visibleSlice = useMemo(() => {
    if (!activeOutput) return null;
    const isEnd = phase === 'full-time' || phase === 'penalties' || phase === 'penalties-intro';
    const isHalfTime = phase === 'half-time';
    const isEndOf90 = phase === 'end-of-90';
    const isEtInterval = phase === 'et-interval';

    const cutoffMinute = isEnd
      ? activeOutput.finalMinute
      : isHalfTime
      ? 45
      : isEndOf90
      ? 90
      : isEtInterval
      ? 105
      : currentMinute;

    const cutoffAdded = isEnd
      ? activeOutput.wentToExtraTime
        ? activeOutput.stoppageET2
        : activeOutput.stoppage2H
      : isHalfTime
      ? activeOutput.stoppage1H
      : isEndOf90
      ? activeOutput.stoppage2H
      : isEtInterval
      ? activeOutput.stoppageET1
      : currentAddedMinute;

    const cutoffOrder = getTickOrder(cutoffMinute, cutoffAdded);

    const visibleEvents = activeOutput.events.filter((e) => {
      if (e.period === 'PEN' && phase !== 'penalties' && phase !== 'full-time') return false;
      if (e.type === 'full-time' && phase !== 'full-time') return false;
      if (e.type === 'half-time' && phase === 'first-half') return false;
      if (e.type === 'et-half-time' && phase === 'extra-time-1') return false;
      return getTickOrder(e.minute, e.addedMinute) <= cutoffOrder + 1e-6;
    });

    const visibleShots = isEnd
      ? activeOutput.shots
      : activeOutput.shots.filter((s) => getTickOrder(s.minute, s.addedMinute) <= cutoffOrder + 1e-6);

    const visibleMomentum = isEnd
      ? activeOutput.momentum
      : truncateMomentumForLiveMatch(activeOutput.momentum, cutoffMinute, cutoffAdded);

    if (isEnd) {
      return {
        homeScore: activeOutput.homeScore,
        awayScore: activeOutput.awayScore,
        visibleEvents,
        visibleShots,
        visibleMomentum,
        homeStats: activeOutput.homeStats,
        awayStats: activeOutput.awayStats,
      };
    }

    const hGoals = visibleEvents.filter((e) => (e.type === 'goal' || e.type === 'own-goal') && e.teamSide === 'home').length;
    const aGoals = visibleEvents.filter((e) => (e.type === 'goal' || e.type === 'own-goal') && e.teamSide === 'away').length;
    const hShots = visibleShots.filter((s) => s.teamSide === 'home');
    const aShots = visibleShots.filter((s) => s.teamSide === 'away');
    const hSot = hShots.filter((s) => s.outcome === 'goal' || s.outcome === 'saved').length;
    const aSot = aShots.filter((s) => s.outcome === 'goal' || s.outcome === 'saved').length;
    const hXg = hShots.reduce((s, x) => s + x.xg, 0);
    const aXg = aShots.reduce((s, x) => s + x.xg, 0);
    const hYel = visibleEvents.filter((e) => e.type === 'yellow' && e.teamSide === 'home').length;
    const aYel = visibleEvents.filter((e) => e.type === 'yellow' && e.teamSide === 'away').length;
    const hRed = visibleEvents.filter(
      (e) => (e.type === 'red' || e.type === 'second-yellow') && e.teamSide === 'home'
    ).length;
    const aRed = visibleEvents.filter(
      (e) => (e.type === 'red' || e.type === 'second-yellow') && e.teamSide === 'away'
    ).length;

    const totalTicks = Math.max(1, activeOutput.momentum.length);
    const ratio = Math.max(0.05, Math.min(1, visibleMomentum.length / totalTicks));
    const avgMom =
      visibleMomentum.length > 0
        ? visibleMomentum.reduce((s, m) => s + m.smoothedDiff, 0) / visibleMomentum.length
        : 0;
    const livePossHome =
      cutoffMinute < 5
        ? 50
        : Math.max(
            24,
            Math.min(
              76,
              Math.round(
                activeOutput.homeStats.possession * ratio + (50 + avgMom * 0.25) * (1 - ratio)
              )
            )
          );

    return {
      homeScore: hGoals,
      awayScore: aGoals,
      visibleEvents,
      visibleShots,
      visibleMomentum,
      homeStats: scaleLiveTeamStats(
        activeOutput.homeStats,
        ratio,
        hShots.length,
        hSot,
        hXg,
        hYel,
        hRed,
        livePossHome
      ),
      awayStats: scaleLiveTeamStats(
        activeOutput.awayStats,
        ratio,
        aShots.length,
        aSot,
        aXg,
        aYel,
        aRed,
        100 - livePossHome
      ),
    };
  }, [activeOutput, phase, currentMinute, currentAddedMinute]);

  // Mid-match or break tactical update -> checkpoint + deterministic re-simulation of remaining minutes
  const handleApplyInMatchTactic = (side: 'home' | 'away', nextSetup: SimTeamSetup) => {
    if (!homeTeam || !awayTeam || !initialHomeSetup || !initialAwaySetup || !activeOutput) return;
    if (side === 'home') setLiveHomeSetup(nextSetup);
    else setLiveAwaySetup(nextSetup);

    const effectiveMinute =
      phase === 'half-time'
        ? 46
        : phase === 'end-of-90'
        ? 91
        : phase === 'et-interval'
        ? 106
        : Math.max(1, currentMinute + 1);

    const checkpoint: SimTacticalOverrideCheckpoint = {
      minute: effectiveMinute,
      teamSide: side,
      planId: nextSetup.activePlan,
      formation: nextSetup.formation,
      planConfig: nextSetup.plans[nextSetup.activePlan],
      slots: nextSetup.slots,
      bench: nextSetup.bench,
    };

    const nextOverrides = [
      ...tacticalOverrides.filter((o) => !(o.minute === checkpoint.minute && o.teamSide === side)),
      checkpoint,
    ];
    setTacticalOverrides(nextOverrides);

    const updatedResult = simulateMatch({
      seed: activeOutput.seed,
      competition: activeOutput.competition,
      homeTeam,
      awayTeam,
      homeManager,
      awayManager,
      initialHomeSetup,
      initialAwaySetup,
      tacticalOverrides: nextOverrides,
    });
    setActiveOutput(updatedResult);
  };

  const handleSwitchPlanLive = (side: 'home' | 'away', planId: SimPlanId) => {
    const team = side === 'home' ? homeTeam : awayTeam;
    const current = side === 'home' ? liveHomeSetup : liveAwaySetup;
    if (!team || !current) return;
    const plan = current.plans[planId];
    const currentIds = current.slots
      .map((s) => s.player?.id)
      .filter((id): id is string => Boolean(id));
    const { slots, bench } = buildDugoutLineup(team, plan.formation, currentIds);
    handleApplyInMatchTactic(side, {
      ...current,
      activePlan: planId,
      formation: plan.formation,
      slots,
      bench,
    });
  };

  const handleResumeFromBreak = () => {
    if (!activeOutput) return;
    stopBroadcastAudio();
    setIsPlaying(true);
    setCurrentAddedMinute(0);
    if (!isMuted) audioAtmosphere.playSoundEffect('whistle');
    if (phase === 'half-time') {
      setCurrentMinute(46);
      setPhase('second-half');
    } else if (phase === 'end-of-90') {
      setCurrentMinute(91);
      setPhase('extra-time-1');
    } else if (phase === 'et-interval') {
      setCurrentMinute(106);
      setPhase('extra-time-2');
    }
  };

  const handleSkipToNextBreak = () => {
    if (!activeOutput) return;
    geminiHalftimeAudio.unlock();
    stopBroadcastAudio();
    setIsPlaying(false);
    if (phase === 'first-half') {
      activeOutput.events.forEach((e) => {
        if (e.minute <= 45) announcedLiveEventIdsRef.current.add(e.id);
      });
      setCurrentMinute(45);
      setCurrentAddedMinute(activeOutput.stoppage1H);
      setPhase('half-time');
    } else if (phase === 'half-time' || phase === 'second-half') {
      activeOutput.events.forEach((e) => {
        if (e.minute <= 90) announcedLiveEventIdsRef.current.add(e.id);
      });
      setCurrentMinute(90);
      setCurrentAddedMinute(activeOutput.stoppage2H);
      if (activeOutput.wentToExtraTime) {
        setPhase('end-of-90');
      } else if (activeOutput.penaltyShootout) {
        setPhase('penalties');
      } else {
        setPhase('full-time');
      }
    } else if (phase === 'end-of-90' || phase === 'extra-time-1') {
      activeOutput.events.forEach((e) => {
        if (e.minute <= 105) announcedLiveEventIdsRef.current.add(e.id);
      });
      setCurrentMinute(105);
      setCurrentAddedMinute(activeOutput.stoppageET1);
      setPhase('et-interval');
    } else if (phase === 'et-interval' || phase === 'extra-time-2') {
      activeOutput.events.forEach((e) => announcedLiveEventIdsRef.current.add(e.id));
      setCurrentMinute(120);
      setCurrentAddedMinute(activeOutput.stoppageET2);
      if (activeOutput.penaltyShootout) {
        setPhase('penalties');
      } else {
        setPhase('full-time');
      }
    }
    if (!isMuted) audioAtmosphere.playSoundEffect('whistle');
  };

  const handleInstantFinish = () => {
    if (!activeOutput) return;
    if (goalBannerTimerRef.current) {
      window.clearTimeout(goalBannerTimerRef.current);
      goalBannerTimerRef.current = null;
    }
    const lastGoal = [...activeOutput.events]
      .reverse()
      .find((e) => e.type === 'goal' || e.type === 'own-goal');
    if (lastGoal) {
      lastAnnouncedGoalIdRef.current = lastGoal.id;
    }
    stopBroadcastAudio();
    skipNextFullTimeWaitRef.current = true;
    setGoalBannerEvent(null);
    setIsPlaying(false);
    setCurrentMinute(activeOutput.finalMinute);
    setCurrentAddedMinute(activeOutput.wentToExtraTime ? activeOutput.stoppageET2 : activeOutput.stoppage2H);
    setPhase('full-time');
    setPenaltiesRevealed(activeOutput.penaltyShootout?.kicks.length || 0);
    if (!isMuted) audioAtmosphere.playSoundEffect('whistle');
  };

  const handleLoadSavedOutput = useCallback(
    (loaded: CompleteSimulationOutput) => {
      const h = teams.find((t) => t.id === loaded.homeTeamId);
      const a = teams.find((t) => t.id === loaded.awayTeamId);
      if (h) selectTeam(h, 'home');
      if (a) selectTeam(a, 'away');
      stopBroadcastAudio();
      announcedLiveEventIdsRef.current.clear();
      lastLiveCommentaryAtRef.current = 0;
      announcedPhaseKeyRef.current = `${loaded.seed}::0::full-time::${geminiVoiceName}`;
      setCompetition(loaded.competition);
      setSeed(loaded.seed);
      setActiveOutput(loaded);
      setScreen('match');
      setCurrentMinute(loaded.finalMinute);
      setCurrentAddedMinute(loaded.wentToExtraTime ? loaded.stoppageET2 : loaded.stoppage2H);
      setPhase('full-time');
      setIsPlaying(false);
      setPenaltiesRevealed(loaded.penaltyShootout?.kicks.length || 0);
      recordedKeyRef.current = `${loaded.seed}::${loaded.homeTeamId}::${loaded.awayTeamId}::loaded`;
      setFilingNotice('Opened saved match report.');
    },
    [teams, selectTeam, stopBroadcastAudio, geminiVoiceName]
  );

  useEffect(() => {
    if (!pendingSimulationToOpen) return;
    handleLoadSavedOutput(pendingSimulationToOpen);
    clearPendingSimulation();
  }, [pendingSimulationToOpen, handleLoadSavedOutput, clearPendingSimulation]);

  useEffect(() => {
    if (!pendingTournamentMatch) return;
    const resolvedHome =
      teams.find((t) => t.id === pendingTournamentMatch.homeTeamId) ||
      (homeTeam?.id === pendingTournamentMatch.homeTeamId ? homeTeam : null);
    const resolvedAway =
      teams.find((t) => t.id === pendingTournamentMatch.awayTeamId) ||
      (awayTeam?.id === pendingTournamentMatch.awayTeamId ? awayTeam : null);

    if (!resolvedHome || !resolvedAway) {
      return;
    }

    if (homeTeam?.id !== resolvedHome.id) {
      selectTeam(resolvedHome, 'home');
    }
    if (awayTeam?.id !== resolvedAway.id) {
      selectTeam(resolvedAway, 'away');
    }

    const resolvedHomeManager = getManagerForTeam(resolvedHome);
    const resolvedAwayManager = getManagerForTeam(resolvedAway);

    const nextCompetition: SimCompetitionConfig = {
      preset: pendingTournamentMatch.preset,
      competitionId: pendingTournamentMatch.competitionId,
      competitionName: pendingTournamentMatch.competitionName,
      fixtureId: pendingTournamentMatch.fixtureId,
      stageLabel: pendingTournamentMatch.stageLabel,
      isKnockout: pendingTournamentMatch.isKnockout,
      allowExtraTime: pendingTournamentMatch.allowExtraTime,
      allowPenalties: pendingTournamentMatch.allowPenalties,
      isTwoLegged: pendingTournamentMatch.isTwoLegged,
      legNumber: pendingTournamentMatch.legNumber,
      firstLegHomeGoals: pendingTournamentMatch.firstLegHomeGoals,
      firstLegAwayGoals: pendingTournamentMatch.firstLegAwayGoals,
      awayGoalsRule: pendingTournamentMatch.awayGoalsRule,
      neutralVenue: pendingTournamentMatch.neutralVenue,
      homeAdvantageBoost: pendingTournamentMatch.homeAdvantageBoost,
    };

    const nextSeed = generateRandomSeed();
    const hSetup = buildInitialTeamSetup(resolvedHome, resolvedHomeManager);
    const aSetup = buildInitialTeamSetup(resolvedAway, resolvedAwayManager);

    setCompetition(nextCompetition);
    setSeed(nextSeed);
    setStartMode('live');
    setInitialHomeSetup(hSetup);
    setInitialAwaySetup(aSetup);
    setLiveHomeSetup(hSetup);
    setLiveAwaySetup(aSetup);
    setTacticalOverrides([]);
    setSavedNotice(null);
    setFilingNotice(null);
    announcedLiveEventIdsRef.current.clear();
    lastLiveCommentaryAtRef.current = 0;
    prefetchedBroadcastKeysRef.current.clear();
    announcedPhaseKeyRef.current = null;
    recordedKeyRef.current = null;
    lastAnnouncedGoalIdRef.current = null;
    setGoalBannerEvent(null);

    if (pendingTournamentMatch.autoStartLive) {
      const result = simulateMatch({
        seed: nextSeed,
        competition: nextCompetition,
        homeTeam: resolvedHome,
        awayTeam: resolvedAway,
        homeManager: resolvedHomeManager,
        awayManager: resolvedAwayManager,
        initialHomeSetup: hSetup,
        initialAwaySetup: aSetup,
        tacticalOverrides: [],
      });
      setActiveOutput(result);
      setScreen('match');
      setMode('live');
      setCurrentMinute(1);
      setCurrentAddedMinute(0);
      setPhase('first-half');
      setIsPlaying(true);
      setPenaltiesRevealed(0);
      if (!isMuted) audioAtmosphere.playSoundEffect('whistle');
    } else {
      setScreen('dugout');
    }

    clearPendingTournamentMatch();
  }, [
    pendingTournamentMatch,
    teams,
    homeTeam,
    awayTeam,
    selectTeam,
    getManagerForTeam,
    isMuted,
    clearPendingTournamentMatch,
  ]);

  return (
    <div className="space-y-4">
      {screen === 'fixture' && (
        <FixtureBuilderView
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          allTeams={teams}
          competitions={competitions}
          competition={competition}
          seed={seed}
          savedCount={savedSimulations.length}
          recentCount={simulationMatches.length}
          onSelectTeam={(side, team) => selectTeam(team, side)}
          onClearTeam={(side) => deselectTeam(side)}
          onSwapTeams={() => {
            swapSelections();
            setInitialHomeSetup(initialAwaySetup);
            setInitialAwaySetup(initialHomeSetup);
          }}
          onRandomMatchup={(h, a) => {
            selectTeam(h, 'home');
            selectTeam(a, 'away');
          }}
          onChangeCompetition={setCompetition}
          onChangeSeed={setSeed}
          onRandomSeed={() => setSeed(generateRandomSeed())}
          onOpenSavedModal={() => setShowSavedModal(true)}
          onProceedToDugout={() => {
            if (!homeTeam || !awayTeam) return;
            setScreen('dugout');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onQuickKickOff={() => {
            if (!homeTeam || !awayTeam) return;
            startMatchWithParams();
          }}
        />
      )}

      {screen === 'dugout' && homeTeam && awayTeam && initialHomeSetup && initialAwaySetup && (
        <SimulationDugout
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          allTeams={teams}
          competitions={competitions}
          homeSetup={initialHomeSetup}
          awaySetup={initialAwaySetup}
          competition={competition}
          seed={seed}
          startMode={startMode}
          savedCount={savedSimulations.length}
          recentCount={simulationMatches.length}
          onBack={() => {
            stopAnthem();
            setScreen('fixture');
          }}
          onSwapTeams={() => {
            swapSelections();
            setInitialHomeSetup(initialAwaySetup);
            setInitialAwaySetup(initialHomeSetup);
          }}
          onChangeTeam={handleChangeTeam}
          onUpdateSetup={(side, next) => {
            if (side === 'home') {
              setInitialHomeSetup(next);
              setLiveHomeSetup(next);
            } else {
              setInitialAwaySetup(next);
              setLiveAwaySetup(next);
            }
          }}
          onChangeCompetition={setCompetition}
          onChangeSeed={setSeed}
          onChangeStartMode={setStartMode}
          onOpenSavedModal={() => setShowSavedModal(true)}
          onKickOff={() => startMatchWithParams()}
        />
      )}

      {screen === 'match' && homeTeam && awayTeam && activeOutput && visibleSlice && liveHomeSetup && liveAwaySetup && (
        <div className="space-y-4">
          <SimulationScoreboard
            output={activeOutput}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            homeSetup={liveHomeSetup}
            awaySetup={liveAwaySetup}
            phase={phase}
            currentMinute={currentMinute}
            currentAddedMinute={currentAddedMinute}
            isPlaying={isPlaying}
            speed={speed}
            mode={mode}
            visibleHomeScore={visibleSlice.homeScore}
            visibleAwayScore={visibleSlice.awayScore}
            visiblePossessionHome={visibleSlice.homeStats.possession}
            visibleShotsHome={visibleSlice.homeStats.shots}
            visibleShotsAway={visibleSlice.awayStats.shots}
            visibleSotHome={visibleSlice.homeStats.shotsOnTarget}
            visibleSotAway={visibleSlice.awayStats.shotsOnTarget}
            visibleXgHome={visibleSlice.homeStats.xg}
            visibleXgAway={visibleSlice.awayStats.xg}
            visibleEvents={visibleSlice.visibleEvents}
            goalBannerEvent={goalBannerEvent}
            anthemPlaying={anthemPlaying}
            isMuted={isMuted}
            savedNotice={savedNotice}
            filingNotice={filingNotice}
            onBackToDugout={() => {
              stopAnthem();
              stopBroadcastAudio();
              setShowLiveStudio(false);
              setIsPlaying(false);
              setScreen('dugout');
              setPhase('pre-match');
            }}
            onNewFixture={() => {
              stopAnthem();
              stopBroadcastAudio();
              setShowLiveStudio(false);
              setIsPlaying(false);
              setScreen('fixture');
              setPhase('pre-match');
            }}
            onTogglePlay={() => {
              geminiHalftimeAudio.unlock();
              setIsPlaying((p) => !p);
            }}
            onChangeSpeed={setSpeed}
            onChangeMode={setMode}
            onSkipToNextBreak={handleSkipToNextBreak}
            onInstantFinish={handleInstantFinish}
            onResumeFromBreak={handleResumeFromBreak}
            onSwitchPlanLive={handleSwitchPlanLive}
            onOpenBreakTacticsModal={() => {
              setIsPlaying(false);
              setShowBreakTacticsModal(true);
            }}
            onToggleMute={() => setIsMuted((m) => !m)}
            onSaveMatch={() => {
              saveSimulationMatch(activeOutput);
              setSavedNotice('Saved ✓');
            }}
            onOpenSaved={() => setShowSavedModal(true)}
            onRematchNewSeed={() => {
              const newSeed = generateRandomSeed();
              setSeed(newSeed);
              startMatchWithParams(newSeed);
            }}
            tournamentReturnName={
              competitionMakers.find((c) => c.id === activeOutput.competition.competitionId)
                ?.shortName ||
              competitionMakers.find((c) => c.id === activeOutput.competition.competitionId)?.name
            }
            onReturnToTournament={
              competitionMakers.some((c) => c.id === activeOutput.competition.competitionId)
                ? async () => {
                    stopAnthem();
                    geminiHalftimeAudio.stop();
                    setIsPlaying(false);
                    if (filingPromiseRef.current) {
                      await filingPromiseRef.current;
                    }
                    returnToTournamentHub(activeOutput.competition.competitionId);
                  }
                : undefined
            }
            geminiSoundEnabled={geminiSoundEnabled}
            geminiVoiceName={geminiVoiceName}
            halftimeAudioStatus={halftimeAudioStatus}
            halftimeScript={halftimeScript}
            halftimeStoryline={halftimeStoryline}
            halftimeAudioError={halftimeAudioError}
            prefetchStatus={prefetchStatus}
            prefetchStageLabel={prefetchStageLabel}
            showLiveStudio={showLiveStudio}
            onToggleGeminiSound={() => {
              geminiHalftimeAudio.unlock();
              setGeminiSoundEnabled((prev) => {
                if (prev) {
                  stopBroadcastAudio();
                  setPrefetchStatus('idle');
                }
                return !prev;
              });
            }}
            onChangeGeminiVoice={(voice) => {
              setGeminiVoiceName(voice);
              prefetchedBroadcastKeysRef.current.clear();
              setPrefetchStatus('idle');
            }}
            onStopHalftimeAnnounce={stopBroadcastAudio}
            onReplayHalftimeAnnounce={() => {
              const replayType: MatchBroadcastType =
                phase === 'full-time'
                  ? 'full-time'
                  : phase === 'end-of-90'
                  ? 'end-of-90'
                  : phase === 'et-interval'
                  ? 'et-interval'
                  : phase === 'penalties' || phase === 'penalties-intro'
                  ? penaltiesRevealed > 0
                    ? 'penalty-kick'
                    : 'penalties-intro'
                  : 'half-time';
              void playMatchBroadcast(replayType, {
                forceReplay: true,
                kickIndex: replayType === 'penalty-kick' ? Math.max(0, penaltiesRevealed - 1) : undefined,
              });
            }}
            onToggleLiveStudio={() => {
              stopBroadcastAudio();
              setShowLiveStudio((prev) => !prev);
            }}
          />

          {showLiveStudio && (() => {
            const liveSnap = buildStageDossier('live-now', {
              minute: currentMinute,
              addedMinute: currentAddedMinute,
              phase,
            });
            const showEtContext =
              activeOutput.wentToExtraTime &&
              (phase === 'extra-time-1' ||
                phase === 'et-interval' ||
                phase === 'extra-time-2' ||
                phase === 'penalties' ||
                phase === 'penalties-intro' ||
                phase === 'full-time');
            const showPenContext =
              Boolean(activeOutput.penaltyShootout) &&
              (phase === 'penalties' || phase === 'penalties-intro' || phase === 'full-time');

            const revealedPenKicks =
              showPenContext && activeOutput.penaltyShootout
                ? (phase === 'full-time'
                    ? activeOutput.penaltyShootout.kicks
                    : activeOutput.penaltyShootout.kicks.slice(0, penaltiesRevealed)
                  ).map((k) => ({
                    kickNumber: k.kickNumber,
                    round: k.round,
                    teamSide: k.teamSide,
                    takerName: k.takerName,
                    keeperName: k.keeperName,
                    keeperDive: k.keeperDive,
                    outcome: k.outcome,
                    missDetail: k.missDetail,
                  }))
                : undefined;

            const enrichedDossier = liveSnap?.dossier
              ? {
                  ...liveSnap.dossier,
                  penaltyShootoutKicks:
                    revealedPenKicks ?? liveSnap.dossier.penaltyShootoutKicks,
                }
              : undefined;

            const liveContext: LiveMatchContext = {
              homeTeam: homeTeam.name,
              awayTeam: awayTeam.name,
              homeScore: visibleSlice.homeScore,
              awayScore: visibleSlice.awayScore,
              phase,
              minute: currentMinute,
              competitionName: activeOutput.competition.competitionName,
              stageLabel: activeOutput.competition.stageLabel,
              venueName: homeTeam.stadium,
              possessionHome: visibleSlice.homeStats.possession,
              shotsHome: visibleSlice.homeStats.shots,
              shotsAway: visibleSlice.awayStats.shots,
              xgHome: visibleSlice.homeStats.xg,
              xgAway: visibleSlice.awayStats.xg,
              homeFormation: liveHomeSetup.formation,
              awayFormation: liveAwaySetup.formation,
              scorersSummary: visibleSlice.visibleEvents
                .filter((e) => e.type === 'goal' || e.type === 'own-goal')
                .map(
                  (e) =>
                    `${e.playerName} (${e.minute}${e.addedMinute ? `+${e.addedMinute}` : ''}')`
                )
                .join(', '),
              dossier: enrichedDossier,
              wentToExtraTime: showEtContext,
              penaltyShootout:
                showPenContext && activeOutput.penaltyShootout
                  ? {
                      homeScore: activeOutput.penaltyShootout.homeScore,
                      awayScore: activeOutput.penaltyShootout.awayScore,
                      winner: activeOutput.penaltyShootout.winner,
                    }
                  : undefined,
            };

            return (
              <HalftimeGeminiStudio
                matchContext={liveContext}
                voiceName={geminiVoiceName}
                onChangeVoice={setGeminiVoiceName}
                onClose={() => setShowLiveStudio(false)}
              />
            );
          })()}

          {/* Interactive Penalty Shootout Panel (shown during penalties or full-time shootout record) */}
          {activeOutput.penaltyShootout &&
            (phase === 'penalties' ||
              phase === 'penalties-intro' ||
              phase === 'full-time') && (
              <PenaltyShootoutPanel
                shootout={activeOutput.penaltyShootout}
                homeTeam={homeTeam}
                awayTeam={awayTeam}
                revealedCount={penaltiesRevealed}
                isBroadcastAudioBusy={isPenaltyAudioBusy}
                broadcastAudioEnabled={geminiSoundEnabled && !isMuted}
                onRevealNext={() => {
                  const total = activeOutput.penaltyShootout?.kicks.length || 0;
                  if (penaltiesRevealed >= total) return;
                  const nextCount = Math.min(total, penaltiesRevealed + 1);
                  const kickIdx = nextCount - 1;
                  setPenaltiesRevealed(nextCount);
                  const kick = activeOutput.penaltyShootout?.kicks[kickIdx];
                  if (kick && !isMuted) {
                    audioAtmosphere.playSoundEffect(
                      kick.outcome === 'scored' ? 'roar' : 'crossbar'
                    );
                  }
                  if (geminiSoundEnabled && !isMuted) {
                    skipNextFullTimeWaitRef.current = false;
                    void playMatchBroadcast('penalty-kick', {
                      kickIndex: kickIdx,
                      lockPenaltyQueue: true,
                    });
                  }
                  if (nextCount >= total) {
                    setPhase('full-time');
                    if (!isMuted) audioAtmosphere.playSoundEffect('whistle');
                  }
                }}
                onRevealAll={() => {
                  const total = activeOutput.penaltyShootout?.kicks.length || 0;
                  stopBroadcastAudio();
                  skipNextFullTimeWaitRef.current = true;
                  setPenaltiesRevealed(total);
                  setPhase('full-time');
                  if (!isMuted) audioAtmosphere.playSoundEffect('whistle');
                }}
              />
            )}

          {/* 5 Complete Match Analytics Tabs */}
          <div className="rounded-2xl bg-[#070E1A] border border-white/10 p-1.5 grid grid-cols-5 gap-1">
            {(
              [
                { id: 'facts', label: 'FACTS', icon: Activity },
                { id: 'commentary', label: 'COMMENTARY', icon: MessageSquareText },
                { id: 'lineup', label: 'LINEUP', icon: Users },
                { id: 'stats', label: 'STATS', icon: BarChart3 },
                { id: 'simulation', label: 'SIMULATION', icon: Cpu },
              ] as Array<{ id: AnalyticsTabId; label: string; icon: React.ComponentType<any> }>
            ).map((tab) => {
              const Icon = tab.icon;
              const isAct = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2.5 landscape-mobile:py-1.5 px-2 landscape-mobile:px-1.5 rounded-xl font-mono text-[10px] sm:text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isAct
                      ? 'bg-gradient-to-r from-rose-500/20 via-slate-900 to-cyan-500/20 border border-white/25 text-white shadow'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Analytics Tab Content */}
          {activeTab === 'facts' && (
            <FactsTab
              output={activeOutput}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              phase={phase}
              currentMinute={currentMinute}
              currentAddedMinute={currentAddedMinute}
              visibleHomeScore={visibleSlice.homeScore}
              visibleAwayScore={visibleSlice.awayScore}
              visibleMomentum={visibleSlice.visibleMomentum}
              visibleEvents={visibleSlice.visibleEvents}
            />
          )}

          {activeTab === 'commentary' && (
            <CommentaryTab
              visibleEvents={visibleSlice.visibleEvents}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
            />
          )}

          {activeTab === 'lineup' && (
            <LineupTab
              output={activeOutput}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              homeSetup={liveHomeSetup}
              awaySetup={liveAwaySetup}
              visibleEvents={visibleSlice.visibleEvents}
            />
          )}

          {activeTab === 'stats' && (
            <StatsTab
              output={activeOutput}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              visibleShots={visibleSlice.visibleShots}
              homeStats={visibleSlice.homeStats}
              awayStats={visibleSlice.awayStats}
            />
          )}

          {activeTab === 'simulation' && (
            <SimulationTab
              output={activeOutput}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              phase={phase}
            />
          )}
        </div>
      )}

      {/* Modals */}
      {showSavedModal && (
        <SavedMatchesModal
          savedSimulations={savedSimulations}
          recentMatches={simulationMatches}
          onLoadSavedOutput={handleLoadSavedOutput}
          onDeleteSaved={deleteSavedSimulation}
          onClose={() => setShowSavedModal(false)}
        />
      )}

      {showBreakTacticsModal && homeTeam && awayTeam && liveHomeSetup && liveAwaySetup && (
        <BreakTacticsModal
          currentMinute={currentMinute}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeSetup={liveHomeSetup}
          awaySetup={liveAwaySetup}
          onApplyAdjustment={handleApplyInMatchTactic}
          onClose={() => setShowBreakTacticsModal(false)}
        />
      )}
    </div>
  );
};
