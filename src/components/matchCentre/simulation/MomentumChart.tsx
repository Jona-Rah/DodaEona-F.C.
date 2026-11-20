/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from 'react';
import { Flame, Shield, TrendingUp } from 'lucide-react';
import { Team } from '../../../types/matchCentre';
import { normalizeHex } from '../dossier/dossierUtils';
import type {
  CompleteSimulationOutput,
  SimMatchPhase,
  SimMomentumPoint,
  SimTimelineEvent,
} from '../../../types/simulation';
import {
  formatMatchMinute,
  getMatchPeriodSegments,
  parseDisplayLabel,
  truncateMomentumForLiveMatch,
  type MatchPeriodSegment,
} from '../../../utils/clock';
import { computeMomentumAnalytics, hasEnoughMomentumData } from '../../../utils/analytics';

interface MomentumChartProps {
  output: CompleteSimulationOutput;
  homeTeam: Team;
  awayTeam: Team;
  phase: SimMatchPhase;
  currentMinute: number;
  currentAddedMinute?: number;
  visibleHomeScore: number;
  visibleAwayScore: number;
  visibleMomentum: SimMomentumPoint[];
  visibleEvents: SimTimelineEvent[];
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = normalizeHex(hex).slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function ensureChartContrastHex(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (lum >= 0.24) return normalizeHex(hex);
  const boost = (v: number) => Math.min(255, Math.round(v + (225 - v) * 0.45));
  const toHex = (v: number) => boost(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function resolvePairChartColors(homeHex?: string, awayHex?: string): { home: string; away: string } {
  const h = ensureChartContrastHex(homeHex || '#EF4444');
  let a = ensureChartContrastHex(awayHex || '#38BDF8');
  const rgbH = hexToRgb(h);
  const rgbA = hexToRgb(a);
  const dist = Math.hypot(rgbH.r - rgbA.r, rgbH.g - rgbA.g, rgbH.b - rgbA.b);
  if (dist < 62) {
    a = '#7C5CFF';
  }
  return { home: h, away: a };
}

interface ChartPoint {
  x: number;
  y: number;
  val: number;
  homeMomentum: number;
  awayMomentum: number;
  minute: number;
  addedMinute: number;
  period: '1H' | '2H' | 'ET1' | 'ET2';
  label: string;
  isAnchor?: boolean;
}

interface LaidOutSegment {
  seg: MatchPeriodSegment;
  xStart: number;
  xEnd: number;
  width: number;
  regOffsetEnd: number;
  points: ChartPoint[];
  areaPath: string;
  strokePath: string;
}

function getPointPeriod(pt: SimMomentumPoint): '1H' | '2H' | 'ET1' | 'ET2' {
  if (pt.period) return pt.period;
  const parsed = parseDisplayLabel(pt.displayLabel, pt.minute, pt.addedMinute);
  if (parsed.minute <= 45) return '1H';
  if (parsed.minute <= 90) return '2H';
  if (parsed.minute <= 105) return 'ET1';
  return 'ET2';
}

function getOffsetInPeriod(
  period: '1H' | '2H' | 'ET1' | 'ET2',
  minute: number,
  addedMinute: number
): number {
  if (period === '1H') {
    return minute >= 45 ? 45 + addedMinute : Math.max(0, minute);
  }
  if (period === '2H') {
    if (minute >= 90) return 45 + addedMinute;
    return Math.max(0, minute - 45);
  }
  if (period === 'ET1') {
    if (minute >= 105) return 15 + addedMinute;
    return Math.max(0, minute - 90);
  }
  if (minute >= 120) return 15 + addedMinute;
  return Math.max(0, minute - 105);
}

function insertZeroCrossings(pts: ChartPoint[], midY: number): ChartPoint[] {
  if (pts.length < 2) return pts;
  const out: ChartPoint[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    if ((prev.val > 0 && curr.val < 0) || (prev.val < 0 && curr.val > 0)) {
      const ratio = Math.abs(prev.val) / (Math.abs(prev.val) + Math.abs(curr.val));
      out.push({
        x: prev.x + (curr.x - prev.x) * ratio,
        y: midY,
        val: 0,
        homeMomentum: Math.round(prev.homeMomentum + (curr.homeMomentum - prev.homeMomentum) * ratio),
        awayMomentum: Math.round(prev.awayMomentum + (curr.awayMomentum - prev.awayMomentum) * ratio),
        minute: curr.minute,
        addedMinute: curr.addedMinute,
        period: curr.period,
        label: curr.label,
        isAnchor: true,
      });
    }
    out.push(curr);
  }
  return out;
}

/**
 * Fritsch-Carlson monotone cubic spline interpolation for smooth, non-overshooting curves.
 */
function buildSmoothPaths(pts: ChartPoint[], midY: number): { areaPath: string; strokePath: string } {
  if (pts.length === 0) return { areaPath: '', strokePath: '' };
  if (pts.length === 1) {
    const p = pts[0];
    return {
      strokePath: `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`,
      areaPath: `M ${p.x.toFixed(2)} ${midY.toFixed(2)} L ${p.x.toFixed(2)} ${p.y.toFixed(2)} Z`,
    };
  }
  if (pts.length === 2) {
    const [p0, p1] = pts;
    const strokePath = `M ${p0.x.toFixed(2)} ${p0.y.toFixed(2)} L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
    const areaPath = `${strokePath} L ${p1.x.toFixed(2)} ${midY.toFixed(2)} L ${p0.x.toFixed(2)} ${midY.toFixed(2)} Z`;
    return { areaPath, strokePath };
  }

  const n = pts.length;
  const dx: number[] = new Array(n - 1);
  const dy: number[] = new Array(n - 1);
  const m: number[] = new Array(n - 1);

  for (let i = 0; i < n - 1; i++) {
    dx[i] = Math.max(0.001, pts[i + 1].x - pts[i].x);
    dy[i] = pts[i + 1].y - pts[i].y;
    m[i] = dy[i] / dx[i];
  }

  const tangents: number[] = new Array(n);
  tangents[0] = m[0];
  tangents[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      tangents[i] = 0;
    } else {
      tangents[i] = (m[i - 1] + m[i]) * 0.5;
    }
  }

  // Enforce monotonicity so curves never bulge past peak heights or zero line
  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(m[i]) < 1e-6) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const a = tangents[i] / m[i];
      const b = tangents[i + 1] / m[i];
      const sq = a * a + b * b;
      if (sq > 9) {
        const tau = 3 / Math.sqrt(sq);
        tangents[i] = tau * a * m[i];
        tangents[i + 1] = tau * b * m[i];
      }
    }
  }

  let strokePath = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const step = dx[i] / 3;
    const cp1x = pts[i].x + step;
    const cp1y = pts[i].y + tangents[i] * step;
    const cp2x = pts[i + 1].x - step;
    const cp2y = pts[i + 1].y - tangents[i + 1] * step;
    strokePath += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${pts[i + 1].x.toFixed(2)} ${pts[i + 1].y.toFixed(2)}`;
  }

  const first = pts[0];
  const last = pts[n - 1];
  const areaPath = `${strokePath} L ${last.x.toFixed(2)} ${midY.toFixed(2)} L ${first.x.toFixed(2)} ${midY.toFixed(2)} Z`;
  return { areaPath, strokePath };
}

function isPenaltyEvent(ev: SimTimelineEvent): boolean {
  return Boolean(
    ev.isPenalty ||
      /\(P\)/i.test(ev.headline || '') ||
      /\bpenalty\b/i.test(ev.commentary || '')
  );
}

function formatHeadlineWithPenalty(ev: SimTimelineEvent): string {
  const headline = ev.headline || '';
  if (!isPenaltyEvent(ev) || /\(P\)/i.test(headline)) return headline;
  return `${headline} (P)`;
}

function periodFullName(period: '1H' | '2H' | 'ET1' | 'ET2'): string {
  if (period === '1H') return '1st Half';
  if (period === '2H') return '2nd Half';
  if (period === 'ET1') return 'Extra Time 1';
  return 'Extra Time 2';
}

export const MomentumChart: React.FC<MomentumChartProps> = ({
  output,
  homeTeam,
  awayTeam,
  phase,
  currentMinute,
  currentAddedMinute = 0,
  visibleHomeScore,
  visibleAwayScore,
  visibleMomentum,
  visibleEvents,
}) => {
  const colors = useMemo(
    () => resolvePairChartColors(homeTeam.primaryColor, awayTeam.primaryColor),
    [homeTeam.primaryColor, awayTeam.primaryColor]
  );

  const [hovered, setHovered] = useState<ChartPoint | null>(null);

  const isFullTime = phase === 'full-time';
  const showExtraTime =
    Boolean(output.wentToExtraTime) &&
    (currentMinute > 90 ||
      phase === 'end-of-90' ||
      phase === 'extra-time-1' ||
      phase === 'et-interval' ||
      phase === 'extra-time-2' ||
      phase === 'penalties' ||
      phase === 'penalties-intro' ||
      phase === 'full-time');

  const truncatedMomentum = useMemo(() => {
    const base = visibleMomentum?.length ? visibleMomentum : output.momentum || [];
    if (isFullTime || phase === 'penalties' || phase === 'penalties-intro') {
      return output.momentum || base;
    }
    return truncateMomentumForLiveMatch(base, currentMinute, currentAddedMinute);
  }, [visibleMomentum, output.momentum, isFullTime, phase, currentMinute, currentAddedMinute]);

  const hasData = useMemo(() => {
    return hasEnoughMomentumData(truncatedMomentum, output.shots);
  }, [truncatedMomentum, output.shots]);

  // SVG Geometry
  const svgW = 880;
  const svgH = 382;
  const axisX = 28;
  const plotLeft = 64;
  const plotRight = 864;
  const plotTop = 62;
  const plotBottom = 310;
  const plotH = plotBottom - plotTop;
  const midY = plotTop + plotH / 2;
  const maxAmp = plotH / 2 - 8;

  const topMarkerY = 50;
  const topLabelY = 36;
  const botMarkerY = 322;
  const botLabelY = 338;

  const pressureScaleRef = useMemo(() => {
    let peak = 32;
    for (const m of output.momentum || []) {
      const a = Math.abs(m.smoothedDiff);
      if (a > peak) peak = a;
    }
    for (const m of truncatedMomentum) {
      const a = Math.abs(m.smoothedDiff);
      if (a > peak) peak = a;
    }
    return Math.max(42, Math.min(96, peak * 1.12));
  }, [output.momentum, truncatedMomentum]);

  const periodDefs = useMemo(() => {
    return getMatchPeriodSegments(
      showExtraTime,
      isFullTime ? output.finalMinute : Math.max(90, currentMinute),
      output.stoppage1H,
      output.stoppage2H,
      output.stoppageET1,
      output.stoppageET2
    );
  }, [
    showExtraTime,
    isFullTime,
    output.finalMinute,
    currentMinute,
    output.stoppage1H,
    output.stoppage2H,
    output.stoppageET1,
    output.stoppageET2,
  ]);

  const { laidOutSegments, interactivePoints, liveHeadPoint } = useMemo(() => {
    const gapW = periodDefs.length > 2 ? 12 : 16;
    const totalGapW = Math.max(0, periodDefs.length - 1) * gapW;
    const availableW = plotRight - plotLeft - totalGapW;
    const totalSpan = periodDefs.reduce((s, seg) => s + seg.tSpan, 0) || 90;

    let cursorX = plotLeft;
    const segmentsOut: LaidOutSegment[] = [];
    const allRealPoints: ChartPoint[] = [];

    for (const seg of periodDefs) {
      const width = (seg.tSpan / totalSpan) * availableW;
      const xStart = cursorX;
      const xEnd = cursorX + width;
      cursorX = xEnd + gapW;

      const mapOffsetToX = (offset: number) => {
        const clamped = Math.max(0, Math.min(seg.tSpan, offset));
        return xStart + (clamped / seg.tSpan) * width;
      };

      const segPts = truncatedMomentum
        .filter((pt) => getPointPeriod(pt) === seg.key)
        .map((pt) => {
          const parsed = parseDisplayLabel(pt.displayLabel, pt.minute, pt.addedMinute);
          const off = getOffsetInPeriod(seg.key, parsed.minute, parsed.addedMinute);
          const val = Math.max(-100, Math.min(100, pt.smoothedDiff));
          const norm = Math.max(-1, Math.min(1, val / pressureScaleRef));
          const lbl = pt.displayLabel
            ? pt.displayLabel.endsWith("'")
              ? pt.displayLabel
              : `${pt.displayLabel}'`
            : formatMatchMinute(parsed.minute, parsed.addedMinute);
          const homeMom =
            pt.homeMomentum ?? Math.max(0, Math.round(val > 0 ? val : pt.rawDiff > 0 ? pt.rawDiff * 0.4 : 6));
          const awayMom =
            pt.awayMomentum ?? Math.max(0, Math.round(val < 0 ? -val : pt.rawDiff < 0 ? -pt.rawDiff * 0.4 : 6));

          return {
            x: mapOffsetToX(off),
            y: midY - norm * maxAmp,
            val,
            homeMomentum: homeMom,
            awayMomentum: awayMom,
            minute: parsed.minute,
            addedMinute: parsed.addedMinute,
            period: seg.key,
            label: lbl,
          } as ChartPoint;
        });

      allRealPoints.push(...segPts);

      // Anchor curve at start of each period (offset 0 -> balanced baseline) for clean visual start
      const curvePts: ChartPoint[] = [];
      if (segPts.length > 0) {
        const first = segPts[0];
        const firstOff = getOffsetInPeriod(seg.key, first.minute, first.addedMinute);
        if (firstOff > 0) {
          curvePts.push({
            x: xStart,
            y: midY,
            val: 0,
            homeMomentum: 0,
            awayMomentum: 0,
            minute: seg.tMin,
            addedMinute: 0,
            period: seg.key,
            label: `${seg.tMin}'`,
            isAnchor: true,
          });
        }
        curvePts.push(...segPts);
      }

      const crossed = insertZeroCrossings(curvePts, midY);
      const { areaPath, strokePath } = buildSmoothPaths(crossed, midY);
      const regOffsetEnd = seg.regEnd - seg.tMin;

      segmentsOut.push({
        seg,
        xStart,
        xEnd,
        width,
        regOffsetEnd,
        points: curvePts,
        areaPath,
        strokePath,
      });
    }

    const lastReal = allRealPoints.length > 0 ? allRealPoints[allRealPoints.length - 1] : null;
    return {
      laidOutSegments: segmentsOut,
      interactivePoints: allRealPoints,
      liveHeadPoint: lastReal,
    };
  }, [periodDefs, truncatedMomentum, pressureScaleRef, midY, maxAmp]);

  const mapEventCoord = useMemo(() => {
    return (ev: SimTimelineEvent): { x: number; curveY: number; period: '1H' | '2H' | 'ET1' | 'ET2' } | null => {
      const evPeriod: '1H' | '2H' | 'ET1' | 'ET2' =
        ev.period === 'HT'
          ? '1H'
          : ev.period === 'ETHT'
          ? 'ET1'
          : ev.period === '1H' || ev.period === '2H' || ev.period === 'ET1' || ev.period === 'ET2'
          ? ev.period
          : ev.minute <= 45
          ? '1H'
          : ev.minute <= 90
          ? '2H'
          : ev.minute <= 105
          ? 'ET1'
          : 'ET2';

      const targetSeg = laidOutSegments.find((s) => s.seg.key === evPeriod);
      if (!targetSeg) return null;

      const off = getOffsetInPeriod(evPeriod, ev.minute, ev.addedMinute || 0);
      const clamped = Math.max(0, Math.min(targetSeg.seg.tSpan, off));
      const x = targetSeg.xStart + (clamped / targetSeg.seg.tSpan) * targetSeg.width;

      let curveY = midY;
      let bestDist = Infinity;
      for (const pt of targetSeg.points) {
        const d = Math.abs(pt.x - x);
        if (d < bestDist) {
          bestDist = d;
          curveY = pt.y;
        }
      }
      return { x, curveY, period: evPeriod };
    };
  }, [laidOutSegments, midY]);

  const eventsByMinuteLabel = useMemo(() => {
    const map = new Map<string, SimTimelineEvent[]>();
    for (const ev of visibleEvents) {
      if (ev.type === 'kickoff' || ev.type === 'half-time' || ev.type === 'full-time' || ev.type === 'et-half-time') {
        continue;
      }
      const lbl = formatMatchMinute(ev.minute, ev.addedMinute);
      const arr = map.get(lbl) || [];
      arr.push(ev);
      map.set(lbl, arr);
    }
    return map;
  }, [visibleEvents]);

  // Major event markers: goals, own-goals, red cards, second yellows, woodwork & big chances
  const majorMarkers = useMemo(() => {
    const items = visibleEvents.filter(
      (e) =>
        e.type === 'goal' ||
        e.type === 'own-goal' ||
        e.type === 'red' ||
        e.type === 'second-yellow' ||
        e.type === 'woodwork' ||
        e.type === 'big-chance-missed'
    );
    const lastXBySide: Record<'home' | 'away', number[]> = {
      home: [-999, -999],
      away: [-999, -999],
    };
    return items
      .map((ev) => {
        const mapped = mapEventCoord(ev);
        if (!mapped) return null;
        const side: 'home' | 'away' = ev.teamSide === 'away' ? 'away' : 'home';
        const isPrimary = ev.type === 'goal' || ev.type === 'own-goal' || ev.type === 'red' || ev.type === 'second-yellow';
        let lane = 0;
        if (isPrimary && Math.abs(mapped.x - lastXBySide[side][0]) < 24) {
          lane = 1;
        }
        if (isPrimary) {
          lastXBySide[side][lane] = mapped.x;
        }
        const isGoal = ev.type === 'goal' || ev.type === 'own-goal';
        const isRed = ev.type === 'red' || ev.type === 'second-yellow';
        const isPen = isGoal && isPenaltyEvent(ev);
        const minStr = formatMatchMinute(ev.minute, ev.addedMinute);
        return {
          ev,
          side,
          x: mapped.x,
          curveY: mapped.curveY,
          lane,
          isGoal,
          isRed,
          isPrimary,
          isPen,
          label: isPen ? `${minStr} (P)` : minStr,
        };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [visibleEvents, mapEventCoord]);

  const subMarkers = useMemo(() => {
    const subs = visibleEvents.filter((e) => e.type === 'sub');
    const placedBySide: Record<'home' | 'away', Array<{ x: number; stack: number }>> = {
      home: [],
      away: [],
    };
    return subs
      .map((ev) => {
        const mapped = mapEventCoord(ev);
        if (!mapped) return null;
        const side: 'home' | 'away' = ev.teamSide === 'away' ? 'away' : 'home';
        const existingNear = placedBySide[side].filter((p) => Math.abs(p.x - mapped.x) < 11);
        const stack = existingNear.length;
        placedBySide[side].push({ x: mapped.x, stack });
        return { ev, side, x: mapped.x, stack };
      })
      .filter((x): x is NonNullable<typeof x> => Boolean(x));
  }, [visibleEvents, mapEventCoord]);

  // Post-match complete momentum insights (only computed at Full-Time)
  const postMatchAnalysis = useMemo(() => {
    if (!isFullTime) return null;
    return computeMomentumAnalytics(output.momentum, output.events, output.wentToExtraTime);
  }, [isFullTime, output.momentum, output.events, output.wentToExtraTime]);

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (interactivePoints.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / Math.max(1, rect.width)) * svgW;
    if (relX < plotLeft - 10 || relX > plotRight + 10) {
      setHovered(null);
      return;
    }
    let best: ChartPoint | null = null;
    let bestDist = Infinity;
    for (const pt of interactivePoints) {
      const d = Math.abs(pt.x - relX);
      if (d < bestDist) {
        bestDist = d;
        best = pt;
      }
    }
    setHovered(best);
  };

  // Current dominant team calculation (must run before any early return)
  const currentDominant = useMemo(() => {
    if (!liveHeadPoint) return { side: 'balanced' as const, label: 'Evenly Balanced', mag: 0 };
    const v = liveHeadPoint.val;
    if (v > 5) {
      return {
        side: 'home' as const,
        label: `${homeTeam.shortName || homeTeam.name} on top`,
        mag: Math.round(v),
      };
    }
    if (v < -5) {
      return {
        side: 'away' as const,
        label: `${awayTeam.shortName || awayTeam.name} on top`,
        mag: Math.round(-v),
      };
    }
    return { side: 'balanced' as const, label: 'Balanced Spell', mag: Math.round(Math.abs(v)) };
  }, [liveHeadPoint, homeTeam.shortName, homeTeam.name, awayTeam.shortName, awayTeam.name]);

  if (!hasData) {
    return (
      <div className="w-full bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-200 rounded-2xl p-8 text-center space-y-2.5">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] light:bg-slate-100 border border-white/10 light:border-slate-200 flex items-center justify-center mx-auto">
          <Shield className="w-5 h-5 text-[#7ADBF0] light:text-cyan-700" />
        </div>
        <h4 className="text-sm text-white light:text-slate-900">Waiting for Match Events</h4>
        <p className="text-xs text-slate-400 light:text-slate-600 max-w-sm mx-auto">
          Momentum flow updates live as attacking pressure, shots, set pieces, and key incidents occur.
        </p>
      </div>
    );
  }

  const finalLabel = output.wentToExtraTime
    ? formatMatchMinute(120, output.stoppageET2)
    : formatMatchMinute(90, output.stoppage2H);

  const periodStatusText = isFullTime
    ? `FULL-TIME · ENDED AT ${finalLabel}`
    : phase === 'half-time'
    ? `HALF-TIME · 1ST HALF ENDED ${formatMatchMinute(45, output.stoppage1H)}`
    : phase === 'end-of-90'
    ? `90+ · ENTERING EXTRA TIME`
    : phase === 'et-interval'
    ? `ET INTERVAL · ENDED ${formatMatchMinute(105, output.stoppageET1)}`
    : `LIVE · ${formatMatchMinute(currentMinute, currentAddedMinute)}`;

  const hoveredEvents = hovered ? eventsByMinuteLabel.get(hovered.label) || [] : [];

  const gradHomeId = `momentumHomeGrad-${output.seed.replace(/[^a-zA-Z0-9]/g, '')}`;
  const gradAwayId = `momentumAwayGrad-${output.seed.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <div className="space-y-4">
      {/* Main Interactive Match Momentum Card */}
      <div className="rounded-2xl bg-[#070E1A] dark:bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-200 p-4 sm:p-6 space-y-4 shadow-xl">
        {/* Top Broadcast Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-lg sm:text-2xl tracking-tight leading-tight">
              <span style={{ color: colors.home }}>{homeTeam.shortName || homeTeam.name}</span>
              <span className="text-white light:text-slate-900 font-display tracking-wider tabular-nums px-1">
                {visibleHomeScore}-{visibleAwayScore}
              </span>
              <span style={{ color: colors.away }}>{awayTeam.shortName || awayTeam.name}</span>
            </div>
            <div className="text-[11px] text-slate-400 light:text-slate-600 mt-0.5 font-mono">
              {output.competition.competitionName} · {output.competition.stageLabel} · {periodStatusText}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Live / Current Dominance Readout */}
            <div className="px-3 py-1.5 rounded-lg bg-slate-950/90 light:bg-slate-100 border border-white/10 light:border-slate-200 font-mono text-[11px] flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    currentDominant.side === 'home'
                      ? colors.home
                      : currentDominant.side === 'away'
                      ? colors.away
                      : '#94A3B8',
                }}
              />
              <span className="text-slate-200 light:text-slate-800">{currentDominant.label}</span>
              {currentDominant.side !== 'balanced' && (
                <span
                  className="tabular-nums"
                  style={{
                    color: currentDominant.side === 'home' ? colors.home : colors.away,
                  }}
                >
                  +{currentDominant.mag}
                </span>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-2 pl-1">
              <div className="grid grid-cols-3 gap-0.5 items-end" aria-hidden="true">
                <span className="w-1.5 h-1.5 rounded-[1px]" style={{ backgroundColor: colors.away }} />
                <span className="w-1.5 h-2.5 rounded-[1px]" style={{ backgroundColor: colors.home }} />
                <span className="w-1.5 h-3.5 rounded-[1px]" style={{ backgroundColor: '#7ADBF0' }} />
              </div>
              <div className="text-right leading-none">
                <div className="text-[11px] text-white light:text-slate-900">Match Momentum</div>
                <div className="font-mono text-[8px] uppercase tracking-widest text-slate-400 light:text-slate-500 mt-0.5">
                  Event-Driven Pressure
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Hover Readout Strip (fixed height so layout never shifts) */}
        <div className="min-h-[38px] rounded-xl bg-[#040912] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          {hovered ? (
            <>
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] tabular-nums">
                <span className="text-cyan-300 light:text-cyan-700">
                  {hovered.label} · {periodFullName(hovered.period)}
                </span>
                <span className="text-slate-500">|</span>
                <span className="flex items-center gap-1.5 text-slate-200 light:text-slate-800">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.home }} />
                  {homeTeam.code}: {hovered.homeMomentum}
                </span>
                <span className="flex items-center gap-1.5 text-slate-200 light:text-slate-800">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.away }} />
                  {awayTeam.code}: {hovered.awayMomentum}
                </span>
                <span className="text-slate-500">·</span>
                <span
                  style={{
                    color: hovered.val > 4 ? colors.home : hovered.val < -4 ? colors.away : '#94A3B8',
                  }}
                >
                  {hovered.val > 4
                    ? `${homeTeam.code} +${Math.round(hovered.val)}`
                    : hovered.val < -4
                    ? `${awayTeam.code} +${Math.round(Math.abs(hovered.val))}`
                    : 'Balanced'}
                </span>
              </div>
              {hoveredEvents.length > 0 && (
                <div className="font-mono text-[11px] text-amber-300 light:text-amber-700 truncate max-w-full sm:max-w-[360px]">
                  {hoveredEvents.map((e) => formatHeadlineWithPenalty(e)).join(' · ')}
                </div>
              )}
            </>
          ) : (
            <div className="w-full flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-slate-400 light:text-slate-600">
              <span>Move pointer or tap along the timeline to inspect minute-by-minute momentum & events</span>
              <span className="tabular-nums">
                {isFullTime
                  ? `${truncatedMomentum.length} mins tracked · Final whistle ${finalLabel}`
                  : `${truncatedMomentum.length} mins tracked · ${formatMatchMinute(currentMinute, currentAddedMinute)} elapsed`}
              </span>
            </div>
          )}
        </div>

        {/* SVG Chart Container (Responsive across Desktop & Mobile) */}
        <div className="rounded-xl bg-[#040912] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 p-2 sm:p-4">
          <svg
            viewBox={`0 0 ${svgW} ${svgH}`}
            className="w-full h-auto overflow-visible select-none touch-none"
            onPointerMove={handleSvgPointerMove}
            onPointerDown={handleSvgPointerMove}
            onPointerLeave={() => setHovered(null)}
          >
            <defs>
              <clipPath id="momentumClipAbove">
                <rect x={plotLeft - 4} y={plotTop} width={plotRight - plotLeft + 8} height={midY - plotTop} />
              </clipPath>
              <clipPath id="momentumClipBelow">
                <rect x={plotLeft - 4} y={midY} width={plotRight - plotLeft + 8} height={plotBottom - midY} />
              </clipPath>
              <linearGradient id={gradHomeId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.home} stopOpacity="0.62" />
                <stop offset="68%" stopColor={colors.home} stopOpacity="0.28" />
                <stop offset="100%" stopColor={colors.home} stopOpacity="0.06" />
              </linearGradient>
              <linearGradient id={gradAwayId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colors.away} stopOpacity="0.06" />
                <stop offset="32%" stopColor={colors.away} stopOpacity="0.28" />
                <stop offset="100%" stopColor={colors.away} stopOpacity="0.62" />
              </linearGradient>
            </defs>

            {/* Left Axis Labels */}
            <text
              x={11}
              y={midY}
              textAnchor="middle"
              fill="#94A3B8"
              fontSize="10"
              fontFamily="monospace"
              transform={`rotate(-90 11 ${midY})`}
              className="light:fill-slate-600"
            >
              MOMENTUM
            </text>
            <line x1={axisX} y1={plotTop + 6} x2={axisX} y2={plotBottom - 6} stroke="rgba(148,163,184,0.45)" strokeWidth="1" />
            <polyline
              points={`${axisX - 3.5},${plotTop + 12} ${axisX},${plotTop + 6} ${axisX + 3.5},${plotTop + 12}`}
              fill="none"
              stroke={colors.home}
              strokeWidth="1.3"
            />
            <polyline
              points={`${axisX - 3.5},${plotBottom - 12} ${axisX},${plotBottom - 6} ${axisX + 3.5},${plotBottom - 12}`}
              fill="none"
              stroke={colors.away}
              strokeWidth="1.3"
            />
            <text x={axisX + 6} y={plotTop + 12} fill={colors.home} fontSize="9.5" fontFamily="monospace">
              {homeTeam.code}
            </text>
            <text x={axisX + 6} y={midY + 3} fill="#64748B" fontSize="9" fontFamily="monospace">
              0
            </text>
            <text x={axisX + 6} y={plotBottom - 5} fill={colors.away} fontSize="9.5" fontFamily="monospace">
              {awayTeam.code}
            </text>

            {/* Horizontal Quarter Reference Lines */}
            <line
              x1={plotLeft}
              y1={midY - maxAmp * 0.5}
              x2={plotRight}
              y2={midY - maxAmp * 0.5}
              stroke="rgba(148,163,184,0.10)"
              strokeDasharray="3 4"
              strokeWidth="1"
            />
            <line
              x1={plotLeft}
              y1={midY + maxAmp * 0.5}
              x2={plotRight}
              y2={midY + maxAmp * 0.5}
              stroke="rgba(148,163,184,0.10)"
              strokeDasharray="3 4"
              strokeWidth="1"
            />

            {/* Period Panels */}
            {laidOutSegments.map((item, idx) => {
              const { seg, xStart, xEnd, width, regOffsetEnd, areaPath, strokePath } = item;
              const centerX = (xStart + xEnd) / 2;
              const regEndX = xStart + (regOffsetEnd / seg.tSpan) * width;

              // Determine clean internal ticks per period
              const internalTicks: Array<{ offset: number; label: string }> = [];
              if (seg.key === '1H') {
                internalTicks.push({ offset: 0, label: "0'" }, { offset: 15, label: "15'" }, { offset: 30, label: "30'" });
                if (seg.stoppage > 0) internalTicks.push({ offset: 45, label: "45'" });
              } else if (seg.key === '2H') {
                internalTicks.push({ offset: 0, label: "45'" }, { offset: 15, label: "60'" }, { offset: 30, label: "75'" });
                if (seg.stoppage > 0) internalTicks.push({ offset: 45, label: "90'" });
              } else if (seg.key === 'ET1') {
                internalTicks.push({ offset: 0, label: "90'" });
                if (seg.stoppage > 0) internalTicks.push({ offset: 15, label: "105'" });
              } else {
                internalTicks.push({ offset: 0, label: "105'" });
                if (seg.stoppage > 0) internalTicks.push({ offset: 15, label: "120'" });
              }

              const periodEndLabel =
                seg.stoppage > 0 ? `${seg.regEnd}+${seg.stoppage}'` : `${seg.regEnd}'`;

              const breakLabel =
                idx === 1 ? 'HT' : idx === 2 ? 'FT / ET' : idx === 3 ? 'ET HT' : '';

              return (
                <g key={seg.key}>
                  {/* Interval Gap Marker between Periods */}
                  {idx > 0 && (
                    <g>
                      <text
                        x={xStart - (laidOutSegments.length > 2 ? 6 : 8)}
                        y={midY + 3}
                        textAnchor="middle"
                        fill="#64748B"
                        fontSize="8.5"
                        fontFamily="monospace"
                      >
                        {breakLabel}
                      </text>
                    </g>
                  )}

                  {/* Period Title */}
                  <text
                    x={centerX}
                    y={16}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="10.5"
                    fontFamily="monospace"
                    letterSpacing="1.2"
                  >
                    {seg.title}
                  </text>

                  {/* Period Plot Surface */}
                  <rect
                    x={xStart}
                    y={plotTop}
                    width={width}
                    height={plotH}
                    rx="7"
                    fill="rgba(11, 21, 37, 0.45)"
                    className="light:fill-white light:stroke-slate-200"
                    stroke="rgba(255,255,255,0.07)"
                    strokeWidth="1"
                  />

                  {/* Subtle Stoppage-Time Shaded End Zone */}
                  {seg.stoppage > 0 && regEndX < xEnd && (
                    <rect
                      x={regEndX}
                      y={plotTop + 1}
                      width={Math.max(1, xEnd - regEndX - 1)}
                      height={plotH - 2}
                      fill="rgba(122, 219, 240, 0.04)"
                    />
                  )}

                  {/* Vertical Gridlines & Minute Labels */}
                  {internalTicks.map((t) => {
                    const tx = xStart + (t.offset / seg.tSpan) * width;
                    const isRegBoundary = t.offset === regOffsetEnd && seg.stoppage > 0;
                    return (
                      <g key={`${seg.key}-tk-${t.label}`}>
                        {t.offset > 0 && (
                          <line
                            x1={tx}
                            y1={plotTop}
                            x2={tx}
                            y2={plotBottom}
                            stroke={isRegBoundary ? 'rgba(148,163,184,0.28)' : 'rgba(148,163,184,0.12)'}
                            strokeDasharray="3 3"
                            strokeWidth="1"
                          />
                        )}
                        <text
                          x={tx}
                          y={svgH - 20}
                          textAnchor="middle"
                          fill="#94A3B8"
                          fontSize="9.5"
                          fontFamily="monospace"
                        >
                          {t.label}
                        </text>
                      </g>
                    );
                  })}

                  {/* Exact End-of-Period Stoppage Label (e.g. 45+2', 90+5') */}
                  <text
                    x={xEnd}
                    y={svgH - 20}
                    textAnchor="end"
                    fill="#CBD5E1"
                    className="light:fill-slate-700"
                    fontSize="9.5"
                    fontFamily="monospace"
                  >
                    {periodEndLabel}
                  </text>

                  {/* Center Zero Balanced Line */}
                  <line
                    x1={xStart}
                    y1={midY}
                    x2={xEnd}
                    y2={midY}
                    stroke="rgba(148,163,184,0.42)"
                    strokeWidth="1.2"
                  />

                  {/* Smooth Filled Area + Top/Bottom Strokes */}
                  {areaPath && (
                    <>
                      <path d={areaPath} fill={`url(#${gradHomeId})`} clipPath="url(#momentumClipAbove)" />
                      <path d={areaPath} fill={`url(#${gradAwayId})`} clipPath="url(#momentumClipBelow)" />
                    </>
                  )}
                  {strokePath && (
                    <>
                      <path
                        d={strokePath}
                        fill="none"
                        stroke={colors.home}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        clipPath="url(#momentumClipAbove)"
                      />
                      <path
                        d={strokePath}
                        fill="none"
                        stroke={colors.away}
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        clipPath="url(#momentumClipBelow)"
                      />
                    </>
                  )}
                </g>
              );
            })}

            {/* Current Match Minute Vertical Indicator (when live/active) */}
            {!isFullTime && liveHeadPoint && (
              <g pointerEvents="none">
                <line
                  x1={liveHeadPoint.x}
                  y1={plotTop}
                  x2={liveHeadPoint.x}
                  y2={plotBottom}
                  stroke="#7ADBF0"
                  strokeWidth="1.4"
                  strokeDasharray="3 2"
                />
                <circle
                  cx={liveHeadPoint.x}
                  cy={liveHeadPoint.y}
                  r="4.5"
                  fill={liveHeadPoint.val >= 0 ? colors.home : colors.away}
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                />
                <text
                  x={liveHeadPoint.x}
                  y={plotTop - 5}
                  textAnchor="middle"
                  fill="#7ADBF0"
                  fontSize="9"
                  fontFamily="monospace"
                >
                  {liveHeadPoint.label}
                </text>
              </g>
            )}

            {/* Substitution Markers */}
            {subMarkers.map(({ ev, side, x, stack }) => {
              const isHome = side === 'home';
              const sy = isHome ? topMarkerY + 6 + stack * 12 : botMarkerY - 6 - stack * 12;
              const col = isHome ? colors.home : colors.away;
              return (
                <g key={ev.id} transform={`translate(${x}, ${sy})`}>
                  <title>{`${formatMatchMinute(ev.minute, ev.addedMinute)} Sub: ${ev.commentary}`}</title>
                  <circle cx="0" cy="0" r="5" fill="rgba(15,23,42,0.8)" stroke={col} strokeWidth="1" />
                  <text x="0" y="2.8" textAnchor="middle" fill={col} fontSize="8">
                    ↻
                  </text>
                </g>
              );
            })}

            {/* Goals, Penalties, Red Cards, Woodwork & Big Chances */}
            {majorMarkers.map(({ ev, side, x, curveY, lane, isGoal, isRed, isPrimary, isPen, label }) => {
              const isHome = side === 'home';
              const markerY = isHome ? topMarkerY : botMarkerY;
              const textY = isHome ? topLabelY - lane * 10 : botLabelY + 4 + lane * 10;
              const col = isRed ? '#E11D48' : isHome ? colors.home : colors.away;

              if (!isPrimary) {
                // Woodwork / Big Chance Missed subtle diamond marker directly along edge
                const edgeY = isHome ? plotTop + 8 : plotBottom - 8;
                return (
                  <g key={ev.id} className="cursor-pointer">
                    <title>{`${label} ${formatHeadlineWithPenalty(ev)}`}</title>
                    <line
                      x1={x}
                      y1={edgeY}
                      x2={x}
                      y2={curveY}
                      stroke="rgba(148,163,184,0.28)"
                      strokeDasharray="2 2"
                      strokeWidth="0.8"
                    />
                    <polygon
                      points={`${x},${edgeY - 4} ${x + 4},${edgeY} ${x},${edgeY + 4} ${x - 4},${edgeY}`}
                      fill={ev.type === 'woodwork' ? '#F59E0B' : col}
                      fillOpacity="0.85"
                      stroke="#FFFFFF"
                      strokeWidth="0.7"
                    />
                  </g>
                );
              }

              return (
                <g key={ev.id} className="cursor-pointer">
                  <title>{`${label} ${formatHeadlineWithPenalty(ev)}`}</title>
                  <line
                    x1={x}
                    y1={isHome ? markerY + 7 : markerY - 7}
                    x2={x}
                    y2={curveY}
                    stroke="rgba(148,163,184,0.48)"
                    strokeWidth="0.9"
                  />
                  <text
                    x={x}
                    y={textY}
                    textAnchor="middle"
                    fill={isPen ? '#FDE68A' : '#CBD5E1'}
                    fontSize="8.8"
                    fontFamily="monospace"
                    className="light:fill-slate-800"
                  >
                    {label}
                  </text>
                  {isGoal ? (
                    isPen ? (
                      <g transform={`translate(${x}, ${markerY})`}>
                        <circle cx="0" cy="0" r="6.8" fill="#0F172A" stroke={col} strokeWidth="2" />
                        <text x="0" y="3" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontFamily="monospace">
                          P
                        </text>
                      </g>
                    ) : (
                      <g transform={`translate(${x}, ${markerY})`}>
                        <circle cx="0" cy="0" r="6.6" fill="#FFFFFF" stroke={col} strokeWidth="2" />
                        <polygon points="0,-2.8 2.6,-0.8 1.6,2.2 -1.6,2.2 -2.6,-0.8" fill={col} />
                      </g>
                    )
                  ) : (
                    <g transform={`translate(${x}, ${markerY})`}>
                      <rect x="-5" y="-6.5" width="10" height="13" rx="1.8" fill={col} stroke="#FFFFFF" strokeWidth="0.8" />
                      <text x="0" y="2.8" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontFamily="monospace">
                        R
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Interactive Hover Crosshair */}
            {hovered && (
              <g pointerEvents="none">
                <line
                  x1={hovered.x}
                  y1={plotTop}
                  x2={hovered.x}
                  y2={plotBottom}
                  stroke="rgba(122,219,240,0.75)"
                  strokeDasharray="3 3"
                  strokeWidth="1.2"
                />
                <circle
                  cx={hovered.x}
                  cy={hovered.y}
                  r="4.5"
                  fill={hovered.val >= 0 ? colors.home : colors.away}
                  stroke="#FFFFFF"
                  strokeWidth="1.6"
                />
              </g>
            )}

            {/* Bottom Axis Title */}
            <text
              x={(plotLeft + plotRight) / 2}
              y={svgH - 3}
              textAnchor="middle"
              fill="#94A3B8"
              fontSize="10"
              fontFamily="monospace"
              className="light:fill-slate-600"
            >
              Match Minute
            </text>
          </svg>

          {/* Compact Legend Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-1 border-t border-white/[0.06] light:border-slate-200 font-mono text-[10px] tracking-wider uppercase">
            <span className="flex items-center gap-1.5 text-slate-300 light:text-slate-700">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.home }} />
              {homeTeam.code} Above Zero
            </span>
            <span className="text-slate-400 light:text-slate-600 flex flex-wrap items-center gap-3">
              <span>● Goal</span>
              <span>◆ Big Chance / Woodwork</span>
              <span>■ Red Card</span>
              <span>↻ Sub</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-300 light:text-slate-700">
              {awayTeam.code} Below Zero
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.away }} />
            </span>
          </div>
        </div>
      </div>

      {/* Final Match Momentum Presentation (Shown after Full-Time Whistle) */}
      {isFullTime && postMatchAnalysis && (
        <div className="rounded-2xl bg-[#070E1A] dark:bg-[#070E1A] light:bg-white border border-white/10 light:border-slate-200 p-4 sm:p-6 space-y-5 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] light:border-slate-200 pb-3">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-white light:text-slate-900">
              <TrendingUp className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
              <span>Full-Time Momentum Report</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400 light:text-slate-600 tabular-nums">
              {output.momentum.length} simulated minutes · Final whistle {finalLabel}
            </span>
          </div>

          {/* 1. Final Momentum Comparison & Per-Period Breakdown */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs tabular-nums">
              <span className="flex items-center gap-2 text-white light:text-slate-900">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.home }} />
                {homeTeam.shortName || homeTeam.name} Control: {postMatchAnalysis.homeControlPct}%
                <span className="text-slate-400 light:text-slate-500 text-[10px]">
                  (Peak +{postMatchAnalysis.homePeak.val} at {postMatchAnalysis.homePeak.label})
                </span>
              </span>
              <span className="text-slate-400 light:text-slate-600 text-[11px]">
                Balanced: {postMatchAnalysis.balancedPct}%
              </span>
              <span className="flex items-center gap-2 text-white light:text-slate-900">
                <span className="text-slate-400 light:text-slate-500 text-[10px]">
                  (Peak +{postMatchAnalysis.awayPeak.val} at {postMatchAnalysis.awayPeak.label})
                </span>
                {awayTeam.shortName || awayTeam.name} Control: {postMatchAnalysis.awayControlPct}%
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors.away }} />
              </span>
            </div>

            <div className="h-2.5 rounded-full overflow-hidden flex bg-slate-900 light:bg-slate-200 border border-white/10 light:border-slate-300">
              <div style={{ width: `${postMatchAnalysis.homeControlPct}%`, backgroundColor: colors.home }} />
              <div style={{ width: `${postMatchAnalysis.balancedPct}%`, backgroundColor: '#64748B' }} />
              <div style={{ width: `${postMatchAnalysis.awayControlPct}%`, backgroundColor: colors.away }} />
            </div>

            {/* Period-by-Period Dominance Split */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {postMatchAnalysis.periodSummaries.map((ps) => {
                const domLabel =
                  ps.dominantSide === 'home'
                    ? `${homeTeam.code} +${Math.abs(ps.avgDiff)}`
                    : ps.dominantSide === 'away'
                    ? `${awayTeam.code} +${Math.abs(ps.avgDiff)}`
                    : 'Even';
                const domColor =
                  ps.dominantSide === 'home'
                    ? colors.home
                    : ps.dominantSide === 'away'
                    ? colors.away
                    : '#94A3B8';
                return (
                  <div
                    key={ps.key}
                    className="rounded-xl bg-[#040912] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 px-3 py-2.5 space-y-1"
                  >
                    <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 light:text-slate-600">
                      <span>{ps.title}</span>
                      <span style={{ color: domColor }}>{domLabel}</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-200 light:text-slate-800 tabular-nums">
                      {homeTeam.code} {ps.homeControlPct}% · {awayTeam.code} {ps.awayControlPct}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Periods of Dominance · Biggest Swings · Key Turning Points */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
            {/* Sustained Periods of Dominance */}
            <div className="space-y-2.5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-600">
                Periods of Dominance
              </div>
              {postMatchAnalysis.dominanceSpells.length === 0 ? (
                <p className="text-xs text-slate-400 light:text-slate-600">
                  Tightly contested match with no prolonged one-sided spells.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {postMatchAnalysis.dominanceSpells.map((sp) => {
                    const col = sp.side === 'home' ? colors.home : colors.away;
                    const teamLabel = sp.side === 'home' ? homeTeam.shortName || homeTeam.name : awayTeam.shortName || awayTeam.name;
                    return (
                      <div
                        key={sp.id}
                        className="px-3 py-2 rounded-xl bg-[#040912] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col }} />
                          <span className="text-slate-200 light:text-slate-800 truncate">{teamLabel}</span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 light:text-slate-600 tabular-nums shrink-0">
                          {sp.startLabel}–{sp.endLabel} ({sp.durationMins}m) · Peak +{sp.peakVal}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Biggest Momentum Swings */}
            <div className="space-y-2.5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-600">
                Biggest Momentum Swings
              </div>
              {postMatchAnalysis.biggestSwings.length === 0 ? (
                <p className="text-xs text-slate-400 light:text-slate-600">
                  Steady territorial balance with gradual pressure shifts.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {postMatchAnalysis.biggestSwings.map((sw) => {
                    const col = sw.towardSide === 'home' ? colors.home : colors.away;
                    const code = sw.towardSide === 'home' ? homeTeam.code : awayTeam.code;
                    return (
                      <div
                        key={sw.id}
                        className="px-3 py-2 rounded-xl bg-[#040912] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 space-y-0.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2 font-mono text-[11px] tabular-nums">
                          <span style={{ color: col }}>
                            +{sw.swingMagnitude} swing to {code}
                          </span>
                          <span className="text-slate-400 light:text-slate-600">
                            {sw.fromLabel} → {sw.toLabel}
                          </span>
                        </div>
                        {sw.triggerHeadline && (
                          <div className="text-[11px] text-slate-300 light:text-slate-700 truncate">
                            {sw.triggerHeadline}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Key Moments That Changed Direction */}
            <div className="space-y-2.5">
              <div className="font-mono text-[10px] uppercase tracking-widest text-slate-400 light:text-slate-600 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Game-Changing Moments</span>
              </div>
              {postMatchAnalysis.turningPoints.length === 0 ? (
                <p className="text-xs text-slate-400 light:text-slate-600">
                  No goals, red cards, or major woodwork moments recorded.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {postMatchAnalysis.turningPoints.map((tp) => {
                    const col = tp.teamSide === 'home' ? colors.home : colors.away;
                    const arrowSign = tp.delta >= 0 ? `+${tp.delta}` : `${tp.delta}`;
                    return (
                      <div
                        key={tp.id}
                        className="px-3 py-2 rounded-xl bg-[#040912] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[10px] text-cyan-300 light:text-cyan-700 shrink-0">
                            {tp.label}
                          </span>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: col }} />
                          <span className="text-slate-200 light:text-slate-800 truncate">{tp.headline}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 light:text-slate-600 tabular-nums shrink-0">
                          {tp.beforeVal}→{tp.afterVal} ({arrowSign})
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
