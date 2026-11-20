import React from 'react';
import { Trophy, BookmarkCheck, RotateCcw, Plus, History, Sparkles, Check, ArrowRight } from 'lucide-react';
import { Team } from '../../../types/matchCentre';

interface ScoreboardResultBannerProps {
  winner: 'home' | 'away' | 'draw' | null;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  wentToExtraTime: boolean;
  wentToPenalties: boolean;
  penaltyHomeScore?: number;
  penaltyAwayScore?: number;
  outcomeDescription: string;
  onSaveMatch: () => void;
  isSaved: boolean;
  onRematchSameTeams: () => void;
  onNewMatchDifferentTeams: () => void;
  onOpenHistory: () => void;
}

export const ScoreboardResultBanner: React.FC<ScoreboardResultBannerProps> = ({
  winner,
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  wentToExtraTime,
  wentToPenalties,
  penaltyHomeScore,
  penaltyAwayScore,
  outcomeDescription,
  onSaveMatch,
  isSaved,
  onRematchSameTeams,
  onNewMatchDifferentTeams,
  onOpenHistory,
}) => {
  const winningTeam = winner === 'home' ? homeTeam : winner === 'away' ? awayTeam : null;

  return (
    <div className="relative rounded-2xl bg-gradient-to-b from-[#0B1525] to-[#050A12] light:from-white light:to-slate-100 border border-[#7ADBF0]/40 light:border-slate-300 shadow-2xl overflow-hidden p-6 sm:p-8 landscape-mobile:p-4 animate-fadeIn transition-all">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#7ADBF0]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#D6B56E]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Status */}
      <div className="relative flex flex-col items-center text-center space-y-3 landscape-mobile:space-y-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#7ADBF0]/15 border border-[#7ADBF0]/40 text-[#7ADBF0] light:text-cyan-800 text-xs font-mono font-bold tracking-widest uppercase">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Match Completed · Official Final Result</span>
        </div>

        {/* Winner Announcement or Draw */}
        {winningTeam ? (
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-3">
              <img
                src={winningTeam.crestUrl}
                alt={winningTeam.name}
                className="w-12 h-12 landscape-mobile:w-9 landscape-mobile:h-9 object-contain drop-shadow-[0_0_15px_rgba(214,181,110,0.5)]"
              />
              <h2 className="font-display uppercase text-3xl sm:text-5xl landscape-mobile:text-2xl text-white light:text-slate-900 tracking-wide">
                {winningTeam.name} Victorious!
              </h2>
            </div>
            <p className="text-sm sm:text-base landscape-mobile:text-xs text-[#D6B56E] light:text-amber-700 font-semibold">
              {outcomeDescription}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            <h2 className="font-display uppercase text-3xl sm:text-5xl landscape-mobile:text-2xl text-white light:text-slate-900 tracking-wide">
              Match Drawn!
            </h2>
            <p className="text-sm sm:text-base landscape-mobile:text-xs text-slate-300 light:text-slate-700 font-semibold">
              {outcomeDescription}
            </p>
          </div>
        )}

        {/* Big Score Summary */}
        <div className="my-2 py-3 px-8 landscape-mobile:py-2 landscape-mobile:px-4 rounded-2xl bg-black/40 light:bg-slate-200/60 border border-white/10 light:border-slate-300 flex items-center justify-center gap-6 sm:gap-10 landscape-mobile:gap-4">
          <div className="flex items-center gap-3">
            <img src={homeTeam.crestUrl} alt={homeTeam.name} className="w-9 h-9 object-contain drop-shadow" />
            <div className="text-right">
              <div className="font-bold text-sm sm:text-base text-white light:text-slate-900 leading-tight">
                {homeTeam.name}
              </div>
              <div className="text-[11px] font-mono text-slate-400">HOME</div>
            </div>
            <div className="font-display text-4xl sm:text-5xl landscape-mobile:text-3xl text-white light:text-slate-900 ml-2">
              {homeScore}
            </div>
          </div>

          <div className="text-center px-2">
            <span className="font-display text-2xl text-slate-500">:</span>
            <div className="text-[10px] font-mono uppercase text-[#7ADBF0] light:text-cyan-700 mt-0.5">
              {wentToPenalties
                ? `PEN (${penaltyHomeScore}-${penaltyAwayScore})`
                : wentToExtraTime
                ? 'AET'
                : 'FT'}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="font-display text-4xl sm:text-5xl landscape-mobile:text-3xl text-white light:text-slate-900 mr-2">
              {awayScore}
            </div>
            <div className="text-left">
              <div className="font-bold text-sm sm:text-base text-white light:text-slate-900 leading-tight">
                {awayTeam.name}
              </div>
              <div className="text-[11px] font-mono text-slate-400">AWAY</div>
            </div>
            <img src={awayTeam.crestUrl} alt={awayTeam.name} className="w-9 h-9 object-contain drop-shadow" />
          </div>
        </div>

        {/* Action Controls */}
        <div className="w-full pt-4 landscape-mobile:pt-2 flex flex-wrap items-center justify-center gap-3 landscape-mobile:gap-2">
          {/* Save match CTA */}
          <button
            type="button"
            onClick={onSaveMatch}
            disabled={isSaved}
            className={`px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer ${
              isSaved
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                : 'bg-[#7ADBF0] hover:bg-[#8ee1f3] text-[#050A12] shadow-[0_0_20px_rgba(122,219,240,0.4)] hover:scale-[1.02]'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Match Saved to History</span>
              </>
            ) : (
              <>
                <BookmarkCheck className="w-4 h-4" />
                <span>Save Completed Match</span>
              </>
            )}
          </button>

          {/* Rematch with Same Teams */}
          <button
            type="button"
            onClick={onRematchSameTeams}
            className="px-4 py-3 rounded-xl font-bold text-sm bg-[#0B1525] light:bg-white hover:bg-white/10 light:hover:bg-slate-100 border border-white/10 light:border-slate-300 text-white light:text-slate-900 flex items-center gap-2 transition-all cursor-pointer hover:border-[#7ADBF0]/50"
          >
            <RotateCcw className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
            <span>Rematch (Same Teams)</span>
          </button>

          {/* New Match Different Teams */}
          <button
            type="button"
            onClick={onNewMatchDifferentTeams}
            className="px-4 py-3 rounded-xl font-bold text-sm bg-[#0B1525] light:bg-white hover:bg-white/10 light:hover:bg-slate-100 border border-white/10 light:border-slate-300 text-white light:text-slate-900 flex items-center gap-2 transition-all cursor-pointer hover:border-[#D6B56E]/50"
          >
            <Plus className="w-4 h-4 text-[#D6B56E] light:text-amber-700" />
            <span>New Match (Different Teams)</span>
          </button>

          {/* View Saved History */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="px-4 py-3 rounded-xl font-medium text-sm text-slate-300 hover:text-white light:text-slate-600 light:hover:text-slate-900 hover:bg-white/5 light:hover:bg-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <History className="w-4 h-4" />
            <span>Saved Matches</span>
          </button>
        </div>
      </div>
    </div>
  );
};
