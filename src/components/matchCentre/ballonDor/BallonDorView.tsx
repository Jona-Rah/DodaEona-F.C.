import React, { useDeferredValue, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Globe,
  History,
  RotateCcw,
  Search,
  UserCheck,
  X,
} from 'lucide-react';
import { normalizeDatabaseSearchText } from '../../../utils/globalDatabaseSearch';
import {
  DatabaseSearchDropdown,
  useWholeDatabaseQuickSearch,
} from '../../common/DatabaseSearchDropdown';
import {
  BALLON_DOR_ASSETS,
  BALLON_DOR_LAUREATE_SUMMARIES,
  BALLON_DOR_SUMMARY_BY_KEY,
  BALLON_DOR_WINNERS_ARCHIVE,
  BallonDorArchiveEntry,
  BallonDorCategory,
  getBallonDorNationalityFlag,
  getLaureateKey,
  resolveBallonDorDatabasePlayer,
} from '../../../data/ballonDorWinners';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import { PlayerIdentity } from '../../../types/matchCentre';

type CategoryFilter = 'all' | BallonDorCategory;
type SortMode = 'year-desc' | 'year-asc';
type DecadeFilter = 'all' | '2020s' | '2010s' | '2000s' | '1990s' | '1980s' | '1970s' | '1950s-1960s';

const DECADE_OPTIONS: Array<{ id: DecadeFilter; label: string }> = [
  { id: 'all', label: 'All Eras (1956–2026)' },
  { id: '2020s', label: '2020s' },
  { id: '2010s', label: '2010s' },
  { id: '2000s', label: '2000s' },
  { id: '1990s', label: '1990s' },
  { id: '1980s', label: '1980s' },
  { id: '1970s', label: '1970s' },
  { id: '1950s-1960s', label: '1956–1969' },
];

function matchesDecade(year: number, decade: DecadeFilter): boolean {
  switch (decade) {
    case 'all':
      return true;
    case '2020s':
      return year >= 2020;
    case '2010s':
      return year >= 2010 && year <= 2019;
    case '2000s':
      return year >= 2000 && year <= 2009;
    case '1990s':
      return year >= 1990 && year <= 1999;
    case '1980s':
      return year >= 1980 && year <= 1989;
    case '1970s':
      return year >= 1970 && year <= 1979;
    case '1950s-1960s':
      return year <= 1969;
  }
}

export const BallonDorView: React.FC = () => {
  const { registry, openPlayerProfile } = useMatchCentre();

  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [searchFocused, setSearchFocused] = useState(false);
  const { warmIndex, openFullSearchModal } = useWholeDatabaseQuickSearch(searchQuery, false);
  const [selectedNationality, setSelectedNationality] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedDecade, setSelectedDecade] = useState<DecadeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('year-desc');

  const multiWinnersStripRef = useRef<HTMLDivElement | null>(null);

  const dbIdentities = useMemo(
    () => Array.from(registry.identities.values()),
    [registry]
  );

  const resolvedPlayerByEntryId = useMemo(() => {
    const map: Record<string, PlayerIdentity | null> = {};
    for (const entry of BALLON_DOR_WINNERS_ARCHIVE) {
      map[entry.id] = resolveBallonDorDatabasePlayer(entry, dbIdentities);
    }
    return map;
  }, [dbIdentities]);

  const resolvedPlayerByLaureateKey = useMemo(() => {
    const map: Record<string, PlayerIdentity | null> = {};
    for (const summary of BALLON_DOR_LAUREATE_SUMMARIES) {
      map[summary.key] = resolveBallonDorDatabasePlayer(
        {
          playerName: summary.playerName,
          nationality: summary.nationality,
          gender: summary.gender,
          notAwarded: false,
        },
        dbIdentities
      );
    }
    return map;
  }, [dbIdentities]);

  const nationalities = useMemo(() => {
    const set = new Set<string>();
    for (const entry of BALLON_DOR_WINNERS_ARCHIVE) {
      if (!entry.notAwarded && entry.nationality) {
        set.add(entry.nationality);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, []);

  const allYears = useMemo(() => {
    const set = new Set<number>();
    for (const entry of BALLON_DOR_WINNERS_ARCHIVE) {
      set.add(entry.year);
    }
    return Array.from(set).sort((a, b) => b - a);
  }, []);

  const multiTimeWinners = useMemo(
    () => BALLON_DOR_LAUREATE_SUMMARIES.filter((item) => item.totalWins > 1),
    []
  );

  const filteredEntries = useMemo(() => {
    const q = normalizeDatabaseSearchText(deferredSearchQuery);
    const list = BALLON_DOR_WINNERS_ARCHIVE.filter((entry) => {
      if (categoryFilter !== 'all' && entry.category !== categoryFilter) {
        return false;
      }
      if (selectedNationality !== 'all' && entry.nationality !== selectedNationality) {
        return false;
      }
      if (selectedYear !== 'all' && String(entry.year) !== selectedYear) {
        return false;
      }
      if (!matchesDecade(entry.year, selectedDecade)) {
        return false;
      }
      if (q) {
        const hay = normalizeDatabaseSearchText(
          `${entry.playerName} ${entry.nationality} ${entry.club} ${entry.year} ${entry.category}`
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const diff = sortMode === 'year-desc' ? b.year - a.year : a.year - b.year;
      if (diff !== 0) return diff;
      if (a.gender === b.gender) return 0;
      return a.gender === 'men' ? -1 : 1;
    });
  }, [deferredSearchQuery, selectedNationality, selectedYear, selectedDecade, categoryFilter, sortMode]);

  const groupedByYear = useMemo(() => {
    const groups: Array<{ year: number; entries: BallonDorArchiveEntry[] }> = [];
    let currentYear: number | null = null;
    for (const entry of filteredEntries) {
      if (currentYear !== entry.year) {
        currentYear = entry.year;
        groups.push({ year: entry.year, entries: [entry] });
      } else {
        groups[groups.length - 1].entries.push(entry);
      }
    }
    return groups;
  }, [filteredEntries]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedNationality !== 'all' ||
    selectedYear !== 'all' ||
    selectedDecade !== 'all' ||
    categoryFilter !== 'all';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedNationality('all');
    setSelectedYear('all');
    setSelectedDecade('all');
    setCategoryFilter('all');
  };

  const scrollMultiWinners = (direction: 'left' | 'right') => {
    const el = multiWinnersStripRef.current;
    if (!el) return;
    const offset = direction === 'left' ? -300 : 300;
    el.scrollBy({ left: offset });
  };

  const mensAwardsCount = useMemo(
    () =>
      BALLON_DOR_WINNERS_ARCHIVE.filter((e) => e.gender === 'men' && !e.notAwarded).length,
    []
  );
  const womensAwardsCount = useMemo(
    () =>
      BALLON_DOR_WINNERS_ARCHIVE.filter((e) => e.gender === 'women' && !e.notAwarded).length,
    []
  );
  const linkedDbCount = useMemo(
    () =>
      BALLON_DOR_LAUREATE_SUMMARIES.filter((s) => Boolean(resolvedPlayerByLaureateKey[s.key]))
        .length,
    [resolvedPlayerByLaureateKey]
  );

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-8 pb-12">
      
      {/* ===================================================================== */}
      {/* SECTION 1: BALLON D'OR HALL OF FAME EDITORIAL MASTHEAD                */}
      {/* ===================================================================== */}
      <section className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-[#070603] via-[#110D05] to-[#060503] border border-[#D4AF37]/50 shadow-[0_25px_60px_rgba(0,0,0,0.75)] p-6 sm:p-8 lg:p-10">
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 82% 22%, rgba(212,175,55,0.18), transparent 48%), radial-gradient(circle at 12% 78%, rgba(212,175,55,0.11), transparent 45%)',
          }}
        />

        <div className="relative flex flex-col lg:flex-row items-center lg:items-stretch justify-between gap-7 lg:gap-9">
          {/* Left: Curatorial Masthead, Trophy Crest & 4 Archive Stat Tiles */}
          <div className="flex-1 min-w-0 w-full flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[10px] sm:text-[11px] tracking-[0.22em] text-[#D4AF37] uppercase">
                  OFFICIAL CEREMONY ARCHIVE · 1956–2026
                </span>
                <a
                  href={BALLON_DOR_ASSETS.officialSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.14em] text-[#F5D77F] hover:text-white border-b border-[#D4AF37]/45 pb-0.5"
                >
                  <span>ballondor.com</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-[#FAF6EC] border border-[#D4AF37]/80 p-2 shrink-0 flex items-center justify-center shadow-[0_0_24px_rgba(212,175,55,0.2)]">
                  <img
                    src={BALLON_DOR_ASSETS.trophyLogo}
                    alt="Ballon d'Or Trophy"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-wide uppercase leading-[0.98] text-transparent bg-clip-text bg-gradient-to-r from-[#FFF5D6] via-[#F3D06B] to-[#C89B2B]">
                    Ballon d&apos;Or Hall of Fame
                  </h1>
                  <p className="text-xs sm:text-sm text-[#E5DEC9] leading-relaxed mt-2 max-w-2xl">
                    Every official Men&apos;s Ballon d&apos;Or and Ballon d&apos;Or Féminin laureate from 1956 to 2026, linked directly to active DodaEona F.C. player dossiers.
                  </p>
                </div>
              </div>
            </div>

            {/* 4-Tile Official Archive Statistics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-white/[0.04] border border-[#D4AF37]/30 p-3.5 min-w-0">
                <span className="font-mono text-[9px] tracking-[0.16em] text-[#D4AF37] uppercase block mb-1 truncate">
                  Men&apos;s Awards
                </span>
                <span className="font-display text-2xl tabular-nums text-[#FFF8E7] leading-none">
                  {mensAwardsCount}
                </span>
              </div>

              <div className="rounded-2xl bg-white/[0.04] border border-[#D4AF37]/30 p-3.5 min-w-0">
                <span className="font-mono text-[9px] tracking-[0.16em] text-[#D4AF37] uppercase block mb-1 truncate">
                  Féminin Awards
                </span>
                <span className="font-display text-2xl tabular-nums text-[#F5D77F] leading-none">
                  {womensAwardsCount}
                </span>
              </div>

              <div className="rounded-2xl bg-white/[0.04] border border-[#D4AF37]/30 p-3.5 min-w-0">
                <span className="font-mono text-[9px] tracking-[0.16em] text-[#D4AF37] uppercase block mb-1 truncate">
                  Unique Winners
                </span>
                <span className="font-display text-2xl tabular-nums text-[#FFF8E7] leading-none">
                  {BALLON_DOR_LAUREATE_SUMMARIES.length}
                </span>
              </div>

              <div className="rounded-2xl bg-white/[0.04] border border-[#D4AF37]/30 p-3.5 min-w-0">
                <span className="font-mono text-[9px] tracking-[0.16em] text-[#D4AF37] uppercase block mb-1 truncate">
                  Linked Profiles
                </span>
                <span className="font-display text-2xl tabular-nums text-[#F5D77F] leading-none">
                  {linkedDbCount}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Uncropped Official Portrait Hero Banner (495x619) */}
          <div className="w-[210px] sm:w-[235px] lg:w-[250px] shrink-0 mx-auto lg:mx-0">
            <div className="rounded-2xl overflow-hidden border border-[#D4AF37]/50 bg-[#05080D] aspect-[495/619] shadow-2xl">
              <img
                src={BALLON_DOR_ASSETS.heroBanner}
                alt="Official Ballon d'Or Trophy Ceremony Banner"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 2: MULTIPLE-TIME LAUREATES SHELF                              */}
      {/* ===================================================================== */}
      <section className="space-y-3 min-w-0">
        <div className="flex items-end justify-between gap-3 border-b border-[#D4AF37]/30 pb-2.5">
          <div className="min-w-0">
            <span className="font-mono text-[10px] tracking-[0.22em] text-[#D4AF37] uppercase block">
              MULTIPLE-TIME LAUREATES
            </span>
            <h2 className="font-display text-2xl sm:text-3xl text-white uppercase tracking-wide leading-none mt-1">
              Club of Multiple Winners
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono text-[11px] text-slate-400 tabular-nums hidden sm:inline">
              {multiTimeWinners.length} Legends (2+ Wins)
            </span>
            <button
              type="button"
              onClick={() => scrollMultiWinners('left')}
              aria-label="Scroll multiple winners left"
              className="p-1.5 rounded-lg bg-[#0D0B07] border border-[#D4AF37]/35 text-[#F5D77F] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollMultiWinners('right')}
              aria-label="Scroll multiple winners right"
              className="p-1.5 rounded-lg bg-[#0D0B07] border border-[#D4AF37]/35 text-[#F5D77F] cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={multiWinnersStripRef}
          className="flex gap-3.5 overflow-x-auto pb-2 snap-x snap-mandatory"
        >
          {multiTimeWinners.map((laureate) => {
            const dbPlayer = resolvedPlayerByLaureateKey[laureate.key] || null;
            const flag = getBallonDorNationalityFlag(laureate.nationality);
            return (
              <div
                key={laureate.key}
                className="w-[260px] sm:w-[275px] shrink-0 snap-start rounded-2xl bg-gradient-to-br from-[#0A0805] via-[#120E06] to-[#080603] border border-[#D4AF37]/40 p-4 flex flex-col justify-between gap-3 shadow-lg"
              >
                <div className="flex items-start justify-between gap-2.5">
                  <div className="min-w-0 space-y-1">
                    <span className="font-mono text-[9px] tracking-[0.16em] text-[#D4AF37] uppercase block truncate">
                      {laureate.category}
                    </span>
                    <h3 className="font-display text-xl text-[#FFF8E7] uppercase tracking-wide leading-tight truncate">
                      {laureate.playerName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-[#D5C9A8]">
                      <span>{flag}</span>
                      <span className="truncate">{laureate.nationality}</span>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/55 border border-[#D4AF37]/60">
                    <div className="w-5 h-5 rounded-md bg-[#FAF6EC] p-0.5 flex items-center justify-center shrink-0 overflow-hidden">
                      <img
                        src={BALLON_DOR_ASSETS.trophyLogo}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <span className="font-display text-xl tabular-nums leading-none text-[#F5D77F]">
                      {laureate.totalWins}×
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#D4AF37]/20">
                  <div className="font-mono text-[11px] tabular-nums text-[#E9D7A0] leading-snug truncate">
                    {[...laureate.years].reverse().join(' · ')}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery(laureate.playerName);
                        setSelectedNationality('all');
                        setSelectedYear('all');
                        setSelectedDecade('all');
                      }}
                      className="text-[11px] font-mono uppercase tracking-wider text-[#D4AF37] hover:underline cursor-pointer"
                    >
                      Filter
                    </button>

                    {dbPlayer ? (
                      <button
                        type="button"
                        onClick={() => openPlayerProfile(dbPlayer.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F5D77F] hover:underline cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Profile</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400">
                        <History className="w-3 h-3" />
                        <span>Retired</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 3: SEARCH & FILTER CONSOLE                                    */}
      {/* ===================================================================== */}
      <section className="w-full rounded-2xl bg-[#0A0805] border border-[#D4AF37]/35 p-4 sm:p-5 space-y-3.5 shadow-lg overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <Filter className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#F5D77F]">
              Search &amp; Filter Official Winners
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-400 tabular-nums">
            <span>
              {filteredEntries.filter((e) => !e.notAwarded).length} awards · {groupedByYear.length}{' '}
              years
            </span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#F5D77F] text-[11px] cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="sm:col-span-2 lg:col-span-4 relative min-w-0">
            <Search className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => {
                setSearchFocused(true);
                warmIndex();
              }}
              onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setSearchFocused(false);
                else if (e.key === 'Enter' && searchQuery.trim()) {
                  e.preventDefault();
                  setSearchFocused(false);
                  openFullSearchModal();
                }
              }}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSearchFocused(true);
              }}
              placeholder="Search winner, club, player, or year..."
              aria-label="Search Ballon d'Or winners and database"
              className="w-full min-w-0 pl-10 pr-9 py-2.5 rounded-xl bg-[#120F0A] border border-[#D4AF37]/30 text-xs sm:text-sm text-[#FFF8E7] placeholder:text-slate-500 focus:outline-none focus:border-[#D4AF37]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear Ballon d'Or search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#FFF8E7] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            {searchFocused && searchQuery.trim().length >= 2 && (
              <DatabaseSearchDropdown
                query={searchQuery}
                isOpen={searchFocused}
                onClose={() => setSearchFocused(false)}
                limits={{
                  players: 5,
                  clubs: 4,
                  managers: 3,
                  stadiums: 2,
                  leagues: 2,
                  books: 2,
                  series: 1,
                }}
                className="absolute left-0 right-0 lg:w-[400px] top-full mt-1.5 z-50"
              />
            )}
          </div>

          <div className="lg:col-span-3 relative min-w-0">
            <Globe className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedNationality}
              onChange={(e) => setSelectedNationality(e.target.value)}
              aria-label="Filter by nationality"
              className="w-full min-w-0 pl-10 pr-3 py-2.5 rounded-xl bg-[#120F0A] border border-[#D4AF37]/30 text-xs sm:text-sm text-[#FFF8E7] focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              <option value="all">All Nationalities ({nationalities.length})</option>
              {nationalities.map((nat) => (
                <option key={nat} value={nat}>
                  {getBallonDorNationalityFlag(nat)} {nat}
                </option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-2 relative min-w-0">
            <Calendar className="w-4 h-4 text-[#D4AF37] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                if (e.target.value !== 'all') setSelectedDecade('all');
              }}
              aria-label="Filter by winning year"
              className="w-full min-w-0 pl-10 pr-3 py-2.5 rounded-xl bg-[#120F0A] border border-[#D4AF37]/30 text-xs sm:text-sm text-[#FFF8E7] tabular-nums focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              <option value="all">All Years</option>
              {allYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-3 flex items-center gap-2 min-w-0">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              aria-label="Filter by Ballon d'Or category"
              className="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-[#120F0A] border border-[#D4AF37]/30 text-xs sm:text-sm text-[#FFF8E7] focus:outline-none focus:border-[#D4AF37] cursor-pointer"
            >
              <option value="all">All Awards</option>
              <option value="Men's Ballon d'Or">Men&apos;s Ballon d&apos;Or</option>
              <option value="Ballon d'Or Féminin">Ballon d&apos;Or Féminin</option>
            </select>

            <button
              type="button"
              onClick={() => setSortMode(sortMode === 'year-desc' ? 'year-asc' : 'year-desc')}
              className="shrink-0 px-3 py-2.5 rounded-xl bg-[#120F0A] border border-[#D4AF37]/30 text-xs font-mono text-[#F5D77F] whitespace-nowrap cursor-pointer"
              title="Toggle chronological sort order"
            >
              {sortMode === 'year-desc' ? '2026→1956' : '1956→2026'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-[#D4AF37]/15">
          {DECADE_OPTIONS.map((opt) => {
            const active = selectedDecade === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setSelectedDecade(opt.id);
                  if (opt.id !== 'all') setSelectedYear('all');
                }}
                className={`shrink-0 px-3 py-1 rounded-lg font-mono text-[11px] uppercase tracking-wider cursor-pointer border ${
                  active
                    ? 'bg-[#D4AF37] border-[#F5D77F] text-[#090704] font-bold'
                    : 'bg-[#120F0A] border-[#D4AF37]/25 text-[#DFD5B9] hover:border-[#D4AF37]/60'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* SECTION 4: CHRONOLOGICAL WINNERS TIMELINE VAULT                       */}
      {/* ===================================================================== */}
      <section className="rounded-2xl bg-[#070603]/85 border border-[#D4AF37]/30 p-3 sm:p-4 space-y-3 shadow-inner">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="font-mono text-[10px] tracking-[0.2em] text-[#D4AF37] uppercase">
            CHRONOLOGICAL WINNERS TIMELINE (SCROLLABLE ARCHIVE)
          </span>
          <span className="font-mono text-[10px] text-slate-400 tabular-nums">
            {groupedByYear.length} Ceremonies Listed
          </span>
        </div>

        {groupedByYear.length === 0 ? (
          <div className="rounded-2xl bg-[#0A0805] border border-dashed border-[#D4AF37]/40 p-10 text-center space-y-3 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#FAF6EC] border border-[#D4AF37]/70 p-2 mx-auto flex items-center justify-center">
              <img
                src={BALLON_DOR_ASSETS.trophyLogo}
                alt="Ballon d'Or Trophy"
                className="w-full h-full object-contain"
              />
            </div>
            <h3 className="font-display text-2xl text-[#F5D77F] uppercase">
              No Ballon d&apos;Or Records Match Your Filter
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Try clearing your search term, era, nationality, or year selection to view the full
              historical archive from 1956 to 2026.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B68E28] text-[#080603] font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Show All Winners</span>
            </button>
          </div>
        ) : (
          <div className="max-h-[68vh] min-h-[380px] overflow-y-auto overscroll-contain pr-1.5 space-y-3.5">
            {groupedByYear.map((group) => (
              <div
                key={group.year}
                className="rounded-2xl bg-[#090704] border border-[#D4AF37]/30 overflow-hidden shadow-md"
              >
                <div className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-[#171208] via-[#100C05] to-[#090704] border-b border-[#D4AF37]/25 flex items-center justify-between gap-4">
                  <div className="flex items-baseline gap-3 min-w-0">
                    <span className="font-display text-2xl sm:text-3xl tabular-nums text-[#F5D77F] leading-none shrink-0">
                      {group.year}
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#D4AF37] truncate">
                      {group.entries.every((e) => e.notAwarded)
                        ? 'CEREMONY CANCELLED'
                        : group.entries.length > 1
                        ? "MEN'S & FÉMININ HONOURS"
                        : group.entries[0].category}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 tabular-nums shrink-0">
                    Edition #{group.year >= 2021 ? group.year - 1956 : group.year - 1955}
                  </span>
                </div>

                <div className="divide-y divide-[#D4AF37]/15">
                  {group.entries.map((entry) => {
                    if (entry.notAwarded) {
                      return (
                        <div
                          key={entry.id}
                          className="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-black/25"
                        >
                          <div className="space-y-0.5">
                            <span className="font-mono text-[10px] tracking-[0.18em] text-[#D4AF37] uppercase block">
                              {entry.category}
                            </span>
                            <div className="font-display text-lg text-slate-300 uppercase">
                              Award Not Presented
                            </div>
                          </div>
                          <p className="text-xs font-mono text-slate-400">
                            {entry.notAwardedReason}
                          </p>
                        </div>
                      );
                    }

                    const summary = BALLON_DOR_SUMMARY_BY_KEY[getLaureateKey(entry)];
                    const totalWins = summary?.totalWins || 1;
                    const dbPlayer = resolvedPlayerByEntryId[entry.id] || null;
                    const flag = getBallonDorNationalityFlag(entry.nationality);

                    return (
                      <div
                        key={entry.id}
                        className="p-4 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-3.5 hover:bg-[#D4AF37]/[0.04]"
                      >
                        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#FAF6EC] border border-[#D4AF37]/75 p-1.5 shrink-0 flex items-center justify-center shadow-[0_0_14px_rgba(212,175,55,0.16)]">
                            <img
                              src={BALLON_DOR_ASSETS.trophyLogo}
                              alt="Ballon d'Or Trophy"
                              className="w-full h-full object-contain"
                            />
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5">
                              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-[#D4AF37]">
                                {entry.category}
                              </span>
                              {totalWins > 1 && (
                                <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-[#F5D77F] border-l border-[#D4AF37]/35 pl-2.5 tabular-nums">
                                  {totalWins}× All-Time Winner
                                </span>
                              )}
                            </div>

                            <h3 className="font-display text-2xl sm:text-[26px] text-[#FFF8E7] uppercase tracking-wide leading-none truncate">
                              {entry.playerName}
                            </h3>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#DFD5B9] pt-0.5">
                              <span className="inline-flex items-center gap-1.5 font-medium">
                                <span>{flag}</span>
                                <span>{entry.nationality}</span>
                              </span>
                              <span className="text-[#D4AF37]/50">·</span>
                              <span>
                                Club:{' '}
                                <strong className="text-white">
                                  {entry.club}
                                </strong>
                              </span>
                              {entry.podium?.runnerUp && (
                                <>
                                  <span className="text-[#D4AF37]/50">·</span>
                                  <span className="text-slate-400">
                                    2nd: {entry.podium.runnerUp}
                                    {entry.podium.thirdPlace
                                      ? ` · 3rd: ${entry.podium.thirdPlace}`
                                      : ''}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#D4AF37]/15">
                          {dbPlayer ? (
                            <button
                              type="button"
                              onClick={() => openPlayerProfile(dbPlayer.id)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B68E28] hover:brightness-110 text-[#090704] font-bold text-xs uppercase tracking-wider shadow-md cursor-pointer"
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>View Player Profile</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.03] border border-[#D4AF37]/25 text-xs font-mono text-[#D5C9A8]">
                              <History className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>Retired Footballer</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
};
