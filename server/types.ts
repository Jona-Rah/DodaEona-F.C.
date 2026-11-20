import type { Manager, ManagerAppointment } from '../src/types/manager';
import type { ScoreboardMatchRecord } from '../src/types/scoreboard';
import type {
  CompetitionEditionHistoryEntry,
  CompetitionMakerTournament,
  TrophyDesignConfig,
} from '../src/types/competitionMaker';

export type { ScoreboardMatchRecord };

export type UserRole = 'admin' | 'member';

export interface ServerUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  blocked: boolean;
  blockedReason?: string;
  createdAt: string;
  lastActiveAt: string;
}

export interface PublicAuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  blocked: boolean;
  createdAt: string;
  lastActiveAt: string;
}

export interface ServerSession {
  sid: string;
  userId: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

export interface ActivityEventRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: 'reading' | 'simulation' | 'quiz' | 'auth' | 'admin';
  action: string;
  target: string;
  details?: string;
  timestamp: string;
}

export interface SimulationMatchEvent {
  minute: number;
  type: 'goal' | 'yellow' | 'red' | 'sub';
  teamSide: 'home' | 'away';
  playerId?: string;
  playerName: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  detail?: string;
}

export interface SimulationMatchRecord {
  id: string;
  homeTeamId: string;
  homeTeamName: string;
  homeCode: string;
  awayTeamId: string;
  awayTeamName: string;
  awayCode: string;
  homeScore: number;
  awayScore: number;
  halfTimeHomeScore?: number;
  halfTimeAwayScore?: number;
  wentToExtraTime?: boolean;
  penaltySummary?: string;
  seed?: string;
  competitionId: string;
  competitionName: string;
  competitionFixtureId?: string;
  status: 'completed' | 'scheduled' | 'in-progress';
  date: string;
  venue: string;
  attendance: number;
  possessionHome: number;
  shotsHome: number;
  shotsAway: number;
  xgHome: number;
  xgAway: number;
  lineupPlayerIds?: {
    home: string[];
    away: string[];
  };
  homeManagerId?: string;
  awayManagerId?: string;
  homeManagerName?: string;
  awayManagerName?: string;
  homeTeamType?: 'club' | 'country';
  awayTeamType?: 'club' | 'country';
  events: SimulationMatchEvent[];
  fullPayload?: any;
  createdBy: string;
}

export interface CompetitionFixtureRecord {
  id: string;
  competitionId: string;
  round: string;
  homeTeamId: string;
  awayTeamId: string;
  isKnockout: boolean;
  isTwoLegged: boolean;
  legNumber: 1 | 2;
  firstLegHomeGoals?: number;
  firstLegAwayGoals?: number;
  settled: boolean;
  settledMatchId?: string;
  homeScore?: number;
  awayScore?: number;
  penaltySummary?: string;
  settledAt?: string;
}

export interface CompetitionStandingRow {
  position: number;
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface CompetitionRecord {
  id: string;
  name: string;
  country: string;
  season: string;
  type: 'league' | 'cup' | 'international' | 'champions-league';
  status: 'import' | 'staged' | 'verified' | 'published';
  teamsCount: number;
  matchesPlayed: number;
  standings: CompetitionStandingRow[];
  fixtures?: CompetitionFixtureRecord[];
  updatedAt: string;
}

export type LeagueLifecycleStage = 'import' | 'staged' | 'verified' | 'published';

export interface LeagueStatusRecord {
  id: string;
  leagueName: string;
  country: string;
  confederation: string;
  teamsCount: number;
  stage: LeagueLifecycleStage;
  integrityPercent: number;
  verifiedBy?: string;
  notes: string;
  updatedAt: string;
}

export interface ClubRankingOverride {
  teamId: string;
  pinned?: boolean;
  bonusPoints?: number;
  editorialNote?: string;
}

export interface PublicationAnalyticsEvent {
  id: string;
  bookId: string;
  bookTitle: string;
  seriesTitle: string;
  eventType: 'view' | 'read' | 'download' | 'bookmark';
  userId?: string;
  timestamp: string;
}

export interface ReaderObjectiveRecord {
  id: string;
  title: string;
  description: string;
  category: 'reading' | 'series' | 'quiz' | 'engagement';
  targetCount: number;
  xpReward: number;
  active: boolean;
  completions: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export type QuizCategory =
  | 'Football History'
  | 'FIFA World Cup'
  | 'UEFA Champions League'
  | 'European Leagues'
  | 'Clubs and Their History'
  | 'Legendary Players'
  | 'Current Football Players'
  | 'Managers and Coaches'
  | 'International Football'
  | 'Football Records and Statistics'
  | 'Transfers and Contracts'
  | 'Football Rules and Regulations'
  | 'Stadiums and Competitions'
  | 'Difficult Football Trivia';

export type QuizDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface QuizQuestionRecord {
  id: string;
  category: QuizCategory;
  difficulty: QuizDifficulty;
  type: 'multiple-choice' | 'true-false' | 'image';
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  imageUrl?: string;
  active: boolean;
  createdAt: string;
}

export interface QuizAttemptRecord {
  id: string;
  userId?: string;
  userName: string;
  userEmail: string;
  mode: 'quick' | 'classic' | 'survival' | 'time' | 'daily' | 'category';
  category?: QuizCategory;
  score: number;
  maxPossibleScore: number;
  correctCount: number;
  incorrectCount: number;
  skippedCount: number;
  totalQuestions: number;
  accuracy: number;
  timeTakenSec: number;
  rating: 'Perfect' | 'Elite' | 'Sharp' | 'Solid' | 'Developing' | 'Rookie' | 'Unrated';
  difficultyBreakdown: Record<QuizDifficulty, { correct: number; total: number }>;
  questionsAnswered: Array<{
    questionId: string;
    questionText: string;
    options: string[];
    correctIndex: number;
    selectedIndex: number;
    isCorrect: boolean;
    explanation: string;
    timeTakenSec: number;
  }>;
  unlockedAchievements: string[];
  submittedAt: string;
}

export interface QuizDailyScheduleRecord {
  id: string;
  date: string;
  title: string;
  questionIds: string[];
  active: boolean;
  createdAt: string;
}

export interface QuizReportRecord {
  id: string;
  questionId: string;
  questionText: string;
  reportedByEmail: string;
  reason: 'Incorrect Answer' | 'Outdated Information' | 'Unclear Wording' | 'Typographical Error' | 'Other';
  details?: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface QuizSubmissionRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  score: number;
  totalQuestions: number;
  timeTakenSec: number;
  category: string;
  isDaily: boolean;
  submittedAt: string;
}

export interface ManagedAnnouncement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'update' | 'alert';
  status: 'draft' | 'hidden' | 'published' | 'archived';
  showBanner?: boolean;
  ctaLabel?: string;
  ctaDest?: string;
  ctaUrl?: string;
  date: string;
  createdAt?: string;
  updatedAt: string;
}

export interface NewsletterSubscriberRecord {
  id: string;
  email: string;
  subscribedAt: string;
}

export interface FanChatMessageRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  channel: 'Matchday' | 'Tactics' | 'Library';
  message: string;
  status: 'visible' | 'flagged' | 'removed';
  reportsCount: number;
  createdAt: string;
}

export interface UserWarningRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  reason: string;
  severity: 'notice' | 'warning' | 'final';
  issuedByEmail: string;
  issuedAt: string;
  relatedMessageId?: string;
}

export interface MusicTrackRecord {
  id: string;
  title: string;
  artist: string;
  sourceType: 'synth-pad' | 'audio-url' | 'uploaded';
  audioUrl?: string;
  frequencyHz?: number;
  soundscapePreset?: string;
  category?: string;
  description?: string;
  waveformColor?: string;
  bpm?: number;
  durationLabel: string;
  enabled: boolean;
  isDefault: boolean;
  featured?: boolean;
  createdAt: string;
}

export interface PdfFileRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
  accessStatus: 'public' | 'private';
  urlOrData: string;
  uploadedAt: string;
  updatedAt: string;
}

export interface ThemePaletteValues {
  bgPrimary: string;
  bgSurface: string;
  bgElevated: string;
  accentCyan: string;
  accentCrest: string;
  textPrimary: string;
}

export interface WebsiteBrandingConfig {
  activePresetId: string;
  siteName: string;
  controlRoomLabel: string;
  logoUrl: string;
  dark: ThemePaletteValues;
  light: ThemePaletteValues;
  updatedAt: string;
}

export interface AboutLegalConfig {
  aboutTitle: string;
  aboutSummary: string;
  aboutBody: string;
  privacyTitle: string;
  privacyBody: string;
  termsTitle: string;
  termsBody: string;
  status: 'draft' | 'published';
  updatedAt: string;
}

export interface ContactInfoConfig {
  officialEmail: string;
  supportEmail: string;
  pressEmail: string;
  location: string;
  officeHours: string;
  pressNote: string;
  socialTwitter: string;
  socialYoutube: string;
  socialInstagram: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  section: string;
  target: string;
  timestamp: string;
}

export interface MediaAsset {
  id: string;
  name: string;
  filename: string;
  url: string;
  fileType: 'PNG' | 'JPG' | 'SVG' | 'PDF';
  fileSize: string;
  usedIn: string[];
  uploadedAt: string;
}

export interface HomepageConfig {
  sections: Record<string, { visible: boolean; lastUpdated: string }>;
  announcements: Array<{
    id: string;
    badge?: string;
    title: string;
    message: string;
    active: boolean;
    actionText?: string;
    actionUrl?: string;
    date?: string;
  }>;
  hero: {
    headline: string;
    subtext: string;
    primaryBtnText: string;
    primaryBtnUrl: string;
    secondaryBtnText: string;
    secondaryBtnUrl: string;
    backgroundImage: string;
    overlayIntensity: number;
    visible: boolean;
  };
  welcome: {
    heading: string;
    subheading: string;
    paragraphs: string[];
    tagline: string;
    signoff: string;
    emblemUrl: string;
    visible: boolean;
  };
  accessCards: {
    readsHeading: string;
    readsDesc: string;
    readsImage: string;
    readsBtnText: string;
    matchHeading: string;
    matchDesc: string;
    matchImage: string;
    matchBtnText: string;
    visible: boolean;
  };
  featuredReads: {
    featuredSeriesIds: string[];
    displayCount: number;
    autoLatest: boolean;
    visible: boolean;
  };
  newsletter: {
    headline: string;
    description: string;
    btnText: string;
    consentText: string;
    successMessage: string;
    visible: boolean;
  };
  finalCta: {
    headline: string;
    message: string;
    primaryBtnText: string;
    primaryBtnUrl: string;
    secondaryBtnText: string;
    secondaryBtnUrl: string;
    visible: boolean;
  };
  footer: {
    description: string;
    tagline: string;
    socialTwitter: string;
    socialYoutube: string;
    socialInstagram: string;
    visible: boolean;
  };
}

export type ReadsCategory =
  | 'Football Tactics and Strategy'
  | 'Football History and Culture'
  | 'Youth Academy and Player Development'
  | 'Competitions and Tournaments'
  | 'Players and Legends'
  | 'Football Rules and Regulations'
  | 'Activities and Challenges';

export interface Chapter {
  id: string;
  chapterNumber: number;
  title: string;
  pageNumber: number;
  content: string[];
  tacticalNotes?: string;
}

export interface BookVolume {
  id: string;
  seriesId: string;
  seriesTitle: string;
  volumeNumber: number;
  title: string;
  subtitle?: string;
  description: string;
  coverUrl: string;
  publishedDate: string;
  category: ReadsCategory;
  author: string;
  pageCount: number;
  readTimeMinutes: number;
  published: boolean;
  featured: boolean;
  pdfUrl?: string;
  downloadEnabled: boolean;
  chapters: Chapter[];
  slug: string;
}

export interface ReadingSeriesItem {
  id: string;
  seriesNumber: number;
  title: string;
  subtitle?: string;
  description: string;
  coverUrl: string;
  category: ReadsCategory;
  volumeCount: number;
  published: boolean;
  featured: boolean;
  slug: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  bookTitle: string;
  seriesTitle: string;
  pageNumber: number;
  chapterTitle: string;
  note?: string;
  createdAt: string;
}

export interface ReadingProgressRecord {
  bookId: string;
  percent: number;
  currentPage: number;
  totalPages: number;
  lastReadAt: string;
  completed: boolean;
}

export interface UserPersonalLibrary {
  savedBookIds: string[];
  bookmarks: Bookmark[];
  progress: Record<string, ReadingProgressRecord>;
  recentBookIds: string[];
}

export interface ServerDatabase {
  sessionSecret: string;
  users: ServerUser[];
  sessions: ServerSession[];
  activityLogs: ActivityEventRecord[];
  simulationMatches: SimulationMatchRecord[];
  scoreboardMatches: ScoreboardMatchRecord[];
  competitions: CompetitionRecord[];
  competitionMakers: CompetitionMakerTournament[];
  competitionTrophies: TrophyDesignConfig[];
  hallOfFame: CompetitionEditionHistoryEntry[];
  leagueStatuses: LeagueStatusRecord[];
  rankingOverrides: Record<string, ClubRankingOverride>;
  squadShirtOverrides: Record<string, Record<string, number>>;
  squadInjuryOverrides: Record<
    string,
    Record<string, { status: 'fit' | 'doubtful' | 'injured'; returnDate?: string; note?: string }>
  >;
  analyticsEvents: PublicationAnalyticsEvent[];
  readerObjectives: ReaderObjectiveRecord[];
  quizQuestions: QuizQuestionRecord[];
  quizReports: QuizReportRecord[];
  quizSubmissions: QuizSubmissionRecord[];
  quizAttempts: QuizAttemptRecord[];
  quizDailies: QuizDailyScheduleRecord[];
  announcements: ManagedAnnouncement[];
  newsletterSubscribers: NewsletterSubscriberRecord[];
  fanChatMessages: FanChatMessageRecord[];
  userWarnings: UserWarningRecord[];
  musicTracks: MusicTrackRecord[];
  deletedMusicTrackIds?: string[];
  pdfFiles: PdfFileRecord[];
  branding: WebsiteBrandingConfig;
  aboutLegal: AboutLegalConfig;
  contactInfo: ContactInfoConfig;
  teamOverrides: Record<string, any>;
  customTeams: any[];
  deletedTeamIds: string[];
  freeAgents: any[];
  playerIdentityOverrides: Record<string, any>;
  deletedPlayerIdentityIds: string[];
  clubRegistrations: any[];
  nationalRegistrations: any[];
  managers: Manager[];
  managerAppointments: ManagerAppointment[];
  seededClubManagersV1?: boolean;
  seededNationalManagersV1?: boolean;
  seededVerifiedDobsV1?: boolean;
  auditLogs: AuditLogEntry[];
  homepageConfig: HomepageConfig;
  readingSeries: ReadingSeriesItem[];
  bookVolumes: BookVolume[];
  mediaAssets: MediaAsset[];
  userLibraries: Record<string, UserPersonalLibrary>;

}
