import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  AlertTriangle,
  ExternalLink,
  Flag,
  Globe,
  Loader2,
  MapPin,
  RotateCcw,
  Shield,
  Users,
} from 'lucide-react';
import {
  CONTINENT_PRESETS,
  ContinentFilter,
  WorldCountrySummary,
  WorldLocationItem,
} from './worldData';
import { fetchBootstrapLite } from '../../../utils/bootstrapCache';

export interface GoogleMapCameraTarget {
  lat: number;
  lng: number;
  zoom: number;
  ts: number;
}

interface FootballWorldGoogleMapProps {
  items: WorldLocationItem[];
  countries: WorldCountrySummary[];
  selectedItem: WorldLocationItem | null;
  selectedCountry: WorldCountrySummary | null;
  activeContinent: ContinentFilter;
  cameraTarget: GoogleMapCameraTarget | null;
  onSelectItem: (item: WorldLocationItem) => void;
  onSelectCountry: (countryName: string) => void;
  onSelectContinent: (continent: ContinentFilter) => void;
  onOpenTeamProfile?: (teamId: string) => void;
  onOpenStadiumExplorer?: (teamId: string) => void;
}

interface ViewportState {
  zoom: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  } | null;
}

interface WorldMarkerNode {
  key: string;
  position: { lat: number; lng: number };
  primary: WorldLocationItem;
  members: WorldLocationItem[];
}

interface WorldClusterNode {
  type: 'cluster';
  key: string;
  position: { lat: number; lng: number };
  memberCount: number;
  targetZoom: number;
}

interface WorldSingleNode {
  type: 'node';
  node: WorldMarkerNode;
}

type WorldRenderMarker = WorldClusterNode | WorldSingleNode;

function applyImageFallback(img: HTMLImageElement, fallbackUrl?: string) {
  if (!fallbackUrl || img.dataset.fallbackApplied === '1') return;
  img.dataset.fallbackApplied = '1';
  img.src = fallbackUrl;
}

const WorldMapCameraController: React.FC<{
  cameraTarget: GoogleMapCameraTarget | null;
  selectedItem: WorldLocationItem | null;
}> = ({ cameraTarget, selectedItem }) => {
  const map = useMap();
  const lastTsRef = useRef<number>(0);
  const lastItemIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!map || !cameraTarget || cameraTarget.ts === lastTsRef.current) return;
    lastTsRef.current = cameraTarget.ts;
    map.panTo({ lat: cameraTarget.lat, lng: cameraTarget.lng });
    map.setZoom(cameraTarget.zoom);
  }, [map, cameraTarget]);

  useEffect(() => {
    if (!map || !selectedItem || selectedItem.id === lastItemIdRef.current) return;
    lastItemIdRef.current = selectedItem.id;
    map.panTo({ lat: selectedItem.lat, lng: selectedItem.lng });
    const currentZoom = map.getZoom() || 3;
    const desired =
      selectedItem.type === 'stadium' || (selectedItem.type === 'club' && selectedItem.isVerifiedStadium)
        ? 13
        : 6;
    if (currentZoom < desired) {
      map.setZoom(desired);
    }
  }, [map, selectedItem]);

  return null;
};

const DEFAULT_CENTER = { lat: 24, lng: 12 };
const DEFAULT_ZOOM = 2;

export const FootballWorldGoogleMap: React.FC<FootballWorldGoogleMapProps> = React.memo(({
  items,
  countries,
  selectedItem,
  selectedCountry,
  activeContinent,
  cameraTarget,
  onSelectItem,
  onSelectCountry,
  onSelectContinent,
  onOpenTeamProfile,
  onOpenStadiumExplorer,
}) => {
  const [apiKey, setApiKey] = useState<string>(() => {
    return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) || '';
  });
  const [keyStatus, setKeyStatus] = useState<'loading' | 'ready' | 'missing'>(() =>
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY
      ? 'ready'
      : 'loading'
  );
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid' | 'terrain'>('roadmap');
  const [localTarget, setLocalTarget] = useState<GoogleMapCameraTarget | null>(null);
  const [activeNode, setActiveNode] = useState<WorldMarkerNode | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: DEFAULT_ZOOM,
    bounds: null,
  });

  // Load Google Maps API key from cached lite bootstrap first, falling back to /api/maps/config
  useEffect(() => {
    if (apiKey) {
      setKeyStatus('ready');
      return;
    }
    let mounted = true;
    setKeyStatus('loading');
    fetchBootstrapLite(false)
      .then((boot) => {
        const bootKey = typeof boot?.mapsApiKey === 'string' ? boot.mapsApiKey.trim() : '';
        if (bootKey) {
          if (mounted) {
            setApiKey(bootKey);
            setKeyStatus('ready');
          }
          return null;
        }
        return fetch('/api/maps/config').then((res) => (res.ok ? res.json() : null));
      })
      .then((data) => {
        if (!mounted || !data) return;
        const resolved = typeof data?.apiKey === 'string' ? data.apiKey.trim() : '';
        if (resolved) {
          setApiKey(resolved);
          setKeyStatus('ready');
        } else {
          setKeyStatus('missing');
        }
      })
      .catch(() => {
        if (mounted) setKeyStatus('missing');
      });
    return () => {
      mounted = false;
    };
  }, [apiKey]);

  useEffect(() => {
    const handleQuotaExceeded = () => setIsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  // Group co-located markers once per filtered item list (never rebuild all 1,725 items on pin click)
  const coordinateNodes: WorldMarkerNode[] = useMemo(() => {
    const groups: Record<string, WorldMarkerNode> = {};
    for (const item of items) {
      const key = `${item.lat.toFixed(4)},${item.lng.toFixed(4)}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          position: { lat: item.lat, lng: item.lng },
          primary: item,
          members: [item],
        };
      } else {
        groups[key].members.push(item);
      }
    }
    return Object.values(groups);
  }, [items]);

  useEffect(() => {
    if (!selectedItem) {
      setActiveNode(null);
      return;
    }
    const matching = coordinateNodes.find((n) => n.members.some((m) => m.id === selectedItem.id));
    if (matching) {
      setActiveNode({ ...matching, primary: selectedItem });
    }
  }, [selectedItem, coordinateNodes]);

  // Spatial clustering for smooth viewport rendering
  const visibleMarkers: WorldRenderMarker[] = useMemo(() => {
    const { zoom, bounds } = viewport;

    let inView = coordinateNodes;
    if (bounds) {
      const latPad = Math.max(3, (bounds.north - bounds.south) * 0.2);
      const lngPad = Math.max(3, (bounds.east - bounds.west) * 0.2);
      inView = coordinateNodes.filter((node) => {
        if (selectedItem && node.members.some((m) => m.id === selectedItem.id)) return true;
        const { lat, lng } = node.position;
        const inLat = lat >= bounds.south - latPad && lat <= bounds.north + latPad;
        const inLng =
          bounds.east >= bounds.west
            ? lng >= bounds.west - lngPad && lng <= bounds.east + lngPad
            : lng >= bounds.west - lngPad || lng <= bounds.east + lngPad;
        return inLat && inLng;
      });
    }

    if (zoom >= 7 || inView.length <= 40) {
      const sorted = [...inView].sort((a, b) => {
        const aSel = selectedItem && a.members.some((m) => m.id === selectedItem.id) ? 1 : 0;
        const bSel = selectedItem && b.members.some((m) => m.id === selectedItem.id) ? 1 : 0;
        if (aSel !== bSel) return bSel - aSel;
        const aVer = a.primary.isVerifiedStadium ? 1 : 0;
        const bVer = b.primary.isVerifiedStadium ? 1 : 0;
        if (aVer !== bVer) return bVer - aVer;
        return (b.primary.capacity || 0) - (a.primary.capacity || 0);
      });
      return sorted.slice(0, 40).map((node) => ({ type: 'node', node }));
    }

    const cellSizeDeg = Math.max(1.2, 26 / Math.pow(2, Math.max(0.5, zoom - 1.5)));
    const buckets: Record<string, { nodes: WorldMarkerNode[]; latSum: number; lngSum: number }> = {};
    let selectedNode: WorldMarkerNode | null = null;

    for (const node of inView) {
      if (selectedItem && node.members.some((m) => m.id === selectedItem.id)) {
        selectedNode = node;
        continue;
      }
      const cellLat = Math.floor(node.position.lat / cellSizeDeg);
      const cellLng = Math.floor(node.position.lng / cellSizeDeg);
      const cellKey = `${cellLat}:${cellLng}`;
      if (!buckets[cellKey]) {
        buckets[cellKey] = { nodes: [node], latSum: node.position.lat, lngSum: node.position.lng };
      } else {
        buckets[cellKey].nodes.push(node);
        buckets[cellKey].latSum += node.position.lat;
        buckets[cellKey].lngSum += node.position.lng;
      }
    }

    const result: WorldRenderMarker[] = [];
    if (selectedNode) {
      result.push({ type: 'node', node: selectedNode });
    }

    for (const [cellKey, bucket] of Object.entries(buckets)) {
      if (bucket.nodes.length === 1) {
        result.push({ type: 'node', node: bucket.nodes[0] });
      } else {
        const memberCount = bucket.nodes.reduce((sum, n) => sum + n.members.length, 0);
        result.push({
          type: 'cluster',
          key: `world-cluster-${cellKey}`,
          position: {
            lat: bucket.latSum / bucket.nodes.length,
            lng: bucket.lngSum / bucket.nodes.length,
          },
          memberCount,
          targetZoom: Math.min(12, zoom + 3),
        });
      }
    }

    return result.slice(0, 40);
  }, [coordinateNodes, viewport, selectedItem]);

  const countryBadges = useMemo(() => {
    return countries
      .filter((c) => c.clubs.length > 0 || c.mensNationalTeam || c.womensNationalTeam)
      .slice(0, 24);
  }, [countries]);

  const cameraThrottleTimerRef = useRef<number | null>(null);
  const lastCameraCommitRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (cameraThrottleTimerRef.current !== null) {
        window.clearTimeout(cameraThrottleTimerRef.current);
      }
    };
  }, []);

  const handleCameraChange = useCallback(
    (ev: {
      detail: { zoom: number; bounds?: { north: number; south: number; east: number; west: number } };
    }) => {
      const nextZoom = ev.detail.zoom;
      const nextBounds = ev.detail.bounds || null;

      const commit = () => {
        lastCameraCommitRef.current = performance.now();
        setViewport((prev) => {
          if (
            prev.zoom === nextZoom &&
            prev.bounds &&
            nextBounds &&
            Math.abs(prev.bounds.north - nextBounds.north) < 0.15 &&
            Math.abs(prev.bounds.west - nextBounds.west) < 0.15
          ) {
            return prev;
          }
          return { zoom: nextZoom, bounds: nextBounds };
        });
      };

      const now = performance.now();
      if (cameraThrottleTimerRef.current !== null) {
        window.clearTimeout(cameraThrottleTimerRef.current);
      }
      if (now - lastCameraCommitRef.current >= 180) {
        commit();
      } else {
        cameraThrottleTimerRef.current = window.setTimeout(commit, 180);
      }
    },
    []
  );

  const effectiveTarget = useMemo(() => {
    if (!localTarget) return cameraTarget;
    if (!cameraTarget) return localTarget;
    return localTarget.ts > cameraTarget.ts ? localTarget : cameraTarget;
  }, [cameraTarget, localTarget]);

  const jumpToCountry = (country: WorldCountrySummary) => {
    onSelectCountry(country.country);
    setLocalTarget({
      lat: country.coordinates.lat,
      lng: country.coordinates.lng,
      zoom: 5,
      ts: Date.now(),
    });
  };

  return (
    <div className="relative w-full h-full min-h-[480px] rounded-2xl overflow-hidden border border-cyan-500/25 bg-[#050C17] flex flex-col shadow-2xl">
      {isQuotaExceeded && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs text-center z-50 flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              maps developer site
            </a>{' '}
            to update your account.
          </span>
        </div>
      )}

      {/* Top Google Maps Controls Overlay: Continents + Map Type */}
      <div className="p-2.5 bg-[#070F1B] border-b border-white/10 flex flex-wrap items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {CONTINENT_PRESETS.map((preset) => {
            const active = activeContinent === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  onSelectContinent(preset.id);
                  setLocalTarget({
                    lat: preset.lat,
                    lng: preset.lng,
                    zoom: preset.zoom,
                    ts: Date.now(),
                  });
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono whitespace-nowrap cursor-pointer border transition-colors ${
                  active
                    ? 'bg-[#0891B2] border-cyan-400 text-white'
                    : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {preset.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Map / Satellite / Terrain */}
        <div className="flex items-center gap-1 bg-[#030712] border border-white/10 rounded-lg p-0.5 shrink-0">
          {(['roadmap', 'hybrid', 'terrain'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMapType(mode)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider cursor-pointer transition-colors ${
                mapType === mode
                  ? 'bg-[#0891B2] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {mode === 'roadmap' ? 'Map' : mode === 'hybrid' ? 'Satellite' : 'Terrain'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Google Maps Viewport */}
      <div className="relative flex-1 min-h-[420px]">
        {keyStatus === 'loading' ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-300 p-6">
            <Loader2 className="w-7 h-7 animate-spin text-[#0891B2]" />
            <span className="font-mono text-xs uppercase tracking-widest">
              Loading Google Maps World Explorer
            </span>
          </div>
        ) : keyStatus === 'missing' || !apiKey ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-slate-300 p-6 text-center bg-[#060E1A]">
            <Globe className="w-10 h-10 text-amber-400" />
            <div className="space-y-1.5 max-w-md">
              <p className="text-sm font-semibold text-white">
                Google Maps API key not configured
              </p>
              <p className="text-xs text-slate-400">
                Use the interactive 3D Earth globe or browse all {countries.length} countries and{' '}
                {items.length} football locations by continent below.
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg w-full pt-2">
              {countries.slice(0, 6).map((c) => (
                <button
                  key={c.country}
                  type="button"
                  onClick={() => jumpToCountry(c)}
                  className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10 hover:border-cyan-400/60 text-left flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-base">{c.flagEmoji}</span>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{c.country}</div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {c.clubs.length} clubs
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <APIProvider key={apiKey} apiKey={apiKey} libraries={['marker']} language="en" region="US">
            <Map
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              mapId="DEMO_MAP_ID"
              defaultCenter={DEFAULT_CENTER}
              defaultZoom={DEFAULT_ZOOM}
              mapTypeId={mapType}
              gestureHandling="greedy"
              disableDefaultUI={false}
              zoomControl={true}
              streetViewControl={true}
              mapTypeControl={false}
              fullscreenControl={true}
              onCameraChanged={handleCameraChange}
              className="w-full h-full"
              style={{ width: '100%', height: '100%' }}
            >
              <WorldMapCameraController
                cameraTarget={effectiveTarget}
                selectedItem={selectedItem}
              />

              {/* Country Flag Markers at low zoom so users can inspect countries across continents */}
              {viewport.zoom <= 4 &&
                countryBadges.map((countrySummary) => {
                    const isCountrySelected = selectedCountry?.country === countrySummary.country;
                    return (
                      <AdvancedMarker
                        key={`country-badge-${countrySummary.country}`}
                        position={{
                          lat: countrySummary.coordinates.lat,
                          lng: countrySummary.coordinates.lng,
                        }}
                        title={`${countrySummary.country} (${countrySummary.continent}) — ${countrySummary.clubs.length} clubs`}
                        onClick={() => jumpToCountry(countrySummary)}
                        zIndex={isCountrySelected ? 500 : 12}
                      >
                        <div
                          className={`px-2 py-0.5 rounded-full border text-[10px] font-mono flex items-center gap-1 shadow-md cursor-pointer ${
                            isCountrySelected
                              ? 'bg-amber-400 border-white text-slate-950 font-bold'
                              : 'bg-[#071224]/90 border-cyan-400/50 text-white'
                          }`}
                        >
                          <span>{countrySummary.flagEmoji}</span>
                          <span className="hidden sm:inline">{countrySummary.code}</span>
                        </div>
                      </AdvancedMarker>
                    );
                  })}

              {/* Clusters & Football Item Markers */}
              {visibleMarkers.map((entry) => {
                if (entry.type === 'cluster') {
                  return (
                    <AdvancedMarker
                      key={entry.key}
                      position={entry.position}
                      title={`${entry.memberCount} football locations — click to zoom`}
                      onClick={() =>
                        setLocalTarget({
                          lat: entry.position.lat,
                          lng: entry.position.lng,
                          zoom: entry.targetZoom,
                          ts: Date.now(),
                        })
                      }
                      zIndex={25}
                    >
                      <div className="cursor-pointer group flex items-center justify-center">
                        <div className="px-2.5 py-1 rounded-full bg-[#0891B2] hover:bg-[#06B6D4] text-white border-2 border-white shadow-lg flex items-center gap-1.5">
                          <Users className="w-3 h-3 shrink-0" />
                          <span className="font-mono text-[11px] tabular-nums">
                            {entry.memberCount}
                          </span>
                        </div>
                      </div>
                    </AdvancedMarker>
                  );
                }

                const { node } = entry;
                const isSelected = Boolean(
                  selectedItem && node.members.some((m) => m.id === selectedItem.id)
                );
                const item = isSelected && selectedItem ? selectedItem : node.primary;
                const multiCount = node.members.length;
                const bgColor =
                  item.type === 'national'
                    ? '#D97706'
                    : item.type === 'stadium'
                    ? '#059669'
                    : item.primaryColor || '#0891B2';

                return (
                  <AdvancedMarker
                    key={node.key}
                    position={node.position}
                    title={
                      multiCount > 1
                        ? `${item.name} (+${multiCount - 1} more in ${item.country})`
                        : `${item.name} (${item.country})`
                    }
                    onClick={() => {
                      onSelectItem(item);
                      setActiveNode({ ...node, primary: item });
                    }}
                    zIndex={isSelected ? 9999 : item.isVerifiedStadium ? 22 : 14}
                  >
                    <div className="relative group cursor-pointer">
                      <div
                        className={`relative w-8 h-8 rounded-full p-1 flex items-center justify-center shadow-md border-2 ${
                          isSelected
                            ? 'border-white scale-115 ring-4 ring-cyan-400/75'
                            : 'border-white/95 hover:border-white'
                        }`}
                        style={{ backgroundColor: bgColor }}
                      >
                        {item.crestUrl ? (
                          <img
                            src={item.crestUrl}
                            alt={item.shortName || item.name}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            onError={(e) =>
                              applyImageFallback(e.currentTarget, item.fallbackCrestUrl)
                            }
                            className="w-full h-full object-contain"
                          />
                        ) : item.type === 'stadium' ? (
                          <MapPin className="w-4 h-4 text-white" />
                        ) : (
                          <span className="text-sm">{item.flagEmoji}</span>
                        )}
                      </div>

                      {multiCount > 1 && (
                        <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 border border-white text-[9px] font-mono flex items-center justify-center text-slate-950 shadow tabular-nums">
                          {multiCount}
                        </div>
                      )}
                    </div>
                  </AdvancedMarker>
                );
              })}

              {activeNode && (
                <InfoWindow
                  position={activeNode.position}
                  onCloseClick={() => setActiveNode(null)}
                  pixelOffset={[0, -34]}
                >
                  <div className="p-2 max-w-[270px] text-slate-900 space-y-2">
                    <div className="flex items-center gap-2.5">
                      {activeNode.primary.crestUrl ? (
                        <img
                          src={activeNode.primary.crestUrl}
                          alt={activeNode.primary.name}
                          referrerPolicy="no-referrer"
                          onError={(e) =>
                            applyImageFallback(
                              e.currentTarget,
                              activeNode.primary.fallbackCrestUrl
                            )
                          }
                          className="w-8 h-8 object-contain shrink-0"
                        />
                      ) : (
                        <span className="text-xl shrink-0">{activeNode.primary.flagEmoji}</span>
                      )}
                      <div className="min-w-0">
                        <span className="block text-[9px] font-mono uppercase tracking-wider text-cyan-700">
                          {activeNode.primary.type} · {activeNode.primary.continent}
                        </span>
                        <h4 className="text-xs font-bold text-slate-950 truncate">
                          {activeNode.primary.name}
                        </h4>
                        <p className="text-[11px] text-slate-600 truncate">
                          {activeNode.primary.flagEmoji} {activeNode.primary.city},{' '}
                          {activeNode.primary.country}
                        </p>
                      </div>
                    </div>

                    {activeNode.primary.stadiumName && (
                      <div className="text-[10px] font-mono text-slate-600 border-t border-slate-200 pt-1.5 flex items-center justify-between gap-2">
                        <span className="truncate">{activeNode.primary.stadiumName}</span>
                        {activeNode.primary.capacity && (
                          <span className="text-slate-900 shrink-0 tabular-nums">
                            {activeNode.primary.capacity.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => onSelectCountry(activeNode.primary.country)}
                        className="flex-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-semibold cursor-pointer flex items-center justify-center gap-1"
                      >
                        <Flag className="w-3 h-3" />
                        <span>Country</span>
                      </button>
                      {(activeNode.primary.type === 'club' ||
                        activeNode.primary.type === 'national') &&
                        activeNode.primary.teamId &&
                        onOpenTeamProfile && (
                          <button
                            type="button"
                            onClick={() => onOpenTeamProfile(activeNode.primary.teamId!)}
                            className="flex-1 px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-700 text-white text-[10px] font-semibold cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Shield className="w-3 h-3" />
                            <span>Profile</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        )}
                      {activeNode.primary.type === 'stadium' &&
                        activeNode.primary.teamId &&
                        onOpenStadiumExplorer && (
                          <button
                            type="button"
                            onClick={() => onOpenStadiumExplorer(activeNode.primary.teamId!)}
                            className="flex-1 px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold cursor-pointer flex items-center justify-center gap-1"
                          >
                            <MapPin className="w-3 h-3" />
                            <span>Stadium</span>
                          </button>
                        )}
                    </div>

                    {activeNode.members.length > 1 && (
                      <div className="pt-1.5 border-t border-slate-200 space-y-1">
                        <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-500">
                          {activeNode.members.length} items at coordinates:
                        </span>
                        <div className="max-h-24 overflow-y-auto space-y-0.5">
                          {activeNode.members.slice(0, 8).map((m) => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => onSelectItem(m)}
                              className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center justify-between gap-2 cursor-pointer ${
                                selectedItem?.id === m.id
                                  ? 'bg-cyan-50 text-cyan-800 font-semibold'
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span className="truncate">{m.name}</span>
                              <span className="text-[9px] font-mono uppercase text-slate-400 shrink-0">
                                {m.type}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </InfoWindow>
              )}
            </Map>
          </APIProvider>
        )}

        {/* Bottom Legend Bar */}
        <div className="absolute bottom-3 left-3 right-12 z-20 pointer-events-none flex items-center justify-between gap-2 flex-wrap">
          <div className="py-1.5 px-3 rounded-xl bg-[#070F1B]/95 border border-white/15 shadow-md pointer-events-auto flex items-center gap-3 text-[10px] font-mono text-slate-200">
            <span className="tabular-nums">{items.length} Pins</span>
            <span className="text-white/25">·</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#0891B2]" />
              <span>Club</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Nation</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Stadium</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectContinent('Global');
              setLocalTarget({ ...DEFAULT_CENTER, zoom: DEFAULT_ZOOM, ts: Date.now() });
            }}
            className="pointer-events-auto py-1.5 px-2.5 rounded-xl bg-[#070F1B]/95 border border-white/15 text-[10px] font-mono text-[#7ADBF0] hover:text-white flex items-center gap-1 cursor-pointer shadow-md"
          >
            <RotateCcw className="w-3 h-3" />
            <span>World Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
});
