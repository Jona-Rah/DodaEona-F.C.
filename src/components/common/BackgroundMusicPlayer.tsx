import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Disc3,
  GripVertical,
  Move,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RotateCcw,
  Shuffle,
  Sparkles,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { SoundEffectType } from '../../utils/audioAtmosphereEngine';

type DockPreset =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

type PlayerPositionMode = DockPreset | 'custom';

interface StoredPlayerPosition {
  mode: PlayerPositionMode;
  xRatio: number;
  yRatio: number;
}

const POSITION_STORAGE_KEY = 'dodaeona_music_player_position_v1';

const DEFAULT_POSITION: StoredPlayerPosition = {
  mode: 'bottom-right',
  xRatio: 1,
  yRatio: 1,
};

const DOCK_OPTIONS: Array<{ id: DockPreset; label: string; shortLabel: string }> = [
  { id: 'top-left', label: 'Top Left', shortLabel: 'TL' },
  { id: 'top-center', label: 'Top Center', shortLabel: 'TC' },
  { id: 'top-right', label: 'Top Right', shortLabel: 'TR' },
  { id: 'bottom-left', label: 'Bottom Left', shortLabel: 'BL' },
  { id: 'bottom-center', label: 'Bottom Center', shortLabel: 'BC' },
  { id: 'bottom-right', label: 'Bottom Right', shortLabel: 'BR' },
];

function loadStoredPosition(): StoredPlayerPosition {
  if (typeof window === 'undefined') return DEFAULT_POSITION;
  try {
    const raw = window.localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return DEFAULT_POSITION;
    const parsed = JSON.parse(raw) as Partial<StoredPlayerPosition>;
    const validModes: PlayerPositionMode[] = [
      'top-left',
      'top-center',
      'top-right',
      'bottom-left',
      'bottom-center',
      'bottom-right',
      'custom',
    ];
    const mode = parsed.mode && validModes.includes(parsed.mode) ? parsed.mode : 'bottom-right';
    const xRatio =
      typeof parsed.xRatio === 'number' && Number.isFinite(parsed.xRatio)
        ? Math.max(0, Math.min(1, parsed.xRatio))
        : 1;
    const yRatio =
      typeof parsed.yRatio === 'number' && Number.isFinite(parsed.yRatio)
        ? Math.max(0, Math.min(1, parsed.yRatio))
        : 1;
    return { mode, xRatio, yRatio };
  } catch {
    return DEFAULT_POSITION;
  }
}

function getSafeViewportBounds(elWidth: number, elHeight: number) {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 720;
  const isCompact = vw < 640 || vh < 480;
  const margin = isCompact ? 10 : 20;

  let minTop = margin;
  if (typeof document !== 'undefined') {
    const header = document.querySelector('header');
    if (header) {
      const rect = header.getBoundingClientRect();
      if (rect.height > 0 && rect.bottom > 0 && rect.top <= 10) {
        minTop = Math.max(margin, Math.min(104, Math.round(rect.bottom + 8)));
      }
    }
  }

  const maxLeft = Math.max(margin, vw - elWidth - margin);
  const maxTop = Math.max(minTop, vh - elHeight - margin);
  return { margin, minTop, maxLeft, maxTop };
}

function getPresetPositionStyle(preset: DockPreset): React.CSSProperties {
  const isCompact =
    typeof window !== 'undefined' && (window.innerWidth < 640 || window.innerHeight < 480);
  const edge = isCompact ? '10px' : '20px';

  let topEdge = '84px';
  if (typeof document !== 'undefined') {
    const header = document.querySelector('header');
    if (header) {
      const rect = header.getBoundingClientRect();
      if (rect.height > 0 && rect.bottom > 0 && rect.top <= 10) {
        topEdge = `${Math.max(12, Math.min(104, Math.round(rect.bottom + 10)))}px`;
      }
    }
  }

  switch (preset) {
    case 'top-left':
      return { top: topEdge, left: edge };
    case 'top-center':
      return { top: topEdge, left: '50%', transform: 'translateX(-50%)' };
    case 'top-right':
      return { top: topEdge, right: edge };
    case 'bottom-left':
      return { bottom: edge, left: edge };
    case 'bottom-center':
      return { bottom: edge, left: '50%', transform: 'translateX(-50%)' };
    case 'bottom-right':
    default:
      return { bottom: edge, right: edge };
  }
}

export const BackgroundMusicPlayer: React.FC = () => {
  const {
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
    repeatMode,
    toggleRepeatMode,
    isShuffle,
    toggleShuffle,
    playSoundEffect,
    getFrequencyData,
  } = useTheme();

  const [activeTab, setActiveTab] = useState<'controls' | 'playlist' | 'soundboard'>('controls');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [positionState, setPositionState] = useState<StoredPlayerPosition>(loadStoredPosition);
  const [isPositionMenuOpen, setIsPositionMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragCoords, setDragCoords] = useState<{ left: number; top: number } | null>(null);
  const [measuredSize, setMeasuredSize] = useState<{ width: number; height: number }>({
    width: 280,
    height: 52,
  });
  const [viewportTick, setViewportTick] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragSessionRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
    elWidth: number;
    elHeight: number;
    hasMoved: boolean;
  } | null>(null);
  const suppressNextClickRef = useRef(false);

  // Persist position changes
  useEffect(() => {
    try {
      window.localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(positionState));
    } catch {
      // Ignore storage quota issues
    }
  }, [positionState]);

  // Measure widget dimensions & respond to viewport resizes so custom coordinates stay clamped
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setMeasuredSize((prev) =>
          Math.abs(prev.width - rect.width) > 1 || Math.abs(prev.height - rect.height) > 1
            ? { width: Math.round(rect.width), height: Math.round(rect.height) }
            : prev
        );
      }
    };

    updateSize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateSize) : null;
    ro?.observe(el);

    const onResize = () => setViewportTick((t) => t + 1);
    window.addEventListener('resize', onResize);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [isPlayerOpen, isPositionMenuOpen, activeTab]);

  // Pointer drag handlers (mouse + touch)
  const handleDragPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>, options?: { allowFromInteractive?: boolean }) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      if (!options?.allowFromInteractive) {
        const target = e.target as HTMLElement | null;
        if (target?.closest('button, input, select, textarea, a, [data-no-drag="true"]')) {
          return;
        }
      }

      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();

      dragSessionRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originLeft: rect.left,
        originTop: rect.top,
        elWidth: rect.width,
        elHeight: rect.height,
        hasMoved: false,
      };
    },
    []
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;

      const dx = e.clientX - session.startX;
      const dy = e.clientY - session.startY;
      if (!session.hasMoved && Math.hypot(dx, dy) < 5) {
        return;
      }

      if (!session.hasMoved) {
        session.hasMoved = true;
        setIsDragging(true);
      }

      const { margin, minTop, maxLeft, maxTop } = getSafeViewportBounds(
        session.elWidth,
        session.elHeight
      );
      const nextLeft = Math.max(margin, Math.min(maxLeft, session.originLeft + dx));
      const nextTop = Math.max(minTop, Math.min(maxTop, session.originTop + dy));
      setDragCoords({ left: Math.round(nextLeft), top: Math.round(nextTop) });
    };

    const handlePointerEnd = (e: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session || e.pointerId !== session.pointerId) return;
      dragSessionRef.current = null;

      if (session.hasMoved) {
        suppressNextClickRef.current = true;
        window.setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 80);

        const dx = e.clientX - session.startX;
        const dy = e.clientY - session.startY;
        const { margin, minTop, maxLeft, maxTop } = getSafeViewportBounds(
          session.elWidth,
          session.elHeight
        );
        const finalLeft = Math.max(margin, Math.min(maxLeft, session.originLeft + dx));
        const finalTop = Math.max(minTop, Math.min(maxTop, session.originTop + dy));
        const availW = Math.max(0, maxLeft - margin);
        const availH = Math.max(0, maxTop - minTop);

        setPositionState({
          mode: 'custom',
          xRatio: availW > 0 ? (finalLeft - margin) / availW : 0,
          yRatio: availH > 0 ? (finalTop - minTop) / availH : 0,
        });
      }

      setIsDragging(false);
      setDragCoords(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerEnd);
    window.addEventListener('pointercancel', handlePointerEnd);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerEnd);
      window.removeEventListener('pointercancel', handlePointerEnd);
    };
  }, []);

  const selectDockPreset = (preset: DockPreset) => {
    setPositionState({
      mode: preset,
      xRatio: preset.endsWith('left') ? 0 : preset.endsWith('center') ? 0.5 : 1,
      yRatio: preset.startsWith('top') ? 0 : 1,
    });
    setIsPositionMenuOpen(false);
  };

  // Compute active fixed positioning style (live drag > custom clamped > preset)
  const wrapperPositionStyle: React.CSSProperties = (() => {
    void viewportTick;
    if (dragCoords) {
      return { left: `${dragCoords.left}px`, top: `${dragCoords.top}px` };
    }
    if (positionState.mode === 'custom') {
      const { margin, minTop, maxLeft, maxTop } = getSafeViewportBounds(
        measuredSize.width,
        measuredSize.height
      );
      const availW = Math.max(0, maxLeft - margin);
      const availH = Math.max(0, maxTop - minTop);
      return {
        left: `${Math.round(margin + positionState.xRatio * availW)}px`,
        top: `${Math.round(minTop + positionState.yRatio * availH)}px`,
      };
    }
    return getPresetPositionStyle(positionState.mode);
  })();

  // Real-time canvas frequency spectrum visualizer (idle static draw when paused/muted/hidden)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let localPhase = 0;
    const shouldAnimate = isAudioPlaying && !isMuted;

    const drawFrame = () => {
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const numBars = 20;
      const barWidth = width / numBars - 2;

      if (!shouldAnimate) {
        ctx.fillStyle = 'rgba(148, 163, 184, 0.2)';
        for (let i = 0; i < numBars; i++) {
          ctx.fillRect(i * (barWidth + 2), height - 3, barWidth, 3);
        }
        return;
      }

      const freqData = getFrequencyData();
      localPhase += 0.08;
      const color = activeTrack?.waveformColor || '#00F5FF';
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, color);
      grad.addColorStop(1, 'rgba(0, 245, 255, 0.15)');
      ctx.fillStyle = grad;

      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + 2);
        let val = freqData[i % freqData.length] || 0;
        if (val < 5) {
          val = Math.floor(25 + Math.sin(localPhase + i * 0.4) * 15 + Math.cos(localPhase * 0.7) * 10);
        }
        const barHeight = Math.max(3, (val / 255) * height * 0.9);
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      }
    };

    const render = () => {
      if (document.hidden) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }
      drawFrame();
      animFrameRef.current = requestAnimationFrame(render);
    };

    drawFrame();
    if (shouldAnimate) {
      animFrameRef.current = requestAnimationFrame(render);
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [getFrequencyData, isAudioPlaying, isMuted, activeTrack, isPlayerOpen, activeTab]);

  const categories = [
    'all',
    ...Array.from(new Set(musicTracks.map((t) => t.category).filter((c): c is string => Boolean(c)))),
  ];

  const filteredTracks = musicTracks.filter((t) => {
    if (filterCategory === 'all') return true;
    return t.category === filterCategory;
  });

  const handleSfx = (type: SoundEffectType) => {
    playSoundEffect(type);
  };

  return (
    <>
      {/* 1. COLLAPSED FLOATING PILL */}
      {!isPlayerOpen && (
        <div
          ref={containerRef}
          style={wrapperPositionStyle}
          onPointerDown={(e) => handleDragPointerDown(e, { allowFromInteractive: true })}
          onClickCapture={(e) => {
            if (suppressNextClickRef.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className={`fixed z-40 select-none touch-none ${
            isDragging ? 'transition-none cursor-grabbing' : 'transition-[left,top,right,bottom] duration-200'
          }`}
        >
          <div
            className={`flex items-center gap-1.5 p-1.5 pl-2 rounded-full bg-[#08101E]/90 light:bg-white/95 backdrop-blur-xl border shadow-2xl text-white light:text-slate-900 group ${
              isDragging
                ? 'border-[var(--accent-cyan)] ring-2 ring-[var(--accent-cyan)]/40 scale-[1.02]'
                : 'border-white/15 light:border-slate-300'
            }`}
          >
            {/* Drag Grip Handle */}
            <div
              onPointerDown={(e) => {
                e.stopPropagation();
                handleDragPointerDown(e, { allowFromInteractive: true });
              }}
              className="touch-none px-1 py-1.5 rounded-full text-slate-400 hover:text-[var(--accent-cyan)] light:hover:text-cyan-700 cursor-grab active:cursor-grabbing flex items-center justify-center transition-colors"
              title="Drag to move player"
              aria-label="Drag to move player"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>

            {/* Visualizer miniature icon + track title */}
            <button
              type="button"
              onClick={() => setIsPlayerOpen(true)}
              className="flex items-center gap-2 cursor-pointer pr-1"
              title="Open audio atmosphere player"
            >
              <div className="w-6 h-6 rounded-full bg-[var(--accent-cyan)]/15 flex items-center justify-center text-[var(--accent-cyan)] shrink-0">
                {isAudioPlaying ? (
                  <Disc3 className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                ) : (
                  <Music className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="flex flex-col text-left max-w-[130px] sm:max-w-[180px] min-w-0">
                <span className="text-[11px] font-bold text-white light:text-slate-900 truncate leading-tight">
                  {activeTrack ? activeTrack.title : 'No Audio Tracks'}
                </span>
                <span className="text-[9px] font-mono text-[var(--accent-cyan)] uppercase tracking-wider truncate">
                  {musicTracks.length === 0
                    ? 'EMPTY'
                    : isAudioPlaying
                    ? activeTrack?.featured
                      ? 'FEATURED · PLAYING'
                      : activeTrack?.category || 'PLAYING'
                    : activeTrack?.featured
                    ? 'FEATURED'
                    : 'PAUSED'}
                </span>
              </div>
            </button>

            {/* Quick mini play/pause */}
            <button
              type="button"
              onClick={toggleAudio}
              className="w-8 h-8 rounded-full bg-[var(--accent-cyan)] text-[#050A12] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer shadow-md shrink-0"
              title={
                musicTracks.length === 0
                  ? 'Open audio console'
                  : isAudioPlaying
                  ? 'Pause Atmosphere'
                  : 'Play Atmosphere'
              }
            >
              {isAudioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
            </button>

            {/* Expand arrow */}
            <button
              type="button"
              onClick={() => setIsPlayerOpen(true)}
              className="p-1.5 text-slate-400 hover:text-white light:hover:text-slate-900 transition-colors cursor-pointer shrink-0"
              title="Expand player"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. EXPANDED TACTICAL AUDIO CONSOLE */}
      {isPlayerOpen && (
        <div
          ref={containerRef}
          style={wrapperPositionStyle}
          className={`fixed z-40 w-[92vw] sm:w-[380px] landscape-mobile:w-[400px] max-w-[calc(100vw-1.25rem)] max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl bg-[#08101E]/95 light:bg-white/98 backdrop-blur-2xl border shadow-2xl text-white light:text-slate-900 ${
            isDragging
              ? 'border-[var(--accent-cyan)] ring-2 ring-[var(--accent-cyan)]/40 transition-none'
              : 'border-white/15 light:border-slate-300 transition-[left,top,right,bottom] duration-200 animate-in fade-in duration-200'
          }`}
        >
          {/* Top Control Bar (Drag Handle) */}
          <div
            onPointerDown={(e) => handleDragPointerDown(e)}
            className={`px-4 py-3 bg-white/[0.03] light:bg-slate-100/70 border-b border-white/[0.08] light:border-slate-200 flex items-center justify-between touch-none select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
            title="Drag header to reposition player"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-3.5 h-3.5 text-slate-400 light:text-slate-500 shrink-0" />
              <span className="font-mono text-[10px] tracking-[0.2em] text-[var(--accent-cyan)] light:text-cyan-700 uppercase font-bold">
                MATCHDAY ATMOSPHERE
              </span>
            </div>

            <div className="flex items-center gap-1" data-no-drag="true">
              <button
                type="button"
                onClick={() => setIsPositionMenuOpen((prev) => !prev)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isPositionMenuOpen
                    ? 'bg-[var(--accent-cyan)]/20 text-[var(--accent-cyan)] light:bg-cyan-100 light:text-cyan-700'
                    : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-white/10 light:hover:bg-slate-200'
                }`}
                title="Change player position"
                aria-label="Change player position"
                aria-expanded={isPositionMenuOpen}
              >
                <Move className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPositionMenuOpen(false);
                  setIsPlayerOpen(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-white/10 light:hover:bg-slate-200 transition-colors cursor-pointer"
                title="Minimize player"
                aria-label="Minimize player"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Position Dock Selector */}
          {isPositionMenuOpen && (
            <div className="px-4 py-3 bg-white/[0.02] light:bg-slate-50 border-b border-white/[0.08] light:border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-slate-200 light:text-slate-800">
                  Player Position
                </span>
                <div className="flex items-center gap-2">
                  {positionState.mode !== 'bottom-right' && (
                    <button
                      type="button"
                      onClick={() => selectDockPreset('bottom-right')}
                      className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--accent-cyan)] light:text-cyan-700 hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                  <span className="text-[10px] text-slate-400 light:text-slate-500">
                    {positionState.mode === 'custom' ? 'Custom' : DOCK_OPTIONS.find((d) => d.id === positionState.mode)?.label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {DOCK_OPTIONS.map((opt) => {
                  const isActive = positionState.mode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => selectDockPreset(opt.id)}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        isActive
                          ? 'bg-[var(--accent-cyan)]/15 border-[var(--accent-cyan)] text-[var(--accent-cyan)] light:bg-cyan-50 light:border-cyan-600 light:text-cyan-800 font-semibold'
                          : 'bg-white/[0.03] light:bg-white border-white/10 light:border-slate-200 text-slate-300 light:text-slate-700 hover:border-white/25 light:hover:border-slate-300'
                      }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[10px] text-slate-400 light:text-slate-500">
                Or drag the grip handle on the bar or mini player to place it anywhere on screen.
              </p>
            </div>
          )}

          {/* Navigation Tabs (Controls, Playlist, Soundboard) */}
          <div className="px-4 pt-3 flex items-center gap-1 border-b border-white/[0.06] light:border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('controls')}
              className={`pb-2 px-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'controls'
                  ? 'border-[var(--accent-cyan)] text-[var(--accent-cyan)]'
                  : 'border-transparent text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
              }`}
            >
              Player
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('playlist')}
              className={`pb-2 px-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'playlist'
                  ? 'border-[var(--accent-cyan)] text-[var(--accent-cyan)]'
                  : 'border-transparent text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Featured</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 light:bg-slate-200">
                {musicTracks.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('soundboard')}
              className={`pb-2 px-2 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1 ${
                activeTab === 'soundboard'
                  ? 'border-[var(--accent-cyan)] text-[var(--accent-cyan)]'
                  : 'border-transparent text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>Matchday SFX</span>
            </button>
          </div>

          {/* TAB 1: CONTROLS & VISUALIZER */}
          {activeTab === 'controls' && (
            <div className="p-4 space-y-4">
              {/* Spectrum Visualizer Canvas */}
              <div className="relative h-14 w-full rounded-xl bg-black/30 light:bg-slate-200/50 p-2 overflow-hidden flex items-end justify-center border border-white/[0.06]">
                <canvas ref={canvasRef} width={340} height={48} className="w-full h-full" />
                <div className="absolute top-2 left-2.5 font-mono text-[9px] tracking-widest text-slate-400 light:text-slate-600 uppercase">
                  {isAudioPlaying ? 'AUDIO SPECTRUM' : 'SYSTEM READY'}
                </div>
                {activeTrack?.durationLabel && (
                  <div className="absolute top-2 right-2.5 font-mono text-[9px] text-[var(--accent-cyan)]">
                    {activeTrack.durationLabel}
                  </div>
                )}
              </div>

              {/* Active Track Metadata */}
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white light:text-slate-900 truncate">
                    {activeTrack ? activeTrack.title : 'No Audio Tracks'}
                  </h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {activeTrack?.featured && (
                      <span className="font-mono text-[9px] tracking-wider uppercase text-amber-300 light:text-amber-700 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded">
                        Featured
                      </span>
                    )}
                    {activeTrack?.category && (
                      <span className="font-mono text-[9px] tracking-wider text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-2 py-0.5 rounded">
                        {activeTrack.category}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-400 light:text-slate-600 truncate">
                  {activeTrack?.artist ||
                    (musicTracks.length === 0
                      ? 'Upload or add an audio track in the Control Room.'
                      : 'DodaEona Audio Console')}
                </p>
                {activeTrack?.description && (
                  <p className="text-[11px] text-slate-400/80 light:text-slate-500 line-clamp-2 pt-1 italic">
                    &quot;{activeTrack.description}&quot;
                  </p>
                )}
              </div>

              {/* Primary Transport Controls */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={toggleShuffle}
                  disabled={musicTracks.length === 0}
                  className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isShuffle ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/15' : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                  }`}
                  title={isShuffle ? 'Shuffle enabled' : 'Shuffle disabled'}
                >
                  <Shuffle className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={prevTrack}
                    disabled={musicTracks.length === 0}
                    className="p-2 rounded-xl text-slate-300 light:text-slate-700 hover:bg-white/10 light:hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Previous track"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={toggleAudio}
                    disabled={musicTracks.length === 0}
                    className="w-12 h-12 rounded-full bg-[var(--accent-cyan)] text-[#050A12] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    title={
                      musicTracks.length === 0
                        ? 'No audio tracks available'
                        : isAudioPlaying
                        ? 'Pause Audio'
                        : 'Play Audio'
                    }
                  >
                    {isAudioPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={nextTrack}
                    disabled={musicTracks.length === 0}
                    className="p-2 rounded-xl text-slate-300 light:text-slate-700 hover:bg-white/10 light:hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Next track"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={toggleRepeatMode}
                  disabled={musicTracks.length === 0}
                  className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    repeatMode !== 'off'
                      ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/15'
                      : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                  }`}
                  title={`Loop mode: ${repeatMode}`}
                >
                  {repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                </button>
              </div>

              {/* Volume Slider with Mute Button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 transition-colors cursor-pointer"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || musicVolume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={isMuted ? 0 : musicVolume}
                  onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                  className="w-full accent-[var(--accent-cyan)] cursor-pointer h-1.5 rounded-lg bg-white/20 light:bg-slate-300"
                />

                <span className="font-mono text-[10px] text-slate-400 w-8 text-right tabular-nums">
                  {isMuted ? '0%' : `${Math.round(musicVolume * 100)}%`}
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: FEATURED SONGS PLAYLIST */}
          {activeTab === 'playlist' && (
            <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto">
              {/* Category Filter Chips (shown when multiple categories exist) or Featured Header */}
              {categories.length > 2 ? (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFilterCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        filterCategory === cat
                          ? 'bg-[var(--accent-cyan)] text-[#050A12]'
                          : 'bg-white/[0.05] light:bg-slate-100 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                      }`}
                    >
                      {cat === 'all' ? 'All Featured' : cat}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-between px-0.5">
                  <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-amber-300/90 light:text-amber-700 font-semibold">
                    Featured Club Songs
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 light:text-slate-600">
                    {filteredTracks.length} {filteredTracks.length === 1 ? 'track' : 'tracks'}
                  </span>
                </div>
              )}

              {/* Tracks List */}
              <div className="space-y-1.5">
                {filteredTracks.length === 0 ? (
                  <div className="p-5 rounded-xl bg-white/[0.02] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 text-center text-xs text-slate-400 light:text-slate-600">
                    {musicTracks.length === 0
                      ? 'No background audio tracks have been uploaded yet.'
                      : 'No audio tracks match this category.'}
                  </div>
                ) : (
                  filteredTracks.map((track) => {
                    const isCurrent = activeTrack?.id === track.id;
                    return (
                      <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                          selectTrack(track.id);
                          if (!isAudioPlaying) toggleAudio();
                        }}
                        className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-[var(--accent-cyan)]/15 border border-[var(--accent-cyan)]/40 text-white light:text-slate-900'
                            : 'bg-white/[0.02] light:bg-slate-50 border border-white/[0.05] light:border-slate-200 text-slate-300 light:text-slate-800 hover:border-white/20 light:hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isCurrent
                                ? 'bg-[var(--accent-cyan)] text-[#050A12]'
                                : 'bg-white/5 light:bg-slate-200 text-slate-400 light:text-slate-700'
                            }`}
                          >
                            {isCurrent && isAudioPlaying ? (
                              <Pause className="w-3.5 h-3.5" />
                            ) : (
                              <Play className="w-3.5 h-3.5 ml-0.5" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-xs font-semibold truncate leading-tight">
                                {track.title}
                              </p>
                              {track.featured && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[8px] font-mono uppercase tracking-wider text-amber-300 light:text-amber-700 shrink-0">
                                  Featured
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate">
                              {track.artist} {track.bpm ? `· ${track.bpm} BPM` : ''}
                            </p>
                          </div>
                        </div>

                        <span className="font-mono text-[9px] text-[var(--accent-cyan)] shrink-0">
                          {track.durationLabel}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 3: MATCHDAY SOUNDBOARD */}
          {activeTab === 'soundboard' && (
            <div className="p-4 space-y-3">
              <p className="text-[11px] text-slate-400 light:text-slate-600">
                Trigger real-time acoustic pitch effects while exploring tactics or simulating matches:
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSfx('whistle')}
                  className="p-3 rounded-xl bg-white/[0.04] light:bg-slate-100 hover:bg-[var(--accent-cyan)]/20 border border-white/[0.08] light:border-slate-200 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center group"
                >
                  <span className="text-xl">📣</span>
                  <span className="text-xs font-bold text-white light:text-slate-900 group-hover:text-[var(--accent-cyan)]">
                    Referee Whistle
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 light:text-slate-600">High Trill 2.8kHz</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSfx('roar')}
                  className="p-3 rounded-xl bg-white/[0.04] light:bg-slate-100 hover:bg-[var(--accent-cyan)]/20 border border-white/[0.08] light:border-slate-200 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center group"
                >
                  <span className="text-xl">⚽</span>
                  <span className="text-xs font-bold text-white light:text-slate-900 group-hover:text-[var(--accent-cyan)]">
                    Stadium Goal Roar
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 light:text-slate-600">80,000 Cheering</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSfx('crossbar')}
                  className="p-3 rounded-xl bg-white/[0.04] light:bg-slate-100 hover:bg-[var(--accent-cyan)]/20 border border-white/[0.08] light:border-slate-200 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center group"
                >
                  <span className="text-xl">🥅</span>
                  <span className="text-xs font-bold text-white light:text-slate-900 group-hover:text-[var(--accent-cyan)]">
                    Crossbar Ping
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 light:text-slate-600">Metal Woodwork</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSfx('drum')}
                  className="p-3 rounded-xl bg-white/[0.04] light:bg-slate-100 hover:bg-[var(--accent-cyan)]/20 border border-white/[0.08] light:border-slate-200 flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer text-center group"
                >
                  <span className="text-xl">🥁</span>
                  <span className="text-xs font-bold text-white light:text-slate-900 group-hover:text-[var(--accent-cyan)]">
                    Ultras Drum Boom
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 light:text-slate-600">Deep Sub Kick</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
