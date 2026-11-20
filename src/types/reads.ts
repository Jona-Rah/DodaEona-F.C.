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
  readOnline?: boolean;
  downloadEnabled: boolean;
  chapters: Chapter[];
  slug: string;
  sortOrder?: number;
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
  sortOrder?: number;
}

export type ReadsCategory =
  | 'Football Tactics and Strategy'
  | 'Football History and Culture'
  | 'Youth Academy and Player Development'
  | 'Competitions and Tournaments'
  | 'Players and Legends'
  | 'Football Rules and Regulations'
  | 'Activities and Challenges';

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
  updatedAt?: string;
}

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'visitor';
  isAuthenticated: boolean;
}
