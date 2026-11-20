import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AudioLines,
  Trophy,
  History,
  Loader2,
  Radio,
  Settings,
  Square,
  Plus,
  RotateCcw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import { Team } from '../../../types/matchCentre';
import {
  ScoreboardPeriod,
  ScoreboardGoal,
  ScoreboardPenaltyKick,
  ScoreboardMatchConfig,
  ScoreboardMatchRecord,
  ScoreboardTeamSummary,
} from '../../../types/scoreboard';
import { ScoreboardDigitalBoard } from './ScoreboardDigitalBoard';
import { ScoreboardTimeline } from './ScoreboardTimeline';
import { ScoreboardPenaltyArena } from './ScoreboardPenaltyArena';
import { ScoreboardResultBanner } from './ScoreboardResultBanner';
import { GoalFormModal } from './GoalFormModal';
import { TeamSelectModal } from './TeamSelectModal';
import { ScoreboardSettingsModal } from './ScoreboardSettingsModal';
import { SavedScoreboardHistoryModal } from './SavedScoreboardHistoryModal';
import { playWhistle } from '../../../utils/scoreboardAudio';
import {
  fetchMatchBroadcastAudio,
  GEMINI_VOICE_OPTIONS,
  geminiHalftimeAudio,
  GeminiBroadcastVoiceChoice,
  LiveBroadcastEventPayload,
  MatchBroadcastDossier,
  MatchBroadcastRequest,
  MatchBroadcastType,
  MatchTimelineHighlight,
  resolveVoiceForBroadcastStage,
} from '../../../utils/geminiAudioPlayer';

export const ScoreboardPage: React.FC = () => {
  const {
    teams,
    selection,
    scoreboardMatches,
    saveScoreboardMatchAction,
    deleteScoreboardMatchAction,
    showToast,
  } = useMatchCentre();

  // Pick default Home and Away teams
  const defaultHome = useMemo(() => {
    return (
      teams.find((t) => t.id === 'doda-eona-fc' || t.name.toLowerCase().includes('dodaeona')) ||
      selection.homeTeam ||
      teams[0]
    );
  }, [teams, selection.homeTeam]);

  const defaultAway = useMemo(() => {
    return (
      teams.find(
        (t) =>
          t.id !== defaultHome?.id &&
          (t.name.toLowerCase().includes('madrid') ||
            t.name.toLowerCase().includes('barcelona') ||
            t.name.toLowerCase().includes('manchester'))
      ) ||
      selection.awayTeam ||
      teams[1] ||
      teams[0]
    );
  }, [teams, defaultHome?.id, selection.awayTeam]);

  // Main Active State
  const [homeTeam, setHomeTeam] = useState<Team>(defaultHome);
  const [awayTeam, setAwayTeam] = useState<Team>(defaultAway);

  // Sync if initial default changed and user hasn't modified yet
  useEffect(() => {
    if (!homeTeam && defaultHome) setHomeTeam(defaultHome);
    if (!awayTeam && defaultAway) setAwayTeam(defaultAway);
  }, [defaultHome, defaultAway, homeTeam, awayTeam]);

  // Match Configuration
  const [config, setConfig] = useState<ScoreboardMatchConfig>({
    minutesPerHalf: 45,
    extraTimeMinutesPerHalf: 15,
    enableExtraTimeIfTied: true,
    enablePenaltiesIfTied: true,
    matchName: 'DodaEona F.C. Arena Match',
    venue: 'DodaEona Grand Stadium',
  });

  // Match Progress
  const [status, setStatus] = useState<ScoreboardPeriod>('not_started');
  const [currentSecond, setCurrentSecond] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);

  // Goals and Penalties
  const [goals, setGoals] = useState<ScoreboardGoal[]>([]);
  const [penalties, setPenalties] = useState<ScoreboardPenaltyKick[]>([]);

  // Overtime / Shootout Flags
  const [wentToExtraTime, setWentToExtraTime] = useState<boolean>(false);
  const [wentToPenalties, setWentToPenalties] = useState<boolean>(false);
  const [savedMatchId, setSavedMatchId] = useState<string | null>(null);
  const [scoreboardSessionId, setScoreboardSessionId] = useState<string>(
    () => `sb-sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  );

  // Modals state
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalModalSide, setGoalModalSide] = useState<'home' | 'away'>('home');
  const [editingGoal, setEditingGoal] = useState<ScoreboardGoal | null>(null);

  const [isTeamSelectOpen, setIsTeamSelectOpen] = useState(false);
  const [teamSelectSide, setTeamSelectSide] = useState<'home' | 'away'>('home');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Calculate live score from goals
  const { homeScore, awayScore } = useMemo(() => {
    let h = 0;
    let a = 0;
    goals.forEach((g) => {
      if (g.type === 'own_goal') {
        // Own goal gives point to the opposing side
        if (g.teamSide === 'home') a++;
        else h++;
      } else {
        if (g.teamSide === 'home') h++;
        else a++;
      }
    });
    return { homeScore: h, awayScore: a };
  }, [goals]);

  // Penalty scores
  const penaltyHomeScore = useMemo(
    () => penalties.filter((p) => p.teamSide === 'home' && p.status === 'scored').length,
    [penalties]
  );
  const penaltyAwayScore = useMemo(
    () => penalties.filter((p) => p.teamSide === 'away' && p.status === 'scored').length,
    [penalties]
  );

  // Timer Tick Hook
  useEffect(() => {
    if (!isRunning) return;

    const intervalTime = 1000 / speedMultiplier;
    const timer = setInterval(() => {
      setCurrentSecond((prevSec) => {
        const nextSec = prevSec + 1;
        const currentMinute = Math.floor(nextSec / 60);

        const normalHalfEnd = config.minutesPerHalf * 60;
        const normalFullEnd = config.minutesPerHalf * 2 * 60;
        const extraFirstHalfEnd = (config.minutesPerHalf * 2 + config.extraTimeMinutesPerHalf) * 60;
        const extraFullEnd = (config.minutesPerHalf * 2 + config.extraTimeMinutesPerHalf * 2) * 60;

        // First half whistle
        if (status === 'first_half' && nextSec >= normalHalfEnd) {
          setIsRunning(false);
          setStatus('half_time');
          playWhistle('halftime');
          showToast(`Half Time reached at ${config.minutesPerHalf}'`, 'info');
          return normalHalfEnd;
        }

        // Second half / Normal Full Time whistle
        if (status === 'second_half' && nextSec >= normalFullEnd) {
          setIsRunning(false);
          playWhistle('fulltime');

          if (homeScore === awayScore && config.enableExtraTimeIfTied) {
            setStatus('full_time');
            setWentToExtraTime(true);
            showToast('Normal time level! Extra Time is now unlocked.', 'info');
          } else {
            setStatus('completed');
            showToast('Full Time! Match concluded.', 'info');
          }
          return normalFullEnd;
        }

        // Extra Time 1st half whistle
        if (status === 'extra_time_first_half' && nextSec >= extraFirstHalfEnd) {
          setIsRunning(false);
          setStatus('extra_time_break');
          playWhistle('halftime');
          showToast('Extra Time 1st Half completed.', 'info');
          return extraFirstHalfEnd;
        }

        // Extra Time 2nd half / Final Whistle
        if (status === 'extra_time_second_half' && nextSec >= extraFullEnd) {
          setIsRunning(false);
          playWhistle('fulltime');

          if (homeScore === awayScore && config.enablePenaltiesIfTied) {
            setStatus('penalty_shootout');
            setWentToPenalties(true);
            showToast('Match tied after extra time! Penalty Shootout begins.', 'info');
          } else {
            setStatus('completed');
            showToast('Extra Time concluded! Match final.', 'info');
          }
          return extraFullEnd;
        }

        return nextSec;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [
    isRunning,
    speedMultiplier,
    status,
    config.minutesPerHalf,
    config.extraTimeMinutesPerHalf,
    config.enableExtraTimeIfTied,
    config.enablePenaltiesIfTied,
    homeScore,
    awayScore,
    showToast,
  ]);

  const [geminiSoundEnabled, setGeminiSoundEnabled] = useState(true);
  const [geminiVoiceName, setGeminiVoiceName] = useState<GeminiBroadcastVoiceChoice>('Auto');
  const [broadcastStatus, setBroadcastStatus] = useState<
    'idle' | 'generating' | 'ready' | 'playing' | 'error'
  >('idle');
  const [broadcastScript, setBroadcastScript] = useState<string | null>(null);
  const [broadcastStoryline, setBroadcastStoryline] = useState<string | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  const [generatingSeconds, setGeneratingSeconds] = useState(0);
  const [isPenaltyAudioBusy, setIsPenaltyAudioBusy] = useState(false);

  const lastScoreboardPhaseKeyRef = useRef<string | null>(null);
  const halfTimeScoreRef = useRef<{ home: number; away: number } | null>(null);
  const sbCancelEpochRef = useRef(0);
  const sbBroadcastTokenRef = useRef(0);
  const sbActivePlaybackRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (status === 'half_time') {
      halfTimeScoreRef.current = { home: homeScore, away: awayScore };
    }
  }, [status, homeScore, awayScore]);

  useEffect(() => {
    if (broadcastStatus !== 'generating') {
      setGeneratingSeconds(0);
      return;
    }
    const t0 = Date.now();
    const id = window.setInterval(() => {
      setGeneratingSeconds(Math.max(1, Math.floor((Date.now() - t0) / 1000)));
    }, 500);
    return () => window.clearInterval(id);
  }, [broadcastStatus]);

  const stopScoreboardAudio = useCallback(() => {
    sbCancelEpochRef.current += 1;
    sbBroadcastTokenRef.current += 1;
    geminiHalftimeAudio.stop();
    setIsPenaltyAudioBusy(false);
    setBroadcastStatus((prev) =>
      prev === 'playing' || prev === 'generating' ? 'ready' : prev
    );
  }, []);

  useEffect(() => {
    return () => {
      geminiHalftimeAudio.stop();
    };
  }, []);

  const announceScoreboardStage = useCallback(
    async (
      announcementType: MatchBroadcastType,
      options?: {
        penaltyKick?: MatchBroadcastRequest['penaltyKick'];
        waitForPrevious?: boolean;
        lockPenaltyQueue?: boolean;
        delayAfterPreviousMs?: number;
        penaltyOverride?: { homeScore: number; awayScore: number; winner?: 'home' | 'away' | null };
        liveEvent?: LiveBroadcastEventPayload;
        goalsOverride?: ScoreboardGoal[];
      }
    ) => {
      if (!homeTeam || !awayTeam || !geminiSoundEnabled) return;
      const epoch = sbCancelEpochRef.current;

      const sourceGoals = options?.goalsOverride || goals;
      const effHomeScore = options?.goalsOverride
        ? sourceGoals.filter((g) => (g.type === 'own_goal' ? g.teamSide === 'away' : g.teamSide === 'home')).length
        : homeScore;
      const effAwayScore = options?.goalsOverride
        ? sourceGoals.filter((g) => (g.type === 'own_goal' ? g.teamSide === 'home' : g.teamSide === 'away')).length
        : awayScore;

      const relevantGoals = [...sourceGoals]
        .filter((g) =>
          announcementType === 'half-time' ? g.minute <= config.minutesPerHalf : true
        )
        .sort(
          (a, b) =>
            a.minute * 100 +
            (a.stoppageMinute || 0) -
            (b.minute * 100 + (b.stoppageMinute || 0))
        );

      const mappedGoals = relevantGoals.map((g) => ({
        playerName: g.scorerName || 'Scorer',
        minute: g.minute,
        addedMinute: g.stoppageMinute,
        teamSide: (g.type === 'own_goal'
          ? g.teamSide === 'home'
            ? 'away'
            : 'home'
          : g.teamSide) as 'home' | 'away',
        isPenalty: g.type === 'penalty',
      }));

      const timelineHighlights: MatchTimelineHighlight[] = relevantGoals.map((g) => {
        const scoringSide: 'home' | 'away' =
          g.type === 'own_goal'
            ? g.teamSide === 'home'
              ? 'away'
              : 'home'
            : g.teamSide;
        const goalTypeLabel =
          g.type === 'free_kick'
            ? 'Free-kick goal'
            : g.type === 'header'
            ? 'Header goal'
            : g.type === 'own_goal'
            ? 'Own goal'
            : g.type === 'penalty'
            ? 'Penalty goal'
            : 'Goal';
        return {
          minute: g.minute,
          addedMinute: g.stoppageMinute,
          type: g.type === 'own_goal' ? 'own-goal' : 'goal',
          teamSide: scoringSide,
          playerName: g.scorerName || 'Scorer',
          assistPlayerName: g.assistName || undefined,
          isPenalty: g.type === 'penalty',
          headline: goalTypeLabel,
          commentary: g.assistName
            ? `${goalTypeLabel} by ${g.scorerName}, assisted by ${g.assistName}`
            : `${goalTypeLabel} by ${g.scorerName}`,
        };
      });

      const firstHalfGoalsOnly = goals.filter((g) => g.minute <= config.minutesPerHalf);
      const computedHalfTimeScore =
        halfTimeScoreRef.current ||
        firstHalfGoalsOnly.reduce(
          (acc, g) => {
            const side =
              g.type === 'own_goal'
                ? g.teamSide === 'home'
                  ? 'away'
                  : 'home'
                : g.teamSide;
            if (side === 'home') acc.home += 1;
            else acc.away += 1;
            return acc;
          },
          { home: 0, away: 0 }
        );

      const ratingDiff = (homeTeam.overallRating || 75) - (awayTeam.overallRating || 75);
      const favouriteSide: 'home' | 'away' | 'even' =
        ratingDiff >= 4 ? 'home' : ratingDiff <= -4 ? 'away' : 'even';

      const dossier: MatchBroadcastDossier = {
        matchId: `${scoreboardSessionId}::${homeTeam.id}-${awayTeam.id}`,
        stateVersion: `g${goals.length}-p${penalties.length}-${status}`,
        halfTimeScore: announcementType !== 'half-time' ? computedHalfTimeScore : undefined,
        preMatchContext: {
          homeRating: homeTeam.overallRating,
          awayRating: awayTeam.overallRating,
          favouriteSide,
        },
        tactics: {
          homeFormation: homeTeam.defaultFormation,
          awayFormation: awayTeam.defaultFormation,
          homeManager: homeTeam.manager,
          awayManager: awayTeam.manager,
          homePlayingStyle: homeTeam.playingStyle,
          awayPlayingStyle: awayTeam.playingStyle,
        },
        statsAvailable: false,
        timelineHighlights,
      };

      const penSummary =
        options?.penaltyOverride ||
        (wentToPenalties
          ? {
              homeScore: penaltyHomeScore,
              awayScore: penaltyAwayScore,
              winner:
                penaltyHomeScore > penaltyAwayScore
                  ? ('home' as const)
                  : penaltyAwayScore > penaltyHomeScore
                  ? ('away' as const)
                  : null,
            }
          : undefined);

      const resolvedVoice = resolveVoiceForBroadcastStage(
        geminiVoiceName,
        announcementType,
        `${scoreboardSessionId}:${options?.penaltyKick?.kickNumber ?? ''}`
      );

      const req: MatchBroadcastRequest = {
        announcementType,
        homeTeam: homeTeam.name,
        awayTeam: awayTeam.name,
        homeScore: effHomeScore,
        awayScore: effAwayScore,
        competitionName: config.matchName,
        venueName: config.venue || homeTeam.stadium,
        firstHalfGoals: mappedGoals,
        wentToExtraTime,
        penaltyShootout: penSummary,
        penaltyKick: options?.penaltyKick,
        liveEvent: options?.liveEvent,
        dossier,
        voiceName: resolvedVoice,
        voiceChoice: geminiVoiceName,
      };

      const run = (async () => {
        let token = 0;
        if (options?.lockPenaltyQueue) {
          setIsPenaltyAudioBusy(true);
        }
        try {
          if (options?.waitForPrevious) {
            if (sbActivePlaybackRef.current) {
              await sbActivePlaybackRef.current.catch(() => {});
            }
            if (geminiHalftimeAudio.isPlaying()) {
              await geminiHalftimeAudio.waitForIdle();
            }
            if (sbCancelEpochRef.current !== epoch) return;
            if (options.delayAfterPreviousMs && options.delayAfterPreviousMs > 0) {
              await new Promise((r) => window.setTimeout(r, options.delayAfterPreviousMs));
              if (sbCancelEpochRef.current !== epoch) return;
            }
          }

          token = ++sbBroadcastTokenRef.current;
          geminiHalftimeAudio.unlock();
          setBroadcastError(null);
          setBroadcastStatus('generating');

          const res = await fetchMatchBroadcastAudio(req);
          if (token !== sbBroadcastTokenRef.current || sbCancelEpochRef.current !== epoch) return;
          setBroadcastScript(res.script);
          setBroadcastStoryline(res.storyline || null);
          await geminiHalftimeAudio.playBroadcastResponse(res, {
            onStart: () => {
              if (token === sbBroadcastTokenRef.current) {
                setBroadcastStatus('playing');
              }
            },
            onEnd: () => {
              if (token === sbBroadcastTokenRef.current) {
                setBroadcastStatus('ready');
              }
            },
            onError: (msg) => {
              if (token === sbBroadcastTokenRef.current) {
                setBroadcastError(msg);
                setBroadcastStatus('error');
              }
            },
          });
        } catch (err) {
          if (sbCancelEpochRef.current === epoch && token === sbBroadcastTokenRef.current) {
            const msg = err instanceof Error ? err.message : 'Unable to play Gemini match broadcast.';
            setBroadcastError(msg);
            setBroadcastStatus('error');
            showToast(msg, 'info');
          }
        } finally {
          if (options?.lockPenaltyQueue && sbCancelEpochRef.current === epoch) {
            setIsPenaltyAudioBusy(false);
          }
        }
      })();

      sbActivePlaybackRef.current = run;
      await run;
      if (sbActivePlaybackRef.current === run) {
        sbActivePlaybackRef.current = null;
      }
    },
    [
      homeTeam,
      awayTeam,
      geminiSoundEnabled,
      geminiVoiceName,
      goals,
      penalties.length,
      status,
      scoreboardSessionId,
      config.minutesPerHalf,
      config.matchName,
      config.venue,
      wentToPenalties,
      penaltyHomeScore,
      penaltyAwayScore,
      homeScore,
      awayScore,
      wentToExtraTime,
      showToast,
    ]
  );

  useEffect(() => {
    if (!geminiSoundEnabled) return;

    let stageType: MatchBroadcastType | null = null;
    let delayMs = 800;
    let waitPrev = false;
    let lockQueue = false;

    if (status === 'half_time') {
      stageType = 'half-time';
    } else if (status === 'full_time' && wentToExtraTime) {
      stageType = 'end-of-90';
    } else if (status === 'extra_time_break') {
      stageType = 'et-interval';
    } else if (status === 'penalty_shootout') {
      stageType = 'penalties-intro';
      delayMs = 700;
      lockQueue = true;
    } else if (status === 'completed' || status === 'extra_time_finished') {
      stageType = 'full-time';
      waitPrev = wentToPenalties;
      delayMs = wentToPenalties ? 50 : 850;
    }

    if (!stageType) return;

    const phaseKey = `${scoreboardSessionId}::${homeTeam?.id}::${awayTeam?.id}::${status}::${stageType}::${homeScore}-${awayScore}::${penaltyHomeScore}-${penaltyAwayScore}`;
    if (lastScoreboardPhaseKeyRef.current === phaseKey) return;
    lastScoreboardPhaseKeyRef.current = phaseKey;

    if (lockQueue) setIsPenaltyAudioBusy(true);

    const t = window.setTimeout(() => {
      void announceScoreboardStage(stageType, {
        waitForPrevious: waitPrev,
        delayAfterPreviousMs: waitPrev ? 450 : 0,
        lockPenaltyQueue: lockQueue,
      });
    }, delayMs);

    return () => window.clearTimeout(t);
  }, [
    scoreboardSessionId,
    status,
    geminiSoundEnabled,
    wentToExtraTime,
    wentToPenalties,
    homeTeam?.id,
    awayTeam?.id,
    homeScore,
    awayScore,
    penaltyHomeScore,
    penaltyAwayScore,
    announceScoreboardStage,
  ]);

  // Timer Controls
  const handleToggleTimer = () => {
    geminiHalftimeAudio.unlock();
    if (status === 'not_started') {
      setStatus('first_half');
      playWhistle('kickoff');
      setIsRunning(true);
      return;
    }

    if (status === 'half_time') {
      setStatus('second_half');
      playWhistle('kickoff');
      setIsRunning(true);
      return;
    }

    if (status === 'full_time' && wentToExtraTime) {
      setStatus('extra_time_first_half');
      playWhistle('kickoff');
      setIsRunning(true);
      return;
    }

    if (status === 'extra_time_break') {
      setStatus('extra_time_second_half');
      playWhistle('kickoff');
      setIsRunning(true);
      return;
    }

    if (status === 'completed') {
      // Reopening completed match
      setStatus('second_half');
      setIsRunning(true);
      return;
    }

    setIsRunning((prev) => !prev);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    if (status === 'second_half') {
      setCurrentSecond(config.minutesPerHalf * 60);
    } else if (status === 'extra_time_first_half' || status === 'extra_time_second_half') {
      setCurrentSecond(config.minutesPerHalf * 2 * 60);
    } else {
      setCurrentSecond(0);
    }
  };

  const handleChangePeriod = (newPeriod: ScoreboardPeriod) => {
    geminiHalftimeAudio.unlock();
    setStatus(newPeriod);
    setIsRunning(false);

    if (newPeriod === 'first_half') {
      setCurrentSecond(0);
      playWhistle('kickoff');
    } else if (newPeriod === 'half_time') {
      setCurrentSecond(config.minutesPerHalf * 60);
      playWhistle('halftime');
    } else if (newPeriod === 'second_half') {
      setCurrentSecond(config.minutesPerHalf * 60);
      playWhistle('kickoff');
    } else if (newPeriod === 'full_time') {
      setCurrentSecond(config.minutesPerHalf * 2 * 60);
      playWhistle('fulltime');
    } else if (newPeriod === 'extra_time_first_half') {
      setWentToExtraTime(true);
      setCurrentSecond(config.minutesPerHalf * 2 * 60);
      playWhistle('kickoff');
    } else if (newPeriod === 'extra_time_break') {
      setCurrentSecond((config.minutesPerHalf * 2 + config.extraTimeMinutesPerHalf) * 60);
      playWhistle('halftime');
    } else if (newPeriod === 'extra_time_second_half') {
      setWentToExtraTime(true);
      setCurrentSecond((config.minutesPerHalf * 2 + config.extraTimeMinutesPerHalf) * 60);
      playWhistle('kickoff');
    } else if (newPeriod === 'extra_time_finished') {
      setCurrentSecond((config.minutesPerHalf * 2 + config.extraTimeMinutesPerHalf * 2) * 60);
      playWhistle('fulltime');
    } else if (newPeriod === 'penalty_shootout') {
      setWentToPenalties(true);
    } else if (newPeriod === 'completed') {
      playWhistle('fulltime');
    }
  };

  const handleTriggerWhistle = (kind?: 'kickoff' | 'halftime' | 'fulltime') => {
    geminiHalftimeAudio.unlock();
    playWhistle(kind || 'kickoff');
    if (kind === 'halftime') {
      window.setTimeout(() => {
        void announceScoreboardStage(
          status === 'extra_time_break' ? 'et-interval' : 'half-time'
        );
      }, 750);
    } else if (kind === 'fulltime') {
      window.setTimeout(() => {
        void announceScoreboardStage(
          status === 'full_time' && wentToExtraTime ? 'end-of-90' : 'full-time'
        );
      }, 800);
    }
  };

  const handleSwapSides = () => {
    const currentH = homeTeam;
    const currentA = awayTeam;
    setHomeTeam(currentA);
    setAwayTeam(currentH);

    // Update sides on existing goals so visual score mirrors correctly
    setGoals((prev) =>
      prev.map((g) => ({
        ...g,
        teamSide: g.teamSide === 'home' ? 'away' : 'home',
      }))
    );
    showToast('Swapped Home and Away dugouts', 'info');
  };

  // Goal Management
  const handleOpenAddGoal = (side: 'home' | 'away') => {
    setGoalModalSide(side);
    setEditingGoal(null);
    setIsGoalModalOpen(true);
  };

  const handleEditGoal = (goal: ScoreboardGoal) => {
    setEditingGoal(goal);
    setGoalModalSide(goal.teamSide);
    setIsGoalModalOpen(true);
  };

  const handleSaveGoal = (goal: ScoreboardGoal) => {
    const isNewGoal = !editingGoal && !goals.some((g) => g.id === goal.id);
    const nextGoals = (() => {
      const idx = goals.findIndex((g) => g.id === goal.id);
      if (idx >= 0) {
        const copy = [...goals];
        copy[idx] = goal;
        return copy;
      }
      return [...goals, goal];
    })();
    setGoals(nextGoals);
    setSavedMatchId(null); // Dirty state
    showToast(`Goal recorded: ${goal.scorerName} (${goal.minute}')`, 'success');

    if (isNewGoal && geminiSoundEnabled && homeTeam && awayTeam) {
      const scoringSide: 'home' | 'away' =
        goal.type === 'own_goal'
          ? goal.teamSide === 'home'
            ? 'away'
            : 'home'
          : goal.teamSide;
      void announceScoreboardStage('live-event', {
        goalsOverride: nextGoals,
        liveEvent: {
          id: goal.id,
          type: goal.type === 'own_goal' ? 'own-goal' : 'goal',
          minute: goal.minute,
          addedMinute: goal.stoppageMinute,
          teamSide: scoringSide,
          playerName: goal.scorerName || 'Scorer',
          assistPlayerName: goal.assistName || undefined,
          isPenalty: goal.type === 'penalty',
        },
      });
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
    setSavedMatchId(null);
    showToast('Goal removed from timeline', 'info');
  };

  // Penalties
  const handleUpdatePenalties = (newPenalties: ScoreboardPenaltyKick[]) => {
    setPenalties(newPenalties);
    setWentToPenalties(true);
  };

  const handleShootoutComplete = (
    winner: 'home' | 'away',
    homeShootoutScore: number,
    awayShootoutScore: number
  ) => {
    setStatus('completed');
    setIsRunning(false);
    playWhistle('fulltime');
    showToast(
      `Shootout concluded! ${winner === 'home' ? homeTeam.name : awayTeam.name} wins ${homeShootoutScore}-${awayShootoutScore}`,
      'success'
    );
  };

  // Winner calculation
  const winnerInfo = useMemo(() => {
    if (wentToPenalties) {
      if (penaltyHomeScore > penaltyAwayScore) {
        return {
          winner: 'home' as const,
          description: `${homeTeam.name} won ${penaltyHomeScore}-${penaltyAwayScore} on penalties after a ${homeScore}-${awayScore} draw`,
        };
      }
      if (penaltyAwayScore > penaltyHomeScore) {
        return {
          winner: 'away' as const,
          description: `${awayTeam.name} won ${penaltyAwayScore}-${penaltyHomeScore} on penalties after a ${homeScore}-${awayScore} draw`,
        };
      }
    }

    if (homeScore > awayScore) {
      return {
        winner: 'home' as const,
        description: `${homeTeam.name} defeated ${awayTeam.name} ${homeScore}-${awayScore}${
          wentToExtraTime ? ' after extra time' : ''
        }`,
      };
    }
    if (awayScore > homeScore) {
      return {
        winner: 'away' as const,
        description: `${awayTeam.name} defeated ${homeTeam.name} ${awayScore}-${homeScore}${
          wentToExtraTime ? ' after extra time' : ''
        }`,
      };
    }

    return {
      winner: 'draw' as const,
      description: `Match drawn ${homeScore}-${awayScore}${
        wentToExtraTime ? ' after extra time' : ''
      }`,
    };
  }, [
    wentToPenalties,
    penaltyHomeScore,
    penaltyAwayScore,
    homeTeam.name,
    awayTeam.name,
    homeScore,
    awayScore,
    wentToExtraTime,
  ]);

  // Save Match Action
  const handleSaveMatch = async () => {
    const toSummary = (t: Team): ScoreboardTeamSummary => ({
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      code: t.code,
      crestUrl: t.crestUrl,
      country: t.country,
      type: t.league ? 'club' : 'country',
      gender: t.gender || 'men',
      overallRating: t.overallRating,
    });

    const recordId = savedMatchId || `sb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const record: ScoreboardMatchRecord = {
      id: recordId,
      homeTeam: toSummary(homeTeam),
      awayTeam: toSummary(awayTeam),
      config,
      status,
      currentSecond,
      homeScore,
      awayScore,
      halfTimeHomeScore: halfTimeScoreRef.current?.home,
      halfTimeAwayScore: halfTimeScoreRef.current?.away,
      wentToExtraTime,
      wentToPenalties,
      penaltyHomeScore: wentToPenalties ? penaltyHomeScore : undefined,
      penaltyAwayScore: wentToPenalties ? penaltyAwayScore : undefined,
      penaltySummary: wentToPenalties ? `${penaltyHomeScore}-${penaltyAwayScore}` : undefined,
      finalWinner: winnerInfo.winner,
      winnerTeamName:
        winnerInfo.winner === 'home'
          ? homeTeam.name
          : winnerInfo.winner === 'away'
          ? awayTeam.name
          : null,
      outcomeDescription: winnerInfo.description,
      goals,
      penalties,
      date: new Date().toISOString(),
      savedAt: new Date().toISOString(),
    };

    const ok = await saveScoreboardMatchAction(record);
    if (ok) {
      setSavedMatchId(recordId);
      showToast('Match record saved permanently!', 'success');
    } else {
      showToast('Could not save match. Check network connection.', 'gold');
    }
  };

  // Rematch / Reset
  const handleRematchSameTeams = () => {
    stopScoreboardAudio();
    lastScoreboardPhaseKeyRef.current = null;
    halfTimeScoreRef.current = null;
    setBroadcastScript(null);
    setBroadcastStoryline(null);
    setBroadcastError(null);
    setBroadcastStatus('idle');
    setScoreboardSessionId(`sb-sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    setIsRunning(false);
    setStatus('not_started');
    setCurrentSecond(0);
    setGoals([]);
    setPenalties([]);
    setWentToExtraTime(false);
    setWentToPenalties(false);
    setSavedMatchId(null);
    showToast(`Rematch initiated between ${homeTeam.name} and ${awayTeam.name}`, 'info');
  };

  const handleNewMatchDifferentTeams = () => {
    handleRematchSameTeams();
    setIsTeamSelectOpen(true);
    setTeamSelectSide('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartNewMatch = () => {
    if (status !== 'not_started' && status !== 'completed') {
      const confirmed = window.confirm(
        'A match is currently in progress. Creating a new match will reset the current score and timer. Do you want to continue?'
      );
      if (!confirmed) return;
    }
    handleNewMatchDifferentTeams();
  };

  // Load from Saved Match History
  const handleLoadSavedMatch = (record: ScoreboardMatchRecord) => {
    stopScoreboardAudio();
    // Find matching full teams if possible or build fallback
    const foundHome = teams.find((t) => t.id === record.homeTeam.id);
    const foundAway = teams.find((t) => t.id === record.awayTeam.id);

    if (foundHome) setHomeTeam(foundHome);
    if (foundAway) setAwayTeam(foundAway);

    const pH = (record.penalties || []).filter((p) => p.teamSide === 'home' && p.status === 'scored').length;
    const pA = (record.penalties || []).filter((p) => p.teamSide === 'away' && p.status === 'scored').length;
    setScoreboardSessionId(record.id);
    halfTimeScoreRef.current =
      typeof record.halfTimeHomeScore === 'number' && typeof record.halfTimeAwayScore === 'number'
        ? { home: record.halfTimeHomeScore, away: record.halfTimeAwayScore }
        : null;
    lastScoreboardPhaseKeyRef.current = `${record.id}::${(foundHome || record.homeTeam).id}::${(foundAway || record.awayTeam).id}::${record.status}::full-time::${record.homeScore}-${record.awayScore}::${pH}-${pA}`;

    setConfig(record.config);
    setStatus(record.status);
    setCurrentSecond(record.currentSecond);
    setIsRunning(false);
    setGoals(record.goals || []);
    setPenalties(record.penalties || []);
    setWentToExtraTime(Boolean(record.wentToExtraTime));
    setWentToPenalties(Boolean(record.wentToPenalties));
    setSavedMatchId(record.id);

    showToast(`Loaded saved match: ${record.homeTeam.name} vs ${record.awayTeam.name}`, 'success');
  };

  return (
    <div className="space-y-6 landscape-mobile:space-y-4 animate-fadeIn pb-16 landscape-mobile:pb-8">
      {/* Top Banner Actions & History Button */}
      <div className="flex flex-wrap items-center justify-between gap-4 landscape-mobile:gap-3 p-4 landscape-mobile:p-3 rounded-2xl bg-[#0B1525]/80 light:bg-slate-100 border border-white/10 light:border-slate-300">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#050A12] light:bg-white border border-[#7ADBF0]/30 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700 shadow-sm">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display uppercase text-xl sm:text-2xl text-white light:text-slate-900 tracking-wide flex items-center gap-2">
              <span>Interactive Match ScoreBoard</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#7ADBF0]/20 text-[#7ADBF0] light:text-cyan-800 border border-[#7ADBF0]/40">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-400 light:text-slate-500">
              Live timer, whistle soundboard, chronological goal log, extra time, and penalty shootout
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Match Audio toggle */}
          <button
            type="button"
            onClick={() => {
              geminiHalftimeAudio.unlock();
              setGeminiSoundEnabled((prev) => {
                if (prev) stopScoreboardAudio();
                return !prev;
              });
            }}
            className={`px-3.5 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              geminiSoundEnabled
                ? 'bg-cyan-500/15 light:bg-cyan-50 border-cyan-400/40 light:border-cyan-300 text-cyan-200 light:text-cyan-900'
                : 'bg-[#050A12] light:bg-white border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600'
            }`}
            title="Toggle Gemini Voice Broadcasts (HT, 90', ET, Penalties, FT)"
          >
            {geminiSoundEnabled ? (
              <Volume2 className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
            <span>Match Audio: {geminiSoundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          {/* History modal trigger */}
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#050A12] light:bg-white hover:bg-white/10 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-slate-300 hover:text-white light:text-slate-700 light:hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <History className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
            <span>Saved Matches ({scoreboardMatches.length})</span>
          </button>

          {/* Settings modal trigger */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#050A12] light:bg-white hover:bg-white/10 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-slate-300 hover:text-white light:text-slate-700 light:hover:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Settings className="w-4 h-4 text-[#D6B56E] light:text-amber-700" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Main Digital Scoreboard Board */}
      {homeTeam && awayTeam && (
        <ScoreboardDigitalBoard
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeScore={homeScore}
          awayScore={awayScore}
          status={status}
          currentSecond={currentSecond}
          isRunning={isRunning}
          speedMultiplier={speedMultiplier}
          config={config}
          onToggleTimer={handleToggleTimer}
          onResetTimer={handleResetTimer}
          onSetSpeedMultiplier={setSpeedMultiplier}
          onChangePeriod={handleChangePeriod}
          onOpenTeamSelect={(side) => {
            setTeamSelectSide(side);
            setIsTeamSelectOpen(true);
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onQuickAddGoal={handleOpenAddGoal}
          onTriggerWhistle={handleTriggerWhistle}
          onSwapSides={handleSwapSides}
          wentToExtraTime={wentToExtraTime}
          wentToPenalties={wentToPenalties}
          penaltyHomeScore={penaltyHomeScore}
          penaltyAwayScore={penaltyAwayScore}
        />
      )}

      {/* Clear Gemini AI Broadcast Bar (lets new users immediately see when AI commentary is preparing, ready, or ON AIR) */}
      {homeTeam && awayTeam && (geminiSoundEnabled || broadcastStatus !== 'idle') && (
        <div
          className={`rounded-2xl bg-[#070E1A] light:bg-white p-3.5 flex flex-col gap-2.5 border shadow-sm ${
            broadcastStatus === 'generating'
              ? 'border-amber-400/55 light:border-amber-400'
              : broadcastStatus === 'playing'
              ? 'border-emerald-400/60 light:border-emerald-500'
              : 'border-white/10 light:border-slate-300'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {broadcastStatus === 'generating' ? (
                <Loader2 className="w-4 h-4 text-amber-400 light:text-amber-600 animate-spin shrink-0" />
              ) : broadcastStatus === 'playing' ? (
                <AudioLines className="w-4 h-4 text-emerald-400 light:text-emerald-600 animate-pulse shrink-0" />
              ) : (
                <Radio className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  <span
                    className={`font-mono text-[11px] font-black uppercase tracking-wide ${
                      broadcastStatus === 'playing'
                        ? 'text-emerald-300 light:text-emerald-700'
                        : broadcastStatus === 'generating'
                        ? 'text-amber-300 light:text-amber-700'
                        : broadcastStatus === 'error'
                        ? 'text-rose-300 light:text-rose-700'
                        : 'text-[#7ADBF0] light:text-cyan-800'
                    }`}
                  >
                    {broadcastStatus === 'playing'
                      ? 'ON AIR · AI Broadcast Speaking'
                      : broadcastStatus === 'generating'
                      ? `Preparing AI Broadcast${generatingSeconds > 0 ? ` (${generatingSeconds}s)` : ''}...`
                      : broadcastStatus === 'error'
                      ? 'Broadcast Unavailable'
                      : broadcastStatus === 'ready'
                      ? 'AI Broadcast Ready'
                      : 'AI Match Broadcast Active'}
                  </span>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span className="text-slate-300 light:text-slate-700 truncate">
                    {broadcastStatus === 'generating'
                      ? 'Keep running the match anytime or wait a few seconds to hear live commentary'
                      : broadcastStoryline
                      ? broadcastStoryline
                      : 'Auto-announces Half-Time, Full-Time, Extra Time & Penalties'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={geminiVoiceName}
                onChange={(e) => {
                  setGeminiVoiceName(e.target.value as GeminiBroadcastVoiceChoice);
                  lastScoreboardPhaseKeyRef.current = null;
                }}
                className="bg-slate-950 light:bg-slate-100 border border-white/15 light:border-slate-300 rounded-lg px-2 py-1 font-mono text-[10px] font-bold text-slate-200 light:text-slate-800"
                title="Select Gemini Broadcaster Voice"
              >
                <option value="Auto">
                  Auto · Charon &amp; Orus (Two-Commentator Studio)
                </option>
                <optgroup label="Two-Commentator TV Pairing">
                  {GEMINI_VOICE_OPTIONS.filter((v) => v.category === 'analysis').map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} ({v.role})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Alternative Solo Voices">
                  {GEMINI_VOICE_OPTIONS.filter((v) => v.category === 'commentary').map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} ({v.role})
                    </option>
                  ))}
                </optgroup>
              </select>

              {broadcastStatus === 'playing' && (
                <button
                  type="button"
                  onClick={stopScoreboardAudio}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/45 text-rose-200 light:text-rose-800 font-mono text-[10px] font-bold uppercase cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </button>
              )}

              {(status === 'half_time' ||
                status === 'full_time' ||
                status === 'extra_time_break' ||
                status === 'penalty_shootout' ||
                status === 'completed' ||
                status === 'extra_time_finished') && (
                <button
                  type="button"
                  disabled={broadcastStatus === 'generating'}
                  onClick={() => {
                    const targetStage: MatchBroadcastType =
                      status === 'half_time'
                        ? 'half-time'
                        : status === 'full_time' && wentToExtraTime
                        ? 'end-of-90'
                        : status === 'extra_time_break'
                        ? 'et-interval'
                        : status === 'penalty_shootout'
                        ? 'penalties-intro'
                        : 'full-time';
                    void announceScoreboardStage(targetStage);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#7ADBF0] hover:bg-[#8ee1f3] disabled:opacity-50 text-[#050A12] font-mono text-[10px] font-black uppercase cursor-pointer shadow-xs"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>
                    {broadcastStatus === 'generating'
                      ? 'Preparing...'
                      : broadcastStatus === 'playing'
                      ? 'Replay'
                      : 'Play Broadcast'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {broadcastScript && (
            <p className="px-3 py-2 rounded-lg bg-black/30 light:bg-slate-100 border border-white/[0.06] light:border-slate-200 font-sans text-xs leading-relaxed text-slate-200 light:text-slate-800 whitespace-pre-line">
              {broadcastScript}
            </p>
          )}

          {broadcastError && (
            <p className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-400/40 font-mono text-[11px] text-rose-200 light:text-rose-800">
              {broadcastError}
            </p>
          )}
        </div>
      )}

      {/* Victory / Result Banner if completed */}
      {status === 'completed' && homeTeam && awayTeam && (
        <ScoreboardResultBanner
          winner={winnerInfo.winner}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          homeScore={homeScore}
          awayScore={awayScore}
          wentToExtraTime={wentToExtraTime}
          wentToPenalties={wentToPenalties}
          penaltyHomeScore={penaltyHomeScore}
          penaltyAwayScore={penaltyAwayScore}
          outcomeDescription={winnerInfo.description}
          onSaveMatch={handleSaveMatch}
          isSaved={Boolean(savedMatchId)}
          onRematchSameTeams={handleRematchSameTeams}
          onNewMatchDifferentTeams={handleNewMatchDifferentTeams}
          onOpenHistory={() => setIsHistoryOpen(true)}
        />
      )}

      {/* Penalty Shootout Arena (Active when in penalty shootout or completed with penalties) */}
      {(status === 'penalty_shootout' || (status === 'completed' && wentToPenalties)) &&
        homeTeam &&
        awayTeam && (
          <ScoreboardPenaltyArena
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            penalties={penalties}
            isBroadcastAudioBusy={isPenaltyAudioBusy}
            onUpdatePenalties={handleUpdatePenalties}
            onPenaltyKickRecorded={({ kick, kickNumber, homeScored, awayScored, isDecisiveWinner }) => {
              if (!geminiSoundEnabled) return;
              void announceScoreboardStage('penalty-kick', {
                lockPenaltyQueue: true,
                penaltyKick: {
                  kickNumber,
                  round: kick.round,
                  suddenDeath: kick.round > 5,
                  teamSide: kick.teamSide,
                  takerName: kick.takerName || `Taker ${kick.round}`,
                  outcome: kick.status === 'scored' ? 'scored' : 'missed',
                  homePenScore: homeScored,
                  awayPenScore: awayScored,
                  isDecisiveWinner,
                },
              });
            }}
            onShootoutComplete={handleShootoutComplete}
          />
        )}

      {/* Chronological Timeline & Goals Log */}
      {homeTeam && awayTeam && (
        <ScoreboardTimeline
          goals={goals}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          currentMatchMinute={Math.max(1, Math.floor(currentSecond / 60))}
          onOpenAddGoalModal={handleOpenAddGoal}
          onEditGoal={handleEditGoal}
          onDeleteGoal={handleDeleteGoal}
        />
      )}

      {/* End of Page: New Match Bottom Section */}
      {homeTeam && awayTeam && (
        <div className="rounded-2xl bg-gradient-to-r from-[#0B1525] via-[#070F1B] to-[#0B1525] light:from-white light:via-slate-50 light:to-white border border-[#7ADBF0]/30 light:border-slate-300 shadow-xl p-5 landscape-mobile:p-3.5 sm:p-6 flex flex-col landscape-mobile:flex-row md:flex-row items-center justify-between gap-4 landscape-mobile:gap-3">
          <div className="flex items-center gap-3.5 text-center landscape-mobile:text-left md:text-left">
            <div className="w-12 h-12 rounded-2xl bg-[#050A12] light:bg-slate-100 border border-[#7ADBF0]/30 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700 shrink-0 shadow-sm">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-display uppercase text-lg sm:text-xl text-white light:text-slate-900 tracking-wide">
                Start a New Match
              </h3>
              <p className="text-xs text-slate-400 light:text-slate-500">
                Pick new teams from the database or restart an instant rematch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-center w-full landscape-mobile:w-auto md:w-auto">
            <button
              type="button"
              onClick={handleRematchSameTeams}
              className="px-4 py-3 rounded-xl bg-[#0B1525] light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-white light:text-slate-900 font-semibold text-xs flex items-center gap-2 transition-all cursor-pointer hover:border-[#7ADBF0]/50"
            >
              <RotateCcw className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
              <span>Rematch (Same Teams)</span>
            </button>

            <button
              type="button"
              onClick={handleStartNewMatch}
              className="px-6 py-3 rounded-xl bg-[#7ADBF0] hover:bg-[#8ee1f3] text-[#050A12] font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(122,219,240,0.35)] hover:scale-[1.02] transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>New Match</span>
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {homeTeam && awayTeam && isGoalModalOpen && (
        <GoalFormModal
          isOpen={isGoalModalOpen}
          onClose={() => setIsGoalModalOpen(false)}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          initialSide={goalModalSide}
          editingGoal={editingGoal}
          currentMatchMinute={Math.max(1, Math.floor(currentSecond / 60))}
          onSaveGoal={handleSaveGoal}
          onDeleteGoal={handleDeleteGoal}
        />
      )}

      {isTeamSelectOpen && (
        <TeamSelectModal
          isOpen={isTeamSelectOpen}
          onClose={() => setIsTeamSelectOpen(false)}
          targetSide={teamSelectSide}
          currentSelectedTeam={teamSelectSide === 'home' ? homeTeam : awayTeam}
          onSelectTeam={(selected) => {
            if (teamSelectSide === 'home') setHomeTeam(selected);
            else setAwayTeam(selected);
            if (status === 'not_started') {
              lastScoreboardPhaseKeyRef.current = null;
              halfTimeScoreRef.current = null;
              setScoreboardSessionId(
                `sb-sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
              );
            }
          }}
        />
      )}

      {isSettingsOpen && (
        <ScoreboardSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={config}
          onSaveConfig={(newConfig) => {
            const oldHalfSec = config.minutesPerHalf * 60;
            const newHalfSec = newConfig.minutesPerHalf * 60;
            setConfig(newConfig);
            if (status === 'half_time' && currentSecond === oldHalfSec) {
              setCurrentSecond(newHalfSec);
            }
            showToast('Match settings updated', 'info');
          }}
          isMatchInProgress={status !== 'not_started'}
        />
      )}

      {isHistoryOpen && (
        <SavedScoreboardHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          savedMatches={scoreboardMatches}
          onLoadMatch={handleLoadSavedMatch}
          onDeleteMatch={(id) => {
            deleteScoreboardMatchAction(id);
            if (savedMatchId === id) setSavedMatchId(null);
            showToast('Match record deleted', 'info');
          }}
        />
      )}
    </div>
  );
};
