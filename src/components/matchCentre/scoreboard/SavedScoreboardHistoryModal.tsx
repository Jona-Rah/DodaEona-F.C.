import React, { useDeferredValue, useMemo, useState } from 'react';
import { X, History, Trash2, Calendar, Trophy, ChevronRight, Search, Play } from 'lucide-react';
import { ScoreboardMatchRecord } from '../../../types/scoreboard';
import { normalizeDatabaseSearchText } from '../../../utils/globalDatabaseSearch';

interface SavedScoreboardHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedMatches: ScoreboardMatchRecord[];
  onLoadMatch: (record: ScoreboardMatchRecord) => void;
  onDeleteMatch: (id: string) => void;
}

export const SavedScoreboardHistoryModal: React.FC<SavedScoreboardHistoryModalProps> = ({
  isOpen,
  onClose,
  savedMatches,
  onLoadMatch,
  onDeleteMatch,
}) => {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    const q = normalizeDatabaseSearchText(deferredSearch);
    if (!q) return savedMatches;
    return savedMatches.filter((m) => {
      return (
        normalizeDatabaseSearchText(m.homeTeam.name).includes(q) ||
        normalizeDatabaseSearchText(m.awayTeam.name).includes(q) ||
        normalizeDatabaseSearchText(m.config.matchName).includes(q) ||
        normalizeDatabaseSearchText(m.outcomeDescription).includes(q)
      );
    });
  }, [savedMatches, deferredSearch]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[85vh] my-auto flex flex-col rounded-2xl bg-[#070F1B] light:bg-white border border-[#7ADBF0]/30 light:border-slate-300 shadow-2xl overflow-hidden text-slate-100 light:text-slate-900 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow Ribbon */}
        <div className="h-1 w-full bg-gradient-to-r from-[#0891B2] via-[#7ADBF0] to-[#D6B56E] shrink-0" />

        {/* Modal Header */}
        <div className="p-5 landscape-mobile:p-3 pb-3 landscape-mobile:pb-2.5 flex items-center justify-between border-b border-white/10 light:border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white light:text-slate-900">
                ScoreBoard Match History
              </h3>
              <p className="text-xs text-slate-400 light:text-slate-500">
                Saved match records, goals timeline, and results
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-white/5 light:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 landscape-mobile:p-3 border-b border-white/10 light:border-slate-200 shrink-0 bg-[#050A12]/50 light:bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim() && filtered.length > 0) {
                  e.preventDefault();
                  onLoadMatch(filtered[0]);
                  onClose();
                }
              }}
              placeholder="Search saved matches by team name, tournament or result..."
              className="w-full bg-[#0B1525] light:bg-white border border-white/10 light:border-slate-300 text-xs sm:text-sm text-white light:text-slate-900 placeholder:text-slate-500 rounded-xl pl-10 pr-9 py-2.5 focus:outline-none focus:border-[#7ADBF0] transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-1 rounded-md text-slate-400 hover:text-white light:hover:text-slate-900 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                aria-label="Clear saved match search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Matches List */}
        <div className="flex-1 overflow-y-auto p-4 landscape-mobile:p-3 space-y-3">
          {savedMatches.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <History className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="font-bold text-sm text-slate-300 light:text-slate-700">
                No Saved Matches Yet
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Complete a match on the ScoreBoard and click &ldquo;Save Completed Match&rdquo; to store it here.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No saved matches match &ldquo;{search}&rdquo;.
            </div>
          ) : (
            filtered.map((record) => {
              const formattedDate = new Date(record.savedAt || record.date).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={record.id}
                  className="rounded-xl bg-[#0B1525] light:bg-slate-50 border border-white/10 light:border-slate-200 p-4 hover:border-[#7ADBF0]/40 transition-all space-y-3"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formattedDate}</span>
                      {record.config.matchName && (
                        <span className="font-semibold text-slate-300 light:text-slate-600">
                          · {record.config.matchName}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 light:bg-slate-200 uppercase font-semibold text-[#7ADBF0] light:text-cyan-700">
                      {record.wentToPenalties ? 'Penalties' : record.wentToExtraTime ? 'Extra Time' : 'Normal Time'}
                    </span>
                  </div>

                  {/* Match Score Row */}
                  <div className="flex items-center justify-between gap-4">
                    {/* Home Team */}
                    <div className="flex-1 flex items-center justify-end gap-3 min-w-0">
                      <div className="text-right min-w-0">
                        <div className="font-bold text-sm sm:text-base text-white light:text-slate-900 truncate">
                          {record.homeTeam.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{record.homeTeam.code}</div>
                      </div>
                      <img
                        src={record.homeTeam.crestUrl}
                        alt={record.homeTeam.name}
                        className="w-8 h-8 object-contain shrink-0"
                      />
                    </div>

                    {/* Score Center */}
                    <div className="px-4 py-1.5 rounded-xl bg-black/40 light:bg-slate-200 border border-white/10 light:border-slate-300 flex items-center gap-2">
                      <span className="font-display text-2xl text-white light:text-slate-900">
                        {record.homeScore}
                      </span>
                      <span className="font-bold text-slate-500">:</span>
                      <span className="font-display text-2xl text-white light:text-slate-900">
                        {record.awayScore}
                      </span>
                    </div>

                    {/* Away Team */}
                    <div className="flex-1 flex items-center justify-start gap-3 min-w-0">
                      <img
                        src={record.awayTeam.crestUrl}
                        alt={record.awayTeam.name}
                        className="w-8 h-8 object-contain shrink-0"
                      />
                      <div className="text-left min-w-0">
                        <div className="font-bold text-sm sm:text-base text-white light:text-slate-900 truncate">
                          {record.awayTeam.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">{record.awayTeam.code}</div>
                      </div>
                    </div>
                  </div>

                  {/* Outcome line */}
                  <div className="text-xs text-slate-300 light:text-slate-600 font-medium text-center">
                    {record.outcomeDescription}
                  </div>

                  {/* Goals summary preview if any */}
                  {record.goals && record.goals.length > 0 && (
                    <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-2 pt-1 border-t border-white/5 light:border-slate-200">
                      {record.goals.map((g) => (
                        <span key={g.id} className="inline-flex items-center gap-1">
                          <span>⚽</span>
                          <span>{g.scorerName}</span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {g.minute}&apos;{g.stoppageMinute ? `+${g.stoppageMinute}` : ''}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pt-2 flex items-center justify-between border-t border-white/5 light:border-slate-200">
                    <button
                      type="button"
                      onClick={() => onDeleteMatch(record.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onLoadMatch(record);
                        onClose();
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-[#7ADBF0] text-[#050A12] font-bold text-xs hover:bg-[#8ee1f3] flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Load into ScoreBoard</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 landscape-mobile:py-2.5 landscape-mobile:px-4 border-t border-white/10 light:border-slate-200 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>{savedMatches.length} match records saved</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
