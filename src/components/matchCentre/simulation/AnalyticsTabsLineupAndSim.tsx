import React, { useMemo, useState } from 'react';
import { Award, Check, Copy, Cpu, Shield, Trophy, Users } from 'lucide-react';
import { getPlayerDisplayName, Team } from '../../../types/matchCentre';
import { isLightHex, normalizeHex } from '../dossier/dossierUtils';
import type {
  CompleteSimulationOutput,
  SimMatchPhase,
  SimPlayerMatchStats,
  SimTeamSetup,
  SimTimelineEvent,
} from '../../../types/simulation';

interface LineupTabProps {
  output: CompleteSimulationOutput;
  homeTeam: Team;
  awayTeam: Team;
  homeSetup: SimTeamSetup;
  awaySetup: SimTeamSetup;
  visibleEvents: SimTimelineEvent[];
}

export const LineupTab: React.FC<LineupTabProps> = ({
  output,
  homeTeam,
  awayTeam,
  homeSetup,
  awaySetup,
  visibleEvents,
}) => {
  const homeColor = normalizeHex(homeTeam.primaryColor || '#EF4444');
  const awayColor = normalizeHex(awayTeam.primaryColor || '#38BDF8');

  const statsMap = useMemo(() => {
    const m = new Map<string, SimPlayerMatchStats>();
    output.playerStats.forEach((ps) => m.set(ps.playerId, ps));
    return m;
  }, [output.playerStats]);

  const eventsByPlayer = useMemo(() => {
    const map = new Map<
      string,
      { goals: number; penalties: number; assists: number; yellow: number; red: number }
    >();
    const touch = (id?: string) => {
      if (!id) return null;
      if (!map.has(id)) {
        map.set(id, { goals: 0, penalties: 0, assists: 0, yellow: 0, red: 0 });
      }
      return map.get(id)!;
    };
    visibleEvents.forEach((ev) => {
      if (ev.type === 'goal') {
        const s = touch(ev.playerId);
        if (s) {
          s.goals++;
          if (ev.isPenalty || /\bpenalty\b/i.test(ev.commentary || '')) {
            s.penalties++;
          }
        }
        const a = touch(ev.assistPlayerId);
        if (a) a.assists++;
      } else if (ev.type === 'yellow') {
        const s = touch(ev.playerId);
        if (s) s.yellow++;
      } else if (ev.type === 'red' || ev.type === 'second-yellow') {
        const s = touch(ev.playerId);
        if (s) s.red++;
      }
    });
    return map;
  }, [visibleEvents]);

  const renderTeamPitch = (
    team: Team,
    setup: SimTeamSetup,
    color: string,
    managerLine: string,
    side: 'home' | 'away'
  ) => {
    const starters = setup.slots;
    const xiRatings = starters
      .map((s) => (s.player ? statsMap.get(s.player.id)?.rating : undefined))
      .filter((r): r is number => typeof r === 'number');
    const avgXiRating = xiRatings.length
      ? (xiRatings.reduce((a, b) => a + b, 0) / xiRatings.length).toFixed(1)
      : '—';

    const subsLog = visibleEvents.filter((e) => e.type === 'sub' && e.teamSide === side);

    return (
      <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 space-y-3">
        {/* Header matching Screenshot #8 */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              <h4 className="font-bold text-sm text-white light:text-slate-900">{team.name}</h4>
            </div>
            <div className="text-[11px] text-slate-400 light:text-slate-600 mt-0.5">{managerLine}</div>
          </div>

          <div className="text-right">
            <span
              className="px-2.5 py-0.5 rounded font-mono text-[11px] font-bold border"
              style={{
                borderColor: `${color}88`,
                color: isLightHex(color) ? '#0F172A' : '#E2E8F0',
                backgroundColor: `${color}22`,
              }}
            >
              {setup.formation}
            </span>
            <div className="font-mono text-[11px] font-bold text-slate-300 light:text-slate-700 mt-1">
              XI <span className="text-white light:text-slate-900">{avgXiRating}</span>
            </div>
          </div>
        </div>

        {/* Formation Pitch */}
        <div className="relative w-full landscape-mobile:max-w-[300px] landscape-mobile:mx-auto aspect-[4/4.6] rounded-xl overflow-hidden border border-white/10 bg-[#0D2B1B] select-none">
          <div
            className="absolute inset-0 pointer-events-none opacity-45"
            style={{
              backgroundImage:
                'repeating-linear-gradient(to bottom, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 36px, transparent 36px, transparent 72px)',
            }}
          />
          <div className="absolute inset-3 border border-white/20 rounded pointer-events-none" />
          <div className="absolute top-1/2 inset-x-3 h-px bg-white/20 pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/20 pointer-events-none" />
          <div className="absolute top-3 left-1/2 -translate-x-1/2 w-32 h-12 border-b border-x border-white/20 pointer-events-none" />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-32 h-12 border-t border-x border-white/20 pointer-events-none" />

          <span className="absolute top-4 left-4 px-2 py-0.5 rounded bg-black/55 border border-white/15 font-mono text-[9px] font-bold text-slate-200">
            {setup.formation}
          </span>

          {starters.map((slot) => {
            const p = slot.player;
            if (!p) return null;
            const liveStat = statsMap.get(p.id);
            const evs = eventsByPlayer.get(p.id);
            const rating = liveStat?.rating ?? 6.2;

            return (
              <div
                key={slot.slotIndex}
                style={{ left: `${slot.node.x}%`, top: `${slot.node.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              >
                <div
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white flex items-center justify-center font-mono text-[10px] font-black shadow-md relative"
                  style={{
                    backgroundColor: color,
                    color: isLightHex(color) ? '#050A12' : '#FFFFFF',
                  }}
                >
                  {p.shirtNumber}
                  {p.isCaptain && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 text-slate-950 font-mono text-[8px] font-black flex items-center justify-center">
                      C
                    </span>
                  )}
                </div>
                <span className="mt-0.5 text-[9px] font-bold text-white drop-shadow max-w-[70px] truncate">
                  {p.shortName || getPlayerDisplayName(p)}
                </span>
                <div className="flex items-center gap-0.5 mt-0.5">
                  <span className="px-1 rounded bg-black/70 font-mono text-[8px] font-bold text-slate-200">
                    {slot.node.line}
                  </span>
                  <span
                    className={`px-1 rounded font-mono text-[8px] font-black ${
                      rating >= 7.5
                        ? 'bg-emerald-500 text-slate-950'
                        : rating >= 6.8
                        ? 'bg-cyan-500/80 text-slate-950'
                        : 'bg-slate-800 text-white'
                    }`}
                  >
                    {rating.toFixed(1)}
                  </span>
                  {evs && evs.goals > 0 && (
                    <span className="px-1 rounded bg-emerald-400 text-slate-950 font-mono text-[8px] font-black">
                      ⚽{evs.goals > 1 ? evs.goals : ''}
                      {evs.penalties > 0 ? '(P)' : ''}
                    </span>
                  )}
                  {evs && evs.assists > 0 && (
                    <span className="px-1 rounded bg-sky-400 text-slate-950 font-mono text-[8px] font-black">
                      A{evs.assists > 1 ? evs.assists : ''}
                    </span>
                  )}
                  {evs && evs.yellow > 0 && (
                    <span className="inline-block w-2 h-2.5 rounded-[1px] bg-amber-400" />
                  )}
                  {evs && evs.red > 0 && (
                    <span className="inline-block w-2 h-2.5 rounded-[1px] bg-rose-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Substitutes & Entered Players */}
        <div className="pt-2 border-t border-white/10 light:border-slate-200 space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-600">
            Substitutions & Bench
          </div>
          {subsLog.length > 0 && (
            <div className="space-y-1">
              {subsLog.map((s) => (
                <div key={s.id} className="text-[11px] text-slate-300 light:text-slate-700 font-mono">
                  <span className="text-cyan-300 light:text-cyan-700 font-bold">{s.minute}&apos;</span>{' '}
                  <span className="text-emerald-300 light:text-emerald-700 font-semibold">IN: {s.playerName}</span>{' '}
                  <span className="text-slate-500 light:text-slate-500">· OUT: {s.secondaryPlayerName}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {setup.bench.slice(0, 9).map((bp) => (
              <span
                key={bp.id}
                className="px-2 py-0.5 rounded bg-slate-950 light:bg-slate-100 border border-white/10 light:border-slate-300 font-mono text-[10px] text-slate-300 light:text-slate-800"
              >
                #{bp.shirtNumber} {bp.shortName || getPlayerDisplayName(bp)} ({bp.positionDetail})
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-slate-300 light:text-slate-700">
        <Users className="w-4 h-4 text-emerald-400 light:text-emerald-600" />
        <span>LINEUPS · FORMATION · RATING · EVENTS</span>
      </div>

      <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 lg:grid-cols-2 gap-4">
        {renderTeamPitch(homeTeam, homeSetup, homeColor, output.homeManager, 'home')}
        {renderTeamPitch(awayTeam, awaySetup, awayColor, output.awayManager, 'away')}
      </div>
    </div>
  );
};

interface SimulationTabProps {
  output: CompleteSimulationOutput;
  homeTeam: Team;
  awayTeam: Team;
  phase: SimMatchPhase;
}

export const SimulationTab: React.FC<SimulationTabProps> = ({
  output,
  homeTeam,
  awayTeam,
  phase,
}) => {
  const [copiedSeed, setCopiedSeed] = useState(false);
  const homeColor = normalizeHex(homeTeam.primaryColor || '#EF4444');
  const awayColor = normalizeHex(awayTeam.primaryColor || '#38BDF8');

  const topPerformers = useMemo(() => {
    return [...output.playerStats]
      .sort((a, b) => b.rating - a.rating || b.goals - a.goals || b.assists - a.assists)
      .slice(0, 5);
  }, [output.playerStats]);

  const motm =
    output.playerStats.find((p) => p.playerId === output.motmPlayerId) || topPerformers[0];

  const handleCopySeed = () => {
    navigator.clipboard?.writeText(output.seed).catch(() => {});
    setCopiedSeed(true);
    setTimeout(() => setCopiedSeed(false), 1800);
  };

  return (
    <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 lg:grid-cols-2 gap-4">
      {/* Engine Metadata & Match Context */}
      <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-5 space-y-4">
        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-white light:text-slate-900">
          <Cpu className="w-4 h-4 text-cyan-400 light:text-cyan-600" />
          <span>Simulation Engine & Telemetry</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950/80 light:bg-slate-50 border border-white/[0.08] light:border-slate-200">
            <div className="font-mono text-[10px] text-slate-400 light:text-slate-600 uppercase">Engine Version</div>
            <div className="font-bold text-white light:text-slate-900 mt-1">{output.engineVersion}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 light:bg-slate-50 border border-white/[0.08] light:border-slate-200">
            <div className="font-mono text-[10px] text-slate-400 light:text-slate-600 uppercase">Current Phase</div>
            <div className="font-bold text-emerald-300 light:text-emerald-700 uppercase mt-1">{phase}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 light:bg-slate-50 border border-white/[0.08] light:border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] text-slate-400 light:text-slate-600 uppercase">Deterministic Seed</div>
              <div className="font-mono font-black text-cyan-300 light:text-cyan-700 mt-1">{output.seed}</div>
            </div>
            <button
              type="button"
              onClick={handleCopySeed}
              className="p-1.5 rounded-lg bg-white/[0.05] light:bg-slate-200 hover:bg-white/10 light:hover:bg-slate-300 text-slate-300 light:text-slate-700 cursor-pointer"
              title="Copy seed"
            >
              {copiedSeed ? <Check className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 light:bg-slate-50 border border-white/[0.08] light:border-slate-200">
            <div className="font-mono text-[10px] text-slate-400 light:text-slate-600 uppercase">Venue & Attendance</div>
            <div className="font-bold text-white light:text-slate-900 mt-1 truncate">
              {homeTeam.stadium} ({(homeTeam.stadiumCapacity || 52000).toLocaleString()})
            </div>
          </div>
        </div>

        {/* Captains */}
        <div className="p-3.5 rounded-xl bg-slate-950/80 light:bg-slate-50 border border-white/[0.08] light:border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="font-mono text-[10px] text-slate-400 light:text-slate-600 uppercase block">
              {homeTeam.code} Captain
            </span>
            <span className="font-bold text-white light:text-slate-900">{output.homeCaptainName}</span>
          </div>
          <div className="text-right">
            <span className="font-mono text-[10px] text-slate-400 light:text-slate-600 uppercase block">
              {awayTeam.code} Captain
            </span>
            <span className="font-bold text-white light:text-slate-900">{output.awayCaptainName}</span>
          </div>
        </div>

        {/* Predicted vs Actual Distribution */}
        <div className="p-4 rounded-xl bg-slate-950/80 light:bg-slate-50 border border-white/[0.08] light:border-slate-200 space-y-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-300 light:text-slate-700 font-bold">
            Predicted Pre-Match Odds vs Outcome
          </div>
          <div className="flex items-center justify-between font-mono text-xs text-white light:text-slate-900 font-bold">
            <span>{homeTeam.code}: {output.preMatchOdds.homeWinPct}%</span>
            <span>Draw: {output.preMatchOdds.drawPct}%</span>
            <span>{awayTeam.code}: {output.preMatchOdds.awayWinPct}%</span>
          </div>
          <div className="h-2.5 rounded-full overflow-hidden flex bg-slate-900 light:bg-slate-200 border border-white/10 light:border-slate-300">
            <div style={{ width: `${output.preMatchOdds.homeWinPct}%`, backgroundColor: homeColor }} />
            <div style={{ width: `${output.preMatchOdds.drawPct}%`, backgroundColor: '#64748B' }} />
            <div style={{ width: `${output.preMatchOdds.awayWinPct}%`, backgroundColor: awayColor }} />
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
            <div className="text-slate-400 light:text-slate-600">
              Projected xG:{' '}
              <span className="font-mono font-bold text-white light:text-slate-900">
                {output.preMatchOdds.projectedHomeXg} – {output.preMatchOdds.projectedAwayXg}
              </span>
            </div>
            <div className="text-right text-slate-400 light:text-slate-600">
              Actual xG:{' '}
              <span className="font-mono font-bold text-cyan-300 light:text-cyan-700">
                {output.homeStats.xg.toFixed(2)} – {output.awayStats.xg.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers & Match Outcome Verdict */}
      <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-5 space-y-4">
        <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-white light:text-slate-900">
          <Award className="w-4 h-4 text-amber-400 light:text-amber-600" />
          <span>Top Performers & Outcome</span>
        </div>

        {motm && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-cyan-500/15 light:from-amber-100/70 light:via-amber-50 light:to-cyan-100/70 border border-amber-400/40 light:border-amber-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 font-mono font-black flex items-center justify-center">
                {motm.rating.toFixed(1)}
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-amber-300 light:text-amber-800 font-bold">
                  Man of the Match
                </div>
                <div className="text-sm font-bold text-white light:text-slate-900">
                  {motm.playerName} ({motm.teamSide === 'home' ? homeTeam.code : awayTeam.code})
                </div>
                <div className="font-mono text-[11px] text-slate-300 light:text-slate-700">
                  {motm.goals}G · {motm.assists}A · {motm.keyPasses} Key Passes · {motm.xg.toFixed(2)} xG
                </div>
              </div>
            </div>
            <Trophy className="w-6 h-6 text-amber-400 light:text-amber-600 shrink-0" />
          </div>
        )}

        <div className="space-y-2">
          <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-600">
            Highest Rated Players
          </div>
          {topPerformers.map((p) => (
            <div
              key={p.playerId}
              className="p-2.5 rounded-xl bg-slate-950/75 light:bg-slate-50 border border-white/[0.07] light:border-slate-200 flex items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="px-1.5 py-0.5 rounded font-mono text-[9px] font-black text-white"
                  style={{ backgroundColor: p.teamSide === 'home' ? homeColor : awayColor }}
                >
                  {p.teamSide === 'home' ? homeTeam.code : awayTeam.code}
                </span>
                <span className="font-bold text-white light:text-slate-900 truncate">{p.playerName}</span>
                <span className="font-mono text-[10px] text-slate-400 light:text-slate-600">{p.roleSlot}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0 font-mono text-[11px]">
                <span className="text-slate-400 light:text-slate-600">
                  {p.goals}G {p.assists}A
                </span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 light:bg-emerald-100 text-emerald-300 light:text-emerald-800 font-black">
                  {p.rating.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/80 light:bg-slate-50 border border-white/[0.08] light:border-slate-200 text-xs text-slate-300 light:text-slate-700">
          <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-600 block mb-1">
            Outcome Summary
          </span>
          {output.winner === 'draw'
            ? `Finished level at ${output.homeScore} - ${output.awayScore} after ${output.finalMinute} minutes.`
            : `${
                output.winner === 'home' ? homeTeam.name : awayTeam.name
              } claim the victory (${output.homeScore} - ${output.awayScore}${
                output.penaltyShootout
                  ? `, ${output.penaltyShootout.homeScore}-${output.penaltyShootout.awayScore} on penalties`
                  : output.wentToExtraTime
                  ? ' AET'
                  : ''
              }).`}
        </div>
      </div>
    </div>
  );
};
