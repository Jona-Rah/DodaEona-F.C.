import React, { useMemo } from 'react';
import {
  Activity,
  Award,
  HeartPulse,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import type {
  CompetitionFixtureMatch,
  CompetitionMakerTournament,
} from '../../../types/competitionMaker';
import type { Manager } from '../../../types/manager';
import type { Team } from '../../../types/matchCentre';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import { rebuildMatchFullOutput } from '../../../utils/competitionEngine';
import { TeamEmblem } from '../TeamEmblem';

interface MatchTelemetryModalProps {
  tournament: CompetitionMakerTournament;
  fixture: CompetitionFixtureMatch | null;
  teamsMap: Map<string, Team>;
  managersByTeam: Map<string, Manager | null>;
  onClose: () => void;
}

export const MatchTelemetryModal: React.FC<MatchTelemetryModalProps> = ({
  tournament,
  fixture,
  teamsMap,
  managersByTeam,
  onClose,
}) => {
  const { openSimulationReport } = useMatchCentre();

  const fullOutput = useMemo(() => {
    if (!fixture || fixture.status !== 'completed') return null;
    return rebuildMatchFullOutput(tournament, fixture, teamsMap, managersByTeam);
  }, [tournament, fixture, teamsMap, managersByTeam]);

  if (!fixture || fixture.status !== 'completed') return null;

  const homeTeam = fixture.homeTeamId ? teamsMap.get(fixture.homeTeamId) : undefined;
  const awayTeam = fixture.awayTeamId ? teamsMap.get(fixture.awayTeamId) : undefined;
  const events = fixture.timelineEvents || [];
  const perfs = fixture.playerPerformances || [];

  const homePerfs = perfs
    .filter((p) => p.teamId === fixture.homeTeamId)
    .sort((a, b) => Number(b.started) - Number(a.started) || b.rating - a.rating);
  const awayPerfs = perfs
    .filter((p) => p.teamId === fixture.awayTeamId)
    .sort((a, b) => Number(b.started) - Number(a.started) || b.rating - a.rating);

  const possHome = fixture.possessionHome ?? fullOutput?.homeStats.possession ?? 50;
  const possAway = fixture.possessionAway ?? fullOutput?.awayStats.possession ?? 50;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl border border-white/15 light:border-slate-200 bg-[#070F1B] light:bg-white text-white light:text-slate-900 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50">
          <div className="min-w-0">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#7ADBF0] light:text-cyan-700 truncate">
              {tournament.name} · {fixture.stageName} · {fixture.roundLabel}
            </div>
            <div className="text-xs text-slate-400 light:text-slate-600 mt-0.5 truncate">
              {fixture.neutralVenue ? 'Neutral Ground' : homeTeam?.stadium || 'Stadium'}
              {fixture.seed ? ` · Seed ${fixture.seed}` : ''}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {fullOutput && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  openSimulationReport(fullOutput);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#7ADBF0]/15 hover:bg-[#7ADBF0]/25 border border-[#7ADBF0]/40 text-[#7ADBF0] light:bg-cyan-50 light:border-cyan-300 light:text-cyan-800 text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Full Match Replay</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 light:bg-slate-200 light:hover:bg-slate-300 text-slate-300 light:text-slate-700 cursor-pointer"
              aria-label="Close match report"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Scoreboard Banner */}
          <div className="rounded-xl border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 p-4 sm:p-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {homeTeam && (
                <TeamEmblem team={homeTeam} className="w-10 h-10 object-contain" />
              )}
              <div className="min-w-0">
                <div className="font-bold text-sm sm:text-lg truncate">
                  {homeTeam?.name || fixture.homeTeamId}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                  Home · {homeTeam?.code}
                </div>
              </div>
            </div>

            <div className="text-center px-3 sm:px-6 shrink-0">
              <div className="font-display text-3xl sm:text-5xl tracking-wider tabular-nums text-white light:text-slate-950">
                {fixture.homeScore} – {fixture.awayScore}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 mt-1 space-x-2">
                <span>HT {fixture.halfTimeHomeScore ?? 0}–{fixture.halfTimeAwayScore ?? 0}</span>
                {fixture.wentToExtraTime && (
                  <span className="text-amber-400 light:text-amber-700 font-bold">· AET</span>
                )}
              </div>
              {fixture.penaltyShootout?.summary && (
                <div className="mt-1 font-mono text-[11px] font-bold text-amber-400 light:text-amber-700">
                  {fixture.penaltyShootout.summary}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 min-w-0 flex-1 text-right">
              <div className="min-w-0">
                <div className="font-bold text-sm sm:text-lg truncate">
                  {awayTeam?.name || fixture.awayTeamId}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                  Away · {awayTeam?.code}
                </div>
              </div>
              {awayTeam && (
                <TeamEmblem team={awayTeam} className="w-10 h-10 object-contain" />
              )}
            </div>
          </div>

          {/* Match Stats Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/10 light:border-slate-200 p-4 space-y-3 bg-white/[0.02] light:bg-white">
              <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 light:text-slate-600">
                TEAM STATISTICS
              </h4>
              {[
                { label: 'Possession', h: `${possHome}%`, a: `${possAway}%`, pctH: possHome },
                {
                  label: 'Shots (On Target)',
                  h: `${fixture.shotsHome ?? 0} (${fixture.shotsOnTargetHome ?? 0})`,
                  a: `${fixture.shotsAway ?? 0} (${fixture.shotsOnTargetAway ?? 0})`,
                  pctH:
                    (fixture.shotsHome ?? 0) + (fixture.shotsAway ?? 0) > 0
                      ? ((fixture.shotsHome ?? 0) /
                          ((fixture.shotsHome ?? 0) + (fixture.shotsAway ?? 0))) *
                        100
                      : 50,
                },
                {
                  label: 'Expected Goals (xG)',
                  h: (fixture.xgHome ?? 0).toFixed(2),
                  a: (fixture.xgAway ?? 0).toFixed(2),
                  pctH:
                    (fixture.xgHome ?? 0) + (fixture.xgAway ?? 0) > 0
                      ? ((fixture.xgHome ?? 0) /
                          ((fixture.xgHome ?? 0) + (fixture.xgAway ?? 0))) *
                        100
                      : 50,
                },
                ...(typeof fixture.cornersHome === 'number' || fullOutput
                  ? [
                      {
                        label: 'Corners',
                        h: String(fixture.cornersHome ?? fullOutput?.homeStats.corners ?? 0),
                        a: String(fixture.cornersAway ?? fullOutput?.awayStats.corners ?? 0),
                        pctH: (() => {
                          const cH = fixture.cornersHome ?? fullOutput?.homeStats.corners ?? 0;
                          const cA = fixture.cornersAway ?? fullOutput?.awayStats.corners ?? 0;
                          return cH + cA > 0 ? (cH / (cH + cA)) * 100 : 50;
                        })(),
                      },
                      {
                        label: 'Fouls Committed',
                        h: String(fixture.foulsHome ?? fullOutput?.homeStats.fouls ?? 0),
                        a: String(fixture.foulsAway ?? fullOutput?.awayStats.fouls ?? 0),
                        pctH: (() => {
                          const fH = fixture.foulsHome ?? fullOutput?.homeStats.fouls ?? 0;
                          const fA = fixture.foulsAway ?? fullOutput?.awayStats.fouls ?? 0;
                          return fH + fA > 0 ? (fH / (fH + fA)) * 100 : 50;
                        })(),
                      },
                    ]
                  : []),
              ].map((stat) => (
                <div key={stat.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                    <span className="font-bold text-white light:text-slate-900">{stat.h}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                      {stat.label}
                    </span>
                    <span className="font-bold text-white light:text-slate-900">{stat.a}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 light:bg-slate-200 overflow-hidden flex">
                    <div
                      className="h-full bg-[#7ADBF0] light:bg-cyan-600"
                      style={{ width: `${Math.max(8, Math.min(92, stat.pctH))}%` }}
                    />
                  </div>
                </div>
              ))}

              {fixture.penaltyShootout?.kicks && fixture.penaltyShootout.kicks.length > 0 && (
                <div className="pt-2 border-t border-white/10 light:border-slate-200 space-y-1.5">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-amber-400 light:text-amber-700">
                    PENALTY SHOOTOUT
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {fixture.penaltyShootout.kicks.map((k, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between px-2 py-1 rounded bg-white/[0.03] light:bg-slate-100 ${
                          k.outcome === 'scored' ? 'text-emerald-300 light:text-emerald-700' : 'text-rose-400 light:text-rose-700'
                        }`}
                      >
                        <span className="truncate">
                          {k.round}. {k.takerName}
                        </span>
                        <span className="font-mono font-bold">{k.outcome === 'scored' ? '✓' : '✕'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Key Match Events Timeline */}
            <div className="rounded-xl border border-white/10 light:border-slate-200 p-4 space-y-2.5 bg-white/[0.02] light:bg-white">
              <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 light:text-slate-600">
                MATCH TIMELINE ({events.length} EVENTS)
              </h4>
              {events.length === 0 ? (
                <p className="text-xs text-slate-400 light:text-slate-600">
                  No major incidents recorded in this fixture.
                </p>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {events.map((ev) => {
                    const isHome = ev.teamSide === 'home';
                    const icon =
                      ev.type === 'goal' ? (
                        <Target className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600 shrink-0" />
                      ) : ev.type === 'yellow' ? (
                        <span className="w-2.5 h-3.5 rounded-[2px] bg-amber-400 shrink-0" />
                      ) : ev.type === 'red' ? (
                        <span className="w-2.5 h-3.5 rounded-[2px] bg-rose-500 shrink-0" />
                      ) : ev.type === 'injury' ? (
                        <HeartPulse className="w-3.5 h-3.5 text-rose-400 light:text-rose-600 shrink-0" />
                      ) : ev.type === 'sub' ? (
                        <RefreshCw className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700 shrink-0" />
                      ) : (
                        <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      );
                    return (
                      <div
                        key={ev.id}
                        className="flex items-start gap-2.5 text-xs py-1 border-b border-white/[0.05] light:border-slate-100 last:border-0"
                      >
                        <span className="font-mono text-[11px] font-bold text-slate-400 light:text-slate-600 tabular-nums w-9 shrink-0">
                          {ev.minute}&apos;{ev.addedMinute ? `+${ev.addedMinute}` : ''}
                        </span>
                        <div className="pt-0.5">{icon}</div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-white light:text-slate-900 truncate">
                            {ev.headline}
                          </div>
                          <div className="text-[11px] text-slate-400 light:text-slate-600 truncate">
                            {isHome ? homeTeam?.code : awayTeam?.code}
                            {ev.assistPlayerName ? ` · Assist: ${ev.assistPlayerName}` : ''}
                            {ev.secondaryPlayerName ? ` · Off: ${ev.secondaryPlayerName}` : ''}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Squad Lineups & Player Telemetry */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: homeTeam?.name || 'Home XI', rows: homePerfs },
              { label: awayTeam?.name || 'Away XI', rows: awayPerfs },
            ].map((side) => (
              <div
                key={side.label}
                className="rounded-xl border border-white/10 light:border-slate-200 p-4 space-y-2.5 bg-white/[0.02] light:bg-white"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 light:text-slate-600">
                    {side.label}
                  </h4>
                  <span className="font-mono text-[10px] text-slate-500">MIN · G · A · RTG</span>
                </div>
                <div className="divide-y divide-white/[0.05] light:divide-slate-100 max-h-64 overflow-y-auto">
                  {side.rows.map((p) => (
                    <div
                      key={p.playerId}
                      className="py-1.5 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] text-slate-500 w-7 shrink-0">
                          {p.positionDetail}
                        </span>
                        <span className="truncate font-medium">
                          {p.shortName || p.playerName}
                          {!p.started && (
                            <span className="text-[10px] text-slate-500 ml-1">(Sub)</span>
                          )}
                        </span>
                        {p.isMotm && (
                          <span title="Man of the Match">
                            <Award className="w-3.5 h-3.5 text-amber-400 light:text-amber-600 shrink-0" />
                          </span>
                        )}
                        {p.injured && (
                          <span title="Injured during match">
                            <Activity className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px] tabular-nums shrink-0">
                        <span className="text-slate-500">{p.minutesPlayed}&apos;</span>
                        <span className={p.goals > 0 ? 'text-emerald-400 light:text-emerald-700 font-bold' : 'text-slate-500'}>
                          {p.goals}
                        </span>
                        <span className={p.assists > 0 ? 'text-[#7ADBF0] light:text-cyan-700 font-bold' : 'text-slate-500'}>
                          {p.assists}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold ${
                            p.rating >= 8
                              ? 'bg-emerald-500/20 text-emerald-300 light:bg-emerald-100 light:text-emerald-800'
                              : 'bg-white/[0.06] light:bg-slate-100 text-slate-200 light:text-slate-800'
                          }`}
                        >
                          {p.rating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
