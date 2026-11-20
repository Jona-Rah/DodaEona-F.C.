import React, { useState } from 'react';
import type {
  TrophyDesignConfig,
  TrophyMaterial,
  TrophySilhouette,
} from '../../../types/competitionMaker';
import championsCupImg from '../../../assets/images/trophy_champions_cup_1794751433241.jpg';
import worldCupGoldImg from '../../../assets/images/trophy_world_cup_gold_1794751434445.jpg';
import leagueCrownCupImg from '../../../assets/images/trophy_league_crown_cup_1794751436202.jpg';
import meisterschalePlateImg from '../../../assets/images/trophy_meisterschale_plate_1794751437702.jpg';
import continentalChaliceImg from '../../../assets/images/trophy_continental_chalice_1794751438424.jpg';
import goldenDomesticCupImg from '../../../assets/images/trophy_golden_domestic_cup_1794751438979.jpg';

export const AI_TROPHY_PORTRAIT_OPTIONS = [
  {
    id: 'championsCup',
    label: 'European Champions Cup',
    subtitle: 'Silver Amphora · Big Ears',
    url: championsCupImg,
    rawPath: '/src/assets/images/trophy_champions_cup_1794751433241.jpg',
  },
  {
    id: 'worldCupGold',
    label: 'World Cup Globe',
    subtitle: '18k Gold Globe · Malachite Base',
    url: worldCupGoldImg,
    rawPath: '/src/assets/images/trophy_world_cup_gold_1794751434445.jpg',
  },
  {
    id: 'leagueCrownCup',
    label: 'Royal League Crown',
    subtitle: 'Silver Cup · 24k Gold Crown',
    url: leagueCrownCupImg,
    rawPath: '/src/assets/images/trophy_league_crown_cup_1794751436202.jpg',
  },
  {
    id: 'meisterschalePlate',
    label: 'Championship Shield Plate',
    subtitle: 'Engraved Silver · Tourmaline',
    url: meisterschalePlateImg,
    rawPath: '/src/assets/images/trophy_meisterschale_plate_1794751437702.jpg',
  },
  {
    id: 'continentalChalice',
    label: 'Continental Chalice',
    subtitle: 'Flared Silver · Gold Marble Plinth',
    url: continentalChaliceImg,
    rawPath: '/src/assets/images/trophy_continental_chalice_1794751438424.jpg',
  },
  {
    id: 'goldenDomesticCup',
    label: 'Grand Knockout Gold Cup',
    subtitle: '24k Gold & Crystal · Royal Ribbons',
    url: goldenDomesticCupImg,
    rawPath: '/src/assets/images/trophy_golden_domestic_cup_1794751438979.jpg',
  },
] as const;

interface TrophyArtworkProps {
  trophy: Pick<
    TrophyDesignConfig,
    'silhouette' | 'material' | 'primaryColor' | 'accentColor' | 'name' | 'engraving'
  > & {
    id?: string;
    presetId?: string;
    imageUrl?: string;
  };
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-10 h-10',
  md: 'w-16 h-16',
  lg: 'w-24 h-24',
  xl: 'w-32 h-32',
};

function resolveAiTrophyImage(
  trophy: TrophyArtworkProps['trophy']
): string | null {
  if (trophy.imageUrl === 'svg') return null;

  if (trophy.imageUrl) {
    const matched = AI_TROPHY_PORTRAIT_OPTIONS.find(
      (opt) => opt.rawPath === trophy.imageUrl || opt.url === trophy.imageUrl
    );
    if (matched) return matched.url;
    return trophy.imageUrl;
  }

  const idLower = (trophy.id || '').toLowerCase();
  const presetLower = (trophy.presetId || '').toLowerCase();
  const nameLower = (trophy.name || '').toLowerCase();

  if (
    idLower.includes('ucl') ||
    idLower.includes('facup') ||
    idLower.includes('uecl') ||
    presetLower === 'ucl-36' ||
    nameLower.includes('champions league') ||
    nameLower.includes('fa cup') ||
    nameLower.includes('conference')
  ) {
    return championsCupImg;
  }

  if (
    idLower.includes('wc') ||
    idLower.includes('seriea') ||
    presetLower === 'world-cup-2026' ||
    nameLower.includes('world cup') ||
    nameLower.includes('scudetto') ||
    nameLower.includes('serie a')
  ) {
    return worldCupGoldImg;
  }

  if (
    idLower.includes('league') ||
    nameLower.includes('premier league') ||
    trophy.silhouette === 'crown'
  ) {
    return leagueCrownCupImg;
  }

  if (
    idLower.includes('bundesliga') ||
    nameLower.includes('meisterschale') ||
    trophy.silhouette === 'plate' ||
    trophy.silhouette === 'shield'
  ) {
    return meisterschalePlateImg;
  }

  if (
    idLower.includes('uel') ||
    idLower.includes('laliga') ||
    idLower.includes('ligue1') ||
    nameLower.includes('europa') ||
    nameLower.includes('laliga') ||
    nameLower.includes('hexagoal') ||
    trophy.silhouette === 'obelisk'
  ) {
    return continentalChaliceImg;
  }

  if (trophy.silhouette === 'globe') {
    return worldCupGoldImg;
  }
  if (trophy.silhouette === 'amphora') {
    return championsCupImg;
  }
  if (trophy.material === 'silver' || trophy.material === 'platinum' || trophy.material === 'metal') {
    return continentalChaliceImg;
  }

  return goldenDomesticCupImg;
}

function getMaterialStops(material: TrophyMaterial, primary: string, accent: string) {
  switch (material) {
    case 'silver':
      return {
        bodyTop: '#FFFFFF',
        bodyMid: '#CBD5E1',
        bodyBot: '#475569',
        rim: '#F8FAFC',
        base: '#1E293B',
        plaque: accent || '#38BDF8',
      };
    case 'platinum':
      return {
        bodyTop: '#FFFFFF',
        bodyMid: '#E2E8F0',
        bodyBot: '#94A3B8',
        rim: '#E0F2FE',
        base: '#0F172A',
        plaque: accent || '#7ADBF0',
      };
    case 'crystal':
      return {
        bodyTop: '#E0F2FE',
        bodyMid: '#7DD3FC',
        bodyBot: '#0284C7',
        rim: '#F0F9FF',
        base: '#082F49',
        plaque: accent || '#38BDF8',
      };
    case 'metal':
      return {
        bodyTop: '#CBD5E1',
        bodyMid: '#64748B',
        bodyBot: '#1E293B',
        rim: '#94A3B8',
        base: '#090D16',
        plaque: accent || '#F59E0B',
      };
    case 'obsidian-gold':
      return {
        bodyTop: '#334155',
        bodyMid: '#0F172A',
        bodyBot: '#020617',
        rim: accent || '#F59E0B',
        base: '#090D16',
        plaque: accent || '#F59E0B',
      };
    case 'rose-gold':
      return {
        bodyTop: '#FDE68A',
        bodyMid: '#F59E0B',
        bodyBot: '#9D174D',
        rim: '#FBCFE8',
        base: '#27121D',
        plaque: accent || '#FB7185',
      };
    case 'gold':
    default:
      return {
        bodyTop: '#FEF3C7',
        bodyMid: primary || '#F59E0B',
        bodyBot: '#92400E',
        rim: '#FDE68A',
        base: '#1E1B18',
        plaque: accent || '#D6B56E',
      };
  }
}

export const TrophyArtwork: React.FC<TrophyArtworkProps> = ({
  trophy,
  size = 'md',
  className = '',
}) => {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  const [imgFailed, setImgFailed] = useState(false);
  const resolvedImg = resolveAiTrophyImage(trophy);
  const stops = getMaterialStops(trophy.material, trophy.primaryColor, trophy.accentColor);
  const silhouette: TrophySilhouette = trophy.silhouette || 'chalice';

  if (resolvedImg && !imgFailed) {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 rounded-xl overflow-hidden border border-white/10 bg-[#040811] shadow-[0_8px_20px_rgba(0,0,0,0.55)] ${SIZE_MAP[size]} ${className}`}
      >
        <img
          src={resolvedImg}
          alt={trophy.name || 'Competition Trophy'}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-inset ring-white/15"
          style={{
            boxShadow: `inset 0 -10px 18px -10px ${trophy.accentColor || '#F59E0B'}55`,
          }}
        />
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center justify-center shrink-0 ${SIZE_MAP[size]} ${className}`}>
      <svg
        viewBox="0 0 120 130"
        className="w-full h-full drop-shadow-[0_10px_18px_rgba(0,0,0,0.45)]"
        role="img"
        aria-label={trophy.name || 'Competition Trophy'}
      >
        <defs>
          <linearGradient id={`body-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={stops.bodyTop} />
            <stop offset="48%" stopColor={stops.bodyMid} />
            <stop offset="100%" stopColor={stops.bodyBot} />
          </linearGradient>
          <linearGradient id={`accent-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stops.rim} />
            <stop offset="100%" stopColor={stops.plaque} />
          </linearGradient>
        </defs>

        <ellipse cx="60" cy="118" rx="34" ry="5" fill={stops.plaque} opacity="0.22" />

        {silhouette !== 'medal' && (
          <>
            <path d="M34 106 L86 106 L92 118 L28 118 Z" fill={stops.base} stroke={stops.rim} strokeWidth="1.5" />
            <rect x="40" y="109" width="40" height="6" rx="1.5" fill={`url(#accent-${uid})`} opacity="0.88" />
            <path d="M44 96 L76 96 L82 106 L38 106 Z" fill={`url(#body-${uid})`} stroke={stops.rim} strokeWidth="1" />
          </>
        )}

        {silhouette === 'chalice' && (
          <>
            <path d="M36 28 C16 28 16 58 39 62" fill="none" stroke={`url(#body-${uid})`} strokeWidth="5.5" strokeLinecap="round" />
            <path d="M84 28 C104 28 104 58 81 62" fill="none" stroke={`url(#body-${uid})`} strokeWidth="5.5" strokeLinecap="round" />
            <path d="M54 68 L66 68 L69 96 L51 96 Z" fill={`url(#body-${uid})`} />
            <ellipse cx="60" cy="79" rx="9" ry="4" fill={stops.rim} opacity="0.7" />
            <path
              d="M32 22 L88 22 L82 54 C79 68 69 73 60 73 C51 73 41 68 38 54 Z"
              fill={`url(#body-${uid})`}
              stroke={stops.rim}
              strokeWidth="1.6"
            />
            <ellipse cx="60" cy="22" rx="28" ry="4.5" fill={stops.rim} />
            <path d="M48 37 L72 37 L69 47 L51 47 Z" fill={stops.plaque} opacity="0.35" />
          </>
        )}

        {silhouette === 'amphora' && (
          <>
            <path d="M41 30 C13 18 14 70 43 72" fill="none" stroke={`url(#body-${uid})`} strokeWidth="6" strokeLinecap="round" />
            <path d="M79 30 C107 18 106 70 77 72" fill="none" stroke={`url(#body-${uid})`} strokeWidth="6" strokeLinecap="round" />
            <path d="M51 74 L69 74 L73 96 L47 96 Z" fill={`url(#body-${uid})`} />
            <path
              d="M36 20 L84 20 L78 44 C82 60 74 78 60 78 C46 78 38 60 42 44 Z"
              fill={`url(#body-${uid})`}
              stroke={stops.rim}
              strokeWidth="1.6"
            />
            <ellipse cx="60" cy="20" rx="24" ry="4" fill={stops.rim} />
            <circle cx="60" cy="49" r="9" fill={stops.plaque} opacity="0.28" stroke={stops.rim} strokeWidth="1" />
          </>
        )}

        {silhouette === 'globe' && (
          <>
            <path d="M44 96 C46 78 43 66 39 54 C36 42 44 26 60 22 C76 26 84 42 81 54 C77 66 74 78 76 96 Z" fill={`url(#body-${uid})`} stroke={stops.rim} strokeWidth="1.2" />
            <circle cx="60" cy="36" r="21" fill={`url(#body-${uid})`} stroke={stops.rim} strokeWidth="1.8" />
            <ellipse cx="60" cy="36" rx="21" ry="7" fill="none" stroke={stops.plaque} strokeWidth="1.5" opacity="0.8" />
            <ellipse cx="60" cy="36" rx="8" ry="21" fill="none" stroke={stops.plaque} strokeWidth="1.5" opacity="0.8" />
            <line x1="60" y1="15" x2="60" y2="57" stroke={stops.rim} strokeWidth="1.2" opacity="0.6" />
          </>
        )}

        {silhouette === 'crown' && (
          <>
            <path d="M52 72 L68 72 L72 96 L48 96 Z" fill={`url(#body-${uid})`} />
            <path
              d="M27 70 L22 32 L42 48 L60 20 L78 48 L98 32 L93 70 Z"
              fill={`url(#body-${uid})`}
              stroke={stops.rim}
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
            <rect x="27" y="64" width="66" height="8" rx="2" fill={`url(#accent-${uid})`} />
            <circle cx="22" cy="29" r="4" fill={stops.plaque} />
            <circle cx="60" cy="17" r="5" fill={stops.plaque} />
            <circle cx="98" cy="29" r="4" fill={stops.plaque} />
          </>
        )}

        {silhouette === 'shield' && (
          <>
            <rect x="53" y="80" width="14" height="16" fill={`url(#body-${uid})`} />
            <path
              d="M28 22 L92 22 L92 54 C92 74 75 84 60 88 C45 84 28 74 28 54 Z"
              fill={`url(#body-${uid})`}
              stroke={stops.rim}
              strokeWidth="2"
            />
            <path
              d="M36 29 L84 29 L84 53 C84 68 71 76 60 80 C49 76 36 68 36 53 Z"
              fill={stops.base}
              opacity="0.45"
              stroke={stops.plaque}
              strokeWidth="1.3"
            />
            <polygon points="60,36 65,48 78,48 67,56 71,68 60,60 49,68 53,56 42,48 55,48" fill={stops.plaque} />
          </>
        )}

        {silhouette === 'obelisk' && (
          <>
            <path d="M35 86 L46 40 L50 86 Z" fill={stops.plaque} opacity="0.6" />
            <path d="M85 86 L74 40 L70 86 Z" fill={stops.plaque} opacity="0.6" />
            <polygon
              points="60,12 74,34 70,96 50,96 46,34"
              fill={`url(#body-${uid})`}
              stroke={stops.rim}
              strokeWidth="1.6"
            />
            <polygon points="60,12 74,34 60,96" fill={stops.rim} opacity="0.25" />
            <circle cx="60" cy="48" r="6" fill={stops.plaque} stroke={stops.rim} strokeWidth="1.2" />
          </>
        )}

        {silhouette === 'plate' && (
          <>
            <rect x="53" y="84" width="14" height="14" fill={`url(#body-${uid})`} />
            <circle cx="60" cy="52" r="36" fill={`url(#body-${uid})`} stroke={stops.rim} strokeWidth="2.4" />
            <circle cx="60" cy="52" r="26" fill={stops.base} opacity="0.28" stroke={stops.plaque} strokeWidth="1.5" />
            <circle cx="60" cy="52" r="14" fill={`url(#accent-${uid})`} stroke={stops.rim} strokeWidth="1.4" />
            <circle cx="60" cy="24" r="2.2" fill={stops.plaque} />
            <circle cx="88" cy="52" r="2.2" fill={stops.plaque} />
            <circle cx="60" cy="80" r="2.2" fill={stops.plaque} />
            <circle cx="32" cy="52" r="2.2" fill={stops.plaque} />
          </>
        )}

        {silhouette === 'medal' && (
          <>
            <path d="M38 14 L54 14 L60 44 L48 44 Z" fill={stops.plaque} opacity="0.85" />
            <path d="M82 14 L66 14 L60 44 L72 44 Z" fill={stops.rim} opacity="0.7" />
            <circle cx="60" cy="72" r="30" fill={`url(#body-${uid})`} stroke={stops.rim} strokeWidth="2.2" />
            <circle cx="60" cy="72" r="22" fill="none" stroke={stops.plaque} strokeWidth="1.6" />
            <polygon points="60,57 64,67 75,67 66,73 69,84 60,77 51,84 54,73 45,67 56,67" fill={stops.plaque} />
            <rect x="46" y="42" width="28" height="6" rx="2" fill={`url(#accent-${uid})`} />
          </>
        )}
      </svg>
    </div>
  );
};
