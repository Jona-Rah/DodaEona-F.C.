import React, { useState, useEffect } from 'react';
import { X, Clock, Settings, Check } from 'lucide-react';
import { ScoreboardMatchConfig } from '../../../types/scoreboard';

interface ScoreboardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ScoreboardMatchConfig;
  onSaveConfig: (newConfig: ScoreboardMatchConfig) => void;
  isMatchInProgress: boolean;
}

const HALF_MINUTE_PRESETS = [5, 10, 15, 20, 25, 30, 45];
const EXTRA_TIME_PRESETS = [5, 10, 15];

export const ScoreboardSettingsModal: React.FC<ScoreboardSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  isMatchInProgress,
}) => {
  const [minutesPerHalf, setMinutesPerHalf] = useState<number>(config.minutesPerHalf);
  const [extraTimeMinutes, setExtraTimeMinutes] = useState<number>(config.extraTimeMinutesPerHalf);
  const [enableExtraTime, setEnableExtraTime] = useState<boolean>(config.enableExtraTimeIfTied);
  const [enablePenalties, setEnablePenalties] = useState<boolean>(config.enablePenaltiesIfTied);
  const [matchName, setMatchName] = useState<string>(config.matchName || '');
  const [venue, setVenue] = useState<string>(config.venue || '');

  // Synchronize internal state whenever config updates or modal opens
  useEffect(() => {
    if (isOpen) {
      setMinutesPerHalf(config.minutesPerHalf || 45);
      setExtraTimeMinutes(config.extraTimeMinutesPerHalf || 15);
      setEnableExtraTime(config.enableExtraTimeIfTied ?? true);
      setEnablePenalties(config.enablePenaltiesIfTied ?? true);
      setMatchName(config.matchName || '');
      setVenue(config.venue || '');
    }
  }, [isOpen, config]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveConfig({
      minutesPerHalf: Math.max(1, Math.min(90, Number(minutesPerHalf) || 45)),
      extraTimeMinutesPerHalf: Math.max(1, Math.min(30, Number(extraTimeMinutes) || 15)),
      enableExtraTimeIfTied: enableExtraTime,
      enablePenaltiesIfTied: enablePenalties,
      matchName: matchName.trim() || undefined,
      venue: venue.trim() || undefined,
    });
    onClose();
  };

  const fullTimeMinutes = (Number(minutesPerHalf) || 45) * 2;
  const totalExtraTimeMinutes = (Number(extraTimeMinutes) || 15) * 2;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scoreboard-settings-modal-title"
      aria-describedby="scoreboard-settings-modal-desc"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] my-auto flex flex-col rounded-2xl bg-[#070F1B] light:bg-white border border-[#7ADBF0]/30 light:border-slate-300 shadow-2xl overflow-hidden text-slate-100 light:text-slate-900 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header bar */}
        <div className="h-1 w-full bg-gradient-to-r from-[#0891B2] via-[#7ADBF0] to-[#D6B56E] shrink-0" />

        {/* Modal Header (Pinned at top) */}
        <div className="p-5 landscape-mobile:p-3.5 sm:p-6 pb-4 landscape-mobile:pb-3 flex items-center justify-between border-b border-white/10 light:border-slate-200 shrink-0 bg-[#070F1B] light:bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-200 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="scoreboard-settings-modal-title"
                className="font-bold text-base text-white light:text-slate-900"
              >
                ScoreBoard Match Settings
              </h3>
              <p
                id="scoreboard-settings-modal-desc"
                className="text-xs text-slate-400 light:text-slate-500"
              >
                Configure half durations and overtime rules
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-white/5 light:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container: Flex column with scrollable body & pinned footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 landscape-mobile:p-3.5 sm:p-6 space-y-5 landscape-mobile:space-y-3.5 overscroll-contain">
            {isMatchInProgress && (
              <div className="rounded-xl p-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 light:text-amber-800 flex items-center gap-2 text-xs">
                <Clock className="w-4 h-4 shrink-0" />
                <span>Match is in progress. Updating half duration adjusts clock thresholds.</span>
              </div>
            )}

            {/* Minutes per Half */}
            <div>
              <label className="block font-semibold text-slate-300 light:text-slate-700 mb-2">
                Minutes Per Half:{' '}
                <span className="font-mono text-[#7ADBF0] light:text-cyan-700 text-sm font-bold">
                  {minutesPerHalf}m
                </span>{' '}
                <span className="text-slate-400 light:text-slate-600 font-normal">
                  (Full time: {fullTimeMinutes}m)
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {HALF_MINUTE_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMinutesPerHalf(m)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold cursor-pointer transition-all ${
                      minutesPerHalf === m
                        ? 'bg-[#7ADBF0] text-[#050A12] shadow-sm font-bold'
                        : 'bg-[#0B1525] light:bg-slate-100 text-slate-300 light:text-slate-700 border border-white/10 light:border-slate-200 hover:border-[#7ADBF0]/50'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 light:text-slate-600">Custom:</span>
                <input
                  type="number"
                  min="1"
                  max="90"
                  value={minutesPerHalf || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setMinutesPerHalf(isNaN(val) ? 0 : Math.max(1, Math.min(90, val)));
                  }}
                  className="w-20 px-3 py-1.5 rounded-lg bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 text-white light:text-slate-900 font-mono text-center focus:outline-none focus:border-[#7ADBF0]"
                />
                <span className="text-slate-400 light:text-slate-600">minutes per half</span>
              </div>
            </div>

            {/* Extra Time Duration */}
            <div>
              <label className="block font-semibold text-slate-300 light:text-slate-700 mb-2">
                Extra Time Duration Per Half:{' '}
                <span className="font-mono text-[#D6B56E] light:text-amber-700 text-sm font-bold">
                  {extraTimeMinutes}m
                </span>{' '}
                <span className="text-slate-400 light:text-slate-600 font-normal">
                  (Total ET: {totalExtraTimeMinutes}m)
                </span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {EXTRA_TIME_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setExtraTimeMinutes(m)}
                    className={`px-3 py-1.5 rounded-lg font-mono text-xs font-semibold cursor-pointer transition-all ${
                      extraTimeMinutes === m
                        ? 'bg-[#D6B56E] text-[#050A12] shadow-sm font-bold'
                        : 'bg-[#0B1525] light:bg-slate-100 text-slate-300 light:text-slate-700 border border-white/10 light:border-slate-200 hover:border-[#D6B56E]/50'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 light:text-slate-600">Custom:</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={extraTimeMinutes || ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setExtraTimeMinutes(isNaN(val) ? 0 : Math.max(1, Math.min(30, val)));
                  }}
                  className="w-20 px-3 py-1.5 rounded-lg bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 text-white light:text-slate-900 font-mono text-center focus:outline-none focus:border-[#D6B56E]"
                />
                <span className="text-slate-400 light:text-slate-600">minutes per extra-time half</span>
              </div>
            </div>

            {/* Overtime & Shootout Rules */}
            <div className="space-y-3 pt-3 border-t border-white/10 light:border-slate-200">
              <label className="flex items-start justify-between cursor-pointer group gap-3">
                <div>
                  <div className="font-semibold text-white light:text-slate-900 group-hover:text-[#7ADBF0] transition-colors">
                    Extra Time if Level at Full Time ({fullTimeMinutes}m)
                  </div>
                  <div className="text-[11px] text-slate-400 light:text-slate-600 mt-0.5">
                    Allow two extra-time halves if scores are tied after normal regulation ({fullTimeMinutes}m)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enableExtraTime}
                  onChange={(e) => setEnableExtraTime(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[#7ADBF0] cursor-pointer shrink-0"
                />
              </label>

              <label className="flex items-start justify-between cursor-pointer group gap-3">
                <div>
                  <div className="font-semibold text-white light:text-slate-900 group-hover:text-[#7ADBF0] transition-colors">
                    Penalty Shootout &amp; Sudden Death
                  </div>
                  <div className="text-[11px] text-slate-400 light:text-slate-600 mt-0.5">
                    Trigger 5 kicks + sudden death if match remains tied after extra time
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={enablePenalties}
                  onChange={(e) => setEnablePenalties(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[#7ADBF0] cursor-pointer shrink-0"
                />
              </label>
            </div>

            {/* Match Title & Venue */}
            <div className="space-y-3 pt-3 border-t border-white/10 light:border-slate-200">
              <div>
                <label className="block text-slate-300 light:text-slate-700 font-semibold mb-1">
                  Match Title (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Club Championship Final, Friendly Exhibition"
                  value={matchName}
                  onChange={(e) => setMatchName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 text-white light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#7ADBF0]"
                />
              </div>
              <div>
                <label className="block text-slate-300 light:text-slate-700 font-semibold mb-1">
                  Venue / Stadium (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Santiago Bernabéu, Wembley Stadium"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 text-white light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#7ADBF0]"
                />
              </div>
            </div>
          </div>

          {/* Form Actions Footer (Pinned at bottom) */}
          <div className="p-4 landscape-mobile:py-2.5 landscape-mobile:px-4 sm:px-6 border-t border-white/10 light:border-slate-200 flex items-center justify-end gap-3 shrink-0 bg-[#070F1B]/95 light:bg-white/95 backdrop-blur-sm">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl font-semibold text-slate-300 hover:text-white light:text-slate-600 light:hover:text-slate-900 hover:bg-white/5 light:hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-bold bg-[#7ADBF0] hover:bg-[#8ee1f3] text-[#050A12] shadow-[0_0_15px_rgba(122,219,240,0.3)] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
