import React, { useState, useMemo, useCallback, useEffect, useRef, useDeferredValue } from 'react';
import {
  Search,
  X,
  MapPin,
  Sparkles,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import {
  StadiumRecord,
  getAllStadiums,
  searchStadiums,
} from '../../../data/stadiumsDatabase';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import { StadiumExplorerMap } from './StadiumExplorerMap';
import { StadiumInfoPanel } from './StadiumInfoPanel';
import { useWholeDatabaseQuickSearch } from '../../common/DatabaseSearchDropdown';

type GenderFilter = 'all' | 'men' | 'women';
type CapacityFilter = 'all' | 'huge' | 'large' | 'medium';
type SortOrder = 'relevance' | 'capacity_desc' | 'club_asc' | 'stadium_asc';

const PAGE_SIZE = 60;

function applyCrestFallback(img: HTMLImageElement, fallbackUrl: string) {
  if (img.dataset.fallbackApplied === '1') return;
  img.dataset.fallbackApplied = '1';
  img.src = fallbackUrl;
}

interface StadiumExplorerViewProps {
  embedded?: boolean;
}

export const StadiumExplorerView: React.FC<StadiumExplorerViewProps> = ({
  embedded = false,
}) => {
  const allStadiums = useMemo(() => getAllStadiums(), []);
  const verifiedCount = useMemo(
    () => allStadiums.filter((s) => s.isVerifiedStadium).length,
    [allStadiums]
  );
  const { selectedStadiumClubId, clearSelectedStadiumClubId } = useMatchCentre();

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const { warmIndex, openFullSearchModal } = useWholeDatabaseQuickSearch(searchQuery, false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [searchSubmitCount, setSearchSubmitCount] = useState(0);

  const [selectedGender, setSelectedGender] = useState<GenderFilter>('all');
  const [selectedCapacity, setSelectedCapacity] = useState<CapacityFilter>('all');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedLeague, setSelectedLeague] = useState<string>('all');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('relevance');

  const [selectedStadiumId, setSelectedStadiumId] = useState<string | null>(
    () => (selectedStadiumClubId ? `stadium-${selectedStadiumClubId}` : 'stadium-fc27-1')
  );
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync if navigated here from a Team Dossier ("Stadium Map" button)
  useEffect(() => {
    if (!selectedStadiumClubId) return;
    const match = allStadiums.find((s) => s.clubId === selectedStadiumClubId);
    if (match) {
      setSelectedStadiumId(match.id);
      setSearchQuery('');
      setSelectedGender('all');
      setSelectedCapacity('all');
      setSelectedCountry('all');
      setSelectedLeague('all');
      setVerifiedOnly(false);
    }
    clearSelectedStadiumClubId();
  }, [selectedStadiumClubId, allStadiums, clearSelectedStadiumClubId]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setHighlightedIndex(-1);
  }, [
    searchQuery,
    selectedGender,
    selectedCapacity,
    selectedCountry,
    selectedLeague,
    verifiedOnly,
    sortOrder,
  ]);

  // Unique countries list
  const countries = useMemo(() => {
    const set = new Set<string>();
    allStadiums.forEach((s) => set.add(s.country));
    return Array.from(set).sort();
  }, [allStadiums]);

  // Leagues dynamically scoped to selectedCountry
  const leagues = useMemo(() => {
    const set = new Set<string>();
    for (const s of allStadiums) {
      if (selectedCountry === 'all' || s.country === selectedCountry) {
        set.add(s.league);
      }
    }
    return Array.from(set).sort();
  }, [allStadiums, selectedCountry]);

  // Reset selectedLeague if it's no longer in the filtered country
  useEffect(() => {
    if (selectedLeague !== 'all' && !leagues.includes(selectedLeague)) {
      setSelectedLeague('all');
    }
  }, [leagues, selectedLeague]);

  // Filtered and sorted stadiums (deferred for zero input lag)
  const filteredStadiums = useMemo(() => {
    let result = searchStadiums(deferredSearchQuery, allStadiums);

    if (selectedGender !== 'all') {
      result = result.filter((s) => s.gender === selectedGender);
    }

    if (selectedCapacity === 'huge') {
      result = result.filter((s) => s.capacity >= 60000);
    } else if (selectedCapacity === 'large') {
      result = result.filter((s) => s.capacity >= 40000 && s.capacity < 60000);
    } else if (selectedCapacity === 'medium') {
      result = result.filter((s) => s.capacity < 40000);
    }

    if (selectedCountry !== 'all') {
      result = result.filter((s) => s.country === selectedCountry);
    }

    if (selectedLeague !== 'all') {
      result = result.filter((s) => s.league === selectedLeague);
    }

    if (verifiedOnly) {
      result = result.filter((s) => s.isVerifiedStadium);
    }

    if (sortOrder === 'capacity_desc') {
      result = [...result].sort((a, b) => b.capacity - a.capacity);
    } else if (sortOrder === 'club_asc') {
      result = [...result].sort((a, b) => a.clubName.localeCompare(b.clubName));
    } else if (sortOrder === 'stadium_asc') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [
    allStadiums,
    deferredSearchQuery,
    selectedGender,
    selectedCapacity,
    selectedCountry,
    selectedLeague,
    verifiedOnly,
    sortOrder,
  ]);

  // Top 8 autocomplete suggestions while typing
  const autocompleteSuggestions = useMemo(() => {
    if (!deferredSearchQuery.trim()) return [];
    return filteredStadiums.slice(0, 8);
  }, [filteredStadiums, deferredSearchQuery]);

  // Keep selected stadium valid when structural filters narrow out the current one
  useEffect(() => {
    if (filteredStadiums.length === 0) return;
    if (
      selectedStadiumId &&
      !filteredStadiums.some((s) => s.id === selectedStadiumId) &&
      (selectedCountry !== 'all' ||
        selectedLeague !== 'all' ||
        selectedGender !== 'all' ||
        selectedCapacity !== 'all' ||
        verifiedOnly)
    ) {
      setSelectedStadiumId(filteredStadiums[0].id);
    }
  }, [
    filteredStadiums,
    selectedStadiumId,
    selectedCountry,
    selectedLeague,
    selectedGender,
    selectedCapacity,
    verifiedOnly,
  ]);

  // Windowed sidebar list so initial mount never fires 742 simultaneous image requests
  const displayedSidebarStadiums = useMemo(
    () => filteredStadiums.slice(0, visibleCount),
    [filteredStadiums, visibleCount]
  );

  // Selected stadium object
  const selectedStadium = useMemo(() => {
    if (!selectedStadiumId) return null;
    return allStadiums.find((s) => s.id === selectedStadiumId) || null;
  }, [allStadiums, selectedStadiumId]);

  // Co-located / groundsharing clubs at the exact selected coordinates
  const coLocatedClubs = useMemo(() => {
    if (!selectedStadium) return [];
    const targetLat = selectedStadium.coordinates.lat.toFixed(5);
    const targetLng = selectedStadium.coordinates.lng.toFixed(5);
    return allStadiums.filter(
      (s) =>
        s.coordinates.lat.toFixed(5) === targetLat &&
        s.coordinates.lng.toFixed(5) === targetLng
    );
  }, [allStadiums, selectedStadium]);

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
      selectedGender !== 'all' ||
      selectedCapacity !== 'all' ||
      selectedCountry !== 'all' ||
      selectedLeague !== 'all' ||
      verifiedOnly ||
      sortOrder !== 'relevance'
  );

  const fitFilterKey = `${selectedCountry}|${selectedLeague}|${selectedGender}|${selectedCapacity}|${verifiedOnly}|${searchSubmitCount}`;

  const handleSelectStadium = useCallback((stadium: StadiumRecord) => {
    setSelectedStadiumId(stadium.id);
    setIsSearchFocused(false);
    setHighlightedIndex(-1);
  }, []);

  const handlePickSuggestion = useCallback(
    (stadium: StadiumRecord) => {
      handleSelectStadium(stadium);
      setMobileTab('map');
    },
    [handleSelectStadium]
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedGender('all');
    setSelectedCapacity('all');
    setSelectedCountry('all');
    setSelectedLeague('all');
    setVerifiedOnly(false);
    setSortOrder('relevance');
  };

  const handleRandomDiscovery = () => {
    if (filteredStadiums.length === 0) return;
    const verifiedSubset = filteredStadiums.filter((s) => s.isVerifiedStadium);
    const pool = verifiedSubset.length > 0 ? verifiedSubset : filteredStadiums;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    setSelectedStadiumId(chosen.id);
    setMobileTab('map');
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsSearchFocused(false);
      setHighlightedIndex(-1);
      return;
    }

    if (e.key === 'ArrowDown') {
      if (autocompleteSuggestions.length === 0) return;
      e.preventDefault();
      setIsSearchFocused(true);
      setHighlightedIndex((prev) =>
        prev < autocompleteSuggestions.length - 1 ? prev + 1 : 0
      );
      return;
    }

    if (e.key === 'ArrowUp') {
      if (autocompleteSuggestions.length === 0) return;
      e.preventDefault();
      setIsSearchFocused(true);
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : autocompleteSuggestions.length - 1
      );
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const target =
        highlightedIndex >= 0 && autocompleteSuggestions[highlightedIndex]
          ? autocompleteSuggestions[highlightedIndex]
          : filteredStadiums[0];
      if (target) {
        handlePickSuggestion(target);
      } else {
        setSearchSubmitCount((c) => c + 1);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Compact Embedded Header */}
      {embedded ? (
        <div className="rounded-2xl p-4 sm:p-5 bg-[#070F1B]/95 light:bg-slate-50 border border-white/10 light:border-slate-300 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="font-mono text-[11px] uppercase tracking-widest text-[#7ADBF0] light:text-cyan-700 flex items-center gap-2 flex-wrap">
              <span>GOOGLE MAPS ARENA ATLAS</span>
              <span className="text-slate-500 light:text-slate-400">·</span>
              <span className="text-slate-300 light:text-slate-700 tabular-nums">
                {allStadiums.length} Clubs Mapped
              </span>
              <span className="text-slate-500 light:text-slate-400">·</span>
              <span className="text-emerald-300 light:text-emerald-700 tabular-nums">
                {verifiedCount} Verified Grounds
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 light:text-slate-700">
              Explore home stadiums for men&apos;s and women&apos;s clubs, switch between Map and Satellite imagery, and launch directions or Street View.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRandomDiscovery}
            className="px-4 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#06B6D4] text-white text-xs font-mono uppercase tracking-wider shadow-lg shadow-cyan-900/30 flex items-center gap-2 transition-colors cursor-pointer shrink-0 self-start sm:self-center"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Random Arena</span>
          </button>
        </div>
      ) : (
        <div className="rounded-2xl p-6 sm:p-8 relative overflow-hidden bg-gradient-to-r from-[#0C1527] via-[#09101E] to-[#060B14] light:from-slate-100 light:via-slate-50 light:to-white border border-white/10 light:border-slate-300 shadow-2xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="font-mono text-[11px] uppercase tracking-widest text-[#7ADBF0] light:text-cyan-700 flex items-center gap-2 flex-wrap">
                <span>GOOGLE MAPS ARENA ATLAS</span>
                <span className="text-slate-500 light:text-slate-400">·</span>
                <span className="text-slate-300 light:text-slate-700 tabular-nums">
                  {allStadiums.length} Clubs Mapped
                </span>
                <span className="text-slate-500 light:text-slate-400">·</span>
                <span className="text-emerald-300 light:text-emerald-700 tabular-nums">
                  {verifiedCount} Verified Grounds
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white light:text-slate-900 tracking-wide uppercase leading-none">
                STADIUM EXPLORER
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 light:text-slate-700 leading-relaxed">
                Locate verified home grounds for men&apos;s and women&apos;s clubs worldwide. Search instantly by club, stadium, city, or league, switch between Map and Satellite imagery, and launch directions or Street View.
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleRandomDiscovery}
                className="px-4 py-3 rounded-xl bg-[#0891B2] hover:bg-[#06B6D4] text-white text-xs font-mono uppercase tracking-wider shadow-lg shadow-cyan-900/30 flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Random Arena</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-[#070F1B]/95 light:bg-white border border-white/10 light:border-slate-300 shadow-xl space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Main Search Input with Instant Autocomplete */}
          <div ref={searchContainerRef} className="relative md:col-span-6">
            <Search className="w-4 h-4 text-slate-400 light:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => {
                setIsSearchFocused(true);
                warmIndex();
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchFocused(true);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search club, stadium, city, country, or code (e.g. Arsenal, San Siro, BMO)..."
              aria-label="Search stadiums or clubs"
              aria-expanded={isSearchFocused && autocompleteSuggestions.length > 0}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white/[0.06] light:bg-slate-100 border border-white/15 light:border-slate-300 text-xs sm:text-sm text-white light:text-slate-900 placeholder-slate-400 light:placeholder-slate-500 focus:outline-none focus:border-[#7ADBF0] light:focus:border-cyan-600 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setHighlightedIndex(-1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white light:text-slate-500 light:hover:text-slate-900 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Autocomplete Dropdown */}
            {isSearchFocused && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-[#0B1525] light:bg-white border border-white/15 light:border-slate-300 shadow-2xl overflow-hidden max-h-80 overflow-y-auto">
                {autocompleteSuggestions.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-slate-400 light:text-slate-600 font-mono">
                    No matching club or stadium found for &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  <>
                    <div className="px-3 py-1.5 bg-white/[0.03] light:bg-slate-50 border-b border-white/10 light:border-slate-200 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 light:text-slate-600">
                      <span>Top Matches ({filteredStadiums.length})</span>
                      <span>Press Enter to jump</span>
                    </div>
                    {autocompleteSuggestions.map((item, idx) => {
                      const isActive = idx === highlightedIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          onClick={() => handlePickSuggestion(item)}
                          className={`w-full text-left px-3 py-2.5 flex items-center gap-3 border-b last:border-b-0 border-white/5 light:border-slate-100 transition-colors cursor-pointer ${
                            isActive
                              ? 'bg-cyan-950/70 light:bg-cyan-50'
                              : 'hover:bg-white/[0.06] light:hover:bg-slate-50'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg p-1 bg-[#070F1B] light:bg-slate-100 border border-white/10 light:border-slate-200 flex items-center justify-center shrink-0">
                            <img
                              src={item.clubCrestUrl}
                              alt={item.clubShortName}
                              referrerPolicy="no-referrer"
                              onError={(e) =>
                                applyCrestFallback(e.currentTarget, item.fallbackCrestUrl)
                              }
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-white light:text-slate-900 truncate">
                                {item.name}
                              </span>
                              {item.isVerifiedStadium && (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600 shrink-0" />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-300 light:text-slate-600 truncate">
                              {item.clubName} · {item.flagEmoji} {item.city}, {item.country}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 light:text-slate-600 shrink-0 tabular-nums">
                            {item.capacity.toLocaleString()}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
                {searchQuery.trim().length >= 2 && (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setIsSearchFocused(false);
                      openFullSearchModal();
                    }}
                    className="w-full px-3.5 py-2.5 bg-[#09121F] light:bg-slate-50 hover:bg-[#7ADBF0]/15 text-[#7ADBF0] light:text-cyan-700 text-xs font-bold flex items-center justify-between border-t border-white/10 light:border-slate-200 cursor-pointer transition-colors"
                  >
                    <span>Search all matching database results</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Country Selector */}
          <div className="md:col-span-2">
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              aria-label="Filter by country"
              className="w-full py-2.5 px-3 rounded-xl bg-white/[0.06] light:bg-slate-100 border border-white/15 light:border-slate-300 text-xs font-mono text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0] light:focus:border-cyan-600 cursor-pointer"
            >
              <option value="all" className="bg-[#0B1525] light:bg-white">
                All Countries ({countries.length})
              </option>
              {countries.map((c) => (
                <option key={c} value={c} className="bg-[#0B1525] light:bg-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* League Selector */}
          <div className="md:col-span-2">
            <select
              value={selectedLeague}
              onChange={(e) => setSelectedLeague(e.target.value)}
              aria-label="Filter by league"
              className="w-full py-2.5 px-3 rounded-xl bg-white/[0.06] light:bg-slate-100 border border-white/15 light:border-slate-300 text-xs font-mono text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0] light:focus:border-cyan-600 cursor-pointer"
            >
              <option value="all" className="bg-[#0B1525] light:bg-white">
                All Leagues ({leagues.length})
              </option>
              {leagues.map((l) => (
                <option key={l} value={l} className="bg-[#0B1525] light:bg-white">
                  {l}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Order Selector */}
          <div className="md:col-span-2">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              aria-label="Sort venues"
              className="w-full py-2.5 px-3 rounded-xl bg-white/[0.06] light:bg-slate-100 border border-white/15 light:border-slate-300 text-xs font-mono text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0] light:focus:border-cyan-600 cursor-pointer"
            >
              <option value="relevance" className="bg-[#0B1525] light:bg-white">
                Sort: Relevance
              </option>
              <option value="capacity_desc" className="bg-[#0B1525] light:bg-white">
                Capacity: High → Low
              </option>
              <option value="club_asc" className="bg-[#0B1525] light:bg-white">
                Club: A–Z
              </option>
              <option value="stadium_asc" className="bg-[#0B1525] light:bg-white">
                Stadium: A–Z
              </option>
            </select>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex items-center justify-between gap-4 pt-1 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {/* Gender Filters */}
            <span className="font-mono text-[10px] text-slate-400 light:text-slate-600 uppercase tracking-wider shrink-0 mr-1">
              TEAM:
            </span>
            <button
              type="button"
              onClick={() => setSelectedGender('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono uppercase transition-all cursor-pointer shrink-0 ${
                selectedGender === 'all'
                  ? 'bg-white/20 light:bg-slate-900 text-white'
                  : 'text-slate-300 light:text-slate-700 hover:bg-white/10 light:hover:bg-slate-100'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setSelectedGender('men')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono uppercase transition-all cursor-pointer shrink-0 ${
                selectedGender === 'men'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-300 light:text-slate-700 hover:bg-white/10 light:hover:bg-slate-100'
              }`}
            >
              Men&apos;s
            </button>
            <button
              type="button"
              onClick={() => setSelectedGender('women')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono uppercase transition-all cursor-pointer shrink-0 ${
                selectedGender === 'women'
                  ? 'bg-rose-600 text-white'
                  : 'text-slate-300 light:text-slate-700 hover:bg-white/10 light:hover:bg-slate-100'
              }`}
            >
              Women&apos;s
            </button>

            <span className="text-white/20 light:text-slate-300 mx-1.5">|</span>

            {/* Capacity Filters */}
            <span className="font-mono text-[10px] text-slate-400 light:text-slate-600 uppercase tracking-wider shrink-0 mr-1">
              SIZE:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCapacity('all')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono uppercase transition-all cursor-pointer shrink-0 ${
                selectedCapacity === 'all'
                  ? 'bg-white/20 light:bg-slate-900 text-white'
                  : 'text-slate-300 light:text-slate-700 hover:bg-white/10 light:hover:bg-slate-100'
              }`}
            >
              Any
            </button>
            <button
              type="button"
              onClick={() => setSelectedCapacity('huge')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono uppercase transition-all cursor-pointer shrink-0 ${
                selectedCapacity === 'huge'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 light:text-slate-700 hover:bg-white/10 light:hover:bg-slate-100'
              }`}
            >
              60k+
            </button>
            <button
              type="button"
              onClick={() => setSelectedCapacity('large')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono uppercase transition-all cursor-pointer shrink-0 ${
                selectedCapacity === 'large'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 light:text-slate-700 hover:bg-white/10 light:hover:bg-slate-100'
              }`}
            >
              40k–60k
            </button>
            <button
              type="button"
              onClick={() => setSelectedCapacity('medium')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono uppercase transition-all cursor-pointer shrink-0 ${
                selectedCapacity === 'medium'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 light:text-slate-700 hover:bg-white/10 light:hover:bg-slate-100'
              }`}
            >
              &lt;40k
            </button>

            <span className="text-white/20 light:text-slate-300 mx-1.5">|</span>

            {/* Verified Stadiums Toggle */}
            <button
              type="button"
              onClick={() => setVerifiedOnly((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono uppercase transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                verifiedOnly
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'border-white/10 light:border-slate-300 text-slate-300 light:text-slate-700 hover:bg-white/10 light:hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verified Only</span>
            </button>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400 light:text-slate-600 shrink-0">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 text-[#7ADBF0] light:text-cyan-700 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
            <span>
              Showing{' '}
              <span className="text-white light:text-slate-900 tabular-nums">
                {filteredStadiums.length}
              </span>{' '}
              venues
            </span>
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex sm:hidden p-1 rounded-xl bg-[#070F1B] light:bg-slate-200 border border-white/10 light:border-slate-300">
        <button
          type="button"
          onClick={() => setMobileTab('map')}
          className={`flex-1 py-2 text-center rounded-lg text-xs font-mono uppercase tracking-wider transition-all ${
            mobileTab === 'map'
              ? 'bg-[#0891B2] text-white shadow'
              : 'text-slate-400 light:text-slate-700'
          }`}
        >
          Google Map
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2 text-center rounded-lg text-xs font-mono uppercase tracking-wider transition-all tabular-nums ${
            mobileTab === 'list'
              ? 'bg-[#0891B2] text-white shadow'
              : 'text-slate-400 light:text-slate-700'
          }`}
        >
          Venues ({filteredStadiums.length})
        </button>
      </div>

      {/* Main Interactive Stage Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Venues Directory List (hidden on mobile if in map tab) */}
        <div
          className={`lg:col-span-4 space-y-3 ${
            mobileTab === 'map' ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="rounded-2xl bg-[#070F1B]/95 light:bg-white border border-white/10 light:border-slate-300 p-4 shadow-xl flex flex-col max-h-[720px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 light:border-slate-200 shrink-0">
              <span className="font-mono text-xs uppercase tracking-wider text-white light:text-slate-900 flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
                <span>Stadiums Directory</span>
              </span>
              <span className="font-mono text-[11px] text-slate-400 light:text-slate-600 tabular-nums">
                {filteredStadiums.length} matches
              </span>
            </div>

            {/* Scrollable List of Stadium Cards */}
            <div className="overflow-y-auto space-y-2.5 pt-3 pr-1 flex-1">
              {filteredStadiums.length === 0 ? (
                <div className="text-center py-12 space-y-2 text-slate-400 light:text-slate-600">
                  <MapPin className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-xs">No stadiums match your filter criteria.</p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="text-xs text-[#7ADBF0] light:text-cyan-700 underline cursor-pointer"
                  >
                    Reset all filters
                  </button>
                </div>
              ) : (
                <>
                  {displayedSidebarStadiums.map((stadium) => {
                    const isSelected = selectedStadiumId === stadium.id;

                    return (
                      <div
                        key={stadium.id}
                        onClick={() => {
                          handleSelectStadium(stadium);
                          if (mobileTab === 'list') {
                            setMobileTab('map');
                          }
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${
                          isSelected
                            ? 'bg-gradient-to-r from-cyan-950/60 to-[#0B1525] light:from-cyan-50 light:to-white border-[#7ADBF0] light:border-cyan-600 shadow-lg shadow-cyan-950/20'
                            : 'bg-white/[0.03] light:bg-slate-50 hover:bg-white/[0.06] light:hover:bg-slate-100 border-white/10 light:border-slate-200'
                        }`}
                      >
                        {/* Crest Container */}
                        <div
                          className="w-11 h-11 rounded-lg p-1.5 bg-[#0B1525] light:bg-white border border-white/15 light:border-slate-200 flex items-center justify-center shrink-0 shadow-sm"
                          style={{
                            borderLeftColor: stadium.primaryColor,
                            borderLeftWidth: '3px',
                          }}
                        >
                          <img
                            src={stadium.clubCrestUrl}
                            alt={stadium.clubShortName}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            onError={(e) =>
                              applyCrestFallback(e.currentTarget, stadium.fallbackCrestUrl)
                            }
                            className="w-full h-full object-contain"
                          />
                        </div>

                        {/* Info Text */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-xs text-white light:text-slate-900 truncate">
                              {stadium.name}
                            </h3>
                            {stadium.isVerifiedStadium && (
                              <CheckCircle2
                                className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-600 shrink-0"
                                aria-label="Verified stadium coordinates"
                              />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-300 light:text-slate-700 truncate mt-0.5 flex items-center gap-1.5">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                stadium.gender === 'women' ? 'bg-rose-500' : 'bg-sky-500'
                              }`}
                            />
                            <span className="truncate">{stadium.clubName}</span>
                          </p>
                          <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-slate-400 light:text-slate-600">
                            <span className="truncate">
                              {stadium.flagEmoji} {stadium.city}
                            </span>
                            <span>·</span>
                            <span className="text-slate-200 light:text-slate-800 tabular-nums shrink-0">
                              {stadium.capacity.toLocaleString()} seats
                            </span>
                          </div>
                        </div>

                        <ArrowRight
                          className={`w-4 h-4 shrink-0 transition-transform ${
                            isSelected
                              ? 'text-[#7ADBF0] light:text-cyan-700 translate-x-0.5'
                              : 'text-slate-500 light:text-slate-400 opacity-60'
                          }`}
                        />
                      </div>
                    );
                  })}

                  {visibleCount < filteredStadiums.length && (
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                      className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-xs font-mono text-[#7ADBF0] light:text-cyan-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ChevronDown className="w-4 h-4" />
                      <span className="tabular-nums">
                        Load More Venues ({filteredStadiums.length - visibleCount} remaining)
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Google Maps Interactive Component & Floating Info Panel */}
        <div
          className={`lg:col-span-8 flex flex-col gap-6 ${
            mobileTab === 'list' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Map Container */}
          <div className="h-[480px] sm:h-[580px] w-full">
            <StadiumExplorerMap
              stadiums={filteredStadiums}
              selectedStadium={selectedStadium}
              onSelectStadium={handleSelectStadium}
              fitFilterKey={fitFilterKey}
            />
          </div>

          {/* Selected Stadium Comprehensive Info Panel */}
          {selectedStadium && (
            <StadiumInfoPanel
              stadium={selectedStadium}
              coLocatedClubs={coLocatedClubs}
              onSelectClub={handleSelectStadium}
              onClose={() => setSelectedStadiumId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
