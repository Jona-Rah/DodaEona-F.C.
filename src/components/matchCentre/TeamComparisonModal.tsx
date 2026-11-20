import React from 'react';
import { X, Swords } from 'lucide-react';
import { Team, getPlayerDisplayName, getTeamType } from '../../types/matchCentre';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { TeamEmblem } from './TeamEmblem';

interface TeamComparisonModalProps {
  teams: [Team, Team];
  onClose: () => void;
}

export const TeamComparisonModal: React.FC<TeamComparisonModalProps> = ({ teams, onClose }) => {
  const [teamA, teamB] = teams;
  const { selectTeam } = useMatchCentre();

  const avgPlayerRatingA = teamA.squad.length > 0
    ? Math.round(teamA.squad.reduce((sum, p) => sum + p.overallRating, 0) / teamA.squad.length)
    : 0;
  const avgPlayerRatingB = teamB.squad.length > 0
    ? Math.round(teamB.squad.reduce((sum, p) => sum + p.overallRating, 0) / teamB.squad.length)
    : 0;

  const diff = (valA: number, valB: number) => {
    const d = valA - valB;
    if (d > 0) return `+${d}`;
    if (d < 0) return `${d}`;
    return '=';
  };

  const getDiffColor = (valA: number, valB: number) => {
    if (valA > valB) return 'text-[#10B981]';
    if (valA < valB) return 'text-rose-400';
    return 'text-[var(--text-muted)]';
  };

  // Metrics list to compare
  const metrics = [
    { label: 'Overall Rating', valA: teamA.overallRating, valB: teamB.overallRating, max: 99 },
    { label: 'Attack Rating', valA: teamA.attackRating, valB: teamB.attackRating, max: 99 },
    { label: 'Midfield Rating', valA: teamA.midfieldRating, valB: teamB.midfieldRating, max: 99 },
    { label: 'Defence Rating', valA: teamA.defenceRating, valB: teamB.defenceRating, max: 99 },
    { label: 'Avg Squad Rating', valA: avgPlayerRatingA, valB: avgPlayerRatingB, max: 99 },
    { label: 'Squad Size', valA: teamA.squad.length, valB: teamB.squad.length, max: 25 },
  ];

  // Top 3 players per team
  const topPlayersA = [...teamA.squad].sort((a, b) => b.overallRating - a.overallRating).slice(0, 3);
  const topPlayersB = [...teamB.squad].sort((a, b) => b.overallRating - a.overallRating).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 landscape-mobile:p-3 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl relative my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col text-left transition-colors duration-200">
        
        {/* Top 3px Colored Edge */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#C5A059] via-[#38BDF8] to-[#10B981]" />

        {/* Header Bar */}
        <div className="p-6 landscape-mobile:p-3.5 bg-[var(--bg-elevated)] border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-[#38BDF8]">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <span className="eyebrow-mono text-[9px] text-[var(--accent-gold)] uppercase block">
                HEAD-TO-HEAD INTELLIGENCE
              </span>
              <h2 className="font-display font-black text-xl sm:text-2xl landscape-mobile:text-lg text-[var(--text-primary)] uppercase tracking-tight">
                TEAM COMPARISON ANALYSIS
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 landscape-mobile:p-4 overflow-y-auto space-y-8 landscape-mobile:space-y-4 flex-1">
          
          {/* Head-to-Head Hero Split */}
          <div className="grid grid-cols-2 gap-4 sm:gap-8 landscape-mobile:gap-4 items-center bg-[var(--bg-elevated)] p-6 landscape-mobile:p-3.5 rounded-2xl border border-[var(--border-color)]">
            
            {/* Team A */}
            <div className="flex flex-col landscape-mobile:flex-row sm:flex-row items-center sm:items-start gap-4 landscape-mobile:gap-3 text-center landscape-mobile:text-left sm:text-left">
              <div
                className={`${
                  getTeamType(teamA) === 'country'
                    ? 'w-20 h-14 sm:w-24 sm:h-16 p-2'
                    : 'w-16 h-16 sm:w-20 sm:h-20 p-2'
                } rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shrink-0 flex items-center justify-center shadow-lg`}
              >
                <TeamEmblem team={teamA} />
              </div>
              <div className="min-w-0">
                <span className="eyebrow-mono text-[9px] text-[#C5A059] uppercase block">{teamA.country}</span>
                <h3 className="font-display font-black text-xl sm:text-2xl text-[var(--text-primary)] uppercase tracking-tight truncate">
                  {teamA.shortName}
                </h3>
                <p className="text-xs text-[var(--text-muted)] truncate">{teamA.league || teamA.confederation}</p>
                <div className="mt-2 font-display font-black text-3xl text-[var(--accent-gold)] tabular-nums">
                  {teamA.overallRating} <span className="text-xs font-mono font-normal text-[var(--text-muted)]">OVR</span>
                </div>
              </div>
            </div>

            {/* Team B */}
            <div className="flex flex-col landscape-mobile:flex-row-reverse sm:flex-row-reverse items-center sm:items-start gap-4 landscape-mobile:gap-3 text-center landscape-mobile:text-right sm:text-right">
              <div
                className={`${
                  getTeamType(teamB) === 'country'
                    ? 'w-20 h-14 sm:w-24 sm:h-16 p-2'
                    : 'w-16 h-16 sm:w-20 sm:h-20 p-2'
                } rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shrink-0 flex items-center justify-center shadow-lg`}
              >
                <TeamEmblem team={teamB} />
              </div>
              <div className="min-w-0">
                <span className="eyebrow-mono text-[9px] text-[#38BDF8] uppercase block">{teamB.country}</span>
                <h3 className="font-display font-black text-xl sm:text-2xl text-[var(--text-primary)] uppercase tracking-tight truncate">
                  {teamB.shortName}
                </h3>
                <p className="text-xs text-[var(--text-muted)] truncate">{teamB.league || teamB.confederation}</p>
                <div className="mt-2 font-display font-black text-3xl text-[#38BDF8] tabular-nums">
                  {teamB.overallRating} <span className="text-xs font-mono font-normal text-[var(--text-muted)]">OVR</span>
                </div>
              </div>
            </div>

          </div>

          {/* Metric Comparison Bars */}
          <div className="space-y-4">
            <h4 className="eyebrow-mono text-xs text-[var(--accent-gold)] uppercase tracking-wider">
              CORE METRIC COMPARISONS
            </h4>

            <div className="space-y-3">
              {metrics.map((m, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[var(--accent-gold)]">{m.valA}</span>
                    <span className="eyebrow-mono text-[10px] text-[var(--text-secondary)] uppercase">
                      {m.label} ({diff(m.valA, m.valB)})
                    </span>
                    <span className="font-bold text-[#38BDF8]">{m.valB}</span>
                  </div>

                  {/* Dual Horizontal Bars */}
                  <div className="grid grid-cols-2 gap-2 h-2">
                    <div className="flex justify-end bg-slate-900 light:bg-slate-200 rounded-l-full overflow-hidden">
                      <div
                        className="bg-[#C5A059] rounded-l-full transition-all duration-500"
                        style={{ width: `${(m.valA / m.max) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-start bg-slate-900 light:bg-slate-200 rounded-r-full overflow-hidden">
                      <div
                        className="bg-[#38BDF8] rounded-r-full transition-all duration-500"
                        style={{ width: `${(m.valB / m.max) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Key Players Head-to-Head */}
          <div className="space-y-3">
            <h4 className="eyebrow-mono text-xs text-[var(--accent-gold)] uppercase tracking-wider">
              KEY PLAYER HEAD-TO-HEAD
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="eyebrow-mono text-[10px] text-[#C5A059] block">{teamA.shortName} Talismans:</span>
                {topPlayersA.map((p) => (
                  <div key={p.id} className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-between text-xs">
                    <div className="truncate">
                      <span className="font-bold text-[var(--text-primary)] block truncate">{getPlayerDisplayName(p)}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{p.positionDetail} · #{p.shirtNumber}</span>
                    </div>
                    <span className="font-display font-black text-lg text-[var(--accent-gold)] ml-2">{p.overallRating}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <span className="eyebrow-mono text-[10px] text-[#38BDF8] block">{teamB.shortName} Talismans:</span>
                {topPlayersB.map((p) => (
                  <div key={p.id} className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-between text-xs">
                    <div className="truncate">
                      <span className="font-bold text-[var(--text-primary)] block truncate">{getPlayerDisplayName(p)}</span>
                      <span className="text-[10px] text-[var(--text-muted)]">{p.positionDetail} · #{p.shirtNumber}</span>
                    </div>
                    <span className="font-display font-black text-lg text-[#38BDF8] ml-2">{p.overallRating}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 landscape-mobile:p-3 bg-[var(--bg-elevated)] border-t border-[var(--border-color)] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Close Comparison
          </button>

          <button
            onClick={() => {
              selectTeam(teamA, 'home');
              selectTeam(teamB, 'away');
              onClose();
            }}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#E5C384] text-slate-950 font-black text-xs uppercase tracking-wider shadow-md"
          >
            Set as Matchup ({teamA.shortName} vs {teamB.shortName})
          </button>
        </div>

      </div>
    </div>
  );
};
