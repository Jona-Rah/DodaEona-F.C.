import React, { useState, useMemo } from 'react';
import { useMatchCentre } from '../../context/MatchCentreContext';
import {
  FreeAgentPlayer,
  getPlayerDisplayName,
  PlayerPosition,
  resolvePlayerAge,
  getTeamType,
} from '../../types/matchCentre';
import { UserPlus, UserCheck, ChevronDown } from 'lucide-react';

export const FreeAgentsView: React.FC = () => {
  const {
    filteredFreeAgents,
    visibleFreeAgentsCount,
    loadMoreFreeAgents,
    hasMoreFreeAgents,
    teams,
    signFreeAgent,
    canManageTeam,
    openPlayerProfile,
  } = useMatchCentre();

  const [positionFilter, setPositionFilter] = useState<'all' | PlayerPosition>('all');
  const [signingModalPlayer, setSigningModalPlayer] = useState<FreeAgentPlayer | null>(null);
  const [selectedTargetTeamId, setSelectedTargetTeamId] = useState<string>('');

  // Position badge colors (Attack: blue, Midfield: green, Defence: yellow, GK: orange)
  const getPositionBadge = (pos: PlayerPosition) => {
    switch (pos) {
      case 'ATT':
        return 'bg-blue-500/20 text-[#38BDF8] border-blue-500/40';
      case 'MID':
        return 'bg-emerald-500/20 text-[#10B981] border-emerald-500/40';
      case 'DEF':
        return 'bg-amber-500/20 text-[#F59E0B] border-amber-500/40';
      case 'GK':
        return 'bg-orange-500/20 text-[#F97316] border-orange-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  // Filtered by position
  const displayedAgents = useMemo(() => {
    let list = filteredFreeAgents;
    if (positionFilter !== 'all') {
      list = list.filter((fa) => fa.position === positionFilter);
    }
    return list;
  }, [filteredFreeAgents, positionFilter]);

  const pagedAgents = displayedAgents.slice(0, visibleFreeAgentsCount);

  // Eligible teams to sign player to (manageable clubs only)
  const eligibleClubs = useMemo(() => {
    return teams.filter((t) => getTeamType(t) === 'club' && canManageTeam(t));
  }, [teams, canManageTeam]);

  const handleSignConfirm = () => {
    if (!signingModalPlayer || !selectedTargetTeamId) return;
    signFreeAgent(selectedTargetTeamId, signingModalPlayer);
    setSigningModalPlayer(null);
    setSelectedTargetTeamId('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar with Teal Accent */}
      <div className="relative rounded-2xl bg-[var(--bg-surface)] border border-teal-500/30 p-5 landscape-mobile:p-3.5 overflow-hidden shadow-xl">
        <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-teal-500 via-teal-300 to-teal-500" />
        
        <div className="flex flex-col landscape-mobile:flex-row sm:flex-row sm:items-center landscape-mobile:items-center justify-between gap-4 landscape-mobile:gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="eyebrow-mono text-[9px] font-bold text-teal-400 uppercase tracking-widest">
                PLAYER MARKETPLACE
              </span>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-bold">
                {displayedAgents.length} SHOWN
              </span>
            </div>
            <h2 className="font-display font-normal text-2xl sm:text-3xl landscape-mobile:text-2xl text-[var(--text-primary)] uppercase tracking-tight">
              FREE AGENTS REGISTER
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Unattached world-class footballers available for contract signing to any registered club.
            </p>
          </div>

          {/* Position Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs font-bold shrink-0 overflow-x-auto max-w-full">
            {(['all', 'ATT', 'MID', 'DEF', 'GK'] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setPositionFilter(pos)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  positionFilter === pos
                    ? 'bg-teal-500 text-slate-950 font-black shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {pos === 'all' ? 'ALL POSITIONS' : pos}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Free Agents Grid */}
      {pagedAgents.length > 0 ? (
        <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-5 landscape-mobile:gap-3.5">
          {pagedAgents.map((player) => (
            <div
              key={player.id}
              className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-teal-500/50 p-5 landscape-mobile:p-4 transition-all shadow-md hover:shadow-xl flex flex-col justify-between"
            >
              <div>
                {/* Top Row: Position & Overall */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`eyebrow-mono text-[9px] font-black px-2 py-0.5 rounded border ${getPositionBadge(player.position)}`}>
                      {player.positionDetail}
                    </span>
                    <span className="eyebrow-mono text-[9px] px-2 py-0.5 rounded bg-[var(--bg-elevated)] text-[var(--text-muted)] font-mono">
                      AGE {resolvePlayerAge(player.dateOfBirth, player.age)}
                      {player.dateOfBirth ? ` · ${player.dateOfBirth}` : ''}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-display font-black text-2xl sm:text-3xl text-[var(--accent-gold)] tabular-nums leading-none">
                      {player.overallRating}
                    </span>
                    <span className="eyebrow-mono text-[8px] text-[var(--text-muted)] block">OVR</span>
                  </div>
                </div>

                {/* Player Identity */}
                <button
                  type="button"
                  onClick={() => openPlayerProfile(player.id)}
                  className="font-display font-black text-xl text-[var(--text-primary)] hover:text-[#7ADBF0] uppercase tracking-tight leading-tight text-left block cursor-pointer transition-colors"
                >
                  {getPlayerDisplayName(player)}
                </button>
                <div className="text-xs text-[var(--text-secondary)] font-medium mt-0.5">
                  {player.nationality}
                </div>

                {/* Market Details */}
                <div className="mt-3 p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="eyebrow-mono text-[8px] text-[var(--text-muted)] uppercase block">
                      PREVIOUS CLUB
                    </span>
                    <span className="font-bold text-[var(--text-primary)] truncate block">
                      {player.previousClub || 'Unattached'}
                    </span>
                  </div>
                  <div>
                    <span className="eyebrow-mono text-[8px] text-[var(--text-muted)] uppercase block">
                      MARKET VALUE
                    </span>
                    <span className="font-mono font-bold text-teal-400">
                      {player.marketValue || 'Free'}
                    </span>
                  </div>
                </div>

                {/* Attributes Radar Mini */}
                <div className="mt-3 grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                  <div className="flex justify-between bg-black/20 light:bg-slate-100 p-1.5 rounded border border-transparent light:border-slate-200">
                    <span className="text-slate-400 light:text-slate-600">PAC</span>
                    <span className="font-bold text-white light:text-slate-900">{player.attributes.pace}</span>
                  </div>
                  <div className="flex justify-between bg-black/20 light:bg-slate-100 p-1.5 rounded border border-transparent light:border-slate-200">
                    <span className="text-slate-400 light:text-slate-600">SHO</span>
                    <span className="font-bold text-white light:text-slate-900">{player.attributes.shooting}</span>
                  </div>
                  <div className="flex justify-between bg-black/20 light:bg-slate-100 p-1.5 rounded border border-transparent light:border-slate-200">
                    <span className="text-slate-400 light:text-slate-600">PAS</span>
                    <span className="font-bold text-white light:text-slate-900">{player.attributes.passing}</span>
                  </div>
                  <div className="flex justify-between bg-black/20 light:bg-slate-100 p-1.5 rounded border border-transparent light:border-slate-200">
                    <span className="text-slate-400 light:text-slate-600">DRI</span>
                    <span className="font-bold text-white light:text-slate-900">{player.attributes.dribbling}</span>
                  </div>
                  <div className="flex justify-between bg-black/20 light:bg-slate-100 p-1.5 rounded border border-transparent light:border-slate-200">
                    <span className="text-slate-400 light:text-slate-600">DEF</span>
                    <span className="font-bold text-white light:text-slate-900">{player.attributes.defending}</span>
                  </div>
                  <div className="flex justify-between bg-black/20 light:bg-slate-100 p-1.5 rounded border border-transparent light:border-slate-200">
                    <span className="text-slate-400 light:text-slate-600">PHY</span>
                    <span className="font-bold text-white light:text-slate-900">{player.attributes.physical}</span>
                  </div>
                </div>
              </div>

              {/* Action Button: Sign to Club (Only for admins or club creators) */}
              {eligibleClubs.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
                  <button
                    type="button"
                    onClick={() => {
                      setSigningModalPlayer(player);
                      setSelectedTargetTeamId(eligibleClubs[0].id);
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-teal-300 hover:text-teal-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>SIGN TO CLUB</span>
                  </button>
                </div>
              )}

            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 rounded-3xl bg-[var(--bg-surface)] border border-dashed border-[var(--border-color)] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mx-auto">
            <UserPlus className="w-6 h-6" />
          </div>
          <h3 className="font-display font-black text-xl text-[var(--text-primary)] uppercase">
            NO FREE AGENTS FOUND
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            No unattached footballers match your current search query or position filter.
          </p>
        </div>
      )}

      {/* 24-Batch Pagination: LOAD MORE FREE AGENTS */}
      {hasMoreFreeAgents && (
        <div className="pt-4 text-center">
          <button
            onClick={loadMoreFreeAgents}
            className="px-8 py-3 rounded-xl bg-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(20,184,166,0.4)] hover:scale-[1.02] cursor-pointer"
          >
            LOAD MORE FREE AGENTS ({displayedAgents.length - visibleFreeAgentsCount} REMAINING)
          </button>
        </div>
      )}

      {/* Contract Signing Modal */}
      {eligibleClubs.length > 0 && signingModalPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 landscape-mobile:p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[var(--bg-surface)] border border-teal-500/50 rounded-3xl p-6 sm:p-8 landscape-mobile:p-4 max-w-md w-full shadow-2xl relative text-left max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="eyebrow-mono text-[9px] font-bold text-teal-400 uppercase">
                  CONTRACT OFFER
                </span>
                <h3 className="font-display font-black text-xl text-[var(--text-primary)] uppercase">
                  SIGN {getPlayerDisplayName(signingModalPlayer)}
                </h3>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
              Assign this player to a registered domestic club. Their rating will update the squad's average overall rating immediately.
            </p>

            <div className="space-y-3 mb-6">
              <label className="eyebrow-mono text-[10px] text-[var(--text-muted)] uppercase block font-bold">
                SELECT DESTINATION CLUB:
              </label>
              <div className="relative">
                <select
                  value={selectedTargetTeamId}
                  onChange={(e) => setSelectedTargetTeamId(e.target.value)}
                  className="w-full appearance-none px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-teal-400 cursor-pointer"
                >
                  {eligibleClubs.map((club) => (
                    <option key={club.id} value={club.id}>
                      {club.name} ({club.squad.length} Players · {club.overallRating} OVR)
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSigningModalPlayer(null)}
                className="px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignConfirm}
                className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
              >
                CONFIRM CONTRACT
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
