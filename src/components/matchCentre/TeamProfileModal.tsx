import React, { useState, useMemo } from 'react';
import {
  X,
  ArrowLeft,
  Shield,
  Trophy,
  Check,
  UserCheck,
  Sparkles,
  Swords,
  ChevronDown,
  ArrowUpDown,
  Building,
  User,
  Calendar,
  Compass,
} from 'lucide-react';
import {
  Team,
  PlayerPosition,
  getPlayerDisplayName,
  getTeamType,
  resolvePlayerAge,
} from '../../types/matchCentre';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { TeamEmblem } from './TeamEmblem';

interface TeamProfileModalProps {
  team: Team;
  onClose: () => void;
}

export const TeamProfileModal: React.FC<TeamProfileModalProps> = ({ team, onClose }) => {
  const { selection, selectTeam, deselectTeam, teams, openComparison, openPlayerProfile } =
    useMatchCentre();
  const canonicalType = getTeamType(team);

  const [squadSortBy, setSquadSortBy] = useState<'rating' | 'name' | 'position' | 'number'>('rating');
  const [positionFilter, setPositionFilter] = useState<'all' | PlayerPosition>('all');
  const [compareSelectOpen, setCompareSelectOpen] = useState(false);

  const isHomeSelected = selection.homeTeam?.id === team.id;
  const isAwaySelected = selection.awayTeam?.id === team.id;

  // Position badge colors (Required: Attack: blue, Midfield: green, Defence: yellow, GK: orange)
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

  // Sort and filter squad
  const sortedSquad = useMemo(() => {
    return [...team.squad]
      .filter((p) => positionFilter === 'all' || p.position === positionFilter)
      .sort((a, b) => {
        if (squadSortBy === 'rating') return b.overallRating - a.overallRating;
        if (squadSortBy === 'name') return a.name.localeCompare(b.name);
        if (squadSortBy === 'number') return a.shirtNumber - b.shirtNumber;
        if (squadSortBy === 'position') {
          const order: Record<PlayerPosition, number> = { GK: 1, DEF: 2, MID: 3, ATT: 4 };
          return order[a.position] - order[b.position];
        }
        return 0;
      });
  }, [team.squad, squadSortBy, positionFilter]);

  // Available candidate teams for comparison (exclude self)
  const otherTeams = useMemo(() => {
    return teams.filter((t) => t.id !== team.id);
  }, [teams, team.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 landscape-mobile:p-3 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl relative my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col text-left transition-colors duration-200">
        
        {/* Top 3px Colored Edge */}
        <div
          className={`h-[3px] w-full ${
            team.isIcon
              ? 'bg-gradient-to-r from-[#C5A059] via-[#F3E5AB] to-[#9A7836]'
              : 'bg-gradient-to-r from-[#C5A059] via-[#38BDF8] to-[#10B981]'
          }`}
        />

        {/* ======================================================== */}
        {/* A. TEAM PROFILE HERO & MASTHEAD */}
        {/* ======================================================== */}
        <div className="relative p-6 sm:p-8 landscape-mobile:p-4 bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-surface)] border-b border-[var(--border-color)] overflow-hidden shrink-0">
          
          {/* Subtle floodlight glow */}
          <div className="absolute top-0 right-1/4 w-80 h-80 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 landscape-mobile:top-3 landscape-mobile:right-3 p-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors z-20"
            aria-label="Close team profile"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="relative z-10 flex flex-col landscape-mobile:flex-row md:flex-row items-start landscape-mobile:items-center md:items-center justify-between gap-6 landscape-mobile:gap-4 pr-8">
            
            {/* Identity Group */}
            <div className="flex items-center gap-5 landscape-mobile:gap-3.5">
              
              {/* Crest / Country Flag */}
              <div
                className={`relative ${
                  canonicalType === 'country'
                    ? 'w-28 h-20 sm:w-32 sm:h-22 landscape-mobile:w-20 landscape-mobile:h-14 p-2.5 landscape-mobile:p-1.5'
                    : 'w-24 h-24 sm:w-28 sm:h-28 landscape-mobile:w-16 landscape-mobile:h-16 p-3 landscape-mobile:p-2'
                } rounded-3xl landscape-mobile:rounded-2xl bg-[var(--bg-surface)] border-2 border-[var(--border-color)] shrink-0 flex items-center justify-center shadow-2xl`}
              >
                <TeamEmblem team={team} />
                {/* Kit Dot */}
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[var(--bg-surface)] shadow"
                  style={{ backgroundColor: team.primaryColor }}
                  title="Club Primary Color"
                />
              </div>

              {/* Title & Metadata */}
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  {team.isIcon && (
                    <span className="eyebrow-mono text-[9px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#C5A059] to-[#E5C384] text-slate-950 font-black shadow-sm flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{team.iconEra || 'ICON CLUB'}</span>
                    </span>
                  )}
                  <span className="eyebrow-mono text-[9px] px-2.5 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)]">
                    {team.gender === 'men' ? "Men's" : "Women's"} {canonicalType === 'club' ? 'Club' : 'National Team'}
                  </span>
                  <span className="eyebrow-mono text-[9px] px-2.5 py-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--accent-gold)]">
                    {team.flag ? `${team.flag} ` : ''}{team.country}
                  </span>
                </div>

                <h2 className="font-display font-black text-2xl sm:text-4xl landscape-mobile:text-2xl text-[var(--text-primary)] uppercase tracking-tight leading-tight">
                  {team.name}
                </h2>

                <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 font-medium">
                  {team.classification || (canonicalType === 'club' ? team.league : `${team.confederation} Confederation`)}
                </p>
              </div>

            </div>

            {/* Overall Rating Block & Quick Actions */}
            <div className="flex items-center gap-4 self-stretch landscape-mobile:self-auto md:self-auto justify-between md:justify-end border-t landscape-mobile:border-t-0 md:border-t-0 pt-4 landscape-mobile:pt-0 md:pt-0 border-[var(--border-color)] shrink-0">
              
              <div className="text-right">
                <span className="eyebrow-mono text-[10px] text-[var(--text-muted)] uppercase block">
                  TEAM OVERALL
                </span>
                <span className="font-display font-black text-4xl sm:text-5xl landscape-mobile:text-3xl text-[var(--accent-gold)] tracking-tight leading-none tabular-nums">
                  {team.overallRating}
                </span>
                <span className="eyebrow-mono text-[9px] text-[var(--text-secondary)] block mt-0.5">
                  FORM: {team.defaultFormation}
                </span>
              </div>

              {/* Selection Status or Action */}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => selectTeam(team, 'home')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    isHomeSelected
                      ? 'bg-[#C5A059] text-slate-950 shadow-[0_0_15px_rgba(197,160,89,0.4)]'
                      : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[#C5A059]'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isHomeSelected ? 'HOME SELECTED' : 'SELECT AS HOME'}</span>
                </button>

                <button
                  onClick={() => selectTeam(team, 'away')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                    isAwaySelected
                      ? 'bg-[#38BDF8] text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                      : 'bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] hover:border-[#38BDF8]'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isAwaySelected ? 'AWAY SELECTED' : 'SELECT AS AWAY'}</span>
                </button>
              </div>

            </div>

          </div>

        </div>

        {/* ======================================================== */}
        {/* B & D. TEAM INFORMATION & STRENGTH METRICS */}
        {/* ======================================================== */}
        <div className="p-6 landscape-mobile:p-3.5 border-b border-[var(--border-color)] bg-[var(--bg-surface)] shrink-0">
          <div className="grid grid-cols-1 landscape-mobile:grid-cols-12 md:grid-cols-12 gap-6 landscape-mobile:gap-3.5 items-center">
            
            {/* Team Information Cards (7 Cols) */}
            <div className="landscape-mobile:col-span-7 md:col-span-7 grid grid-cols-2 sm:grid-cols-4 landscape-mobile:grid-cols-4 gap-3 landscape-mobile:gap-2 text-xs">
              
              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-1">
                  <Building className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span className="eyebrow-mono text-[9px] uppercase">Stadium</span>
                </div>
                <div className="font-bold text-[var(--text-primary)] truncate" title={team.stadium}>
                  {team.stadium}
                </div>
                {team.stadiumCapacity && (
                  <div className="text-[10px] text-[var(--text-muted)] font-mono">
                    Cap: {team.stadiumCapacity.toLocaleString()}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-1">
                  <User className="w-3.5 h-3.5 text-[#10B981]" />
                  <span className="eyebrow-mono text-[9px] uppercase">Manager</span>
                </div>
                <div className="font-bold text-[var(--text-primary)] truncate" title={team.manager}>
                  {team.manager}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono">
                  Tactical Coach
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-1">
                  <Calendar className="w-3.5 h-3.5 text-[#C5A059]" />
                  <span className="eyebrow-mono text-[9px] uppercase">Founded</span>
                </div>
                <div className="font-bold text-[var(--text-primary)] font-mono">
                  {team.foundedYear}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono">
                  Established
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                <div className="flex items-center gap-1.5 text-[var(--text-muted)] mb-1">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span className="eyebrow-mono text-[9px] uppercase">Honours</span>
                </div>
                <div className="font-bold text-[var(--text-primary)] font-mono">
                  {team.trophiesCount ? `${team.trophiesCount} Trophies` : 'National Roster'}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-mono">
                  Official Record
                </div>
              </div>

            </div>

            {/* Team Strength Visual Bars (5 Cols) */}
            <div className="landscape-mobile:col-span-5 md:col-span-5 p-4 landscape-mobile:p-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-2.5 landscape-mobile:space-y-1.5">
              <span className="eyebrow-mono text-[10px] text-[var(--accent-gold)] uppercase block mb-1">
                TACTICAL STRENGTH RADAR
              </span>

              {/* Attack Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#38BDF8] font-bold">ATTACKING POWER</span>
                  <span className="font-bold text-[var(--text-primary)]">{team.attackRating}/100</span>
                </div>
                <div className="h-2 w-full bg-slate-900 light:bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#38BDF8] rounded-full transition-all duration-700" style={{ width: `${team.attackRating}%` }} />
                </div>
              </div>

              {/* Midfield Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#10B981] font-bold">MIDFIELD CONTROL</span>
                  <span className="font-bold text-[var(--text-primary)]">{team.midfieldRating}/100</span>
                </div>
                <div className="h-2 w-full bg-slate-900 light:bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#10B981] rounded-full transition-all duration-700" style={{ width: `${team.midfieldRating}%` }} />
                </div>
              </div>

              {/* Defence Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-[#F59E0B] font-bold">DEFENSIVE RESILIENCE</span>
                  <span className="font-bold text-[var(--text-primary)]">{team.defenceRating}/100</span>
                </div>
                <div className="h-2 w-full bg-slate-900 light:bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#F59E0B] rounded-full transition-all duration-700" style={{ width: `${team.defenceRating}%` }} />
                </div>
              </div>

            </div>

          </div>
        </div>

        {/* ======================================================== */}
        {/* C. REGISTERED SQUAD SECTION */}
        {/* ======================================================== */}
        <div className="p-6 landscape-mobile:p-4 flex-1 overflow-y-auto">
          
          {/* Squad Header & Filtering Tools */}
          <div className="flex flex-col landscape-mobile:flex-row sm:flex-row items-start landscape-mobile:items-center sm:items-center justify-between gap-4 landscape-mobile:gap-3 mb-4 pb-3 border-b border-[var(--border-color)]">
            
            <div>
              <h3 className="font-display font-black text-xl text-[var(--text-primary)] uppercase tracking-tight flex items-center gap-2">
                <span>REGISTERED SQUAD</span>
                <span className="font-mono text-xs text-[var(--accent-gold)]">({team.squad.length} Players)</span>
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Verified player attributes, tactical positions, and kit numbers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              
              {/* Position Filter Pills */}
              <div className="flex items-center rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] p-0.5 text-xs font-bold">
                {(['all', 'ATT', 'MID', 'DEF', 'GK'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPositionFilter(pos)}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      positionFilter === pos
                        ? 'bg-[#C5A059] text-slate-950 font-black'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>

              {/* Squad Sort Dropdown */}
              <div className="relative">
                <select
                  value={squadSortBy}
                  onChange={(e) => setSquadSortBy(e.target.value as any)}
                  className="appearance-none pl-3 pr-8 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-primary)] focus:outline-none cursor-pointer"
                >
                  <option value="rating">Sort: Overall Rating</option>
                  <option value="name">Sort: Player Name</option>
                  <option value="number">Sort: Shirt Number</option>
                  <option value="position">Sort: Position Group</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

            </div>

          </div>

          {/* Squad Grid */}
          <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 landscape-mobile:gap-2.5">
            {sortedSquad.map((player) => (
              <div
                key={player.id}
                className="p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[var(--accent-gold)]/50 transition-all flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  
                  {/* Shirt Number Badge */}
                  <div className="w-8 h-8 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] font-mono font-bold text-xs text-[var(--text-muted)] flex items-center justify-center shrink-0">
                    #{player.shirtNumber}
                  </div>

                  {/* Player Name and Nationality */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`eyebrow-mono text-[9px] px-1.5 py-0.5 rounded border font-bold ${getPositionBadge(player.position)}`}>
                        {player.positionDetail}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          openPlayerProfile(player.id);
                        }}
                        className="font-bold text-xs sm:text-sm text-[var(--text-primary)] hover:text-[#7ADBF0] truncate cursor-pointer text-left transition-colors"
                      >
                        {getPlayerDisplayName(player)}
                      </button>
                    </div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5 font-medium">
                      {player.nationality} · Age {resolvePlayerAge(player.dateOfBirth, player.age)}
                    </div>
                  </div>

                </div>

                {/* Rating & Attributes Mini */}
                <div className="text-right shrink-0 ml-2">
                  <span className="font-display font-black text-xl text-[var(--text-primary)] tabular-nums block leading-none">
                    {player.overallRating}
                  </span>
                  <span className="font-mono text-[9px] text-[var(--text-muted)]">
                    PAC {player.attributes.pace} · DRI {player.attributes.dribbling}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* ======================================================== */}
        {/* E. FOOTER ACTIONS */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-5 landscape-mobile:p-3 border-t border-[var(--border-color)] bg-[var(--bg-elevated)] flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Teams</span>
          </button>

          <div className="flex items-center gap-3">
            
            {/* Compare Team Action */}
            <div className="relative">
              <button
                onClick={() => setCompareSelectOpen(!compareSelectOpen)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[#38BDF8] text-xs font-bold text-[var(--text-primary)] transition-all cursor-pointer"
              >
                <Swords className="w-4 h-4 text-[#38BDF8]" />
                <span>Compare Against...</span>
              </button>

              {/* Compare Quick Picker Dropdown */}
              {compareSelectOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-64 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl p-2 shadow-2xl z-30 max-h-60 overflow-y-auto">
                  <span className="eyebrow-mono text-[9px] text-[var(--text-muted)] uppercase px-2 py-1 block">
                    Select Team to Compare:
                  </span>
                  {otherTeams.map((other) => (
                    <button
                      key={other.id}
                      onClick={() => {
                        setCompareSelectOpen(false);
                        onClose();
                        openComparison(team, other);
                      }}
                      className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[var(--bg-elevated)] text-xs font-bold text-[var(--text-primary)] text-left transition-colors"
                    >
                      <span className="truncate">{other.shortName}</span>
                      <span className="font-mono text-[10px] text-[var(--accent-gold)]">{other.overallRating}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Select Team Main Action */}
            <button
              onClick={() => {
                selectTeam(team);
                onClose();
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#E5C384] hover:from-[#D4B26F] hover:to-[#B69147] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(197,160,89,0.35)] cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Select for Simulation</span>
            </button>

          </div>

        </div>

      </div>
    </div>
  );
};
