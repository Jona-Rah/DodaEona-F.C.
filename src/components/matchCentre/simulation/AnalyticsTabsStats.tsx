import React, { useMemo, useState } from 'react';
import { Activity, BarChart3, Compass, Crosshair, Target } from 'lucide-react';
import { Team } from '../../../types/matchCentre';
import { normalizeHex } from '../dossier/dossierUtils';
import type {
  CompleteSimulationOutput,
  SimPlayerMatchStats,
  SimShotEvent,
  SimTeamMatchStats,
} from '../../../types/simulation';

interface StatsTabProps {
  output: CompleteSimulationOutput;
  homeTeam: Team;
  awayTeam: Team;
  visibleShots: SimShotEvent[];
  homeStats: SimTeamMatchStats;
  awayStats: SimTeamMatchStats;
}

const CompareBar: React.FC<{
  label: string;
  homeVal: number | string | null;
  awayVal: number | string | null;
  homeNum: number;
  awayNum: number;
  homeColor: string;
  awayColor: string;
  suffix?: string;
}> = ({ label, homeVal, awayVal, homeNum, awayNum, homeColor, awayColor, suffix = '' }) => {
  const total = Math.max(0.0001, homeNum + awayNum);
  const hPct = homeVal === null || awayVal === null ? 50 : Math.round((homeNum / total) * 100);
  const aPct = 100 - hPct;

  return (
    <div className="space-y-1.5 py-1.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs">
        <span className="font-mono font-bold text-base tabular-nums" style={{ color: homeColor }}>
          {homeVal === null ? 'Not recorded' : `${homeVal}${suffix}`}
        </span>
        <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-slate-400 light:text-slate-600 font-semibold text-center">
          {label}
        </span>
        <span className="font-mono font-bold text-base tabular-nums text-right" style={{ color: awayColor }}>
          {awayVal === null ? 'Not recorded' : `${awayVal}${suffix}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden flex bg-slate-900 light:bg-slate-200 border border-white/[0.06] light:border-slate-300">
        <div className="transition-all duration-300" style={{ width: `${hPct}%`, backgroundColor: homeColor }} />
        <div className="transition-all duration-300" style={{ width: `${aPct}%`, backgroundColor: awayColor }} />
      </div>
    </div>
  );
};

export const StatsTab: React.FC<StatsTabProps> = ({
  output,
  homeTeam,
  awayTeam,
  visibleShots,
  homeStats,
  awayStats,
}) => {
  const [shotFilter, setShotFilter] = useState<'both' | 'home' | 'away'>('both');
  const [selectedShot, setSelectedShot] = useState<SimShotEvent | null>(null);
  const [playerSideFilter, setPlayerSideFilter] = useState<'all' | 'home' | 'away'>('all');
  const [sortCol, setSortCol] = useState<keyof SimPlayerMatchStats>('rating');
  const [sortAsc, setSortAsc] = useState(false);

  const homeColor = normalizeHex(homeTeam.primaryColor || '#EF4444');
  const awayColor = normalizeHex(awayTeam.primaryColor || '#38BDF8');

  const filteredShots = useMemo(() => {
    if (shotFilter === 'both') return visibleShots;
    return visibleShots.filter((s) => s.teamSide === shotFilter);
  }, [visibleShots, shotFilter]);

  const sortedPlayers = useMemo(() => {
    const base =
      playerSideFilter === 'all'
        ? output.playerStats
        : output.playerStats.filter((p) => p.teamSide === playerSideFilter);
    return [...base].sort((a, b) => {
      const va = Number(a[sortCol] ?? 0);
      const vb = Number(b[sortCol] ?? 0);
      return sortAsc ? va - vb : vb - va;
    });
  }, [output.playerStats, playerSideFilter, sortCol, sortAsc]);

  const handleSort = (col: keyof SimPlayerMatchStats) => {
    if (sortCol === col) setSortAsc((p) => !p);
    else {
      setSortCol(col);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* 2-Column Studio Stats Grid Matching Screenshots #9 & #10 */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 lg:grid-cols-2 gap-4 landscape-mobile:gap-3 items-start">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          {/* SHOT MAP */}
          <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest">
                <Crosshair className="w-4 h-4 text-rose-400" />
                <span className="text-white light:text-slate-900">SHOT MAP</span>
                <span className="text-slate-500 light:text-slate-600">{filteredShots.length} SHOTS</span>
              </div>
              <span className="font-mono text-[10px] tracking-widest text-slate-400 light:text-slate-600 uppercase">
                TAP A SHOT
              </span>
            </div>

            <p className="text-xs text-slate-400 light:text-slate-600">
              Every shot, placed in the zone it was taken from. Click a shot to see who took it, when, and how good a chance it was.
            </p>

            <div className="flex items-center gap-1.5">
              {(
                [
                  { id: 'both', label: 'BOTH' },
                  { id: 'home', label: homeTeam.code },
                  { id: 'away', label: awayTeam.code },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setShotFilter(f.id)}
                  className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold uppercase border cursor-pointer shadow-xs ${
                    shotFilter === f.id
                      ? 'bg-white/15 light:bg-slate-900 border-white/50 light:border-slate-900 text-white light:text-white'
                      : 'bg-white/[0.03] light:bg-slate-100 border-white/10 light:border-slate-300 text-slate-400 light:text-slate-700 hover:text-white light:hover:text-slate-950'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Attacking Half SVG Pitch */}
            <div className="relative rounded-xl bg-[#0A2516] border border-white/15 p-3">
              <svg viewBox="0 0 320 210" className="w-full h-auto">
                {/* Outer pitch */}
                <rect x="14" y="14" width="292" height="186" fill="none" stroke="rgba(255,255,255,0.22)" />
                {/* Goal */}
                <rect x="138" y="8" width="44" height="6" fill="rgba(255,255,255,0.65)" />
                {/* 6-yard box */}
                <rect x="116" y="14" width="88" height="24" fill="none" stroke="rgba(255,255,255,0.22)" />
                {/* 18-yard penalty area */}
                <rect x="76" y="14" width="168" height="66" fill="none" stroke="rgba(255,255,255,0.22)" />
                {/* Penalty spot & arc */}
                <circle cx="160" cy="58" r="2" fill="rgba(255,255,255,0.45)" />
                <path d="M 130 80 A 38 38 0 0 0 190 80" fill="none" stroke="rgba(255,255,255,0.22)" />

                {/* Shots */}
                {filteredShots.map((s) => {
                  const cx = 14 + (s.x / 100) * 292;
                  const cy = 14 + (s.y / 50) * 186;
                  const isGoal = s.outcome === 'goal';
                  const isSelected = selectedShot?.id === s.id;
                  const color = s.teamSide === 'home' ? homeColor : awayColor;
                  const r = Math.max(4.5, Math.min(11, 4.5 + s.xg * 10));

                  return (
                    <circle
                      key={s.id}
                      cx={cx}
                      cy={Math.min(194, cy)}
                      r={isSelected ? r + 2 : r}
                      fill={isGoal ? '#F59E0B' : color}
                      fillOpacity={isGoal ? 0.95 : 0.78}
                      stroke={isSelected ? '#FFFFFF' : isGoal ? color : 'rgba(255,255,255,0.7)'}
                      strokeWidth={isSelected ? 2.5 : isGoal ? 2.2 : 1.1}
                      className="cursor-pointer transition-transform"
                      onClick={() => setSelectedShot(s)}
                    />
                  );
                })}
              </svg>

              {selectedShot && (
                <div className="mt-2 p-2.5 rounded-lg bg-slate-950/90 light:bg-slate-100 border border-white/15 light:border-slate-300 flex flex-wrap items-center justify-between gap-2 text-xs shadow-xs">
                  <div>
                    <span className="font-mono text-[10px] font-bold uppercase text-cyan-300 light:text-cyan-800 mr-2">
                      {selectedShot.minute}
                      {selectedShot.addedMinute ? `+${selectedShot.addedMinute}` : ''}&apos; ·{' '}
                      {selectedShot.teamSide === 'home' ? homeTeam.code : awayTeam.code}
                    </span>
                    <span className="font-bold text-white light:text-slate-900">{selectedShot.playerName}</span>
                    <span className="text-slate-400 light:text-slate-600 ml-2">
                      ({selectedShot.outcome.toUpperCase()} · {selectedShot.bodyPart} · {selectedShot.situation})
                    </span>
                  </div>
                  <div className="font-mono text-xs font-bold text-amber-300 light:text-amber-700">
                    xG {selectedShot.xg.toFixed(2)}
                    {selectedShot.xgot !== null ? ` · xGOT ${selectedShot.xgot.toFixed(2)}` : ''}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ATTACKING ZONES (LEFT · CENTRAL · RIGHT) & HOW ATTACKS WERE BUILT */}
          <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 sm:p-5 space-y-4 shadow-xs">
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest">
              <Compass className="w-4 h-4 text-emerald-400 light:text-emerald-700" />
              <span className="text-white light:text-slate-900">ATTACKING ZONES</span>
              <span className="text-slate-500 light:text-slate-600">LEFT · CENTRAL · RIGHT</span>
            </div>

            <p className="text-xs text-slate-400 light:text-slate-600">
              The share of a team&apos;s shots that came down the left, through the middle and down the right. Each attack is recorded with the channel it was built in, so the three numbers add up to the team&apos;s total shots.
            </p>

            <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-4 landscape-mobile:gap-3">
              {/* Attack Channels Vertical Bars */}
              <div className="p-3.5 rounded-xl bg-[#091F14] light:bg-slate-100 border border-white/10 light:border-slate-300 space-y-3">
                <div className="flex justify-between font-mono text-[9px] uppercase tracking-widest text-slate-300 light:text-slate-700 font-bold">
                  <span>ATTACK CHANNELS</span>
                  <span>SHARE OF SHOTS</span>
                </div>
                <div className="grid grid-cols-3 gap-3 h-32 items-end pt-4 border-t border-white/10 light:border-slate-300">
                  {(['left', 'central', 'right'] as const).map((zone) => {
                    const hv = homeStats.attackingZones[zone];
                    const av = awayStats.attackingZones[zone];
                    return (
                      <div key={zone} className="flex flex-col items-center gap-1.5 h-full justify-end">
                        <div className="flex items-end gap-1.5 h-20">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-mono text-[9px] text-white light:text-slate-900 font-bold">{hv}%</span>
                            <div
                              className="w-4 rounded-t-md"
                              style={{ height: `${Math.max(8, hv * 0.72)}px`, backgroundColor: homeColor }}
                            />
                          </div>
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="font-mono text-[9px] text-white light:text-slate-900 font-bold">{av}%</span>
                            <div
                              className="w-4 rounded-t-md"
                              style={{ height: `${Math.max(8, av * 0.72)}px`, backgroundColor: awayColor }}
                            />
                          </div>
                        </div>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-slate-300 light:text-slate-700 font-bold">
                          {zone}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-4 font-mono text-[10px] text-slate-300 light:text-slate-700 font-bold">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: homeColor }} />
                    {homeTeam.code}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: awayColor }} />
                    {awayTeam.code}
                  </span>
                </div>
              </div>

              {/* How Attacks Were Built */}
              <div className="space-y-3">
                {[
                  { team: homeTeam, stats: homeStats, color: homeColor },
                  { team: awayTeam, stats: awayStats, color: awayColor },
                ].map(({ team, stats, color }) => (
                  <div
                    key={team.id}
                    className="p-3 rounded-xl bg-slate-950/75 light:bg-slate-50 border border-white/[0.08] light:border-slate-200 space-y-2 shadow-xs"
                  >
                    <div className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-widest text-slate-300 light:text-slate-800">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span>{team.code} · HOW ATTACKS WERE BUILT</span>
                    </div>
                    {(
                      [
                        { key: 'patient', label: 'Patient possession' },
                        { key: 'throughBall', label: 'Through balls' },
                        { key: 'crossSetPiece', label: 'Crosses & set pieces' },
                        { key: 'counter', label: 'Counter-attacks' },
                      ] as const
                    ).map((m) => (
                      <div key={m.key} className="grid grid-cols-[120px_1fr_32px] items-center gap-2 text-[11px]">
                        <span className="text-slate-400 light:text-slate-600 truncate">{m.label}</span>
                        <div className="h-1.5 rounded-full bg-slate-900 light:bg-slate-200 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${stats.buildMethods[m.key]}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="font-mono text-white light:text-slate-900 font-bold text-right tabular-nums">
                          {stats.buildMethods[m.key]}%
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          {/* MATCH OVERVIEW */}
          <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-white light:text-slate-900">
              <BarChart3 className="w-4 h-4 text-cyan-400 light:text-cyan-700" />
              <span>MATCH OVERVIEW</span>
            </div>
            <p className="text-xs text-slate-400 light:text-slate-600">The headline numbers of the match, side by side.</p>

            <div className="p-3.5 rounded-xl bg-slate-950/75 light:bg-slate-50 border border-white/[0.08] light:border-slate-200 divide-y divide-white/[0.06] light:divide-slate-200 shadow-xs">
              <CompareBar
                label="BIG CHANCES"
                homeVal={homeStats.bigChances}
                awayVal={awayStats.bigChances}
                homeNum={homeStats.bigChances}
                awayNum={awayStats.bigChances}
                homeColor={homeColor}
                awayColor={awayColor}
              />
              <CompareBar
                label="BIG CHANCES MISSED"
                homeVal={homeStats.bigChancesMissed}
                awayVal={awayStats.bigChancesMissed}
                homeNum={homeStats.bigChancesMissed}
                awayNum={awayStats.bigChancesMissed}
                homeColor={homeColor}
                awayColor={awayColor}
              />
              <CompareBar
                label="TOUCHES IN OPPOSITION BOX"
                homeVal={homeStats.touchesInBox}
                awayVal={awayStats.touchesInBox}
                homeNum={homeStats.touchesInBox}
                awayNum={awayStats.touchesInBox}
                homeColor={homeColor}
                awayColor={awayColor}
              />
              <CompareBar
                label="YELLOW CARDS"
                homeVal={homeStats.yellowCards}
                awayVal={awayStats.yellowCards}
                homeNum={homeStats.yellowCards}
                awayNum={awayStats.yellowCards}
                homeColor={homeColor}
                awayColor={awayColor}
              />
              <CompareBar
                label="CORNERS"
                homeVal={homeStats.corners}
                awayVal={awayStats.corners}
                homeNum={homeStats.corners}
                awayNum={awayStats.corners}
                homeColor={homeColor}
                awayColor={awayColor}
              />
            </div>
          </div>

          {/* PHYSICAL PERFORMANCE */}
          <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-amber-500/25 light:border-amber-400/40 p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-white light:text-slate-900">
              <Activity className="w-4 h-4 text-amber-400 light:text-amber-600" />
              <span>PHYSICAL PERFORMANCE</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/75 light:bg-slate-50 border border-white/[0.08] light:border-slate-200 divide-y divide-white/[0.06] light:divide-slate-200 shadow-xs">
              <CompareBar
                label="RUNNING DISTANCE (KM)"
                homeVal={homeStats.runningDistanceKm}
                awayVal={awayStats.runningDistanceKm}
                homeNum={homeStats.runningDistanceKm ?? 1}
                awayNum={awayStats.runningDistanceKm ?? 1}
                homeColor={homeColor}
                awayColor={awayColor}
              />
              <CompareBar
                label="SPRINTING DISTANCE (KM)"
                homeVal={homeStats.sprintingDistanceKm}
                awayVal={awayStats.sprintingDistanceKm}
                homeNum={homeStats.sprintingDistanceKm ?? 1}
                awayNum={awayStats.sprintingDistanceKm ?? 1}
                homeColor={homeColor}
                awayColor={awayColor}
              />
              <CompareBar
                label="SPRINTS"
                homeVal={homeStats.sprints}
                awayVal={awayStats.sprints}
                homeNum={homeStats.sprints ?? 1}
                awayNum={awayStats.sprints ?? 1}
                homeColor={homeColor}
                awayColor={awayColor}
              />
            </div>
          </div>

          {/* EXPECTED GOALS (XG) */}
          <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 sm:p-5 space-y-3 shadow-xs">
            <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest">
              <Target className="w-4 h-4 text-emerald-400 light:text-emerald-700" />
              <span className="text-white light:text-slate-900">EXPECTED GOALS (XG)</span>
              <span className="text-slate-500 light:text-slate-600">CHANCE QUALITY</span>
            </div>
            <p className="text-xs text-slate-400 light:text-slate-600">
              xG describes the chances a side created, not the scoreline. xGOT then judges only the shots that hit the target, by where in the goal they were heading — so a side can under-perform its xG and still be finishing well.
            </p>
            <div className="p-3.5 rounded-xl bg-slate-950/75 light:bg-slate-50 border border-white/[0.08] light:border-slate-200 divide-y divide-white/[0.06] light:divide-slate-200 shadow-xs">
              <CompareBar
                label="XGOT (ON TARGET)"
                homeVal={homeStats.xgot !== null ? homeStats.xgot.toFixed(2) : null}
                awayVal={awayStats.xgot !== null ? awayStats.xgot.toFixed(2) : null}
                homeNum={homeStats.xgot ?? 0.1}
                awayNum={awayStats.xgot ?? 0.1}
                homeColor={homeColor}
                awayColor={awayColor}
              />
              <CompareBar
                label="OPEN-PLAY XG"
                homeVal={homeStats.openPlayXg !== null ? homeStats.openPlayXg.toFixed(2) : null}
                awayVal={awayStats.openPlayXg !== null ? awayStats.openPlayXg.toFixed(2) : null}
                homeNum={homeStats.openPlayXg ?? 0.1}
                awayNum={awayStats.openPlayXg ?? 0.1}
                homeColor={homeColor}
                awayColor={awayColor}
              />
              <CompareBar
                label="SET-PIECE XG"
                homeVal={homeStats.setPieceXg !== null ? homeStats.setPieceXg.toFixed(2) : null}
                awayVal={awayStats.setPieceXg !== null ? awayStats.setPieceXg.toFixed(2) : null}
                homeNum={homeStats.setPieceXg ?? 0.1}
                awayNum={awayStats.setPieceXg ?? 0.1}
                homeColor={homeColor}
                awayColor={awayColor}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Passing, Duels & Defensive Metrics */}
      <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 sm:p-5 space-y-3">
        <div className="font-mono text-xs font-bold uppercase tracking-widest text-white light:text-slate-900">
          Passing, Duels & Defensive Telemetry
        </div>
        <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-x-8 landscape-mobile:gap-x-5 divide-y landscape-mobile:divide-y-0 md:divide-y-0 divide-white/[0.06] light:divide-slate-200">
          <div className="divide-y divide-white/[0.06] light:divide-slate-200">
            <CompareBar
              label="PASSES (COMPLETED / ATTEMPTED)"
              homeVal={`${homeStats.passesCompleted}/${homeStats.passesAttempted}`}
              awayVal={`${awayStats.passesCompleted}/${awayStats.passesAttempted}`}
              homeNum={homeStats.passesCompleted}
              awayNum={awayStats.passesCompleted}
              homeColor={homeColor}
              awayColor={awayColor}
            />
            <CompareBar
              label="PASS ACCURACY"
              homeVal={homeStats.passAccuracy}
              awayVal={awayStats.passAccuracy}
              homeNum={homeStats.passAccuracy}
              awayNum={awayStats.passAccuracy}
              homeColor={homeColor}
              awayColor={awayColor}
              suffix="%"
            />
            <CompareBar
              label="DUELS WON"
              homeVal={`${homeStats.duelsWon}/${homeStats.duelsTotal}`}
              awayVal={`${awayStats.duelsWon}/${awayStats.duelsTotal}`}
              homeNum={homeStats.duelsWon}
              awayNum={awayStats.duelsWon}
              homeColor={homeColor}
              awayColor={awayColor}
            />
            <CompareBar
              label="FOULS COMMITTED"
              homeVal={homeStats.fouls}
              awayVal={awayStats.fouls}
              homeNum={homeStats.fouls}
              awayNum={awayStats.fouls}
              homeColor={homeColor}
              awayColor={awayColor}
            />
          </div>
          <div className="divide-y divide-white/[0.06] light:divide-slate-200">
            <CompareBar
              label="TACKLES WON"
              homeVal={`${homeStats.tacklesWon}/${homeStats.tacklesTotal}`}
              awayVal={`${awayStats.tacklesWon}/${awayStats.tacklesTotal}`}
              homeNum={homeStats.tacklesWon}
              awayNum={awayStats.tacklesWon}
              homeColor={homeColor}
              awayColor={awayColor}
            />
            <CompareBar
              label="INTERCEPTIONS"
              homeVal={homeStats.interceptions}
              awayVal={awayStats.interceptions}
              homeNum={homeStats.interceptions}
              awayNum={awayStats.interceptions}
              homeColor={homeColor}
              awayColor={awayColor}
            />
            <CompareBar
              label="CLEARANCES"
              homeVal={homeStats.clearances}
              awayVal={awayStats.clearances}
              homeNum={homeStats.clearances}
              awayNum={awayStats.clearances}
              homeColor={homeColor}
              awayColor={awayColor}
            />
            <CompareBar
              label="GOALKEEPER SAVES"
              homeVal={homeStats.saves}
              awayVal={awayStats.saves}
              homeNum={homeStats.saves}
              awayNum={awayStats.saves}
              homeColor={homeColor}
              awayColor={awayColor}
            />
          </div>
        </div>
      </div>

      {/* Sortable Player Statistics Table */}
      <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="font-mono text-xs font-bold uppercase tracking-widest text-white light:text-slate-900">
            Sortable Player Statistics ({sortedPlayers.length})
          </div>
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'all', label: 'ALL' },
                { id: 'home', label: homeTeam.code },
                { id: 'away', label: awayTeam.code },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setPlayerSideFilter(f.id)}
                className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold uppercase border cursor-pointer ${
                  playerSideFilter === f.id
                    ? 'bg-cyan-500/20 light:bg-cyan-100 border-cyan-400 light:border-cyan-600 text-cyan-200 light:text-cyan-900'
                    : 'bg-white/[0.03] light:bg-slate-100 border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 light:border-slate-200 font-mono text-[10px] text-slate-400 light:text-slate-600 uppercase">
                <th className="py-2 pr-3">Player</th>
                <th className="py-2 px-2">Pos</th>
                {(
                  [
                    { k: 'minutesPlayed', label: 'Min' },
                    { k: 'goals', label: 'G' },
                    { k: 'assists', label: 'A' },
                    { k: 'shots', label: 'Sh' },
                    { k: 'xg', label: 'xG' },
                    { k: 'keyPasses', label: 'KP' },
                    { k: 'passesCompleted', label: 'Pass' },
                    { k: 'tackles', label: 'Tkl' },
                    { k: 'saves', label: 'Sv' },
                    { k: 'rating', label: 'Rtg' },
                  ] as Array<{ k: keyof SimPlayerMatchStats; label: string }>
                ).map((col) => (
                  <th key={col.k} className="py-2 px-2">
                    <button
                      type="button"
                      onClick={() => handleSort(col.k)}
                      className={`hover:text-white light:hover:text-slate-900 cursor-pointer ${
                        sortCol === col.k ? 'text-cyan-300 light:text-cyan-700 font-black' : ''
                      }`}
                    >
                      {col.label}
                      {sortCol === col.k ? (sortAsc ? ' ↑' : ' ↓') : ''}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] light:divide-slate-200">
              {sortedPlayers.map((p) => (
                <tr key={p.playerId} className="hover:bg-white/[0.03] light:hover:bg-slate-50">
                  <td className="py-2 pr-3 font-semibold text-white light:text-slate-900 whitespace-nowrap">
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: p.teamSide === 'home' ? homeColor : awayColor }}
                    />
                    {p.playerName}
                  </td>
                  <td className="py-2 px-2 font-mono text-[10px] text-slate-400 light:text-slate-600">{p.roleSlot}</td>
                  <td className="py-2 px-2 font-mono tabular-nums text-slate-300 light:text-slate-700">{p.minutesPlayed}&apos;</td>
                  <td className="py-2 px-2 font-mono tabular-nums text-emerald-300 light:text-emerald-700 font-bold">{p.goals}</td>
                  <td className="py-2 px-2 font-mono tabular-nums text-sky-300 light:text-sky-700">{p.assists}</td>
                  <td className="py-2 px-2 font-mono tabular-nums text-slate-300 light:text-slate-700">{p.shots}</td>
                  <td className="py-2 px-2 font-mono tabular-nums text-slate-300 light:text-slate-700">{p.xg.toFixed(2)}</td>
                  <td className="py-2 px-2 font-mono tabular-nums text-slate-300 light:text-slate-700">{p.keyPasses}</td>
                  <td className="py-2 px-2 font-mono tabular-nums text-slate-300 light:text-slate-700">
                    {p.passesCompleted}/{p.passesAttempted}
                  </td>
                  <td className="py-2 px-2 font-mono tabular-nums text-slate-300 light:text-slate-700">{p.tackles}</td>
                  <td className="py-2 px-2 font-mono tabular-nums text-slate-300 light:text-slate-700">{p.saves}</td>
                  <td className="py-2 px-2 font-mono tabular-nums font-black text-amber-300 light:text-amber-700">
                    {p.rating.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
