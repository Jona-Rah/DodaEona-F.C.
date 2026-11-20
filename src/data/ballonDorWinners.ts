import { BallonDorWin, GenderType, PlayerIdentity } from '../types/matchCentre';
import { getCountryMetadata } from './countryMetadata';

export type BallonDorCategory = "Men's Ballon d'Or" | "Ballon d'Or Féminin";

export interface BallonDorArchiveEntry {
  id: string;
  year: number;
  category: BallonDorCategory;
  gender: GenderType;
  playerName: string;
  nationality: string;
  club: string;
  notAwarded?: boolean;
  notAwardedReason?: string;
  podium?: {
    runnerUp?: string;
    thirdPlace?: string;
  };
}

export interface BallonDorLaureateSummary {
  key: string;
  playerName: string;
  nationality: string;
  gender: GenderType;
  category: BallonDorCategory;
  totalWins: number;
  years: number[];
  clubs: string[];
}

export const BALLON_DOR_ASSETS = {
  tabLogo: '/assets/aistudio/image_b5a6bdf0.png',
  heroBanner: '/assets/aistudio/image_57169923.png',
  trophyLogo: '/assets/aistudio/image_14f826fa.png',
  officialSourceUrl: 'https://ballondor.com/winners',
} as const;

/**
 * Complete official Ballon d'Or archive sourced from https://ballondor.com/winners
 * Covers every edition from 1956 to 2026 (Men's Ballon d'Or) and 2018 to 2026 (Ballon d'Or Féminin).
 */
export const BALLON_DOR_WINNERS_ARCHIVE: BallonDorArchiveEntry[] = [
  // 2026 (70th Ceremony)
  {
    id: 'men-2026',
    year: 2026,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Harry Kane',
    nationality: 'England',
    club: 'Bayern Munich',
    podium: {
      runnerUp: 'Kylian Mbappé',
      thirdPlace: 'Lamine Yamal',
    },
  },
  {
    id: 'women-2026',
    year: 2026,
    category: "Ballon d'Or Féminin",
    gender: 'women',
    playerName: 'Alexia Putellas',
    nationality: 'Spain',
    club: 'Barcelona / London City Lionesses',
    podium: {
      runnerUp: 'Ewa Pajor',
      thirdPlace: 'Khadija Shaw',
    },
  },

  // 2025
  {
    id: 'men-2025',
    year: 2025,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Ousmane Dembélé',
    nationality: 'France',
    club: 'Paris Saint-Germain',
    podium: {
      runnerUp: 'Lamine Yamal',
    },
  },
  {
    id: 'women-2025',
    year: 2025,
    category: "Ballon d'Or Féminin",
    gender: 'women',
    playerName: 'Aitana Bonmatí',
    nationality: 'Spain',
    club: 'Barcelona',
  },

  // 2024
  {
    id: 'men-2024',
    year: 2024,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Rodri',
    nationality: 'Spain',
    club: 'Manchester City',
  },
  {
    id: 'women-2024',
    year: 2024,
    category: "Ballon d'Or Féminin",
    gender: 'women',
    playerName: 'Aitana Bonmatí',
    nationality: 'Spain',
    club: 'Barcelona',
  },

  // 2023
  {
    id: 'men-2023',
    year: 2023,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Lionel Messi',
    nationality: 'Argentina',
    club: 'Inter Miami',
  },
  {
    id: 'women-2023',
    year: 2023,
    category: "Ballon d'Or Féminin",
    gender: 'women',
    playerName: 'Aitana Bonmatí',
    nationality: 'Spain',
    club: 'Barcelona',
  },

  // 2022
  {
    id: 'men-2022',
    year: 2022,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Karim Benzema',
    nationality: 'France',
    club: 'Real Madrid',
  },
  {
    id: 'women-2022',
    year: 2022,
    category: "Ballon d'Or Féminin",
    gender: 'women',
    playerName: 'Alexia Putellas',
    nationality: 'Spain',
    club: 'Barcelona',
  },

  // 2021
  {
    id: 'men-2021',
    year: 2021,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Lionel Messi',
    nationality: 'Argentina',
    club: 'Paris Saint-Germain',
  },
  {
    id: 'women-2021',
    year: 2021,
    category: "Ballon d'Or Féminin",
    gender: 'women',
    playerName: 'Alexia Putellas',
    nationality: 'Spain',
    club: 'Barcelona',
  },

  // 2020 (Not awarded)
  {
    id: 'men-2020',
    year: 2020,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Not Awarded',
    nationality: '—',
    club: '—',
    notAwarded: true,
    notAwardedReason: 'Not awarded due to the COVID-19 pandemic',
  },
  {
    id: 'women-2020',
    year: 2020,
    category: "Ballon d'Or Féminin",
    gender: 'women',
    playerName: 'Not Awarded',
    nationality: '—',
    club: '—',
    notAwarded: true,
    notAwardedReason: 'Not awarded due to the COVID-19 pandemic',
  },

  // 2019
  {
    id: 'men-2019',
    year: 2019,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Lionel Messi',
    nationality: 'Argentina',
    club: 'Barcelona',
  },
  {
    id: 'women-2019',
    year: 2019,
    category: "Ballon d'Or Féminin",
    gender: 'women',
    playerName: 'Megan Rapinoe',
    nationality: 'United States',
    club: 'Reign FC',
  },

  // 2018
  {
    id: 'men-2018',
    year: 2018,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Luka Modrić',
    nationality: 'Croatia',
    club: 'Real Madrid',
  },
  {
    id: 'women-2018',
    year: 2018,
    category: "Ballon d'Or Féminin",
    gender: 'women',
    playerName: 'Ada Hegerberg',
    nationality: 'Norway',
    club: 'Lyon',
  },

  // 2017–1956 Men's Ballon d'Or
  {
    id: 'men-2017',
    year: 2017,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Cristiano Ronaldo',
    nationality: 'Portugal',
    club: 'Real Madrid',
  },
  {
    id: 'men-2016',
    year: 2016,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Cristiano Ronaldo',
    nationality: 'Portugal',
    club: 'Real Madrid',
  },
  {
    id: 'men-2015',
    year: 2015,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Lionel Messi',
    nationality: 'Argentina',
    club: 'Barcelona',
  },
  {
    id: 'men-2014',
    year: 2014,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Cristiano Ronaldo',
    nationality: 'Portugal',
    club: 'Real Madrid',
  },
  {
    id: 'men-2013',
    year: 2013,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Cristiano Ronaldo',
    nationality: 'Portugal',
    club: 'Real Madrid',
  },
  {
    id: 'men-2012',
    year: 2012,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Lionel Messi',
    nationality: 'Argentina',
    club: 'Barcelona',
  },
  {
    id: 'men-2011',
    year: 2011,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Lionel Messi',
    nationality: 'Argentina',
    club: 'Barcelona',
  },
  {
    id: 'men-2010',
    year: 2010,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Lionel Messi',
    nationality: 'Argentina',
    club: 'Barcelona',
  },
  {
    id: 'men-2009',
    year: 2009,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Lionel Messi',
    nationality: 'Argentina',
    club: 'Barcelona',
  },
  {
    id: 'men-2008',
    year: 2008,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Cristiano Ronaldo',
    nationality: 'Portugal',
    club: 'Manchester United',
  },
  {
    id: 'men-2007',
    year: 2007,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Kaká',
    nationality: 'Brazil',
    club: 'AC Milan',
  },
  {
    id: 'men-2006',
    year: 2006,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Fabio Cannavaro',
    nationality: 'Italy',
    club: 'Real Madrid',
  },
  {
    id: 'men-2005',
    year: 2005,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Ronaldinho',
    nationality: 'Brazil',
    club: 'Barcelona',
  },
  {
    id: 'men-2004',
    year: 2004,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Andriy Shevchenko',
    nationality: 'Ukraine',
    club: 'AC Milan',
  },
  {
    id: 'men-2003',
    year: 2003,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Pavel Nedvěd',
    nationality: 'Czech Republic',
    club: 'Juventus',
  },
  {
    id: 'men-2002',
    year: 2002,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Ronaldo',
    nationality: 'Brazil',
    club: 'Real Madrid',
  },
  {
    id: 'men-2001',
    year: 2001,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Michael Owen',
    nationality: 'England',
    club: 'Liverpool',
  },
  {
    id: 'men-2000',
    year: 2000,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Luís Figo',
    nationality: 'Portugal',
    club: 'Real Madrid',
  },
  {
    id: 'men-1999',
    year: 1999,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Rivaldo',
    nationality: 'Brazil',
    club: 'Barcelona',
  },
  {
    id: 'men-1998',
    year: 1998,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Zinedine Zidane',
    nationality: 'France',
    club: 'Juventus',
  },
  {
    id: 'men-1997',
    year: 1997,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Ronaldo',
    nationality: 'Brazil',
    club: 'Inter Milan',
  },
  {
    id: 'men-1996',
    year: 1996,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Matthias Sammer',
    nationality: 'Germany',
    club: 'Borussia Dortmund',
  },
  {
    id: 'men-1995',
    year: 1995,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'George Weah',
    nationality: 'Liberia',
    club: 'AC Milan',
  },
  {
    id: 'men-1994',
    year: 1994,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Hristo Stoichkov',
    nationality: 'Bulgaria',
    club: 'Barcelona',
  },
  {
    id: 'men-1993',
    year: 1993,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Roberto Baggio',
    nationality: 'Italy',
    club: 'Juventus',
  },
  {
    id: 'men-1992',
    year: 1992,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Marco van Basten',
    nationality: 'Netherlands',
    club: 'AC Milan',
  },
  {
    id: 'men-1991',
    year: 1991,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Jean-Pierre Papin',
    nationality: 'France',
    club: 'Marseille',
  },
  {
    id: 'men-1990',
    year: 1990,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Lothar Matthäus',
    nationality: 'West Germany',
    club: 'Inter Milan',
  },
  {
    id: 'men-1989',
    year: 1989,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Marco van Basten',
    nationality: 'Netherlands',
    club: 'AC Milan',
  },
  {
    id: 'men-1988',
    year: 1988,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Marco van Basten',
    nationality: 'Netherlands',
    club: 'AC Milan',
  },
  {
    id: 'men-1987',
    year: 1987,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Ruud Gullit',
    nationality: 'Netherlands',
    club: 'AC Milan',
  },
  {
    id: 'men-1986',
    year: 1986,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Igor Belanov',
    nationality: 'Soviet Union',
    club: 'Dynamo Kyiv',
  },
  {
    id: 'men-1985',
    year: 1985,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Michel Platini',
    nationality: 'France',
    club: 'Juventus',
  },
  {
    id: 'men-1984',
    year: 1984,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Michel Platini',
    nationality: 'France',
    club: 'Juventus',
  },
  {
    id: 'men-1983',
    year: 1983,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Michel Platini',
    nationality: 'France',
    club: 'Juventus',
  },
  {
    id: 'men-1982',
    year: 1982,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Paolo Rossi',
    nationality: 'Italy',
    club: 'Juventus',
  },
  {
    id: 'men-1981',
    year: 1981,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Karl-Heinz Rummenigge',
    nationality: 'West Germany',
    club: 'Bayern Munich',
  },
  {
    id: 'men-1980',
    year: 1980,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Karl-Heinz Rummenigge',
    nationality: 'West Germany',
    club: 'Bayern Munich',
  },
  {
    id: 'men-1979',
    year: 1979,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Kevin Keegan',
    nationality: 'England',
    club: 'Hamburger SV',
  },
  {
    id: 'men-1978',
    year: 1978,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Kevin Keegan',
    nationality: 'England',
    club: 'Hamburger SV',
  },
  {
    id: 'men-1977',
    year: 1977,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Allan Simonsen',
    nationality: 'Denmark',
    club: 'Borussia Mönchengladbach',
  },
  {
    id: 'men-1976',
    year: 1976,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Franz Beckenbauer',
    nationality: 'West Germany',
    club: 'Bayern Munich',
  },
  {
    id: 'men-1975',
    year: 1975,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Oleg Blokhin',
    nationality: 'Soviet Union',
    club: 'Dynamo Kyiv',
  },
  {
    id: 'men-1974',
    year: 1974,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Johan Cruyff',
    nationality: 'Netherlands',
    club: 'Barcelona',
  },
  {
    id: 'men-1973',
    year: 1973,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Johan Cruyff',
    nationality: 'Netherlands',
    club: 'Barcelona',
  },
  {
    id: 'men-1972',
    year: 1972,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Franz Beckenbauer',
    nationality: 'West Germany',
    club: 'Bayern Munich',
  },
  {
    id: 'men-1971',
    year: 1971,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Johan Cruyff',
    nationality: 'Netherlands',
    club: 'Ajax',
  },
  {
    id: 'men-1970',
    year: 1970,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Gerd Müller',
    nationality: 'West Germany',
    club: 'Bayern Munich',
  },
  {
    id: 'men-1969',
    year: 1969,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Gianni Rivera',
    nationality: 'Italy',
    club: 'AC Milan',
  },
  {
    id: 'men-1968',
    year: 1968,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'George Best',
    nationality: 'Northern Ireland',
    club: 'Manchester United',
  },
  {
    id: 'men-1967',
    year: 1967,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Flórián Albert',
    nationality: 'Hungary',
    club: 'Ferencváros',
  },
  {
    id: 'men-1966',
    year: 1966,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Bobby Charlton',
    nationality: 'England',
    club: 'Manchester United',
  },
  {
    id: 'men-1965',
    year: 1965,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Eusébio',
    nationality: 'Portugal',
    club: 'Benfica',
  },
  {
    id: 'men-1964',
    year: 1964,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Denis Law',
    nationality: 'Scotland',
    club: 'Manchester United',
  },
  {
    id: 'men-1963',
    year: 1963,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Lev Yashin',
    nationality: 'Soviet Union',
    club: 'Dynamo Moscow',
  },
  {
    id: 'men-1962',
    year: 1962,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Josef Masopust',
    nationality: 'Czechoslovakia',
    club: 'Dukla Prague',
  },
  {
    id: 'men-1961',
    year: 1961,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Omar Sívori',
    nationality: 'Italy',
    club: 'Juventus',
  },
  {
    id: 'men-1960',
    year: 1960,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Luis Suárez',
    nationality: 'Spain',
    club: 'Barcelona',
  },
  {
    id: 'men-1959',
    year: 1959,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Alfredo Di Stéfano',
    nationality: 'Spain',
    club: 'Real Madrid',
  },
  {
    id: 'men-1958',
    year: 1958,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Raymond Kopa',
    nationality: 'France',
    club: 'Real Madrid',
  },
  {
    id: 'men-1957',
    year: 1957,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Alfredo Di Stéfano',
    nationality: 'Spain',
    club: 'Real Madrid',
  },
  {
    id: 'men-1956',
    year: 1956,
    category: "Men's Ballon d'Or",
    gender: 'men',
    playerName: 'Stanley Matthews',
    nationality: 'England',
    club: 'Blackpool',
    podium: {
      runnerUp: 'Alfredo Di Stéfano',
    },
  },
];

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getLaureateKey(entry: Pick<BallonDorArchiveEntry, 'playerName' | 'nationality' | 'gender'>): string {
  return `${entry.gender}:${normalizeText(entry.playerName)}:${normalizeText(entry.nationality)}`;
}

const HISTORICAL_FLAG_FALLBACKS: Record<string, string> = {
  'west germany': '🇩🇪',
  'soviet union': '🚩',
  czechoslovakia: '🇨🇿',
};

export function getBallonDorNationalityFlag(nationality: string): string {
  if (!nationality || nationality === '—') return '🏳️';
  const norm = normalizeText(nationality);
  if (HISTORICAL_FLAG_FALLBACKS[norm]) {
    return HISTORICAL_FLAG_FALLBACKS[norm];
  }
  const meta = getCountryMetadata(nationality);
  return meta?.flag || '🏳️';
}

/**
 * Aggregated win counts & career honours per official Ballon d'Or laureate.
 */
export const BALLON_DOR_LAUREATE_SUMMARIES: BallonDorLaureateSummary[] = (() => {
  const map: Record<string, BallonDorLaureateSummary> = {};
  for (const entry of BALLON_DOR_WINNERS_ARCHIVE) {
    if (entry.notAwarded) continue;
    const key = getLaureateKey(entry);
    if (!map[key]) {
      map[key] = {
        key,
        playerName: entry.playerName,
        nationality: entry.nationality,
        gender: entry.gender,
        category: entry.category,
        totalWins: 0,
        years: [],
        clubs: [],
      };
    }
    map[key].totalWins += 1;
    map[key].years.push(entry.year);
    if (!map[key].clubs.includes(entry.club)) {
      map[key].clubs.push(entry.club);
    }
  }
  return Object.values(map)
    .map((item) => ({
      ...item,
      years: [...item.years].sort((a, b) => b - a),
    }))
    .sort((a, b) => b.totalWins - a.totalWins || (b.years[0] || 0) - (a.years[0] || 0));
})();

export const BALLON_DOR_SUMMARY_BY_KEY: Record<string, BallonDorLaureateSummary> =
  BALLON_DOR_LAUREATE_SUMMARIES.reduce<Record<string, BallonDorLaureateSummary>>((acc, summary) => {
    acc[summary.key] = summary;
    return acc;
  }, {});

function normalizeCountryForComparison(country: string): string {
  const norm = normalizeText(country);
  if (norm === 'west germany') return 'germany';
  if (norm === 'united states' || norm === 'usa') return 'united states';
  return norm;
}

/**
 * Resolves whether an official Ballon d'Or laureate ALREADY exists in the website's player database.
 * Strictly read-only — checks full name / nickname + nationality + gender to avoid false positives
 * (e.g. Spanish 1960 winner Luis Suárez vs Uruguayan Luis Suárez; Brazilian Ronaldo vs Cristiano Ronaldo).
 */
export function resolveBallonDorDatabasePlayer(
  entry: Pick<BallonDorArchiveEntry, 'playerName' | 'nationality' | 'gender' | 'notAwarded'>,
  identities: Iterable<PlayerIdentity>
): PlayerIdentity | null {
  if (entry.notAwarded) return null;
  const targetName = normalizeText(entry.playerName);
  const targetNationality = normalizeCountryForComparison(entry.nationality);

  for (const identity of identities) {
    if (identity.gender !== entry.gender) continue;
    const idNat = normalizeCountryForComparison(identity.nationality || '');
    const idSecNat = identity.secondaryNationality
      ? normalizeCountryForComparison(identity.secondaryNationality)
      : '';
    if (idNat !== targetNationality && idSecNat !== targetNationality) {
      continue;
    }

    const candidates = [
      identity.name,
      identity.nickname,
      identity.fullName,
      identity.shortName,
    ]
      .filter((v): v is string => Boolean(v && v.trim()))
      .map(normalizeText);

    if (candidates.includes(targetName)) {
      return identity;
    }
  }

  return null;
}

export interface DisplayBallonDorWin extends BallonDorWin {
  isOfficialArchive?: boolean;
  category?: BallonDorCategory;
}

/**
 * Returns the verified official Ballon d'Or archive wins for an existing PlayerIdentity (read-only),
 * merged cleanly with any admin-recorded wins on the player's profile without double-counting years.
 */
export function getCombinedBallonDorWinsForIdentity(
  identity: PlayerIdentity
): DisplayBallonDorWin[] {
  const adminWins: DisplayBallonDorWin[] = (identity.ballonDorWins || []).map((w) => ({
    ...w,
    isOfficialArchive: false,
  }));

  const officialEntries = BALLON_DOR_WINNERS_ARCHIVE.filter(
    (entry) =>
      !entry.notAwarded && resolveBallonDorDatabasePlayer(entry, [identity]) !== null
  );

  const byYear: Record<number, DisplayBallonDorWin> = {};

  for (const entry of officialEntries) {
    byYear[entry.year] = {
      id: `official-${entry.id}`,
      year: entry.year,
      teamName: entry.club,
      note: entry.category,
      isOfficialArchive: true,
      category: entry.category,
    };
  }

  // Merge admin-recorded wins: preserve official flag if same year, otherwise add admin record cleanly
  for (const adminWin of adminWins) {
    const existing = byYear[adminWin.year];
    if (existing) {
      byYear[adminWin.year] = {
        ...existing,
        id: adminWin.id,
        teamId: adminWin.teamId,
        teamName: adminWin.teamName || existing.teamName,
        note: adminWin.note || existing.note,
        isOfficialArchive: true,
      };
    } else {
      byYear[adminWin.year] = {
        ...adminWin,
        isOfficialArchive: false,
      };
    }
  }

  return Object.values(byYear).sort((a, b) => b.year - a.year);
}
