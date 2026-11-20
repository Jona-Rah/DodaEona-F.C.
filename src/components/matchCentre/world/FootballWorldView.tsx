import React, { useEffect, useRef, useState, useMemo, useCallback, useDeferredValue } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Globe,
  Search,
  MapPin,
  Shield,
  Trophy,
  Flag,
  Navigation,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  X,
  Sun,
  Moon,
  Map as MapIcon,
  Columns2,
  Compass,
  Building2,
  Sparkles,
  Waves,
} from 'lucide-react';
import {
  EARTH_RADIUS,
  buildCountryOutlineGeometry,
  buildEarthTextures,
  buildSolarSystemBackdrop,
  findCountryAtLatLng,
  identifyWaterBody,
  latLngToSphereVector,
  sphereVectorToLatLng,
  type CelestialBodyInfo,
  type CelestialMeshHandle,
  type OceanClickInfo,
} from './earthGlobeBuilder';
import {
  CONTINENT_PRESETS,
  ContinentFilter,
  getAllWorldCompetitions,
  getAllWorldCountries,
  getAllWorldLocations,
  getCountrySummaryByName,
  WorldCompetitionItem,
  WorldCountrySummary,
  WorldLocationItem,
} from './worldData';
import { FootballWorldGoogleMap, GoogleMapCameraTarget } from './FootballWorldGoogleMap';
import { useMatchCentre } from '../../../context/MatchCentreContext';

interface FootballWorldViewProps {
  onOpenTeamProfile?: (teamId: string) => void;
  onOpenStadium?: (teamId: string) => void;
}

type DirectoryTab = 'locations' | 'countries' | 'competitions';
type LocationTypeFilter = 'all' | 'club' | 'national' | 'stadium';
type CompCategoryFilter = 'all' | 'league' | 'cup' | 'continental' | 'international';
type ViewLayoutMode = 'split' | 'globe' | 'maps';

// Pin colors & reusable Three.js math helpers pre-allocated outside render loop

const PIN_COLOR_SELECTED = new THREE.Color('#facc15');
const PIN_COLOR_NATIONAL = new THREE.Color('#f59e0b');
const PIN_COLOR_STADIUM = new THREE.Color('#10b981');
const PIN_COLOR_WOMEN = new THREE.Color('#f472b6');
const PIN_COLOR_MEN = new THREE.Color('#38bdf8');
const _pinDummy = new THREE.Object3D();
const _pinPos = new THREE.Vector3();

function applyCrestFallback(img: HTMLImageElement, fallbackUrl?: string) {
  if (!fallbackUrl || img.dataset.fallbackApplied === '1') return;
  img.dataset.fallbackApplied = '1';
  img.src = fallbackUrl;
}

export const FootballWorldView: React.FC<FootballWorldViewProps> = ({
  onOpenTeamProfile,
  onOpenStadium,
}) => {
  const { openTeamById, openTeamStadium } = useMatchCentre();

  const resolveOpenTeam = useCallback(
    (teamId: string) => {
      if (onOpenTeamProfile) onOpenTeamProfile(teamId);
      else openTeamById(teamId, 1);
    },
    [onOpenTeamProfile, openTeamById]
  );

  const resolveOpenStadium = useCallback(
    (teamId: string) => {
      if (onOpenStadium) onOpenStadium(teamId);
      else openTeamStadium(teamId);
    },
    [onOpenStadium, openTeamStadium]
  );

  const mountRef = useRef<HTMLDivElement>(null);
  const tooltipElRef = useRef<HTMLDivElement>(null);
  const tooltipTitleRef = useRef<HTMLDivElement>(null);
  const tooltipMetaRef = useRef<HTMLDivElement>(null);

  const [viewMode, setViewMode] = useState<ViewLayoutMode>('split');
  const [mapsMountReady, setMapsMountReady] = useState(false);
  const [directoryTab, setDirectoryTab] = useState<DirectoryTab>('locations');
  const [selectedItem, setSelectedItem] = useState<WorldLocationItem | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<WorldCountrySummary | null>(null);
  const [selectedComp, setSelectedComp] = useState<WorldCompetitionItem | null>(null);
  const [selectedCelestial, setSelectedCelestial] = useState<CelestialBodyInfo | null>(null);
  const [selectedOcean, setSelectedOcean] = useState<OceanClickInfo | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeContinent, setActiveContinent] = useState<ContinentFilter>('Global');
  const [typeFilter, setTypeFilter] = useState<LocationTypeFilter>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'men' | 'women'>('all');
  const [confederationFilter, setConfederationFilter] = useState<string>('all');
  const [compFilter, setCompFilter] = useState<CompCategoryFilter>('all');

  const [autoRotate, setAutoRotate] = useState(true);
  const [dayNightMode, setDayNightMode] = useState<'day-night' | 'floodlit'>('day-night');
  const [webglFailed, setWebglFailed] = useState(false);
  const [mapCameraTarget, setMapCameraTarget] = useState<GoogleMapCameraTarget | null>(null);

  // Stagger Google Maps initialization by 160ms in split mode so Three.js WebGL mounts cleanly without main-thread contention
  useEffect(() => {
    if (viewMode === 'maps') {
      setMapsMountReady(true);
      return;
    }
    if (viewMode !== 'split') return;
    const t = window.setTimeout(() => setMapsMountReady(true), 160);
    return () => window.clearTimeout(t);
  }, [viewMode]);

  const allLocations = useMemo(() => getAllWorldLocations(), []);
  const allCountries = useMemo(() => getAllWorldCountries(), []);
  const allCompetitions = useMemo(() => getAllWorldCompetitions(), []);

  // Defer heavy 1,725-pin / Three.js / Google Maps filtering while keeping search typing at 0ms
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Pre-compute lowercased search haystacks once so keystroke filtering does zero per-item string allocations
  const locationSearchIndex = useMemo(() => {
    return allLocations.map((item) =>
      `${item.name} ${item.country} ${item.city} ${item.league || ''} ${item.stadiumName || ''}`.toLowerCase()
    );
  }, [allLocations]);

  const countrySearchIndex = useMemo(() => {
    return allCountries.map((c) =>
      `${c.country} ${c.code} ${c.continent} ${c.domesticLeagues.join(' ')}`.toLowerCase()
    );
  }, [allCountries]);

  const compSearchIndex = useMemo(() => {
    return allCompetitions.map((c) =>
      `${c.name} ${c.region} ${c.country || ''}`.toLowerCase()
    );
  }, [allCompetitions]);

  // Filter items cleanly
  const filteredItems = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    const out: WorldLocationItem[] = [];
    for (let i = 0; i < allLocations.length; i++) {
      const item = allLocations[i];
      if (typeFilter !== 'all' && item.type !== typeFilter) continue;
      if (activeContinent !== 'Global' && item.continent !== activeContinent) continue;
      if (genderFilter !== 'all' && item.subType && item.subType !== genderFilter) continue;
      if (confederationFilter !== 'all' && item.confederation !== confederationFilter) continue;
      if (q && !locationSearchIndex[i].includes(q)) continue;
      out.push(item);
    }
    return out;
  }, [allLocations, locationSearchIndex, typeFilter, activeContinent, genderFilter, confederationFilter, deferredSearchQuery]);

  const filteredCountries = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    const out: WorldCountrySummary[] = [];
    for (let i = 0; i < allCountries.length; i++) {
      const c = allCountries[i];
      if (activeContinent !== 'Global' && c.continent !== activeContinent) continue;
      if (confederationFilter !== 'all' && c.confederation !== confederationFilter) continue;
      if (q && !countrySearchIndex[i].includes(q)) continue;
      out.push(c);
    }
    return out;
  }, [allCountries, countrySearchIndex, activeContinent, confederationFilter, deferredSearchQuery]);

  const filteredCompetitions = useMemo(() => {
    const q = deferredSearchQuery.trim().toLowerCase();
    const out: WorldCompetitionItem[] = [];
    for (let i = 0; i < allCompetitions.length; i++) {
      const c = allCompetitions[i];
      if (compFilter !== 'all' && c.type !== compFilter) continue;
      if (activeContinent !== 'Global' && c.continent !== 'Global' && c.continent !== activeContinent) {
        continue;
      }
      if (genderFilter !== 'all' && c.gender !== genderFilter) continue;
      if (confederationFilter !== 'all' && c.confederation && c.confederation !== confederationFilter) {
        continue;
      }
      if (q && !compSearchIndex[i].includes(q)) continue;
      out.push(c);
    }
    return out;
  }, [allCompetitions, compSearchIndex, compFilter, activeContinent, genderFilter, confederationFilter, deferredSearchQuery]);

  // Refs synced cleanly into the Three.js render loop without tearing down WebGL context
  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const dayNightRef = useRef(dayNightMode);
  dayNightRef.current = dayNightMode;

  const filteredItemsRef = useRef<WorldLocationItem[]>(filteredItems);
  filteredItemsRef.current = filteredItems;

  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const desiredCameraPosRef = useRef<THREE.Vector3 | null>(null);
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const selectionRingRef = useRef<THREE.Mesh | null>(null);
  const countryOutlineGroupRef = useRef<THREE.Group | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const fillLightRef = useRef<THREE.HemisphereLight | null>(null);
  const earthShaderUniformsRef = useRef<{
    uSunDir: { value: THREE.Vector3 };
    uNightLightsMix: { value: number };
  }>({
    uSunDir: { value: new THREE.Vector3(14, 5, 11).normalize() },
    uNightLightsMix: { value: 1.0 },
  });
  const atmosUniformsRef = useRef<{ uSunDir: { value: THREE.Vector3 } }>({
    uSunDir: { value: new THREE.Vector3(14, 5, 11).normalize() },
  });
  const requestRenderRef = useRef<(() => void) | null>(null);
  const pinPositionsRef = useRef<Float32Array>(new Float32Array(0));
  const pinCountRef = useRef<number>(0);

  const flyGlobeTo = useCallback((lat: number, lng: number, distance: number = 9.5) => {
    const nextPos = new THREE.Vector3();
    latLngToSphereVector(lat, lng, distance, nextPos);
    desiredCameraPosRef.current = nextPos;
    requestRenderRef.current?.();
  }, []);

  const handleSelectItem = useCallback(
    (item: WorldLocationItem) => {
      setSelectedItem(item);
      setSelectedComp(null);
      setSelectedCelestial(null);
      setSelectedOcean(null);
      const summary = getCountrySummaryByName(item.country);
      setSelectedCountry(summary);
      setAutoRotate(false);
      flyGlobeTo(item.lat, item.lng, 8.6);
      setMapCameraTarget({
        lat: item.lat,
        lng: item.lng,
        zoom: item.isVerifiedStadium || item.type === 'stadium' ? 13 : 6,
        ts: Date.now(),
      });
    },
    [flyGlobeTo]
  );

  const handleSelectCountry = useCallback(
    (countryName: string) => {
      const summary = getCountrySummaryByName(countryName);
      if (!summary) return;
      setSelectedCountry(summary);
      setSelectedItem(null);
      setSelectedComp(null);
      setSelectedCelestial(null);
      setSelectedOcean(null);
      setAutoRotate(false);
      const currentDist = cameraRef.current ? cameraRef.current.position.length() : 9.2;
      flyGlobeTo(summary.coordinates.lat, summary.coordinates.lng, Math.min(Math.max(currentDist, 7.6), 9.4));
      setMapCameraTarget({
        lat: summary.coordinates.lat,
        lng: summary.coordinates.lng,
        zoom: 5,
        ts: Date.now(),
      });
    },
    [flyGlobeTo]
  );

  const handleSelectContinent = useCallback(
    (continent: ContinentFilter) => {
      setActiveContinent(continent);
      setSelectedCelestial(null);
      setSelectedOcean(null);
      const preset = CONTINENT_PRESETS.find((p) => p.id === continent) || CONTINENT_PRESETS[0];
      if (continent === 'Global') {
        setAutoRotate(true);
        flyGlobeTo(24, 12, 13.5);
      } else {
        setAutoRotate(false);
        flyGlobeTo(preset.lat, preset.lng, 10.2);
      }
      setMapCameraTarget({
        lat: preset.lat,
        lng: preset.lng,
        zoom: preset.zoom,
        ts: Date.now(),
      });
    },
    [flyGlobeTo]
  );

  const handleSelectCompetition = useCallback(
    (comp: WorldCompetitionItem) => {
      setSelectedComp(comp);
      setSelectedItem(null);
      setSelectedCelestial(null);
      setSelectedOcean(null);
      setSelectedCountry(comp.country ? getCountrySummaryByName(comp.country) : null);
      setAutoRotate(false);
      flyGlobeTo(comp.lat, comp.lng, 9.8);
      setMapCameraTarget({
        lat: comp.lat,
        lng: comp.lng,
        zoom: comp.type === 'international' || comp.type === 'continental' ? 3 : 5,
        ts: Date.now(),
      });
    },
    [flyGlobeTo]
  );

  const handleSelectOcean = useCallback((ocean: OceanClickInfo) => {
    setSelectedOcean(ocean);
    setSelectedItem(null);
    setSelectedCountry(null);
    setSelectedComp(null);
    setSelectedCelestial(null);
    setAutoRotate(false);
  }, []);

  const handleSelectCelestial = useCallback((body: CelestialBodyInfo) => {
    setSelectedCelestial(body);
    setSelectedItem(null);
    setSelectedCountry(null);
    setSelectedComp(null);
    setSelectedOcean(null);
    setAutoRotate(false);
  }, []);

  const handleResetGlobe = useCallback(() => {
    setSelectedItem(null);
    setSelectedCountry(null);
    setSelectedComp(null);
    setSelectedCelestial(null);
    setSelectedOcean(null);
    setActiveContinent('Global');
    setAutoRotate(true);
    desiredCameraPosRef.current = new THREE.Vector3(0, 2.2, 13.5);
    setMapCameraTarget({ lat: 24, lng: 12, zoom: 2, ts: Date.now() });
    requestRenderRef.current?.();
  }, []);

  const handleSelectItemRef = useRef(handleSelectItem);
  handleSelectItemRef.current = handleSelectItem;
  const handleSelectCountryRef = useRef(handleSelectCountry);
  handleSelectCountryRef.current = handleSelectCountry;
  const handleSelectOceanRef = useRef(handleSelectOcean);
  handleSelectOceanRef.current = handleSelectOcean;
  const handleSelectCelestialRef = useRef(handleSelectCelestial);
  handleSelectCelestialRef.current = handleSelectCelestial;

  const showGlobe = viewMode === 'split' || viewMode === 'globe';
  const showGoogleMaps = viewMode === 'split' || viewMode === 'maps';

  // Initialize Three.js Interactive 3D Globe once while globe viewport is visible
  useEffect(() => {
    if (!showGlobe || !mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 520;

    // Software WebGL guard (disposes probe context cleanly)
    const isSoftwareGl = (() => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020611);

    // Subtle procedural studio environment for natural water specular glint without washing out dark space
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 0.28;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 260);
    camera.position.set(0, 2.2, 13.5);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5.4;
    controls.maxDistance = 24;
    controls.enablePan = false;
    controls.autoRotate = !isSoftwareGl && autoRotateRef.current;
    controls.autoRotateSpeed = 0.35;
    controlsRef.current = controls;

    // Cancel auto-fly target if user grabs globe manually
    let isInteracting = false;
    let isUpdatingControls = false;
    let dampingUntil = 0;
    const onControlStart = () => {
      desiredCameraPosRef.current = null;
      isInteracting = true;
      dampingUntil = performance.now() + 700;
      scheduleLoop();
    };
    const onControlEnd = () => {
      isInteracting = false;
      dampingUntil = performance.now() + 700;
      scheduleLoop();
    };
    const onControlChange = () => {
      if (!isUpdatingControls) {
        scheduleLoop();
      }
    };
    controls.addEventListener('start', onControlStart);
    controls.addEventListener('end', onControlEnd);
    controls.addEventListener('change', onControlChange);

    // Warm/cool directional Sun & sky/space fill lighting
    const hemiLight = new THREE.HemisphereLight(0xa5d8ff, 0x0c1b33, 0.58);
    scene.add(hemiLight);
    fillLightRef.current = hemiLight;

    const sunLight = new THREE.DirectionalLight(0xfff5e4, 2.85);
    sunLight.position.set(14, 5, 11);
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-14, -6, -12);
    scene.add(rimLight);

    // Distant Night Sky Stars, Milky Way, Radiant Sun & Solar System Planets
    const solarBackdrop = buildSolarSystemBackdrop(88);
    scene.add(solarBackdrop.group);

    // Realistic Natural Earth Textures (Azure Seas, Turquoise Shelves, Yellow Deserts, Green Grasses, Blue Nile)
    const { dayTex, nightTex, roughnessTex, bumpTex, cloudsTex } = buildEarthTextures(
      allLocations,
      !isSoftwareGl
    );
    const maxAniso = isSoftwareGl ? 1 : Math.min(8, renderer.capabilities.getMaxAnisotropy());
    dayTex.anisotropy = maxAniso;
    roughnessTex.anisotropy = maxAniso;
    bumpTex.anisotropy = maxAniso;

    const earthGeo = new THREE.SphereGeometry(
      EARTH_RADIUS,
      isSoftwareGl ? 48 : 72,
      isSoftwareGl ? 48 : 72
    );

    const earthUniforms = earthShaderUniformsRef.current;
    const earthMat = new THREE.MeshStandardMaterial({
      map: dayTex,
      roughnessMap: roughnessTex,
      roughness: 0.94,
      metalness: 0.04,
      bumpMap: bumpTex,
      bumpScale: 0.045,
      emissiveMap: nightTex,
      emissive: new THREE.Color(0xffcf5c),
      emissiveIntensity: 1.0,
    });
    earthMat.onBeforeCompile = (shader) => {
      shader.uniforms.uSunDir = earthUniforms.uSunDir;
      shader.uniforms.uNightLightsMix = earthUniforms.uNightLightsMix;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nvarying vec3 vEarthWorldNormal;'
        )
        .replace(
          '#include <worldpos_vertex>',
          '#include <worldpos_vertex>\nvEarthWorldNormal = normalize(mat3(modelMatrix) * objectNormal);'
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          '#include <common>\nuniform vec3 uSunDir;\nuniform float uNightLightsMix;\nvarying vec3 vEarthWorldNormal;'
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           float earthSunDot = dot(normalize(vEarthWorldNormal), normalize(uSunDir));
           float nightSideFactor = smoothstep(0.14, -0.24, earthSunDot) * uNightLightsMix;
           totalEmissiveRadiance *= nightSideFactor;`
        );
    };
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);

    // Subtle Translucent Drifting Cloud Sphere (keeps continents, deserts & Blue Nile crisp beneath)
    const cloudsGeo = new THREE.SphereGeometry(
      EARTH_RADIUS * 1.011,
      isSoftwareGl ? 36 : 56,
      isSoftwareGl ? 36 : 56
    );
    const cloudsMat = new THREE.MeshLambertMaterial({
      map: cloudsTex,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    scene.add(cloudsMesh);

    // Atmospheric Rayleigh Blue Horizon Fresnel Halo
    const atmosGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.055, 48, 48);
    const atmosMat = new THREE.ShaderMaterial({
      uniforms: {
        uSunDir: atmosUniformsRef.current.uSunDir,
      },
      vertexShader: `
        varying vec3 vNormalWorld;
        varying vec3 vViewDirWorld;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vNormalWorld = normalize(mat3(modelMatrix) * normal);
          vViewDirWorld = normalize(cameraPosition - worldPos.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uSunDir;
        varying vec3 vNormalWorld;
        varying vec3 vViewDirWorld;
        void main() {
          float ndotv = dot(vNormalWorld, -vViewDirWorld);
          float outerFade = smoothstep(0.02, 0.34, ndotv);
          float innerRim = pow(clamp(0.78 - ndotv, 0.0, 1.0), 2.8);
          float rim = outerFade * innerRim;
          float sunFacing = smoothstep(-0.45, 0.75, dot(vNormalWorld, normalize(uSunDir)));
          vec3 dayGlow = vec3(0.24, 0.68, 1.0);
          vec3 twilightGlow = vec3(0.08, 0.26, 0.58);
          vec3 col = mix(twilightGlow, dayGlow, sunFacing);
          gl_FragColor = vec4(col, rim * (0.28 + 0.62 * sunFacing));
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    scene.add(atmosMesh);

    // Selected Country 3D Highlight Border Outline Group
    const countryOutlineGroup = new THREE.Group();
    scene.add(countryOutlineGroup);
    countryOutlineGroupRef.current = countryOutlineGroup;

    // Sleek Low-Poly Tactical Beacon Diamonds (8 tris per pin instead of bulky balls)
    const maxPins = Math.max(allLocations.length, 1500);
    const pinGeo = new THREE.OctahedronGeometry(0.052, 0);
    const pinMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const instancedPins = new THREE.InstancedMesh(pinGeo, pinMat, maxPins);
    instancedPins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedPins);
    instancedMeshRef.current = instancedPins;

    // Selection Highlight Beacon Ring
    const ringGeo = new THREE.RingGeometry(0.095, 0.145, 28);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.96,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.visible = false;
    scene.add(ringMesh);
    selectionRingRef.current = ringMesh;

    // Interactive Raycasting for Pins, Real Countries, Oceans, Sun, Moon & Solar System Planets
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const celestialMeshes = solarBackdrop.celestialHandles.map((h) => h.mesh);
    const countryCountLookup: Record<string, number> = {};
    for (const loc of allLocations) {
      countryCountLookup[loc.country] = (countryCountLookup[loc.country] || 0) + 1;
    }

    let downX = 0;
    let downY = 0;
    let lastHoverCheck = 0;
    let lastHoverKey = '';

    const hideTooltip = () => {
      if (lastHoverKey !== '' && tooltipElRef.current) {
        tooltipElRef.current.style.opacity = '0';
        lastHoverKey = '';
      }
      renderer.domElement.style.cursor = 'grab';
    };

    const showTooltip = (
      rect: DOMRect,
      clientX: number,
      clientY: number,
      key: string,
      title: string,
      meta: string
    ) => {
      renderer.domElement.style.cursor = 'pointer';
      if (!tooltipElRef.current) return;
      const tx = Math.min(Math.max(clientX - rect.left + 14, 8), Math.max(8, rect.width - 230));
      const ty = Math.max(clientY - rect.top - 46, 8);
      tooltipElRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      tooltipElRef.current.style.opacity = '1';
      if (lastHoverKey !== key) {
        lastHoverKey = key;
        if (tooltipTitleRef.current) tooltipTitleRef.current.textContent = title;
        if (tooltipMetaRef.current) tooltipMetaRef.current.textContent = meta;
      }
    };

    const findHitPinIndex = (clientX: number, clientY: number, rect: DOMRect): number => {
      const count = pinCountRef.current;
      const positions = pinPositionsRef.current;
      if (count === 0 || positions.length < count * 3) return -1;

      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const ox = raycaster.ray.origin.x;
      const oy = raycaster.ray.origin.y;
      const oz = raycaster.ray.origin.z;
      const dx = raycaster.ray.direction.x;
      const dy = raycaster.ray.direction.y;
      const dz = raycaster.ray.direction.z;

      const camDist = camera.position.length();
      const invCamDist = camDist > 0 ? 1 / camDist : 0.1;
      const camDirX = ox * invCamDist;
      const camDirY = oy * invCamDist;
      const camDirZ = oz * invCamDist;

      const minFacingDot = 0.65;
      const hitRadius = Math.max(0.085, 0.08 * (camDist / 9.5));
      const hitRadiusSq = hitRadius * hitRadius;

      let bestIdx = -1;
      let bestT = Infinity;

      for (let i = 0; i < count; i++) {
        const base = i * 3;
        const px = positions[base];
        const py = positions[base + 1];
        const pz = positions[base + 2];

        if (px * camDirX + py * camDirY + pz * camDirZ < minFacingDot) continue;

        const vx = px - ox;
        const vy = py - oy;
        const vz = pz - oz;
        const t = vx * dx + vy * dy + vz * dz;
        if (t <= 0 || t >= bestT) continue;

        const distSq = vx * vx + vy * vy + vz * vz - t * t;
        if (distSq <= hitRadiusSq) {
          bestT = t;
          bestIdx = i;
        }
      }
      return bestIdx;
    };

    const findHitCelestial = (clientX: number, clientY: number, rect: DOMRect): CelestialMeshHandle | null => {
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(celestialMeshes, false);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        return solarBackdrop.celestialHandles.find((h) => h.mesh === hitObj) || null;
      }
      return null;
    };

    const handlePointerDown = (e: PointerEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 36) return;
      lastHoverCheck = now;

      const rect = renderer.domElement.getBoundingClientRect();

      // 1. Check Pins
      const idx = findHitPinIndex(e.clientX, e.clientY, rect);
      if (idx >= 0) {
        const item = filteredItemsRef.current[idx];
        if (item) {
          showTooltip(
            rect,
            e.clientX,
            e.clientY,
            `pin:${item.id}`,
            `${item.flagEmoji} ${item.name}`,
            `${item.type} · ${item.country}`
          );
          return;
        }
      }

      // 2. Check Earth Country or Water Body under cursor
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const earthHits = raycaster.intersectObject(earthMesh, false);
      if (earthHits.length > 0) {
        const { lat, lng } = sphereVectorToLatLng(earthHits[0].point);
        const countryMatch = findCountryAtLatLng(lat, lng);
        if (countryMatch) {
          const summary = getCountrySummaryByName(countryMatch.mappedName);
          if (summary) {
            showTooltip(
              rect,
              e.clientX,
              e.clientY,
              `country:${summary.country}`,
              `${summary.flagEmoji} ${summary.country}`,
              `Click country · ${summary.clubs.length} clubs · ${summary.confederation}`
            );
            return;
          }
          showTooltip(
            rect,
            e.clientX,
            e.clientY,
            `terr:${countryMatch.mappedName}`,
            `🌍 ${countryMatch.mappedName}`,
            `${lat.toFixed(1)}°, ${lng.toFixed(1)}° · Click for details`
          );
          return;
        }
        const water = identifyWaterBody(lat, lng);
        showTooltip(
          rect,
          e.clientX,
          e.clientY,
          `water:${water.name}`,
          `🌊 ${water.name}`,
          `${lat.toFixed(1)}°, ${lng.toFixed(1)}° · Click for marine info`
        );
        return;
      }

      // 3. Check distant Sun, Moon or Solar System Planets
      const celestial = findHitCelestial(e.clientX, e.clientY, rect);
      if (celestial) {
        showTooltip(
          rect,
          e.clientX,
          e.clientY,
          celestial.info.id,
          `🪐 ${celestial.info.name}`,
          `${celestial.info.category} · ${celestial.info.distanceFromSun}`
        );
        return;
      }

      hideTooltip();
    };

    const handlePointerLeave = () => {
      hideTooltip();
    };

    const handlePointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (dist > 6) return;
      const rect = renderer.domElement.getBoundingClientRect();

      // 1. Clicked a Football Club / Stadium / National Team Pin
      const idx = findHitPinIndex(e.clientX, e.clientY, rect);
      if (idx >= 0) {
        const item = filteredItemsRef.current[idx];
        if (item) {
          handleSelectItemRef.current(item);
          return;
        }
      }

      // 2. Clicked Earth Landmass / Country / Ocean
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const earthHits = raycaster.intersectObject(earthMesh, false);
      if (earthHits.length > 0) {
        const { lat, lng } = sphereVectorToLatLng(earthHits[0].point);
        const countryMatch = findCountryAtLatLng(lat, lng);
        if (countryMatch) {
          const summary = getCountrySummaryByName(countryMatch.mappedName);
          if (summary) {
            handleSelectCountryRef.current(summary.country);
            return;
          }
          handleSelectOceanRef.current({
            name: countryMatch.mappedName,
            lat,
            lng,
            description: `${countryMatch.mappedName} — Geographic landmass territory at ${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(1)}°${lng >= 0 ? 'E' : 'W'}.`,
            nearbyConfederation: 'International / Earth Atlas',
          });
          return;
        }
        const water = identifyWaterBody(lat, lng);
        handleSelectOceanRef.current(water);
        return;
      }

      // 3. Clicked Sun, Moon or Solar System Planet
      const celestial = findHitCelestial(e.clientX, e.clientY, rect);
      if (celestial) {
        handleSelectCelestialRef.current(celestial.info);
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerleave', handlePointerLeave);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // Pre-allocated animation helpers & viewport-aware paced loop
    const clock = new THREE.Clock();
    const _targetDir = new THREE.Vector3();
    let rafId = 0;
    let timeoutId = 0;
    let disposed = false;
    let loopScheduled = false;
    let needsStaticRender = true;
    let isInViewport = true;
    let lastDrawTime = 0;
    let sunAngle = 0.65;
    let elapsedSolar = 0;

    function syncSunPosition(angle: number) {
      const sx = Math.cos(angle) * 16;
      const sy = 5.2;
      const sz = Math.sin(angle) * 16;
      sunLight.position.set(sx, sy, sz);
      _targetDir.set(sx, sy, sz).normalize();
      earthUniforms.uSunDir.value.copy(_targetDir);
      atmosUniformsRef.current.uSunDir.value.copy(_targetDir);
      solarBackdrop.sunGroup.position.set(_targetDir.x * 88, _targetDir.y * 88, _targetDir.z * 88);
    }
    syncSunPosition(sunAngle);

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (typeof gl?.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            timeoutId = window.setTimeout(poll, 8);
          } else {
            if (sync) gl.deleteSync(sync);
            timeoutId = window.setTimeout(cb, 80);
          }
        };
        timeoutId = window.setTimeout(poll, 8);
      } else {
        timeoutId = window.setTimeout(cb, 80);
      }
    }

    function scheduleLoop() {
      needsStaticRender = true;
      if (disposed || loopScheduled || document.hidden || !isInViewport) return;
      loopScheduled = true;
      rafId = requestAnimationFrame(animate);
    }

    requestRenderRef.current = scheduleLoop;

    const animate = (nowMs: number = performance.now()) => {
      loopScheduled = false;
      if (disposed || document.hidden || !isInViewport) return;

      const isActiveMotion =
        Boolean(desiredCameraPosRef.current) ||
        isInteracting ||
        (!isSoftwareGl && nowMs < dampingUntil);

      const isAutoRotating = autoRotateRef.current;

      if (!isSoftwareGl && isAutoRotating && !isActiveMotion && !needsStaticRender) {
        if (nowMs - lastDrawTime < 30) {
          loopScheduled = true;
          rafId = requestAnimationFrame(animate);
          return;
        }
      }

      if (!isActiveMotion && !isAutoRotating && !needsStaticRender) {
        return;
      }

      lastDrawTime = nowMs;
      needsStaticRender = false;
      const delta = Math.min(clock.getDelta(), 0.08);
      elapsedSolar += delta;

      if (desiredCameraPosRef.current) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, desiredCameraPosRef.current.x, 6.2, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, desiredCameraPosRef.current.y, 6.2, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, desiredCameraPosRef.current.z, 6.2, delta);
        camera.lookAt(controls.target);
        if (camera.position.distanceTo(desiredCameraPosRef.current) < 0.06) {
          camera.position.copy(desiredCameraPosRef.current);
          desiredCameraPosRef.current = null;
          isUpdatingControls = true;
          controls.autoRotate = false;
          controls.update();
          isUpdatingControls = false;
        }
      } else {
        isUpdatingControls = true;
        controls.autoRotate = !isSoftwareGl && isAutoRotating;
        if (isSoftwareGl && isAutoRotating && !isInteracting) {
          camera.position.applyAxisAngle(_targetDir.set(0, 1, 0), delta * 0.14);
          camera.lookAt(controls.target);
        } else {
          controls.update();
        }
        isUpdatingControls = false;
      }

      // Gentle drifting clouds + subtle solar & planetary motion when spinning
      if (isAutoRotating || desiredCameraPosRef.current) {
        cloudsMesh.rotation.y += delta * 0.012;
        if (dayNightRef.current === 'day-night') {
          sunAngle += delta * 0.04;
          syncSunPosition(sunAngle);
        }
        for (const h of solarBackdrop.celestialHandles) {
          if (h.baseOrbitAngle !== undefined && h.orbitSpeed && h.distance && h.mesh.parent) {
            const ang = h.baseOrbitAngle + elapsedSolar * h.orbitSpeed;
            h.mesh.parent.position.set(
              Math.cos(ang) * h.distance,
              h.yOffset || 0,
              Math.sin(ang) * h.distance
            );
            h.mesh.rotation.y += delta * 0.18;
          }
        }
      }

      // Orient selection beacon outward along sphere normal
      if (ringMesh.visible) {
        _targetDir.copy(ringMesh.position).multiplyScalar(2);
        ringMesh.lookAt(_targetDir);
      }

      renderer.render(scene, camera);

      const keepRunning =
        autoRotateRef.current ||
        Boolean(desiredCameraPosRef.current) ||
        isInteracting ||
        (!isSoftwareGl && performance.now() < dampingUntil) ||
        needsStaticRender;

      if (keepRunning && !disposed && !document.hidden && isInViewport) {
        if (isSoftwareGl) {
          afterDraw(() => {
            if (!disposed && !document.hidden && isInViewport) {
              scheduleLoop();
            }
          });
        } else {
          loopScheduled = true;
          rafId = requestAnimationFrame(animate);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && isInViewport) {
        clock.getDelta();
        scheduleLoop();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intersectionObserver =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              const visible = entries[0]?.isIntersecting ?? true;
              if (visible !== isInViewport) {
                isInViewport = visible;
                if (visible) {
                  clock.getDelta();
                  scheduleLoop();
                }
              }
            },
            { threshold: 0.05 }
          )
        : null;
    intersectionObserver?.observe(container);

    scheduleLoop();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || 640;
      const h = mountRef.current.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      scheduleLoop();
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);

    return () => {
      disposed = true;
      requestRenderRef.current = null;
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('resize', handleResize);
      controls.removeEventListener('start', onControlStart);
      controls.removeEventListener('end', onControlEnd);
      controls.removeEventListener('change', onControlChange);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerleave', handlePointerLeave);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      controls.dispose();
      countryOutlineGroup.children.forEach((child) => {
        if ((child as THREE.LineSegments).geometry) {
          (child as THREE.LineSegments).geometry.dispose();
        }
      });
      earthGeo.dispose();
      earthMat.dispose();
      dayTex.dispose();
      nightTex.dispose();
      roughnessTex.dispose();
      bumpTex.dispose();
      cloudsTex.dispose();
      cloudsGeo.dispose();
      cloudsMat.dispose();
      atmosGeo.dispose();
      atmosMat.dispose();
      pinGeo.dispose();
      pinMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      solarBackdrop.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [showGlobe, allLocations]);

  // Update 3D InstancedMesh Pins & flat spatial array whenever filteredItems changes
  useEffect(() => {
    const mesh = instancedMeshRef.current;
    if (!mesh) return;

    const count = Math.min(filteredItems.length, mesh.instanceMatrix.count);
    if (pinPositionsRef.current.length < count * 3) {
      pinPositionsRef.current = new Float32Array(count * 3);
    }
    const positions = pinPositionsRef.current;
    pinCountRef.current = count;

    for (let i = 0; i < count; i++) {
      const item = filteredItems[i];
      const elevation = item.type === 'national' ? 0.08 : item.type === 'stadium' ? 0.065 : 0.048;
      latLngToSphereVector(item.lat, item.lng, EARTH_RADIUS + elevation, _pinPos);
      const base = i * 3;
      positions[base] = _pinPos.x;
      positions[base + 1] = _pinPos.y;
      positions[base + 2] = _pinPos.z;

      _pinDummy.position.copy(_pinPos);
      const scale =
        selectedItem?.id === item.id
          ? 2.1
          : item.type === 'national'
          ? 1.25
          : item.isVerifiedStadium
          ? 1.1
          : 0.72;
      _pinDummy.scale.setScalar(scale);
      _pinDummy.updateMatrix();
      mesh.setMatrixAt(i, _pinDummy.matrix);

      if (selectedItem?.id === item.id) {
        mesh.setColorAt(i, PIN_COLOR_SELECTED);
      } else if (item.type === 'national') {
        mesh.setColorAt(i, PIN_COLOR_NATIONAL);
      } else if (item.type === 'stadium') {
        mesh.setColorAt(i, PIN_COLOR_STADIUM);
      } else if (item.subType === 'women') {
        mesh.setColorAt(i, PIN_COLOR_WOMEN);
      } else {
        mesh.setColorAt(i, PIN_COLOR_MEN);
      }
    }

    mesh.count = count;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    requestRenderRef.current?.();
  }, [filteredItems, selectedItem, showGlobe]);

  // Highlight selected Country with crisp 3D Natural Earth borders + selection beacon
  useEffect(() => {
    const ring = selectionRingRef.current;
    const outlineGroup = countryOutlineGroupRef.current;
    if (outlineGroup) {
      while (outlineGroup.children.length > 0) {
        const child = outlineGroup.children[0] as THREE.LineSegments;
        outlineGroup.remove(child);
        child.geometry?.dispose();
        (child.material as THREE.Material)?.dispose();
      }
      if (selectedCountry) {
        const outlineGeo = buildCountryOutlineGeometry(selectedCountry.country);
        if (outlineGeo) {
          const outlineMat = new THREE.LineBasicMaterial({
            color: 0xfacc15,
            transparent: true,
            opacity: 0.92,
          });
          outlineGroup.add(new THREE.LineSegments(outlineGeo, outlineMat));
        }
      }
    }

    if (ring) {
      if (selectedItem) {
        latLngToSphereVector(selectedItem.lat, selectedItem.lng, EARTH_RADIUS + 0.085, ring.position);
        ring.visible = true;
      } else if (selectedCountry) {
        latLngToSphereVector(
          selectedCountry.coordinates.lat,
          selectedCountry.coordinates.lng,
          EARTH_RADIUS + 0.085,
          ring.position
        );
        ring.visible = true;
      } else {
        ring.visible = false;
      }
    }
    requestRenderRef.current?.();
  }, [selectedItem, selectedCountry, showGlobe]);

  // Update Day/Night vs Full-Lit illumination & Auto-Spin
  useEffect(() => {
    if (!fillLightRef.current || !sunLightRef.current) return;
    if (dayNightMode === 'floodlit') {
      fillLightRef.current.intensity = 2.05;
      sunLightRef.current.intensity = 2.05;
      earthShaderUniformsRef.current.uNightLightsMix.value = 0.22;
    } else {
      fillLightRef.current.intensity = 0.58;
      sunLightRef.current.intensity = 2.85;
      earthShaderUniformsRef.current.uNightLightsMix.value = 1.0;
    }
    requestRenderRef.current?.();
  }, [dayNightMode, autoRotate]);

  return (
    <div className="space-y-5">
      {/* Top Masthead & View Mode Controls */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#071324] via-[#0c213d] to-[#050b16] border border-cyan-500/30 p-5 sm:p-6 shadow-2xl">
        <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-[#7ADBF0] text-[11px] font-mono uppercase tracking-[0.2em]">
              <Globe className="w-4 h-4" />
              <span>3D Football Earth &amp; Google Maps Explorer</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Interactive Football World Atlas
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Explore every continent, FIFA nation, club crest, stadium venue, and major competition across the interactive 3D Earth and synchronized Google Maps.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Layout Switcher: Split / 3D Globe / Google Maps */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[#030712] border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  viewMode === 'split'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Columns2 className="w-3.5 h-3.5" />
                <span>Globe + Maps</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('globe')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  viewMode === 'globe'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>3D Globe</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('maps')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  viewMode === 'maps'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span>Google Maps</span>
              </button>
            </div>

            {showGlobe && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setDayNightMode((prev) => (prev === 'day-night' ? 'floodlit' : 'day-night'))
                  }
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 flex items-center gap-1.5 cursor-pointer"
                >
                  {dayNightMode === 'day-night' ? (
                    <Moon className="w-3.5 h-3.5 text-amber-300" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-cyan-300" />
                  )}
                  <span>{dayNightMode === 'day-night' ? 'Day/Night' : 'Full Lit'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAutoRotate((v) => !v)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer border ${
                    autoRotate
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{autoRotate ? 'Auto-Spin' : 'Paused'}</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleResetGlobe}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 flex items-center gap-1.5 cursor-pointer"
            >
              <Navigation className="w-3.5 h-3.5 text-[#7ADBF0]" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Continent Quick-Jump Bar */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mr-1 shrink-0">
            Continents:
          </span>
          {CONTINENT_PRESETS.map((c) => {
            const active = activeContinent === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectContinent(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap cursor-pointer border transition-colors ${
                  active
                    ? 'bg-[#0891B2] border-cyan-400 text-white'
                    : 'bg-[#030712]/70 border-white/10 text-slate-300 hover:text-white hover:border-cyan-500/40'
                }`}
              >
                {c.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Viewports + Explorer Directory */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Map + Globe Viewports Column */}
        <div className="xl:col-span-8 space-y-5">
          <div
            className={`grid gap-4 ${
              viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'
            }`}
          >
            {/* Three.js 3D Globe */}
            {showGlobe && (
              <div className="relative rounded-2xl overflow-hidden border border-cyan-500/25 bg-[#020611] shadow-2xl h-[480px] sm:h-[540px]">
                {webglFailed ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
                    <Globe className="w-10 h-10 text-cyan-400" />
                    <p className="text-sm font-semibold text-white">
                      3D WebGL viewport unavailable on this device
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      Switch to Google Maps view or select any continent, country, club, or stadium from the directory.
                    </p>
                    <button
                      type="button"
                      onClick={() => setViewMode('maps')}
                      className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 text-xs font-bold cursor-pointer"
                    >
                      Open Google Maps View
                    </button>
                  </div>
                ) : (
                  <>
                    <div
                      ref={mountRef}
                      className="w-full h-full cursor-grab active:cursor-grabbing"
                    />

                    {/* Solid HUD Bar (no backdrop-blur over WebGL canvas) */}
                    <div className="pointer-events-none absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
                      <div className="bg-[#060E1B]/92 border border-white/15 rounded-xl px-3 py-1.5 text-[11px] font-mono text-slate-200 flex items-center gap-2">
                        <Compass className="w-3.5 h-3.5 text-[#7ADBF0] shrink-0" />
                        <span>3D Earth &amp; Solar System · Click Countries, Seas, Pins or Planets</span>
                      </div>
                    </div>

                    {/* Direct DOM Hover Tooltip (0 React re-renders) */}
                    <div
                      ref={tooltipElRef}
                      style={{ opacity: 0, left: 0, top: 0 }}
                      className="pointer-events-none absolute z-30 px-2.5 py-1.5 rounded-lg bg-[#050C17]/95 border border-cyan-400/60 text-xs text-white shadow-xl transition-opacity duration-75"
                    >
                      <div ref={tooltipTitleRef} className="font-bold flex items-center gap-1.5" />
                      <div ref={tooltipMetaRef} className="text-[10px] font-mono text-cyan-300 uppercase" />
                    </div>

                    {/* Bottom 3D Globe Legend */}
                    <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between gap-2">
                      <div className="bg-[#060E1B]/92 border border-white/15 rounded-xl px-3 py-1.5 text-[10px] font-mono text-slate-300 flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> Men&apos;s Club
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#f472b6]" /> Women&apos;s Club
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> National
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#10b981]" /> Stadium
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Google Maps Synchronized Explorer (staggered in split mode to avoid startup stall) */}
            {showGoogleMaps && (
              <div className="h-[480px] sm:h-[540px]">
                {mapsMountReady ? (
                  <FootballWorldGoogleMap
                    items={filteredItems}
                    countries={filteredCountries}
                    selectedItem={selectedItem}
                    selectedCountry={selectedCountry}
                    activeContinent={activeContinent}
                    cameraTarget={mapCameraTarget}
                    onSelectItem={handleSelectItem}
                    onSelectCountry={handleSelectCountry}
                    onSelectContinent={handleSelectContinent}
                    onOpenTeamProfile={resolveOpenTeam}
                    onOpenStadiumExplorer={resolveOpenStadium}
                  />
                ) : (
                  <div className="w-full h-full rounded-2xl border border-cyan-500/25 bg-[#050C17] flex items-center justify-center text-xs font-mono text-slate-400">
                    Preparing Google Maps Explorer...
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected Location / Country / Competition / Ocean / Solar System Inspector Card */}
          {(selectedItem || selectedComp || selectedCountry || selectedCelestial || selectedOcean) && (
            <div className="rounded-2xl bg-[#07101F] border border-cyan-500/35 p-5 shadow-xl space-y-4">
              {selectedCelestial && (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-2xl border border-white/20 flex items-center justify-center shrink-0"
                        style={{ background: `${selectedCelestial.accentColor}22` }}
                      >
                        <Sparkles className="w-5 h-5" style={{ color: selectedCelestial.accentColor }} />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                          Solar System · {selectedCelestial.category}
                        </span>
                        <h3 className="text-lg font-bold text-white">{selectedCelestial.name}</h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCelestial(null)}
                      aria-label="Close celestial details"
                      className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#040914] border border-white/10">
                      <span className="text-[10px] text-slate-400 block">Distance</span>
                      <span className="font-semibold text-white">{selectedCelestial.distanceFromSun}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#040914] border border-white/10">
                      <span className="text-[10px] text-slate-400 block">Diameter</span>
                      <span className="font-semibold text-white">{selectedCelestial.diameter}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#040914] border border-white/10">
                      <span className="text-[10px] text-slate-400 block">Orbit Period</span>
                      <span className="font-semibold text-white">{selectedCelestial.orbitalPeriod}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#040914] border border-white/10">
                      <span className="text-[10px] text-slate-400 block">Satellites</span>
                      <span className="font-semibold text-white">{selectedCelestial.moons}</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{selectedCelestial.summary}</p>
                  <p className="text-[11px] font-mono text-cyan-300">{selectedCelestial.footballFact}</p>
                </div>
              )}

              {selectedOcean && (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-400/40 flex items-center justify-center text-sky-300 shrink-0">
                        <Waves className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-sky-300">
                          Earth Geography · {selectedOcean.nearbyConfederation}
                        </span>
                        <h3 className="text-lg font-bold text-white">{selectedOcean.name}</h3>
                        <p className="text-[11px] font-mono text-slate-400 tabular-nums">
                          Coordinates: {selectedOcean.lat.toFixed(2)}°, {selectedOcean.lng.toFixed(2)}°
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedOcean(null)}
                      aria-label="Close geographic details"
                      className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{selectedOcean.description}</p>
                </div>
              )}

              {selectedItem && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-14 h-14 rounded-2xl bg-[#0B182E] border border-cyan-500/30 p-2 flex items-center justify-center shrink-0">
                        {selectedItem.crestUrl ? (
                          <img
                            src={selectedItem.crestUrl}
                            alt={selectedItem.name}
                            referrerPolicy="no-referrer"
                            onError={(e) =>
                              applyCrestFallback(e.currentTarget, selectedItem.fallbackCrestUrl)
                            }
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-2xl">{selectedItem.flagEmoji}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-cyan-400">
                          <span>{selectedItem.type}</span>
                          <span>·</span>
                          <span>{selectedItem.continent}</span>
                          <span>·</span>
                          <span>{selectedItem.confederation}</span>
                        </div>
                        <h2 className="text-lg sm:text-xl font-bold text-white truncate">
                          {selectedItem.name}
                        </h2>
                        <p className="text-xs text-slate-300">
                          {selectedItem.flagEmoji} {selectedItem.city}, {selectedItem.country}
                          {selectedItem.league ? ` · ${selectedItem.league}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {selectedItem.teamId &&
                        (selectedItem.type === 'club' || selectedItem.type === 'national') && (
                          <button
                            type="button"
                            onClick={() => resolveOpenTeam(selectedItem.teamId!)}
                            className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>Open Team Profile</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      {selectedItem.teamId && (
                        <button
                          type="button"
                          onClick={() => resolveOpenStadium(selectedItem.teamId!)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 hover:bg-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Stadium Info</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedItem(null)}
                        aria-label="Close location details"
                        className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stadium Photo + Home Teams when available */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-white/10">
                    {selectedItem.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-white/10 h-32 bg-black">
                        <img
                          src={selectedItem.imageUrl}
                          alt={selectedItem.stadiumName || selectedItem.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div
                      className={`space-y-2 text-xs text-slate-300 ${
                        selectedItem.imageUrl ? 'md:col-span-2' : 'md:col-span-3'
                      }`}
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {selectedItem.stadiumName && (
                          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/10">
                            <span className="text-[10px] text-slate-400 block">Stadium</span>
                            <span className="font-semibold text-white truncate block">
                              {selectedItem.stadiumName}
                            </span>
                          </div>
                        )}
                        {selectedItem.capacity && (
                          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/10">
                            <span className="text-[10px] text-slate-400 block">Capacity</span>
                            <span className="font-semibold text-white tabular-nums">
                              {selectedItem.capacity.toLocaleString()}
                            </span>
                          </div>
                        )}
                        {selectedItem.yearOpened && (
                          <div className="p-2 rounded-lg bg-white/[0.03] border border-white/10">
                            <span className="text-[10px] text-slate-400 block">Opened</span>
                            <span className="font-semibold text-white tabular-nums">
                              {selectedItem.yearOpened}
                            </span>
                          </div>
                        )}
                        <div className="p-2 rounded-lg bg-white/[0.03] border border-white/10">
                          <span className="text-[10px] text-slate-400 block">Coordinates</span>
                          <span className="font-mono text-[11px] text-cyan-300 tabular-nums">
                            {selectedItem.lat.toFixed(2)}, {selectedItem.lng.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {selectedItem.description && (
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {selectedItem.description}
                        </p>
                      )}

                      {selectedItem.homeTeams && selectedItem.homeTeams.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-mono uppercase text-slate-400 mr-1">
                            Home Clubs:
                          </span>
                          {selectedItem.homeTeams.map((ht) => (
                            <button
                              key={ht.id}
                              type="button"
                              onClick={() => resolveOpenTeam(ht.id)}
                              className="px-2 py-1 rounded-lg bg-white/[0.05] border border-white/10 hover:border-cyan-400 text-xs text-white flex items-center gap-1.5 cursor-pointer"
                            >
                              {ht.crestUrl && (
                                <img
                                  src={ht.crestUrl}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  className="w-3.5 h-3.5 object-contain"
                                />
                              )}
                              <span>{ht.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {selectedComp && (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-amber-950/70 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                          {selectedComp.type} · {selectedComp.gender} · {selectedComp.region}
                        </span>
                        <h3 className="text-lg font-bold text-white">{selectedComp.name}</h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedComp(null)}
                      className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-slate-300">{selectedComp.description}</p>
                  {selectedComp.participatingTeams.length > 0 && (
                    <div className="pt-2 border-t border-white/10">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-2">
                        Participating Clubs / National Teams ({selectedComp.participatingTeams.length})
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                        {selectedComp.participatingTeams.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => resolveOpenTeam(t.id)}
                            className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 hover:border-cyan-400 text-xs text-slate-200 hover:text-white flex items-center gap-1.5 cursor-pointer"
                          >
                            {t.crestUrl && (
                              <img
                                src={t.crestUrl}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="w-3.5 h-3.5 object-contain"
                              />
                            )}
                            <span>{t.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Highlighted Country Breakdown */}
              {selectedCountry && (
                <div
                  className={`${
                    selectedItem || selectedComp ? 'pt-4 border-t border-white/10' : ''
                  } space-y-3`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl">{selectedCountry.flagEmoji}</span>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {selectedCountry.country} Football Profile
                        </h4>
                        <span className="text-[11px] font-mono text-cyan-300">
                          {selectedCountry.continent} · {selectedCountry.confederation} ·{' '}
                          {selectedCountry.clubs.length} Clubs · {selectedCountry.stadiums.length}{' '}
                          Stadiums
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {viewMode === 'globe' && (
                        <button
                          type="button"
                          onClick={() => setViewMode('split')}
                          className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 text-xs font-semibold cursor-pointer"
                        >
                          Show in Google Maps
                        </button>
                      )}
                      {!selectedItem && !selectedComp && (
                        <button
                          type="button"
                          onClick={() => setSelectedCountry(null)}
                          className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {/* National Teams */}
                    <div className="p-3 rounded-xl bg-[#040914] border border-white/10 space-y-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block">
                        National Teams
                      </span>
                      {selectedCountry.mensNationalTeam ? (
                        <button
                          type="button"
                          onClick={() => resolveOpenTeam(selectedCountry.mensNationalTeam!.id)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-cyan-500/20 text-white flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate">{selectedCountry.mensNationalTeam.name}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 text-cyan-300" />
                        </button>
                      ) : (
                        <div className="text-slate-400">
                          {selectedCountry.country} Senior ({selectedCountry.confederation})
                        </div>
                      )}
                      {selectedCountry.womensNationalTeam && (
                        <button
                          type="button"
                          onClick={() => resolveOpenTeam(selectedCountry.womensNationalTeam!.id)}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-rose-500/20 text-white flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate">{selectedCountry.womensNationalTeam.name}</span>
                          <ExternalLink className="w-3 h-3 shrink-0 text-rose-300" />
                        </button>
                      )}
                    </div>

                    {/* Domestic Competitions */}
                    <div className="p-3 rounded-xl bg-[#040914] border border-white/10 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 block">
                        Domestic Competitions
                      </span>
                      {selectedCountry.domesticLeagues.length > 0 ? (
                        <div className="space-y-1">
                          {selectedCountry.domesticLeagues.map((lg) => (
                            <div key={lg} className="text-white font-medium truncate">
                              • {lg}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-400">National Association Cups</div>
                      )}
                      {selectedCountry.domesticCups.map((cup) => (
                        <div key={cup} className="text-amber-300 text-[11px] truncate">
                          🏆 {cup}
                        </div>
                      ))}
                    </div>

                    {/* Registered Clubs & Stadiums */}
                    <div className="p-3 rounded-xl bg-[#040914] border border-white/10 space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 block">
                        Top Clubs &amp; Venues ({selectedCountry.clubs.length})
                      </span>
                      {selectedCountry.clubs.length > 0 ? (
                        <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                          {selectedCountry.clubs.slice(0, 8).map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => handleSelectItem(c)}
                              className="w-full text-left px-2 py-1 rounded bg-white/[0.03] hover:bg-white/10 text-slate-200 hover:text-white flex items-center justify-between gap-2 cursor-pointer"
                            >
                              <span className="truncate">{c.name}</span>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {c.subType === 'women' ? '♀' : '♂'}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-400">
                          Home Ground: {selectedCountry.nationalStadiumName}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar: Search, Filters & World Explorer Directory */}
        <div className="xl:col-span-4 bg-[#081120] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col h-[540px] xl:h-[640px]">
          {/* Search Input */}
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search clubs, countries, stadiums, leagues..."
              className="w-full bg-[#030712] border border-white/10 rounded-xl pl-10 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Primary Mode Switcher: Locations | Countries | Competitions */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {(
              [
                { id: 'locations', label: 'Pins', count: filteredItems.length },
                { id: 'countries', label: 'Countries', count: filteredCountries.length },
                { id: 'competitions', label: 'Leagues', count: filteredCompetitions.length },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDirectoryTab(tab.id)}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer border ${
                  directoryTab === tab.id
                    ? 'bg-cyan-500/20 border-cyan-400/70 text-cyan-200'
                    : 'bg-[#030712] border-white/10 text-slate-400 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] font-mono opacity-80 tabular-nums">{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Contextual Sub-Filters */}
          {directoryTab === 'locations' && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-2.5 mb-2.5 border-b border-white/10">
              {(
                [
                  { id: 'all', label: 'All', icon: Globe },
                  { id: 'club', label: 'Clubs', icon: Shield },
                  { id: 'national', label: 'Nations', icon: Flag },
                  { id: 'stadium', label: 'Stadiums', icon: MapPin },
                ] as const
              ).map((f) => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTypeFilter(f.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1 shrink-0 cursor-pointer border ${
                      typeFilter === f.id
                        ? 'bg-[#0891B2] border-cyan-400 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{f.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {directoryTab === 'competitions' && (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-2.5 mb-2.5 border-b border-white/10">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'league', label: 'Domestic' },
                  { id: 'cup', label: 'Cups' },
                  { id: 'continental', label: 'Continental' },
                  { id: 'international', label: 'International' },
                ] as const
              ).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCompFilter(c.id)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold shrink-0 cursor-pointer border ${
                    compFilter === c.id
                      ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {/* Gender & Confederation Dropdowns */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value as 'all' | 'men' | 'women')}
              aria-label="Filter by men's or women's football"
              className="bg-[#030712] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Men&apos;s &amp; Women&apos;s</option>
              <option value="men">Men&apos;s Football</option>
              <option value="women">Women&apos;s Football</option>
            </select>
            <select
              value={confederationFilter}
              onChange={(e) => setConfederationFilter(e.target.value)}
              aria-label="Filter by FIFA confederation"
              className="bg-[#030712] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Confederations</option>
              <option value="UEFA">UEFA</option>
              <option value="CONMEBOL">CONMEBOL</option>
              <option value="CONCACAF">CONCACAF</option>
              <option value="CAF">CAF</option>
              <option value="AFC">AFC</option>
              <option value="OFC">OFC</option>
            </select>
          </div>

          {/* Scrollable Directory List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {directoryTab === 'locations' && (
              <>
                {filteredItems.slice(0, 120).map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectItem(item)}
                      className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-400 text-white'
                          : 'bg-[#030712] border-white/5 hover:border-cyan-500/40 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-[#0A1628] border border-white/10 p-1 flex items-center justify-center shrink-0">
                          {item.crestUrl ? (
                            <img
                              src={item.crestUrl}
                              alt=""
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              onError={(e) => applyCrestFallback(e.currentTarget, item.fallbackCrestUrl)}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <span className="text-base">{item.flagEmoji}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono uppercase text-cyan-400 truncate">
                            {item.type} · {item.flagEmoji} {item.country}
                          </div>
                          <div className="text-xs font-bold text-white truncate">{item.name}</div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                    </button>
                  );
                })}
                {filteredItems.length > 120 && (
                  <p className="text-center text-[11px] font-mono text-slate-400 py-2">
                    Showing top 120 of {filteredItems.length} pins — refine search or continent to narrow results.
                  </p>
                )}
              </>
            )}

            {directoryTab === 'countries' &&
              filteredCountries.map((country) => {
                const isSelected = selectedCountry?.country === country.country;
                return (
                  <button
                    key={country.country}
                    type="button"
                    onClick={() => handleSelectCountry(country.country)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 text-white'
                        : 'bg-[#030712] border-white/5 hover:border-cyan-500/40 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{country.flagEmoji}</span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {country.country}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 truncate">
                          {country.continent} · {country.clubs.length} clubs ·{' '}
                          {country.stadiums.length} stadiums
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </button>
                );
              })}

            {directoryTab === 'competitions' &&
              filteredCompetitions.map((comp) => {
                const isSelected = selectedComp?.id === comp.id;
                return (
                  <button
                    key={comp.id}
                    type="button"
                    onClick={() => handleSelectCompetition(comp)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-400 text-white'
                        : 'bg-[#030712] border-white/5 hover:border-cyan-500/40 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Trophy className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{comp.name}</div>
                        <div className="text-[10px] font-mono text-slate-400 truncate">
                          {comp.region} · {comp.type} · {comp.participatingTeams.length} teams
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </button>
                );
              })}

            {((directoryTab === 'locations' && filteredItems.length === 0) ||
              (directoryTab === 'countries' && filteredCountries.length === 0) ||
              (directoryTab === 'competitions' && filteredCompetitions.length === 0)) && (
              <div className="text-center py-12 text-slate-400 text-xs">
                No matching records found. Try clearing filters or selecting Global.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
