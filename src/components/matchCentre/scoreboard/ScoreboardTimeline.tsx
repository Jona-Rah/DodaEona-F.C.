import React from 'react';
import { Plus, Edit2, Trash2, Clock, Trophy, AlertCircle, ArrowUpRight } from 'lucide-react';
import { ScoreboardGoal } from '../../../types/scoreboard';
import { Team } from '../../../types/matchCentre';

interface ScoreboardTimelineProps {
  goals: ScoreboardGoal[];
  homeTeam: Team;
  awayTeam: Team;
  currentMatchMinute: number;
  onOpenAddGoalModal: (side: 'home' | 'away') => void;
  onEditGoal: (goal: ScoreboardGoal) => void;
  onDeleteGoal: (goalId: string) => void;
}

export const ScoreboardTimeline: React.FC<ScoreboardTimelineProps> = ({
  goals,
  homeTeam,
  awayTeam,
  currentMatchMinute,
  onOpenAddGoalModal,
  onEditGoal,
  onDeleteGoal,
}) => {
  // Sort goals chronologically: minute ascending, then stoppage minute, then createdAt
  const sortedGoals = [...goals].sort((a, b) => {
    if (a.minute !== b.minute) return a.minute - b.minute;
    const aStop = a.stoppageMinute || 0;
    const bStop = b.stoppageMinute || 0;
    if (aStop !== bStop) return aStop - bStop;
    return a.createdAt.localeCompare(b.createdAt);
  });

  const getGoalTypeBadge = (type: ScoreboardGoal['type']) => {
    switch (type) {
      case 'penalty':
        return <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 light:text-amber-800 text-[10px] font-mono">🎯 Penalty</span>;
      case 'free_kick':
        return <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 light:text-cyan-800 text-[10px] font-mono">🚀 Free Kick</span>;
      case 'header':
        return <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 light:text-purple-800 text-[10px] font-mono">👤 Header</span>;
      case 'own_goal':
        return <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 light:text-rose-800 text-[10px] font-mono font-bold">🔴 Own Goal</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 light:text-emerald-800 text-[10px] font-mono">⚽ Open Play</span>;
    }
  };

  return (
    <div className="rounded-2xl bg-[#070F1B] light:bg-white border border-[#7ADBF0]/30 light:border-slate-300 shadow-xl overflow-hidden transition-all">
      {/* Timeline Header */}
      <div className="p-4 sm:p-5 landscape-mobile:p-3.5 border-b border-white/10 light:border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-[#0B1525]/60 light:bg-slate-50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#050A12] light:bg-slate-100 border border-white/10 light:border-slate-300 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white light:text-slate-900">
              Match Timeline &amp; Goal Log
            </h3>
            <p className="text-xs text-slate-400 light:text-slate-500">
              Chronological feed of goals, scorers, assists and match events ({goals.length} goals recorded)
            </p>
          </div>
        </div>

        {/* Quick Add Goal Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenAddGoalModal('home')}
            className="px-3 py-1.5 rounded-xl bg-[#050A12] light:bg-slate-100 hover:bg-[#7ADBF0]/15 border border-[#7ADBF0]/30 text-white light:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:border-[#7ADBF0]"
          >
            <Plus className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
            <span>+ Goal {homeTeam.code}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenAddGoalModal('away')}
            className="px-3 py-1.5 rounded-xl bg-[#050A12] light:bg-slate-100 hover:bg-[#D6B56E]/15 border border-[#D6B56E]/30 text-white light:text-slate-900 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:border-[#D6B56E]"
          >
            <Plus className="w-3.5 h-3.5 text-[#D6B56E] light:text-amber-700" />
            <span>+ Goal {awayTeam.code}</span>
          </button>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="p-4 sm:p-6 landscape-mobile:p-3.5">
        {sortedGoals.length === 0 ? (
          <div className="py-12 landscape-mobile:py-6 text-center space-y-2">
            <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="font-semibold text-sm text-slate-300 light:text-slate-700">
              No Goals Recorded Yet
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Click &ldquo;+ Goal&rdquo; above or on the team scoreboard cards to record goals with scorers, assists, and minute stamps.
            </p>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 space-y-4 landscape-mobile:space-y-2.5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-[#7ADBF0] before:via-white/20 before:to-[#D6B56E]">
            {sortedGoals.map((goal) => {
              const isHome = goal.teamSide === 'home';
              const team = isHome ? homeTeam : awayTeam;

              return (
                <div
                  key={goal.id}
                  className="relative group p-3.5 sm:p-4 landscape-mobile:p-2.5 rounded-xl bg-[#0B1525] light:bg-slate-50 border border-white/10 light:border-slate-200 hover:border-[#7ADBF0]/40 transition-all flex flex-col sm:flex-row landscape-mobile:flex-row sm:items-center landscape-mobile:items-center justify-between gap-3"
                >
                  {/* Timeline Node Dot */}
                  <div
                    className={`absolute -left-[27px] sm:-left-[35px] top-4 w-4 h-4 rounded-full border-2 border-[#070F1B] light:border-white shadow flex items-center justify-center text-[8px] ${
                      isHome ? 'bg-[#7ADBF0]' : 'bg-[#D6B56E]'
                    }`}
                  />

                  {/* Goal Info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-[#050A12] light:bg-slate-200 border border-white/10 light:border-slate-300 flex items-center justify-center p-1 shrink-0">
                      <img src={team.crestUrl} alt={team.name} className="w-full h-full object-contain" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#7ADBF0] light:text-cyan-800">
                          {goal.minute}&apos;
                          {goal.stoppageMinute ? `+${goal.stoppageMinute}` : ''}
                        </span>
                        <span className="font-bold text-sm text-white light:text-slate-900 truncate">
                          {goal.scorerName}
                        </span>
                        {getGoalTypeBadge(goal.type)}
                      </div>

                      <div className="text-xs text-slate-400 light:text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="font-semibold text-slate-300 light:text-slate-700">{team.name}</span>
                        {goal.assistName && (
                          <span>
                            · Assist: <strong className="text-slate-200 light:text-slate-800">{goal.assistName}</strong>
                          </span>
                        )}
                        {goal.type === 'own_goal' && (
                          <span className="text-rose-400 text-[11px] italic">
                            (Points given to {isHome ? awayTeam.name : homeTeam.name})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditGoal(goal)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-white/5 light:hover:bg-slate-200 transition-colors cursor-pointer"
                      title="Edit Goal"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
