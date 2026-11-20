import * as d3 from 'd3';
import { getTeamType, type Player, type Team } from '../types/matchCentre';
import type { TeamAggregateStatistics, TeamStatMetrics } from '../types/teamStats';

export type RadarAxisKey = 'attack' | 'defense' | 'midfield' | 'form';

export const RADAR_AXES: Array<{ key: RadarAxisKey; label: string; shortLabel: string }> = [
  { key: 'attack', label: 'Attack', shortLabel: 'ATT' },
  { key: 'defense', label: 'Defense', shortLabel: 'DEF' },
  { key: 'midfield', label: 'Midfield', shortLabel: 'MID' },
  { key: 'form', label: 'Form', shortLabel: 'FRM' },
];

export interface RadarAxisPoint {
  key: RadarAxisKey;
  label: string;
  score: number;
  detail: string;
  secondaryDetail?: string;
}

export interface RecentFormMatchBadge {
  result: 'W' | 'D' | 'L';
  score: string;
  opponent: string;
  competition?: string;
  date?: string;
}

export interface TeamRadarComparisonProfile {
  team: Team;
  overallRating: number;
  fourAxisAvg: number;
  axes: Record<RadarAxisKey, RadarAxisPoint>;
  formSource: 'matches' | 'club-recent' | 'baseline';
  formMatchesCount: number;
  recentSequence: RecentFormMatchBadge[];
  squadBreakdown: {
    attackAvg: number;
    midfieldAvg: number;
    defenseAvg: number;
    gkAvg: number;
    fitCount: number;
    totalCount: number;
  };
  statsMetrics: TeamStatMetrics | null;
}

function clampScore(value: number, min = 0, max = 100): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function averageRating(players: Player[], fallback: number): number {
  if (!players.length) return clampScore(fallback);
  const sum = players.reduce((acc, p) => acc + (Number(p.overallRating) || fallback), 0);
  return clampScore(sum / players.length);
}

function parseScoreline(score?: string): { gf: number; ga: number } | null {
  if (!score) return null;
  const m = String(score).match(/(\d+)\s*[-–:]\s*(\d+)/);
  if (!m) return null;
  return { gf: Number(m[1]), ga: Number(m[2]) };
}

/**
 * Computes deterministic Attack, Defense, Midfield, and Form (0–100) for radar comparison.
 * Form prioritizes live simulated & tournament matches from TeamAggregateStatistics,
 * falls back to club recentMatches records, and otherwise derives a deterministic
 * pre-match baseline calibrated by overallRating & squad fitness.
 */
export function buildTeamRadarProfile(
  team: Team,
  statsEntry?: TeamAggregateStatistics | null
): TeamRadarComparisonProfile {
  const squad = Array.isArray(team.squad) ? team.squad : [];
  const forwards = squad.filter((p) => p.position === 'ATT');
  const midfielders = squad.filter((p) => p.position === 'MID');
  const defenders = squad.filter((p) => p.position === 'DEF');
  const goalkeepers = squad.filter((p) => p.position === 'GK');

  const attackAvg = averageRating(forwards, team.attackRating);
  const midfieldAvg = averageRating(midfielders, team.midfieldRating);
  const defenseAvg = averageRating([...defenders, ...goalkeepers], team.defenceRating);
  const gkAvg = averageRating(goalkeepers, team.defenceRating);

  const fitCount = squad.filter((p) => (p.injuryStatus || 'fit') === 'fit').length;
  const totalCount = squad.length;
  const fitRatio = totalCount > 0 ? fitCount / totalCount : 1;

  const metrics: TeamStatMetrics | null = statsEntry?.combined ?? null;
  const playedMatches = metrics?.matchesPlayed ?? 0;

  const attackScore = clampScore(team.attackRating);
  const defenseScore = clampScore(team.defenceRating);
  const midfieldScore = clampScore(team.midfieldRating);

  // Baseline Form when 0 matches have been played: calibrated from OVR + squad fitness
  const baselineForm = clampScore(team.overallRating * 0.8 + fitRatio * 14, 38, 96);

  let formScore = baselineForm;
  let formSource: 'matches' | 'club-recent' | 'baseline' = 'baseline';
  let recentSequence: RecentFormMatchBadge[] = [];

  if (metrics && metrics.recentForm && metrics.recentForm.length > 0) {
    formSource = 'matches';
    const last5 = metrics.recentForm.slice(0, 5);
    recentSequence = last5.map((m) => ({
      result: m.result,
      score: `${m.goalsFor}-${m.goalsAgainst}`,
      opponent: m.opponentName || m.opponentCode,
      competition: m.competitionName,
      date: m.date,
    }));

    const weights = [1.0, 0.85, 0.72, 0.6, 0.5];
    let weightedSum = 0;
    let weightTotal = 0;
    last5.forEach((m, idx) => {
      const w = weights[idx] ?? 0.45;
      const gd = (m.goalsFor ?? 0) - (m.goalsAgainst ?? 0);
      const matchPointsScore =
        m.result === 'W'
          ? Math.min(100, 90 + Math.max(0, gd) * 3)
          : m.result === 'D'
          ? 52 + Math.max(-4, Math.min(4, gd))
          : Math.max(10, 22 + Math.min(0, gd) * 3);
      weightedSum += matchPointsScore * w;
      weightTotal += w;
    });
    const rawMatchForm = weightTotal > 0 ? weightedSum / weightTotal : baselineForm;
    // Scale confidence by sample size (1 match blends gently; 5 matches uses full match form)
    const sampleBlend = Math.min(1, last5.length / 5);
    formScore = clampScore(baselineForm * (1 - sampleBlend * 0.88) + rawMatchForm * (sampleBlend * 0.88), 12, 100);
  } else if (Array.isArray(team.recentMatches) && team.recentMatches.length > 0) {
    formSource = 'club-recent';
    const last5 = team.recentMatches.slice(0, 5);
    recentSequence = last5.map((m) => ({
      result: m.result,
      score: m.score,
      opponent: m.opponent,
      competition: m.competition,
      date: m.date,
    }));

    const weights = [1.0, 0.85, 0.72, 0.6, 0.5];
    let weightedSum = 0;
    let weightTotal = 0;
    last5.forEach((m, idx) => {
      const w = weights[idx] ?? 0.45;
      const parsed = parseScoreline(m.score);
      const gd = parsed ? parsed.gf - parsed.ga : 0;
      const matchPointsScore =
        m.result === 'W'
          ? Math.min(100, 90 + Math.max(0, gd) * 3)
          : m.result === 'D'
          ? 52
          : Math.max(10, 22 + Math.min(0, gd) * 3);
      weightedSum += matchPointsScore * w;
      weightTotal += w;
    });
    const rawMatchForm = weightTotal > 0 ? weightedSum / weightTotal : baselineForm;
    const sampleBlend = Math.min(1, last5.length / 5);
    formScore = clampScore(baselineForm * (1 - sampleBlend * 0.88) + rawMatchForm * (sampleBlend * 0.88), 12, 100);
  }

  const formSummary =
    recentSequence.length > 0
      ? recentSequence.map((r) => r.result).join('-')
      : 'Pre-match rating baseline';

  const axes: Record<RadarAxisKey, RadarAxisPoint> = {
    attack: {
      key: 'attack',
      label: 'Attack',
      score: attackScore,
      detail: `Squad Att Avg ${attackAvg}`,
      secondaryDetail:
        playedMatches > 0 && metrics
          ? `${metrics.avgGoalsFor.toFixed(2)} GF/m · ${metrics.xgPerMatch.toFixed(2)} xG/m`
          : `${forwards.length} forwards registered`,
    },
    defense: {
      key: 'defense',
      label: 'Defense',
      score: defenseScore,
      detail: `Squad Def/GK Avg ${defenseAvg}`,
      secondaryDetail:
        playedMatches > 0 && metrics
          ? `${metrics.avgGoalsAgainst.toFixed(2)} GA/m · ${Math.round(metrics.cleanSheetPct)}% CS`
          : `${defenders.length} defenders · ${gkAvg} GK`,
    },
    midfield: {
      key: 'midfield',
      label: 'Midfield',
      score: midfieldScore,
      detail: `Squad Mid Avg ${midfieldAvg}`,
      secondaryDetail:
        playedMatches > 0 && metrics
          ? `${metrics.avgPossession.toFixed(1)}% Poss · ${Math.round(metrics.passAccuracyPct)}% Pass`
          : `${team.defaultFormation} · ${team.playingStyle}`,
    },
    form: {
      key: 'form',
      label: 'Form',
      score: formScore,
      detail:
        formSource === 'baseline'
          ? `${fitCount}/${totalCount || 1} fit · OVR ${team.overallRating}`
          : `${recentSequence.length} recent (${formSummary})`,
      secondaryDetail:
        playedMatches > 0 && metrics
          ? `${metrics.wins}W-${metrics.draws}D-${metrics.losses}L · ${metrics.pointsPerMatch.toFixed(2)} PPG`
          : formSource === 'club-recent'
          ? 'Recorded match form'
          : 'No simulated fixtures yet',
    },
  };

  const fourAxisAvg = Math.round((attackScore + defenseScore + midfieldScore + formScore) / 4);

  return {
    team,
    overallRating: team.overallRating,
    fourAxisAvg,
    axes,
    formSource,
    formMatchesCount: recentSequence.length,
    recentSequence,
    squadBreakdown: {
      attackAvg,
      midfieldAvg,
      defenseAvg,
      gkAvg,
      fitCount,
      totalCount,
    },
    statsMetrics: metrics,
  };
}

function normalizeReadableRadarColor(hex: string | undefined, fallback: string, isLightTheme: boolean): string {
  const parsed = d3.color(hex || '');
  if (!parsed) return fallback;
  const hsl = d3.hsl(parsed);
  if (Number.isNaN(hsl.h)) {
    // Achromatic team color (e.g. Juventus black or Leeds white)
    return fallback;
  }
  if (hsl.s < 0.25) {
    hsl.s = 0.48;
  }
  if (isLightTheme) {
    hsl.l = Math.max(0.28, Math.min(0.46, hsl.l));
  } else {
    hsl.l = Math.max(0.52, Math.min(0.68, hsl.l));
  }
  return hsl.formatHex();
}

function rgbDistance(hexA: string, hexB: string): number {
  const a = d3.rgb(hexA);
  const b = d3.rgb(hexB);
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

export function resolveRadarTeamColors(
  teamA: Team,
  teamB: Team,
  isLightTheme: boolean
): {
  colorA: string;
  fillA: string;
  colorB: string;
  fillB: string;
} {
  const defaultA = isLightTheme ? '#0284C7' : '#38BDF8';
  const defaultB = isLightTheme ? '#D97706' : '#F59E0B';

  const colorA = normalizeReadableRadarColor(teamA.primaryColor, defaultA, isLightTheme);

  const candidatesB = [
    normalizeReadableRadarColor(teamB.primaryColor, defaultB, isLightTheme),
    normalizeReadableRadarColor(teamB.secondaryColor, defaultB, isLightTheme),
    defaultB,
    isLightTheme ? '#7C3AED' : '#A78BFA',
    isLightTheme ? '#059669' : '#34D399',
  ];

  const colorB =
    candidatesB.find((candidate) => rgbDistance(colorA, candidate) >= 105) || defaultB;

  const rgbaA = d3.rgb(colorA);
  const rgbaB = d3.rgb(colorB);

  return {
    colorA,
    fillA: `rgba(${rgbaA.r}, ${rgbaA.g}, ${rgbaA.b}, ${isLightTheme ? 0.18 : 0.22})`,
    colorB,
    fillB: `rgba(${rgbaB.r}, ${rgbaB.g}, ${rgbaB.b}, ${isLightTheme ? 0.18 : 0.22})`,
  };
}

export function pickDefaultComparisonPair(
  teams: Team[],
  preferredAId?: string | null,
  preferredBId?: string | null
): [Team | null, Team | null] {
  if (!teams.length) return [null, null];

  const teamA =
    (preferredAId ? teams.find((t) => t.id === preferredAId) : undefined) || teams[0];

  let teamB: Team | null | undefined =
    preferredBId && preferredBId !== teamA.id
      ? teams.find((t) => t.id === preferredBId)
      : undefined;

  if (!teamB) {
    const typeA = getTeamType(teamA);
    // Prefer a close rival of same type & gender (or same league), else any second highest-rated team
    teamB =
      teams.find(
        (t) =>
          t.id !== teamA.id &&
          getTeamType(t) === typeA &&
          t.gender === teamA.gender &&
          Boolean(teamA.league) &&
          t.league === teamA.league
      ) ||
      teams.find(
        (t) => t.id !== teamA.id && getTeamType(t) === typeA && t.gender === teamA.gender
      ) ||
      teams.find((t) => t.id !== teamA.id) ||
      null;
  }

  return [teamA, teamB || null];
}
