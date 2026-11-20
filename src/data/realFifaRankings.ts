import { GenderType } from '../types/matchCentre';
import { normalizeCountryName } from './countryMetadata';

export interface FifaRankingEntry {
  rank: number;
  points: number;
  overall: number;
}

export const REAL_FIFA_RANKINGS: Record<string, FifaRankingEntry> = {
  argentina: { rank: 1, points: 1889.02, overall: 91 },
  france: { rank: 2, points: 1851.92, overall: 90 },
  spain: { rank: 3, points: 1836.42, overall: 90 },
  england: { rank: 4, points: 1817.28, overall: 89 },
  brazil: { rank: 5, points: 1772.02, overall: 89 },
  belgium: { rank: 6, points: 1768.14, overall: 88 },
  netherlands: { rank: 7, points: 1759.95, overall: 88 },
  portugal: { rank: 8, points: 1753.14, overall: 88 },
  colombia: { rank: 9, points: 1738.65, overall: 87 },
  italy: { rank: 10, points: 1726.58, overall: 87 },
  germany: { rank: 11, points: 1703.76, overall: 86 },
  uruguay: { rank: 12, points: 1689.78, overall: 86 },
  croatia: { rank: 13, points: 1688.35, overall: 86 },
  morocco: { rank: 14, points: 1681.57, overall: 85 },
  switzerland: { rank: 15, points: 1677.83, overall: 85 },
  unitedstates: { rank: 16, points: 1630.95, overall: 84 },
  usa: { rank: 16, points: 1630.95, overall: 84 },
  mexico: { rank: 17, points: 1625.33, overall: 84 },
  japan: { rank: 18, points: 1623.57, overall: 84 },
  iran: { rank: 19, points: 1613.96, overall: 83 },
  denmark: { rank: 20, points: 1611.87, overall: 83 },
  senegal: { rank: 21, points: 1608.15, overall: 83 },
  southkorea: { rank: 22, points: 1589.93, overall: 83 },
  australia: { rank: 23, points: 1571.29, overall: 82 },
  ukraine: { rank: 24, points: 1554.45, overall: 82 },
  austria: { rank: 25, points: 1553.21, overall: 82 },
  türkiye: { rank: 26, points: 1546.84, overall: 81 },
  turkiye: { rank: 26, points: 1546.84, overall: 81 },
  ecuador: { rank: 27, points: 1544.12, overall: 81 },
  poland: { rank: 28, points: 1541.92, overall: 81 },
  sweden: { rank: 29, points: 1538.4, overall: 81 },
  wales: { rank: 30, points: 1532.18, overall: 80 },
  egypt: { rank: 31, points: 1528.9, overall: 80 },
  hungary: { rank: 32, points: 1524.5, overall: 80 },
  serbia: { rank: 33, points: 1520.2, overall: 80 },
  nigeria: { rank: 34, points: 1516.7, overall: 80 },
  canada: { rank: 35, points: 1514.1, overall: 80 },
  scotland: { rank: 36, points: 1512.43, overall: 80 },
  algeria: { rank: 37, points: 1506.3, overall: 79 },
  ivorycoast: { rank: 38, points: 1499.4, overall: 79 },
  norway: { rank: 42, points: 1488.2, overall: 79 },
  chile: { rank: 45, points: 1482.5, overall: 78 },
  greece: { rank: 47, points: 1479.8, overall: 78 },
  costarica: { rank: 50, points: 1475.22, overall: 78 },
  cameroon: { rank: 51, points: 1468.9, overall: 78 },
  jamaica: { rank: 62, points: 1380.12, overall: 76 },
  ghana: { rank: 70, points: 1336.33, overall: 75 },
  newzealand: { rank: 89, points: 1268.4, overall: 73 },
};

export const REAL_FIFA_WOMENS_RANKINGS: Record<string, FifaRankingEntry> = {
  unitedstates: { rank: 1, points: 2069.06, overall: 91 },
  usa: { rank: 1, points: 2069.06, overall: 91 },
  spain: { rank: 2, points: 2028.65, overall: 90 },
  germany: { rank: 3, points: 2014.73, overall: 90 },
  england: { rank: 4, points: 2008.98, overall: 89 },
  sweden: { rank: 5, points: 1991.52, overall: 89 },
  canada: { rank: 6, points: 1982.44, overall: 88 },
  brazil: { rank: 7, points: 1970.38, overall: 88 },
  japan: { rank: 8, points: 1966.25, overall: 88 },
  northkorea: { rank: 9, points: 1944.23, overall: 87 },
  netherlands: { rank: 10, points: 1936.91, overall: 87 },
  france: { rank: 11, points: 1933.7, overall: 87 },
  denmark: { rank: 12, points: 1882.4, overall: 85 },
  italy: { rank: 13, points: 1869.1, overall: 85 },
  iceland: { rank: 14, points: 1858.9, overall: 84 },
  australia: { rank: 15, points: 1852.6, overall: 84 },
  norway: { rank: 16, points: 1844.5, overall: 84 },
  austria: { rank: 17, points: 1811.3, overall: 83 },
  china: { rank: 18, points: 1803.7, overall: 83 },
  chinapr: { rank: 18, points: 1803.7, overall: 83 },
  belgium: { rank: 19, points: 1794.2, overall: 82 },
  southkorea: { rank: 20, points: 1787.4, overall: 82 },
  colombia: { rank: 21, points: 1781.9, overall: 82 },
  portugal: { rank: 22, points: 1776.1, overall: 82 },
  switzerland: { rank: 23, points: 1763.8, overall: 81 },
  scotland: { rank: 24, points: 1739.6, overall: 81 },
  republicofireland: { rank: 25, points: 1724.5, overall: 80 },
  newzealand: { rank: 31, points: 1658.2, overall: 78 },
  argentina: { rank: 33, points: 1642.1, overall: 78 },
  nigeria: { rank: 36, points: 1618.4, overall: 77 },
  jamaica: { rank: 42, points: 1546.8, overall: 75 },
};

function normRankingKey(s: string): string {
  return normalizeCountryName(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function getNationalFifaEntry(
  country: string,
  gender: GenderType = 'men'
): FifaRankingEntry | null {
  const key = normRankingKey(country);
  const table = gender === 'women' ? REAL_FIFA_WOMENS_RANKINGS : REAL_FIFA_RANKINGS;
  return table[key] || null;
}

export function getRealFifaRating(name: string, country: string, gender: GenderType = 'men'): number | null {
  return getNationalFifaEntry(country, gender)?.overall || getNationalFifaEntry(name, gender)?.overall || null;
}
