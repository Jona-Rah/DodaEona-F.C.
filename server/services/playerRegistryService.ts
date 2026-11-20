import {
  addBallonDorToIdentity,
  buildCanonicalRegistry,
  buildPlayerProfileView,
  CanonicalRegistry,
  changePlayerNation,
  deletePlayerIdentitySafe,
  deriveClubFreeAgents,
  getClubRegistrationsForPlayer,
  getNationalRegistrationsForPlayer,
  playerToIdentity,
  projectRegistryOntoTeams,
  registerPlayerToTeam,
  releasePlayerFromTeam,
  retirePlayerFromNation,
  transferPlayerClubOnly,
  unretirePlayerFromNation,
  updateTeamRegistration,
} from '../../src/data/playerRegistry';
import {
  FREE_AGENTS_DATABASE,
  SEEDED_NATIONAL_REGISTRATIONS,
  TEAMS_DATABASE,
} from '../../src/data/teamsDatabase';
import { normalizeCountryName } from '../../src/data/countryMetadata';
import { makePitchShortName } from '../../src/data/playerNicknames';
import {
  calculateAgeFromDob,
  FreeAgentPlayer,
  getPlayerDisplayName,
  getTeamType,
  PlayerClubRegistration,
  PlayerIdentity,
  PlayerNationalRegistration,
  PlayerPosition,
  PlayerProfileView,
  resolvePlayerAge,
  Team,
  TeamTypeCode,
} from '../../src/types/matchCentre';
import type { ServerDatabase } from '../types';
import { bumpDbRevision, getDbRevision } from '../store';
import { syncManagersOntoTeams } from './managerService';

export interface LiveRegistryBundle {
  rawTeams: Team[];
  projectedTeams: Team[];
  freeAgents: FreeAgentPlayer[];
  registry: CanonicalRegistry;
}

let cachedBundle: LiveRegistryBundle | null = null;
let cachedBundleDbRef: ServerDatabase | null = null;
let cachedBundleRevision = -1;

export function invalidateLiveRegistryBundleCache(): void {
  cachedBundle = null;
  cachedBundleDbRef = null;
  cachedBundleRevision = -1;
}

export function buildLiveRegistryBundle(db: ServerDatabase): LiveRegistryBundle {
  const rev = getDbRevision();
  if (cachedBundle && cachedBundleDbRef === db && cachedBundleRevision === rev) {
    return cachedBundle;
  }

  const deletedTeamSet = new Set(db.deletedTeamIds || []);
  const overrides = db.teamOverrides || {};
  const customTeams = Array.isArray(db.customTeams) ? (db.customTeams as Team[]) : [];

  const mergedBuiltIns: Team[] = TEAMS_DATABASE.filter((t) => !deletedTeamSet.has(t.id)).map((t) =>
    overrides[t.id] ? { ...t, ...overrides[t.id], team_type: getTeamType(overrides[t.id]) } : t
  );
  const customFiltered: Team[] = customTeams
    .filter((t) => !deletedTeamSet.has(t.id))
    .map((t) => ({ ...t, team_type: getTeamType(t) }));

  const rawTeams = [...mergedBuiltIns, ...customFiltered];
  const baseFreeAgents: FreeAgentPlayer[] =
    Array.isArray(db.freeAgents) && db.freeAgents.length > 0
      ? (db.freeAgents as FreeAgentPlayer[])
      : FREE_AGENTS_DATABASE;

  const registry = buildCanonicalRegistry({
    teams: rawTeams,
    freeAgents: baseFreeAgents,
    seededNationalRegistrations: SEEDED_NATIONAL_REGISTRATIONS,
    delta: {
      playerIdentityOverrides: db.playerIdentityOverrides || {},
      deletedPlayerIdentityIds: db.deletedPlayerIdentityIds || [],
      clubRegistrations: db.clubRegistrations || [],
      nationalRegistrations: db.nationalRegistrations || [],
    },
  });

  const projectedTeams = syncManagersOntoTeams(projectRegistryOntoTeams(rawTeams, registry), db);
  const freeAgents = deriveClubFreeAgents(registry, baseFreeAgents);

  const bundle: LiveRegistryBundle = { rawTeams, projectedTeams, freeAgents, registry };
  cachedBundle = bundle;
  cachedBundleDbRef = db;
  cachedBundleRevision = rev;
  return bundle;
}

function upsertClubDelta(db: ServerDatabase, reg: PlayerClubRegistration) {
  if (!Array.isArray(db.clubRegistrations)) db.clubRegistrations = [];
  const idx = db.clubRegistrations.findIndex((r: PlayerClubRegistration) => r.id === reg.id);
  if (idx >= 0) {
    db.clubRegistrations[idx] = reg;
  } else {
    db.clubRegistrations.push(reg);
  }
  bumpDbRevision();
}

function upsertNationalDelta(db: ServerDatabase, reg: PlayerNationalRegistration) {
  if (!Array.isArray(db.nationalRegistrations)) db.nationalRegistrations = [];
  const idx = db.nationalRegistrations.findIndex(
    (r: PlayerNationalRegistration) => r.id === reg.id
  );
  if (idx >= 0) {
    db.nationalRegistrations[idx] = reg;
  } else {
    db.nationalRegistrations.push(reg);
  }
  bumpDbRevision();
}

export function searchPublicPlayers(
  db: ServerDatabase,
  query: {
    q?: string;
    nationality?: string;
    gender?: 'all' | 'men' | 'women';
    teamId?: string;
    limit?: number;
  }
) {
  const { registry, projectedTeams } = buildLiveRegistryBundle(db);
  const q = (query.q || '').trim().toLowerCase();
  const natFilter = query.nationality ? normalizeCountryName(query.nationality).toLowerCase() : '';
  const genderFilter = query.gender || 'all';
  const teamIdFilter = (query.teamId || '').trim();
  const limit = Math.min(200, Math.max(1, Number(query.limit) || 60));

  const teamFilterIds = new Set<string>();
  if (teamIdFilter) {
    const team = projectedTeams.find((t) => t.id === teamIdFilter);
    team?.squad.forEach((p) => teamFilterIds.add(p.id));
  }

  const results: Array<{
    id: string;
    name: string;
    nickname: string;
    fullName?: string;
    shortName: string;
    position: PlayerPosition;
    positionDetail: string;
    overallRating: number;
    dateOfBirth?: string;
    age: number;
    nationality: string;
    gender: 'men' | 'women';
    activeClubName: string | null;
    activeClubId: string | null;
    activeNationalName: string | null;
    activeNationalId: string | null;
    activeNationalFlag?: string;
    ballonDorCount: number;
    injuryStatus: string;
  }> = [];

  for (const identity of registry.identities.values()) {
    if (genderFilter !== 'all' && identity.gender !== genderFilter) continue;
    if (natFilter && identity.nationality.toLowerCase() !== natFilter) continue;
    if (teamIdFilter && !teamFilterIds.has(identity.id)) continue;

    if (q) {
      const hay = `${identity.name} ${identity.nickname || ''} ${identity.fullName || ''} ${identity.nationality} ${identity.positionDetail}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }

    const activeClub = getClubRegistrationsForPlayer(registry, identity.id).find(
      (r) => r.status === 'active'
    );
    const activeNat = getNationalRegistrationsForPlayer(registry, identity.id).find(
      (r) => r.status === 'called_up'
    );
    const displayName = getPlayerDisplayName(identity);

    results.push({
      id: identity.id,
      name: displayName,
      nickname: displayName,
      fullName: identity.fullName,
      shortName: identity.shortName,
      position: identity.position,
      positionDetail: identity.positionDetail,
      overallRating: identity.overallRating,
      dateOfBirth: identity.dateOfBirth,
      age: resolvePlayerAge(identity.dateOfBirth, identity.age),
      nationality: identity.nationality,
      gender: identity.gender,
      activeClubName: activeClub?.teamName || null,
      activeClubId: activeClub?.teamId || null,
      activeNationalName: activeNat?.teamName || null,
      activeNationalId: activeNat?.teamId || null,
      activeNationalFlag: activeNat?.teamFlag,
      ballonDorCount: identity.ballonDorWins?.length || 0,
      injuryStatus: identity.injuryStatus || 'fit',
    });
  }

  results.sort((a, b) => b.overallRating - a.overallRating || a.name.localeCompare(b.name));
  return {
    total: results.length,
    players: results.slice(0, limit),
  };
}

export function getPublicPlayerProfile(
  db: ServerDatabase,
  playerId: string
): PlayerProfileView | null {
  const { registry, projectedTeams } = buildLiveRegistryBundle(db);
  return buildPlayerProfileView(playerId, registry, projectedTeams, db.simulationMatches || []);
}

export function createAdminPlayerIdentity(
  db: ServerDatabase,
  payload: Record<string, any>
): { ok: boolean; status: number; error?: string; profile?: PlayerProfileView | null } {
  const nickname = String(payload.nickname || payload.name || '').trim();
  const fullName = String(payload.fullName || payload.name || nickname).trim();
  const name = nickname || fullName;
  if (!name) {
    return { ok: false, status: 400, error: 'Player name or nickname is required.' };
  }

  const bundle = buildLiveRegistryBundle(db);
  const { registry, rawTeams } = bundle;

  const id =
    typeof payload.id === 'string' && payload.id.trim()
      ? payload.id.trim()
      : `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  if (registry.identities.has(id)) {
    return { ok: false, status: 409, error: `Player identity '${id}' already exists.` };
  }

  const shortName = String(payload.shortName || makePitchShortName(name)).trim();
  const pos: PlayerPosition = ['GK', 'DEF', 'MID', 'ATT'].includes(payload.position)
    ? payload.position
    : 'MID';
  const ovr = Math.min(99, Math.max(40, Number(payload.overallRating) || 75));
  const gender = payload.gender === 'women' ? 'women' : 'men';
  const nationality = normalizeCountryName(String(payload.nationality || 'International'));
  const nowIso = new Date().toISOString();

  const dateOfBirth = payload.dateOfBirth ? String(payload.dateOfBirth).trim() || undefined : undefined;
  const dobAge = calculateAgeFromDob(dateOfBirth);
  const fallbackAge = Math.min(55, Math.max(14, Number(payload.age) || 22));

  const identity: PlayerIdentity = {
    id,
    name,
    nickname: name,
    shortName,
    fullName: fullName || name,
    dateOfBirth,
    age: dobAge !== null ? dobAge : fallbackAge,
    nationality,
    secondaryNationality: payload.secondaryNationality
      ? normalizeCountryName(String(payload.secondaryNationality))
      : undefined,
    gender,
    position: pos,
    positionDetail: String(payload.positionDetail || (pos === 'GK' ? 'GK' : pos === 'DEF' ? 'CB' : pos === 'MID' ? 'CM' : 'ST')).toUpperCase(),
    overallRating: ovr,
    preferredFoot: payload.preferredFoot === 'Left' ? 'Left' : payload.preferredFoot === 'Right' ? 'Right' : undefined,
    heightCm: payload.heightCm ? Number(payload.heightCm) : undefined,
    portraitUrl: payload.portraitUrl ? String(payload.portraitUrl).trim() : undefined,
    injuryStatus: ['fit', 'doubtful', 'injured'].includes(payload.injuryStatus)
      ? payload.injuryStatus
      : 'fit',
    injuryNote: payload.injuryNote ? String(payload.injuryNote) : undefined,
    injuryReturnDate: payload.injuryReturnDate ? String(payload.injuryReturnDate) : undefined,
    injuryHistory: Array.isArray(payload.injuryHistory) ? payload.injuryHistory : [],
    attributes: payload.attributes || {
      pace: pos === 'GK' ? 50 : Math.min(99, ovr),
      shooting: pos === 'ATT' ? ovr : Math.max(35, ovr - 12),
      passing: Math.max(40, ovr - 4),
      dribbling: Math.max(40, ovr - 3),
      defending: pos === 'DEF' ? ovr : Math.max(35, ovr - 15),
      physical: Math.max(45, ovr - 5),
    },
    gkAttributes: payload.gkAttributes,
    ballonDorWins: Array.isArray(payload.ballonDorWins) ? payload.ballonDorWins : [],
    legacyClubStats: payload.legacyClubStats,
    legacyInternationalStats: payload.legacyInternationalStats,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  if (!db.playerIdentityOverrides) db.playerIdentityOverrides = {};
  db.playerIdentityOverrides[id] = identity;
  registry.identities.set(id, identity);
  bumpDbRevision();

  // If initial teamId supplied, register via team.team_type
  if (payload.teamId) {
    const team = rawTeams.find((t) => t.id === payload.teamId);
    if (!team) {
      return { ok: false, status: 404, error: 'Target registration team not found.' };
    }
    const res = registerPlayerToTeam(registry, {
      playerId: id,
      team,
      shirtNumber: payload.shirtNumber ? Number(payload.shirtNumber) : undefined,
      isCaptain: Boolean(payload.isCaptain),
      isViceCaptain: Boolean(payload.isViceCaptain),
    });
    if (!res.ok) {
      delete db.playerIdentityOverrides[id];
      return { ok: false, status: res.status, error: res.error };
    }
    if (getTeamType(team) === 'club') {
      upsertClubDelta(db, res.data as PlayerClubRegistration);
    } else {
      upsertNationalDelta(db, res.data as PlayerNationalRegistration);
    }
  }

  return { ok: true, status: 201, profile: getPublicPlayerProfile(db, id) };
}

export function updateAdminPlayerIdentity(
  db: ServerDatabase,
  playerId: string,
  patch: Record<string, any>
): { ok: boolean; status: number; error?: string; profile?: PlayerProfileView | null } {
  const { registry } = buildLiveRegistryBundle(db);
  const existing = registry.identities.get(playerId);
  if (!existing) {
    return { ok: false, status: 404, error: 'Player identity not found.' };
  }

  const incomingNickname =
    typeof patch.nickname === 'string' && patch.nickname.trim()
      ? patch.nickname.trim()
      : typeof patch.name === 'string' && patch.name.trim()
      ? patch.name.trim()
      : undefined;

  const hasExplicitDobPatch = typeof patch.dateOfBirth === 'string';
  const trimmedPatchDob = hasExplicitDobPatch ? patch.dateOfBirth.trim() : '';
  const nextDateOfBirth = hasExplicitDobPatch ? trimmedPatchDob || undefined : existing.dateOfBirth;
  const derivedDobAge = calculateAgeFromDob(nextDateOfBirth);
  const fallbackAge =
    patch.age !== undefined
      ? Math.min(55, Math.max(14, Number(patch.age) || existing.age))
      : existing.age;
  const nextAge = derivedDobAge !== null ? derivedDobAge : fallbackAge;

  const next: PlayerIdentity = {
    ...existing,
    ...(incomingNickname
      ? {
          name: incomingNickname,
          nickname: incomingNickname,
          shortName:
            typeof patch.shortName === 'string' && patch.shortName.trim()
              ? patch.shortName.trim()
              : makePitchShortName(incomingNickname),
        }
      : typeof patch.shortName === 'string' && patch.shortName.trim()
      ? { shortName: patch.shortName.trim() }
      : {}),
    ...(typeof patch.fullName === 'string' && patch.fullName.trim()
      ? { fullName: patch.fullName.trim() }
      : {}),
    ...(hasExplicitDobPatch ? { dateOfBirth: trimmedPatchDob } : {}),
    age: nextAge,
    ...(typeof patch.nationality === 'string' && patch.nationality.trim()
      ? { nationality: normalizeCountryName(patch.nationality) }
      : {}),
    ...(typeof patch.secondaryNationality === 'string'
      ? {
          secondaryNationality: patch.secondaryNationality.trim()
            ? normalizeCountryName(patch.secondaryNationality)
            : undefined,
        }
      : {}),
    ...(patch.gender === 'men' || patch.gender === 'women' ? { gender: patch.gender } : {}),
    ...(patch.position && ['GK', 'DEF', 'MID', 'ATT'].includes(patch.position)
      ? { position: patch.position }
      : {}),
    ...(typeof patch.positionDetail === 'string' && patch.positionDetail.trim()
      ? { positionDetail: patch.positionDetail.trim().toUpperCase() }
      : {}),
    ...(patch.overallRating !== undefined
      ? { overallRating: Math.min(99, Math.max(40, Number(patch.overallRating) || existing.overallRating)) }
      : {}),
    ...(patch.preferredFoot === 'Left' || patch.preferredFoot === 'Right'
      ? { preferredFoot: patch.preferredFoot }
      : {}),
    ...(patch.heightCm !== undefined
      ? { heightCm: Number(patch.heightCm) || undefined }
      : {}),
    ...(typeof patch.portraitUrl === 'string'
      ? { portraitUrl: patch.portraitUrl.trim() || undefined }
      : {}),
    ...(patch.attributes ? { attributes: { ...existing.attributes, ...patch.attributes } } : {}),
    ...(patch.gkAttributes ? { gkAttributes: { ...existing.gkAttributes, ...patch.gkAttributes } } : {}),
    ...(patch.injuryStatus && ['fit', 'doubtful', 'injured'].includes(patch.injuryStatus)
      ? { injuryStatus: patch.injuryStatus }
      : {}),
    ...(patch.injuryNote !== undefined ? { injuryNote: patch.injuryNote || undefined } : {}),
    ...(patch.injuryReturnDate !== undefined
      ? { injuryReturnDate: patch.injuryReturnDate || undefined }
      : {}),
    ...(Array.isArray(patch.injuryHistory) ? { injuryHistory: patch.injuryHistory } : {}),
    ...(Array.isArray(patch.ballonDorWins) ? { ballonDorWins: patch.ballonDorWins } : {}),
    ...(patch.legacyClubStats ? { legacyClubStats: patch.legacyClubStats } : {}),
    ...(patch.legacyInternationalStats
      ? { legacyInternationalStats: patch.legacyInternationalStats }
      : {}),
    ...(patch.internationalRetired !== undefined
      ? { internationalRetired: Boolean(patch.internationalRetired) }
      : {}),
    ...(patch.internationalRetiredAt !== undefined
      ? { internationalRetiredAt: patch.internationalRetiredAt || undefined }
      : {}),
    updatedAt: new Date().toISOString(),
  };

  if (patch.addBallonDorWin && typeof patch.addBallonDorWin === 'object') {
    const withWin = addBallonDorToIdentity(next, {
      year: Number(patch.addBallonDorWin.year) || new Date().getFullYear(),
      teamId: patch.addBallonDorWin.teamId,
      teamName: String(patch.addBallonDorWin.teamName || 'Unattached'),
      team_type: patch.addBallonDorWin.team_type,
      note: patch.addBallonDorWin.note ? String(patch.addBallonDorWin.note) : undefined,
    });
    next.ballonDorWins = withWin.ballonDorWins;
  }

  if (patch.removeBallonDorWinId) {
    next.ballonDorWins = (next.ballonDorWins || []).filter(
      (w) => w.id !== String(patch.removeBallonDorWinId)
    );
  }

  if (!db.playerIdentityOverrides) db.playerIdentityOverrides = {};
  db.playerIdentityOverrides[playerId] = next;
  bumpDbRevision();

  return { ok: true, status: 200, profile: getPublicPlayerProfile(db, playerId) };
}

export function deleteAdminPlayerIdentity(
  db: ServerDatabase,
  playerId: string
): { ok: boolean; status: number; error?: string } {
  const { registry } = buildLiveRegistryBundle(db);
  const res = deletePlayerIdentitySafe(registry, playerId);
  if (!res.ok) return { ok: false, status: res.status, error: res.error };

  if (!Array.isArray(db.deletedPlayerIdentityIds)) db.deletedPlayerIdentityIds = [];
  if (!db.deletedPlayerIdentityIds.includes(playerId)) {
    db.deletedPlayerIdentityIds.push(playerId);
  }
  if (db.playerIdentityOverrides && db.playerIdentityOverrides[playerId]) {
    delete db.playerIdentityOverrides[playerId];
  }
  bumpDbRevision();
  return { ok: true, status: 200 };
}

export function registerAdminPlayerToTeam(
  db: ServerDatabase,
  params: {
    playerId: string;
    teamId: string;
    shirtNumber?: number | null;
    isCaptain?: boolean;
    isViceCaptain?: boolean;
    joinedOrCalledUpAt?: string;
  }
) {
  const { registry, projectedTeams } = buildLiveRegistryBundle(db);
  const team = projectedTeams.find((t) => t.id === params.teamId);
  if (!team) {
    return { ok: false, status: 404, error: 'Team not found.' };
  }

  const tType = getTeamType(team);
  const beforeClubCaps =
    tType === 'club'
      ? Array.from(registry.clubRegistrations.values()).filter((r) => r.teamId === team.id)
      : [];
  const beforeNatCaps =
    tType === 'country'
      ? Array.from(registry.nationalRegistrations.values()).filter((r) => r.teamId === team.id)
      : [];

  const res = registerPlayerToTeam(registry, {
    playerId: params.playerId,
    team,
    shirtNumber: params.shirtNumber,
    isCaptain: params.isCaptain,
    isViceCaptain: params.isViceCaptain,
    joinedOrCalledUpAt: params.joinedOrCalledUpAt,
  });
  if (!res.ok || !res.data) {
    return { ok: false, status: res.status, error: res.error };
  }

  if (tType === 'club') {
    for (const r of beforeClubCaps) {
      upsertClubDelta(db, r);
    }
    if (res.data.team_type === 'club') {
      upsertClubDelta(db, res.data);
    }
  } else {
    for (const r of beforeNatCaps) {
      upsertNationalDelta(db, r);
    }
    if (res.data.team_type === 'country') {
      upsertNationalDelta(db, res.data);
    }
  }

  return {
    ok: true,
    status: 201,
    registration: res.data,
    profile: getPublicPlayerProfile(db, params.playerId),
  };
}

export function transferAdminPlayerClub(
  db: ServerDatabase,
  params: {
    playerId: string;
    fromTeamId: string;
    toTeamId: string;
    shirtNumber?: number | null;
    transferDate?: string;
  }
) {
  const { registry, projectedTeams } = buildLiveRegistryBundle(db);
  const fromTeam = projectedTeams.find((t) => t.id === params.fromTeamId);
  const toTeam = projectedTeams.find((t) => t.id === params.toTeamId);
  if (!fromTeam || !toTeam) {
    return { ok: false, status: 404, error: 'Source or destination team not found.' };
  }

  const res = transferPlayerClubOnly(registry, {
    playerId: params.playerId,
    fromTeam,
    toTeam,
    shirtNumber: params.shirtNumber,
    transferDate: params.transferDate,
  });

  if (!res.ok || !res.data) {
    return { ok: false, status: res.status, error: res.error };
  }

  upsertClubDelta(db, res.data.former);
  upsertClubDelta(db, res.data.current);

  return {
    ok: true,
    status: 200,
    former: res.data.former,
    current: res.data.current,
    profile: getPublicPlayerProfile(db, params.playerId),
  };
}

export function updateAdminRegistration(
  db: ServerDatabase,
  registrationId: string,
  teamType: TeamTypeCode,
  patch: Record<string, any>
) {
  const { registry, projectedTeams } = buildLiveRegistryBundle(db);
  const reg =
    teamType === 'club'
      ? registry.clubRegistrations.get(registrationId)
      : registry.nationalRegistrations.get(registrationId);
  if (!reg) {
    return { ok: false, status: 404, error: 'Registration record not found.' };
  }
  const team = projectedTeams.find((t) => t.id === reg.teamId);

  const peersBeforeClub =
    teamType === 'club'
      ? Array.from(registry.clubRegistrations.values()).filter((r) => r.teamId === reg.teamId)
      : [];
  const peersBeforeNat =
    teamType === 'country'
      ? Array.from(registry.nationalRegistrations.values()).filter((r) => r.teamId === reg.teamId)
      : [];

  const res = updateTeamRegistration(registry, {
    registrationId,
    teamType,
    team,
    patch: {
      shirtNumber:
        patch.shirtNumber !== undefined
          ? patch.shirtNumber === null
            ? null
            : Number(patch.shirtNumber)
          : undefined,
      isCaptain: patch.isCaptain,
      isViceCaptain: patch.isViceCaptain,
      status: patch.status,
      appearances: patch.appearances !== undefined ? Number(patch.appearances) : undefined,
      goals: patch.goals !== undefined ? Number(patch.goals) : undefined,
      assists: patch.assists !== undefined ? Number(patch.assists) : undefined,
    },
  });

  if (!res.ok || !res.data) {
    return { ok: false, status: res.status, error: res.error };
  }

  if (teamType === 'club') {
    for (const r of peersBeforeClub) upsertClubDelta(db, r);
    if (res.data.team_type === 'club') upsertClubDelta(db, res.data);
  } else {
    for (const r of peersBeforeNat) upsertNationalDelta(db, r);
    if (res.data.team_type === 'country') upsertNationalDelta(db, res.data);
  }

  return {
    ok: true,
    status: 200,
    registration: res.data,
    profile: getPublicPlayerProfile(db, res.data.playerId),
  };
}

export function syncTeamShirtNumbersToRegistry(
  db: ServerDatabase,
  teamId: string,
  numbersMap: Record<string, number>
) {
  const { registry, projectedTeams } = buildLiveRegistryBundle(db);
  const team = projectedTeams.find((t) => t.id === teamId);
  if (!team) return;
  const tType = getTeamType(team);
  if (tType === 'club') {
    for (const reg of registry.clubRegistrations.values()) {
      if (reg.teamId === teamId && reg.status === 'active' && numbersMap[reg.playerId] !== undefined) {
        reg.shirtNumber = numbersMap[reg.playerId];
        upsertClubDelta(db, reg);
      }
    }
  } else {
    for (const reg of registry.nationalRegistrations.values()) {
      if (reg.teamId === teamId && reg.status === 'called_up' && numbersMap[reg.playerId] !== undefined) {
        reg.shirtNumber = numbersMap[reg.playerId];
        upsertNationalDelta(db, reg);
      }
    }
  }
}

export function releaseAdminRegistration(
  db: ServerDatabase,
  registrationId: string,
  teamType?: TeamTypeCode
) {
  const { registry, projectedTeams } = buildLiveRegistryBundle(db);

  let resolvedType: TeamTypeCode | undefined = teamType;
  let existing =
    resolvedType === 'club'
      ? registry.clubRegistrations.get(registrationId)
      : resolvedType === 'country'
      ? registry.nationalRegistrations.get(registrationId)
      : undefined;

  if (!existing) {
    if (registry.clubRegistrations.has(registrationId)) {
      resolvedType = 'club';
      existing = registry.clubRegistrations.get(registrationId);
    } else if (registry.nationalRegistrations.has(registrationId)) {
      resolvedType = 'country';
      existing = registry.nationalRegistrations.get(registrationId);
    }
  }

  if (!existing || !resolvedType) {
    return { ok: false, status: 404, error: 'Registration record not found.' };
  }

  const team = projectedTeams.find((t) => t.id === existing!.teamId);
  if (!team) {
    // Allow marking former even if custom team was removed
    existing.status = 'former';
    existing.leftAt = new Date().toISOString().slice(0, 10);
    existing.isCaptain = false;
    existing.isViceCaptain = false;
    if (resolvedType === 'club') {
      upsertClubDelta(db, existing as PlayerClubRegistration);
    } else {
      upsertNationalDelta(db, existing as PlayerNationalRegistration);
    }
    return {
      ok: true,
      status: 200,
      registration: existing,
      profile: getPublicPlayerProfile(db, existing.playerId),
    };
  }

  const res = releasePlayerFromTeam(registry, {
    playerId: existing.playerId,
    team,
  });

  if (!res.ok || !res.data) {
    return { ok: false, status: res.status, error: res.error };
  }

  if (resolvedType === 'club') {
    upsertClubDelta(db, res.data as PlayerClubRegistration);
  } else {
    upsertNationalDelta(db, res.data as PlayerNationalRegistration);
  }

  return {
    ok: true,
    status: 200,
    registration: res.data,
    profile: getPublicPlayerProfile(db, existing.playerId),
  };
}

export function deleteAdminRegistrationRecord(
  db: ServerDatabase,
  registrationId: string,
  teamType?: TeamTypeCode
) {
  const { registry } = buildLiveRegistryBundle(db);
  let resolvedType: TeamTypeCode | undefined = teamType;
  let existing =
    resolvedType === 'club'
      ? registry.clubRegistrations.get(registrationId)
      : resolvedType === 'country'
      ? registry.nationalRegistrations.get(registrationId)
      : undefined;

  if (!existing) {
    if (registry.clubRegistrations.has(registrationId)) {
      resolvedType = 'club';
      existing = registry.clubRegistrations.get(registrationId);
    } else if (registry.nationalRegistrations.has(registrationId)) {
      resolvedType = 'country';
      existing = registry.nationalRegistrations.get(registrationId);
    }
  }

  if (!existing || !resolvedType) {
    return { ok: false, status: 404, error: 'Registration record not found.' };
  }

  if (resolvedType === 'club') {
    upsertClubDelta(db, {
      ...(existing as PlayerClubRegistration),
      _deleted: true,
    } as PlayerClubRegistration);
  } else {
    upsertNationalDelta(db, {
      ...(existing as PlayerNationalRegistration),
      _deleted: true,
    } as PlayerNationalRegistration);
  }

  return {
    ok: true,
    status: 200,
    profile: getPublicPlayerProfile(db, existing.playerId),
  };
}

export function retireAdminPlayerFromNation(
  db: ServerDatabase,
  playerId: string,
  opts?: { retired?: boolean; retiredAt?: string }
) {
  const { registry } = buildLiveRegistryBundle(db);
  if (opts?.retired === false) {
    const res = unretirePlayerFromNation(registry, playerId);
    if (!res.ok || !res.data) {
      return { ok: false, status: res.status, error: res.error };
    }
    if (!db.playerIdentityOverrides) db.playerIdentityOverrides = {};
    db.playerIdentityOverrides[playerId] = res.data;
    bumpDbRevision();
    return { ok: true, status: 200, profile: getPublicPlayerProfile(db, playerId) };
  }

  const res = retirePlayerFromNation(registry, { playerId, retiredAt: opts?.retiredAt });
  if (!res.ok || !res.data) {
    return { ok: false, status: res.status, error: res.error };
  }
  if (!db.playerIdentityOverrides) db.playerIdentityOverrides = {};
  db.playerIdentityOverrides[playerId] = res.data.identity;
  for (const reg of res.data.releasedRegistrations) {
    upsertNationalDelta(db, reg);
  }
  bumpDbRevision();
  return { ok: true, status: 200, profile: getPublicPlayerProfile(db, playerId) };
}

export function changeAdminPlayerNation(
  db: ServerDatabase,
  params: {
    playerId: string;
    nationality: string;
    newNationalTeamId?: string;
    switchNationalSquad?: boolean;
    shirtNumber?: number | null;
    effectiveDate?: string;
  }
) {
  const { registry, projectedTeams } = buildLiveRegistryBundle(db);
  const existing = registry.identities.get(params.playerId);
  if (!existing) {
    return { ok: false, status: 404, error: 'Player identity not found.' };
  }

  const normalizedTarget = normalizeCountryName(params.nationality || '');
  const targetNationTeam = params.newNationalTeamId
    ? projectedTeams.find((t) => t.id === params.newNationalTeamId) || null
    : projectedTeams.find(
        (t) =>
          getTeamType(t) === 'country' &&
          t.gender === existing.gender &&
          normalizeCountryName(t.country).toLowerCase() === normalizedTarget.toLowerCase()
      ) || null;

  const res = changePlayerNation(registry, {
    playerId: params.playerId,
    newNationality: params.nationality,
    newNationalTeam: targetNationTeam,
    switchNationalSquad: params.switchNationalSquad ?? true,
    shirtNumber: params.shirtNumber,
    effectiveDate: params.effectiveDate,
  });
  if (!res.ok || !res.data) {
    return { ok: false, status: res.status, error: res.error };
  }

  if (!db.playerIdentityOverrides) db.playerIdentityOverrides = {};
  db.playerIdentityOverrides[params.playerId] = res.data.identity;
  for (const reg of res.data.modifiedNationalRegistrations) {
    upsertNationalDelta(db, reg);
  }
  bumpDbRevision();

  return { ok: true, status: 200, profile: getPublicPlayerProfile(db, params.playerId) };
}
