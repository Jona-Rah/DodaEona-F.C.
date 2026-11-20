import React, { useState, useEffect } from 'react';
import { X, Trophy, Trash2, Check, User, Clock } from 'lucide-react';
import { ScoreboardGoal } from '../../../types/scoreboard';
import { Team } from '../../../types/matchCentre';
import { playWhistle } from '../../../utils/scoreboardAudio';

interface GoalFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  homeTeam: Team;
  awayTeam: Team;
  initialSide?: 'home' | 'away';
  editingGoal?: ScoreboardGoal | null;
  currentMatchMinute: number;
  onSaveGoal: (goal: ScoreboardGoal) => void;
  onDeleteGoal?: (goalId: string) => void;
}

export const GoalFormModal: React.FC<GoalFormModalProps> = ({
  isOpen,
  onClose,
  homeTeam,
  awayTeam,
  initialSide = 'home',
  editingGoal,
  currentMatchMinute,
  onSaveGoal,
  onDeleteGoal,
}) => {
  const [teamSide, setTeamSide] = useState<'home' | 'away'>(initialSide);
  const [minute, setMinute] = useState<number>(currentMatchMinute || 1);
  const [stoppageMinute, setStoppageMinute] = useState<number | undefined>(undefined);
  const [scorerId, setScorerId] = useState<string>('');
  const [customScorerName, setCustomScorerName] = useState<string>('');
  const [assistId, setAssistId] = useState<string>('');
  const [customAssistName, setCustomAssistName] = useState<string>('');
  const [goalType, setGoalType] = useState<ScoreboardGoal['type']>('regular');

  useEffect(() => {
    if (editingGoal) {
      setTeamSide(editingGoal.teamSide);
      setMinute(editingGoal.minute);
      setStoppageMinute(editingGoal.stoppageMinute);
      setScorerId(editingGoal.scorerId || 'custom');
      setCustomScorerName(editingGoal.scorerName || '');
      setAssistId(editingGoal.assistId || (editingGoal.assistName ? 'custom' : 'none'));
      setCustomAssistName(editingGoal.assistName || '');
      setGoalType(editingGoal.type);
    } else {
      setTeamSide(initialSide);
      setMinute(Math.max(1, currentMatchMinute || 1));
      setStoppageMinute(undefined);
      setScorerId('');
      setCustomScorerName('');
      setAssistId('none');
      setCustomAssistName('');
      setGoalType('regular');
    }
  }, [editingGoal, initialSide, currentMatchMinute, isOpen]);

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

  const activeTeam = teamSide === 'home' ? homeTeam : awayTeam;
  const squad = activeTeam.squad || [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    let resolvedScorerName = customScorerName.trim();
    if (scorerId && scorerId !== 'custom') {
      const found = squad.find((p) => p.id === scorerId);
      if (found) {
        resolvedScorerName = found.nickname || found.name;
      }
    }
    if (!resolvedScorerName) {
      resolvedScorerName = teamSide === 'home' ? `${homeTeam.code} Attacker` : `${awayTeam.code} Attacker`;
    }

    let resolvedAssistName: string | undefined = undefined;
    if (assistId === 'custom' && customAssistName.trim()) {
      resolvedAssistName = customAssistName.trim();
    } else if (assistId && assistId !== 'none' && assistId !== 'custom') {
      const found = squad.find((p) => p.id === assistId);
      if (found) {
        resolvedAssistName = found.nickname || found.name;
      }
    }

    const newGoal: ScoreboardGoal = {
      id: editingGoal ? editingGoal.id : `goal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      teamSide,
      teamId: activeTeam.id,
      teamName: activeTeam.name,
      minute: Math.max(1, Math.min(130, Number(minute) || 1)),
      stoppageMinute: stoppageMinute && stoppageMinute > 0 ? Number(stoppageMinute) : undefined,
      scorerId: scorerId && scorerId !== 'custom' ? scorerId : undefined,
      scorerName: resolvedScorerName,
      assistId: assistId && assistId !== 'none' && assistId !== 'custom' ? assistId : undefined,
      assistName: resolvedAssistName,
      type: goalType,
      createdAt: editingGoal ? editingGoal.createdAt : new Date().toISOString(),
    };

    onSaveGoal(newGoal);
    if (!editingGoal) {
      playWhistle('goal');
    }
    onClose();
  };

  const handleDelete = () => {
    if (editingGoal && onDeleteGoal) {
      onDeleteGoal(editingGoal.id);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-form-modal-title"
      aria-describedby="goal-form-modal-desc"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[calc(100dvh-1.5rem)] sm:max-h-[90vh] my-auto flex flex-col rounded-2xl bg-[#070F1B] light:bg-white border border-[#7ADBF0]/30 light:border-slate-300 shadow-2xl overflow-hidden text-slate-100 light:text-slate-900 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header */}
        <div className="h-1 w-full bg-gradient-to-r from-[#0891B2] via-[#7ADBF0] to-[#D6B56E] shrink-0" />

        {/* Modal Header (Pinned at top) */}
        <div className="p-5 landscape-mobile:p-3.5 sm:p-6 pb-4 landscape-mobile:pb-3 flex items-center justify-between border-b border-white/10 light:border-slate-200 shrink-0 bg-[#070F1B] light:bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 id="goal-form-modal-title" className="font-bold text-base text-white light:text-slate-900">
                {editingGoal ? 'Edit Goal Record' : 'Record Goal'}
              </h3>
              <p id="goal-form-modal-desc" className="text-xs text-slate-400 light:text-slate-500">
                Chronological match event &amp; score tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close goal modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-white/5 light:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Container: Flex column with scrollable body & pinned footer */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-5 landscape-mobile:p-3.5 sm:p-6 space-y-4 landscape-mobile:space-y-3 overscroll-contain">
            {/* Team Side Selector */}
            <div>
              <label className="block font-semibold text-slate-300 light:text-slate-700 mb-2">
                Team Credited with Goal
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTeamSide('home');
                    setScorerId('');
                    setAssistId('none');
                  }}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                    teamSide === 'home'
                      ? 'bg-[#7ADBF0]/15 border-[#7ADBF0] text-white light:text-slate-900 shadow-[0_0_15px_rgba(122,219,240,0.2)]'
                      : 'bg-[#0B1525] light:bg-slate-100 border-white/10 light:border-slate-200 text-slate-400 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={homeTeam.crestUrl}
                    alt={homeTeam.name}
                    className="w-7 h-7 object-contain drop-shadow shrink-0"
                  />
                  <div className="text-left min-w-0">
                    <div className="font-bold truncate text-xs">{homeTeam.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">HOME · {homeTeam.code}</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTeamSide('away');
                    setScorerId('');
                    setAssistId('none');
                  }}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all cursor-pointer ${
                    teamSide === 'away'
                      ? 'bg-[#7ADBF0]/15 border-[#7ADBF0] text-white light:text-slate-900 shadow-[0_0_15px_rgba(122,219,240,0.2)]'
                      : 'bg-[#0B1525] light:bg-slate-100 border-white/10 light:border-slate-200 text-slate-400 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={awayTeam.crestUrl}
                    alt={awayTeam.name}
                    className="w-7 h-7 object-contain drop-shadow shrink-0"
                  />
                  <div className="text-left min-w-0">
                    <div className="font-bold truncate text-xs">{awayTeam.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">AWAY · {awayTeam.code}</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Goal Minute & Stoppage Minute */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-300 light:text-slate-700 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
                  Match Minute
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="130"
                    value={minute}
                    onChange={(e) => setMinute(Math.max(1, Math.min(130, Number(e.target.value) || 1)))}
                    className="w-full px-3 py-2 rounded-xl bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 text-white light:text-slate-900 font-mono text-center font-bold text-sm focus:outline-none focus:border-[#7ADBF0]"
                    required
                  />
                  <span className="font-mono text-slate-400 text-base">&apos;</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 light:text-slate-700 mb-1">
                  Stoppage Time (Optional)
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400 text-base">+</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    placeholder="e.g. 2 for 45+2'"
                    value={stoppageMinute ?? ''}
                    onChange={(e) =>
                      setStoppageMinute(e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)))
                    }
                    className="w-full px-3 py-2 rounded-xl bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 text-white light:text-slate-900 font-mono text-center text-sm focus:outline-none focus:border-[#7ADBF0]"
                  />
                </div>
              </div>
            </div>

            {/* Scorer Selection */}
            <div>
              <label className="block font-semibold text-slate-300 light:text-slate-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#D6B56E] light:text-amber-700" />
                Goal Scorer
              </label>
              <select
                value={scorerId}
                onChange={(e) => {
                  setScorerId(e.target.value);
                  if (e.target.value !== 'custom') {
                    const p = squad.find((item) => item.id === e.target.value);
                    if (p) setCustomScorerName(p.nickname || p.name);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none focus:border-[#7ADBF0]"
              >
                <option value="">-- Choose from {activeTeam.name} squad --</option>
                {squad.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.shirtNumber} {p.nickname || p.name} ({p.positionDetail}) - OVR {p.overallRating}
                  </option>
                ))}
                <option value="custom">-- Custom Name / Other Player --</option>
              </select>

              {(scorerId === 'custom' || (!scorerId && squad.length === 0)) && (
                <input
                  type="text"
                  placeholder="Enter goalscorer's name..."
                  value={customScorerName}
                  onChange={(e) => setCustomScorerName(e.target.value)}
                  className="mt-2 w-full px-3 py-2 rounded-xl bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none focus:border-[#7ADBF0]"
                />
              )}
            </div>

            {/* Assist Selection */}
            <div>
              <label className="block font-semibold text-slate-300 light:text-slate-700 mb-1">
                Assist (Optional)
              </label>
              <select
                value={assistId}
                onChange={(e) => {
                  setAssistId(e.target.value);
                  if (e.target.value !== 'none' && e.target.value !== 'custom') {
                    const p = squad.find((item) => item.id === e.target.value);
                    if (p) setCustomAssistName(p.nickname || p.name);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none focus:border-[#7ADBF0]"
              >
                <option value="none">-- Unassisted / Solo Effort --</option>
                {squad.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.shirtNumber} {p.nickname || p.name} ({p.positionDetail})
                  </option>
                ))}
                <option value="custom">-- Custom Assist Name --</option>
              </select>

              {assistId === 'custom' && (
                <input
                  type="text"
                  placeholder="Enter assist provider's name..."
                  value={customAssistName}
                  onChange={(e) => setCustomAssistName(e.target.value)}
                  className="mt-2 w-full px-3 py-2 rounded-xl bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 text-white light:text-slate-900 text-xs focus:outline-none focus:border-[#7ADBF0]"
                />
              )}
            </div>

            {/* Goal Type Chips */}
            <div>
              <label className="block font-semibold text-slate-300 light:text-slate-700 mb-2">
                Goal Method / Type
              </label>
              <div className="grid grid-cols-3 landscape-mobile:grid-cols-5 sm:grid-cols-5 gap-1.5">
                {[
                  { type: 'regular' as const, label: 'Open Play', icon: '⚽' },
                  { type: 'penalty' as const, label: 'Penalty', icon: '🎯' },
                  { type: 'free_kick' as const, label: 'Free Kick', icon: '🚀' },
                  { type: 'header' as const, label: 'Header', icon: '👤' },
                  { type: 'own_goal' as const, label: 'Own Goal', icon: '🔴' },
                ].map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setGoalType(item.type)}
                    className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      goalType === item.type
                        ? 'bg-[#7ADBF0]/20 border-[#7ADBF0] text-white light:text-slate-900 shadow-sm font-bold'
                        : 'bg-[#0B1525] light:bg-slate-100 border-white/10 light:border-slate-200 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="text-[10px] whitespace-nowrap">{item.label}</span>
                  </button>
                ))}
              </div>
              {goalType === 'own_goal' && (
                <p className="mt-2 text-[11px] text-amber-300 light:text-amber-700 italic">
                  * Note: Own goals add a point to the opposing side on the scoreboard while recording the player.
                </p>
              )}
            </div>
          </div>

          {/* Form Actions Footer (Pinned at bottom) */}
          <div className="p-4 landscape-mobile:py-2.5 landscape-mobile:px-4 sm:px-6 border-t border-white/10 light:border-slate-200 flex items-center justify-between shrink-0 bg-[#070F1B]/95 light:bg-white/95 backdrop-blur-sm">
            {editingGoal && onDeleteGoal ? (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3.5 py-2 rounded-xl font-semibold text-rose-400 hover:bg-rose-500/15 border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl font-semibold text-slate-300 hover:text-white light:text-slate-600 light:hover:text-slate-900 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl font-bold bg-[#7ADBF0] hover:bg-[#8ee1f3] text-[#050A12] shadow-[0_0_15px_rgba(122,219,240,0.3)] flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{editingGoal ? 'Update Goal' : 'Save Goal'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
