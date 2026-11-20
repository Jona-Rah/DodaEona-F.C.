import React, { useMemo, useRef } from 'react';
import {
  Target,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Plus,
  Trophy,
  ChevronRight,
  ChevronLeft,
  Flame,
  Sparkles,
  AudioLines,
} from 'lucide-react';
import { ScoreboardPenaltyKick, PenaltyStatus } from '../../../types/scoreboard';
import { Team } from '../../../types/matchCentre';
import { playWhistle } from '../../../utils/scoreboardAudio';

interface ScoreboardPenaltyArenaProps {
  homeTeam: Team;
  awayTeam: Team;
  penalties: ScoreboardPenaltyKick[];
  isBroadcastAudioBusy?: boolean;
  onUpdatePenalties: (penalties: ScoreboardPenaltyKick[]) => void;
  onPenaltyKickRecorded?: (info: {
    kick: ScoreboardPenaltyKick;
    kickNumber: number;
    homeScored: number;
    awayScored: number;
    isDecisiveWinner: boolean;
  }) => void;
  onShootoutComplete?: (winner: 'home' | 'away', homeScore: number, awayScore: number) => void;
}

export const ScoreboardPenaltyArena: React.FC<ScoreboardPenaltyArenaProps> = ({
  homeTeam,
  awayTeam,
  penalties,
  isBroadcastAudioBusy = false,
  onUpdatePenalties,
  onPenaltyKickRecorded,
  onShootoutComplete,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Determine maximum round present (minimum 5 rounds)
  const maxRound = useMemo(() => {
    if (penalties.length === 0) return 5;
    return Math.max(5, ...penalties.map((p) => p.round));
  }, [penalties]);

  // Ensure all rounds 1..maxRound exist and always normalize taker names to "Taker {r}"
  const fullPenalties = useMemo(() => {
    const list: ScoreboardPenaltyKick[] = penalties.map((p) => ({
      ...p,
      takerName: `Taker ${p.round}`,
    }));

    for (let r = 1; r <= maxRound; r++) {
      if (!list.find((p) => p.round === r && p.teamSide === 'home')) {
        list.push({
          id: `pen-home-${r}`,
          round: r,
          teamSide: 'home',
          teamId: homeTeam.id,
          takerName: `Taker ${r}`,
          status: 'pending',
        });
      }
      if (!list.find((p) => p.round === r && p.teamSide === 'away')) {
        list.push({
          id: `pen-away-${r}`,
          round: r,
          teamSide: 'away',
          teamId: awayTeam.id,
          takerName: `Taker ${r}`,
          status: 'pending',
        });
      }
    }
    return list.sort((a, b) => a.round - b.round || (a.teamSide === 'home' ? -1 : 1));
  }, [penalties, maxRound, homeTeam.id, awayTeam.id]);

  // Scored and taken kick totals
  const homeScored = fullPenalties.filter((p) => p.teamSide === 'home' && p.status === 'scored').length;
  const awayScored = fullPenalties.filter((p) => p.teamSide === 'away' && p.status === 'scored').length;

  const homeTaken = fullPenalties.filter((p) => p.teamSide === 'home' && p.status !== 'pending').length;
  const awayTaken = fullPenalties.filter((p) => p.teamSide === 'away' && p.status !== 'pending').length;

  // Analysis of whether shootout is decided
  const shootoutVerdict = useMemo(() => {
    // 1. Regular 5 rounds
    if (homeTaken <= 5 && awayTaken <= 5) {
      const homeRemaining = 5 - homeTaken;
      const awayRemaining = 5 - awayTaken;

      if (homeScored > awayScored + awayRemaining) {
        return {
          decided: true,
          winner: 'home' as const,
          reason: `${homeTeam.name} wins before round 5 completion (${homeScored}-${awayScored})!`,
        };
      }
      if (awayScored > homeScored + homeRemaining) {
        return {
          decided: true,
          winner: 'away' as const,
          reason: `${awayTeam.name} wins before round 5 completion (${awayScored}-${homeScored})!`,
        };
      }

      if (homeTaken === 5 && awayTaken === 5) {
        if (homeScored > awayScored) {
          return {
            decided: true,
            winner: 'home' as const,
            reason: `${homeTeam.name} wins shootout ${homeScored}-${awayScored}!`,
          };
        }
        if (awayScored > homeScored) {
          return {
            decided: true,
            winner: 'away' as const,
            reason: `${awayTeam.name} wins shootout ${awayScored}-${homeScored}!`,
          };
        }
        return {
          decided: false,
          suddenDeath: true,
          reason: 'Level after 5 rounds! Sudden Death Activated.',
        };
      }
    }

    // 2. Sudden Death rounds (round 6+)
    if (maxRound >= 5 && homeTaken >= 5 && awayTaken >= 5) {
      for (let r = 6; r <= maxRound; r++) {
        const hKick = fullPenalties.find((p) => p.round === r && p.teamSide === 'home');
        const aKick = fullPenalties.find((p) => p.round === r && p.teamSide === 'away');

        if (hKick && aKick && hKick.status !== 'pending' && aKick.status !== 'pending') {
          if (hKick.status === 'scored' && aKick.status === 'missed') {
            return {
              decided: true,
              winner: 'home' as const,
              reason: `${homeTeam.name} wins in Sudden Death Round ${r}! (${homeScored}-${awayScored})`,
            };
          }
          if (aKick.status === 'scored' && hKick.status === 'missed') {
            return {
              decided: true,
              winner: 'away' as const,
              reason: `${awayTeam.name} wins in Sudden Death Round ${r}! (${awayScored}-${homeScored})`,
            };
          }
        }
      }

      if (homeTaken === awayTaken && homeScored === awayScored) {
        return {
          decided: false,
          suddenDeath: true,
          reason: `Sudden Death round ${maxRound} tied (${homeScored}-${awayScored}). Add round ${maxRound + 1} to continue!`,
        };
      }
    }

    return {
      decided: false,
      suddenDeath: maxRound > 5 || (homeTaken === 5 && awayTaken === 5 && homeScored === awayScored),
      reason: '',
    };
  }, [homeTaken, awayTaken, homeScored, awayScored, maxRound, fullPenalties, homeTeam.name, awayTeam.name]);

  const handleToggleKick = (round: number, side: 'home' | 'away') => {
    if (isBroadcastAudioBusy) return;
    let toggledKick: ScoreboardPenaltyKick | null = null;
    const updated = fullPenalties.map((k) => {
      if (k.round === round && k.teamSide === side) {
        let nextStatus: PenaltyStatus = 'scored';
        if (k.status === 'scored') nextStatus = 'missed';
        else if (k.status === 'missed') nextStatus = 'pending';
        else nextStatus = 'scored';

        if (nextStatus === 'scored') playWhistle('goal');
        toggledKick = {
          ...k,
          status: nextStatus,
          takerName: `Taker ${round}`,
        };
        return toggledKick;
      }
      return k;
    });

    onUpdatePenalties(updated);

    if (toggledKick && ((toggledKick as ScoreboardPenaltyKick).status === 'scored' || (toggledKick as ScoreboardPenaltyKick).status === 'missed') && onPenaltyKickRecorded) {
      const nextHomeScored = updated.filter((p) => p.teamSide === 'home' && p.status === 'scored').length;
      const nextAwayScored = updated.filter((p) => p.teamSide === 'away' && p.status === 'scored').length;
      const nextHomeTaken = updated.filter((p) => p.teamSide === 'home' && p.status !== 'pending').length;
      const nextAwayTaken = updated.filter((p) => p.teamSide === 'away' && p.status !== 'pending').length;
      let nextDecided = false;
      if (nextHomeTaken <= 5 && nextAwayTaken <= 5) {
        if (
          nextHomeScored > nextAwayScored + (5 - nextAwayTaken) ||
          nextAwayScored > nextHomeScored + (5 - nextHomeTaken) ||
          (nextHomeTaken === 5 && nextAwayTaken === 5 && nextHomeScored !== nextAwayScored)
        ) {
          nextDecided = true;
        }
      } else if (nextHomeTaken >= 5 && nextAwayTaken >= 5) {
        const hR = updated.find((p) => p.round === round && p.teamSide === 'home');
        const aR = updated.find((p) => p.round === round && p.teamSide === 'away');
        if (hR && aR && hR.status !== 'pending' && aR.status !== 'pending' && hR.status !== aR.status) {
          nextDecided = true;
        }
      }
      onPenaltyKickRecorded({
        kick: toggledKick,
        kickNumber: (round - 1) * 2 + (side === 'home' ? 1 : 2),
        homeScored: nextHomeScored,
        awayScored: nextAwayScored,
        isDecisiveWinner: nextDecided,
      });
    }
  };

  const handleAddSuddenDeathRound = () => {
    const nextRound = maxRound + 1;
    const updated: ScoreboardPenaltyKick[] = [
      ...fullPenalties,
      {
        id: `pen-home-${nextRound}`,
        round: nextRound,
        teamSide: 'home',
        teamId: homeTeam.id,
        takerName: `Taker ${nextRound}`,
        status: 'pending',
      },
      {
        id: `pen-away-${nextRound}`,
        round: nextRound,
        teamSide: 'away',
        teamId: awayTeam.id,
        takerName: `Taker ${nextRound}`,
        status: 'pending',
      },
    ];
    onUpdatePenalties(updated);

    // Auto-scroll track to newly added round
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          left: scrollContainerRef.current.scrollWidth,
          behavior: 'smooth',
        });
      }
    }, 60);
  };

  const handleResetShootout = () => {
    if (window.confirm('Reset penalty shootout back to 5 regular rounds?')) {
      const resetList: ScoreboardPenaltyKick[] = [];
      for (let r = 1; r <= 5; r++) {
        resetList.push(
          {
            id: `pen-home-${r}`,
            round: r,
            teamSide: 'home',
            teamId: homeTeam.id,
            takerName: `Taker ${r}`,
            status: 'pending',
          },
          {
            id: `pen-away-${r}`,
            round: r,
            teamSide: 'away',
            teamId: awayTeam.id,
            takerName: `Taker ${r}`,
            status: 'pending',
          }
        );
      }
      onUpdatePenalties(resetList);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
    }
  };

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  const roundsArray = Array.from({ length: maxRound }, (_, i) => i + 1);

  return (
    <div className="rounded-3xl bg-gradient-to-b from-[#0B1525] via-[#070F1B] to-[#050A12] light:from-white light:via-slate-50 light:to-slate-100 border-2 border-[#7ADBF0]/30 light:border-slate-300 shadow-2xl overflow-hidden transition-all">
      {/* Stadium LED Ribbon Top Accent */}
      <div className="h-1.5 w-full bg-gradient-to-r from-[#0891B2] via-[#7ADBF0] to-[#D6B56E] shadow-[0_0_15px_rgba(122,219,240,0.6)]" />

      {/* Broadcast Shootout Header Bar */}
      <div className="p-4 sm:p-5 landscape-mobile:p-3 border-b border-white/10 light:border-slate-200 flex flex-wrap items-center justify-between gap-4 landscape-mobile:gap-2.5">
        {/* Left: Title & Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#050A12] light:bg-slate-100 border border-[#7ADBF0]/40 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700 shadow-sm">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display uppercase tracking-wider text-lg sm:text-xl text-white light:text-slate-900">
                Penalty Shootout
              </h3>
              {shootoutVerdict.suddenDeath && !shootoutVerdict.decided && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 light:text-amber-700 border border-amber-500/40 flex items-center gap-1 animate-pulse">
                  <Flame className="w-3 h-3" />
                  <span>Sudden Death Active</span>
                </span>
              )}
              {shootoutVerdict.decided && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 light:text-emerald-700 border border-emerald-500/40 flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  <span>Shootout Decided</span>
                </span>
              )}
              {isBroadcastAudioBusy && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 light:text-emerald-700 border border-emerald-500/40 flex items-center gap-1 animate-pulse">
                  <AudioLines className="w-3 h-3" />
                  <span>Commentary Playing · Waiting</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 light:text-slate-500 mt-0.5">
              Click any kick to toggle: ⚽ Scored · ❌ Missed · ⚪ Pending. Scroll horizontally to view all sudden death rounds.
            </p>
          </div>
        </div>

        {/* Right: Big Shootout Score Ticker & Controls */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-black/60 light:bg-slate-200/90 border border-white/10 light:border-slate-300 flex items-center gap-3 shadow-inner">
            <div className="flex items-center gap-2">
              <img src={homeTeam.crestUrl} alt={homeTeam.code} className="w-6 h-6 object-contain drop-shadow" />
              <span className="font-mono text-xs font-bold text-slate-300 light:text-slate-700 hidden sm:inline">
                {homeTeam.code}
              </span>
              <span className="font-display text-2xl text-white light:text-slate-900">{homeScored}</span>
            </div>
            <span className="font-display text-xl text-slate-500">:</span>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl text-white light:text-slate-900">{awayScored}</span>
              <span className="font-mono text-xs font-bold text-slate-300 light:text-slate-700 hidden sm:inline">
                {awayTeam.code}
              </span>
              <img src={awayTeam.crestUrl} alt={awayTeam.code} className="w-6 h-6 object-contain drop-shadow" />
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetShootout}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 light:bg-slate-200 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10 light:border-slate-300"
            title="Reset Shootout to 5 rounds"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Outcome / Notification Banner */}
      {shootoutVerdict.reason && (
        <div
          className={`px-5 py-3 text-xs sm:text-sm font-semibold flex items-center justify-between border-b ${
            shootoutVerdict.decided
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 light:text-emerald-800'
              : 'bg-amber-500/15 border-amber-500/30 text-amber-300 light:text-amber-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {shootoutVerdict.decided ? (
              <Trophy className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <Target className="w-4 h-4 shrink-0 text-amber-400" />
            )}
            <span>{shootoutVerdict.reason}</span>
          </div>

          {shootoutVerdict.decided && shootoutVerdict.winner && onShootoutComplete && (
            <button
              type="button"
              onClick={() => onShootoutComplete(shootoutVerdict.winner!, homeScored, awayScored)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer transition-all shrink-0 ml-3"
            >
              <span>Apply Final Result</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Scroll Navigation Ribbon for Track */}
      {maxRound > 6 && (
        <div className="px-5 py-2 border-b border-white/5 light:border-slate-200 bg-black/20 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-[#7ADBF0] light:text-cyan-800 font-semibold">
              Showing {maxRound} Rounds ({maxRound > 5 ? `${maxRound - 5} Sudden Death` : 'Regular'})
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] mr-1 hidden sm:inline">Scroll Track:</span>
            <button
              type="button"
              onClick={scrollLeft}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Scroll Kicks Left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={scrollRight}
              className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Scroll Kicks Right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* MAIN SHOOTOUT MATRIX: FIXED LEFT (TEAM) + SCROLLABLE CENTER (KICKS) + FIXED RIGHT (SCORE) */}
      <div className="flex items-stretch overflow-hidden">
        {/* ======================================================== */}
        {/* 1. LEFT PINNED COLUMN: TEAM IDENTITY */}
        {/* ======================================================== */}
        <div className="w-40 landscape-mobile:w-44 sm:w-60 shrink-0 border-r border-white/10 light:border-slate-200 flex flex-col bg-[#070F1B] light:bg-white z-10 shadow-[4px_0_15px_rgba(0,0,0,0.3)]">
          {/* Header Row */}
          <div className="h-12 landscape-mobile:h-10 flex items-center px-4 landscape-mobile:px-3 font-mono text-[11px] uppercase text-slate-400 light:text-slate-600 border-b border-white/10 light:border-slate-200 font-semibold tracking-wider">
            Team
          </div>

          {/* Home Team Row */}
          <div className="h-22 landscape-mobile:h-16 flex items-center px-3 sm:px-4 gap-3 landscape-mobile:gap-2 border-b border-white/10 light:border-slate-200">
            <img
              src={homeTeam.crestUrl}
              alt={homeTeam.name}
              className="w-9 h-9 landscape-mobile:w-7 landscape-mobile:h-7 sm:w-10 sm:h-10 object-contain drop-shadow shrink-0"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/assets/aistudio/DodaEona_F.C._V2_Fill_Color_8c96db06.png';
              }}
            />
            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm text-white light:text-slate-900 truncate">
                {homeTeam.name}
              </div>
              <div className="text-[10px] font-mono text-[#7ADBF0] light:text-cyan-800 font-semibold mt-0.5">
                HOME · {homeTeam.code}
              </div>
            </div>
          </div>

          {/* Away Team Row */}
          <div className="h-22 landscape-mobile:h-16 flex items-center px-3 sm:px-4 gap-3 landscape-mobile:gap-2">
            <img
              src={awayTeam.crestUrl}
              alt={awayTeam.name}
              className="w-9 h-9 sm:w-10 sm:h-10 object-contain drop-shadow shrink-0"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/assets/aistudio/DodaEona_F.C._V2_Fill_Color_8c96db06.png';
              }}
            />
            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm text-white light:text-slate-900 truncate">
                {awayTeam.name}
              </div>
              <div className="text-[10px] font-mono text-[#D6B56E] light:text-amber-800 font-semibold mt-0.5">
                AWAY · {awayTeam.code}
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. CENTER HORIZONTALLY SCROLLABLE KICKS TRACK */}
        {/* ======================================================== */}
        <div
          ref={scrollContainerRef}
          className="flex-1 min-w-0 overflow-x-auto custom-scrollbar overscroll-x-contain select-none bg-[#050A12]/50 light:bg-slate-50/50"
        >
          <div className="min-w-max flex flex-col">
            {/* Header row: Round Badges */}
            <div className="h-12 landscape-mobile:h-10 flex items-center gap-2 px-3 border-b border-white/10 light:border-slate-200">
              {roundsArray.map((r) => {
                const isSuddenDeath = r > 5;
                return (
                  <React.Fragment key={`round-hdr-${r}`}>
                    {/* Visual Sudden Death Divider Separator before Round 6 */}
                    {r === 6 && (
                      <div className="px-2 shrink-0 flex items-center justify-center">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          ⚡ Sudden Death
                        </span>
                      </div>
                    )}

                    <div className="w-14 sm:w-16 shrink-0 flex items-center justify-center">
                      {isSuddenDeath ? (
                        <div className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 light:text-amber-800 border border-amber-500/30 whitespace-nowrap">
                          SD {r}
                        </div>
                      ) : (
                        <div className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-white/5 light:bg-slate-200 text-slate-300 light:text-slate-700 border border-white/10 light:border-slate-300">
                          R{r}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Home Kicks Row */}
            <div className="h-22 landscape-mobile:h-16 flex items-center gap-2 px-3 border-b border-white/10 light:border-slate-200">
              {roundsArray.map((r) => {
                const kick = fullPenalties.find((p) => p.round === r && p.teamSide === 'home');
                const status = kick?.status || 'pending';

                return (
                  <React.Fragment key={`home-kick-${r}`}>
                    {r === 6 && (
                      <div className="px-2 shrink-0 flex items-center justify-center">
                        <div className="w-0.5 h-12 bg-amber-500/30 rounded-full" />
                      </div>
                    )}

                    <div className="w-14 sm:w-16 shrink-0 flex items-center justify-center">
                      <button
                        type="button"
                        disabled={isBroadcastAudioBusy}
                        onClick={() => handleToggleKick(r, 'home')}
                        title={
                          isBroadcastAudioBusy
                            ? 'Waiting for penalty commentary audio to finish...'
                            : `Round ${r} Home Kick (Taker ${r}): Click to toggle`
                        }
                        className={`w-full h-17 landscape-mobile:h-13 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border disabled:opacity-60 disabled:cursor-wait ${
                          status === 'scored'
                            ? 'bg-gradient-to-b from-emerald-500/25 to-emerald-600/15 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.35)] scale-[1.02]'
                            : status === 'missed'
                            ? 'bg-gradient-to-b from-rose-500/25 to-rose-600/15 border-2 border-rose-500 text-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.35)] scale-[1.02]'
                            : 'bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 text-slate-500 hover:border-[#7ADBF0] hover:bg-[#7ADBF0]/10'
                        }`}
                      >
                        <div className="h-6 flex items-center justify-center">
                          {status === 'scored' && <span className="text-lg drop-shadow">⚽</span>}
                          {status === 'missed' && <XCircle className="w-5 h-5 text-rose-400" />}
                          {status === 'pending' && (
                            <span className="w-3 h-3 rounded-full bg-slate-500/50 block" />
                          )}
                        </div>
                        <span
                          className={`text-[9px] font-mono mt-1 uppercase font-bold tracking-tight truncate max-w-full px-1 ${
                            status === 'scored'
                              ? 'text-emerald-300 light:text-emerald-700'
                              : status === 'missed'
                              ? 'text-rose-300 light:text-rose-700'
                              : 'text-slate-400 light:text-slate-600'
                          }`}
                        >
                          Taker {r}
                        </span>
                      </button>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>

            {/* Away Kicks Row */}
            <div className="h-22 landscape-mobile:h-16 flex items-center gap-2 px-3">
              {roundsArray.map((r) => {
                const kick = fullPenalties.find((p) => p.round === r && p.teamSide === 'away');
                const status = kick?.status || 'pending';

                return (
                  <React.Fragment key={`away-kick-${r}`}>
                    {r === 6 && (
                      <div className="px-2 shrink-0 flex items-center justify-center">
                        <div className="w-0.5 h-12 bg-amber-500/30 rounded-full" />
                      </div>
                    )}

                    <div className="w-14 sm:w-16 shrink-0 flex items-center justify-center">
                      <button
                        type="button"
                        disabled={isBroadcastAudioBusy}
                        onClick={() => handleToggleKick(r, 'away')}
                        title={
                          isBroadcastAudioBusy
                            ? 'Waiting for penalty commentary audio to finish...'
                            : `Round ${r} Away Kick (Taker ${r}): Click to toggle`
                        }
                        className={`w-full h-17 landscape-mobile:h-13 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer border disabled:opacity-60 disabled:cursor-wait ${
                          status === 'scored'
                            ? 'bg-gradient-to-b from-emerald-500/25 to-emerald-600/15 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.35)] scale-[1.02]'
                            : status === 'missed'
                            ? 'bg-gradient-to-b from-rose-500/25 to-rose-600/15 border-2 border-rose-500 text-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.35)] scale-[1.02]'
                            : 'bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 text-slate-500 hover:border-[#7ADBF0] hover:bg-[#7ADBF0]/10'
                        }`}
                      >
                        <div className="h-6 flex items-center justify-center">
                          {status === 'scored' && <span className="text-lg drop-shadow">⚽</span>}
                          {status === 'missed' && <XCircle className="w-5 h-5 text-rose-400" />}
                          {status === 'pending' && (
                            <span className="w-3 h-3 rounded-full bg-slate-500/50 block" />
                          )}
                        </div>
                        <span
                          className={`text-[9px] font-mono mt-1 uppercase font-bold tracking-tight truncate max-w-full px-1 ${
                            status === 'scored'
                              ? 'text-emerald-300 light:text-emerald-700'
                              : status === 'missed'
                              ? 'text-rose-300 light:text-rose-700'
                              : 'text-slate-400 light:text-slate-600'
                          }`}
                        >
                          Taker {r}
                        </span>
                      </button>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. RIGHT PINNED COLUMN: FINAL SCORE (NEVER OVERLAPPED) */}
        {/* ======================================================== */}
        <div className="w-20 landscape-mobile:w-20 sm:w-28 shrink-0 border-l border-white/10 light:border-slate-200 flex flex-col bg-[#070F1B] light:bg-white z-10 shadow-[-4px_0_15px_rgba(0,0,0,0.3)] text-center">
          {/* Header */}
          <div className="h-12 landscape-mobile:h-10 flex items-center justify-center font-mono text-[11px] uppercase text-slate-400 light:text-slate-600 border-b border-white/10 light:border-slate-200 font-semibold tracking-wider">
            Score
          </div>

          {/* Home Score */}
          <div className="h-22 landscape-mobile:h-16 flex flex-col items-center justify-center border-b border-white/10 light:border-slate-200 px-2">
            <span className="font-display text-3xl landscape-mobile:text-2xl sm:text-4xl text-white light:text-slate-900 leading-none">
              {homeScored}
            </span>
            <span className="font-mono text-[10px] text-slate-400 mt-1">
              / {homeTaken} taken
            </span>
          </div>

          {/* Away Score */}
          <div className="h-22 landscape-mobile:h-16 flex flex-col items-center justify-center px-2">
            <span className="font-display text-3xl landscape-mobile:text-2xl sm:text-4xl text-white light:text-slate-900 leading-none">
              {awayScored}
            </span>
            <span className="font-mono text-[10px] text-slate-400 mt-1">
              / {awayTaken} taken
            </span>
          </div>
        </div>
      </div>

      {/* Arena Footer: Legend & Add Sudden Death Action */}
      <div className="p-4 sm:px-6 landscape-mobile:p-3 border-t border-white/10 light:border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs bg-[#050A12]/80 light:bg-slate-100/80">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-mono text-[11px] uppercase">Legend:</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span>⚽</span> Scored
          </span>
          <span className="flex items-center gap-1.5 text-rose-400 font-medium">
            <XCircle className="w-3.5 h-3.5" /> Missed
          </span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500/50 block" /> Pending
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Add Sudden Death Round button */}
          <button
            type="button"
            onClick={handleAddSuddenDeathRound}
            className="px-4 py-2 rounded-xl bg-[#7ADBF0] hover:bg-[#8ee1f3] text-[#050A12] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(122,219,240,0.3)] hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Sudden Death Round ({maxRound + 1})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
