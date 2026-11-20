import {
  FreeAgentPlayer,
  GenderType,
  getPlayerDisplayName,
  Player,
  PlayerNationalRegistration,
  Team,
} from '../types/matchCentre';
import {
  createNationalFlagSvgDataUrl,
  FIFA_COUNTRY_METADATA,
  getCountryFlagUrl,
  getCountryMetadata,
  getCountrySlug,
  normalizeCountryName,
} from './countryMetadata';
import { getNationalFifaEntry } from './realFifaRankings';
import {
  selectBestFormationAndXiForSquad,
} from '../components/matchCentre/dossier/dossierUtils';
import { getSeededNationalManagerMeta } from './nationalManagersDatabase';
import { SUPPLEMENTAL_TM_NATIONAL_PLAYERS_BY_COUNTRY } from './supplementalTransfermarktNationalPlayers';

function selectBalancedNationalCallUps(candidates: Player[]): Player[] {
  if (candidates.length === 0) return [];
  const sorted = [...candidates].sort(
    (a, b) => b.overallRating - a.overallRating || a.age - b.age || a.name.localeCompare(b.name)
  );

  // Deduplicate by exact permanent player ID
  const uniqueMap = new Map<string, Player>();
  for (const p of sorted) {
    if (!uniqueMap.has(p.id)) {
      uniqueMap.set(p.id, p);
    }
  }
  const unique = Array.from(uniqueMap.values());
  if (unique.length <= 26) return unique;

  const gks = unique.filter((p) => p.position === 'GK').slice(0, 3);
  const defs = unique.filter((p) => p.position === 'DEF').slice(0, 8);
  const mids = unique.filter((p) => p.position === 'MID').slice(0, 8);
  const atts = unique.filter((p) => p.position === 'ATT').slice(0, 7);

  const chosenIds = new Set<string>();
  const picked: Player[] = [];
  for (const p of [...gks, ...defs, ...mids, ...atts]) {
    if (!chosenIds.has(p.id)) {
      chosenIds.add(p.id);
      picked.push(p);
    }
  }

  for (const p of unique) {
    if (picked.length >= 26) break;
    if (!chosenIds.has(p.id)) {
      chosenIds.add(p.id);
      picked.push(p);
    }
  }

  return picked;
}

function assignInternationalNumbersAndLeadership(
  calledUp: Player[],
  team: {
    id: string;
    name: string;
    code: string;
    country: string;
    flag: string;
    crestUrl: string;
    confederation: Team['confederation'];
  }
): {
  projectedSquad: Player[];
  registrations: PlayerNationalRegistration[];
  captainId?: string;
  captainName?: string;
  viceCaptainId?: string;
  viceCaptainName?: string;
} {
  if (calledUp.length === 0) {
    return { projectedSquad: [], registrations: [] };
  }

  // Assign international numbers cleanly (independent of club shirt numbers)
  const gks = calledUp.filter((p) => p.position === 'GK');
  const defs = calledUp.filter((p) => p.position === 'DEF');
  const mids = calledUp.filter((p) => p.position === 'MID');
  const atts = calledUp.filter((p) => p.position === 'ATT');

  const orderedForNumbers = [...gks, ...defs, ...mids, ...atts];
  const shirtMap = new Map<string, number>();
  const usedNumbers = new Set<number>();

  // Reserve #1 for top GK if present
  if (gks[0]) {
    shirtMap.set(gks[0].id, 1);
    usedNumbers.add(1);
  }

  // Next, try each remaining player's registered shirt number (1..26) in OVR order if unoccupied
  const byOvr = [...orderedForNumbers].sort((a, b) => b.overallRating - a.overallRating);
  for (const p of byOvr) {
    if (shirtMap.has(p.id)) continue;
    if (p.shirtNumber >= 2 && p.shirtNumber <= 26 && !usedNumbers.has(p.shirtNumber)) {
      shirtMap.set(p.id, p.shirtNumber);
      usedNumbers.add(p.shirtNumber);
    }
  }

  let nextNum = 2;
  for (const p of orderedForNumbers) {
    if (shirtMap.has(p.id)) continue;
    while (usedNumbers.has(nextNum)) nextNum++;
    shirtMap.set(p.id, nextNum);
    usedNumbers.add(nextNum);
    nextNum++;
  }

  // Pick international Captain & Vice-Captain by highest rating & seniority (age >= 22 preferred)
  const leadershipOrder = [...calledUp].sort(
    (a, b) =>
      b.overallRating - a.overallRating ||
      b.age - a.age ||
      a.name.localeCompare(b.name)
  );
  const cap = leadershipOrder[0];
  const vc = leadershipOrder[1];

  const projectedSquad: Player[] = [];
  const registrations: PlayerNationalRegistration[] = [];

  for (const p of orderedForNumbers) {
    const intlNum = shirtMap.get(p.id) || 99;
    const isCap = Boolean(cap && p.id === cap.id);
    const isVc = Boolean(vc && p.id === vc.id && p.id !== cap?.id);

    projectedSquad.push({
      ...p,
      shirtNumber: intlNum,
      isCaptain: isCap,
      isViceCaptain: isVc,
      captainSince: isCap ? '2024-09-01' : undefined,
      viceCaptainSince: isVc ? '2024-09-01' : undefined,
    });

    registrations.push({
      id: `nreg-${team.id}-${p.id}`,
      playerId: p.id,
      teamId: team.id,
      teamName: team.name,
      teamCode: team.code,
      teamCountry: team.country,
      teamFlag: team.flag,
      teamCrestUrl: team.crestUrl,
      confederation: team.confederation,
      team_type: 'country',
      status: 'called_up',
      shirtNumber: intlNum,
      isCaptain: isCap,
      isViceCaptain: isVc,
      captainSince: isCap ? '2024-09-01' : undefined,
      viceCaptainSince: isVc ? '2024-09-01' : undefined,
      calledUpAt: '2024-09-01',
      appearances: 0,
      goals: 0,
      assists: 0,
    });
  }

  return {
    projectedSquad,
    registrations,
    captainId: cap?.id,
    captainName: getPlayerDisplayName(cap) || undefined,
    viceCaptainId: vc?.id,
    viceCaptainName: getPlayerDisplayName(vc) || undefined,
  };
}

function computeNationalRatings(squad: Player[], targetOverall: number | null) {
  if (!squad || squad.length === 0) {
    const val = typeof targetOverall === 'number' && targetOverall > 0 ? Math.round(targetOverall) : 0;
    return {
      overallRating: val,
      attackRating: val,
      midfieldRating: val,
      defenceRating: val,
    };
  }
  const rawAvg = (arr: Player[]) =>
    arr.length ? arr.reduce((sum, p) => sum + p.overallRating, 0) / arr.length : 0;
  const squadAvg = rawAvg(squad);
  const clamp = (v: number) => Math.max(1, Math.min(99, Math.round(v)));
  const overallRating =
    typeof targetOverall === 'number' && targetOverall > 0 ? clamp(targetOverall) : clamp(squadAvg);
  const offset = overallRating - squadAvg;

  const atts = squad.filter((p) => p.position === 'ATT');
  const mids = squad.filter((p) => p.position === 'MID');
  const defs = squad.filter((p) => p.position === 'DEF' || p.position === 'GK');

  return {
    overallRating,
    attackRating: clamp((atts.length ? rawAvg(atts) : squadAvg) + offset),
    midfieldRating: clamp((mids.length ? rawAvg(mids) : squadAvg) + offset),
    defenceRating: clamp((defs.length ? rawAvg(defs) : squadAvg) + offset),
  };
}

export function buildNationalTeams(
  clubTeams: Team[],
  freeAgents: FreeAgentPlayer[]
): {
  nationalTeams: Team[];
  seededNationalRegistrations: PlayerNationalRegistration[];
} {
  // Index verified players by (canonicalCountry, gender)
  const playerPool = new Map<string, Player[]>();
  const poolCountryDisplayNames = new Map<string, string>();

  const addCandidate = (player: Player, gender: GenderType) => {
    if (player.internationalRetired) return;
    const canonicalCountry = normalizeCountryName(player.nationality);
    const lowerCountry = canonicalCountry.toLowerCase();
    if (!poolCountryDisplayNames.has(lowerCountry)) {
      poolCountryDisplayNames.set(lowerCountry, canonicalCountry);
    }
    const key = `${lowerCountry}::${gender}`;
    const list = playerPool.get(key) || [];
    list.push({ ...player, gender });
    playerPool.set(key, list);
  };

  for (const club of clubTeams) {
    for (const p of club.squad) {
      addCandidate(p, club.gender);
    }
  }
  for (const fa of freeAgents) {
    addCandidate(fa, fa.gender || 'men');
  }

  // Gather unique countries: all FIFA member countries + any country present in verified player pool
  const countriesMap = new Map<string, string>();
  for (const meta of FIFA_COUNTRY_METADATA) {
    countriesMap.set(meta.canonicalName.toLowerCase(), meta.canonicalName);
  }
  for (const [lowerCountry, displayCountry] of poolCountryDisplayNames.entries()) {
    if (!countriesMap.has(lowerCountry)) {
      countriesMap.set(lowerCountry, displayCountry);
    }
  }

  const nationalTeams: Team[] = [];
  const seededNationalRegistrations: PlayerNationalRegistration[] = [];
  const seenTeamKeys = new Set<string>();

  const genders: GenderType[] = ['men', 'women'];

  for (const canonicalCountry of countriesMap.values()) {
    const meta = getCountryMetadata(canonicalCountry);
    const fifaCode = meta?.fifaCode || canonicalCountry.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'INT';
    const flag = meta?.flag || '🏳️';
    const confederation = meta?.confederation || 'UEFA';
    const primaryColor = meta?.primaryColor || '#0E2439';
    const secondaryColor = meta?.secondaryColor || '#1E3A5F';
    const stadium = meta?.stadium || `${canonicalCountry} National Stadium`;
    const slug = getCountrySlug(canonicalCountry);

    for (const gender of genders) {
      const dedupKey = `${canonicalCountry.toLowerCase()}::${gender}`;
      if (seenTeamKeys.has(dedupKey)) continue;
      seenTeamKeys.add(dedupKey);

      const id = `nat-${gender}-${slug}`;
      const name = gender === 'women' ? `${canonicalCountry} Women` : canonicalCountry;
      const shortName = name;
      const crestUrl =
        getCountryFlagUrl(canonicalCountry, 160) ||
        createNationalFlagSvgDataUrl(fifaCode, primaryColor, secondaryColor, flag);

      const baseCandidates = playerPool.get(dedupKey) || [];
      const candidates = [...baseCandidates];
      if (gender === 'men') {
        const supplemental =
          SUPPLEMENTAL_TM_NATIONAL_PLAYERS_BY_COUNTRY[canonicalCountry] ||
          SUPPLEMENTAL_TM_NATIONAL_PLAYERS_BY_COUNTRY[canonicalCountry.toLowerCase()];
        if (supplemental && supplemental.length > 0) {
          const existingIds = new Set(candidates.map((p) => p.id));
          const existingNames = new Set(candidates.map((p) => p.name.toLowerCase().trim()));
          for (const sp of supplemental) {
            if (existingIds.has(sp.id) || existingNames.has(sp.name.toLowerCase().trim())) continue;
            candidates.push({
              ...(sp as unknown as Player),
              shortName: sp.shortName || sp.name.trim().split(/\s+/).slice(-1)[0] || sp.name,
              attributes: {
                pace: sp.pace,
                shooting: sp.shooting,
                passing: sp.passing,
                dribbling: sp.dribbling,
                defending: sp.defending,
                physical: sp.physical,
              },
            });
            existingIds.add(sp.id);
            existingNames.add(sp.name.toLowerCase().trim());
          }
        }
      }
      const calledUp = selectBalancedNationalCallUps(candidates);
      const {
        projectedSquad,
        registrations,
        captainId,
        captainName,
        viceCaptainId,
        viceCaptainName,
      } = assignInternationalNumbersAndLeadership(calledUp, {
        id,
        name,
        code: fifaCode,
        country: canonicalCountry,
        flag,
        crestUrl,
        confederation,
      });

      if (projectedSquad.length < 11) {
        continue;
      }

      seededNationalRegistrations.push(...registrations);

      const fifaEntry = getNationalFifaEntry(canonicalCountry, gender);
      const ratings = computeNationalRatings(projectedSquad, fifaEntry?.overall ?? null);
      const { formation: bestFormation, xiPlayers } = selectBestFormationAndXiForSquad(projectedSquad);

      const playingStyle =
        ratings.overallRating >= 85
          ? 'Possession & High Press'
          : ratings.overallRating >= 78
          ? 'Balanced International Control'
          : 'Structured Counter & Compact Block';

      const seededNationalManager = getSeededNationalManagerMeta(id);

      nationalTeams.push({
        id,
        name,
        shortName,
        code: fifaCode,
        type: 'national',
        team_type: 'country',
        country: canonicalCountry,
        flag,
        countryCode: fifaCode,
        league: undefined,
        confederation,
        gender,
        overallRating: ratings.overallRating,
        attackRating: ratings.attackRating,
        midfieldRating: ratings.midfieldRating,
        defenceRating: ratings.defenceRating,
        worldRanking: fifaEntry?.rank,
        rankingPoints: fifaEntry?.points,
        crestUrl,
        stadium,
        stadiumCapacity: 55000,
        foundedYear: 1920,
        manager: seededNationalManager?.managerName || 'National Team Coach',
        manager_since: seededNationalManager?.startDate,
        manager_role: seededNationalManager?.role,
        captainName,
        captainId,
        captainSince: captainId ? '2024-09-01' : undefined,
        viceCaptainName,
        viceCaptainId,
        viceCaptainSince: viceCaptainId ? '2024-09-01' : undefined,
        playingStyle,
        primaryColor,
        secondaryColor,
        preferredXiIds: xiPlayers.map((p) => p.id),
        preferredXiSource: 'verified',
        squad: projectedSquad,
        defaultFormation: bestFormation,
        description:
          projectedSquad.length > 0
            ? `${name} (${confederation}) national football team featuring ${projectedSquad.length} verified eligible players from the Match Centre database.`
            : `${name} (${confederation}) national football association. Verified squad players have not yet been called up.`,
      });
    }
  }

  return { nationalTeams, seededNationalRegistrations };
}
