import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { MusicTrackRecord, WebsiteBrandingConfig } from '../../server/types';
import {
  audioAtmosphere,
  SoundEffectType,
} from '../utils/audioAtmosphereEngine';
import { fetchBootstrapLite } from '../utils/bootstrapCache';

type Theme = 'dark' | 'light';
type Pillar = 'reads' | 'match-centre';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  isAudioPlaying: boolean;
  toggleAudio: () => void;
  musicVolume: number;
  setMusicVolume: (v: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  musicTracks: MusicTrackRecord[];
  activeTrack: MusicTrackRecord | null;
  selectTrack: (trackId: string) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  isPlayerOpen: boolean;
  setIsPlayerOpen: (open: boolean) => void;
  togglePlayer: () => void;
  repeatMode: 'all' | 'one' | 'off';
  toggleRepeatMode: () => void;
  isShuffle: boolean;
  toggleShuffle: () => void;
  playSoundEffect: (type: SoundEffectType) => void;
  getFrequencyData: () => Uint8Array;
  refreshBootstrapTheme: () => Promise<void>;
  branding: WebsiteBrandingConfig | null;
  applyBranding: (b: WebsiteBrandingConfig) => void;
  activePillar: Pillar;
  setActivePillar: (p: Pillar) => void;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const FALLBACK_DEFAULT_TRACKS: MusicTrackRecord[] = [
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

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('dodaeona_theme');
      if (saved === 'dark') return 'dark';
      if (saved === 'light') return 'light';
    } catch {
      // ignore
    }
    return 'light';
  });

  const [activePillar, setActivePillar] = useState<Pillar>('reads');
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [musicVolume, setMusicVolumeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('dodaeona_music_volume');
      if (saved !== null) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0 && val <= 1) return val;
      }
    } catch {
      // ignore
    }
    return 0.35;
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'all' | 'one' | 'off'>('all');
  const [isShuffle, setIsShuffle] = useState(false);

  const [globalSearch, setGlobalSearch] = useState('');
  const [branding, setBranding] = useState<WebsiteBrandingConfig | null>(null);
  const [musicTracks, setMusicTracks] = useState<MusicTrackRecord[]>(FALLBACK_DEFAULT_TRACKS);
  const [activeTrackId, setActiveTrackId] = useState<string | null>('track-featured-01');

  const repeatModeRef = useRef(repeatMode);
  repeatModeRef.current = repeatMode;
  const isShuffleRef = useRef(isShuffle);
  isShuffleRef.current = isShuffle;
  const musicTracksRef = useRef(musicTracks);
  musicTracksRef.current = musicTracks;

  useEffect(() => {
    audioAtmosphere.setLoop(repeatMode === 'one');
  }, [repeatMode]);

  const applyCssVariables = useCallback(
    (b: WebsiteBrandingConfig | null, currentTheme: Theme) => {
      if (!b) return;
      const root = document.documentElement;
      const palette = currentTheme === 'dark' ? b.dark : b.light;
      root.style.setProperty('--bg-primary', palette.bgPrimary);
      root.style.setProperty('--bg-surface', palette.bgSurface);
      root.style.setProperty('--bg-elevated', palette.bgElevated);
      root.style.setProperty('--bg-surface-elevated', palette.bgElevated);
      root.style.setProperty('--accent-cyan', palette.accentCyan);
      root.style.setProperty('--accent-gold', palette.accentCyan);
      root.style.setProperty('--accent-sky', palette.accentCyan);
      root.style.setProperty('--accent-crest', palette.accentCrest);
      root.style.setProperty('--text-primary', palette.textPrimary);
    },
    []
  );

  const themeRef = useRef(theme);
  themeRef.current = theme;

  const refreshBootstrapTheme = useCallback(async (forceRefresh = false) => {
    try {
      const data = await fetchBootstrapLite(forceRefresh);
      if (!data) return;
      if (data?.branding) {
        setBranding(data.branding);
        applyCssVariables(data.branding, themeRef.current);
      }
      if (Array.isArray(data?.musicTracks)) {
        setMusicTracks(data.musicTracks);
        if (data.musicTracks.length === 0) {
          setActiveTrackId(null);
          audioAtmosphere.stop();
          setIsAudioPlaying(false);
        } else {
          setActiveTrackId((prev) => {
            if (prev && data.musicTracks.some((t: MusicTrackRecord) => t.id === prev)) return prev;
            const def =
              data.musicTracks.find((t: MusicTrackRecord) => t.isDefault) || data.musicTracks[0];
            return def?.id || data.musicTracks[0].id;
          });
        }
      }
    } catch {
      // keep current state
    }
  }, [applyCssVariables]);

  useEffect(() => {
    void refreshBootstrapTheme(false);
    const handleBrandingUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ branding?: WebsiteBrandingConfig }>).detail;
      if (detail?.branding) {
        setBranding(detail.branding);
        applyCssVariables(detail.branding, themeRef.current);
      } else {
        void refreshBootstrapTheme(true);
      }
    };
    const handleCloudReconciled = () => {
      void refreshBootstrapTheme(true);
    };
    window.addEventListener('dodaeona:branding-updated', handleBrandingUpdated);
    window.addEventListener('dodaeona:cloud-reconciled', handleCloudReconciled);
    return () => {
      window.removeEventListener('dodaeona:branding-updated', handleBrandingUpdated);
      window.removeEventListener('dodaeona:cloud-reconciled', handleCloudReconciled);
    };
  }, [refreshBootstrapTheme, applyCssVariables]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.style.colorScheme = 'light';
    }
    applyCssVariables(branding, theme);
    try {
      localStorage.setItem('dodaeona_theme', theme);
    } catch {
      // ignore
    }
  }, [theme, branding, applyCssVariables]);

  const applyBranding = (b: WebsiteBrandingConfig) => {
    setBranding(b);
    applyCssVariables(b, theme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (t: Theme) => {
    setThemeState(t);
  };

  // Active track selection
  const activeTrack =
    musicTracks.find((t) => t.id === activeTrackId) || musicTracks[0] || null;

  const playCurrentTrack = useCallback(
    (track: MusicTrackRecord | null) => {
      if (!track) return;
      audioAtmosphere.setVolume(musicVolume);
      audioAtmosphere.setMute(isMuted);

      if ((track.sourceType === 'audio-url' || track.sourceType === 'uploaded') && track.audioUrl) {
        audioAtmosphere.playAudioUrl(
          track.audioUrl,
          () => {
            const currentRepeat = repeatModeRef.current;
            const currentTracks = musicTracksRef.current;
            if (currentRepeat === 'one') {
              playCurrentTrack(track);
            } else if (currentRepeat === 'all' && currentTracks.length > 0) {
              let nextIdx = 0;
              if (isShuffleRef.current && currentTracks.length > 1) {
                const candidates = currentTracks.filter((t) => t.id !== track.id);
                const randomTrack = candidates[Math.floor(Math.random() * candidates.length)] || currentTracks[0];
                setActiveTrackId(randomTrack.id);
                playCurrentTrack(randomTrack);
                return;
              }
              const currentIdx = currentTracks.findIndex((t) => t.id === track.id);
              nextIdx = (currentIdx + 1) % currentTracks.length;
              const nextT = currentTracks[nextIdx];
              if (nextT) {
                setActiveTrackId(nextT.id);
                playCurrentTrack(nextT);
              }
            } else {
              setIsAudioPlaying(false);
            }
          },
          repeatModeRef.current === 'one'
        );
      } else {
        // Synthesized soundscape
        const preset = track.soundscapePreset || 'stadium';
        audioAtmosphere.playSoundscape(preset, track.frequencyHz);
      }
      setIsAudioPlaying(true);
    },
    [musicVolume, isMuted]
  );

  const toggleAudio = () => {
    if (isAudioPlaying) {
      audioAtmosphere.stop();
      setIsAudioPlaying(false);
    } else if (activeTrack) {
      playCurrentTrack(activeTrack);
    } else {
      setIsPlayerOpen(true);
    }
  };

  const setMusicVolume = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setMusicVolumeState(clamped);
    audioAtmosphere.setVolume(clamped);
    try {
      localStorage.setItem('dodaeona_music_volume', String(clamped));
    } catch {
      // ignore
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      audioAtmosphere.setMute(next);
      return next;
    });
  };

  const selectTrack = (trackId: string) => {
    setActiveTrackId(trackId);
    const chosen = musicTracks.find((t) => t.id === trackId) || null;
    if (isAudioPlaying && chosen) {
      playCurrentTrack(chosen);
    }
  };

  const nextTrack = () => {
    if (musicTracks.length === 0) return;
    let nextIdx = 0;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * musicTracks.length);
    } else {
      const currentIdx = musicTracks.findIndex((t) => t.id === activeTrackId);
      nextIdx = (currentIdx + 1) % musicTracks.length;
    }
    const chosen = musicTracks[nextIdx];
    setActiveTrackId(chosen.id);
    if (isAudioPlaying) {
      playCurrentTrack(chosen);
    }
  };

  const prevTrack = () => {
    if (musicTracks.length === 0) return;
    const currentIdx = musicTracks.findIndex((t) => t.id === activeTrackId);
    const prevIdx = (currentIdx - 1 + musicTracks.length) % musicTracks.length;
    const chosen = musicTracks[prevIdx];
    setActiveTrackId(chosen.id);
    if (isAudioPlaying) {
      playCurrentTrack(chosen);
    }
  };

  const toggleRepeatMode = () => {
    setRepeatMode((prev) => (prev === 'all' ? 'one' : prev === 'one' ? 'off' : 'all'));
  };

  const toggleShuffle = () => {
    setIsShuffle((prev) => !prev);
  };

  const togglePlayer = () => {
    setIsPlayerOpen((prev) => !prev);
  };

  const playSoundEffect = (type: SoundEffectType) => {
    audioAtmosphere.playSoundEffect(type);
  };

  const getFrequencyData = () => {
    return audioAtmosphere.getFrequencyData();
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        toggleTheme,
        setTheme,
        isAudioPlaying,
        toggleAudio,
        musicVolume,
        setMusicVolume,
        isMuted,
        toggleMute,
        musicTracks,
        activeTrack,
        selectTrack,
        nextTrack,
        prevTrack,
        isPlayerOpen,
        setIsPlayerOpen,
        togglePlayer,
        repeatMode,
        toggleRepeatMode,
        isShuffle,
        toggleShuffle,
        playSoundEffect,
        getFrequencyData,
        refreshBootstrapTheme,
        branding,
        applyBranding,
        activePillar,
        setActivePillar,
        globalSearch,
        setGlobalSearch,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
