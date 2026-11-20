import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  Clock,
  Dices,
  Flag,
  FolderOpen,
  History,
  Play,
  Plus,
  Search,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Target,
  Timer,
  Trophy,
  X,
} from 'lucide-react';
import { getTeamType, Team } from '../../../types/matchCentre';
import type { CompetitionRecord } from '../../../../server/types';
import type {
  SimCompetitionConfig,
  SimCompetitionPreset,
} from '../../../types/simulation';
import { normalizeHex } from '../dossier/dossierUtils';
import { TeamEmblem } from '../TeamEmblem';
import { filterTeamsFast } from '../../../utils/globalDatabaseSearch';

export type MatchEndingRuleId = 'full-90' | 'extra-time' | 'penalties';

interface FixtureBuilderViewProps {
  homeTeam: Team | null;
  awayTeam: Team | null;
  allTeams: Team[];
  competitions: CompetitionRecord[];
  competition: SimCompetitionConfig;
  seed: string;
  savedCount: number;
  recentCount: number;
  onSelectTeam: (side: 'home' | 'away', team: Team) => void;
  onClearTeam: (side: 'home' | 'away') => void;
  onSwapTeams: () => void;
  onRandomMatchup: (home: Team, away: Team) => void;
  onChangeCompetition: (next: SimCompetitionConfig) => void;
  onChangeSeed: (seed: string) => void;
  onRandomSeed: () => void;
  onOpenSavedModal: () => void;
  onProceedToDugout: () => void;
  onQuickKickOff: () => void;
}

type PickerFilter = 'all' | 'clubs' | 'nations' | 'womens';

export const FixtureBuilderView: React.FC<FixtureBuilderViewProps> = ({
  homeTeam,
  awayTeam,
  allTeams,
  competitions,
  competition,
  seed,
  savedCount,
  recentCount,
  onSelectTeam,
  onClearTeam,
  onSwapTeams,
  onRandomMatchup,
  onChangeCompetition,
  onChangeSeed,
  onRandomSeed,
  onOpenSavedModal,
  onProceedToDugout,
  onQuickKickOff,
}) => {
  const [activeSlot, setActiveSlot] = useState<'home' | 'away' | null>(() => {
    if (!homeTeam) return 'home';
    if (!awayTeam) return 'away';
    return null;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [pickerFilter, setPickerFilter] = useState<PickerFilter>('all');

  const isUcl = competition.preset === 'champions-league';
  const bothReady = Boolean(homeTeam && awayTeam);
  const homeHasFullSquad = Boolean(homeTeam && homeTeam.squad.length >= 11);
  const awayHasFullSquad = Boolean(awayTeam && awayTeam.squad.length >= 11);
  const canQuickKickOff = bothReady && homeHasFullSquad && awayHasFullSquad;

  const endingRule: MatchEndingRuleId = useMemo(() => {
    if (competition.allowPenalties) return 'penalties';
    if (competition.allowExtraTime) return 'extra-time';
    return 'full-90';
  }, [competition.allowExtraTime, competition.allowPenalties]);

  const endingSummaryHeader =
    endingRule === 'penalties'
      ? 'ET & PENALTIES'
      : endingRule === 'extra-time'
      ? 'EXTRA TIME ONLY'
      : '90 MINUTES';

  const endingTimingBadge =
    endingRule === 'penalties'
      ? "90' · 120' · PENS"
      : endingRule === 'extra-time'
      ? "90' · 120'"
      : "90'";

  const selectedServerComp = useMemo(
    () => competitions.find((c) => c.id === competition.competitionId),
    [competitions, competition.competitionId]
  );

  const filteredTeams = useMemo(() => {
    return filterTeamsFast(
      allTeams,
      deferredSearchQuery,
      (t) => {
        if (pickerFilter === 'clubs' && !(getTeamType(t) === 'club' && t.gender !== 'women')) {
          return false;
        }
        if (pickerFilter === 'nations' && !(getTeamType(t) === 'country' && t.gender !== 'women')) {
          return false;
        }
        if (pickerFilter === 'womens' && t.gender !== 'women') {
          return false;
        }
        return true;
      },
      48
    );
  }, [allTeams, deferredSearchQuery, pickerFilter]);

  const handleApplyEndingRule = (rule: MatchEndingRuleId) => {
    if (rule === 'full-90') {
      onChangeCompetition({
        ...competition,
        isKnockout: false,
        allowExtraTime: false,
        allowPenalties: false,
        isTwoLegged: false,
        legNumber: 1,
      });
    } else if (rule === 'extra-time') {
      onChangeCompetition({
        ...competition,
        isKnockout: false,
        allowExtraTime: true,
        allowPenalties: false,
        isTwoLegged: false,
        legNumber: 1,
      });
    } else {
      onChangeCompetition({
        ...competition,
        isKnockout: true,
        allowExtraTime: true,
        allowPenalties: true,
      });
    }
  };

  const handlePresetClick = (preset: SimCompetitionPreset) => {
    if (preset === 'champions-league') {
      onChangeCompetition({
        ...competition,
        preset,
        competitionId: 'comp-ucl',
        competitionName: 'UEFA Champions League',
        stageLabel: 'Knockout Phase',
        fixtureId: undefined,
      });
    } else if (preset === 'premier-league') {
      onChangeCompetition({
        ...competition,
        preset,
        competitionId: 'comp-epl',
        competitionName: 'Premier League',
        stageLabel: 'League Matchday',
        fixtureId: undefined,
      });
    } else if (preset === 'national-cup') {
      onChangeCompetition({
        ...competition,
        preset,
        competitionId: 'comp-intl-club',
        competitionName: 'DodaEona Global Club Cup',
        stageLabel: 'Cup Knockout',
        fixtureId: undefined,
      });
    } else if (preset === 'international') {
      onChangeCompetition({
        ...competition,
        preset,
        competitionId: 'comp-world-intl',
        competitionName: 'International Nations Cup',
        stageLabel: 'Tournament Match',
        fixtureId: undefined,
      });
    } else {
      onChangeCompetition({
        ...competition,
        preset: 'friendly',
        competitionId: 'comp-friendly',
        competitionName: 'Friendly',
        stageLabel: 'Exhibition',
        fixtureId: undefined,
        isTwoLegged: false,
        legNumber: 1,
      });
    }
  };

  const handleRandomize = () => {
    const eligible = allTeams.filter((t) => t.squad.length >= 11);
    const pool = eligible.length >= 2 ? eligible : allTeams;
    if (pool.length < 2) return;
    const idx1 = Math.floor(Math.random() * pool.length);
    let idx2 = Math.floor(Math.random() * pool.length);
    if (idx2 === idx1) idx2 = (idx1 + 1) % pool.length;
    onRandomMatchup(pool[idx1], pool[idx2]);
    setActiveSlot(null);
  };

  const handlePickTeam = (team: Team) => {
    const target = activeSlot || (!homeTeam ? 'home' : 'away');
    onSelectTeam(target, team);
    if (target === 'home' && !awayTeam) {
      setActiveSlot('away');
    } else if (target === 'away' && !homeTeam) {
      setActiveSlot('home');
    } else {
      setActiveSlot(null);
    }
  };

  const homeColor = homeTeam ? normalizeHex(homeTeam.primaryColor || '#C5A059') : '#C5A059';
  const awayColor = awayTeam ? normalizeHex(awayTeam.primaryColor || '#7ADBF0') : '#C5A059';

  const renderTeamSlotCard = (side: 'home' | 'away', team: Team | null, accentColor: string) => {
    const isActive = activeSlot === side;
    const isHome = side === 'home';

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setActiveSlot(isActive ? null : side)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setActiveSlot(isActive ? null : side);
          }
        }}
        className={`relative rounded-2xl border overflow-hidden transition-all duration-200 cursor-pointer min-h-[230px] landscape-mobile:min-h-[175px] flex flex-col items-center justify-center p-6 landscape-mobile:p-3.5 text-center select-none shadow-xs ${
          isActive
            ? 'border-[#7ADBF0] shadow-[0_0_28px_rgba(122,219,240,0.2)] bg-[#0A1320] light:bg-cyan-50/40'
            : team
            ? 'border-white/15 light:border-slate-300 hover:border-white/30 light:hover:border-slate-400 bg-[#0A111D] light:bg-slate-50'
            : 'border-white/[0.08] light:border-slate-300 hover:border-white/20 light:hover:border-slate-400 bg-[#090F19] light:bg-slate-50/70'
        }`}
      >
        {/* Top Ambient Team/Amber Gradient Wash matching screenshot */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-30"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${accentColor}88 0%, transparent 75%)`,
          }}
        />
        {/* Subtle top accent hairline bar */}
        <div
          className="pointer-events-none absolute top-0 left-10 right-10 h-[2px] rounded-full opacity-75"
          style={{
            background: isActive ? '#7ADBF0' : accentColor,
          }}
        />

        <div className="relative z-10 flex flex-col items-center gap-3 w-full">
          {/* Home / Away Capsule */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[10px] font-bold tracking-[0.2em] uppercase border transition-colors ${
              isActive
                ? 'bg-[#7ADBF0]/10 border-[#7ADBF0]/70 text-[#7ADBF0] light:text-cyan-800'
                : team
                ? 'bg-white/[0.06] light:bg-white border-white/15 light:border-slate-300 text-slate-200 light:text-slate-800 shadow-xs'
                : 'bg-white/[0.03] light:bg-white border-white/10 light:border-slate-200 text-slate-400 light:text-slate-600 shadow-xs'
            }`}
          >
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#7ADBF0]" />}
            <span>{isHome ? 'HOME' : 'AWAY'}</span>
          </span>

          {team ? (
            <>
              <div
                className={`${
                  getTeamType(team) === 'country'
                    ? 'w-24 h-16 landscape-mobile:w-20 landscape-mobile:h-12'
                    : 'w-20 h-20 landscape-mobile:w-14 landscape-mobile:h-14'
                } rounded-2xl bg-[#0D1626] light:bg-white border border-white/15 light:border-slate-200 p-2.5 landscape-mobile:p-1.5 flex items-center justify-center shadow-md`}
              >
                <TeamEmblem team={team} />
              </div>

              <div className="space-y-1 max-w-full">
                <h3 className="font-sans font-bold text-lg text-white light:text-slate-900 truncate px-2">
                  {team.name}
                </h3>
                <p className="font-mono text-[11px] text-slate-400 light:text-slate-600 tracking-wider uppercase truncate">
                  {team.code} · {team.league || team.country} · {team.overallRating} OVR
                </p>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSlot(side);
                  }}
                  className="px-3 py-1 rounded-lg bg-white/[0.06] light:bg-white hover:bg-white/15 light:hover:bg-slate-100 border border-white/15 light:border-slate-300 font-mono text-[10px] font-bold tracking-wider uppercase text-cyan-300 light:text-cyan-800 transition-colors cursor-pointer shadow-xs"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearTeam(side);
                    setActiveSlot(side);
                  }}
                  className="px-3 py-1 rounded-lg bg-white/[0.03] light:bg-white hover:bg-rose-500/15 light:hover:bg-rose-50 border border-white/10 light:border-slate-200 hover:border-rose-400/40 light:hover:border-rose-300 font-mono text-[10px] font-bold tracking-wider uppercase text-slate-400 light:text-slate-600 hover:text-rose-300 light:hover:text-rose-700 transition-colors cursor-pointer shadow-xs"
                >
                  Clear
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 landscape-mobile:w-14 landscape-mobile:h-14 rounded-2xl bg-[#101824] light:bg-white border border-white/[0.06] light:border-slate-200 flex flex-col items-center justify-center gap-1 shadow-inner">
                <Plus className="w-5 h-5 text-slate-400 light:text-slate-600" />
                <span className="font-mono text-[9px] font-bold tracking-[0.22em] text-slate-500 light:text-slate-600 uppercase">
                  PICK
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="font-sans font-bold text-lg text-white light:text-slate-900">Choose a team</h3>
                <p className="font-mono text-[10px] font-semibold tracking-[0.22em] text-slate-400 light:text-slate-600 uppercase">
                  TAP TO PICK A SIDE
                </p>
              </div>

              <span
                className={`px-3 py-1 rounded-full border border-dashed font-mono text-[9px] tracking-[0.2em] uppercase ${
                  isActive
                    ? 'border-[#7ADBF0]/50 text-[#7ADBF0] light:text-cyan-800'
                    : 'border-white/15 light:border-slate-300 text-slate-500 light:text-slate-600'
                }`}
              >
                {isActive ? 'CHOOSING...' : 'EMPTY'}
              </span>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-12">
      {/* 1. THE FIXTURE PANEL (matches screenshot 1) */}
      <section
        className={`relative rounded-2xl border overflow-hidden transition-colors ${
          isUcl
            ? 'bg-[#050C1F] border-blue-400/30 shadow-[0_0_45px_rgba(37,99,235,0.18)]'
            : 'bg-[#070D17] light:bg-white border-white/10 light:border-slate-300 shadow-2xl'
        }`}
      >
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-white/[0.07] light:border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
            <span className="font-mono text-[11px] font-bold tracking-[0.22em] text-[#7ADBF0] light:text-cyan-800 uppercase">
              THE FIXTURE
            </span>
          </div>
          <span className="font-mono text-[11px] font-semibold tracking-[0.2em] text-slate-400 light:text-slate-600 uppercase">
            {competition.competitionName.toUpperCase()} · {endingSummaryHeader}
          </span>
        </div>

        {/* Two Team Cards + Center VS / Swap / Randomize */}
        <div className="p-4 landscape-mobile:p-3 sm:p-6 grid grid-cols-1 landscape-mobile:grid-cols-[1fr_auto_1fr] md:grid-cols-[1fr_auto_1fr] items-center gap-4 landscape-mobile:gap-3 sm:gap-6 relative">
          {renderTeamSlotCard('home', homeTeam, homeColor)}

          {/* Center Orbital Stack */}
          <div className="relative flex landscape-mobile:flex-col md:flex-col items-center justify-center gap-3 landscape-mobile:gap-2 py-2 landscape-mobile:py-0">
            <div className="hidden md:block pointer-events-none absolute w-32 h-32 rounded-full border border-white/[0.04] light:border-slate-200" />

            <div className="w-12 h-12 rounded-full bg-[#121B28] light:bg-slate-100 border border-white/10 light:border-slate-300 flex items-center justify-center font-display text-lg text-slate-200 light:text-slate-800 tracking-wider shadow-inner">
              VS
            </div>

            <button
              type="button"
              onClick={onSwapTeams}
              disabled={!homeTeam && !awayTeam}
              title="Swap Home and Away teams"
              className="w-9 h-9 rounded-full bg-[#0E1623] light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-950 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer shadow-xs"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>

            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={handleRandomize}
                title="Pick two random teams"
                className="w-9 h-9 rounded-full bg-[#0E1623] light:bg-slate-100 hover:bg-[#7ADBF0]/15 light:hover:bg-cyan-100 border border-white/15 light:border-slate-300 hover:border-[#7ADBF0]/60 light:hover:border-cyan-400 text-slate-300 light:text-slate-700 hover:text-[#7ADBF0] light:hover:text-cyan-800 flex items-center justify-center transition-colors cursor-pointer shadow-xs"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-[9px] font-bold tracking-[0.22em] text-slate-500 light:text-slate-600 uppercase">
                RANDOM
              </span>
            </div>
          </div>

          {renderTeamSlotCard('away', awayTeam, awayColor)}
        </div>

        {/* Expandable Inline Team Selector Drawer */}
        {activeSlot && (
          <div className="border-t border-white/[0.08] light:border-slate-200 bg-[#040912]/95 light:bg-slate-50/95 p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-bold tracking-[0.18em] uppercase text-[#7ADBF0] light:text-cyan-800">
                  Choosing {activeSlot === 'home' ? 'Home' : 'Away'} Side
                </span>
                <div className="inline-flex rounded-lg bg-white/[0.04] light:bg-slate-200 border border-white/10 light:border-slate-300 p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveSlot('home')}
                    className={`px-2.5 py-1 rounded-md font-mono text-[10px] font-bold uppercase cursor-pointer transition-colors ${
                      activeSlot === 'home'
                        ? 'bg-[#7ADBF0] text-slate-950 shadow-xs'
                        : 'text-slate-400 light:text-slate-700 hover:text-white light:hover:text-slate-950'
                    }`}
                  >
                    Home Slot
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSlot('away')}
                    className={`px-2.5 py-1 rounded-md font-mono text-[10px] font-bold uppercase cursor-pointer transition-colors ${
                      activeSlot === 'away'
                        ? 'bg-[#7ADBF0] text-slate-950 shadow-xs'
                        : 'text-slate-400 light:text-slate-700 hover:text-white light:hover:text-slate-950'
                    }`}
                  >
                    Away Slot
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveSlot(null)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04] light:bg-white hover:bg-white/10 light:hover:bg-slate-100 border border-white/10 light:border-slate-300 text-[11px] text-slate-300 light:text-slate-700 cursor-pointer shadow-xs"
              >
                <X className="w-3.5 h-3.5" />
                <span>Done</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 light:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim() && filteredTeams.length > 0) {
                      e.preventDefault();
                      handlePickTeam(filteredTeams[0]);
                    }
                  }}
                  placeholder="Search teams by club, nation, league, or 3-letter code..."
                  className="w-full bg-[#09121F] light:bg-white border border-white/15 light:border-slate-300 rounded-xl pl-10 pr-9 py-2 text-xs text-white light:text-slate-900 placeholder:text-slate-500 focus:outline-none focus:border-[#7ADBF0] shadow-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-md text-slate-400 hover:text-white light:hover:text-slate-900 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                    aria-label="Clear team search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: 'All' },
                    { id: 'clubs', label: 'Clubs' },
                    { id: 'nations', label: 'Nations' },
                    { id: 'womens', label: "Women's" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setPickerFilter(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors shadow-xs ${
                      pickerFilter === f.id
                        ? 'bg-[#7ADBF0]/15 light:bg-cyan-100 border-[#7ADBF0]/70 light:border-cyan-400 text-[#7ADBF0] light:text-cyan-800'
                        : 'bg-white/[0.03] light:bg-white border-white/10 light:border-slate-200 text-slate-400 light:text-slate-700 hover:text-white light:hover:text-slate-950'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-72 landscape-mobile:max-h-44 overflow-y-auto grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pr-1">
              {filteredTeams.map((t) => {
                const isHomeAssigned = homeTeam?.id === t.id;
                const isAwayAssigned = awayTeam?.id === t.id;
                const isSelectedForActive =
                  (activeSlot === 'home' && isHomeAssigned) ||
                  (activeSlot === 'away' && isAwayAssigned);

                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handlePickTeam(t)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 text-left transition-all cursor-pointer shadow-xs ${
                      isSelectedForActive
                        ? 'bg-[#7ADBF0]/15 light:bg-cyan-50 border-[#7ADBF0] light:border-cyan-500'
                        : 'bg-[#09111E] light:bg-white border-white/10 light:border-slate-200 hover:border-white/30 light:hover:border-slate-300 hover:bg-[#0D1727] light:hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`${
                          getTeamType(t) === 'country' ? 'w-8 h-6' : 'w-8 h-8'
                        } rounded-lg bg-slate-950/90 light:bg-slate-100 border border-white/10 light:border-slate-200 p-1 shrink-0 flex items-center justify-center`}
                      >
                        <TeamEmblem team={t} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white light:text-slate-900 truncate">{t.shortName}</div>
                        <div className="text-[10px] font-mono text-slate-400 light:text-slate-600 truncate">
                          {t.code} · {t.league || t.country}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {(isHomeAssigned || isAwayAssigned) && (
                        <span className="font-mono text-[9px] font-bold uppercase text-[#7ADBF0] light:text-cyan-800">
                          {isHomeAssigned ? 'HOME' : 'AWAY'}
                        </span>
                      )}
                      <span className="font-mono text-[11px] font-bold text-amber-300 light:text-amber-700 tabular-nums">
                        {t.overallRating}
                      </span>
                    </div>
                  </button>
                );
              })}

              {filteredTeams.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs text-slate-400 light:text-slate-600">
                  No teams match &ldquo;{searchQuery}&rdquo;.
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 2. MATCH RULES · HOW THE MATCH ENDS (matches screenshot 2) */}
      <section className="rounded-2xl bg-[#070D17] light:bg-white border border-white/10 light:border-slate-300 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-white/[0.07] light:border-slate-200 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/[0.04] light:bg-slate-100 border border-white/10 light:border-slate-300 flex items-center justify-center text-slate-300 light:text-slate-700 shrink-0">
              <Flag className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-mono text-[10px] font-bold tracking-[0.22em] text-slate-400 light:text-slate-600 uppercase leading-none">
                MATCH RULES
              </div>
              <h2 className="font-display text-base sm:text-lg text-white light:text-slate-900 uppercase tracking-wide mt-1 leading-none">
                HOW THE MATCH ENDS
              </h2>
            </div>
          </div>

          <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-slate-400 light:text-slate-600 uppercase tabular-nums">
            {endingTimingBadge}
          </span>
        </div>

        <div className="p-4 landscape-mobile:p-3 sm:p-5 grid grid-cols-1 landscape-mobile:grid-cols-3 md:grid-cols-3 gap-3.5 landscape-mobile:gap-2.5">
          {/* Option 1: Full ninety */}
          <button
            type="button"
            onClick={() => handleApplyEndingRule('full-90')}
            aria-pressed={endingRule === 'full-90'}
            className={`group rounded-xl border p-4 text-left transition-all cursor-pointer flex flex-col justify-between gap-4 shadow-xs ${
              endingRule === 'full-90'
                ? 'bg-[#0C1E26] light:bg-cyan-50/70 border-[#7ADBF0] light:border-cyan-500 shadow-[0_0_20px_rgba(122,219,240,0.14)]'
                : 'bg-[#0A111D] light:bg-slate-50 border-white/10 light:border-slate-300 hover:border-white/25 light:hover:border-slate-400'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                    endingRule === 'full-90'
                      ? 'bg-[#7ADBF0]/15 light:bg-cyan-100 border-[#7ADBF0]/50 light:border-cyan-300 text-[#7ADBF0] light:text-cyan-800'
                      : 'bg-white/[0.03] light:bg-white border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600 group-hover:text-white light:group-hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                </div>
                <span
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    endingRule === 'full-90'
                      ? 'bg-[#7ADBF0] border-[#7ADBF0] text-slate-950'
                      : 'border-white/20 light:border-slate-300 text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              </div>

              <div>
                <h3
                  className={`font-sans font-bold text-sm ${
                    endingRule === 'full-90' ? 'text-[#7ADBF0] light:text-cyan-800' : 'text-white light:text-slate-900'
                  }`}
                >
                  Full ninety
                </h3>
                <p className="text-xs text-slate-400 light:text-slate-600 mt-1 leading-relaxed">
                  Level after 90 stands as a draw.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
              <span
                className={`px-2 py-0.5 rounded border tabular-nums ${
                  endingRule === 'full-90'
                    ? 'bg-[#7ADBF0]/10 light:bg-cyan-100 border-[#7ADBF0]/50 light:border-cyan-300 text-[#7ADBF0] light:text-cyan-800'
                    : 'bg-white/[0.03] light:bg-white border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600'
                }`}
              >
                90&apos;
              </span>
            </div>
          </button>

          {/* Option 2: Extra time only */}
          <button
            type="button"
            onClick={() => handleApplyEndingRule('extra-time')}
            aria-pressed={endingRule === 'extra-time'}
            className={`group rounded-xl border p-4 text-left transition-all cursor-pointer flex flex-col justify-between gap-4 shadow-xs ${
              endingRule === 'extra-time'
                ? 'bg-[#0C1E26] light:bg-cyan-50/70 border-[#7ADBF0] light:border-cyan-500 shadow-[0_0_20px_rgba(122,219,240,0.14)]'
                : 'bg-[#0A111D] light:bg-slate-50 border-white/10 light:border-slate-300 hover:border-white/25 light:hover:border-slate-400'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                    endingRule === 'extra-time'
                      ? 'bg-[#7ADBF0]/15 light:bg-cyan-100 border-[#7ADBF0]/50 light:border-cyan-300 text-[#7ADBF0] light:text-cyan-800'
                      : 'bg-white/[0.03] light:bg-white border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600 group-hover:text-white light:group-hover:text-slate-900'
                  }`}
                >
                  <Timer className="w-4 h-4" />
                </div>
                <span
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    endingRule === 'extra-time'
                      ? 'bg-[#7ADBF0] border-[#7ADBF0] text-slate-950'
                      : 'border-white/20 light:border-slate-300 text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              </div>

              <div>
                <h3
                  className={`font-sans font-bold text-sm ${
                    endingRule === 'extra-time' ? 'text-[#7ADBF0] light:text-cyan-800' : 'text-white light:text-slate-900'
                  }`}
                >
                  Extra time
                </h3>
                <p className="text-xs text-slate-400 light:text-slate-600 mt-1 leading-relaxed">
                  Two 15-minute halves if level after 90; a draw can still stand.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
              <span
                className={`px-2 py-0.5 rounded border tabular-nums ${
                  endingRule === 'extra-time'
                    ? 'bg-[#7ADBF0]/10 light:bg-cyan-100 border-[#7ADBF0]/50 light:border-cyan-300 text-[#7ADBF0] light:text-cyan-800'
                    : 'bg-white/[0.03] light:bg-white border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600'
                }`}
              >
                90&apos;
              </span>
              <span className="text-slate-600 light:text-slate-400">›</span>
              <span
                className={`px-2 py-0.5 rounded border tabular-nums ${
                  endingRule === 'extra-time'
                    ? 'bg-[#7ADBF0]/10 light:bg-cyan-100 border-[#7ADBF0]/50 light:border-cyan-300 text-[#7ADBF0] light:text-cyan-800'
                    : 'bg-white/[0.03] light:bg-white border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600'
                }`}
              >
                120&apos;
              </span>
            </div>
          </button>

          {/* Option 3: Extra time & penalties */}
          <button
            type="button"
            onClick={() => handleApplyEndingRule('penalties')}
            aria-pressed={endingRule === 'penalties'}
            className={`group rounded-xl border p-4 text-left transition-all cursor-pointer flex flex-col justify-between gap-4 shadow-xs ${
              endingRule === 'penalties'
                ? 'bg-[#0C1E26] light:bg-cyan-50/70 border-[#7ADBF0] light:border-cyan-500 shadow-[0_0_20px_rgba(122,219,240,0.14)]'
                : 'bg-[#0A111D] light:bg-slate-50 border-white/10 light:border-slate-300 hover:border-white/25 light:hover:border-slate-400'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                    endingRule === 'penalties'
                      ? 'bg-[#7ADBF0]/15 light:bg-cyan-100 border-[#7ADBF0]/50 light:border-cyan-300 text-[#7ADBF0] light:text-cyan-800'
                      : 'bg-white/[0.03] light:bg-white border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600 group-hover:text-white light:group-hover:text-slate-900'
                  }`}
                >
                  <Target className="w-4 h-4" />
                </div>
                <span
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                    endingRule === 'penalties'
                      ? 'bg-[#7ADBF0] border-[#7ADBF0] text-slate-950'
                      : 'border-white/20 light:border-slate-300 text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </span>
              </div>

              <div>
                <h3
                  className={`font-sans font-bold text-sm ${
                    endingRule === 'penalties' ? 'text-[#7ADBF0] light:text-cyan-800' : 'text-white light:text-slate-900'
                  }`}
                >
                  Extra time &amp; penalties
                </h3>
                <p className="text-xs text-slate-400 light:text-slate-600 mt-1 leading-relaxed">
                  A winner is always decided, even from the spot.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold">
              <span
                className={`px-2 py-0.5 rounded border tabular-nums ${
                  endingRule === 'penalties'
                    ? 'bg-[#7ADBF0]/10 light:bg-cyan-100 border-[#7ADBF0]/50 light:border-cyan-300 text-[#7ADBF0] light:text-cyan-800'
                    : 'bg-white/[0.03] light:bg-white border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600'
                }`}
              >
                90&apos;
              </span>
              <span className="text-slate-600 light:text-slate-400">›</span>
              <span
                className={`px-2 py-0.5 rounded border tabular-nums ${
                  endingRule === 'penalties'
                    ? 'bg-[#7ADBF0]/10 light:bg-cyan-100 border-[#7ADBF0]/50 light:border-cyan-300 text-[#7ADBF0] light:text-cyan-800'
                    : 'bg-white/[0.03] light:bg-white border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600'
                }`}
              >
                120&apos;
              </span>
              <span className="text-slate-600 light:text-slate-400">›</span>
              <span
                className={`px-2 py-0.5 rounded border tabular-nums ${
                  endingRule === 'penalties'
                    ? 'bg-[#7ADBF0]/10 light:bg-cyan-100 border-[#7ADBF0]/50 light:border-cyan-300 text-[#7ADBF0] light:text-cyan-800'
                    : 'bg-white/[0.03] light:bg-white border-white/10 light:border-slate-300 text-slate-400 light:text-slate-600'
                }`}
              >
                PENS
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* 3. COMPETITION CONTEXT & LAUNCH ACTIONS */}
      <section className="rounded-2xl bg-[#070D17] light:bg-white border border-white/10 light:border-slate-300 p-4 sm:p-5 space-y-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Trophy className={`w-4 h-4 ${isUcl ? 'text-cyan-400' : 'text-amber-400 light:text-amber-600'}`} />
            <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-slate-200 light:text-slate-800">
              Competition Context
            </span>
            {isUcl && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-cyan-300 light:text-cyan-800">
                <Sparkles className="w-3 h-3" />
                Champions Night Theme
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'friendly', label: 'Friendly' },
                { id: 'champions-league', label: 'UEFA Champions League' },
                { id: 'premier-league', label: 'Premier League' },
                { id: 'national-cup', label: 'Knockout Cup' },
                { id: 'international', label: 'Nations Cup' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePresetClick(item.id)}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer shadow-xs ${
                  competition.preset === item.id
                    ? item.id === 'champions-league'
                      ? 'bg-blue-600/25 border-cyan-400 text-cyan-200'
                      : 'bg-white/15 light:bg-slate-900 border-white/40 light:border-slate-900 text-white light:text-white'
                    : 'bg-white/[0.03] light:bg-slate-100 border-white/10 light:border-slate-300 text-slate-400 light:text-slate-700 hover:text-white light:hover:text-slate-950'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {(selectedServerComp?.fixtures?.length || 0) > 0 && (
          <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 gap-3 pt-1">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                Scheduled Competition Fixture (Optional)
              </span>
              <select
                value={competition.fixtureId || ''}
                onChange={(e) => {
                  const fixId = e.target.value;
                  if (!fixId) {
                    onChangeCompetition({ ...competition, fixtureId: undefined });
                    return;
                  }
                  const fix = selectedServerComp?.fixtures?.find((f) => f.id === fixId);
                  if (!fix) return;
                  const h = allTeams.find((t) => t.id === fix.homeTeamId);
                  const a = allTeams.find((t) => t.id === fix.awayTeamId);
                  if (h) onSelectTeam('home', h);
                  if (a) onSelectTeam('away', a);
                  onChangeCompetition({
                    ...competition,
                    fixtureId: fix.id,
                    stageLabel: fix.round,
                    isKnockout: fix.isKnockout,
                    allowExtraTime: fix.isKnockout,
                    allowPenalties: fix.isKnockout,
                    isTwoLegged: fix.isTwoLegged,
                    legNumber: fix.legNumber,
                    firstLegHomeGoals: fix.firstLegHomeGoals,
                    firstLegAwayGoals: fix.firstLegAwayGoals,
                  });
                  setActiveSlot(null);
                }}
                className="bg-slate-950/90 light:bg-slate-50 border border-white/15 light:border-slate-300 rounded-lg px-3 py-2 text-xs text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0] shadow-xs"
              >
                <option value="">
                  Custom Matchup ({homeTeam?.code || 'HOME'} vs {awayTeam?.code || 'AWAY'})
                </option>
                {(selectedServerComp?.fixtures || []).map((fix) => {
                  const h = allTeams.find((t) => t.id === fix.homeTeamId);
                  const a = allTeams.find((t) => t.id === fix.awayTeamId);
                  return (
                    <option key={fix.id} value={fix.id}>
                      {fix.round}: {h?.code || fix.homeTeamId} vs {a?.code || fix.awayTeamId}{' '}
                      {fix.settled ? `[Settled ${fix.homeScore}-${fix.awayScore}]` : '[Open]'}
                    </option>
                  );
                })}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                Simulation Seed
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={seed}
                  onChange={(e) => onChangeSeed(e.target.value)}
                  className="flex-1 bg-slate-950/90 light:bg-slate-50 border border-white/15 light:border-slate-300 rounded-lg px-3 py-2 font-mono text-xs text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0] shadow-xs"
                />
                <button
                  type="button"
                  onClick={onRandomSeed}
                  title="Generate new seed"
                  className="p-2 rounded-lg bg-white/[0.05] light:bg-slate-100 hover:bg-white/10 light:hover:bg-slate-200 border border-white/15 light:border-slate-300 text-slate-200 light:text-slate-700 cursor-pointer shadow-xs"
                >
                  <Dices className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
                </button>
              </div>
            </label>
          </div>
        )}

        {/* Bottom Action Row */}
        <div className="pt-2 border-t border-white/[0.07] light:border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onOpenSavedModal}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] light:bg-slate-100 hover:bg-white/[0.09] light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-xs font-semibold text-slate-200 light:text-slate-800 transition-colors cursor-pointer shadow-xs"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400 light:text-amber-600" />
            <span>Saved ({savedCount})</span>
            <span className="text-slate-600 light:text-slate-400">·</span>
            <History className="w-3.5 h-3.5 text-cyan-400 light:text-cyan-600" />
            <span>History ({recentCount})</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5 ml-auto">
            {!bothReady && (
              <span className="text-xs text-slate-400 light:text-slate-600 mr-1">
                Select both Home and Away teams to continue
              </span>
            )}
            {bothReady && !canQuickKickOff && (
              <span className="text-xs text-amber-400 light:text-amber-700 mr-1">
                {!homeHasFullSquad
                  ? `${homeTeam?.shortName} has ${homeTeam?.squad.length ?? 0}/11 verified players`
                  : `${awayTeam?.shortName} has ${awayTeam?.squad.length ?? 0}/11 verified players`}
              </span>
            )}

            <button
              type="button"
              disabled={!bothReady}
              onClick={onProceedToDugout}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.06] light:bg-slate-100 hover:bg-white/12 light:hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed border border-white/15 light:border-slate-300 text-xs font-bold text-white light:text-slate-900 transition-colors cursor-pointer shadow-xs"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
              <span>Lineups &amp; Tactics (Dugout)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              disabled={!canQuickKickOff}
              onClick={onQuickKickOff}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7ADBF0] hover:bg-[#99E5F5] disabled:bg-white/10 disabled:text-slate-500 disabled:cursor-not-allowed text-[#050A12] font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(122,219,240,0.28)] transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Kick Off Match</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
