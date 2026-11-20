import React from 'react';
import {
  Compass,
  ClipboardList,
  LayoutGrid,
  Trophy,
  User,
  Users,
} from 'lucide-react';

export interface DossierTabDef {
  id: number;
  label: string;
  hint: string;
  icon: React.FC<{ className?: string }>;
  railGradient: string;
  leftBarColor: string;
  activeCardClass: string;
  activeIconClass: string;
  inactiveIconClass: string;
  underlineColor: string;
}

export const DOSSIER_TABS: DossierTabDef[] = [
  {
    id: 1,
    label: 'Overview',
    hint: 'The club at a glance',
    icon: LayoutGrid,
    railGradient: 'from-[#38BDF8]/30 via-[#38BDF8]/10 to-transparent',
    leftBarColor: 'bg-[#38BDF8]',
    activeCardClass:
      'border-[#38BDF8]/70 bg-[#38BDF8]/10 shadow-[0_0_20px_rgba(56,189,248,0.16)] light:bg-sky-50 light:border-sky-500',
    activeIconClass:
      'bg-gradient-to-br from-[#38BDF8] to-[#0284C7] text-slate-950 shadow-[0_0_14px_rgba(56,189,248,0.45)]',
    inactiveIconClass: 'bg-[#38BDF8]/12 text-[#38BDF8] light:bg-sky-100 light:text-sky-700',
    underlineColor: 'bg-[#38BDF8]',
  },
  {
    id: 2,
    label: 'Tactics',
    hint: 'How this side plays',
    icon: Compass,
    railGradient: 'from-[#6366F1]/30 via-[#6366F1]/10 to-transparent',
    leftBarColor: 'bg-[#6366F1]',
    activeCardClass:
      'border-[#6366F1]/70 bg-[#6366F1]/12 shadow-[0_0_20px_rgba(99,102,241,0.18)] light:bg-indigo-50 light:border-indigo-500',
    activeIconClass:
      'bg-gradient-to-br from-[#818CF8] to-[#4F46E5] text-white shadow-[0_0_14px_rgba(99,102,241,0.45)]',
    inactiveIconClass: 'bg-[#6366F1]/12 text-[#818CF8] light:bg-indigo-100 light:text-indigo-700',
    underlineColor: 'bg-[#6366F1]',
  },
  {
    id: 3,
    label: 'Preferred XI',
    hint: 'The strongest eleven',
    icon: ClipboardList,
    railGradient: 'from-[#10B981]/30 via-[#10B981]/10 to-transparent',
    leftBarColor: 'bg-[#10B981]',
    activeCardClass:
      'border-[#10B981]/70 bg-[#10B981]/12 shadow-[0_0_20px_rgba(16,185,129,0.18)] light:bg-emerald-50 light:border-emerald-500',
    activeIconClass:
      'bg-gradient-to-br from-[#34D399] to-[#059669] text-slate-950 shadow-[0_0_14px_rgba(16,185,129,0.45)]',
    inactiveIconClass: 'bg-[#10B981]/12 text-[#34D399] light:bg-emerald-100 light:text-emerald-700',
    underlineColor: 'bg-[#10B981]',
  },
  {
    id: 4,
    label: 'Squad',
    hint: 'Every registered player',
    icon: Users,
    railGradient: 'from-[#8B5CF6]/30 via-[#8B5CF6]/10 to-transparent',
    leftBarColor: 'bg-[#8B5CF6]',
    activeCardClass:
      'border-[#8B5CF6]/70 bg-[#8B5CF6]/12 shadow-[0_0_20px_rgba(139,92,246,0.18)] light:bg-violet-50 light:border-violet-500',
    activeIconClass:
      'bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white shadow-[0_0_14px_rgba(139,92,246,0.45)]',
    inactiveIconClass: 'bg-[#8B5CF6]/12 text-[#A78BFA] light:bg-violet-100 light:text-violet-700',
    underlineColor: 'bg-[#8B5CF6]',
  },
  {
    id: 5,
    label: 'Manager',
    hint: 'The dugout and its history',
    icon: User,
    railGradient: 'from-[#F43F5E]/30 via-[#F43F5E]/10 to-transparent',
    leftBarColor: 'bg-[#F43F5E]',
    activeCardClass:
      'border-[#F43F5E]/70 bg-[#F43F5E]/12 shadow-[0_0_20px_rgba(244,63,94,0.18)] light:bg-rose-50 light:border-rose-500',
    activeIconClass:
      'bg-gradient-to-br from-[#FB7185] to-[#E11D48] text-white shadow-[0_0_14px_rgba(244,63,94,0.45)]',
    inactiveIconClass: 'bg-[#F43F5E]/12 text-[#FB7185] light:bg-rose-100 light:text-rose-700',
    underlineColor: 'bg-[#F43F5E]',
  },
  {
    id: 6,
    label: 'Trophies',
    hint: 'Silverware in the cabinet',
    icon: Trophy,
    railGradient: 'from-[#F59E0B]/30 via-[#F59E0B]/10 to-transparent',
    leftBarColor: 'bg-[#F59E0B]',
    activeCardClass:
      'border-[#F59E0B]/70 bg-[#F59E0B]/12 shadow-[0_0_20px_rgba(245,158,11,0.18)] light:bg-amber-50 light:border-amber-500',
    activeIconClass:
      'bg-gradient-to-br from-[#FBBF24] to-[#D97706] text-slate-950 shadow-[0_0_14px_rgba(245,158,11,0.45)]',
    inactiveIconClass: 'bg-[#F59E0B]/12 text-[#FBBF24] light:bg-amber-100 light:text-amber-700',
    underlineColor: 'bg-[#F59E0B]',
  },
];

interface DossierTabBarProps {
  activeTab: number;
  onSelectTab: (tab: number) => void;
}

export const DossierTabBar: React.FC<DossierTabBarProps> = ({ activeTab, onSelectTab }) => {
  const current = DOSSIER_TABS.find((t) => t.id === activeTab) || DOSSIER_TABS[0];
  const ActiveIcon = current.icon;

  return (
    <div className="relative rounded-2xl bg-[#0B121E] light:bg-white border border-white/[0.08] light:border-slate-200 overflow-hidden shadow-xl">
      {/* Colored Header Rail with Active Tab Info + Counter */}
      <div
        className={`relative px-5 py-3.5 border-b border-white/[0.06] light:border-slate-200 bg-gradient-to-r ${current.railGradient} flex items-center justify-between gap-4`}
      >
        <span className={`absolute left-0 top-0 bottom-0 w-1 ${current.leftBarColor}`} />

        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${current.activeIconClass}`}>
            <ActiveIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block font-mono text-[9px] tracking-[0.22em] text-slate-400 light:text-slate-500 uppercase">
              CLUB DOSSIER
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-white light:text-slate-900">
                {current.label}
              </span>
              <span className="text-xs text-slate-400 light:text-slate-600 truncate">
                {current.hint}
              </span>
            </div>
          </div>
        </div>

        <span className="px-3 py-1 rounded-full bg-[#070D17]/80 light:bg-slate-100 border border-white/10 light:border-slate-200 font-mono text-[11px] text-slate-300 light:text-slate-700 tabular-nums shrink-0">
          {activeTab} / 6
        </span>
      </div>

      {/* 3-Column Mobile / 6-Column Tablet+ Icon Tile Grid */}
      <div className="p-3 grid grid-cols-3 md:grid-cols-6 gap-2.5">
        {DOSSIER_TABS.map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`group relative rounded-xl px-3 py-3 flex flex-col items-center justify-center gap-2 border transition-all duration-200 cursor-pointer hover:-translate-y-0.5 ${
                isSelected
                  ? tab.activeCardClass
                  : 'border-transparent bg-transparent hover:bg-white/[0.04] light:hover:bg-slate-50 hover:border-white/[0.08] light:hover:border-slate-200'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 ${
                  isSelected ? tab.activeIconClass : tab.inactiveIconClass
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span
                className={`text-xs whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'font-bold text-white light:text-slate-900'
                    : 'font-medium text-slate-400 light:text-slate-600 group-hover:text-white light:group-hover:text-slate-900'
                }`}
              >
                {tab.label}
              </span>
              <span
                className={`h-0.5 w-4 rounded-full transition-opacity ${
                  isSelected ? `${tab.underlineColor} opacity-100` : 'opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
