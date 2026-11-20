import * as THREE from 'three';
import * as topojson from 'topojson-client';
import countriesAtlas from 'world-atlas/countries-110m.json';
import type { WorldLocationItem } from './worldData';

export const EARTH_RADIUS = 4;

export interface CelestialBodyInfo {
  id: string;
  name: string;
  category: 'Star' | 'Natural Satellite' | 'Terrestrial Planet' | 'Gas Giant' | 'Ice Giant';
  distanceFromSun: string;
  diameter: string;
  orbitalPeriod: string;
  moons: string;
  accentColor: string;
  summary: string;
  footballFact: string;
}

export interface CelestialMeshHandle {
  mesh: THREE.Object3D;
  info: CelestialBodyInfo;
  hitRadius: number;
  baseOrbitAngle?: number;
  orbitSpeed?: number;
  distance?: number;
  yOffset?: number;
}

export interface OceanClickInfo {
  name: string;
  lat: number;
  lng: number;
  description: string;
  nearbyConfederation: string;
}

export interface CountryGeoFeature {
  id: string;
  rawName: string;
  canonicalName: string;
  rings: Array<Array<[number, number]>>; // [lng, lat]
  bbox: [number, number, number, number]; // minLng, maxLng, minLat, maxLat
}

// ============================================================================
// Coordinate & Natural Earth Geo Utilities
// ============================================================================

export function latLngToSphereVector(
  lat: number,
  lng: number,
  radius: number,
  out: THREE.Vector3
): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  out.set(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
  return out;
}

export function sphereVectorToLatLng(point: THREE.Vector3): { lat: number; lng: number } {
  const len = point.length() || 1;
  const nx = point.x / len;
  const ny = THREE.MathUtils.clamp(point.y / len, -1, 1);
  const nz = point.z / len;

  const lat = 90 - Math.acos(ny) * (180 / Math.PI);
  let theta = Math.atan2(nz, -nx);
  if (theta < 0) theta += Math.PI * 2;
  let lng = theta * (180 / Math.PI) - 180;
  if (lng > 180) lng -= 360;
  if (lng < -180) lng += 360;
  return { lat, lng };
}

const NATURAL_EARTH_TO_FIFA: Record<string, string> = {
  'United States of America': 'United States',
  'Dem. Rep. Congo': 'DR Congo',
  "Côte d'Ivoire": 'Ivory Coast',
  Turkey: 'Türkiye',
  'Bosnia and Herz.': 'Bosnia & Herzegovina',
  'Dominican Rep.': 'Dominican Republic',
  'Central African Rep.': 'Central African Republic',
  'Eq. Guinea': 'Equatorial Guinea',
  'S. Sudan': 'South Sudan',
  Taiwan: 'Chinese Taipei',
  China: 'China PR',
  Czechia: 'Czech Republic',
  Macedonia: 'North Macedonia',
  eSwatini: 'Eswatini',
  Ireland: 'Republic of Ireland',
  'Solomon Is.': 'Solomon Islands',
  Brunei: 'Brunei Darussalam',
  'W. Sahara': 'Western Sahara',
  'Falkland Is.': 'Falkland Islands',
  'Fr. S. Antarctic Lands': 'French Southern Territories',
  Somaliland: 'Somalia',
  'N. Cyprus': 'Cyprus',
};

export function mapNaturalEarthToFifaCountry(
  rawName: string,
  lat: number,
  lng: number
): string {
  if (rawName === 'United Kingdom') {
    if (lat >= 54.9 && lng >= -6.8) return 'Scotland';
    if (lat >= 54.0 && lat <= 55.3 && lng <= -5.3) return 'Northern Ireland';
    if (lat >= 51.3 && lat <= 53.5 && lng <= -2.65) return 'Wales';
    return 'England';
  }
  return NATURAL_EARTH_TO_FIFA[rawName] || rawName;
}

let cachedCountries: CountryGeoFeature[] | null = null;
let cachedLandRings: Array<Array<[number, number]>> | null = null;

export function getWorldCountryFeatures(): CountryGeoFeature[] {
  if (cachedCountries) return cachedCountries;

  const atlas = countriesAtlas as unknown as {
    type: 'Topology';
    objects: { countries: any; land?: any };
  };
  const geo = topojson.feature(atlas as any, atlas.objects.countries as any) as unknown as {
    features: Array<{
      id?: string | number;
      properties?: { name?: string };
      geometry: {
        type: 'Polygon' | 'MultiPolygon';
        coordinates: any;
      };
    }>;
  };

  const features: CountryGeoFeature[] = [];
  for (const f of geo.features) {
    const rawName = f.properties?.name || 'Territory';
    const rings: Array<Array<[number, number]>> = [];
    if (f.geometry.type === 'Polygon') {
      for (const r of f.geometry.coordinates as Array<Array<[number, number]>>) {
        if (r.length >= 3) rings.push(r);
      }
    } else if (f.geometry.type === 'MultiPolygon') {
      for (const poly of f.geometry.coordinates as Array<Array<Array<[number, number]>>>) {
        for (const r of poly) {
          if (r.length >= 3) rings.push(r);
        }
      }
    }

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    for (const ring of rings) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }

    features.push({
      id: String(f.id ?? rawName),
      rawName,
      canonicalName: NATURAL_EARTH_TO_FIFA[rawName] || rawName,
      rings,
      bbox: [minLng, maxLng, minLat, maxLat],
    });
  }

  cachedCountries = features;
  return features;
}

export function getMergedLandRings(): Array<Array<[number, number]>> {
  if (cachedLandRings) return cachedLandRings;
  const atlas = countriesAtlas as unknown as {
    type: 'Topology';
    objects: { countries: any; land?: any };
  };

  const landGeo = topojson.merge(
    atlas as any,
    atlas.objects.countries.geometries as any
  ) as unknown as {
    type: 'MultiPolygon';
    coordinates: Array<Array<Array<[number, number]>>>;
  };

  const rings: Array<Array<[number, number]>> = [];
  for (const poly of landGeo.coordinates) {
    // Only outer exterior ring (index 0) and major inland lakes (indices > 0)
    for (const r of poly) {
      if (r.length >= 3) rings.push(r);
    }
  }
  cachedLandRings = rings;
  return rings;
}

function pointInRing(lng: number, lat: number, ring: Array<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    // Skip antimeridian jump edges
    if (Math.abs(xi - xj) > 180) continue;

    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function findCountryAtLatLng(
  lat: number,
  lng: number
): { rawName: string; mappedName: string; feature: CountryGeoFeature } | null {
  const features = getWorldCountryFeatures();
  for (let i = 0; i < features.length; i++) {
    const feat = features[i];
    const [minLng, maxLng, minLat, maxLat] = feat.bbox;
    if (lat < minLat || lat > maxLat) continue;
    // Allow bounding boxes spanning dateline
    if (maxLng - minLng < 340 && (lng < minLng || lng > maxLng)) continue;

    for (const ring of feat.rings) {
      if (pointInRing(lng, lat, ring)) {
        return {
          rawName: feat.rawName,
          mappedName: mapNaturalEarthToFifaCountry(feat.rawName, lat, lng),
          feature: feat,
        };
      }
    }
  }
  return null;
}

export function identifyWaterBody(lat: number, lng: number): OceanClickInfo {
  if (lat > 66.5) {
    return {
      name: 'Arctic Ocean',
      lat,
      lng,
      description: 'Northern polar sea surrounding Greenland, Scandinavia, Russia, and Northern Canada.',
      nearbyConfederation: 'UEFA / CONCACAF / AFC',
    };
  }
  if (lat < -60) {
    return {
      name: 'Southern Ocean',
      lat,
      lng,
      description: 'Encircling Antarctic waters bordering South America, Southern Africa, and Oceania.',
      nearbyConfederation: 'CONMEBOL / CAF / OFC',
    };
  }
  if (lat >= 30 && lat <= 46 && lng >= -5.5 && lng <= 37) {
    return {
      name: 'Mediterranean Sea',
      lat,
      lng,
      description: 'Historic maritime crossroads linking Southern Europe, North Africa, and the Levant.',
      nearbyConfederation: 'UEFA / CAF / AFC',
    };
  }
  if (lat >= 12.5 && lat <= 30 && lng >= 32 && lng <= 44) {
    return {
      name: 'Red Sea',
      lat,
      lng,
      description: 'Warm desert-lined inlet between Northeastern Africa (Egypt, Sudan) and the Arabian Peninsula.',
      nearbyConfederation: 'CAF / AFC',
    };
  }
  if (lat >= 9 && lat <= 23 && lng >= -88 && lng <= -60) {
    return {
      name: 'Caribbean Sea',
      lat,
      lng,
      description: 'Tropical sea bridging North, Central, and South American island football nations.',
      nearbyConfederation: 'CONCACAF / CONMEBOL',
    };
  }
  if (lat >= -35 && lat <= 30 && lng >= 20 && lng <= 115) {
    return {
      name: 'Indian Ocean',
      lat,
      lng,
      description: 'Expansive azure ocean stretching from East Africa and the Arabian Sea to Australia.',
      nearbyConfederation: 'CAF / AFC / OFC',
    };
  }
  if (lng >= -78 && lng <= 20) {
    return {
      name: lat >= 0 ? 'North Atlantic Ocean' : 'South Atlantic Ocean',
      lat,
      lng,
      description:
        lat >= 0
          ? 'Separating Europe and West Africa from North & Central America across iconic trans-Atlantic football links.'
          : 'Uniting the South American and African Atlantic coastlines from Brazil and Argentina to West & Southern Africa.',
      nearbyConfederation: lat >= 0 ? 'UEFA / CONCACAF / CAF' : 'CONMEBOL / CAF',
    };
  }
  return {
    name: lat >= 0 ? 'North Pacific Ocean' : 'South Pacific Ocean',
    lat,
    lng,
    description:
      lat >= 0
        ? 'The Earth’s largest oceanic basin spanning East Asia, Japan, Polynesia, and Western North America.'
        : 'Vast blue Pacific expanse surrounding Oceania, New Zealand, Australia, and the Pacific Islands.',
    nearbyConfederation: 'AFC / OFC / CONCACAF / CONMEBOL',
  };
}

export function buildCountryOutlineGeometry(countryName: string): THREE.BufferGeometry | null {
  const features = getWorldCountryFeatures();
  const normalizedTarget = countryName.toLowerCase();

  // Match either United Kingdom for Home Nations or direct feature match
  const matched = features.filter((f) => {
    const canon = f.canonicalName.toLowerCase();
    const raw = f.rawName.toLowerCase();
    if (canon === normalizedTarget || raw === normalizedTarget) return true;
    if (
      f.rawName === 'United Kingdom' &&
      ['england', 'scotland', 'wales', 'northern ireland'].includes(normalizedTarget)
    ) {
      return true;
    }
    return false;
  });

  if (matched.length === 0) return null;

  const positions: number[] = [];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();

  for (const feat of matched) {
    for (const ring of feat.rings) {
      for (let i = 0; i < ring.length - 1; i++) {
        const [lng1, lat1] = ring[i];
        const [lng2, lat2] = ring[i + 1];
        if (Math.abs(lng2 - lng1) > 180) continue;
        latLngToSphereVector(lat1, lng1, EARTH_RADIUS + 0.018, a);
        latLngToSphereVector(lat2, lng2, EARTH_RADIUS + 0.018, b);
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      }
    }
  }

  if (positions.length === 0) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  return geo;
}

// ============================================================================
// Realistic Natural Earth Procedural Texture Generator
// (Rich Blue Seas, Golden Deserts, Lush Green Grasses, Blue Nile & Rivers,
//  Elevation Bump Map, Water-Specular Roughness Map & Night-Side City Lights)
// ============================================================================

const MAJOR_RIVERS: Array<{
  name: string;
  widthScale: number;
  fertileCorridor?: boolean;
  coords: Array<[number, number]>;
}> = [
  // Main Nile (Khartoum -> Aswan -> Luxor -> Cairo -> Delta)
  {
    name: 'Nile River',
    widthScale: 1.45,
    fertileCorridor: true,
    coords: [
      [32.55, 15.61],
      [33.2, 16.9],
      [33.95, 18.4],
      [32.3, 19.3],
      [30.5, 19.6],
      [31.3, 21.8],
      [32.88, 24.09],
      [32.64, 25.69],
      [32.1, 26.2],
      [31.18, 27.18],
      [30.9, 28.9],
      [31.23, 30.05],
      [31.0, 30.8],
      [30.3, 31.45],
    ],
  },
  // Nile Delta Eastern Branch (Rosetta + Damietta)
  {
    name: 'Nile Delta Damietta',
    widthScale: 1.0,
    fertileCorridor: true,
    coords: [
      [31.23, 30.05],
      [31.38, 30.75],
      [31.82, 31.48],
    ],
  },
  // Blue Nile (Lake Tana -> Ethiopian Highlands -> Khartoum)
  {
    name: 'Blue Nile',
    widthScale: 1.15,
    fertileCorridor: true,
    coords: [
      [37.35, 11.75],
      [36.5, 10.6],
      [35.1, 10.8],
      [34.35, 11.9],
      [33.6, 13.6],
      [32.55, 15.61],
    ],
  },
  // White Nile (Lake Victoria -> Juba -> Malakal -> Khartoum)
  {
    name: 'White Nile',
    widthScale: 1.15,
    fertileCorridor: true,
    coords: [
      [33.2, 0.42],
      [32.4, 2.2],
      [31.6, 4.85],
      [30.9, 7.6],
      [31.65, 9.55],
      [32.2, 12.1],
      [32.55, 15.61],
    ],
  },
  // Amazon River
  {
    name: 'Amazon River',
    widthScale: 1.5,
    coords: [
      [-73.25, -3.75],
      [-69.9, -4.2],
      [-64.8, -3.5],
      [-60.0, -3.12],
      [-55.5, -2.4],
      [-52.2, -1.8],
      [-49.5, -0.3],
    ],
  },
  // Congo River
  {
    name: 'Congo River',
    widthScale: 1.25,
    coords: [
      [25.2, 0.5],
      [21.8, 2.1],
      [18.1, 0.8],
      [15.3, -4.3],
      [12.4, -6.0],
    ],
  },
  // Niger River
  {
    name: 'Niger River',
    widthScale: 1.05,
    fertileCorridor: true,
    coords: [
      [-10.2, 10.6],
      [-7.9, 12.6],
      [-4.1, 14.9],
      [-2.9, 16.7],
      [1.8, 13.8],
      [4.9, 10.1],
      [6.7, 7.8],
      [6.2, 4.6],
    ],
  },
  // Danube River
  {
    name: 'Danube',
    widthScale: 0.9,
    coords: [
      [10.0, 48.4],
      [13.4, 48.5],
      [16.37, 48.2],
      [19.04, 47.5],
      [20.45, 44.8],
      [24.9, 43.7],
      [28.9, 45.2],
    ],
  },
  // Mississippi / Missouri
  {
    name: 'Mississippi',
    widthScale: 1.2,
    coords: [
      [-93.2, 44.9],
      [-91.1, 41.2],
      [-90.2, 38.6],
      [-89.9, 35.1],
      [-91.1, 32.3],
      [-89.3, 29.2],
    ],
  },
  // Tigris & Euphrates
  {
    name: 'Euphrates',
    widthScale: 0.95,
    fertileCorridor: true,
    coords: [
      [38.8, 37.2],
      [40.2, 35.4],
      [43.4, 33.4],
      [44.4, 32.2],
      [47.8, 30.5],
      [48.5, 29.9],
    ],
  },
  // Yangtze
  {
    name: 'Yangtze',
    widthScale: 1.25,
    coords: [
      [97.2, 33.1],
      [101.8, 26.8],
      [106.5, 29.5],
      [111.3, 30.7],
      [114.3, 30.6],
      [118.8, 32.1],
      [121.6, 31.4],
    ],
  },
  // Ganges
  {
    name: 'Ganges',
    widthScale: 1.1,
    coords: [
      [78.2, 30.1],
      [80.3, 26.5],
      [83.0, 25.3],
      [85.1, 25.6],
      [88.4, 24.4],
      [90.4, 22.8],
    ],
  },
  // Paraná
  {
    name: 'Paraná',
    widthScale: 1.1,
    coords: [
      [-51.1, -20.1],
      [-54.6, -25.5],
      [-58.8, -27.5],
      [-60.6, -32.9],
      [-58.4, -34.5],
    ],
  },
];

const INLAND_LAKES: Array<[number, number, number, number]> = [
  // [lng, lat, rxDeg, ryDeg]
  [33.1, -1.2, 1.8, 1.7], // Lake Victoria
  [29.6, -6.2, 0.7, 2.8], // Lake Tanganyika
  [34.5, -12.0, 0.5, 2.2], // Lake Malawi
  [14.2, 13.1, 1.1, 0.9], // Lake Chad
  [-87.2, 47.4, 2.6, 1.2], // Lake Superior
  [-87.0, 43.8, 0.9, 2.1], // Lake Michigan
  [-82.3, 44.8, 1.4, 1.3], // Lake Huron
  [107.8, 53.3, 1.3, 3.2], // Lake Baikal
  [50.8, 41.8, 2.1, 5.2], // Caspian Sea accent
  [-69.4, -15.8, 0.8, 0.6], // Lake Titicaca
];

interface BiomePatch {
  lng: number;
  lat: number;
  rxDeg: number;
  ryDeg: number;
  color: string;
  midColor?: string;
  alpha?: number;
}

// High-contrast geographical biome belts: Golden/Yellow Deserts, Deep Emerald Rainforests,
// Vibrant Grasslands & Savannas, Mountain Highlands, Polar Ice
const BIOME_PATCHES: BiomePatch[] = [
  // === GOLDEN & YELLOW DESERTS ===
  { lng: -6.0, lat: 24.5, rxDeg: 14, ryDeg: 7.5, color: '#e3be68', midColor: '#d3a550', alpha: 0.96 }, // Western Sahara
  { lng: 12.0, lat: 25.0, rxDeg: 17, ryDeg: 8.5, color: '#e6c672', midColor: '#d5a852', alpha: 0.96 }, // Central Sahara (Libya/Algeria)
  { lng: 27.5, lat: 24.0, rxDeg: 11, ryDeg: 8.0, color: '#e7c976', midColor: '#d4aa57', alpha: 0.95 }, // Eastern Sahara (Egypt/Sudan)
  { lng: 44.5, lat: 23.5, rxDeg: 13, ryDeg: 9.0, color: '#e6c574', midColor: '#d2a655', alpha: 0.96 }, // Arabian Desert
  { lng: 39.0, lat: 31.5, rxDeg: 7, ryDeg: 4.5, color: '#d7b268', midColor: '#be9852', alpha: 0.85 }, // Syrian Desert
  { lng: 56.5, lat: 32.0, rxDeg: 8, ryDeg: 6.0, color: '#cca55e', midColor: '#b38d4c', alpha: 0.85 }, // Dasht-e Lut / Iran
  { lng: 62.5, lat: 41.5, rxDeg: 11, ryDeg: 6.0, color: '#d4b06a', midColor: '#b99655', alpha: 0.88 }, // Karakum / Kyzylkum
  { lng: 71.0, lat: 26.8, rxDeg: 4.5, ryDeg: 3.5, color: '#e1be6d', midColor: '#c9a354', alpha: 0.9 }, // Thar Desert
  { lng: 83.5, lat: 39.2, rxDeg: 8.5, ryDeg: 3.5, color: '#d9b870', midColor: '#bfa05c', alpha: 0.92 }, // Taklamakan
  { lng: 103.5, lat: 42.5, rxDeg: 12, ryDeg: 4.5, color: '#d1b171', midColor: '#b39558', alpha: 0.86 }, // Gobi
  { lng: 17.5, lat: -23.5, rxDeg: 6.5, ryDeg: 6.5, color: '#ddb86a', midColor: '#bf9950', alpha: 0.9 }, // Kalahari & Namib
  { lng: 128.0, lat: -24.5, rxDeg: 14, ryDeg: 7.5, color: '#d49450', midColor: '#c27f3f', alpha: 0.94 }, // Australian Outback
  { lng: -69.0, lat: -22.5, rxDeg: 3.5, ryDeg: 6.5, color: '#d3b273', midColor: '#b6975d', alpha: 0.85 }, // Atacama
  { lng: -111.5, lat: 31.5, rxDeg: 7.5, ryDeg: 6.5, color: '#d6b36c', midColor: '#ba9655', alpha: 0.88 }, // Sonoran & Mojave

  // === VIVID GREEN GRASSES, RAINFORESTS & TEMPERATE PLAINS ===
  { lng: -61.5, lat: -4.5, rxDeg: 17, ryDeg: 11, color: '#1b6623', midColor: '#2c7e31', alpha: 0.96 }, // Amazon Rainforest
  { lng: 21.0, lat: 0.5, rxDeg: 12, ryDeg: 8.5, color: '#1d6925', midColor: '#2f8233', alpha: 0.95 }, // Congo Basin
  { lng: -5.0, lat: 7.5, rxDeg: 11, ryDeg: 4.5, color: '#2b7a2f', midColor: '#418f3b', alpha: 0.9 }, // West African Coast
  { lng: 33.5, lat: -6.0, rxDeg: 10, ryDeg: 11, color: '#458d39', midColor: '#569c44', alpha: 0.86 }, // East & Central Africa Grasslands
  { lng: 11.0, lat: 49.5, rxDeg: 22, ryDeg: 11, color: '#3f8434', midColor: '#539742', alpha: 0.92 }, // Europe Green Plains (UK, FR, DE, PL, IT)
  { lng: 34.0, lat: 51.0, rxDeg: 18, ryDeg: 9, color: '#4a8e3d', midColor: '#5c9c48', alpha: 0.85 }, // Eastern Europe / Ukraine Steppe-Grass
  { lng: -85.0, lat: 38.5, rxDeg: 18, ryDeg: 11, color: '#3b7e34', midColor: '#529342', alpha: 0.9 }, // Eastern & Central North America
  { lng: -92.0, lat: 17.5, rxDeg: 10, ryDeg: 7, color: '#246f29', midColor: '#3c8536', alpha: 0.92 }, // Central America & Caribbean
  { lng: -57.5, lat: -30.5, rxDeg: 9, ryDeg: 9.5, color: '#4c943e', midColor: '#60a34b', alpha: 0.9 }, // Pampas, Uruguay, S. Brazil
  { lng: 81.5, lat: 19.5, rxDeg: 9, ryDeg: 9.5, color: '#398333', midColor: '#529640', alpha: 0.88 }, // India Monsoon Grasses
  { lng: 104.5, lat: 15.0, rxDeg: 11, ryDeg: 11, color: '#216e28', midColor: '#338334', alpha: 0.94 }, // Southeast Asia
  { lng: 115.0, lat: -1.5, rxDeg: 19, ryDeg: 9, color: '#1e6b26', midColor: '#318033', alpha: 0.94 }, // Indonesia / Borneo / PNG
  { lng: 114.5, lat: 29.5, rxDeg: 11, ryDeg: 8.5, color: '#3b8236', midColor: '#509341', alpha: 0.88 }, // East China / Korea / Japan
  { lng: 147.0, lat: -33.5, rxDeg: 6.5, ryDeg: 9, color: '#3f8737', midColor: '#529843', alpha: 0.85 }, // Eastern Australia Coast
  { lng: 172.5, lat: -41.5, rxDeg: 6.5, ryDeg: 6, color: '#388535', midColor: '#4d9844', alpha: 0.92 }, // New Zealand

  // === MOUNTAIN HIGHLANDS & ALPINE SNOW RIDGES ===
  { lng: 86.0, lat: 32.0, rxDeg: 14, ryDeg: 5.5, color: '#9c8f7d', midColor: '#b5a998', alpha: 0.9 }, // Himalayas & Tibet
  { lng: 86.0, lat: 29.5, rxDeg: 10, ryDeg: 2.2, color: '#ecf3f8', midColor: '#cad8e3', alpha: 0.72 }, // Himalayan Snow Crest
  { lng: -70.5, lat: -18.0, rxDeg: 4.5, ryDeg: 20, color: '#8a7c6b', midColor: '#9e907e', alpha: 0.82 }, // Andes Mountain Spine
  { lng: -112.0, lat: 45.0, rxDeg: 8, ryDeg: 13, color: '#7d7867', midColor: '#677052', alpha: 0.78 }, // Rockies
  { lng: 10.5, lat: 46.5, rxDeg: 5.5, ryDeg: 2.0, color: '#cbd8e2', midColor: '#7b876a', alpha: 0.65 }, // European Alps
  { lng: 38.5, lat: 9.5, rxDeg: 4.5, ryDeg: 4.5, color: '#648a3f', midColor: '#7c8b4e', alpha: 0.82 }, // Ethiopian Highlands

  // === BOREAL FOREST & POLAR ICE ===
  { lng: 78.0, lat: 60.5, rxDeg: 58, ryDeg: 7.5, color: '#2c5830', midColor: '#3d6b3c', alpha: 0.85 }, // Eurasian Taiga
  { lng: -98.0, lat: 57.5, rxDeg: 34, ryDeg: 6.5, color: '#2d5a32', midColor: '#3f6c3e', alpha: 0.85 }, // Canadian Boreal
  { lng: -42.0, lat: 72.5, rxDeg: 18, ryDeg: 10.5, color: '#eef5fb', midColor: '#d3e4f0', alpha: 0.96 }, // Greenland Ice Sheet
  { lng: 0.0, lat: -80.0, rxDeg: 180, ryDeg: 16, color: '#f1f7fc', midColor: '#d6e7f4', alpha: 0.98 }, // Antarctica Ice Cap
];

function createSeamlessTerrainNoiseTile(): HTMLCanvasElement {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d');
  if (!ctx) return c;

  const img = ctx.createImageData(S, S);
  const data = img.data;
  // Fast deterministic multi-octave periodic value noise
  const hash = (x: number, y: number, seed: number) => {
    const n = Math.sin(((x & 255) * 127.1 + (y & 255) * 311.7 + seed * 74.7)) * 43758.5453;
    return n - Math.floor(n);
  };
  const smoothNoise = (px: number, py: number, freq: number, seed: number) => {
    const fx = (px / S) * freq;
    const fy = (py / S) * freq;
    const ix = Math.floor(fx);
    const iy = Math.floor(fy);
    const tx = fx - ix;
    const ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const ix1 = (ix + 1) % freq;
    const iy1 = (iy + 1) % freq;
    const ix0 = ix % freq;
    const iy0 = iy % freq;
    const v00 = hash(ix0, iy0, seed);
    const v10 = hash(ix1, iy0, seed);
    const v01 = hash(ix0, iy1, seed);
    const v11 = hash(ix1, iy1, seed);
    const a = v00 + (v10 - v00) * sx;
    const b = v01 + (v11 - v01) * sx;
    return a + (b - a) * sy;
  };

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n =
        smoothNoise(x, y, 8, 1) * 0.5 +
        smoothNoise(x, y, 16, 2) * 0.28 +
        smoothNoise(x, y, 32, 3) * 0.14 +
        smoothNoise(x, y, 64, 4) * 0.08;
      const v = Math.max(0, Math.min(255, Math.round(n * 255)));
      const idx = (y * S + x) * 4;
      data[idx] = v;
      data[idx + 1] = v;
      data[idx + 2] = v;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Trace rings onto Canvas 2D, breaking cleanly across +/-180 antimeridian jumps so no lines streak across Earth
function traceRingsToCanvas(
  ctx: CanvasRenderingContext2D,
  rings: Array<Array<[number, number]>>,
  W: number,
  H: number
) {
  const projectX = (lng: number) => ((lng + 180) / 360) * W;
  const projectY = (lat: number) => ((90 - lat) / 180) * H;

  for (const ring of rings) {
    if (ring.length < 3) continue;
    // Detect if ring crosses the antimeridian
    let crossesDateline = false;
    for (let i = 1; i < ring.length; i++) {
      if (Math.abs(ring[i][0] - ring[i - 1][0]) > 180) {
        crossesDateline = true;
        break;
      }
    }

    if (!crossesDateline) {
      ctx.moveTo(projectX(ring[0][0]), projectY(ring[0][1]));
      for (let i = 1; i < ring.length; i++) {
        ctx.lineTo(projectX(ring[i][0]), projectY(ring[i][1]));
      }
      ctx.closePath();
    } else {
      // Unwrap ring continuously along nearest longitude then draw at -W, 0, +W offsets if needed
      const unwrapped: Array<[number, number]> = [[ring[0][0], ring[0][1]]];
      for (let i = 1; i < ring.length; i++) {
        let lng = ring[i][0];
        const prev = unwrapped[i - 1][0];
        while (lng - prev > 180) lng -= 360;
        while (prev - lng > 180) lng += 360;
        unwrapped.push([lng, ring[i][1]]);
      }

      let minLng = Infinity;
      let maxLng = -Infinity;
      for (const [lng] of unwrapped) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      }

      const shifts = [0];
      if (maxLng > 180) shifts.push(-360);
      if (minLng < -180) shifts.push(360);

      for (const shift of shifts) {
        ctx.moveTo(projectX(unwrapped[0][0] + shift), projectY(unwrapped[0][1]));
        for (let i = 1; i < unwrapped.length; i++) {
          ctx.lineTo(projectX(unwrapped[i][0] + shift), projectY(unwrapped[i][1]));
        }
        ctx.closePath();
      }
    }
  }
}

export interface EarthTextureBundle {
  dayTex: THREE.CanvasTexture;
  nightTex: THREE.CanvasTexture;
  roughnessTex: THREE.CanvasTexture;
  bumpTex: THREE.CanvasTexture;
  cloudsTex: THREE.CanvasTexture;
}

interface CachedRawEarthCanvases {
  key: string;
  dayCanvas: HTMLCanvasElement;
  nightCanvas: HTMLCanvasElement;
  roughCanvas: HTMLCanvasElement;
  bumpCanvas: HTMLCanvasElement;
  cloudsCanvas: HTMLCanvasElement;
}

let cachedEarthBundle: CachedRawEarthCanvases | null = null;

export function buildEarthTextures(
  items: WorldLocationItem[],
  highRes: boolean
): EarthTextureBundle {
  const W = highRes ? 2048 : 1024;
  const H = highRes ? 1024 : 512;
  const cacheKey = `${W}x${H}:${items.length}:${items[0]?.id || ''}`;

  if (cachedEarthBundle && cachedEarthBundle.key === cacheKey) {
    return canvasesToThreeTextures(cachedEarthBundle);
  }

  const landRings = getMergedLandRings();
  const countryFeatures = getWorldCountryFeatures();
  const noiseTile = createSeamlessTerrainNoiseTile();

  const projectX = (lng: number) => ((lng + 180) / 360) * W;
  const projectY = (lat: number) => ((90 - lat) / 180) * H;
  const scale = W / 2048;

  // ------------------------------------------------------------------------
  // 1. DAY EARTH TEXTURE (Deep Blue Seas + Shallow Turquoise Shelves + Biomes + Blue Nile)
  // ------------------------------------------------------------------------
  const dayCanvas = document.createElement('canvas');
  dayCanvas.width = W;
  dayCanvas.height = H;
  const ctx = dayCanvas.getContext('2d')!;

  // Rich azure-sapphire ocean depths
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, H);
  oceanGrad.addColorStop(0.0, '#103b73');
  oceanGrad.addColorStop(0.18, '#0b448d');
  oceanGrad.addColorStop(0.5, '#0e5bb3');
  oceanGrad.addColorStop(0.82, '#0b448d');
  oceanGrad.addColorStop(1.0, '#0f3669');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle oceanic bathymetry texture across the seas
  const oceanPattern = ctx.createPattern(noiseTile, 'repeat');
  if (oceanPattern) {
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = oceanPattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Build reusable merged land path
  ctx.save();
  ctx.beginPath();
  traceRingsToCanvas(ctx, landRings, W, H);

  // Concentric turquoise continental shelf glow hugging true Natural Earth coastlines
  const shelfSteps: Array<[number, string]> = [
    [32 * scale, 'rgba(26, 130, 198, 0.20)'],
    [18 * scale, 'rgba(38, 162, 222, 0.24)'],
    [9 * scale, 'rgba(64, 192, 238, 0.30)'],
    [3.5 * scale, 'rgba(116, 218, 248, 0.42)'],
  ];
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const [lw, stroke] of shelfSteps) {
    ctx.lineWidth = lw;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }

  // Clip strictly inside real Natural Earth landmasses for natural terrestrial biomes
  ctx.clip('evenodd');

  // Rich base green land fill (eliminates artificial monochrome look)
  ctx.fillStyle = '#408335';
  ctx.fillRect(0, 0, W, H);

  // Paint geographic biome belts (golden-yellow deserts, emerald rainforests, alpine highlands, polar ice)
  for (const p of BIOME_PATCHES) {
    const cx = projectX(p.lng);
    const cy = projectY(p.lat);
    const rx = (p.rxDeg / 360) * W;
    const ry = (p.ryDeg / 180) * H;
    const rMax = Math.max(rx, ry);

    ctx.save();
    ctx.globalAlpha = p.alpha ?? 0.9;
    ctx.translate(cx, cy);
    ctx.scale(rx / rMax, ry / rMax);

    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rMax);
    g.addColorStop(0, p.color);
    g.addColorStop(0.55, p.midColor || p.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rMax, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Organic multi-octave noise across continents for natural desert dunes, forest canopy, and terrain texture
  if (oceanPattern) {
    ctx.save();
    ctx.globalAlpha = 0.24;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = oceanPattern;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  // Inland Lakes (Lake Victoria, Great Lakes, Tanganyika, Malawi, Baikal, Caspian)
  for (const [lng, lat, rxDeg, ryDeg] of INLAND_LAKES) {
    const cx = projectX(lng);
    const cy = projectY(lat);
    const rx = (rxDeg / 360) * W;
    const ry = (ryDeg / 180) * H;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, ry / Math.max(rx, 0.1));
    ctx.fillStyle = '#1b85d6';
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Major World Rivers & Fertile Nile River Valley across Sahara
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Pass 1: Fertile green alluvial banks along Nile, Niger & Euphrates in desert regions
  for (const river of MAJOR_RIVERS) {
    if (!river.fertileCorridor) continue;
    ctx.beginPath();
    river.coords.forEach(([lng, lat], idx) => {
      const x = projectX(lng);
      const y = projectY(lat);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = 'rgba(54, 134, 48, 0.72)';
    ctx.lineWidth = 6.2 * river.widthScale * scale;
    ctx.stroke();
  }

  // Nile Delta verdant green fan
  {
    const dx = projectX(31.1);
    const dy = projectY(30.9);
    const dg = ctx.createRadialGradient(dx, dy, 1 * scale, dx, dy, 13 * scale);
    dg.addColorStop(0, 'rgba(42, 132, 46, 0.92)');
    dg.addColorStop(1, 'rgba(42, 132, 46, 0)');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(dx, dy, 13 * scale, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pass 2: Vivid river blue outer + bright water core
  for (const river of MAJOR_RIVERS) {
    ctx.beginPath();
    river.coords.forEach(([lng, lat], idx) => {
      const x = projectX(lng);
      const y = projectY(lat);
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#177bd4';
    ctx.lineWidth = 2.9 * river.widthScale * scale;
    ctx.stroke();

    ctx.strokeStyle = '#45b0fa';
    ctx.lineWidth = 1.45 * river.widthScale * scale;
    ctx.stroke();
  }

  // Whisper-faint natural borders inside land (no wireframe grids over oceans)
  ctx.beginPath();
  for (const feat of countryFeatures) {
    traceRingsToCanvas(ctx, feat.rings, W, H);
  }
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 0.65 * scale;
  ctx.stroke();

  ctx.restore(); // exit land clip

  // Subtle crisp coastal shoreline rim
  ctx.save();
  ctx.beginPath();
  traceRingsToCanvas(ctx, landRings, W, H);
  ctx.strokeStyle = 'rgba(135, 215, 245, 0.38)';
  ctx.lineWidth = 1.0 * scale;
  ctx.stroke();
  ctx.restore();

  // ------------------------------------------------------------------------
  // 2. WATER-VS-LAND ROUGHNESS MAP (Oceans shine subtly; land stays matte)
  // ------------------------------------------------------------------------
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = W;
  roughCanvas.height = H;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = 'rgb(76, 76, 76)'; // ~0.30 ocean roughness -> crisp solar ocean glint
  rCtx.fillRect(0, 0, W, H);
  rCtx.beginPath();
  traceRingsToCanvas(rCtx, landRings, W, H);
  rCtx.fillStyle = 'rgb(220, 220, 220)'; // ~0.86 terrestrial land roughness
  rCtx.fill('evenodd');

  // Blue Nile & Major Lakes/Rivers stay shiny like water
  rCtx.save();
  rCtx.clip('evenodd');
  rCtx.lineCap = 'round';
  rCtx.lineJoin = 'round';
  for (const river of MAJOR_RIVERS) {
    rCtx.beginPath();
    river.coords.forEach(([lng, lat], idx) => {
      const x = projectX(lng);
      const y = projectY(lat);
      if (idx === 0) rCtx.moveTo(x, y);
      else rCtx.lineTo(x, y);
    });
    rCtx.strokeStyle = 'rgb(85, 85, 85)';
    rCtx.lineWidth = 2.6 * river.widthScale * scale;
    rCtx.stroke();
  }
  rCtx.restore();

  // ------------------------------------------------------------------------
  // 3. TERRAIN BUMP / RELIEF MAP
  // ------------------------------------------------------------------------
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = W;
  bumpCanvas.height = H;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = 'rgb(18, 18, 18)'; // Sea level
  bCtx.fillRect(0, 0, W, H);
  bCtx.save();
  bCtx.beginPath();
  traceRingsToCanvas(bCtx, landRings, W, H);
  bCtx.fillStyle = 'rgb(100, 100, 100)'; // Continental shelf uplift
  bCtx.fill('evenodd');
  bCtx.clip('evenodd');
  if (oceanPattern) {
    bCtx.globalAlpha = 0.52;
    bCtx.fillStyle = oceanPattern;
    bCtx.fillRect(0, 0, W, H);
  }
  // Mountain chains elevated relief
  const mountainRidges: Array<[number, number, number, number]> = [
    [86.0, 31.5, 13, 5.0],
    [-70.5, -18.0, 4.5, 19],
    [-112.0, 45.0, 7.5, 13],
    [10.5, 46.5, 5.0, 2.0],
    [38.5, 9.5, 4.0, 4.0],
  ];
  for (const [lng, lat, rxDeg, ryDeg] of mountainRidges) {
    const cx = projectX(lng);
    const cy = projectY(lat);
    const rx = (rxDeg / 360) * W;
    const ry = (ryDeg / 180) * H;
    const rMax = Math.max(rx, ry);
    bCtx.save();
    bCtx.translate(cx, cy);
    bCtx.scale(rx / rMax, ry / rMax);
    const g = bCtx.createRadialGradient(0, 0, 0, 0, 0, rMax);
    g.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    g.addColorStop(1, 'rgba(255, 255, 255, 0)');
    bCtx.fillStyle = g;
    bCtx.beginPath();
    bCtx.arc(0, 0, rMax, 0, Math.PI * 2);
    bCtx.fill();
    bCtx.restore();
  }
  bCtx.restore();

  // ------------------------------------------------------------------------
  // 4. NIGHT-SIDE CITY LIGHTS (Warm Amber City Clusters + Illuminated Nile)
  // ------------------------------------------------------------------------
  const nightCanvas = document.createElement('canvas');
  nightCanvas.width = W;
  nightCanvas.height = H;
  const nCtx = nightCanvas.getContext('2d')!;
  nCtx.fillStyle = '#000000';
  nCtx.fillRect(0, 0, W, H);

  const cityGlow = document.createElement('canvas');
  cityGlow.width = 32;
  cityGlow.height = 32;
  const cg = cityGlow.getContext('2d');
  if (cg) {
    const g = cg.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255, 232, 165, 1.0)');
    g.addColorStop(0.35, 'rgba(251, 185, 56, 0.62)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    cg.fillStyle = g;
    cg.fillRect(0, 0, 32, 32);
  }

  // Luminous Nile River cities ribbon from Aswan through Cairo & Delta at night
  nCtx.save();
  nCtx.beginPath();
  MAJOR_RIVERS[0].coords.slice(6).forEach(([lng, lat], idx) => {
    const x = projectX(lng);
    const y = projectY(lat);
    if (idx === 0) nCtx.moveTo(x, y);
    else nCtx.lineTo(x, y);
  });
  nCtx.strokeStyle = 'rgba(255, 200, 90, 0.72)';
  nCtx.lineWidth = 3.2 * scale;
  nCtx.lineCap = 'round';
  nCtx.stroke();
  nCtx.restore();

  const seenGrid = new Uint8Array(Math.ceil(W / 4) * Math.ceil(H / 4));
  const gw = Math.ceil(W / 4);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const x = projectX(item.lng);
    const y = projectY(item.lat);
    const bx = Math.min(gw - 1, Math.max(0, (x / 4) | 0));
    const by = Math.min(Math.ceil(H / 4) - 1, Math.max(0, (y / 4) | 0));
    const key = by * gw + bx;
    if (seenGrid[key] && item.type !== 'national') continue;
    seenGrid[key] = 1;
    const rad = (item.type === 'national' ? 9 : item.isVerifiedStadium ? 7 : 4.5) * scale;
    nCtx.drawImage(cityGlow, x - rad, y - rad, rad * 2, rad * 2);
  }

  // ------------------------------------------------------------------------
  // 5. WISPY PROCEDURAL CLOUD LAYER
  // ------------------------------------------------------------------------
  const CW = highRes ? 1024 : 512;
  const CH = highRes ? 512 : 256;
  const cloudsCanvas = document.createElement('canvas');
  cloudsCanvas.width = CW;
  cloudsCanvas.height = CH;
  const cCtx = cloudsCanvas.getContext('2d')!;
  cCtx.clearRect(0, 0, CW, CH);

  // Soft banded cloud swirls leaving continents, deserts & Blue Nile crisp and clear
  for (let i = 0; i < 160; i++) {
    const u = ((i * 73.17) % 360) / 360;
    const latBand = (Math.sin(i * 1.93) * 0.72 + Math.cos(i * 0.67) * 0.18) * 78;
    const cx = u * CW;
    const cy = ((90 - latBand) / 180) * CH;
    const rx = (24 + (i % 7) * 10) * (CW / 1024);
    const ry = (6 + (i % 5) * 3.5) * (CW / 1024);
    const rMax = Math.max(rx, ry);
    cCtx.save();
    cCtx.translate(cx, cy);
    cCtx.rotate(((i % 9) - 4) * 0.06);
    cCtx.scale(rx / rMax, ry / rMax);
    const cgGrad = cCtx.createRadialGradient(0, 0, 0, 0, 0, rMax);
    cgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.32)');
    cgGrad.addColorStop(0.6, 'rgba(240, 248, 255, 0.14)');
    cgGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    cCtx.fillStyle = cgGrad;
    cCtx.beginPath();
    cCtx.arc(0, 0, rMax, 0, Math.PI * 2);
    cCtx.fill();
    cCtx.restore();
  }

  cachedEarthBundle = {
    key: cacheKey,
    dayCanvas,
    nightCanvas,
    roughCanvas,
    bumpCanvas,
    cloudsCanvas,
  };

  return canvasesToThreeTextures(cachedEarthBundle);
}

function canvasesToThreeTextures(raw: CachedRawEarthCanvases): EarthTextureBundle {
  const dayTex = new THREE.CanvasTexture(raw.dayCanvas);
  dayTex.colorSpace = THREE.SRGBColorSpace;

  const nightTex = new THREE.CanvasTexture(raw.nightCanvas);
  nightTex.colorSpace = THREE.SRGBColorSpace;

  const roughnessTex = new THREE.CanvasTexture(raw.roughCanvas);
  const bumpTex = new THREE.CanvasTexture(raw.bumpCanvas);

  const cloudsTex = new THREE.CanvasTexture(raw.cloudsCanvas);
  cloudsTex.colorSpace = THREE.SRGBColorSpace;
  cloudsTex.wrapS = THREE.RepeatWrapping;

  return { dayTex, nightTex, roughnessTex, bumpTex, cloudsTex };
}

// ============================================================================
// Solar System Environment: Night Stars, Milky Way, Radiant Sun & Distant Planets
// ============================================================================

function createStarSpriteTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.28, 'rgba(255, 255, 255, 0.85)');
  g.addColorStop(0.65, 'rgba(220, 238, 255, 0.22)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSolarCoronaTexture(innerColor: string, outerColor: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 128);
  g.addColorStop(0, innerColor);
  g.addColorStop(0.22, 'rgba(255, 224, 130, 0.88)');
  g.addColorStop(0.5, outerColor);
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  // Subtle diffraction sunbeams
  ctx.save();
  ctx.translate(128, 128);
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 4);
    const beam = ctx.createLinearGradient(-120, 0, 120, 0);
    beam.addColorStop(0, 'rgba(0,0,0,0)');
    beam.addColorStop(0.5, 'rgba(255, 236, 179, 0.24)');
    beam.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = beam;
    ctx.fillRect(-120, -2.5, 240, 5);
  }
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPlanetTexture(
  kind: 'sun' | 'mercury' | 'venus' | 'moon' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune'
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;

  if (kind === 'sun') {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#fff7cc');
    g.addColorStop(0.5, '#ffcf4d');
    g.addColorStop(1, '#ff981a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 90; i++) {
      const x = (i * 53) % 256;
      const y = (i * 29) % 128;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,235,0.45)' : 'rgba(249,115,22,0.35)';
      ctx.beginPath();
      ctx.arc(x, y, 3 + (i % 7), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'moon' || kind === 'mercury') {
    ctx.fillStyle = kind === 'moon' ? '#cfd4dc' : '#a8a29e';
    ctx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 70; i++) {
      const x = (i * 47) % 256;
      const y = (i * 31) % 128;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(71, 85, 105, 0.38)' : 'rgba(226, 232, 240, 0.28)';
      ctx.beginPath();
      ctx.arc(x, y, 2 + (i % 10), 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'venus') {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#f3dfa2');
    g.addColorStop(0.35, '#e6b86a');
    g.addColorStop(0.65, '#f0d48f');
    g.addColorStop(1, '#d9a452');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
  } else if (kind === 'mars') {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#f1f5f9'); // North polar ice cap
    g.addColorStop(0.12, '#c85a32');
    g.addColorStop(0.5, '#d96b3b');
    g.addColorStop(0.88, '#b54925');
    g.addColorStop(1, '#e2e8f0'); // South polar ice cap
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 32; i++) {
      ctx.fillStyle = 'rgba(110, 40, 18, 0.28)';
      ctx.beginPath();
      ctx.ellipse((i * 59) % 256, 24 + ((i * 23) % 80), 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === 'jupiter') {
    const bands = ['#d9b88f', '#b86e42', '#e8d4b4', '#c98856', '#eadbc2', '#a85a36', '#dfc39e'];
    bands.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, (i / bands.length) * 128, 256, 128 / bands.length + 1);
    });
    // Great Red Spot
    ctx.fillStyle = '#c2412c';
    ctx.beginPath();
    ctx.ellipse(158, 82, 16, 9, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === 'saturn') {
    const bands = ['#e5cf9c', '#d1b57b', '#ecdab0', '#c4a46a', '#e3cb96'];
    bands.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, (i / bands.length) * 128, 256, 128 / bands.length + 1);
    });
  } else if (kind === 'uranus') {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#a5f3fc');
    g.addColorStop(0.5, '#67e8f9');
    g.addColorStop(1, '#8be9f5');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#3b82f6');
    g.addColorStop(0.5, '#1d4ed8');
    g.addColorStop(1, '#2563eb');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = 'rgba(147, 197, 253, 0.35)';
    ctx.fillRect(0, 44, 256, 8);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSaturnRingTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 16;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0.0, 'rgba(210, 185, 140, 0)');
  g.addColorStop(0.18, 'rgba(232, 212, 168, 0.72)');
  g.addColorStop(0.48, 'rgba(244, 228, 190, 0.92)');
  g.addColorStop(0.55, 'rgba(80, 68, 52, 0.20)'); // Cassini division
  g.addColorStop(0.62, 'rgba(226, 204, 158, 0.85)');
  g.addColorStop(0.92, 'rgba(210, 185, 140, 0.45)');
  g.addColorStop(1.0, 'rgba(210, 185, 140, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 16);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface SolarSystemSceneResult {
  group: THREE.Group;
  celestialHandles: CelestialMeshHandle[];
  sunGroup: THREE.Group;
  dispose: () => void;
}

export function buildSolarSystemBackdrop(
  sunDistance: number = 88
): SolarSystemSceneResult {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const celestialHandles: CelestialMeshHandle[] = [];

  // 1. Multi-Magnitude Starfield + Milky Way Band
  const starSprite = createStarSpriteTexture();
  disposables.push(starSprite);

  const starCount = 2000;
  const starPos = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starColorPalette = [
    new THREE.Color('#ffffff'),
    new THREE.Color('#cfe8ff'),
    new THREE.Color('#fff3d1'),
    new THREE.Color('#9fd3ff'),
    new THREE.Color('#ffd9a8'),
  ];

  for (let i = 0; i < starCount; i++) {
    const r = 92 + (i % 38);
    // Concentrate 35% of stars along an inclined Milky Way galactic plane
    let x: number;
    let y: number;
    let z: number;
    if (i < 700) {
      const galLon = ((i * 137.508) % 360) * (Math.PI / 180);
      const galLat = (Math.sin(i * 7.31) * 0.22) * Math.PI * 0.5;
      const gx = r * Math.cos(galLat) * Math.cos(galLon);
      const gy = r * Math.sin(galLat);
      const gz = r * Math.cos(galLat) * Math.sin(galLon);
      // Tilt Milky Way 34 degrees
      const tilt = 0.59;
      x = gx;
      y = gy * Math.cos(tilt) - gz * Math.sin(tilt);
      z = gy * Math.sin(tilt) + gz * Math.cos(tilt);
    } else {
      const phi = Math.acos(2 * (((i * 7919) % 10000) / 10000) - 1);
      const theta = ((i * 137.508) % 360) * (Math.PI / 180);
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.cos(phi);
      z = r * Math.sin(phi) * Math.sin(theta);
    }
    starPos[i * 3] = x;
    starPos[i * 3 + 1] = y;
    starPos[i * 3 + 2] = z;

    const c = starColorPalette[i % starColorPalette.length];
    const brightness = 0.45 + ((i * 37) % 100) / 170;
    starColors[i * 3] = c.r * brightness;
    starColors[i * 3 + 1] = c.g * brightness;
    starColors[i * 3 + 2] = c.b * brightness;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
  const starMat = new THREE.PointsMaterial({
    size: 0.72,
    map: starSprite,
    vertexColors: true,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const starsPoints = new THREE.Points(starGeo, starMat);
  group.add(starsPoints);
  disposables.push(starGeo, starMat);

  // 2. Radiant Sun (tracks sunLight direction)
  const sunGroup = new THREE.Group();
  const sunTex = createPlanetTexture('sun');
  const coronaTex = createSolarCoronaTexture('rgba(255, 250, 220, 1)', 'rgba(251, 146, 60, 0.36)');
  const sunGeo = new THREE.SphereGeometry(3.2, 24, 24);
  const sunMat = new THREE.MeshBasicMaterial({ map: sunTex });
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunGroup.add(sunMesh);

  const sunSpriteMat = new THREE.SpriteMaterial({
    map: coronaTex,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sunCorona = new THREE.Sprite(sunSpriteMat);
  sunCorona.scale.set(17, 17, 1);
  sunGroup.add(sunCorona);
  sunGroup.position.set(sunDistance * 0.78, sunDistance * 0.25, sunDistance * 0.57);
  group.add(sunGroup);
  disposables.push(sunTex, coronaTex, sunGeo, sunMat, sunSpriteMat);

  celestialHandles.push({
    mesh: sunMesh,
    hitRadius: 4.5,
    info: {
      id: 'celestial-sun',
      name: 'The Sun',
      category: 'Star',
      distanceFromSun: '0 AU (Solar System Center)',
      diameter: '1,392,700 km (109× Earth)',
      orbitalPeriod: '225–250M yrs (Galactic Center)',
      moons: '8 Planets orbiting',
      accentColor: '#fbbf24',
      summary:
        'Our G-type main-sequence star drives Earth’s day/night cycle, illuminates planetary phases across the solar system, and fuels Earth’s oceans and atmosphere.',
      footballFact:
        'Sunlight determines match kick-off twilight & day/night zones across every FIFA confederation worldwide.',
    },
  });

  // 3. Moon & Distant Solar System Planets
  const planetSpecs: Array<{
    kind: 'moon' | 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';
    radius: number;
    distance: number;
    angle: number;
    yOffset: number;
    orbitSpeed: number;
    hasRing?: boolean;
    ringTilt?: number;
    info: CelestialBodyInfo;
  }> = [
    {
      kind: 'moon',
      radius: 0.65,
      distance: 27,
      angle: 2.15,
      yOffset: 4.5,
      orbitSpeed: 0.032,
      info: {
        id: 'celestial-moon',
        name: 'The Moon (Luna)',
        category: 'Natural Satellite',
        distanceFromSun: '384,400 km from Earth',
        diameter: '3,474 km',
        orbitalPeriod: '27.3 days around Earth',
        moons: 'Orbits Earth',
        accentColor: '#cbd5e1',
        summary:
          'Earth’s rocky natural satellite whose tidal forces shape global oceans, coastlines, and night skies.',
        footballFact:
          'Visible from stadiums worldwide under floodlights and night kick-offs.',
      },
    },
    {
      kind: 'mercury',
      radius: 0.52,
      distance: 66,
      angle: 0.42,
      yOffset: 8.5,
      orbitSpeed: 0.004,
      info: {
        id: 'celestial-mercury',
        name: 'Mercury',
        category: 'Terrestrial Planet',
        distanceFromSun: '0.39 AU (57.9M km)',
        diameter: '4,879 km',
        orbitalPeriod: '88 Earth days',
        moons: '0 Moons',
        accentColor: '#94a3b8',
        summary:
          'The smallest and innermost planet in the Solar System, cratered and closely hugging the Sun.',
        footballFact:
          'One Mercury year lasts roughly a quarter of a domestic European football season.',
      },
    },
    {
      kind: 'venus',
      radius: 0.85,
      distance: 62,
      angle: 0.92,
      yOffset: -6.5,
      orbitSpeed: 0.003,
      info: {
        id: 'celestial-venus',
        name: 'Venus',
        category: 'Terrestrial Planet',
        distanceFromSun: '0.72 AU (108.2M km)',
        diameter: '12,104 km',
        orbitalPeriod: '225 Earth days',
        moons: '0 Moons',
        accentColor: '#fcd34d',
        summary:
          'Earth’s bright cloud-shrouded neighbor, glowing golden in the twilight sky just before sunrise or after sunset.',
        footballFact:
          'Often the brightest celestial beacon visible above open-roof evening stadium matches.',
      },
    },
    {
      kind: 'mars',
      radius: 0.78,
      distance: 48,
      angle: -1.15,
      yOffset: 6.2,
      orbitSpeed: 0.0025,
      info: {
        id: 'celestial-mars',
        name: 'Mars',
        category: 'Terrestrial Planet',
        distanceFromSun: '1.52 AU (227.9M km)',
        diameter: '6,779 km',
        orbitalPeriod: '687 Earth days',
        moons: '2 (Phobos & Deimos)',
        accentColor: '#f97316',
        summary:
          'The rust-red planet featuring towering volcanoes, iron-oxide deserts, and polar ice caps.',
        footballFact:
          'Its gravity is only 38% of Earth’s — a lofted free-kick would soar nearly three times farther.',
      },
    },
    {
      kind: 'jupiter',
      radius: 2.35,
      distance: 76,
      angle: 3.1,
      yOffset: -9.0,
      orbitSpeed: 0.0012,
      info: {
        id: 'celestial-jupiter',
        name: 'Jupiter',
        category: 'Gas Giant',
        distanceFromSun: '5.20 AU (778.5M km)',
        diameter: '139,820 km',
        orbitalPeriod: '11.9 Earth years',
        moons: '95 Known Moons',
        accentColor: '#f59e0b',
        summary:
          'The largest planet in the Solar System, famed for swirling ochre cloud belts and the Great Red Spot storm.',
        footballFact:
          'Over 1,300 Earths could fit inside Jupiter’s massive volume.',
      },
    },
    {
      kind: 'saturn',
      radius: 1.95,
      distance: 84,
      angle: -2.45,
      yOffset: 12.0,
      orbitSpeed: 0.0009,
      hasRing: true,
      ringTilt: 0.46,
      info: {
        id: 'celestial-saturn',
        name: 'Saturn',
        category: 'Gas Giant',
        distanceFromSun: '9.58 AU (1.43B km)',
        diameter: '116,460 km',
        orbitalPeriod: '29.5 Earth years',
        moons: '146+ Moons (incl. Titan)',
        accentColor: '#eab308',
        summary:
          'Golden gas giant adorned by an iconic, sprawling ring system of ice and rocky particles.',
        footballFact:
          'A single Saturn orbit takes longer than seven consecutive FIFA World Cup cycles.',
      },
    },
    {
      kind: 'uranus',
      radius: 1.35,
      distance: 89,
      angle: 1.72,
      yOffset: -15.5,
      orbitSpeed: 0.0006,
      info: {
        id: 'celestial-uranus',
        name: 'Uranus',
        category: 'Ice Giant',
        distanceFromSun: '19.2 AU (2.87B km)',
        diameter: '50,724 km',
        orbitalPeriod: '84 Earth years',
        moons: '28 Moons',
        accentColor: '#67e8f9',
        summary:
          'Aquamarine ice giant tilted nearly sideways on its axis, rolling around the outer Solar System.',
        footballFact:
          'Its 98-degree axial tilt gives each pole 42 straight Earth years of continuous daylight or night.',
      },
    },
    {
      kind: 'neptune',
      radius: 1.32,
      distance: 94,
      angle: -0.45,
      yOffset: 18.0,
      orbitSpeed: 0.0004,
      info: {
        id: 'celestial-neptune',
        name: 'Neptune',
        category: 'Ice Giant',
        distanceFromSun: '30.1 AU (4.50B km)',
        diameter: '49,244 km',
        orbitalPeriod: '164.8 Earth years',
        moons: '16 Moons (incl. Triton)',
        accentColor: '#3b82f6',
        summary:
          'Deep cobalt outer ice giant swept by supersonic methane winds at the edge of the planetary system.',
        footballFact:
          'Neptune completed just its first full orbit since discovery during the 2011 football calendar.',
      },
    },
  ];

  const sharedPlanetGeo = new THREE.SphereGeometry(1, 20, 16);
  disposables.push(sharedPlanetGeo);

  for (const spec of planetSpecs) {
    const tex = createPlanetTexture(spec.kind);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.82,
      metalness: 0.0,
    });
    const holder = new THREE.Group();
    const mesh = new THREE.Mesh(sharedPlanetGeo, mat);
    mesh.scale.setScalar(spec.radius);
    holder.add(mesh);
    disposables.push(tex, mat);

    if (spec.hasRing) {
      const rTex = createSaturnRingTexture();
      const rGeo = new THREE.RingGeometry(spec.radius * 1.35, spec.radius * 2.35, 48);
      const rMat = new THREE.MeshBasicMaterial({
        map: rTex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.92,
      });
      const ringMesh = new THREE.Mesh(rGeo, rMat);
      ringMesh.rotation.x = Math.PI * 0.5 - (spec.ringTilt || 0.45);
      ringMesh.rotation.y = 0.25;
      holder.add(ringMesh);
      disposables.push(rTex, rGeo, rMat);
    }

    holder.position.set(
      Math.cos(spec.angle) * spec.distance,
      spec.yOffset,
      Math.sin(spec.angle) * spec.distance
    );
    group.add(holder);

    celestialHandles.push({
      mesh,
      hitRadius: Math.max(1.4, spec.radius * 1.4),
      info: spec.info,
      baseOrbitAngle: spec.angle,
      orbitSpeed: spec.orbitSpeed,
      distance: spec.distance,
      yOffset: spec.yOffset,
    });
  }

  return {
    group,
    celestialHandles,
    sunGroup,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}
