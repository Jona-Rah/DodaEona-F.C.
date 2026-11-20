export interface Announcement {
  id: string;
  badge?: string;
  title: string;
  message: string;
  active: boolean;
  actionText?: string;
  actionUrl?: string;
  date: string;
}

export interface ReadingSeries {
  id: string;
  seriesNumber: number;
  title: string;
  description: string;
  coverUrl: string;
  volumeCount: number;
  slug: string;
}

export interface Volume {
  id: string;
  volumeNumber?: number;
  title: string;
  seriesTitle: string;
  description: string;
  coverUrl: string;
  publishedDate?: string;
  slug: string;
}

export type NavigationDestination = 
  | 'home' 
  | 'reads' 
  | 'match-centre' 
  | 'quiz' 
  | 'community' 
  | 'profile' 
  | 'about'
  | 'contact'
  | 'announcements'
  | 'leaderboard'
  | 'privacy'
  | 'terms'
  | 'series-detail'
  | 'volume-reader'
  | 'login'
  | 'my-library'
  | 'player-profile'
  | 'managers'
  | 'manager-profile'
  | 'simulation-guide'
  | 'admin';
