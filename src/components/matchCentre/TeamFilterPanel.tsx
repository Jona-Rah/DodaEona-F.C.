import React, { useState, useMemo } from 'react';
import { Search, X, Filter, RotateCcw, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { useMatchCentre } from '../../context/MatchCentreContext';

export const TeamFilterPanel: React.FC = () => {
  const { teams, teamType, filters, setFilters, resetFilters, counts } = useMatchCentre();
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Derive unique countries and leagues/confederations for current team type
  const availableCountries = useMemo(() => {
    const list = teams
      .filter((t) => t.type === teamType)
      .map((t) => t.country);
    return Array.from(new Set(list)).sort();
  }, [teams, teamType]);

  const availableLeagues = useMemo(() => {
    if (teamType !== 'club') return [];
    const list = teams
      .filter((t) => t.type === 'club' && t.league)
      .map((t) => t.league as string);
    return Array.from(new Set(list)).sort();
  }, [teams, teamType]);

  const confederations = ['UEFA', 'CONMEBOL', 'CONCACAF', 'CAF', 'AFC', 'OFC'];

  // Count active non-default filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery.trim()) count++;
    if (filters.country !== 'all') count++;
    if (teamType === 'club' && filters.league !== 'all') count++;
    if (teamType === 'national' && filters.confederation !== 'all') count++;
    if (filters.gender !== 'all') count++;
    if (teamType === 'club' && filters.clubType !== 'all') count++;
    if (filters.ratingRange !== 'all') count++;
    if (filters.sortBy !== 'rating-desc') count++;
    return count;
  }, [filters, teamType]);

  return (
    <div className="space-y-4">
      
      {/* 1. Global Search Bar & Mobile Filter Trigger */}
      <div className="flex items-center gap-3">
        
        {/* Search Input Container */}
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--accent-gold)]">
            <Search className="w-4 h-4" />
          </div>

          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Search teams, countries, leagues, or competitions..."
            aria-label="Search teams database"
            className="w-full pl-10 pr-24 py-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition-all shadow-inner backdrop-blur-md"
          />

          {/* Clear Search Query */}
          {filters.searchQuery && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
              aria-label="Clear search query"
              className="absolute inset-y-0 right-3 flex items-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Mobile Filters Toggle Button */}
        <button
          onClick={() => setMobileFilterOpen(true)}
          className="lg:hidden inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] hover:border-[var(--accent-gold)] transition-colors shadow-sm shrink-0"
        >
          <SlidersHorizontal className="w-4 h-4 text-[var(--accent-gold)]" />
          <span>Filters</span>
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-[var(--accent-gold)] text-slate-950 font-mono text-[10px] font-black flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>

      </div>

      {/* 2. Desktop Filters Ribbon (Compact dropdowns and pills) */}
      <div className="hidden lg:flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm">
        
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* A. Country Dropdown */}
          <div className="relative">
            <select
              value={filters.country}
              onChange={(e) => setFilters((prev) => ({ ...prev, country: e.target.value }))}
              aria-label="Filter by Country"
              className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--accent-gold)]/60 text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="all">All Countries</option>
              {availableCountries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* B. League (for clubs) or Confederation (for national teams) */}
          {teamType === 'club' ? (
            <div className="relative">
              <select
                value={filters.league}
                onChange={(e) => setFilters((prev) => ({ ...prev, league: e.target.value }))}
                aria-label="Filter by League"
                className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--accent-gold)]/60 text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
              >
                <option value="all">All Domestic Leagues</option>
                {availableLeagues.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <div className="relative">
              <select
                value={filters.confederation}
                onChange={(e) => setFilters((prev) => ({ ...prev, confederation: e.target.value }))}
                aria-label="Filter by Confederation"
                className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--accent-gold)]/60 text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
              >
                <option value="all">All Confederations</option>
                {confederations.map((conf) => (
                  <option key={conf} value={conf}>{conf}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}

          {/* C. Gender Pills */}
          <div className="flex items-center rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] p-0.5 text-xs font-bold">
            <button
              onClick={() => setFilters((prev) => ({ ...prev, gender: 'all' }))}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                filters.gender === 'all'
                  ? 'bg-[#C5A059] text-slate-950 font-black'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, gender: 'men' }))}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                filters.gender === 'men'
                  ? 'bg-[#C5A059] text-slate-950 font-black'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Men's
            </button>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, gender: 'women' }))}
              className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                filters.gender === 'women'
                  ? 'bg-[#C5A059] text-slate-950 font-black'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Women's
            </button>
          </div>

          {/* D. Club Type (Standard vs ICON) - Clubs only */}
          {teamType === 'club' && (
            <div className="flex items-center rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] p-0.5 text-xs font-bold">
              <button
                onClick={() => setFilters((prev) => ({ ...prev, clubType: 'all' }))}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  filters.clubType === 'all'
                    ? 'bg-[#C5A059] text-slate-950 font-black'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                All Clubs
              </button>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, clubType: 'standard' }))}
                className={`px-2.5 py-1.5 rounded-lg transition-colors ${
                  filters.clubType === 'standard'
                    ? 'bg-[#C5A059] text-slate-950 font-black'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, clubType: 'icon' }))}
                className={`px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                  filters.clubType === 'icon'
                    ? 'bg-gradient-to-r from-[#C5A059] to-[#E5C384] text-slate-950 font-black shadow-sm'
                    : 'text-[#C5A059] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>⭐ ICON Clubs</span>
              </button>
            </div>
          )}

          {/* E. Rating Range Dropdown */}
          <div className="relative">
            <select
              value={filters.ratingRange}
              onChange={(e) => setFilters((prev) => ({ ...prev, ratingRange: e.target.value as any }))}
              aria-label="Filter by Overall Rating"
              className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--accent-gold)]/60 text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
            >
              <option value="all">Rating: All Tiers</option>
              <option value="85+">Tier 1: 85+ World Elite</option>
              <option value="80-84">Tier 2: 80–84 Champions</option>
              <option value="75-79">Tier 3: 75–79 Contenders</option>
              <option value="<75">Tier 4: Under 75</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

        </div>

        {/* Right side: Sorting & Clear Action */}
        <div className="flex items-center gap-2.5">
          
          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2">
            <span className="eyebrow-mono text-[10px] text-[var(--text-muted)] uppercase">Sort:</span>
            <div className="relative">
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
                aria-label="Sort Teams"
                className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--accent-gold)] text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
              >
                <option value="rating-desc">Highest Rating</option>
                <option value="rating-asc">Lowest Rating</option>
                <option value="name-asc">Team Name (A–Z)</option>
                <option value="name-desc">Team Name (Z–A)</option>
                <option value="country">Country</option>
                <option value="league">{teamType === 'club' ? 'League' : 'Confederation'}</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Clear Filters Button (Visible when filters are active) */}
          {activeFiltersCount > 0 && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-colors cursor-pointer"
              title="Reset all active filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ({activeFiltersCount})</span>
            </button>
          )}

        </div>

      </div>

      {/* 3. Mobile Filter Sheet / Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center landscape-mobile:items-center justify-center p-0 sm:p-4 landscape-mobile:p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200 lg:hidden">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-t-3xl sm:rounded-3xl landscape-mobile:rounded-2xl w-full max-w-lg p-6 landscape-mobile:p-4 space-y-5 landscape-mobile:space-y-3 shadow-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[var(--accent-gold)]" />
                <h3 className="font-display font-black text-lg text-[var(--text-primary)] uppercase">
                  FILTER {teamType === 'club' ? 'CLUBS' : 'NATIONAL TEAMS'}
                </h3>
              </div>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="p-1.5 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Country Selector */}
            <div className="space-y-1.5">
              <label className="eyebrow-mono text-[10px] text-[var(--text-muted)] uppercase">Country</label>
              <select
                value={filters.country}
                onChange={(e) => setFilters((prev) => ({ ...prev, country: e.target.value }))}
                className="w-full p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] font-bold focus:outline-none"
              >
                <option value="all">All Countries</option>
                {availableCountries.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* League / Confederation Selector */}
            {teamType === 'club' ? (
              <div className="space-y-1.5">
                <label className="eyebrow-mono text-[10px] text-[var(--text-muted)] uppercase">Domestic League</label>
                <select
                  value={filters.league}
                  onChange={(e) => setFilters((prev) => ({ ...prev, league: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] font-bold focus:outline-none"
                >
                  <option value="all">All Domestic Leagues</option>
                  {availableLeagues.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="eyebrow-mono text-[10px] text-[var(--text-muted)] uppercase">Confederation</label>
                <select
                  value={filters.confederation}
                  onChange={(e) => setFilters((prev) => ({ ...prev, confederation: e.target.value }))}
                  className="w-full p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] font-bold focus:outline-none"
                >
                  <option value="all">All Confederations</option>
                  {confederations.map((conf) => (
                    <option key={conf} value={conf}>{conf}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Gender Selection */}
            <div className="space-y-1.5">
              <label className="eyebrow-mono text-[10px] text-[var(--text-muted)] uppercase">Gender</label>
              <div className="grid grid-cols-3 gap-2">
                {(['all', 'men', 'women'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setFilters((prev) => ({ ...prev, gender: g }))}
                    className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                      filters.gender === g
                        ? 'bg-[#C5A059] text-slate-950 font-black'
                        : 'bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {g === 'all' ? 'All' : g === 'men' ? "Men's" : "Women's"}
                  </button>
                ))}
              </div>
            </div>

            {/* Club Type (Clubs only) */}
            {teamType === 'club' && (
              <div className="space-y-1.5">
                <label className="eyebrow-mono text-[10px] text-[var(--text-muted)] uppercase">Club Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'standard', label: 'Standard' },
                    { id: 'icon', label: '⭐ ICON' },
                  ].map((ct) => (
                    <button
                      key={ct.id}
                      onClick={() => setFilters((prev) => ({ ...prev, clubType: ct.id as any }))}
                      className={`py-2 rounded-xl text-xs font-bold uppercase transition-all ${
                        filters.clubType === ct.id
                          ? 'bg-[#C5A059] text-slate-950 font-black'
                          : 'bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rating Range */}
            <div className="space-y-1.5">
              <label className="eyebrow-mono text-[10px] text-[var(--text-muted)] uppercase">Rating Tier</label>
              <select
                value={filters.ratingRange}
                onChange={(e) => setFilters((prev) => ({ ...prev, ratingRange: e.target.value as any }))}
                className="w-full p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] font-bold focus:outline-none"
              >
                <option value="all">Rating: All Tiers</option>
                <option value="85+">Tier 1: 85+ World Elite</option>
                <option value="80-84">Tier 2: 80–84 Champions</option>
                <option value="75-79">Tier 3: 75–79 Contenders</option>
                <option value="<75">Tier 4: Under 75</option>
              </select>
            </div>

            {/* Sort Order */}
            <div className="space-y-1.5">
              <label className="eyebrow-mono text-[10px] text-[var(--text-muted)] uppercase">Sort Order</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
                className="w-full p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs text-[var(--text-primary)] font-bold focus:outline-none"
              >
                <option value="rating-desc">Highest Overall Rating</option>
                <option value="rating-asc">Lowest Overall Rating</option>
                <option value="name-asc">Team Name (A–Z)</option>
                <option value="name-desc">Team Name (Z–A)</option>
                <option value="country">Country</option>
              </select>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-between gap-3">
              <button
                onClick={() => {
                  resetFilters();
                  setMobileFilterOpen(false);
                }}
                className="px-4 py-3 rounded-xl bg-white/[0.05] text-xs font-bold text-[var(--text-secondary)]"
              >
                Reset All
              </button>
              <button
                onClick={() => setMobileFilterOpen(false)}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#E5C384] text-slate-950 font-black text-xs uppercase tracking-wider text-center"
              >
                Apply Filters ({counts.activeResults} Results)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
