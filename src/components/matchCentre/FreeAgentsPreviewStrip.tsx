import React from 'react';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { getPlayerDisplayName } from '../../types/matchCentre';
import { UserPlus, ArrowRight, Sparkles } from 'lucide-react';

export const FreeAgentsPreviewStrip: React.FC = () => {
  const { viewChip, setViewChip, freeAgents, counts } = useMatchCentre();

  // ONLY render when 'all-teams' view is active
  if (viewChip !== 'all-teams') {
    return null;
  }

  // Display top 5 unattached free agents
  const previewAgents = freeAgents.slice(0, 5);

  return (
    <div className="relative rounded-2xl bg-[var(--bg-surface)] border border-teal-500/30 p-4 sm:p-5 mb-8 overflow-hidden shadow-lg transition-colors">
      
      {/* Subtle Teal Top Border Accent */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-teal-500/20 via-teal-400 to-teal-500/20" />
      
      {/* Background Soft Glow */}
      <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-teal-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Left Headline & Label */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="eyebrow-mono text-[9px] font-bold uppercase tracking-wider text-teal-400">
                UNATTACHED MARKET
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-bold">
                {counts.freeAgents} Available
              </span>
            </div>
            <h3 className="font-display font-black text-sm sm:text-base text-[var(--text-primary)] uppercase tracking-tight">
              AVAILABLE FREE AGENTS
            </h3>
          </div>
        </div>

        {/* Center Preview Mini Cards */}
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-1 scrollbar-none flex-1 justify-start md:justify-center">
          {previewAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setViewChip('free-agents')}
              className="group/agent flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-teal-500/50 transition-all shrink-0 cursor-pointer text-left"
              title={`View ${getPlayerDisplayName(agent)} (${agent.positionDetail})`}
            >
              {/* Position badge */}
              <span className="eyebrow-mono text-[9px] font-black px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                {agent.positionDetail}
              </span>

              {/* Name & Previous Club */}
              <div className="min-w-0">
                <span className="text-xs font-bold text-[var(--text-primary)] block group-hover/agent:text-teal-400 transition-colors whitespace-nowrap">
                  {getPlayerDisplayName(agent)}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] block whitespace-nowrap">
                  {agent.nationality}
                </span>
              </div>

              {/* Rating */}
              <div className="text-right shrink-0 ml-1">
                <span className="font-display font-black text-sm text-[var(--accent-gold)] tabular-nums">
                  {agent.overallRating}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Right CTA Button */}
        <div className="shrink-0 flex items-center justify-end">
          <button
            onClick={() => setViewChip('free-agents')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-300 hover:text-teal-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap"
          >
            <span>SEE ALL ({counts.freeAgents})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
};
