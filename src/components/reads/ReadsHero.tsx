import React, { useState } from 'react';
import { Search, X, BookOpen } from 'lucide-react';
import { OFFICIAL_ASSETS } from '../../data/mockData';
import { BookVolume, ReadsCategory, ReadingSeriesItem } from '../../types/reads';
import {
  DatabaseSearchDropdown,
  useWholeDatabaseQuickSearch,
} from '../common/DatabaseSearchDropdown';

interface ReadsHeroProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onClearSearch: () => void;
  activeCategory: ReadsCategory | null;
  onSelectCategory: (cat: ReadsCategory | null) => void;
  totalBooksCount: number;
  totalSeriesCount: number;
  onSelectBook?: (book: BookVolume) => void;
  onSelectSeries?: (series: ReadingSeriesItem) => void;
}

export const ReadsHero: React.FC<ReadsHeroProps> = ({
  searchQuery,
  onSearchChange,
  onClearSearch,
  totalBooksCount,
  totalSeriesCount,
  onSelectBook,
  onSelectSeries,
}) => {
  const [searchFocused, setSearchFocused] = useState(false);
  const { warmIndex, openFullSearchModal } = useWholeDatabaseQuickSearch(
    searchQuery,
    false
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSearchFocused(false);
      return;
    }
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      setSearchFocused(false);
      openFullSearchModal();
    }
  };

  return (
    <section
      aria-label="Reads Hero"
      className="relative z-20 min-h-[460px] lg:min-h-[520px] landscape-mobile:min-h-0 flex items-center justify-center border-b border-[var(--border-color)] bg-[var(--bg-primary)] transition-colors duration-200"
    >
      {/* Background with football book texture & vibrant atmosphere */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none overflow-hidden">
        <img
          src={OFFICIAL_ASSETS.readsCardCover}
          alt="Football tactical reading background"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center scale-105 opacity-25 dark:opacity-35 filter blur-[0.5px]"
        />
        {/* Layered gradient scrims */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/80 to-[var(--bg-primary)]/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-primary)]/90 to-[var(--bg-primary)]/60" />

        {/* Radiant lighting beams */}
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[300px] bg-blue-600/15 dark:bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[400px] h-[300px] bg-amber-500/10 dark:bg-[#C5A059]/15 rounded-full blur-[100px]" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 landscape-mobile:py-5 text-center flex flex-col items-center">
        {/* Subtle Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--accent-gold)]/40 text-[var(--accent-gold)] eyebrow-mono mb-4 landscape-mobile:mb-2 backdrop-blur-md shadow-sm">
          <BookOpen className="w-3.5 h-3.5 text-[var(--accent-gold)] animate-pulse" />
          <span>THE DODAEONA F.C. PUBLISHING HOUSE</span>
        </div>

        {/* Confirmed Reads Anton Display Heading */}
        <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl landscape-mobile:text-3xl text-[var(--text-primary)] uppercase tracking-tight leading-[1.05] drop-shadow-md">
          EXPLORE THE WORLD OF FOOTBALL.
        </h1>

        {/* Confirmed Supporting Description */}
        <p className="mt-4 landscape-mobile:mt-2 text-sm sm:text-base lg:text-lg landscape-mobile:text-xs text-[var(--text-secondary)] max-w-2xl leading-relaxed font-normal text-balance">
          Discover football beyond the pitch. Explore educational books, fascinating stories, football history, exclusive reading series, and activities created for passionate football fans.
        </p>

        {/* Prominent Search Bar with Instant Whole-Database Clickable Options */}
        <div className="w-full max-w-2xl mt-8 landscape-mobile:mt-4 relative">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--accent-gold)]">
              <Search className="w-5 h-5" />
            </div>

            <input
              type="text"
              value={searchQuery}
              onFocus={() => {
                setSearchFocused(true);
                warmIndex();
              }}
              onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setSearchFocused(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search books, series, clubs, players, managers, stadiums..."
              aria-label="Search football reading library and database"
              className="w-full pl-12 pr-28 py-3.5 landscape-mobile:py-2.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition-all shadow-lg backdrop-blur-xl"
            />

            {/* Clear Button if query exists */}
            {searchQuery && (
              <button
                type="button"
                onClick={onClearSearch}
                aria-label="Clear search"
                className="absolute inset-y-0 right-28 pr-2 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Submit / Search All Database Button */}
            <div className="absolute inset-y-1.5 right-1.5 flex items-center">
              <button
                type="button"
                onClick={() => {
                  setSearchFocused(false);
                  if (searchQuery.trim()) openFullSearchModal();
                }}
                className="h-full px-5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-[#C5A059] to-[#E5C384] hover:from-[#D4B26F] hover:to-[#B69147] transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Search</span>
              </button>
            </div>
          </div>

          {searchFocused && searchQuery.trim().length >= 2 && (
            <DatabaseSearchDropdown
              query={searchQuery}
              isOpen={searchFocused}
              onClose={() => setSearchFocused(false)}
              prioritizeReads
              onSelectBook={onSelectBook}
              onSelectSeries={onSelectSeries}
              limits={{
                books: 5,
                series: 3,
                clubs: 3,
                players: 3,
                managers: 2,
                stadiums: 2,
                leagues: 2,
              }}
              className="absolute left-0 right-0 top-full mt-2 z-50"
            />
          )}

          {/* Quick Active Search Metadata */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between text-xs text-[var(--text-muted)] px-1 font-semibold">
            <div className="flex items-center gap-2.5 font-mono text-[11px]">
              <span className="text-[#38BDF8]">{totalSeriesCount} Curated Series</span>
              <span aria-hidden="true" className="text-[var(--border-color)]">·</span>
              <span className="text-[var(--accent-gold)]">{totalBooksCount} Available Volumes</span>
              <span aria-hidden="true" className="text-[var(--border-color)]">·</span>
              <span className="text-[#10B981]">In-App Reader + PDF</span>
            </div>

            {searchQuery && (
              <div className="text-[var(--accent-gold)] font-bold flex items-center gap-1">
                <span>Filtering by: &ldquo;{searchQuery}&rdquo;</span>
                <button
                  type="button"
                  onClick={onClearSearch}
                  className="ml-1 underline text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold cursor-pointer"
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
