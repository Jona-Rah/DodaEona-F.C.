import React, { useEffect, useState } from 'react';
import { AudioLines, FastForward, Play, Trophy } from 'lucide-react';
import { Team } from '../../../types/matchCentre';
import { normalizeHex } from '../dossier/dossierUtils';
import type { SimPenaltyKickRecord, SimPenaltyShootoutState } from '../../../types/simulation';
import { TeamEmblem } from '../TeamEmblem';

interface PenaltyShootoutPanelProps {
  shootout: SimPenaltyShootoutState;
  homeTeam: Team;
  awayTeam: Team;
  revealedCount: number;
  isBroadcastAudioBusy?: boolean;
  broadcastAudioEnabled?: boolean;
  onRevealNext: () => void;
  onRevealAll: () => void;
}

const SVG_W = 380;
const SVG_H = 205;
const GOAL_X = 60;
const GOAL_Y = 48;
const GOAL_W = 260;
const GOAL_H = 122;
const GOAL_CENTER_X = GOAL_X + GOAL_W / 2;
const GK_START_Y = GOAL_Y + GOAL_H - 4;
const SPOT_Y = SVG_H - 10;

const toSvgX = (pctX: number) => GOAL_X + (pctX / 100) * GOAL_W;
const toSvgY = (pctY: number) => GOAL_Y + (pctY / 100) * GOAL_H;

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

interface ResolvedKickGeometry {
  shotPctX: number;
  shotPctY: number;
  keeperPctX: number;
  keeperPctY: number;
  effectiveKeeperDive: 'left' | 'center' | 'right';
  missDetail?: SimPenaltyKickRecord['missDetail'];
  outcomeTag: string;
  shotLabel: string;
  diveLabel: string;
  sameDirection: boolean;
}

function getZoneDirection(pctX: number): 'left' | 'center' | 'right' {
  if (pctX < 36) return 'left';
  if (pctX > 64) return 'right';
  return 'center';
}

function describeShotPlacement(
  outcome: SimPenaltyKickRecord['outcome'],
  shotPctX: number,
  shotPctY: number,
  missDetail?: SimPenaltyKickRecord['missDetail']
): string {
  if (outcome === 'post') {
    if (missDetail === 'crossbar') return 'Hit Crossbar';
    if (missDetail === 'left-post') return 'Hit Left Post';
    if (missDetail === 'right-post') return 'Hit Right Post';
    return 'Hit Woodwork';
  }
  if (outcome === 'missed') {
    if (missDetail === 'over') return 'Over the Bar';
    if (missDetail === 'wide-left') return 'Wide Left';
    if (missDetail === 'wide-right') return 'Wide Right';
    return 'Off Target';
  }
  const vertical = shotPctY < 34 ? 'Top' : shotPctY > 68 ? 'Bottom' : 'Mid';
  const side = shotPctX < 36 ? 'Left' : shotPctX > 64 ? 'Right' : 'Center';
  if (side === 'Center') {
    return shotPctY < 28 ? 'High Center' : shotPctY > 68 ? 'Low Center' : 'Center';
  }
  return `${vertical} ${side}`;
}

function resolveKickGeometry(kick: SimPenaltyKickRecord): ResolvedKickGeometry {
  let shotPctX = kick.targetX;
  let shotPctY = kick.targetY;
  let missDetail = kick.missDetail;

  if (kick.outcome === 'post') {
    const onBar = shotPctY <= 1 && shotPctY >= -1;
    const onLeft = shotPctX <= 1 && shotPctX >= -1;
    const onRight = shotPctX >= 99 && shotPctX <= 101;
    if (!missDetail) {
      if (onBar) missDetail = 'crossbar';
      else if (onLeft) missDetail = 'left-post';
      else if (onRight) missDetail = 'right-post';
    }
    if (!onBar && !onLeft && !onRight) {
      // Legacy fallback: snap interior post marker directly onto the nearest woodwork frame
      if (shotPctY < 28) {
        shotPctY = 0;
        shotPctX = clamp(shotPctX, 8, 92);
        missDetail = 'crossbar';
      } else if (shotPctX < 50) {
        shotPctX = 0;
        shotPctY = clamp(shotPctY, 6, 86);
        missDetail = 'left-post';
      } else {
        shotPctX = 100;
        shotPctY = clamp(shotPctY, 6, 86);
        missDetail = 'right-post';
      }
    }
  } else if (kick.outcome === 'missed') {
    const isOutside = shotPctY < 0 || shotPctX < 0 || shotPctX > 100;
    if (!missDetail) {
      if (shotPctY < 0) missDetail = 'over';
      else if (shotPctX < 0) missDetail = 'wide-left';
      else if (shotPctX > 100) missDetail = 'wide-right';
    }
    if (!isOutside) {
      // Legacy fallback: project inside-goal miss markers clearly outside the frame
      if (shotPctY < 30) {
        shotPctY = -14;
        shotPctX = clamp(shotPctX, 12, 88);
        missDetail = 'over';
      } else if (shotPctX < 50) {
        shotPctX = -11;
        shotPctY = clamp(shotPctY, 12, 84);
        missDetail = 'wide-left';
      } else {
        shotPctX = 111;
        shotPctY = clamp(shotPctY, 12, 84);
        missDetail = 'wide-right';
      }
    }
  }

  const shotDirection = getZoneDirection(shotPctX);
  let effectiveKeeperDive = kick.keeperDive;
  let keeperPctX =
    typeof kick.keeperTargetX === 'number'
      ? kick.keeperTargetX
      : kick.keeperDive === 'left'
      ? 23
      : kick.keeperDive === 'right'
      ? 77
      : 50;
  let keeperPctY =
    typeof kick.keeperTargetY === 'number'
      ? kick.keeperTargetY
      : kick.keeperDive === 'center'
      ? 62
      : 64;

  if (kick.outcome === 'saved') {
    // Saved shots always have keeper diving/staying in the shot direction and meeting the ball
    effectiveKeeperDive = shotDirection;
    keeperPctX = shotPctX;
    keeperPctY = shotPctY;
  } else if (kick.outcome === 'scored' && effectiveKeeperDive === shotDirection) {
    // Ensure clear visible gap if a legacy goal had keeper diving near the ball
    const dx = shotPctX - keeperPctX;
    const dy = shotPctY - keeperPctY;
    if (Math.hypot(dx, dy) < 16) {
      if (shotDirection === 'center') {
        keeperPctY = shotPctY < 50 ? 74 : 26;
      } else {
        keeperPctY = shotPctY < 45 ? 72 : 30;
        keeperPctX = shotDirection === 'left' ? 25 : 75;
      }
    }
  }

  const sameDirection = effectiveKeeperDive === shotDirection;
  const diveDirText =
    effectiveKeeperDive === 'left'
      ? 'Dived Left'
      : effectiveKeeperDive === 'right'
      ? 'Dived Right'
      : 'Stayed Center';

  let outcomeTag = 'GOAL';
  let diveLabel = diveDirText;

  if (kick.outcome === 'saved') {
    outcomeTag = 'SAVED';
    diveLabel =
      effectiveKeeperDive === 'center'
        ? 'Stayed Center · Stopped!'
        : `${diveDirText} · Right Way & Saved!`;
  } else if (kick.outcome === 'scored') {
    outcomeTag = 'GOAL';
    diveLabel = sameDirection
      ? `${diveDirText} · Couldn't Reach`
      : `${diveDirText} · Wrong Way`;
  } else if (kick.outcome === 'post') {
    outcomeTag =
      missDetail === 'crossbar'
        ? 'CROSSBAR'
        : missDetail === 'left-post' || missDetail === 'right-post'
        ? 'POST'
        : 'BAR / POST';
    diveLabel = diveDirText;
  } else {
    outcomeTag = 'OUT';
    diveLabel = diveDirText;
  }

  return {
    shotPctX,
    shotPctY,
    keeperPctX,
    keeperPctY,
    effectiveKeeperDive,
    missDetail,
    outcomeTag,
    shotLabel: describeShotPlacement(kick.outcome, shotPctX, shotPctY, missDetail),
    diveLabel,
    sameDirection,
  };
}

export const PenaltyShootoutPanel: React.FC<PenaltyShootoutPanelProps> = ({
  shootout,
  homeTeam,
  awayTeam,
  revealedCount,
  isBroadcastAudioBusy = false,
  broadcastAudioEnabled = false,
  onRevealNext,
  onRevealAll,
}) => {
  const [autoRunning, setAutoRunning] = useState(false);
  const [selectedKickIdx, setSelectedKickIdx] = useState<number | null>(null);

  const homeColor = normalizeHex(homeTeam.primaryColor || '#EF4444');
  const awayColor = normalizeHex(awayTeam.primaryColor || '#38BDF8');

  const revealedKicks = shootout.kicks.slice(0, revealedCount);
  const isFinished = revealedCount >= shootout.kicks.length;

  useEffect(() => {
    if (!autoRunning || isFinished) {
      if (isFinished && autoRunning) setAutoRunning(false);
      return;
    }
    if (isBroadcastAudioBusy) {
      return;
    }
    const delayMs = broadcastAudioEnabled ? 450 : 950;
    const timer = setTimeout(() => {
      onRevealNext();
    }, delayMs);
    return () => clearTimeout(timer);
  }, [autoRunning, isFinished, isBroadcastAudioBusy, broadcastAudioEnabled, revealedCount, onRevealNext]);

  const activeKick =
    selectedKickIdx !== null && revealedKicks[selectedKickIdx]
      ? revealedKicks[selectedKickIdx]
      : revealedKicks[revealedKicks.length - 1] || null;

  const activeGeom = activeKick ? resolveKickGeometry(activeKick) : null;

  const currentHomeScore = revealedKicks.filter(
    (k) => k.teamSide === 'home' && k.outcome === 'scored'
  ).length;
  const currentAwayScore = revealedKicks.filter(
    (k) => k.teamSide === 'away' && k.outcome === 'scored'
  ).length;

  const homeKicks = revealedKicks.filter((k) => k.teamSide === 'home');
  const awayKicks = revealedKicks.filter((k) => k.teamSide === 'away');
  const maxSlots = Math.max(5, homeKicks.length, awayKicks.length);

  const renderActiveDiagramOverlays = () => {
    if (!activeKick || !activeGeom) return null;

    const shotX = clamp(toSvgX(activeGeom.shotPctX), 18, SVG_W - 18);
    const shotY = clamp(toSvgY(activeGeom.shotPctY), 16, GOAL_Y + GOAL_H - 4);
    const gkX = toSvgX(activeGeom.keeperPctX);
    const gkY = toSvgY(activeGeom.keeperPctY);

    const shotStrokeColor =
      activeKick.outcome === 'scored'
        ? '#34D399'
        : activeKick.outcome === 'saved'
        ? '#22D3EE'
        : activeKick.outcome === 'post'
        ? '#FBBF24'
        : '#FB7185';

    // Curved dive path control point (arcs slightly upward as keeper springs across goal)
    const midGkX = (GOAL_CENTER_X + gkX) / 2;
    const midGkY = Math.min(GK_START_Y, gkY) - (activeGeom.effectiveKeeperDive === 'center' ? 4 : 14);
    const diveDist = Math.hypot(gkX - GOAL_CENTER_X, gkY - GK_START_Y);
    const isSaved = activeKick.outcome === 'saved';

    // Keeper body lean vector from base toward gloves
    const bodyBaseX = GOAL_CENTER_X + (gkX - GOAL_CENTER_X) * 0.42;
    const bodyBaseY = GK_START_Y - 2;

    return (
      <g>
        {/* Subtle shot flight trajectory from penalty spot direction */}
        <line
          x1={GOAL_CENTER_X}
          y1={SPOT_Y - 4}
          x2={shotX}
          y2={shotY}
          stroke={shotStrokeColor}
          strokeWidth="1.5"
          strokeDasharray="4 4"
          strokeOpacity="0.45"
        />

        {/* Keeper dive arc from goal-line center to dive target */}
        {diveDist > 4 && (
          <path
            d={`M ${GOAL_CENTER_X} ${GK_START_Y} Q ${midGkX} ${midGkY} ${gkX} ${gkY}`}
            fill="none"
            stroke="#38BDF8"
            strokeWidth="2.2"
            strokeDasharray="4 3"
            markerEnd="url(#gkDiveArrow)"
            opacity="0.9"
          />
        )}

        {/* Stylized diving keeper silhouette (arm/torso reach + gloves at target) */}
        <g opacity="0.96">
          {/* Origin stance marker on goal line */}
          <circle
            cx={GOAL_CENTER_X}
            cy={GK_START_Y}
            r="3.2"
            fill="#0EA5E9"
            stroke="#E0F2FE"
            strokeWidth="1"
          />
          {/* Torso/reach vector */}
          <line
            x1={bodyBaseX}
            y1={bodyBaseY}
            x2={gkX}
            y2={gkY}
            stroke="rgba(56,189,248,0.55)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          {/* Keeper head hint at mid-torso */}
          <circle
            cx={bodyBaseX}
            cy={bodyBaseY - 4}
            r="4"
            fill="#0284C7"
            stroke="#BAE6FD"
            strokeWidth="1.1"
          />
          {/* Keeper gloves / reach halo at endpoint */}
          <circle
            cx={gkX}
            cy={gkY}
            r={isSaved ? 15 : 11}
            fill={isSaved ? 'rgba(34,211,238,0.22)' : 'rgba(56,189,248,0.16)'}
            stroke={isSaved ? '#22D3EE' : '#38BDF8'}
            strokeWidth={isSaved ? 2 : 1.5}
            strokeDasharray={isSaved ? undefined : '3 2'}
          />
          {/* Stylized left/right keeper gloves */}
          <rect
            x={gkX - 7.5}
            y={gkY - 4.5}
            width="6"
            height="9"
            rx="2.5"
            fill="#0EA5E9"
            stroke="#F0F9FF"
            strokeWidth="1.1"
          />
          <rect
            x={gkX + 1.5}
            y={gkY - 4.5}
            width="6"
            height="9"
            rx="2.5"
            fill="#0EA5E9"
            stroke="#F0F9FF"
            strokeWidth="1.1"
          />
        </g>

        {/* Keeper dive badge anchored cleanly away from edges */}
        {!isSaved && (
          <g
            transform={`translate(${clamp(gkX, 52, SVG_W - 52)}, ${
              gkY > GOAL_Y + GOAL_H - 22 ? gkY - 17 : gkY + 21
            })`}
          >
            <rect
              x="-40"
              y="-8"
              width="80"
              height="15"
              rx="4"
              fill="rgba(7,14,26,0.9)"
              stroke="rgba(56,189,248,0.55)"
              strokeWidth="1"
            />
            <text
              x="0"
              y="2.5"
              textAnchor="middle"
              fill="#7DD3FC"
              fontSize="7.5"
              fontFamily="monospace"
              fontWeight="700"
            >
              GK: {activeGeom.effectiveKeeperDive.toUpperCase()}
            </text>
          </g>
        )}

        {/* Outcome-specific impact highlight around active shot */}
        {activeKick.outcome === 'post' && (
          <g transform={`translate(${shotX}, ${shotY})`}>
            <circle r="15" fill="none" stroke="#FBBF24" strokeWidth="2" strokeDasharray="3 2" />
            <text
              x="0"
              y={shotY <= GOAL_Y + 6 ? -15 : 22}
              textAnchor="middle"
              fill="#FDE68A"
              fontSize="8"
              fontFamily="monospace"
              fontWeight="700"
            >
              {activeGeom.outcomeTag}
            </text>
          </g>
        )}

        {activeKick.outcome === 'missed' && (
          <g transform={`translate(${shotX}, ${shotY})`}>
            <circle r="15" fill="rgba(244,63,94,0.18)" stroke="#FB7185" strokeWidth="1.6" strokeDasharray="3 2" />
            <text
              x="0"
              y={shotY < GOAL_Y ? -14 : 21}
              textAnchor="middle"
              fill="#FDA4AF"
              fontSize="8"
              fontFamily="monospace"
              fontWeight="700"
            >
              OUT
            </text>
          </g>
        )}

        {isSaved && (
          <g transform={`translate(${shotX}, ${shotY})`}>
            <circle r="18" fill="none" stroke="#22D3EE" strokeWidth="1.8" opacity="0.85" />
            <text
              x="0"
              y={shotY < GOAL_Y + 26 ? 24 : -19}
              textAnchor="middle"
              fill="#67E8F9"
              fontSize="7.8"
              fontFamily="monospace"
              fontWeight="700"
            >
              SAVED · RIGHT WAY
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-cyan-400/30 light:border-slate-300 p-4 sm:p-6 landscape-mobile:p-3.5 space-y-5 landscape-mobile:space-y-3 shadow-2xl">
      {/* Shootout Intro & Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 light:border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-300 light:text-cyan-700">
              {revealedCount === 0
                ? 'PENALTY SHOOTOUT · READY AT THE SPOT'
                : shootout.suddenDeath && revealedCount > 10
                ? 'SUDDEN DEATH PENALTY SHOOTOUT'
                : 'PENALTY SHOOTOUT'}
            </span>
            {isBroadcastAudioBusy && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/45 font-mono text-[9px] font-black uppercase text-emerald-300 light:text-emerald-800 animate-pulse">
                <AudioLines className="w-3 h-3" />
                <span>Commentary Playing · Waiting</span>
              </span>
            )}
          </div>
          <h3 className="font-display font-black text-xl sm:text-2xl text-white light:text-slate-900 uppercase tracking-tight">
            {homeTeam.shortName} {currentHomeScore} - {currentAwayScore} {awayTeam.shortName}
          </h3>
        </div>

        {!isFinished && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isBroadcastAudioBusy}
              onClick={onRevealNext}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-wait"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isBroadcastAudioBusy ? 'Announcing...' : 'Take Next Kick'}</span>
            </button>

            <button
              type="button"
              onClick={() => setAutoRunning((p) => !p)}
              className={`px-3.5 py-2 rounded-xl border font-mono text-xs font-bold uppercase cursor-pointer ${
                autoRunning
                  ? 'bg-amber-500/20 light:bg-amber-100 border-amber-400 light:border-amber-600 text-amber-200 light:text-amber-900'
                  : 'bg-white/[0.05] light:bg-slate-100 border-white/15 light:border-slate-300 text-slate-200 light:text-slate-800 hover:bg-white/10 light:hover:bg-slate-200'
              }`}
            >
              {autoRunning ? 'Pause Auto' : 'Auto Shootout'}
            </button>

            <button
              type="button"
              onClick={() => {
                setAutoRunning(false);
                onRevealAll();
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.05] light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 border border-white/15 light:border-slate-300 font-mono text-xs font-bold text-white light:text-slate-900 cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5 text-cyan-400 light:text-cyan-600" />
              <span>Instant Shootout</span>
            </button>
          </div>
        )}
      </div>

      {/* Kick-by-Kick Scoreboard Dots */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-4 landscape-mobile:gap-3">
        {[
          { team: homeTeam, kicks: homeKicks, score: currentHomeScore, color: homeColor },
          { team: awayTeam, kicks: awayKicks, score: currentAwayScore, color: awayColor },
        ].map((row) => (
          <div
            key={row.team.id}
            className="p-3.5 rounded-xl bg-slate-950/75 light:bg-slate-50 border border-white/10 light:border-slate-200 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 shrink-0">
                <TeamEmblem team={row.team} />
              </div>
              <span className="font-bold text-sm text-white light:text-slate-900 truncate">{row.team.code}</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {Array.from({ length: maxSlots }, (_, idx) => {
                const k = row.kicks[idx];
                const globalIdx = k
                  ? revealedKicks.findIndex((x) => x.kickNumber === k.kickNumber)
                  : -1;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!k}
                    onClick={() => globalIdx >= 0 && setSelectedKickIdx(globalIdx)}
                    title={k ? `${k.takerName}: ${k.outcome}` : 'Pending kick'}
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[10px] font-black border transition-transform ${
                      !k
                        ? 'border-white/15 light:border-slate-300 bg-white/[0.03] light:bg-slate-200 text-slate-600 light:text-slate-400'
                        : k.outcome === 'scored'
                        ? 'border-emerald-300 bg-emerald-500 text-slate-950 hover:scale-110 cursor-pointer'
                        : k.outcome === 'saved'
                        ? 'border-cyan-300 bg-cyan-500 text-slate-950 hover:scale-110 cursor-pointer'
                        : k.outcome === 'post'
                        ? 'border-amber-300 bg-amber-500 text-slate-950 hover:scale-110 cursor-pointer'
                        : 'border-rose-300 bg-rose-500 text-white hover:scale-110 cursor-pointer'
                    }`}
                  >
                    {!k ? idx + 1 : k.outcome === 'scored' ? '✓' : k.outcome === 'saved' ? 'S' : k.outcome === 'post' ? 'P' : '✕'}
                  </button>
                );
              })}
              <span className="ml-2 font-mono font-black text-lg text-white light:text-slate-900 tabular-nums">
                {row.score}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Goal-Mouth Kick Visualization + Complete Penalty Log */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-[1.2fr_1fr] lg:grid-cols-[1.2fr_1fr] gap-5 landscape-mobile:gap-3.5">
        {/* SVG Goal Mouth */}
        <div className="rounded-xl bg-[#04120B] border border-white/10 p-4 landscape-mobile:p-3 space-y-3 landscape-mobile:space-y-2">
          <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-widest text-slate-300 flex-wrap">
            <span>Goal-Mouth &amp; Keeper Dive Diagram</span>
            <span className="text-cyan-300">
              {activeKick && activeGeom
                ? `Kick #${activeKick.kickNumber} · ${activeKick.takerName} (${activeGeom.outcomeTag})`
                : 'Awaiting first kick'}
            </span>
          </div>

          <div className="relative w-full aspect-[380/205] rounded-lg bg-[#07150E] border border-white/10 overflow-hidden">
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full h-full">
              <defs>
                <pattern id="goalNet" width="12" height="12" patternUnits="userSpaceOnUse">
                  <path
                    d="M 12 0 L 0 0 0 12"
                    fill="none"
                    stroke="rgba(255,255,255,0.09)"
                    strokeWidth="0.7"
                  />
                </pattern>
                <marker
                  id="gkDiveArrow"
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="5.5"
                  markerHeight="5.5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#38BDF8" />
                </marker>
              </defs>

              {/* Outer out-of-bounds atmosphere vs pitch apron */}
              <rect x="0" y="0" width={SVG_W} height={GOAL_Y + GOAL_H} fill="rgba(2, 10, 8, 0.55)" />
              <rect x="0" y={GOAL_Y + GOAL_H} width={SVG_W} height={SVG_H - (GOAL_Y + GOAL_H)} fill="#0B2316" />

              {/* Subtle "OUT OF FRAME" guide labels */}
              <text
                x={GOAL_CENTER_X}
                y="14"
                textAnchor="middle"
                fill="rgba(255,255,255,0.22)"
                fontSize="7"
                fontFamily="monospace"
                letterSpacing="2"
              >
                OVER CROSSBAR
              </text>
              <text
                x="28"
                y={GOAL_Y + GOAL_H / 2}
                textAnchor="middle"
                fill="rgba(255,255,255,0.2)"
                fontSize="6.5"
                fontFamily="monospace"
                transform={`rotate(-90 28 ${GOAL_Y + GOAL_H / 2})`}
              >
                WIDE LEFT
              </text>
              <text
                x={SVG_W - 28}
                y={GOAL_Y + GOAL_H / 2}
                textAnchor="middle"
                fill="rgba(255,255,255,0.2)"
                fontSize="6.5"
                fontFamily="monospace"
                transform={`rotate(90 ${SVG_W - 28} ${GOAL_Y + GOAL_H / 2})`}
              >
                WIDE RIGHT
              </text>

              {/* Subtle dive-zone divider ticks inside goal net */}
              <rect x={GOAL_X} y={GOAL_Y} width={GOAL_W} height={GOAL_H} fill="#091D12" />
              <rect x={GOAL_X} y={GOAL_Y} width={GOAL_W} height={GOAL_H} fill="url(#goalNet)" />
              <line
                x1={GOAL_X + GOAL_W * 0.36}
                y1={GOAL_Y}
                x2={GOAL_X + GOAL_W * 0.36}
                y2={GOAL_Y + GOAL_H}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 4"
              />
              <line
                x1={GOAL_X + GOAL_W * 0.64}
                y1={GOAL_Y}
                x2={GOAL_X + GOAL_W * 0.64}
                y2={GOAL_Y + GOAL_H}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="3 4"
              />

              {/* Goalposts and Crossbar */}
              <path
                d={`M ${GOAL_X} ${GOAL_Y + GOAL_H} L ${GOAL_X} ${GOAL_Y} L ${GOAL_X + GOAL_W} ${GOAL_Y} L ${GOAL_X + GOAL_W} ${GOAL_Y + GOAL_H}`}
                fill="none"
                stroke="#F1F5F9"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Goal line & penalty-spot origin mark */}
              <line
                x1="16"
                y1={GOAL_Y + GOAL_H}
                x2={SVG_W - 16}
                y2={GOAL_Y + GOAL_H}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="2"
              />
              <circle cx={GOAL_CENTER_X} cy={SPOT_Y} r="2.8" fill="rgba(255,255,255,0.55)" />
              <text
                x={GOAL_CENTER_X}
                y={SPOT_Y + 8}
                textAnchor="middle"
                fill="rgba(255,255,255,0.4)"
                fontSize="6.2"
                fontFamily="monospace"
              >
                SHOT ORIGIN
              </text>

              {/* Active Kick: Shot Flight + Keeper Dive + Gloves + Outcome Visuals */}
              {renderActiveDiagramOverlays()}

              {/* Placed Kick Markers (non-selected first, selected on top) */}
              {revealedKicks.map((k, idx) => {
                const geom = resolveKickGeometry(k);
                const cx = clamp(toSvgX(geom.shotPctX), 18, SVG_W - 18);
                const cy = clamp(toSvgY(geom.shotPctY), 16, GOAL_Y + GOAL_H - 4);
                const isSelected = activeKick?.kickNumber === k.kickNumber;
                if (isSelected) return null;

                const fill =
                  k.outcome === 'scored'
                    ? k.teamSide === 'home'
                      ? homeColor
                      : awayColor
                    : k.outcome === 'saved'
                    ? '#0891B2'
                    : k.outcome === 'post'
                    ? '#D97706'
                    : '#E11D48';

                const stroke =
                  k.outcome === 'saved'
                    ? '#67E8F9'
                    : k.outcome === 'post'
                    ? '#FDE68A'
                    : k.outcome === 'missed'
                    ? '#FDA4AF'
                    : '#FFFFFF';

                return (
                  <g
                    key={k.kickNumber}
                    className="cursor-pointer"
                    opacity="0.72"
                    onClick={() => setSelectedKickIdx(idx)}
                  >
                    <circle cx={cx} cy={cy} r={6.8} fill={fill} stroke={stroke} strokeWidth={1.3} />
                    <text
                      x={cx}
                      y={cy + 2.7}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="7.2"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {k.kickNumber}
                    </text>
                  </g>
                );
              })}

              {activeKick && activeGeom && (() => {
                const activeIdx = revealedKicks.findIndex((k) => k.kickNumber === activeKick.kickNumber);
                const cx = clamp(toSvgX(activeGeom.shotPctX), 18, SVG_W - 18);
                const cy = clamp(toSvgY(activeGeom.shotPctY), 16, GOAL_Y + GOAL_H - 4);
                const fill =
                  activeKick.outcome === 'scored'
                    ? activeKick.teamSide === 'home'
                      ? homeColor
                      : awayColor
                    : activeKick.outcome === 'saved'
                    ? '#06B6D4'
                    : activeKick.outcome === 'post'
                    ? '#F59E0B'
                    : '#F43F5E';

                return (
                  <g
                    className="cursor-pointer"
                    onClick={() => activeIdx >= 0 && setSelectedKickIdx(activeIdx)}
                  >
                    <circle cx={cx} cy={cy} r={10.5} fill={fill} stroke="#FFFFFF" strokeWidth={2.2} />
                    <text
                      x={cx}
                      y={cy + 3.2}
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="8.8"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {activeKick.kickNumber}
                    </text>
                  </g>
                );
              })()}
            </svg>
          </div>

          {/* Shot vs Goalkeeper Dive Telemetry Strip */}
          {activeKick && activeGeom && (
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-slate-950/80 border border-white/10 px-2.5 py-2">
                <div className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                  Shot Placement ({activeKick.takerName})
                </div>
                <div className="font-semibold text-white mt-0.5">{activeGeom.shotLabel}</div>
              </div>
              <div className="rounded-lg bg-slate-950/80 border border-cyan-400/20 px-2.5 py-2">
                <div className="font-mono text-[9px] uppercase tracking-wider text-cyan-300">
                  Goalkeeper ({activeKick.keeperName})
                </div>
                <div className="font-semibold text-cyan-100 mt-0.5">{activeGeom.diveLabel}</div>
              </div>
            </div>
          )}

          {/* Diagram Color Legend */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] text-slate-400 pt-0.5">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Goal
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 border border-cyan-200 inline-block" /> Saved
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-200 inline-block" /> Bar / Post
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-200 inline-block" /> Out (Off Target)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3 h-0.5 bg-sky-400 inline-block" /> GK Dive
            </span>
          </div>

          {activeKick && (
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-white/10 text-xs text-slate-200">
              {activeKick.commentary}
            </div>
          )}
        </div>

        {/* Complete Penalty Log */}
        <div className="rounded-xl bg-slate-950/70 light:bg-slate-50 border border-white/10 light:border-slate-200 p-4 landscape-mobile:p-3 flex flex-col gap-2 max-h-80 landscape-mobile:max-h-56 overflow-y-auto">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-600">
            Complete Penalty Log ({revealedKicks.length}/{shootout.kicks.length})
          </div>
          {revealedKicks.length === 0 ? (
            <p className="text-xs text-slate-400 light:text-slate-600 py-4">
              Click &ldquo;Take Next Kick&rdquo;, &ldquo;Auto Shootout&rdquo;, or &ldquo;Instant Shootout&rdquo; to begin the spot-kicks.
            </p>
          ) : (
            revealedKicks.map((k, idx) => {
              const geom = resolveKickGeometry(k);
              const badgeClass =
                k.outcome === 'scored'
                  ? 'text-emerald-400 light:text-emerald-700'
                  : k.outcome === 'saved'
                  ? 'text-cyan-400 light:text-cyan-700'
                  : k.outcome === 'post'
                  ? 'text-amber-400 light:text-amber-700'
                  : 'text-rose-400 light:text-rose-700';

              return (
                <button
                  key={k.kickNumber}
                  type="button"
                  onClick={() => setSelectedKickIdx(idx)}
                  className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer flex items-center justify-between gap-2 ${
                    activeKick?.kickNumber === k.kickNumber
                      ? 'bg-slate-900 light:bg-cyan-50 border-cyan-400/60 light:border-cyan-500'
                      : 'bg-slate-950/60 light:bg-white border-white/[0.06] light:border-slate-200 hover:border-white/20 light:hover:border-slate-300'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] text-slate-400 light:text-slate-500 mr-2">
                      R{k.round} · {k.teamSide === 'home' ? homeTeam.code : awayTeam.code}
                    </span>
                    <span className="font-bold text-white light:text-slate-900">{k.takerName}</span>
                    <span className="block font-mono text-[9px] text-slate-400 light:text-slate-500 truncate">
                      {geom.shotLabel} · {geom.diveLabel}
                    </span>
                  </div>
                  <span className={`font-mono text-[10px] font-bold uppercase shrink-0 ${badgeClass}`}>
                    {geom.outcomeTag}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Final Winner Announcement */}
      {isFinished && shootout.winner && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-cyan-500/20 light:from-amber-100 light:via-amber-50 light:to-cyan-100 border border-amber-400/40 light:border-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-amber-400 light:text-amber-600 shrink-0" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-amber-300 light:text-amber-800 font-bold">
                Penalty Shootout Winner
              </div>
              <div className="font-display font-black text-lg sm:text-xl text-white light:text-slate-900 uppercase">
                {shootout.winner === 'home' ? homeTeam.name : awayTeam.name} win{' '}
                {shootout.homeScore} - {shootout.awayScore} on penalties
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
