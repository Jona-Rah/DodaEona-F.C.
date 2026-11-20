import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeftRight, Disc, Flame, MessageSquareText, Shield, Target } from 'lucide-react';
import { Team } from '../../../types/matchCentre';
import { normalizeHex } from '../dossier/dossierUtils';
import type {
  CompleteSimulationOutput,
  SimMatchPhase,
  SimMomentumPoint,
  SimTimelineEvent,
} from '../../../types/simulation';
import { MomentumChart } from './MomentumChart';

interface FactsTabProps {
  output: CompleteSimulationOutput;
  homeTeam: Team;
  awayTeam: Team;
  phase: SimMatchPhase;
  currentMinute: number;
  currentAddedMinute?: number;
  visibleHomeScore: number;
  visibleAwayScore: number;
  visibleMomentum: SimMomentumPoint[];
  visibleEvents: SimTimelineEvent[];
}

function isPenaltyEvent(ev: SimTimelineEvent): boolean {
  return Boolean(
    ev.isPenalty ||
      /\(P\)/i.test(ev.headline || '') ||
      /\bpenalty\b/i.test(ev.commentary || '')
  );
}

function formatHeadlineWithPenalty(ev: SimTimelineEvent): string {
  const headline = ev.headline || '';
  if (!isPenaltyEvent(ev) || /\(P\)/i.test(headline)) return headline;
  return `${headline} (P)`;
}

export const FactsTab: React.FC<FactsTabProps> = ({
  output,
  homeTeam,
  awayTeam,
  phase,
  currentMinute,
  currentAddedMinute = 0,
  visibleHomeScore,
  visibleAwayScore,
  visibleMomentum,
  visibleEvents,
}) => {
  const homeColor = normalizeHex(homeTeam.primaryColor || '#EF4444');
  const awayColor = normalizeHex(awayTeam.primaryColor || '#38BDF8');

  const keyMoments = visibleEvents.filter((e) => e.isKeyMoment);

  return (
    <div className="space-y-4">
      <MomentumChart
        output={output}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        phase={phase}
        currentMinute={currentMinute}
        currentAddedMinute={currentAddedMinute}
        visibleHomeScore={visibleHomeScore}
        visibleAwayScore={visibleAwayScore}
        visibleMomentum={visibleMomentum}
        visibleEvents={visibleEvents}
      />

      {/* Key Moments & Full Chronological Match Timeline */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 lg:grid-cols-2 gap-4 landscape-mobile:gap-3">
        <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 landscape-mobile:p-3 space-y-3">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-white light:text-slate-900">
            <Flame className="w-4 h-4 text-amber-400 light:text-amber-600" />
            <span>Key Moments ({keyMoments.length})</span>
          </div>
          <div className="space-y-2 max-h-72 landscape-mobile:max-h-48 overflow-y-auto pr-1">
            {keyMoments.map((ev) => (
              <div
                key={ev.id}
                className="p-2.5 rounded-xl bg-slate-950/80 light:bg-slate-50 border border-white/[0.07] light:border-slate-200 flex items-start gap-3"
              >
                <span className="font-mono text-xs font-black text-cyan-300 light:text-cyan-700 w-11 shrink-0 pt-0.5">
                  {ev.addedMinute ? `${ev.minute}+${ev.addedMinute}'` : `${ev.minute}'`}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white light:text-slate-900">{formatHeadlineWithPenalty(ev)}</div>
                  <div className="text-[11px] text-slate-400 light:text-slate-600 mt-0.5">{ev.commentary}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 landscape-mobile:p-3 space-y-3">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-white light:text-slate-900">
            <Target className="w-4 h-4 text-emerald-400 light:text-emerald-600" />
            <span>Match Timeline ({visibleEvents.length})</span>
          </div>
          <div className="space-y-1.5 max-h-72 landscape-mobile:max-h-48 overflow-y-auto pr-1">
            {[...visibleEvents].reverse().map((ev) => (
              <div
                key={ev.id}
                className="px-3 py-2 rounded-lg bg-slate-950/60 light:bg-slate-50 border border-white/[0.05] light:border-slate-200 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono text-[11px] font-bold text-slate-400 light:text-slate-600 w-10 shrink-0">
                    {ev.addedMinute ? `${ev.minute}+${ev.addedMinute}'` : `${ev.minute}'`}
                  </span>
                  {ev.teamSide && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: ev.teamSide === 'home' ? homeColor : awayColor }}
                    />
                  )}
                  <span className="text-slate-200 light:text-slate-800 font-medium truncate">{formatHeadlineWithPenalty(ev)}</span>
                </div>
                {typeof ev.xg === 'number' && (
                  <span className="font-mono text-[10px] text-slate-400 light:text-slate-600 shrink-0">
                    {ev.xg.toFixed(2)} xG
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface CommentaryTabProps {
  visibleEvents: SimTimelineEvent[];
  homeTeam: Team;
  awayTeam: Team;
}

export const CommentaryTab: React.FC<CommentaryTabProps> = ({
  visibleEvents,
  homeTeam,
  awayTeam,
}) => {
  const [filter, setFilter] = useState<'all' | 'key' | 'goals-cards' | 'subs'>('all');
  const homeColor = normalizeHex(homeTeam.primaryColor || '#EF4444');
  const awayColor = normalizeHex(awayTeam.primaryColor || '#38BDF8');

  const filtered = useMemo(() => {
    const list = [...visibleEvents].reverse();
    if (filter === 'key') return list.filter((e) => e.isKeyMoment);
    if (filter === 'goals-cards') {
      return list.filter((e) =>
        ['goal', 'own-goal', 'penalty-missed', 'yellow', 'red', 'second-yellow', 'woodwork'].includes(e.type)
      );
    }
    if (filter === 'subs') {
      return list.filter((e) => e.type === 'sub' || e.type === 'tactical-change');
    }
    return list;
  }, [visibleEvents, filter]);

  const iconForType = (t: SimTimelineEvent['type']) => {
    if (t === 'goal' || t === 'own-goal') return <Disc className="w-4 h-4 text-emerald-400 light:text-emerald-600" />;
    if (t === 'yellow') return <span className="inline-block w-3 h-4 rounded-xs bg-amber-400" />;
    if (t === 'red' || t === 'second-yellow')
      return <span className="inline-block w-3 h-4 rounded-xs bg-rose-500" />;
    if (t === 'sub') return <ArrowLeftRight className="w-4 h-4 text-cyan-400 light:text-cyan-600" />;
    if (t === 'shot-saved') return <Shield className="w-4 h-4 text-sky-400 light:text-sky-600" />;
    if (t === 'woodwork' || t === 'big-chance-missed' || t === 'penalty-missed')
      return <AlertTriangle className="w-4 h-4 text-amber-300 light:text-amber-600" />;
    return <MessageSquareText className="w-4 h-4 text-slate-400 light:text-slate-600" />;
  };

  return (
    <div className="rounded-2xl bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-300 p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-mono text-xs font-bold uppercase tracking-widest text-white light:text-slate-900">
          Live Broadcast Commentary ({filtered.length})
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'all', label: 'All Commentary' },
              { id: 'key', label: 'Key Moments' },
              { id: 'goals-cards', label: 'Goals & Cards' },
              { id: 'subs', label: 'Subs & Tactics' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1 rounded-full font-mono text-[10px] font-bold uppercase border cursor-pointer ${
                filter === f.id
                  ? 'bg-cyan-500/20 light:bg-cyan-100 border-cyan-400 light:border-cyan-600 text-cyan-200 light:text-cyan-900'
                  : 'bg-white/[0.03] light:bg-slate-100 border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5 max-h-[520px] landscape-mobile:max-h-[260px] overflow-y-auto pr-1">
        {filtered.map((ev) => (
          <div
            key={ev.id}
            className={`p-3 rounded-xl border flex items-start gap-3 ${
              ev.type === 'goal'
                ? 'bg-emerald-950/25 light:bg-emerald-50 border-emerald-400/35 light:border-emerald-300'
                : 'bg-slate-950/70 light:bg-slate-50 border-white/[0.07] light:border-slate-200'
            }`}
          >
            <div className="w-12 shrink-0 flex flex-col items-center gap-1 pt-0.5">
              <span className="font-mono text-xs font-black text-white light:text-slate-900">
                {ev.addedMinute ? `${ev.minute}+${ev.addedMinute}'` : `${ev.minute}'`}
              </span>
              <span className="font-mono text-[9px] text-slate-500 light:text-slate-500">{ev.period}</span>
            </div>

            <div className="mt-0.5 shrink-0">{iconForType(ev.type)}</div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {ev.teamSide && (
                  <span
                    className="px-1.5 py-0.5 rounded font-mono text-[9px] font-black uppercase text-white"
                    style={{ backgroundColor: ev.teamSide === 'home' ? homeColor : awayColor }}
                  >
                    {ev.teamSide === 'home' ? homeTeam.code : awayTeam.code}
                  </span>
                )}
                <span className="text-xs font-bold text-white light:text-slate-900">{formatHeadlineWithPenalty(ev)}</span>
                {typeof ev.xg === 'number' && (
                  <span className="font-mono text-[10px] text-cyan-300 light:text-cyan-700 font-semibold">
                    ({ev.xg.toFixed(2)} xG)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 light:text-slate-700 mt-1 leading-relaxed">{ev.commentary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
