import React, { useState } from 'react';
import { Bookmark, FolderOpen, History, Trash2, X } from 'lucide-react';
import type { SimulationMatchRecord } from '../../../../server/types';
import type { CompleteSimulationOutput, SavedSimulationPayload } from '../../../types/simulation';

interface SavedMatchesModalProps {
  savedSimulations: SavedSimulationPayload[];
  recentMatches: SimulationMatchRecord[];
  onLoadSavedOutput: (output: CompleteSimulationOutput) => void;
  onDeleteSaved: (id: string) => void;
  onClose: () => void;
}

export const SavedMatchesModal: React.FC<SavedMatchesModalProps> = ({
  savedSimulations,
  recentMatches,
  onLoadSavedOutput,
  onDeleteSaved,
  onClose,
}) => {
  const [tab, setTab] = useState<'saved' | 'history'>('saved');

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 landscape-mobile:p-3">
      <div className="w-full max-w-2xl rounded-2xl bg-[#070E1A] light:bg-white border border-white/15 light:border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[82vh]">
        <div className="px-5 py-4 landscape-mobile:px-4 landscape-mobile:py-2.5 border-b border-white/10 light:border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-white light:text-slate-900">
            <FolderOpen className="w-4 h-4 text-amber-400 light:text-amber-600" />
            <span>Saved Matches & Simulation History</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/[0.05] light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pt-3 flex items-center gap-2 border-b border-white/10 light:border-slate-200 pb-3 landscape-mobile:px-4 landscape-mobile:py-2 shrink-0">
          <button
            type="button"
            onClick={() => setTab('saved')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold uppercase border cursor-pointer ${
              tab === 'saved'
                ? 'bg-emerald-500/20 light:bg-emerald-100 border-emerald-400 light:border-emerald-600 text-emerald-200 light:text-emerald-900'
                : 'bg-white/[0.03] light:bg-slate-100 border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Saved Matches ({savedSimulations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('history')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold uppercase border cursor-pointer ${
              tab === 'history'
                ? 'bg-cyan-500/20 light:bg-cyan-100 border-cyan-400 light:border-cyan-600 text-cyan-200 light:text-cyan-900'
                : 'bg-white/[0.03] light:bg-slate-100 border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Recent History ({recentMatches.length})</span>
          </button>
        </div>

        <div className="p-5 landscape-mobile:p-3.5 overflow-y-auto space-y-2.5 flex-1">
          {tab === 'saved' ? (
            savedSimulations.length === 0 ? (
              <p className="text-xs text-slate-400 light:text-slate-600 py-8 text-center">
                No saved matches yet. Simulate a match to Full-Time and click &ldquo;Save Match&rdquo; to bookmark its full report.
              </p>
            ) : (
              savedSimulations.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-950/80 light:bg-slate-50 border border-white/10 light:border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white light:text-slate-900 truncate">{item.label}</div>
                    <div className="font-mono text-[10px] text-slate-400 light:text-slate-600 mt-0.5">
                      Seed: {item.output.seed} · Saved {new Date(item.savedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onLoadSavedOutput(item.output);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-mono text-[11px] font-black uppercase cursor-pointer hover:bg-cyan-400"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSaved(item.id)}
                      className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 light:text-rose-700 cursor-pointer"
                      title="Delete saved match"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )
          ) : recentMatches.length === 0 ? (
            <p className="text-xs text-slate-400 light:text-slate-600 py-8 text-center">
              No completed match history recorded yet.
            </p>
          ) : (
            recentMatches.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl bg-slate-950/80 light:bg-slate-50 border border-white/10 light:border-slate-200 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="font-bold text-sm text-white light:text-slate-900 truncate">
                    {m.homeTeamName} {m.homeScore} - {m.awayScore} {m.awayTeamName}
                    {m.penaltySummary ? ` (${m.penaltySummary})` : ''}
                  </div>
                  <div className="font-mono text-[10px] text-slate-400 light:text-slate-600 mt-0.5">
                    {m.competitionName} · {m.date} · xG {m.xgHome.toFixed(2)} - {m.xgAway.toFixed(2)}
                    {m.seed ? ` · Seed ${m.seed}` : ''}
                  </div>
                </div>

                {m.fullPayload && (
                  <button
                    type="button"
                    onClick={() => {
                      onLoadSavedOutput(m.fullPayload as CompleteSimulationOutput);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/10 light:bg-slate-200 hover:bg-white/20 light:hover:bg-slate-300 border border-white/15 light:border-slate-300 font-mono text-[11px] font-bold text-white light:text-slate-900 shrink-0 cursor-pointer"
                  >
                    Open Report
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
