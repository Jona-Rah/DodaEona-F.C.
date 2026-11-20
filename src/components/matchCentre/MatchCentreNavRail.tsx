import React from 'react';
import { Award, Briefcase, Globe, LayoutDashboard, Shield, Swords, Timer, Trophy } from 'lucide-react';
import { MatchCentreTab } from '../../types/matchCentre';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { useAuth } from '../../context/AuthContext';

interface MatchCentreNavRailProps {
  activeTab: MatchCentreTab;
  onSelectTab: (tab: MatchCentreTab) => void;
  onNavigateHome: () => void;
}

const MATCH_CENTRE_NAV_LINKS: Array<{ id: MatchCentreTab; label: string; adminOnly?: boolean }> = [
  { id: 'dashboard', label: 'Dashboard', adminOnly: false },
  { id: 'teams', label: 'Teams', adminOnly: false },
  { id: 'managers', label: 'Managers', adminOnly: false },
  { id: 'world', label: 'Football World 3D', adminOnly: false },
  { id: 'scoreboard', label: 'ScoreBoard', adminOnly: false },
  { id: 'simulate', label: 'Simulate a Match', adminOnly: false },
  { id: 'competitions', label: 'Tournament Maker', adminOnly: false },
  { id: 'quiz', label: 'Quiz Centre', adminOnly: false },
];

export const MatchCentreNavRail: React.FC<MatchCentreNavRailProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const { closeDossier, openManagersDirectory } = useMatchCentre();
  const { isAdmin } = useAuth();

  const visibleLinks = MATCH_CENTRE_NAV_LINKS.filter((link) => !link.adminOnly || isAdmin);

  const handleTabClick = (tab: MatchCentreTab) => {
    closeDossier();
    if (tab === 'managers') {
      openManagersDirectory();
      return;
    }
    onSelectTab(tab);
  };

  return (
    <div className="sticky top-[65px] sm:top-[73px] landscape-mobile:static lg:top-[124px] z-30 border-b border-white/[0.07] light:border-slate-200 bg-[#050A12]/97 light:bg-[#F4F7FA]/98 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 py-2.5 landscape-mobile:py-1.5">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 min-w-0 overflow-x-auto no-scrollbar py-1 px-1">
          {visibleLinks.map((link) => {
            const isActive = activeTab === link.id;
            const isYellowGlow = link.id === 'simulate' || link.id === 'competitions';
            const isRedGlow = link.id === 'teams' || link.id === 'managers';

            const buttonToneClass = isYellowGlow
              ? isActive
                ? 'bg-[radial-gradient(ellipse_at_center,rgba(250,204,21,0.30)_0%,rgba(234,179,8,0.10)_80%)] border border-yellow-300/90 text-yellow-200 shadow-[0_0_20px_rgba(250,204,21,0.42)] hover:border-yellow-200 hover:shadow-[0_0_24px_rgba(250,204,21,0.52)] light:bg-amber-100 light:bg-none light:border-amber-500 light:text-amber-950 light:shadow-[0_0_16px_rgba(245,158,11,0.32)]'
                : 'bg-yellow-500/[0.08] border border-yellow-400/55 text-yellow-100 shadow-[0_0_14px_rgba(250,204,21,0.22)] hover:text-yellow-50 hover:border-yellow-300 hover:shadow-[0_0_20px_rgba(250,204,21,0.36)] light:bg-amber-50/85 light:border-amber-400/75 light:text-amber-900 light:shadow-[0_0_12px_rgba(245,158,11,0.20)] light:hover:bg-amber-100'
              : isRedGlow
              ? isActive
                ? 'bg-[radial-gradient(ellipse_at_center,rgba(248,113,113,0.30)_0%,rgba(239,68,68,0.10)_80%)] border border-rose-400/90 text-rose-200 shadow-[0_0_20px_rgba(239,68,68,0.42)] hover:border-rose-300 hover:shadow-[0_0_24px_rgba(239,68,68,0.52)] light:bg-rose-100 light:bg-none light:border-rose-500 light:text-rose-950 light:shadow-[0_0_16px_rgba(239,68,68,0.32)]'
                : 'bg-red-500/[0.08] border border-rose-500/55 text-rose-100 shadow-[0_0_14px_rgba(239,68,68,0.22)] hover:text-rose-50 hover:border-rose-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.36)] light:bg-rose-50/85 light:border-rose-400/75 light:text-rose-900 light:shadow-[0_0_12px_rgba(239,68,68,0.20)] light:hover:bg-rose-100'
              : isActive
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(122,219,240,0.22)_0%,rgba(122,219,240,0.06)_80%)] border border-[#7ADBF0]/70 text-[#7ADBF0] shadow-[0_0_16px_rgba(122,219,240,0.22)] hover:border-[#7ADBF0] hover:shadow-[0_0_22px_rgba(122,219,240,0.35)] light:bg-cyan-50 light:bg-none light:border-cyan-600/70 light:text-cyan-800 light:shadow-[0_0_12px_rgba(8,145,178,0.18)] light:hover:bg-cyan-100/80'
              : 'bg-white/[0.03] border border-white/10 text-slate-300 hover:text-white hover:border-[#7ADBF0]/50 light:bg-white light:border-slate-200 light:text-slate-700 light:hover:border-cyan-500/50';

            const iconToneClass = isYellowGlow
              ? 'text-yellow-300 light:text-amber-600'
              : isRedGlow
              ? 'text-rose-400 light:text-rose-600'
              : 'text-[#7ADBF0] light:text-cyan-700';

            const Icon =
              link.id === 'dashboard'
                ? LayoutDashboard
                : link.id === 'world'
                ? Globe
                : link.id === 'simulate'
                ? Swords
                : link.id === 'scoreboard'
                ? Timer
                : link.id === 'competitions'
                ? Trophy
                : link.id === 'managers'
                ? Briefcase
                : link.id === 'quiz'
                ? Award
                : Shield;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => handleTabClick(link.id)}
                className={`group flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] ${buttonToneClass}`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 group-hover:scale-110 ${iconToneClass}`} />
                <span>{link.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
