import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { HomepageConfig, ActivityLogItem, MediaAsset, HomepageSectionMeta } from '../types/admin';
import { Announcement } from '../types/homepage';
import {
  OFFICIAL_ASSETS,
  INITIAL_ANNOUNCEMENT,
  DEFAULT_ACCESS_CARDS_COPY,
  DEFAULT_HERO_COPY,
  DEFAULT_WELCOME_COPY,
  resolveAccessCardDesc,
  resolveAccessCardImageUrl,
} from '../data/mockData';
import { getStoredSessionToken, useAuth } from './AuthContext';
import { buildAuthorizedHeaders } from '../services/firestorePersistence';

export const HOMEPAGE_SECTIONS_INDEX: HomepageSectionMeta[] = [
  { id: 'sec-1', key: 'navigation', order: 1, name: 'Main Navigation & Branding', description: 'Primary header bar, emblem, wordmark, and 6 core navigation items in strict sequence.', status: 'published', visible: true, lastUpdated: 'Nov 12, 2026' },
  { id: 'sec-2', key: 'announcement', order: 2, name: 'Administrative Announcement Banner', description: 'Permanent top broadcast bar directly beneath navigation, managed exclusively by Owner.', status: 'published', visible: true, lastUpdated: 'Nov 12, 2026' },
  { id: 'sec-3', key: 'hero', order: 3, name: 'Cinematic Hero Section', description: 'High-impact panoramic stadium atmosphere with primary and secondary call-to-action buttons.', status: 'published', visible: true, lastUpdated: 'Nov 12, 2026' },
  { id: 'sec-4', key: 'welcome', order: 4, name: 'Welcome Message', description: 'Centered vertical layout with official emblem, confirmed greeting, and closing tagline.', status: 'published', visible: true, lastUpdated: 'Nov 12, 2026' },
  { id: 'sec-5', key: 'access-cards', order: 5, name: 'Access Points to Reads & Match Centre', description: 'Two equally weighted, side-by-side flagship gateway cards with interactive feedback.', status: 'published', visible: true, lastUpdated: 'Nov 12, 2026' },
  { id: 'sec-6', key: 'featured-reads', order: 6, name: 'Featured Reading Series & Latest Volumes', description: 'Curated 3-series carousel and 4-volume latest publications grid connected to Reads database.', status: 'published', visible: true, lastUpdated: 'Nov 12, 2026' },
  { id: 'sec-8', key: 'newsletter', order: 7, name: 'Newsletter Section', description: 'Clean subscription container with email validation and user consent handling.', status: 'published', visible: true, lastUpdated: 'Nov 12, 2026' },
  { id: 'sec-9', key: 'final-cta', order: 8, name: 'Final Call-to-Action Section', description: 'Intimate evening floodlight invitation before footer with dual action buttons.', status: 'published', visible: true, lastUpdated: 'Nov 12, 2026' },
  { id: 'sec-10', key: 'footer', order: 9, name: 'Footer and Supporting Navigation', description: 'Four categorized columns, official branding, dynamic copyright, and legal links.', status: 'published', visible: true, lastUpdated: 'Nov 12, 2026' },
];

export const INITIAL_HOMEPAGE_CONFIG: HomepageConfig = {
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
    description: 'Stay up to date with DodaEona F.C. Receive the latest announcements, new reading releases, platform updates, and exciting football experiences directly in your inbox.',
    btnText: 'SUBSCRIBE NOW',
    consentText: 'I agree to receive official DodaEona F.C. newsletter updates and announcements.',
    successMessage: "YOU'RE ON THE LIST! Thank you for subscribing to DodaEona F.C. Keep an eye on your inbox for our latest updates.",
    visible: true,
  },
  finalCta: {
    headline: 'YOUR FOOTBALL WORLD STARTS HERE.',
    message: 'Explore the game beyond the pitch. Discover new knowledge, experience football simulations, challenge yourself, and become part of the DodaEona F.C. community.',
    primaryBtnText: 'EXPLORE READS',
    primaryBtnUrl: 'reads',
    secondaryBtnText: 'ENTER MATCH CENTRE',
    secondaryBtnUrl: 'match-centre',
    visible: true,
  },
  footer: {
    description: "The club's own press: numbered series and complete PDF editions, published to read and keep.",
    tagline: 'Books · Match Centre · The Beautiful Game Unfolds',
    socialTwitter: 'https://x.com',
    socialYoutube: 'https://www.youtube.com',
    socialInstagram: 'https://instagram.com',
    visible: true,
  },
};

export const INITIAL_MEDIA_ASSETS: MediaAsset[] = [
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

export const INITIAL_ACTIVITY_LOG: ActivityLogItem[] = [
  { id: 'act-01', action: 'Published Announcement', target: 'Match Centre Simulation Engine Active', timestamp: 'Today at 08:52 AM', user: 'Owner', type: 'homepage' },
  { id: 'act-04', action: 'Updated Hero Subtext', target: 'Cinematic Hero Section', timestamp: 'Today at 09:04 AM', user: 'Owner', type: 'homepage' },
  { id: 'act-05', action: 'Synced Media Asset', target: 'DodaEona_F.C._V2_Fill_Color_8c96db06.png', timestamp: 'Today at 08:21 AM', user: 'Owner', type: 'media' },
];

interface AdminContextType {
  homepageConfig: HomepageConfig;
  draftHomepageConfig: HomepageConfig;
  isDraftDirty: boolean;
  activityLog: ActivityLogItem[];
  mediaAssets: MediaAsset[];
  
  // Homepage Management Actions
  updateDraftHomepageConfig: (updater: (prev: HomepageConfig) => HomepageConfig) => void;
  saveHomepageDraft: () => void;
  publishHomepageChanges: () => Promise<boolean>;
  discardHomepageDraft: () => void;
  toggleSectionVisibility: (sectionId: string) => void;
  
  // Announcement Actions
  createAnnouncement: (ann: Omit<Announcement, 'id'>) => void;
  updateAnnouncement: (ann: Announcement) => void;
  deleteAnnouncement: (id: string) => void;
  toggleAnnouncementActive: (id: string) => void;

  // Media Library Actions
  addMediaAsset: (asset: Omit<MediaAsset, 'id' | 'uploadedAt'>) => Promise<MediaAsset | null>;
  replaceMediaAsset: (id: string, newUrl: string, newName?: string) => Promise<boolean>;
  deleteMediaAsset: (id: string) => Promise<boolean>;

  // Activity Log
  logActivity: (action: string, target: string, type: 'homepage' | 'reads' | 'media' | 'settings') => void;

  // Owner Social Links
  updateFooterYoutubeUrl: (url: string) => Promise<void>;

  // Gateway Experience Card Visuals
  updateAccessCardImage: (card: 'readsImage' | 'matchImage', imageUrl: string) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const ADMIN_STORAGE_KEYS = {
  CONFIG: 'dodaeona_admin_homepage_config_v3',
  LOG: 'dodaeona_admin_activity_log_v3',
  MEDIA: 'dodaeona_admin_media_v3',
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAdmin } = useAuth();
  // Published Homepage Config
  const [homepageConfig, setHomepageConfig] = useState<HomepageConfig>(() => {
    try {
      const cached = localStorage.getItem(ADMIN_STORAGE_KEYS.CONFIG);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.sections) {
          delete parsed.sections['sec-7'];
        }
        if (parsed?.championsLeague) {
          delete parsed.championsLeague;
        }
        if (Array.isArray(parsed?.announcements)) {
          parsed.announcements = parsed.announcements.map((a: Announcement) =>
            a.title?.toLowerCase().includes('champions league')
              ? {
                  ...a,
                  title: INITIAL_ANNOUNCEMENT.title,
                  message: INITIAL_ANNOUNCEMENT.message,
                }
              : a
          );
        }
        return {
          ...INITIAL_HOMEPAGE_CONFIG,
          ...parsed,
          accessCards: {
            ...INITIAL_HOMEPAGE_CONFIG.accessCards,
            ...(parsed?.accessCards || {}),
            readsDesc: resolveAccessCardDesc(parsed?.accessCards?.readsDesc, 'reads'),
            matchDesc: resolveAccessCardDesc(parsed?.accessCards?.matchDesc, 'match'),
            readsImage: resolveAccessCardImageUrl(parsed?.accessCards?.readsImage, 'reads'),
            matchImage: resolveAccessCardImageUrl(parsed?.accessCards?.matchImage, 'match'),
          },
          footer: {
            ...INITIAL_HOMEPAGE_CONFIG.footer,
            ...(parsed?.footer || {}),
          },
        };
      }
    } catch (e) {}
    return INITIAL_HOMEPAGE_CONFIG;
  });

  // Working Draft Homepage Config (allows preview before publishing)
  const [draftHomepageConfig, setDraftHomepageConfig] = useState<HomepageConfig>(homepageConfig);
  const [isDraftDirty, setIsDraftDirty] = useState(false);

  // Activity Log State
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>(() => {
    try {
      const cached = localStorage.getItem(ADMIN_STORAGE_KEYS.LOG);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return INITIAL_ACTIVITY_LOG;
  });

  // Media Assets State
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(() => {
    try {
      const cached = localStorage.getItem(ADMIN_STORAGE_KEYS.MEDIA);
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return INITIAL_MEDIA_ASSETS;
  });

  const fetchHomepageConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/public/homepage-config');
      if (!res.ok) return;
      const data = await res.json();
      const remoteConfig = data?.homepageConfig || data?.config;
      if (remoteConfig) {
        const normalizedAccessCards = {
          ...INITIAL_HOMEPAGE_CONFIG.accessCards,
          ...(remoteConfig.accessCards || {}),
          readsDesc: resolveAccessCardDesc(remoteConfig.accessCards?.readsDesc, 'reads'),
          matchDesc: resolveAccessCardDesc(remoteConfig.accessCards?.matchDesc, 'match'),
          readsImage: resolveAccessCardImageUrl(remoteConfig.accessCards?.readsImage, 'reads'),
          matchImage: resolveAccessCardImageUrl(remoteConfig.accessCards?.matchImage, 'match'),
        };
        setHomepageConfig((prev) => ({
          ...prev,
          ...remoteConfig,
          sections: { ...prev.sections, ...(remoteConfig.sections || {}) },
          hero: { ...prev.hero, ...(remoteConfig.hero || {}) },
          welcome: { ...prev.welcome, ...(remoteConfig.welcome || {}) },
          accessCards: normalizedAccessCards,
          featuredReads: { ...prev.featuredReads, ...(remoteConfig.featuredReads || {}) },
          newsletter: { ...prev.newsletter, ...(remoteConfig.newsletter || {}) },
          finalCta: { ...prev.finalCta, ...(remoteConfig.finalCta || {}) },
          footer: { ...prev.footer, ...(remoteConfig.footer || {}) },
        }));
        setDraftHomepageConfig((prev) => ({
          ...prev,
          ...remoteConfig,
          sections: { ...prev.sections, ...(remoteConfig.sections || {}) },
          hero: { ...prev.hero, ...(remoteConfig.hero || {}) },
          welcome: { ...prev.welcome, ...(remoteConfig.welcome || {}) },
          accessCards: normalizedAccessCards,
          featuredReads: { ...prev.featuredReads, ...(remoteConfig.featuredReads || {}) },
          newsletter: { ...prev.newsletter, ...(remoteConfig.newsletter || {}) },
          finalCta: { ...prev.finalCta, ...(remoteConfig.finalCta || {}) },
          footer: { ...prev.footer, ...(remoteConfig.footer || {}) },
        }));
      }
    } catch {}
  }, []);

  // Fetch media assets from backend
  const fetchMediaAssets = useCallback(async () => {
    try {
      const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
        'Content-Type': 'application/json',
      });
      const res = await fetch('/api/admin/media', {
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.mediaAssets)) {
          setMediaAssets(data.mediaAssets);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    void fetchHomepageConfig();
    if (isAdmin) {
      void fetchMediaAssets();
    }
    const handleReconciled = () => {
      void fetchHomepageConfig();
      if (isAdmin) {
        void fetchMediaAssets();
      }
    };
    window.addEventListener('dodaeona:cloud-reconciled', handleReconciled);
    return () => window.removeEventListener('dodaeona:cloud-reconciled', handleReconciled);
  }, [fetchHomepageConfig, fetchMediaAssets, isAdmin]);

  const storageMountFlagsRef = React.useRef<{ cfg?: boolean; log?: boolean; med?: boolean }>({});

  // Persist published config & media to localStorage for offline cache
  useEffect(() => {
    if (!storageMountFlagsRef.current.cfg) { storageMountFlagsRef.current.cfg = true; return; }
    try {
      localStorage.setItem(ADMIN_STORAGE_KEYS.CONFIG, JSON.stringify(homepageConfig));
    } catch (e) {}
  }, [homepageConfig]);

  useEffect(() => {
    if (!storageMountFlagsRef.current.log) { storageMountFlagsRef.current.log = true; return; }
    try {
      localStorage.setItem(ADMIN_STORAGE_KEYS.LOG, JSON.stringify(activityLog));
    } catch (e) {}
  }, [activityLog]);

  useEffect(() => {
    if (!storageMountFlagsRef.current.med) { storageMountFlagsRef.current.med = true; return; }
    try {
      localStorage.setItem(ADMIN_STORAGE_KEYS.MEDIA, JSON.stringify(mediaAssets));
    } catch (e) {}
  }, [mediaAssets]);

  const logActivity = (action: string, target: string, type: 'homepage' | 'reads' | 'media' | 'settings') => {
    const newItem: ActivityLogItem = {
      id: `act-${Date.now()}`,
      action,
      target,
      timestamp: 'Just now',
      user: 'Owner',
      type,
    };
    setActivityLog((prev) => [newItem, ...prev.slice(0, 30)]);
  };

  const updateDraftHomepageConfig = (updater: (prev: HomepageConfig) => HomepageConfig) => {
    setDraftHomepageConfig((prev) => {
      const next = updater(prev);
      setIsDraftDirty(true);
      return next;
    });
  };

  const saveHomepageDraft = () => {
    setIsDraftDirty(true);
    logActivity('Saved Draft', 'Homepage settings draft updated', 'homepage');
  };

  const publishHomepageChanges = async (): Promise<boolean> => {
    const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
      'Content-Type': 'application/json',
    });
    const res = await fetch('/api/admin/homepage-config', {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify(draftHomepageConfig),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Failed to permanently save homepage changes to database.');
    }
    const data = await res.json();
    const confirmed = data.config || draftHomepageConfig;
    setHomepageConfig(confirmed);
    setDraftHomepageConfig(confirmed);
    setIsDraftDirty(false);
    logActivity('Published Homepage Changes', 'All sections permanently saved to database', 'homepage');
    return true;
  };

  const discardHomepageDraft = () => {
    setDraftHomepageConfig(homepageConfig);
    setIsDraftDirty(false);
    logActivity('Discarded Draft', 'Reverted uncommitted homepage changes', 'homepage');
  };

  const toggleSectionVisibility = (sectionId: string) => {
    updateDraftHomepageConfig((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionId]: {
          ...prev.sections[sectionId],
          visible: !prev.sections[sectionId]?.visible,
          lastUpdated: 'Just now',
        },
      },
    }));
    logActivity('Toggled Section Visibility', `Section ID ${sectionId}`, 'homepage');
  };

  // Announcement Actions
  const createAnnouncement = (ann: Omit<Announcement, 'id'>) => {
    const newAnn: Announcement = {
      ...ann,
      id: `ann-${Date.now()}`,
    };
    updateDraftHomepageConfig((prev) => ({
      ...prev,
      announcements: [newAnn, ...prev.announcements],
    }));
    logActivity('Created Announcement', ann.title, 'homepage');
  };

  const updateAnnouncement = (ann: Announcement) => {
    updateDraftHomepageConfig((prev) => ({
      ...prev,
      announcements: prev.announcements.map((a) => (a.id === ann.id ? ann : a)),
    }));
    logActivity('Updated Announcement', ann.title, 'homepage');
  };

  const deleteAnnouncement = (id: string) => {
    const target = draftHomepageConfig.announcements.find((a) => a.id === id);
    updateDraftHomepageConfig((prev) => ({
      ...prev,
      announcements: prev.announcements.filter((a) => a.id !== id),
    }));
    logActivity('Deleted Announcement', target?.title || id, 'homepage');
  };

  const toggleAnnouncementActive = (id: string) => {
    updateDraftHomepageConfig((prev) => ({
      ...prev,
      announcements: prev.announcements.map((a) =>
        a.id === id ? { ...a, active: !a.active } : a
      ),
    }));
    logActivity('Toggled Announcement Active Status', id, 'homepage');
  };

  // Media Library Actions
  const addMediaAsset = async (asset: Omit<MediaAsset, 'id' | 'uploadedAt'>): Promise<MediaAsset | null> => {
    const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
      'Content-Type': 'application/json',
    });
    const res = await fetch('/api/admin/media', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(asset),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Failed to permanently store media asset in database.');
    }
    const data = await res.json();
    if (data?.asset) {
      setMediaAssets((prev) => [data.asset, ...prev.filter((m) => m.id !== data.asset.id)]);
      logActivity('Uploaded Media Asset', asset.name, 'media');
      return data.asset;
    }
    return null;
  };

  const replaceMediaAsset = async (id: string, newUrl: string, newName?: string): Promise<boolean> => {
    const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
      'Content-Type': 'application/json',
    });
    const res = await fetch(`/api/admin/media/${id}`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify({ url: newUrl, name: newName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Failed to update media asset in database.');
    }
    setMediaAssets((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, url: newUrl, name: newName || m.name, uploadedAt: 'Just now' } : m
      )
    );
    logActivity('Replaced Media Asset', id, 'media');
    return true;
  };

  const deleteMediaAsset = async (id: string): Promise<boolean> => {
    const asset = mediaAssets.find((m) => m.id === id);
    if (asset && asset.usedIn.length > 0) {
      return false;
    }
    const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
      'Content-Type': 'application/json',
    });
    const res = await fetch(`/api/admin/media/${id}`, {
      method: 'DELETE',
      credentials: 'include',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Failed to delete media asset from database.');
    }
    setMediaAssets((prev) => prev.filter((m) => m.id !== id));
    logActivity('Deleted Media Asset', asset?.name || id, 'media');
    return true;
  };

  const updateFooterYoutubeUrl = async (rawUrl: string): Promise<void> => {
    const trimmed = rawUrl.trim();
    const formatted =
      trimmed && !/^https?:\/\//i.test(trimmed) ? `https://${trimmed}` : trimmed || 'https://www.youtube.com';

    const nextFooter = { ...draftHomepageConfig.footer, socialYoutube: formatted };
    setDraftHomepageConfig((prev) => ({ ...prev, footer: nextFooter }));
    setHomepageConfig((prev) => ({ ...prev, footer: nextFooter }));

    try {
      const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
        'Content-Type': 'application/json',
      });
      await fetch('/api/admin/homepage-config', {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({ footer: nextFooter }),
      });
      logActivity('Updated YouTube Channel Link', formatted, 'settings');
    } catch (err) {
      console.error('Failed to sync YouTube link to database:', err);
    }
  };

  const updateAccessCardImage = async (
    card: 'readsImage' | 'matchImage',
    imageUrl: string
  ): Promise<void> => {
    const cleanUrl = resolveAccessCardImageUrl(
      imageUrl,
      card === 'readsImage' ? 'reads' : 'match'
    );
    const nextAccessCards = {
      ...homepageConfig.accessCards,
      [card]: cleanUrl,
    };

    const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
      'Content-Type': 'application/json',
    });
    const res = await fetch('/api/admin/homepage-config', {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify({ accessCards: nextAccessCards }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Failed to save card image to database.');
    }
    const data = await res.json().catch(() => ({}));
    const confirmedAccessCards = {
      ...nextAccessCards,
      ...(data?.config?.accessCards || {}),
      readsImage: resolveAccessCardImageUrl(
        data?.config?.accessCards?.readsImage || nextAccessCards.readsImage,
        'reads'
      ),
      matchImage: resolveAccessCardImageUrl(
        data?.config?.accessCards?.matchImage || nextAccessCards.matchImage,
        'match'
      ),
    };

    setHomepageConfig((prev) => ({ ...prev, accessCards: confirmedAccessCards }));
    setDraftHomepageConfig((prev) => ({ ...prev, accessCards: confirmedAccessCards }));
    logActivity(
      'Updated Gateway Card Image',
      card === 'readsImage' ? 'Explore Reads Card' : 'Enter Match Centre Card',
      'media'
    );
  };

  return (
    <AdminContext.Provider
      value={{
        homepageConfig,
        draftHomepageConfig,
        isDraftDirty,
        activityLog,
        mediaAssets,
        updateDraftHomepageConfig,
        saveHomepageDraft,
        publishHomepageChanges,
        discardHomepageDraft,
        toggleSectionVisibility,
        createAnnouncement,
        updateAnnouncement,
        deleteAnnouncement,
        toggleAnnouncementActive,
        addMediaAsset,
        replaceMediaAsset,
        deleteMediaAsset,
        logActivity,
        updateFooterYoutubeUrl,
        updateAccessCardImage,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
