import React from 'react';
import { Tag, Check, Sparkles, Compass, BookOpen, Trophy, Shield, Activity, Users, Star } from 'lucide-react';
import { ReadsCategory } from '../../types/reads';

interface CategoryFilterSectionProps {
  categories: { name: ReadsCategory; count: number }[];
  selectedCategory: ReadsCategory | null;
  onSelectCategory: (cat: ReadsCategory | null) => void;
}

export const CategoryFilterSection: React.FC<CategoryFilterSectionProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  const getCategoryColor = (cat: ReadsCategory, isSelected: boolean) => {
    if (isSelected) {
      return 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 font-black shadow-[0_0_20px_rgba(245,158,11,0.45)] border-amber-300';
    }

    switch (cat) {
      case 'Football Tactics and Strategy':
        return 'bg-blue-950/40 text-blue-300 border-blue-500/30 hover:border-blue-400 hover:bg-blue-950/70 light:bg-blue-50 light:text-blue-700 light:border-blue-300 light:hover:bg-blue-100';
      case 'Football History and Culture':
        return 'bg-amber-950/40 text-amber-300 border-amber-500/30 hover:border-amber-400 hover:bg-amber-950/70 light:bg-amber-50 light:text-amber-800 light:border-amber-300 light:hover:bg-amber-100';
      case 'Youth Academy and Player Development':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:border-emerald-400 hover:bg-emerald-950/70 light:bg-emerald-50 light:text-emerald-800 light:border-emerald-300 light:hover:bg-emerald-100';
      case 'Competitions and Tournaments':
        return 'bg-rose-950/40 text-rose-300 border-rose-500/30 hover:border-rose-400 hover:bg-rose-950/70 light:bg-rose-50 light:text-rose-700 light:border-rose-300 light:hover:bg-rose-100';
      case 'Players and Legends':
        return 'bg-purple-950/40 text-purple-300 border-purple-500/30 hover:border-purple-400 hover:bg-purple-950/70 light:bg-purple-50 light:text-purple-700 light:border-purple-300 light:hover:bg-purple-100';
      case 'Football Rules and Regulations':
        return 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-950/70 light:bg-cyan-50 light:text-cyan-800 light:border-cyan-300 light:hover:bg-cyan-100';
      case 'Activities and Challenges':
        return 'bg-fuchsia-950/40 text-fuchsia-300 border-fuchsia-500/30 hover:border-fuchsia-400 hover:bg-fuchsia-950/70 light:bg-fuchsia-50 light:text-fuchsia-700 light:border-fuchsia-300 light:hover:bg-fuchsia-100';
      default:
        return 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-color)]';
    }
  };

  return (
    <section 
      aria-label="Discover by Category"
      className="py-12 sm:py-16 landscape-mobile:py-5 px-4 sm:px-6 lg:px-8 border-b border-[var(--border-color)] bg-[var(--bg-surface)] backdrop-blur-md transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 landscape-mobile:mb-3">
          <div className="flex items-center gap-2.5">
            <Tag className="w-4 h-4 text-[var(--accent-cyan)]" />
            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">
              Discover by Football Discipline
            </h3>
          </div>

          {selectedCategory && (
            <button
              onClick={() => onSelectCategory(null)}
              className="text-xs font-bold text-[var(--accent-cyan)] hover:underline underline-offset-4 uppercase tracking-wider"
            >
              Reset to all categories
            </button>
          )}
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-3 overflow-x-auto pb-3 scrollbar-none">
          
          {/* "All" button */}
          <button
            onClick={() => onSelectCategory(null)}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 shrink-0 border ${
              selectedCategory === null
                ? 'bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-color)]'
            }`}
          >
            <span>All Publications</span>
            {selectedCategory === null && <Check className="w-3.5 h-3.5" />}
          </button>

          {/* Dynamic Category Buttons */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => onSelectCategory(isSelected ? null : cat.name)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2.5 shrink-0 border ${getCategoryColor(
                  cat.name,
                  isSelected
                )}`}
              >
                <span>{cat.name}</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                  isSelected
                    ? 'bg-slate-950/20 text-slate-950 font-black'
                    : 'bg-black/40 text-slate-200 light:bg-white/80 light:text-slate-700'
                }`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
};
