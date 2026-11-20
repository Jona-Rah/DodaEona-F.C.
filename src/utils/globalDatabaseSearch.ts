import {
  getPlayerDisplayName,
  Team,
} from '../types/matchCentre';
import { Manager, ManagerAppointment } from '../types/manager';
import { BookVolume, ReadingSeriesItem } from '../types/reads';
import { getAllStadiums, StadiumRecord } from '../data/stadiumsDatabase';
import { CanonicalRegistry } from '../data/playerRegistry';

const NON_ASCII_RE = /[^\u0000-\u007f]/;

export function normalizeDatabaseSearchText(input?: string): string {
  if (!input) return '';
  if (!NON_ASCII_RE.test(input)) {
    return input.toLowerCase().trim();
  }
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ø/gi, 'o')
    .replace(/ł/gi, 'l')
    .replace(/ı/gi, 'i')
    .replace(/ß/gi, 'ss')
    .toLowerCase()
    .trim();
}

export interface SearchedPlayerItem {
  id: string;
  name: string;
  position: string;
  nationality: string;
  currentTeamName: string;
  overallRating: number;
  score: number;
}

export interface SearchedManagerItem {
  manager: Manager;
  currentTeamName?: string;
  currentTeamId?: string;
  score: number;
}

export interface SearchedLeagueItem {
  name: string;
  count: number;
  country?: string;
  score: number;
}

export interface GlobalDatabaseSearchResults {
  books: BookVolume[];
  series: ReadingSeriesItem[];
  leagues: SearchedLeagueItem[];
  clubs: Team[];
  players: SearchedPlayerItem[];
  managers: SearchedManagerItem[];
  stadiums: StadiumRecord[];
  totalCount: number;
}

export interface GlobalSearchLimits {
  books?: number;
  series?: number;
  leagues?: number;
  clubs?: number;
  players?: number;
  managers?: number;
  stadiums?: number;
}

export interface WholeDatabaseSearchSources {
  teams: Team[];
  registry: CanonicalRegistry | null | undefined;
  managers: Manager[];
  managerAppointments?: ManagerAppointment[];
  publishedBooks?: BookVolume[];
  publishedSeries?: ReadingSeriesItem[];
  representedLeagues?: Array<{ name: string; count: number }>;
  stadiums?: StadiumRecord[];
}

const EMPTY_RESULTS: GlobalDatabaseSearchResults = {
  books: [],
  series: [],
  leagues: [],
  clubs: [],
  players: [],
  managers: [],
  stadiums: [],
  totalCount: 0,
};

// ============================================================================
// PRE-NORMALIZED WEAKMAP INDEX CACHES
// ============================================================================

interface IndexedClub {
  team: Team;
  ovr: number;
  nName: string;
  nShort: string;
  nCode: string;
  nCountry: string;
  countryWeight: number;
  nLeague: string;
  nConfed: string;
  nManager: string;
  nCaptain: string;
  nStadium: string;
}

interface IndexedTeamsBundle {
  teamNameById: Map<string, string>;
  leagueCountryMap: Map<string, string>;
  clubs: IndexedClub[];
  derivedLeagues: Array<{ name: string; count: number }>;
}

interface IndexedPlayer {
  id: string;
  displayName: string;
  position: string;
  nationality: string;
  currentTeamName: string;
  overallRating: number;
  nDisplay: string;
  nBase: string;
  nFull: string;
  nNick: string;
  nNat: string;
  nPos: string;
}

interface IndexedPlayersBundle {
  teamsRef: Team[];
  players: IndexedPlayer[];
}

interface IndexedManager {
  manager: Manager;
  currentTeamName?: string;
  currentTeamId?: string;
  nName: string;
  nNat: string;
  nTeam: string;
}

interface IndexedManagersBundle {
  apptsRef?: ManagerAppointment[];
  teamsRef: Team[];
  managers: IndexedManager[];
}

interface IndexedStadium {
  stadium: StadiumRecord;
  verifiedNum: number;
  capacity: number;
  nName: string;
  nCity: string;
  nClub: string;
  nCountry: string;
}

interface IndexedBook {
  book: BookVolume;
  nTitle: string;
  nSeries: string;
  nAuthor: string;
  nDesc: string;
}

interface IndexedSeries {
  series: ReadingSeriesItem;
  nTitle: string;
  nDesc: string;
}

interface IndexedLeague {
  name: string;
  count: number;
  country?: string;
  nName: string;
  nCountry: string;
}

interface IndexedLeaguesBundle {
  teamsRef: Team[];
  leagues: IndexedLeague[];
}

const teamsIndexCache = new WeakMap<Team[], IndexedTeamsBundle>();
const playersIndexCache = new WeakMap<CanonicalRegistry, IndexedPlayersBundle>();
const managersIndexCache = new WeakMap<Manager[], IndexedManagersBundle>();
const stadiumsIndexCache = new WeakMap<StadiumRecord[], IndexedStadium[]>();
const booksIndexCache = new WeakMap<BookVolume[], IndexedBook[]>();
const seriesIndexCache = new WeakMap<ReadingSeriesItem[], IndexedSeries[]>();
const leaguesIndexCache = new WeakMap<Array<{ name: string; count: number }>, IndexedLeaguesBundle>();

function getTeamsIndex(teams: Team[]): IndexedTeamsBundle {
  const cached = teamsIndexCache.get(teams);
  if (cached) return cached;

  const teamNameById = new Map<string, string>();
  const leagueCountryMap = new Map<string, string>();
  const leagueCounts = new Map<string, number>();
  const clubs: IndexedClub[] = new Array(teams.length);

  for (let i = 0; i < teams.length; i++) {
    const t = teams[i];
    teamNameById.set(t.id, t.name);
    if (t.type === 'club' && t.league) {
      if (!leagueCountryMap.has(t.league)) {
        leagueCountryMap.set(t.league, t.country);
      }
      leagueCounts.set(t.league, (leagueCounts.get(t.league) || 0) + 1);
    }
    clubs[i] = {
      team: t,
      ovr: t.overallRating,
      nName: normalizeDatabaseSearchText(t.name),
      nShort: normalizeDatabaseSearchText(t.shortName),
      nCode: normalizeDatabaseSearchText(t.code),
      nCountry: normalizeDatabaseSearchText(t.country),
      countryWeight: t.type === 'national' ? 1.25 : 0.75,
      nLeague: normalizeDatabaseSearchText(t.league),
      nConfed: normalizeDatabaseSearchText(t.confederation),
      nManager: normalizeDatabaseSearchText(t.manager),
      nCaptain: normalizeDatabaseSearchText(t.captainName),
      nStadium: normalizeDatabaseSearchText(t.stadium),
    };
  }

  const derivedLeagues = Array.from(leagueCounts.entries()).map(([name, count]) => ({
    name,
    count,
  }));

  const bundle: IndexedTeamsBundle = {
    teamNameById,
    leagueCountryMap,
    clubs,
    derivedLeagues,
  };
  teamsIndexCache.set(teams, bundle);
  return bundle;
}

function getPlayersIndex(
  registry: CanonicalRegistry | null | undefined,
  teams: Team[],
  teamNameById: Map<string, string>
): IndexedPlayer[] {
  if (!registry || !registry.identities) return [];
  const cached = playersIndexCache.get(registry);
  if (cached && cached.teamsRef === teams) {
    return cached.players;
  }

  // O(R) single pass for active club registration instead of O(N * R)
  const activeClubByPlayerId = new Map<string, { teamId: string; joinedAt: string }>();
  if (registry.clubRegistrations) {
    for (const reg of registry.clubRegistrations.values()) {
      if (reg.status !== 'active') continue;
      const existing = activeClubByPlayerId.get(reg.playerId);
      const regJoined = reg.joinedAt || '';
      if (!existing || regJoined > existing.joinedAt) {
        activeClubByPlayerId.set(reg.playerId, {
          teamId: reg.teamId,
          joinedAt: regJoined,
        });
      }
    }
  }

  const players: IndexedPlayer[] = new Array(registry.identities.size);
  let idx = 0;
  for (const [id, ident] of registry.identities.entries()) {
    const displayName = getPlayerDisplayName(ident);
    const fullName = ident.fullName || '';
    const nickname = ident.nickname || '';
    const nat = ident.nationality || '';
    const pos = ident.positionDetail || ident.position || '';
    const ovr = ident.overallRating || 75;
    const activeReg = activeClubByPlayerId.get(id);
    const currentTeamName = activeReg
      ? teamNameById.get(activeReg.teamId) || 'Free Agent'
      : 'Free Agent';

    const nDisplay = normalizeDatabaseSearchText(displayName);
    const nBase = ident.name !== displayName ? normalizeDatabaseSearchText(ident.name) : '';
    const nFull = fullName && fullName !== displayName ? normalizeDatabaseSearchText(fullName) : '';
    const nNick = nickname && nickname !== displayName ? normalizeDatabaseSearchText(nickname) : '';

    players[idx++] = {
      id,
      displayName,
      position: pos,
      nationality: nat,
      currentTeamName,
      overallRating: ovr,
      nDisplay,
      nBase,
      nFull,
      nNick,
      nNat: normalizeDatabaseSearchText(nat),
      nPos: normalizeDatabaseSearchText(pos),
    };
  }

  playersIndexCache.set(registry, { teamsRef: teams, players });
  return players;
}

function getManagersIndex(
  managers: Manager[],
  managerAppointments: ManagerAppointment[] | undefined,
  teams: Team[],
  teamNameById: Map<string, string>
): IndexedManager[] {
  if (!managers || managers.length === 0) return [];
  const cached = managersIndexCache.get(managers);
  if (cached && cached.apptsRef === managerAppointments && cached.teamsRef === teams) {
    return cached.managers;
  }

  const activeApptByManagerId = new Map<string, ManagerAppointment>();
  if (managerAppointments) {
    for (let i = 0; i < managerAppointments.length; i++) {
      const appt = managerAppointments[i];
      if (appt.is_current && !activeApptByManagerId.has(appt.manager_id)) {
        activeApptByManagerId.set(appt.manager_id, appt);
      }
    }
  }

  const indexed: IndexedManager[] = new Array(managers.length);
  for (let i = 0; i < managers.length; i++) {
    const m = managers[i];
    const appt = activeApptByManagerId.get(m.id);
    const currentTeamName = appt ? teamNameById.get(appt.team_id) || appt.team_name : undefined;
    indexed[i] = {
      manager: m,
      currentTeamName,
      currentTeamId: appt?.team_id,
      nName: normalizeDatabaseSearchText(m.name),
      nNat: normalizeDatabaseSearchText(m.nationality),
      nTeam: normalizeDatabaseSearchText(currentTeamName),
    };
  }

  managersIndexCache.set(managers, {
    apptsRef: managerAppointments,
    teamsRef: teams,
    managers: indexed,
  });
  return indexed;
}

function getStadiumsIndex(stadiums: StadiumRecord[]): IndexedStadium[] {
  const cached = stadiumsIndexCache.get(stadiums);
  if (cached) return cached;

  const indexed: IndexedStadium[] = new Array(stadiums.length);
  for (let i = 0; i < stadiums.length; i++) {
    const s = stadiums[i];
    indexed[i] = {
      stadium: s,
      verifiedNum: s.isVerifiedStadium ? 1 : 0,
      capacity: s.capacity,
      nName: normalizeDatabaseSearchText(s.name),
      nCity: normalizeDatabaseSearchText(s.city),
      nClub: normalizeDatabaseSearchText(s.clubName),
      nCountry: normalizeDatabaseSearchText(s.country),
    };
  }

  stadiumsIndexCache.set(stadiums, indexed);
  return indexed;
}

function getBooksIndex(books: BookVolume[] | undefined): IndexedBook[] {
  if (!books || books.length === 0) return [];
  const cached = booksIndexCache.get(books);
  if (cached) return cached;

  const indexed: IndexedBook[] = new Array(books.length);
  for (let i = 0; i < books.length; i++) {
    const b = books[i];
    indexed[i] = {
      book: b,
      nTitle: normalizeDatabaseSearchText(b.title),
      nSeries: normalizeDatabaseSearchText(b.seriesTitle),
      nAuthor: normalizeDatabaseSearchText(b.author),
      nDesc: normalizeDatabaseSearchText(b.description),
    };
  }
  booksIndexCache.set(books, indexed);
  return indexed;
}

function getSeriesIndex(seriesList: ReadingSeriesItem[] | undefined): IndexedSeries[] {
  if (!seriesList || seriesList.length === 0) return [];
  const cached = seriesIndexCache.get(seriesList);
  if (cached) return cached;

  const indexed: IndexedSeries[] = [];
  for (let i = 0; i < seriesList.length; i++) {
    const s = seriesList[i];
    if ((s.volumeCount || 0) <= 0) continue;
    indexed.push({
      series: s,
      nTitle: normalizeDatabaseSearchText(s.title),
      nDesc: normalizeDatabaseSearchText(s.description),
    });
  }
  seriesIndexCache.set(seriesList, indexed);
  return indexed;
}

function getLeaguesIndex(
  leagueList: Array<{ name: string; count: number }>,
  teams: Team[],
  leagueCountryMap: Map<string, string>
): IndexedLeague[] {
  const cached = leaguesIndexCache.get(leagueList);
  if (cached && cached.teamsRef === teams) {
    return cached.leagues;
  }

  const indexed: IndexedLeague[] = new Array(leagueList.length);
  for (let i = 0; i < leagueList.length; i++) {
    const lg = leagueList[i];
    const country = leagueCountryMap.get(lg.name);
    indexed[i] = {
      name: lg.name,
      count: lg.count,
      country,
      nName: normalizeDatabaseSearchText(lg.name),
      nCountry: normalizeDatabaseSearchText(country),
    };
  }
  leaguesIndexCache.set(leagueList, { teamsRef: teams, leagues: indexed });
  return indexed;
}

/**
 * Optionally pre-warm normalized search indexes (e.g. on search input focus)
 * so the first keystroke pays near-zero indexing cost.
 */
export function warmWholeDatabaseSearchIndex(sources: WholeDatabaseSearchSources): void {
  const teamsIdx = getTeamsIndex(sources.teams);
  getPlayersIndex(sources.registry, sources.teams, teamsIdx.teamNameById);
  getManagersIndex(
    sources.managers,
    sources.managerAppointments,
    sources.teams,
    teamsIdx.teamNameById
  );
  getStadiumsIndex(sources.stadiums || getAllStadiums());
  if (sources.publishedBooks) getBooksIndex(sources.publishedBooks);
  if (sources.publishedSeries) getSeriesIndex(sources.publishedSeries);
}

// ============================================================================
// FAST SCORING + BOUNDED TOP-K INSERTION
// ============================================================================

function scoreFieldFast(
  normValue: string,
  q: string,
  spacedQ: string
): number {
  if (!normValue) return 0;
  if (!normValue.includes(q)) return 0;
  if (normValue === q) return 100;
  if (normValue.startsWith(q)) return 75;
  if (normValue.includes(spacedQ)) return 60;
  return 40;
}

function insertTopK<T>(
  arr: T[],
  maxLen: number,
  candidate: T,
  compare: (a: T, b: T) => number
): void {
  if (maxLen <= 0) return;
  const len = arr.length;
  if (len === maxLen && compare(candidate, arr[len - 1]) >= 0) {
    return;
  }
  // Insertion point via binary search (arrays are <= ~30 items)
  let lo = 0;
  let hi = len;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (compare(candidate, arr[mid]) < 0) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  arr.splice(lo, 0, candidate);
  if (arr.length > maxLen) {
    arr.pop();
  }
}

interface ScoredClub {
  team: Team;
  score: number;
  ovr: number;
}

interface ScoredStadium {
  stadium: StadiumRecord;
  score: number;
  verifiedNum: number;
  capacity: number;
}

interface ScoredBook {
  book: BookVolume;
  score: number;
}

interface ScoredSeries {
  series: ReadingSeriesItem;
  score: number;
}

const compareClubs = (a: ScoredClub, b: ScoredClub) =>
  b.score - a.score || b.ovr - a.ovr || a.team.name.localeCompare(b.team.name);

const comparePlayers = (a: SearchedPlayerItem, b: SearchedPlayerItem) =>
  b.score - a.score || b.overallRating - a.overallRating;

const compareManagers = (a: SearchedManagerItem, b: SearchedManagerItem) =>
  b.score - a.score || a.manager.name.localeCompare(b.manager.name);

const compareStadiums = (a: ScoredStadium, b: ScoredStadium) =>
  b.score - a.score || b.verifiedNum - a.verifiedNum || b.capacity - a.capacity;

const compareLeagues = (a: SearchedLeagueItem, b: SearchedLeagueItem) =>
  b.score - a.score || b.count - a.count;

const compareBooks = (a: ScoredBook, b: ScoredBook) =>
  b.score - a.score || a.book.title.localeCompare(b.book.title);

const compareSeries = (a: ScoredSeries, b: ScoredSeries) => b.score - a.score;

export function searchWholeDatabase(
  rawQuery: string,
  sources: WholeDatabaseSearchSources,
  limits: GlobalSearchLimits = {}
): GlobalDatabaseSearchResults {
  const q = normalizeDatabaseSearchText(rawQuery);
  if (!q) return EMPTY_RESULTS;
  const spacedQ = ` ${q}`;

  const limBooks = limits.books ?? 12;
  const limSeries = limits.series ?? 8;
  const limLeagues = limits.leagues ?? 10;
  const limClubs = limits.clubs ?? 24;
  const limPlayers = limits.players ?? 24;
  const limManagers = limits.managers ?? 18;
  const limStadiums = limits.stadiums ?? 18;

  const teamsIdx = getTeamsIndex(sources.teams);

  // 1. Books
  const topBooks: ScoredBook[] = [];
  if (limBooks > 0 && sources.publishedBooks && sources.publishedBooks.length > 0) {
    const booksIdx = getBooksIndex(sources.publishedBooks);
    for (let i = 0; i < booksIdx.length; i++) {
      const b = booksIdx[i];
      const s1 = scoreFieldFast(b.nTitle, q, spacedQ) * 1.4;
      const s2 = scoreFieldFast(b.nSeries, q, spacedQ) * 1.1;
      const s3 = scoreFieldFast(b.nAuthor, q, spacedQ);
      const s4 = scoreFieldFast(b.nDesc, q, spacedQ) * 0.7;
      const score = Math.max(s1, s2, s3, s4);
      if (score > 0) {
        insertTopK(topBooks, limBooks, { book: b.book, score }, compareBooks);
      }
    }
  }

  // 2. Series
  const topSeries: ScoredSeries[] = [];
  if (limSeries > 0 && sources.publishedSeries && sources.publishedSeries.length > 0) {
    const seriesIdx = getSeriesIndex(sources.publishedSeries);
    for (let i = 0; i < seriesIdx.length; i++) {
      const s = seriesIdx[i];
      const score = Math.max(
        scoreFieldFast(s.nTitle, q, spacedQ) * 1.4,
        scoreFieldFast(s.nDesc, q, spacedQ) * 0.7
      );
      if (score > 0) {
        insertTopK(topSeries, limSeries, { series: s.series, score }, compareSeries);
      }
    }
  }

  // 3. Leagues
  const topLeagues: SearchedLeagueItem[] = [];
  if (limLeagues > 0) {
    const rawLeagues =
      sources.representedLeagues && sources.representedLeagues.length > 0
        ? sources.representedLeagues
        : teamsIdx.derivedLeagues;
    const leaguesIdx = getLeaguesIndex(rawLeagues, sources.teams, teamsIdx.leagueCountryMap);
    for (let i = 0; i < leaguesIdx.length; i++) {
      const lg = leaguesIdx[i];
      const score = Math.max(
        scoreFieldFast(lg.nName, q, spacedQ) * 1.3,
        scoreFieldFast(lg.nCountry, q, spacedQ) * 0.85
      );
      if (score > 0) {
        insertTopK(
          topLeagues,
          limLeagues,
          { name: lg.name, count: lg.count, country: lg.country, score },
          compareLeagues
        );
      }
    }
  }

  // 4. Clubs & National Teams
  const topClubs: ScoredClub[] = [];
  if (limClubs > 0) {
    const clubsIdx = teamsIdx.clubs;
    for (let i = 0; i < clubsIdx.length; i++) {
      const c = clubsIdx[i];
      const s1 = scoreFieldFast(c.nName, q, spacedQ) * 1.4;
      const s2 = scoreFieldFast(c.nShort, q, spacedQ) * 1.35;
      const s3 = scoreFieldFast(c.nCode, q, spacedQ) * 1.2;
      const s4 = scoreFieldFast(c.nCountry, q, spacedQ) * c.countryWeight;
      const s5 = scoreFieldFast(c.nLeague, q, spacedQ) * 0.7;
      const s6 = scoreFieldFast(c.nStadium, q, spacedQ) * 0.7;
      const score = Math.max(s1, s2, s3, s4, s5, s6);
      if (score > 0) {
        insertTopK(
          topClubs,
          limClubs,
          { team: c.team, score, ovr: c.ovr },
          compareClubs
        );
      }
    }
  }

  // 5. Players (O(P) flat pre-normalized scan + O(1) active club lookup + bounded top-K)
  const topPlayers: SearchedPlayerItem[] = [];
  if (limPlayers > 0 && sources.registry && sources.registry.identities) {
    const playersIdx = getPlayersIndex(sources.registry, sources.teams, teamsIdx.teamNameById);
    for (let i = 0; i < playersIdx.length; i++) {
      const p = playersIdx[i];
      const sDisplay = scoreFieldFast(p.nDisplay, q, spacedQ) * 1.4;
      const sBase = p.nBase ? scoreFieldFast(p.nBase, q, spacedQ) * 1.35 : 0;
      const sFull = p.nFull ? scoreFieldFast(p.nFull, q, spacedQ) * 1.2 : 0;
      const sNick = p.nNick ? scoreFieldFast(p.nNick, q, spacedQ) * 1.3 : 0;
      const sNat = scoreFieldFast(p.nNat, q, spacedQ) * 0.7;
      const sPos = scoreFieldFast(p.nPos, q, spacedQ) * 0.65;
      const score = Math.max(sDisplay, sBase, sFull, sNick, sNat, sPos);
      if (score > 0) {
        // Quick threshold guard before creating object if topPlayers is already full
        if (topPlayers.length === limPlayers) {
          const tail = topPlayers[limPlayers - 1];
          if (score < tail.score || (score === tail.score && p.overallRating <= tail.overallRating)) {
            continue;
          }
        }
        insertTopK(
          topPlayers,
          limPlayers,
          {
            id: p.id,
            name: p.displayName,
            position: p.position,
            nationality: p.nationality,
            currentTeamName: p.currentTeamName,
            overallRating: p.overallRating,
            score,
          },
          comparePlayers
        );
      }
    }
  }

  // 6. Managers
  const topManagers: SearchedManagerItem[] = [];
  if (limManagers > 0 && sources.managers && sources.managers.length > 0) {
    const managersIdx = getManagersIndex(
      sources.managers,
      sources.managerAppointments,
      sources.teams,
      teamsIdx.teamNameById
    );
    for (let i = 0; i < managersIdx.length; i++) {
      const m = managersIdx[i];
      const score = Math.max(
        scoreFieldFast(m.nName, q, spacedQ) * 1.4,
        scoreFieldFast(m.nNat, q, spacedQ) * 0.7,
        scoreFieldFast(m.nTeam, q, spacedQ) * 0.9
      );
      if (score > 0) {
        insertTopK(
          topManagers,
          limManagers,
          {
            manager: m.manager,
            currentTeamName: m.currentTeamName,
            currentTeamId: m.currentTeamId,
            score,
          },
          compareManagers
        );
      }
    }
  }

  // 7. Stadiums
  const topStadiums: ScoredStadium[] = [];
  if (limStadiums > 0) {
    const stadiumsIdx = getStadiumsIndex(sources.stadiums || getAllStadiums());
    for (let i = 0; i < stadiumsIdx.length; i++) {
      const st = stadiumsIdx[i];
      const score = Math.max(
        scoreFieldFast(st.nName, q, spacedQ) * 1.4,
        scoreFieldFast(st.nCity, q, spacedQ) * 1.0,
        scoreFieldFast(st.nClub, q, spacedQ) * 1.15,
        scoreFieldFast(st.nCountry, q, spacedQ) * 0.75
      );
      if (score > 0) {
        insertTopK(
          topStadiums,
          limStadiums,
          {
            stadium: st.stadium,
            score,
            verifiedNum: st.verifiedNum,
            capacity: st.capacity,
          },
          compareStadiums
        );
      }
    }
  }

  const booksOut = topBooks.map((x) => x.book);
  const seriesOut = topSeries.map((x) => x.series);
  const clubsOut = topClubs.map((x) => x.team);
  const stadiumsOut = topStadiums.map((x) => x.stadium);

  return {
    books: booksOut,
    series: seriesOut,
    leagues: topLeagues,
    clubs: clubsOut,
    players: topPlayers,
    managers: topManagers,
    stadiums: stadiumsOut,
    totalCount:
      booksOut.length +
      seriesOut.length +
      topLeagues.length +
      clubsOut.length +
      topPlayers.length +
      topManagers.length +
      stadiumsOut.length,
  };
}

/**
 * Fast WeakMap-cached team filtering for modals, pickers, and context filters.
 * Avoids re-normalizing ~1,021 teams on every keystroke while supporting accents/diacritics.
 */
export function filterTeamsFast(
  teams: Team[],
  query: string,
  predicate?: (team: Team) => boolean,
  maxResults = Number.POSITIVE_INFINITY,
  includeExtendedFields = false
): Team[] {
  const q = normalizeDatabaseSearchText(query);
  const { clubs } = getTeamsIndex(teams);
  const results: Team[] = [];

  for (let i = 0; i < clubs.length; i++) {
    const c = clubs[i];
    if (predicate && !predicate(c.team)) continue;

    if (q) {
      const matchedBase =
        c.nName.includes(q) ||
        c.nShort.includes(q) ||
        c.nCode.includes(q) ||
        c.nCountry.includes(q) ||
        c.nLeague.includes(q) ||
        c.nConfed.includes(q);
      const matchedExtended =
        includeExtendedFields &&
        (c.nManager.includes(q) || c.nCaptain.includes(q) || c.nStadium.includes(q));
      if (!matchedBase && !matchedExtended) continue;
    }

    results.push(c.team);
    if (results.length >= maxResults) break;
  }

  return results;
}
