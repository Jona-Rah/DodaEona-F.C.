import {
  Team,
  Player,
  PlayerPosition,
  FreeAgentPlayer,
  getPlayerDisplayName,
  resolvePlayerAge,
} from '../types/matchCentre';
import { FC27_COMPACT_TEAMS, CompactTeamTuple } from './fc27CompactData';
import { getRealClubLogo } from './realClubLogos';
import { getRealFifaRating } from './realFifaRankings';
import { getRealFootballDatabaseRating } from './realFootballDatabaseRankings';
import { getCountryCode, getCountryFlag, normalizeCountryName } from './countryMetadata';
import { buildNationalTeams } from './nationalTeamsDatabase';
import { resolvePlayerNames } from './playerNicknames';
import { getSeededClubManagerMeta } from './clubManagersDatabase';
import { getVerifiedPlayerDob } from './verifiedPlayerDobs';
import { getVerifiedPlayerPenaltyStats } from './verifiedPenaltyData';
import { buildDefaultClubPenaltyOrderIds } from '../utils/penaltyOrder';
import {
  selectBestFormationAndXiForSquad,
} from '../components/matchCentre/dossier/dossierUtils';

// Computes team overall rating calibrated from world ranking targetOverall (or squad player average fallback)
export function calculateTeamRating(squad: Player[], targetOverall?: number): number {
  if (typeof targetOverall === 'number' && targetOverall > 0) {
    return Math.max(1, Math.min(99, Math.round(targetOverall)));
  }
  if (!squad || squad.length === 0) return 0;
  const sum = squad.reduce((acc, p) => acc + p.overallRating, 0);
  return Math.max(1, Math.min(99, Math.round(sum / squad.length)));
}

export function calculateDetailedRatings(squad: Player[], targetOverall?: number) {
  if (!squad || squad.length === 0) {
    const fallback =
      typeof targetOverall === 'number' && targetOverall > 0
        ? Math.max(1, Math.min(99, Math.round(targetOverall)))
        : 0;
    return {
      overallRating: fallback,
      attackRating: fallback,
      midfieldRating: fallback,
      defenceRating: fallback,
    };
  }
  const attackers = squad.filter(p => p.position === 'ATT');
  const midfielders = squad.filter(p => p.position === 'MID');
  const defenders = squad.filter(p => p.position === 'DEF');
  const gks = squad.filter(p => p.position === 'GK');

  const rawAvg = (arr: Player[]) =>
    arr.length ? arr.reduce((s, p) => s + p.overallRating, 0) / arr.length : 0;

  const squadRawAvg = rawAvg(squad);
  const clampRating = (val: number) => Math.max(1, Math.min(99, Math.round(val)));

  const overallRating =
    typeof targetOverall === 'number' && targetOverall > 0
      ? clampRating(targetOverall)
      : clampRating(squadRawAvg);

  const offset = overallRating - squadRawAvg;

  const attackRating = clampRating((attackers.length ? rawAvg(attackers) : squadRawAvg) + offset);
  const midfieldRating = clampRating((midfielders.length ? rawAvg(midfielders) : squadRawAvg) + offset);
  const defPool = defenders.length || gks.length ? [...defenders, ...gks] : squad;
  const defenceRating = clampRating(rawAvg(defPool) + offset);

  return { attackRating, midfieldRating, defenceRating, overallRating };
}

export function compareTeamsByWorldRanking(a: Team, b: Team): number {
  const ptsA = a.rankingPoints ?? 0;
  const ptsB = b.rankingPoints ?? 0;
  if (ptsB !== ptsA) return ptsB - ptsA;
  if (b.overallRating !== a.overallRating) return b.overallRating - a.overallRating;
  const rankA = a.worldRanking ?? 999999;
  const rankB = b.worldRanking ?? 999999;
  if (rankA !== rankB) return rankA - rankB;
  return a.name.localeCompare(b.name);
}

function mapPositionCategory(posDetail: string): PlayerPosition {
  if (posDetail === 'GK') return 'GK';
  if (posDetail === 'CB' || posDetail === 'LB' || posDetail === 'RB' || posDetail === 'LWB' || posDetail === 'RWB') {
    return 'DEF';
  }
  if (posDetail === 'CDM' || posDetail === 'CM' || posDetail === 'CAM' || posDetail === 'RM' || posDetail === 'LM') {
    return 'MID';
  }
  return 'ATT';
}

function makeShortPlayerName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return fullName;
  return parts[parts.length - 1];
}

function createClubCrestSvgDataUrl(code: string, primaryColor: string, secondaryColor: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" fill="none"><defs><linearGradient id="g" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="${primaryColor}"/><stop offset="100%" stop-color="${secondaryColor}"/></linearGradient></defs><path d="M48 6L84 18V46C84 68.5 68.2 84.4 48 91C27.8 84.4 12 68.5 12 46V18L48 6Z" fill="url(#g)" stroke="#E2E8F0" stroke-width="3.5"/><path d="M48 12L78 22V45.5C78 64.2 64.8 77.8 48 83.8C31.2 77.8 18 64.2 18 45.5V22L48 12Z" stroke="rgba(255,255,255,0.28)" stroke-width="1.5"/><text x="48" y="55" text-anchor="middle" fill="#FFFFFF" font-family="system-ui,-apple-system,sans-serif" font-weight="400" font-size="22" letter-spacing="1.5" style="paint-order:stroke;stroke:rgba(0,0,0,0.65);stroke-width:3px">${code}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Players verified on Transfermarkt / Soccerdonna as Former Internationals (retired from senior national duty).
// Matched by canonical EA base ID (Number(eaId) & 0xFFFFFF) so promo bitmask variants stay protected.
const VERIFIED_INTERNATIONAL_RETIRED_BASE_EA_IDS = new Set<string>([
  '158023', // Lionel Messi (Argentina)
  '20801',  // Cristiano Ronaldo (Portugal)
  '167495', // Manuel Neuer (Germany)
  '186942', // İlkay Gündoğan (Germany)
  '189596', // Thomas Müller (Germany)
  '194765', // Antoine Griezmann (France)
  '178509', // Olivier Giroud (France)
  '215914', // N'Golo Kanté (France)
  '167948', // Hugo Lloris (France)
  '192883', // Henrikh Mkhitaryan (Armenia)
  '183898', // Ángel Di María (Argentina)
  '192366', // Nicolás Otamendi (Argentina)
  '143076', // Alejandro "Papu" Gómez (Argentina)
  '176580', // Luis Suárez (Uruguay)
  '182494', // Fernando Muslera (Uruguay)
  '197655', // Sebastián Coates (Uruguay)
  '177683', // Yann Sommer (Switzerland)
  '193348', // Xherdan Shaqiri (Switzerland)
  '210047', // Fabian Schär (Switzerland)
  '186153', // Wojciech Szczęsny (Poland)
  '180930', // Edin Džeko (Bosnia & Herzegovina)
  '188350', // Marco Reus (Germany)
  '188943', // Kevin Trapp (Germany)
  '185122', // Péter Gulácsi (Hungary)
  '183711', // Jordan Henderson (England)
  '186146', // Danny Welbeck (England)
  '196978', // Callum Wilson (England)
  '188377', // Kyle Walker (England)
  '186345', // Kieran Trippier (England)
  '246147', // Mason Greenwood (England)
  '193080', // David De Gea (Spain)
  '192629', // Iago Aspas (Spain)
  '200724', // Nacho Fernández (Spain)
  '193747', // Koke (Spain)
  '197781', // Isco (Spain)
  '192638', // Marcos Alonso (Spain)
  '208618', // Lucas Vázquez (Spain)
  '201153', // Álvaro Morata (Spain)
  '199564', // Sergi Roberto (Spain)
  '177413', // Axel Witsel (Belgium)
  '190815', // Daley Blind (Netherlands)
  '184941', // Alexis Sánchez (Chile)
  '208722', // Sadio Mané (Senegal)
  '234642', // Édouard Mendy (Senegal)
  '190780', // Sean Johnson (United States)
  '199434', // Dušan Tadić (Serbia)
  '226890', // Marta Vieira da Silva (Brazil)
  '245872', // Kim Little (Scotland)
  '245956', // Christiane Endler (Chile)
  '226335', // Alyssa Naeher (United States)
  '227405', // Sophie Schmidt (Canada)
  '226316', // Sydney Leroux (United States)
  '267201', // Jess Fishlock (Wales)
  '227327', // Sara Däbritz (Germany)
  '233747', // Sherida Spitse (Netherlands)
  '248715', // Marina Hegering (Germany)
]);

function isVerifiedInternationalRetired(eaId: string): boolean {
  const raw = String(eaId || '').trim();
  if (VERIFIED_INTERNATIONAL_RETIRED_BASE_EA_IDS.has(raw)) return true;
  const num = Number(raw);
  if (Number.isFinite(num) && num > 0) {
    return VERIFIED_INTERNATIONAL_RETIRED_BASE_EA_IDS.has(String(num & 0xFFFFFF));
  }
  return false;
}

function hydrateTeamFromTuple(tuple: CompactTeamTuple): Team {
  const [
    id,
    name,
    shortName,
    code,
    country,
    league,
    gender,
    primaryColor,
    secondaryColor,
    stadium,
    playingStyle,
    worldOverallRating,
    rawPlayers,
  ] = tuple;

  const squad: Player[] = rawPlayers.map((p, index) => {
    const [eaId, pName, posDetail, ovr, nation, age, pac, sho, pas, dri, def, phy, tmShirtNumber] = p;
    const position = mapPositionCategory(posDetail);
    const normalizedNation = normalizeCountryName(nation);
    const resolvedNames = resolvePlayerNames(eaId, pName, normalizedNation);
    const dateOfBirth = getVerifiedPlayerDob(eaId);
    const resolvedAge = resolvePlayerAge(dateOfBirth, age);
    const verifiedPenaltyStats = getVerifiedPlayerPenaltyStats(eaId);
    return {
      id: `fc27-p-${id}-${eaId || index + 1}`,
      name: resolvedNames.displayName,
      nickname: resolvedNames.nickname,
      shortName: resolvedNames.shortName,
      fullName: resolvedNames.fullName,
      position,
      positionDetail: posDetail,
      overallRating: ovr,
      nationality: normalizedNation,
      gender,
      shirtNumber: tmShirtNumber || index + 1,
      age: resolvedAge,
      dateOfBirth,
      isCaptain: index === 0,
      isViceCaptain: index === 1,
      captainSince: index === 0 ? '2024-08-01' : undefined,
      viceCaptainSince: index === 1 ? '2024-08-01' : undefined,
      injuryStatus: 'fit',
      internationalRetired: isVerifiedInternationalRetired(eaId) ? true : undefined,
      attributes: {
        pace: pac,
        shooting: sho,
        passing: pas,
        dribbling: dri,
        defending: def,
        physical: phy,
        penalties: verifiedPenaltyStats.penalties,
        composure: verifiedPenaltyStats.composure,
      },
    };
  });

  // Compute optimal formation and preferred XI in a single pass
  const { formation: bestFormation, xiPlayers } = selectBestFormationAndXiForSquad(squad);

  const lowerLeague = league.toLowerCase();
  const isNational =
    (lowerLeague.includes('national') && !lowerLeague.includes("national women's soccer league")) ||
    lowerLeague.includes('international') ||
    lowerLeague.includes('fifa') ||
    name.toLowerCase().includes('national team');
  const teamType = isNational ? 'national' : 'club';
  const team_type = isNational ? 'country' : 'club';

  const fifaRating = isNational ? getRealFifaRating(name, country, gender) : null;
  const clubRanking = !isNational
    ? getRealFootballDatabaseRating(name, shortName, code, league, gender, worldOverallRating)
    : null;

  const targetOverall = fifaRating ?? clubRanking?.overall ?? worldOverallRating;
  const ratings = calculateDetailedRatings(squad, targetOverall);
  const captain = squad[0];
  const viceCaptain = squad[1];
  const canonicalCountry = normalizeCountryName(country);
  const seededClubManager = !isNational ? getSeededClubManagerMeta(id) : null;

  const penaltyOrderIds = buildDefaultClubPenaltyOrderIds(id, squad);

  return {
    id,
    name,
    shortName,
    code,
    type: teamType,
    team_type,
    country: canonicalCountry,
    flag: getCountryFlag(canonicalCountry),
    countryCode: getCountryCode(canonicalCountry),
    league: isNational ? undefined : league,
    gender,
    overallRating: ratings.overallRating,
    attackRating: ratings.attackRating,
    midfieldRating: ratings.midfieldRating,
    defenceRating: ratings.defenceRating,
    worldRanking: clubRanking?.rank,
    rankingPoints: clubRanking?.points ?? (fifaRating ? fifaRating * 22 : undefined),
    rankingUpdateDate: clubRanking?.updateDate,
    crestUrl: getRealClubLogo(name, shortName, code) || createClubCrestSvgDataUrl(code, primaryColor, secondaryColor),
    stadium,
    stadiumCapacity: 45000,
    foundedYear: 1900,
    manager: seededClubManager?.managerName || 'Head Coach',
    manager_since: seededClubManager?.startDate,
    manager_role: seededClubManager?.role,
    captainName: getPlayerDisplayName(captain) || undefined,
    captainId: captain?.id,
    captainSince: '2024-08-01',
    viceCaptainName: getPlayerDisplayName(viceCaptain) || undefined,
    viceCaptainId: viceCaptain?.id,
    viceCaptainSince: '2024-08-01',
    playingStyle,
    primaryColor,
    secondaryColor,
    preferredXiIds: xiPlayers.map((p) => p.id),
    preferredXiSource: 'verified',
    penaltyOrderIds,
    penaltyOrderSource: 'verified',
    squad,
    defaultFormation: bestFormation,
    description: `${name} competes in ${league} (${canonicalCountry}), featuring ${squad.length} registered players from the FC27 database.`,
  };
}

// ========================================================
// REAL UNATTACHED FREE AGENTS DATABASE
// ========================================================
export const FREE_AGENTS_DATABASE: FreeAgentPlayer[] = [
  {
    id: 'fa-1',
    name: 'Sergio Ramos',
    shortName: 'Ramos',
    position: 'DEF',
    positionDetail: 'CB',
    overallRating: 84,
    nationality: 'Spain',
    shirtNumber: 4,
    age: 38,
    previousClub: 'CF Monterrey',
    marketValue: '€1.8M',
    joinedFreeAgency: 'January 2026',
    internationalRetired: true,
    attributes: { pace: 62, shooting: 70, passing: 76, dribbling: 69, defending: 85, physical: 84 },
  },
  {
    id: 'fa-3',
    name: 'Wissam Ben Yedder',
    shortName: 'Ben Yedder',
    position: 'ATT',
    positionDetail: 'ST',
    overallRating: 83,
    nationality: 'France',
    shirtNumber: 9,
    age: 34,
    previousClub: 'Wydad AC',
    marketValue: '€3.5M',
    joinedFreeAgency: 'July 2026',
    internationalRetired: true,
    attributes: { pace: 78, shooting: 84, passing: 78, dribbling: 86, defending: 38, physical: 68 },
  },
  {
    id: 'fa-4',
    name: 'Dele Alli',
    shortName: 'Dele Alli',
    position: 'MID',
    positionDetail: 'CAM',
    overallRating: 77,
    nationality: 'England',
    shirtNumber: 20,
    age: 28,
    previousClub: 'Como 1907',
    marketValue: '€2.0M',
    joinedFreeAgency: 'September 2025',
    internationalRetired: true,
    attributes: { pace: 74, shooting: 77, passing: 78, dribbling: 80, defending: 62, physical: 74 },
  },
  {
    id: 'fa-5',
    name: 'Anthony Martial',
    shortName: 'Martial',
    position: 'ATT',
    positionDetail: 'ST',
    overallRating: 79,
    nationality: 'France',
    shirtNumber: 9,
    age: 28,
    previousClub: 'CF Monterrey',
    marketValue: '€7.5M',
    joinedFreeAgency: 'July 2026',
    internationalRetired: true,
    attributes: { pace: 84, shooting: 80, passing: 75, dribbling: 84, defending: 35, physical: 68 },
  },
  {
    id: 'fa-12',
    name: 'Timothy Fosu-Mensah',
    shortName: 'Fosu-Mensah',
    position: 'DEF',
    positionDetail: 'CB',
    overallRating: 73,
    nationality: 'Netherlands',
    shirtNumber: 24,
    age: 26,
    previousClub: 'Bayer 04 Leverkusen',
    marketValue: '€1.8M',
    joinedFreeAgency: 'July 2024',
    internationalRetired: true,
    attributes: { pace: 80, shooting: 42, passing: 66, dribbling: 68, defending: 74, physical: 78 },
  },
  {
    id: 'fa-13',
    name: 'Christian Eriksen',
    shortName: 'Eriksen',
    position: 'MID',
    positionDetail: 'CAM',
    overallRating: 77,
    nationality: 'Denmark',
    shirtNumber: 8,
    age: 34,
    previousClub: 'VfL Wolfsburg',
    marketValue: '€1.0M',
    joinedFreeAgency: 'September 2026',
    attributes: { pace: 60, shooting: 74, passing: 82, dribbling: 76, defending: 53, physical: 56 },
  },
];

// ========================================================
// CORE CLUBS + NATIONAL TEAMS DATABASE
// ========================================================
export const NORMALIZED_FREE_AGENTS: FreeAgentPlayer[] = FREE_AGENTS_DATABASE.map((fa) => {
  const normalizedNation = normalizeCountryName(fa.nationality);
  const resolvedNames = resolvePlayerNames(fa.id, fa.fullName || fa.name, normalizedNation);
  const dateOfBirth = fa.dateOfBirth || getVerifiedPlayerDob(fa.id);
  return {
    ...fa,
    name: resolvedNames.displayName,
    nickname: fa.nickname || resolvedNames.nickname,
    shortName: resolvedNames.shortName,
    fullName: fa.fullName || resolvedNames.fullName,
    dateOfBirth,
    age: resolvePlayerAge(dateOfBirth, fa.age),
    gender: fa.gender || 'men',
    nationality: normalizedNation,
  };
});

// Keep exported baseline free agents aligned with nickname/fullName fields
FREE_AGENTS_DATABASE.splice(0, FREE_AGENTS_DATABASE.length, ...NORMALIZED_FREE_AGENTS);

const rawClubTeams = FC27_COMPACT_TEAMS.map(hydrateTeamFromTuple).filter(
  (t) => (t.squad?.length || 0) >= 11
);

export const CLUB_TEAMS_DATABASE: Team[] = [...rawClubTeams].sort(compareTeamsByWorldRanking);

const BUILT_NATIONALS = buildNationalTeams(CLUB_TEAMS_DATABASE, NORMALIZED_FREE_AGENTS);

export const NATIONAL_TEAMS_DATABASE: Team[] = [...BUILT_NATIONALS.nationalTeams]
  .filter((nt) => (nt.squad?.length || 0) >= 11)
  .map((nt) => ({
    ...nt,
    penaltyOrderIds: buildDefaultClubPenaltyOrderIds(nt.id, nt.squad),
    penaltyOrderSource: 'verified' as const,
  }))
  .sort(compareTeamsByWorldRanking);

export const SEEDED_NATIONAL_REGISTRATIONS = BUILT_NATIONALS.seededNationalRegistrations;

export const TEAMS_DATABASE: Team[] = [...CLUB_TEAMS_DATABASE, ...NATIONAL_TEAMS_DATABASE]
  .filter((t) => (t.squad?.length || 0) >= 11)
  .sort(compareTeamsByWorldRanking);

