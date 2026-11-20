import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Settings,
  Volume2,
  Plus,
  ArrowLeftRight,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Team } from '../../../types/matchCentre';
import { ScoreboardPeriod, ScoreboardMatchConfig } from '../../../types/scoreboard';

interface ScoreboardDigitalBoardProps {
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  status: ScoreboardPeriod;
  currentSecond: number;
  isRunning: boolean;
  speedMultiplier: number;
  config: ScoreboardMatchConfig;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onSetSpeedMultiplier: (speed: number) => void;
  onChangePeriod: (period: ScoreboardPeriod) => void;
  onOpenTeamSelect: (side: 'home' | 'away') => void;
  onOpenSettings: () => void;
  onQuickAddGoal: (side: 'home' | 'away') => void;
  onTriggerWhistle: (kind?: 'kickoff' | 'halftime' | 'fulltime') => void;
  onSwapSides: () => void;
  wentToExtraTime: boolean;
  wentToPenalties: boolean;
  penaltyHomeScore?: number;
  penaltyAwayScore?: number;
}

export const ScoreboardDigitalBoard: React.FC<ScoreboardDigitalBoardProps> = ({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status,
  currentSecond,
  isRunning,
  speedMultiplier,
  config,
  onToggleTimer,
  onResetTimer,
  onSetSpeedMultiplier,
  onChangePeriod,
  onOpenTeamSelect,
  onOpenSettings,
  onQuickAddGoal,
  onTriggerWhistle,
  onSwapSides,
  wentToExtraTime,
  wentToPenalties,
  penaltyHomeScore = 0,
  penaltyAwayScore = 0,
}) => {
  // Format MM:SS
  const minutes = Math.floor(currentSecond / 60);
  const seconds = currentSecond % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const getStatusBadge = () => {
    switch (status) {
      case 'not_started':
        return { label: 'NOT STARTED', bg: 'bg-slate-500/20 text-slate-300 border-slate-500/40' };
      case 'first_half':
        return { label: '1ST HALF', bg: 'bg-[#7ADBF0]/20 text-[#7ADBF0] border-[#7ADBF0]/50 animate-pulse' };
      case 'half_time':
        return { label: 'HALF TIME', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'second_half':
        return { label: '2ND HALF', bg: 'bg-[#7ADBF0]/20 text-[#7ADBF0] border-[#7ADBF0]/50 animate-pulse' };
      case 'full_time':
        return { label: `FULL TIME (${config.minutesPerHalf * 2}')`, bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' };
      case 'extra_time_first_half':
        return { label: 'ET 1ST HALF', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/50 animate-pulse' };
      case 'extra_time_break':
        return { label: 'ET BREAK', bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'extra_time_second_half':
        return { label: 'ET 2ND HALF', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/50 animate-pulse' };
      case 'extra_time_finished':
        return { label: `AET (${config.minutesPerHalf * 2 + config.extraTimeMinutesPerHalf * 2}')`, bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' };
      case 'penalty_shootout':
        return { label: 'PENALTIES', bg: 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse' };
      case 'completed':
        return { label: 'FINAL RESULT', bg: 'bg-[#D6B56E]/20 text-[#D6B56E] border-[#D6B56E]/50' };
      default:
        return { label: 'LIVE', bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="relative rounded-3xl bg-gradient-to-b from-[#0B1525] via-[#070F1B] to-[#050A12] light:from-white light:via-slate-50 light:to-slate-100 border-2 border-[#7ADBF0]/30 light:border-slate-300 shadow-[0_10px_40px_rgba(0,0,0,0.6)] overflow-hidden transition-all">
      {/* Stadium LED Top Rim Light */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0891B2] via-[#7ADBF0] to-[#D6B56E] shadow-[0_0_15px_rgba(122,219,240,0.8)]" />

      {/* Top Bar: Venue, Title, Whistle, Settings */}
      <div className="px-5 py-3 landscape-mobile:px-4 landscape-mobile:py-2 border-b border-white/10 light:border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[#7ADBF0] light:text-cyan-800 font-bold uppercase tracking-wider">
            {config.matchName || 'ScoreBoard Stadium Arena'}
          </span>
          {config.venue && (
            <span className="text-slate-400">· {config.venue}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Whistle sound button */}
          <button
            type="button"
            onClick={() => onTriggerWhistle()}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Blow Referee Whistle"
          >
            <Volume2 className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
            <span>Whistle</span>
          </button>

          {/* Swap sides */}
          <button
            type="button"
            onClick={onSwapSides}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Swap Home and Away Sides"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Swap Sides</span>
          </button>

          {/* Match Settings */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Match Duration & Rules"
          >
            <Settings className="w-3.5 h-3.5 text-[#D6B56E] light:text-amber-700" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Main Scoreboard Arena */}
      <div className="p-5 landscape-mobile:p-4 sm:p-8 grid grid-cols-1 landscape-mobile:grid-cols-12 md:grid-cols-12 gap-6 landscape-mobile:gap-3 items-center">
        {/* HOME TEAM COLUMN */}
        <div className="landscape-mobile:col-span-4 md:col-span-4 flex flex-col items-center landscape-mobile:items-start md:items-start text-center landscape-mobile:text-left md:text-left space-y-3 landscape-mobile:space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold tracking-widest text-[#7ADBF0] light:text-cyan-800 uppercase px-2 py-0.5 rounded bg-[#7ADBF0]/10 border border-[#7ADBF0]/30">
              HOME
            </span>
            <button
              type="button"
              onClick={() => onOpenTeamSelect('home')}
              className="text-[11px] text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 underline decoration-slate-600 light:decoration-slate-400 transition-colors cursor-pointer"
            >
              Change Team
            </button>
          </div>

          <div className="flex items-center gap-4 landscape-mobile:gap-2.5">
            <div
              onClick={() => onOpenTeamSelect('home')}
              className="w-16 h-16 landscape-mobile:w-12 landscape-mobile:h-12 sm:w-20 sm:h-20 rounded-2xl bg-[#050A12] light:bg-white border-2 border-white/10 light:border-slate-300 flex items-center justify-center p-2.5 landscape-mobile:p-1.5 shadow-xl hover:border-[#7ADBF0] transition-all cursor-pointer group shrink-0"
              title="Click to select another Home Team"
            >
              <img
                src={homeTeam.crestUrl}
                alt={homeTeam.name}
                className="w-full h-full object-contain drop-shadow group-hover:scale-105 transition-transform"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/assets/aistudio/DodaEona_F.C._V2_Fill_Color_8c96db06.png';
                }}
              />
            </div>

            <div className="min-w-0">
              <h2
                onClick={() => onOpenTeamSelect('home')}
                className="font-display uppercase text-2xl landscape-mobile:text-xl sm:text-3xl text-white light:text-slate-900 tracking-wide hover:text-[#7ADBF0] cursor-pointer transition-colors leading-tight"
              >
                {homeTeam.name}
              </h2>
              <div className="text-xs text-slate-400 light:text-slate-600 font-mono mt-0.5">
                {homeTeam.code} · OVR {homeTeam.overallRating}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onQuickAddGoal('home')}
            className="w-full landscape-mobile:w-auto sm:w-auto px-4 py-2 landscape-mobile:px-3 landscape-mobile:py-1.5 rounded-xl bg-[#7ADBF0]/15 light:bg-cyan-100 hover:bg-[#7ADBF0]/25 light:hover:bg-cyan-200 border border-[#7ADBF0]/40 light:border-cyan-300 text-white light:text-slate-900 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 text-[#7ADBF0] light:text-cyan-800" />
            <span>Record Goal for {homeTeam.code}</span>
          </button>
        </div>

        {/* CENTER DIGITAL CLOCK & SCORE DISPLAY */}
        <div className="landscape-mobile:col-span-4 md:col-span-4 flex flex-col items-center justify-center space-y-4 landscape-mobile:space-y-2 py-2 landscape-mobile:py-0">
          {/* Status Badge */}
          <div className={`px-3 py-1 landscape-mobile:py-0.5 rounded-full text-xs font-mono font-bold tracking-wider border ${badge.bg}`}>
            {badge.label}
          </div>

          {/* LED Digital Big Score Counter */}
          <div className="flex items-center justify-center gap-4 landscape-mobile:gap-3 sm:gap-6 bg-black/60 light:bg-slate-200/80 px-6 landscape-mobile:px-4 sm:px-8 py-3.5 landscape-mobile:py-2 rounded-2xl border-2 border-white/10 light:border-slate-300 shadow-inner">
            <div className="text-center">
              <span className="font-display text-5xl landscape-mobile:text-4xl sm:text-6xl text-white light:text-slate-900 tracking-tight drop-shadow-[0_0_20px_rgba(122,219,240,0.4)]">
                {homeScore}
              </span>
              {wentToPenalties && (
                <div className="text-xs font-mono text-[#7ADBF0] light:text-cyan-800 font-bold">
                  ({penaltyHomeScore} pen)
                </div>
              )}
            </div>

            <span className="font-display text-3xl landscape-mobile:text-2xl sm:text-4xl text-slate-500 animate-pulse">:</span>

            <div className="text-center">
              <span className="font-display text-5xl landscape-mobile:text-4xl sm:text-6xl text-white light:text-slate-900 tracking-tight drop-shadow-[0_0_20px_rgba(214,181,110,0.4)]">
                {awayScore}
              </span>
              {wentToPenalties && (
                <div className="text-xs font-mono text-[#D6B56E] light:text-amber-800 font-bold">
                  ({penaltyAwayScore} pen)
                </div>
              )}
            </div>
          </div>

          {/* Stadium Timer LED Box */}
          <div className="flex flex-col items-center space-y-2 landscape-mobile:space-y-1.5">
            <div className="px-5 py-2 landscape-mobile:px-3.5 landscape-mobile:py-1 rounded-xl bg-[#050A12] light:bg-slate-100 border border-[#7ADBF0]/30 light:border-slate-300 flex items-center gap-2 shadow-inner">
              <Clock className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
              <span className="font-mono text-2xl landscape-mobile:text-xl sm:text-3xl font-bold tracking-widest text-[#7ADBF0] light:text-cyan-900">
                {formattedTime}
              </span>
            </div>

            {/* Timer Controls: Play/Pause, Reset, Speed Presets */}
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <button
                type="button"
                onClick={onToggleTimer}
                className={`p-2 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center ${
                  isRunning
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                    : 'bg-[#7ADBF0] hover:bg-[#8ee1f3] text-[#050A12] shadow-[0_0_15px_rgba(122,219,240,0.4)]'
                }`}
                title={isRunning ? 'Pause Match Timer' : 'Start Match Timer'}
              >
                {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
              </button>

              <button
                type="button"
                onClick={onResetTimer}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white transition-colors cursor-pointer"
                title="Reset Clock to Period Start"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Speed Multipliers */}
              <div className="flex items-center gap-1 pl-1">
                {[1, 5, 10, 30, 60].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => onSetSpeedMultiplier(spd)}
                    className={`px-2 py-1 rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer ${
                      speedMultiplier === spd
                        ? 'bg-[#7ADBF0] text-[#050A12]'
                        : 'bg-white/5 hover:bg-white/10 light:bg-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AWAY TEAM COLUMN */}
        <div className="landscape-mobile:col-span-4 md:col-span-4 flex flex-col items-center landscape-mobile:items-end md:items-end text-center landscape-mobile:text-right md:text-right space-y-3 landscape-mobile:space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenTeamSelect('away')}
              className="text-[11px] text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 underline decoration-slate-600 light:decoration-slate-400 transition-colors cursor-pointer"
            >
              Change Team
            </button>
            <span className="text-[11px] font-mono font-bold tracking-widest text-[#D6B56E] light:text-amber-800 uppercase px-2 py-0.5 rounded bg-[#D6B56E]/10 border border-[#D6B56E]/30">
              AWAY
            </span>
          </div>

          <div className="flex items-center gap-4 landscape-mobile:gap-2.5 landscape-mobile:flex-row-reverse md:flex-row-reverse">
            <div
              onClick={() => onOpenTeamSelect('away')}
              className="w-16 h-16 landscape-mobile:w-12 landscape-mobile:h-12 sm:w-20 sm:h-20 rounded-2xl bg-[#050A12] light:bg-white border-2 border-white/10 light:border-slate-300 flex items-center justify-center p-2.5 landscape-mobile:p-1.5 shadow-xl hover:border-[#D6B56E] transition-all cursor-pointer group shrink-0"
              title="Click to select another Away Team"
            >
              <img
                src={awayTeam.crestUrl}
                alt={awayTeam.name}
                className="w-full h-full object-contain drop-shadow group-hover:scale-105 transition-transform"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/assets/aistudio/DodaEona_F.C._V2_Fill_Color_8c96db06.png';
                }}
              />
            </div>

            <div className="min-w-0">
              <h2
                onClick={() => onOpenTeamSelect('away')}
                className="font-display uppercase text-2xl landscape-mobile:text-xl sm:text-3xl text-white light:text-slate-900 tracking-wide hover:text-[#D6B56E] cursor-pointer transition-colors leading-tight"
              >
                {awayTeam.name}
              </h2>
              <div className="text-xs text-slate-400 light:text-slate-600 font-mono mt-0.5">
                {awayTeam.code} · OVR {awayTeam.overallRating}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onQuickAddGoal('away')}
            className="w-full landscape-mobile:w-auto sm:w-auto px-4 py-2 landscape-mobile:px-3 landscape-mobile:py-1.5 rounded-xl bg-[#D6B56E]/15 light:bg-amber-100 hover:bg-[#D6B56E]/25 light:hover:bg-amber-200 border border-[#D6B56E]/40 light:border-amber-300 text-white light:text-slate-900 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 text-[#D6B56E] light:text-amber-800" />
            <span>Record Goal for {awayTeam.code}</span>
          </button>
        </div>
      </div>

      {/* Match Period Quick Stepper Ribbon */}
      <div className="px-4 py-3 landscape-mobile:py-2 bg-[#050A12]/80 light:bg-slate-100 border-t border-white/10 light:border-slate-200 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-max text-xs">
          <span className="font-mono text-[10px] uppercase text-slate-400 light:text-slate-600 mr-1">Period:</span>

          {[
            { id: 'not_started' as const, label: 'Pre-Match' },
            { id: 'first_half' as const, label: '1st Half' },
            { id: 'half_time' as const, label: 'Half Time' },
            { id: 'second_half' as const, label: '2nd Half' },
            { id: 'full_time' as const, label: `Full Time (${config.minutesPerHalf * 2}m)` },
            { id: 'extra_time_first_half' as const, label: 'ET 1st Half' },
            { id: 'extra_time_break' as const, label: 'ET Break' },
            { id: 'extra_time_second_half' as const, label: 'ET 2nd Half' },
            { id: 'penalty_shootout' as const, label: 'Shootout (Penalties)' },
            { id: 'completed' as const, label: 'Final Result' },
          ].map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => onChangePeriod(step.id)}
              className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-semibold cursor-pointer transition-all ${
                status === step.id
                  ? 'bg-[#7ADBF0] text-[#050A12] shadow-sm font-bold'
                  : 'bg-[#0B1525] light:bg-slate-200 text-slate-400 light:text-slate-700 hover:text-white light:hover:text-slate-900'
              }`}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
