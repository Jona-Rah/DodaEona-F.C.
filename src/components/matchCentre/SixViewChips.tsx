import React from 'react';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { ViewChipType } from '../../types/matchCentre';

interface ViewChipConfig {
  id: ViewChipType;
  label: string;
  count: number;
}

export const SixViewChips: React.FC = () => {
  const { viewChip, setViewChip, counts } = useMatchCentre();

  const chips: ViewChipConfig[] = [
    { id: 'free-agents', label: 'Free agents', count: counts.freeAgents },
    { id: 'all-teams', label: 'All teams', count: counts.total },
    { id: 'mens-clubs', label: "Men's clubs", count: counts.mensClubs },
    { id: 'mens-nations', label: "Men's nations", count: counts.mensNations },
    { id: 'womens-clubs', label: "Women's clubs", count: counts.womensClubs },
    { id: 'womens-nations', label: "Women's nations", count: counts.womensNations },
  ];

  return (
    <div className="flex items-center gap-2.5 overflow-x-auto py-1 scrollbar-none mb-7">
      {chips.map((chip) => {
        const isActive = viewChip === chip.id;

        return (
          <button
            key={chip.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => setViewChip(chip.id)}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 shrink-0 cursor-pointer border whitespace-nowrap hover:-translate-y-0.5 ${
              isActive
                ? 'bg-[#7ADBF0]/12 border-[#7ADBF0]/75 text-[#7ADBF0] shadow-[0_0_14px_rgba(122,219,240,0.2)] light:bg-cyan-50 light:border-cyan-600 light:text-cyan-800'
                : 'bg-[#0A111C]/80 border-white/[0.08] text-slate-300 hover:border-white/25 hover:text-white light:bg-white light:border-slate-200 light:text-slate-600 light:hover:border-slate-300 light:hover:text-slate-900'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isActive ? 'bg-[#7ADBF0] light:bg-cyan-600' : 'bg-slate-500 light:bg-slate-400'
              }`}
            />
            <span>{chip.label}</span>
            <span
              className={`font-mono text-[11px] tabular-nums ${
                isActive ? 'text-[#7ADBF0]/90 light:text-cyan-700' : 'text-slate-400 light:text-slate-500'
              }`}
            >
              {chip.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
