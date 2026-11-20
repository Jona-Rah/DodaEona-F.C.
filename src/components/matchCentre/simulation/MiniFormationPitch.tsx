import React from 'react';
import { getFormationBlueprint } from '../dossier/dossierUtils';

interface MiniFormationPitchProps {
  formation: string;
  family: string;
  selected: boolean;
  accentColor: string;
  onSelect: () => void;
}

export const MiniFormationPitch: React.FC<MiniFormationPitchProps> = ({
  formation,
  family,
  selected,
  accentColor,
  onSelect,
}) => {
  const blueprint = getFormationBlueprint(formation);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group text-left rounded-xl p-2.5 border transition-all cursor-pointer flex flex-col gap-2 ${
        selected
          ? 'bg-slate-900/95 border-white/50 shadow-[0_0_18px_rgba(56,189,248,0.18)]'
          : 'bg-[#070E19]/90 border-white/[0.08] hover:border-white/25 hover:bg-slate-900/70'
      }`}
      style={
        selected
          ? {
              borderColor: accentColor,
              boxShadow: `0 0 0 1px ${accentColor}44, 0 8px 20px rgba(0,0,0,0.4)`,
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-1 w-full">
        <span className="font-mono font-black text-xs text-white tracking-tight">
          {formation}
        </span>
        {selected && (
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: accentColor }}
          />
        )}
      </div>

      {/* Mini SVG Pitch */}
      <div className="relative w-full aspect-[4/3.1] rounded-lg bg-[#0B2316] border border-white/10 overflow-hidden">
        <div className="absolute inset-1.5 border border-white/15 rounded-sm pointer-events-none" />
        <div className="absolute top-1/2 inset-x-1.5 h-px bg-white/15 pointer-events-none" />
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-8 h-3 border-b border-x border-white/15 pointer-events-none" />
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-3 border-t border-x border-white/15 pointer-events-none" />

        {blueprint.nodes.map((node, idx) => (
          <span
            key={idx}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-black/40 transition-transform group-hover:scale-110"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              backgroundColor:
                node.line === 'GK'
                  ? '#F59E0B'
                  : selected
                  ? accentColor
                  : '#94A3B8',
            }}
          />
        ))}
      </div>

      <span className="eyebrow-mono text-[9px] text-slate-400 truncate w-full uppercase">
        {family}
      </span>
    </button>
  );
};
