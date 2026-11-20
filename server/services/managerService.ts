import { TEAMS_DATABASE } from '../../src/data/teamsDatabase';
import {
  calculateAgeFromDob,
  EnrichedManagerRecord,
  Manager,
  ManagerAppointment,
  ManagerAppointmentRole,
  ManagerAppointmentStatistics,
  ManagerStatisticsResponse,
  ManagerStatus,
  ManagerTeamSummary,
  parsePhilosophyJson,
  serializePhilosophyJson,
} from '../../src/types/manager';
import { getTeamType, ManagerHistoryEntry, Team } from '../../src/types/matchCentre';
import type { ServerDatabase, SimulationMatchRecord } from '../types';

const VALID_ROLES: ManagerAppointmentRole[] = ['head-coach', 'interim', 'caretaker', 'assistant'];
const VALID_STATUSES: ManagerStatus[] = ['active', 'unattached', 'retired'];

function resolveRawAndProjectedTeams(db: ServerDatabase): Team[] {
  const deletedSet = new Set(db.deletedTeamIds || []);
  const overrides = db.teamOverrides || {};
  const customTeams = Array.isArray(db.customTeams) ? (db.customTeams as Team[]) : [];

  const mergedBuiltIns: Team[] = TEAMS_DATABASE.filter((t) => !deletedSet.has(t.id)).map((t) =>
    overrides[t.id] ? { ...t, ...overrides[t.id], team_type: getTeamType(overrides[t.id]) } : t
  );
  const customFiltered: Team[] = customTeams
    .filter((t) => !deletedSet.has(t.id))
    .map((t) => ({ ...t, team_type: getTeamType(t) }));

  return [...mergedBuiltIns, ...customFiltered];
}

export function withDerivedManagerAge<T extends Manager>(mgr: T): T {
  return {
    ...mgr,
    age: calculateAgeFromDob(mgr.date_of_birth),
  };
}

export function withManagerAges(managers: Manager[]): Manager[] {
  return managers.map((m) => withDerivedManagerAge(m));
}

export function ensureManagerCollections(db: ServerDatabase): void {
  if (!Array.isArray(db.managers)) db.managers = [];
  if (!Array.isArray(db.managerAppointments)) db.managerAppointments = [];
}

function normalizeRole(role?: string | null): ManagerAppointmentRole {
  const clean = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
  if (VALID_ROLES.includes(clean as ManagerAppointmentRole)) {
    return clean as ManagerAppointmentRole;
  }
  if (clean.includes('interim')) return 'interim';
  if (clean.includes('caretaker')) return 'caretaker';
  if (clean.includes('assist')) return 'assistant';
  return 'head-coach';
}

function normalizeStatus(status?: string | null): ManagerStatus {
  const clean = String(status || '')
    .trim()
    .toLowerCase();
  if (VALID_STATUSES.includes(clean as ManagerStatus)) {
    return clean as ManagerStatus;
  }
  return 'unattached';
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toTeamSummary(team?: Team | null): ManagerTeamSummary | null {
  if (!team) return null;
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    code: team.code,
    team_type: getTeamType(team),
    country: team.country,
    flag: team.flag,
    league: team.league,
    confederation: team.confederation,
    crestUrl: team.crestUrl,
    primaryColor: team.primaryColor,
    secondaryColor: team.secondaryColor,
  };
}

function sortAppointmentsDescending(appts: ManagerAppointment[]): ManagerAppointment[] {
  return [...appts].sort((a, b) => {
    if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
    const da = a.start_date || '';
    const db = b.start_date || '';
    if (db !== da) return db.localeCompare(da);
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

function reconcileManagerStatus(db: ServerDatabase, managerId: string): void {
  const manager = db.managers.find((m) => m.id === managerId);
  if (!manager) return;
  const hasCurrent = db.managerAppointments.some(
    (a) => a.manager_id === managerId && a.is_current
  );
  if (hasCurrent) {
    manager.status = 'active';
  } else if (manager.status !== 'retired') {
    manager.status = 'unattached';
  }
}

function updateTeamOverrideOrCustom(
  db: ServerDatabase,
  teamId: string,
  updater: (currentTeam: Team) => Partial<Team>
): void {
  const teams = resolveRawAndProjectedTeams(db);
  const baseTeam = teams.find((t) => t.id === teamId);
  if (!baseTeam) return;

  const patch = updater(baseTeam);

  if (Array.isArray(db.customTeams)) {
    const customIdx = db.customTeams.findIndex((t: Team) => t.id === teamId);
    if (customIdx >= 0) {
      db.customTeams[customIdx] = {
        ...db.customTeams[customIdx],
        ...patch,
      };
      return;
    }
  }

  if (!db.teamOverrides) db.teamOverrides = {};
  db.teamOverrides[teamId] = {
    ...(db.teamOverrides[teamId] || {}),
    ...patch,
  };
}

function applyManagerCacheToTeam(
  db: ServerDatabase,
  team: Team,
  manager: Manager | null,
  appointment: ManagerAppointment | null,
  historyAddition?: ManagerHistoryEntry
): void {
  updateTeamOverrideOrCustom(db, team.id, (currentTeam) => {
    const nextHistory = [...(currentTeam.managerHistory || [])];
    if (historyAddition) {
      const alreadyExists = nextHistory.some(
        (h) => h.id === historyAddition.id || (h.name === historyAddition.name && h.startDate === historyAddition.startDate && h.endDate === historyAddition.endDate)
      );
      if (!alreadyExists) {
        nextHistory.unshift(historyAddition);
      }
    }

    if (!manager || !appointment) {
      return {
        manager: '',
        manager_id: null,
        manager_name: null,
        manager_since: null,
        manager_role: null,
        managerProfile: null,
        managerHistory: nextHistory,
      };
    }

    const parsedYear = Number((appointment.start_date || '').slice(0, 4));
    const appointedYear = Number.isFinite(parsedYear) && parsedYear > 1900 ? parsedYear : new Date().getFullYear();

    return {
      manager: manager.name,
      manager_id: manager.id,
      manager_name: manager.name,
      manager_since: appointment.start_date,
      manager_role: appointment.role,
      managerProfile: {
        name: manager.name,
        role: appointment.role,
        nationality: manager.nationality || currentTeam.country,
        dateOfBirth: manager.date_of_birth || undefined,
        age: calculateAgeFromDob(manager.date_of_birth),
        appointedYear,
        appointedSince: appointment.start_date,
        bio: manager.bio || '',
        verified: Boolean(manager.verified),
        previousClubs: (db.managerAppointments || [])
          .filter((a) => a.manager_id === manager.id && a.team_id !== team.id)
          .map((a) => a.team_name),
        winRate: '0.0%',
        honours: [...(manager.honours || [])],
      },
      managerHistory: nextHistory,
    };
  });
}

export function syncManagersOntoTeams(teams: Team[], db: ServerDatabase): Team[] {
  ensureManagerCollections(db);
  const managersById = new Map<string, Manager>(db.managers.map((m) => [m.id, m]));
  const currentApptByTeamId = new Map<string, ManagerAppointment>();
  for (const appt of db.managerAppointments) {
    if (appt.is_current) {
      currentApptByTeamId.set(appt.team_id, appt);
    }
  }

  return teams.map((team) => {
    const activeAppt = currentApptByTeamId.get(team.id);
    if (!activeAppt) {
      // Ensure teams without an active appointment don't retain stale manager_id cache
      if (team.manager_id) {
        return {
          ...team,
          manager_id: null,
          manager_name: null,
          manager_since: null,
          manager_role: null,
        };
      }
      return team;
    }

    const mgr = managersById.get(activeAppt.manager_id);
    const managerName = mgr?.name || activeAppt.manager_name;
    const parsedYear = Number((activeAppt.start_date || '').slice(0, 4));
    const appointedYear = Number.isFinite(parsedYear) && parsedYear > 1900 ? parsedYear : new Date().getFullYear();

    return {
      ...team,
      manager: managerName,
      manager_id: activeAppt.manager_id,
      manager_name: managerName,
      manager_since: activeAppt.start_date,
      manager_role: activeAppt.role,
      managerProfile: {
        name: managerName,
        role: activeAppt.role,
        nationality: mgr?.nationality || team.country,
        dateOfBirth: mgr?.date_of_birth || undefined,
        age: calculateAgeFromDob(mgr?.date_of_birth),
        appointedYear,
        appointedSince: activeAppt.start_date,
        bio: mgr?.bio || '',
        verified: Boolean(mgr?.verified ?? activeAppt.verified),
        previousClubs: db.managerAppointments
          .filter((a) => a.manager_id === activeAppt.manager_id && a.team_id !== team.id)
          .map((a) => a.team_name),
        winRate: team.managerProfile?.winRate || '0.0%',
        honours: mgr?.honours || activeAppt.honours || [],
      },
    };
  });
}

export function listManagers(
  db: ServerDatabase,
  filters?: {
    search?: string;
    teamType?: 'all' | 'club' | 'country';
    nationality?: string;
    competition?: string;
    tacticalStyle?: string;
    sort?: 'name' | 'team' | 'appointment_date';
  }
): {
  managers: EnrichedManagerRecord[];
  summary: {
    totalManagers: number;
    managingClubsCount: number;
    managingNationalTeamsCount: number;
  };
  facets: {
    nationalities: string[];
    competitions: string[];
    tacticalStyles: string[];
  };
} {
  ensureManagerCollections(db);
  const teams = resolveRawAndProjectedTeams(db);
  const teamsById = new Map<string, Team>(teams.map((t) => [t.id, t]));

  const apptsByManager = new Map<string, ManagerAppointment[]>();
  for (const appt of db.managerAppointments) {
    const list = apptsByManager.get(appt.manager_id) || [];
    list.push(appt);
    apptsByManager.set(appt.manager_id, list);
  }

  let managingClubsCount = 0;
  let managingNationalTeamsCount = 0;
  const nationalitySet = new Set<string>();
  const competitionSet = new Set<string>();
  const styleSet = new Set<string>();

  const allEnriched: EnrichedManagerRecord[] = db.managers.map((mgr) => {
    const appts = sortAppointmentsDescending(apptsByManager.get(mgr.id) || []);
    const currentAppointments = appts.filter((a) => a.is_current);
    const clubAppointment = currentAppointments.find((a) => a.team_type === 'club') || null;
    const nationalAppointment = currentAppointments.find((a) => a.team_type === 'country') || null;

    if (clubAppointment) managingClubsCount += 1;
    if (nationalAppointment) managingNationalTeamsCount += 1;
    if (mgr.nationality?.trim()) nationalitySet.add(mgr.nationality.trim());
    if (mgr.tactical_style?.trim()) styleSet.add(mgr.tactical_style.trim());

    const clubTeam = clubAppointment ? teamsById.get(clubAppointment.team_id) || null : null;
    const nationalTeam = nationalAppointment
      ? teamsById.get(nationalAppointment.team_id) || null
      : null;

    for (const appt of currentAppointments) {
      const t = teamsById.get(appt.team_id);
      const comp = t ? t.league || t.confederation : undefined;
      if (comp && comp.trim()) competitionSet.add(comp.trim());
      for (const c of appt.competitions || []) {
        if (c && c.trim()) competitionSet.add(c.trim());
      }
    }

    return {
      ...withDerivedManagerAge(mgr),
      currentAppointments,
      clubAppointment,
      nationalAppointment,
      appointments: appts,
      primaryTeam: toTeamSummary(clubTeam),
      nationalTeam: toTeamSummary(nationalTeam),
      managingClubs: Boolean(clubAppointment),
      managingNationalTeam: Boolean(nationalAppointment),
    };
  });

  const search = (filters?.search || '').trim().toLowerCase();
  const teamType = filters?.teamType || 'all';
  const nationality = (filters?.nationality || '').trim().toLowerCase();
  const competition = (filters?.competition || '').trim().toLowerCase();
  const tacticalStyle = (filters?.tacticalStyle || '').trim().toLowerCase();

  const filtered = allEnriched.filter((mgr) => {
    if (teamType === 'club' && !mgr.managingClubs) return false;
    if (teamType === 'country' && !mgr.managingNationalTeam) return false;

    if (nationality && nationality !== 'all' && mgr.nationality.toLowerCase() !== nationality) {
      return false;
    }

    if (
      tacticalStyle &&
      tacticalStyle !== 'all' &&
      mgr.tactical_style.toLowerCase() !== tacticalStyle
    ) {
      return false;
    }

    if (competition && competition !== 'all') {
      const comps = new Set<string>();
      for (const a of mgr.currentAppointments) {
        const t = teamsById.get(a.team_id);
        if (t?.league) comps.add(t.league.toLowerCase());
        if (t?.confederation) comps.add(t.confederation.toLowerCase());
        for (const c of a.competitions || []) {
          if (c) comps.add(c.toLowerCase());
        }
      }
      if (!comps.has(competition)) return false;
    }

    if (search) {
      const currentTeamNames = mgr.currentAppointments.map((a) => a.team_name.toLowerCase()).join(' ');
      const haystack = `${mgr.name} ${mgr.nationality} ${mgr.tactical_style} ${currentTeamNames}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    return true;
  });

  const sortBy = filters?.sort || 'name';
  filtered.sort((a, b) => {
    if (sortBy === 'team') {
      const ta = a.clubAppointment?.team_name || a.nationalAppointment?.team_name || 'zzz';
      const tb = b.clubAppointment?.team_name || b.nationalAppointment?.team_name || 'zzz';
      const cmp = ta.localeCompare(tb);
      return cmp !== 0 ? cmp : a.name.localeCompare(b.name);
    }
    if (sortBy === 'appointment_date') {
      const da = a.currentAppointments[0]?.start_date || '';
      const dbDate = b.currentAppointments[0]?.start_date || '';
      if (dbDate !== da) return dbDate.localeCompare(da);
      return a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });

  return {
    managers: filtered,
    summary: {
      totalManagers: allEnriched.length,
      managingClubsCount,
      managingNationalTeamsCount,
    },
    facets: {
      nationalities: Array.from(nationalitySet).sort((a, b) => a.localeCompare(b)),
      competitions: Array.from(competitionSet).sort((a, b) => a.localeCompare(b)),
      tacticalStyles: Array.from(styleSet).sort((a, b) => a.localeCompare(b)),
    },
  };
}

export function getManagerById(
  db: ServerDatabase,
  id: string
): {
  manager: EnrichedManagerRecord;
  teamsById: Record<string, ManagerTeamSummary>;
} | null {
  ensureManagerCollections(db);
  const { managers } = listManagers(db);
  const manager = managers.find((m) => m.id === id);
  if (!manager) return null;

  const teams = resolveRawAndProjectedTeams(db);
  const teamsById: Record<string, ManagerTeamSummary> = {};
  for (const appt of manager.appointments) {
    const t = teams.find((item) => item.id === appt.team_id);
    const summary = toTeamSummary(t);
    if (summary) teamsById[appt.team_id] = summary;
  }

  return { manager, teamsById };
}

export function createManager(
  db: ServerDatabase,
  payload: Record<string, any>,
  actor?: { id: string; role: string } | null
): { ok: boolean; status: number; error?: string; manager?: Manager } {
  ensureManagerCollections(db);
  const name = String(payload?.name || '').trim();
  if (!name) {
    return { ok: false, status: 400, error: 'Manager name is required.' };
  }

  const requestedId = typeof payload?.id === 'string' && payload.id.trim() ? payload.id.trim() : '';
  const id = requestedId || `mgr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  if (db.managers.some((m) => m.id === id)) {
    return { ok: false, status: 409, error: `Manager record '${id}' already exists.` };
  }

  const isAdmin = actor?.role === 'admin';
  const nowIso = new Date().toISOString();
  const philosophyParsed = parsePhilosophyJson(payload?.philosophy_json);

  const dob = String(payload?.date_of_birth || '').trim();
  const created: Manager = {
    id,
    name,
    nationality: String(payload?.nationality || '').trim(),
    date_of_birth: dob,
    age: calculateAgeFromDob(dob),
    photo: String(payload?.photo || '').trim(),
    preferred_formation: String(payload?.preferred_formation || '4-3-3').trim() || '4-3-3',
    tactical_style: String(payload?.tactical_style || '').trim(),
    philosophy_json: serializePhilosophyJson(philosophyParsed),
    playing_background: String(payload?.playing_background || '').trim(),
    bio: String(payload?.bio || '').trim(),
    honours: Array.isArray(payload?.honours)
      ? payload.honours.map((h: unknown) => String(h || '').trim()).filter(Boolean)
      : [],
    status: normalizeStatus(payload?.status || 'unattached'),
    verified: isAdmin ? Boolean(payload?.verified) : false,
    creatorId: actor?.id,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  db.managers.push(created);
  return { ok: true, status: 201, manager: created };
}

export function updateManager(
  db: ServerDatabase,
  managerId: string,
  patch: Record<string, any>,
  actor?: { id: string; role: string } | null
): { ok: boolean; status: number; error?: string; manager?: Manager } {
  ensureManagerCollections(db);
  const idx = db.managers.findIndex((m) => m.id === managerId);
  if (idx < 0) {
    return { ok: false, status: 404, error: 'Manager record not found.' };
  }

  const existing = db.managers[idx];
  const isAdmin = actor?.role === 'admin';
  if (!isAdmin) {
    return { ok: false, status: 403, error: 'Administrator privileges required to edit manager records.' };
  }

  const nextName =
    typeof patch.name === 'string' && patch.name.trim() ? patch.name.trim() : existing.name;
  const nextPhilosophy =
    patch.philosophy_json !== undefined
      ? serializePhilosophyJson(parsePhilosophyJson(patch.philosophy_json))
      : existing.philosophy_json;

  const nextDob =
    typeof patch.date_of_birth === 'string' ? patch.date_of_birth.trim() : existing.date_of_birth;

  const updated: Manager = {
    ...existing,
    name: nextName,
    nationality:
      typeof patch.nationality === 'string' ? patch.nationality.trim() : existing.nationality,
    date_of_birth: nextDob,
    age: calculateAgeFromDob(nextDob),
    photo: typeof patch.photo === 'string' ? patch.photo.trim() : existing.photo,
    preferred_formation:
      typeof patch.preferred_formation === 'string' && patch.preferred_formation.trim()
        ? patch.preferred_formation.trim()
        : existing.preferred_formation,
    tactical_style:
      typeof patch.tactical_style === 'string'
        ? patch.tactical_style.trim()
        : existing.tactical_style,
    philosophy_json: nextPhilosophy,
    playing_background:
      typeof patch.playing_background === 'string'
        ? patch.playing_background.trim()
        : existing.playing_background,
    bio: typeof patch.bio === 'string' ? patch.bio.trim() : existing.bio,
    honours: Array.isArray(patch.honours)
      ? patch.honours.map((h: unknown) => String(h || '').trim()).filter(Boolean)
      : existing.honours,
    status: patch.status !== undefined ? normalizeStatus(patch.status) : existing.status,
    verified:
      typeof patch.verified === 'boolean' && isAdmin ? patch.verified : existing.verified,
    updatedAt: new Date().toISOString(),
  };

  // Preserve status integrity if currently managing a team
  const hasCurrentAppt = db.managerAppointments.some(
    (a) => a.manager_id === managerId && a.is_current
  );
  if (hasCurrentAppt) {
    updated.status = 'active';
  }

  db.managers[idx] = updated;

  // Keep denormalized manager_name synced across all appointments and active teams
  const teams = resolveRawAndProjectedTeams(db);
  for (const appt of db.managerAppointments) {
    if (appt.manager_id === managerId) {
      appt.manager_name = updated.name;
      if (appt.is_current) {
        const team = teams.find((t) => t.id === appt.team_id);
        if (team) {
          applyManagerCacheToTeam(db, team, updated, appt);
        }
      }
    }
  }

  return { ok: true, status: 200, manager: updated };
}

export function assignManager(
  db: ServerDatabase,
  params: {
    manager_id: string;
    team_id: string;
    role?: string;
    start_date?: string;
    competitions?: string[];
    honours?: string[];
    notes?: string;
    verified?: boolean;
  }
): {
  ok: boolean;
  status: number;
  error?: string;
  appointment?: ManagerAppointment;
  closedAppointments?: ManagerAppointment[];
} {
  ensureManagerCollections(db);
  const manager = db.managers.find((m) => m.id === params.manager_id);
  if (!manager) {
    return { ok: false, status: 404, error: 'Permanent manager record not found.' };
  }

  const teams = resolveRawAndProjectedTeams(db);
  const targetTeam = teams.find((t) => t.id === params.team_id);
  if (!targetTeam) {
    return { ok: false, status: 404, error: 'Target team not found.' };
  }

  const targetTeamType = getTeamType(targetTeam);
  const startDate = String(params.start_date || todayIsoDate()).trim() || todayIsoDate();
  const role = normalizeRole(params.role);
  const nowIso = new Date().toISOString();
  const closedAppointments: ManagerAppointment[] = [];
  let teamHistoryAddition: ManagerHistoryEntry | undefined;

  // 1. Identify and close target team's previous current appointment(s)
  for (const appt of db.managerAppointments) {
    if (appt.team_id === targetTeam.id && appt.is_current) {
      appt.is_current = false;
      appt.end_date = startDate;
      appt.updatedAt = nowIso;
      closedAppointments.push(appt);
      reconcileManagerStatus(db, appt.manager_id);

      if (appt.manager_id !== manager.id) {
        teamHistoryAddition = {
          id: `mh-${appt.id}`,
          name: appt.manager_name,
          role: appt.role,
          startDate: appt.start_date,
          endDate: startDate,
        };
      }
    }
  }

  // Fallback: if the team had a legacy manager string without a ManagerAppointment
  if (!teamHistoryAddition && targetTeam.manager && targetTeam.manager.trim() && targetTeam.manager !== 'Vacant' && targetTeam.manager_id !== manager.id) {
    teamHistoryAddition = {
      id: `mh-legacy-${Date.now()}`,
      name: targetTeam.manager,
      role: targetTeam.manager_role || targetTeam.managerProfile?.role || 'Head coach',
      nationality: targetTeam.managerProfile?.nationality,
      startDate: targetTeam.manager_since || targetTeam.managerProfile?.appointedSince || String(targetTeam.managerProfile?.appointedYear || 'Prior'),
      endDate: startDate,
    };
  }

  // 2. Identify & close any conflicting previous current appointment for the manager
  // strictly in the SAME employment category ('club' vs 'country').
  // Simultaneous club + national-team appointments stay intact!
  for (const appt of db.managerAppointments) {
    if (
      appt.manager_id === manager.id &&
      appt.is_current &&
      appt.team_type === targetTeamType
    ) {
      appt.is_current = false;
      appt.end_date = startDate;
      appt.updatedAt = nowIso;
      closedAppointments.push(appt);

      if (appt.team_id !== targetTeam.id) {
        const vacatedTeam = teams.find((t) => t.id === appt.team_id);
        if (vacatedTeam) {
          applyManagerCacheToTeam(db, vacatedTeam, null, null, {
            id: `mh-${appt.id}`,
            name: manager.name,
            role: appt.role,
            nationality: manager.nationality,
            startDate: appt.start_date,
            endDate: startDate,
          });
        }
      }
    }
  }

  // 3. Create the new current ManagerAppointment
  const defaultComp =
    targetTeamType === 'club'
      ? targetTeam.league
        ? [targetTeam.league]
        : []
      : targetTeam.confederation
      ? [targetTeam.confederation]
      : [];

  const newAppointment: ManagerAppointment = {
    id: `appt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    manager_id: manager.id,
    manager_name: manager.name,
    team_id: targetTeam.id,
    team_name: targetTeam.name,
    team_type: targetTeamType,
    role,
    start_date: startDate,
    end_date: null,
    is_current: true,
    competitions:
      Array.isArray(params.competitions) && params.competitions.length > 0
        ? params.competitions.map((c) => String(c).trim()).filter(Boolean)
        : defaultComp,
    honours: Array.isArray(params.honours)
      ? params.honours.map((h) => String(h).trim()).filter(Boolean)
      : [],
    notes: String(params.notes || '').trim(),
    verified: params.verified !== undefined ? Boolean(params.verified) : Boolean(manager.verified),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  db.managerAppointments.push(newAppointment);

  // 4. Update Team's denormalized manager fields
  applyManagerCacheToTeam(db, targetTeam, manager, newAppointment, teamHistoryAddition);

  // 5. Update permanent Manager status to active
  manager.status = 'active';
  manager.updatedAt = nowIso;

  return {
    ok: true,
    status: 201,
    appointment: newAppointment,
    closedAppointments,
  };
}

export function endManagerAppointment(
  db: ServerDatabase,
  appointmentId: string,
  options?: { end_date?: string }
): {
  ok: boolean;
  status: number;
  error?: string;
  appointment?: ManagerAppointment;
} {
  ensureManagerCollections(db);
  const appt = db.managerAppointments.find((a) => a.id === appointmentId);
  if (!appt) {
    return { ok: false, status: 404, error: 'Manager appointment not found.' };
  }

  const endDate = String(options?.end_date || todayIsoDate()).trim() || todayIsoDate();
  const wasCurrent = appt.is_current;
  appt.is_current = false;
  appt.end_date = endDate;
  appt.updatedAt = new Date().toISOString();

  // Clear Team denormalized manager fields if this was its current appointment
  const teams = resolveRawAndProjectedTeams(db);
  const team = teams.find((t) => t.id === appt.team_id);
  if (team && (wasCurrent || team.manager_id === appt.manager_id)) {
    const stillAnotherCurrentOnTeam = db.managerAppointments.find(
      (a) => a.team_id === team.id && a.is_current && a.id !== appt.id
    );
    if (!stillAnotherCurrentOnTeam) {
      const manager = db.managers.find((m) => m.id === appt.manager_id);
      applyManagerCacheToTeam(db, team, null, null, {
        id: `mh-${appt.id}`,
        name: manager?.name || appt.manager_name,
        role: appt.role,
        nationality: manager?.nationality,
        startDate: appt.start_date,
        endDate,
      });
    }
  }

  // Reconcile permanent Manager status (stays active if still holds club or NT job)
  reconcileManagerStatus(db, appt.manager_id);

  return { ok: true, status: 200, appointment: appt };
}

export function endTeamCurrentManagerAppointment(
  db: ServerDatabase,
  teamId: string,
  options?: { end_date?: string }
): { ok: boolean; status: number; error?: string } {
  ensureManagerCollections(db);
  const current = db.managerAppointments.find((a) => a.team_id === teamId && a.is_current);
  if (current) {
    return endManagerAppointment(db, current.id, options);
  }

  const teams = resolveRawAndProjectedTeams(db);
  const team = teams.find((t) => t.id === teamId);
  if (!team) {
    return { ok: false, status: 404, error: 'Team not found.' };
  }

  const endDate = String(options?.end_date || todayIsoDate()).trim() || todayIsoDate();
  const historyAddition =
    team.manager && team.manager.trim() && team.manager !== 'Vacant'
      ? {
          id: `mh-legacy-${Date.now()}`,
          name: team.manager,
          role: team.manager_role || team.managerProfile?.role || 'Head coach',
          nationality: team.managerProfile?.nationality,
          startDate:
            team.manager_since ||
            team.managerProfile?.appointedSince ||
            String(team.managerProfile?.appointedYear || 'Prior'),
          endDate,
        }
      : undefined;

  applyManagerCacheToTeam(db, team, null, null, historyAddition);
  return { ok: true, status: 200 };
}

export function addCareerAppointment(
  db: ServerDatabase,
  managerId: string,
  payload: {
    team_id: string;
    role?: string;
    start_date: string;
    end_date?: string | null;
    is_current?: boolean;
    competitions?: string[];
    honours?: string[];
    notes?: string;
    verified?: boolean;
  }
): {
  ok: boolean;
  status: number;
  error?: string;
  appointment?: ManagerAppointment;
} {
  ensureManagerCollections(db);
  const manager = db.managers.find((m) => m.id === managerId);
  if (!manager) {
    return { ok: false, status: 404, error: 'Permanent manager record not found.' };
  }

  if (payload.is_current) {
    return assignManager(db, {
      manager_id: managerId,
      team_id: payload.team_id,
      role: payload.role,
      start_date: payload.start_date,
      competitions: payload.competitions,
      honours: payload.honours,
      notes: payload.notes,
      verified: payload.verified,
    });
  }

  const teams = resolveRawAndProjectedTeams(db);
  const team = teams.find((t) => t.id === payload.team_id);
  if (!team) {
    return { ok: false, status: 404, error: 'Team not found.' };
  }

  const startDate = String(payload.start_date || '').trim();
  if (!startDate) {
    return { ok: false, status: 400, error: 'Appointment start date is required.' };
  }
  const endDate = payload.end_date ? String(payload.end_date).trim() : todayIsoDate();
  const teamType = getTeamType(team);
  const role = normalizeRole(payload.role);
  const nowIso = new Date().toISOString();

  // Prevent exact duplicate historical entry
  const duplicate = db.managerAppointments.find(
    (a) =>
      a.manager_id === managerId &&
      a.team_id === team.id &&
      a.start_date === startDate &&
      a.is_current === false
  );
  if (duplicate) {
    return {
      ok: false,
      status: 409,
      error: `A historical appointment for ${team.name} starting ${startDate} already exists.`,
    };
  }

  const appt: ManagerAppointment = {
    id: `appt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    manager_id: manager.id,
    manager_name: manager.name,
    team_id: team.id,
    team_name: team.name,
    team_type: teamType,
    role,
    start_date: startDate,
    end_date: endDate,
    is_current: false,
    competitions: Array.isArray(payload.competitions)
      ? payload.competitions.map((c) => String(c).trim()).filter(Boolean)
      : [],
    honours: Array.isArray(payload.honours)
      ? payload.honours.map((h) => String(h).trim()).filter(Boolean)
      : [],
    notes: String(payload.notes || '').trim(),
    verified: payload.verified !== undefined ? Boolean(payload.verified) : Boolean(manager.verified),
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  db.managerAppointments.push(appt);

  // Record in team's managerial history cleanly without touching its current active manager
  updateTeamOverrideOrCustom(db, team.id, (currentTeam) => ({
    managerHistory: [
      ...(currentTeam.managerHistory || []),
      {
        id: `mh-${appt.id}`,
        name: manager.name,
        role: appt.role,
        nationality: manager.nationality,
        startDate: appt.start_date,
        endDate: endDate,
      },
    ],
  }));

  return { ok: true, status: 201, appointment: appt };
}

function matchBelongsToAppointment(
  match: SimulationMatchRecord,
  appt: ManagerAppointment,
  teamTypeOfTeam: 'club' | 'country'
): 'home' | 'away' | null {
  if (match.status !== 'completed') return null;

  const isHome = match.homeTeamId === appt.team_id;
  const isAway = match.awayTeamId === appt.team_id;
  if (!isHome && !isAway) return null;

  // Enforce strict team_type isolation (club vs country)
  const sideTeamType = isHome
    ? match.homeTeamType || teamTypeOfTeam
    : match.awayTeamType || teamTypeOfTeam;
  if (sideTeamType !== appt.team_type) return null;

  // Primary attribution: explicit manager ID saved on simulation record
  const recordedMgrId = isHome ? match.homeManagerId : match.awayManagerId;
  if (recordedMgrId) {
    if (recordedMgrId !== appt.manager_id) return null;
    // If manager held multiple historical stints at the same team, match by date window when possible
    if (appt.start_date && match.date && match.date < appt.start_date) return null;
    if (!appt.is_current && appt.end_date && match.date && match.date > appt.end_date) return null;
    return isHome ? 'home' : 'away';
  }

  // Secondary attribution (for matches simulated without recorded manager ID): date window matching
  const matchDate = match.date || '';
  if (appt.start_date && matchDate && matchDate < appt.start_date) return null;
  if (!appt.is_current && appt.end_date && matchDate && matchDate > appt.end_date) return null;

  return isHome ? 'home' : 'away';
}

export function managerStatistics(
  db: ServerDatabase,
  managerId: string
): ManagerStatisticsResponse | null {
  ensureManagerCollections(db);
  const manager = db.managers.find((m) => m.id === managerId);
  if (!manager) return null;

  const teams = resolveRawAndProjectedTeams(db);
  const teamsById = new Map<string, Team>(teams.map((t) => [t.id, t]));
  const appts = sortAppointmentsDescending(
    db.managerAppointments.filter((a) => a.manager_id === managerId)
  );

  const apptStats: ManagerAppointmentStatistics[] = appts.map((appt) => {
    const team = teamsById.get(appt.team_id);
    const resolvedTeamType = team ? getTeamType(team) : appt.team_type;
    let matchesPlayed = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsScored = 0;
    let goalsConceded = 0;

    for (const match of db.simulationMatches || []) {
      const side = matchBelongsToAppointment(match, appt, resolvedTeamType);
      if (!side) continue;

      matchesPlayed += 1;
      const gf = side === 'home' ? match.homeScore : match.awayScore;
      const ga = side === 'home' ? match.awayScore : match.homeScore;
      goalsScored += gf;
      goalsConceded += ga;
      if (gf > ga) wins += 1;
      else if (gf === ga) draws += 1;
      else losses += 1;
    }

    const winPercentage =
      matchesPlayed > 0 ? Number(((wins / matchesPlayed) * 100).toFixed(1)) : 0;
    const honours = Array.isArray(appt.honours) ? appt.honours : [];

    return {
      appointmentId: appt.id,
      managerId: manager.id,
      teamId: appt.team_id,
      teamName: team?.name || appt.team_name,
      teamCrestUrl: team?.crestUrl,
      teamPrimaryColor: team?.primaryColor,
      teamFlag: team?.flag,
      teamType: appt.team_type,
      role: appt.role,
      startDate: appt.start_date,
      endDate: appt.end_date,
      isCurrent: appt.is_current,
      matchesPlayed,
      wins,
      draws,
      losses,
      winPercentage,
      goalsScored,
      goalsConceded,
      trophiesWon: honours.length,
      honours,
    };
  });

  const totals = apptStats.reduce(
    (acc, item) => {
      acc.matchesPlayed += item.matchesPlayed;
      acc.wins += item.wins;
      acc.draws += item.draws;
      acc.losses += item.losses;
      acc.goalsScored += item.goalsScored;
      acc.goalsConceded += item.goalsConceded;
      acc.trophiesWon += item.trophiesWon;
      return acc;
    },
    {
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      winPercentage: 0,
      goalsScored: 0,
      goalsConceded: 0,
      trophiesWon: 0,
    }
  );

  totals.winPercentage =
    totals.matchesPlayed > 0
      ? Number(((totals.wins / totals.matchesPlayed) * 100).toFixed(1))
      : 0;

  return {
    managerId: manager.id,
    managerName: manager.name,
    careerTotals: totals,
    appointments: apptStats,
  };
}
