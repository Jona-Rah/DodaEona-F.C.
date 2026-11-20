import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  AudioLines,
  BookmarkCheck,
  CheckCircle2,
  Dices,
  FastForward,
  FolderOpen,
  History,
  Loader2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  ShieldAlert,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trophy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  GEMINI_VOICE_OPTIONS,
  GeminiBroadcastVoiceChoice,
} from '../../../utils/geminiAudioPlayer';
import { Team } from '../../../types/matchCentre';
import { normalizeHex } from '../dossier/dossierUtils';
import type {
  CompleteSimulationOutput,
  SimMatchPhase,
  SimPlanId,
  SimPresentationMode,
  SimTeamSetup,
  SimTimelineEvent,
} from '../../../types/simulation';
import { TeamEmblem } from '../TeamEmblem';

interface SimulationScoreboardProps {
  output: CompleteSimulationOutput;
  homeTeam: Team;
  awayTeam: Team;
  homeSetup: SimTeamSetup;
  awaySetup: SimTeamSetup;
  phase: SimMatchPhase;
  currentMinute: number;
  currentAddedMinute?: number;
  isPlaying: boolean;
  speed: 0.5 | 1 | 1.5 | 2;
  mode: SimPresentationMode;
  visibleHomeScore: number;
  visibleAwayScore: number;
  visiblePossessionHome: number;
  visibleShotsHome: number;
  visibleShotsAway: number;
  visibleSotHome: number;
  visibleSotAway: number;
  visibleXgHome: number;
  visibleXgAway: number;
  visibleEvents: SimTimelineEvent[];
  goalBannerEvent: SimTimelineEvent | null;
  anthemPlaying: boolean;
  isMuted: boolean;
  savedNotice: string | null;
  filingNotice: string | null;
  onBackToDugout: () => void;
  onNewFixture: () => void;
  onTogglePlay: () => void;
  onChangeSpeed: (s: 0.5 | 1 | 1.5 | 2) => void;
  onChangeMode: (m: SimPresentationMode) => void;
  onSkipToNextBreak: () => void;
  onInstantFinish: () => void;
  onResumeFromBreak: () => void;
  onSwitchPlanLive: (side: 'home' | 'away', plan: SimPlanId) => void;
  onOpenBreakTacticsModal: () => void;
  onToggleMute: () => void;
  onSaveMatch: () => void;
  onOpenSaved: () => void;
  onRematchNewSeed: () => void;
  tournamentReturnName?: string;
  onReturnToTournament?: () => void | Promise<void>;
  geminiSoundEnabled: boolean;
  geminiVoiceName: GeminiBroadcastVoiceChoice;
  halftimeAudioStatus: 'idle' | 'generating' | 'ready' | 'playing' | 'error';
  halftimeScript: string | null;
  halftimeStoryline?: string | null;
  halftimeAudioError: string | null;
  prefetchStatus?: 'idle' | 'preparing' | 'ready';
  prefetchStageLabel?: string | null;
  showLiveStudio: boolean;
  onToggleGeminiSound: () => void;
  onChangeGeminiVoice: (voice: GeminiBroadcastVoiceChoice) => void;
  onReplayHalftimeAnnounce: () => void;
  onStopHalftimeAnnounce?: () => void;
  onToggleLiveStudio: () => void;
}

export const SimulationScoreboard: React.FC<SimulationScoreboardProps> = ({
  output,
  homeTeam,
  awayTeam,
  homeSetup,
  awaySetup,
  phase,
  currentMinute,
  currentAddedMinute,
  isPlaying,
  speed,
  mode,
  visibleHomeScore,
  visibleAwayScore,
  visiblePossessionHome,
  visibleShotsHome,
  visibleShotsAway,
  visibleSotHome,
  visibleSotAway,
  visibleXgHome,
  visibleXgAway,
  visibleEvents,
  goalBannerEvent,
  anthemPlaying,
  isMuted,
  savedNotice,
  filingNotice,
  onBackToDugout,
  onNewFixture,
  onTogglePlay,
  onChangeSpeed,
  onChangeMode,
  onSkipToNextBreak,
  onInstantFinish,
  onResumeFromBreak,
  onSwitchPlanLive,
  onOpenBreakTacticsModal,
  onToggleMute,
  onSaveMatch,
  onOpenSaved,
  onRematchNewSeed,
  tournamentReturnName,
  onReturnToTournament,
  geminiSoundEnabled,
  geminiVoiceName,
  halftimeAudioStatus,
  halftimeScript,
  halftimeStoryline,
  halftimeAudioError,
  prefetchStatus = 'idle',
  prefetchStageLabel,
  showLiveStudio,
  onToggleGeminiSound,
  onChangeGeminiVoice,
  onReplayHalftimeAnnounce,
  onStopHalftimeAnnounce,
  onToggleLiveStudio,
}) => {
  const [isReturningToTournament, setIsReturningToTournament] = useState(false);
  const [generatingSeconds, setGeneratingSeconds] = useState(0);
  const isUcl = output.competition.preset === 'champions-league';
  const homeColor = normalizeHex(homeTeam.primaryColor || '#EF4444');
  const awayColor = normalizeHex(awayTeam.primaryColor || '#38BDF8');

  const isBreakPhase =
    phase === 'half-time' || phase === 'end-of-90' || phase === 'et-interval';
  const isFullTime = phase === 'full-time';

  useEffect(() => {
    if (halftimeAudioStatus !== 'generating') {
      setGeneratingSeconds(0);
      return;
    }
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setGeneratingSeconds(Math.max(1, Math.floor((Date.now() - startedAt) / 1000)));
    }, 500);
    return () => window.clearInterval(timer);
  }, [halftimeAudioStatus]);

  const statusPill = useMemo(() => {
    if (phase === 'full-time') return 'FULL-TIME';
    if (phase === 'half-time') return 'HALF-TIME';
    if (phase === 'end-of-90') return '90+ · EXTRA TIME PREP';
    if (phase === 'et-interval') return 'ET INTERVAL · 105\'';
    if (phase === 'penalties' || phase === 'penalties-intro') return 'PENALTIES';
    const base = currentAddedMinute ? `${currentMinute}+${currentAddedMinute}'` : `${currentMinute}'`;
    if (phase === 'extra-time-1' || phase === 'extra-time-2') return `ET · ${base}`;
    return `LIVE · ${base}`;
  }, [phase, currentMinute, currentAddedMinute]);

  // Group goalscorers by side -> player
  const scorersBySide = useMemo(() => {
    const groupSide = (side: 'home' | 'away') => {
      const map = new Map<
        string,
        { name: string; mins: string[]; hasPenalty: boolean; assist?: string }
      >();
      visibleEvents
        .filter((e) => (e.type === 'goal' || e.type === 'own-goal') && e.teamSide === side)
        .forEach((e) => {
          const name = e.playerName || 'Scorer';
          const isPen = Boolean(e.isPenalty || /\bpenalty\b/i.test(e.commentary || ''));
          const minStr = e.addedMinute ? `${e.minute}+${e.addedMinute}'` : `${e.minute}'`;
          const prev = map.get(name) || { name, mins: [], hasPenalty: false };
          prev.mins.push(minStr);
          if (isPen) prev.hasPenalty = true;
          if (e.assistPlayerName && !prev.assist) {
            prev.assist = e.assistPlayerName;
          }
          map.set(name, prev);
        });
      return Array.from(map.values());
    };
    return {
      home: groupSide('home'),
      away: groupSide('away'),
    };
  }, [visibleEvents]);

  const progressMax = output.wentToExtraTime ? 120 : 90;
  const progressPct = Math.min(100, Math.round((currentMinute / progressMax) * 100));

  const aggHome =
    output.competition.isTwoLegged && output.competition.legNumber === 2
      ? (output.competition.firstLegHomeGoals ?? 0) + visibleHomeScore
      : null;
  const aggAway =
    output.competition.isTwoLegged && output.competition.legNumber === 2
      ? (output.competition.firstLegAwayGoals ?? 0) + visibleAwayScore
      : null;

  return (
    <div className="space-y-3">
      {/* Top Broadcast Navigation Row */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDugout}
            className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold tracking-widest uppercase text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-950 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Fixture Builder</span>
          </button>
          {isUcl && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-gradient-to-r from-blue-600/35 to-cyan-500/20 border border-cyan-400/40 font-mono text-[10px] font-bold tracking-widest uppercase text-cyan-300 light:text-cyan-800 light:bg-cyan-50 light:border-cyan-300">
              <Sparkles className="w-3 h-3" />
              MATCH SIMULATION
            </span>
          )}
          {isUcl && anthemPlaying && !isFullTime && (
            <span className="font-mono text-[10px] text-cyan-300/90 light:text-cyan-700 font-semibold animate-pulse">
              ♪ Champions Night Anthem Playing
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Live Speed Switcher (0.5x · x1 · x2) visible during simulation */}
          {!isFullTime && (
            <div
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#070E1A] light:bg-white border border-white/15 light:border-slate-300 shadow-xs"
              title="Simulation Speed"
            >
              <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-slate-400 light:text-slate-600 mr-0.5">
                Speed
              </span>
              {(
                [
                  { val: 0.5, label: '0.5x' },
                  { val: 1, label: 'x1' },
                  { val: 2, label: 'x2' },
                ] as const
              ).map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => onChangeSpeed(item.val)}
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold cursor-pointer transition-colors ${
                    speed === item.val
                      ? 'bg-[#7ADBF0] text-slate-950 shadow-sm'
                      : 'text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-950 hover:bg-white/10 light:hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onToggleGeminiSound}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono cursor-pointer shadow-xs transition-colors ${
              geminiSoundEnabled
                ? 'bg-cyan-500/15 light:bg-cyan-50 border-cyan-400/40 light:border-cyan-300 text-cyan-200 light:text-cyan-900'
                : 'bg-white/[0.04] light:bg-white border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600'
            }`}
            title="Toggle automatic Gemini Half-Time score broadcast"
          >
            <Radio className={`w-3.5 h-3.5 ${halftimeAudioStatus === 'playing' ? 'text-emerald-400 animate-pulse' : 'text-cyan-400 light:text-cyan-600'}`} />
            <span>Match Audio: {geminiSoundEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleLiveStudio}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono cursor-pointer shadow-xs transition-colors ${
              showLiveStudio
                ? 'bg-emerald-500/20 light:bg-emerald-100 border-emerald-400/50 light:border-emerald-400 text-emerald-200 light:text-emerald-900 font-bold'
                : 'bg-white/[0.04] light:bg-white border-white/10 light:border-slate-300 text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-950'
            }`}
            title="Hear live AI voice punditry & match commentary (no microphone needed)"
          >
            <AudioLines className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" />
            <span>AI Voice Studio</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] light:bg-white border border-white/10 light:border-slate-300 text-[11px] font-mono text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-950 cursor-pointer shadow-xs"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400 light:text-rose-600" /> : <Volume2 className="w-3.5 h-3.5 text-cyan-400 light:text-cyan-600" />}
            <span>{isMuted ? 'Muted' : 'Audio On'}</span>
          </button>
          <button
            type="button"
            onClick={onOpenSaved}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] light:bg-white border border-white/10 light:border-slate-300 text-[11px] font-mono text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-950 cursor-pointer shadow-xs"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
            <span>Saved / History</span>
          </button>
        </div>
      </div>

      {/* Main Broadcast Scoreboard Panel */}
      <div
        className={`relative rounded-2xl border overflow-hidden shadow-2xl transition-all duration-300 ${
          goalBannerEvent
            ? 'border-white/50 shadow-[0_0_55px_rgba(122,219,240,0.28)]'
            : isUcl
            ? 'border-blue-400/35'
            : 'border-white/15'
        }`}
        style={{
          background: isUcl
            ? `radial-gradient(circle at 12% 35%, ${homeColor}50, transparent 44%), radial-gradient(circle at 88% 35%, ${awayColor}50, transparent 44%), linear-gradient(180deg, #040D27 0%, #030714 100%)`
            : `radial-gradient(circle at 12% 35%, ${homeColor}4A, transparent 44%), radial-gradient(circle at 88% 35%, ${awayColor}4A, transparent 44%), linear-gradient(180deg, #060B16 0%, #03060C 100%)`,
        }}
      >
        {/* Subtle broadcast architectural gridlines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)',
            backgroundSize: '110px 64px',
          }}
        />

        {/* Broadcast Animated Goal Celebration Overlay */}
        {goalBannerEvent && (
          <div
            key={goalBannerEvent.id}
            className="relative z-20 overflow-hidden border-b border-white/30 animate-goal-reveal"
            style={{
              background:
                goalBannerEvent.teamSide === 'home'
                  ? `linear-gradient(90deg, ${homeColor}F0 0%, #091326F5 50%, ${homeColor}B0 100%)`
                  : `linear-gradient(90deg, ${awayColor}B0 0%, #091326F5 50%, ${awayColor}F0 100%)`,
            }}
          >
            {/* Sweeping Broadcast Light Flash */}
            <div className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-goal-sweep" />

            <div className="relative px-4 sm:px-6 py-3 flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-white">
              <div className="w-9 h-9 rounded-xl bg-black/45 border border-white/30 p-1.5 flex items-center justify-center shrink-0 shadow-lg animate-bounce">
                <TeamEmblem team={goalBannerEvent.teamSide === 'home' ? homeTeam : awayTeam} />
              </div>

              <div className="text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="px-2 py-0.5 rounded bg-white text-slate-950 font-display text-xs tracking-widest uppercase">
                    {goalBannerEvent.isPenalty || /\bpenalty\b/i.test(goalBannerEvent.commentary || '')
                      ? 'PENALTY GOAL!'
                      : 'GOAL!'}
                  </span>
                  <span className="font-display text-lg sm:text-2xl tracking-wide uppercase drop-shadow">
                    {goalBannerEvent.playerName}
                    {(goalBannerEvent.isPenalty ||
                      /\bpenalty\b/i.test(goalBannerEvent.commentary || '')) && (
                      <span className="ml-1.5 text-amber-300">(P)</span>
                    )}
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-black px-2 py-0.5 rounded bg-black/40 border border-white/20 tabular-nums">
                    {goalBannerEvent.minute}
                    {goalBannerEvent.addedMinute ? `+${goalBannerEvent.addedMinute}` : ''}&apos;
                  </span>
                </div>

                <div className="font-mono text-[11px] text-white/85 mt-0.5">
                  {goalBannerEvent.teamSide === 'home' ? homeTeam.name : awayTeam.name}
                  {goalBannerEvent.assistPlayerName
                    ? ` · Assisted by ${goalBannerEvent.assistPlayerName}`
                    : goalBannerEvent.isPenalty
                    ? ' · Dispatched from the penalty spot'
                    : ''}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 p-4 landscape-mobile:p-3 sm:p-6 space-y-4 landscape-mobile:space-y-2.5">
          {/* Top Competition & Status Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/15 font-mono text-[10px] font-bold tracking-widest uppercase text-slate-200">
              <span>{output.competition.competitionName}</span>
              <span>·</span>
              <span>
                {homeSetup.formation} V {awaySetup.formation}
              </span>
              {output.competition.isTwoLegged && (
                <>
                  <span>·</span>
                  <span className="text-cyan-300">LEG {output.competition.legNumber}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {aggHome !== null && aggAway !== null && (
                <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 font-mono text-[10px] font-bold tracking-wider uppercase text-blue-200">
                  AGG {aggHome} - {aggAway}
                </span>
              )}
              <span
                className={`px-3 py-1 rounded-full border font-mono text-[10px] font-bold tracking-widest uppercase ${
                  isFullTime
                    ? 'bg-white/10 border-white/25 text-slate-200'
                    : isBreakPhase
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                    : 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                }`}
              >
                {statusPill}
              </span>
            </div>
          </div>

          {/* Center Team Crests + Giant Score */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6 py-1">
            {/* Home Team */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              <div className="w-12 h-12 landscape-mobile:w-11 landscape-mobile:h-11 sm:w-16 sm:h-16 rounded-2xl bg-slate-950/75 border border-white/20 p-2 landscape-mobile:p-1.5 shrink-0 flex items-center justify-center shadow-lg">
                <TeamEmblem team={homeTeam} />
              </div>
              <div className="min-w-0">
                <h2 className="font-sans font-extrabold text-sm sm:text-xl text-white truncate">
                  {homeTeam.name}
                </h2>
                <div className="font-mono text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                  {homeTeam.code}
                </div>
              </div>
            </div>

            {/* Scoreline */}
            <div className="flex flex-col items-center justify-center px-2">
              <div className="font-display font-black text-4xl landscape-mobile:text-3xl sm:text-6xl text-white tracking-wider tabular-nums leading-none flex items-center gap-2 sm:gap-3">
                <span
                  key={`hs-${visibleHomeScore}-${goalBannerEvent?.teamSide === 'home' ? goalBannerEvent.id : ''}`}
                  className={
                    goalBannerEvent?.teamSide === 'home'
                      ? 'animate-goal-score-pop text-[#7ADBF0]'
                      : ''
                  }
                >
                  {visibleHomeScore}
                </span>
                <span className="text-slate-500 text-2xl landscape-mobile:text-xl sm:text-4xl">-</span>
                <span
                  key={`as-${visibleAwayScore}-${goalBannerEvent?.teamSide === 'away' ? goalBannerEvent.id : ''}`}
                  className={
                    goalBannerEvent?.teamSide === 'away'
                      ? 'animate-goal-score-pop text-[#7ADBF0]'
                      : ''
                  }
                >
                  {visibleAwayScore}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] text-slate-400 tracking-widest uppercase">
                <span>
                  {isFullTime
                    ? output.wentToExtraTime
                      ? 'AET'
                      : 'FT'
                    : phase === 'half-time'
                    ? 'HT'
                    : currentAddedMinute
                    ? `${currentMinute}+${currentAddedMinute}'`
                    : `${currentMinute}'`}
                </span>
                {(phase === 'full-time' || currentMinute > 45) && (
                  <span>
                    · HT {output.halfTimeHomeScore}-{output.halfTimeAwayScore}
                  </span>
                )}
              </div>
              {isFullTime && output.penaltyShootout && (
                <div className="mt-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 font-mono text-[10px] font-bold text-amber-200">
                  PENS {output.penaltyShootout.homeScore} - {output.penaltyShootout.awayScore} (
                  {output.penaltyShootout.winner === 'home' ? homeTeam.code : awayTeam.code})
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex items-center justify-end gap-3 sm:gap-4 min-w-0 text-right">
              <div className="min-w-0">
                <h2 className="font-sans font-extrabold text-sm sm:text-xl text-white truncate">
                  {awayTeam.name}
                </h2>
                <div className="font-mono text-[11px] font-bold tracking-widest text-slate-400 uppercase">
                  {awayTeam.code}
                </div>
              </div>
              <div className="w-12 h-12 landscape-mobile:w-11 landscape-mobile:h-11 sm:w-16 sm:h-16 rounded-2xl bg-slate-950/75 border border-white/20 p-2 landscape-mobile:p-1.5 shrink-0 flex items-center justify-center shadow-lg">
                <TeamEmblem team={awayTeam} />
              </div>
            </div>
          </div>

          {/* Possession Split Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between font-mono text-[11px] font-bold tracking-widest uppercase">
              <span className="text-slate-300 tabular-nums">
                {homeTeam.code} {visiblePossessionHome}%
              </span>
              <span className="text-slate-400 text-[10px]">POSSESSION</span>
              <span className="text-slate-300 tabular-nums">
                {100 - visiblePossessionHome}% {awayTeam.code}
              </span>
            </div>
            <div className="h-2 rounded-full overflow-hidden flex bg-slate-900 border border-white/10">
              <div
                className="transition-all duration-300"
                style={{ width: `${visiblePossessionHome}%`, backgroundColor: homeColor }}
              />
              <div
                className="transition-all duration-300"
                style={{ width: `${100 - visiblePossessionHome}%`, backgroundColor: awayColor }}
              />
            </div>
          </div>

          {/* SHOTS · ON TARGET · XG Strip */}
          <div className="grid grid-cols-3 rounded-xl bg-black/35 border border-white/10 divide-x divide-white/10 py-2.5 landscape-mobile:py-1.5 text-center">
            <div className="px-2">
              <div className="font-mono text-[9px] tracking-[0.2em] text-slate-400 uppercase">
                SHOTS
              </div>
              <div className="font-mono font-black text-sm sm:text-base text-white tabular-nums mt-0.5">
                {visibleShotsHome} <span className="text-slate-500">-</span> {visibleShotsAway}
              </div>
            </div>
            <div className="px-2">
              <div className="font-mono text-[9px] tracking-[0.2em] text-slate-400 uppercase">
                ON TARGET
              </div>
              <div className="font-mono font-black text-sm sm:text-base text-white tabular-nums mt-0.5">
                {visibleSotHome} <span className="text-slate-500">-</span> {visibleSotAway}
              </div>
            </div>
            <div className="px-2">
              <div className="font-mono text-[9px] tracking-[0.2em] text-slate-400 uppercase">
                XG
              </div>
              <div className="font-mono font-black text-sm sm:text-base text-white tabular-nums mt-0.5">
                {visibleXgHome.toFixed(2)} <span className="text-slate-500">-</span>{' '}
                {visibleXgAway.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Goalscorers Footer Row */}
          {(scorersBySide.home.length > 0 || scorersBySide.away.length > 0) && (
            <div className="grid grid-cols-2 gap-4 pt-1 text-xs text-slate-200">
              <div className="space-y-0.5">
                {scorersBySide.home.map((s) => (
                  <div key={s.name} className="truncate">
                    <span className="font-semibold text-white">
                      {s.name}
                      {s.hasPenalty && (
                        <span className="ml-1 font-mono text-[10px] font-bold text-amber-300">
                          (P)
                        </span>
                      )}
                    </span>{' '}
                    <span className="font-mono text-[11px] text-slate-400">
                      {s.mins.join(', ')}
                    </span>
                    {s.assist && (
                      <span className="text-[10px] text-slate-500 ml-1">(A: {s.assist})</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-0.5 text-right">
                {scorersBySide.away.map((s) => (
                  <div key={s.name} className="truncate">
                    {s.assist && (
                      <span className="text-[10px] text-slate-500 mr-1">(A: {s.assist})</span>
                    )}
                    <span className="font-semibold text-white">
                      {s.name}
                      {s.hasPenalty && (
                        <span className="ml-1 font-mono text-[10px] font-bold text-amber-300">
                          (P)
                        </span>
                      )}
                    </span>{' '}
                    <span className="font-mono text-[11px] text-slate-400">
                      {s.mins.join(', ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom dual club accent stripe */}
        <div className="grid grid-cols-2 h-1">
          <div style={{ backgroundColor: homeColor }} />
          <div style={{ backgroundColor: awayColor }} />
        </div>
      </div>

      {/* Tactical Summary Pills Strip Below Scoreboard (Screenshot #1 & #6) */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-2 text-[11px]">
        <div
          className="px-3.5 py-1.5 rounded-full border flex items-center gap-2 truncate"
          style={{
            backgroundColor: `${homeColor}14`,
            borderColor: `${homeColor}45`,
          }}
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: homeColor }} />
          <span className="text-slate-200 light:text-slate-800 font-medium truncate">{output.tacticalSummaryHome}</span>
        </div>
        <div
          className="px-3.5 py-1.5 rounded-full border flex items-center justify-end gap-2 truncate"
          style={{
            backgroundColor: `${awayColor}14`,
            borderColor: `${awayColor}45`,
          }}
        >
          <span className="text-slate-200 light:text-slate-800 font-medium truncate">{output.tacticalSummaryAway}</span>
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: awayColor }} />
        </div>
      </div>

      {/* Live Playback, Speed, Mode & Plan A/B/C Control Bar */}
      {!isFullTime && (
        <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-3.5 landscape-mobile:p-3 space-y-3 landscape-mobile:space-y-2 shadow-xs">
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between font-mono text-[10px] text-slate-400 light:text-slate-600">
              <span>Match Progress</span>
              <span>
                {currentAddedMinute ? `${currentMinute}+${currentAddedMinute}` : currentMinute}&apos; / {progressMax}&apos; · Seed: {output.seed}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-900 light:bg-slate-200 overflow-hidden border border-white/10 light:border-slate-300">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-200"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Play / Pause + Next Break + Instant */}
            <div className="flex flex-wrap items-center gap-2">
              {isBreakPhase ? (
                <button
                  type="button"
                  onClick={onResumeFromBreak}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer hover:bg-emerald-400 shadow-xs"
                  title={
                    halftimeAudioStatus === 'generating' || halftimeAudioStatus === 'playing'
                      ? 'Continue simulation immediately (skips current AI audio)'
                      : undefined
                  }
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {phase === 'half-time'
                      ? 'Start 2nd Half'
                      : phase === 'end-of-90'
                      ? 'Start Extra Time'
                      : 'Start 2nd Half ET'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onTogglePlay}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer hover:bg-cyan-400 shadow-xs"
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                  <span>{isPlaying ? 'Pause' : 'Play'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={onSkipToNextBreak}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] light:bg-slate-100 hover:bg-white/[0.1] light:hover:bg-slate-200 border border-white/15 light:border-slate-300 font-mono text-[11px] font-bold text-white light:text-slate-900 cursor-pointer shadow-xs"
              >
                <SkipForward className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
                <span>Next Break</span>
              </button>

              <button
                type="button"
                onClick={onInstantFinish}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] light:bg-slate-100 hover:bg-white/[0.1] light:hover:bg-slate-200 border border-white/15 light:border-slate-300 font-mono text-[11px] font-bold text-white light:text-slate-900 cursor-pointer shadow-xs"
              >
                <FastForward className="w-3.5 h-3.5 text-cyan-400 light:text-cyan-600" />
                <span>Instant Sim</span>
              </button>

              <button
                type="button"
                onClick={onOpenBreakTacticsModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/15 light:bg-blue-50 hover:bg-blue-500/25 light:hover:bg-blue-100 border border-blue-400/40 light:border-blue-300 font-mono text-[11px] font-bold text-blue-200 light:text-blue-900 cursor-pointer shadow-xs"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Tactics & Subs</span>
              </button>
            </div>

            {/* Mode + Speeds */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-950 light:bg-slate-100 border border-white/10 light:border-slate-300 rounded-lg p-1">
                {(['live', 'highlights'] as SimPresentationMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onChangeMode(m)}
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase cursor-pointer ${
                      mode === m
                        ? 'bg-white/15 light:bg-white text-white light:text-slate-950 shadow-xs'
                        : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-950'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 bg-slate-950 light:bg-slate-100 border border-white/10 light:border-slate-300 rounded-lg p-1">
                <span className="font-mono text-[9px] font-bold uppercase text-slate-500 light:text-slate-600 px-1.5">
                  Speed
                </span>
                {(
                  [
                    { val: 0.5, label: '0.5x' },
                    { val: 1, label: 'x1' },
                    { val: 2, label: 'x2' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => onChangeSpeed(item.val)}
                    className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-bold cursor-pointer transition-colors ${
                      speed === item.val
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-950'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Plan A / B / C Live Switcher */}
          <div className="pt-2 border-t border-white/10 light:border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase text-slate-400 light:text-slate-600">
                {homeTeam.code} Live Plan:
              </span>
              {(['A', 'B', 'C'] as SimPlanId[]).map((pid) => (
                <button
                  key={pid}
                  type="button"
                  onClick={() => onSwitchPlanLive('home', pid)}
                  className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-bold border cursor-pointer ${
                    homeSetup.activePlan === pid
                      ? 'border-cyan-400 light:border-cyan-600 bg-cyan-500/20 light:bg-cyan-50 text-cyan-200 light:text-cyan-900 font-black'
                      : 'border-white/10 light:border-slate-300 bg-slate-950 light:bg-slate-100 text-slate-400 light:text-slate-700 hover:text-white light:hover:text-slate-950'
                  }`}
                >
                  Plan {pid} ({homeSetup.plans[pid].formation})
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase text-slate-400 light:text-slate-600">
                {awayTeam.code} Live Plan:
              </span>
              {(['A', 'B', 'C'] as SimPlanId[]).map((pid) => (
                <button
                  key={pid}
                  type="button"
                  onClick={() => onSwitchPlanLive('away', pid)}
                  className={`px-2.5 py-0.5 rounded font-mono text-[10px] font-bold border cursor-pointer ${
                    awaySetup.activePlan === pid
                      ? 'border-cyan-400 light:border-cyan-600 bg-cyan-500/20 light:bg-cyan-50 text-cyan-200 light:text-cyan-900 font-black'
                      : 'border-white/10 light:border-slate-300 bg-slate-950 light:bg-slate-100 text-slate-400 light:text-slate-700 hover:text-white light:hover:text-slate-950'
                  }`}
                >
                  Plan {pid} ({awaySetup.plans[pid].formation})
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Pre-Break Broadcast Readiness Strip (visible during 1H / 2H / ET so new users know AI commentary is preparing or ready) */}
      {geminiSoundEnabled &&
        !isMuted &&
        !(
          phase === 'half-time' ||
          phase === 'end-of-90' ||
          phase === 'et-interval' ||
          phase === 'penalties' ||
          phase === 'penalties-intro' ||
          phase === 'full-time' ||
          halftimeAudioStatus === 'playing' ||
          halftimeAudioStatus === 'generating' ||
          Boolean(halftimeAudioError)
        ) && (
          <div className="rounded-xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              {prefetchStatus === 'ready' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 light:text-emerald-600 shrink-0" />
              ) : prefetchStatus === 'preparing' ? (
                <Loader2 className="w-4 h-4 text-amber-400 light:text-amber-600 animate-spin shrink-0" />
              ) : (
                <Radio className="w-4 h-4 text-cyan-400 light:text-cyan-600 shrink-0" />
              )}
              <span className="font-mono text-[11px] font-bold text-white light:text-slate-900">
                {prefetchStatus === 'ready'
                  ? `AI ${prefetchStageLabel || 'Broadcast'} Ready`
                  : prefetchStatus === 'preparing'
                  ? `Preparing AI ${prefetchStageLabel || 'Broadcast'} in background...`
                  : 'AI Match Broadcast Active'}
              </span>
              <span className="hidden sm:inline text-slate-400 light:text-slate-600">
                {prefetchStatus === 'ready'
                  ? '· Will play automatically at the break'
                  : prefetchStatus === 'preparing'
                  ? '· Keep simming while Gemini analyzes the match'
                  : 'Will analyze Live Events, Half-Time, Full-Time & Penalties'}
              </span>
            </div>
            <span className="font-mono text-[11px] text-slate-400 light:text-slate-600">
              Voice: {geminiVoiceName}
            </span>
          </div>
        )}

      {/* Gemini Match Broadcast Panel (HT, 90' ET Break, ET Interval, Penalties, and Full-Time) */}
      {(phase === 'half-time' ||
        phase === 'end-of-90' ||
        phase === 'et-interval' ||
        phase === 'penalties' ||
        phase === 'penalties-intro' ||
        phase === 'full-time' ||
        halftimeAudioStatus === 'playing' ||
        halftimeAudioStatus === 'generating' ||
        Boolean(halftimeAudioError)) && (
        <div
          className={`rounded-2xl bg-[#070E1A] light:bg-white p-3.5 flex flex-col gap-2.5 shadow-xs border ${
            halftimeAudioStatus === 'generating'
              ? 'border-amber-400/55 light:border-amber-400'
              : halftimeAudioStatus === 'playing'
              ? 'border-emerald-400/60 light:border-emerald-500'
              : 'border-cyan-400/35 light:border-cyan-300'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-amber-950/40 light:from-cyan-50 light:via-slate-50 light:to-amber-50 border border-white/10 light:border-slate-200">
            <div className="flex items-center gap-2.5 min-w-0">
              {halftimeAudioStatus === 'generating' ? (
                <Loader2 className="w-4 h-4 text-amber-400 light:text-amber-600 animate-spin shrink-0" />
              ) : halftimeAudioStatus === 'playing' ? (
                <AudioLines className="w-4 h-4 text-emerald-400 light:text-emerald-600 animate-pulse shrink-0" />
              ) : (
                <Radio className="w-4 h-4 text-cyan-400 light:text-cyan-700 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                  <span
                    className={`font-mono text-[11px] font-black uppercase tracking-wide ${
                      halftimeAudioStatus === 'playing'
                        ? 'text-emerald-300 light:text-emerald-700'
                        : halftimeAudioStatus === 'generating'
                        ? 'text-amber-300 light:text-amber-700'
                        : halftimeAudioStatus === 'error'
                        ? 'text-rose-300 light:text-rose-700'
                        : 'text-cyan-200 light:text-cyan-900'
                    }`}
                  >
                    {halftimeAudioStatus === 'playing'
                      ? 'ON AIR · AI Broadcast Speaking'
                      : halftimeAudioStatus === 'generating'
                      ? `Preparing AI Broadcast${generatingSeconds > 0 ? ` (${generatingSeconds}s)` : ''}...`
                      : halftimeAudioStatus === 'error'
                      ? 'Broadcast Unavailable'
                      : halftimeAudioStatus === 'ready'
                      ? 'AI Broadcast Ready'
                      : phase === 'full-time'
                      ? 'Full-Time AI Broadcast'
                      : phase === 'end-of-90'
                      ? 'End of 90\' AI Broadcast'
                      : phase === 'et-interval'
                      ? 'Extra-Time Break AI Broadcast'
                      : phase === 'penalties' || phase === 'penalties-intro'
                      ? 'Penalty Shootout AI Broadcast'
                      : 'Half-Time AI Broadcast'}
                  </span>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span className="font-mono text-[11px] font-semibold text-white light:text-slate-900 truncate">
                    {homeTeam.name} {visibleHomeScore} - {visibleAwayScore} {awayTeam.name}
                  </span>
                </div>
                {halftimeStoryline && halftimeAudioStatus !== 'generating' && (
                  <p className="text-[11px] text-slate-300 light:text-slate-600 truncate">
                    Storyline: {halftimeStoryline}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={geminiVoiceName}
                onChange={(e) => onChangeGeminiVoice(e.target.value as GeminiBroadcastVoiceChoice)}
                className="bg-slate-950 light:bg-white border border-white/15 light:border-slate-300 rounded-lg px-2 py-1 font-mono text-[10px] font-bold text-slate-200 light:text-slate-800"
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

              {halftimeAudioStatus === 'playing' && onStopHalftimeAnnounce && (
                <button
                  type="button"
                  onClick={onStopHalftimeAnnounce}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/45 text-rose-200 light:text-rose-800 font-mono text-[10px] font-bold uppercase cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop</span>
                </button>
              )}

              <button
                type="button"
                disabled={halftimeAudioStatus === 'generating'}
                onClick={onReplayHalftimeAnnounce}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-mono text-[10px] font-black uppercase cursor-pointer shadow-xs"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>
                  {halftimeAudioStatus === 'playing'
                    ? 'Replay'
                    : halftimeAudioStatus === 'generating'
                    ? 'Preparing...'
                    : phase === 'full-time'
                    ? 'Play Full-Time Audio'
                    : phase === 'end-of-90'
                    ? 'Play 90\' Audio'
                    : phase === 'et-interval'
                    ? 'Play ET Audio'
                    : phase === 'penalties' || phase === 'penalties-intro'
                    ? 'Play Shootout Audio'
                    : 'Play HT Broadcast'}
                </span>
              </button>

              <button
                type="button"
                onClick={onToggleLiveStudio}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 light:bg-emerald-100 hover:bg-emerald-500/30 border border-emerald-400/45 font-mono text-[10px] font-bold uppercase text-emerald-200 light:text-emerald-900 cursor-pointer"
              >
                <AudioLines className="w-3.5 h-3.5" />
                <span>{showLiveStudio ? 'Hide AI Studio' : 'AI Pundit Voice'}</span>
              </button>
            </div>
          </div>

          {halftimeAudioStatus === 'generating' && (
            <div className="px-3 py-2 rounded-lg bg-amber-500/10 light:bg-amber-50 border border-amber-400/30 light:border-amber-300 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-100 light:text-amber-900">
              <span>
                Gemini AI is analyzing the match events, stats & tactics to voice your live broadcast. You can wait a moment to listen, or click{' '}
                <strong className="font-semibold">
                  {isBreakPhase ? 'Start 2nd Half / Continue' : 'Skip / Replay'}
                </strong>{' '}
                anytime without interrupting your match.
              </span>
            </div>
          )}

          {halftimeScript && (
            <p className="px-3 py-2 rounded-lg bg-black/30 light:bg-slate-100 border border-white/[0.06] light:border-slate-200 font-sans text-xs leading-relaxed text-slate-200 light:text-slate-800 whitespace-pre-line">
              {halftimeScript}
            </p>
          )}

          {halftimeAudioError && (
            <p className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-400/40 font-mono text-[11px] text-rose-200 light:text-rose-800">
              {halftimeAudioError}
            </p>
          )}
        </div>
      )}

      {/* Full-Time Action Bar & Disclaimer */}
      {isFullTime && (
        <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 space-y-3 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {onReturnToTournament && (
                <button
                  type="button"
                  disabled={isReturningToTournament}
                  onClick={async () => {
                    if (isReturningToTournament) return;
                    setIsReturningToTournament(true);
                    try {
                      await onReturnToTournament();
                    } finally {
                      setIsReturningToTournament(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 light:from-cyan-600 light:to-emerald-600 hover:brightness-110 text-slate-950 light:text-white font-mono text-xs font-black tracking-wide cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-wait transition-all"
                >
                  <ArrowLeft className="w-4 h-4 shrink-0" />
                  <Trophy className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {isReturningToTournament
                      ? 'Syncing Result...'
                      : `Return to ${tournamentReturnName || 'Tournament'}`}
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={onSaveMatch}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 light:bg-emerald-50 hover:bg-emerald-500/25 light:hover:bg-emerald-100 border border-emerald-400/40 light:border-emerald-300 font-mono text-xs font-bold text-emerald-300 light:text-emerald-800 cursor-pointer shadow-xs"
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>{savedNotice || 'Save Match'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenSaved}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] light:bg-slate-100 hover:bg-white/[0.1] light:hover:bg-slate-200 border border-white/15 light:border-slate-300 font-mono text-xs font-bold text-white light:text-slate-900 cursor-pointer shadow-xs"
              >
                <History className="w-4 h-4 text-cyan-400 light:text-cyan-600" />
                <span>Open Saved / History</span>
              </button>

              <button
                type="button"
                onClick={onRematchNewSeed}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 light:bg-amber-50 hover:bg-amber-500/25 light:hover:bg-amber-100 border border-amber-400/40 light:border-amber-300 font-mono text-xs font-bold text-amber-200 light:text-amber-800 cursor-pointer shadow-xs"
              >
                <Dices className="w-4 h-4" />
                <span>Rematch (New Seed)</span>
              </button>

              <button
                type="button"
                onClick={onNewFixture}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] light:bg-slate-100 hover:bg-white/[0.1] light:hover:bg-slate-200 border border-white/15 light:border-slate-300 font-mono text-xs font-bold text-slate-200 light:text-slate-800 cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-4 h-4" />
                <span>New Fixture</span>
              </button>
            </div>

            <div className="font-mono text-[11px] text-slate-400 light:text-slate-600">
              Seed: <span className="text-cyan-300 light:text-cyan-700 font-bold">{output.seed}</span>
            </div>
          </div>

          {filingNotice && (
            <div className="px-3 py-2 rounded-xl bg-blue-950/50 light:bg-blue-50 border border-blue-400/30 light:border-blue-200 font-mono text-[11px] text-blue-200 light:text-blue-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-cyan-300 light:text-cyan-700 shrink-0" />
              <span>{filingNotice}</span>
            </div>
          )}

          <p className="text-[11px] text-slate-500 light:text-slate-600 font-mono">
            Simulated result powered by the deterministic DodaEona Match Engine. All match telemetry, xG figures, and events are fictional simulation outputs for entertainment and tactical analysis.
          </p>
        </div>
      )}
    </div>
  );
};
