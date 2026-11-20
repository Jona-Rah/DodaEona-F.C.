import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  ActivityEventRecord,
  AuditLogEntry,
  BookVolume,
  CompetitionRecord,
  HomepageConfig,
  MediaAsset,
  MusicTrackRecord,
  ReadingSeriesItem,
  ServerDatabase,
  UserPersonalLibrary,
  WebsiteBrandingConfig,
} from './types';
import { generateExpandedQuizBank } from './quizBankExpanded';
import {
  DEFAULT_ACCESS_CARDS_COPY,
  DEFAULT_HERO_COPY,
  DEFAULT_WELCOME_COPY,
  INITIAL_ANNOUNCEMENT,
  OFFICIAL_ASSETS,
  resolveAccessCardDesc,
  resolveAccessCardImageUrl,
} from '../src/data/mockData';
import { CLUB_TEAMS_DATABASE, NATIONAL_TEAMS_DATABASE, TEAMS_DATABASE } from '../src/data/teamsDatabase';
import { buildSeededClubManagers } from '../src/data/clubManagersDatabase';
import { buildSeededNationalManagers } from '../src/data/nationalManagersDatabase';
import { getVerifiedManagerDob } from '../src/data/verifiedManagerDobs';
import { getVerifiedPlayerDob } from '../src/data/verifiedPlayerDobs';
import { PRESET_TROPHIES } from '../src/utils/competitionEngine';

import { scheduleFirestoreSync } from './services/firestoreSyncService';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'admin-db.json');

export function hashPassword(password: string, existingSalt?: string): string {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  const candidateHex = crypto.scryptSync(password, salt, 64).toString('hex');
  const a = Buffer.from(originalHex, 'hex');
  const b = Buffer.from(candidateHex, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const BRANDING_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  dark: WebsiteBrandingConfig['dark'];
  light: WebsiteBrandingConfig['light'];
}> = [
  {
    id: 'site-default',
    name: 'Site default',
    description: 'Deep navy slate, sky-blue links and warm stadium gold highlights.',
    dark: {
      bgPrimary: '#050A12',
      bgSurface: '#070F1B',
      bgElevated: '#0B1525',
      accentCyan: '#7ADBF0',
      accentCrest: '#D6B56E',
      textPrimary: '#F8FAFC',
    },
    light: {
      bgPrimary: '#F4F7FA',
      bgSurface: '#FFFFFF',
      bgElevated: '#EDF2F7',
      accentCyan: '#0891B2',
      accentCrest: '#B48B3E',
      textPrimary: '#09111E',
    },
  },
  {
    id: 'archive-gold',
    name: 'Archive & Gold',
    description: 'Deep charcoal, amber gold highlights, crisp contrast on dark cards.',
    dark: {
      bgPrimary: '#0A0908',
      bgSurface: '#13110F',
      bgElevated: '#1C1814',
      accentCyan: '#EAB308',
      accentCrest: '#F59E0B',
      textPrimary: '#FAF8F5',
    },
    light: {
      bgPrimary: '#FAF8F4',
      bgSurface: '#FFFFFF',
      bgElevated: '#F3EFE6',
      accentCyan: '#B45309',
      accentCrest: '#92400E',
      textPrimary: '#1C1917',
    },
  },
  {
    id: 'emerald-pitch',
    name: 'Emerald Pitch',
    description: 'Floodlit turf dark green paired with clean mint-emerald telemetry.',
    dark: {
      bgPrimary: '#040D09',
      bgSurface: '#081812',
      bgElevated: '#0E241B',
      accentCyan: '#34D399',
      accentCrest: '#A7F3D0',
      textPrimary: '#F0FDF4',
    },
    light: {
      bgPrimary: '#F2FBF6',
      bgSurface: '#FFFFFF',
      bgElevated: '#E2F5EB',
      accentCyan: '#059669',
      accentCrest: '#047857',
      textPrimary: '#062C1E',
    },
  },
  {
    id: 'royal-indigo',
    name: 'Royal Indigo',
    description: 'European night atmosphere with violet-indigo floodlights.',
    dark: {
      bgPrimary: '#070814',
      bgSurface: '#0D1024',
      bgElevated: '#151936',
      accentCyan: '#818CF8',
      accentCrest: '#C4B5FD',
      textPrimary: '#EEF2FF',
    },
    light: {
      bgPrimary: '#F5F6FC',
      bgSurface: '#FFFFFF',
      bgElevated: '#E8EAF7',
      accentCyan: '#4F46E5',
      accentCrest: '#4338CA',
      textPrimary: '#1E1B4B',
    },
  },
  {
    id: 'crimson-press',
    name: 'Crimson Press',
    description: 'Editorial matchday programme palette in oxblood slate and rose.',
    dark: {
      bgPrimary: '#10060A',
      bgSurface: '#1B0B11',
      bgElevated: '#281119',
      accentCyan: '#FB7185',
      accentCrest: '#FDA4AF',
      textPrimary: '#FFF1F2',
    },
    light: {
      bgPrimary: '#FDF4F6',
      bgSurface: '#FFFFFF',
      bgElevated: '#F9E6EA',
      accentCyan: '#E11D48',
      accentCrest: '#BE123C',
      textPrimary: '#2D0A14',
    },
  },
  {
    id: 'ice-steel',
    name: 'Ice & Steel',
    description: 'Minimal Nordic slate with glacier-cyan instruments and steel borders.',
    dark: {
      bgPrimary: '#080C10',
      bgSurface: '#0F161E',
      bgElevated: '#17212C',
      accentCyan: '#38BDF8',
      accentCrest: '#94A3B8',
      textPrimary: '#F1F5F9',
    },
    light: {
      bgPrimary: '#F3F6F9',
      bgSurface: '#FFFFFF',
      bgElevated: '#E5ECF2',
      accentCyan: '#0284C7',
      accentCrest: '#475569',
      textPrimary: '#0F172A',
    },
  },
];

export function buildSeedDatabase(): ServerDatabase {
  const nowIso = new Date().toISOString();
  const defaultPreset = BRANDING_PRESETS[0];
  const seededClubManagers = buildSeededClubManagers(CLUB_TEAMS_DATABASE);
  const seededNationalManagers = buildSeededNationalManagers(
    NATIONAL_TEAMS_DATABASE,
    seededClubManagers.managers
  );

  return {
    sessionSecret: crypto.randomBytes(32).toString('hex'),
    users: [
      {
        id: 'usr-admin-01',
        name: 'David Emanoueel',
        email: 'david.emanoueel.gr7@gmail.com',
        passwordHash: hashPassword('DodaEonaAdmin2026!'),
        role: 'admin',
        blocked: false,
        createdAt: '2026-08-14T09:00:00.000Z',
        lastActiveAt: nowIso,
      },
      {
        id: 'usr-admin-02',
        name: 'Club Administrator',
        email: 'admin@dodaeona.fc',
        passwordHash: hashPassword('DodaEonaAdmin2026!'),
        role: 'admin',
        blocked: false,
        createdAt: '2026-08-14T09:00:00.000Z',
        lastActiveAt: nowIso,
      },
      {
        id: 'usr-admin-03',
        name: 'Jonathan El Raheb',
        email: 'jonathan.elraheb@gmail.com',
        passwordHash: hashPassword('DodaEonaAdmin2026!'),
        role: 'admin',
        blocked: false,
        createdAt: '2026-08-14T09:00:00.000Z',
        lastActiveAt: nowIso,
      },
      {
        id: 'usr-admin-04',
        name: 'Malak Marian',
        email: 'malak.marian1984@gmail.com',
        passwordHash: hashPassword('DodaEonaAdmin2026!'),
        role: 'admin',
        blocked: false,
        createdAt: '2026-08-14T09:00:00.000Z',
        lastActiveAt: nowIso,
      },
      {
        id: 'usr-member-01',
        name: 'Marcus Vance',
        email: 'marcus.vance@dodaeona.fc',
        passwordHash: hashPassword('DodaEonaFan2026!'),
        role: 'member',
        blocked: false,
        createdAt: '2026-09-02T14:22:00.000Z',
        lastActiveAt: '2026-11-11T19:40:00.000Z',
      },
      {
        id: 'usr-member-02',
        name: 'Elena Rostova',
        email: 'elena.rostova@dodaeona.fc',
        passwordHash: hashPassword('DodaEonaFan2026!'),
        role: 'member',
        blocked: false,
        createdAt: '2026-09-18T11:10:00.000Z',
        lastActiveAt: '2026-11-10T16:05:00.000Z',
      },
      {
        id: 'usr-member-03',
        name: 'Tarek Mansour',
        email: 'tarek.mansour@dodaeona.fc',
        passwordHash: hashPassword('DodaEonaFan2026!'),
        role: 'member',
        blocked: false,
        createdAt: '2026-10-05T17:45:00.000Z',
        lastActiveAt: '2026-11-09T21:18:00.000Z',
      },
      {
        id: 'usr-member-04',
        name: 'Sofia Lindqvist',
        email: 'sofia.lindqvist@dodaeona.fc',
        passwordHash: hashPassword('DodaEonaFan2026!'),
        role: 'member',
        blocked: false,
        createdAt: '2026-10-21T08:30:00.000Z',
        lastActiveAt: '2026-11-08T12:12:00.000Z',
      },
    ],
    sessions: [],
    activityLogs: [
      {
        id: 'uact-02',
        userId: 'usr-member-02',
        userName: 'Elena Rostova',
        userEmail: 'elena.rostova@dodaeona.fc',
        category: 'quiz',
        action: 'Completed Daily Quiz',
        target: 'Tactical Systems & Laws of the Game',
        details: 'Score 4/5 in 41s',
        timestamp: '2026-11-10T16:05:00.000Z',
      },
      {
        id: 'uact-03',
        userId: 'usr-member-03',
        userName: 'Tarek Mansour',
        userEmail: 'tarek.mansour@dodaeona.fc',
        category: 'simulation',
        action: 'Simulated Fixture',
        target: 'FC Barcelona 3 - 1 Real Madrid',
        details: 'LaLiga EA Sports Engine',
        timestamp: '2026-11-09T21:18:00.000Z',
      },
    ],
    simulationMatches: [],
    scoreboardMatches: [],
    competitions: buildDefaultCompetitions(nowIso),
    competitionMakers: [],
    competitionTrophies: PRESET_TROPHIES.map((t) => ({ ...t })),
    hallOfFame: [],
    leagueStatuses: [
      { id: 'lg-pl', leagueName: 'Premier League', country: 'England', confederation: 'UEFA', teamsCount: 20, stage: 'published', integrityPercent: 100, verifiedBy: 'David Emanoueel', notes: 'Imported from FC27 CSV database', updatedAt: nowIso },
      { id: 'lg-laliga', leagueName: 'LALIGA EA SPORTS', country: 'Spain', confederation: 'UEFA', teamsCount: 20, stage: 'published', integrityPercent: 100, verifiedBy: 'David Emanoueel', notes: 'Imported from FC27 CSV database', updatedAt: nowIso },
      { id: 'lg-seriea', leagueName: 'Serie A Enilive', country: 'Italy', confederation: 'UEFA', teamsCount: 20, stage: 'published', integrityPercent: 100, verifiedBy: 'David Emanoueel', notes: 'Imported from FC27 CSV database', updatedAt: nowIso },
      { id: 'lg-bundesliga', leagueName: 'Bundesliga', country: 'Germany', confederation: 'UEFA', teamsCount: 18, stage: 'published', integrityPercent: 100, verifiedBy: 'David Emanoueel', notes: 'Imported from FC27 CSV database', updatedAt: nowIso },
      { id: 'lg-ligue1', leagueName: "Ligue 1 McDonald's", country: 'France', confederation: 'UEFA', teamsCount: 18, stage: 'published', integrityPercent: 100, verifiedBy: 'David Emanoueel', notes: 'Imported from FC27 CSV database', updatedAt: nowIso },
      { id: 'lg-wsl', leagueName: 'Barclays Women’s Super League', country: 'England', confederation: 'UEFA', teamsCount: 14, stage: 'published', integrityPercent: 100, verifiedBy: 'David Emanoueel', notes: 'Imported from FC27 CSV database', updatedAt: nowIso },
      { id: 'lg-ligaf', leagueName: 'Liga F', country: 'Spain', confederation: 'UEFA', teamsCount: 16, stage: 'published', integrityPercent: 100, verifiedBy: 'David Emanoueel', notes: 'Imported from FC27 CSV database', updatedAt: nowIso },
      { id: 'lg-mls', leagueName: 'Major League Soccer', country: 'United States', confederation: 'CONCACAF', teamsCount: 30, stage: 'published', integrityPercent: 100, verifiedBy: 'David Emanoueel', notes: 'Imported from FC27 CSV database', updatedAt: nowIso },
    ],
    rankingOverrides: {},
    squadShirtOverrides: {},
    squadInjuryOverrides: {},
    analyticsEvents: [],
    readerObjectives: [
      {
        id: 'obj-03',
        title: 'Daily Quiz Hat-Trick',
        description: 'Score 3 or more correct answers in the Daily Football Quiz.',
        category: 'quiz',
        targetCount: 3,
        xpReward: 200,
        active: true,
        completions: { 'usr-member-02': 3 },
        createdAt: '2026-10-20T15:30:00.000Z',
        updatedAt: '2026-10-20T15:30:00.000Z',
      },
    ],
    quizQuestions: generateExpandedQuizBank(),
    quizReports: [
      {
        id: 'qrep-01',
        questionId: 'quiz-q-01',
        questionText: 'In a 3-2-5 in-possession rest-defence structure...',
        reportedByEmail: 'marcus.vance@dodaeona.fc',
        reason: 'Unclear Wording',
        details: 'Could clarify whether full-backs invert to form the 2.',
        status: 'open',
        createdAt: '2026-11-10T11:20:00.000Z',
      },
    ],
    quizSubmissions: [],
    quizAttempts: [],
    quizDailies: [],
    announcements: [
      {
        id: 'ann-01',
        title: 'Match Centre Simulation Engine Active',
        message: 'Explore authentic 6-tab Club Dossiers, custom dual-crest clubs, and interactive Match Centre teams now.',
        type: 'update',
        status: 'published',
        showBanner: true,
        ctaLabel: 'Open Match Centre',
        ctaDest: 'match-centre',
        ctaUrl: '/match-centre',
        date: '2026-11-12',
        createdAt: '2026-11-12T08:52:00.000Z',
        updatedAt: '2026-11-12T08:52:00.000Z',
      },
      {
        id: 'ann-03',
        title: 'Complete FC27 Global Club & Squad Database Live',
        message: 'All 742 clubs and 9,392 players from the official database are now available in the Match Centre with world-ranking overall calibration from 91 to 50.',
        type: 'update',
        status: 'published',
        showBanner: false,
        ctaLabel: 'Browse Teams',
        ctaDest: 'match-centre',
        ctaUrl: '/match-centre',
        date: '2026-11-11',
        createdAt: '2026-11-11T18:30:00.000Z',
        updatedAt: '2026-11-11T18:30:00.000Z',
      },
      {
        id: 'ann-02',
        title: 'Winter Tactical Editions Preview',
        message: 'Upcoming coaching monographs covering inverted wingers and build-up pressing traps.',
        type: 'info',
        status: 'hidden',
        showBanner: false,
        ctaLabel: 'Browse Reads',
        ctaDest: 'reads',
        ctaUrl: '/reads',
        date: '2026-11-10',
        createdAt: '2026-11-10T15:00:00.000Z',
        updatedAt: '2026-11-10T15:00:00.000Z',
      },
    ],
    newsletterSubscribers: [
      {
        id: 'sub-01',
        email: 'marcus.vance@dodaeona.fc',
        subscribedAt: '2026-10-12T10:15:00.000Z',
      },
      {
        id: 'sub-02',
        email: 'elena.rostova@dodaeona.fc',
        subscribedAt: '2026-10-19T14:30:00.000Z',
      },
      {
        id: 'sub-03',
        email: 'tarek.mansour@dodaeona.fc',
        subscribedAt: '2026-11-02T09:45:00.000Z',
      },
    ],
    fanChatMessages: [
      {
        id: 'chat-02',
        userId: 'usr-member-03',
        userName: 'Tarek Mansour',
        userEmail: 'tarek.mansour@dodaeona.fc',
        channel: 'Matchday',
        message: 'Simulated El Clásico with a 4-2-3-1 high press — 61% possession and a late Raphinha winner!',
        status: 'visible',
        reportsCount: 0,
        createdAt: '2026-11-10T21:15:00.000Z',
      },
      {
        id: 'chat-03',
        userId: 'usr-member-04',
        userName: 'Sofia Lindqvist',
        userEmail: 'sofia.lindqvist@dodaeona.fc',
        channel: 'Library',
        message: 'Can anyone link an off-site mirror link for the restricted draft manual?',
        status: 'flagged',
        reportsCount: 1,
        createdAt: '2026-11-09T14:40:00.000Z',
      },
    ],
    userWarnings: [],
    musicTracks: buildFeaturedMusicTracks(),
    deletedMusicTrackIds: [],
    pdfFiles: [],
    branding: {
      activePresetId: defaultPreset.id,
      siteName: 'OFFICIAL DODAEONA F.C. WEBSITE',
      controlRoomLabel: 'PUBLISHING CONTROL ROOM',
      logoUrl: '/assets/aistudio/DodaEona_F.C._V2_Fill_Color_8c96db06.png',
      dark: { ...defaultPreset.dark },
      light: { ...defaultPreset.light },
      updatedAt: nowIso,
    },
    aboutLegal: {
      aboutTitle: 'About DodaEona F.C.',
      aboutSummary: "The club's own football press and interactive tactical simulation workspace.",
      aboutBody:
        'DodaEona F.C. unites structured football literature, coaching monographs, matchday quizzes, and a full 6-tab Match Centre club dossier in a single unified environment.',
      privacyTitle: 'Privacy Policy',
      privacyBody:
        'DodaEona F.C. stores account credentials using salted cryptographic hashes and issues HTTP-only session cookies solely to authenticate readers and platform administrators.',
      termsTitle: 'Terms of Use',
      termsBody:
        'Published PDF editions and tactical manuals are provided for personal educational study. Redistribution or bypassing restricted publication controls is prohibited.',
      status: 'published',
      updatedAt: '2026-11-12T09:00:00.000Z',
    },
    contactInfo: {
      officialEmail: 'david.emanoueel.gr7@gmail.com',
      supportEmail: 'library@dodaeona.fc',
      pressEmail: 'press@dodaeona.fc',
      location: 'DodaEona Football Archive & Studio',
      officeHours: 'Mon – Fri · 09:00 – 18:00 UTC',
      pressNote: 'Editorial enquiries and simulation dataset corrections welcome via email.',
      socialTwitter: 'https://x.com',
      socialYoutube: 'https://www.youtube.com',
      socialInstagram: 'https://instagram.com',
      updatedAt: '2026-11-12T09:00:00.000Z',
    },
    auditLogs: [
      {
        id: 'aud-01',
        actorId: 'usr-admin-01',
        actorEmail: 'david.emanoueel.gr7@gmail.com',
        action: 'Verified publishing pipeline',
        section: 'Overview',
        target: 'Control Room Initialized',
        timestamp: '2026-11-12T08:52:00.000Z',
      },
    ],
    teamOverrides: {},
    customTeams: [],
    deletedTeamIds: [],
    freeAgents: [],
    playerIdentityOverrides: {},
    deletedPlayerIdentityIds: [],
    clubRegistrations: [],
    nationalRegistrations: [],
    managers: [...seededClubManagers.managers, ...seededNationalManagers.managers],
    managerAppointments: [
      ...seededClubManagers.appointments,
      ...seededNationalManagers.appointments,
    ],
    seededClubManagersV1: true,
    seededNationalManagersV1: true,
    homepageConfig: buildDefaultHomepageConfig(),
    readingSeries: [],
    bookVolumes: [],
    mediaAssets: buildDefaultMediaAssets(),
    userLibraries: {},
  };
}

export function buildDefaultHomepageConfig(): HomepageConfig {
  return {
    sections: {
      'sec-1': { visible: true, lastUpdated: 'Nov 12, 2026' },
      'sec-2': { visible: true, lastUpdated: 'Nov 12, 2026' },
      'sec-3': { visible: true, lastUpdated: 'Nov 12, 2026' },
      'sec-4': { visible: true, lastUpdated: 'Nov 12, 2026' },
      'sec-5': { visible: true, lastUpdated: 'Nov 12, 2026' },
      'sec-6': { visible: true, lastUpdated: 'Nov 12, 2026' },
      'sec-8': { visible: true, lastUpdated: 'Nov 12, 2026' },
      'sec-9': { visible: true, lastUpdated: 'Nov 12, 2026' },
      'sec-10': { visible: true, lastUpdated: 'Nov 12, 2026' },
    },
    announcements: [INITIAL_ANNOUNCEMENT],
    hero: {
      headline: DEFAULT_HERO_COPY.headline,
      subtext: DEFAULT_HERO_COPY.subtext,
      primaryBtnText: 'Explore Reads',
      primaryBtnUrl: 'reads',
      secondaryBtnText: 'Enter Match Centre',
      secondaryBtnUrl: 'match-centre',
      backgroundImage: OFFICIAL_ASSETS.heroStadium,
      overlayIntensity: 75,
      visible: true,
    },
    welcome: {
      heading: DEFAULT_WELCOME_COPY.heading,
      subheading: DEFAULT_WELCOME_COPY.subheading,
      paragraphs: [...DEFAULT_WELCOME_COPY.paragraphs],
      tagline: DEFAULT_WELCOME_COPY.tagline,
      signoff: DEFAULT_WELCOME_COPY.signoff,
      emblemUrl: OFFICIAL_ASSETS.emblem,
      visible: true,
    },
    accessCards: {
      readsHeading: 'EXPLORE READS',
      readsDesc: DEFAULT_ACCESS_CARDS_COPY.readsDesc,
      readsImage: OFFICIAL_ASSETS.readsCardCover,
      readsBtnText: 'EXPLORE READS',
      matchHeading: 'ENTER MATCH CENTRE',
      matchDesc: DEFAULT_ACCESS_CARDS_COPY.matchDesc,
      matchImage: OFFICIAL_ASSETS.matchCentreCardVisual,
      matchBtnText: 'ENTER MATCH CENTRE',
      visible: true,
    },
    featuredReads: {
      featuredSeriesIds: [],
      displayCount: 3,
      autoLatest: true,
      visible: true,
    },
    newsletter: {
      headline: 'STAY CONNECTED WITH THE GAME.',
      description:
        'Stay up to date with DodaEona F.C. Receive the latest announcements, new reading releases, platform updates, and exciting football experiences directly in your inbox.',
      btnText: 'SUBSCRIBE NOW',
      consentText: 'I agree to receive official DodaEona F.C. newsletter updates and announcements.',
      successMessage:
        "YOU'RE ON THE LIST! Thank you for subscribing to DodaEona F.C. Keep an eye on your inbox for our latest updates.",
      visible: true,
    },
    finalCta: {
      headline: 'YOUR FOOTBALL WORLD STARTS HERE.',
      message:
        'Explore the game beyond the pitch. Discover new knowledge, experience football simulations, challenge yourself, and become part of the DodaEona F.C. community.',
      primaryBtnText: 'EXPLORE READS',
      primaryBtnUrl: 'reads',
      secondaryBtnText: 'ENTER MATCH CENTRE',
      secondaryBtnUrl: 'match-centre',
      visible: true,
    },
    footer: {
      description:
        "The club's own press: numbered series and complete PDF editions, published to read and keep.",
      tagline: 'Books · Match Centre · The Beautiful Game Unfolds',
      socialTwitter: 'https://x.com',
      socialYoutube: 'https://www.youtube.com',
      socialInstagram: 'https://instagram.com',
      visible: true,
    },
  };
}

export function buildFeaturedMusicTracks(): MusicTrackRecord[] {
  return [
    {
      id: 'track-featured-01',
      title: 'DodaEona F.C. Official Anthem',
      artist: 'DodaEona F.C.',
      sourceType: 'audio-url',
      audioUrl: '/assets/aistudio/DodaEona_F.C._Official_Anthem_ffd41d7c.mp3',
      category: 'Club Anthem',
      description: 'Official DodaEona F.C. club anthem.',
      waveformColor: '#7ADBF0',
      durationLabel: '5:02',
      enabled: true,
      isDefault: true,
      featured: true,
      createdAt: '2026-11-13T11:00:00.000Z',
    },
    {
      id: 'track-featured-02',
      title: 'DodaEona F.C. Anthem 2.0',
      artist: 'DodaEona F.C.',
      sourceType: 'audio-url',
      audioUrl: '/assets/aistudio/DodaEona_F.C._Anthem_2.0_-_usesuno.com_d26695b1.mp3',
      category: 'Club Anthem',
      description: 'One dream, one heart, one name — DodaEona F.C.',
      waveformColor: '#D6B56E',
      durationLabel: '5:03',
      enabled: true,
      isDefault: false,
      featured: true,
      createdAt: '2026-11-13T11:00:00.000Z',
    },
    {
      id: 'track-featured-03',
      title: 'DodaEona Anthem 2.1',
      artist: 'DodaEona F.C.',
      sourceType: 'audio-url',
      audioUrl: '/assets/aistudio/Beyond_the_Final_Whistle_-_usesuno.com_2d5d5c3f.mp3',
      category: 'Club Anthem',
      description: 'Beyond the Final Whistle — DodaEona F.C. anthem 2.1.',
      waveformColor: '#34D399',
      durationLabel: '6:00',
      enabled: true,
      isDefault: false,
      featured: true,
      createdAt: '2026-11-17T15:30:00.000Z',
    },
  ];
}

export function buildDefaultMediaAssets(): MediaAsset[] {
  return [
    {
      id: 'media-01',
      name: 'Official DodaEona F.C. Crest (V2)',
      filename: 'DodaEona_F.C._V2_Fill_Color_8c96db06.png',
      url: OFFICIAL_ASSETS.emblem,
      fileType: 'PNG',
      fileSize: '482 KB',
      usedIn: ['Main Navigation', 'Welcome Message', 'Footer', 'Owner Dashboard'],
      uploadedAt: 'Nov 12, 2026',
    },
    {
      id: 'media-02',
      name: 'DodaEona F.C. Crest & Diagonal Hero Banner',
      filename: '95a4ee59-ba39-498b-b23b-e3ef8ee664d8_19fd8586.png',
      url: OFFICIAL_ASSETS.heroStadium,
      fileType: 'PNG',
      fileSize: '1.8 MB',
      usedIn: ['Cinematic Hero Background'],
      uploadedAt: 'Nov 12, 2026',
    },
    {
      id: 'media-03',
      name: 'Editorial Football Archive Library (Explore Reads)',
      filename: 'reads_library_editorial_1794906192650.jpg',
      url: OFFICIAL_ASSETS.readsCardCover,
      fileType: 'JPG',
      fileSize: '767 KB',
      usedIn: ['Reads Access Card', 'Reads Hero Backdrop'],
      uploadedAt: 'Nov 17, 2026',
    },
    {
      id: 'media-04',
      name: 'Floodlit Stadium Match Arena (Enter Match Centre)',
      filename: 'match_arena_floodlights_1794906194111.jpg',
      url: OFFICIAL_ASSETS.matchCentreCardVisual,
      fileType: 'JPG',
      fileSize: '973 KB',
      usedIn: ['Match Centre Access Card'],
      uploadedAt: 'Nov 17, 2026',
    },
  ];
}

export function sortAnnouncementsNewestFirst(
  list: ServerDatabase['announcements']
): ServerDatabase['announcements'] {
  return [...list].sort((a, b) => {
    const dateA = Date.parse(a.date || '');
    const dateB = Date.parse(b.date || '');
    if (!Number.isNaN(dateA) && !Number.isNaN(dateB) && dateB !== dateA) {
      return dateB - dateA;
    }
    const updA = Date.parse(a.createdAt || a.updatedAt || '');
    const updB = Date.parse(b.createdAt || b.updatedAt || '');
    if (!Number.isNaN(updA) && !Number.isNaN(updB) && updB !== updA) {
      return updB - updA;
    }
    return 0;
  });
}

export function deduplicateSubscribers(
  list: ServerDatabase['newsletterSubscribers']
): ServerDatabase['newsletterSubscribers'] {
  const seen = new Set<string>();
  const result: ServerDatabase['newsletterSubscribers'] = [];
  for (const item of list || []) {
    const cleanEmail = String(item?.email || '').trim().toLowerCase();
    if (!cleanEmail || seen.has(cleanEmail)) continue;
    seen.add(cleanEmail);
    result.push({
      id: item.id || `sub-${cleanEmail}`,
      email: cleanEmail,
      subscribedAt: item.subscribedAt || new Date().toISOString(),
    });
  }
  return result;
}

let cachedDb: ServerDatabase | null = null;
let dbRevision = 0;

export function getDbRevision(): number {
  return dbRevision;
}

export function bumpDbRevision(): number {
  dbRevision += 1;
  return dbRevision;
}

export function getDb(): ServerDatabase {
  if (cachedDb) return cachedDb;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<ServerDatabase>;
      const seeded = buildSeedDatabase();
      const rawAnnouncements = Array.isArray(parsed.announcements)
        ? parsed.announcements
        : seeded.announcements;
      const normalizedAnnouncements = rawAnnouncements.map((a) => ({
        ...a,
        showBanner: typeof a.showBanner === 'boolean' ? a.showBanner : a.id === 'ann-01',
        ctaUrl: a.ctaUrl || a.ctaDest || undefined,
        ctaDest: a.ctaDest || a.ctaUrl || undefined,
        createdAt: a.createdAt || a.updatedAt || new Date().toISOString(),
      }));
      const rawSubscribers = Array.isArray(parsed.newsletterSubscribers)
        ? parsed.newsletterSubscribers
        : seeded.newsletterSubscribers;
      cachedDb = {
        ...seeded,
        ...parsed,
        homepageConfig: parsed.homepageConfig
          ? {
              ...seeded.homepageConfig,
              ...parsed.homepageConfig,
              sections: {
                ...seeded.homepageConfig.sections,
                ...(parsed.homepageConfig.sections || {}),
              },
              hero: { ...seeded.homepageConfig.hero, ...(parsed.homepageConfig.hero || {}) },
              welcome: {
                ...seeded.homepageConfig.welcome,
                ...(parsed.homepageConfig.welcome || {}),
              },
              accessCards: {
                ...seeded.homepageConfig.accessCards,
                ...(parsed.homepageConfig.accessCards || {}),
                readsDesc: resolveAccessCardDesc(parsed.homepageConfig.accessCards?.readsDesc, 'reads'),
                matchDesc: resolveAccessCardDesc(parsed.homepageConfig.accessCards?.matchDesc, 'match'),
                readsImage: resolveAccessCardImageUrl(parsed.homepageConfig.accessCards?.readsImage, 'reads'),
                matchImage: resolveAccessCardImageUrl(parsed.homepageConfig.accessCards?.matchImage, 'match'),
              },
              featuredReads: {
                ...seeded.homepageConfig.featuredReads,
                ...(parsed.homepageConfig.featuredReads || {}),
              },
              newsletter: {
                ...seeded.homepageConfig.newsletter,
                ...(parsed.homepageConfig.newsletter || {}),
              },
              finalCta: {
                ...seeded.homepageConfig.finalCta,
                ...(parsed.homepageConfig.finalCta || {})
              },
              footer: { ...seeded.homepageConfig.footer, ...(parsed.homepageConfig.footer || {}) },
            }
          : seeded.homepageConfig,
        readingSeries:
          Array.isArray(parsed.readingSeries)
            ? parsed.readingSeries
            : seeded.readingSeries,
        bookVolumes:
          Array.isArray(parsed.bookVolumes)
            ? parsed.bookVolumes
            : seeded.bookVolumes,
        mediaAssets:
          Array.isArray(parsed.mediaAssets) && parsed.mediaAssets.length > 0
            ? parsed.mediaAssets
            : seeded.mediaAssets,
        userLibraries: parsed.userLibraries || {},
        deletedMusicTrackIds: Array.isArray(parsed.deletedMusicTrackIds)
          ? parsed.deletedMusicTrackIds
          : [],
        musicTracks: (() => {
          const existing = (Array.isArray(parsed.musicTracks)
            ? parsed.musicTracks
            : seeded.musicTracks
          ).map((t) =>
            t.audioUrl === '/assets/aistudio/Beyond_the_Final_Whistle_-_usesuno.com_2d5d5c3f.wav'
              ? { ...t, audioUrl: '/assets/aistudio/Beyond_the_Final_Whistle_-_usesuno.com_2d5d5c3f.mp3' }
              : t
          );
          const deletedIds = new Set<string>(
            Array.isArray(parsed.deletedMusicTrackIds) ? parsed.deletedMusicTrackIds : []
          );
          const existingIds = new Set(existing.map((t: { id?: string }) => t.id));
          const missingSeeded = seeded.musicTracks.filter(
            (t) => !existingIds.has(t.id) && !deletedIds.has(t.id)
          );
          return [...existing, ...missingSeeded];
        })(),
        announcements: normalizedAnnouncements,
        newsletterSubscribers: deduplicateSubscribers(rawSubscribers),
        branding: {
          ...seeded.branding,
          ...(parsed.branding || {}),
          dark: { ...seeded.branding.dark, ...(parsed.branding?.dark || {}) },
          light: { ...seeded.branding.light, ...(parsed.branding?.light || {}) },
        },
        aboutLegal: { ...seeded.aboutLegal, ...(parsed.aboutLegal || {}) },
        contactInfo: { ...seeded.contactInfo, ...(parsed.contactInfo || {}) },
        playerIdentityOverrides: parsed.playerIdentityOverrides || {},
        deletedPlayerIdentityIds: Array.isArray(parsed.deletedPlayerIdentityIds)
          ? parsed.deletedPlayerIdentityIds
          : [],
        clubRegistrations: Array.isArray(parsed.clubRegistrations) ? parsed.clubRegistrations : [],
        nationalRegistrations: Array.isArray(parsed.nationalRegistrations)
          ? parsed.nationalRegistrations
          : [],
        managers: Array.isArray(parsed.managers) ? parsed.managers : [],
        managerAppointments: Array.isArray(parsed.managerAppointments)
          ? parsed.managerAppointments
          : [],
        seededClubManagersV1: Boolean(parsed.seededClubManagersV1),
        seededNationalManagersV1: Boolean(parsed.seededNationalManagersV1),
        competitions:
          Array.isArray(parsed.competitions) && parsed.competitions.length > 0
            ? parsed.competitions
            : seeded.competitions,
        competitionMakers: Array.isArray(parsed.competitionMakers)
          ? parsed.competitionMakers
          : seeded.competitionMakers,
        competitionTrophies:
          Array.isArray(parsed.competitionTrophies) && parsed.competitionTrophies.length > 0
            ? parsed.competitionTrophies
            : seeded.competitionTrophies,
        hallOfFame: Array.isArray(parsed.hallOfFame) ? parsed.hallOfFame : seeded.hallOfFame,

      };
      let dirtyDb = false;
      if (!cachedDb.seededClubManagersV1) {
        const clubSeeded = buildSeededClubManagers(CLUB_TEAMS_DATABASE);
        const existingManagerIds = new Set(cachedDb.managers.map((m) => m.id));
        const existingCurrentTeamIds = new Set(
          cachedDb.managerAppointments
            .filter((a) => a.is_current)
            .map((a) => a.team_id)
        );
        for (const mgr of clubSeeded.managers) {
          if (!existingManagerIds.has(mgr.id)) {
            cachedDb.managers.push(mgr);
            existingManagerIds.add(mgr.id);
          }
        }
        const existingApptIds = new Set(cachedDb.managerAppointments.map((a) => a.id));
        for (const appt of clubSeeded.appointments) {
          const override = cachedDb.teamOverrides?.[appt.team_id];
          const clearedByAdmin = override && override.manager === '';
          if (
            !existingCurrentTeamIds.has(appt.team_id) &&
            !existingApptIds.has(appt.id) &&
            !clearedByAdmin
          ) {
            cachedDb.managerAppointments.push(appt);
            existingCurrentTeamIds.add(appt.team_id);
            existingApptIds.add(appt.id);
          }
        }
        cachedDb.seededClubManagersV1 = true;
        dirtyDb = true;
      }
      if (!cachedDb.seededNationalManagersV1) {
        const nationalSeeded = buildSeededNationalManagers(
          NATIONAL_TEAMS_DATABASE,
          cachedDb.managers
        );
        const existingManagerIds = new Set(cachedDb.managers.map((m) => m.id));
        const existingCurrentTeamIds = new Set(
          cachedDb.managerAppointments
            .filter((a) => a.is_current)
            .map((a) => a.team_id)
        );
        for (const mgr of nationalSeeded.managers) {
          if (!existingManagerIds.has(mgr.id)) {
            cachedDb.managers.push(mgr);
            existingManagerIds.add(mgr.id);
          }
        }
        const existingApptIds = new Set(cachedDb.managerAppointments.map((a) => a.id));
        for (const appt of nationalSeeded.appointments) {
          const override = cachedDb.teamOverrides?.[appt.team_id];
          const clearedByAdmin = override && override.manager === '';
          if (
            !existingCurrentTeamIds.has(appt.team_id) &&
            !existingApptIds.has(appt.id) &&
            !clearedByAdmin
          ) {
            cachedDb.managerAppointments.push(appt);
            existingCurrentTeamIds.add(appt.team_id);
            existingApptIds.add(appt.id);
          }
        }
        cachedDb.seededNationalManagersV1 = true;
        dirtyDb = true;
      }
      if (!cachedDb.seededVerifiedDobsV1) {
        for (const mgr of cachedDb.managers) {
          if (!mgr.date_of_birth || !mgr.date_of_birth.trim()) {
            const verifiedDob = getVerifiedManagerDob(mgr.id, mgr.name, mgr.nationality);
            if (verifiedDob) {
              mgr.date_of_birth = verifiedDob;
            }
          }
        }
        if (Array.isArray(cachedDb.freeAgents)) {
          for (const fa of cachedDb.freeAgents) {
            if (!fa.dateOfBirth || !fa.dateOfBirth.trim()) {
              const verifiedFaDob = getVerifiedPlayerDob(fa.id);
              if (verifiedFaDob) {
                fa.dateOfBirth = verifiedFaDob;
              }
            }
          }
        }
        cachedDb.seededVerifiedDobsV1 = true;
        dirtyDb = true;
      }
      // Prune orphaned seeded national appointments & managers whose teams were removed (< 11 players)
      const validTeamIds = new Set<string>([
        ...TEAMS_DATABASE.map((t) => t.id),
        ...((cachedDb.customTeams || []) as Array<{ id?: string }>).map((t) => String(t?.id || '')).filter(Boolean),
      ]);
      const beforeApptCount = cachedDb.managerAppointments.length;
      const prunedAppts = cachedDb.managerAppointments.filter(
        (a) => !(String(a.id || '').startsWith('appt-nat-') && !validTeamIds.has(a.team_id))
      );
      if (prunedAppts.length !== beforeApptCount) {
        cachedDb.managerAppointments = prunedAppts;
        const remainingApptManagerIds = new Set(prunedAppts.map((a) => a.manager_id));
        cachedDb.managers = cachedDb.managers.filter(
          (m) => !(String(m.id || '').startsWith('mgr-nat-') && !remainingApptManagerIds.has(m.id))
        );
        dirtyDb = true;
      }
      if (dirtyDb) {
        saveDb(cachedDb, { skipCloudSync: true });
      }
      return cachedDb;
    }
  } catch (err) {
    console.warn('Initializing fresh server database:', err);
  }
  cachedDb = buildSeedDatabase();
  saveDb(cachedDb, { skipCloudSync: true });
  return cachedDb;
}

let cachedSeedTemplate: ServerDatabase | null = null;
export function getSeedTemplate(): ServerDatabase {
  if (!cachedSeedTemplate) {
    cachedSeedTemplate = buildSeedDatabase();
  }
  return cachedSeedTemplate;
}

export function saveDb(db: ServerDatabase, options?: { skipCloudSync?: boolean }): void {
  cachedDb = db;
  dbRevision += 1;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tmp, DB_FILE);
  } catch (err) {
    console.error('Failed persisting server DB:', err);
  }
  if (!options?.skipCloudSync) {
    scheduleFirestoreSync(db, getSeedTemplate());
  }
}

export function appendAudit(
  db: ServerDatabase,
  actor: { id: string; email: string },
  action: string,
  section: string,
  target: string
): void {
  const entry: AuditLogEntry = {
    id: `aud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    actorId: actor.id,
    actorEmail: actor.email,
    action,
    section,
    target,
    timestamp: new Date().toISOString(),
  };
  db.auditLogs = [entry, ...db.auditLogs].slice(0, 200);
}

export function appendUserActivity(
  db: ServerDatabase,
  entry: Omit<ActivityEventRecord, 'id' | 'timestamp'>
): void {
  const item: ActivityEventRecord = {
    ...entry,
    id: `uact-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  db.activityLogs = [item, ...db.activityLogs].slice(0, 300);
}

export function buildDefaultCompetitions(nowIso: string): CompetitionRecord[] {
  return [
    {
      id: 'comp-ucl',
      name: 'UEFA Champions League',
      country: 'Europe',
      season: '2026/27',
      type: 'champions-league',
      status: 'published',
      teamsCount: 36,
      matchesPlayed: 0,
      standings: [],
      fixtures: [
        {
          id: 'ucl-qf-1-leg2',
          competitionId: 'comp-ucl',
          round: 'Quarter-Final · 2nd Leg',
          homeTeamId: 'fc27-1',
          awayTeamId: 'fc27-2',
          isKnockout: true,
          isTwoLegged: true,
          legNumber: 2,
          firstLegHomeGoals: 1,
          firstLegAwayGoals: 2,
          settled: false,
        },
        {
          id: 'ucl-qf-2-leg2',
          competitionId: 'comp-ucl',
          round: 'Quarter-Final · 2nd Leg',
          homeTeamId: 'fc27-4',
          awayTeamId: 'fc27-5',
          isKnockout: true,
          isTwoLegged: true,
          legNumber: 2,
          firstLegHomeGoals: 2,
          firstLegAwayGoals: 2,
          settled: false,
        },
        {
          id: 'ucl-sf-1-leg1',
          competitionId: 'comp-ucl',
          round: 'Semi-Final · 1st Leg',
          homeTeamId: 'fc27-6',
          awayTeamId: 'fc27-8',
          isKnockout: true,
          isTwoLegged: true,
          legNumber: 1,
          settled: false,
        },
        {
          id: 'ucl-final',
          competitionId: 'comp-ucl',
          round: 'Final · Single Leg',
          homeTeamId: 'fc27-1',
          awayTeamId: 'fc27-4',
          isKnockout: true,
          isTwoLegged: false,
          legNumber: 1,
          settled: false,
        },
      ],
      updatedAt: nowIso,
    },
    {
      id: 'comp-epl',
      name: 'Premier League',
      country: 'England',
      season: '2026/27',
      type: 'league',
      status: 'published',
      teamsCount: 20,
      matchesPlayed: 0,
      standings: [],
      fixtures: [
        {
          id: 'epl-mw29-1',
          competitionId: 'comp-epl',
          round: 'Matchweek 29',
          homeTeamId: 'fc27-2',
          awayTeamId: 'fc27-6',
          isKnockout: false,
          isTwoLegged: false,
          legNumber: 1,
          settled: false,
        },
        {
          id: 'epl-mw29-2',
          competitionId: 'comp-epl',
          round: 'Matchweek 29',
          homeTeamId: 'fc27-8',
          awayTeamId: 'fc27-2',
          isKnockout: false,
          isTwoLegged: false,
          legNumber: 1,
          settled: false,
        },
      ],
      updatedAt: nowIso,
    },
    {
      id: 'comp-intl-club',
      name: 'DodaEona Global Club Cup',
      country: 'International',
      season: '2026/27',
      type: 'cup',
      status: 'published',
      teamsCount: 16,
      matchesPlayed: 0,
      standings: [],
      fixtures: [
        {
          id: 'clubcup-sf-1',
          competitionId: 'comp-intl-club',
          round: 'Knockout Semi-Final',
          homeTeamId: 'fc27-4',
          awayTeamId: 'fc27-2',
          isKnockout: true,
          isTwoLegged: false,
          legNumber: 1,
          settled: false,
        },
      ],
      updatedAt: nowIso,
    },
    {
      id: 'comp-world-intl',
      name: 'International Nations Cup',
      country: 'World',
      season: '2026',
      type: 'international',
      status: 'published',
      teamsCount: 48,
      matchesPlayed: 0,
      standings: [],
      fixtures: [],
      updatedAt: nowIso,
    },
  ];
}
