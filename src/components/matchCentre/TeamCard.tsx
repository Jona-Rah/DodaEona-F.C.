import React from 'react';
import {
  ArrowRight,
  Edit2,
  Flag,
  LayoutGrid,
  Scale,
  Sparkles,
  Users,
} from 'lucide-react';
import { Team, getPlayerDisplayName, getTeamType } from '../../types/matchCentre';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { useAuth } from '../../context/AuthContext';
import { TeamEmblem } from './TeamEmblem';

interface TeamCardProps {
  team: Team;
}

function normalizeHex(hex?: string): string {
  if (!hex || typeof hex !== 'string') return '#1E293B';
  const cleaned = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) return cleaned;
  if (/^#[0-9A-Fa-f]{3}$/.test(cleaned)) {
    const r = cleaned[1];
    const g = cleaned[2];
    const b = cleaned[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return '#1E293B';
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const full = normalizeHex(hex).slice(1);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isLightHex(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62;
}

function getOverallScheme(rating: number) {
  if (rating >= 90) {
    return {
      tierLabel: 'ELITE',
      badgeClass:
        'bg-cyan-500/12 border-cyan-400/70 text-cyan-400 light:bg-cyan-50 light:border-cyan-500/70 light:text-cyan-700',
      barColor: '#38BDF8', // Blue
    };
  }
  if (rating >= 80) {
    return {
      tierLabel: 'WORLD CLASS',
      badgeClass:
        'bg-emerald-500/12 border-emerald-400/70 text-emerald-400 light:bg-emerald-50 light:border-emerald-500/70 light:text-emerald-700',
      barColor: '#10B981', // Green
    };
  }
  if (rating >= 70) {
    return {
      tierLabel: 'CONTENDER',
      badgeClass:
        'bg-orange-500/12 border-orange-400/70 text-orange-400 light:bg-orange-50 light:border-orange-500/70 light:text-orange-700',
      barColor: '#F97316', // Orange
    };
  }
  if (rating >= 50) {
    return {
      tierLabel: 'CHALLENGER',
      badgeClass:
        'bg-yellow-500/12 border-yellow-400/70 text-yellow-400 light:bg-yellow-50 light:border-yellow-500/70 light:text-yellow-700',
      barColor: '#EAB308', // Yellow
    };
  }
  return {
    tierLabel: 'ROOKIE',
    badgeClass:
      'bg-rose-500/12 border-rose-400/70 text-rose-400 light:bg-rose-50 light:border-rose-500/70 light:text-rose-700',
    barColor: '#EF4444', // Red
  };
}

export const TeamCard: React.FC<TeamCardProps> = ({ team }) => {
  const {
    openDossier,
    openCreateModal,
    openPlayerProfile,
    pinnedCompareTeamId,
    togglePinCompareTeam,
  } = useMatchCentre();
  const isPinnedForCompare = pinnedCompareTeamId === team.id;

  const { isAdmin } = useAuth();
  const isOwner = isAdmin;
  const canonicalType = getTeamType(team);
  const captainPlayer = team.captainId
    ? team.squad.find((p) => p.id === team.captainId)
    : team.squad.find(
        (p) =>
          p.isCaptain ||
          p.name === team.captainName ||
          getPlayerDisplayName(p) === team.captainName
      );
  const captainDisplayName = getPlayerDisplayName(captainPlayer) || team.captainName;

  const primaryHex = normalizeHex(team.primaryColor);
  const secondaryHex = normalizeHex(team.secondaryColor || primaryHex);
  const lightPrimary = isLightHex(primaryHex);
  const lightSecondary = isLightHex(secondaryHex);
  const overallScheme = getOverallScheme(team.overallRating);

  // Average luminance check for gradient CTA readability
  const primaryRgb = hexToRgb(primaryHex);
  const secondaryRgb = hexToRgb(secondaryHex);
  const avgLum =
    (0.299 * ((primaryRgb.r + secondaryRgb.r) / 2) +
      0.587 * ((primaryRgb.g + secondaryRgb.g) / 2) +
      0.114 * ((primaryRgb.b + secondaryRgb.b) / 2)) /
    255;
  const lightDual = avgLum > 0.6;

  const codeTextClass = lightSecondary ? 'text-slate-900/45' : 'text-white/45';
  const ctaTextColor = lightDual ? '#050A12' : '#FFFFFF';

  return (
    <div className="group relative rounded-2xl bg-[#080D16] light:bg-white transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-lg hover:-translate-y-1 hover:shadow-2xl border border-white/[0.1] light:border-slate-200 hover:border-white/25 light:hover:border-slate-300">
      {/* Full-card Dual Crest Color Backdrop (Dark Mode) */}
      <div
        className="pointer-events-none absolute inset-0 light:hidden"
        style={{
          background: `linear-gradient(148deg, ${hexToRgba(
            primaryHex,
            lightPrimary ? 0.24 : 0.44
          )} 0%, rgba(10, 16, 27, 0.72) 48%, ${hexToRgba(
            secondaryHex,
            lightSecondary ? 0.24 : 0.44
          )} 100%)`,
        }}
      />

      {/* Full-card Dual Crest Color Backdrop (Light Mode) */}
      <div
        className="pointer-events-none absolute inset-0 hidden light:block"
        style={{
          background: `linear-gradient(148deg, ${hexToRgba(
            primaryHex,
            lightPrimary ? 0.14 : 0.22
          )} 0%, rgba(255, 255, 255, 0.86) 50%, ${hexToRgba(
            secondaryHex,
            lightSecondary ? 0.14 : 0.22
          )} 100%)`,
        }}
      />

      {/* Top Pinstripe Kit Header using Team's Chosen Two Crest Colors */}
      <div
        className="relative z-10 h-12 w-full px-4 flex items-center justify-end overflow-hidden shrink-0"
        style={{
          backgroundColor: primaryHex,
          backgroundImage: `repeating-linear-gradient(125deg, ${
            lightPrimary ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)'
          } 0px, ${
            lightPrimary ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.12)'
          } 1.5px, transparent 1.5px, transparent 10px), linear-gradient(125deg, ${primaryHex} 0%, ${secondaryHex} 100%)`,
        }}
      >
        <span
          className={`font-display text-xl tracking-wider uppercase select-none leading-none ${codeTextClass}`}
        >
          {team.code || team.shortName.slice(0, 3).toUpperCase()}
        </span>
      </div>

      {/* Main Card Body */}
      <div className="relative z-10 px-5 pb-5 flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-3.5">
          {/* Crest Overlapping Header */}
          <div className="-mt-7 flex items-end justify-between gap-3">
            <div
              className={`${
                canonicalType === 'country' ? 'w-[70px] h-12 p-1.5' : 'w-14 h-14 p-2'
              } rounded-xl bg-[#09101B] light:bg-white shrink-0 flex items-center justify-center shadow-lg border-2 transition-transform duration-200 group-hover:scale-105`}
              style={{
                borderColor: primaryHex,
                boxShadow: `0 6px 18px -4px ${hexToRgba(secondaryHex, 0.4)}`,
              }}
            >
              <TeamEmblem team={team} />
            </div>
          </div>

          {/* Title + Separate Squad Average Overall Badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <button
                type="button"
                onClick={() => openDossier(team, 1)}
                className="font-bold text-lg text-white light:text-slate-900 hover:text-[#7ADBF0] light:hover:text-cyan-700 transition-colors text-left truncate block w-full cursor-pointer leading-snug"
                title={`Open ${team.name} Dossier`}
              >
                {team.name}
              </button>

              <div className="flex items-center gap-1.5 text-xs text-slate-400 light:text-slate-600 mt-1 truncate">
                {team.flag ? (
                  <span className="shrink-0 leading-none">{team.flag}</span>
                ) : (
                  <Flag className="w-3 h-3 shrink-0 opacity-70" />
                )}
                <span className="truncate">
                  {team.country}
                  {canonicalType === 'club' && team.league ? ` · ${team.league}` : ''}
                  {canonicalType === 'country' && team.confederation
                    ? ` · ${team.confederation}`
                    : ''}
                </span>
              </div>
            </div>

            {/* World Ranking Calibrated Overall Box */}
            <div
              className={`px-2.5 py-1 rounded-lg border font-display text-lg tabular-nums leading-none shrink-0 flex flex-col items-center ${overallScheme.badgeClass}`}
              title={
                team.worldRanking
                  ? `${canonicalType === 'country' ? 'FIFA World Rank' : 'FootballDatabase World Rank'} #${team.worldRanking} (${team.rankingPoints ?? ''} pts) · ${team.overallRating} OVR (${overallScheme.tierLabel})`
                  : `Overall Rating: ${team.overallRating} (${overallScheme.tierLabel})`
              }
            >
              <span>{team.overallRating}</span>
            </div>
          </div>

          {/* Club / National Badge & World Rank & Owner Edit Action Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500/10 light:bg-sky-50 border border-sky-400/25 light:border-sky-200 text-[10px] font-mono font-bold tracking-[0.14em] text-sky-300 light:text-sky-700 uppercase">
                {canonicalType === 'club' ? 'CLUB' : 'NATION'}
              </span>
              {team.worldRanking && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 light:bg-amber-50 border border-amber-400/30 light:border-amber-200 text-[10px] font-mono font-bold tracking-wider text-amber-300 light:text-amber-700 tabular-nums">
                  {canonicalType === 'country'
                    ? `#${team.worldRanking} FIFA`
                    : `#${team.worldRanking} WORLD`}
                </span>
              )}
              {team.gender === 'women' && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/12 light:bg-purple-50 border border-purple-400/25 light:border-purple-200 text-[10px] font-mono font-bold tracking-wider text-purple-300 light:text-purple-700 uppercase">
                  WOMEN
                </span>
              )}
              {team.isIcon && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 light:bg-amber-50 border border-amber-400/35 light:border-amber-300 text-[10px] font-mono font-bold tracking-wider text-amber-300 light:text-amber-700 uppercase inline-flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>ICON</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinCompareTeam(team.id);
                }}
                className={`h-7 px-2 rounded-full border text-[10px] font-mono font-semibold inline-flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                  isPinnedForCompare
                    ? 'bg-[#7ADBF0] border-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:border-cyan-600 light:text-white'
                    : 'bg-[#121B2B] light:bg-slate-100 border-white/[0.08] light:border-slate-200 text-slate-300 light:text-slate-700 hover:text-[#7ADBF0] light:hover:text-cyan-700 hover:border-[#7ADBF0]/40'
                }`}
                title={
                  isPinnedForCompare
                    ? `${team.shortName} selected for comparison (click to clear)`
                    : pinnedCompareTeamId
                    ? `Compare against ${team.shortName}`
                    : `Select ${team.shortName} for radar comparison`
                }
              >
                <Scale className="w-3 h-3" />
                <span>{isPinnedForCompare ? 'Selected' : 'Compare'}</span>
              </button>

              {isOwner && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCreateModal(team);
                  }}
                  className="w-7 h-7 rounded-full bg-[#121B2B] light:bg-slate-100 border border-white/[0.08] light:border-slate-200 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:border-white/30 flex items-center justify-center transition-all cursor-pointer shrink-0"
                  title={`Edit ${team.name}`}
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Info Tiles (No Managers — Formation Shape, Squad Count, Optional Captain) */}
          <div className="space-y-2 pt-0.5">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#0B121F]/80 backdrop-blur-sm light:bg-white/85 border border-white/[0.08] light:border-slate-200 px-3 py-2.5 min-w-0">
                <span className="block font-mono text-[9px] tracking-[0.18em] text-slate-400 light:text-slate-500 uppercase">
                  SHAPE
                </span>
                <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-white light:text-slate-900 truncate">
                  <LayoutGrid className="w-3.5 h-3.5 text-slate-400 light:text-slate-500 shrink-0" />
                  <span className="truncate">{team.defaultFormation}</span>
                </div>
              </div>

              <div className="rounded-xl bg-[#0B121F]/80 backdrop-blur-sm light:bg-white/85 border border-white/[0.08] light:border-slate-200 px-3 py-2.5 min-w-0">
                <span className="block font-mono text-[9px] tracking-[0.18em] text-slate-400 light:text-slate-500 uppercase">
                  SQUAD
                </span>
                <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-white light:text-slate-900 truncate tabular-nums">
                  <Users className="w-3.5 h-3.5 text-slate-400 light:text-slate-500 shrink-0" />
                  <span className="truncate">{team.squad.length} Players</span>
                </div>
              </div>
            </div>

            {captainDisplayName && (
              <div className="rounded-xl bg-[#0B121F]/80 backdrop-blur-sm light:bg-white/85 border border-white/[0.08] light:border-slate-200 px-3 py-2 flex items-center gap-2.5 min-w-0">
                <span className="w-5 h-5 rounded bg-amber-400 text-slate-950 font-mono text-[10px] font-black flex items-center justify-center shrink-0">
                  C
                </span>
                {captainPlayer ? (
                  <button
                    type="button"
                    onClick={() => openPlayerProfile(captainPlayer.id)}
                    className="text-xs font-medium text-slate-200 light:text-slate-800 hover:text-[#7ADBF0] light:hover:text-cyan-700 truncate cursor-pointer text-left transition-colors"
                    title={`Open ${captainDisplayName} player profile`}
                  >
                    {captainDisplayName}
                  </button>
                ) : (
                  <span className="text-xs font-medium text-slate-200 light:text-slate-800 truncate">
                    {captainDisplayName}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer: Overall Tier Meter + Team Color CTA Buttons */}
        <div className="space-y-3 pt-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] tracking-[0.22em] text-slate-300 light:text-slate-600 uppercase">
                {overallScheme.tierLabel}
              </span>
              <span
                className="px-2.5 py-0.5 rounded-full text-[11px] font-medium border truncate max-w-[175px] bg-[#0B121F]/70 light:bg-white/85 text-slate-100 light:text-slate-800"
                style={{
                  borderColor: hexToRgba(primaryHex, 0.45),
                }}
              >
                {team.playingStyle}
              </span>
            </div>

            {/* Separate Overall Color Bar */}
            <div className="h-1.5 w-full rounded-full bg-white/[0.1] light:bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(20, team.overallRating))}%`,
                  backgroundColor: overallScheme.barColor,
                }}
              />
            </div>
          </div>

          {/* Dual Actions matching reference */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => openDossier(team, 1)}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-200 inline-flex items-center justify-center gap-1.5 cursor-pointer hover:brightness-110 active:scale-[0.98] shadow-md whitespace-nowrap"
              style={{
                backgroundImage: `linear-gradient(135deg, ${primaryHex} 0%, ${secondaryHex} 100%)`,
                color: ctaTextColor,
                border: lightDual ? '1px solid rgba(15,23,42,0.18)' : `1px solid ${hexToRgba(primaryHex, 0.85)}`,
              }}
            >
              <span>View team profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => openDossier(team, 3)}
              className="py-2.5 px-3.5 rounded-xl bg-[#0B121F]/85 backdrop-blur-sm light:bg-white/90 hover:bg-[#152033] light:hover:bg-slate-100 border border-white/[0.12] light:border-slate-300 text-xs font-semibold text-slate-100 light:text-slate-800 transition-all duration-200 cursor-pointer whitespace-nowrap shrink-0"
            >
              Preferred XI
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
