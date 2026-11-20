export type ScoreboardPeriod =
  | 'not_started'
  | 'first_half'
  | 'half_time'
  | 'second_half'
  | 'full_time'
  | 'extra_time_first_half'
  | 'extra_time_break'
  | 'extra_time_second_half'
  | 'extra_time_finished'
  | 'penalty_shootout'
  | 'completed';

export interface ScoreboardGoal {
  id: string;
  teamSide: 'home' | 'away';
  teamId: string;
  teamName: string;
  minute: number; // e.g. 12, 45, 90, 105, 120
  stoppageMinute?: number; // e.g. 2 for 45+2' or 90+3'
  scorerId?: string;
  scorerName: string;
  assistId?: string;
  assistName?: string;
  type: 'regular' | 'penalty' | 'free_kick' | 'header' | 'own_goal';
  createdAt: string;
}

export type PenaltyStatus = 'scored' | 'missed' | 'pending';

export interface ScoreboardPenaltyKick {
  id: string;
  round: number; // 1, 2, 3, 4, 5, 6 (sudden death), ...
  teamSide: 'home' | 'away';
  teamId: string;
  takerId?: string;
  takerName: string;
  status: PenaltyStatus;
}

export interface ScoreboardMatchConfig {
  minutesPerHalf: number; // default 45
  extraTimeMinutesPerHalf: number; // default 15
  enableExtraTimeIfTied: boolean; // default true
  enablePenaltiesIfTied: boolean; // default true
  matchName?: string; // e.g. "Club Friendly", "Final Showdown"
  venue?: string;
}

export interface ScoreboardTeamSummary {
  id: string;
  name: string;
  shortName: string;
  code: string;
  crestUrl: string;
  country: string;
  type: 'club' | 'country';
  gender: 'men' | 'women';
  overallRating: number;
}

export interface ScoreboardMatchRecord {
  id: string;
  homeTeam: ScoreboardTeamSummary;
  awayTeam: ScoreboardTeamSummary;
  config: ScoreboardMatchConfig;
  status: ScoreboardPeriod;
  currentSecond: number; // match clock in seconds
  homeScore: number;
  awayScore: number;
  halfTimeHomeScore?: number;
  halfTimeAwayScore?: number;
  wentToExtraTime: boolean;
  extraTimeHomeScore?: number;
  extraTimeAwayScore?: number;
  wentToPenalties: boolean;
  penaltyHomeScore?: number;
  penaltyAwayScore?: number;
  penaltySummary?: string;
  finalWinner: 'home' | 'away' | 'draw' | null;
  winnerTeamName: string | null;
  outcomeDescription: string;
  goals: ScoreboardGoal[];
  penalties: ScoreboardPenaltyKick[];
  date: string;
  savedAt: string;
  notes?: string;
  createdBy?: string;
}
