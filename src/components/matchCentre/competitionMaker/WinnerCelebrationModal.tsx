import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  Crown,
  ExternalLink,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import type { CompetitionMakerTournament } from '../../../types/competitionMaker';
import type { Team } from '../../../types/matchCentre';
import { computeCompetitionPlayerLeaderboard } from '../../../utils/competitionEngine';
import { TeamEmblem } from '../TeamEmblem';
import { TrophyArtwork } from './TrophyArtwork';

interface WinnerCelebrationModalProps {
  isOpen: boolean;
  tournament: CompetitionMakerTournament | null;
  teamsMap: Map<string, Team>;
  onClose: () => void;
  onOpenTeamCabinet?: (teamId: string) => void;
  onOpenTournamentHub?: (tournamentId: string) => void;
}

interface ConfettiPiece {
  id: number;
  leftPct: number;
  delaySec: number;
  durationSec: number;
  sizePx: number;
  color: string;
  rotateDeg: number;
  driftPx: number;
}

export const WinnerCelebrationModal: React.FC<WinnerCelebrationModalProps> = ({
  isOpen,
  tournament,
  teamsMap,
  onClose,
  onOpenTeamCabinet,
}) => {
  const [animKey, setAnimKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setAnimKey((k) => k + 1);
    }
  }, [isOpen, tournament?.id, tournament?.champion?.teamId]);

  const championTeam = useMemo(() => {
    if (!tournament?.champion) return undefined;
    return teamsMap.get(tournament.champion.teamId);
  }, [tournament, teamsMap]);

  const runnerUpTeam = useMemo(() => {
    if (!tournament?.champion?.runnerUpTeamId) return undefined;
    return teamsMap.get(tournament.champion.runnerUpTeamId);
  }, [tournament, teamsMap]);

  const topScorer = useMemo(() => {
    if (!tournament) return undefined;
    const leaders = computeCompetitionPlayerLeaderboard(tournament, teamsMap);
    return [...leaders].sort((a, b) => b.goals - a.goals || b.assists - a.assists)[0];
  }, [tournament, teamsMap]);

  const confettiPieces = useMemo<ConfettiPiece[]>(() => {
    const primary = championTeam?.primaryColor || '#F59E0B';
    const secondary = championTeam?.secondaryColor || '#38BDF8';
    const palette = ['#FBBF24', '#F59E0B', '#34D399', '#7ADBF0', '#FFFFFF', primary, secondary];
    return Array.from({ length: 64 }, (_, idx) => ({
      id: idx,
      leftPct: (idx * 17.3) % 100,
      delaySec: ((idx * 0.19) % 2.4),
      durationSec: 2.8 + ((idx * 0.23) % 2.2),
      sizePx: 6 + (idx % 6),
      color: palette[idx % palette.length],
      rotateDeg: (idx * 47) % 360,
      driftPx: ((idx % 2 === 0 ? 1 : -1) * (15 + (idx % 35))),
    }));
  }, [championTeam, animKey]);

  if (!isOpen || !tournament || !tournament.champion) return null;

  const champ = tournament.champion;
  const primaryColor = championTeam?.primaryColor || tournament.trophy.primaryColor || '#F59E0B';
  const secondaryColor = championTeam?.secondaryColor || tournament.trophy.accentColor || '#38BDF8';

  const allMatches = tournament.stages.flatMap((s) => s.fixtures);
  const completedMatches = allMatches.filter((f) => f.status === 'completed');
  const totalGoals = completedMatches.reduce(
    (sum, f) => sum + (f.homeScore ?? 0) + (f.awayScore ?? 0),
    0
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md overflow-hidden"
      onClick={onClose}
    >
      {/* Keyframe animations for confetti cascade, spotlight sweep & trophy levitation */}
      <style>{`
        @keyframes dodaeonaConfettiFall {
          0% {
            transform: translate3d(0, -12vh, 0) rotate(0deg) scale(0.9);
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          85% {
            opacity: 0.95;
          }
          100% {
            transform: translate3d(var(--drift, 24px), 92vh, 0) rotate(720deg) scale(1);
            opacity: 0;
          }
        }
        @keyframes dodaeonaTrophyLift {
          0% {
            transform: translateY(36px) scale(0.72);
            opacity: 0;
          }
          60% {
            transform: translateY(-8px) scale(1.06);
            opacity: 1;
          }
          80% {
            transform: translateY(3px) scale(0.98);
          }
          100% {
            transform: translateY(0px) scale(1);
            opacity: 1;
          }
        }
        @keyframes dodaeonaTrophyFloat {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-7px) scale(1.03);
          }
        }
        @keyframes dodaeonaPulseRing {
          0% {
            transform: scale(0.75);
            opacity: 0.75;
          }
          100% {
            transform: scale(1.65);
            opacity: 0;
          }
        }
      `}</style>

      {/* Confetti Layer */}
      <div key={`confetti-${animKey}`} className="pointer-events-none absolute inset-0 overflow-hidden">
        {confettiPieces.map((piece) => (
          <span
            key={piece.id}
            style={
              {
                left: `${piece.leftPct}%`,
                top: '-20px',
                width: `${piece.sizePx}px`,
                height: `${Math.round(piece.sizePx * 1.6)}px`,
                backgroundColor: piece.color,
                animation: `dodaeonaConfettiFall ${piece.durationSec}s cubic-bezier(0.22, 0.61, 0.36, 1) ${piece.delaySec}s infinite`,
                '--drift': `${piece.driftPx}px`,
              } as React.CSSProperties
            }
            className="absolute rounded-xs shadow-sm"
          />
        ))}
      </div>

      {/* Main Coronation Stage Modal */}
      <div
        key={`stage-${animKey}`}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl rounded-3xl border border-amber-400/50 bg-gradient-to-b from-[#131008] via-[#070E1B] to-[#050A14] text-white shadow-[0_0_90px_rgba(251,191,36,0.28)] overflow-hidden"
      >
        {/* Top Golden & Club-Colored Ribbon Bar */}
        <div
          className="h-2 w-full"
          style={{
            background: `linear-gradient(90deg, ${primaryColor} 0%, #FBBF24 50%, ${secondaryColor} 100%)`,
          }}
        />

        {/* Ambient Stadium Spotlight Cones */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-45"
          style={{
            background: `radial-gradient(circle at 50% 18%, rgba(251,191,36,0.32), transparent 58%), radial-gradient(circle at 20% 80%, ${primaryColor}33, transparent 50%), radial-gradient(circle at 80% 80%, ${secondaryColor}33, transparent 50%)`,
          }}
        />

        {/* Top Bar Controls */}
        <div className="relative z-10 flex items-center justify-between px-6 pt-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span>Official Championship Coronation</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAnimKey((k) => k + 1)}
              className="px-3 py-1.5 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/10 text-xs font-semibold text-amber-200 cursor-pointer inline-flex items-center gap-1.5"
              title="Replay Winner Animation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Replay</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              aria-label="Close celebration"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center Trophy & Club Crest Podium */}
        <div className="relative z-10 px-6 py-6 sm:px-10 sm:py-8 text-center space-y-6">
          <div className="space-y-1">
            <div className="font-mono text-xs uppercase tracking-[0.26em] text-[#7ADBF0] font-semibold">
              {tournament.name} · {tournament.season}
            </div>
            <h2 className="font-display text-4xl sm:text-6xl uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-100 drop-shadow-[0_4px_24px_rgba(251,191,36,0.35)]">
              {champ.teamName}
            </h2>
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-amber-300 font-bold">
              CROWNED TOURNAMENT CHAMPIONS
            </p>
          </div>

          {/* Animated Trophy & Club Emblem Showcase */}
          <div
            className="relative mx-auto flex items-center justify-center py-3"
            style={{
              animation: 'dodaeonaTrophyLift 0.95s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            }}
          >
            {/* Expanding Golden Shockwave Rings */}
            <div
              className="pointer-events-none absolute w-44 h-44 rounded-full border-2 border-amber-400/40"
              style={{ animation: 'dodaeonaPulseRing 2.4s ease-out infinite' }}
            />
            <div
              className="pointer-events-none absolute w-44 h-44 rounded-full border border-emerald-400/30"
              style={{ animation: 'dodaeonaPulseRing 2.4s ease-out 0.8s infinite' }}
            />

            <div
              className="relative flex items-center justify-center gap-5 sm:gap-8 px-7 py-5 rounded-3xl border border-amber-400/45 bg-[#060C18]/90 shadow-[0_0_50px_rgba(251,191,36,0.22)]"
              style={{ animation: 'dodaeonaTrophyFloat 3.2s ease-in-out 1s infinite' }}
            >
              {/* Champion Club Emblem */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <Crown className="w-6 h-6 text-amber-400 mx-auto -mb-1 drop-shadow" />
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-amber-400/60 bg-[#0A1324] p-2.5 flex items-center justify-center shadow-lg">
                    <TeamEmblem
                      team={championTeam}
                      crestUrl={champ.crestUrl || championTeam?.crestUrl}
                      code={champ.teamCode || championTeam?.code}
                      className="w-16 h-16 sm:w-20 sm:h-20"
                    />
                  </div>
                </div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-amber-200 font-bold">
                  {champ.teamCode || championTeam?.code || 'CHAMP'}
                </span>
              </div>

              {/* Trophy Artwork */}
              <div className="flex flex-col items-center gap-2">
                <TrophyArtwork trophy={tournament.trophy} size="xl" />
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-amber-200">{tournament.trophy.name}</div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-amber-400/90">
                    &ldquo;{tournament.trophy.engraving}&rdquo;
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Decisive Final Result & Honours Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-2xl mx-auto">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 space-y-1">
              <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                Decisive Outcome
              </div>
              <div className="text-xs font-bold text-emerald-300 truncate">
                {champ.finalScore || 'Tournament Champions'}
              </div>
              <div className="text-[11px] text-slate-400">
                {champ.runnerUpName
                  ? `Runner-Up: ${champ.runnerUpName}`
                  : `${completedMatches.length} matches · ${totalGoals} goals`}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 space-y-1">
              <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                Golden Boot Leader
              </div>
              <div className="text-xs font-bold text-amber-300 truncate flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">
                  {topScorer ? topScorer.shortName || topScorer.playerName : 'Team Effort'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 tabular-nums">
                {topScorer
                  ? `${topScorer.goals} goals · ${topScorer.assists} assists (${topScorer.teamCode})`
                  : `${totalGoals} tournament goals`}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-400/35 bg-emerald-500/10 p-3.5 space-y-1">
              <div className="font-mono text-[9px] uppercase tracking-wider text-emerald-300">
                Club Cabinet Status
              </div>
              <div className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Silverware Enshrined</span>
              </div>
              <div className="text-[11px] text-emerald-200/80 truncate">
                Added to {champ.teamName} Cabinet
              </div>
            </div>
          </div>

          {champ.runnerUpName && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 bg-white/[0.03] text-xs text-slate-300">
              <span>Silver Medalist:</span>
              {runnerUpTeam && (
                <TeamEmblem
                  team={runnerUpTeam}
                  crestUrl={champ.runnerUpCrestUrl || runnerUpTeam.crestUrl}
                  code={champ.runnerUpCode || runnerUpTeam.code}
                  className="w-4 h-4"
                />
              )}
              <span className="font-semibold text-white">{champ.runnerUpName}</span>
              {champ.thirdPlaceName && (
                <>
                  <span className="text-slate-600">·</span>
                  <span>3rd Place:</span>
                  <span className="font-semibold text-amber-200">
                    {champ.thirdPlaceName}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {onOpenTeamCabinet && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenTeamCabinet(champ.teamId);
                }}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-2 shadow-[0_0_25px_rgba(251,191,36,0.35)]"
              >
                <Trophy className="w-4 h-4" />
                <span>Open {champ.teamName} Trophy Cabinet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#7ADBF0]/50 bg-[#7ADBF0]/15 hover:bg-[#7ADBF0]/25 text-[#7ADBF0] text-xs font-bold cursor-pointer"
            >
              Continue to Tournament Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface WinnerCoronationBannerProps {
  tournament: CompetitionMakerTournament;
  teamsMap: Map<string, Team>;
  onPlayFullAnimation: () => void;
  onOpenTeamCabinet?: (teamId: string) => void;
  onOpenTournamentHub?: (tournamentId: string) => void;
}

export const WinnerCoronationBanner: React.FC<WinnerCoronationBannerProps> = ({
  tournament,
  teamsMap,
  onPlayFullAnimation,
  onOpenTeamCabinet,
  onOpenTournamentHub,
}) => {
  if (!tournament.champion) return null;

  const champ = tournament.champion;
  const championTeam = teamsMap.get(champ.teamId);
  const primaryColor = championTeam?.primaryColor || tournament.trophy.primaryColor || '#F59E0B';
  const secondaryColor = championTeam?.secondaryColor || tournament.trophy.accentColor || '#38BDF8';

  const topScorer = useMemo(() => {
    const leaders = computeCompetitionPlayerLeaderboard(tournament, teamsMap);
    return [...leaders].sort((a, b) => b.goals - a.goals || b.assists - a.assists)[0];
  }, [tournament, teamsMap]);

  return (
    <div className="relative rounded-2xl border border-amber-400/50 bg-gradient-to-r from-[#171207] via-[#091324] to-[#0B1722] p-5 sm:p-6 overflow-hidden shadow-[0_0_45px_rgba(251,191,36,0.14)]">
      {/* Animated Floating Sparkles & Shimmer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 14% 50%, rgba(251,191,36,0.22), transparent 45%), radial-gradient(circle at 88% 50%, ${primaryColor}28, transparent 48%)`,
        }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Animated Trophy + Champion Crest + Details */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 min-w-0">
          <div className="relative flex items-center gap-3 self-start sm:self-center shrink-0">
            <div className="relative rounded-2xl border border-amber-400/45 bg-[#050A14] p-2.5 shadow-lg">
              <TrophyArtwork trophy={tournament.trophy} size="lg" />
            </div>
            <div className="relative -ml-4 mt-8 w-14 h-14 rounded-2xl border-2 border-amber-400 bg-[#070F1D] p-1.5 flex items-center justify-center shadow-xl">
              <TeamEmblem
                team={championTeam}
                crestUrl={champ.crestUrl || championTeam?.crestUrl}
                code={champ.teamCode || championTeam?.code}
                className="w-10 h-10"
              />
            </div>
          </div>

          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-bold uppercase tracking-wider">
                <Crown className="w-3 h-3" />
                Official Champion Decided
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#7ADBF0]">
                {tournament.name} · {tournament.season}
              </span>
            </div>

            <h3 className="font-display text-2xl sm:text-4xl uppercase tracking-wide text-white truncate">
              {champ.teamName} — {tournament.trophy.name} Winners
            </h3>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
              <span className="text-amber-300 font-semibold">
                {champ.finalScore || 'Crowned Champions'}
              </span>
              {champ.runnerUpName && (
                <span>Runner-Up: {champ.runnerUpName}</span>
              )}
              {topScorer && (
                <span className="inline-flex items-center gap-1 text-emerald-300">
                  <Award className="w-3.5 h-3.5" />
                  Golden Boot: {topScorer.shortName || topScorer.playerName} ({topScorer.goals}G)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Replay Winner Animation & Open Club Cabinet */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onPlayFullAnimation}
            className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-2 shadow-[0_0_24px_rgba(251,191,36,0.3)] transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Winner Animation</span>
          </button>

          {onOpenTeamCabinet && (
            <button
              type="button"
              onClick={() => onOpenTeamCabinet(champ.teamId)}
              className="px-3.5 py-2.5 rounded-xl border border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-200 cursor-pointer inline-flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Club Cabinet</span>
            </button>
          )}

          {onOpenTournamentHub && (
            <button
              type="button"
              onClick={() => onOpenTournamentHub(tournament.id)}
              className="px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-white cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Open Hub</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#7ADBF0]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
