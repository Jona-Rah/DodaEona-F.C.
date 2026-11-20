import type {
  CompetitionChampionSummary,
  CompetitionCompactEvent,
  CompetitionEditionHistoryEntry,
  CompetitionFixtureMatch,
  CompetitionMakerTournament,
  CompetitionPlayerFixtureStat,
  CompetitionPlayerLeaderboardRow,
  CompetitionStageRuntime,
  CompetitionStandingEntry,
  TeamScopeMode,
  TieBreakerKey,
  TournamentGroup,
  TournamentInjuryEntry,
  TournamentPresetId,
  TournamentStageConfig,
  TournamentTeamSnapshot,
  TournamentValidationResult,
  TrophyCategory,
  TrophyDesignConfig,
} from '../types/competitionMaker';
import type { Manager } from '../types/manager';
import type { Team } from '../types/matchCentre';
import type {
  CompleteSimulationOutput,
  SimCompetitionConfig,
} from '../types/simulation';
import type { SimulationMatchRecord } from '../../server/types';
import { getTeamType } from '../types/matchCentre';
import { buildInitialTeamSetup, createSeededRng, simulateMatch } from '../engine/matchSimulator';

// ============================================================================
// PRESET TROPHIES, CATEGORIES & REAL TOURNAMENT ROSTERS
// ============================================================================

export const TROPHY_CATEGORIES: TrophyCategory[] = [
  'Domestic League',
  'Domestic Cup',
  'Super Cup',
  'Continental',
  'International',
  'Other',
];

export const AI_TROPHY_IMAGE_PATHS = {
  championsCup: '/src/assets/images/trophy_champions_cup_1794751433241.jpg',
  worldCupGold: '/src/assets/images/trophy_world_cup_gold_1794751434445.jpg',
  leagueCrownCup: '/src/assets/images/trophy_league_crown_cup_1794751436202.jpg',
  meisterschalePlate: '/src/assets/images/trophy_meisterschale_plate_1794751437702.jpg',
  continentalChalice: '/src/assets/images/trophy_continental_chalice_1794751438424.jpg',
  goldenDomesticCup: '/src/assets/images/trophy_golden_domestic_cup_1794751438979.jpg',
} as const;

export const PRESET_TROPHIES: TrophyDesignConfig[] = [
  {
    id: 'trophy-preset-ucl',
    presetId: 'ucl-36',
    name: 'Champions League Cup',
    category: 'Continental',
    displayStyle: 'grand-cup',
    engraving: 'CHAMPIONS OF EUROPE',
    silhouette: 'amphora',
    material: 'silver',
    primaryColor: '#E2E8F0',
    accentColor: '#38BDF8',
    prestigeTier: 'Legendary',
    imageUrl: AI_TROPHY_IMAGE_PATHS.championsCup,
  },
  {
    id: 'trophy-preset-wc',
    presetId: 'world-cup-2026',
    name: 'FIFA World Cup',
    category: 'International',
    displayStyle: 'gold',
    engraving: 'WORLD CHAMPIONS',
    silhouette: 'globe',
    material: 'gold',
    primaryColor: '#F59E0B',
    accentColor: '#FDE68A',
    prestigeTier: 'Legendary',
    imageUrl: AI_TROPHY_IMAGE_PATHS.worldCupGold,
  },
  {
    id: 'trophy-preset-league',
    presetId: 'domestic-league',
    name: 'Premier League Trophy',
    category: 'Domestic League',
    displayStyle: 'gold',
    engraving: 'LEAGUE CHAMPIONS',
    silhouette: 'crown',
    material: 'gold',
    primaryColor: '#EAB308',
    accentColor: '#10B981',
    prestigeTier: 'Legendary',
    imageUrl: AI_TROPHY_IMAGE_PATHS.leagueCrownCup,
  },
  {
    id: 'trophy-preset-bundesliga',
    presetId: 'domestic-league',
    name: 'Bundesliga Meisterschale',
    category: 'Domestic League',
    displayStyle: 'silver',
    engraving: 'DEUTSCHER MEISTER',
    silhouette: 'plate',
    material: 'silver',
    primaryColor: '#E2E8F0',
    accentColor: '#10B981',
    prestigeTier: 'Major',
    imageUrl: AI_TROPHY_IMAGE_PATHS.meisterschalePlate,
  },
  {
    id: 'trophy-preset-ligue1',
    presetId: 'domestic-league',
    name: 'Ligue 1 Hexagoal',
    category: 'Domestic League',
    displayStyle: 'crystal',
    engraving: 'CHAMPION DE FRANCE',
    silhouette: 'obelisk',
    material: 'crystal',
    primaryColor: '#BAE6FD',
    accentColor: '#38BDF8',
    prestigeTier: 'Major',
    imageUrl: AI_TROPHY_IMAGE_PATHS.continentalChalice,
  },
  {
    id: 'trophy-preset-seriea',
    presetId: 'domestic-league',
    name: 'Serie A Scudetto',
    category: 'Domestic League',
    displayStyle: 'gold',
    engraving: 'CAMPIONI D ITALIA',
    silhouette: 'globe',
    material: 'gold',
    primaryColor: '#FBBF24',
    accentColor: '#38BDF8',
    prestigeTier: 'Major',
    imageUrl: AI_TROPHY_IMAGE_PATHS.worldCupGold,
  },
  {
    id: 'trophy-preset-laliga',
    presetId: 'domestic-league',
    name: 'LaLiga Trophy',
    category: 'Domestic League',
    displayStyle: 'metal',
    engraving: 'CAMPEON DE LIGA',
    silhouette: 'chalice',
    material: 'metal',
    primaryColor: '#94A3B8',
    accentColor: '#F59E0B',
    prestigeTier: 'Major',
    imageUrl: AI_TROPHY_IMAGE_PATHS.continentalChalice,
  },
  {
    id: 'trophy-preset-uel',
    presetId: 'euros-24',
    name: 'Europa League Cup',
    category: 'Continental',
    displayStyle: 'silver',
    engraving: 'EUROPA CHAMPIONS',
    silhouette: 'chalice',
    material: 'silver',
    primaryColor: '#CBD5E1',
    accentColor: '#F97316',
    prestigeTier: 'Major',
    imageUrl: AI_TROPHY_IMAGE_PATHS.continentalChalice,
  },
  {
    id: 'trophy-preset-uecl',
    presetId: 'continental-championship',
    name: 'Conference League Trophy',
    category: 'Continental',
    displayStyle: 'metal',
    engraving: 'EUROPEAN CONFERENCE',
    silhouette: 'amphora',
    material: 'metal',
    primaryColor: '#64748B',
    accentColor: '#10B981',
    prestigeTier: 'Major',
    imageUrl: AI_TROPHY_IMAGE_PATHS.championsCup,
  },
  {
    id: 'trophy-preset-dfb',
    presetId: 'domestic-cup',
    name: 'DFB-Pokal',
    category: 'Domestic Cup',
    displayStyle: 'gold',
    engraving: 'POKALSIEGER',
    silhouette: 'chalice',
    material: 'gold',
    primaryColor: '#F59E0B',
    accentColor: '#10B981',
    prestigeTier: 'Domestic',
    imageUrl: AI_TROPHY_IMAGE_PATHS.goldenDomesticCup,
  },
  {
    id: 'trophy-preset-facup',
    presetId: 'domestic-cup',
    name: 'FA Cup',
    category: 'Domestic Cup',
    displayStyle: 'grand-cup',
    engraving: 'CUP WINNERS',
    silhouette: 'amphora',
    material: 'silver',
    primaryColor: '#F1F5F9',
    accentColor: '#EF4444',
    prestigeTier: 'Legendary',
    imageUrl: AI_TROPHY_IMAGE_PATHS.championsCup,
  },
  {
    id: 'trophy-preset-carabao',
    presetId: 'international-knockout',
    name: 'Carabao Cup',
    category: 'Domestic Cup',
    displayStyle: 'medal',
    engraving: 'LEAGUE CUP CHAMPIONS',
    silhouette: 'medal',
    material: 'silver',
    primaryColor: '#E2E8F0',
    accentColor: '#F59E0B',
    prestigeTier: 'Domestic',
    imageUrl: AI_TROPHY_IMAGE_PATHS.goldenDomesticCup,
  },
  {
    id: 'trophy-preset-custom',
    presetId: 'custom',
    name: 'DodaEona Invitational Trophy',
    category: 'Domestic League',
    displayStyle: 'gold',
    engraving: 'INVITATIONAL CHAMPIONS',
    silhouette: 'chalice',
    material: 'gold',
    primaryColor: '#F59E0B',
    accentColor: '#38BDF8',
    prestigeTier: 'Invitational',
    imageUrl: AI_TROPHY_IMAGE_PATHS.goldenDomesticCup,
  },
];

/**
 * Official 48 Qualified Nations & Groups A-L for FIFA World Cup 2026
 */
export const WORLD_CUP_2026_GROUPS: Array<{ name: string; teamIds: string[] }> = [
  {
    name: 'Group A',
    teamIds: ['nat-men-mexico', 'nat-men-south-africa', 'nat-men-south-korea', 'nat-men-czech-republic'],
  },
  {
    name: 'Group B',
    teamIds: ['nat-men-canada', 'nat-men-bosnia-herzegovina', 'nat-men-qatar', 'nat-men-switzerland'],
  },
  {
    name: 'Group C',
    teamIds: ['nat-men-brazil', 'nat-men-morocco', 'nat-men-haiti', 'nat-men-scotland'],
  },
  {
    name: 'Group D',
    teamIds: ['nat-men-united-states', 'nat-men-paraguay', 'nat-men-australia', 'nat-men-turkiye'],
  },
  {
    name: 'Group E',
    teamIds: ['nat-men-germany', 'nat-men-curacao', 'nat-men-ivory-coast', 'nat-men-ecuador'],
  },
  {
    name: 'Group F',
    teamIds: ['nat-men-netherlands', 'nat-men-japan', 'nat-men-sweden', 'nat-men-tunisia'],
  },
  {
    name: 'Group G',
    teamIds: ['nat-men-belgium', 'nat-men-egypt', 'nat-men-iran', 'nat-men-new-zealand'],
  },
  {
    name: 'Group H',
    teamIds: ['nat-men-spain', 'nat-men-cape-verde', 'nat-men-saudi-arabia', 'nat-men-uruguay'],
  },
  {
    name: 'Group I',
    teamIds: ['nat-men-france', 'nat-men-senegal', 'nat-men-iraq', 'nat-men-norway'],
  },
  {
    name: 'Group J',
    teamIds: ['nat-men-argentina', 'nat-men-algeria', 'nat-men-austria', 'nat-men-jordan'],
  },
  {
    name: 'Group K',
    teamIds: ['nat-men-portugal', 'nat-men-dr-congo', 'nat-men-uzbekistan', 'nat-men-colombia'],
  },
  {
    name: 'Group L',
    teamIds: ['nat-men-england', 'nat-men-croatia', 'nat-men-ghana', 'nat-men-panama'],
  },
];

export const WORLD_CUP_2026_TEAM_IDS: string[] = WORLD_CUP_2026_GROUPS.flatMap((g) => g.teamIds);

/**
 * Curated 36-Club UEFA Champions League League Phase Qualifying Field
 */
export const UCL_36_CLUB_IDS: string[] = [
  // England (6)
  'fc27-6',   // Arsenal
  'fc27-28',  // Chelsea
  'fc27-8',   // Liverpool
  'fc27-2',   // Manchester City
  'fc27-46',  // Newcastle Utd
  'fc27-45',  // Spurs
  // Spain (5)
  'fc27-56',  // Athletic Club
  'fc27-17',  // Atlético de Madrid
  'fc27-4',   // FC Barcelona
  'fc27-1',   // Real Madrid
  'fc27-74',  // Villarreal CF
  // Italy (4)
  'fc27-37',  // Bergamo Calcio (Atalanta)
  'fc27-12',  // Lombardia FC (Inter)
  'fc27-25',  // Juventus FC
  'fc27-29',  // SSC Napoli
  // Germany (4)
  'fc27-15',  // Leverkusen
  'fc27-5',   // FC Bayern München
  'fc27-24',  // Borussia Dortmund
  'fc27-95',  // Frankfurt
  // France (3)
  'fc27-80',  // AS Monaco
  'fc27-84',  // OM
  'fc27-10',  // PSG
  // Portugal (3)
  'fc27-49',  // Sporting CP
  'fc27-50',  // SL Benfica
  'fc27-57',  // FC Porto
  // Netherlands (2)
  'fc27-106', // Ajax
  'fc27-89',  // PSV
  // Belgium (2)
  'fc27-154', // R. Union St.-G.
  'fc27-130', // Club Brugge
  // Turkey (1)
  'fc27-71',  // Galatasaray
  // Czech Republic (1)
  'fc27-185', // Slavia Praha
  // Greece (1)
  'fc27-160', // Olympiacos FC
  // Norway (1)
  'fc27-247', // FK Bodø/Glimt
  // Denmark (1)
  'fc27-253', // F.C. København
  // Azerbaijan (1)
  'fc27-411', // Qarabağ FK
  // Cyprus (1)
  'fc27-587', // APOEL FC
];

export interface CompetitionPresetDefinition {
  id: TournamentPresetId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  recommendedTeamCount: number;
  teamScope: TeamScopeMode;
  homeAdvantageBoost: number;
  tieBreakers: TieBreakerKey[];
  defaultTrophy: TrophyDesignConfig;
  buildStages: (teamCount: number) => TournamentStageConfig[];
}

export const DEFAULT_TIE_BREAKERS: TieBreakerKey[] = [
  'points',
  'goal-diff',
  'goals-for',
  'head-to-head',
  'wins',
  'away-goals',
  'rating',
];

export const COMPETITION_PRESETS: Record<TournamentPresetId, CompetitionPresetDefinition> = {
  'world-cup-2026': {
    id: 'world-cup-2026',
    name: 'World Cup',
    shortName: 'WC 2026',
    tagline: '48 Real Qualifiers · Official Groups A–L · 8 Best 3rd · Round of 32',
    description:
      'Expanded 48-nation FIFA World Cup 2026 format: official seeded Groups A–L play single round-robin, advancing top 2 per group plus 8 best 3rd-placed teams into a 32-team knockout bracket with 3rd-Place Play-Off.',
    recommendedTeamCount: 48,
    teamScope: 'country',
    homeAdvantageBoost: 1,
    tieBreakers: ['points', 'goal-diff', 'goals-for', 'head-to-head', 'wins', 'rating'],
    defaultTrophy: PRESET_TROPHIES[1],
    buildStages: () => [
      {
        id: 'stage-wc-groups',
        order: 0,
        name: 'Group Stage (Groups A–L)',
        type: 'group',
        inputTeamCount: 48,
        advanceCount: 32,
        groupCount: 12,
        groupSize: 4,
        qualifyPerGroup: 2,
        bestThirdPlacedCount: 8,
        homeAndAway: false,
        neutralVenue: true,
        seedingMode: 'seeded',
      },
      {
        id: 'stage-wc-ko',
        order: 1,
        name: 'Knockout Finals (R32 to Final)',
        type: 'knockout',
        inputTeamCount: 32,
        advanceCount: 1,
        homeAndAway: false,
        neutralVenue: true,
        twoLegged: false,
        finalSingleLeg: true,
        awayGoalsRule: false,
        extraTimeEnabled: true,
        penaltiesEnabled: true,
        seedingMode: 'seeded',
        thirdPlacePlayoff: true,
      },
    ],
  },
  'ucl-36': {
    id: 'ucl-36',
    name: 'Champions League',
    shortName: 'UCL',
    tagline: '36 Real Clubs · 8-Matchday League Phase · KO Play-Offs · Two-Legged R16',
    description:
      'Authentic 36-club Swiss League Phase across 8 matchdays (2 opponents from each of 4 seeded pots). Top 8 qualify straight to Round of 16; 9th–24th contest two-legged Knockout Play-Offs.',
    recommendedTeamCount: 36,
    teamScope: 'club',
    homeAdvantageBoost: 5,
    tieBreakers: ['points', 'goal-diff', 'goals-for', 'away-goals', 'wins', 'head-to-head', 'rating'],
    defaultTrophy: PRESET_TROPHIES[0],
    buildStages: () => [
      {
        id: 'stage-ucl-league',
        order: 0,
        name: 'League Phase',
        type: 'league',
        inputTeamCount: 36,
        advanceCount: 24,
        roundsMode: 'swiss-n',
        matchesPerTeam: 8,
        homeAndAway: false,
        directQualifyCount: 8,
        playoffQualifyCount: 16,
        byeTopCount: 8,
        byeTargetStageOrder: 2,
        seedingMode: 'seeded',
      },
      {
        id: 'stage-ucl-playoffs',
        order: 1,
        name: 'Knockout Phase Play-Offs',
        type: 'knockout',
        inputTeamCount: 16,
        advanceCount: 8,
        homeAndAway: true,
        twoLegged: true,
        finalSingleLeg: false,
        awayGoalsRule: false,
        extraTimeEnabled: true,
        penaltiesEnabled: true,
        seedingMode: 'seeded',
      },
      {
        id: 'stage-ucl-ko',
        order: 2,
        name: 'Knockout Bracket (R16 to Final)',
        type: 'knockout',
        inputTeamCount: 16,
        advanceCount: 1,
        homeAndAway: true,
        twoLegged: true,
        finalSingleLeg: true,
        awayGoalsRule: false,
        extraTimeEnabled: true,
        penaltiesEnabled: true,
        seedingMode: 'seeded',
      },
    ],
  },
  'euros-24': {
    id: 'euros-24',
    name: 'Euros',
    shortName: 'EURO',
    tagline: '24 European Nations · 6 Groups of 4 · 4 Best 3rd · Round of 16',
    description:
      'Official 24-nation European Championship: 6 groups of 4 advance top 2 plus 4 best third-placed teams into a single-leg Round of 16 to Final.',
    recommendedTeamCount: 24,
    teamScope: 'country',
    homeAdvantageBoost: 2,
    tieBreakers: ['points', 'head-to-head', 'goal-diff', 'goals-for', 'wins', 'rating'],
    defaultTrophy: PRESET_TROPHIES[7],
    buildStages: () => [
      {
        id: 'stage-euro-groups',
        order: 0,
        name: 'Group Stage',
        type: 'group',
        inputTeamCount: 24,
        advanceCount: 16,
        groupCount: 6,
        groupSize: 4,
        qualifyPerGroup: 2,
        bestThirdPlacedCount: 4,
        homeAndAway: false,
        neutralVenue: true,
        seedingMode: 'seeded',
      },
      {
        id: 'stage-euro-ko',
        order: 1,
        name: 'Knockout Stage',
        type: 'knockout',
        inputTeamCount: 16,
        advanceCount: 1,
        homeAndAway: false,
        neutralVenue: true,
        twoLegged: false,
        finalSingleLeg: true,
        awayGoalsRule: false,
        extraTimeEnabled: true,
        penaltiesEnabled: true,
        seedingMode: 'seeded',
      },
    ],
  },
  'continental-championship': {
    id: 'continental-championship',
    name: 'Continental Championship',
    shortName: 'CONTI',
    tagline: '16 Nations · 4 Groups of 4 · Quarter-Finals to Final',
    description:
      'International continental tournament featuring 4 balanced groups of 4, advancing the top 2 from each group into single-elimination Quarter-Finals, Semi-Finals, and Final.',
    recommendedTeamCount: 16,
    teamScope: 'country',
    homeAdvantageBoost: 2,
    tieBreakers: ['points', 'goal-diff', 'goals-for', 'head-to-head', 'wins', 'rating'],
    defaultTrophy: PRESET_TROPHIES[8],
    buildStages: (teamCount = 16) => {
      const gc = teamCount >= 24 ? 6 : 4;
      const gs = Math.max(3, Math.floor(teamCount / gc));
      const adv = gc * 2;
      return [
        {
          id: 'stage-conti-groups',
          order: 0,
          name: 'Continental Group Stage',
          type: 'group',
          inputTeamCount: gc * gs,
          advanceCount: adv,
          groupCount: gc,
          groupSize: gs,
          qualifyPerGroup: 2,
          bestThirdPlacedCount: 0,
          homeAndAway: false,
          neutralVenue: true,
          seedingMode: 'seeded',
        },
        {
          id: 'stage-conti-ko',
          order: 1,
          name: 'Knockout Finals',
          type: 'knockout',
          inputTeamCount: adv,
          advanceCount: 1,
          homeAndAway: false,
          neutralVenue: true,
          twoLegged: false,
          finalSingleLeg: true,
          awayGoalsRule: false,
          extraTimeEnabled: true,
          penaltiesEnabled: true,
          seedingMode: 'seeded',
          thirdPlacePlayoff: true,
        },
      ];
    },
  },
  'international-knockout': {
    id: 'international-knockout',
    name: 'International Knockout Cup',
    shortName: 'INT CUP',
    tagline: '16 National Teams · Single Elimination Bracket · Extra Time & Penalties',
    description:
      'Sudden-death international knockout cup built for national squads at neutral venues with full extra time and shootout resolution.',
    recommendedTeamCount: 16,
    teamScope: 'country',
    homeAdvantageBoost: 1,
    tieBreakers: ['points', 'goal-diff', 'goals-for', 'rating'],
    defaultTrophy: PRESET_TROPHIES[11],
    buildStages: (teamCount = 16) => [
      {
        id: 'stage-int-ko',
        order: 0,
        name: 'International Knockout Bracket',
        type: 'knockout',
        inputTeamCount: Math.max(2, teamCount),
        advanceCount: 1,
        homeAndAway: false,
        neutralVenue: true,
        twoLegged: false,
        finalSingleLeg: true,
        awayGoalsRule: false,
        extraTimeEnabled: true,
        penaltiesEnabled: true,
        seedingMode: 'seeded',
        thirdPlacePlayoff: true,
      },
    ],
  },
  'domestic-league': {
    id: 'domestic-league',
    name: 'Domestic League',
    shortName: 'LEAGUE',
    tagline: '20 Clubs · Home & Away Double Round-Robin · 38 Matchdays',
    description:
      'Traditional full-season domestic league where every club meets every rival home and away across 38 matchdays to crown the champions.',
    recommendedTeamCount: 20,
    teamScope: 'club',
    homeAdvantageBoost: 5,
    tieBreakers: ['points', 'goal-diff', 'goals-for', 'head-to-head', 'wins', 'rating'],
    defaultTrophy: PRESET_TROPHIES[2],
    buildStages: (teamCount = 20) => [
      {
        id: 'stage-dom-league',
        order: 0,
        name: 'League Season',
        type: 'league',
        inputTeamCount: Math.max(2, teamCount),
        advanceCount: 1,
        roundsMode: 'double-rr',
        matchesPerTeam: Math.max(2, (teamCount - 1) * 2),
        homeAndAway: true,
        directQualifyCount: Math.min(4, Math.max(1, Math.floor(teamCount / 4))),
        playoffQualifyCount: 0,
        seedingMode: 'random',
      },
    ],
  },
  'domestic-cup': {
    id: 'domestic-cup',
    name: 'Domestic Cup',
    shortName: 'FA CUP',
    tagline: '32 Clubs · Open Draw Knockout · Giant Killings · ET & Penalties',
    description:
      'Classic national domestic cup featuring club sides drawn randomly round by round in single-leg knockout ties straight to a showpiece Final.',
    recommendedTeamCount: 32,
    teamScope: 'club',
    homeAdvantageBoost: 5,
    tieBreakers: ['points', 'goal-diff', 'goals-for', 'rating'],
    defaultTrophy: PRESET_TROPHIES[10],
    buildStages: (teamCount = 32) => [
      {
        id: 'stage-dom-cup',
        order: 0,
        name: 'Domestic Cup Proper',
        type: 'knockout',
        inputTeamCount: Math.max(2, teamCount),
        advanceCount: 1,
        homeAndAway: false,
        neutralVenue: false,
        twoLegged: false,
        finalSingleLeg: true,
        awayGoalsRule: false,
        extraTimeEnabled: true,
        penaltiesEnabled: true,
        seedingMode: 'random',
      },
    ],
  },
  'knockout-cup': {
    id: 'knockout-cup',
    name: 'Knockout Tournament',
    shortName: 'CUP',
    tagline: 'Up to 128 Teams · Seeded Elimination Bracket · Byes Supported',
    description:
      'Pure seeded knockout tournament supporting 2 to 128 clubs or nations with automatic preliminary play-ins for non-power-of-two fields.',
    recommendedTeamCount: 16,
    teamScope: 'mixed',
    homeAdvantageBoost: 4,
    tieBreakers: ['points', 'goal-diff', 'goals-for', 'rating'],
    defaultTrophy: PRESET_TROPHIES[9],
    buildStages: (teamCount = 16) => [
      {
        id: 'stage-ko-cup',
        order: 0,
        name: 'Knockout Rounds',
        type: 'knockout',
        inputTeamCount: Math.max(2, teamCount),
        advanceCount: 1,
        homeAndAway: false,
        neutralVenue: false,
        twoLegged: false,
        finalSingleLeg: true,
        awayGoalsRule: false,
        extraTimeEnabled: true,
        penaltiesEnabled: true,
        seedingMode: 'seeded',
      },
    ],
  },
  'round-robin': {
    id: 'round-robin',
    name: 'Round-Robin',
    shortName: 'RR',
    tagline: '8 Teams · Balanced Single Round-Robin Table · Head-to-Head Crown',
    description:
      'Focused single-table round-robin championship where every side faces every rival once on neutral or home/away rotation to decide #1.',
    recommendedTeamCount: 8,
    teamScope: 'mixed',
    homeAdvantageBoost: 3,
    tieBreakers: ['points', 'goal-diff', 'goals-for', 'head-to-head', 'wins', 'rating'],
    defaultTrophy: PRESET_TROPHIES[2],
    buildStages: (teamCount = 8) => [
      {
        id: 'stage-round-robin',
        order: 0,
        name: 'Round-Robin Table',
        type: 'league',
        inputTeamCount: Math.max(2, teamCount),
        advanceCount: 1,
        roundsMode: 'single-rr',
        matchesPerTeam: Math.max(1, teamCount - 1),
        homeAndAway: false,
        directQualifyCount: 1,
        playoffQualifyCount: 0,
        seedingMode: 'random',
      },
    ],
  },
  custom: {
    id: 'custom',
    name: 'Custom Competition',
    shortName: 'CUSTOM',
    tagline: 'Up to 128 Teams · Up to 6 Connected Stages · Full Blueprint Control',
    description:
      'Design any hybrid football competition combining League Phases, Group Stages, and Knockout Brackets with custom tie-breakers, draw rules, and trophies.',
    recommendedTeamCount: 16,
    teamScope: 'mixed',
    homeAdvantageBoost: 5,
    tieBreakers: DEFAULT_TIE_BREAKERS,
    defaultTrophy: PRESET_TROPHIES[12],
    buildStages: (teamCount = 16) => [
      {
        id: 'stage-custom-1',
        order: 0,
        name: 'Group Stage',
        type: 'group',
        inputTeamCount: Math.max(3, teamCount),
        advanceCount: Math.max(2, Math.floor(teamCount / 2)),
        groupCount: Math.max(1, Math.floor(teamCount / 4)),
        groupSize: 4,
        qualifyPerGroup: 2,
        bestThirdPlacedCount: 0,
        homeAndAway: false,
        neutralVenue: false,
        seedingMode: 'seeded',
      },
      {
        id: 'stage-custom-2',
        order: 1,
        name: 'Knockout Finals',
        type: 'knockout',
        inputTeamCount: Math.max(2, Math.floor(teamCount / 2)),
        advanceCount: 1,
        homeAndAway: false,
        neutralVenue: true,
        twoLegged: false,
        finalSingleLeg: true,
        awayGoalsRule: false,
        extraTimeEnabled: true,
        penaltiesEnabled: true,
        seedingMode: 'seeded',
      },
    ],
  },
};

export function autoPickTeamsForPreset(
  presetId: TournamentPresetId,
  allTeams: Team[],
  targetCount?: number
): Team[] {
  const preset = COMPETITION_PRESETS[presetId];
  const desired = Math.min(128, Math.max(2, targetCount ?? preset.recommendedTeamCount));
  const teamsMap = new Map(allTeams.map((t) => [t.id, t]));

  const fitFirst = (list: Team[]) =>
    [...list].sort((a, b) => {
      const fitA = a.squad.length >= 11 ? 1 : 0;
      const fitB = b.squad.length >= 11 ? 1 : 0;
      if (fitA !== fitB) return fitB - fitA;
      return b.overallRating - a.overallRating;
    });

  if (presetId === 'world-cup-2026') {
    const exactWc = WORLD_CUP_2026_TEAM_IDS.map((id) => teamsMap.get(id)).filter(
      (t): t is Team => Boolean(t)
    );
    if (exactWc.length >= desired) return exactWc.slice(0, desired);
    const nations = fitFirst(
      allTeams.filter((t) => getTeamType(t) === 'country' && t.gender !== 'women')
    ).filter((n) => !exactWc.some((w) => w.id === n.id));
    return [...exactWc, ...nations].slice(0, desired);
  }

  if (presetId === 'euros-24') {
    const uefaNations = fitFirst(
      allTeams.filter(
        (t) =>
          getTeamType(t) === 'country' &&
          t.gender !== 'women' &&
          t.confederation === 'UEFA'
      )
    );
    if (uefaNations.length >= desired) return uefaNations.slice(0, desired);
    const otherNations = fitFirst(
      allTeams.filter((t) => getTeamType(t) === 'country' && t.gender !== 'women')
    ).filter((t) => !uefaNations.some((u) => u.id === t.id));
    return [...uefaNations, ...otherNations].slice(0, desired);
  }

  if (presetId === 'ucl-36') {
    const exactUcl = UCL_36_CLUB_IDS.map((id) => teamsMap.get(id)).filter(
      (t): t is Team => Boolean(t)
    );
    if (exactUcl.length >= desired) return exactUcl.slice(0, desired);
    const euroFallback = fitFirst(
      allTeams.filter((t) => getTeamType(t) === 'club' && t.gender !== 'women' && !t.isIcon)
    ).filter((c) => !exactUcl.some((u) => u.id === c.id));
    return [...exactUcl, ...euroFallback].slice(0, desired);
  }

  if (presetId === 'domestic-league' || presetId === 'domestic-cup') {
    const epl = fitFirst(
      allTeams.filter(
        (t) => getTeamType(t) === 'club' && t.gender !== 'women' && t.league === 'Premier League'
      )
    );
    if (epl.length >= desired) return epl.slice(0, desired);
    const clubs = fitFirst(
      allTeams.filter((t) => getTeamType(t) === 'club' && t.gender !== 'women' && !t.isIcon)
    ).filter((c) => !epl.some((e) => e.id === c.id));
    return [...epl, ...clubs].slice(0, desired);
  }

  if (preset.teamScope === 'country') {
    return fitFirst(
      allTeams.filter((t) => getTeamType(t) === 'country' && t.gender !== 'women')
    ).slice(0, desired);
  }
  if (preset.teamScope === 'club') {
    return fitFirst(
      allTeams.filter((t) => getTeamType(t) === 'club' && t.gender !== 'women' && !t.isIcon)
    ).slice(0, desired);
  }
  return fitFirst(allTeams.filter((t) => t.gender !== 'women' && !t.isIcon)).slice(0, desired);
}

// ============================================================================
// MATCH COUNT ESTIMATOR & TOURNAMENT STRUCTURE VALIDATOR
// ============================================================================

export function estimateStageMatchesCount(
  stage: TournamentStageConfig,
  actualInput: number
): number {
  const n = Math.max(0, actualInput);
  if (n < 2) return 0;

  if (stage.type === 'group') {
    const gc = Math.max(1, Number(stage.groupCount) || 1);
    const gs = Math.max(3, Number(stage.groupSize) || Math.floor(n / gc));
    const perGroup = (gs * (gs - 1)) / 2;
    return gc * perGroup * (stage.homeAndAway ? 2 : 1);
  }

  if (stage.type === 'league') {
    const mpt =
      stage.roundsMode === 'swiss-n'
        ? Math.min(n - 1, Math.max(1, Number(stage.matchesPerTeam) || 8))
        : stage.roundsMode === 'double-rr' || stage.homeAndAway
        ? (n - 1) * 2
        : n - 1;
    return Math.floor((n * mpt) / 2);
  }

  // Knockout stage: number of ties = n - advanceCount
  const adv = Math.max(1, Math.min(n - 1, Number(stage.advanceCount) || 1));
  const ties = n - adv;
  const twoLegged = Boolean(stage.twoLegged);
  const finalSingle = stage.finalSingleLeg !== false;
  let total = ties * (twoLegged ? 2 : 1);
  if (twoLegged && finalSingle && adv === 1) {
    total -= 1;
  }
  if (stage.thirdPlacePlayoff && n >= 4 && adv === 1) {
    total += 1;
  }
  return Math.max(0, total);
}

export function validateTournamentConfig(input: {
  name: string;
  season: string;
  teamIds: string[];
  stages: TournamentStageConfig[];
}): TournamentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const stageFlowSummary: string[] = [];
  let estimatedMatches = 0;

  if (!input.name.trim()) {
    errors.push('Competition name is required.');
  }
  if (!input.season.trim()) {
    errors.push('Competition season is required (e.g. 2026/27 or 2026).');
  }
  if (input.teamIds.length < 2) {
    errors.push('Select at least 2 participating teams.');
  }
  if (input.teamIds.length > 128) {
    errors.push(`Selected ${input.teamIds.length} teams, which exceeds the 128-team maximum.`);
  }
  if (input.stages.length < 1 || input.stages.length > 6) {
    errors.push('A competition must have between 1 and 6 connected stages.');
  }

  const ordered = [...input.stages].sort((a, b) => a.order - b.order);
  if (ordered.length > 1 && ordered[ordered.length - 1].type !== 'knockout') {
    errors.push(
      `Multi-stage competitions must finish with a Knockout final stage (currently ends with "${ordered[ordered.length - 1].name}").`
    );
  }

  const directFeedToStage = new Map<number, number>();
  let expectedDirectEntrants = input.teamIds.length;

  for (let i = 0; i < ordered.length; i++) {
    const s = ordered[i];
    const isLast = i === ordered.length - 1;
    const byeArrivals = directFeedToStage.get(i) || 0;
    const actualInput = (i === 0 ? input.teamIds.length : expectedDirectEntrants) + byeArrivals;
    estimatedMatches += estimateStageMatchesCount(s, actualInput);

    if (!s.name.trim()) {
      errors.push(`Stage ${i + 1} needs a stage name.`);
    }

    if (s.type === 'group') {
      const gc = Number(s.groupCount) || 0;
      const gs = Number(s.groupSize) || 0;
      const qpg = Number(s.qualifyPerGroup) || 0;
      const b3 = Math.max(0, Number(s.bestThirdPlacedCount) || 0);

      if (gc < 1 || gs < 3) {
        errors.push(`Stage ${i + 1} (${s.name}): Group count must be >= 1 and group size must be at least 3 teams.`);
      } else if (gc * gs !== actualInput) {
        errors.push(
          `Stage ${i + 1} (${s.name}): ${gc} groups × ${gs} teams = ${gc * gs}, which does not match the ${actualInput} entering teams.`
        );
      }

      if (qpg < 1 || qpg >= Math.max(2, gs)) {
        errors.push(
          `Stage ${i + 1} (${s.name}): Qualifiers per group (${qpg}) must be between 1 and ${Math.max(1, gs - 1)}.`
        );
      }
      if (b3 > 0 && gs < 3) {
        errors.push(`Stage ${i + 1} (${s.name}): Best 3rd-placed qualification requires group size >= 3.`);
      }
      if (b3 > 0 && qpg >= 3) {
        errors.push(
          `Stage ${i + 1} (${s.name}): Cannot award best 3rd-placed spots when top ${qpg} per group already qualify.`
        );
      }
      if (b3 > gc) {
        errors.push(
          `Stage ${i + 1} (${s.name}): Best 3rd-placed spots (${b3}) cannot exceed number of groups (${gc}).`
        );
      }

      const calculatedAdv = gc * qpg + b3;
      if (s.advanceCount !== calculatedAdv) {
        errors.push(
          `Stage ${i + 1} (${s.name}): Total advancing (${s.advanceCount}) does not equal ${gc}×${qpg} + ${b3} = ${calculatedAdv}.`
        );
      }
      if (!isLast && calculatedAdv < 2) {
        errors.push(`Stage ${i + 1} (${s.name}): Must advance at least 2 teams into the next stage.`);
      }

      stageFlowSummary.push(
        `Stage ${i + 1} · ${s.name}: ${actualInput} teams -> ${gc}×${gs} groups -> ${calculatedAdv} advance`
      );
      expectedDirectEntrants = calculatedAdv;
    } else if (s.type === 'league') {
      const mpt =
        s.roundsMode === 'swiss-n'
          ? Number(s.matchesPerTeam) || 8
          : s.roundsMode === 'double-rr' || s.homeAndAway
          ? (actualInput - 1) * 2
          : actualInput - 1;

      if (mpt < 1) {
        errors.push(`Stage ${i + 1} (${s.name}): League phase requires at least 1 match per team.`);
      }
      if (s.roundsMode !== 'swiss-n' && actualInput > 32) {
        errors.push(
          `Stage ${i + 1} (${s.name}): Full round-robin with ${actualInput} teams exceeds 32 clubs. Switch to Swiss Matchdays (e.g. 8 matchdays) or a Group Stage.`
        );
      }
      if (s.roundsMode === 'swiss-n' && mpt >= actualInput) {
        errors.push(
          `Stage ${i + 1} (${s.name}): Swiss matchdays per team (${mpt}) must be less than team count (${actualInput}).`
        );
      }
      if (s.roundsMode === 'swiss-n' && (actualInput * mpt) % 2 !== 0) {
        errors.push(
          `Stage ${i + 1} (${s.name}): ${actualInput} teams × ${mpt} matches is odd (${actualInput * mpt}); adjust matchdays to an even total.`
        );
      }

      const byeTop = Math.max(0, Number(s.byeTopCount) || 0);
      const byeTarget =
        byeTop > 0 && typeof s.byeTargetStageOrder === 'number'
          ? s.byeTargetStageOrder
          : undefined;

      if (byeTop > 0) {
        if (byeTarget === undefined || byeTarget <= i || byeTarget >= ordered.length) {
          errors.push(
            `Stage ${i + 1} (${s.name}): Direct bye target stage must be a later stage.`
          );
        } else if (byeTop >= s.advanceCount) {
          errors.push(
            `Stage ${i + 1} (${s.name}): Bye teams (${byeTop}) must be fewer than total advancing teams (${s.advanceCount}).`
          );
        } else {
          directFeedToStage.set(byeTarget, (directFeedToStage.get(byeTarget) || 0) + byeTop);
        }
      }

      if (!isLast && (s.advanceCount < 2 || s.advanceCount > actualInput)) {
        errors.push(
          `Stage ${i + 1} (${s.name}): Advancing count (${s.advanceCount}) must be between 2 and ${actualInput}.`
        );
      }
      if (isLast && s.advanceCount !== 1) {
        errors.push(`Final stage (${s.name}) must crown 1 champion (advanceCount = 1).`);
      }

      const directNext = isLast ? 1 : s.advanceCount - byeTop;
      stageFlowSummary.push(
        `Stage ${i + 1} · ${s.name}: ${actualInput} teams · ${mpt} MD${
          byeTop > 0 ? ` (${byeTop} direct to Stage ${(byeTarget ?? i + 1) + 1}, ${directNext} to Stage ${i + 2})` : ` -> ${isLast ? '1 Champion' : `${s.advanceCount} advance`}`
        }`
      );
      expectedDirectEntrants = directNext;
    } else {
      // Knockout stage
      if (actualInput < 2) {
        errors.push(`Stage ${i + 1} (${s.name}): Knockout stage requires at least 2 teams.`);
      }
      if (!isLast && (s.advanceCount < 2 || s.advanceCount >= actualInput)) {
        errors.push(
          `Stage ${i + 1} (${s.name}): Knockout advance count (${s.advanceCount}) must be between 2 and ${actualInput - 1}.`
        );
      }
      if (isLast && s.advanceCount !== 1) {
        errors.push(`Final knockout stage (${s.name}) must resolve down to 1 champion.`);
      }
      if (!s.penaltiesEnabled && !s.twoLegged) {
        warnings.push(
          `Stage ${i + 1} (${s.name}): Penalties are disabled on a single-leg knockout; enabling penalties guarantees tie resolution.`
        );
      }
      stageFlowSummary.push(
        `Stage ${i + 1} · ${s.name}: ${actualInput} teams -> Knockout -> ${
          isLast ? '1 Champion' : `${s.advanceCount} advance`
        }`
      );
      expectedDirectEntrants = s.advanceCount;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stageFlowSummary,
    estimatedMatches,
  };
}

// ============================================================================
// UTILITY HELPERS
// ============================================================================

function shuffleWithRng<T>(arr: T[], rng: () => number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getTeamRating(teamId: string, teamsMap: Map<string, Team>): number {
  return teamsMap.get(teamId)?.overallRating ?? 70;
}

function isPowerOfTwo(n: number): boolean {
  return n >= 2 && (n & (n - 1)) === 0;
}

function largestPowerOfTwoAtMost(n: number): number {
  let p = 1;
  while (p * 2 <= n) p *= 2;
  return p;
}

export function getKnockoutRoundLabel(remainingTeams: number, isPlayoffStage = false): string {
  if (isPlayoffStage && remainingTeams === 16) return 'Knockout Play-Offs';
  if (remainingTeams === 2) return 'Final';
  if (remainingTeams === 4) return 'Semi-Final';
  if (remainingTeams === 8) return 'Quarter-Final';
  if (remainingTeams === 16) return 'Round of 16';
  if (remainingTeams === 32) return 'Round of 32';
  if (remainingTeams === 64) return 'Round of 64';
  if (remainingTeams === 128) return 'Round of 128';
  return `Round of ${remainingTeams}`;
}

// ============================================================================
// ROUND-ROBIN & SWISS-N SCHEDULE GENERATORS
// ============================================================================

function generateBergerPairings(
  teamIds: string[],
  doubleRoundRobin: boolean
): Array<{ roundIndex: number; pairs: Array<[string, string]> }> {
  const list = [...teamIds];
  if (list.length % 2 === 1) list.push('__BYE__');
  const n = list.length;
  const totalRounds = n - 1;
  const rounds: Array<{ roundIndex: number; pairs: Array<[string, string]> }> = [];

  const rot = [...list];
  for (let r = 0; r < totalRounds; r++) {
    const pairs: Array<[string, string]> = [];
    for (let i = 0; i < n / 2; i++) {
      const a = rot[i];
      const b = rot[n - 1 - i];
      if (a === '__BYE__' || b === '__BYE__') continue;
      // Alternate home/away cleanly for fairness
      if ((r + i) % 2 === 0) {
        pairs.push([a, b]);
      } else {
        pairs.push([b, a]);
      }
    }
    rounds.push({ roundIndex: r + 1, pairs });
    const fixed = rot[0];
    const tail = rot.slice(1);
    const last = tail.pop()!;
    rot.splice(0, rot.length, fixed, last, ...tail);
  }

  if (doubleRoundRobin) {
    const secondHalf = rounds.map((rd, idx) => ({
      roundIndex: totalRounds + idx + 1,
      pairs: rd.pairs.map(([h, a]) => [a, h] as [string, string]),
    }));
    return [...rounds, ...secondHalf];
  }
  return rounds;
}

/**
 * Generates an authentic UCL 36-club (or general N-team, M-matchday) League Phase schedule:
 * - When 36 teams and 8 matchdays: partitions into 4 pots of 9 teams and assigns 2 opponents
 *   from each pot (1 Home, 1 Away -> 4 Home, 4 Away total, 8 distinct opponents per club).
 * - Uses randomized graph edge-partitioning into exact 18-match matchdays so every matchday
 *   every single club plays exactly once!
 */
function generateSwissLeagueSchedule(
  teamIds: string[],
  matchesPerTeam: number,
  teamsMap: Map<string, Team>,
  seed: string
): {
  pots: string[][];
  rounds: Array<{ roundIndex: number; pairs: Array<[string, string]> }>;
} {
  const rng = createSeededRng(`${seed}::swiss`);
  const sortedByRating = [...teamIds].sort(
    (a, b) => getTeamRating(b, teamsMap) - getTeamRating(a, teamsMap)
  );
  const n = sortedByRating.length;

  // Partition into 4 seeded pots (or balanced pots)
  const potCount = n >= 16 ? 4 : n >= 8 ? 2 : 1;
  const pots: string[][] = Array.from({ length: potCount }, () => []);
  const potSize = Math.ceil(n / potCount);
  sortedByRating.forEach((id, idx) => {
    const pIdx = Math.min(potCount - 1, Math.floor(idx / potSize));
    pots[pIdx].push(id);
  });

  // For exact 36 clubs & 8 matchdays, build exact 4-pot balanced schedule across 8 matchdays
  if (n === 36 && matchesPerTeam === 8 && pots.every((p) => p.length === 9)) {
    const shufPots = pots.map((p) => shuffleWithRng(p, rng));
    type Edge = { home: string; away: string; a: string; b: string };
    const edges: Edge[] = [];
    const seenPair = new Set<string>();
    const addEdge = (home: string, away: string) => {
      const key = home < away ? `${home}::${away}` : `${away}::${home}`;
      if (seenPair.has(key)) return;
      seenPair.add(key);
      edges.push({ home, away, a: home, b: away });
    };

    // Intra-pot 9-cycles (1 Home, 1 Away against own pot)
    for (let p = 0; p < 4; p++) {
      const pot = shufPots[p];
      for (let i = 0; i < 9; i++) {
        addEdge(pot[i], pot[(i + 1) % 9]);
      }
    }

    // Cross-pot regular bipartite (1 Home, 1 Away against every other pot)
    for (let p = 0; p < 4; p++) {
      for (let q = p + 1; q < 4; q++) {
        const potP = shufPots[p];
        const potQ = shuffleWithRng(shufPots[q], rng);
        for (let i = 0; i < 9; i++) {
          addEdge(potP[i], potQ[i]);
          addEdge(potQ[i], potP[(i + 1) % 9]);
        }
      }
    }

    // Now assign all 144 edges into 8 matchdays of 18 disjoint matches via randomized swap-coloring
    for (let attempt = 0; attempt < 25; attempt++) {
      const attRng = createSeededRng(`${seed}::color::${attempt}`);
      const mdSets: Set<string>[] = Array.from({ length: 8 }, () => new Set<string>());
      const mdEdges: Edge[][] = Array.from({ length: 8 }, () => []);
      const unplaced = shuffleWithRng(edges, attRng);

      const backlog: Edge[] = [];
      for (const e of unplaced) {
        let placed = false;
        const order = shuffleWithRng([0, 1, 2, 3, 4, 5, 6, 7], attRng);
        for (const md of order) {
          if (!mdSets[md].has(e.home) && !mdSets[md].has(e.away)) {
            mdSets[md].add(e.home);
            mdSets[md].add(e.away);
            mdEdges[md].push(e);
            placed = true;
            break;
          }
        }
        if (!placed) backlog.push(e);
      }

      // Repair backlog via Kempe / single-swap displacement
      for (let pass = 0; pass < 300 && backlog.length > 0; pass++) {
        const target = backlog.shift()!;
        let resolved = false;
        const mdOrder = shuffleWithRng([0, 1, 2, 3, 4, 5, 6, 7], attRng);
        for (const md of mdOrder) {
          const conflicts = mdEdges[md].filter(
            (ex) =>
              ex.home === target.home ||
              ex.away === target.home ||
              ex.home === target.away ||
              ex.away === target.away
          );
          if (conflicts.length === 1) {
            const c = conflicts[0];
            // Can we move c to another md?
            const altOrder = shuffleWithRng([0, 1, 2, 3, 4, 5, 6, 7], attRng);
            for (const altMd of altOrder) {
              if (altMd === md) continue;
              if (!mdSets[altMd].has(c.home) && !mdSets[altMd].has(c.away)) {
                // Swap!
                mdSets[md].delete(c.home);
                mdSets[md].delete(c.away);
                mdEdges[md] = mdEdges[md].filter((x) => x !== c);
                mdSets[altMd].add(c.home);
                mdSets[altMd].add(c.away);
                mdEdges[altMd].push(c);
                mdSets[md].add(target.home);
                mdSets[md].add(target.away);
                mdEdges[md].push(target);
                resolved = true;
                break;
              }
            }
          }
          if (resolved) break;
        }
        if (!resolved) {
          // Force swap one conflict into backlog to traverse state space
          const md = mdOrder[0];
          const conflict = mdEdges[md].find(
            (ex) =>
              ex.home === target.home ||
              ex.away === target.home ||
              ex.home === target.away ||
              ex.away === target.away
          );
          if (conflict) {
            mdSets[md].delete(conflict.home);
            mdSets[md].delete(conflict.away);
            mdEdges[md] = mdEdges[md].filter((x) => x !== conflict);
            if (!mdSets[md].has(target.home) && !mdSets[md].has(target.away)) {
              mdSets[md].add(target.home);
              mdSets[md].add(target.away);
              mdEdges[md].push(target);
              backlog.push(conflict);
            } else {
              // put conflict back and target back
              mdSets[md].add(conflict.home);
              mdSets[md].add(conflict.away);
              mdEdges[md].push(conflict);
              backlog.push(target);
            }
          } else {
            backlog.push(target);
          }
        }
      }

      if (backlog.length === 0 && mdEdges.every((m) => m.length === 18)) {
        return {
          pots,
          rounds: mdEdges.map((list, idx) => ({
            roundIndex: idx + 1,
            pairs: list.map((e) => [e.home, e.away]),
          })),
        };
      }
    }
  }

  // Fallback exact disjoint Berger circle rounds for any N and M < N
  const berger = generateBergerPairings(shuffleWithRng(teamIds, rng), false);
  return {
    pots,
    rounds: berger.slice(0, matchesPerTeam).map((r, i) => ({
      roundIndex: i + 1,
      pairs: r.pairs,
    })),
  };
}

// ============================================================================
// STANDINGS & TIE-BREAKER ENGINE
// ============================================================================

interface RawStatsAcc {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  awayGoals: number;
  points: number;
  form: Array<'W' | 'D' | 'L'>;
}

function compareStandingsByCriteria(
  a: RawStatsAcc,
  b: RawStatsAcc,
  tieBreakers: TieBreakerKey[],
  fixtures: CompetitionFixtureMatch[],
  teamsMap: Map<string, Team>,
  useHeadToHead = true
): number {
  for (const key of tieBreakers) {
    if (key === 'points') {
      if (b.points !== a.points) return b.points - a.points;
    } else if (key === 'goal-diff') {
      const gdA = a.goalsFor - a.goalsAgainst;
      const gdB = b.goalsFor - b.goalsAgainst;
      if (gdB !== gdA) return gdB - gdA;
    } else if (key === 'goals-for') {
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    } else if (key === 'wins') {
      if (b.won !== a.won) return b.won - a.won;
    } else if (key === 'away-goals') {
      if (b.awayGoals !== a.awayGoals) return b.awayGoals - a.awayGoals;
    } else if (key === 'rating') {
      const rDiff = getTeamRating(b.teamId, teamsMap) - getTeamRating(a.teamId, teamsMap);
      if (rDiff !== 0) return rDiff;
    } else if (key === 'head-to-head' && useHeadToHead) {
      const h2h = fixtures.filter(
        (f) =>
          f.status === 'completed' &&
          ((f.homeTeamId === a.teamId && f.awayTeamId === b.teamId) ||
            (f.homeTeamId === b.teamId && f.awayTeamId === a.teamId))
      );
      if (h2h.length > 0) {
        let ptsA = 0;
        let ptsB = 0;
        let gdA = 0;
        let gdB = 0;
        let gfA = 0;
        let gfB = 0;
        for (const m of h2h) {
          const hs = m.homeScore ?? 0;
          const as = m.awayScore ?? 0;
          if (m.homeTeamId === a.teamId) {
            gfA += hs;
            gfB += as;
            gdA += hs - as;
            gdB += as - hs;
            if (hs > as) ptsA += 3;
            else if (as > hs) ptsB += 3;
            else {
              ptsA += 1;
              ptsB += 1;
            }
          } else {
            gfB += hs;
            gfA += as;
            gdB += hs - as;
            gdA += as - hs;
            if (hs > as) ptsB += 3;
            else if (as > hs) ptsA += 3;
            else {
              ptsA += 1;
              ptsB += 1;
            }
          }
        }
        if (ptsB !== ptsA) return ptsB - ptsA;
        if (gdB !== gdA) return gdB - gdA;
        if (gfB !== gfA) return gfB - gfA;
      }
    }
  }
  const nameA = teamsMap.get(a.teamId)?.name || a.teamId;
  const nameB = teamsMap.get(b.teamId)?.name || b.teamId;
  return nameA.localeCompare(nameB);
}

export function recomputeStageStandings(
  stage: CompetitionStageRuntime,
  tieBreakers: TieBreakerKey[],
  teamsMap: Map<string, Team>
): CompetitionStageRuntime {
  if (stage.config.type === 'knockout') {
    return stage;
  }

  const buildRowsForSet = (
    teamIds: string[],
    fixturesPool: CompetitionFixtureMatch[],
    groupId?: string,
    groupName?: string
  ): CompetitionStandingEntry[] => {
    const accMap = new Map<string, RawStatsAcc>();
    for (const tid of teamIds) {
      accMap.set(tid, {
        teamId: tid,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        awayGoals: 0,
        points: 0,
        form: [],
      });
    }

    const orderedFixtures = fixturesPool
      .filter((f) => f.status === 'completed' && f.homeTeamId && f.awayTeamId)
      .sort((a, b) => a.roundIndex - b.roundIndex);

    for (const f of orderedFixtures) {
      const h = accMap.get(f.homeTeamId!);
      const a = accMap.get(f.awayTeamId!);
      if (!h || !a) continue;
      const hs = f.homeScore ?? 0;
      const as = f.awayScore ?? 0;
      h.played++;
      a.played++;
      h.goalsFor += hs;
      h.goalsAgainst += as;
      a.goalsFor += as;
      a.goalsAgainst += hs;
      if (!f.neutralVenue) {
        a.awayGoals += as;
      }
      if (hs > as) {
        h.won++;
        h.points += 3;
        h.form.push('W');
        a.lost++;
        a.form.push('L');
      } else if (as > hs) {
        a.won++;
        a.points += 3;
        a.form.push('W');
        h.lost++;
        h.form.push('L');
      } else {
        h.drawn++;
        a.drawn++;
        h.points += 1;
        a.points += 1;
        h.form.push('D');
        a.form.push('D');
      }
    }

    const sortedAcc = Array.from(accMap.values()).sort((r1, r2) =>
      compareStandingsByCriteria(r1, r2, tieBreakers, orderedFixtures, teamsMap, true)
    );

    return sortedAcc.map((r, idx) => {
      const team = teamsMap.get(r.teamId);
      const pos = idx + 1;
      let zone: CompetitionStandingEntry['zone'] = 'active';
      if (stage.config.type === 'league') {
        const direct = stage.config.directQualifyCount ?? stage.config.advanceCount;
        const playoff = stage.config.playoffQualifyCount ?? 0;
        if (pos <= direct) zone = 'direct';
        else if (pos <= direct + playoff) zone = 'playoff';
        else if (stage.status === 'completed') zone = 'eliminated';
      } else if (stage.config.type === 'group') {
        const qpg = stage.config.qualifyPerGroup ?? 2;
        if (pos <= qpg) zone = 'direct';
        else if (stage.status === 'completed') zone = 'eliminated';
      }
      return {
        position: pos,
        teamId: r.teamId,
        teamName: team?.name || r.teamId,
        teamCode: team?.code || r.teamId.slice(0, 3).toUpperCase(),
        crestUrl: team?.crestUrl || '',
        groupId,
        groupName,
        played: r.played,
        won: r.won,
        drawn: r.drawn,
        lost: r.lost,
        goalsFor: r.goalsFor,
        goalsAgainst: r.goalsAgainst,
        goalDiff: r.goalsFor - r.goalsAgainst,
        awayGoals: r.awayGoals,
        points: r.points,
        form: r.form.slice(-5),
        zone,
      };
    });
  };

  if (stage.config.type === 'league') {
    const standings = buildRowsForSet(stage.participantIds, stage.fixtures);
    return {
      ...stage,
      standings,
    };
  }

  // Group stage
  const allRows: CompetitionStandingEntry[] = [];
  const thirdRowsRaw: CompetitionStandingEntry[] = [];
  for (const grp of stage.groups || []) {
    const grpFixtures = stage.fixtures.filter((f) => f.groupId === grp.id);
    const rows = buildRowsForSet(grp.teamIds, grpFixtures, grp.id, grp.name);
    allRows.push(...rows);
    if (rows[2]) {
      thirdRowsRaw.push(rows[2]);
    }
  }

  const bestThirdCount = stage.config.bestThirdPlacedCount ?? 0;
  let thirdPlaceTable: CompetitionStandingEntry[] | undefined;
  if (bestThirdCount > 0 && thirdRowsRaw.length > 0) {
    thirdPlaceTable = [...thirdRowsRaw]
      .sort((a, b) =>
        compareStandingsByCriteria(
          {
            teamId: a.teamId,
            played: a.played,
            won: a.won,
            drawn: a.drawn,
            lost: a.lost,
            goalsFor: a.goalsFor,
            goalsAgainst: a.goalsAgainst,
            awayGoals: a.awayGoals,
            points: a.points,
            form: a.form,
          },
          {
            teamId: b.teamId,
            played: b.played,
            won: b.won,
            drawn: b.drawn,
            lost: b.lost,
            goalsFor: b.goalsFor,
            goalsAgainst: b.goalsAgainst,
            awayGoals: b.awayGoals,
            points: b.points,
            form: b.form,
          },
          tieBreakers.filter((k) => k !== 'head-to-head'),
          [],
          teamsMap,
          false
        )
      )
      .map((row, idx) => ({
        ...row,
        position: idx + 1,
        zone: idx < bestThirdCount ? 'third-best' : stage.status === 'completed' ? 'eliminated' : 'active',
      }));

    const bestThirdIds = new Set(
      thirdPlaceTable.slice(0, bestThirdCount).map((r) => r.teamId)
    );
    allRows.forEach((row) => {
      if (row.zone !== 'direct' && bestThirdIds.has(row.teamId)) {
        row.zone = 'third-best';
      }
    });
  }

  return {
    ...stage,
    standings: allRows,
    thirdPlaceTable,
  };
}

// ============================================================================
// STAGE DRAW & BRACKET GENERATOR
// ============================================================================

function buildKnockoutBracketFixtures(
  stageConfig: TournamentStageConfig,
  participantIds: string[],
  teamsMap: Map<string, Team>,
  mode: 'seeded' | 'bracket' | 'random',
  seed: string,
  isPlayoffStage = false
): CompetitionFixtureMatch[] {
  const rng = createSeededRng(`${seed}::ko-draw`);
  const orderedSeeds =
    mode === 'random'
      ? shuffleWithRng(participantIds, rng)
      : mode === 'bracket'
      ? [...participantIds]
      : [...participantIds].sort(
          (a, b) => getTeamRating(b, teamsMap) - getTeamRating(a, teamsMap)
        );

  const n = orderedSeeds.length;
  const fixtures: CompetitionFixtureMatch[] = [];
  const baseTwoLegged = Boolean(stageConfig.twoLegged);
  const finalSingle = stageConfig.finalSingleLeg !== false;
  const isNeutral = Boolean(stageConfig.neutralVenue);

  // Determine rounds structure.
  // If n is not a power of 2, run a Preliminary Play-In Round for the bottom 2*(n - P) teams,
  // giving the top (2*P - n) seeds direct byes to Round 2 (exact size P)!
  let firstRoundTeamCount = n;
  const mainBracketSize = isPowerOfTwo(n) ? n : largestPowerOfTwoAtMost(n);
  const hasPlayIn = !isPowerOfTwo(n) && n > 2;
  const playInMatches = hasPlayIn ? n - mainBracketSize : 0;
  const directSeedsCount = hasPlayIn ? 2 * mainBracketSize - n : 0;

  interface TieDescriptor {
    tieId: string;
    roundIndex: number;
    roundLabel: string;
    bracketSlot: number;
    homeTeamId: string | null;
    awayTeamId: string | null;
    homePlaceholder?: string;
    awayPlaceholder?: string;
    isFinal: boolean;
    isThirdPlace?: boolean;
    isTwoLegged: boolean;
  }

  let currentRoundIndex = 1;
  let prevRoundTies: TieDescriptor[] = [];

  if (hasPlayIn) {
    // Bottom 2*playInMatches play in Preliminary Round
    const playInPool = orderedSeeds.slice(directSeedsCount);
    const roundLabel = 'Preliminary Play-In';
    const ties: TieDescriptor[] = [];
    for (let i = 0; i < playInMatches; i++) {
      const high = playInPool[i];
      const low = playInPool[playInPool.length - 1 - i];
      ties.push({
        tieId: `${stageConfig.id}-r${currentRoundIndex}-s${i + 1}`,
        roundIndex: currentRoundIndex,
        roundLabel,
        bracketSlot: i + 1,
        homeTeamId: low, // Lower seed plays home first if 2-legged
        awayTeamId: high,
        isFinal: false,
        isTwoLegged: baseTwoLegged,
      });
    }
    prevRoundTies = ties;
    ties.forEach((t) => pushTieFixtures(t));
    currentRoundIndex++;
    firstRoundTeamCount = mainBracketSize;
  }

  // Now build standard power-of-2 main bracket from size = firstRoundTeamCount down to 2
  let bracketSize = firstRoundTeamCount;
  while (bracketSize >= 2) {
    const matchesInRound = bracketSize / 2;
    const isFinalRound = bracketSize === 2;
    const isSemiRound = bracketSize === 4;
    const roundLabel = getKnockoutRoundLabel(bracketSize, isPlayoffStage);
    const isTwoLegged = baseTwoLegged && !(finalSingle && isFinalRound);
    const roundTies: TieDescriptor[] = [];

    if (prevRoundTies.length === 0 && !hasPlayIn) {
      // Opening round with all teams directly assigned: pair 1 vs N, 2 vs N-1 (classic bracket order so #1 & #2 meet only in Final)
      const bracketOrderIndices = buildSeededBracketOrder(bracketSize);
      for (let m = 0; m < matchesInRound; m++) {
        const seedIdxA = bracketOrderIndices[m * 2];
        const seedIdxB = bracketOrderIndices[m * 2 + 1];
        const teamA = orderedSeeds[seedIdxA] ?? null; // higher seed
        const teamB = orderedSeeds[seedIdxB] ?? null; // lower seed
        const tie: TieDescriptor = {
          tieId: `${stageConfig.id}-r${currentRoundIndex}-s${m + 1}`,
          roundIndex: currentRoundIndex,
          roundLabel,
          bracketSlot: m + 1,
          // In 2-legged ties, lower seed hosts Leg 1 so higher seed hosts decisive Leg 2!
          homeTeamId: isTwoLegged ? teamB : teamA,
          awayTeamId: isTwoLegged ? teamA : teamB,
          isFinal: isFinalRound,
          isTwoLegged,
        };
        roundTies.push(tie);
        pushTieFixtures(tie);
      }
    } else if (hasPlayIn && bracketSize === mainBracketSize && currentRoundIndex === 2) {
      // Merge direct seeds + Play-In winners
      const directPool = orderedSeeds.slice(0, directSeedsCount);
      const playInTies = prevRoundTies;
      const combinedSlots: Array<{ teamId: string | null; placeholder?: string }> = [
        ...directPool.map((tid) => ({ teamId: tid })),
        ...playInTies.map((pt, idx) => ({
          teamId: null,
          placeholder: `Winner ${pt.roundLabel} #${idx + 1}`,
        })),
      ];
      const bracketOrderIndices = buildSeededBracketOrder(bracketSize);
      for (let m = 0; m < matchesInRound; m++) {
        const slotA = combinedSlots[bracketOrderIndices[m * 2]];
        const slotB = combinedSlots[bracketOrderIndices[m * 2 + 1]];
        const tie: TieDescriptor = {
          tieId: `${stageConfig.id}-r${currentRoundIndex}-s${m + 1}`,
          roundIndex: currentRoundIndex,
          roundLabel,
          bracketSlot: m + 1,
          homeTeamId: isTwoLegged ? slotB?.teamId ?? null : slotA?.teamId ?? null,
          awayTeamId: isTwoLegged ? slotA?.teamId ?? null : slotB?.teamId ?? null,
          homePlaceholder: isTwoLegged ? slotB?.placeholder : slotA?.placeholder,
          awayPlaceholder: isTwoLegged ? slotA?.placeholder : slotB?.placeholder,
          isFinal: isFinalRound,
          isTwoLegged,
        };
        roundTies.push(tie);
        pushTieFixtures(tie);
      }
    } else {
      // Subsequent rounds fed by winners of prevRoundTies pairs (0&1, 2&3, ...)
      for (let m = 0; m < matchesInRound; m++) {
        const srcA = prevRoundTies[m * 2];
        const srcB = prevRoundTies[m * 2 + 1];
        const tie: TieDescriptor = {
          tieId: `${stageConfig.id}-r${currentRoundIndex}-s${m + 1}`,
          roundIndex: currentRoundIndex,
          roundLabel,
          bracketSlot: m + 1,
          homeTeamId: null,
          awayTeamId: null,
          homePlaceholder: srcA ? `Winner ${srcA.roundLabel} #${srcA.bracketSlot}` : 'TBD',
          awayPlaceholder: srcB ? `Winner ${srcB.roundLabel} #${srcB.bracketSlot}` : 'TBD',
          isFinal: isFinalRound,
          isTwoLegged,
        };
        roundTies.push(tie);
        pushTieFixtures(tie);
      }
    }

    // Optional 3rd-place play-off right before Final
    if (isSemiRound && stageConfig.thirdPlacePlayoff) {
      const sf1 = roundTies[0];
      const sf2 = roundTies[1];
      const tpTie: TieDescriptor = {
        tieId: `${stageConfig.id}-r${currentRoundIndex + 1}-3rd`,
        roundIndex: currentRoundIndex + 1,
        roundLabel: '3rd Place Play-Off',
        bracketSlot: 2,
        homeTeamId: null,
        awayTeamId: null,
        homePlaceholder: sf1 ? `Loser ${sf1.roundLabel} #1` : 'Loser SF1',
        awayPlaceholder: sf2 ? `Loser ${sf2.roundLabel} #2` : 'Loser SF2',
        isFinal: false,
        isThirdPlace: true,
        isTwoLegged: false,
      };
      // Advance Final to roundIndex + 1 too (added next iteration cleanly!)
      prevRoundTies = roundTies;
      currentRoundIndex++;
      // If advanceCount > 1 (e.g. UCL KO Play-Offs stopping after 16 -> 8), stop early!
      if (bracketSize / 2 <= stageConfig.advanceCount) {
        break;
      }
      bracketSize = bracketSize / 2;
      // Push 3rd place on final round iteration
      pushTieFixtures(tpTie);
      continue;
    }

    prevRoundTies = roundTies;
    currentRoundIndex++;
    if (bracketSize / 2 <= stageConfig.advanceCount) {
      break;
    }
    bracketSize = bracketSize / 2;
  }

  function pushTieFixtures(tie: TieDescriptor) {
    if (tie.isTwoLegged) {
      fixtures.push({
        id: `${tie.tieId}-leg1`,
        stageId: stageConfig.id,
        stageOrder: stageConfig.order,
        stageName: stageConfig.name,
        stageType: 'knockout',
        roundIndex: tie.roundIndex,
        roundLabel: `${tie.roundLabel} · 1st Leg`,
        bracketSlot: tie.bracketSlot,
        tieId: tie.tieId,
        legNumber: 1,
        isTwoLegged: true,
        isKnockout: true,
        isFinal: tie.isFinal,
        isThirdPlace: tie.isThirdPlace,
        homeTeamId: tie.homeTeamId,
        awayTeamId: tie.awayTeamId,
        homePlaceholder: tie.homePlaceholder,
        awayPlaceholder: tie.awayPlaceholder,
        neutralVenue: isNeutral && tie.isFinal,
        status: tie.homeTeamId && tie.awayTeamId ? 'scheduled' : 'pending',
      });
      fixtures.push({
        id: `${tie.tieId}-leg2`,
        stageId: stageConfig.id,
        stageOrder: stageConfig.order,
        stageName: stageConfig.name,
        stageType: 'knockout',
        roundIndex: tie.roundIndex,
        roundLabel: `${tie.roundLabel} · 2nd Leg`,
        bracketSlot: tie.bracketSlot,
        tieId: tie.tieId,
        legNumber: 2,
        isTwoLegged: true,
        isKnockout: true,
        isFinal: tie.isFinal,
        isThirdPlace: tie.isThirdPlace,
        homeTeamId: tie.awayTeamId,
        awayTeamId: tie.homeTeamId,
        homePlaceholder: tie.awayPlaceholder,
        awayPlaceholder: tie.homePlaceholder,
        neutralVenue: isNeutral && tie.isFinal,
        status: tie.homeTeamId && tie.awayTeamId ? 'scheduled' : 'pending',
      });
    } else {
      fixtures.push({
        id: `${tie.tieId}-single`,
        stageId: stageConfig.id,
        stageOrder: stageConfig.order,
        stageName: stageConfig.name,
        stageType: 'knockout',
        roundIndex: tie.roundIndex,
        roundLabel: tie.roundLabel,
        bracketSlot: tie.bracketSlot,
        tieId: tie.tieId,
        legNumber: 1,
        isTwoLegged: false,
        isKnockout: true,
        isFinal: tie.isFinal,
        isThirdPlace: tie.isThirdPlace,
        homeTeamId: tie.homeTeamId,
        awayTeamId: tie.awayTeamId,
        homePlaceholder: tie.homePlaceholder,
        awayPlaceholder: tie.awayPlaceholder,
        neutralVenue: isNeutral || Boolean(tie.isFinal) || Boolean(tie.isThirdPlace),
        status: tie.homeTeamId && tie.awayTeamId ? 'scheduled' : 'pending',
      });
    }
  }

  return fixtures;
}

/**
 * Generates classic seeded tournament bracket order [0, N-1, ..., 1, N-2] so #1 and #2
 * are placed in opposite halves and meet only in the Final.
 */
function buildSeededBracketOrder(size: number): number[] {
  let rounds = [0, 1];
  while (rounds.length < size) {
    const nextSize = rounds.length * 2;
    const expanded: number[] = [];
    for (const seed of rounds) {
      expanded.push(seed, nextSize - 1 - seed);
    }
    rounds = expanded;
  }
  return rounds.slice(0, size);
}

export function buildTeamSnapshots(
  teamIds: string[],
  teamsMap: Map<string, Team>,
  managersByTeam?: Map<string, Manager | null>
): Record<string, TournamentTeamSnapshot> {
  const snapshots: Record<string, TournamentTeamSnapshot> = {};
  const nowIso = new Date().toISOString();
  for (const tid of teamIds) {
    const t = teamsMap.get(tid);
    if (!t) continue;
    const mgr = managersByTeam?.get(tid) ?? null;
    snapshots[tid] = {
      id: t.id,
      name: t.name,
      shortName: t.shortName,
      code: t.code,
      team_type: getTeamType(t),
      country: t.country,
      league: t.league,
      confederation: t.confederation,
      gender: t.gender,
      crestUrl: t.crestUrl,
      stadium: t.stadium,
      primaryColor: t.primaryColor,
      secondaryColor: t.secondaryColor,
      overallRating: t.overallRating,
      attackRating: t.attackRating,
      midfieldRating: t.midfieldRating,
      defenceRating: t.defenceRating,
      defaultFormation: t.defaultFormation,
      playingStyle: t.playingStyle,
      tacticalProfile: t.tacticalProfile,
      preferredXiIds: t.preferredXiIds ? [...t.preferredXiIds] : undefined,
      penaltyOrderIds: t.penaltyOrderIds ? [...t.penaltyOrderIds] : undefined,
      managerId: mgr?.id ?? t.manager_id ?? null,
      managerName: mgr?.name ?? t.manager_name ?? t.manager ?? null,
      capturedAt: nowIso,
    };
  }
  return snapshots;
}

export function resolveTournamentTeam(
  tournament: CompetitionMakerTournament,
  teamId: string,
  teamsMap: Map<string, Team>,
  applyTournamentInjuries = false
): Team | undefined {
  const live = teamsMap.get(teamId);
  const snap = tournament.teamSnapshots?.[teamId];
  if (!live && !snap) return undefined;

  const base: Team = live
    ? {
        ...live,
        ...(snap
          ? {
              name: snap.name,
              shortName: snap.shortName,
              code: snap.code,
              crestUrl: snap.crestUrl || live.crestUrl,
              stadium: snap.stadium || live.stadium,
              primaryColor: snap.primaryColor || live.primaryColor,
              secondaryColor: snap.secondaryColor || live.secondaryColor,
              overallRating: snap.overallRating,
              attackRating: snap.attackRating,
              midfieldRating: snap.midfieldRating,
              defenceRating: snap.defenceRating,
              defaultFormation: snap.defaultFormation || live.defaultFormation,
              playingStyle: snap.playingStyle || live.playingStyle,
              tacticalProfile: snap.tacticalProfile || live.tacticalProfile,
              preferredXiIds: snap.preferredXiIds || live.preferredXiIds,
              penaltyOrderIds: snap.penaltyOrderIds || live.penaltyOrderIds,
            }
          : {}),
      }
    : {
        id: snap!.id,
        name: snap!.name,
        shortName: snap!.shortName,
        code: snap!.code,
        type: snap!.team_type === 'country' ? 'national' : 'club',
        team_type: snap!.team_type,
        country: snap!.country,
        league: snap!.league,
        confederation: snap!.confederation as Team['confederation'],
        gender: snap!.gender,
        overallRating: snap!.overallRating,
        attackRating: snap!.attackRating,
        midfieldRating: snap!.midfieldRating,
        defenceRating: snap!.defenceRating,
        crestUrl: snap!.crestUrl,
        stadium: snap!.stadium,
        foundedYear: 1900,
        manager: snap!.managerName || 'Head Coach',
        manager_id: snap!.managerId ?? null,
        manager_name: snap!.managerName ?? null,
        playingStyle: snap!.playingStyle,
        primaryColor: snap!.primaryColor,
        secondaryColor: snap!.secondaryColor,
        tacticalProfile: snap!.tacticalProfile,
        preferredXiIds: snap!.preferredXiIds,
        penaltyOrderIds: snap!.penaltyOrderIds,
        squad: [],
        defaultFormation: snap!.defaultFormation || '4-3-3',
      };

  if (!applyTournamentInjuries || !tournament.injuryTracker) {
    return base;
  }

  const activeInjuredIds = new Set(
    Object.values(tournament.injuryTracker)
      .filter((entry) => entry.teamId === teamId && entry.matchesRemaining > 0)
      .map((entry) => entry.playerId)
  );

  if (activeInjuredIds.size === 0) return base;

  const adjustedSquad = base.squad.map((p) =>
    activeInjuredIds.has(p.id) ? { ...p, injuryStatus: 'injured' as const } : p
  );
  const availCount = adjustedSquad.filter((p) => p.injuryStatus !== 'injured').length;
  const penalty = Math.min(4, activeInjuredIds.size);

  return {
    ...base,
    squad: adjustedSquad,
    overallRating:
      availCount >= 11
        ? Math.max(40, base.overallRating - Math.floor(penalty / 2))
        : Math.max(38, base.overallRating - penalty),
  };
}

function canPlaceTeamInGroupWithoutCountryConflict(
  teamId: string,
  groupTeamIds: string[],
  teamsMap: Map<string, Team>
): boolean {
  const team = teamsMap.get(teamId);
  const ctry = (team?.country || '').trim().toLowerCase();
  if (!ctry) return true;
  return !groupTeamIds.some((gid) => {
    const existing = teamsMap.get(gid);
    return (existing?.country || '').trim().toLowerCase() === ctry;
  });
}

export function isStageLocked(
  tournament: CompetitionMakerTournament,
  stageOrder: number
): boolean {
  const target = tournament.stages.find((s) => s.config.order === stageOrder);
  if (!target) return true;
  if (target.status === 'locked') return true;
  return tournament.stages.some(
    (s) => s.config.order < stageOrder && s.status !== 'completed'
  );
}

export function performStageDraw(
  tournament: CompetitionMakerTournament,
  stageOrder: number,
  teamsMap: Map<string, Team>,
  modeOverride?: 'seeded' | 'bracket' | 'random' | 'official',
  customGroups?: TournamentGroup[],
  options?: { preventSameCountry?: boolean }
): CompetitionMakerTournament {
  const stageIdx = tournament.stages.findIndex((s) => s.config.order === stageOrder);
  if (stageIdx < 0) return tournament;
  if (isStageLocked(tournament, stageOrder)) return tournament;
  const target = tournament.stages[stageIdx];
  const cfg = target.config;
  const participants = [...target.participantIds];
  if (participants.length < 2) return tournament;

  const drawMode = modeOverride || cfg.seedingMode || 'seeded';
  const preventSameCountry =
    options?.preventSameCountry ?? tournament.drawOptions?.preventSameCountry ?? false;
  const drawSeed = `${tournament.id}-s${stageOrder}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const rng = createSeededRng(drawSeed);

  let nextGroups: TournamentGroup[] | undefined;
  let nextLeaguePots: string[][] | undefined;
  let fixtures: CompetitionFixtureMatch[] = [];
  let drawWarning: string | undefined;

  if (cfg.type === 'group') {
    const gc = cfg.groupCount || 4;
    const gs = cfg.groupSize || Math.ceil(participants.length / gc);

    const participantSet = new Set(participants);
    const isOfficialWc48 =
      tournament.presetId === 'world-cup-2026' &&
      stageOrder === 0 &&
      participants.length === 48 &&
      gc === 12 &&
      (drawMode === 'official' || (!modeOverride && WORLD_CUP_2026_TEAM_IDS.every((id) => participantSet.has(id))));

    if (customGroups && customGroups.length === gc) {
      nextGroups = customGroups;
    } else if (isOfficialWc48 && WORLD_CUP_2026_TEAM_IDS.every((id) => participantSet.has(id))) {
      nextGroups = WORLD_CUP_2026_GROUPS.map((grp, idx) => {
        const potMap: Record<string, number> = {};
        grp.teamIds.forEach((tid, pIdx) => {
          potMap[tid] = pIdx + 1;
        });
        return {
          id: `${cfg.id}-grp-${idx}`,
          name: grp.name,
          teamIds: [...grp.teamIds],
          potMap,
        };
      });
    } else {
      const potSorted =
        drawMode === 'random'
          ? shuffleWithRng(participants, rng)
          : [...participants].sort(
              (a, b) => getTeamRating(b, teamsMap) - getTeamRating(a, teamsMap)
            );

      // Build balanced pots and assign respecting country-protection when requested
      let bestGroups: TournamentGroup[] | null = null;
      let bestConflicts = Infinity;
      const attempts = preventSameCountry ? 40 : 1;

      for (let att = 0; att < attempts; att++) {
        const attRng = createSeededRng(`${drawSeed}::grp::${att}`);
        const candidate: TournamentGroup[] = Array.from({ length: gc }, (_, idx) => ({
          id: `${cfg.id}-grp-${idx}`,
          name: `Group ${String.fromCharCode(65 + idx)}`,
          teamIds: [],
          potMap: {},
        }));

        let conflicts = 0;
        for (let potIdx = 0; potIdx < gs; potIdx++) {
          const potSlice = potSorted.slice(potIdx * gc, (potIdx + 1) * gc);
          const drawnPot = shuffleWithRng(potSlice, attRng);
          const openGroupIndices = candidate
            .map((_, idx) => idx)
            .filter((idx) => candidate[idx].teamIds.length < potIdx + 1);

          for (const tid of drawnPot) {
            let pickedIdx = -1;
            if (preventSameCountry) {
              pickedIdx =
                openGroupIndices.find((idx) =>
                  canPlaceTeamInGroupWithoutCountryConflict(tid, candidate[idx].teamIds, teamsMap)
                ) ?? -1;
            }
            if (pickedIdx < 0) {
              pickedIdx = openGroupIndices[0] ?? 0;
              if (
                preventSameCountry &&
                !canPlaceTeamInGroupWithoutCountryConflict(tid, candidate[pickedIdx].teamIds, teamsMap)
              ) {
                conflicts++;
              }
            }
            const removeAt = openGroupIndices.indexOf(pickedIdx);
            if (removeAt >= 0) openGroupIndices.splice(removeAt, 1);
            candidate[pickedIdx].teamIds.push(tid);
            candidate[pickedIdx].potMap![tid] = potIdx + 1;
          }
        }

        if (conflicts < bestConflicts) {
          bestConflicts = conflicts;
          bestGroups = candidate;
          if (conflicts === 0) break;
        }
      }

      nextGroups = bestGroups || [];
      if (preventSameCountry && bestConflicts > 0 && bestConflicts < Infinity) {
        drawWarning = `Same-country protection could not be strictly satisfied for ${bestConflicts} slot(s) because too many teams share the same association; placed using minimum-conflict balancing.`;
      }
    }

    for (const grp of nextGroups) {
      const berger = generateBergerPairings(grp.teamIds, Boolean(cfg.homeAndAway));
      for (const rd of berger) {
        rd.pairs.forEach(([homeTeamId, awayTeamId], pIdx) => {
          fixtures.push({
            id: `${grp.id}-md${rd.roundIndex}-m${pIdx + 1}`,
            stageId: cfg.id,
            stageOrder: cfg.order,
            stageName: cfg.name,
            stageType: 'group',
            groupId: grp.id,
            groupName: grp.name,
            roundIndex: rd.roundIndex,
            roundLabel: `Matchday ${rd.roundIndex}`,
            legNumber: 1,
            isTwoLegged: false,
            isKnockout: false,
            homeTeamId,
            awayTeamId,
            neutralVenue: Boolean(cfg.neutralVenue),
            status: 'scheduled',
          });
        });
      }
    }
  } else if (cfg.type === 'league') {
    if (cfg.roundsMode === 'swiss-n') {
      const mpt = cfg.matchesPerTeam || 8;
      const swiss = generateSwissLeagueSchedule(participants, mpt, teamsMap, drawSeed);
      nextLeaguePots = swiss.pots;
      swiss.rounds.forEach((rd) => {
        rd.pairs.forEach(([homeTeamId, awayTeamId], idx) => {
          fixtures.push({
            id: `${cfg.id}-md${rd.roundIndex}-m${idx + 1}`,
            stageId: cfg.id,
            stageOrder: cfg.order,
            stageName: cfg.name,
            stageType: 'league',
            roundIndex: rd.roundIndex,
            roundLabel: `Matchday ${rd.roundIndex}`,
            legNumber: 1,
            isTwoLegged: false,
            isKnockout: false,
            homeTeamId,
            awayTeamId,
            neutralVenue: Boolean(cfg.neutralVenue),
            status: 'scheduled',
          });
        });
      });
    } else {
      const pool = drawMode === 'random' ? shuffleWithRng(participants, rng) : participants;
      const berger = generateBergerPairings(pool, cfg.roundsMode === 'double-rr' || Boolean(cfg.homeAndAway));
      berger.forEach((rd) => {
        rd.pairs.forEach(([homeTeamId, awayTeamId], idx) => {
          fixtures.push({
            id: `${cfg.id}-md${rd.roundIndex}-m${idx + 1}`,
            stageId: cfg.id,
            stageOrder: cfg.order,
            stageName: cfg.name,
            stageType: 'league',
            roundIndex: rd.roundIndex,
            roundLabel: `Matchday ${rd.roundIndex}`,
            legNumber: 1,
            isTwoLegged: false,
            isKnockout: false,
            homeTeamId,
            awayTeamId,
            neutralVenue: Boolean(cfg.neutralVenue),
            status: 'scheduled',
          });
        });
      });
    }
  } else {
    // Knockout stage
    const isPlayoffStage = stageOrder > 0 && cfg.advanceCount > 1;
    const koMode: 'seeded' | 'bracket' | 'random' =
      drawMode === 'official' ? 'seeded' : drawMode;
    fixtures = buildKnockoutBracketFixtures(
      cfg,
      participants,
      teamsMap,
      koMode,
      drawSeed,
      isPlayoffStage
    );
  }

  let updatedStage: CompetitionStageRuntime = {
    ...target,
    status: 'active',
    groups: nextGroups,
    leaguePots: nextLeaguePots,
    fixtures,
    qualifiedIds: [],
    playoffIds: [],
    eliminatedIds: [],
  };

  updatedStage = recomputeStageStandings(updatedStage, tournament.tieBreakers, teamsMap);

  const nextStages = tournament.stages.map((s, idx) => (idx === stageIdx ? updatedStage : s));
  const nowIso = new Date().toISOString();

  return {
    ...tournament,
    status: tournament.status === 'setup' ? 'in-progress' : tournament.status,
    currentStageOrder: Math.max(tournament.currentStageOrder, stageOrder),
    drawOptions: {
      preventSameCountry,
      lastMode: drawMode,
      lastWarning: drawWarning,
    },
    stages: nextStages,
    logs: [
      {
        id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: nowIso,
        type: 'draw' as const,
        message: `${cfg.name} draw completed (${drawMode}${preventSameCountry ? ', country-protected' : ''}) — ${fixtures.length} fixtures scheduled.${drawWarning ? ` Note: ${drawWarning}` : ''}`,
      },
      ...tournament.logs,
    ].slice(0, 120),
    updatedAt: nowIso,
  };
}

// ============================================================================
// TOURNAMENT INITIALIZATION FROM CONFIG
// ============================================================================

export function createTournamentFromConfig(
  params: {
    id?: string;
    name: string;
    shortName?: string;
    season: string;
    description: string;
    customLogoUrl?: string;
    presetId: TournamentPresetId;
    teamScope: TeamScopeMode;
    teamIds: string[];
    tieBreakers: TieBreakerKey[];
    homeAdvantageBoost: number;
    preventSameCountry?: boolean;
    trophy: TrophyDesignConfig;
    stages: TournamentStageConfig[];
    createdBy: string;
    createdByName?: string;
  },
  teamsMap: Map<string, Team>,
  managersByTeam?: Map<string, Manager | null>
): CompetitionMakerTournament {
  const nowIso = new Date().toISOString();
  const sortedStages = [...params.stages]
    .sort((a, b) => a.order - b.order)
    .map((cfg, idx) => ({ ...cfg, order: idx }));

  const runtimeStages: CompetitionStageRuntime[] = sortedStages.map((cfg, idx) => ({
    config: cfg,
    status: idx === 0 ? 'drawn' : 'locked',
    participantIds: idx === 0 ? [...params.teamIds] : [],
    directByeIds: [],
    fixtures: [],
    qualifiedIds: [],
    playoffIds: [],
    eliminatedIds: [],
  }));

  const snapshots = buildTeamSnapshots(params.teamIds, teamsMap, managersByTeam);

  const initial: CompetitionMakerTournament = {
    id: params.id || `cm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: params.name.trim(),
    shortName: (params.shortName || params.name).trim().slice(0, 14).toUpperCase(),
    season: params.season.trim(),
    description: params.description.trim(),
    ...(params.customLogoUrl ? { customLogoUrl: params.customLogoUrl } : {}),
    presetId: params.presetId,
    teamScope: params.teamScope,
    status: 'setup',
    teamIds: [...params.teamIds],
    teamSnapshots: snapshots,
    tieBreakers: params.tieBreakers.length ? params.tieBreakers : DEFAULT_TIE_BREAKERS,
    homeAdvantageBoost: Math.max(0, Math.min(10, Number(params.homeAdvantageBoost ?? 5))),
    drawOptions: {
      preventSameCountry: Boolean(params.preventSameCountry),
      lastMode: params.presetId === 'world-cup-2026' ? 'official' : sortedStages[0]?.seedingMode || 'seeded',
    },
    injuryTracker: {},
    trophy: params.trophy,
    stages: runtimeStages,
    currentStageOrder: 0,
    champion: null,
    history: [],
    logs: [
      {
        id: `log-${Date.now()}`,
        timestamp: nowIso,
        type: 'created',
        message: `Created "${params.name.trim()}" (${params.season.trim()}) with ${params.teamIds.length} teams and ${runtimeStages.length} stage${runtimeStages.length > 1 ? 's' : ''}.`,
      },
    ],
    createdBy: params.createdBy,
    createdByName: params.createdByName,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // Automatically perform opening stage draw so competition is immediately playable
  return performStageDraw(
    initial,
    0,
    teamsMap,
    params.presetId === 'world-cup-2026' ? 'official' : undefined,
    undefined,
    { preventSameCountry: Boolean(params.preventSameCountry) }
  );
}

// ============================================================================
// SIMULATION ADAPTER (USES REAL MATCH CENTRE ENGINE)
// ============================================================================

function toSimCompetitionPreset(presetId: TournamentPresetId): SimCompetitionConfig['preset'] {
  if (presetId === 'ucl-36') return 'champions-league';
  if (presetId === 'domestic-league' || presetId === 'round-robin') return 'premier-league';
  if (
    presetId === 'world-cup-2026' ||
    presetId === 'euros-24' ||
    presetId === 'continental-championship' ||
    presetId === 'international-knockout'
  ) {
    return 'international';
  }
  if (presetId === 'knockout-cup' || presetId === 'domestic-cup') return 'national-cup';
  return 'custom';
}

function getManagersForFixtureTeams(
  homeTeam: Team,
  awayTeam: Team,
  managersByTeam?: Map<string, Manager | null>
): { homeManager: Manager | null; awayManager: Manager | null } {
  return {
    homeManager: managersByTeam?.get(homeTeam.id) ?? null,
    awayManager: managersByTeam?.get(awayTeam.id) ?? null,
  };
}

function resolveFirstLegGoalsForLeg2(
  stage: CompetitionStageRuntime,
  leg2: CompetitionFixtureMatch
): { firstLegHomeGoals?: number; firstLegAwayGoals?: number } {
  if (!leg2.isTwoLegged || leg2.legNumber !== 2 || !leg2.tieId) return {};
  const leg1 = stage.fixtures.find(
    (f) => f.tieId === leg2.tieId && f.legNumber === 1
  );
  if (!leg1 || leg1.status !== 'completed') return {};
  // In matchSimulator:
  // firstLegHomeGoals = goals scored in leg 1 by Leg 2's HOME team (away in leg 1)
  // firstLegAwayGoals = goals scored in leg 1 by Leg 2's AWAY team (home in leg 1)
  return {
    firstLegHomeGoals: leg1.awayScore ?? 0,
    firstLegAwayGoals: leg1.homeScore ?? 0,
  };
}

function determineFixtureWinnerTeamId(
  fixture: CompetitionFixtureMatch,
  stage: CompetitionStageRuntime,
  output: CompleteSimulationOutput
): string | null {
  if (!fixture.homeTeamId || !fixture.awayTeamId) return null;
  if (!fixture.isKnockout) {
    if (output.homeScore > output.awayScore) return fixture.homeTeamId;
    if (output.awayScore > output.homeScore) return fixture.awayTeamId;
    return null;
  }
  if (!fixture.isTwoLegged) {
    if (output.winner === 'home') return fixture.homeTeamId;
    if (output.winner === 'away') return fixture.awayTeamId;
    return fixture.homeTeamId; // fallback if penalties disabled & drawn
  }
  if (fixture.legNumber === 1) {
    return null; // Tie not resolved until Leg 2
  }
  // Leg 2 decides the two-legged tie!
  if (output.winner === 'home') return fixture.homeTeamId;
  if (output.winner === 'away') return fixture.awayTeamId;

  // Fallback check if penalties disabled on tie
  const firstLeg = resolveFirstLegGoalsForLeg2(stage, fixture);
  const aggHome = (firstLeg.firstLegHomeGoals ?? 0) + output.homeScore;
  const aggAway = (firstLeg.firstLegAwayGoals ?? 0) + output.awayScore;
  if (aggHome > aggAway) return fixture.homeTeamId;
  if (aggAway > aggHome) return fixture.awayTeamId;
  return fixture.homeTeamId;
}

export function rebuildMatchFullOutput(
  tournament: CompetitionMakerTournament,
  fixture: CompetitionFixtureMatch,
  teamsMap: Map<string, Team>,
  managersByTeam?: Map<string, Manager | null>
): CompleteSimulationOutput | null {
  if (!fixture.homeTeamId || !fixture.awayTeamId) return null;
  const homeTeam = resolveTournamentTeam(tournament, fixture.homeTeamId, teamsMap, false);
  const awayTeam = resolveTournamentTeam(tournament, fixture.awayTeamId, teamsMap, false);
  if (!homeTeam || !awayTeam) return null;

  const stage = tournament.stages.find((s) => s.config.order === fixture.stageOrder);
  const stageCfg = stage?.config;
  const { homeManager, awayManager } = getManagersForFixtureTeams(
    homeTeam,
    awayTeam,
    managersByTeam
  );
  const leg1Goals = stage ? resolveFirstLegGoalsForLeg2(stage, fixture) : {};

  const simComp: SimCompetitionConfig = {
    preset: toSimCompetitionPreset(tournament.presetId),
    competitionId: tournament.id,
    competitionName: tournament.name,
    fixtureId: fixture.id,
    stageLabel: `${fixture.stageName} · ${fixture.roundLabel}`,
    isKnockout: fixture.isKnockout,
    allowExtraTime: fixture.isKnockout ? Boolean(stageCfg?.extraTimeEnabled ?? true) : false,
    allowPenalties: fixture.isKnockout ? Boolean(stageCfg?.penaltiesEnabled ?? true) : false,
    isTwoLegged: fixture.isTwoLegged,
    legNumber: fixture.legNumber,
    firstLegHomeGoals: leg1Goals.firstLegHomeGoals,
    firstLegAwayGoals: leg1Goals.firstLegAwayGoals,
    awayGoalsRule: Boolean(stageCfg?.awayGoalsRule),
    neutralVenue: fixture.neutralVenue,
    homeAdvantageBoost: tournament.homeAdvantageBoost,
  };

  return simulateMatch({
    seed: fixture.seed || `CM-${tournament.id}-${fixture.id}`,
    competition: simComp,
    homeTeam,
    awayTeam,
    homeManager,
    awayManager,
    initialHomeSetup: buildInitialTeamSetup(homeTeam, homeManager),
    initialAwaySetup: buildInitialTeamSetup(awayTeam, awayManager),
    tacticalOverrides: [],
  });
}

function extractCompactFixtureData(
  tournament: CompetitionMakerTournament,
  stage: CompetitionStageRuntime,
  fixture: CompetitionFixtureMatch,
  output: CompleteSimulationOutput,
  seed: string
): CompetitionFixtureMatch {
  const importantTypes = new Set([
    'goal',
    'own-goal',
    'yellow',
    'red',
    'second-yellow',
    'sub',
    'injury',
    'penalty-missed',
    'penalties-start',
  ]);

  const timelineEvents: CompetitionCompactEvent[] = output.events
    .filter((ev) => importantTypes.has(ev.type))
    .map((ev) => ({
      id: ev.id,
      minute: ev.minute,
      addedMinute: ev.addedMinute,
      type: ev.type,
      teamSide: ev.teamSide,
      playerId: ev.playerId,
      playerName: ev.playerName,
      assistPlayerId: ev.assistPlayerId,
      assistPlayerName: ev.assistPlayerName,
      secondaryPlayerId: ev.secondaryPlayerId,
      secondaryPlayerName: ev.secondaryPlayerName,
      headline: ev.headline,
      isPenalty: ev.isPenalty,
    }));

  const injuredPlayerIds = new Set(
    output.events
      .filter((ev) => ev.type === 'injury' && ev.playerId)
      .map((ev) => ev.playerId!)
  );

  const playerPerformances: CompetitionPlayerFixtureStat[] = output.playerStats.map((ps) => {
    const isHome = ps.teamSide === 'home';
    const cleanSheet =
      (ps.roleSlot === 'GK' || ps.positionDetail === 'GK') &&
      ps.minutesPlayed >= 45 &&
      (isHome ? output.awayScore === 0 : output.homeScore === 0);

    return {
      playerId: ps.playerId,
      playerName: ps.playerName,
      shortName: ps.shortName,
      teamId: isHome ? output.homeTeamId : output.awayTeamId,
      teamCode: isHome ? output.homeCode : output.awayCode,
      positionDetail: ps.positionDetail,
      started: ps.started,
      minutesPlayed: ps.minutesPlayed,
      goals: ps.goals,
      assists: ps.assists,
      yellowCards: ps.yellowCards,
      redCards: ps.redCards,
      saves: ps.saves,
      injured: injuredPlayerIds.has(ps.playerId) || undefined,
      cleanSheet: cleanSheet || undefined,
      rating: ps.rating,
      isMotm: output.motmPlayerId === ps.playerId || undefined,
    };
  });

  const winnerTeamId = determineFixtureWinnerTeamId(fixture, stage, output);
  const penSummary = output.penaltyShootout
    ? `${output.penaltyShootout.homeScore}-${output.penaltyShootout.awayScore} P`
    : '';

  return {
    ...fixture,
    status: 'completed',
    seed,
    homeScore: output.homeScore,
    awayScore: output.awayScore,
    halfTimeHomeScore: output.halfTimeHomeScore,
    halfTimeAwayScore: output.halfTimeAwayScore,
    wentToExtraTime: output.wentToExtraTime,
    extraTimeHomeScore: output.extraTimeHomeScore,
    extraTimeAwayScore: output.extraTimeAwayScore,
    penaltyShootout: output.penaltyShootout
      ? {
          homeScore: output.penaltyShootout.homeScore,
          awayScore: output.penaltyShootout.awayScore,
          winner: output.penaltyShootout.winner,
          summary: penSummary,
          kicks: output.penaltyShootout.kicks,
        }
      : null,
    winnerTeamId,
    possessionHome: output.homeStats.possession,
    possessionAway: output.awayStats.possession,
    shotsHome: output.homeStats.shots,
    shotsAway: output.awayStats.shots,
    shotsOnTargetHome: output.homeStats.shotsOnTarget,
    shotsOnTargetAway: output.awayStats.shotsOnTarget,
    cornersHome: output.homeStats.corners,
    cornersAway: output.homeStats.corners,
    foulsHome: output.homeStats.fouls,
    foulsAway: output.homeStats.fouls,
    xgHome: output.homeStats.xg,
    xgAway: output.awayStats.xg,
    timelineEvents,
    playerPerformances,
    settledAt: new Date().toISOString(),
  };
}

function advanceInjuriesForCompletedFixture(
  tournament: CompetitionMakerTournament,
  settled: CompetitionFixtureMatch
): {
  injuryTracker: Record<string, TournamentInjuryEntry>;
  logsAdded: CompetitionMakerTournament['logs'];
} {
  const prevTracker: Record<string, TournamentInjuryEntry> = {
    ...(tournament.injuryTracker || {}),
  };
  const logsAdded: CompetitionMakerTournament['logs'] = [];
  const nowIso = new Date().toISOString();
  const teamSet = new Set([settled.homeTeamId, settled.awayTeamId].filter(Boolean) as string[]);

  // 1. Recover 1 matchday for existing injured players whose teams just played
  for (const [pid, entry] of Object.entries(prevTracker)) {
    if (!teamSet.has(entry.teamId)) continue;
    const nextRem = entry.matchesRemaining - 1;
    if (nextRem <= 0) {
      delete prevTracker[pid];
      logsAdded.push({
        id: `log-rec-${Date.now()}-${pid.slice(0, 6)}`,
        timestamp: nowIso,
        type: 'injury',
        message: `${entry.playerName} recovered and returned to matchday availability.`,
      });
    } else {
      prevTracker[pid] = { ...entry, matchesRemaining: nextRem };
    }
  }

  // 2. Register any new injuries incurred during this fixture
  const injuryEvents = (settled.timelineEvents || []).filter(
    (ev) => ev.type === 'injury' && ev.playerId
  );
  for (const ev of injuryEvents) {
    const pid = ev.playerId!;
    const perf = settled.playerPerformances?.find((p) => p.playerId === pid);
    const teamId =
      perf?.teamId ||
      (ev.teamSide === 'home' ? settled.homeTeamId : settled.awayTeamId) ||
      '';
    if (!teamId) continue;
    const outMatches = 1 + (hashSeedSimple(`${settled.id}-${pid}`) % 2); // 1–2 matchdays
    const pName = ev.playerName || perf?.shortName || perf?.playerName || 'Player';
    prevTracker[pid] = {
      playerId: pid,
      playerName: pName,
      teamId,
      positionDetail: perf?.positionDetail,
      matchesRemaining: outMatches,
      totalMatchesOut: outMatches,
      reason: ev.headline || 'Match knock',
      recordedAt: nowIso,
      fixtureId: settled.id,
    };
    logsAdded.push({
      id: `log-inj-${Date.now()}-${pid.slice(0, 6)}`,
      timestamp: nowIso,
      type: 'injury',
      message: `${pName} suffered an injury (${outMatches} matchday recovery window).`,
    });
  }

  return { injuryTracker: prevTracker, logsAdded };
}

function hashSeedSimple(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// ============================================================================
// KNOCKOUT BRACKET ADVANCEMENT & STAGE PROGRESSION
// ============================================================================

function advanceKnockoutRoundSlots(
  stage: CompetitionStageRuntime,
  teamsMap: Map<string, Team>
): CompetitionStageRuntime {
  if (stage.config.type !== 'knockout') return stage;
  const fixtures = stage.fixtures.map((f) => ({ ...f }));
  const roundIndices = Array.from(new Set(fixtures.map((f) => f.roundIndex))).sort(
    (a, b) => a - b
  );

  for (let i = 0; i < roundIndices.length - 1; i++) {
    const curRound = roundIndices[i];
    const nextRound = roundIndices[i + 1];
    const curFixtures = fixtures.filter((f) => f.roundIndex === curRound && !f.isThirdPlace);
    const nextRegular = fixtures.filter((f) => f.roundIndex === nextRound && !f.isThirdPlace);
    const nextThirdPlace = fixtures.filter((f) => f.roundIndex === nextRound && f.isThirdPlace);

    // Group current round by tieId in bracketSlot order
    const tiesMap = new Map<
      string,
      { slot: number; winnerId: string | null; loserId: string | null; settled: boolean }
    >();
    for (const f of curFixtures) {
      const tid = f.tieId || f.id;
      const existing = tiesMap.get(tid) || {
        slot: f.bracketSlot || 1,
        winnerId: null,
        loserId: null,
        settled: false,
      };
      if (f.isTwoLegged) {
        const leg2 = curFixtures.find((x) => x.tieId === tid && x.legNumber === 2);
        if (leg2?.status === 'completed' && leg2.winnerTeamId && leg2.homeTeamId && leg2.awayTeamId) {
          existing.winnerId = leg2.winnerTeamId;
          existing.loserId =
            leg2.winnerTeamId === leg2.homeTeamId ? leg2.awayTeamId : leg2.homeTeamId;
          existing.settled = true;
        }
      } else if (f.status === 'completed' && f.winnerTeamId && f.homeTeamId && f.awayTeamId) {
        existing.winnerId = f.winnerTeamId;
        existing.loserId = f.winnerTeamId === f.homeTeamId ? f.awayTeamId : f.homeTeamId;
        existing.settled = true;
      }
      tiesMap.set(tid, existing);
    }

    const sortedTies = Array.from(tiesMap.values()).sort((a, b) => a.slot - b.slot);

    // Update 3rd-place play-off slots if this was Semi-Final
    if (nextThirdPlace.length > 0 && sortedTies.length === 2) {
      const sf1 = sortedTies[0];
      const sf2 = sortedTies[1];
      for (const tp of nextThirdPlace) {
        if (tp.status === 'completed') continue;
        tp.homeTeamId = sf1.settled ? sf1.loserId : null;
        tp.awayTeamId = sf2.settled ? sf2.loserId : null;
        tp.status = tp.homeTeamId && tp.awayTeamId ? 'scheduled' : 'pending';
      }
    }

    // Standard pairing: ties 2k & 2k+1 feed next round bracketSlot k+1
    const nextTieIds = Array.from(new Set(nextRegular.map((f) => f.tieId || f.id)));
    if (sortedTies.length === nextTieIds.length * 2) {
      for (let k = 0; k < nextTieIds.length; k++) {
        const tieId = nextTieIds[k];
        const srcA = sortedTies[k * 2];
        const srcB = sortedTies[k * 2 + 1];
        const tieMatches = nextRegular.filter((f) => (f.tieId || f.id) === tieId);
        for (const m of tieMatches) {
          if (m.status === 'completed') continue;
          if (m.isTwoLegged && m.legNumber === 2) {
            m.homeTeamId = srcB?.settled ? srcB.winnerId : null;
            m.awayTeamId = srcA?.settled ? srcA.winnerId : null;
          } else {
            m.homeTeamId = srcA?.settled ? srcA.winnerId : null;
            m.awayTeamId = srcB?.settled ? srcB.winnerId : null;
          }
          m.status = m.homeTeamId && m.awayTeamId ? 'scheduled' : 'pending';
        }
      }
    } else if (sortedTies.length < nextTieIds.length * 2) {
      // Preliminary play-in -> Main Bracket (some slots already filled with direct bye teams)
      let cursor = 0;
      const orderedNext = [...nextRegular].sort(
        (a, b) => (a.bracketSlot || 0) - (b.bracketSlot || 0) || a.legNumber - b.legNumber
      );
      const seenSlots = new Set<string>();
      for (const m of orderedNext) {
        const key = m.tieId || m.id;
        if (seenSlots.has(key)) continue;
        seenSlots.add(key);
        const leg1 = orderedNext.find((x) => (x.tieId || x.id) === key && x.legNumber === 1) || m;
        const leg2 = orderedNext.find((x) => (x.tieId || x.id) === key && x.legNumber === 2);

        if (leg1.homePlaceholder && !leg1.homeTeamId && cursor < sortedTies.length) {
          const src = sortedTies[cursor++];
          if (src.settled && src.winnerId) {
            leg1.homeTeamId = src.winnerId;
            if (leg2) leg2.awayTeamId = src.winnerId;
          }
        }
        if (leg1.awayPlaceholder && !leg1.awayTeamId && cursor < sortedTies.length) {
          const src = sortedTies[cursor++];
          if (src.settled && src.winnerId) {
            leg1.awayTeamId = src.winnerId;
            if (leg2) leg2.homeTeamId = src.winnerId;
          }
        }
        if (leg1.status !== 'completed') {
          leg1.status = leg1.homeTeamId && leg1.awayTeamId ? 'scheduled' : 'pending';
        }
        if (leg2 && leg2.status !== 'completed') {
          leg2.status = leg2.homeTeamId && leg2.awayTeamId ? 'scheduled' : 'pending';
        }
      }
    }
  }

  // Check if all matches in this knockout stage are completed
  const allCompleted = fixtures.length > 0 && fixtures.every((f) => f.status === 'completed');
  if (!allCompleted) {
    return { ...stage, fixtures };
  }

  // Determine stage qualifiers & eliminated
  const maxRound = Math.max(...roundIndices);
  const finalRoundFixtures = fixtures.filter((f) => f.roundIndex === maxRound && !f.isThirdPlace);
  const winnerSet = new Set<string>();
  for (const f of finalRoundFixtures) {
    if (f.isTwoLegged && f.legNumber !== 2) continue;
    if (f.winnerTeamId) winnerSet.add(f.winnerTeamId);
  }
  const qualifiedIds = Array.from(winnerSet);
  const eliminatedIds = stage.participantIds.filter((id) => !winnerSet.has(id));

  void teamsMap;
  return {
    ...stage,
    status: 'completed',
    fixtures,
    qualifiedIds,
    eliminatedIds,
  };
}

function finalizeStageAndAdvanceNext(
  tournament: CompetitionMakerTournament,
  stageOrder: number,
  teamsMap: Map<string, Team>
): CompetitionMakerTournament {
  const stageIdx = tournament.stages.findIndex((s) => s.config.order === stageOrder);
  if (stageIdx < 0) return tournament;

  let nextStages = [...tournament.stages];
  let stage = recomputeStageStandings(nextStages[stageIdx], tournament.tieBreakers, teamsMap);
  if (stage.config.type === 'knockout') {
    stage = advanceKnockoutRoundSlots(stage, teamsMap);
  }

  const allCompleted =
    stage.fixtures.length > 0 && stage.fixtures.every((f) => f.status === 'completed');

  if (!allCompleted) {
    nextStages[stageIdx] = stage;
    return { ...tournament, stages: nextStages };
  }

  // Compute stage qualifiers when League or Group Stage completes
  if (stage.config.type === 'league') {
    const rows = stage.standings || [];
    const hasNextStage = stageIdx + 1 < nextStages.length;
    const minNeededForNext = hasNextStage
      ? Math.max(2, nextStages[stageIdx + 1].config.inputTeamCount || 2)
      : 1;
    const effectiveAdvanceCount = hasNextStage
      ? Math.min(rows.length, Math.max(minNeededForNext, stage.config.advanceCount))
      : Math.min(rows.length, Math.max(1, stage.config.advanceCount));
    const byeTop = stage.config.byeTopCount ?? 0;
    const directNext = Math.max(hasNextStage ? 2 : 1, effectiveAdvanceCount - byeTop);
    const allQual = rows.slice(0, effectiveAdvanceCount).map((r) => r.teamId);
    const directBye = byeTop > 0 ? allQual.slice(0, byeTop) : [];
    const nextStageEntrants = byeTop > 0 ? allQual.slice(byeTop, byeTop + directNext) : allQual;
    const elim = rows.slice(effectiveAdvanceCount).map((r) => r.teamId);

    stage = {
      ...stage,
      status: 'completed',
      qualifiedIds: allQual,
      playoffIds: byeTop > 0 ? nextStageEntrants : [],
      eliminatedIds: elim,
    };
    nextStages[stageIdx] = stage;
    stage = recomputeStageStandings(stage, tournament.tieBreakers, teamsMap);
    nextStages[stageIdx] = stage;

    if (byeTop > 0 && typeof stage.config.byeTargetStageOrder === 'number') {
      const targetIdx = nextStages.findIndex(
        (s) => s.config.order === stage.config.byeTargetStageOrder
      );
      if (targetIdx >= 0) {
        nextStages[targetIdx] = {
          ...nextStages[targetIdx],
          directByeIds: directBye,
        };
      }
    }

    if (stageIdx + 1 < nextStages.length) {
      const nextStg = nextStages[stageIdx + 1];
      const mergedParticipants = Array.from(
        new Set([...(nextStg.directByeIds || []), ...nextStageEntrants])
      );
      nextStages[stageIdx + 1] = {
        ...nextStg,
        status: 'drawn',
        participantIds: mergedParticipants,
      };
    }
  } else if (stage.config.type === 'group') {
    const qpg = stage.config.qualifyPerGroup ?? 2;
    const best3Count = stage.config.bestThirdPlacedCount ?? 0;
    const groups = stage.groups || [];
    const standings = stage.standings || [];

    const winners: string[] = [];
    const runnersUp: string[] = [];
    const otherDirect: string[] = [];

    for (const grp of groups) {
      const grpRows = standings
        .filter((r) => r.groupId === grp.id)
        .sort((a, b) => a.position - b.position);
      if (grpRows[0]) winners.push(grpRows[0].teamId);
      if (qpg >= 2 && grpRows[1]) runnersUp.push(grpRows[1].teamId);
      for (let k = 2; k < qpg; k++) {
        if (grpRows[k]) otherDirect.push(grpRows[k].teamId);
      }
    }

    const bestThirds =
      best3Count > 0 && stage.thirdPlaceTable
        ? stage.thirdPlaceTable.slice(0, best3Count).map((r) => r.teamId)
        : [];

    const qualified = [...winners, ...runnersUp, ...otherDirect, ...bestThirds];
    const qualSet = new Set(qualified);
    const eliminated = stage.participantIds.filter((id) => !qualSet.has(id));

    stage = {
      ...stage,
      status: 'completed',
      qualifiedIds: qualified,
      eliminatedIds: eliminated,
    };
    stage = recomputeStageStandings(stage, tournament.tieBreakers, teamsMap);
    nextStages[stageIdx] = stage;

    if (stageIdx + 1 < nextStages.length) {
      const nextStg = nextStages[stageIdx + 1];
      const mergedParticipants = Array.from(
        new Set([...(nextStg.directByeIds || []), ...qualified])
      );
      nextStages[stageIdx + 1] = {
        ...nextStg,
        status: 'drawn',
        participantIds: mergedParticipants,
      };
    }
  } else {
    nextStages[stageIdx] = stage;
    if (stageIdx + 1 < nextStages.length) {
      const nextStg = nextStages[stageIdx + 1];
      const mergedParticipants = Array.from(
        new Set([...(nextStg.directByeIds || []), ...stage.qualifiedIds])
      );
      nextStages[stageIdx + 1] = {
        ...nextStg,
        status: 'drawn',
        participantIds: mergedParticipants,
      };
    }
  }

  let nextTournament: CompetitionMakerTournament = {
    ...tournament,
    stages: nextStages,
    currentStageOrder:
      stageIdx + 1 < nextStages.length
        ? nextStages[stageIdx + 1].config.order
        : tournament.currentStageOrder,
  };

  if (stageIdx + 1 < nextTournament.stages.length) {
    const upcoming = nextTournament.stages[stageIdx + 1];
    if (upcoming.participantIds.length >= 2 && upcoming.fixtures.length === 0) {
      nextTournament = performStageDraw(nextTournament, upcoming.config.order, teamsMap);
    }
    return nextTournament;
  }

  // Final Stage completed -> Crown Champion & Record Edition History!
  const finalStage = nextTournament.stages[nextTournament.stages.length - 1];
  let championId: string | null = null;
  let runnerUpId: string | undefined;
  let thirdPlaceId: string | undefined;
  let finalScore = '-';

  if (finalStage.config.type === 'knockout') {
    const finalMatch = [...finalStage.fixtures]
      .filter((f) => !f.isThirdPlace)
      .sort((a, b) => b.roundIndex - a.roundIndex || b.legNumber - a.legNumber)[0];
    if (finalMatch && finalMatch.winnerTeamId) {
      championId = finalMatch.winnerTeamId;
      runnerUpId =
        championId === finalMatch.homeTeamId
          ? finalMatch.awayTeamId ?? undefined
          : finalMatch.homeTeamId ?? undefined;
      const champGoals =
        championId === finalMatch.homeTeamId ? finalMatch.homeScore ?? 0 : finalMatch.awayScore ?? 0;
      const runnerGoals =
        championId === finalMatch.homeTeamId ? finalMatch.awayScore ?? 0 : finalMatch.homeScore ?? 0;
      finalScore = `${champGoals}-${runnerGoals}${
        finalMatch.penaltyShootout ? ` (${finalMatch.penaltyShootout.summary})` : ''
      }`;
    }
    const tpMatch = finalStage.fixtures.find((f) => f.isThirdPlace && f.status === 'completed');
    if (tpMatch?.winnerTeamId) {
      thirdPlaceId = tpMatch.winnerTeamId;
    }
  } else {
    const topThree = finalStage.standings || [];
    if (topThree[0]) {
      championId = topThree[0].teamId;
      runnerUpId = topThree[1]?.teamId;
      thirdPlaceId = topThree[2]?.teamId;
      finalScore = `${topThree[0].points} pts (GD ${topThree[0].goalDiff >= 0 ? '+' : ''}${topThree[0].goalDiff})`;
    }
  }

  if (championId) {
    const champTeam = resolveTournamentTeam(nextTournament, championId, teamsMap, false);
    const runnerTeam = runnerUpId
      ? resolveTournamentTeam(nextTournament, runnerUpId, teamsMap, false)
      : undefined;
    const thirdTeam = thirdPlaceId
      ? resolveTournamentTeam(nextTournament, thirdPlaceId, teamsMap, false)
      : undefined;
    const leaders = computeCompetitionPlayerLeaderboard(nextTournament, teamsMap);
    const topScorer = [...leaders].sort((a, b) => b.goals - a.goals || b.assists - a.assists)[0];
    const topAssister = [...leaders].sort((a, b) => b.assists - a.assists || b.goals - a.goals)[0];
    const nowIso = new Date().toISOString();

    const completedMatches = nextTournament.stages.flatMap((s) =>
      s.fixtures.filter((f) => f.status === 'completed')
    );
    const totalGoals = completedMatches.reduce(
      (sum, f) => sum + (f.homeScore ?? 0) + (f.awayScore ?? 0),
      0
    );

    const championSummary: CompetitionChampionSummary = {
      teamId: championId,
      teamName: champTeam?.name || championId,
      teamCode: champTeam?.code || championId.slice(0, 3).toUpperCase(),
      crestUrl: champTeam?.crestUrl || '',
      primaryColor: champTeam?.primaryColor,
      runnerUpTeamId: runnerTeam?.id,
      runnerUpName: runnerTeam?.name,
      runnerUpCode: runnerTeam?.code,
      runnerUpCrestUrl: runnerTeam?.crestUrl,
      thirdPlaceTeamId: thirdTeam?.id,
      thirdPlaceName: thirdTeam?.name,
      thirdPlaceCode: thirdTeam?.code,
      thirdPlaceCrestUrl: thirdTeam?.crestUrl,
      finalScore,
      awardedAt: nowIso,
      topScorerName: topScorer?.shortName || topScorer?.playerName,
      topScorerGoals: topScorer?.goals,
    };

    const editionEntry: CompetitionEditionHistoryEntry = {
      id: `hist-${nextTournament.id}-${nextTournament.season.replace(/[^a-zA-Z0-9]/g, '')}`,
      competitionId: nextTournament.id,
      competitionName: nextTournament.name,
      season: nextTournament.season,
      presetId: nextTournament.presetId,
      championTeamId: championId,
      championName: championSummary.teamName,
      championCode: championSummary.teamCode,
      championCrestUrl: championSummary.crestUrl,
      runnerUpTeamId: runnerTeam?.id,
      runnerUpName: runnerTeam?.name,
      runnerUpCode: runnerTeam?.code,
      thirdPlaceTeamId: thirdTeam?.id,
      thirdPlaceName: thirdTeam?.name,
      thirdPlaceCode: thirdTeam?.code,
      finalScore,
      topScorerName: topScorer?.shortName || topScorer?.playerName,
      topScorerGoals: topScorer?.goals,
      topAssisterName: topAssister?.shortName || topAssister?.playerName,
      topAssisterAssists: topAssister?.assists,
      totalMatches: completedMatches.length,
      totalGoals,
      awardedAt: nowIso,
      trophy: nextTournament.trophy,
    };

    const existingHist = nextTournament.history.filter((h) => h.id !== editionEntry.id);

    nextTournament = {
      ...nextTournament,
      status: 'completed',
      champion: championSummary,
      history: [editionEntry, ...existingHist],
      logs: [
        {
          id: `log-champ-${Date.now()}`,
          timestamp: nowIso,
          type: 'trophy' as const,
          message: `${championSummary.teamName} crowned champions of ${nextTournament.name} (${nextTournament.season}) and awarded ${nextTournament.trophy.name}!`,
        },
        ...nextTournament.logs,
      ].slice(0, 120),
      updatedAt: nowIso,
    };
  }

  return nextTournament;
}

export function simulateCompetitionFixture(
  tournament: CompetitionMakerTournament,
  fixtureId: string,
  teamsMap: Map<string, Team>,
  managersByTeam?: Map<string, Manager | null>,
  customSeed?: string
): CompetitionMakerTournament {
  let targetStageIdx = -1;
  let targetFixIdx = -1;

  for (let s = 0; s < tournament.stages.length; s++) {
    const fIdx = tournament.stages[s].fixtures.findIndex((f) => f.id === fixtureId);
    if (fIdx >= 0) {
      targetStageIdx = s;
      targetFixIdx = fIdx;
      break;
    }
  }

  if (targetStageIdx < 0 || targetFixIdx < 0) return tournament;
  let working = tournament;
  let stage = working.stages[targetStageIdx];
  let fixture = stage.fixtures[targetFixIdx];
  if (isStageLocked(working, stage.config.order)) return tournament;
  if (fixture.status === 'completed') return tournament;
  if (!fixture.homeTeamId || !fixture.awayTeamId) return tournament;

  // If this is Leg 2 of a 2-legged tie and Leg 1 isn't settled yet, simulate Leg 1 first!
  if (fixture.isTwoLegged && fixture.legNumber === 2 && fixture.tieId) {
    const leg1 = stage.fixtures.find(
      (f) => f.tieId === fixture.tieId && f.legNumber === 1 && f.status !== 'completed'
    );
    if (leg1) {
      working = simulateCompetitionFixture(working, leg1.id, teamsMap, managersByTeam);
      stage = working.stages[targetStageIdx];
      fixture = stage.fixtures[targetFixIdx];
    }
  }

  const homeId = fixture.homeTeamId;
  const awayId = fixture.awayTeamId;
  if (!homeId || !awayId) return working;
  const homeTeam = resolveTournamentTeam(working, homeId, teamsMap, true);
  const awayTeam = resolveTournamentTeam(working, awayId, teamsMap, true);
  if (!homeTeam || !awayTeam) return working;

  const { homeManager, awayManager } = getManagersForFixtureTeams(
    homeTeam,
    awayTeam,
    managersByTeam
  );
  const leg1Goals = resolveFirstLegGoalsForLeg2(stage, fixture);
  const seed =
    customSeed ||
    fixture.seed ||
    `CM-${working.id}-${fixture.id}-${Math.floor(Math.random() * 900000 + 100000)}`;

  const simComp: SimCompetitionConfig = {
    preset: toSimCompetitionPreset(working.presetId),
    competitionId: working.id,
    competitionName: working.name,
    fixtureId: fixture.id,
    stageLabel: `${fixture.stageName} · ${fixture.roundLabel}`,
    isKnockout: fixture.isKnockout,
    allowExtraTime: fixture.isKnockout ? Boolean(stage.config.extraTimeEnabled ?? true) : false,
    allowPenalties: fixture.isKnockout ? Boolean(stage.config.penaltiesEnabled ?? true) : false,
    isTwoLegged: fixture.isTwoLegged,
    legNumber: fixture.legNumber,
    firstLegHomeGoals: leg1Goals.firstLegHomeGoals,
    firstLegAwayGoals: leg1Goals.firstLegAwayGoals,
    awayGoalsRule: Boolean(stage.config.awayGoalsRule),
    neutralVenue: fixture.neutralVenue,
    homeAdvantageBoost: working.homeAdvantageBoost,
  };

  const output = simulateMatch({
    seed,
    competition: simComp,
    homeTeam,
    awayTeam,
    homeManager,
    awayManager,
    initialHomeSetup: buildInitialTeamSetup(homeTeam, homeManager),
    initialAwaySetup: buildInitialTeamSetup(awayTeam, awayManager),
    tacticalOverrides: [],
  });

  const settledFixture = extractCompactFixtureData(working, stage, fixture, output, seed);
  const { injuryTracker, logsAdded } = advanceInjuriesForCompletedFixture(working, settledFixture);

  const nextFixtures = stage.fixtures.map((f, idx) =>
    idx === targetFixIdx ? settledFixture : f
  );

  const nextStages = working.stages.map((s, idx) =>
    idx === targetStageIdx ? { ...s, fixtures: nextFixtures } : s
  );

  const updated: CompetitionMakerTournament = {
    ...working,
    status: working.status === 'setup' ? 'in-progress' : working.status,
    injuryTracker,
    stages: nextStages,
    logs: [...logsAdded, ...working.logs].slice(0, 120),
    updatedAt: new Date().toISOString(),
  };

  return finalizeStageAndAdvanceNext(updated, stage.config.order, teamsMap);
}

export function importSimulationIntoFixture(
  tournament: CompetitionMakerTournament,
  fixtureId: string,
  simRecord: SimulationMatchRecord,
  teamsMap: Map<string, Team>
): { ok: boolean; error?: string; tournament: CompetitionMakerTournament } {
  let targetStageIdx = -1;
  let targetFixIdx = -1;
  for (let s = 0; s < tournament.stages.length; s++) {
    const fIdx = tournament.stages[s].fixtures.findIndex((f) => f.id === fixtureId);
    if (fIdx >= 0) {
      targetStageIdx = s;
      targetFixIdx = fIdx;
      break;
    }
  }
  if (targetStageIdx < 0 || targetFixIdx < 0) {
    return { ok: false, error: 'Target fixture not found.', tournament };
  }
  const stage = tournament.stages[targetStageIdx];
  const fixture = stage.fixtures[targetFixIdx];
  if (isStageLocked(tournament, stage.config.order)) {
    return {
      ok: false,
      error: 'This stage is locked until the previous stage is fully completed.',
      tournament,
    };
  }
  if (fixture.status === 'completed') {
    return { ok: false, error: 'Fixture already settled. Reset it first to replace.', tournament };
  }
  if (!fixture.homeTeamId || !fixture.awayTeamId) {
    return { ok: false, error: 'Fixture teams are not yet decided.', tournament };
  }

  const sameOrder =
    simRecord.homeTeamId === fixture.homeTeamId && simRecord.awayTeamId === fixture.awayTeamId;
  const swappedOrder =
    simRecord.homeTeamId === fixture.awayTeamId && simRecord.awayTeamId === fixture.homeTeamId;

  if (!sameOrder && !swappedOrder) {
    return {
      ok: false,
      error: 'Selected Match Centre report does not match the two teams in this fixture.',
      tournament,
    };
  }

  const fullOut = simRecord.fullPayload as CompleteSimulationOutput | undefined;
  let settledFixture: CompetitionFixtureMatch;

  if (fullOut && fullOut.homeTeamId && Array.isArray(fullOut.playerStats) && sameOrder) {
    settledFixture = {
      ...extractCompactFixtureData(tournament, stage, fixture, fullOut, simRecord.seed || fullOut.seed),
      importedMatchId: simRecord.id,
    };
  } else {
    const homeScore = sameOrder ? simRecord.homeScore : simRecord.awayScore;
    const awayScore = sameOrder ? simRecord.awayScore : simRecord.homeScore;
    const htHome = sameOrder ? simRecord.halfTimeHomeScore : simRecord.halfTimeAwayScore;
    const htAway = sameOrder ? simRecord.halfTimeAwayScore : simRecord.halfTimeHomeScore;

    let winnerTeamId: string | null = null;
    if (homeScore > awayScore) winnerTeamId = fixture.homeTeamId;
    else if (awayScore > homeScore) winnerTeamId = fixture.awayTeamId;
    else if (fixture.isKnockout) {
      winnerTeamId = fixture.homeTeamId;
    }

    const timelineEvents: CompetitionCompactEvent[] = (simRecord.events || []).map((ev, idx) => ({
      id: `imp-${simRecord.id}-${idx}`,
      minute: ev.minute,
      type: ev.type,
      teamSide: sameOrder ? ev.teamSide : ev.teamSide === 'home' ? 'away' : 'home',
      playerId: ev.playerId,
      playerName: ev.playerName,
      assistPlayerId: ev.assistPlayerId,
      assistPlayerName: ev.assistPlayerName,
      headline: `${ev.type.toUpperCase()} — ${ev.playerName}`,
    }));

    settledFixture = {
      ...fixture,
      status: 'completed',
      seed: simRecord.seed,
      importedMatchId: simRecord.id,
      homeScore,
      awayScore,
      halfTimeHomeScore: htHome ?? 0,
      halfTimeAwayScore: htAway ?? 0,
      wentToExtraTime: Boolean(simRecord.wentToExtraTime),
      winnerTeamId,
      possessionHome: sameOrder ? simRecord.possessionHome : 100 - simRecord.possessionHome,
      possessionAway: sameOrder ? 100 - simRecord.possessionHome : simRecord.possessionHome,
      shotsHome: sameOrder ? simRecord.shotsHome : simRecord.shotsAway,
      shotsAway: sameOrder ? simRecord.shotsAway : simRecord.shotsHome,
      xgHome: sameOrder ? simRecord.xgHome : simRecord.xgAway,
      xgAway: sameOrder ? simRecord.xgAway : simRecord.xgHome,
      timelineEvents,
      playerPerformances: [],
      settledAt: new Date().toISOString(),
    };
  }

  const { injuryTracker, logsAdded } = advanceInjuriesForCompletedFixture(tournament, settledFixture);
  const nextFixtures = stage.fixtures.map((f, idx) => (idx === targetFixIdx ? settledFixture : f));
  const nextStages = tournament.stages.map((s, idx) =>
    idx === targetStageIdx ? { ...s, fixtures: nextFixtures } : s
  );

  const nowIso = new Date().toISOString();
  const updated: CompetitionMakerTournament = {
    ...tournament,
    status: tournament.status === 'setup' ? 'in-progress' : tournament.status,
    injuryTracker,
    stages: nextStages,
    logs: [
      {
        id: `log-imp-${Date.now()}`,
        timestamp: nowIso,
        type: 'match' as const,
        message: `Imported simulated match (${settledFixture.homeScore}–${settledFixture.awayScore}) into ${fixture.stageName} · ${fixture.roundLabel}.`,
      },
      ...logsAdded,
      ...tournament.logs,
    ].slice(0, 120),
    updatedAt: nowIso,
  };

  return {
    ok: true,
    tournament: finalizeStageAndAdvanceNext(updated, stage.config.order, teamsMap),
  };
}

export function simulateCompetitionBatch(
  tournament: CompetitionMakerTournament,
  options: {
    scope: 'match' | 'matchday' | 'stage' | 'knockout' | 'tournament';
    stageOrder?: number;
    roundIndex?: number;
  },
  teamsMap: Map<string, Team>,
  managersByTeam?: Map<string, Manager | null>
): CompetitionMakerTournament {
  let current = tournament;

  const resolvePlayableStage = (preferredOrder?: number): CompetitionStageRuntime | undefined => {
    if (typeof preferredOrder === 'number') {
      const candidate = current.stages.find((s) => s.config.order === preferredOrder);
      if (
        candidate &&
        candidate.status !== 'completed' &&
        !isStageLocked(current, candidate.config.order)
      ) {
        return candidate;
      }
    }
    return current.stages.find(
      (s) => s.status !== 'completed' && !isStageLocked(current, s.config.order)
    );
  };

  if (options.scope === 'match') {
    let stg = resolvePlayableStage(options.stageOrder ?? current.currentStageOrder);
    if (!stg) return current;
    if (stg.fixtures.length === 0 && stg.participantIds.length >= 2) {
      current = performStageDraw(current, stg.config.order, teamsMap);
      stg = resolvePlayableStage(stg.config.order);
      if (!stg) return current;
    }
    const nextFix = stg.fixtures
      .filter((f) => f.status !== 'completed' && f.homeTeamId && f.awayTeamId)
      .sort((a, b) => a.roundIndex - b.roundIndex || a.legNumber - b.legNumber)[0];
    if (!nextFix) return current;
    return simulateCompetitionFixture(current, nextFix.id, teamsMap, managersByTeam);
  }

  if (options.scope === 'matchday') {
    let stg = resolvePlayableStage(options.stageOrder ?? current.currentStageOrder);
    if (!stg) return current;
    if (stg.fixtures.length === 0 && stg.participantIds.length >= 2) {
      current = performStageDraw(current, stg.config.order, teamsMap);
      stg = resolvePlayableStage(stg.config.order);
      if (!stg) return current;
    }
    const open = stg.fixtures.filter((f) => f.status !== 'completed' && f.homeTeamId && f.awayTeamId);
    if (open.length === 0) return current;
    const targetRound =
      options.roundIndex ?? Math.min(...open.map((f) => f.roundIndex));
    const roundMatches = open
      .filter((f) => f.roundIndex === targetRound)
      .sort((a, b) => a.legNumber - b.legNumber);

    for (const f of roundMatches) {
      current = simulateCompetitionFixture(current, f.id, teamsMap, managersByTeam);
    }
    return current;
  }

  if (options.scope === 'stage') {
    const initialStg = resolvePlayableStage(options.stageOrder ?? current.currentStageOrder);
    if (!initialStg) return current;
    const targetOrder = initialStg.config.order;
    for (let guard = 0; guard < 16; guard++) {
      let stg = current.stages.find((s) => s.config.order === targetOrder);
      if (!stg || stg.status === 'completed' || isStageLocked(current, stg.config.order)) break;
      if (stg.fixtures.length === 0 && stg.participantIds.length >= 2) {
        current = performStageDraw(current, stg.config.order, teamsMap);
        stg = current.stages.find((s) => s.config.order === targetOrder);
        if (!stg) break;
      }
      const playable = stg.fixtures
        .filter((f) => f.status !== 'completed' && f.homeTeamId && f.awayTeamId)
        .sort((a, b) => a.roundIndex - b.roundIndex || a.legNumber - b.legNumber);
      if (playable.length === 0) break;
      for (const f of playable) {
        current = simulateCompetitionFixture(current, f.id, teamsMap, managersByTeam);
      }
    }
    return current;
  }

  if (options.scope === 'knockout') {
    // If a non-knockout stage is currently active before the first knockout stage, complete it first so knockout unlocks
    const hasUnlockedKnockout = current.stages.some(
      (s) =>
        s.config.type === 'knockout' &&
        s.status !== 'completed' &&
        !isStageLocked(current, s.config.order)
    );
    if (!hasUnlockedKnockout) {
      for (let preGuard = 0; preGuard < 6 && current.status !== 'completed'; preGuard++) {
        const activePre = current.stages.find(
          (s) => s.status !== 'completed' && !isStageLocked(current, s.config.order)
        );
        if (!activePre || activePre.config.type === 'knockout') break;
        current = simulateCompetitionBatch(
          current,
          { scope: 'stage', stageOrder: activePre.config.order },
          teamsMap,
          managersByTeam
        );
      }
    }

    // Now simulate all unlocked knockout stages
    for (let guard = 0; guard < 8 && current.status !== 'completed'; guard++) {
      const koStage = current.stages.find(
        (s) =>
          s.config.type === 'knockout' &&
          s.status !== 'completed' &&
          !isStageLocked(current, s.config.order)
      );
      if (!koStage) break;
      if (koStage.fixtures.length === 0 && koStage.participantIds.length >= 2) {
        current = performStageDraw(current, koStage.config.order, teamsMap);
      }
      const playable = current.stages
        .find((s) => s.config.order === koStage.config.order)
        ?.fixtures.some((f) => f.status !== 'completed' && f.homeTeamId && f.awayTeamId);
      if (!playable) break;
      current = simulateCompetitionBatch(
        current,
        { scope: 'stage', stageOrder: koStage.config.order },
        teamsMap,
        managersByTeam
      );
    }
    return current;
  }

  // Full Tournament simulation across all stages
  for (let stageGuard = 0; stageGuard < 8 && current.status !== 'completed'; stageGuard++) {
    const activeStage =
      current.stages.find((s) => s.status !== 'completed') ||
      current.stages[current.stages.length - 1];
    if (!activeStage) break;
    if (activeStage.fixtures.length === 0 && activeStage.participantIds.length >= 2) {
      current = performStageDraw(current, activeStage.config.order, teamsMap);
    }
    const before = current;
    current = simulateCompetitionBatch(
      current,
      { scope: 'stage', stageOrder: activeStage.config.order },
      teamsMap,
      managersByTeam
    );
    if (current === before) break;
  }

  return current;
}

/**
 * Repairs legacy or interrupted tournaments missing Stage 1 fixtures, snapshots, or trophy categories
 */
export function recoverTournamentState(
  tournament: CompetitionMakerTournament,
  teamsMap: Map<string, Team>
): CompetitionMakerTournament {
  let working = { ...tournament };
  if (!working.teamSnapshots || Object.keys(working.teamSnapshots).length === 0) {
    working.teamSnapshots = buildTeamSnapshots(working.teamIds, teamsMap);
  }
  if (!working.injuryTracker) {
    working.injuryTracker = {};
  }
  if (!working.stages.some((s) => s.fixtures.length > 0) && working.teamIds.length >= 2) {
    working = performStageDraw(working, 0, teamsMap);
  }
  return working;
}

// ============================================================================
// SAFE RESET & REPLAY (INVALIDATES DOWNSTREAM STAGES WITHOUT CORRUPTION)
// ============================================================================

function clearFixtureResult(f: CompetitionFixtureMatch): CompetitionFixtureMatch {
  return {
    id: f.id,
    stageId: f.stageId,
    stageOrder: f.stageOrder,
    stageName: f.stageName,
    stageType: f.stageType,
    groupId: f.groupId,
    groupName: f.groupName,
    roundIndex: f.roundIndex,
    roundLabel: f.roundLabel,
    bracketSlot: f.bracketSlot,
    tieId: f.tieId,
    legNumber: f.legNumber,
    isTwoLegged: f.isTwoLegged,
    isKnockout: f.isKnockout,
    isFinal: f.isFinal,
    isThirdPlace: f.isThirdPlace,
    homeTeamId: f.homeTeamId,
    awayTeamId: f.awayTeamId,
    homePlaceholder: f.homePlaceholder,
    awayPlaceholder: f.awayPlaceholder,
    neutralVenue: f.neutralVenue,
    status: f.homeTeamId && f.awayTeamId ? 'scheduled' : 'pending',
  };
}

export function resetCompetitionScope(
  tournament: CompetitionMakerTournament,
  options: {
    scope: 'fixture' | 'stage' | 'tournament';
    fixtureId?: string;
    stageOrder?: number;
  },
  teamsMap: Map<string, Team>
): {
  tournament: CompetitionMakerTournament;
  revokedTrophy: { teamId: string; trophyRecordId: string; editionHistoryId?: string } | null;
} {
  const nowIso = new Date().toISOString();
  const revokedTrophy =
    tournament.awardedTrophyTeamId && tournament.awardedTrophyRecordId
      ? {
          teamId: tournament.awardedTrophyTeamId,
          trophyRecordId: tournament.awardedTrophyRecordId,
          editionHistoryId: tournament.history[0]?.id,
        }
      : null;

  if (options.scope === 'tournament') {
    const resetFirst: CompetitionMakerTournament = {
      ...tournament,
      status: 'in-progress',
      currentStageOrder: 0,
      champion: null,
      awardedTrophyTeamId: null,
      awardedTrophyRecordId: null,
      injuryTracker: {},
      stages: tournament.stages.map((s, idx) => ({
        config: s.config,
        status: idx === 0 ? 'drawn' : 'locked',
        participantIds: idx === 0 ? [...tournament.teamIds] : [],
        directByeIds: [],
        fixtures: [],
        qualifiedIds: [],
        playoffIds: [],
        eliminatedIds: [],
      })),
      logs: [
        {
          id: `log-reset-${Date.now()}`,
          timestamp: nowIso,
          type: 'reset' as const,
          message: 'Tournament reset to Stage 1 opening draw.',
        },
        ...tournament.logs,
      ].slice(0, 120),
      updatedAt: nowIso,
    };
    return {
      tournament: performStageDraw(
        resetFirst,
        0,
        teamsMap,
        tournament.presetId === 'world-cup-2026' ? 'official' : undefined,
        undefined,
        { preventSameCountry: tournament.drawOptions?.preventSameCountry }
      ),
      revokedTrophy,
    };
  }

  let targetOrder = options.stageOrder ?? 0;
  let targetRoundIndex: number | null = null;
  let targetTieId: string | undefined;

  if (options.scope === 'fixture' && options.fixtureId) {
    for (const s of tournament.stages) {
      const f = s.fixtures.find((x) => x.id === options.fixtureId);
      if (f) {
        targetOrder = s.config.order;
        targetRoundIndex = f.roundIndex;
        targetTieId = f.tieId;
        break;
      }
    }
  }

  const nextStages = tournament.stages.map((stg) => {
    // 1. Downstream stages beyond targetOrder -> completely reset to locked!
    if (stg.config.order > targetOrder) {
      return {
        config: stg.config,
        status: 'locked' as const,
        participantIds: [],
        directByeIds: [],
        fixtures: [],
        qualifiedIds: [],
        playoffIds: [],
        eliminatedIds: [],
      };
    }

    // 2. Upstream stages stay untouched
    if (stg.config.order < targetOrder) {
      return stg;
    }

    // 3. Target stage itself
    if (options.scope === 'stage') {
      const clearedFixtures = stg.fixtures.map((f) => {
        if (stg.config.type === 'knockout' && f.roundIndex > 1) {
          return {
            ...clearFixtureResult(f),
            homeTeamId: f.homePlaceholder ? null : f.homeTeamId,
            awayTeamId: f.awayPlaceholder ? null : f.awayTeamId,
            status: 'pending' as const,
          };
        }
        return clearFixtureResult(f);
      });
      return recomputeStageStandings(
        {
          ...stg,
          status: 'active',
          fixtures: clearedFixtures,
          qualifiedIds: [],
          playoffIds: [],
          eliminatedIds: [],
        },
        tournament.tieBreakers,
        teamsMap
      );
    }

    // Single fixture reset within targetOrder
    const clearedFixtures = stg.fixtures.map((f) => {
      if (f.id === options.fixtureId) {
        return clearFixtureResult(f);
      }
      // If Leg 1 of a 2-legged tie is reset, Leg 2 must also reset
      if (
        targetTieId &&
        f.tieId === targetTieId &&
        f.legNumber === 2 &&
        stg.fixtures.find((x) => x.id === options.fixtureId)?.legNumber === 1
      ) {
        return clearFixtureResult(f);
      }
      // If knockout round > targetRoundIndex, clear later bracket rounds cleanly!
      if (
        stg.config.type === 'knockout' &&
        targetRoundIndex !== null &&
        f.roundIndex > targetRoundIndex
      ) {
        return {
          ...clearFixtureResult(f),
          homeTeamId: f.homePlaceholder ? null : f.homeTeamId,
          awayTeamId: f.awayPlaceholder ? null : f.awayTeamId,
          status: 'pending' as const,
        };
      }
      return f;
    });

    let rebuilt: CompetitionStageRuntime = {
      ...stg,
      status: 'active',
      fixtures: clearedFixtures,
      qualifiedIds: [],
      playoffIds: [],
      eliminatedIds: [],
    };
    rebuilt = recomputeStageStandings(rebuilt, tournament.tieBreakers, teamsMap);
    if (rebuilt.config.type === 'knockout') {
      rebuilt = advanceKnockoutRoundSlots(rebuilt, teamsMap);
    }
    return rebuilt;
  });

  const nextTournament: CompetitionMakerTournament = {
    ...tournament,
    status: 'in-progress',
    currentStageOrder: targetOrder,
    champion: null,
    awardedTrophyTeamId: null,
    awardedTrophyRecordId: null,
    stages: nextStages,
    logs: [
      {
        id: `log-reset-${Date.now()}`,
        timestamp: nowIso,
        type: 'reset' as const,
        message:
          options.scope === 'stage'
            ? `Reset ${tournament.stages.find((s) => s.config.order === targetOrder)?.config.name || 'stage'} and cleared downstream stages.`
            : `Reset fixture for clean replay without corrupting downstream rounds.`,
      },
      ...tournament.logs,
    ].slice(0, 120),
    updatedAt: nowIso,
  };

  return { tournament: nextTournament, revokedTrophy };
}

// ============================================================================
// TOURNAMENT PLAYER STATS & LEADERBOARDS
// ============================================================================

export function computeCompetitionPlayerLeaderboard(
  tournament: CompetitionMakerTournament,
  teamsMap: Map<string, Team>
): CompetitionPlayerLeaderboardRow[] {
  const map = new Map<
    string,
    CompetitionPlayerLeaderboardRow & { ratingSum: number; ratingCount: number }
  >();

  for (const stage of tournament.stages) {
    for (const fix of stage.fixtures) {
      if (fix.status !== 'completed' || !fix.playerPerformances) continue;
      for (const perf of fix.playerPerformances) {
        const key = `${perf.teamId}::${perf.playerId}`;
        const team = teamsMap.get(perf.teamId);
        let row = map.get(key);
        if (!row) {
          row = {
            playerId: perf.playerId,
            playerName: perf.playerName,
            shortName: perf.shortName,
            teamId: perf.teamId,
            teamCode: perf.teamCode || team?.code || '',
            teamName: team?.name || perf.teamCode,
            crestUrl: team?.crestUrl,
            positionDetail: perf.positionDetail,
            appearances: 0,
            minutesPlayed: 0,
            goals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
            cleanSheets: 0,
            saves: 0,
            injuries: 0,
            avgRating: 0,
            motmCount: 0,
            ratingSum: 0,
            ratingCount: 0,
          };
          map.set(key, row);
        }
        row.appearances += 1;
        row.minutesPlayed += perf.minutesPlayed;
        row.goals += perf.goals;
        row.assists += perf.assists;
        row.yellowCards += perf.yellowCards;
        row.redCards += perf.redCards;
        row.saves += perf.saves;
        if (perf.cleanSheet) row.cleanSheets += 1;
        if (perf.injured) row.injuries += 1;
        if (perf.isMotm) row.motmCount += 1;
        row.ratingSum += perf.rating;
        row.ratingCount += 1;
        row.avgRating = Number((row.ratingSum / row.ratingCount).toFixed(2));
      }
    }
  }

  return Array.from(map.values()).map(({ ratingSum: _rs, ratingCount: _rc, ...row }) => row);
}
