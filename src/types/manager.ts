export type ManagerStatus = 'active' | 'unattached' | 'retired';

export type ManagerAppointmentRole = 'head-coach' | 'interim' | 'caretaker' | 'assistant';

export interface ManagerPhilosophyCategory {
  summary: string;
  intensity?: number; // 0 - 100
  keyPrinciples?: string[];
}

export interface ManagerPhilosophy {
  possession_passing: string;
  pressing: string;
  defensive_structure: string;
  attacking_approach: string;
  tactical_flexibility: string;
  possession_index?: number;
  pressing_index?: number;
  defensive_line_index?: number;
  attacking_boldness_index?: number;
  flexibility_index?: number;
}

export interface Manager {
  id: string;
  name: string;
  nationality: string;
  date_of_birth: string;
  age?: number | null;
  photo: string;
  preferred_formation: string;
  tactical_style: string;
  philosophy_json: string;
  playing_background: string;
  bio: string;
  honours: string[];
  status: ManagerStatus;
  verified: boolean;
  creatorId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ManagerAppointment {
  id: string;
  manager_id: string;
  manager_name: string;
  team_id: string;
  team_name: string;
  team_type: 'club' | 'country';
  role: ManagerAppointmentRole;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  competitions: string[];
  honours: string[];
  notes: string;
  verified: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ManagerTeamSummary {
  id: string;
  name: string;
  shortName: string;
  code: string;
  team_type: 'club' | 'country';
  country: string;
  flag?: string;
  league?: string;
  confederation?: string;
  crestUrl: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface EnrichedManagerRecord extends Manager {
  currentAppointments: ManagerAppointment[];
  clubAppointment: ManagerAppointment | null;
  nationalAppointment: ManagerAppointment | null;
  appointments: ManagerAppointment[];
  primaryTeam: ManagerTeamSummary | null;
  nationalTeam: ManagerTeamSummary | null;
  managingClubs: boolean;
  managingNationalTeam: boolean;
}

export interface ManagerAppointmentStatistics {
  appointmentId: string;
  managerId: string;
  teamId: string;
  teamName: string;
  teamCrestUrl?: string;
  teamPrimaryColor?: string;
  teamFlag?: string;
  teamType: 'club' | 'country';
  role: ManagerAppointmentRole;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  matchesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  winPercentage: number;
  goalsScored: number;
  goalsConceded: number;
  trophiesWon: number;
  honours: string[];
}

export interface ManagerStatisticsResponse {
  managerId: string;
  managerName: string;
  careerTotals: {
    matchesPlayed: number;
    wins: number;
    draws: number;
    losses: number;
    winPercentage: number;
    goalsScored: number;
    goalsConceded: number;
    trophiesWon: number;
  };
  appointments: ManagerAppointmentStatistics[];
}

export function createEmptyPhilosophy(): ManagerPhilosophy {
  return {
    possession_passing: '',
    pressing: '',
    defensive_structure: '',
    attacking_approach: '',
    tactical_flexibility: '',
    possession_index: 55,
    pressing_index: 55,
    defensive_line_index: 55,
    attacking_boldness_index: 55,
    flexibility_index: 55,
  };
}

export function parsePhilosophyJson(raw: string | Partial<ManagerPhilosophy> | null | undefined): ManagerPhilosophy {
  const base = createEmptyPhilosophy();
  if (!raw) return base;

  let obj: Record<string, any> | null = null;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return base;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        obj = parsed as Record<string, any>;
      } else {
        return { ...base, attacking_approach: trimmed };
      }
    } catch {
      return { ...base, attacking_approach: trimmed };
    }
  } else if (typeof raw === 'object') {
    obj = raw as Record<string, any>;
  }

  if (!obj) return base;

  const pickText = (keys: string[]): string => {
    for (const k of keys) {
      const val = obj?.[k];
      if (typeof val === 'string' && val.trim()) return val.trim();
      if (val && typeof val === 'object' && typeof val.summary === 'string' && val.summary.trim()) {
        return val.summary.trim();
      }
    }
    return '';
  };

  const clampScore = (val: unknown, fallback: number): number => {
    const n = Number(val);
    return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
  };

  return {
    possession_passing: pickText([
      'possession_passing',
      'possessionAndPassing',
      'Possession & Passing',
      'possession',
    ]),
    pressing: pickText(['pressing', 'Pressing']),
    defensive_structure: pickText([
      'defensive_structure',
      'defensiveStructure',
      'Defensive Structure',
      'defense',
    ]),
    attacking_approach: pickText([
      'attacking_approach',
      'attackingApproach',
      'Attacking Approach',
      'attack',
    ]),
    tactical_flexibility: pickText([
      'tactical_flexibility',
      'tacticalFlexibility',
      'Tactical Flexibility',
      'flexibility',
    ]),
    possession_index: clampScore(obj.possession_index ?? obj.possessionIndex, 55),
    pressing_index: clampScore(obj.pressing_index ?? obj.pressingIndex, 55),
    defensive_line_index: clampScore(obj.defensive_line_index ?? obj.defensiveLineIndex, 55),
    attacking_boldness_index: clampScore(
      obj.attacking_boldness_index ?? obj.attackingBoldnessIndex,
      55
    ),
    flexibility_index: clampScore(obj.flexibility_index ?? obj.flexibilityIndex, 55),
  };
}

export function serializePhilosophyJson(input: Partial<ManagerPhilosophy>): string {
  const normalized = parsePhilosophyJson(input);
  return JSON.stringify(normalized);
}

export function formatManagerRoleLabel(role?: string | null): string {
  switch (role) {
    case 'head-coach':
      return 'Head Coach';
    case 'interim':
      return 'Interim';
    case 'caretaker':
      return 'Caretaker';
    case 'assistant':
      return 'Assistant';
    default:
      return role && role.trim() ? role : 'Head Coach';
  }
}

export function calculateAgeFromDob(dob?: string | null, referenceDate = new Date()): number | null {
  if (!dob || !dob.trim()) return null;
  const trimmed = dob.trim();
  const refYear = referenceDate.getFullYear();
  const refMonth = referenceDate.getMonth() + 1;
  const refDay = referenceDate.getDate();

  const isoMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const check = new Date(year, month - 1, day);
    if (
      check.getFullYear() !== year ||
      check.getMonth() !== month - 1 ||
      check.getDate() !== day
    ) {
      return null;
    }
    let age = refYear - year;
    if (refMonth < month || (refMonth === month && refDay < day)) {
      age -= 1;
    }
    return age >= 0 && age < 120 ? age : null;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  let age = refYear - parsed.getFullYear();
  const monthDiff = referenceDate.getMonth() - parsed.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && refDay < parsed.getDate())
  ) {
    age -= 1;
  }
  return age >= 0 && age < 120 ? age : null;
}

export function formatTenureDuration(
  startDate?: string | null,
  endDate?: string | null,
  referenceDate = new Date()
): string {
  if (!startDate || !startDate.trim()) return 'Tenure unrecorded';
  const start = new Date(startDate.trim());
  if (Number.isNaN(start.getTime())) return 'Tenure unrecorded';
  const end = endDate && endDate.trim() ? new Date(endDate.trim()) : referenceDate;
  if (Number.isNaN(end.getTime())) return 'Tenure unrecorded';

  const totalMonths =
    (end.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - start.getUTCMonth());

  if (totalMonths <= 0) {
    const days = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return days <= 1 ? '1 day' : `${days} days`;
  }
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  if (years === 0) {
    return months === 1 ? '1 mo' : `${months} mos`;
  }
  if (months === 0) {
    return years === 1 ? '1 yr' : `${years} yrs`;
  }
  return `${years} ${years === 1 ? 'yr' : 'yrs'} ${months} ${months === 1 ? 'mo' : 'mos'}`;
}
