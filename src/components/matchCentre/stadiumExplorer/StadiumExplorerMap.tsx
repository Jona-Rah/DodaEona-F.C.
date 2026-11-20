import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  Compass,
  AlertTriangle,
  RotateCcw,
  Loader2,
  MapPin,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { StadiumRecord } from '../../../data/stadiumsDatabase';

interface StadiumExplorerMapProps {
  stadiums: StadiumRecord[];
  selectedStadium: StadiumRecord | null;
  onSelectStadium: (stadium: StadiumRecord) => void;
  fitFilterKey?: string;
  apiKey?: string;
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

interface StadiumNode {
  key: string;
  position: { lat: number; lng: number };
  primary: StadiumRecord;
  clubs: StadiumRecord[];
}

interface ClusterItem {
  type: 'cluster';
  key: string;
  position: { lat: number; lng: number };
  count: number;
  targetZoom: number;
  clubsCount: number;
}

interface SingleItem {
  type: 'node';
  node: StadiumNode;
}

type RenderMarkerItem = ClusterItem | SingleItem;

function applyCrestFallback(img: HTMLImageElement, fallbackUrl: string) {
  if (img.dataset.fallbackApplied === '1') return;
  img.dataset.fallbackApplied = '1';
  img.src = fallbackUrl;
}

// Controller component to smoothly pan/zoom camera when selected stadium, filter scope, or region changes
const MapInnerController: React.FC<{
  selectedStadium: StadiumRecord | null;
  stadiums: StadiumRecord[];
  fitFilterKey?: string;
  regionTarget: { center: { lat: number; lng: number }; zoom: number; ts: number } | null;
  defaultZoom: number;
}> = ({ selectedStadium, stadiums, fitFilterKey, regionTarget, defaultZoom }) => {
  const map = useMap();
  const prevFilterKeyRef = useRef<string | undefined>(fitFilterKey);
  const prevSelectedIdRef = useRef<string | null>(selectedStadium?.id || null);

  useEffect(() => {
    if (!map || !selectedStadium) return;
    if (prevSelectedIdRef.current === selectedStadium.id) return;
    prevSelectedIdRef.current = selectedStadium.id;

    map.panTo(selectedStadium.coordinates);
    const currentZoom = map.getZoom() || defaultZoom;
    const desiredZoom = selectedStadium.isVerifiedStadium ? 15 : 10;
    if (currentZoom < desiredZoom - 2 || (!selectedStadium.isVerifiedStadium && currentZoom > 13)) {
      map.setZoom(desiredZoom);
    }
  }, [map, selectedStadium, defaultZoom]);

  useEffect(() => {
    if (!map || !fitFilterKey || prevFilterKeyRef.current === fitFilterKey) return;
    prevFilterKeyRef.current = fitFilterKey;

    if (stadiums.length === 0) return;

    // Collect distinct coordinate points
    const seen: Record<string, true> = {};
    const points: Array<{ lat: number; lng: number }> = [];
    for (const s of stadiums) {
      const k = `${s.coordinates.lat.toFixed(4)},${s.coordinates.lng.toFixed(4)}`;
      if (!seen[k]) {
        seen[k] = true;
        points.push(s.coordinates);
      }
      if (points.length >= 60) break;
    }

    if (points.length === 1) {
      map.panTo(points[0]);
      map.setZoom(stadiums[0].isVerifiedStadium ? 15 : 10);
      return;
    }

    const gMaps = (
      globalThis as unknown as {
        google?: {
          maps?: {
            LatLngBounds?: new () => {
              extend: (latLng: { lat: number; lng: number }) => void;
            };
          };
        };
      }
    ).google?.maps;

    if (gMaps?.LatLngBounds) {
      const bounds = new gMaps.LatLngBounds();
      points.forEach((pt) => bounds.extend(pt));
      map.fitBounds(bounds as never, { top: 64, right: 32, bottom: 56, left: 32 });
    }
  }, [map, stadiums, fitFilterKey]);

  useEffect(() => {
    if (!map || !regionTarget) return;
    map.panTo(regionTarget.center);
    map.setZoom(regionTarget.zoom);
  }, [map, regionTarget]);

  return null;
};

const REGION_PRESETS: Array<{ label: string; flag: string; center: { lat: number; lng: number }; zoom: number }> = [
  { label: 'Europe', flag: '🇪🇺', center: { lat: 48.5, lng: 5.0 }, zoom: 5 },
  { label: 'UK', flag: '🇬🇧', center: { lat: 53.0, lng: -1.5 }, zoom: 6 },
  { label: 'Spain', flag: '🇪🇸', center: { lat: 40.2, lng: -3.7 }, zoom: 6 },
  { label: 'Germany', flag: '🇩🇪', center: { lat: 51.2, lng: 10.4 }, zoom: 6 },
  { label: 'Italy', flag: '🇮🇹', center: { lat: 42.5, lng: 12.5 }, zoom: 6 },
  { label: 'France', flag: '🇫🇷', center: { lat: 46.8, lng: 2.3 }, zoom: 6 },
  { label: 'Americas', flag: '🌎', center: { lat: 37.0, lng: -95.0 }, zoom: 4 },
  { label: 'Asia/Pacific', flag: '🌏', center: { lat: 15.0, lng: 105.0 }, zoom: 3 },
];

const DEFAULT_CENTER = { lat: 48.8566, lng: 2.3522 };
const DEFAULT_ZOOM = 5;

export const StadiumExplorerMap: React.FC<StadiumExplorerMapProps> = ({
  stadiums,
  selectedStadium,
  onSelectStadium,
  fitFilterKey,
  apiKey: propApiKey,
}) => {
  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      propApiKey ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY) ||
      ''
    );
  });
  const [keyStatus, setKeyStatus] = useState<'loading' | 'ready' | 'missing'>(() =>
    propApiKey ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY)
      ? 'ready'
      : 'loading'
  );
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [activeNode, setActiveNode] = useState<StadiumNode | null>(null);
  const [regionTarget, setRegionTarget] = useState<{
    center: { lat: number; lng: number };
    zoom: number;
    ts: number;
  } | null>(null);
  const [isQuotaExceeded, setIsQuotaExceeded] = useState(false);
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: DEFAULT_ZOOM,
    bounds: null,
  });

  // Fetch API key from backend BEFORE mounting APIProvider so Maps never initializes with an empty key
  useEffect(() => {
    if (apiKey) {
      setKeyStatus('ready');
      return;
    }
    let isSubscribed = true;
    setKeyStatus('loading');
    fetch('/api/maps/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isSubscribed) return;
        const resolved = typeof data?.apiKey === 'string' ? data.apiKey.trim() : '';
        if (resolved) {
          setApiKey(resolved);
          setKeyStatus('ready');
        } else {
          setKeyStatus('missing');
        }
      })
      .catch(() => {
        if (isSubscribed) setKeyStatus('missing');
      });
    return () => {
      isSubscribed = false;
    };
  }, [apiKey]);

  // Quota exceeded listener
  useEffect(() => {
    const handleQuotaExceeded = () => setIsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    return () => {
      window.removeEventListener('gmp-quota-exceeded', handleQuotaExceeded);
    };
  }, []);

  // Group co-located stadiums (shared grounds & city hubs) into clean coordinate nodes
  // Note: Using plain Record<> dictionary (never new Map()) per react-google-maps scope rule
  const coordinateNodes: StadiumNode[] = useMemo(() => {
    const groups: Record<string, StadiumNode> = {};
    for (const stadium of stadiums) {
      const key = `${stadium.coordinates.lat.toFixed(5)},${stadium.coordinates.lng.toFixed(5)}`;
      if (!groups[key]) {
        groups[key] = {
          key,
          position: stadium.coordinates,
          primary: stadium,
          clubs: [stadium],
        };
      } else {
        groups[key].clubs.push(stadium);
        if (selectedStadium && stadium.id === selectedStadium.id) {
          groups[key].primary = stadium;
        }
      }
    }
    return Object.values(groups);
  }, [stadiums, selectedStadium]);

  // Sync InfoWindow with selected stadium node
  useEffect(() => {
    if (!selectedStadium) {
      setActiveNode(null);
      return;
    }
    const matching = coordinateNodes.find((n) =>
      n.clubs.some((c) => c.id === selectedStadium.id)
    );
    if (matching) {
      setActiveNode({
        ...matching,
        primary: selectedStadium,
      });
    }
  }, [selectedStadium, coordinateNodes]);

  // Spatial clustering + viewport filtering for smooth map performance
  const visibleMarkers: RenderMarkerItem[] = useMemo(() => {
    const { zoom, bounds } = viewport;

    let inView = coordinateNodes;
    if (bounds) {
      const latPad = Math.max(2, (bounds.north - bounds.south) * 0.2);
      const lngPad = Math.max(2, (bounds.east - bounds.west) * 0.2);
      inView = coordinateNodes.filter((node) => {
        const isSelectedNode =
          selectedStadium && node.clubs.some((c) => c.id === selectedStadium.id);
        if (isSelectedNode) return true;
        const { lat, lng } = node.position;
        const inLat = lat >= bounds.south - latPad && lat <= bounds.north + latPad;
        const inLng =
          bounds.east >= bounds.west
            ? lng >= bounds.west - lngPad && lng <= bounds.east + lngPad
            : lng >= bounds.west - lngPad || lng <= bounds.east + lngPad;
        return inLat && inLng;
      });
    }

    if (zoom >= 8 || inView.length <= 45) {
      const sorted = [...inView].sort((a, b) => {
        const aSel = selectedStadium && a.clubs.some((c) => c.id === selectedStadium.id) ? 1 : 0;
        const bSel = selectedStadium && b.clubs.some((c) => c.id === selectedStadium.id) ? 1 : 0;
        if (aSel !== bSel) return bSel - aSel;
        const aVer = a.primary.isVerifiedStadium ? 1 : 0;
        const bVer = b.primary.isVerifiedStadium ? 1 : 0;
        if (aVer !== bVer) return bVer - aVer;
        return b.primary.capacity - a.primary.capacity;
      });
      return sorted.slice(0, 90).map((node) => ({ type: 'node', node }));
    }

    const cellSizeDeg = Math.max(0.8, 22 / Math.pow(2, Math.max(1, zoom - 2)));
    const buckets: Record<string, { nodes: StadiumNode[]; latSum: number; lngSum: number }> = {};
    let selectedNode: StadiumNode | null = null;

    for (const node of inView) {
      if (selectedStadium && node.clubs.some((c) => c.id === selectedStadium.id)) {
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

    const result: RenderMarkerItem[] = [];
    if (selectedNode) {
      result.push({ type: 'node', node: selectedNode });
    }

    for (const [cellKey, bucket] of Object.entries(buckets)) {
      if (bucket.nodes.length === 1) {
        result.push({ type: 'node', node: bucket.nodes[0] });
      } else {
        const clubsCount = bucket.nodes.reduce((sum, n) => sum + n.clubs.length, 0);
        result.push({
          type: 'cluster',
          key: `cluster-${cellKey}`,
          position: {
            lat: bucket.latSum / bucket.nodes.length,
            lng: bucket.lngSum / bucket.nodes.length,
          },
          count: bucket.nodes.length,
          clubsCount,
          targetZoom: Math.min(13, zoom + 3),
        });
      }
    }

    return result.slice(0, 90);
  }, [coordinateNodes, viewport, selectedStadium]);

  const handleCameraChange = useCallback(
    (ev: { detail: { zoom: number; bounds?: { north: number; south: number; east: number; west: number } } }) => {
      const nextZoom = ev.detail.zoom;
      const nextBounds = ev.detail.bounds || null;
      setViewport((prev) => {
        if (
          prev.zoom === nextZoom &&
          prev.bounds &&
          nextBounds &&
          Math.abs(prev.bounds.north - nextBounds.north) < 0.05 &&
          Math.abs(prev.bounds.west - nextBounds.west) < 0.05
        ) {
          return prev;
        }
        return { zoom: nextZoom, bounds: nextBounds };
      });
    },
    []
  );

  const handleResetWorld = () => {
    setRegionTarget({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, ts: Date.now() });
  };

  return (
    <div className="relative w-full h-full min-h-[460px] sm:min-h-[540px] rounded-2xl overflow-hidden border border-white/15 light:border-slate-300 shadow-lg bg-[#060D17] light:bg-slate-100 flex flex-col">
      {/* Quota Exceeded Banner */}
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

      {/* Top Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none gap-2">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pointer-events-auto p-1 rounded-xl bg-[#070F1B]/92 light:bg-white/95 backdrop-blur-md border border-white/15 light:border-slate-300 shadow-md">
          <button
            type="button"
            onClick={handleResetWorld}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-slate-200 light:text-slate-700 hover:text-white light:hover:text-slate-900 hover:bg-white/10 light:hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            title="Reset to Europe overview"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
            <span className="hidden sm:inline">Overview</span>
          </button>
          {REGION_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setRegionTarget({ center: p.center, zoom: p.zoom, ts: Date.now() })}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-slate-200 light:text-slate-700 hover:text-white light:hover:text-slate-900 hover:bg-white/10 light:hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <span>{p.flag}</span>
              <span className="hidden md:inline">{p.label}</span>
            </button>
          ))}
        </div>

        {/* Map / Satellite Segmented Control */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#070F1B]/92 light:bg-white/95 backdrop-blur-md border border-white/15 light:border-slate-300 shadow-md pointer-events-auto shrink-0">
          <button
            type="button"
            onClick={() => setMapType('roadmap')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              mapType === 'roadmap'
                ? 'bg-[#0891B2] text-white shadow-sm'
                : 'text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900'
            }`}
          >
            Map
          </button>
          <button
            type="button"
            onClick={() => setMapType('hybrid')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              mapType === 'hybrid'
                ? 'bg-[#0891B2] text-white shadow-sm'
                : 'text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900'
            }`}
          >
            Satellite
          </button>
        </div>
      </div>

      {/* Interactive Google Map Body */}
      <div className="flex-1 relative w-full h-full">
        {keyStatus === 'loading' ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-300 light:text-slate-700 p-6">
            <Loader2 className="w-7 h-7 animate-spin text-[#0891B2]" />
            <span className="font-mono text-xs uppercase tracking-widest">
              Loading Google Maps Stadium Atlas
            </span>
          </div>
        ) : keyStatus === 'missing' || !apiKey ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-slate-300 light:text-slate-700 p-6 text-center">
            <MapPin className="w-8 h-8 text-amber-500" />
            <p className="text-sm text-white light:text-slate-900">
              Google Maps API configuration is currently unavailable.
            </p>
            <p className="text-xs text-slate-400 light:text-slate-600 max-w-md">
              Browse all {stadiums.length} venues from the directory and open any stadium in Google Maps or Street View.
            </p>
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
              <MapInnerController
                selectedStadium={selectedStadium}
                stadiums={stadiums}
                fitFilterKey={fitFilterKey}
                regionTarget={regionTarget}
                defaultZoom={DEFAULT_ZOOM}
              />

              {visibleMarkers.map((item) => {
                if (item.type === 'cluster') {
                  return (
                    <AdvancedMarker
                      key={item.key}
                      position={item.position}
                      title={`${item.clubsCount} clubs in region — click to zoom in`}
                      onClick={() =>
                        setRegionTarget({
                          center: item.position,
                          zoom: item.targetZoom,
                          ts: Date.now(),
                        })
                      }
                      zIndex={25}
                    >
                      <div className="cursor-pointer group flex items-center justify-center">
                        <div className="px-2.5 py-1 rounded-full bg-[#0891B2] hover:bg-[#06B6D4] text-white border-2 border-white shadow-lg flex items-center gap-1.5 transition-transform group-hover:scale-110">
                          <Users className="w-3 h-3 shrink-0" />
                          <span className="font-mono text-[11px] tabular-nums">
                            {item.clubsCount}
                          </span>
                        </div>
                      </div>
                    </AdvancedMarker>
                  );
                }

                const { node } = item;
                const stadium = node.primary;
                const isSelected = Boolean(
                  selectedStadium && node.clubs.some((c) => c.id === selectedStadium.id)
                );
                const multiCount = node.clubs.length;

                return (
                  <AdvancedMarker
                    key={node.key}
                    position={node.position}
                    title={
                      multiCount > 1
                        ? `${stadium.name} (${multiCount} clubs)`
                        : `${stadium.name} — ${stadium.clubName}`
                    }
                    onClick={() => {
                      onSelectStadium(stadium);
                      setActiveNode(node);
                    }}
                    zIndex={isSelected ? 9999 : stadium.isVerifiedStadium ? 20 : 10}
                  >
                    <div className="relative group cursor-pointer transition-transform duration-150 hover:scale-115">
                      <div
                        className={`relative w-8 h-8 rounded-full p-1 flex items-center justify-center shadow-lg border-2 transition-all ${
                          isSelected
                            ? 'border-white scale-125 ring-4 ring-cyan-400/75 shadow-cyan-500/40'
                            : 'border-white/95 hover:border-white'
                        }`}
                        style={{
                          backgroundColor: stadium.primaryColor || '#0891B2',
                        }}
                      >
                        <img
                          src={stadium.clubCrestUrl}
                          alt={stadium.clubShortName}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) =>
                            applyCrestFallback(e.currentTarget, stadium.fallbackCrestUrl)
                          }
                          className="w-full h-full object-contain filter drop-shadow-sm"
                        />
                      </div>

                      {multiCount > 1 ? (
                        <div className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-amber-400 border border-white text-[9px] font-mono flex items-center justify-center text-slate-950 shadow tabular-nums">
                          {multiCount}
                        </div>
                      ) : (
                        <div
                          className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border border-white text-[8px] flex items-center justify-center text-white ${
                            stadium.gender === 'women' ? 'bg-rose-500' : 'bg-sky-600'
                          }`}
                        >
                          {stadium.gender === 'women' ? '♀' : '♂'}
                        </div>
                      )}

                      <div
                        className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] mx-auto mt-[-1px]"
                        style={{
                          borderTopColor: stadium.primaryColor || '#0891B2',
                        }}
                      />
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
                      <img
                        src={activeNode.primary.clubCrestUrl}
                        alt={activeNode.primary.clubName}
                        referrerPolicy="no-referrer"
                        onError={(e) =>
                          applyCrestFallback(
                            e.currentTarget,
                            activeNode.primary.fallbackCrestUrl
                          )
                        }
                        className="w-8 h-8 object-contain shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <h4 className="text-xs text-slate-950 truncate">
                            {activeNode.primary.name}
                          </h4>
                          {activeNode.primary.isVerifiedStadium && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 truncate">
                          {activeNode.primary.clubName}
                        </p>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-600 gap-2">
                      <span className="truncate">
                        {activeNode.primary.city}, {activeNode.primary.country}
                      </span>
                      <span className="text-slate-950 shrink-0 tabular-nums">
                        {activeNode.primary.capacity.toLocaleString()} seats
                      </span>
                    </div>

                    {activeNode.clubs.length > 1 && (
                      <div className="pt-1.5 border-t border-slate-200 space-y-1">
                        <span className="block text-[9px] font-mono uppercase tracking-wider text-slate-500">
                          {activeNode.clubs.length} clubs at this location:
                        </span>
                        <div className="max-h-28 overflow-y-auto space-y-0.5">
                          {activeNode.clubs.slice(0, 10).map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => onSelectStadium(c)}
                              className={`w-full text-left px-2 py-1 rounded text-[11px] flex items-center gap-2 cursor-pointer transition-colors ${
                                selectedStadium?.id === c.id
                                  ? 'bg-cyan-50 text-cyan-800'
                                  : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  c.gender === 'women' ? 'bg-rose-500' : 'bg-sky-600'
                                }`}
                              />
                              <span className="truncate">{c.clubName}</span>
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
      </div>

      {/* Bottom Legend Bar (clean static telemetry — no pulsing status dots) */}
      <div className="absolute bottom-3 left-3 right-12 z-20 pointer-events-none flex items-center justify-between flex-wrap gap-2">
        <div className="py-1.5 px-3 rounded-xl bg-[#070F1B]/92 light:bg-white/95 backdrop-blur-md border border-white/15 light:border-slate-300 shadow-md pointer-events-auto flex items-center gap-3 text-[11px] font-mono">
          <span className="text-white light:text-slate-900 tabular-nums">
            {stadiums.length} Clubs Mapped
          </span>
          <span className="text-white/25 light:text-slate-300">·</span>
          <div className="flex items-center gap-2.5 text-slate-300 light:text-slate-700">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Men&apos;s</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Women&apos;s</span>
            </span>
          </div>
        </div>

        {selectedStadium && (
          <div className="py-1.5 px-3 rounded-xl bg-[#0891B2] text-white backdrop-blur-md shadow-md pointer-events-auto flex items-center gap-2 text-[11px] font-mono">
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate max-w-[220px]">
              {selectedStadium.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
