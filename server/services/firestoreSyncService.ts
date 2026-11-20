import { AsyncLocalStorage } from 'node:async_hooks';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type {
  AboutLegalConfig,
  AuditLogEntry,
  BookVolume,
  CompetitionRecord,
  ContactInfoConfig,
  HomepageConfig,
  LeagueStatusRecord,
  ManagedAnnouncement,
  MediaAsset,
  MusicTrackRecord,
  NewsletterSubscriberRecord,
  PdfFileRecord,
  QuizQuestionRecord,
  ReaderObjectiveRecord,
  ReadingSeriesItem,
  ScoreboardMatchRecord,
  ServerDatabase,
  SimulationMatchRecord,
  WebsiteBrandingConfig,
} from '../types';
import type {
  CompetitionEditionHistoryEntry,
  CompetitionMakerTournament,
  TrophyDesignConfig,
} from '../../src/types/competitionMaker';
import type { Manager, ManagerAppointment } from '../../src/types/manager';
import { CLUB_TEAMS_DATABASE, NATIONAL_TEAMS_DATABASE } from '../../src/data/teamsDatabase';
import { buildSeededClubManagers } from '../../src/data/clubManagersDatabase';
import { buildSeededNationalManagers } from '../../src/data/nationalManagersDatabase';
import { getVerifiedManagerDob } from '../../src/data/verifiedManagerDobs';

export interface FirebaseSyncContext {
  idToken: string | null;
  uid: string | null;
  email: string | null;
}

interface FirebaseAppletConfig {
  projectId: string;
  firestoreDatabaseId: string;
  apiKey: string;
}

interface DeletedEntitiesRegistry {
  deletedTeamIds: string[];
  deletedPlayerIdentityIds: string[];
  deletedSeriesIds: string[];
  deletedBookIds: string[];
  deletedAnnouncementIds: string[];
  deletedMediaIds: string[];
  deletedCompetitionIds: string[];
  deletedQuizIds: string[];
  deletedObjectiveIds: string[];
  deletedMusicTrackIds: string[];
  deletedManagerIds: string[];
  deletedAppointmentIds: string[];
  deletedPdfIds: string[];
  unpublishedSeriesIds: string[];
  unpublishedBookIds: string[];
  unpublishedAnnouncementIds: string[];
  privatePdfIds: string[];
  inactiveObjectiveIds: string[];
  draftAboutLegal: boolean;
  rankingOverrides: ServerDatabase['rankingOverrides'];
}

interface FirestoreDocInput {
  collection: string;
  docId: string;
  fields: Record<string, unknown>;
  serverTimestampFields?: string[];
  createOnly?: boolean;
}

const syncContextStorage = new AsyncLocalStorage<FirebaseSyncContext>();

export function runWithFirebaseContext<T>(ctx: FirebaseSyncContext, fn: () => T): T {
  return syncContextStorage.run(ctx, fn);
}

export function getCurrentFirebaseContext(): FirebaseSyncContext | null {
  return syncContextStorage.getStore() || null;
}

export function extractJwtClaims(idToken: string): {
  uid: string | null;
  email: string | null;
  emailVerified: boolean;
  expired: boolean;
} {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return { uid: null, email: null, emailVerified: false, expired: true };
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as {
      sub?: string;
      user_id?: string;
      email?: string;
      email_verified?: boolean;
      exp?: number;
    };
    const expired = typeof payload.exp === 'number' && payload.exp * 1000 < Date.now() - 15_000;
    return {
      uid: String(payload.sub || payload.user_id || '').trim() || null,
      email: payload.email ? String(payload.email).trim().toLowerCase() : null,
      emailVerified: Boolean(payload.email_verified),
      expired,
    };
  } catch {
    return { uid: null, email: null, emailVerified: false, expired: true };
  }
}

let cachedConfig: FirebaseAppletConfig | null | undefined;
function getFirebaseConfig(): FirebaseAppletConfig | null {
  if (cachedConfig !== undefined) return cachedConfig;
  try {
    const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(cfgPath)) {
      cachedConfig = null;
      return null;
    }
    const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as Partial<FirebaseAppletConfig>;
    if (!raw.projectId || !raw.firestoreDatabaseId || !raw.apiKey) {
      cachedConfig = null;
      return null;
    }
    cachedConfig = {
      projectId: String(raw.projectId),
      firestoreDatabaseId: String(raw.firestoreDatabaseId),
      apiKey: String(raw.apiKey),
    };
    return cachedConfig;
  } catch {
    cachedConfig = null;
    return null;
  }
}

export function toSafeFirestoreDocId(rawId: string): string {
  const cleaned = String(rawId || '').trim();
  if (/^[a-zA-Z0-9_-]{1,128}$/.test(cleaned)) {
    return cleaned;
  }
  const hash = crypto.createHash('sha1').update(cleaned || 'doc').digest('hex').slice(0, 10);
  const slug = cleaned.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 110);
  return `${slug || 'id'}_${hash}`.slice(0, 128);
}

function stripUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value === 'number') {
    return (Number.isFinite(value) ? value : 0) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => stripUndefinedDeep(item)) as unknown as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefinedDeep(v);
      }
    }
    return out as T;
  }
  return value;
}

function stableHash(value: unknown): string {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(stripUndefinedDeep(value) ?? null))
    .digest('hex');
}

function toFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { integerValue: '0' };
    if (Number.isInteger(val) && Math.abs(val) <= 9007199254740991) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.filter((item) => item !== undefined).map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function fromFirestoreValue(val: any): unknown {
  if (!val || typeof val !== 'object') return null;
  if ('nullValue' in val) return null;
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('stringValue' in val) return String(val.stringValue);
  if ('timestampValue' in val) return String(val.timestampValue);
  if ('arrayValue' in val) {
    const arr = Array.isArray(val.arrayValue?.values) ? val.arrayValue.values : [];
    return arr.map((item: unknown) => fromFirestoreValue(item));
  }
  if ('mapValue' in val) {
    return fromFirestoreFields(val.mapValue?.fields || {});
  }
  return null;
}

function fromFirestoreFields(fields: Record<string, unknown> | undefined): Record<string, any> {
  const out: Record<string, any> = {};
  if (!fields) return out;
  for (const [k, v] of Object.entries(fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out;
}

function docPathPrefix(cfg: FirebaseAppletConfig): string {
  return `projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId}/documents`;
}

function restBaseUrl(cfg: FirebaseAppletConfig): string {
  return `https://firestore.googleapis.com/v1/${docPathPrefix(cfg)}`;
}

async function listFirestoreDocs(
  collectionPath: string,
  authToken?: string | null
): Promise<Array<{ docId: string; data: Record<string, any> }>> {
  const cfg = getFirebaseConfig();
  if (!cfg) return [];
  const results: Array<{ docId: string; data: Record<string, any> }> = [];
  let pageToken = '';

  while (true) {
    const url = new URL(`${restBaseUrl(cfg)}/${collectionPath}`);
    url.searchParams.set('pageSize', '300');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    if (!authToken) url.searchParams.set('key', cfg.apiKey);

    const res = await fetch(url.toString(), {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
    });
    if (!res.ok) {
      throw new Error(`listFirestoreDocs(${collectionPath}) failed with ${res.status}`);
    }
    const json = (await res.json()) as {
      documents?: Array<{ name?: string; fields?: Record<string, unknown> }>;
      nextPageToken?: string;
    };
    for (const doc of json.documents || []) {
      const nameParts = String(doc.name || '').split('/');
      const docId = nameParts[nameParts.length - 1] || '';
      if (docId) {
        results.push({ docId, data: fromFirestoreFields(doc.fields) });
      }
    }
    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
  }

  return results;
}

async function runPublicEqualityQuery(
  collectionId: string,
  fieldPath: string,
  value: { stringValue: string } | { booleanValue: boolean },
  authToken?: string | null
): Promise<Array<{ docId: string; data: Record<string, any> }>> {
  const cfg = getFirebaseConfig();
  if (!cfg) return [];
  const url = authToken
    ? `${restBaseUrl(cfg)}:runQuery`
    : `${restBaseUrl(cfg)}:runQuery?key=${encodeURIComponent(cfg.apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath },
            op: 'EQUAL',
            value,
          },
        },
        limit: 1000,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`runQuery(${collectionId}) failed with ${res.status}`);
  }

  const rows = (await res.json()) as Array<{
    document?: { name?: string; fields?: Record<string, unknown> };
  }>;
  const out: Array<{ docId: string; data: Record<string, any> }> = [];
  for (const row of rows) {
    if (!row.document?.name) continue;
    const parts = row.document.name.split('/');
    const docId = parts[parts.length - 1] || '';
    if (docId) {
      out.push({ docId, data: fromFirestoreFields(row.document.fields) });
    }
  }
  return out;
}

async function getFirestoreDoc(
  docRelPath: string,
  authToken?: string | null
): Promise<Record<string, any> | null> {
  const cfg = getFirebaseConfig();
  if (!cfg) return null;
  const url = authToken
    ? `${restBaseUrl(cfg)}/${docRelPath}`
    : `${restBaseUrl(cfg)}/${docRelPath}?key=${encodeURIComponent(cfg.apiKey)}`;
  const res = await fetch(url, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`getFirestoreDoc(${docRelPath}) failed with ${res.status}`);
  }
  const doc = (await res.json()) as { fields?: Record<string, unknown> };
  return fromFirestoreFields(doc.fields);
}

async function commitFirestoreWrites(
  writes: Array<Record<string, unknown>>,
  idToken: string
): Promise<boolean> {
  const cfg = getFirebaseConfig();
  if (!cfg || writes.length === 0) return true;
  const BATCH_SIZE = 150;
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const chunk = writes.slice(i, i + BATCH_SIZE);
    const res = await fetch(`${restBaseUrl(cfg)}:commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ writes: chunk }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`Firestore :commit error (${res.status}):`, errText.slice(0, 600));
      return false;
    }
  }
  return true;
}

function buildCommitWriteForUpsert(cfg: FirebaseAppletConfig, item: FirestoreDocInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(item.fields)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(stripUndefinedDeep(v));
    }
  }
  const tsFields = item.serverTimestampFields || ['updatedAt'];
  const write: Record<string, unknown> = {
    update: {
      name: `${docPathPrefix(cfg)}/${item.collection}/${item.docId}`,
      fields,
    },
    updateTransforms: tsFields.map((fieldPath) => ({
      fieldPath,
      setToServerValue: 'REQUEST_TIME',
    })),
  };
  if (item.createOnly) {
    write.currentDocument = { exists: false };
  }
  return write;
}

function buildCommitWriteForDelete(
  cfg: FirebaseAppletConfig,
  collection: string,
  docId: string
): Record<string, unknown> {
  return {
    delete: `${docPathPrefix(cfg)}/${collection}/${docId}`,
  };
}

// ============================================================================
// Seeded Baseline Cache (avoids syncing 1,158 untouched static managers!)
// ============================================================================
let seededManagerHashes: Map<string, string> | null = null;
let seededAppointmentHashes: Map<string, string> | null = null;
let seededBaseIds: {
  announcements: Set<string>;
  musicTracks: Set<string>;
  mediaAssets: Set<string>;
  competitions: Set<string>;
  quizQuestions: Set<string>;
  readerObjectives: Set<string>;
} | null = null;

function ensureSeedBaselines(seedTemplate: ServerDatabase) {
  if (!seededManagerHashes || !seededAppointmentHashes) {
    const clubSeed = buildSeededClubManagers(CLUB_TEAMS_DATABASE);
    const natSeed = buildSeededNationalManagers(NATIONAL_TEAMS_DATABASE, clubSeed.managers);
    seededManagerHashes = new Map();
    for (const mgr of [...clubSeed.managers, ...natSeed.managers]) {
      const copy = { ...mgr };
      if (!copy.date_of_birth || !copy.date_of_birth.trim()) {
        const dob = getVerifiedManagerDob(copy.id, copy.name, copy.nationality);
        if (dob) copy.date_of_birth = dob;
      }
      seededManagerHashes.set(copy.id, stableHash(copy));
    }
    seededAppointmentHashes = new Map();
    for (const appt of [...clubSeed.appointments, ...natSeed.appointments]) {
      seededAppointmentHashes.set(appt.id, stableHash(appt));
    }
  }
  if (!seededBaseIds) {
    seededBaseIds = {
      announcements: new Set((seedTemplate.announcements || []).map((a) => a.id)),
      musicTracks: new Set((seedTemplate.musicTracks || []).map((m) => m.id)),
      mediaAssets: new Set((seedTemplate.mediaAssets || []).map((m) => m.id)),
      competitions: new Set((seedTemplate.competitions || []).map((c) => c.id)),
      quizQuestions: new Set((seedTemplate.quizQuestions || []).map((q) => q.id)),
      readerObjectives: new Set((seedTemplate.readerObjectives || []).map((o) => o.id)),
    };
  }
}

// Track known Firestore state per entity key (`collection/docId`) -> sha256 hash
const syncedHashes = new Map<string, string>();
const syncedImmutableKeys = new Set<string>(); // e.g., newsletter_subscribers, audit_logs
const knownRemotePdfChunks = new Map<string, number>(); // pdfDocId -> chunkCount
let hydratedOnBoot = false;
let hasLocalUnsyncedMutations = false;
let syncChain: Promise<void> = Promise.resolve();
let lastSyncedDeletedRegistry: DeletedEntitiesRegistry = {
  deletedTeamIds: [],
  deletedPlayerIdentityIds: [],
  deletedSeriesIds: [],
  deletedBookIds: [],
  deletedAnnouncementIds: [],
  deletedMediaIds: [],
  deletedCompetitionIds: [],
  deletedQuizIds: [],
  deletedObjectiveIds: [],
  deletedMusicTrackIds: [],
  deletedManagerIds: [],
  deletedAppointmentIds: [],
  deletedPdfIds: [],
  unpublishedSeriesIds: [],
  unpublishedBookIds: [],
  unpublishedAnnouncementIds: [],
  privatePdfIds: [],
  inactiveObjectiveIds: [],
  draftAboutLegal: false,
  rankingOverrides: {},
};

function mergeUniqueIds(...groups: Array<string[] | undefined>): string[] {
  const set = new Set<string>();
  for (const grp of groups) {
    if (!Array.isArray(grp)) continue;
    for (const id of grp) {
      if (typeof id === 'string' && id.trim()) set.add(id.trim());
    }
  }
  return Array.from(set);
}

function computeDeletedEntitiesRegistry(db: ServerDatabase, seedTemplate: ServerDatabase): DeletedEntitiesRegistry {
  ensureSeedBaselines(seedTemplate);
  const currAnnIds = new Set((db.announcements || []).map((a) => a.id));
  const currMusicIds = new Set((db.musicTracks || []).map((m) => m.id));
  const currMediaIds = new Set((db.mediaAssets || []).map((m) => m.id));
  const currCompIds = new Set((db.competitions || []).map((c) => c.id));
  const currQuizIds = new Set((db.quizQuestions || []).map((q) => q.id));
  const currObjIds = new Set((db.readerObjectives || []).map((o) => o.id));
  const currMgrIds = new Set((db.managers || []).map((m) => m.id));
  const currApptIds = new Set((db.managerAppointments || []).map((a) => a.id));

  const deletedAnnouncementIds = Array.from(seededBaseIds!.announcements).filter((id) => !currAnnIds.has(id));
  const deletedMusicTrackIds = Array.from(seededBaseIds!.musicTracks).filter((id) => !currMusicIds.has(id));
  const deletedMediaIds = Array.from(seededBaseIds!.mediaAssets).filter((id) => !currMediaIds.has(id));
  const deletedCompetitionIds = Array.from(seededBaseIds!.competitions).filter((id) => !currCompIds.has(id));
  const deletedQuizIds = Array.from(seededBaseIds!.quizQuestions).filter((id) => !currQuizIds.has(id));
  const deletedObjectiveIds = Array.from(seededBaseIds!.readerObjectives).filter((id) => !currObjIds.has(id));

  const deletedManagerIds: string[] = [];
  for (const id of seededManagerHashes!.keys()) {
    if (!currMgrIds.has(id)) deletedManagerIds.push(id);
  }
  const deletedAppointmentIds: string[] = [];
  for (const id of seededAppointmentHashes!.keys()) {
    if (!currApptIds.has(id)) deletedAppointmentIds.push(id);
  }

  return {
    deletedTeamIds: mergeUniqueIds(db.deletedTeamIds),
    deletedPlayerIdentityIds: mergeUniqueIds(db.deletedPlayerIdentityIds),
    deletedSeriesIds: mergeUniqueIds(lastSyncedDeletedRegistry.deletedSeriesIds),
    deletedBookIds: mergeUniqueIds(lastSyncedDeletedRegistry.deletedBookIds),
    deletedAnnouncementIds: mergeUniqueIds(deletedAnnouncementIds),
    deletedMediaIds: mergeUniqueIds(deletedMediaIds),
    deletedCompetitionIds: mergeUniqueIds(deletedCompetitionIds),
    deletedQuizIds: mergeUniqueIds(deletedQuizIds),
    deletedObjectiveIds: mergeUniqueIds(deletedObjectiveIds),
    deletedMusicTrackIds: mergeUniqueIds(deletedMusicTrackIds),
    deletedManagerIds: mergeUniqueIds(deletedManagerIds),
    deletedAppointmentIds: mergeUniqueIds(deletedAppointmentIds),
    deletedPdfIds: mergeUniqueIds(lastSyncedDeletedRegistry.deletedPdfIds),
    unpublishedSeriesIds: (db.readingSeries || []).filter((s) => !s.published).map((s) => s.id),
    unpublishedBookIds: (db.bookVolumes || []).filter((b) => !b.published).map((b) => b.id),
    unpublishedAnnouncementIds: (db.announcements || [])
      .filter((a) => a.status !== 'published')
      .map((a) => a.id),
    privatePdfIds: (db.pdfFiles || []).filter((p) => p.accessStatus !== 'public').map((p) => p.id),
    inactiveObjectiveIds: (db.readerObjectives || []).filter((o) => !o.active).map((o) => o.id),
    draftAboutLegal: db.aboutLegal?.status !== 'published',
    rankingOverrides: db.rankingOverrides || {},
  };
}

function buildDesiredFirestoreDocs(
  db: ServerDatabase,
  seedTemplate: ServerDatabase,
  actorMeta: string,
  includeAdminOnly: boolean
): {
  upserts: FirestoreDocInput[];
  immutableCreates: FirestoreDocInput[];
  pdfChunkMap: Map<string, string[]>;
  deletedRegistry: DeletedEntitiesRegistry;
} {
  ensureSeedBaselines(seedTemplate);
  const deletedRegistry = computeDeletedEntitiesRegistry(db, seedTemplate);
  const upserts: FirestoreDocInput[] = [];
  const immutableCreates: FirestoreDocInput[] = [];
  const pdfChunkMap = new Map<string, string[]>();

  // 1. site_config docs
  const siteConfigs: Array<{ id: string; status: 'published' | 'draft'; payload: Record<string, unknown> }> = [
    {
      id: 'branding',
      status: 'published',
      payload: (db.branding || {}) as unknown as Record<string, unknown>,
    },
    {
      id: 'homepage_config',
      status: 'published',
      payload: (db.homepageConfig || {}) as unknown as Record<string, unknown>,
    },
    {
      id: 'contact_info',
      status: 'published',
      payload: (db.contactInfo || {}) as unknown as Record<string, unknown>,
    },
    {
      id: 'music_tracks',
      status: 'published',
      payload: { tracks: db.musicTracks || [] },
    },
    {
      id: 'squad_overrides',
      status: 'published',
      payload: {
        squadShirtOverrides: db.squadShirtOverrides || {},
        squadInjuryOverrides: db.squadInjuryOverrides || {},
      },
    },
    {
      id: 'deleted_entities',
      status: 'published',
      payload: deletedRegistry as unknown as Record<string, unknown>,
    },
    {
      id: 'competition_trophies',
      status: 'published',
      payload: { trophies: db.competitionTrophies || [] },
    },
    {
      id: 'hall_of_fame',
      status: 'published',
      payload: { entries: (db.hallOfFame || []).slice(0, 250) },
    },

  ];

  if (includeAdminOnly || db.aboutLegal?.status === 'published') {
    siteConfigs.push({
      id: 'about_legal',
      status: db.aboutLegal?.status === 'published' ? 'published' : 'draft',
      payload: (db.aboutLegal || {}) as unknown as Record<string, unknown>,
    });
  }

  for (const sc of siteConfigs) {
    upserts.push({
      collection: 'site_config',
      docId: sc.id,
      fields: {
        id: sc.id,
        status: sc.status,
        payload: stripUndefinedDeep(sc.payload),
        updatedBy: actorMeta,
      },
    });
  }

  // 2. reading_series
  for (const s of db.readingSeries || []) {
    const docId = toSafeFirestoreDocId(s.id);
    upserts.push({
      collection: 'reading_series',
      docId,
      fields: {
        id: docId,
        title: String(s.title || 'Untitled Series').slice(0, 240),
        published: Boolean(s.published),
        featured: Boolean(s.featured),
        payload: stripUndefinedDeep(s),
        updatedBy: actorMeta,
      },
    });
  }

  // 3. book_volumes
  for (const b of db.bookVolumes || []) {
    const docId = toSafeFirestoreDocId(b.id);
    upserts.push({
      collection: 'book_volumes',
      docId,
      fields: {
        id: docId,
        seriesId: String(b.seriesId || 'unknown').slice(0, 128),
        title: String(b.title || 'Untitled Book').slice(0, 240),
        published: Boolean(b.published),
        downloadEnabled: Boolean(b.downloadEnabled),
        payload: stripUndefinedDeep(b),
        updatedBy: actorMeta,
      },
    });
  }

  // 4. pdf_files + chunks (read from disk if uploaded)
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
  for (const pdf of db.pdfFiles || []) {
    const docId = toSafeFirestoreDocId(pdf.id);
    let chunks: string[] = [];
    if (pdf.urlOrData?.startsWith('/uploads/pdfs/')) {
      const diskPath = path.join(uploadDir, pdf.filename);
      if (fs.existsSync(diskPath)) {
        try {
          const b64 = fs.readFileSync(diskPath).toString('base64');
          const CHUNK_CHARS = 400_000;
          for (let offset = 0; offset < b64.length; offset += CHUNK_CHARS) {
            chunks.push(b64.slice(offset, offset + CHUNK_CHARS));
          }
        } catch {
          chunks = [];
        }
      }
    }
    if (chunks.length > 0) {
      pdfChunkMap.set(docId, chunks);
    }
    const chunkCount = chunks.length > 0 ? chunks.length : knownRemotePdfChunks.get(docId) || 0;
    upserts.push({
      collection: 'pdf_files',
      docId,
      fields: {
        id: docId,
        bookId: String(pdf.bookId || 'unknown').slice(0, 128),
        filename: String(pdf.filename || 'document.pdf').slice(0, 240),
        accessStatus: pdf.accessStatus === 'private' ? 'private' : 'public',
        chunkCount,
        payload: stripUndefinedDeep(pdf),
        updatedBy: actorMeta,
      },
    });
  }

  // 5. announcements
  for (const ann of db.announcements || []) {
    const docId = toSafeFirestoreDocId(ann.id);
    const status = ['draft', 'hidden', 'published', 'archived'].includes(ann.status)
      ? ann.status
      : 'draft';
    upserts.push({
      collection: 'announcements',
      docId,
      fields: {
        id: docId,
        status,
        payload: stripUndefinedDeep(ann),
        updatedBy: actorMeta,
      },
    });
  }

  // 6. media_assets
  for (const asset of db.mediaAssets || []) {
    const docId = toSafeFirestoreDocId(asset.id);
    upserts.push({
      collection: 'media_assets',
      docId,
      fields: {
        id: docId,
        name: String(asset.name || docId).slice(0, 200),
        payload: stripUndefinedDeep(asset),
        updatedBy: actorMeta,
      },
    });
  }

  // 7. custom_teams
  for (const team of db.customTeams || []) {
    if (!team?.id) continue;
    const docId = toSafeFirestoreDocId(team.id);
    const teamType = team.team_type === 'country' || team.teamType === 'country' ? 'country' : 'club';
    upserts.push({
      collection: 'custom_teams',
      docId,
      fields: {
        id: docId,
        name: String(team.name || docId).slice(0, 160),
        team_type: teamType,
        payload: stripUndefinedDeep(team),
        updatedBy: actorMeta,
      },
    });
  }

  // 8. team_overrides
  for (const [rawTeamId, override] of Object.entries(db.teamOverrides || {})) {
    if (!override) continue;
    const docId = toSafeFirestoreDocId(rawTeamId);
    const teamType =
      override.team_type === 'country' ||
      override.teamType === 'country' ||
      rawTeamId.startsWith('nat-')
        ? 'country'
        : 'club';
    upserts.push({
      collection: 'team_overrides',
      docId,
      fields: {
        id: docId,
        name: String(override.name || rawTeamId).slice(0, 160),
        team_type: teamType,
        payload: stripUndefinedDeep({ ...override, id: override.id || rawTeamId }),
        updatedBy: actorMeta,
      },
    });
  }

  // 9. player_identities
  for (const [rawPlayerId, identity] of Object.entries(db.playerIdentityOverrides || {})) {
    if (!identity) continue;
    const docId = toSafeFirestoreDocId(rawPlayerId);
    upserts.push({
      collection: 'player_identities',
      docId,
      fields: {
        id: docId,
        payload: stripUndefinedDeep({ ...identity, id: identity.id || rawPlayerId }),
        updatedBy: actorMeta,
      },
    });
  }

  // 10. player_registrations (club + national)
  for (const reg of db.clubRegistrations || []) {
    if (!reg?.id) continue;
    const docId = toSafeFirestoreDocId(reg.id);
    upserts.push({
      collection: 'player_registrations',
      docId,
      fields: {
        id: docId,
        team_type: 'club',
        playerId: String(reg.playerId || 'unknown').slice(0, 128),
        payload: stripUndefinedDeep({ ...reg, __regKind: 'club' }),
        updatedBy: actorMeta,
      },
    });
  }
  for (const reg of db.nationalRegistrations || []) {
    if (!reg?.id) continue;
    const docId = toSafeFirestoreDocId(reg.id);
    upserts.push({
      collection: 'player_registrations',
      docId,
      fields: {
        id: docId,
        team_type: 'country',
        playerId: String(reg.playerId || 'unknown').slice(0, 128),
        payload: stripUndefinedDeep({ ...reg, __regKind: 'national' }),
        updatedBy: actorMeta,
      },
    });
  }

  // 11. free_agents
  for (const fa of db.freeAgents || []) {
    if (!fa?.id) continue;
    const docId = toSafeFirestoreDocId(fa.id);
    upserts.push({
      collection: 'free_agents',
      docId,
      fields: {
        id: docId,
        payload: stripUndefinedDeep(fa),
        updatedBy: actorMeta,
      },
    });
  }

  // 12. manager_records (DELTA ONLY against 1,158 static seeded managers!)
  for (const mgr of db.managers || []) {
    if (!mgr?.id) continue;
    const baseHash = seededManagerHashes!.get(mgr.id);
    const currHash = stableHash(mgr);
    const docKey = `manager_records/${toSafeFirestoreDocId(mgr.id)}`;
    if (baseHash && baseHash === currHash && !syncedHashes.has(docKey)) {
      continue;
    }
    const docId = toSafeFirestoreDocId(mgr.id);
    upserts.push({
      collection: 'manager_records',
      docId,
      fields: {
        id: docId,
        name: String(mgr.name || docId).slice(0, 160),
        verified: Boolean(mgr.verified),
        payload: stripUndefinedDeep(mgr),
        updatedBy: actorMeta,
      },
    });
  }

  // 13. manager_appointments (DELTA ONLY against 1,164 static seeded appointments!)
  for (const appt of db.managerAppointments || []) {
    if (!appt?.id) continue;
    const baseHash = seededAppointmentHashes!.get(appt.id);
    const currHash = stableHash(appt);
    const docKey = `manager_appointments/${toSafeFirestoreDocId(appt.id)}`;
    if (baseHash && baseHash === currHash && !syncedHashes.has(docKey)) {
      continue;
    }
    const docId = toSafeFirestoreDocId(appt.id);
    upserts.push({
      collection: 'manager_appointments',
      docId,
      fields: {
        id: docId,
        manager_id: String(appt.manager_id || 'unknown').slice(0, 128),
        team_id: String(appt.team_id || 'unknown').slice(0, 128),
        is_current: Boolean(appt.is_current),
        payload: stripUndefinedDeep(appt),
        updatedBy: actorMeta,
      },
    });
  }

  // 14. competitions
  for (const comp of db.competitions || []) {
    const docId = toSafeFirestoreDocId(comp.id);
    const status = ['import', 'staged', 'verified', 'published'].includes(comp.status)
      ? comp.status
      : 'published';
    upserts.push({
      collection: 'competitions',
      docId,
      fields: {
        id: docId,
        status,
        payload: stripUndefinedDeep(comp),
        updatedBy: actorMeta,
      },
    });
  }

  // 14b. competition_maker
  for (const cm of db.competitionMakers || []) {
    if (!cm?.id) continue;
    const docId = toSafeFirestoreDocId(cm.id);
    const status = ['setup', 'in-progress', 'completed'].includes(cm.status)
      ? cm.status
      : 'setup';
    // Strip bulky per-fixture playerPerformances for Firestore so large tournaments (e.g., 36-team UCL) stay well below Firestore's 1MB document limit
    const compactCm = {
      ...cm,
      stages: (cm.stages || []).map((st) => ({
        ...st,
        fixtures: (st.fixtures || []).map((f) => {
          const restFixture = { ...f };
          delete restFixture.playerPerformances;
          return restFixture;
        }),
      })),
    };
    upserts.push({
      collection: 'competition_maker',
      docId,
      fields: {
        id: docId,
        createdBy: String(cm.createdBy || actorMeta).slice(0, 128),
        status,
        presetId: String(cm.presetId || 'custom').slice(0, 32),
        payload: stripUndefinedDeep(compactCm),
        updatedBy: actorMeta,
      },
    });
  }

  // 15. league_statuses
  for (const lg of db.leagueStatuses || []) {
    const docId = toSafeFirestoreDocId(lg.id);
    const stage = ['import', 'staged', 'verified', 'published'].includes(lg.stage)
      ? lg.stage
      : 'published';
    upserts.push({
      collection: 'league_statuses',
      docId,
      fields: {
        id: docId,
        stage,
        payload: stripUndefinedDeep(lg),
        updatedBy: actorMeta,
      },
    });
  }

  // 16. simulation_matches & scoreboard_matches
  for (const m of db.simulationMatches || []) {
    const docId = toSafeFirestoreDocId(m.id);
    upserts.push({
      collection: 'simulation_matches',
      docId,
      fields: {
        id: docId,
        createdBy: String(m.createdBy || actorMeta).slice(0, 128),
        payload: stripUndefinedDeep(m),
      },
    });
  }
  for (const m of db.scoreboardMatches || []) {
    const docId = toSafeFirestoreDocId(m.id);
    upserts.push({
      collection: 'scoreboard_matches',
      docId,
      fields: {
        id: docId,
        createdBy: String(m.createdBy || actorMeta).slice(0, 128),
        payload: stripUndefinedDeep(m),
      },
    });
  }

  // 17. quiz_questions
  for (const q of db.quizQuestions || []) {
    const docId = toSafeFirestoreDocId(q.id);
    upserts.push({
      collection: 'quiz_questions',
      docId,
      fields: {
        id: docId,
        payload: stripUndefinedDeep(q),
        updatedBy: actorMeta,
      },
    });
  }

  // 18. reader_objectives
  for (const obj of db.readerObjectives || []) {
    const docId = toSafeFirestoreDocId(obj.id);
    upserts.push({
      collection: 'reader_objectives',
      docId,
      fields: {
        id: docId,
        active: Boolean(obj.active),
        payload: stripUndefinedDeep(obj),
        updatedBy: actorMeta,
      },
    });
  }

  // 19. Admin-only append-only collections (newsletter_subscribers, audit_logs)
  if (includeAdminOnly) {
    for (const sub of db.newsletterSubscribers || []) {
      const docId = toSafeFirestoreDocId(sub.id);
      immutableCreates.push({
        collection: 'newsletter_subscribers',
        docId,
        createOnly: true,
        fields: {
          id: docId,
          email: String(sub.email || '').slice(0, 254),
          subscribedAt: String(sub.subscribedAt || new Date().toISOString()).slice(0, 64),
        },
      });
    }
    for (const log of (db.auditLogs || []).slice(0, 60)) {
      const docId = toSafeFirestoreDocId(log.id);
      immutableCreates.push({
        collection: 'audit_logs',
        docId,
        createOnly: true,
        fields: {
          id: docId,
          actorEmail: String(log.actorEmail || 'admin@dodaeona.fc').slice(0, 254),
          payload: stripUndefinedDeep(log),
        },
      });
    }
  }

  return { upserts, immutableCreates, pdfChunkMap, deletedRegistry };
}

function recordBaselineHashes(db: ServerDatabase, seedTemplate: ServerDatabase) {
  const { upserts, immutableCreates, deletedRegistry } = buildDesiredFirestoreDocs(
    db,
    seedTemplate,
    'system-baseline',
    true
  );
  syncedHashes.clear();
  for (const item of upserts) {
    syncedHashes.set(`${item.collection}/${item.docId}`, stableHash(item.fields));
  }
  for (const item of immutableCreates) {
    syncedImmutableKeys.add(`${item.collection}/${item.docId}`);
  }
  lastSyncedDeletedRegistry = deletedRegistry;
}

function mergeByIdWithDeletes<T extends { id: string }>(
  base: T[],
  remote: T[],
  deletedIds: Set<string>
): T[] {
  const map = new Map<string, T>();
  for (const item of base) {
    if (item?.id && !deletedIds.has(item.id)) {
      map.set(item.id, item);
    }
  }
  for (const item of remote) {
    if (item?.id && !deletedIds.has(item.id)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

async function restorePdfFromChunksIfNeeded(
  pdf: PdfFileRecord,
  chunkCount: number,
  authToken?: string | null
): Promise<void> {
  if (!pdf.urlOrData?.startsWith('/uploads/pdfs/') || !pdf.filename || chunkCount <= 0) return;
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
  const filePath = path.join(uploadDir, pdf.filename);
  if (fs.existsSync(filePath)) return;

  const docId = toSafeFirestoreDocId(pdf.id);
  const parts: string[] = [];
  for (let i = 0; i < chunkCount; i++) {
    try {
      const chunkDoc = await getFirestoreDoc(`pdf_files/${docId}/chunks/chunk_${i}`, authToken);
      if (!chunkDoc || typeof chunkDoc.data !== 'string') return;
      parts.push(chunkDoc.data);
    } catch {
      return;
    }
  }
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  fs.writeFileSync(filePath, Buffer.from(parts.join(''), 'base64'));
}

async function applyRemoteDocsToDb(
  db: ServerDatabase,
  options: { authToken?: string | null; isAdminToken?: boolean }
): Promise<boolean> {
  const cfg = getFirebaseConfig();
  if (!cfg) return false;
  const authToken = options.authToken || null;
  const isAdmin = Boolean(options.isAdminToken && authToken);

  try {
    const [
      siteConfigDocs,
      seriesDocs,
      bookDocs,
      pdfDocs,
      annDocs,
      mediaDocs,
      customTeamDocs,
      overrideTeamDocs,
      identityDocs,
      regDocs,
      freeAgentDocs,
      managerDocs,
      appointmentDocs,
      compDocs,
      compMakerDocs,
      leagueDocs,
      simMatchDocs,
      scoreboardDocs,
      quizDocs,
      objectiveDocs,
      subscriberDocs,
      auditDocs,
    ] = await Promise.all([
      isAdmin
        ? listFirestoreDocs('site_config', authToken).catch(() => [])
        : runPublicEqualityQuery('site_config', 'status', { stringValue: 'published' }).catch(() => []),
      isAdmin
        ? listFirestoreDocs('reading_series', authToken).catch(() => [])
        : runPublicEqualityQuery('reading_series', 'published', { booleanValue: true }).catch(() => []),
      isAdmin
        ? listFirestoreDocs('book_volumes', authToken).catch(() => [])
        : runPublicEqualityQuery('book_volumes', 'published', { booleanValue: true }).catch(() => []),
      isAdmin
        ? listFirestoreDocs('pdf_files', authToken).catch(() => [])
        : runPublicEqualityQuery('pdf_files', 'accessStatus', { stringValue: 'public' }).catch(() => []),
      isAdmin
        ? listFirestoreDocs('announcements', authToken).catch(() => [])
        : runPublicEqualityQuery('announcements', 'status', { stringValue: 'published' }).catch(() => []),
      listFirestoreDocs('media_assets', authToken).catch(() => []),
      listFirestoreDocs('custom_teams', authToken).catch(() => []),
      listFirestoreDocs('team_overrides', authToken).catch(() => []),
      listFirestoreDocs('player_identities', authToken).catch(() => []),
      listFirestoreDocs('player_registrations', authToken).catch(() => []),
      listFirestoreDocs('free_agents', authToken).catch(() => []),
      listFirestoreDocs('manager_records', authToken).catch(() => []),
      listFirestoreDocs('manager_appointments', authToken).catch(() => []),
      isAdmin
        ? listFirestoreDocs('competitions', authToken).catch(() => [])
        : runPublicEqualityQuery('competitions', 'status', { stringValue: 'published' }).catch(() => []),
      listFirestoreDocs('competition_maker', authToken).catch(() => []),
      listFirestoreDocs('league_statuses', authToken).catch(() => []),
      listFirestoreDocs('simulation_matches', authToken).catch(() => []),
      listFirestoreDocs('scoreboard_matches', authToken).catch(() => []),
      listFirestoreDocs('quiz_questions', authToken).catch(() => []),
      listFirestoreDocs('reader_objectives', authToken).catch(() => []),
      isAdmin ? listFirestoreDocs('newsletter_subscribers', authToken).catch(() => []) : Promise.resolve([]),
      isAdmin ? listFirestoreDocs('audit_logs', authToken).catch(() => []) : Promise.resolve([]),
    ]);

    const totalRemoteCount =
      siteConfigDocs.length +
      seriesDocs.length +
      bookDocs.length +
      pdfDocs.length +
      annDocs.length +
      mediaDocs.length +
      customTeamDocs.length +
      overrideTeamDocs.length +
      identityDocs.length +
      regDocs.length +
      freeAgentDocs.length +
      managerDocs.length +
      appointmentDocs.length +
      compDocs.length +
      compMakerDocs.length +
      leagueDocs.length +
      simMatchDocs.length +
      scoreboardDocs.length +
      quizDocs.length +
      objectiveDocs.length;

    if (totalRemoteCount === 0) {
      return false;
    }

    // Parse deleted_entities first
    let delReg: Partial<DeletedEntitiesRegistry> = {};
    for (const sc of siteConfigDocs) {
      if (sc.docId === 'deleted_entities' && sc.data?.payload) {
        delReg = sc.data.payload;
        lastSyncedDeletedRegistry = {
          ...lastSyncedDeletedRegistry,
          ...delReg,
        };
      }
    }

    // Apply site_config docs
    for (const sc of siteConfigDocs) {
      const payload = sc.data?.payload;
      if (!payload || typeof payload !== 'object') continue;
      if (sc.docId === 'branding') {
        db.branding = {
          ...db.branding,
          ...(payload as Partial<WebsiteBrandingConfig>),
          dark: { ...db.branding.dark, ...((payload as any).dark || {}) },
          light: { ...db.branding.light, ...((payload as any).light || {}) },
        };
      } else if (sc.docId === 'homepage_config') {
        const remoteHp = payload as Partial<HomepageConfig>;
        db.homepageConfig = {
          ...db.homepageConfig,
          ...remoteHp,
          sections: { ...db.homepageConfig.sections, ...(remoteHp.sections || {}) },
          hero: { ...db.homepageConfig.hero, ...(remoteHp.hero || {}) },
          welcome: { ...db.homepageConfig.welcome, ...(remoteHp.welcome || {}) },
          accessCards: { ...db.homepageConfig.accessCards, ...(remoteHp.accessCards || {}) },
          featuredReads: { ...db.homepageConfig.featuredReads, ...(remoteHp.featuredReads || {}) },
          newsletter: { ...db.homepageConfig.newsletter, ...(remoteHp.newsletter || {}) },
          finalCta: { ...db.homepageConfig.finalCta, ...(remoteHp.finalCta || {}) },
          footer: { ...db.homepageConfig.footer, ...(remoteHp.footer || {}) },
        };
      } else if (sc.docId === 'about_legal') {
        db.aboutLegal = { ...db.aboutLegal, ...(payload as Partial<AboutLegalConfig>) };
      } else if (sc.docId === 'contact_info') {
        db.contactInfo = { ...db.contactInfo, ...(payload as Partial<ContactInfoConfig>) };
      } else if (sc.docId === 'music_tracks' && Array.isArray((payload as any).tracks)) {
        const deletedMusic = new Set(delReg.deletedMusicTrackIds || []);
        const remoteTracks = (payload as { tracks: MusicTrackRecord[] }).tracks.map((t) =>
          t.audioUrl === '/assets/aistudio/Beyond_the_Final_Whistle_-_usesuno.com_2d5d5c3f.wav'
            ? { ...t, audioUrl: '/assets/aistudio/Beyond_the_Final_Whistle_-_usesuno.com_2d5d5c3f.mp3' }
            : t
        );
        const remoteIds = new Set(remoteTracks.map((t) => t.id));
        const newSeedTracks = (db.musicTracks || []).filter(
          (t) => !remoteIds.has(t.id) && !deletedMusic.has(t.id)
        );
        db.musicTracks = [...remoteTracks, ...newSeedTracks];
      } else if (sc.docId === 'squad_overrides') {
        if ((payload as any).squadShirtOverrides) {
          db.squadShirtOverrides = (payload as any).squadShirtOverrides;
        }
        if ((payload as any).squadInjuryOverrides) {
          db.squadInjuryOverrides = (payload as any).squadInjuryOverrides;
        }
      } else if (sc.docId === 'competition_trophies' && Array.isArray((payload as any).trophies)) {
        const remoteTrophies = (payload as { trophies: TrophyDesignConfig[] }).trophies.filter((t) =>
          Boolean(t?.id)
        );
        db.competitionTrophies = mergeByIdWithDeletes(
          db.competitionTrophies || [],
          remoteTrophies,
          new Set()
        );
      } else if (sc.docId === 'hall_of_fame' && Array.isArray((payload as any).entries)) {
        const remoteEntries = (
          payload as { entries: CompetitionEditionHistoryEntry[] }
        ).entries.filter((e) => Boolean(e?.id));
        db.hallOfFame = mergeByIdWithDeletes(db.hallOfFame || [], remoteEntries, new Set()).sort(
          (a, b) => String(b.awardedAt || '').localeCompare(String(a.awardedAt || ''))
        );
      }
    }

    if (Array.isArray(delReg.deletedTeamIds)) {
      db.deletedTeamIds = mergeUniqueIds(db.deletedTeamIds, delReg.deletedTeamIds);
    }
    if (Array.isArray(delReg.deletedPlayerIdentityIds)) {
      db.deletedPlayerIdentityIds = mergeUniqueIds(
        db.deletedPlayerIdentityIds,
        delReg.deletedPlayerIdentityIds
      );
    }
    if (delReg.rankingOverrides && typeof delReg.rankingOverrides === 'object') {
      db.rankingOverrides = { ...(db.rankingOverrides || {}), ...delReg.rankingOverrides };
    }
    if (delReg.draftAboutLegal && !isAdmin && db.aboutLegal?.status === 'published') {
      db.aboutLegal.status = 'draft';
    }

    // reading_series
    if (seriesDocs.length > 0 || (delReg.deletedSeriesIds || []).length > 0) {
      const deletedSeries = new Set(delReg.deletedSeriesIds || []);
      const remoteSeries = seriesDocs
        .map((d) => d.data?.payload as ReadingSeriesItem)
        .filter((s) => Boolean(s?.id));
      db.readingSeries = mergeByIdWithDeletes(db.readingSeries || [], remoteSeries, deletedSeries);
      if (Array.isArray(delReg.unpublishedSeriesIds)) {
        const unpub = new Set(delReg.unpublishedSeriesIds);
        db.readingSeries = db.readingSeries.filter((s) => isAdmin || !unpub.has(s.id));
      }
    }

    // book_volumes
    if (bookDocs.length > 0 || (delReg.deletedBookIds || []).length > 0) {
      const deletedBooks = new Set(delReg.deletedBookIds || []);
      const remoteBooks = bookDocs
        .map((d) => d.data?.payload as BookVolume)
        .filter((b) => Boolean(b?.id));
      db.bookVolumes = mergeByIdWithDeletes(db.bookVolumes || [], remoteBooks, deletedBooks);
      if (Array.isArray(delReg.unpublishedBookIds)) {
        const unpub = new Set(delReg.unpublishedBookIds);
        db.bookVolumes = db.bookVolumes.filter((b) => isAdmin || !unpub.has(b.id));
      }
    }

    // pdf_files + reconstruct uploaded binaries
    if (pdfDocs.length > 0 || (delReg.deletedPdfIds || []).length > 0) {
      const deletedPdfs = new Set(delReg.deletedPdfIds || []);
      const remotePdfs: PdfFileRecord[] = [];
      for (const d of pdfDocs) {
        const pdf = d.data?.payload as PdfFileRecord;
        if (!pdf?.id || deletedPdfs.has(pdf.id)) continue;
        const chunkCount = Number(d.data?.chunkCount) || 0;
        knownRemotePdfChunks.set(d.docId, chunkCount);
        await restorePdfFromChunksIfNeeded(pdf, chunkCount, authToken);
        remotePdfs.push(pdf);
      }
      db.pdfFiles = mergeByIdWithDeletes(db.pdfFiles || [], remotePdfs, deletedPdfs);
      if (Array.isArray(delReg.privatePdfIds) && !isAdmin) {
        const priv = new Set(delReg.privatePdfIds);
        db.pdfFiles = db.pdfFiles.filter((p) => !priv.has(p.id));
      }
    }

    // announcements
    if (annDocs.length > 0 || (delReg.deletedAnnouncementIds || []).length > 0 || (delReg.unpublishedAnnouncementIds || []).length > 0) {
      const deletedAnns = new Set(delReg.deletedAnnouncementIds || []);
      const unpubAnns = new Set(delReg.unpublishedAnnouncementIds || []);
      const remoteAnns = annDocs
        .map((d) => d.data?.payload as ManagedAnnouncement)
        .filter((a) => Boolean(a?.id));
      db.announcements = mergeByIdWithDeletes(db.announcements || [], remoteAnns, deletedAnns).map((a) =>
        !isAdmin && unpubAnns.has(a.id) && a.status === 'published'
          ? { ...a, status: 'hidden' }
          : a
      );
    }

    // media_assets
    if (mediaDocs.length > 0 || (delReg.deletedMediaIds || []).length > 0) {
      const deletedMedia = new Set(delReg.deletedMediaIds || []);
      const remoteMedia = mediaDocs.map((d) => d.data?.payload as MediaAsset).filter((m) => Boolean(m?.id));
      db.mediaAssets = mergeByIdWithDeletes(db.mediaAssets || [], remoteMedia, deletedMedia);
    }

    // custom_teams & team_overrides
    const deletedTeamSet = new Set(db.deletedTeamIds || []);
    if (customTeamDocs.length > 0) {
      const remoteCustom = customTeamDocs.map((d) => d.data?.payload).filter((t) => Boolean(t?.id));
      db.customTeams = mergeByIdWithDeletes(db.customTeams || [], remoteCustom, deletedTeamSet);
    } else if (deletedTeamSet.size > 0) {
      db.customTeams = (db.customTeams || []).filter((t) => !deletedTeamSet.has(t.id));
    }

    if (overrideTeamDocs.length > 0) {
      const nextOverrides: Record<string, any> = { ...(db.teamOverrides || {}) };
      for (const d of overrideTeamDocs) {
        const ov = d.data?.payload;
        const teamId = ov?.id || d.docId;
        if (teamId && !deletedTeamSet.has(teamId)) {
          nextOverrides[teamId] = ov;
        }
      }
      db.teamOverrides = nextOverrides;
    }

    // player_identities
    const deletedIdentitySet = new Set(db.deletedPlayerIdentityIds || []);
    if (identityDocs.length > 0) {
      const nextIds: Record<string, any> = { ...(db.playerIdentityOverrides || {}) };
      for (const d of identityDocs) {
        const ov = d.data?.payload;
        const playerId = ov?.id || d.docId;
        if (playerId && !deletedIdentitySet.has(playerId)) {
          nextIds[playerId] = ov;
        }
      }
      db.playerIdentityOverrides = nextIds;
    }

    // player_registrations
    if (regDocs.length > 0) {
      const clubRegs: any[] = [];
      const natRegs: any[] = [];
      for (const d of regDocs) {
        const reg = d.data?.payload;
        if (!reg?.id) continue;
        const cleanReg = { ...reg };
        const kind = cleanReg.__regKind || d.data?.team_type;
        delete cleanReg.__regKind;
        if (kind === 'country') {
          natRegs.push(cleanReg);
        } else {
          clubRegs.push(cleanReg);
        }
      }
      db.clubRegistrations = mergeByIdWithDeletes(db.clubRegistrations || [], clubRegs, new Set());
      db.nationalRegistrations = mergeByIdWithDeletes(db.nationalRegistrations || [], natRegs, new Set());
    }

    // free_agents
    if (freeAgentDocs.length > 0) {
      const remoteAgents = freeAgentDocs.map((d) => d.data?.payload).filter((a) => Boolean(a?.id));
      db.freeAgents = mergeByIdWithDeletes(db.freeAgents || [], remoteAgents, new Set());
    }

    // manager_records & manager_appointments (delta overlay!)
    if (managerDocs.length > 0 || (delReg.deletedManagerIds || []).length > 0) {
      const deletedMgrs = new Set(delReg.deletedManagerIds || []);
      const remoteMgrs = managerDocs.map((d) => d.data?.payload as Manager).filter((m) => Boolean(m?.id));
      db.managers = mergeByIdWithDeletes(db.managers || [], remoteMgrs, deletedMgrs);
    }
    if (appointmentDocs.length > 0 || (delReg.deletedAppointmentIds || []).length > 0) {
      const deletedAppts = new Set(delReg.deletedAppointmentIds || []);
      const remoteAppts = appointmentDocs
        .map((d) => d.data?.payload as ManagerAppointment)
        .filter((a) => Boolean(a?.id));
      db.managerAppointments = mergeByIdWithDeletes(
        db.managerAppointments || [],
        remoteAppts,
        deletedAppts
      );
    }

    // competitions
    if (compDocs.length > 0 || (delReg.deletedCompetitionIds || []).length > 0) {
      const deletedComps = new Set(delReg.deletedCompetitionIds || []);
      const remoteComps = compDocs
        .map((d) => d.data?.payload as CompetitionRecord)
        .filter((c) => Boolean(c?.id));
      db.competitions = mergeByIdWithDeletes(db.competitions || [], remoteComps, deletedComps);
    }

    // competition_maker
    if (compMakerDocs.length > 0) {
      const remoteMakers = compMakerDocs
        .map((d) => d.data?.payload as CompetitionMakerTournament)
        .filter((cm) => Boolean(cm?.id));
      db.competitionMakers = mergeByIdWithDeletes(
        db.competitionMakers || [],
        remoteMakers,
        new Set()
      ).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    }

    // league_statuses
    if (leagueDocs.length > 0) {
      const remoteLeagues = leagueDocs
        .map((d) => d.data?.payload as LeagueStatusRecord)
        .filter((l) => Boolean(l?.id));
      db.leagueStatuses = mergeByIdWithDeletes(db.leagueStatuses || [], remoteLeagues, new Set());
    }

    // simulation_matches & scoreboard_matches
    if (simMatchDocs.length > 0) {
      const remoteSims = simMatchDocs
        .map((d) => d.data?.payload as SimulationMatchRecord)
        .filter((m) => Boolean(m?.id));
      db.simulationMatches = mergeByIdWithDeletes(db.simulationMatches || [], remoteSims, new Set()).sort(
        (a, b) => String(b.date || '').localeCompare(String(a.date || ''))
      );
    }
    if (scoreboardDocs.length > 0) {
      const remoteSb = scoreboardDocs
        .map((d) => d.data?.payload as ScoreboardMatchRecord)
        .filter((m) => Boolean(m?.id));
      db.scoreboardMatches = mergeByIdWithDeletes(db.scoreboardMatches || [], remoteSb, new Set()).sort(
        (a, b) => String(b.savedAt || b.date || '').localeCompare(String(a.savedAt || a.date || ''))
      );
    }

    // quiz_questions
    if (quizDocs.length > 0 || (delReg.deletedQuizIds || []).length > 0) {
      const deletedQuiz = new Set(delReg.deletedQuizIds || []);
      const remoteQuiz = quizDocs
        .map((d) => d.data?.payload as QuizQuestionRecord)
        .filter((q) => Boolean(q?.id));
      db.quizQuestions = mergeByIdWithDeletes(db.quizQuestions || [], remoteQuiz, deletedQuiz);
    }

    // reader_objectives
    if (objectiveDocs.length > 0 || (delReg.deletedObjectiveIds || []).length > 0) {
      const deletedObj = new Set(delReg.deletedObjectiveIds || []);
      const inactiveObj = new Set(delReg.inactiveObjectiveIds || []);
      const remoteObjs = objectiveDocs
        .map((d) => d.data?.payload as ReaderObjectiveRecord)
        .filter((o) => Boolean(o?.id));
      db.readerObjectives = mergeByIdWithDeletes(db.readerObjectives || [], remoteObjs, deletedObj).map(
        (o) => (!isAdmin && inactiveObj.has(o.id) ? { ...o, active: false } : o)
      );
    }

    // admin-only: newsletter_subscribers & audit_logs
    if (isAdmin && subscriberDocs.length > 0) {
      const remoteSubs: NewsletterSubscriberRecord[] = [];
      for (const d of subscriberDocs) {
        syncedImmutableKeys.add(`newsletter_subscribers/${d.docId}`);
        const email = String(d.data?.email || '');
        if (email) {
          remoteSubs.push({
            id: d.data?.id || d.docId,
            email,
            subscribedAt: String(d.data?.subscribedAt || new Date().toISOString()),
          });
        }
      }
      db.newsletterSubscribers = mergeByIdWithDeletes(
        db.newsletterSubscribers || [],
        remoteSubs,
        new Set()
      );
    }
    if (isAdmin && auditDocs.length > 0) {
      const remoteAudits: AuditLogEntry[] = [];
      for (const d of auditDocs) {
        syncedImmutableKeys.add(`audit_logs/${d.docId}`);
        const log = d.data?.payload as AuditLogEntry;
        if (log?.id) remoteAudits.push(log);
      }
      db.auditLogs = mergeByIdWithDeletes(db.auditLogs || [], remoteAudits, new Set()).sort((a, b) =>
        String(b.timestamp || '').localeCompare(String(a.timestamp || ''))
      );
    }

    return true;
  } catch (err) {
    console.warn('Firestore hydration skipped or partial due to error:', err);
    return false;
  }
}

export async function hydrateDbOnStartup(
  db: ServerDatabase,
  seedTemplate: ServerDatabase
): Promise<boolean> {
  ensureSeedBaselines(seedTemplate);
  const changed = await applyRemoteDocsToDb(db, { isAdminToken: false });
  recordBaselineHashes(db, seedTemplate);
  hydratedOnBoot = true;
  return changed;
}

export async function reconcileAdminWithFirestore(
  db: ServerDatabase,
  seedTemplate: ServerDatabase,
  idToken: string
): Promise<{ ok: boolean; pushedCount: number; pulledChanges: boolean }> {
  const cfg = getFirebaseConfig();
  if (!cfg || !idToken) return { ok: false, pushedCount: 0, pulledChanges: false };
  const claims = extractJwtClaims(idToken);
  if (claims.expired || !claims.uid || !claims.emailVerified) {
    return { ok: false, pushedCount: 0, pulledChanges: false };
  }

  let pulledChanges = false;
  if (!hasLocalUnsyncedMutations) {
    pulledChanges = await applyRemoteDocsToDb(db, { authToken: idToken, isAdminToken: true });
    recordBaselineHashes(db, seedTemplate);
  }

  const pushedCount = await performCommitDiff(db, seedTemplate, idToken, claims.uid, true);
  hasLocalUnsyncedMutations = false;
  return { ok: true, pushedCount, pulledChanges };
}

async function performCommitDiff(
  db: ServerDatabase,
  seedTemplate: ServerDatabase,
  idToken: string,
  actorUid: string,
  includeAdminOnly: boolean
): Promise<number> {
  const cfg = getFirebaseConfig();
  if (!cfg) return 0;

  const { upserts, immutableCreates, pdfChunkMap, deletedRegistry } = buildDesiredFirestoreDocs(
    db,
    seedTemplate,
    actorUid,
    includeAdminOnly
  );

  const writes: Array<Record<string, unknown>> = [];
  const immutableWrites: Array<Record<string, unknown>> = [];
  const nextKeys = new Set<string>();
  const pendingHashes = new Map<string, string>();
  const pendingImmutable = new Set<string>();

  for (const item of upserts) {
    const key = `${item.collection}/${item.docId}`;
    nextKeys.add(key);
    const h = stableHash(item.fields);
    if (syncedHashes.get(key) !== h) {
      writes.push(buildCommitWriteForUpsert(cfg, item));
      pendingHashes.set(key, h);
    }
  }

  for (const item of immutableCreates) {
    const key = `${item.collection}/${item.docId}`;
    if (!syncedImmutableKeys.has(key)) {
      immutableWrites.push(buildCommitWriteForUpsert(cfg, item));
      pendingImmutable.add(key);
    }
  }

  // Delete docs that previously existed in Firestore (tracked in syncedHashes) and were removed
  const nonDeltaCollections = new Set([
    'reading_series',
    'book_volumes',
    'pdf_files',
    'announcements',
    'media_assets',
    'custom_teams',
    'team_overrides',
    'player_identities',
    'player_registrations',
    'free_agents',
    'competitions',
    'competition_maker',
    'league_statuses',
    'simulation_matches',
    'scoreboard_matches',
    'quiz_questions',
    'reader_objectives',
  ]);
  const deletedDocKeys: string[] = [];
  for (const prevKey of syncedHashes.keys()) {
    if (!nextKeys.has(prevKey)) {
      const [collection, docId] = prevKey.split('/');
      if (nonDeltaCollections.has(collection)) {
        writes.push(buildCommitWriteForDelete(cfg, collection, docId));
        deletedDocKeys.push(prevKey);
      }
    }
  }

  // Delete managers/appointments specifically removed by ID
  for (const mgrId of deletedRegistry.deletedManagerIds) {
    const docId = toSafeFirestoreDocId(mgrId);
    const key = `manager_records/${docId}`;
    if (syncedHashes.has(key)) {
      writes.push(buildCommitWriteForDelete(cfg, 'manager_records', docId));
      deletedDocKeys.push(key);
    }
  }
  for (const apptId of deletedRegistry.deletedAppointmentIds) {
    const docId = toSafeFirestoreDocId(apptId);
    const key = `manager_appointments/${docId}`;
    if (syncedHashes.has(key)) {
      writes.push(buildCommitWriteForDelete(cfg, 'manager_appointments', docId));
      deletedDocKeys.push(key);
    }
  }

  // Also queue PDF binary chunks for new/changed PDFs (small commits of 6 chunks each)
  const chunkWrites: Array<Record<string, unknown>> = [];
  for (const [pdfDocId, chunks] of pdfChunkMap.entries()) {
    const pdfHashKey = `pdf_chunks/${pdfDocId}`;
    const chunksHash = stableHash(chunks);
    if (syncedHashes.get(pdfHashKey) !== chunksHash) {
      for (let i = 0; i < chunks.length; i++) {
        chunkWrites.push(
          buildCommitWriteForUpsert(cfg, {
            collection: `pdf_files/${pdfDocId}/chunks`,
            docId: `chunk_${i}`,
            fields: {
              pdfId: pdfDocId,
              index: i,
              data: chunks[i],
            },
          })
        );
      }
      pendingHashes.set(pdfHashKey, chunksHash);
      knownRemotePdfChunks.set(pdfDocId, chunks.length);
    }
  }

  if (writes.length === 0 && chunkWrites.length === 0 && immutableWrites.length === 0) {
    return 0;
  }

  const okMain = writes.length > 0 ? await commitFirestoreWrites(writes, idToken) : true;
  if (!okMain) return 0;

  let okChunks = true;
  for (let i = 0; i < chunkWrites.length; i += 6) {
    const ok = await commitFirestoreWrites(chunkWrites.slice(i, i + 6), idToken);
    if (!ok) {
      okChunks = false;
      break;
    }
  }

  if (immutableWrites.length > 0) {
    // Best-effort per item or batch for append-only records so existing records never block main sync
    const okImm = await commitFirestoreWrites(immutableWrites, idToken);
    if (okImm) {
      for (const k of pendingImmutable) syncedImmutableKeys.add(k);
    } else {
      for (const w of immutableWrites) {
        const name = String((w.update as any)?.name || '');
        const parts = name.split('/');
        const key = `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
        const singleOk = await commitFirestoreWrites([w], idToken);
        if (singleOk || name) {
          syncedImmutableKeys.add(key);
        }
      }
    }
  }

  if (!okChunks) return writes.length;

  for (const [k, v] of pendingHashes.entries()) {
    syncedHashes.set(k, v);
  }
  for (const k of deletedDocKeys) {
    syncedHashes.delete(k);
  }
  lastSyncedDeletedRegistry = deletedRegistry;
  return writes.length + chunkWrites.length + immutableWrites.length;
}

export function trackDeletedEntityId(
  kind:
    | 'series'
    | 'book'
    | 'pdf',
  id: string
): void {
  if (!id) return;
  if (kind === 'series') {
    lastSyncedDeletedRegistry.deletedSeriesIds = mergeUniqueIds(
      lastSyncedDeletedRegistry.deletedSeriesIds,
      [id]
    );
  } else if (kind === 'book') {
    lastSyncedDeletedRegistry.deletedBookIds = mergeUniqueIds(
      lastSyncedDeletedRegistry.deletedBookIds,
      [id]
    );
  } else if (kind === 'pdf') {
    lastSyncedDeletedRegistry.deletedPdfIds = mergeUniqueIds(
      lastSyncedDeletedRegistry.deletedPdfIds,
      [id]
    );
  }
}

export function scheduleFirestoreSync(db: ServerDatabase, seedTemplate: ServerDatabase): void {
  if (!hydratedOnBoot) return;

  const ctx = getCurrentFirebaseContext();
  const idToken = ctx?.idToken || null;
  if (!idToken) {
    hasLocalUnsyncedMutations = true;
    return;
  }

  const claims = extractJwtClaims(idToken);
  if (claims.expired || !claims.uid || !claims.emailVerified) {
    hasLocalUnsyncedMutations = true;
    return;
  }

  // Capture a shallow snapshot clone on the hot path so async mutations don't race
  const snapshotDb: ServerDatabase = {
    ...db,
    readingSeries: [...(db.readingSeries || [])],
    bookVolumes: [...(db.bookVolumes || [])],
    pdfFiles: [...(db.pdfFiles || [])],
    announcements: [...(db.announcements || [])],
    mediaAssets: [...(db.mediaAssets || [])],
    customTeams: [...(db.customTeams || [])],
    teamOverrides: { ...(db.teamOverrides || {}) },
    deletedTeamIds: [...(db.deletedTeamIds || [])],
    freeAgents: [...(db.freeAgents || [])],
    playerIdentityOverrides: { ...(db.playerIdentityOverrides || {}) },
    deletedPlayerIdentityIds: [...(db.deletedPlayerIdentityIds || [])],
    clubRegistrations: [...(db.clubRegistrations || [])],
    nationalRegistrations: [...(db.nationalRegistrations || [])],
    managers: [...(db.managers || [])],
    managerAppointments: [...(db.managerAppointments || [])],
    competitions: [...(db.competitions || [])],
    competitionMakers: [...(db.competitionMakers || [])],
    competitionTrophies: [...(db.competitionTrophies || [])],
    hallOfFame: [...(db.hallOfFame || [])],
    leagueStatuses: [...(db.leagueStatuses || [])],
    simulationMatches: [...(db.simulationMatches || [])],
    scoreboardMatches: [...(db.scoreboardMatches || [])],
    quizQuestions: [...(db.quizQuestions || [])],
    readerObjectives: [...(db.readerObjectives || [])],
    newsletterSubscribers: [...(db.newsletterSubscribers || [])],
    auditLogs: [...(db.auditLogs || [])],
    musicTracks: [...(db.musicTracks || [])],
    rankingOverrides: { ...(db.rankingOverrides || {}) },
    squadShirtOverrides: { ...(db.squadShirtOverrides || {}) },
    squadInjuryOverrides: { ...(db.squadInjuryOverrides || {}) },

  };

  syncChain = syncChain
    .then(async () => {
      await performCommitDiff(snapshotDb, seedTemplate, idToken, claims.uid!, true);
      hasLocalUnsyncedMutations = false;
    })
    .catch((err) => {
      hasLocalUnsyncedMutations = true;
      console.error('Background Firestore sync failed:', err);
    });
}

export async function flushPendingFirestoreSync(): Promise<void> {
  await syncChain;
}
