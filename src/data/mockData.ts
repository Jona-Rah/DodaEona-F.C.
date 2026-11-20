import { Announcement, ReadingSeries, Volume } from '../types/homepage';

export const OFFICIAL_ASSETS = {
  emblem: '/assets/aistudio/DodaEona_F.C._V2_Fill_Color_8c96db06.png',
  heroStadium: '/assets/aistudio/95a4ee59-ba39-498b-b23b-e3ef8ee664d8_19fd8586.png',
  readsCardCover: '/src/assets/images/reads_library_editorial_1794906192650.jpg',
  matchCentreCardVisual: '/src/assets/images/match_arena_floodlights_1794906194111.jpg',
  seriesTactics: '/src/assets/images/series_tactics_cover_1794502248020.jpg',
  seriesLegends: '/src/assets/images/series_legends_cover_1794502249467.jpg',
  seriesAcademy: '/src/assets/images/series_evolution_cover_1794502249567.jpg',
};

export const LEGACY_ACCESS_CARD_IMAGES = {
  reads: '/src/assets/images/reads_card_cover_1794502247393.jpg',
  match: '/src/assets/images/match_centre_card_1794502247492.jpg',
} as const;

export function resolveAccessCardImageUrl(
  url: string | undefined | null,
  kind: 'reads' | 'match'
): string {
  const trimmed = String(url || '').trim();
  if (kind === 'reads') {
    if (!trimmed || trimmed === LEGACY_ACCESS_CARD_IMAGES.reads) {
      return OFFICIAL_ASSETS.readsCardCover;
    }
    return trimmed;
  }
  if (!trimmed || trimmed === LEGACY_ACCESS_CARD_IMAGES.match) {
    return OFFICIAL_ASSETS.matchCentreCardVisual;
  }
  return trimmed;
}

export const DEFAULT_ACCESS_CARDS_COPY = {
  readsDesc:
    'Explore numbered football book series, club history, tactical stories, and complete editions inside our interactive reader. Save favourites to My Library, track progress, and download full PDFs.',
  matchDesc:
    'Simulate matches across 1,021+ clubs and national teams with Gemini AI broadcast commentary and Live Voice Studio. Explore Managers, Football World 3D, Interactive ScoreBoard, Tournament Maker, and Quiz Centre.',
} as const;

export const LEGACY_ACCESS_CARD_DESCRIPTIONS = {
  reads:
    'Discover the beautiful game through football books, educational content, fascinating stories, activities, and exclusive reading series. Learn more about football, explore its history, and expand your knowledge.',
  match:
    'Experience football through interactive match simulations. Create matches, select your teams, build your squads, choose formations and tactics, and follow every moment of the action.',
} as const;

export function resolveAccessCardDesc(
  desc: string | undefined | null,
  kind: 'reads' | 'match'
): string {
  const trimmed = String(desc || '').trim();
  if (kind === 'reads') {
    if (!trimmed || trimmed === LEGACY_ACCESS_CARD_DESCRIPTIONS.reads) {
      return DEFAULT_ACCESS_CARDS_COPY.readsDesc;
    }
    return trimmed;
  }
  if (!trimmed || trimmed === LEGACY_ACCESS_CARD_DESCRIPTIONS.match) {
    return DEFAULT_ACCESS_CARDS_COPY.matchDesc;
  }
  return trimmed;
}

export const INITIAL_ANNOUNCEMENT: Announcement = {
  id: 'announcement-01',
  badge: 'PLATFORM UPDATE',
  title: 'Match Centre Simulation Engine Active',
  message: 'The new knockout match simulator and competition database are now fully synchronized with club and national team rosters.',
  active: true,
  actionText: 'Experience Simulation',
  actionUrl: 'match-centre',
  date: 'November 2026',
};

export const DEFAULT_HERO_COPY = {
  headline: 'MORE THAN A GAME. A WHOLE FOOTBALL WORLD.',
  subtext: 'Uniting football literature, tactical masterclasses, and an advanced simulation engine. Step into the premier digital ecosystem built for dedicated football minds.',
};

export const DEFAULT_WELCOME_COPY = {
  heading: 'WELCOME TO DODAEONA F.C.',
  subheading: 'Where Football Becomes More Than a Game.',
  paragraphs: [
    'Welcome to DodaEona F.C., a world built for everyone who shares a passion for football.',
    'Discover the beautiful game through knowledge, creativity, competition, and innovation. Explore our football reading library, challenge yourself with interactive quizzes, experience exciting match simulations, follow the world’s greatest clubs and national teams, and uncover the stories, statistics, and moments that make football extraordinary.',
    'Whether you are here to learn, compete, explore, or simply enjoy the game, there is always something new waiting for you.',
  ],
  tagline: 'One Passion. Countless Stories. One Football World.',
  signoff: 'Welcome to DodaEona F.C.',
};

export const FEATURED_SERIES: ReadingSeries[] = [];

export const LATEST_VOLUMES: Volume[] = [];
