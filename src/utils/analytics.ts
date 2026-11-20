/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SimMomentumPoint, SimShotEvent, SimTimelineEvent } from '../types/simulation';
import { formatMatchMinute, parseDisplayLabel } from './clock';

export function calculateAttackingThreatPerMinute(
  shots: SimShotEvent[],
  events: SimTimelineEvent[],
  finalMinute: number = 90
): SimMomentumPoint[] {
  const rawMap = new Map<number, { homeThreat: number; awayThreat: number; label: string }>();

  for (let m = 1; m <= finalMinute; m++) {
    rawMap.set(m, { homeThreat: 0, awayThreat: 0, label: `${m}'` });
  }

  if (Array.isArray(shots)) {
    for (const shot of shots) {
      const min = Math.max(1, Math.min(finalMinute, shot.minute));
      const entry = rawMap.get(min);
      if (!entry) continue;

      const xgWeight = Math.max(0.08, shot.xg || 0.15);
      const goalBonus = shot.outcome === 'goal' ? 32 : shot.outcome === 'woodwork' ? 18 : shot.outcome === 'saved' ? 10 : 6;
      const bigChanceBonus = shot.isBigChance ? 12 : 0;
      const counterBonus = shot.situation === 'counter' ? 8 : 0;
      const weight = xgWeight * 55 + goalBonus + bigChanceBonus + counterBonus;

      if (shot.teamSide === 'home') {
        entry.homeThreat += weight;
      } else {
        entry.awayThreat += weight;
      }
    }
  }

  if (Array.isArray(events)) {
    for (const ev of events) {
      if (!ev.minute || ev.minute < 1 || ev.minute > finalMinute) continue;
      const entry = rawMap.get(ev.minute);
      if (!entry) continue;

      if (ev.type === 'goal' || ev.type === 'own-goal') {
        if (ev.teamSide === 'home') entry.homeThreat += 24;
        else if (ev.teamSide === 'away') entry.awayThreat += 24;
      } else if (ev.type === 'red' || ev.type === 'second-yellow') {
        // Card hurt the penalized team -> momentum swings toward the opponent
        if (ev.teamSide === 'home') entry.awayThreat += 26;
        else if (ev.teamSide === 'away') entry.homeThreat += 26;
      } else if (ev.type === 'yellow') {
        if (ev.teamSide === 'home') entry.awayThreat += 5;
        else if (ev.teamSide === 'away') entry.homeThreat += 5;
      }
    }
  }

  let sustained = 0;
  const points: SimMomentumPoint[] = [];

  for (let m = 1; m <= finalMinute; m++) {
    if (m === 46 || m === 91 || m === 106) {
      sustained *= 0.22;
    }
    const entry = rawMap.get(m) || { homeThreat: 0, awayThreat: 0, label: `${m}'` };
    const net = Math.max(-100, Math.min(100, entry.homeThreat - entry.awayThreat));
    sustained = Math.max(-100, Math.min(100, sustained * 0.68 + net * 0.62));
    points.push({
      minute: m,
      period: m <= 45 ? '1H' : m <= 90 ? '2H' : m <= 105 ? 'ET1' : 'ET2',
      displayLabel: entry.label,
      rawDiff: Number(net.toFixed(1)),
      smoothedDiff: Number(sustained.toFixed(1)),
      homeMomentum: Math.round(Math.min(100, entry.homeThreat)),
      awayMomentum: Math.round(Math.min(100, entry.awayThreat)),
    });
  }

  return points;
}

export function hasEnoughMomentumData(momentum: SimMomentumPoint[], shots: SimShotEvent[]): boolean {
  if (!momentum || momentum.length === 0) return false;
  if (momentum.length >= 2) return true;
  return (shots?.length || 0) > 0;
}

export interface PeriodMomentumSummary {
  key: '1H' | '2H' | 'ET1' | 'ET2';
  title: string;
  homeControlPct: number;
  balancedPct: number;
  awayControlPct: number;
  avgDiff: number;
  dominantSide: 'home' | 'away' | 'balanced';
}

export interface DominanceSpell {
  id: string;
  side: 'home' | 'away';
  startLabel: string;
  endLabel: string;
  durationMins: number;
  peakVal: number;
  avgVal: number;
}

export interface MomentumSwingItem {
  id: string;
  fromLabel: string;
  toLabel: string;
  towardSide: 'home' | 'away';
  swingMagnitude: number;
  fromVal: number;
  toVal: number;
  triggerHeadline: string | null;
}

export interface KeyMomentumTurningPoint {
  id: string;
  label: string;
  teamSide: 'home' | 'away';
  type: SimTimelineEvent['type'];
  headline: string;
  xg?: number;
  beforeVal: number;
  afterVal: number;
  delta: number;
}

export interface MatchMomentumAnalysis {
  homeControlPct: number;
  balancedPct: number;
  awayControlPct: number;
  homeAvgIndex: number;
  awayAvgIndex: number;
  homePeak: { val: number; label: string };
  awayPeak: { val: number; label: string };
  periodSummaries: PeriodMomentumSummary[];
  dominanceSpells: DominanceSpell[];
  biggestSwings: MomentumSwingItem[];
  turningPoints: KeyMomentumTurningPoint[];
}

function getPointPeriod(pt: SimMomentumPoint): '1H' | '2H' | 'ET1' | 'ET2' {
  if (pt.period) return pt.period;
  const parsed = parseDisplayLabel(pt.displayLabel, pt.minute, pt.addedMinute);
  if (parsed.minute <= 45) return '1H';
  if (parsed.minute <= 90) return '2H';
  if (parsed.minute <= 105) return 'ET1';
  return 'ET2';
}

function getPointLabel(pt: SimMomentumPoint): string {
  if (pt.displayLabel) {
    return pt.displayLabel.endsWith("'") ? pt.displayLabel : `${pt.displayLabel}'`;
  }
  return formatMatchMinute(pt.minute, pt.addedMinute);
}

export function computeMomentumAnalytics(
  momentum: SimMomentumPoint[],
  events: SimTimelineEvent[],
  wentToExtraTime: boolean
): MatchMomentumAnalysis {
  const safePts = momentum || [];
  const total = safePts.length;

  let homeTicks = 0;
  let awayTicks = 0;
  let balancedTicks = 0;
  let homeIntensitySum = 0;
  let awayIntensitySum = 0;
  let homePeak = { val: 0, label: "1'" };
  let awayPeak = { val: 0, label: "1'" };

  for (const pt of safePts) {
    const d = pt.smoothedDiff;
    const lbl = getPointLabel(pt);
    if (d > 4) homeTicks++;
    else if (d < -4) awayTicks++;
    else balancedTicks++;

    if (d > homePeak.val) homePeak = { val: Math.round(d), label: lbl };
    if (-d > awayPeak.val) awayPeak = { val: Math.round(-d), label: lbl };

    const hVal = pt.homeMomentum ?? Math.max(0, Math.round(d > 0 ? d : pt.rawDiff > 0 ? pt.rawDiff * 0.4 : 8));
    const aVal = pt.awayMomentum ?? Math.max(0, Math.round(d < 0 ? -d : pt.rawDiff < 0 ? -pt.rawDiff * 0.4 : 8));
    homeIntensitySum += hVal;
    awayIntensitySum += aVal;
  }

  const homeControlPct = total > 0 ? Math.round((homeTicks / total) * 100) : 0;
  const awayControlPct = total > 0 ? Math.round((awayTicks / total) * 100) : 0;
  const balancedPct = Math.max(0, 100 - homeControlPct - awayControlPct);

  const periodKeys: Array<{ key: '1H' | '2H' | 'ET1' | 'ET2'; title: string }> = [
    { key: '1H', title: '1st Half' },
    { key: '2H', title: '2nd Half' },
    ...(wentToExtraTime
      ? ([
          { key: 'ET1', title: 'Extra Time 1' },
          { key: 'ET2', title: 'Extra Time 2' },
        ] as const)
      : []),
  ];

  const periodSummaries: PeriodMomentumSummary[] = periodKeys
    .map(({ key, title }) => {
      const sub = safePts.filter((p) => getPointPeriod(p) === key);
      if (sub.length === 0) return null;
      const h = sub.filter((p) => p.smoothedDiff > 4).length;
      const a = sub.filter((p) => p.smoothedDiff < -4).length;
      const hPct = Math.round((h / sub.length) * 100);
      const aPct = Math.round((a / sub.length) * 100);
      const bPct = Math.max(0, 100 - hPct - aPct);
      const avgDiff = Number((sub.reduce((s, p) => s + p.smoothedDiff, 0) / sub.length).toFixed(1));
      const dominantSide: 'home' | 'away' | 'balanced' =
        avgDiff > 4 ? 'home' : avgDiff < -4 ? 'away' : 'balanced';
      return {
        key,
        title,
        homeControlPct: hPct,
        balancedPct: bPct,
        awayControlPct: aPct,
        avgDiff,
        dominantSide,
      };
    })
    .filter((x): x is PeriodMomentumSummary => Boolean(x));

  // Sustained dominance spells (>= 3 contiguous ticks above threshold 10 within the same period)
  const rawSpells: DominanceSpell[] = [];
  let runSide: 'home' | 'away' | null = null;
  let runPts: SimMomentumPoint[] = [];
  let runPeriod: '1H' | '2H' | 'ET1' | 'ET2' | null = null;

  const flushRun = () => {
    if (runSide && runPts.length >= 3) {
      const vals = runPts.map((p) => Math.abs(p.smoothedDiff));
      const peakVal = Math.round(Math.max(...vals));
      const avgVal = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
      if (peakVal >= 14) {
        rawSpells.push({
          id: `spell-${runSide}-${getPointLabel(runPts[0])}`,
          side: runSide,
          startLabel: getPointLabel(runPts[0]),
          endLabel: getPointLabel(runPts[runPts.length - 1]),
          durationMins: runPts.length,
          peakVal,
          avgVal,
        });
      }
    }
    runSide = null;
    runPts = [];
    runPeriod = null;
  };

  for (const pt of safePts) {
    const pPeriod = getPointPeriod(pt);
    const side: 'home' | 'away' | null =
      pt.smoothedDiff >= 10 ? 'home' : pt.smoothedDiff <= -10 ? 'away' : null;
    if (side && side === runSide && pPeriod === runPeriod) {
      runPts.push(pt);
    } else {
      flushRun();
      if (side) {
        runSide = side;
        runPeriod = pPeriod;
        runPts = [pt];
      }
    }
  }
  flushRun();

  const dominanceSpells = [...rawSpells]
    .sort((a, b) => b.durationMins * b.avgVal - a.durationMins * a.avgVal)
    .slice(0, 4);

  // Biggest momentum swings over 2-4 tick windows (excluding period breaks)
  const candidateSwings: MomentumSwingItem[] = [];
  const labelToIdx = new Map<string, number>();
  safePts.forEach((p, idx) => labelToIdx.set(getPointLabel(p), idx));

  for (let i = 0; i < safePts.length; i++) {
    const pStart = safePts[i];
    const pStartPer = getPointPeriod(pStart);
    for (let w = 2; w <= 4; w++) {
      const j = i + w;
      if (j >= safePts.length) break;
      const pEnd = safePts[j];
      if (getPointPeriod(pEnd) !== pStartPer) break;
      const delta = pEnd.smoothedDiff - pStart.smoothedDiff;
      if (Math.abs(delta) < 22) continue;

      const sliceLabels = new Set(safePts.slice(i, j + 1).map(getPointLabel));
      const matchingEv = events.find((e) => {
        if (!e.isKeyMoment && e.type !== 'shot-saved' && e.type !== 'woodwork') return false;
        if (e.type === 'kickoff' || e.type === 'half-time' || e.type === 'full-time') return false;
        const lbl = formatMatchMinute(e.minute, e.addedMinute);
        return sliceLabels.has(lbl);
      });

      candidateSwings.push({
        id: `swing-${i}-${j}`,
        fromLabel: getPointLabel(pStart),
        toLabel: getPointLabel(pEnd),
        towardSide: delta > 0 ? 'home' : 'away',
        swingMagnitude: Math.round(Math.abs(delta)),
        fromVal: Math.round(pStart.smoothedDiff),
        toVal: Math.round(pEnd.smoothedDiff),
        triggerHeadline: matchingEv ? matchingEv.headline : null,
      });
    }
  }

  // Deduplicate overlapping windows greedily by magnitude
  const biggestSwings: MomentumSwingItem[] = [];
  const usedIndices = new Set<number>();
  candidateSwings
    .sort((a, b) => b.swingMagnitude - a.swingMagnitude)
    .forEach((sw) => {
      if (biggestSwings.length >= 3) return;
      const idxA = labelToIdx.get(sw.fromLabel) ?? -1;
      const idxB = labelToIdx.get(sw.toLabel) ?? -1;
      let overlaps = false;
      for (let k = idxA; k <= idxB; k++) {
        if (usedIndices.has(k)) overlaps = true;
      }
      if (!overlaps && idxA >= 0) {
        for (let k = idxA; k <= idxB; k++) usedIndices.add(k);
        biggestSwings.push(sw);
      }
    });

  // Key turning points linked directly to events
  const turningPoints: KeyMomentumTurningPoint[] = [];
  const impactTypes: SimTimelineEvent['type'][] = [
    'goal',
    'own-goal',
    'red',
    'second-yellow',
    'woodwork',
    'big-chance-missed',
    'penalty-missed',
  ];

  for (const ev of events) {
    if (!ev.teamSide || !impactTypes.includes(ev.type)) continue;
    const lbl = formatMatchMinute(ev.minute, ev.addedMinute);
    const idx = labelToIdx.get(lbl);
    if (idx === undefined) continue;

    const beforeIdx = Math.max(0, idx - 2);
    const afterEndIdx = Math.min(safePts.length - 1, idx + 2);
    const beforeVal = Math.round(safePts[beforeIdx].smoothedDiff);

    // Find peak in [idx .. afterEndIdx] in the direction of the shift
    let afterVal = Math.round(safePts[idx].smoothedDiff);
    const favorableSide =
      ev.type === 'red' || ev.type === 'second-yellow'
        ? ev.teamSide === 'home'
          ? 'away'
          : 'home'
        : ev.teamSide;

    for (let k = idx; k <= afterEndIdx; k++) {
      if (getPointPeriod(safePts[k]) !== getPointPeriod(safePts[idx])) break;
      const v = Math.round(safePts[k].smoothedDiff);
      if (favorableSide === 'home' && v > afterVal) afterVal = v;
      if (favorableSide === 'away' && v < afterVal) afterVal = v;
    }

    turningPoints.push({
      id: ev.id,
      label: lbl,
      teamSide: ev.teamSide,
      type: ev.type,
      headline: ev.headline,
      xg: ev.xg,
      beforeVal,
      afterVal,
      delta: afterVal - beforeVal,
    });
  }

  return {
    homeControlPct,
    balancedPct,
    awayControlPct,
    homeAvgIndex: total > 0 ? Math.round(homeIntensitySum / total) : 0,
    awayAvgIndex: total > 0 ? Math.round(awayIntensitySum / total) : 0,
    homePeak,
    awayPeak,
    periodSummaries,
    dominanceSpells,
    biggestSwings,
    turningPoints: turningPoints.slice(0, 8),
  };
}
