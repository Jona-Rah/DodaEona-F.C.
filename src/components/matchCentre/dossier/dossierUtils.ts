import { getPlayerDisplayName, Player, TacticalMentalitySettings, Team } from '../../../types/matchCentre';

export function normalizeHex(hex?: string): string {
  if (!hex || typeof hex !== 'string') return '#1E293B';
  const cleaned = hex.trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(cleaned)) return cleaned;
  if (/^#[0-9A-Fa-f]{3}$/.test(cleaned)) {
    return `#${cleaned[1]}${cleaned[1]}${cleaned[2]}${cleaned[2]}${cleaned[3]}${cleaned[3]}`;
  }
  return '#1E293B';
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const full = normalizeHex(hex).slice(1);
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function isLightHex(hex: string): boolean {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62;
}

export function getOverallScheme(rating: number) {
  if (rating >= 90) {
    return {
      tierLabel: 'ELITE',
      badgeClass: 'bg-cyan-500/15 border-cyan-400/70 text-cyan-400 light:bg-cyan-50 light:border-cyan-500 light:text-cyan-700',
      barColor: '#38BDF8',
    };
  }
  if (rating >= 80) {
    return {
      tierLabel: 'WORLD CLASS',
      badgeClass: 'bg-emerald-500/15 border-emerald-400/70 text-emerald-400 light:bg-emerald-50 light:border-emerald-500 light:text-emerald-700',
      barColor: '#10B981',
    };
  }
  if (rating >= 70) {
    return {
      tierLabel: 'CONTENDER',
      badgeClass: 'bg-orange-500/15 border-orange-400/70 text-orange-400 light:bg-orange-50 light:border-orange-500 light:text-orange-700',
      barColor: '#F97316',
    };
  }
  if (rating >= 50) {
    return {
      tierLabel: 'CHALLENGER',
      badgeClass: 'bg-yellow-500/15 border-yellow-400/70 text-yellow-400 light:bg-yellow-50 light:border-yellow-500 light:text-yellow-700',
      barColor: '#EAB308',
    };
  }
  return {
    tierLabel: 'ROOKIE',
    badgeClass: 'bg-rose-500/15 border-rose-400/70 text-rose-400 light:bg-rose-50 light:border-rose-500 light:text-rose-700',
    barColor: '#EF4444',
  };
}

export type FormationPosRole =
  | 'GK'
  | 'LB'
  | 'LCB'
  | 'CB'
  | 'RCB'
  | 'RB'
  | 'LWB'
  | 'RWB'
  | 'CDM'
  | 'LDM'
  | 'RDM'
  | 'LCM'
  | 'RCM'
  | 'CM'
  | 'CAM'
  | 'LCAM'
  | 'RCAM'
  | 'LM'
  | 'RM'
  | 'LW'
  | 'RW'
  | 'ST'
  | 'CF';

export interface PitchNode {
  x: number; // percentage 0-100 left->right
  y: number; // percentage 0-100 top(ATT)->bottom(GK)
  role: FormationPosRole;
  line: 'GK' | 'DF' | 'MF' | 'FW';
  posReq: 'GK' | 'CB' | 'LB' | 'RB' | 'LWB' | 'RWB' | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'LW' | 'RW' | 'ST' | 'CF';
  side?: 'left' | 'center' | 'right';
}

export type FormationCategory =
  | 'POSSESSION-FIRST'
  | 'PRESSING-COMPACT'
  | 'DEFENSIVE-SOLID'
  | 'WING-BACK'
  | 'HYBRID';

export interface FormationBlueprint {
  formation: string;
  family: string;
  category: FormationCategory;
  blurb: string;
  nodes: PitchNode[];
}

export const FORMATION_TEMPLATES: Record<string, FormationBlueprint> = {
  '3-5-2': {
    formation: '3-5-2',
    family: 'WING-BACK',
    category: 'WING-BACK',
    blurb:
      'Three central defenders with attacking wing-backs and a midfield triangle. Shapes built around attacking wing-backs providing width.',
    nodes: [
      { x: 50, y: 89, role: 'GK', line: 'GK', posReq: 'GK', side: 'center' },
      { x: 26, y: 73, role: 'LCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 50, y: 75, role: 'CB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 74, y: 73, role: 'RCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 12, y: 50, role: 'LWB', line: 'MF', posReq: 'LWB', side: 'left' },
      { x: 33, y: 53, role: 'LCM', line: 'MF', posReq: 'CM', side: 'left' },
      { x: 50, y: 59, role: 'CDM', line: 'MF', posReq: 'CDM', side: 'center' },
      { x: 67, y: 53, role: 'RCM', line: 'MF', posReq: 'CM', side: 'right' },
      { x: 88, y: 50, role: 'RWB', line: 'MF', posReq: 'RWB', side: 'right' },
      { x: 38, y: 25, role: 'ST', line: 'FW', posReq: 'ST', side: 'left' },
      { x: 62, y: 25, role: 'ST', line: 'FW', posReq: 'ST', side: 'right' },
    ],
  },
  '4-2-3-1': {
    formation: '4-2-3-1',
    family: 'DOUBLE PIVOT',
    category: 'PRESSING-COMPACT',
    blurb:
      'Back four anchored by a disciplined double pivot, freeing a central playmaker behind the striker while wingers invert into half-spaces.',
    nodes: [
      { x: 50, y: 89, role: 'GK', line: 'GK', posReq: 'GK', side: 'center' },
      { x: 14, y: 71, role: 'LB', line: 'DF', posReq: 'LB', side: 'left' },
      { x: 38, y: 74, role: 'LCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 62, y: 74, role: 'RCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 86, y: 71, role: 'RB', line: 'DF', posReq: 'RB', side: 'right' },
      { x: 36, y: 56, role: 'LDM', line: 'MF', posReq: 'CDM', side: 'left' },
      { x: 64, y: 56, role: 'RDM', line: 'MF', posReq: 'CDM', side: 'right' },
      { x: 18, y: 38, role: 'LM', line: 'MF', posReq: 'LM', side: 'left' },
      { x: 50, y: 38, role: 'CAM', line: 'MF', posReq: 'CAM', side: 'center' },
      { x: 82, y: 38, role: 'RM', line: 'MF', posReq: 'RM', side: 'right' },
      { x: 50, y: 20, role: 'ST', line: 'FW', posReq: 'ST', side: 'center' },
    ],
  },
  '4-2-1-3': {
    formation: '4-2-1-3',
    family: 'VERTICAL CONTROL',
    category: 'HYBRID',
    blurb:
      'Two holding midfielders protect the central channel while a dedicated number ten links play into an aggressive front three.',
    nodes: [
      { x: 50, y: 89, role: 'GK', line: 'GK', posReq: 'GK', side: 'center' },
      { x: 14, y: 71, role: 'LB', line: 'DF', posReq: 'LB', side: 'left' },
      { x: 38, y: 74, role: 'LCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 62, y: 74, role: 'RCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 86, y: 71, role: 'RB', line: 'DF', posReq: 'RB', side: 'right' },
      { x: 37, y: 56, role: 'LDM', line: 'MF', posReq: 'CDM', side: 'left' },
      { x: 63, y: 56, role: 'RDM', line: 'MF', posReq: 'CDM', side: 'right' },
      { x: 50, y: 40, role: 'CAM', line: 'MF', posReq: 'CAM', side: 'center' },
      { x: 18, y: 24, role: 'LW', line: 'FW', posReq: 'LW', side: 'left' },
      { x: 50, y: 19, role: 'ST', line: 'FW', posReq: 'ST', side: 'center' },
      { x: 82, y: 24, role: 'RW', line: 'FW', posReq: 'RW', side: 'right' },
    ],
  },
  '4-3-3': {
    formation: '4-3-3',
    family: 'POSSESSION TRIANGLE',
    category: 'POSSESSION-FIRST',
    blurb:
      'Balanced back four with a single pivot and twin interiors supporting wide forwards who stretch the opposition back line.',
    nodes: [
      { x: 50, y: 89, role: 'GK', line: 'GK', posReq: 'GK', side: 'center' },
      { x: 14, y: 71, role: 'LB', line: 'DF', posReq: 'LB', side: 'left' },
      { x: 38, y: 74, role: 'LCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 62, y: 74, role: 'RCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 86, y: 71, role: 'RB', line: 'DF', posReq: 'RB', side: 'right' },
      { x: 50, y: 58, role: 'CDM', line: 'MF', posReq: 'CDM', side: 'center' },
      { x: 30, y: 46, role: 'LCM', line: 'MF', posReq: 'CM', side: 'left' },
      { x: 70, y: 46, role: 'RCM', line: 'MF', posReq: 'CM', side: 'right' },
      { x: 18, y: 24, role: 'LW', line: 'FW', posReq: 'LW', side: 'left' },
      { x: 50, y: 19, role: 'ST', line: 'FW', posReq: 'ST', side: 'center' },
      { x: 82, y: 24, role: 'RW', line: 'FW', posReq: 'RW', side: 'right' },
    ],
  },
  '4-4-2': {
    formation: '4-4-2',
    family: 'CLASSIC TWO BANKS',
    category: 'PRESSING-COMPACT',
    blurb:
      'Two compact horizontal banks of four preserve structural discipline out of possession while a strike partnership attacks the penalty area.',
    nodes: [
      { x: 50, y: 89, role: 'GK', line: 'GK', posReq: 'GK', side: 'center' },
      { x: 14, y: 71, role: 'LB', line: 'DF', posReq: 'LB', side: 'left' },
      { x: 38, y: 74, role: 'LCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 62, y: 74, role: 'RCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 86, y: 71, role: 'RB', line: 'DF', posReq: 'RB', side: 'right' },
      { x: 16, y: 46, role: 'LM', line: 'MF', posReq: 'LM', side: 'left' },
      { x: 38, y: 49, role: 'LCM', line: 'MF', posReq: 'CM', side: 'left' },
      { x: 62, y: 49, role: 'RCM', line: 'MF', posReq: 'CM', side: 'right' },
      { x: 84, y: 46, role: 'RM', line: 'MF', posReq: 'RM', side: 'right' },
      { x: 38, y: 23, role: 'ST', line: 'FW', posReq: 'ST', side: 'left' },
      { x: 62, y: 23, role: 'ST', line: 'FW', posReq: 'ST', side: 'right' },
    ],
  },
  '4-5-1': {
    formation: '4-5-1',
    family: 'MIDFIELD SATURATION',
    category: 'DEFENSIVE-SOLID',
    blurb:
      'A dense five-man midfield bank shields the back four, squeezes central passing lanes, and launches counters through a lone striker.',
    nodes: [
      { x: 50, y: 89, role: 'GK', line: 'GK', posReq: 'GK', side: 'center' },
      { x: 14, y: 71, role: 'LB', line: 'DF', posReq: 'LB', side: 'left' },
      { x: 38, y: 74, role: 'LCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 62, y: 74, role: 'RCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 86, y: 71, role: 'RB', line: 'DF', posReq: 'RB', side: 'right' },
      { x: 14, y: 46, role: 'LM', line: 'MF', posReq: 'LM', side: 'left' },
      { x: 33, y: 52, role: 'LCM', line: 'MF', posReq: 'CM', side: 'left' },
      { x: 50, y: 57, role: 'CDM', line: 'MF', posReq: 'CDM', side: 'center' },
      { x: 67, y: 52, role: 'RCM', line: 'MF', posReq: 'CM', side: 'right' },
      { x: 86, y: 46, role: 'RM', line: 'MF', posReq: 'RM', side: 'right' },
      { x: 50, y: 22, role: 'ST', line: 'FW', posReq: 'ST', side: 'center' },
    ],
  },
  '5-3-2': {
    formation: '5-3-2',
    family: 'COMPACT BACK FIVE',
    category: 'DEFENSIVE-SOLID',
    blurb:
      'Three central defenders flanked by disciplined wing-backs shut down central lanes and spring fast vertical counters through two strikers.',
    nodes: [
      { x: 50, y: 89, role: 'GK', line: 'GK', posReq: 'GK', side: 'center' },
      { x: 13, y: 69, role: 'LWB', line: 'DF', posReq: 'LWB', side: 'left' },
      { x: 32, y: 73, role: 'LCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 50, y: 75, role: 'CB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 68, y: 73, role: 'RCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 87, y: 69, role: 'RWB', line: 'DF', posReq: 'RWB', side: 'right' },
      { x: 29, y: 49, role: 'LCM', line: 'MF', posReq: 'CM', side: 'left' },
      { x: 50, y: 52, role: 'CDM', line: 'MF', posReq: 'CDM', side: 'center' },
      { x: 71, y: 49, role: 'RCM', line: 'MF', posReq: 'CM', side: 'right' },
      { x: 38, y: 23, role: 'ST', line: 'FW', posReq: 'ST', side: 'left' },
      { x: 62, y: 23, role: 'ST', line: 'FW', posReq: 'ST', side: 'right' },
    ],
  },
  '3-4-3': {
    formation: '3-4-3',
    family: 'WIDE OVERLOAD',
    category: 'WING-BACK',
    blurb:
      'Three center backs and a midfield box overload the flanks to isolate defenders 1v1 against an aggressive front three.',
    nodes: [
      { x: 50, y: 89, role: 'GK', line: 'GK', posReq: 'GK', side: 'center' },
      { x: 24, y: 72, role: 'LCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 50, y: 75, role: 'CB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 76, y: 72, role: 'RCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 15, y: 48, role: 'LM', line: 'MF', posReq: 'LM', side: 'left' },
      { x: 39, y: 52, role: 'LCM', line: 'MF', posReq: 'CM', side: 'left' },
      { x: 61, y: 52, role: 'RCM', line: 'MF', posReq: 'CM', side: 'right' },
      { x: 85, y: 48, role: 'RM', line: 'MF', posReq: 'RM', side: 'right' },
      { x: 18, y: 24, role: 'LW', line: 'FW', posReq: 'LW', side: 'left' },
      { x: 50, y: 20, role: 'ST', line: 'FW', posReq: 'ST', side: 'center' },
      { x: 82, y: 24, role: 'RW', line: 'FW', posReq: 'RW', side: 'right' },
    ],
  },
  '4-1-4-1': {
    formation: '4-1-4-1',
    family: 'SINGLE PIVOT BLOCK',
    category: 'DEFENSIVE-SOLID',
    blurb:
      'Defensive stability with a single holding midfielder protecting the back four while a flat four-man midfield supports a lone striker.',
    nodes: [
      { x: 50, y: 89, role: 'GK', line: 'GK', posReq: 'GK', side: 'center' },
      { x: 14, y: 71, role: 'LB', line: 'DF', posReq: 'LB', side: 'left' },
      { x: 38, y: 74, role: 'LCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 62, y: 74, role: 'RCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 86, y: 71, role: 'RB', line: 'DF', posReq: 'RB', side: 'right' },
      { x: 50, y: 58, role: 'CDM', line: 'MF', posReq: 'CDM', side: 'center' },
      { x: 16, y: 44, role: 'LM', line: 'MF', posReq: 'LM', side: 'left' },
      { x: 38, y: 47, role: 'LCM', line: 'MF', posReq: 'CM', side: 'left' },
      { x: 62, y: 47, role: 'RCM', line: 'MF', posReq: 'CM', side: 'right' },
      { x: 84, y: 44, role: 'RM', line: 'MF', posReq: 'RM', side: 'right' },
      { x: 50, y: 22, role: 'ST', line: 'FW', posReq: 'ST', side: 'center' },
    ],
  },
  '4-3-2-1': {
    formation: '4-3-2-1',
    family: 'CHRISTMAS TREE',
    category: 'POSSESSION-FIRST',
    blurb:
      'Narrow possession structure featuring three central midfielders and two attacking playmakers operating behind a lone striker.',
    nodes: [
      { x: 50, y: 89, role: 'GK', line: 'GK', posReq: 'GK', side: 'center' },
      { x: 14, y: 71, role: 'LB', line: 'DF', posReq: 'LB', side: 'left' },
      { x: 38, y: 74, role: 'LCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 62, y: 74, role: 'RCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 86, y: 71, role: 'RB', line: 'DF', posReq: 'RB', side: 'right' },
      { x: 30, y: 54, role: 'LCM', line: 'MF', posReq: 'CM', side: 'left' },
      { x: 50, y: 57, role: 'CDM', line: 'MF', posReq: 'CDM', side: 'center' },
      { x: 70, y: 54, role: 'RCM', line: 'MF', posReq: 'CM', side: 'right' },
      { x: 38, y: 36, role: 'LCAM', line: 'MF', posReq: 'CAM', side: 'left' },
      { x: 62, y: 36, role: 'RCAM', line: 'MF', posReq: 'CAM', side: 'right' },
      { x: 50, y: 20, role: 'ST', line: 'FW', posReq: 'ST', side: 'center' },
    ],
  },
  '3-4-2-1': {
    formation: '3-4-2-1',
    family: 'THREE CB ATTACK',
    category: 'HYBRID',
    blurb:
      'Three center backs with energetic wing-backs and two attacking midfielders supporting a central striker.',
    nodes: [
      { x: 50, y: 89, role: 'GK', line: 'GK', posReq: 'GK', side: 'center' },
      { x: 24, y: 71, role: 'LCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 50, y: 74, role: 'CB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 76, y: 71, role: 'RCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 15, y: 52, role: 'LM', line: 'MF', posReq: 'LM', side: 'left' },
      { x: 38, y: 55, role: 'LCM', line: 'MF', posReq: 'CM', side: 'left' },
      { x: 62, y: 55, role: 'RCM', line: 'MF', posReq: 'CM', side: 'right' },
      { x: 85, y: 52, role: 'RM', line: 'MF', posReq: 'RM', side: 'right' },
      { x: 38, y: 36, role: 'LCAM', line: 'MF', posReq: 'CAM', side: 'left' },
      { x: 62, y: 36, role: 'RCAM', line: 'MF', posReq: 'CAM', side: 'right' },
      { x: 50, y: 20, role: 'ST', line: 'FW', posReq: 'ST', side: 'center' },
    ],
  },
  '5-4-1': {
    formation: '5-4-1',
    family: 'LOW BLOCK DEFENSIVE',
    category: 'DEFENSIVE-SOLID',
    blurb:
      'Solid defensive structure with five defenders and four midfielders protecting the central corridor, leaving one forward for counter-attacks.',
    nodes: [
      { x: 50, y: 89, role: 'GK', line: 'GK', posReq: 'GK', side: 'center' },
      { x: 13, y: 70, role: 'LWB', line: 'DF', posReq: 'LWB', side: 'left' },
      { x: 32, y: 73, role: 'LCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 50, y: 75, role: 'CB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 68, y: 73, role: 'RCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 87, y: 70, role: 'RWB', line: 'DF', posReq: 'RWB', side: 'right' },
      { x: 18, y: 48, role: 'LM', line: 'MF', posReq: 'LM', side: 'left' },
      { x: 38, y: 51, role: 'LCM', line: 'MF', posReq: 'CM', side: 'left' },
      { x: 62, y: 51, role: 'RCM', line: 'MF', posReq: 'CM', side: 'right' },
      { x: 82, y: 48, role: 'RM', line: 'MF', posReq: 'RM', side: 'right' },
      { x: 50, y: 23, role: 'ST', line: 'FW', posReq: 'ST', side: 'center' },
    ],
  },
  '4-2-2-2': {
    formation: '4-2-2-2',
    family: 'VERTICAL BOX',
    category: 'PRESSING-COMPACT',
    blurb:
      'Balanced back four supported by two holding midfielders, two narrow attacking playmakers, and a strike partnership.',
    nodes: [
      { x: 50, y: 89, role: 'GK', line: 'GK', posReq: 'GK', side: 'center' },
      { x: 14, y: 71, role: 'LB', line: 'DF', posReq: 'LB', side: 'left' },
      { x: 38, y: 74, role: 'LCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 62, y: 74, role: 'RCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 86, y: 71, role: 'RB', line: 'DF', posReq: 'RB', side: 'right' },
      { x: 36, y: 56, role: 'LDM', line: 'MF', posReq: 'CDM', side: 'left' },
      { x: 64, y: 56, role: 'RDM', line: 'MF', posReq: 'CDM', side: 'right' },
      { x: 32, y: 38, role: 'LCAM', line: 'MF', posReq: 'CAM', side: 'left' },
      { x: 68, y: 38, role: 'RCAM', line: 'MF', posReq: 'CAM', side: 'right' },
      { x: 38, y: 22, role: 'ST', line: 'FW', posReq: 'ST', side: 'left' },
      { x: 62, y: 22, role: 'ST', line: 'FW', posReq: 'ST', side: 'right' },
    ],
  },
  '4-3-1-2': {
    formation: '4-3-1-2',
    family: 'DIAMOND MIDFIELD',
    category: 'POSSESSION-FIRST',
    blurb:
      'Three central midfielders and a number ten operating behind two strikers, creating narrow central overloads.',
    nodes: [
      { x: 50, y: 89, role: 'GK', line: 'GK', posReq: 'GK', side: 'center' },
      { x: 14, y: 71, role: 'LB', line: 'DF', posReq: 'LB', side: 'left' },
      { x: 38, y: 74, role: 'LCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 62, y: 74, role: 'RCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 86, y: 71, role: 'RB', line: 'DF', posReq: 'RB', side: 'right' },
      { x: 30, y: 54, role: 'LCM', line: 'MF', posReq: 'CM', side: 'left' },
      { x: 50, y: 58, role: 'CDM', line: 'MF', posReq: 'CDM', side: 'center' },
      { x: 70, y: 54, role: 'RCM', line: 'MF', posReq: 'CM', side: 'right' },
      { x: 50, y: 38, role: 'CAM', line: 'MF', posReq: 'CAM', side: 'center' },
      { x: 38, y: 22, role: 'ST', line: 'FW', posReq: 'ST', side: 'left' },
      { x: 62, y: 22, role: 'ST', line: 'FW', posReq: 'ST', side: 'right' },
    ],
  },
  '4-1-2-1-2': {
    formation: '4-1-2-1-2',
    family: 'WIDE DIAMOND',
    category: 'HYBRID',
    blurb:
      'An anchor shields the defence while wide shuttlers feed a central playmaker and twin strikers in vertical transitions.',
    nodes: [
      { x: 50, y: 89, role: 'GK', line: 'GK', posReq: 'GK', side: 'center' },
      { x: 14, y: 71, role: 'LB', line: 'DF', posReq: 'LB', side: 'left' },
      { x: 38, y: 74, role: 'LCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 62, y: 74, role: 'RCB', line: 'DF', posReq: 'CB', side: 'center' },
      { x: 86, y: 71, role: 'RB', line: 'DF', posReq: 'RB', side: 'right' },
      { x: 50, y: 60, role: 'CDM', line: 'MF', posReq: 'CDM', side: 'center' },
      { x: 20, y: 48, role: 'LM', line: 'MF', posReq: 'LM', side: 'left' },
      { x: 80, y: 48, role: 'RM', line: 'MF', posReq: 'RM', side: 'right' },
      { x: 50, y: 37, role: 'CAM', line: 'MF', posReq: 'CAM', side: 'center' },
      { x: 38, y: 21, role: 'ST', line: 'FW', posReq: 'ST', side: 'left' },
      { x: 62, y: 21, role: 'ST', line: 'FW', posReq: 'ST', side: 'right' },
    ],
  },
};

export function getFormationBlueprint(formation: string): FormationBlueprint {
  const key = (formation || '4-3-3').trim().toLowerCase();
  for (const [k, tpl] of Object.entries(FORMATION_TEMPLATES)) {
    if (key.startsWith(k)) return tpl;
  }
  return FORMATION_TEMPLATES['4-3-3'];
}

export const AVAILABLE_FORMATIONS = Object.keys(FORMATION_TEMPLATES);

// ============================================================================
// STRICT POSITIONAL ACCURACY & OPTIMAL LINEUP SELECTION ALGORITHM
// ============================================================================

export function normalizePositionDetail(
  positionDetail?: string,
  positionCategory?: Player['position']
): string {
  const d = (positionDetail || '').toUpperCase().trim();
  if (d === 'LCB' || d === 'RCB') return 'CB';
  if (d === 'LDM' || d === 'RDM') return 'CDM';
  if (d === 'LCM' || d === 'RCM') return 'CM';
  if (d === 'LCAM' || d === 'RCAM') return 'CAM';
  if (d === 'LS' || d === 'RS') return 'ST';
  if (d) return d;

  if (positionCategory === 'GK') return 'GK';
  if (positionCategory === 'DEF') return 'CB';
  if (positionCategory === 'MID') return 'CM';
  if (positionCategory === 'ATT') return 'ST';
  return '';
}

/**
 * Computes the strict compatibility score of a player for a specific formation pitch node.
 * Returns -1 when the player is NOT suitable for that position (unrelated role or wrong flank),
 * so players are NEVER placed in unrelated positions just to fill the lineup.
 *
 * Hierarchy:
 * - GK slot: strictly GK only (100000 + ovr)
 * - Exact natural position match: 50000 + ovr
 * - Same-role adjacent (ST<->CF, LB<->LWB, RB<->RWB, LW<->LM, RW<->RM): 42000-46000 + ovr
 * - Suitable tactical substitute (e.g. CDM->CB, CM<->CDM/CAM, LM/RM->LWB/RWB/LB/RB, CAM->ST): 22000-38000 + ovr
 * - Unrelated / wrong flank / wrong line: -1 (disallowed)
 */
export function getPositionalCompatibilityScore(player: Player, node: PitchNode): number {
  const p = normalizePositionDetail(player.positionDetail, player.position);
  const pLine = player.position;
  const req = node.posReq.toUpperCase().trim();
  const ovr = player.overallRating;

  // 1. Goalkeepers are strictly restricted to GK slot; outfielders never play GK
  if (req === 'GK') {
    return p === 'GK' || pLine === 'GK' ? 100000 + ovr : -1;
  }
  if (p === 'GK' || pLine === 'GK') {
    return -1;
  }

  // 2. Exact match on registered position
  if (p === req) {
    return 50000 + ovr;
  }

  // 3. Strict position & flank compatibility matrix
  switch (req) {
    case 'CB':
      // Central defense: natural CB (handled above) or holding CDM cover only
      if (p === 'CDM') return 26000 + ovr;
      return -1;

    case 'LB':
      // Left fullback: LWB or left-flank LM cover only (never CB or right-flank)
      if (p === 'LWB') return 44000 + ovr;
      if (p === 'LM') return 24000 + ovr;
      return -1;

    case 'LWB':
      // Left wing-back: LB or LM only (stays strictly left)
      if (p === 'LB') return 44000 + ovr;
      if (p === 'LM') return 38000 + ovr;
      return -1;

    case 'RB':
      // Right fullback: RWB or right-flank RM cover only (never CB or left-flank)
      if (p === 'RWB') return 44000 + ovr;
      if (p === 'RM') return 24000 + ovr;
      return -1;

    case 'RWB':
      // Right wing-back: RB or RM only (stays strictly right)
      if (p === 'RB') return 44000 + ovr;
      if (p === 'RM') return 38000 + ovr;
      return -1;

    case 'CDM':
      // Holding midfield: CM cover or ball-playing CB cover if no natural CDM/CM
      if (p === 'CM') return 36000 + ovr;
      if (p === 'CB') return 22000 + ovr;
      return -1;

    case 'CM':
      // Central midfield: CDM or CAM (strictly central midfielders)
      if (p === 'CDM' || p === 'CAM') return 36000 + ovr;
      return -1;

    case 'CAM':
      // Attacking midfield: CM or CF
      if (p === 'CM') return 36000 + ovr;
      if (p === 'CF') return 34000 + ovr;
      return -1;

    case 'LM':
      // Left wide midfield: LW, LWB, or LB pushing up (stays strictly left)
      if (p === 'LW') return 42000 + ovr;
      if (p === 'LWB') return 38000 + ovr;
      if (p === 'LB') return 24000 + ovr;
      return -1;

    case 'RM':
      // Right wide midfield: RW, RWB, or RB pushing up (stays strictly right)
      if (p === 'RW') return 42000 + ovr;
      if (p === 'RWB') return 38000 + ovr;
      if (p === 'RB') return 24000 + ovr;
      return -1;

    case 'LW':
      // Left winger: LM on the left wing only (never ST or right-flank)
      if (p === 'LM') return 42000 + ovr;
      return -1;

    case 'RW':
      // Right winger: RM on the right wing only (never ST or left-flank)
      if (p === 'RM') return 42000 + ovr;
      return -1;

    case 'ST':
      // Central striker: CF or false-9 CAM cover only (never wingers/defenders)
      if (p === 'CF') return 46000 + ovr;
      if (p === 'CAM') return 22000 + ovr;
      return -1;

    case 'CF':
      // Centre forward: ST or CAM
      if (p === 'ST') return 46000 + ovr;
      if (p === 'CAM') return 34000 + ovr;
      return -1;

    default:
      return -1;
  }
}

interface OptimalAssignmentResult {
  assignments: Array<{ node: PitchNode; player?: Player; score: number }>;
  filledCount: number;
  exactCount: number;
  substituteCount: number;
  totalScore: number;
  totalOvr: number;
}

/**
 * Exact maximum-weight bipartite matching (Hungarian algorithm with vacant dummy options).
 * Finds the globally optimal 1-to-1 assignment of players to formation pitch nodes,
 * completely immune to greedy slot-ordering bugs and cross-flank swaps.
 * Any slot without a positionally suitable player remains cleanly unfilled (player: undefined).
 */
const POS_REQ_LIST = [
  'GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF',
] as const;
const POS_REQ_INDEX = new Map<string, number>(POS_REQ_LIST.map((r, idx) => [r, idx]));
const FORMATION_ENTRIES = Object.entries(FORMATION_TEMPLATES);

function prepareSortedCandidates(players: Player[]): {
  candidates: Player[];
  normDetails: string[];
} {
  const sortedAll = [...players].sort(
    (a, b) => b.overallRating - a.overallRating || a.id.localeCompare(b.id)
  );

  if (sortedAll.length <= 16) {
    return {
      candidates: sortedAll,
      normDetails: sortedAll.map((pl) => normalizePositionDetail(pl.positionDetail, pl.position)),
    };
  }

  const candidates: Player[] = [];
  const normDetails: string[] = [];
  const counts = new Map<string, number>();
  for (let i = 0; i < sortedAll.length; i++) {
    const pl = sortedAll[i];
    const norm = normalizePositionDetail(pl.positionDetail, pl.position);
    const key = `${pl.position}|${norm}`;
    const c = counts.get(key) || 0;
    const maxForRole = norm === 'GK' ? 2 : 4;
    if (c < maxForRole) {
      counts.set(key, c + 1);
      candidates.push(pl);
      normDetails.push(norm);
    }
  }
  return { candidates, normDetails };
}

function scoreNormalizedRole(
  p: string,
  pLine: Player['position'],
  ovr: number,
  req: string
): number {
  if (req === 'GK') {
    return p === 'GK' || pLine === 'GK' ? 100000 + ovr : -1;
  }
  if (p === 'GK' || pLine === 'GK') return -1;
  if (p === req) return 50000 + ovr;

  switch (req) {
    case 'CB':
      return p === 'CDM' ? 26000 + ovr : -1;
    case 'LB':
      if (p === 'LWB') return 44000 + ovr;
      if (p === 'LM') return 24000 + ovr;
      return -1;
    case 'LWB':
      if (p === 'LB') return 44000 + ovr;
      if (p === 'LM') return 38000 + ovr;
      return -1;
    case 'RB':
      if (p === 'RWB') return 44000 + ovr;
      if (p === 'RM') return 24000 + ovr;
      return -1;
    case 'RWB':
      if (p === 'RB') return 44000 + ovr;
      if (p === 'RM') return 38000 + ovr;
      return -1;
    case 'CDM':
      if (p === 'CM') return 36000 + ovr;
      if (p === 'CB') return 22000 + ovr;
      return -1;
    case 'CM':
      return p === 'CDM' || p === 'CAM' ? 36000 + ovr : -1;
    case 'CAM':
      if (p === 'CM') return 36000 + ovr;
      if (p === 'CF') return 34000 + ovr;
      return -1;
    case 'LM':
      if (p === 'LW') return 42000 + ovr;
      if (p === 'LWB') return 38000 + ovr;
      if (p === 'LB') return 24000 + ovr;
      return -1;
    case 'RM':
      if (p === 'RW') return 42000 + ovr;
      if (p === 'RWB') return 38000 + ovr;
      if (p === 'RB') return 24000 + ovr;
      return -1;
    case 'LW':
      return p === 'LM' ? 42000 + ovr : -1;
    case 'RW':
      return p === 'RM' ? 42000 + ovr : -1;
    case 'ST':
      if (p === 'CF') return 46000 + ovr;
      if (p === 'CAM') return 22000 + ovr;
      return -1;
    case 'CF':
      if (p === 'ST') return 46000 + ovr;
      if (p === 'CAM') return 34000 + ovr;
      return -1;
    default:
      return -1;
  }
}

function runHungarianWithPrepared(
  candidates: Player[],
  nodes: PitchNode[],
  nodeScores: Int32Array[]
): OptimalAssignmentResult {
  const nSlots = nodes.length;
  const nReal = candidates.length;
  const nCols = nReal + nSlots;
  const BIG = 1e9;
  const DISALLOWED = BIG * 100;

  const u = new Float64Array(nSlots + 1);
  const v = new Float64Array(nCols + 1);
  const p = new Int32Array(nCols + 1);
  const way = new Int32Array(nCols + 1);
  const minv = new Float64Array(nCols + 1);
  const used = new Uint8Array(nCols + 1);

  for (let i = 1; i <= nSlots; i++) {
    p[0] = i;
    let j0 = 0;
    minv.fill(Infinity);
    used.fill(0);

    do {
      used[j0] = 1;
      const i0 = p[j0];
      const rowScores = nodeScores[i0 - 1];
      const u_i0 = u[i0];
      let delta = Infinity;
      let j1 = 0;

      for (let j = 1; j <= nReal; j++) {
        if (!used[j]) {
          const sc = rowScores[j - 1];
          const cost = sc < 0 ? DISALLOWED : BIG - sc;
          const cur = cost - u_i0 - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }
      for (let j = nReal + 1; j <= nCols; j++) {
        if (!used[j]) {
          const cur = BIG - u_i0 - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= nCols; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }

      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const slotToPlayerIdx = new Int32Array(nSlots).fill(-1);
  for (let j = 1; j <= nReal; j++) {
    if (p[j] !== 0) {
      const i = p[j] - 1;
      if (nodeScores[i][j - 1] > 0) {
        slotToPlayerIdx[i] = j - 1;
      }
    }
  }

  let filledCount = 0;
  let exactCount = 0;
  let substituteCount = 0;
  let totalScore = 0;
  let totalOvr = 0;

  const assignments = nodes.map((node, i) => {
    const pIdx = slotToPlayerIdx[i];
    if (pIdx < 0) {
      return { node, player: undefined, score: -1 };
    }
    const player = candidates[pIdx];
    const score = nodeScores[i][pIdx];
    filledCount++;
    totalScore += score;
    totalOvr += player.overallRating;
    if (score >= 50000) {
      exactCount++;
    } else {
      substituteCount++;
    }
    return { node, player, score };
  });

  return { assignments, filledCount, exactCount, substituteCount, totalScore, totalOvr };
}

function solveOptimalFormationAssignment(
  players: Player[],
  nodes: PitchNode[]
): OptimalAssignmentResult {
  if (!players || players.length === 0) {
    return {
      assignments: nodes.map((node) => ({ node, player: undefined, score: -1 })),
      filledCount: 0,
      exactCount: 0,
      substituteCount: 0,
      totalScore: 0,
      totalOvr: 0,
    };
  }

  const { candidates, normDetails } = prepareSortedCandidates(players);
  const nReal = candidates.length;
  const nodeScores = nodes.map((node) => {
    const req = node.posReq.toUpperCase().trim();
    const row = new Int32Array(nReal);
    for (let j = 0; j < nReal; j++) {
      row[j] = scoreNormalizedRole(normDetails[j], candidates[j].position, candidates[j].overallRating, req);
    }
    return row;
  });

  return runHungarianWithPrepared(candidates, nodes, nodeScores);
}

/**
 * Selects both the best-fitting formation AND its optimal Starting XI in a single pass,
 * avoiding a duplicate solve after formation selection.
 */
export function selectBestFormationAndXiForSquad(squad: Player[]): {
  formation: string;
  xiPlayers: Player[];
} {
  if (!squad || squad.length === 0) {
    return { formation: '4-3-3', xiPlayers: [] };
  }

  const { candidates, normDetails } = prepareSortedCandidates(squad);
  const nReal = candidates.length;

  // Precompute score row once for each unique posReq instead of 13 * 11 times
  const roleScores: Int32Array[] = POS_REQ_LIST.map((req) => {
    const row = new Int32Array(nReal);
    for (let j = 0; j < nReal; j++) {
      row[j] = scoreNormalizedRole(normDetails[j], candidates[j].position, candidates[j].overallRating, req);
    }
    return row;
  });

  let bestFormation = '4-3-3';
  let bestResult: OptimalAssignmentResult | null = null;

  for (let fIdx = 0; fIdx < FORMATION_ENTRIES.length; fIdx++) {
    const [formation, blueprint] = FORMATION_ENTRIES[fIdx];
    const nodes = blueprint.nodes;
    const nodeScores = nodes.map((node) => {
      const idx = POS_REQ_INDEX.get(node.posReq) ?? -1;
      if (idx >= 0) return roleScores[idx];
      const req = node.posReq.toUpperCase().trim();
      const row = new Int32Array(nReal);
      for (let j = 0; j < nReal; j++) {
        row[j] = scoreNormalizedRole(normDetails[j], candidates[j].position, candidates[j].overallRating, req);
      }
      return row;
    });

    // Quick upper-bound check: count nodes that have at least 1 compatible player
    if (bestResult) {
      let fillableSlots = 0;
      for (let i = 0; i < nodeScores.length; i++) {
        const r = nodeScores[i];
        for (let j = 0; j < nReal; j++) {
          if (r[j] > 0) {
            fillableSlots++;
            break;
          }
        }
      }
      if (fillableSlots < bestResult.filledCount) {
        continue;
      }
    }

    const result = runHungarianWithPrepared(candidates, nodes, nodeScores);
    if (!bestResult) {
      bestFormation = formation;
      bestResult = result;
      continue;
    }

    if (result.filledCount !== bestResult.filledCount) {
      if (result.filledCount > bestResult.filledCount) {
        bestFormation = formation;
        bestResult = result;
      }
      continue;
    }

    if (result.totalScore !== bestResult.totalScore) {
      if (result.totalScore > bestResult.totalScore) {
        bestFormation = formation;
        bestResult = result;
      }
      continue;
    }

    if (result.totalOvr > bestResult.totalOvr) {
      bestFormation = formation;
      bestResult = result;
    }
  }

  const xiPlayers = (bestResult?.assignments || [])
    .map((a) => a.player)
    .filter((p): p is Player => Boolean(p));

  return { formation: bestFormation, xiPlayers };
}

/**
 * Selects the best-fitting formation for a squad based on registered player positions
 * and squad quality. Prioritizes formations that fill the most slots with exact natural fits
 * before breaking ties with overall squad strength.
 */
export function selectBestFormationForSquad(squad: Player[]): string {
  return selectBestFormationAndXiForSquad(squad).formation;
}

/**
 * Intelligent automatic Starting XI generator with strict positional accuracy.
 * Uses global optimal matching so:
 * 1. Only GKs play GK, and GKs never play outfield
 * 2. CBs stay centrally (LCB, CB, RCB)
 * 3. LB/LWB/LM/LW stay strictly on the left flank; RB/RWB/RM/RW stay strictly on the right flank
 * 4. ST/CF stay central up front
 * 5. Unrelated players are NEVER forced into incompatible slots
 */
export function generateStrictStartingXi(squad: Player[], formation: string): Player[] {
  if (!squad || squad.length === 0) return [];
  const blueprint = getFormationBlueprint(formation);
  const result = solveOptimalFormationAssignment(squad, blueprint.nodes);
  return result.assignments
    .map((a) => a.player)
    .filter((p): p is Player => Boolean(p));
}

/**
 * Assigns an array of players (e.g. starters or draft players) to the 11 formation pitch nodes
 * strictly respecting positional suitability and physical pitch placement.
 * Slots without a suitable candidate stay unassigned (player: undefined).
 */
export function assignPlayersToFormation(
  players: Player[],
  formation: string
): Array<{ node: PitchNode; player?: Player }> {
  const blueprint = getFormationBlueprint(formation);
  const result = solveOptimalFormationAssignment(players, blueprint.nodes);
  return result.assignments.map(({ node, player }) => ({ node, player }));
}

/**
 * Validates Starting XI against strict positional rules across every formation.
 */
export function validateStartingXi(
  assignments: Array<{ node: PitchNode; player?: Player }>
): {
  isValid: boolean;
  isPositionalAccurate: boolean;
  errors: string[];
  warnings: string[];
  filledCount: number;
  vacantCount: number;
  exactCount: number;
  substituteCount: number;
  lineCounts: { GK: number; DF: number; MF: number; FW: number };
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const assignedPlayers = assignments.map((a) => a.player).filter(Boolean) as Player[];
  const filledCount = assignedPlayers.length;
  const vacantCount = Math.max(0, assignments.length - filledCount);
  let exactCount = 0;
  let substituteCount = 0;

  // 1. Unique player check
  const uniqueIds = new Set(assignedPlayers.map((p) => p.id));
  if (uniqueIds.size !== assignedPlayers.length) {
    errors.push('Duplicate player found in Starting XI.');
  }

  // 2. Line counts
  const lineCounts = { GK: 0, DF: 0, MF: 0, FW: 0 };
  for (const a of assignments) {
    if (a.player) {
      lineCounts[a.node.line]++;
    }
  }

  if (lineCounts.GK === 0) {
    errors.push('No goalkeeper available for GK slot.');
  } else if (lineCounts.GK > 1) {
    errors.push(`Must have only 1 goalkeeper (found ${lineCounts.GK}).`);
  }

  // 3. Per-slot positional accuracy verification
  for (const { node, player } of assignments) {
    if (!player) continue;
    const pDetail = normalizePositionDetail(player.positionDetail, player.position);
    const score = getPositionalCompatibilityScore(player, node);

    if (score < 0) {
      errors.push(`${player.name} (${pDetail || player.position}) cannot play ${node.role}.`);
      continue;
    }

    if (score >= 50000) {
      exactCount++;
    } else {
      substituteCount++;
      warnings.push(`${player.shortName} (${pDetail}) covering ${node.role}`);
    }

    if (node.posReq === 'CB' && (node.x < 20 || node.x > 80)) {
      errors.push(`Centre-back slot at x=${node.x}% is not centrally positioned.`);
    }
    if ((node.posReq === 'LB' || node.posReq === 'LWB' || node.posReq === 'LM' || node.posReq === 'LW') && node.x > 40) {
      errors.push(`Left-flank role ${node.role} must stay on the left flank.`);
    }
    if ((node.posReq === 'RB' || node.posReq === 'RWB' || node.posReq === 'RM' || node.posReq === 'RW') && node.x < 60) {
      errors.push(`Right-flank role ${node.role} must stay on the right flank.`);
    }
    if ((node.posReq === 'ST' || node.posReq === 'CF') && node.y > 35) {
      errors.push(`Striker ${player.name} must occupy forward line.`);
    }
  }

  if (vacantCount > 0 && errors.length === 0) {
    errors.push(`${vacantCount} ${vacantCount === 1 ? 'position' : 'positions'} left vacant (no suitable cover).`);
  }

  const isPositionalAccurate =
    uniqueIds.size === assignedPlayers.length &&
    assignedPlayers.every((p, idx) => {
      const assignment = assignments.find((a) => a.player?.id === p.id);
      if (!assignment) return idx >= 0;
      return getPositionalCompatibilityScore(p, assignment.node) >= 0;
    });

  return {
    isValid: errors.length === 0 && filledCount === assignments.length,
    isPositionalAccurate,
    errors,
    warnings,
    filledCount,
    vacantCount,
    exactCount,
    substituteCount,
    lineCounts,
  };
}

/**
 * Returns the Starting XI players for a team.
 * If user-set preferred XI exists, returns those squad players cleanly.
 * Otherwise, ensures optimal positional selection matching the team's formation.
 */
export function getStartingXiPlayers(team: Team): Player[] {
  if (team.preferredXiIds && team.preferredXiIds.length > 0) {
    const mapped = team.preferredXiIds
      .map((id) => team.squad.find((p) => p.id === id))
      .filter(Boolean) as Player[];

    if (mapped.length > 0) {
      if (team.preferredXiSource === 'user-set') {
        return mapped;
      }
      const assigned = assignPlayersToFormation(mapped, team.defaultFormation);
      const ordered = assigned.map((a) => a.player).filter(Boolean) as Player[];
      if (ordered.length === mapped.length) {
        return ordered;
      }
    }
  }

  return generateStrictStartingXi(team.squad, team.defaultFormation);
}

export function getTacticalIdentityData(team: Team) {
  const tp = team.tacticalProfile;
  const dataStatus = tp?.dataStatus || 'estimated';
  const styleLabel = tp?.playingStyle || team.playingStyle || 'Balanced Control';
  const blueprint = getFormationBlueprint(team.defaultFormation);
  const pressing = tp?.pressingIntensity ?? 74;
  const buildUp = tp?.buildUpSpeed ?? 70;
  const defLine = tp?.defensiveLine ?? 68;
  const widthVal = tp?.width ?? 70;

  const summary =
    tp?.summary ||
    `${team.name} build in a structured ${team.defaultFormation} framework rooted in ${styleLabel.toLowerCase()}, balancing compact central spacing with purposeful forward progression into the final third.`;

  const notes =
    tp?.notes ||
    `Width comes from wide runners and staggered midfield support, creating clean passing triangles between lines. The space behind advancing wide players is managed by the holding unit.`;

  const setPieces =
    tp?.setPieces ||
    `Inswinging deliveries aimed toward primary aerial targets, with a deep midfielder stationed outside the box for second balls.`;

  const mentalitySettings: TacticalMentalitySettings = tp?.mentalitySettings || {
    mentality: pressing >= 80 ? 'Positive' : pressing >= 65 ? 'Balanced' : 'Disciplined',
    buildUp: buildUp >= 78 ? 'Direct passing' : buildUp >= 60 ? 'Mixed progression' : 'Short & patient',
    tempo: buildUp >= 75 ? 'Fast' : 'Standard',
    attackingWidth: widthVal >= 72 ? 'Wide' : widthVal >= 58 ? 'Balanced' : 'Narrow',
    chanceCreation: widthVal >= 72 ? 'Crosses & half-spaces' : 'Through balls',
    passingRisk: buildUp >= 76 ? 'Ambitious' : 'Measured',
    crossing: widthVal >= 70 ? 'High crosses' : 'Low driven',
    creativeFreedom: team.overallRating >= 85 ? 'Expressive' : 'Structured',
    defensiveLine: defLine >= 75 ? 'High' : defLine >= 58 ? 'Balanced' : 'Deep block',
    pressingIntensityLabel: pressing >= 80 ? 'High' : pressing >= 62 ? 'Medium' : 'Low',
    pressingTrigger: pressing >= 78 ? 'Heavy touch / wide trap' : 'Balanced',
    defensiveWidth: widthVal >= 72 ? 'Wide' : 'Compact',
    marking: pressing >= 75 ? 'Tight zonal' : 'Zonal',
    tackling: 'Normal',
    attackingTransition: buildUp >= 76 ? 'Counter-attack quickly' : 'Retain possession',
    overlappingFullBacks: widthVal >= 68 ? 'Frequent' : 'Balanced',
    underlappingRuns: pressing >= 74 ? 'Selective' : 'Disabled',
  };

  const alternativeFormations = tp?.alternativeFormations || [
    { formation: '4-2-3-1', family: 'DOUBLE PIVOT' },
    { formation: '3-5-2', family: 'WING-BACK' },
    { formation: '4-3-3', family: 'POSSESSION TRIANGLE' },
  ].filter((f) => f.formation !== team.defaultFormation);

  return {
    dataStatus,
    styleLabel,
    blueprint,
    summary,
    notes,
    setPieces,
    mentalitySettings,
    alternativeFormations,
  };
}

export function getGkDerivedStats(player: Player) {
  if (player.gkAttributes) return player.gkAttributes;
  const ovr = player.overallRating;
  return {
    diving: Math.min(99, Math.max(55, ovr + 1)),
    handling: Math.min(99, Math.max(55, ovr - 1)),
    kicking: player.attributes.passing || Math.max(55, ovr - 2),
    reflexes: Math.min(99, Math.max(55, ovr + 2)),
    speed: player.attributes.pace || Math.max(40, ovr - 12),
    positioning: Math.min(99, Math.max(55, ovr)),
  };
}

export function resolveLeadership(team: Team) {
  const capPlayer =
    team.squad.find((p) => p.id === team.captainId) ||
    team.squad.find((p) => p.isCaptain) ||
    (team.captainName
      ? team.squad.find((p) => p.name.toLowerCase() === team.captainName?.toLowerCase())
      : undefined);

  const vcPlayer =
    team.squad.find((p) => p.id === team.viceCaptainId) ||
    team.squad.find((p) => p.isViceCaptain && p.id !== capPlayer?.id);

  return {
    captain: capPlayer
      ? {
          player: capPlayer,
          name: getPlayerDisplayName(capPlayer),
          since: team.captainSince || capPlayer.captainSince || '2024-08-01',
        }
      : team.captainName
      ? {
          player: undefined,
          name: team.captainName,
          since: team.captainSince || '2024-08-01',
        }
      : null,
    viceCaptain: vcPlayer
      ? {
          player: vcPlayer,
          name: getPlayerDisplayName(vcPlayer),
          since: team.viceCaptainSince || vcPlayer.viceCaptainSince || '2024-08-01',
        }
      : team.viceCaptainName
      ? {
          player: undefined,
          name: team.viceCaptainName,
          since: team.viceCaptainSince || '2024-08-01',
        }
      : null,
  };
}
