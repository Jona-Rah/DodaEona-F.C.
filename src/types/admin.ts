import { Announcement } from './homepage';
import { ReadsCategory } from './reads';

export interface HomepageSectionMeta {
  id: string;
  key:
    | 'navigation'
    | 'announcement'
    | 'hero'
    | 'welcome'
    | 'access-cards'
    | 'featured-reads'
    | 'newsletter'
    | 'final-cta'
    | 'footer';
  order: number;
  name: string;
  description: string;
  status: 'published' | 'draft' | 'hidden';
  visible: boolean;
  lastUpdated: string;
}

export interface ActivityLogItem {
  id: string;
  action: string;
  target: string;
  timestamp: string;
  user: string;
  type: 'homepage' | 'reads' | 'media' | 'settings';
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
  announcements: Announcement[];
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

export type AdminActiveView =
  | 'overview'
  | 'homepage-manager'
  | 'reads-manager'
  | 'content-library'
  | 'media-library'
  | 'preview'
  | 'settings';
