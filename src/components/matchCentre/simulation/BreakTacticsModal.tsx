import React, { useState } from 'react';
import { ArrowLeftRight, Check, SlidersHorizontal, X } from 'lucide-react';
import { getPlayerDisplayName, Player, Team } from '../../../types/matchCentre';
import { AVAILABLE_FORMATIONS } from '../dossier/dossierUtils';
import { buildDugoutLineup } from '../../../engine/matchSimulator';
import type { SimPlanId, SimTeamSetup } from '../../../types/simulation';

interface BreakTacticsModalProps {
  currentMinute: number;
  homeTeam: Team;
  awayTeam: Team;
  homeSetup: SimTeamSetup;
  awaySetup: SimTeamSetup;
  onApplyAdjustment: (side: 'home' | 'away', nextSetup: SimTeamSetup) => void;
  onClose: () => void;
}

export const BreakTacticsModal: React.FC<BreakTacticsModalProps> = ({
  currentMinute,
  homeTeam,
  awayTeam,
  homeSetup,
  awaySetup,
  onApplyAdjustment,
  onClose,
}) => {
  const [side, setSide] = useState<'home' | 'away'>('home');
  const [draftHome, setDraftHome] = useState<SimTeamSetup>(() =>
    JSON.parse(JSON.stringify(homeSetup))
  );
  const [draftAway, setDraftAway] = useState<SimTeamSetup>(() =>
    JSON.parse(JSON.stringify(awaySetup))
  );
  const [selectedSlotIdx, setSelectedSlotIdx] = useState<number | null>(null);

  const activeTeam = side === 'home' ? homeTeam : awayTeam;
  const activeDraft = side === 'home' ? draftHome : draftAway;
  const setActiveDraft = side === 'home' ? setDraftHome : setDraftAway;
  const activePlan = activeDraft.plans[activeDraft.activePlan];

  const handleFormationChange = (formation: string) => {
    const currentIds = activeDraft.slots
      .map((s) => s.player?.id)
      .filter((id): id is string => Boolean(id));
    const { slots, bench } = buildDugoutLineup(activeTeam, formation, currentIds);
    setActiveDraft({
      ...activeDraft,
      formation,
      slots,
      bench,
      plans: {
        ...activeDraft.plans,
        [activeDraft.activePlan]: {
          ...activePlan,
          formation,
        },
      },
    });
    setSelectedSlotIdx(null);
  };

  const handleSwitchPlan = (pid: SimPlanId) => {
    const plan = activeDraft.plans[pid];
    const currentIds = activeDraft.slots
      .map((s) => s.player?.id)
      .filter((id): id is string => Boolean(id));
    const { slots, bench } = buildDugoutLineup(activeTeam, plan.formation, currentIds);
    setActiveDraft({
      ...activeDraft,
      activePlan: pid,
      formation: plan.formation,
      slots,
      bench,
    });
    setSelectedSlotIdx(null);
  };

  const handleSubIn = (benchPlayer: Player) => {
    if (selectedSlotIdx === null) return;
    const outgoing = activeDraft.slots[selectedSlotIdx]?.player || null;
    const nextSlots = [...activeDraft.slots];
    nextSlots[selectedSlotIdx] = { ...nextSlots[selectedSlotIdx], player: benchPlayer };
    const nextBench = [
      ...activeDraft.bench.filter((p) => p.id !== benchPlayer.id),
      ...(outgoing ? [outgoing] : []),
    ];
    setActiveDraft({ ...activeDraft, slots: nextSlots, bench: nextBench });
    setSelectedSlotIdx(null);
  };

  const handleApply = () => {
    if (JSON.stringify(draftHome) !== JSON.stringify(homeSetup)) {
      onApplyAdjustment('home', draftHome);
    }
    if (JSON.stringify(draftAway) !== JSON.stringify(awaySetup)) {
      onApplyAdjustment('away', draftAway);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 landscape-mobile:p-3">
      <div className="w-full max-w-4xl rounded-2xl bg-[#070E1A] light:bg-white border border-white/15 light:border-slate-300 shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-1.5rem)] sm:max-h-[88vh]">
        <div className="px-5 py-4 landscape-mobile:px-4 landscape-mobile:py-2.5 border-b border-white/10 light:border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-white light:text-slate-900">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400 light:text-cyan-600" />
            <span>In-Match Tactical Adjustments ({currentMinute}&apos;)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/[0.05] light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 landscape-mobile:p-3.5 overflow-y-auto space-y-4 landscape-mobile:space-y-3 flex-1">
          {/* Side Switcher */}
          <div className="flex items-center gap-2">
            {(
              [
                { id: 'home', team: homeTeam },
                { id: 'away', team: awayTeam },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setSide(item.id);
                  setSelectedSlotIdx(null);
                }}
                className={`px-4 py-2 rounded-xl font-mono text-xs font-bold uppercase border cursor-pointer ${
                  side === item.id
                    ? 'bg-cyan-500/20 light:bg-cyan-100 border-cyan-400 light:border-cyan-600 text-cyan-200 light:text-cyan-900'
                    : 'bg-slate-950 light:bg-slate-100 border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                }`}
              >
                {item.team.name}
              </button>
            ))}
          </div>

          {/* Plan A/B/C & Formation */}
          <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-4 landscape-mobile:gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/70 light:bg-slate-50 border border-white/10 light:border-slate-200 space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-600">
                Active Plan Preset
              </div>
              <div className="flex gap-2">
                {(['A', 'B', 'C'] as SimPlanId[]).map((pid) => (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => handleSwitchPlan(pid)}
                    className={`flex-1 py-2 rounded-lg font-mono text-xs font-bold border cursor-pointer ${
                      activeDraft.activePlan === pid
                        ? 'bg-cyan-500/20 light:bg-cyan-100 border-cyan-400 light:border-cyan-600 text-cyan-200 light:text-cyan-900'
                        : 'bg-slate-900 light:bg-white border-white/10 light:border-slate-300 text-slate-400 light:text-slate-700'
                    }`}
                  >
                    Plan {pid} ({activeDraft.plans[pid].formation})
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 light:bg-slate-50 border border-white/10 light:border-slate-200 space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-600">
                Formation Shape
              </div>
              <select
                value={activeDraft.formation}
                onChange={(e) => handleFormationChange(e.target.value)}
                className="w-full bg-slate-900 light:bg-white border border-white/15 light:border-slate-300 rounded-lg px-3 py-2 text-xs font-bold text-white light:text-slate-900"
              >
                {AVAILABLE_FORMATIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tactical Instruction Sliders */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 light:bg-slate-50 border border-white/10 light:border-slate-200 grid grid-cols-2 landscape-mobile:grid-cols-4 sm:grid-cols-4 gap-3">
            {(
              [
                { key: 'pressingIntensity', label: 'Pressing' },
                { key: 'buildUpSpeed', label: 'Build-Up' },
                { key: 'defensiveLine', label: 'Def Line' },
                { key: 'width', label: 'Width' },
              ] as const
            ).map((s) => (
              <label key={s.key} className="flex flex-col gap-1">
                <div className="flex justify-between font-mono text-[10px] text-slate-300 light:text-slate-700">
                  <span>{s.label}</span>
                  <span className="text-cyan-300 light:text-cyan-700 font-bold">{activePlan[s.key]}</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={99}
                  value={activePlan[s.key]}
                  onChange={(e) =>
                    setActiveDraft({
                      ...activeDraft,
                      plans: {
                        ...activeDraft.plans,
                        [activeDraft.activePlan]: {
                          ...activePlan,
                          [s.key]: Number(e.target.value),
                        },
                      },
                    })
                  }
                  className="accent-cyan-400 cursor-pointer"
                />
              </label>
            ))}
          </div>

          {/* Substitutions: Click On-Pitch Slot -> Click Bench Player */}
          <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-4 landscape-mobile:gap-3">
            <div className="p-3.5 rounded-xl bg-slate-950/70 light:bg-slate-50 border border-white/10 light:border-slate-200 space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-600">
                On-Pitch XI (Select player to replace)
              </div>
              <div className="space-y-1 max-h-56 landscape-mobile:max-h-36 overflow-y-auto pr-1">
                {activeDraft.slots.map((slot) => (
                  <button
                    key={slot.slotIndex}
                    type="button"
                    onClick={() =>
                      setSelectedSlotIdx(
                        selectedSlotIdx === slot.slotIndex ? null : slot.slotIndex
                      )
                    }
                    className={`w-full px-3 py-1.5 rounded-lg border text-left text-xs flex items-center justify-between cursor-pointer ${
                      selectedSlotIdx === slot.slotIndex
                        ? 'bg-amber-500/20 light:bg-amber-100 border-amber-400 light:border-amber-600 text-amber-200 light:text-amber-900 font-bold'
                        : 'bg-slate-900/70 light:bg-white border-white/[0.06] light:border-slate-200 text-white light:text-slate-900 hover:border-white/25 light:hover:border-slate-400'
                    }`}
                  >
                    <span>
                      <span className="font-mono text-[10px] text-cyan-300 light:text-cyan-700 mr-2 font-bold">
                        {slot.node.role}
                      </span>
                      {slot.player ? getPlayerDisplayName(slot.player) : 'Vacant'}
                    </span>
                    <span className="font-mono text-[11px] text-slate-400 light:text-slate-600">
                      {slot.player?.overallRating ?? '—'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 light:bg-slate-50 border border-white/10 light:border-slate-200 space-y-2">
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-600">
                Bench (Tap to sub into selected slot)
              </div>
              <div className="space-y-1 max-h-56 landscape-mobile:max-h-36 overflow-y-auto pr-1">
                {activeDraft.bench.map((bp) => (
                  <button
                    key={bp.id}
                    type="button"
                    disabled={selectedSlotIdx === null || bp.injuryStatus === 'injured'}
                    onClick={() => handleSubIn(bp)}
                    className={`w-full px-3 py-1.5 rounded-lg border text-left text-xs flex items-center justify-between ${
                      selectedSlotIdx === null || bp.injuryStatus === 'injured'
                        ? 'opacity-50 cursor-not-allowed bg-slate-900/40 light:bg-slate-100 border-white/5 light:border-slate-200 text-slate-400 light:text-slate-500'
                        : 'bg-slate-900/80 light:bg-white border-white/10 light:border-slate-200 text-white light:text-slate-900 hover:border-emerald-400 light:hover:border-emerald-500 cursor-pointer'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <ArrowLeftRight className="w-3 h-3 text-emerald-400 light:text-emerald-600" />
                      <span>
                        {getPlayerDisplayName(bp)} ({bp.positionDetail})
                      </span>
                    </span>
                    <span className="font-mono text-[11px] text-cyan-300 light:text-cyan-700 font-bold">
                      {bp.overallRating}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 landscape-mobile:px-4 landscape-mobile:py-2.5 border-t border-white/10 light:border-slate-200 flex items-center justify-end gap-2 bg-slate-950/80 light:bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/[0.05] light:bg-slate-200 hover:bg-white/10 light:hover:bg-slate-300 text-xs font-bold text-slate-300 light:text-slate-700 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-black uppercase cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply & Continue</span>
          </button>
        </div>
      </div>
    </div>
  );
};
