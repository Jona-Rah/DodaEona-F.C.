import React from 'react';
import { Shield, Globe } from 'lucide-react';
import { useMatchCentre } from '../../context/MatchCentreContext';

export const TeamTypeSwitcher: React.FC = () => {
  const { teamType, setTeamType, counts } = useMatchCentre();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 border-b border-[var(--border-color)]">
      
      {/* Segmented Control */}
      <div 
        role="tablist"
        aria-label="Team Type Selection"
        className="p-1 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center gap-1.5 shadow-inner w-full sm:w-auto"
      >
        {/* Option 1: CLUBS */}
        <button
          role="tab"
          aria-selected={teamType === 'club'}
          onClick={() => setTeamType('club')}
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-display font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            teamType === 'club'
              ? 'bg-gradient-to-r from-[#C5A059] via-[#E5C384] to-[#C5A059] text-slate-950 shadow-[0_0_20px_rgba(197,160,89,0.35)] transform scale-[1.02]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
          }`}
        >
          <Shield className={`w-4 h-4 ${teamType === 'club' ? 'text-slate-950' : 'text-[#C5A059]'}`} />
          <span>CLUBS</span>
          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${
            teamType === 'club' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
          }`}>
            {counts.clubs}
          </span>
        </button>

        {/* Option 2: NATIONAL TEAMS */}
        <button
          role="tab"
          aria-selected={teamType === 'national'}
          onClick={() => setTeamType('national')}
          className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-display font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 cursor-pointer ${
            teamType === 'national'
              ? 'bg-gradient-to-r from-[#C5A059] via-[#E5C384] to-[#C5A059] text-slate-950 shadow-[0_0_20px_rgba(197,160,89,0.35)] transform scale-[1.02]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
          }`}
        >
          <Globe className={`w-4 h-4 ${teamType === 'national' ? 'text-slate-950' : 'text-[#10B981]'}`} />
          <span>NATIONAL TEAMS</span>
          <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded-full ${
            teamType === 'national' ? 'bg-slate-950/20 text-slate-950 font-black' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
          }`}>
            {counts.national}
          </span>
        </button>
      </div>

      {/* Category Subtext & Results Indicator */}
      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] self-end sm:self-center">
        <span className="eyebrow-mono text-[10px]">
          ACTIVE VIEW: <span className="text-[var(--accent-gold)] font-bold">{teamType === 'club' ? 'DOMESTIC & ICON CLUBS' : 'GLOBAL FEDERATIONS'}</span>
        </span>
        <span aria-hidden="true" className="text-[var(--border-color)]">·</span>
        <span className="font-mono text-[11px] text-[var(--text-secondary)] font-bold">
          {counts.activeResults} of {teamType === 'club' ? counts.clubs : counts.national} Displayed
        </span>
      </div>

    </div>
  );
};
