/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MatchClockInfo {
  period: '1H' | 'HT' | '2H' | 'ET1' | 'ETHT' | 'ET2' | 'PEN' | 'FT';
  minute: number;
  addedMinute?: number;
  displayLabel: string;
}

export interface MatchPeriodSegment {
  key: '1H' | '2H' | 'ET1' | 'ET2';
  title: string;
  tMin: number;
  tMax: number;
  tSpan: number;
  regEnd: number;
  stoppage: number;
}

export function getTickOrder(minute: number, addedMinute?: number): number {
  return minute + (addedMinute && addedMinute > 0 ? addedMinute * 0.01 : 0);
}

export function formatMatchMinute(minute: number, addedMinute?: number): string {
  return addedMinute && addedMinute > 0 ? `${minute}+${addedMinute}'` : `${minute}'`;
}

export function parseDisplayLabel(
  label: string | undefined,
  fallbackMinute: number,
  fallbackAddedMinute?: number
): { minute: number; addedMinute: number } {
  if (!label) return { minute: fallbackMinute, addedMinute: fallbackAddedMinute || 0 };
  const match = label.match(/^([A-Za-z0-9]+)-(\d+)(?:\+(\d+))?'?$/);
  if (!match) {
    const simple = label.match(/^(\d+)(?:\+(\d+))?'?$/);
    if (!simple) return { minute: fallbackMinute, addedMinute: fallbackAddedMinute || 0 };
    return {
      minute: Number(simple[1]) || fallbackMinute,
      addedMinute: simple[2] ? Number(simple[2]) : fallbackAddedMinute || 0,
    };
  }
  return {
    minute: Number(match[2]) || fallbackMinute,
    addedMinute: match[3] ? Number(match[3]) : fallbackAddedMinute || 0,
  };
}

export function getMatchPeriodSegments(
  wentToExtraTime: boolean,
  currentMinute: number = 90,
  stoppage1H: number = 2,
  stoppage2H: number = 4,
  stoppageET1: number = 1,
  stoppageET2: number = 2
): MatchPeriodSegment[] {
  const maxAdd1 = Math.min(8, Math.max(0, stoppage1H));
  const maxAdd2 = Math.min(10, Math.max(0, stoppage2H));
  const maxAddET1 = Math.min(6, Math.max(0, stoppageET1));
  const maxAddET2 = Math.min(6, Math.max(0, stoppageET2));

  const allSegments: MatchPeriodSegment[] = [
    {
      key: '1H',
      title: '1ST HALF',
      tMin: 0,
      tMax: 45 + maxAdd1,
      tSpan: 45 + maxAdd1,
      regEnd: 45,
      stoppage: maxAdd1,
    },
    {
      key: '2H',
      title: '2ND HALF',
      tMin: 45,
      tMax: 90 + maxAdd2,
      tSpan: 45 + maxAdd2,
      regEnd: 90,
      stoppage: maxAdd2,
    },
  ];

  if (wentToExtraTime) {
    allSegments.push(
      {
        key: 'ET1',
        title: 'ET 1ST HALF',
        tMin: 90,
        tMax: 105 + maxAddET1,
        tSpan: 15 + maxAddET1,
        regEnd: 105,
        stoppage: maxAddET1,
      },
      {
        key: 'ET2',
        title: 'ET 2ND HALF',
        tMin: 105,
        tMax: 120 + maxAddET2,
        tSpan: 15 + maxAddET2,
        regEnd: 120,
        stoppage: maxAddET2,
      }
    );
  }

  return allSegments.filter((seg) => {
    if (seg.key === '1H' || seg.key === '2H') return true;
    if (seg.key === 'ET1' || seg.key === 'ET2') return currentMinute >= 90 && wentToExtraTime;
    return false;
  });
}

export function truncateMomentumForLiveMatch<
  T extends { minute: number; addedMinute?: number; displayLabel?: string }
>(points: T[], currentMinute: number, currentAddedMinute: number = 0): T[] {
  if (!points || points.length === 0) return [];
  const cutoff = getTickOrder(currentMinute, currentAddedMinute);
  return points.filter((p) => {
    const parsed = parseDisplayLabel(p.displayLabel, p.minute, p.addedMinute);
    return getTickOrder(parsed.minute, parsed.addedMinute) <= cutoff + 1e-6;
  });
}
