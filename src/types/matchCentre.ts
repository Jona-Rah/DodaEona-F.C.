import { calculateAgeFromDob } from './manager';

export { calculateAgeFromDob };

export type TeamType = 'club' | 'national';

export type TeamTypeCode = 'club' | 'country';

export type GenderType = 'men' | 'women';

export type ConfederationType =
  | 'UEFA'
  | 'CONMEBOL'
  | 'CONCACAF'
  | 'CAF'
  | 'AFC'
  | 'OFC';

export type PlayerPosition = 'GK' | 'DEF' | 'MID' | 'ATT';

export interface PlayerAttributes {
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  penalties?: number;
  composure?: number;
}

export interface GkAttributes {
  diving: number;
  handling: number;
  kicking: number;
  reflexes: number;
  speed: number;
  positioning: number;
}

export interface PlayerStatTotals {
  appearances: number;
  goals: number;
  assists: number;
  minutesPlayed?: number;
  cleanSheets?: number;
  source: 'legacy' | 'verified' | 'simulated' | 'unrecorded';
}

export interface BallonDorWin {
  id: string;
  year: number;
  teamId?: string;
  teamName: string;
  team_type?: TeamTypeCode;
  note?: string;
}

export interface PlayerInjuryRecord {
  id: string;
  status: 'fit' | 'doubtful' | 'injured';
  note?: string;
  returnDate?: string;
  recordedAt: string;
  scope?: TeamTypeCode;
}

/**
 * Canonical permanent Player Identity (exactly one per real-world player across
 * both clubs and national teams).
 */
export interface PlayerIdentity {
  id: string;
  name: string;
  nickname?: string;
  shortName: string;
  fullName?: string;
  dateOfBirth?: string;
  age: number;
  nationality: string;
  secondaryNationality?: string;
  gender: GenderType;
  position: PlayerPosition;
  positionDetail: string;
  overallRating: number;
  attributes: PlayerAttributes;
  gkAttributes?: GkAttributes;
  preferredFoot?: 'Right' | 'Left';
  heightCm?: number;
  portraitUrl?: string;
  injuryStatus?: 'fit' | 'doubtful' | 'injured';
  injuryNote?: string;
  injuryReturnDate?: string;
  injuryHistory?: PlayerInjuryRecord[];
  ballonDorWins: BallonDorWin[];
  legacyClubStats?: PlayerStatTotals;
  legacyInternationalStats?: PlayerStatTotals;
  internationalRetired?: boolean;
  internationalRetiredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Club Registration table (strictly team_type === 'club').
 * Rule: A player may have AT MOST ONE active club registration at any time.
 */
export interface PlayerClubRegistration {
  id: string;
  playerId: string;
  teamId: string;
  teamName: string;
  teamCode?: string;
  teamCrestUrl?: string;
  team_type: 'club';
  status: 'active' | 'former';
  shirtNumber: number | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
  captainSince?: string;
  viceCaptainSince?: string;
  joinedAt?: string;
  leftAt?: string;
  appearances: number;
  goals: number;
  assists: number;
}

/**
 * National Team Registration table (strictly team_type === 'country').
 * Rule: Independent of club registration; a player may represent a national team
 * while actively registered at a club. National shirt # and armband stay independent.
 */
export interface PlayerNationalRegistration {
  id: string;
  playerId: string;
  teamId: string;
  teamName: string;
  teamCode?: string;
  teamCountry: string;
  teamFlag?: string;
  teamCrestUrl?: string;
  confederation?: ConfederationType;
  team_type: 'country';
  status: 'called_up' | 'former' | 'standby';
  shirtNumber: number | null;
  isCaptain: boolean;
  isViceCaptain: boolean;
  captainSince?: string;
  viceCaptainSince?: string;
  calledUpAt?: string;
  leftAt?: string;
  appearances: number;
  goals: number;
  assists: number;
}

export interface PlayerMatchAppearanceSummary {
  matchId: string;
  date: string;
  competitionName: string;
  teamId: string;
  teamName: string;
  team_type: TeamTypeCode;
  opponentName: string;
  scoreline: string;
  goals: number;
  assists: number;
}

export interface PlayerProfileView {
  identity: PlayerIdentity;
  activeClub: PlayerClubRegistration | null;
  formerClubs: PlayerClubRegistration[];
  nationalRegistrations: PlayerNationalRegistration[];
  careerStats: {
    club: {
      appearances: number;
      goals: number;
      assists: number;
      legacyAppearances: number;
      legacyGoals: number;
      legacyAssists: number;
      simulatedAppearances: number;
      simulatedGoals: number;
      simulatedAssists: number;
      hasLegacyRecord: boolean;
    };
    international: {
      appearances: number;
      goals: number;
      assists: number;
      legacyAppearances: number;
      legacyGoals: number;
      legacyAssists: number;
      simulatedAppearances: number;
      simulatedGoals: number;
      simulatedAssists: number;
      hasLegacyRecord: boolean;
    };
    overall: {
      appearances: number;
      goals: number;
      assists: number;
    };
    recentMatches: PlayerMatchAppearanceSummary[];
  };
  captaincies: {
    club: Array<{
      registrationId: string;
      teamId: string;
      teamName: string;
      role: 'C' | 'VC';
      since?: string;
      active: boolean;
    }>;
    international: Array<{
      registrationId: string;
      teamId: string;
      teamName: string;
      teamFlag?: string;
      role: 'C' | 'VC';
      since?: string;
      active: boolean;
    }>;
  };
  canDeleteIdentity: boolean;
}

export interface Player {
  id: string;
  name: string;
  nickname?: string;
  shortName: string;
  fullName?: string;
  position: PlayerPosition;
  positionDetail: string; // e.g. 'CB', 'LB', 'CDM', 'CAM', 'LW', 'ST'
  overallRating: number;
  nationality: string;
  gender?: GenderType;
  shirtNumber: number;
  age: number;
  dateOfBirth?: string;
  portraitUrl?: string;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  captainSince?: string;
  viceCaptainSince?: string;
  injuryStatus?: 'fit' | 'doubtful' | 'injured';
  injuryNote?: string;
  injuryReturnDate?: string;
  internationalRetired?: boolean;
  internationalRetiredAt?: string;
  attributes: PlayerAttributes;
  gkAttributes?: GkAttributes;
}

export interface FreeAgentPlayer extends Player {
  previousClub?: string;
  marketValue?: string;
  joinedFreeAgency?: string;
}

export interface TrophyRecord {
  id: string;
  name: string;
  competition: string;
  competitionId?: string;
  season: string;
  count?: number;
  iconType?: 'ucl' | 'domestic' | 'world' | 'cup';
  isDeletedCompetition?: boolean;
  engraving?: string;
  imageUrl?: string;
  trophyDesign?: import('./competitionMaker').TrophyDesignConfig;
}

export interface ManagerHistoryEntry {
  id: string;
  name: string;
  role: string;
  nationality?: string;
  startDate: string;
  endDate: string;
}

export interface ManagerCareerEntry {
  club: string;
  role: string;
  period: string;
}

export interface ManagerProfile {
  name: string;
  role?: string;
  nationality: string;
  dateOfBirth?: string;
  age?: number | null;
  appointedYear: number;
  appointedSince?: string;
  bio?: string;
  verified?: boolean;
  previousClubs: string[];
  careerHistory?: ManagerCareerEntry[];
  winRate: string;
  clubStats?: {
    matches: number;
    wins: number;
    draws: number;
    losses: number;
    trophies: number;
  };
  honours: string[];
}

export interface TacticalMentalitySettings {
  mentality: string;
  buildUp: string;
  tempo: string;
  attackingWidth: string;
  chanceCreation: string;
  passingRisk: string;
  crossing: string;
  creativeFreedom: string;
  defensiveLine: string;
  pressingIntensityLabel: string;
  pressingTrigger: string;
  defensiveWidth: string;
  marking: string;
  tackling: string;
  attackingTransition: string;
  overlappingFullBacks: string;
  underlappingRuns: string;
}

export interface TacticalProfile {
  playingStyle: string;
  formationFamily: string;
  dataStatus?: 'verified' | 'user-set' | 'estimated';
  summary?: string;
  notes?: string;
  setPieces?: string;
  alternativeFormations?: Array<{ formation: string; family: string }>;
  mentalitySettings?: TacticalMentalitySettings;
  pressingIntensity: number; // 0 - 100
  buildUpSpeed: number; // 0 - 100
  defensiveLine: number; // 0 - 100
  width: number; // 0 - 100
}

export interface MatchResultRecord {
  id: string;
  opponent: string;
  opponentCrest?: string;
  venue?: 'home' | 'away';
  score: string;
  result: 'W' | 'D' | 'L';
  date: string;
  competition: string;
}

export interface LatestRecordedLineup {
  formation: string;
  opponent: string;
  date: string;
  competition?: string;
  players: Array<{
    id: string;
    name: string;
    shirtNumber: number;
    positionDetail: string;
    position: PlayerPosition;
  }>;
}

export interface LeadershipHistoryEntry {
  id: string;
  role: 'C' | 'VC';
  playerName: string;
  since: string;
  until: string; // 'present' or date
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  code: string; // 3-letter code e.g. 'RMA', 'MCI', 'BAR', 'ARG', 'ESP'
  type: TeamType;
  team_type?: TeamTypeCode; // Canonical discriminator: 'club' | 'country'
  country: string;
  flag?: string;
  countryCode?: string;
  league?: string; // strictly for clubs
  confederation?: ConfederationType; // strictly for national teams
  gender: GenderType;
  isIcon?: boolean;
  iconEra?: string;
  isCustom?: boolean;
  creatorId?: string;
  overallRating: number;
  attackRating: number;
  midfieldRating: number;
  defenceRating: number;
  crestUrl: string;
  stadium: string;
  stadiumCapacity?: number;
  foundedYear: number;
  manager: string;
  manager_id?: string | null;
  manager_name?: string | null;
  manager_since?: string | null;
  manager_role?: string | null;
  managerProfile?: ManagerProfile | null;
  managerHistory?: ManagerHistoryEntry[];
  captainName?: string;
  captainId?: string;
  captainSince?: string;
  viceCaptainName?: string;
  viceCaptainId?: string;
  viceCaptainSince?: string;
  leadershipHistory?: LeadershipHistoryEntry[];
  playingStyle: string;
  leagueStatus?: string;
  primaryColor: string;
  secondaryColor: string;
  classification?: string;
  trophiesCount?: number;
  trophies?: TrophyRecord[];
  tacticalProfile?: TacticalProfile;
  preferredXiIds?: string[];
  preferredXiSource?: 'verified' | 'user-set' | 'estimated';
  penaltyOrderIds?: string[];
  penaltyOrderSource?: 'verified' | 'user-set';
  latestLineup?: LatestRecordedLineup;
  recentMatches?: MatchResultRecord[];
  squad: Player[];
  defaultFormation: string;
  description?: string;
  worldRanking?: number;
  rankingPoints?: number;
  rankingUpdateDate?: string;
}

/**
 * Canonical helper to determine whether a team is a club or national country team.
 * Always prioritizes explicit team.team_type, falling back to team.type === 'national'.
 */
export function getTeamType(team?: Pick<Team, 'type' | 'team_type'> | null): TeamTypeCode {
  if (!team) return 'club';
  if (team.team_type === 'country' || team.team_type === 'club') {
    return team.team_type;
  }
  return team.type === 'national' ? 'country' : 'club';
}

export function getPlayerDisplayName(
  player?:
    | Pick<PlayerIdentity, 'name' | 'nickname'>
    | Pick<Player, 'name' | 'nickname'>
    | null
): string {
  if (!player) return '';
  return (player.nickname && player.nickname.trim()) || player.name || '';
}

export function getPlayerFullName(
  player?:
    | Pick<PlayerIdentity, 'name' | 'fullName' | 'nickname'>
    | Pick<Player, 'name' | 'fullName' | 'nickname'>
    | null
): string {
  if (!player) return '';
  return (player.fullName && player.fullName.trim()) || player.name || player.nickname || '';
}

export function resolvePlayerAge(
  dateOfBirth?: string | null,
  fallbackAge?: number | null
): number {
  const computed = calculateAgeFromDob(dateOfBirth);
  if (computed !== null) return computed;
  const num = Number(fallbackAge);
  return Number.isFinite(num) && num > 0 ? Math.round(num) : 22;
}

export interface MatchSelectionState {
  homeTeam: Team | null;
  awayTeam: Team | null;
  activeTarget: 'home' | 'away' | null;
}

export type MatchCentreTab = 'dashboard' | 'teams' | 'managers' | 'simulate' | 'competitions' | 'scoreboard' | 'quiz' | 'world';

export type TeamsSectionTab = 'database' | 'compare-teams' | 'stadium-explorer' | 'ballon-dor' | 'team-statistics';

export type ViewChipType =
  | 'free-agents'
  | 'all-teams'
  | 'mens-clubs'
  | 'mens-nations'
  | 'womens-clubs'
  | 'womens-nations';

export type TeamOrdering = 'listed' | 'overall';

export interface TeamFilterState {
  teamType: TeamType;
  searchQuery: string;
  country: string;
  league: string;
  confederation: string;
  gender: 'all' | GenderType;
  clubType: 'all' | 'standard' | 'icon';
  ratingRange: 'all' | '85+' | '80-84' | '75-79' | '<75';
  sortBy: 'name-asc' | 'name-desc' | 'rating-desc' | 'rating-asc' | 'country' | 'league';
}
