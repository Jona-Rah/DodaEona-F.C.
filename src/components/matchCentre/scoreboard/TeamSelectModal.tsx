import React, { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { X, Search, Shield, Trophy, ArrowRight, Check } from 'lucide-react';
import { Team, getTeamType } from '../../../types/matchCentre';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import { filterTeamsFast } from '../../../utils/globalDatabaseSearch';

interface TeamSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSide: 'home' | 'away';
  currentSelectedTeam: Team | null;
  onSelectTeam: (team: Team) => void;
}

type TeamCategoryFilter = 'all' | 'mens-clubs' | 'womens-clubs' | 'mens-nations' | 'womens-nations';

export const TeamSelectModal: React.FC<TeamSelectModalProps> = ({
  isOpen,
  onClose,
  targetSide,
  currentSelectedTeam,
  onSelectTeam,
}) => {
  const { teams, selection } = useMatchCentre();
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [category, setCategory] = useState<TeamCategoryFilter>('all');

  const filteredTeams = useMemo(() => {
    return filterTeamsFast(
      teams,
      deferredSearch,
      (t) => {
        if (category === 'mens-clubs') return getTeamType(t) === 'club' && t.gender === 'men';
        if (category === 'womens-clubs') return getTeamType(t) === 'club' && t.gender === 'women';
        if (category === 'mens-nations') return getTeamType(t) === 'country' && t.gender === 'men';
        if (category === 'womens-nations') return getTeamType(t) === 'country' && t.gender === 'women';
        return true;
      }
    );
  }, [teams, category, deferredSearch]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePick = (t: Team) => {
    onSelectTeam(t);
    onClose();
  };

  const handleLoadFromMatchCentre = () => {
    const candidate = targetSide === 'home' ? selection.homeTeam : selection.awayTeam;
    if (candidate) {
      handlePick(candidate);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] sm:max-h-[85vh] my-auto flex flex-col rounded-2xl bg-[#070F1B] light:bg-white border border-[#7ADBF0]/30 light:border-slate-300 shadow-2xl overflow-hidden text-slate-100 light:text-slate-900 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header Accent */}
        <div className="h-1 w-full bg-gradient-to-r from-[#0891B2] via-[#7ADBF0] to-[#D6B56E] shrink-0" />

        {/* Modal Header */}
        <div className="p-5 landscape-mobile:p-3 pb-3 landscape-mobile:pb-2.5 flex items-center justify-between border-b border-white/10 light:border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-widest text-[#7ADBF0] light:text-cyan-700 uppercase font-semibold">
                Team Selection
              </div>
              <h3 className="font-bold text-lg text-white light:text-slate-900 capitalize">
                Select {targetSide} Team
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 hover:bg-white/5 light:hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="p-4 landscape-mobile:p-3 space-y-3 landscape-mobile:space-y-2 border-b border-white/10 light:border-slate-200 shrink-0 bg-[#050A12]/50 light:bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && search.trim() && filteredTeams.length > 0) {
                  e.preventDefault();
                  handlePick(filteredTeams[0]);
                }
              }}
              placeholder="Search by team name, country, league, or code..."
              className="w-full bg-[#0B1525] light:bg-white border border-white/10 light:border-slate-300 text-xs sm:text-sm text-white light:text-slate-900 placeholder:text-slate-500 rounded-xl pl-10 pr-9 py-2.5 focus:outline-none focus:border-[#7ADBF0] transition-colors"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="p-1 rounded-md text-slate-400 hover:text-white light:hover:text-slate-900 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                aria-label="Clear team search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <button
              onClick={() => setCategory('all')}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap cursor-pointer transition-colors ${
                category === 'all'
                  ? 'bg-[#7ADBF0] text-[#050A12] font-bold'
                  : 'bg-[#0B1525] light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white'
              }`}
            >
              All Teams ({teams.length})
            </button>
            <button
              onClick={() => setCategory('mens-clubs')}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap cursor-pointer transition-colors ${
                category === 'mens-clubs'
                  ? 'bg-[#7ADBF0] text-[#050A12] font-bold'
                  : 'bg-[#0B1525] light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white'
              }`}
            >
              Men's Clubs
            </button>
            <button
              onClick={() => setCategory('womens-clubs')}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap cursor-pointer transition-colors ${
                category === 'womens-clubs'
                  ? 'bg-[#7ADBF0] text-[#050A12] font-bold'
                  : 'bg-[#0B1525] light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white'
              }`}
            >
              Women's Clubs
            </button>
            <button
              onClick={() => setCategory('mens-nations')}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap cursor-pointer transition-colors ${
                category === 'mens-nations'
                  ? 'bg-[#7ADBF0] text-[#050A12] font-bold'
                  : 'bg-[#0B1525] light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white'
              }`}
            >
              Men's Nations
            </button>
            <button
              onClick={() => setCategory('womens-nations')}
              className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap cursor-pointer transition-colors ${
                category === 'womens-nations'
                  ? 'bg-[#7ADBF0] text-[#050A12] font-bold'
                  : 'bg-[#0B1525] light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white'
              }`}
            >
              Women's Nations
            </button>
          </div>

          {/* Shortcut to use Match Centre selection if available */}
          {(targetSide === 'home' ? selection.homeTeam : selection.awayTeam) && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#7ADBF0]/10 border border-[#7ADBF0]/30 text-xs">
              <span className="text-slate-300 light:text-slate-700">
                Current Match Centre Selection:{' '}
                <strong className="text-white light:text-slate-900">
                  {(targetSide === 'home' ? selection.homeTeam : selection.awayTeam)?.name}
                </strong>
              </span>
              <button
                type="button"
                onClick={handleLoadFromMatchCentre}
                className="px-2.5 py-1 rounded-lg bg-[#7ADBF0] text-[#050A12] font-bold text-[11px] hover:brightness-110 cursor-pointer"
              >
                Use Team
              </button>
            </div>
          )}
        </div>

        {/* Scrollable Teams Grid */}
        <div className="flex-1 overflow-y-auto p-4 landscape-mobile:p-3 space-y-2 divide-y divide-white/5 light:divide-slate-200">
          {filteredTeams.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              No teams found matching &ldquo;{search}&rdquo;. Try another name or category.
            </div>
          ) : (
            filteredTeams.map((team) => {
              const isSelected = currentSelectedTeam?.id === team.id;
              const isClub = getTeamType(team) === 'club';

              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => handlePick(team)}
                  className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-all cursor-pointer group pt-3.5 ${
                    isSelected
                      ? 'bg-[#7ADBF0]/15 border border-[#7ADBF0]/50 shadow-[0_0_15px_rgba(122,219,240,0.15)]'
                      : 'hover:bg-white/[0.04] light:hover:bg-slate-100 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#0B1525] light:bg-slate-100 border border-white/10 light:border-slate-300 flex items-center justify-center p-1 shrink-0">
                      <img
                        src={team.crestUrl}
                        alt={team.name}
                        className="w-full h-full object-contain drop-shadow"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = '/assets/aistudio/DodaEona_F.C._V2_Fill_Color_8c96db06.png';
                        }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white light:text-slate-900 group-hover:text-[#7ADBF0] transition-colors truncate">
                          {team.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 light:bg-slate-200 text-slate-300 light:text-slate-700">
                          {team.code}
                        </span>
                        {team.gender === 'women' && (
                          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-pink-500/20 text-pink-300">
                            Women
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 light:text-slate-500 truncate mt-0.5">
                        {isClub ? team.league || team.country : `${team.country} · National Team`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-mono text-slate-400">Rating</div>
                      <div className="font-display text-base text-[#D6B56E] light:text-amber-700">
                        {team.overallRating}
                      </div>
                    </div>
                    {isSelected ? (
                      <div className="w-6 h-6 rounded-full bg-[#7ADBF0] text-[#050A12] flex items-center justify-center">
                        <Check className="w-4 h-4 stroke-[3]" />
                      </div>
                    ) : (
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-[#7ADBF0] group-hover:translate-x-1 transition-all" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 landscape-mobile:py-2.5 landscape-mobile:px-4 border-t border-white/10 light:border-slate-200 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Showing {filteredTeams.length} teams</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
