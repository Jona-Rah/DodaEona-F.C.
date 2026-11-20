import 'dotenv/config';
process.env.DISABLE_HMR = 'true';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { TEAMS_DATABASE } from './src/data/teamsDatabase';
import { normalizeCountryName } from './src/data/countryMetadata';
import { getTeamType, Team, TrophyRecord } from './src/types/matchCentre';
import {
  buildDefaultClubPenaltyOrderIds,
  reconcilePenaltyOrderIds,
} from './src/utils/penaltyOrder';
import {
  createTournamentFromConfig,
  importSimulationIntoFixture,
  isStageLocked,
  performStageDraw,
  PRESET_TROPHIES,
  recoverTournamentState,
  resetCompetitionScope,
  simulateCompetitionBatch,
  simulateCompetitionFixture,
  validateTournamentConfig,
} from './src/utils/competitionEngine';
import {
  attachAuth,
  AuthenticatedRequest,
  clearSessionCookie,
  requireAdmin,
  requireAuth,
  SESSION_DURATION_MS,
  setSessionCookie,
  signSessionToken,
  toPublicUser,
} from './server/middleware/auth';
import {
  adminSimulationDatabase,
  adminUserActivity,
  computeClubRankings,
  enrichManagers,
  footballIntelligence,
  quizLeaderboard,
  quizSubmit,
} from './server/services/domainServices';
import {
  buildLiveRegistryBundle,
  changeAdminPlayerNation,
  createAdminPlayerIdentity,
  deleteAdminPlayerIdentity,
  deleteAdminRegistrationRecord,
  getPublicPlayerProfile,
  registerAdminPlayerToTeam,
  releaseAdminRegistration,
  retireAdminPlayerFromNation,
  searchPublicPlayers,
  syncTeamShirtNumbersToRegistry,
  transferAdminPlayerClub,
  updateAdminPlayerIdentity,
  updateAdminRegistration,
} from './server/services/playerRegistryService';
import {
  addCareerAppointment,
  assignManager,
  createManager,
  endManagerAppointment,
  endTeamCurrentManagerAppointment,
  ensureManagerCollections,
  getManagerById,
  listManagers,
  managerStatistics,
  updateManager,
  withManagerAges,
} from './server/services/managerService';
import {
  getSingleTeamStatistics,
  getTeamStatisticsList,
} from './server/services/teamStatisticsService';
import {
  attachGeminiLiveWebSocket,
  GeminiServiceError,
  generateHalftimeBroadcastAudio,
  generateLivePunditTurn,
  generateMatchBroadcastAudio,
} from './server/services/geminiAudioService';
import {
  appendAudit,
  appendUserActivity,
  BRANDING_PRESETS,
  buildFeaturedMusicTracks,
  buildSeedDatabase,
  deduplicateSubscribers,
  getDb,
  getSeedTemplate,
  hashPassword,
  saveDb,
  sortAnnouncementsNewestFirst,
  verifyPassword,
} from './server/store';
import {
  extractJwtClaims,
  flushPendingFirestoreSync,
  hydrateDbOnStartup,
  reconcileAdminWithFirestore,
  runWithFirebaseContext,
  trackDeletedEntityId,
} from './server/services/firestoreSyncService';
import type {
  BookVolume,
  HomepageConfig,
  LeagueLifecycleStage,
  ManagedAnnouncement,
  MediaAsset,
  QuizAttemptRecord,
  QuizQuestionRecord,
  ReadingSeriesItem,
  ReadsCategory,
  ScoreboardMatchRecord,
  ServerDatabase,
  ServerUser,
} from './server/types';
import type {
  CompetitionMakerTournament,
  TrophyDesignConfig,
} from './src/types/competitionMaker';
import type { Manager } from './src/types/manager';


const BOOTSTRAPPED_ADMIN_EMAILS = new Set([
  'admin@dodaeona.fc',
  'jonathan.elraheb@gmail.com',
  'david.emanoueel.gr7@gmail.com',
  'malak.marian1984@gmail.com',
]);

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.set('trust proxy', 1);
  app.use('/api', (req, res, next) => {
    const acceptEncoding = String(req.headers['accept-encoding'] || '');
    if (!/\bgzip\b/i.test(acceptEncoding)) {
      next();
      return;
    }
    const origJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      try {
        const jsonStr = JSON.stringify(body);
        if (!jsonStr || jsonStr.length < 2048 || res.headersSent) {
          return origJson(body);
        }
        const buf = Buffer.from(jsonStr, 'utf-8');
        zlib.gzip(buf, { level: zlib.constants.Z_BEST_SPEED }, (err, compressed) => {
          if (err || res.headersSent) {
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.send(buf);
            }
            return;
          }
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Content-Encoding', 'gzip');
          res.setHeader('Vary', 'Accept-Encoding');
          res.setHeader('Content-Length', String(compressed.length));
          res.send(compressed);
        });
        return res;
      } catch {
        return origJson(body);
      }
    }) as typeof res.json;
    next();
  });
  app.use(express.json({ limit: '25mb' }));
  app.use((req, _res, next) => {
    const rawToken = req.headers['x-firebase-id-token'];
    const fbToken =
      typeof rawToken === 'string' && rawToken.trim().length > 20 ? rawToken.trim() : null;
    const claims = fbToken ? extractJwtClaims(fbToken) : null;
    runWithFirebaseContext(
      {
        idToken: fbToken && claims && !claims.expired ? fbToken : null,
        uid: claims?.uid || null,
        email: claims?.email || null,
      },
      next
    );
  });
  app.use(attachAuth);
  app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
  const srcAssetsStatic = express.static(path.join(process.cwd(), 'src', 'assets', 'images'));
  app.use('/src/assets/images', (req, res, next) => {
    if (
      'import' in req.query ||
      'url' in req.query ||
      'raw' in req.query ||
      'inline' in req.query ||
      req.headers['sec-fetch-dest'] === 'script'
    ) {
      next();
      return;
    }
    srcAssetsStatic(req, res, next);
  });

  // =========================================================================
  // 1. AUTHENTICATION ENDPOINTS (HTTP-only HMAC-signed session cookies)
  // =========================================================================
  app.get('/api/auth/me', (req: AuthenticatedRequest, res) => {
    if (!req.authUser || !req.authSession) {
      res.json({ isAuthenticated: false, user: null });
      return;
    }
    const db = getDb();
    const signed = signSessionToken(req.authSession.sid, db.sessionSecret);
    setSessionCookie(res, signed, req);
    res.json({
      isAuthenticated: true,
      user: toPublicUser(req.authUser),
      sessionToken: signed,
    });
  });

  app.post('/api/auth/login', (req: AuthenticatedRequest, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const db = getDb();
    let user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user && BOOTSTRAPPED_ADMIN_EMAILS.has(email) && password === 'DodaEonaAdmin2026!') {
      const nowIso = new Date().toISOString();
      user = {
        id: `usr-admin-${Date.now()}`,
        name: email === 'admin@dodaeona.fc' ? 'Club Administrator' : email.split('@')[0],
        email,
        passwordHash: hashPassword('DodaEonaAdmin2026!'),
        role: 'admin',
        blocked: false,
        createdAt: nowIso,
        lastActiveAt: nowIso,
      };
      db.users.push(user);
    }
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }
    if (BOOTSTRAPPED_ADMIN_EMAILS.has(email)) {
      user.role = 'admin';
    }

    if (user.blocked) {
      res.status(403).json({
        error: user.blockedReason
          ? `Account suspended: ${user.blockedReason}`
          : 'This account has been suspended by a platform administrator.',
      });
      return;
    }

    const sid = crypto.randomBytes(24).toString('hex');
    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const expiresIso = new Date(nowMs + SESSION_DURATION_MS).toISOString();

    user.lastActiveAt = nowIso;
    const activeSessions = (db.sessions || []).filter(
      (s) => new Date(s.expiresAt).getTime() > nowMs
    );
    db.sessions = [
      {
        sid,
        userId: user.id,
        userAgent: String(req.headers['user-agent'] || 'Browser Client').slice(0, 140),
        ip: req.ip || '127.0.0.1',
        createdAt: nowIso,
        lastSeenAt: nowIso,
        expiresAt: expiresIso,
      },
      ...activeSessions.slice(0, 499),
    ];

    appendUserActivity(db, {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      category: 'auth',
      action: 'Signed in',
      target: user.role === 'admin' ? 'Owner Control Room Session' : 'Reader Session',
    });

    saveDb(db);

    const signed = signSessionToken(sid, db.sessionSecret);
    setSessionCookie(res, signed, req);

    res.json({
      isAuthenticated: true,
      user: toPublicUser(user),
      sessionToken: signed,
    });
  });

  app.post('/api/auth/register', (req: AuthenticatedRequest, res) => {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!name || !email || password.length < 6) {
      res.status(400).json({ error: 'Name, valid email, and password (min 6 characters) are required.' });
      return;
    }

    const db = getDb();
    if (db.users.some((u) => u.email.toLowerCase() === email)) {
      res.status(409).json({ error: 'An account with that email already exists.' });
      return;
    }

    const nowIso = new Date().toISOString();
    // Always enforce role: 'member' on public signups; never accept client-supplied role!
    const newUser: ServerUser = {
      id: `usr-${Date.now()}`,
      name,
      email,
      passwordHash: hashPassword(password),
      role: 'member',
      blocked: false,
      createdAt: nowIso,
      lastActiveAt: nowIso,
    };

    const sid = crypto.randomBytes(24).toString('hex');
    const nowMs = Date.now();
    db.users.push(newUser);
    const activeSessions = (db.sessions || []).filter(
      (s) => new Date(s.expiresAt).getTime() > nowMs
    );
    db.sessions = [
      {
        sid,
        userId: newUser.id,
        userAgent: String(req.headers['user-agent'] || 'Browser Client').slice(0, 140),
        ip: req.ip || '127.0.0.1',
        createdAt: nowIso,
        lastSeenAt: nowIso,
        expiresAt: new Date(nowMs + SESSION_DURATION_MS).toISOString(),
      },
      ...activeSessions.slice(0, 499),
    ];

    appendUserActivity(db, {
      userId: newUser.id,
      userName: newUser.name,
      userEmail: newUser.email,
      category: 'auth',
      action: 'Registered Account',
      target: 'DodaEona F.C. Library',
    });
    saveDb(db);

    const signed = signSessionToken(sid, db.sessionSecret);
    setSessionCookie(res, signed, req);
    res.status(201).json({
      isAuthenticated: true,
      user: toPublicUser(newUser),
      sessionToken: signed,
    });
  });

  app.post('/api/auth/google', async (req: AuthenticatedRequest, res) => {
    const idToken = String(req.body?.idToken || '').trim();
    if (!idToken) {
      res.status(400).json({ error: 'Google sign-in token is required.' });
      return;
    }

    let firebaseApiKey = '';
    let firebaseProjectId = '';
    try {
      const cfgPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      firebaseApiKey = String(cfg?.apiKey || '').trim();
      firebaseProjectId = String(cfg?.projectId || '').trim();
    } catch {
      res.status(500).json({ error: 'Firebase authentication configuration is not available on server.' });
      return;
    }

    if (!firebaseApiKey || !firebaseProjectId) {
      res.status(500).json({ error: 'Firebase configuration is missing required fields.' });
      return;
    }

    try {
      const tokenParts = idToken.split('.');
      if (tokenParts.length !== 3) {
        res.status(401).json({ error: 'Invalid Google sign-in token format.' });
        return;
      }
      let claims: { aud?: string; iss?: string; exp?: number };
      try {
        claims = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString('utf8')) as {
          aud?: string;
          iss?: string;
          exp?: number;
        };
      } catch {
        res.status(401).json({ error: 'Invalid Google sign-in token payload.' });
        return;
      }
      if (
        claims.aud !== firebaseProjectId ||
        claims.iss !== `https://securetoken.google.com/${firebaseProjectId}` ||
        (claims.exp && claims.exp * 1000 < Date.now())
      ) {
        res.status(401).json({ error: 'Google sign-in token is expired or belongs to a different project.' });
        return;
      }

      const lookupRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        }
      );

      if (!lookupRes.ok) {
        res.status(401).json({ error: 'Google authentication token could not be verified.' });
        return;
      }

      const lookupData = (await lookupRes.json()) as {
        users?: Array<{
          localId?: string;
          email?: string;
          emailVerified?: boolean;
          displayName?: string;
        }>;
      };

      const fbUser = lookupData.users?.[0];
      const verifiedEmail = String(fbUser?.email || '').trim().toLowerCase();
      if (!verifiedEmail || !fbUser?.emailVerified) {
        res.status(401).json({
          error: 'Google account verification failed: a verified email address is required.',
        });
        return;
      }

      const db = getDb();
      const nowMs = Date.now();
      const nowIso = new Date(nowMs).toISOString();
      const expiresIso = new Date(nowMs + SESSION_DURATION_MS).toISOString();

      let user = db.users.find((u) => u.email.toLowerCase() === verifiedEmail);
      let isNewAccount = false;

      if (!user) {
        isNewAccount = true;
        const fallbackName =
          verifiedEmail
            .split('@')[0]
            .replace(/[._-]+/g, ' ')
            .trim() || 'Club Reader';
        const resolvedName = String(fbUser.displayName || fallbackName).trim().slice(0, 80);

        user = {
          id: `usr-${Date.now()}`,
          name: resolvedName,
          email: verifiedEmail,
          passwordHash: hashPassword(crypto.randomBytes(32).toString('hex')),
          role: BOOTSTRAPPED_ADMIN_EMAILS.has(verifiedEmail) ? 'admin' : 'member',
          blocked: false,
          createdAt: nowIso,
          lastActiveAt: nowIso,
        };
        db.users.push(user);
      } else {
        if (BOOTSTRAPPED_ADMIN_EMAILS.has(verifiedEmail)) {
          user.role = 'admin';
        }
        if (user.blocked) {
          res.status(403).json({
            error: user.blockedReason
              ? `Account suspended: ${user.blockedReason}`
              : 'This account has been suspended by a platform administrator.',
          });
          return;
        }
        user.lastActiveAt = nowIso;
      }

      const sid = crypto.randomBytes(24).toString('hex');
      const activeSessions = (db.sessions || []).filter(
        (s) => new Date(s.expiresAt).getTime() > nowMs
      );
      db.sessions = [
        {
          sid,
          userId: user.id,
          userAgent: String(req.headers['user-agent'] || 'Google Auth Client').slice(0, 140),
          ip: req.ip || '127.0.0.1',
          createdAt: nowIso,
          lastSeenAt: nowIso,
          expiresAt: expiresIso,
        },
        ...activeSessions.slice(0, 499),
      ];

      appendUserActivity(db, {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        category: 'auth',
        action: isNewAccount ? 'Registered via Google' : 'Signed in with Google',
        target: user.role === 'admin' ? 'Owner Control Room Session' : 'Reader Session',
      });

      saveDb(db);

      const signed = signSessionToken(sid, db.sessionSecret);
      setSessionCookie(res, signed, req);

      res.status(isNewAccount ? 201 : 200).json({
        isAuthenticated: true,
        isNewAccount,
        user: toPublicUser(user),
        sessionToken: signed,
      });
    } catch {
      res.status(502).json({ error: 'Unable to reach Google authentication verification service.' });
    }
  });

  app.post('/api/auth/logout', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    if (req.authSession) {
      db.sessions = db.sessions.filter((s) => s.sid !== req.authSession?.sid);
      saveDb(db);
    }
    clearSessionCookie(res, req);
    res.json({ ok: true });
  });

  app.post('/api/auth/password', requireAuth, (req: AuthenticatedRequest, res) => {
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');
    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long.' });
      return;
    }

    const db = getDb();
    const user = db.users.find((u) => u.id === req.authUser!.id);
    if (!user || !verifyPassword(currentPassword, user.passwordHash)) {
      res.status(401).json({ error: 'Current password is incorrect.' });
      return;
    }

    user.passwordHash = hashPassword(newPassword);
    appendAudit(db, user, 'Updated password', 'Account & Security', user.email);
    saveDb(db);

    res.json({ ok: true, message: 'Password updated successfully.' });
  });

  app.delete('/api/auth/sessions/:sid', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const targetSid = String(req.params.sid || '');
    const targetSession = db.sessions.find((s) => s.sid === targetSid);
    if (!targetSession || (targetSession.userId !== req.authUser!.id && req.authUser!.role !== 'admin')) {
      res.status(404).json({ error: 'Session not found.' });
      return;
    }
    db.sessions = db.sessions.filter((s) => s.sid !== targetSid);
    saveDb(db);
    res.json({ ok: true });
  });

  // =========================================================================
  // 2. PUBLIC READ ENDPOINTS & PROTECTED PDF GATE
  // =========================================================================
  app.get('/api/public/bootstrap', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const isLite = req.query?.lite === '1' || req.query?.lite === 'true';
    const isAdmin = req.authUser?.role === 'admin' && !req.authUser.blocked;
    const publishedAnnouncements = sortAnnouncementsNewestFirst(
      db.announcements.filter((a) => a.status === 'published')
    );
    const litePayload = {
      branding: db.branding,
      presets: BRANDING_PRESETS,
      announcements: publishedAnnouncements,
      homepageConfig: db.homepageConfig,
      readingSeries: isAdmin ? db.readingSeries : db.readingSeries.filter((s) => s.published),
      bookVolumes: isAdmin ? db.bookVolumes : db.bookVolumes.filter((b) => b.published),
      musicTracks: db.musicTracks.filter((t) => t.enabled && t.featured !== false),
      aboutLegal: db.aboutLegal.status === 'published' ? db.aboutLegal : null,
      contactInfo: db.contactInfo,
      mapsApiKey: process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    };
    if (isLite) {
      res.json(litePayload);
      return;
    }
    res.json({
      ...litePayload,
      squadShirtOverrides: db.squadShirtOverrides,
      squadInjuryOverrides: db.squadInjuryOverrides,
      objectives: db.readerObjectives.filter((o) => o.active),
      teamOverrides: db.teamOverrides || {},
      customTeams: db.customTeams || [],
      deletedTeamIds: db.deletedTeamIds || [],
      freeAgents: db.freeAgents || null,
      playerIdentityOverrides: db.playerIdentityOverrides || {},
      deletedPlayerIdentityIds: db.deletedPlayerIdentityIds || [],
      clubRegistrations: db.clubRegistrations || [],
      nationalRegistrations: db.nationalRegistrations || [],
      managers: withManagerAges(db.managers || []),
      managerAppointments: db.managerAppointments || [],
      simulationMatches: db.simulationMatches || [],
      scoreboardMatches: db.scoreboardMatches || [],
      pdfFiles: isAdmin ? db.pdfFiles : db.pdfFiles.filter((p) => p.accessStatus === 'public'),
    });
  });

  app.get('/api/maps/config', (_req, res) => {
    res.json({
      apiKey: process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '',
    });
  });

  // =========================================================================
  // FOOTBALL QUIZ API ENDPOINTS
  // =========================================================================
  const quizDbEnsure = () => {
    const db = getDb();
    if (!Array.isArray(db.quizAttempts)) db.quizAttempts = [];
    if (!Array.isArray(db.quizDailies)) db.quizDailies = [];
    if (!Array.isArray(db.quizQuestions)) db.quizQuestions = [];
    if (!Array.isArray(db.quizReports)) db.quizReports = [];
    return db;
  };

  app.get('/api/quiz/hub', (req: AuthenticatedRequest, res) => {
    const db = quizDbEnsure();
    const attempts = db.quizAttempts || [];
    const questions = (db.quizQuestions || []).filter((q) => q.active !== false);
    const userEmail = req.authUser?.email || req.ip || 'guest';
    const myAttempts = attempts.filter((a) => a.userEmail === userEmail || (req.authUser && a.userId === req.authUser.id));

    const playerMap = new Map<string, { name: string; email: string; score: number; totalAcc: number; count: number }>();
    for (const att of attempts) {
      const key = att.userEmail || att.userName;
      let p = playerMap.get(key);
      if (!p) {
        p = { name: att.userName, email: att.userEmail, score: 0, totalAcc: 0, count: 0 };
        playerMap.set(key, p);
      }
      p.score += att.score;
      p.totalAcc += att.accuracy;
      p.count += 1;
    }

    const topPlayers = Array.from(playerMap.values())
      .map((p) => ({
        name: p.name,
        email: p.email,
        score: p.score,
        accuracy: Math.round(p.totalAcc / Math.max(1, p.count)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    res.json({
      stats: {
        totalQuestions: questions.length,
        totalPlayers: playerMap.size,
        totalAttempts: attempts.length,
      },
      topPlayers,
      myAttempts: myAttempts.slice(0, 8),
    });
  });

  app.get('/api/quiz/play', (req: AuthenticatedRequest, res) => {
    const db = quizDbEnsure();
    const mode = String(req.query.mode || 'quick');
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    let questions = (db.quizQuestions || []).filter((q) => q.active !== false);

    if (category) {
      questions = questions.filter((q) => q.category === category);
    }

    if (mode === 'daily') {
      const today = new Date().toISOString().slice(0, 10);
      const scheduled = (db.quizDailies || []).find((d) => d.date === today && d.active);
      if (scheduled && scheduled.questionIds.length > 0) {
        const qMap = new Map(questions.map((q) => [q.id, q]));
        questions = scheduled.questionIds.map((id) => qMap.get(id)).filter(Boolean) as any;
      }
    }

    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    let limit = 10;
    if (mode === 'classic') limit = 20;
    else if (mode === 'survival') limit = 45;
    else if (mode === 'time') limit = 35;
    else if (mode === 'daily') limit = 12;
    else if (mode === 'category') limit = 10;

    res.json({ questions: shuffled.slice(0, limit) });
  });

  app.post('/api/quiz/attempts', (req: AuthenticatedRequest, res) => {
    const db = quizDbEnsure();
    const body = req.body || {};
    const mode = String(body.mode || 'quick');
    const category = body.category ? String(body.category) : undefined;
    const answersLog = Array.isArray(body.answersLog) ? body.answersLog : [];
    const totalTimeTaken = Math.max(1, Number(body.totalTimeTaken) || 30);

    const user = req.authUser;
    const userName = user ? user.name : 'Guest Challenger';
    const userEmail = user ? user.email : (req.ip || 'guest-ip');

    if (mode === 'daily') {
      const today = new Date().toISOString().slice(0, 10);
      const alreadyPlayedToday = (db.quizAttempts || []).some(
        (a) => a.mode === 'daily' && a.userEmail === userEmail && a.submittedAt.slice(0, 10) === today
      );
      if (alreadyPlayedToday) {
        res.status(403).json({ error: "You have already completed today's Daily Challenge. Come back tomorrow!" });
        return;
      }
    }

    let score = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;
    const difficultyBreakdown: Record<string, { correct: number; total: number }> = {
      easy: { correct: 0, total: 0 },
      medium: { correct: 0, total: 0 },
      hard: { correct: 0, total: 0 },
      expert: { correct: 0, total: 0 },
    };

    const evaluatedAnswers = answersLog.map((ans: any) => {
      const q = (db.quizQuestions || []).find((item) => item.id === ans.questionId);
      const diff = q?.difficulty || 'medium';
      difficultyBreakdown[diff] = difficultyBreakdown[diff] || { correct: 0, total: 0 };
      difficultyBreakdown[diff].total += 1;

      const isCorrect = q ? ans.selectedIndex === q.correctIndex : false;
      if (isCorrect) {
        correctCount += 1;
        difficultyBreakdown[diff].correct += 1;
        const base = diff === 'expert' ? 30 : diff === 'hard' ? 20 : diff === 'medium' ? 15 : 10;
        score += base;
      } else if (ans.selectedIndex === -999) {
        skippedCount += 1;
      } else {
        incorrectCount += 1;
      }

      return {
        questionId: ans.questionId,
        questionText: q?.question || ans.questionText || '',
        options: q?.options || ans.options || [],
        correctIndex: q?.correctIndex ?? ans.correctIndex ?? 0,
        selectedIndex: ans.selectedIndex,
        isCorrect,
        explanation: q?.explanation || ans.explanation || '',
        timeTakenSec: Number(ans.timeTakenSec) || 5,
      };
    });

    const totalQuestions = evaluatedAnswers.length;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    let rating: QuizAttemptRecord['rating'] = 'Unrated';
    if (accuracy === 100 && totalQuestions >= 5) rating = 'Perfect';
    else if (accuracy >= 90) rating = 'Elite';
    else if (accuracy >= 80) rating = 'Sharp';
    else if (accuracy >= 65) rating = 'Solid';
    else if (accuracy >= 50) rating = 'Developing';
    else if (totalQuestions > 0) rating = 'Rookie';

    const unlockedAchievements: string[] = [];
    const userAttempts = (db.quizAttempts || []).filter((a) => a.userEmail === userEmail);
    const totalCompleted = userAttempts.length + 1;

    if (totalCompleted === 1) unlockedAchievements.push('First Whistle');
    if (accuracy === 100 && totalQuestions >= 10) unlockedAchievements.push('Perfect Matchday');
    if (mode === 'survival' && correctCount >= 15) unlockedAchievements.push('Survival Specialist');
    if (mode === 'time' && correctCount >= 20) unlockedAchievements.push('Quick Feet');
    if (accuracy >= 80 && totalQuestions >= 10 && (difficultyBreakdown.hard.correct + difficultyBreakdown.expert.correct > 0)) {
      unlockedAchievements.push('Tactician');
    }
    if (score >= 200) unlockedAchievements.push('Century Club');
    if (totalCompleted >= 10) unlockedAchievements.push('Regular Starter');
    if (totalCompleted >= 50) unlockedAchievements.push('Season Professional');
    if (mode === 'survival' && correctCount >= 25) unlockedAchievements.push('Iron Lung');
    if (score >= 400) unlockedAchievements.push('Crown Jewel');

    const attemptRecord = {
      id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userId: user?.id,
      userName,
      userEmail,
      mode: mode as any,
      category: category as any,
      score,
      maxPossibleScore: totalQuestions * 30,
      correctCount,
      incorrectCount,
      skippedCount,
      totalQuestions,
      accuracy,
      timeTakenSec: totalTimeTaken,
      rating,
      difficultyBreakdown,
      questionsAnswered: evaluatedAnswers,
      unlockedAchievements,
      submittedAt: new Date().toISOString(),
    };

    db.quizAttempts.unshift(attemptRecord as any);

    if (user) {
      appendUserActivity(db, {
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        category: 'quiz',
        action: 'Completed Quiz Run',
        target: `${mode.toUpperCase()} Quiz${category ? ` (${category})` : ''}`,
        details: `Score: ${score} PTS · Accuracy: ${accuracy}% · Rating: ${rating}`,
      });
    }

    saveDb(db);
    res.status(201).json({ attempt: attemptRecord });
  });

  app.get('/api/quiz/attempts/:id', (req, res) => {
    const db = quizDbEnsure();
    const attempt = (db.quizAttempts || []).find((a) => a.id === req.params.id);
    if (!attempt) {
      res.status(404).json({ error: 'Quiz attempt record not found.' });
      return;
    }
    res.json({ attempt });
  });

  app.get('/api/quiz/leaderboard', (req: AuthenticatedRequest, res) => {
    const db = quizDbEnsure();
    const period = String(req.query.period || 'all');
    const metric = String(req.query.metric || 'points');
    const attempts = db.quizAttempts || [];
    const currentUserEmail = req.authUser?.email;

    const now = Date.now();
    const filtered = attempts.filter((att) => {
      const attTime = new Date(att.submittedAt).getTime();
      if (period === 'week') {
        return now - attTime <= 7 * 24 * 60 * 60 * 1000;
      }
      if (period === 'month') {
        return now - attTime <= 30 * 24 * 60 * 60 * 1000;
      }
      return true;
    });

    const userMap = new Map<string, {
      userName: string;
      userEmail: string;
      score: number;
      totalAcc: number;
      completed: number;
      bestScore: number;
    }>();

    for (const att of filtered) {
      const key = att.userEmail || att.userName;
      let entry = userMap.get(key);
      if (!entry) {
        entry = { userName: att.userName, userEmail: att.userEmail, score: 0, totalAcc: 0, completed: 0, bestScore: 0 };
        userMap.set(key, entry);
      }
      entry.score += att.score;
      entry.totalAcc += att.accuracy;
      entry.completed += 1;
      if (att.score > entry.bestScore) entry.bestScore = att.score;
    }

    const list = Array.from(userMap.values()).map((u) => ({
      userName: u.userName,
      userEmail: u.userEmail,
      score: u.score,
      accuracy: Math.round(u.totalAcc / Math.max(1, u.completed)),
      completedQuizzes: u.completed,
      bestScore: u.bestScore,
      isCurrentUser: currentUserEmail ? u.userEmail === currentUserEmail : false,
    }));

    list.sort((a, b) => {
      if (metric === 'accuracy') return b.accuracy - a.accuracy || b.score - a.score;
      if (metric === 'completed') return b.completedQuizzes - a.completedQuizzes || b.score - a.score;
      if (metric === 'best') return b.bestScore - a.bestScore || b.score - a.score;
      return b.score - a.score;
    });

    const ranked = list.map((item, idx) => ({ rank: idx + 1, ...item }));
    res.json({ entries: ranked });
  });

  app.get('/api/quiz/admin/data', requireAdmin, (_req, res) => {
    const db = quizDbEnsure();
    res.json({
      questions: db.quizQuestions || [],
      dailies: db.quizDailies || [],
      reports: db.quizReports || [],
    });
  });

  app.post('/api/quiz/admin/questions', requireAdmin, (req: AuthenticatedRequest, res) => {
    const db = quizDbEnsure();
    const body = req.body || {};
    const newQ = {
      id: `quiz-q-${Date.now()}`,
      category: body.category || 'Football History',
      difficulty: body.difficulty || 'medium',
      type: body.type || 'multiple-choice',
      question: String(body.question || '').trim(),
      options: Array.isArray(body.options) ? body.options.map(String) : ['', '', '', ''],
      correctIndex: Number(body.correctIndex) || 0,
      explanation: String(body.explanation || '').trim(),
      imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
      active: body.active !== false,
      createdAt: new Date().toISOString(),
    };
    db.quizQuestions.unshift(newQ as any);
    saveDb(db);
    res.status(201).json({ question: newQ });
  });

  app.put('/api/quiz/admin/questions/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const db = quizDbEnsure();
    const id = req.params.id;
    const body = req.body || {};
    const idx = (db.quizQuestions || []).findIndex((q) => q.id === id);
    if (idx < 0) {
      res.status(404).json({ error: 'Question not found.' });
      return;
    }
    const updated = {
      ...db.quizQuestions[idx],
      category: body.category || db.quizQuestions[idx].category,
      difficulty: body.difficulty || db.quizQuestions[idx].difficulty,
      type: body.type || db.quizQuestions[idx].type,
      question: body.question !== undefined ? String(body.question).trim() : db.quizQuestions[idx].question,
      options: Array.isArray(body.options) ? body.options.map(String) : db.quizQuestions[idx].options,
      correctIndex: body.correctIndex !== undefined ? Number(body.correctIndex) : db.quizQuestions[idx].correctIndex,
      explanation: body.explanation !== undefined ? String(body.explanation).trim() : db.quizQuestions[idx].explanation,
      imageUrl: body.imageUrl !== undefined ? String(body.imageUrl) : db.quizQuestions[idx].imageUrl,
      active: body.active !== undefined ? Boolean(body.active) : db.quizQuestions[idx].active,
    };
    db.quizQuestions[idx] = updated as any;
    saveDb(db);
    res.json({ question: updated });
  });

  app.delete('/api/quiz/admin/questions/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const db = quizDbEnsure();
    const id = req.params.id;
    db.quizQuestions = (db.quizQuestions || []).filter((q) => q.id !== id);
    saveDb(db);
    res.json({ ok: true });
  });

  app.post('/api/quiz/admin/schedule', requireAdmin, (req: AuthenticatedRequest, res) => {
    const db = quizDbEnsure();
    const body = req.body || {};
    const date = String(body.date || new Date().toISOString().slice(0, 10));
    const title = String(body.title || `Daily Challenge ${date}`);
    const count = Number(body.questionCount) || 12;

    const activeQ = (db.quizQuestions || []).filter((q) => q.active !== false);
    const shuffled = [...activeQ].sort(() => Math.random() - 0.5);
    const questionIds = shuffled.slice(0, count).map((q) => q.id);

    const scheduleRecord = {
      id: `daily-${Date.now()}`,
      date,
      title,
      questionIds,
      active: true,
      createdAt: new Date().toISOString(),
    };

    db.quizDailies = [scheduleRecord, ...db.quizDailies.filter((d) => d.date !== date)];
    saveDb(db);
    res.status(201).json({ schedule: scheduleRecord });
  });

  app.delete('/api/quiz/admin/schedule/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const db = quizDbEnsure();
    const id = req.params.id;
    db.quizDailies = (db.quizDailies || []).filter((d) => d.id !== id);
    saveDb(db);
    res.json({ ok: true });
  });

  app.post('/api/quiz/reports', (req: AuthenticatedRequest, res) => {
    const db = quizDbEnsure();
    const body = req.body || {};
    const report = {
      id: `qrep-${Date.now()}`,
      questionId: String(body.questionId || ''),
      questionText: String(body.questionText || ''),
      reportedByEmail: req.authUser?.email || req.ip || 'guest',
      reason: body.reason || 'Incorrect Answer',
      details: body.details ? String(body.details) : undefined,
      status: 'open' as const,
      createdAt: new Date().toISOString(),
    };
    db.quizReports.unshift(report as any);
    saveDb(db);
    res.status(201).json({ report });
  });

  app.patch('/api/quiz/admin/reports/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const db = quizDbEnsure();
    const id = req.params.id;
    const status = req.body?.status;
    const report = (db.quizReports || []).find((r) => r.id === id);
    if (!report) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    if (status === 'resolved' || status === 'dismissed') {
      report.status = status;
    }
    saveDb(db);
    res.json({ report });
  });

  const stadiumPhotoCache = new Map<string, string | null>();
  app.get('/api/stadiums/photo', async (req, res) => {
    const stadium = typeof req.query.stadium === 'string' ? req.query.stadium.trim() : '';
    const club = typeof req.query.club === 'string' ? req.query.club.trim() : '';
    const city = typeof req.query.city === 'string' ? req.query.city.trim() : '';
    const country = typeof req.query.country === 'string' ? req.query.country.trim() : '';

    if (!stadium && !club) {
      res.status(400).json({ photoUrl: null });
      return;
    }

    const cacheKey = `${stadium}|${city}|${country}`.toLowerCase();
    if (stadiumPhotoCache.has(cacheKey)) {
      res.json({ photoUrl: stadiumPhotoCache.get(cacheKey) || null });
      return;
    }

    const isAcceptableStadiumPhoto = (url: string): boolean => {
      const lower = url.toLowerCase();
      if (lower.includes('.svg') || lower.includes('logo') || lower.includes('crest')) return false;
      if (lower.includes('locator') || lower.includes('map_') || lower.includes('_map.') || lower.includes('diagram')) return false;
      if (lower.includes('flag_') || lower.includes('kit_') || lower.includes('jersey')) return false;
      return true;
    };

    const fetchPageImageByTitle = async (title: string): Promise<string | null> => {
      const pUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&redirects=1&prop=pageimages&pithumbsize=1280&format=json`;
      const pr = await fetch(pUrl, {
        headers: { 'User-Agent': 'DodaEonaFCStadiumExplorer/1.0 (https://dodaeona.fc)' },
      });
      if (!pr.ok) return null;
      const pData = (await pr.json()) as {
        query?: { pages?: Record<string, { thumbnail?: { source?: string } }> };
      };
      const pages = Object.values(pData?.query?.pages || {});
      const rawSrc = pages[0]?.thumbnail?.source;
      if (!rawSrc) return null;
      const cleanSrc = rawSrc.split('?')[0];
      return isAcceptableStadiumPhoto(cleanSrc) ? cleanSrc : null;
    };

    let resolvedUrl: string | null = null;
    try {
      if (stadium) {
        resolvedUrl = await fetchPageImageByTitle(stadium);
      }

      if (!resolvedUrl) {
        const queries = [
          stadium && city ? `${stadium} ${city}` : '',
          stadium ? `${stadium} stadium` : '',
          club && !stadium ? `${club} stadium` : '',
        ].filter(Boolean);

        for (const q of queries) {
          const sUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&srlimit=3&format=json`;
          const sr = await fetch(sUrl, {
            headers: { 'User-Agent': 'DodaEonaFCStadiumExplorer/1.0 (https://dodaeona.fc)' },
          });
          if (!sr.ok) continue;
          const sData = (await sr.json()) as {
            query?: { search?: Array<{ title: string }> };
          };
          const hits = sData?.query?.search || [];
          for (const hit of hits) {
            const candidate = await fetchPageImageByTitle(hit.title);
            if (candidate) {
              resolvedUrl = candidate;
              break;
            }
          }
          if (resolvedUrl) break;
        }
      }
    } catch {
      resolvedUrl = null;
    }

    stadiumPhotoCache.set(cacheKey, resolvedUrl);
    res.json({ photoUrl: resolvedUrl });
  });

  app.get('/api/public/match-centre/registry', (_req, res) => {
    const db = getDb();
    res.json({
      playerIdentityOverrides: db.playerIdentityOverrides || {},
      deletedPlayerIdentityIds: db.deletedPlayerIdentityIds || [],
      clubRegistrations: db.clubRegistrations || [],
      nationalRegistrations: db.nationalRegistrations || [],
      managers: withManagerAges(db.managers || []),
      managerAppointments: db.managerAppointments || [],
      simulationMatches: db.simulationMatches || [],
      scoreboardMatches: db.scoreboardMatches || [],
    });
  });

  // =========================================================================
  // SCOREBOARD MATCHES (Cross-Device Match Persistence)
  // =========================================================================
  app.get('/api/scoreboard/matches', (_req, res) => {
    const db = getDb();
    res.json({
      matches: db.scoreboardMatches || [],
    });
  });

  app.get('/api/scoreboard/matches/:id', (req, res) => {
    const db = getDb();
    const match = (db.scoreboardMatches || []).find((m) => m.id === req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Saved scoreboard match not found.' });
      return;
    }
    res.json({ match });
  });

  app.post('/api/scoreboard/matches', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const match = req.body?.match as ScoreboardMatchRecord | undefined;
    if (!match || !match.id || !match.homeTeam || !match.awayTeam) {
      res.status(400).json({ error: 'Valid match record with home and away teams is required.' });
      return;
    }

    if (!Array.isArray(db.scoreboardMatches)) {
      db.scoreboardMatches = [];
    }

    const sanitized: ScoreboardMatchRecord = {
      ...match,
      savedAt: new Date().toISOString(),
      createdBy: req.authUser?.email || match.createdBy || 'guest',
    };

    const existingIdx = db.scoreboardMatches.findIndex((m) => m.id === sanitized.id);
    if (existingIdx >= 0) {
      db.scoreboardMatches[existingIdx] = sanitized;
    } else {
      db.scoreboardMatches = [sanitized, ...db.scoreboardMatches].slice(0, 100);
    }

    if (req.authUser) {
      appendUserActivity(db, {
        userId: req.authUser.id,
        userName: req.authUser.name,
        userEmail: req.authUser.email,
        category: 'simulation',
        action: 'Saved ScoreBoard Match',
        target: `${sanitized.homeTeam.code || sanitized.homeTeam.name} ${sanitized.homeScore} - ${sanitized.awayScore} ${sanitized.awayTeam.code || sanitized.awayTeam.name}`,
        details: sanitized.outcomeDescription || 'ScoreBoard Match Saved',
      });
    }

    saveDb(db);
    res.status(201).json({ ok: true, match: sanitized, matches: db.scoreboardMatches });
  });

  app.delete('/api/scoreboard/matches/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const id = req.params.id;
    if (!Array.isArray(db.scoreboardMatches)) {
      db.scoreboardMatches = [];
    }
    db.scoreboardMatches = db.scoreboardMatches.filter((m) => m.id !== id);
    saveDb(db);
    res.json({ ok: true, matches: db.scoreboardMatches });
  });

  // Direct automatic download endpoints for the DodaEona F.C. application
  app.get('/api/download/app-launcher', (req, res) => {
    const origin = `${req.protocol}://${req.get('host') || 'localhost:3000'}`;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DodaEona F.C. — Official App</title>
  <link rel="icon" href="${origin}/favicon.ico">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #050A12;
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #070F1B;
      border: 1px solid rgba(122, 219, 240, 0.4);
      border-radius: 24px;
      padding: 44px 36px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
    }
    .glow-bar {
      height: 4px;
      width: 90px;
      margin: 0 auto 24px;
      background: linear-gradient(90deg, #0891B2, #7ADBF0, #D6B56E);
      border-radius: 2px;
    }
    .logo {
      width: 84px;
      height: 84px;
      object-fit: contain;
      margin-bottom: 20px;
      filter: drop-shadow(0 0 16px rgba(122, 219, 240, 0.35));
    }
    h1 {
      font-size: 26px;
      font-weight: 800;
      letter-spacing: 0.5px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .sub {
      color: #7ADBF0;
      font-size: 11px;
      letter-spacing: 2px;
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 18px;
    }
    p {
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .btn {
      display: block;
      width: 100%;
      background: linear-gradient(135deg, #0891B2, #7ADBF0);
      color: #050A12;
      font-weight: 800;
      padding: 16px;
      border-radius: 14px;
      text-decoration: none;
      font-size: 13px;
      letter-spacing: 1px;
      text-transform: uppercase;
      box-shadow: 0 4px 20px rgba(122, 219, 240, 0.4);
      transition: all 0.2s ease;
    }
    .btn:hover {
      filter: brightness(1.1);
      transform: translateY(-2px);
    }
    .loader {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(122, 219, 240, 0.3);
      border-top-color: #7ADBF0;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-right: 8px;
      vertical-align: middle;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.location.href = "${origin}/";
      }, 500);
    };
  </script>
</head>
<body>
  <div class="card">
    <div class="glow-bar"></div>
    <img class="logo" src="${origin}/assets/aistudio/DodaEona_F.C._V2_Fill_Color_8c96db06.png" alt="DodaEona F.C. Logo">
    <h1>DODAEONA F.C.</h1>
    <div class="sub">Official Application Launcher</div>
    <p><span class="loader"></span>Launching DodaEona F.C. Arena &amp; Match Centre...</p>
    <a class="btn" href="${origin}/">Open Application Now</a>
  </div>
</body>
</html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="DodaEona_FC_App.html"');
    res.send(html);
  });

  app.get('/api/download/app-shortcut', (req, res) => {
    const origin = `${req.protocol}://${req.get('host') || 'localhost:3000'}`;
    const shortcut = `[InternetShortcut]\r\nURL=${origin}/\r\nIconIndex=0\r\nIconFile=${origin}/favicon.ico\r\n`;
    res.setHeader('Content-Type', 'application/internet-shortcut');
    res.setHeader('Content-Disposition', 'attachment; filename="DodaEona_FC.url"');
    res.send(shortcut);
  });

  app.get('/api/simulation/bootstrap', (_req, res) => {
    const db = getDb();
    res.json({
      competitions: db.competitions || [],
      recentMatches: (db.simulationMatches || []).slice(0, 40),
      scoreboardMatches: (db.scoreboardMatches || []).slice(0, 40),
    });
  });

  app.post('/api/gemini/halftime-announce', async (req, res) => {
    try {
      const result = await generateHalftimeBroadcastAudio(req.body || {});
      res.json(result);
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to generate halftime broadcast audio.',
      });
    }
  });

  app.post('/api/gemini/match-announce', async (req, res) => {
    try {
      const result = await generateMatchBroadcastAudio(req.body || {});
      res.json(result);
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to generate match broadcast audio.',
      });
    }
  });

  app.post('/api/gemini/live-pundit-turn', async (req, res) => {
    try {
      const result = await generateLivePunditTurn(req.body || {});
      res.json(result);
    } catch (err) {
      if (err instanceof GeminiServiceError) {
        res.status(err.statusCode).json({ error: err.message });
        return;
      }
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to generate pundit broadcast turn.',
      });
    }
  });

  app.get('/api/simulation/matches/:id', (req, res) => {
    const db = getDb();
    const match = db.simulationMatches.find((m) => m.id === req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Saved simulation match not found.' });
      return;
    }
    res.json({ match });
  });

  app.post('/api/simulation/matches', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const body = req.body || {};
    const {
      homeTeamId,
      awayTeamId,
      homeScore,
      awayScore,
      halfTimeHomeScore,
      halfTimeAwayScore,
      wentToExtraTime,
      penaltySummary,
      seed,
      competitionId,
      competitionName,
      competitionFixtureId,
      venue,
      possessionHome,
      shotsHome,
      shotsAway,
      xgHome,
      xgAway,
      lineupPlayerIds,
      events,
      fullPayload,
    } = body;

    const { projectedTeams } = buildLiveRegistryBundle(db);
    const home = projectedTeams.find((t) => t.id === homeTeamId);
    const away = projectedTeams.find((t) => t.id === awayTeamId);
    if (!home || !away || home.id === away.id) {
      res.status(400).json({ error: 'Select two distinct valid teams.' });
      return;
    }

    const sanitizedEvents = Array.isArray(events)
      ? events
          .filter((ev: any) => ev && typeof ev === 'object')
          .map((ev: any) => ({
            minute: Math.max(1, Math.min(125, Number(ev.minute) || 1)),
            type: (['goal', 'yellow', 'red', 'sub'].includes(ev.type) ? ev.type : 'goal') as
              | 'goal'
              | 'yellow'
              | 'red'
              | 'sub',
            teamSide: (ev.teamSide === 'away' ? 'away' : 'home') as 'home' | 'away',
            playerId: ev.playerId ? String(ev.playerId) : undefined,
            playerName: String(ev.playerName || 'Player'),
            assistPlayerId: ev.assistPlayerId ? String(ev.assistPlayerId) : undefined,
            assistPlayerName: ev.assistPlayerName ? String(ev.assistPlayerName) : undefined,
            detail: ev.detail ? String(ev.detail) : undefined,
          }))
      : [];

    ensureManagerCollections(db);
    const homeTeamType = getTeamType(home);
    const awayTeamType = getTeamType(away);
    const activeHomeAppt = db.managerAppointments.find(
      (a) => a.is_current && a.team_id === home.id && a.team_type === homeTeamType
    );
    const activeAwayAppt = db.managerAppointments.find(
      (a) => a.is_current && a.team_id === away.id && a.team_type === awayTeamType
    );

    const created = {
      id: body.id ? String(body.id) : `sim-match-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      homeTeamId: home.id,
      homeTeamName: home.name,
      homeCode: home.code,
      awayTeamId: away.id,
      awayTeamName: away.name,
      awayCode: away.code,
      homeScore: Math.max(0, Number(homeScore) || 0),
      awayScore: Math.max(0, Number(awayScore) || 0),
      halfTimeHomeScore:
        typeof halfTimeHomeScore === 'number' ? Math.max(0, halfTimeHomeScore) : undefined,
      halfTimeAwayScore:
        typeof halfTimeAwayScore === 'number' ? Math.max(0, halfTimeAwayScore) : undefined,
      wentToExtraTime: Boolean(wentToExtraTime),
      penaltySummary: penaltySummary ? String(penaltySummary) : undefined,
      seed: seed ? String(seed) : undefined,
      competitionId: String(
        competitionId ||
          (homeTeamType === 'country' || awayTeamType === 'country'
            ? 'comp-world-intl'
            : 'comp-intl-club')
      ),
      competitionName: String(
        competitionName ||
          (homeTeamType === 'country' && awayTeamType === 'country'
            ? 'International Friendly'
            : 'Friendly Exhibition')
      ),
      competitionFixtureId: competitionFixtureId ? String(competitionFixtureId) : undefined,
      status: 'completed' as const,
      date: new Date().toISOString().slice(0, 10),
      venue: String(venue || home.stadium || 'Neutral Ground'),
      attendance: home.stadiumCapacity || 52000,
      possessionHome:
        typeof possessionHome === 'number' ? Math.max(0, Math.min(100, Math.round(possessionHome))) : 50,
      shotsHome: typeof shotsHome === 'number' ? Math.max(0, Math.round(shotsHome)) : 0,
      shotsAway: typeof shotsAway === 'number' ? Math.max(0, Math.round(shotsAway)) : 0,
      xgHome: typeof xgHome === 'number' ? Number(xgHome.toFixed(2)) : 0,
      xgAway: typeof xgAway === 'number' ? Number(xgAway.toFixed(2)) : 0,
      homeManagerId: activeHomeAppt?.manager_id || (body.homeManagerId ? String(body.homeManagerId) : undefined),
      awayManagerId: activeAwayAppt?.manager_id || (body.awayManagerId ? String(body.awayManagerId) : undefined),
      homeManagerName:
        activeHomeAppt?.manager_name || (body.homeManagerName ? String(body.homeManagerName) : undefined),
      awayManagerName:
        activeAwayAppt?.manager_name || (body.awayManagerName ? String(body.awayManagerName) : undefined),
      homeTeamType,
      awayTeamType,
      lineupPlayerIds:
        lineupPlayerIds && typeof lineupPlayerIds === 'object'
          ? {
              home: Array.isArray(lineupPlayerIds.home) ? lineupPlayerIds.home.map(String) : [],
              away: Array.isArray(lineupPlayerIds.away) ? lineupPlayerIds.away.map(String) : [],
            }
          : undefined,
      events: sanitizedEvents,
      fullPayload: fullPayload || undefined,
      createdBy: req.authUser?.email || 'match-simulator',
    };

    const existingIdx = db.simulationMatches.findIndex((m) => m.id === created.id);
    if (existingIdx >= 0) {
      db.simulationMatches[existingIdx] = created;
    } else {
      db.simulationMatches = [created, ...db.simulationMatches].slice(0, 150);
    }

    let fixtureFilingStatus: 'filed' | 'already-settled' | 'not-applicable' = 'not-applicable';

    // Automatic competition result filing (NEVER overwrite an already-settled fixture!)
    if (created.competitionFixtureId && created.competitionId) {
      const comp = db.competitions.find((c) => c.id === created.competitionId);
      const fix = comp?.fixtures?.find((f) => f.id === created.competitionFixtureId);
      if (comp && fix) {
        if (fix.settled) {
          fixtureFilingStatus = 'already-settled';
        } else {
          fix.settled = true;
          fix.settledMatchId = created.id;
          fix.homeScore = created.homeScore;
          fix.awayScore = created.awayScore;
          fix.penaltySummary = created.penaltySummary;
          fix.settledAt = new Date().toISOString();
          comp.matchesPlayed = (comp.matchesPlayed || 0) + 1;
          comp.updatedAt = new Date().toISOString();

          // Update standings if league competition
          if (comp.type === 'league') {
            const ensureRow = (teamObj: Team) => {
              let row = comp.standings.find((r) => r.teamId === teamObj.id);
              if (!row) {
                row = {
                  position: comp.standings.length + 1,
                  teamId: teamObj.id,
                  teamName: teamObj.name,
                  played: 0,
                  won: 0,
                  drawn: 0,
                  lost: 0,
                  goalsFor: 0,
                  goalsAgainst: 0,
                  points: 0,
                };
                comp.standings.push(row);
              }
              return row;
            };
            const hRow = ensureRow(home);
            const aRow = ensureRow(away);
            hRow.played++;
            aRow.played++;
            hRow.goalsFor += created.homeScore;
            hRow.goalsAgainst += created.awayScore;
            aRow.goalsFor += created.awayScore;
            aRow.goalsAgainst += created.homeScore;
            if (created.homeScore > created.awayScore) {
              hRow.won++;
              hRow.points += 3;
              aRow.lost++;
            } else if (created.awayScore > created.homeScore) {
              aRow.won++;
              aRow.points += 3;
              hRow.lost++;
            } else {
              hRow.drawn++;
              aRow.drawn++;
              hRow.points += 1;
              aRow.points += 1;
            }
            comp.standings.sort(
              (r1, r2) =>
                r2.points - r1.points ||
                r2.goalsFor - r2.goalsAgainst - (r1.goalsFor - r1.goalsAgainst) ||
                r2.goalsFor - r1.goalsFor
            );
            comp.standings.forEach((r, idx) => {
              r.position = idx + 1;
            });
          }

          fixtureFilingStatus = 'filed';
        }
      } else {
        // Check Tournament Maker competitions as well (Prepare / Live workflow)
        const cmIdx = (db.competitionMakers || []).findIndex(
          (c) => c.id === created.competitionId
        );
        if (cmIdx >= 0) {
          const { teamsMap } = buildServerTeamAndManagerMaps(db);
          const imported = importSimulationIntoFixture(
            db.competitionMakers[cmIdx],
            created.competitionFixtureId,
            created,
            teamsMap
          );
          if (imported.ok) {
            const finalized = awardChampionTrophyOnServer(db, imported.tournament);
            db.competitionMakers[cmIdx] = finalized;
            fixtureFilingStatus = 'filed';
          } else if (imported.error?.toLowerCase().includes('already settled')) {
            fixtureFilingStatus = 'already-settled';
          }
        }
      }
    }

    if (req.authUser) {
      appendUserActivity(db, {
        userId: req.authUser.id,
        userName: req.authUser.name,
        userEmail: req.authUser.email,
        category: 'simulation',
        action: 'Simulated Match',
        target: `${home.code} ${created.homeScore} - ${created.awayScore} ${away.code}`,
        details: created.competitionName,
      });
    }

    saveDb(db);
    const updatedCm = created.competitionId
      ? (db.competitionMakers || []).find((c) => c.id === created.competitionId)
      : undefined;
    res.status(201).json({
      match: created,
      fixtureFilingStatus,
      competitions: db.competitions,
      competitionMaker: updatedCm,
      teamOverrides: updatedCm ? db.teamOverrides : undefined,
      customTeams: updatedCm ? db.customTeams : undefined,
      hallOfFame: updatedCm ? db.hallOfFame : undefined,
    });
  });

  // =========================================================================
  // COMPETITION MAKER API (Tournaments, Draws, Simulation, Trophy Gallery)
  // =========================================================================
  function buildServerTeamAndManagerMaps(db: ServerDatabase) {
    ensureManagerCollections(db);
    const { projectedTeams } = buildLiveRegistryBundle(db);
    const teamsMap = new Map<string, Team>(projectedTeams.map((t) => [t.id, t]));
    const mgrById = new Map<string, Manager>((db.managers || []).map((m) => [m.id, m]));
    const managersByTeam = new Map<string, Manager | null>();
    for (const appt of db.managerAppointments || []) {
      if (appt.is_current) {
        managersByTeam.set(appt.team_id, mgrById.get(appt.manager_id) || null);
      }
    }
    return { teamsMap, managersByTeam };
  }

  function resolveTrophyIconType(
    tournament: CompetitionMakerTournament
  ): TrophyRecord['iconType'] {
    if (tournament.presetId === 'ucl-36' || tournament.trophy.silhouette === 'amphora') {
      return 'ucl';
    }
    if (
      tournament.presetId === 'world-cup-2026' ||
      tournament.presetId === 'euros-24' ||
      tournament.trophy.silhouette === 'globe'
    ) {
      return 'world';
    }
    if (tournament.presetId === 'domestic-league' || tournament.trophy.silhouette === 'crown') {
      return 'domestic';
    }
    return 'cup';
  }

  function awardChampionTrophyOnServer(
    db: ServerDatabase,
    tournament: CompetitionMakerTournament
  ): CompetitionMakerTournament {
    if (!Array.isArray(db.hallOfFame)) db.hallOfFame = [];
    if (!Array.isArray(db.competitionTrophies)) {
      db.competitionTrophies = PRESET_TROPHIES.map((t) => ({ ...t }));
    }

    if (
      tournament.status !== 'completed' ||
      !tournament.champion ||
      tournament.awardedTrophyRecordId
    ) {
      return tournament;
    }

    const champId = tournament.champion.teamId;
    const seasonSlug = tournament.season.replace(/[^a-zA-Z0-9]/g, '') || '1';
    const trophyRecordId = `tr-cm-${tournament.id}-${seasonSlug}`;
    const newTrophy: TrophyRecord = {
      id: trophyRecordId,
      name: tournament.trophy.name,
      competition: tournament.name,
      competitionId: tournament.id,
      season: tournament.season,
      count: 1,
      iconType: resolveTrophyIconType(tournament),
      engraving: tournament.trophy.engraving,
      imageUrl: tournament.trophy.imageUrl,
      trophyDesign: tournament.trophy,
    };

    const customIdx = Array.isArray(db.customTeams)
      ? db.customTeams.findIndex((t: any) => t?.id === champId)
      : -1;
    if (customIdx >= 0) {
      const target = db.customTeams[customIdx];
      const existingList = Array.isArray(target.trophies) ? target.trophies : [];
      if (!existingList.some((tr: TrophyRecord) => tr.id === trophyRecordId)) {
        const nextList = [newTrophy, ...existingList];
        db.customTeams[customIdx] = {
          ...target,
          trophies: nextList,
          trophiesCount: nextList.reduce((sum: number, tr: TrophyRecord) => sum + (tr.count || 1), 0),
        };
      }
    } else {
      const baseTeam = TEAMS_DATABASE.find((t) => t.id === champId);
      const existingOv = (db.teamOverrides && db.teamOverrides[champId]) || {};
      const currentTrophies: TrophyRecord[] = Array.isArray(existingOv.trophies)
        ? existingOv.trophies
        : Array.isArray(baseTeam?.trophies)
        ? [...baseTeam.trophies]
        : [];
      if (!currentTrophies.some((tr) => tr.id === trophyRecordId)) {
        const nextTrophies = [newTrophy, ...currentTrophies];
        if (!db.teamOverrides) db.teamOverrides = {};
        db.teamOverrides[champId] = {
          ...existingOv,
          id: existingOv.id || baseTeam?.id || champId,
          name: existingOv.name || baseTeam?.name || tournament.champion.teamName,
          team_type: existingOv.team_type || (baseTeam ? getTeamType(baseTeam) : 'club'),
          trophies: nextTrophies,
          trophiesCount: nextTrophies.reduce((sum, tr) => sum + (tr.count || 1), 0),
        };
      }
    }

    if (tournament.trophy?.id) {
      const existingTrophyIdx = db.competitionTrophies.findIndex(
        (t) => t.id === tournament.trophy.id
      );
      if (existingTrophyIdx < 0) {
        db.competitionTrophies = [tournament.trophy, ...db.competitionTrophies];
      }
    }

    const latestEdition = tournament.history[0];
    if (latestEdition) {
      db.hallOfFame = [
        latestEdition,
        ...db.hallOfFame.filter((e) => e.id !== latestEdition.id),
      ].sort((a, b) => String(b.awardedAt || '').localeCompare(String(a.awardedAt || '')));
    }

    return {
      ...tournament,
      awardedTrophyTeamId: champId,
      awardedTrophyRecordId: trophyRecordId,
    };
  }

  function revokeChampionTrophyOnServer(
    db: ServerDatabase,
    revoked: { teamId: string; trophyRecordId: string; editionHistoryId?: string } | null
  ): void {
    if (!revoked) return;
    const { teamId, trophyRecordId, editionHistoryId } = revoked;

    const customIdx = Array.isArray(db.customTeams)
      ? db.customTeams.findIndex((t: any) => t?.id === teamId)
      : -1;
    if (customIdx >= 0) {
      const target = db.customTeams[customIdx];
      const filtered = (Array.isArray(target.trophies) ? target.trophies : []).filter(
        (tr: TrophyRecord) => tr.id !== trophyRecordId
      );
      db.customTeams[customIdx] = {
        ...target,
        trophies: filtered,
        trophiesCount: filtered.reduce((sum: number, tr: TrophyRecord) => sum + (tr.count || 1), 0),
      };
    } else if (db.teamOverrides && db.teamOverrides[teamId]) {
      const existingOv = db.teamOverrides[teamId];
      if (Array.isArray(existingOv.trophies)) {
        const filtered = existingOv.trophies.filter(
          (tr: TrophyRecord) => tr.id !== trophyRecordId
        );
        db.teamOverrides[teamId] = {
          ...existingOv,
          trophies: filtered,
          trophiesCount: filtered.reduce((sum: number, tr: TrophyRecord) => sum + (tr.count || 1), 0),
        };
      }
    }

    if (editionHistoryId && Array.isArray(db.hallOfFame)) {
      db.hallOfFame = db.hallOfFame.filter((h) => h.id !== editionHistoryId);
    }
  }

  app.get('/api/competition-maker', (_req, res) => {
    const db = getDb();
    const rawMakers = db.competitionMakers || [];
    let competitions = rawMakers;
    if (rawMakers.length > 0) {
      const { teamsMap } = buildServerTeamAndManagerMaps(db);
      competitions = rawMakers.map((c) => recoverTournamentState(c, teamsMap));
    }
    res.json({
      competitions,
      customTrophies: Array.isArray(db.competitionTrophies)
        ? db.competitionTrophies
        : PRESET_TROPHIES,
      hallOfFame: db.hallOfFame || [],
    });
  });

  // Admin-only: Create or update trophy design in Trophy Gallery
  app.post('/api/competition-maker/trophies', requireAdmin, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const raw = req.body?.trophy as Partial<TrophyDesignConfig> | undefined;
    if (!raw?.name?.trim()) {
      res.status(400).json({ error: 'Trophy name is required.' });
      return;
    }
    if (!Array.isArray(db.competitionTrophies)) {
      db.competitionTrophies = PRESET_TROPHIES.map((t) => ({ ...t }));
    }
    const existingIdx = raw.id
      ? db.competitionTrophies.findIndex((t) => t.id === String(raw.id).trim())
      : -1;
    const existing = existingIdx >= 0 ? db.competitionTrophies[existingIdx] : undefined;
    const trophy: TrophyDesignConfig = {
      id: raw.id && String(raw.id).trim() ? String(raw.id).trim() : `trophy-custom-${Date.now()}`,
      presetId: raw.presetId ?? existing?.presetId,
      name: String(raw.name).trim().slice(0, 80),
      category: raw.category || existing?.category || 'Other',
      displayStyle:
        raw.displayStyle ||
        (raw.material === 'silver'
          ? 'silver'
          : raw.material === 'crystal'
          ? 'crystal'
          : raw.material === 'metal'
          ? 'metal'
          : 'gold'),
      engraving: String(raw.engraving || existing?.engraving || 'CHAMPIONS').trim().slice(0, 80),
      silhouette: raw.silhouette || existing?.silhouette || 'chalice',
      material: raw.material || existing?.material || 'gold',
      primaryColor: String(raw.primaryColor || existing?.primaryColor || '#F59E0B'),
      accentColor: String(raw.accentColor || existing?.accentColor || '#7ADBF0'),
      prestigeTier: raw.prestigeTier || existing?.prestigeTier || 'Major',
      imageUrl:
        typeof raw.imageUrl === 'string' && raw.imageUrl.trim()
          ? raw.imageUrl.trim()
          : existing?.imageUrl,
      isCustom: existing ? existing.isCustom : true,
      createdAt: raw.createdAt || existing?.createdAt || new Date().toISOString(),
    };
    if (existingIdx >= 0) {
      db.competitionTrophies[existingIdx] = trophy;
    } else {
      db.competitionTrophies = [trophy, ...db.competitionTrophies];
    }
    appendAudit(
      db,
      req.authUser!,
      existingIdx >= 0 ? 'Updated trophy in gallery' : 'Added trophy to gallery',
      'Tournament Maker',
      trophy.name
    );
    saveDb(db);
    res.status(201).json({ ok: true, trophy, customTrophies: db.competitionTrophies });
  });

  // Admin-only: Edit existing trophy in Trophy Gallery
  app.put('/api/competition-maker/trophies/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    if (!Array.isArray(db.competitionTrophies)) {
      db.competitionTrophies = PRESET_TROPHIES.map((t) => ({ ...t }));
    }
    const targetId = String(req.params.id || '').trim();
    const raw = (req.body?.trophy || req.body || {}) as Partial<TrophyDesignConfig>;
    const idx = db.competitionTrophies.findIndex((t) => t.id === targetId);
    const existing = idx >= 0 ? db.competitionTrophies[idx] : undefined;
    if (!existing && !raw.name?.trim()) {
      res.status(404).json({ error: 'Trophy not found.' });
      return;
    }
    const updated: TrophyDesignConfig = {
      id: targetId,
      presetId: raw.presetId ?? existing?.presetId,
      name: String(raw.name || existing?.name || 'Custom Trophy').trim().slice(0, 80),
      category: raw.category || existing?.category || 'Other',
      displayStyle:
        raw.displayStyle ||
        existing?.displayStyle ||
        (raw.material === 'silver' ? 'silver' : 'gold'),
      engraving: String(raw.engraving || existing?.engraving || 'CHAMPIONS').trim().slice(0, 80),
      silhouette: raw.silhouette || existing?.silhouette || 'chalice',
      material: raw.material || existing?.material || 'gold',
      primaryColor: String(raw.primaryColor || existing?.primaryColor || '#F59E0B'),
      accentColor: String(raw.accentColor || existing?.accentColor || '#7ADBF0'),
      prestigeTier: raw.prestigeTier || existing?.prestigeTier || 'Major',
      imageUrl:
        typeof raw.imageUrl === 'string' && raw.imageUrl.trim()
          ? raw.imageUrl.trim()
          : existing?.imageUrl,
      isCustom: existing ? existing.isCustom : true,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };
    if (idx >= 0) {
      db.competitionTrophies[idx] = updated;
    } else {
      db.competitionTrophies = [updated, ...db.competitionTrophies];
    }
    appendAudit(db, req.authUser!, 'Edited trophy design', 'Tournament Maker', updated.name);
    saveDb(db);
    res.json({ ok: true, trophy: updated, customTrophies: db.competitionTrophies });
  });

  // Admin-only: Delete trophy from Trophy Gallery
  app.delete('/api/competition-maker/trophies/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    if (!Array.isArray(db.competitionTrophies)) {
      db.competitionTrophies = PRESET_TROPHIES.map((t) => ({ ...t }));
    }
    const targetId = String(req.params.id || '').trim();
    const target = db.competitionTrophies.find((t) => t.id === targetId);
    db.competitionTrophies = db.competitionTrophies.filter((t) => t.id !== targetId);
    if (target) {
      appendAudit(db, req.authUser!, 'Removed trophy from gallery', 'Tournament Maker', target.name);
    }
    saveDb(db);
    res.json({ ok: true, deletedId: targetId, customTrophies: db.competitionTrophies });
  });

  app.post('/api/competition-maker', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const body = req.body || {};
    const { teamsMap, managersByTeam } = buildServerTeamAndManagerMaps(db);

    const teamIds = Array.isArray(body.teamIds) ? body.teamIds.map(String) : [];
    const stages = Array.isArray(body.stages) ? body.stages : [];
    const validation = validateTournamentConfig({
      name: String(body.name || 'Custom Competition').trim().slice(0, 120),
      season: String(body.season || '2026/27').trim().slice(0, 32),
      teamIds,
      stages,
    });
    if (!validation.valid) {
      res.status(400).json({
        error: validation.errors[0] || 'Invalid tournament structure.',
        validation,
      });
      return;
    }

    const tournament = createTournamentFromConfig(
      {
        name: String(body.name || 'Custom Competition').trim().slice(0, 120),
        shortName: String(body.shortName || 'COMP').trim().slice(0, 16),
        season: String(body.season || '2026/27').trim().slice(0, 32),
        description: String(body.description || '').trim().slice(0, 500),
        customLogoUrl:
          typeof body.customLogoUrl === 'string' && body.customLogoUrl.trim()
            ? body.customLogoUrl.trim().slice(0, 200000)
            : undefined,
        presetId: body.presetId || 'custom',
        teamScope: body.teamScope || 'club',
        teamIds,
        tieBreakers: Array.isArray(body.tieBreakers)
          ? body.tieBreakers
          : ['points', 'goal-diff', 'goals-for', 'head-to-head', 'wins', 'rating'],
        homeAdvantageBoost:
          typeof body.homeAdvantageBoost === 'number' ? body.homeAdvantageBoost : 5,
        preventSameCountry: Boolean(body.preventSameCountry),
        trophy: body.trophy || PRESET_TROPHIES[0],
        stages,
        createdBy: req.authUser?.id || 'guest',
        createdByName: req.authUser?.name || 'Match Director',
      },
      teamsMap,
      managersByTeam
    );

    if (!Array.isArray(db.competitionMakers)) db.competitionMakers = [];
    db.competitionMakers = [tournament, ...db.competitionMakers];

    if (tournament.trophy?.id) {
      if (!Array.isArray(db.competitionTrophies)) {
        db.competitionTrophies = PRESET_TROPHIES.map((t) => ({ ...t }));
      }
      if (!db.competitionTrophies.some((t) => t.id === tournament.trophy.id)) {
        db.competitionTrophies = [tournament.trophy, ...db.competitionTrophies];
      }
    }

    if (req.authUser) {
      appendUserActivity(db, {
        userId: req.authUser.id,
        userName: req.authUser.name,
        userEmail: req.authUser.email,
        category: 'simulation',
        action: 'Created Competition',
        target: tournament.name,
        details: `${tournament.teamIds.length} teams · ${tournament.stages.length} stage(s)`,
      });
    }

    saveDb(db);
    res.status(201).json({
      ok: true,
      competition: tournament,
      customTrophies: db.competitionTrophies,
    });
  });

  function findOrRestoreCompetitionIndex(
    list: CompetitionMakerTournament[],
    id: string,
    snapshot?: unknown
  ): number {
    const existingIdx = list.findIndex((c) => c.id === id);
    if (existingIdx >= 0) return existingIdx;
    if (
      snapshot &&
      typeof snapshot === 'object' &&
      (snapshot as CompetitionMakerTournament).id === id &&
      Array.isArray((snapshot as CompetitionMakerTournament).stages)
    ) {
      list.unshift(snapshot as CompetitionMakerTournament);
      return 0;
    }
    return -1;
  }

  app.put('/api/competition-maker/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const list = db.competitionMakers || [];
    const idx = findOrRestoreCompetitionIndex(list, req.params.id, req.body?.tournamentSnapshot);
    if (idx < 0) {
      res.status(404).json({ error: 'Competition not found.' });
      return;
    }
    const existing = list[idx];
    const patch = req.body || {};
    const updated: CompetitionMakerTournament = {
      ...existing,
      name: typeof patch.name === 'string' && patch.name.trim() ? patch.name.trim().slice(0, 120) : existing.name,
      shortName:
        typeof patch.shortName === 'string' && patch.shortName.trim()
          ? patch.shortName.trim().slice(0, 16)
          : existing.shortName,
      season:
        typeof patch.season === 'string' && patch.season.trim()
          ? patch.season.trim().slice(0, 32)
          : existing.season,
      description:
        typeof patch.description === 'string'
          ? patch.description.trim().slice(0, 500)
          : existing.description,
      customLogoUrl:
        typeof patch.customLogoUrl === 'string'
          ? patch.customLogoUrl.trim().slice(0, 200000) || undefined
          : existing.customLogoUrl,
      tieBreakers: Array.isArray(patch.tieBreakers) ? patch.tieBreakers : existing.tieBreakers,
      homeAdvantageBoost:
        typeof patch.homeAdvantageBoost === 'number'
          ? Math.max(0, Math.min(10, patch.homeAdvantageBoost))
          : existing.homeAdvantageBoost,
      trophy: patch.trophy && typeof patch.trophy === 'object' ? patch.trophy : existing.trophy,
      updatedAt: new Date().toISOString(),
    };
    list[idx] = updated;
    db.competitionMakers = list;
    saveDb(db);
    res.json({ ok: true, competition: updated });
  });

  app.delete('/api/competition-maker/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const list = db.competitionMakers || [];
    const target = list.find((c) => c.id === req.params.id);
    if (target) {
      if (req.query.revokeTrophy === 'true' && target.awardedTrophyTeamId && target.awardedTrophyRecordId) {
        revokeChampionTrophyOnServer(db, {
          teamId: target.awardedTrophyTeamId,
          trophyRecordId: target.awardedTrophyRecordId,
          editionHistoryId: target.history[0]?.id,
        });
      }
      db.competitionMakers = list.filter((c) => c.id !== req.params.id);
      saveDb(db);
    }
    res.json({
      ok: true,
      competitions: db.competitionMakers || [],
      teamOverrides: db.teamOverrides,
      customTeams: db.customTeams,
      hallOfFame: db.hallOfFame || [],
    });
  });

  app.post('/api/competition-maker/:id/draw', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const list = db.competitionMakers || [];
    const idx = findOrRestoreCompetitionIndex(list, req.params.id, req.body?.tournamentSnapshot);
    if (idx < 0) {
      res.status(404).json({ error: 'Competition not found.' });
      return;
    }
    const target = list[idx];
    const stageOrder =
      typeof req.body?.stageOrder === 'number' ? req.body.stageOrder : target.currentStageOrder;
    const mode = req.body?.mode as 'seeded' | 'bracket' | 'random' | 'official' | undefined;
    const customGroups = Array.isArray(req.body?.customGroups) ? req.body.customGroups : undefined;
    const preventSameCountry =
      typeof req.body?.preventSameCountry === 'boolean'
        ? req.body.preventSameCountry
        : target.drawOptions?.preventSameCountry;

    const targetStage = target.stages.find((s) => s.config.order === stageOrder);
    if (!targetStage) {
      res.status(404).json({ error: 'Stage not found.' });
      return;
    }
    if (isStageLocked(target, stageOrder)) {
      res.status(400).json({
        error: 'This stage is locked until the previous stage is fully completed.',
      });
      return;
    }
    if (targetStage.fixtures.some((f) => f.status === 'completed')) {
      res.status(400).json({
        error: 'Reset the completed fixtures in this stage before re-drawing.',
      });
      return;
    }

    const { teamsMap } = buildServerTeamAndManagerMaps(db);
    const drawn = performStageDraw(target, stageOrder, teamsMap, mode, customGroups, {
      preventSameCountry,
    });
    list[idx] = drawn;
    db.competitionMakers = list;
    saveDb(db);
    res.json({
      ok: true,
      competition: drawn,
      drawWarning: drawn.drawOptions?.lastWarning,
    });
  });

  app.post('/api/competition-maker/:id/simulate', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const list = db.competitionMakers || [];
    const idx = findOrRestoreCompetitionIndex(list, req.params.id, req.body?.tournamentSnapshot);
    if (idx < 0) {
      res.status(404).json({ error: 'Competition not found.' });
      return;
    }
    const target = list[idx];
    const { teamsMap, managersByTeam } = buildServerTeamAndManagerMaps(db);

    let updated: CompetitionMakerTournament;
    if (typeof req.body?.fixtureId === 'string' && req.body.fixtureId.trim()) {
      const fixId = req.body.fixtureId.trim();
      const fixStage = target.stages.find((s) => s.fixtures.some((f) => f.id === fixId));
      if (fixStage && isStageLocked(target, fixStage.config.order)) {
        res.status(400).json({
          error: 'This stage is locked until the previous stage is fully completed.',
        });
        return;
      }
      updated = simulateCompetitionFixture(
        target,
        fixId,
        teamsMap,
        managersByTeam,
        typeof req.body?.seed === 'string' ? req.body.seed.trim() : undefined
      );
    } else {
      const scope = (req.body?.scope || 'matchday') as
        | 'match'
        | 'matchday'
        | 'stage'
        | 'knockout'
        | 'tournament';
      const requestedStageOrder =
        typeof req.body?.stageOrder === 'number' ? req.body.stageOrder : undefined;
      updated = simulateCompetitionBatch(
        target,
        {
          scope,
          stageOrder: requestedStageOrder,
          roundIndex:
            typeof req.body?.roundIndex === 'number' ? req.body.roundIndex : undefined,
        },
        teamsMap,
        managersByTeam
      );
    }

    updated = awardChampionTrophyOnServer(db, updated);
    list[idx] = updated;
    db.competitionMakers = list;

    saveDb(db);
    res.json({
      ok: true,
      competition: updated,
      teamOverrides: db.teamOverrides,
      customTeams: db.customTeams,
      hallOfFame: db.hallOfFame || [],
      customTrophies: db.competitionTrophies || PRESET_TROPHIES,
    });
  });

  app.post('/api/competition-maker/:id/import-match', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const list = db.competitionMakers || [];
    const idx = findOrRestoreCompetitionIndex(list, req.params.id, req.body?.tournamentSnapshot);
    if (idx < 0) {
      res.status(404).json({ error: 'Competition not found.' });
      return;
    }
    const fixtureId = String(req.body?.fixtureId || '').trim();
    const simulationMatchId = String(req.body?.simulationMatchId || '').trim();
    if (!fixtureId || !simulationMatchId) {
      res.status(400).json({ error: 'fixtureId and simulationMatchId are required.' });
      return;
    }
    const simRecord = (db.simulationMatches || []).find((m) => m.id === simulationMatchId);
    if (!simRecord) {
      res.status(404).json({ error: 'Recorded Match Centre simulation not found.' });
      return;
    }

    const { teamsMap } = buildServerTeamAndManagerMaps(db);
    const result = importSimulationIntoFixture(list[idx], fixtureId, simRecord, teamsMap);
    if (!result.ok) {
      res.status(400).json({ error: result.error || 'Could not import match into fixture.' });
      return;
    }

    const updated = awardChampionTrophyOnServer(db, result.tournament);
    list[idx] = updated;
    db.competitionMakers = list;
    saveDb(db);
    res.json({
      ok: true,
      competition: updated,
      teamOverrides: db.teamOverrides,
      customTeams: db.customTeams,
      hallOfFame: db.hallOfFame || [],
      customTrophies: db.competitionTrophies || PRESET_TROPHIES,
    });
  });

  // Reset fixtures, stages, or entire tournament
  app.post('/api/competition-maker/:id/reset', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const list = db.competitionMakers || [];
    const idx = findOrRestoreCompetitionIndex(list, req.params.id, req.body?.tournamentSnapshot);
    if (idx < 0) {
      res.status(404).json({ error: 'Competition not found.' });
      return;
    }
    const target = list[idx];
    const scope = (req.body?.scope || 'tournament') as 'fixture' | 'stage' | 'tournament';
    const { teamsMap } = buildServerTeamAndManagerMaps(db);

    const { tournament: resetTournament, revokedTrophy } = resetCompetitionScope(
      target,
      {
        scope,
        fixtureId: typeof req.body?.fixtureId === 'string' ? req.body.fixtureId : undefined,
        stageOrder:
          typeof req.body?.stageOrder === 'number' ? req.body.stageOrder : undefined,
      },
      teamsMap
    );

    revokeChampionTrophyOnServer(db, revokedTrophy);
    list[idx] = resetTournament;
    db.competitionMakers = list;
    if (req.authUser) {
      appendAudit(db, req.authUser, `Reset competition (${scope})`, 'Tournament Maker', target.name);
    }

    saveDb(db);
    res.json({
      ok: true,
      competition: resetTournament,
      teamOverrides: db.teamOverrides,
      customTeams: db.customTeams,
      hallOfFame: db.hallOfFame || [],
    });
  });

  app.get('/api/public/players', (req, res) => {
    const db = getDb();
    const data = searchPublicPlayers(db, {
      q: typeof req.query.q === 'string' ? req.query.q : undefined,
      nationality: typeof req.query.nationality === 'string' ? req.query.nationality : undefined,
      gender:
        req.query.gender === 'men' || req.query.gender === 'women'
          ? req.query.gender
          : 'all',
      teamId: typeof req.query.teamId === 'string' ? req.query.teamId : undefined,
      limit: req.query.limit ? Number(req.query.limit) : 60,
    });
    res.json(data);
  });

  app.get('/api/public/players/:id', (req, res) => {
    const db = getDb();
    const profile = getPublicPlayerProfile(db, decodeURIComponent(req.params.id));
    if (!profile) {
      res.status(404).json({ error: 'Player profile not found.' });
      return;
    }
    res.json({ profile });
  });

  // =========================================================================
  // TEAM STATISTICS ENDPOINTS (Tournaments + Simulate a Match)
  // =========================================================================
  app.get('/api/public/teams/statistics', (req, res) => {
    const db = getDb();
    const result = getTeamStatisticsList(db, {
      teamType:
        req.query.teamType === 'club' || req.query.teamType === 'country'
          ? req.query.teamType
          : 'all',
      gender:
        req.query.gender === 'men' || req.query.gender === 'women'
          ? req.query.gender
          : 'all',
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      onlyWithMatches: req.query.onlyWithMatches === 'true',
    });
    res.json(result);
  });

  app.get('/api/public/teams/:id/statistics', (req, res) => {
    const db = getDb();
    const stats = getSingleTeamStatistics(db, decodeURIComponent(req.params.id));
    if (!stats) {
      res.status(404).json({ error: 'Team statistics record not found.' });
      return;
    }
    res.json({ statistics: stats });
  });

  // =========================================================================
  // MANAGERS DIRECTORY, APPOINTMENTS & STATISTICS ENDPOINTS
  // =========================================================================
  app.get('/api/public/managers', (req, res) => {
    const db = getDb();
    const result = listManagers(db, {
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      teamType:
        req.query.teamType === 'club' || req.query.teamType === 'country'
          ? req.query.teamType
          : 'all',
      nationality: typeof req.query.nationality === 'string' ? req.query.nationality : undefined,
      competition: typeof req.query.competition === 'string' ? req.query.competition : undefined,
      tacticalStyle:
        typeof req.query.tacticalStyle === 'string' ? req.query.tacticalStyle : undefined,
      sort:
        req.query.sort === 'team' || req.query.sort === 'appointment_date'
          ? req.query.sort
          : 'name',
    });
    res.json(result);
  });

  app.get('/api/public/managers/:id', (req, res) => {
    const db = getDb();
    const data = getManagerById(db, decodeURIComponent(req.params.id));
    if (!data) {
      res.status(404).json({ error: 'Manager record not found.' });
      return;
    }
    res.json(data);
  });

  app.get('/api/public/managers/:id/statistics', (req, res) => {
    const db = getDb();
    const stats = managerStatistics(db, decodeURIComponent(req.params.id));
    if (!stats) {
      res.status(404).json({ error: 'Manager record not found.' });
      return;
    }
    res.json({ statistics: stats });
  });

  // Signed-in users can add new managers (unverified unless admin)
  app.post('/api/managers', requireAuth, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const result = createManager(db, req.body || {}, req.authUser || null);
    if (!result.ok || !result.manager) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    if (req.authUser?.role === 'admin') {
      appendAudit(db, req.authUser, 'Created manager record', 'Managers', result.manager.name);
    } else if (req.authUser) {
      appendUserActivity(db, {
        userId: req.authUser.id,
        userName: req.authUser.name,
        userEmail: req.authUser.email,
        category: 'admin',
        action: 'Added manager record',
        target: result.manager.name,
      });
    }
    saveDb(db);
    const enriched = getManagerById(db, result.manager.id);
    res.status(201).json({
      ok: true,
      manager: enriched?.manager || result.manager,
      managers: withManagerAges(db.managers || []),
      managerAppointments: db.managerAppointments,
    });
  });

  // Admins can edit everything, assign managers, add/end appointments
  app.put('/api/managers/:id', requireAdmin, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const managerId = decodeURIComponent(req.params.id);
    const result = updateManager(db, managerId, req.body || {}, req.authUser || null);
    if (!result.ok || !result.manager) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendAudit(db, req.authUser!, 'Updated manager record', 'Managers', result.manager.name);
    saveDb(db);
    const enriched = getManagerById(db, result.manager.id);
    res.json({
      ok: true,
      manager: enriched?.manager || result.manager,
      managers: withManagerAges(db.managers || []),
      managerAppointments: db.managerAppointments,
      teamOverrides: db.teamOverrides,
      customTeams: db.customTeams,
    });
  });

  app.post('/api/managers/assign', requireAdmin, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const body = req.body || {};
    if (!body.manager_id || !body.team_id) {
      res.status(400).json({ error: 'manager_id and team_id are required.' });
      return;
    }
    const result = assignManager(db, {
      manager_id: String(body.manager_id),
      team_id: String(body.team_id),
      role: body.role,
      start_date: body.start_date,
      competitions: body.competitions,
      honours: body.honours,
      notes: body.notes,
      verified: body.verified,
    });
    if (!result.ok || !result.appointment) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendAudit(
      db,
      req.authUser!,
      `Appointed manager (${result.appointment.role})`,
      'Managers',
      `${result.appointment.manager_name} → ${result.appointment.team_name}`
    );
    saveDb(db);
    res.status(201).json({
      ok: true,
      appointment: result.appointment,
      closedAppointments: result.closedAppointments || [],
      managers: withManagerAges(db.managers || []),
      managerAppointments: db.managerAppointments,
      teamOverrides: db.teamOverrides,
      customTeams: db.customTeams,
    });
  });

  app.post('/api/managers/:id/appointments', requireAdmin, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const managerId = decodeURIComponent(req.params.id);
    const body = req.body || {};
    if (!body.team_id || !body.start_date) {
      res.status(400).json({ error: 'team_id and start_date are required.' });
      return;
    }
    const result = addCareerAppointment(db, managerId, {
      team_id: String(body.team_id),
      role: body.role,
      start_date: String(body.start_date),
      end_date: body.end_date ?? null,
      is_current: Boolean(body.is_current),
      competitions: body.competitions,
      honours: body.honours,
      notes: body.notes,
      verified: body.verified,
    });
    if (!result.ok || !result.appointment) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendAudit(
      db,
      req.authUser!,
      result.appointment.is_current ? 'Assigned current appointment' : 'Recorded historical appointment',
      'Managers',
      `${result.appointment.manager_name} · ${result.appointment.team_name}`
    );
    saveDb(db);
    res.status(201).json({
      ok: true,
      appointment: result.appointment,
      managers: withManagerAges(db.managers || []),
      managerAppointments: db.managerAppointments,
      teamOverrides: db.teamOverrides,
      customTeams: db.customTeams,
    });
  });

  app.post('/api/manager-appointments/:id/end', requireAdmin, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const result = endManagerAppointment(db, decodeURIComponent(req.params.id), {
      end_date: req.body?.end_date,
    });
    if (!result.ok || !result.appointment) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendAudit(
      db,
      req.authUser!,
      'Ended manager appointment',
      'Managers',
      `${result.appointment.manager_name} · ${result.appointment.team_name}`
    );
    saveDb(db);
    res.json({
      ok: true,
      appointment: result.appointment,
      managers: withManagerAges(db.managers || []),
      managerAppointments: db.managerAppointments,
      teamOverrides: db.teamOverrides,
      customTeams: db.customTeams,
    });
  });

  app.post('/api/teams/:teamId/end-manager', requireAdmin, (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const teamId = decodeURIComponent(req.params.teamId);
    const result = endTeamCurrentManagerAppointment(db, teamId, {
      end_date: req.body?.end_date,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendAudit(db, req.authUser!, 'Ended team current manager appointment', 'Managers', teamId);
    saveDb(db);
    res.json({
      ok: true,
      managers: withManagerAges(db.managers || []),
      managerAppointments: db.managerAppointments,
      teamOverrides: db.teamOverrides,
      customTeams: db.customTeams,
    });
  });

  app.get('/api/public/homepage-config', (_req, res) => {
    const db = getDb();
    res.json({ homepageConfig: db.homepageConfig });
  });

  app.get('/api/public/reads/catalogue', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const isAdmin = req.authUser?.role === 'admin' && !req.authUser.blocked;
    res.json({
      series: isAdmin ? db.readingSeries : db.readingSeries.filter((s) => s.published),
      books: isAdmin ? db.bookVolumes : db.bookVolumes.filter((b) => b.published),
    });
  });

  app.get('/api/public/reads/series', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const isAdmin = req.authUser?.role === 'admin' && !req.authUser.blocked;
    res.json({
      series: isAdmin ? db.readingSeries : db.readingSeries.filter((s) => s.published),
    });
  });

  app.get('/api/public/reads/books', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const isAdmin = req.authUser?.role === 'admin' && !req.authUser.blocked;
    res.json({
      books: isAdmin ? db.bookVolumes : db.bookVolumes.filter((b) => b.published),
    });
  });

  // User Library Persistence
  app.get('/api/user/library', (req: AuthenticatedRequest, res) => {
    if (!req.authUser) {
      res.json({ library: null, exists: false });
      return;
    }
    const db = getDb();
    const stored = db.userLibraries?.[req.authUser.id];
    const lib = stored || {
      savedBookIds: [],
      bookmarks: [],
      progress: {},
      recentBookIds: [],
    };
    res.json({ library: lib, exists: Boolean(stored) });
  });

  const handleSaveUserLibrary = (req: AuthenticatedRequest, res: express.Response) => {
    if (!req.authUser) {
      res.status(401).json({ error: 'Sign-in required to sync personal library.' });
      return;
    }
    const raw =
      req.body && typeof req.body === 'object' && 'library' in req.body
        ? req.body.library
        : req.body;
    const normalized = {
      savedBookIds: Array.isArray(raw?.savedBookIds)
        ? raw.savedBookIds.filter((id: unknown): id is string => typeof id === 'string').slice(0, 500)
        : [],
      bookmarks: Array.isArray(raw?.bookmarks) ? raw.bookmarks.slice(0, 1000) : [],
      progress:
        raw?.progress && typeof raw.progress === 'object' && !Array.isArray(raw.progress)
          ? raw.progress
          : {},
      recentBookIds: Array.isArray(raw?.recentBookIds)
        ? raw.recentBookIds.filter((id: unknown): id is string => typeof id === 'string').slice(0, 50)
        : [],
      updatedAt:
        typeof raw?.updatedAt === 'string' && raw.updatedAt
          ? raw.updatedAt
          : new Date().toISOString(),
    };
    const db = getDb();
    if (!db.userLibraries) db.userLibraries = {};
    db.userLibraries[req.authUser.id] = normalized;
    saveDb(db, { skipCloudSync: true });
    res.json({ ok: true, library: db.userLibraries[req.authUser.id] });
  };

  app.put('/api/user/library', handleSaveUserLibrary);
  app.post('/api/user/library', handleSaveUserLibrary);

  app.get('/api/public/announcements', (_req, res) => {
    const db = getDb();
    const publishedAnnouncements = sortAnnouncementsNewestFirst(
      db.announcements.filter((a) => a.status === 'published')
    );
    res.json({ announcements: publishedAnnouncements });
  });



  const handleNewsletterSubscribe = (req: AuthenticatedRequest, res: express.Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const db = getDb();
    db.newsletterSubscribers = deduplicateSubscribers(db.newsletterSubscribers || []);
    const existing = db.newsletterSubscribers.find((s) => s.email.toLowerCase() === email);
    if (existing) {
      res.status(200).json({
        ok: true,
        duplicate: true,
        subscriber: existing,
      });
      return;
    }

    const created = {
      id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      email,
      subscribedAt: new Date().toISOString(),
    };
    db.newsletterSubscribers = [created, ...db.newsletterSubscribers];
    saveDb(db);
    res.status(201).json({
      ok: true,
      duplicate: false,
      subscriber: created,
    });
  };

  app.post('/api/public/newsletter/subscribe', handleNewsletterSubscribe);
  app.post('/api/newsletter/subscribe', handleNewsletterSubscribe);

  app.get('/api/pdfs/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const pdf = db.pdfFiles.find((p) => p.id === req.params.id || p.bookId === req.params.id);
    if (!pdf) {
      res.status(404).json({ error: 'PDF edition not found.' });
      return;
    }

    const isAdmin = req.authUser?.role === 'admin' && !req.authUser.blocked;
    if (pdf.accessStatus !== 'public' && !isAdmin) {
      res.status(403).json({
        error: 'Access denied: this PDF edition is private or restricted to administrators.',
      });
      return;
    }

    res.json({ pdf });
  });

  app.get('/api/pdfs/download/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const pdf = db.pdfFiles.find((p) => p.id === req.params.id || p.bookId === req.params.id);
    if (!pdf) {
      res.status(404).json({ error: 'PDF edition not found.' });
      return;
    }

    const isAdmin = req.authUser?.role === 'admin' && !req.authUser.blocked;
    if (pdf.accessStatus !== 'public' && !isAdmin) {
      res.status(403).json({
        error: 'Access denied: this PDF edition is private or restricted to administrators.',
      });
      return;
    }

    let filePath = '';
    if (pdf.urlOrData.startsWith('/uploads/pdfs/')) {
      filePath = path.join(process.cwd(), 'public', pdf.urlOrData);
    } else if (pdf.urlOrData.startsWith('/assets/aistudio/')) {
      filePath = path.join(process.cwd(), 'public', pdf.urlOrData);
    } else {
      filePath = path.join(process.cwd(), 'public', 'uploads', 'pdfs', pdf.filename);
    }

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(pdf.filename)}"`
      );
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.redirect(pdf.urlOrData);
    }
  });

  app.post('/api/analytics/event', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { bookId, bookTitle, seriesTitle, eventType } = req.body || {};
    if (!bookId || !eventType) {
      res.status(400).json({ error: 'bookId and eventType are required.' });
      return;
    }
    db.analyticsEvents = [
      {
        id: `an-${Date.now()}`,
        bookId: String(bookId),
        bookTitle: String(bookTitle || bookId),
        seriesTitle: String(seriesTitle || 'Library'),
        eventType,
        userId: req.authUser?.id,
        timestamp: new Date().toISOString(),
      },
      ...db.analyticsEvents.slice(0, 500),
    ];
    saveDb(db);
    res.json({ ok: true });
  });

  // =========================================================================
  // 3. PROTECTED ADMIN API (/api/admin/*) — Strictly Verified by requireAdmin
  // =========================================================================
  const adminRouter = express.Router();
  adminRouter.use(requireAdmin);

  // Section 1: Overview
  adminRouter.get('/overview', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    res.json({
      adminEmail: req.authUser!.email,
      usersCount: db.users.length,
      unreadMessagesCount: db.fanChatMessages.filter((m) => m.status === 'flagged').length,
      openQuizReportsCount: db.quizReports.filter((r) => r.status === 'open').length,
      announcementsCount: db.announcements.filter((a) => a.status === 'published').length,
      pdfCount: db.pdfFiles.length,
      seriesCount: db.readingSeries.length,
      booksCount: db.bookVolumes.length,
      mediaCount: db.mediaAssets.length,
      leaguesPublishedCount: db.leagueStatuses.filter((l) => l.stage === 'published').length,
      leaguesTotalCount: db.leagueStatuses.length,
      auditLogs: db.auditLogs.slice(0, 12),
      recentActivity: db.activityLogs.slice(0, 8),
      setupStatus: {
        hasBranding: Boolean(db.branding.logoUrl && db.branding.siteName),
        hasMusic: db.musicTracks.some((m) => m.enabled),
        hasContact: Boolean(db.contactInfo.officialEmail),
      },
    });
  });

  // Section 2: Signed-in Accounts
  adminRouter.get('/users', (_req, res) => {
    const db = getDb();
    res.json({
      users: db.users.map((u) => ({
        ...toPublicUser(u),
        activeSessions: db.sessions.filter((s) => s.userId === u.id).length,
        warningsCount: db.userWarnings.filter((w) => w.userId === u.id).length,
      })),
    });
  });

  adminRouter.patch('/users/:id/block', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    const isMainAdmin = req.authUser?.email === 'david.emanoueel.gr7@gmail.com';
    if (target.id === req.authUser!.id && !isMainAdmin) {
      res.status(400).json({ error: 'You cannot suspend your own active administrator account.' });
      return;
    }
    target.blocked = Boolean(req.body?.blocked);
    target.blockedReason = target.blocked ? String(req.body?.reason || 'Suspended by administrator') : undefined;
    if (target.blocked) {
      db.sessions = db.sessions.filter((s) => s.userId !== target.id);
    }
    appendAudit(
      db,
      req.authUser!,
      target.blocked ? 'Blocked account' : 'Unblocked account',
      'Signed-in Accounts',
      target.email
    );
    saveDb(db);
    res.json({ user: toPublicUser(target) });
  });

  adminRouter.delete('/users/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    const isMainAdmin = req.authUser?.email === 'david.emanoueel.gr7@gmail.com';
    if (target.id === req.authUser!.id && !isMainAdmin) {
      res.status(400).json({ error: 'You cannot delete your own active administrator account.' });
      return;
    }
    db.users = db.users.filter((u) => u.id !== target.id);
    db.sessions = db.sessions.filter((s) => s.userId !== target.id);
    appendAudit(db, req.authUser!, 'Removed account', 'Signed-in Accounts', target.email);
    saveDb(db);
    res.json({ ok: true, removedId: target.id });
  });

  adminRouter.post('/users/:id/signout', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const target = db.users.find((u) => u.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }
    db.sessions = db.sessions.filter((s) => s.userId !== target.id);
    appendAudit(db, req.authUser!, 'Signed out user sessions', 'Signed-in Accounts', target.email);
    saveDb(db);
    res.json({ ok: true });
  });

  // Section 3: Accounts & Activity
  adminRouter.get('/activity', (req, res) => {
    const db = getDb();
    res.json(
      adminUserActivity(db, {
        category: String(req.query.category || 'all'),
        userId: String(req.query.userId || 'all'),
        search: String(req.query.search || ''),
      })
    );
  });

  // Section 4: Account & Security
  adminRouter.get('/security', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const sessions = db.sessions
      .filter((s) => s.userId === req.authUser!.id)
      .map((s) => ({
        sid: s.sid,
        userAgent: s.userAgent,
        ip: s.ip,
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        expiresAt: s.expiresAt,
        isCurrent: s.sid === req.authSession?.sid,
      }));
    res.json({
      account: toPublicUser(req.authUser!),
      sessions,
      securityAudits: db.auditLogs.filter((a) => a.section === 'Account & Security').slice(0, 15),
    });
  });

  // Section 5: Simulation Database
  adminRouter.get('/simulation-database', (_req, res) => {
    const db = getDb();
    res.json(adminSimulationDatabase(db));
  });

  adminRouter.get('/simulation-database/matches/:id', (req, res) => {
    const db = getDb();
    const match = db.simulationMatches.find((m) => m.id === req.params.id);
    if (!match) {
      res.status(404).json({ error: 'Simulation match not found.' });
      return;
    }
    res.json({ match });
  });

  adminRouter.get('/simulation-database/competitions/:id', (req, res) => {
    const db = getDb();
    const competition = db.competitions.find((c) => c.id === req.params.id);
    if (!competition) {
      res.status(404).json({ error: 'Competition not found.' });
      return;
    }
    const matches = db.simulationMatches.filter((m) => m.competitionId === competition.id);
    res.json({ competition, matches });
  });

  adminRouter.post('/simulation-database/matches', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { homeTeamId, awayTeamId, homeScore, awayScore, competitionName, venue, events } = req.body || {};
    const { projectedTeams } = buildLiveRegistryBundle(db);
    const home = projectedTeams.find((t) => t.id === homeTeamId);
    const away = projectedTeams.find((t) => t.id === awayTeamId);
    if (!home || !away || home.id === away.id) {
      res.status(400).json({ error: 'Select two distinct valid teams.' });
      return;
    }
    const sanitizedEvents = Array.isArray(events)
      ? events
          .filter((ev: any) => ev && typeof ev === 'object')
          .map((ev: any) => ({
            minute: Math.max(1, Math.min(120, Number(ev.minute) || 1)),
            type: (['goal', 'yellow', 'red', 'sub'].includes(ev.type) ? ev.type : 'goal') as
              | 'goal'
              | 'yellow'
              | 'red'
              | 'sub',
            teamSide: (ev.teamSide === 'away' ? 'away' : 'home') as 'home' | 'away',
            playerId: ev.playerId ? String(ev.playerId) : undefined,
            playerName: String(ev.playerName || 'Player'),
            assistPlayerId: ev.assistPlayerId ? String(ev.assistPlayerId) : undefined,
            assistPlayerName: ev.assistPlayerName ? String(ev.assistPlayerName) : undefined,
            detail: ev.detail ? String(ev.detail) : undefined,
          }))
      : [];
    const created = {
      id: `sim-match-${Date.now()}`,
      homeTeamId: home.id,
      homeTeamName: home.name,
      homeCode: home.code,
      awayTeamId: away.id,
      awayTeamName: away.name,
      awayCode: away.code,
      homeScore: Math.max(0, Number(homeScore) || 0),
      awayScore: Math.max(0, Number(awayScore) || 0),
      halfTimeHomeScore:
        typeof req.body?.halfTimeHomeScore === 'number' ? req.body.halfTimeHomeScore : undefined,
      halfTimeAwayScore:
        typeof req.body?.halfTimeAwayScore === 'number' ? req.body.halfTimeAwayScore : undefined,
      wentToExtraTime: Boolean(req.body?.wentToExtraTime),
      penaltySummary: req.body?.penaltySummary ? String(req.body.penaltySummary) : undefined,
      seed: req.body?.seed ? String(req.body.seed) : undefined,
      competitionId: String(
        req.body?.competitionId ||
          (getTeamType(home) === 'country' || getTeamType(away) === 'country'
            ? 'comp-world-intl'
            : 'comp-intl-club')
      ),
      competitionName: String(
        competitionName ||
          (getTeamType(home) === 'country' && getTeamType(away) === 'country'
            ? 'International Match'
            : 'DodaEona Club Cup')
      ),
      status: 'completed' as const,
      date: new Date().toISOString().slice(0, 10),
      venue: String(venue || home.stadium || 'Neutral Ground'),
      attendance: home.stadiumCapacity || 52000,
      possessionHome:
        typeof req.body?.possessionHome === 'number' ? req.body.possessionHome : 50,
      shotsHome: typeof req.body?.shotsHome === 'number' ? req.body.shotsHome : 0,
      shotsAway: typeof req.body?.shotsAway === 'number' ? req.body.shotsAway : 0,
      xgHome: typeof req.body?.xgHome === 'number' ? Number(req.body.xgHome.toFixed(2)) : 0,
      xgAway: typeof req.body?.xgAway === 'number' ? Number(req.body.xgAway.toFixed(2)) : 0,
      lineupPlayerIds: req.body?.lineupPlayerIds || undefined,
      events: sanitizedEvents,
      fullPayload: req.body?.fullPayload || undefined,
      createdBy: req.authUser!.email,
    };
    db.simulationMatches = [created, ...db.simulationMatches];
    appendAudit(
      db,
      req.authUser!,
      'Recorded simulation fixture',
      'Simulation Database',
      `${home.code} ${created.homeScore}-${created.awayScore} ${away.code}`
    );
    saveDb(db);
    res.status(201).json({ match: created });
  });

  adminRouter.delete('/simulation-database/matches/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const target = db.simulationMatches.find((m) => m.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Match not found.' });
      return;
    }
    db.simulationMatches = db.simulationMatches.filter((m) => m.id !== req.params.id);
    appendAudit(
      db,
      req.authUser!,
      'Removed simulation fixture',
      'Simulation Database',
      `${target.homeCode} vs ${target.awayCode}`
    );
    saveDb(db);
    res.json({ ok: true });
  });

  // Section 6: Club Rankings + Football Intelligence
  adminRouter.get('/club-rankings', (req, res) => {
    const db = getDb();
    res.json({
      rankings: computeClubRankings(db, {
        type: (req.query.type as 'all' | 'club' | 'national') || 'all',
        gender: (req.query.gender as 'all' | 'men' | 'women') || 'all',
        search: String(req.query.search || ''),
      }),
      intelligence: footballIntelligence(db),
      managers: enrichManagers(db),
    });
  });

  adminRouter.patch('/club-rankings/:teamId', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { teamId } = req.params;
    const { projectedTeams } = buildLiveRegistryBundle(db);
    const team = projectedTeams.find((t) => t.id === teamId);
    if (!team) {
      res.status(404).json({ error: 'Team not found.' });
      return;
    }
    db.rankingOverrides[teamId] = {
      teamId,
      pinned: Boolean(req.body?.pinned),
      bonusPoints: Number(req.body?.bonusPoints) || 0,
      editorialNote: String(req.body?.editorialNote || '').trim() || undefined,
    };
    appendAudit(db, req.authUser!, 'Updated club ranking override', 'Club Rankings', team.name);
    saveDb(db);
    res.json({ rankings: computeClubRankings(db) });
  });

  // Section 7: League Status Manager (Import -> Staged -> Verified -> Published)
  adminRouter.get('/leagues', (_req, res) => {
    const db = getDb();
    res.json({ leagues: db.leagueStatuses });
  });

  adminRouter.post('/leagues/import', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const leagueName = String(req.body?.leagueName || '').trim();
    const country = String(req.body?.country || '').trim();
    if (!leagueName || !country) {
      res.status(400).json({ error: 'League name and country are required.' });
      return;
    }
    const created = {
      id: `lg-${Date.now()}`,
      leagueName,
      country,
      confederation: String(req.body?.confederation || 'UEFA'),
      teamsCount: Math.max(2, Number(req.body?.teamsCount) || 18),
      stage: 'import' as LeagueLifecycleStage,
      integrityPercent: 68,
      notes: String(req.body?.notes || 'Newly imported league dataset awaiting staging & verification.'),
      updatedAt: new Date().toISOString(),
    };
    db.leagueStatuses = [created, ...db.leagueStatuses];
    appendAudit(db, req.authUser!, 'Imported league dataset', 'League Status Manager', leagueName);
    saveDb(db);
    res.status(201).json({ league: created });
  });

  adminRouter.patch('/leagues/:id/stage', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const league = db.leagueStatuses.find((l) => l.id === req.params.id);
    if (!league) {
      res.status(404).json({ error: 'League record not found.' });
      return;
    }

    const nextStage = req.body?.stage as LeagueLifecycleStage;
    const validStages: LeagueLifecycleStage[] = ['import', 'staged', 'verified', 'published'];
    if (!validStages.includes(nextStage)) {
      res.status(400).json({ error: 'Invalid league stage.' });
      return;
    }

    // Enforce verification gate: never publish directly from unverified import/staged!
    if (nextStage === 'published' && league.stage !== 'verified' && league.stage !== 'published') {
      res.status(400).json({
        error: 'Unverified leagues cannot be published directly. Verify the league first.',
      });
      return;
    }

    league.stage = nextStage;
    if (nextStage === 'staged') league.integrityPercent = Math.max(league.integrityPercent, 85);
    if (nextStage === 'verified') {
      league.integrityPercent = 100;
      league.verifiedBy = req.authUser!.email;
    }
    if (typeof req.body?.notes === 'string') {
      league.notes = req.body.notes;
    }
    league.updatedAt = new Date().toISOString();
    appendAudit(
      db,
      req.authUser!,
      `Moved league to ${nextStage}`,
      'League Status Manager',
      league.leagueName
    );
    saveDb(db);
    res.json({ league });
  });

  // Section 8: Squad Numbers (with duplicate detection, synced to club/national registrations)
  adminRouter.get('/squad-numbers', (req, res) => {
    const db = getDb();
    const { projectedTeams } = buildLiveRegistryBundle(db);
    const teamId = String(req.query.teamId || projectedTeams[0]?.id || '');
    const team = projectedTeams.find((t) => t.id === teamId) || projectedTeams[0];
    if (!team) {
      res.json({
        team: null,
        teamsList: [],
        players: [],
      });
      return;
    }
    const overrides = db.squadShirtOverrides[team.id] || {};
    const players = team.squad.map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position,
      positionDetail: p.positionDetail,
      overallRating: p.overallRating,
      shirtNumber: p.shirtNumber ?? overrides[p.id] ?? 1,
    }));
    res.json({
      team: { id: team.id, name: team.name, code: team.code, league: team.league || team.country },
      teamsList: projectedTeams.map((t) => ({ id: t.id, name: t.name, code: t.code, league: t.league || t.country })),
      players,
    });
  });

  adminRouter.patch('/squad-numbers/:teamId', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { projectedTeams } = buildLiveRegistryBundle(db);
    const team = projectedTeams.find((t) => t.id === req.params.teamId);
    if (!team) {
      res.status(404).json({ error: 'Team not found.' });
      return;
    }
    const updates = req.body?.numbers as Record<string, number> | undefined;
    if (!updates || typeof updates !== 'object') {
      res.status(400).json({ error: 'Numbers map is required.' });
      return;
    }

    const seen = new Map<number, string>();
    const existingOverrides = db.squadShirtOverrides[team.id] || {};
    const merged: Record<string, number> = { ...existingOverrides };

    for (const p of team.squad) {
      const candidate = updates[p.id] !== undefined ? Number(updates[p.id]) : p.shirtNumber ?? merged[p.id];
      if (!Number.isInteger(candidate) || candidate < 1 || candidate > 99) {
        res.status(400).json({ error: `Invalid shirt number (${candidate}) for ${p.name}. Must be 1–99.` });
        return;
      }
      if (seen.has(candidate)) {
        res.status(400).json({
          error: `Duplicate shirt number #${candidate} assigned to both ${seen.get(candidate)} and ${p.name}.`,
        });
        return;
      }
      seen.set(candidate, p.name);
      merged[p.id] = candidate;
    }

    db.squadShirtOverrides[team.id] = merged;
    syncTeamShirtNumbersToRegistry(db, team.id, merged);
    appendAudit(db, req.authUser!, 'Validated & updated squad numbers', 'Squad Numbers', team.name);
    saveDb(db);
    res.json({ ok: true, numbers: merged });
  });

  // Penalty Kick Order Hierarchy (Admin Editable + Verified Baseline)
  adminRouter.get('/penalty-order/:teamId', (req, res) => {
    const db = getDb();
    const { projectedTeams } = buildLiveRegistryBundle(db);
    const teamId = decodeURIComponent(req.params.teamId);
    const team = projectedTeams.find((t) => t.id === teamId);
    if (!team) {
      res.status(404).json({ error: 'Team not found.' });
      return;
    }
    const isUser = team.penaltyOrderSource === 'user-set';
    const orderIds =
      isUser && team.penaltyOrderIds?.length
        ? reconcilePenaltyOrderIds(team.squad, team.penaltyOrderIds, team.id, true)
        : buildDefaultClubPenaltyOrderIds(team.id, team.squad);
    res.json({
      teamId: team.id,
      teamName: team.name,
      penaltyOrderIds: orderIds,
      penaltyOrderSource: isUser ? 'user-set' : 'verified',
    });
  });

  adminRouter.patch('/penalty-order/:teamId', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { projectedTeams } = buildLiveRegistryBundle(db);
    const teamId = decodeURIComponent(req.params.teamId);
    const team = projectedTeams.find((t) => t.id === teamId);
    if (!team) {
      res.status(404).json({ error: 'Team not found.' });
      return;
    }

    const resetToVerified = Boolean(req.body?.resetToVerified);
    let nextIds: string[];
    let nextSource: 'verified' | 'user-set';

    if (resetToVerified) {
      nextIds = buildDefaultClubPenaltyOrderIds(team.id, team.squad);
      nextSource = 'verified';
    } else {
      const requested = req.body?.penaltyOrderIds;
      if (!Array.isArray(requested) || requested.length === 0) {
        res.status(400).json({ error: 'penaltyOrderIds array is required.' });
        return;
      }
      const validIds = new Set(team.squad.map((p) => p.id));
      for (const id of requested) {
        if (!validIds.has(String(id))) {
          res.status(400).json({ error: `Player ID ${id} does not belong to ${team.name}.` });
          return;
        }
      }
      nextIds = reconcilePenaltyOrderIds(team.squad, requested.map(String), team.id, true);
      nextSource = 'user-set';
    }

    if (team.isCustom && Array.isArray(db.customTeams)) {
      db.customTeams = db.customTeams.map((c) =>
        c.id === team.id
          ? {
              ...c,
              penaltyOrderIds: nextIds,
              penaltyOrderSource: nextSource,
            }
          : c
      );
    } else {
      if (!db.teamOverrides) db.teamOverrides = {};
      const currentOverride = (db.teamOverrides[team.id] as Partial<Team> | undefined) || {};
      db.teamOverrides[team.id] = {
        ...team,
        ...currentOverride,
        penaltyOrderIds: nextIds,
        penaltyOrderSource: nextSource,
      };
    }

    appendAudit(
      db,
      req.authUser!,
      resetToVerified ? 'Reset penalty kick order to verified default' : 'Updated penalty kick order',
      'Penalty Kick Order',
      team.name
    );
    saveDb(db);
    res.json({ ok: true, penaltyOrderIds: nextIds, penaltyOrderSource: nextSource });
  });

  // Section 9: Injuries & Availability (synced to permanent PlayerIdentity)
  adminRouter.get('/injuries', (_req, res) => {
    const db = getDb();
    const { projectedTeams } = buildLiveRegistryBundle(db);
    const injuredPlayers: Array<{
      teamId: string;
      teamName: string;
      playerId: string;
      playerName: string;
      position: string;
      overallRating: number;
      status: 'fit' | 'doubtful' | 'injured';
      returnDate: string;
      note: string;
    }> = [];

    for (const team of projectedTeams) {
      const teamOverrides = db.squadInjuryOverrides[team.id] || {};
      for (const p of team.squad) {
        const override = teamOverrides[p.id];
        const status = p.injuryStatus ?? override?.status ?? 'fit';
        if (status === 'injured' || status === 'doubtful') {
          injuredPlayers.push({
            teamId: team.id,
            teamName: team.name,
            playerId: p.id,
            playerName: p.name,
            position: p.positionDetail,
            overallRating: p.overallRating,
            status,
            returnDate: p.injuryReturnDate || override?.returnDate || 'TBD',
            note: p.injuryNote || override?.note || 'Medical review',
          });
        }
      }
    }

    res.json({
      injuredPlayers,
      teamsList: projectedTeams.map((t) => ({
        id: t.id,
        name: t.name,
        squad: t.squad.map((p) => ({
          id: p.id,
          name: p.name,
          positionDetail: p.positionDetail,
          injuryStatus: p.injuryStatus ?? db.squadInjuryOverrides[t.id]?.[p.id]?.status ?? 'fit',
        })),
      })),
    });
  });

  adminRouter.patch('/injuries/:teamId/:playerId', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { projectedTeams } = buildLiveRegistryBundle(db);
    const team = projectedTeams.find((t) => t.id === req.params.teamId);
    const player = team?.squad.find((p) => p.id === req.params.playerId);
    if (!team || !player) {
      res.status(404).json({ error: 'Team or player not found.' });
      return;
    }

    const status = req.body?.status as 'fit' | 'doubtful' | 'injured';
    if (!['fit', 'doubtful', 'injured'].includes(status)) {
      res.status(400).json({ error: 'Invalid injury status.' });
      return;
    }

    const returnDate = status === 'fit' ? '' : String(req.body?.returnDate || 'TBD');
    const note = status === 'fit' ? '' : String(req.body?.note || 'Squad medical report');

    if (!db.squadInjuryOverrides[team.id]) {
      db.squadInjuryOverrides[team.id] = {};
    }
    db.squadInjuryOverrides[team.id][player.id] = {
      status,
      returnDate: status === 'fit' ? undefined : returnDate,
      note: status === 'fit' ? undefined : note,
    };
    updateAdminPlayerIdentity(db, player.id, {
      injuryStatus: status,
      injuryReturnDate: returnDate,
      injuryNote: note,
    });
    appendAudit(
      db,
      req.authUser!,
      `Set injury status (${status})`,
      'Injuries & Availability',
      `${player.name} (${team.code})`
    );
    saveDb(db);
    res.json({ ok: true });
  });

  // Section 10: Publication Analytics
  adminRouter.get('/analytics', (_req, res) => {
    const db = getDb();
    const events = db.analyticsEvents;
    const totals = {
      views: events.filter((e) => e.eventType === 'view').length,
      reads: events.filter((e) => e.eventType === 'read').length,
      downloads: events.filter((e) => e.eventType === 'download').length,
      bookmarks: events.filter((e) => e.eventType === 'bookmark').length,
    };

    const byBook = new Map<
      string,
      { bookId: string; bookTitle: string; seriesTitle: string; views: number; reads: number; downloads: number; bookmarks: number }
    >();
    for (const ev of events) {
      const curr = byBook.get(ev.bookId) || {
        bookId: ev.bookId,
        bookTitle: ev.bookTitle,
        seriesTitle: ev.seriesTitle,
        views: 0,
        reads: 0,
        downloads: 0,
        bookmarks: 0,
      };
      if (ev.eventType === 'view') curr.views += 1;
      if (ev.eventType === 'read') curr.reads += 1;
      if (ev.eventType === 'download') curr.downloads += 1;
      if (ev.eventType === 'bookmark') curr.bookmarks += 1;
      byBook.set(ev.bookId, curr);
    }

    res.json({
      totals,
      perBook: Array.from(byBook.values()).sort((a, b) => b.reads + b.views - (a.reads + a.views)),
      recentEvents: events.slice(0, 20),
    });
  });

  // Section 11: Reader Objectives (preserves completion counts)
  adminRouter.get('/objectives', (_req, res) => {
    const db = getDb();
    res.json({ objectives: db.readerObjectives });
  });

  adminRouter.post('/objectives', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || '').trim();
    if (!title || !description) {
      res.status(400).json({ error: 'Title and description are required.' });
      return;
    }
    const created = {
      id: `obj-${Date.now()}`,
      title,
      description,
      category: (req.body?.category || 'reading') as 'reading' | 'series' | 'quiz' | 'engagement',
      targetCount: Math.max(1, Number(req.body?.targetCount) || 1),
      xpReward: Math.max(10, Number(req.body?.xpReward) || 100),
      active: req.body?.active !== false,
      completions: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.readerObjectives = [created, ...db.readerObjectives];
    appendAudit(db, req.authUser!, 'Created objective', 'Reader Objectives', title);
    saveDb(db);
    res.status(201).json({ objective: created });
  });

  adminRouter.patch('/objectives/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const obj = db.readerObjectives.find((o) => o.id === req.params.id);
    if (!obj) {
      res.status(404).json({ error: 'Objective not found.' });
      return;
    }
    // Preserve existing user completion progress!
    if (typeof req.body?.title === 'string') obj.title = req.body.title.trim();
    if (typeof req.body?.description === 'string') obj.description = req.body.description.trim();
    if (typeof req.body?.category === 'string') obj.category = req.body.category;
    if (req.body?.targetCount !== undefined) obj.targetCount = Math.max(1, Number(req.body.targetCount) || 1);
    if (req.body?.xpReward !== undefined) obj.xpReward = Math.max(10, Number(req.body.xpReward) || 50);
    if (req.body?.active !== undefined) obj.active = Boolean(req.body.active);
    obj.updatedAt = new Date().toISOString();

    appendAudit(db, req.authUser!, 'Updated objective (preserved progress)', 'Reader Objectives', obj.title);
    saveDb(db);
    res.json({ objective: obj });
  });

  adminRouter.delete('/objectives/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const target = db.readerObjectives.find((o) => o.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Objective not found.' });
      return;
    }
    db.readerObjectives = db.readerObjectives.filter((o) => o.id !== req.params.id);
    appendAudit(db, req.authUser!, 'Deleted objective', 'Reader Objectives', target.title);
    saveDb(db);
    res.json({ ok: true });
  });

  // Section 12: Football Quiz
  adminRouter.get('/quiz', (_req, res) => {
    const db = getDb();
    res.json({
      questions: db.quizQuestions,
      reports: db.quizReports,
      leaderboard: quizLeaderboard(db),
      recentSubmissions: db.quizSubmissions.slice(0, 20),
    });
  });

  adminRouter.post('/quiz/questions', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const question = String(req.body?.question || '').trim();
    const options = Array.isArray(req.body?.options)
      ? req.body.options.map((o: unknown) => String(o).trim()).filter(Boolean)
      : [];
    if (!question || options.length < 2) {
      res.status(400).json({ error: 'Question and at least 2 answer options are required.' });
      return;
    }
    const created: QuizQuestionRecord = {
      id: `quiz-q-${Date.now()}`,
      type: 'multiple-choice',
      question,
      options,
      correctIndex: Math.min(options.length - 1, Math.max(0, Number(req.body?.correctIndex) || 0)),
      category: req.body?.category || 'Football History',
      difficulty: req.body?.difficulty || 'medium',
      explanation: String(req.body?.explanation || '').trim(),
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.quizQuestions = [created, ...db.quizQuestions];
    appendAudit(db, req.authUser!, 'Created quiz question', 'Football Quiz', created.category);
    saveDb(db);
    res.status(201).json({ question: created });
  });

  adminRouter.patch('/quiz/questions/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const q = db.quizQuestions.find((item) => item.id === req.params.id);
    if (!q) {
      res.status(404).json({ error: 'Question not found.' });
      return;
    }
    if (typeof req.body?.question === 'string') q.question = req.body.question.trim();
    if (Array.isArray(req.body?.options) && req.body.options.length >= 2) {
      q.options = req.body.options.map((o: unknown) => String(o).trim());
    }
    if (req.body?.correctIndex !== undefined) {
      q.correctIndex = Math.min(q.options.length - 1, Math.max(0, Number(req.body.correctIndex) || 0));
    }
    if (typeof req.body?.category === 'string') q.category = req.body.category;
    if (typeof req.body?.difficulty === 'string') q.difficulty = req.body.difficulty;
    if (req.body?.type === 'multiple-choice' || req.body?.type === 'true-false' || req.body?.type === 'image') q.type = req.body.type;
    if (req.body?.active !== undefined) q.active = Boolean(req.body.active);
    if (typeof req.body?.explanation === 'string') q.explanation = req.body.explanation;

    appendAudit(db, req.authUser!, 'Updated quiz question', 'Football Quiz', q.id);
    saveDb(db);
    res.json({ question: q });
  });

  adminRouter.delete('/quiz/questions/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    db.quizQuestions = db.quizQuestions.filter((item) => item.id !== req.params.id);
    appendAudit(db, req.authUser!, 'Deleted quiz question', 'Football Quiz', req.params.id);
    saveDb(db);
    res.json({ ok: true });
  });

  adminRouter.patch('/quiz/reports/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const rep = db.quizReports.find((r) => r.id === req.params.id);
    if (!rep) {
      res.status(404).json({ error: 'Report not found.' });
      return;
    }
    rep.status = req.body?.status === 'resolved' || req.body?.status === 'dismissed' || req.body?.status === 'open' ? req.body.status : 'resolved';
    appendAudit(db, req.authUser!, `Marked quiz report ${rep.status}`, 'Football Quiz', rep.id);
    saveDb(db);
    res.json({ report: rep });
  });

  // Section 13: Announcements (/admin/announcements & /admin/whats-new-updates)
  adminRouter.get('/announcements', (_req, res) => {
    const db = getDb();
    db.newsletterSubscribers = deduplicateSubscribers(db.newsletterSubscribers || []);
    res.json({
      announcements: sortAnnouncementsNewestFirst(db.announcements),
      subscribers: db.newsletterSubscribers,
    });
  });

  adminRouter.post('/announcements', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const title = String(req.body?.title || '').trim();
    const message = String(req.body?.message || '').trim();
    if (!title || !message) {
      res.status(400).json({ error: 'Title and message are required.' });
      return;
    }
    const rawDate = String(req.body?.date || '').trim();
    const rawLabel = String(req.body?.ctaLabel ?? req.body?.linkLabel ?? '').trim();
    const rawLink = String(req.body?.ctaUrl ?? req.body?.ctaDest ?? req.body?.linkUrl ?? '').trim();
    const rawStatus = String(req.body?.status || 'published').trim().toLowerCase();
    const validStatus: ManagedAnnouncement['status'] =
      rawStatus === 'hidden' || rawStatus === 'draft' || rawStatus === 'archived'
        ? (rawStatus as ManagedAnnouncement['status'])
        : 'published';
    const nowIso = new Date().toISOString();
    const created: ManagedAnnouncement = {
      id: `ann-${Date.now()}`,
      title,
      message,
      type: (req.body?.type || 'update') as 'info' | 'update' | 'alert',
      status: validStatus,
      showBanner: Boolean(req.body?.showBanner),
      ctaLabel: rawLabel || undefined,
      ctaDest: rawLink || undefined,
      ctaUrl: rawLink || undefined,
      date: rawDate || nowIso.slice(0, 10),
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    db.announcements = [created, ...db.announcements];
    appendAudit(db, req.authUser!, `Created announcement (${created.status})`, 'Announcements', title);
    saveDb(db);
    res.status(201).json({
      announcement: created,
      announcements: sortAnnouncementsNewestFirst(db.announcements),
    });
  });

  const handleUpdateAnnouncement = (req: AuthenticatedRequest, res: express.Response) => {
    const db = getDb();
    const ann = db.announcements.find((a) => a.id === req.params.id);
    if (!ann) {
      res.status(404).json({ error: 'Announcement not found.' });
      return;
    }
    if (typeof req.body?.title === 'string') {
      const nextTitle = req.body.title.trim();
      if (!nextTitle) {
        res.status(400).json({ error: 'Announcement title cannot be empty.' });
        return;
      }
      ann.title = nextTitle;
    }
    if (typeof req.body?.message === 'string') {
      const nextMessage = req.body.message.trim();
      if (!nextMessage) {
        res.status(400).json({ error: 'Announcement message cannot be empty.' });
        return;
      }
      ann.message = nextMessage;
    }
    if (typeof req.body?.date === 'string' && req.body.date.trim()) {
      ann.date = req.body.date.trim();
    }
    if (typeof req.body?.type === 'string') {
      ann.type = req.body.type as ManagedAnnouncement['type'];
    }
    if (typeof req.body?.status === 'string') {
      const s = req.body.status.trim().toLowerCase();
      if (['published', 'hidden', 'draft', 'archived'].includes(s)) {
        ann.status = s as ManagedAnnouncement['status'];
      }
    }
    if (req.body?.showBanner !== undefined) {
      ann.showBanner = Boolean(req.body.showBanner);
    }
    if ('ctaLabel' in (req.body || {}) || 'linkLabel' in (req.body || {})) {
      const nextLabel = String(req.body?.ctaLabel ?? req.body?.linkLabel ?? '').trim();
      ann.ctaLabel = nextLabel || undefined;
    }
    if ('ctaDest' in (req.body || {}) || 'ctaUrl' in (req.body || {}) || 'linkUrl' in (req.body || {})) {
      const nextLink = String(req.body?.ctaUrl ?? req.body?.ctaDest ?? req.body?.linkUrl ?? '').trim();
      ann.ctaDest = nextLink || undefined;
      ann.ctaUrl = nextLink || undefined;
    }
    ann.updatedAt = new Date().toISOString();

    appendAudit(db, req.authUser!, `Updated announcement (${ann.status})`, 'Announcements', ann.title);
    saveDb(db);
    res.json({
      announcement: ann,
      announcements: sortAnnouncementsNewestFirst(db.announcements),
    });
  };

  adminRouter.patch('/announcements/:id', handleUpdateAnnouncement);
  adminRouter.put('/announcements/:id', handleUpdateAnnouncement);

  adminRouter.delete('/announcements/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const target = db.announcements.find((a) => a.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Announcement not found.' });
      return;
    }
    db.announcements = db.announcements.filter((a) => a.id !== req.params.id);
    appendAudit(db, req.authUser!, 'Deleted announcement', 'Announcements', target.title);
    saveDb(db);
    res.json({
      ok: true,
      announcements: sortAnnouncementsNewestFirst(db.announcements),
    });
  });

  adminRouter.post('/teams-persistence', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    if (Array.isArray(req.body?.customTeams)) {
      const deletedSet = new Set<string>(
        Array.isArray(req.body?.deletedTeamIds) ? req.body.deletedTeamIds : db.deletedTeamIds || []
      );
      const seenNationalKeys = new Set<string>();
      for (const t of TEAMS_DATABASE) {
        if (deletedSet.has(t.id)) continue;
        if (getTeamType(t) === 'country') {
          seenNationalKeys.add(`${normalizeCountryName(t.country).toLowerCase()}::${t.gender}`);
        }
      }
      for (const custom of req.body.customTeams as Team[]) {
        if (!custom || deletedSet.has(custom.id)) continue;
        if (getTeamType(custom) === 'country') {
          const key = `${normalizeCountryName(custom.country || '').toLowerCase()}::${custom.gender || 'men'}`;
          if (seenNationalKeys.has(key)) {
            res.status(409).json({
              error: `Duplicate national team rejected for ${custom.country} (${custom.gender}).`,
            });
            return;
          }
          seenNationalKeys.add(key);
        }
      }
      db.customTeams = req.body.customTeams;
    }
    if (req.body?.teamOverrides) db.teamOverrides = req.body.teamOverrides;
    if (req.body?.deletedTeamIds) db.deletedTeamIds = req.body.deletedTeamIds;
    if (req.body?.freeAgents) db.freeAgents = req.body.freeAgents;
    if (req.body?.playerIdentityOverrides) db.playerIdentityOverrides = req.body.playerIdentityOverrides;
    if (Array.isArray(req.body?.deletedPlayerIdentityIds)) {
      db.deletedPlayerIdentityIds = req.body.deletedPlayerIdentityIds;
    }
    if (Array.isArray(req.body?.clubRegistrations)) {
      db.clubRegistrations = req.body.clubRegistrations;
    }
    if (Array.isArray(req.body?.nationalRegistrations)) {
      db.nationalRegistrations = req.body.nationalRegistrations;
    }
    appendAudit(db, req.authUser!, 'Updated team database overrides and custom squads', 'Teams', 'Match Centre Database');
    saveDb(db);
    res.json({ ok: true });
  });

  // =========================================================================
  // Player Identity, Club/National Registrations & Transfers (Admin Enforced)
  // =========================================================================
  adminRouter.post('/players', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const result = createAdminPlayerIdentity(db, req.body || {});
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendAudit(
      db,
      req.authUser!,
      'Created player identity',
      'Player Registry',
      result.profile?.identity.name || 'Player'
    );
    saveDb(db);
    res.status(201).json({ ok: true, profile: result.profile });
  });

  adminRouter.patch('/players/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const playerId = decodeURIComponent(req.params.id);
    const result = updateAdminPlayerIdentity(db, playerId, req.body || {});
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendAudit(
      db,
      req.authUser!,
      'Updated player identity',
      'Player Registry',
      result.profile?.identity.name || playerId
    );
    saveDb(db);
    res.json({ ok: true, profile: result.profile });
  });

  adminRouter.delete('/players/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const playerId = decodeURIComponent(req.params.id);
    const result = deleteAdminPlayerIdentity(db, playerId);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendAudit(db, req.authUser!, 'Deleted unattached player identity', 'Player Registry', playerId);
    saveDb(db);
    res.json({ ok: true, deletedId: playerId });
  });

  adminRouter.post('/players/:id/retire-nation', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const playerId = decodeURIComponent(req.params.id);
    const retired = req.body?.retired !== false;
    const result = retireAdminPlayerFromNation(db, playerId, {
      retired,
      retiredAt: req.body?.retiredAt ? String(req.body.retiredAt) : undefined,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendAudit(
      db,
      req.authUser!,
      retired ? 'Retired player from national team' : 'Ended player international retirement',
      'Player Registry',
      result.profile?.identity.name || playerId
    );
    saveDb(db);
    res.json({ ok: true, profile: result.profile });
  });

  adminRouter.post('/players/:id/change-nation', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const playerId = decodeURIComponent(req.params.id);
    const { nationality, newNationalTeamId, switchNationalSquad, shirtNumber, effectiveDate } =
      req.body || {};
    if (!nationality || !String(nationality).trim()) {
      res.status(400).json({ error: 'nationality is required.' });
      return;
    }
    const result = changeAdminPlayerNation(db, {
      playerId,
      nationality: String(nationality),
      newNationalTeamId: newNationalTeamId ? String(newNationalTeamId) : undefined,
      switchNationalSquad: switchNationalSquad !== undefined ? Boolean(switchNationalSquad) : true,
      shirtNumber: shirtNumber !== undefined && shirtNumber !== null ? Number(shirtNumber) : undefined,
      effectiveDate: effectiveDate ? String(effectiveDate) : undefined,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendAudit(
      db,
      req.authUser!,
      'Changed player nationality',
      'Player Registry',
      `${result.profile?.identity.name || playerId} -> ${result.profile?.identity.nationality}`
    );
    saveDb(db);
    res.json({ ok: true, profile: result.profile });
  });

  adminRouter.post('/registrations', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { playerId, teamId, shirtNumber, isCaptain, isViceCaptain, joinedOrCalledUpAt } =
      req.body || {};
    if (!playerId || !teamId) {
      res.status(400).json({ error: 'playerId and teamId are required.' });
      return;
    }
    const result = registerAdminPlayerToTeam(db, {
      playerId: String(playerId),
      teamId: String(teamId),
      shirtNumber: shirtNumber !== undefined ? Number(shirtNumber) : undefined,
      isCaptain: Boolean(isCaptain),
      isViceCaptain: Boolean(isViceCaptain),
      joinedOrCalledUpAt: joinedOrCalledUpAt ? String(joinedOrCalledUpAt) : undefined,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendAudit(
      db,
      req.authUser!,
      `Registered player (${result.registration?.team_type})`,
      'Player Registry',
      `${result.profile?.identity.name || playerId} -> ${result.registration?.teamName || teamId}`
    );
    saveDb(db);
    res.status(201).json({ ok: true, registration: result.registration, profile: result.profile });
  });

  adminRouter.patch('/registrations/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const regId = decodeURIComponent(req.params.id);
    const teamType = req.body?.team_type === 'country' ? 'country' : req.body?.team_type === 'club' ? 'club' : null;
    if (!teamType) {
      res.status(400).json({ error: 'Explicit team_type ("club" | "country") is required.' });
      return;
    }
    const result = updateAdminRegistration(db, regId, teamType, req.body || {});
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendAudit(
      db,
      req.authUser!,
      `Updated ${teamType} registration`,
      'Player Registry',
      `${result.profile?.identity.name || regId} (${result.registration?.teamName})`
    );
    saveDb(db);
    res.json({ ok: true, registration: result.registration, profile: result.profile });
  });

  adminRouter.post('/registrations/:id/release', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const regId = decodeURIComponent(req.params.id);
    const teamType =
      req.body?.team_type === 'country'
        ? 'country'
        : req.body?.team_type === 'club'
        ? 'club'
        : undefined;
    const result = releaseAdminRegistration(db, regId, teamType);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendAudit(
      db,
      req.authUser!,
      `Released ${result.registration?.team_type} registration`,
      'Player Registry',
      `${result.profile?.identity.name || regId} (${result.registration?.teamName})`
    );
    saveDb(db);
    res.json({ ok: true, registration: result.registration, profile: result.profile });
  });

  adminRouter.delete('/registrations/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const regId = decodeURIComponent(req.params.id);
    const teamType =
      req.query.team_type === 'country'
        ? 'country'
        : req.query.team_type === 'club'
        ? 'club'
        : undefined;
    const result = deleteAdminRegistrationRecord(db, regId, teamType);
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendAudit(db, req.authUser!, 'Removed registration record', 'Player Registry', regId);
    saveDb(db);
    res.json({ ok: true, profile: result.profile });
  });

  adminRouter.post('/transfers', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { playerId, fromTeamId, toTeamId, shirtNumber, transferDate } = req.body || {};
    if (!playerId || !fromTeamId || !toTeamId) {
      res.status(400).json({ error: 'playerId, fromTeamId, and toTeamId are required.' });
      return;
    }
    const result = transferAdminPlayerClub(db, {
      playerId: String(playerId),
      fromTeamId: String(fromTeamId),
      toTeamId: String(toTeamId),
      shirtNumber: shirtNumber !== undefined ? Number(shirtNumber) : undefined,
      transferDate: transferDate ? String(transferDate) : undefined,
    });
    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    appendAudit(
      db,
      req.authUser!,
      'Completed club transfer',
      'Player Transfers',
      `${result.profile?.identity.name || playerId}: ${result.former?.teamName} -> ${result.current?.teamName}`
    );
    saveDb(db);
    res.json({
      ok: true,
      former: result.former,
      current: result.current,
      profile: result.profile,
    });
  });

  // Newsletter / Email Updates Subscribers Management
  adminRouter.get('/newsletter-subscribers', (_req, res) => {
    const db = getDb();
    db.newsletterSubscribers = deduplicateSubscribers(db.newsletterSubscribers || []);
    res.json({ subscribers: db.newsletterSubscribers });
  });

  adminRouter.delete('/newsletter-subscribers/:idOrEmail', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const param = decodeURIComponent(String(req.params.idOrEmail || '')).trim().toLowerCase();
    if (!param) {
      res.status(400).json({ error: 'Subscriber identifier is required.' });
      return;
    }
    const current = deduplicateSubscribers(db.newsletterSubscribers || []);
    const target = current.find(
      (s) => s.id.toLowerCase() === param || s.email.toLowerCase() === param
    );
    if (!target) {
      res.status(404).json({ error: 'Subscriber not found.' });
      return;
    }
    db.newsletterSubscribers = current.filter(
      (s) => s.id.toLowerCase() !== param && s.email.toLowerCase() !== param
    );
    appendAudit(db, req.authUser!, 'Removed email subscriber', 'Announcements', target.email);
    saveDb(db);
    res.json({ ok: true, subscribers: db.newsletterSubscribers });
  });

  // Section 14: Fan Chat & Warnings
  adminRouter.get('/fan-chat', (_req, res) => {
    const db = getDb();
    res.json({
      messages: db.fanChatMessages,
      warnings: db.userWarnings,
      users: db.users.map(toPublicUser),
    });
  });

  adminRouter.patch('/fan-chat/:id/status', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const msg = db.fanChatMessages.find((m) => m.id === req.params.id);
    if (!msg) {
      res.status(404).json({ error: 'Message not found.' });
      return;
    }
    msg.status = req.body?.status || 'removed';
    appendAudit(db, req.authUser!, `Moderated chat message (${msg.status})`, 'Fan Chat & Warnings', msg.userName);
    saveDb(db);
    res.json({ message: msg });
  });

  adminRouter.post('/warnings', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const user = db.users.find((u) => u.id === req.body?.userId);
    const reason = String(req.body?.reason || '').trim();
    if (!user || !reason) {
      res.status(400).json({ error: 'Valid user and warning reason are required.' });
      return;
    }
    const warning = {
      id: `warn-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      reason,
      severity: (req.body?.severity || 'warning') as 'notice' | 'warning' | 'final',
      issuedByEmail: req.authUser!.email,
      issuedAt: new Date().toISOString(),
      relatedMessageId: req.body?.relatedMessageId,
    };
    db.userWarnings = [warning, ...db.userWarnings];
    appendAudit(db, req.authUser!, `Issued ${warning.severity}`, 'Fan Chat & Warnings', user.email);
    saveDb(db);
    res.status(201).json({ warning });
  });

  // Section 15: Background Music
  adminRouter.get('/music', (_req, res) => {
    const db = getDb();
    res.json({ tracks: db.musicTracks });
  });

  adminRouter.post('/music', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const title = String(req.body?.title || '').trim();
    if (!title) {
      res.status(400).json({ error: 'Track title is required.' });
      return;
    }
    const track = {
      id: `track-${Date.now()}`,
      title,
      artist: String(req.body?.artist || 'DodaEona Acoustic Studio'),
      sourceType: (req.body?.sourceType || 'synth-pad') as 'synth-pad' | 'audio-url' | 'uploaded',
      audioUrl: req.body?.audioUrl ? String(req.body.audioUrl) : undefined,
      frequencyHz: req.body?.frequencyHz ? Number(req.body.frequencyHz) : 110,
      soundscapePreset: req.body?.soundscapePreset ? String(req.body.soundscapePreset) : undefined,
      category: req.body?.category ? String(req.body.category) : 'Matchday Stadium',
      waveformColor: req.body?.waveformColor ? String(req.body.waveformColor) : '#00F5FF',
      description: req.body?.description ? String(req.body.description) : undefined,
      bpm: req.body?.bpm ? Number(req.body.bpm) : undefined,
      durationLabel: String(req.body?.durationLabel || 'Ambient Loop'),
      enabled: req.body?.enabled !== false,
      isDefault: Boolean(req.body?.isDefault),
      featured: req.body?.featured !== false,
      createdAt: new Date().toISOString(),
    };
    if (track.isDefault) {
      db.musicTracks.forEach((t) => {
        t.isDefault = false;
      });
    }
    db.musicTracks = [track, ...db.musicTracks];
    appendAudit(db, req.authUser!, 'Added background music track', 'Background Music', title);
    saveDb(db);
    res.status(201).json({ track });
  });

  adminRouter.post('/music/reset-defaults', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    db.deletedMusicTrackIds = [];
    db.musicTracks = buildFeaturedMusicTracks();
    appendAudit(db, req.authUser!, 'Reset background music tracks', 'Background Music', 'Featured Songs');
    saveDb(db);
    res.json({ ok: true, tracks: db.musicTracks });
  });

  adminRouter.patch('/music/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const track = db.musicTracks.find((t) => t.id === req.params.id);
    if (!track) {
      res.status(404).json({ error: 'Track not found.' });
      return;
    }
    if (typeof req.body?.title === 'string') track.title = req.body.title.trim();
    if (typeof req.body?.artist === 'string') track.artist = req.body.artist.trim();
    if (typeof req.body?.audioUrl === 'string') track.audioUrl = req.body.audioUrl;
    if (typeof req.body?.soundscapePreset === 'string') track.soundscapePreset = req.body.soundscapePreset;
    if (typeof req.body?.category === 'string') track.category = req.body.category;
    if (typeof req.body?.waveformColor === 'string') track.waveformColor = req.body.waveformColor;
    if (typeof req.body?.durationLabel === 'string') track.durationLabel = req.body.durationLabel;
    if (req.body?.bpm !== undefined) track.bpm = Number(req.body.bpm) || undefined;
    if (req.body?.enabled !== undefined) track.enabled = Boolean(req.body.enabled);
    if (req.body?.featured !== undefined) track.featured = Boolean(req.body.featured);
    if (req.body?.isDefault === true) {
      db.musicTracks.forEach((t) => {
        t.isDefault = t.id === track.id;
      });
    }
    appendAudit(db, req.authUser!, 'Updated background music track', 'Background Music', track.title);
    saveDb(db);
    res.json({ track });
  });

  adminRouter.delete('/music/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const deletedSet = new Set(db.deletedMusicTrackIds || []);
    deletedSet.add(req.params.id);
    db.deletedMusicTrackIds = Array.from(deletedSet);
    db.musicTracks = db.musicTracks.filter((t) => t.id !== req.params.id);
    appendAudit(db, req.authUser!, 'Deleted background music track', 'Background Music', req.params.id);
    saveDb(db);
    res.json({ ok: true });
  });

  // Section 16: Manage Book Series
  adminRouter.get('/reads/series', (_req, res) => {
    const db = getDb();
    res.json({ series: db.readingSeries });
  });

  adminRouter.post('/reads/series', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const title = String(req.body?.title || '').trim();
    const description = String(req.body?.description || title || 'Official book series collection').trim();
    if (!title) {
      res.status(400).json({ error: 'Series title is required.' });
      return;
    }
    const slug = String(req.body?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    const newSeries: ReadingSeriesItem = {
      id: `series-${Date.now()}`,
      seriesNumber: Number(req.body?.seriesNumber) || (db.readingSeries.length + 1),
      title,
      subtitle: req.body?.subtitle ? String(req.body.subtitle).trim() : undefined,
      description,
      coverUrl: String(req.body?.coverUrl || '/src/assets/images/reads_card_cover_1794502247393.jpg'),
      category: req.body?.category || 'Football Tactics and Strategy',
      volumeCount: 0,
      published: req.body?.published !== false,
      featured: Boolean(req.body?.featured),
      slug,
    };
    db.readingSeries = [newSeries, ...db.readingSeries];
    appendAudit(db, req.authUser!, 'Created book series', 'Manage Book Series', title);
    saveDb(db);
    res.status(201).json({ ok: true, series: newSeries, allSeries: db.readingSeries });
  });

  adminRouter.put('/reads/series/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const target = db.readingSeries.find((s) => s.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }
    if (typeof req.body?.title === 'string' && req.body.title.trim()) {
      const oldTitle = target.title;
      target.title = req.body.title.trim();
      if (oldTitle !== target.title) {
        db.bookVolumes.forEach((b) => {
          if (b.seriesId === target.id) {
            b.seriesTitle = target.title;
          }
        });
      }
    }
    if (typeof req.body?.subtitle === 'string') target.subtitle = req.body.subtitle.trim() || undefined;
    if (typeof req.body?.description === 'string') target.description = req.body.description.trim();
    if (typeof req.body?.category === 'string') target.category = req.body.category;
    if (typeof req.body?.coverUrl === 'string') target.coverUrl = req.body.coverUrl;
    if (typeof req.body?.seriesNumber === 'number') target.seriesNumber = req.body.seriesNumber;
    if (req.body?.published !== undefined) target.published = Boolean(req.body.published);
    if (req.body?.featured !== undefined) target.featured = Boolean(req.body.featured);
    if (typeof req.body?.slug === 'string') target.slug = req.body.slug.trim();

    target.volumeCount = db.bookVolumes.filter((b) => b.seriesId === target.id).length;

    appendAudit(db, req.authUser!, 'Updated book series', 'Manage Book Series', target.title);
    saveDb(db);
    res.json({ ok: true, series: target, allSeries: db.readingSeries });
  });

  adminRouter.delete('/reads/series/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const target = db.readingSeries.find((s) => s.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }
    db.readingSeries = db.readingSeries.filter((s) => s.id !== req.params.id);
    const removedBooks = db.bookVolumes.filter((b) => b.seriesId === req.params.id);
    db.bookVolumes = db.bookVolumes.filter((b) => b.seriesId !== req.params.id);
    trackDeletedEntityId('series', req.params.id);
    for (const rb of removedBooks) {
      trackDeletedEntityId('book', rb.id);
    }
    appendAudit(db, req.authUser!, 'Deleted book series', 'Manage Book Series', target.title);
    saveDb(db);
    res.json({ ok: true, allSeries: db.readingSeries });
  });

  adminRouter.patch('/reads/series/:id/publish', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const target = db.readingSeries.find((s) => s.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Series not found.' });
      return;
    }
    target.published = !target.published;
    appendAudit(db, req.authUser!, `Toggled series publish (${target.published})`, 'Manage Book Series', target.title);
    saveDb(db);
    res.json({ ok: true, series: target, allSeries: db.readingSeries });
  });

  // Section 17: Upload & Manage Books
  adminRouter.get('/reads/books', (_req, res) => {
    const db = getDb();
    res.json({ books: db.bookVolumes });
  });

  adminRouter.post('/reads/books', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const title = String(req.body?.title || '').trim();
    let seriesId = String(req.body?.seriesId || '').trim();
    if (!title) {
      res.status(400).json({ error: 'Book title is required.' });
      return;
    }
    if (!seriesId && db.readingSeries.length > 0) {
      seriesId = db.readingSeries[0].id;
    }
    if (!seriesId) {
      const defaultSeries = {
        id: `ser-${Date.now()}`,
        seriesNumber: 1,
        title: 'DodaEona Official Series',
        description: 'Primary club publications and tactical playbooks.',
        coverUrl: '/src/assets/images/reads_card_cover_1794502247393.jpg',
        category: 'Football Tactics and Strategy' as any,
        volumeCount: 0,
        published: true,
        featured: true,
        slug: 'dodaeona-official-series',
      };
      db.readingSeries.push(defaultSeries);
      seriesId = defaultSeries.id;
    }
    const series = db.readingSeries.find((s) => s.id === seriesId);
    const seriesTitle = series ? series.title : String(req.body?.seriesTitle || 'Library');
    const slug = String(req.body?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
    const pageCount = Number(req.body?.pageCount) || 120;

    let chapters = Array.isArray(req.body?.chapters) && req.body.chapters.length > 0 ? req.body.chapters : [];
    if (chapters.length === 0) {
      chapters = [
        {
          id: `chap-${Date.now()}-1`,
          chapterNumber: 1,
          title: 'Foundational Principles & Tactical Philosophy',
          pageNumber: 1,
          content: [
            `Welcome to ${title}. This opening volume establishes the core principles, tactical frameworks, and strategic foundations required for elite football execution.`,
            `Mastering positional discipline, spatial awareness, and tempo control forms the bedrock of modern tactical systems. Throughout this manual, we dissect real match scenarios and tactical blueprints.`,
            `Study the diagrams, analyze the transitions, and apply these principles directly within the DodaEona F.C. Match Centre simulation arena.`
          ],
          tacticalNotes: 'Key focus: Compact structural block and quick ball circulation in phase 1 build-up.'
        },
        {
          id: `chap-${Date.now()}-2`,
          chapterNumber: 2,
          title: 'Midfield Dynamics & Spatial Dominance',
          pageNumber: Math.max(2, Math.round(pageCount * 0.25)),
          content: [
            `Midfield superiority dictates match outcome. In this chapter, we analyze numerical superiority in central zones, half-space exploitation, and counter-pressing triggers.`,
            `When transitioning from defense to attack, vertical passing lanes open up only when teammates maintain staggered vertical and horizontal distances.`,
            `Observing opposition defensive triggers allows playmakers to exploit blind spots between the opponent's midfield and defensive lines.`
          ],
          tacticalNotes: 'Key focus: Overloading half-spaces with inverted wingers and overlapping full-backs.'
        },
        {
          id: `chap-${Date.now()}-3`,
          chapterNumber: 3,
          title: 'Advanced Pressing Schemes & Defensive Blocks',
          pageNumber: Math.max(3, Math.round(pageCount * 0.5)),
          content: [
            `Defensive resilience is built upon coordinated pressing and defensive block integrity. A high block requires synchronized movement from the front line down to the central defenders.`,
            `When the opponent initiates build-up from the goal kick, cutting off passing lanes to the pivot midfielder forces low-percentage long balls.`,
            `Maintaining a compact defensive distance of under 30 meters from front to back ensures minimal space between defensive lines.`
          ],
          tacticalNotes: 'Key focus: Aggressive ball-side pressing with weak-side defensive compactness.'
        },
        {
          id: `chap-${Date.now()}-4`,
          chapterNumber: 4,
          title: 'Match Execution, Set-Piece Mastery & Conclusion',
          pageNumber: Math.max(4, Math.round(pageCount * 0.75)),
          content: [
            `In the final chapter, we examine high-pressure situational management, tactical substitutions, and set-piece routines designed to break stubborn low blocks.`,
            `Set-pieces account for over thirty percent of goals scored in elite competitive tournaments. Precision delivery combined with structured decoy runs creates high-xG scoring opportunities.`,
            `Review your simulation matches in the Match Centre and test these tactical formations to lead DodaEona F.C. to championship glory.`
          ],
          tacticalNotes: 'Key focus: Near-post attacking runs and tactical foul management in transition.'
        }
      ];
    }

    const newBook: BookVolume = {
      id: `vol-${Date.now()}`,
      seriesId,
      seriesTitle,
      volumeNumber: Number(req.body?.volumeNumber) || 1,
      title,
      subtitle: req.body?.subtitle ? String(req.body.subtitle).trim() : undefined,
      description: String(req.body?.description || '').trim(),
      coverUrl: String(req.body?.coverUrl || series?.coverUrl || '/src/assets/images/reads_card_cover_1794502247393.jpg'),
      publishedDate: String(req.body?.publishedDate || new Date().toISOString().slice(0, 10)),
      category: (req.body?.category || series?.category || 'Football Tactics and Strategy') as ReadsCategory,
      author: String(req.body?.author || 'DodaEona Technical Staff'),
      pageCount,
      readTimeMinutes: Number(req.body?.readTimeMinutes) || 45,
      published: req.body?.published !== false,
      featured: Boolean(req.body?.featured),
      pdfUrl: req.body?.pdfUrl ? String(req.body.pdfUrl) : undefined,
      downloadEnabled: Boolean(req.body?.downloadEnabled),
      chapters,
      slug,
    };

    db.bookVolumes = [newBook, ...db.bookVolumes];
    if (series) {
      series.volumeCount = db.bookVolumes.filter((b) => b.seriesId === series.id).length;
    }
    appendAudit(db, req.authUser!, 'Created book volume', 'Upload & Manage Books', title);
    saveDb(db);
    res.status(201).json({ ok: true, book: newBook, allBooks: db.bookVolumes });
  });

  adminRouter.put('/reads/books/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const target = db.bookVolumes.find((b) => b.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Book volume not found.' });
      return;
    }
    if (typeof req.body?.title === 'string' && req.body.title.trim()) target.title = req.body.title.trim();
    if (typeof req.body?.subtitle === 'string') target.subtitle = req.body.subtitle.trim() || undefined;
    if (typeof req.body?.description === 'string') target.description = req.body.description.trim();
    if (typeof req.body?.seriesId === 'string') {
      target.seriesId = req.body.seriesId;
      const s = db.readingSeries.find((ser) => ser.id === req.body.seriesId);
      if (s) target.seriesTitle = s.title;
    }
    if (typeof req.body?.volumeNumber === 'number') target.volumeNumber = req.body.volumeNumber;
    if (typeof req.body?.coverUrl === 'string') target.coverUrl = req.body.coverUrl;
    if (typeof req.body?.publishedDate === 'string') target.publishedDate = req.body.publishedDate;
    if (typeof req.body?.category === 'string') target.category = req.body.category;
    if (typeof req.body?.author === 'string') target.author = req.body.author;
    if (typeof req.body?.pageCount === 'number') target.pageCount = req.body.pageCount;
    if (typeof req.body?.readTimeMinutes === 'number') target.readTimeMinutes = req.body.readTimeMinutes;
    if (req.body?.published !== undefined) target.published = Boolean(req.body.published);
    if (req.body?.featured !== undefined) target.featured = Boolean(req.body.featured);
    if (typeof req.body?.pdfUrl === 'string') target.pdfUrl = req.body.pdfUrl;
    if (req.body?.downloadEnabled !== undefined) target.downloadEnabled = Boolean(req.body.downloadEnabled);
    if (Array.isArray(req.body?.chapters)) target.chapters = req.body.chapters;
    if (typeof req.body?.slug === 'string') target.slug = req.body.slug.trim();

    db.readingSeries.forEach((s) => {
      s.volumeCount = db.bookVolumes.filter((b) => b.seriesId === s.id).length;
    });

    appendAudit(db, req.authUser!, 'Updated book volume', 'Upload & Manage Books', target.title);
    saveDb(db);
    res.json({ ok: true, book: target, allBooks: db.bookVolumes });
  });

  adminRouter.delete('/reads/books/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const target = db.bookVolumes.find((b) => b.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Book volume not found.' });
      return;
    }
    db.bookVolumes = db.bookVolumes.filter((b) => b.id !== req.params.id);
    trackDeletedEntityId('book', req.params.id);
    db.readingSeries.forEach((s) => {
      s.volumeCount = db.bookVolumes.filter((b) => b.seriesId === s.id).length;
    });
    appendAudit(db, req.authUser!, 'Deleted book volume', 'Upload & Manage Books', target.title);
    saveDb(db);
    res.json({ ok: true, allBooks: db.bookVolumes });
  });

  adminRouter.delete('/reads/books', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const ids = Array.isArray(req.body?.bookIds) ? req.body.bookIds.map(String) : [];
    if (ids.length === 0) {
      res.status(400).json({ error: 'bookIds array is required.' });
      return;
    }
    const idSet = new Set(ids);
    db.bookVolumes = db.bookVolumes.filter((b) => !idSet.has(b.id));
    for (const id of ids) {
      trackDeletedEntityId('book', id);
    }
    db.readingSeries.forEach((s) => {
      s.volumeCount = db.bookVolumes.filter((b) => b.seriesId === s.id).length;
    });
    appendAudit(db, req.authUser!, `Deleted ${ids.length} book volumes`, 'Upload & Manage Books', ids.join(', '));
    saveDb(db);
    res.json({ ok: true, allBooks: db.bookVolumes });
  });

  adminRouter.patch('/reads/books/:id/status', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const target = db.bookVolumes.find((b) => b.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Book volume not found.' });
      return;
    }
    if (req.body?.published !== undefined) target.published = Boolean(req.body.published);
    if (req.body?.downloadEnabled !== undefined) target.downloadEnabled = Boolean(req.body.downloadEnabled);
    saveDb(db);
    res.json({ ok: true, book: target });
  });

  // Section 18: Manage PDF Files
  adminRouter.get('/pdfs', (_req, res) => {
    const db = getDb();
    const totalBytes = db.pdfFiles.reduce((acc, f) => acc + (f.sizeBytes || 0), 0);
    res.json({ pdfFiles: db.pdfFiles, totalBytes });
  });

  adminRouter.post('/pdfs/upload', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const rawFilename = String(req.body?.filename || '').trim();
    const bookId = String(req.body?.bookId || '').trim();
    const base64Data = String(req.body?.base64Data || '').trim();

    if (!rawFilename || !bookId) {
      res.status(400).json({ error: 'Filename and linked book are required.' });
      return;
    }

    const safeFilename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uploadDirPath = path.join(process.cwd(), 'public', 'uploads', 'pdfs');
    if (!fs.existsSync(uploadDirPath)) {
      fs.mkdirSync(uploadDirPath, { recursive: true });
    }

    let fileSizeBytes = Number(req.body?.sizeBytes) || 1_200_000;

    if (base64Data) {
      const cleanBase64 = base64Data.replace(/^data:application\/pdf;base64,/, '');
      const buffer = Buffer.from(cleanBase64, 'base64');
      fs.writeFileSync(path.join(uploadDirPath, safeFilename), buffer);
      fileSizeBytes = buffer.length;
    }

    const fileUrl = `/uploads/pdfs/${safeFilename}`;
    const book = db.bookVolumes.find((b) => b.id === bookId);

    const created = {
      id: `pdf-${Date.now()}`,
      bookId,
      bookTitle: String(req.body?.bookTitle || book?.title || bookId),
      filename: safeFilename,
      sizeBytes: fileSizeBytes,
      mimeType: 'application/pdf',
      accessStatus: (req.body?.accessStatus === 'private' ? 'private' : 'public') as 'public' | 'private',
      urlOrData: fileUrl,
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.pdfFiles = [created, ...db.pdfFiles.filter((p) => p.filename !== safeFilename)];

    if (book) {
      book.pdfUrl = fileUrl;
    }

    appendAudit(db, req.authUser!, 'Uploaded persistent PDF file', 'Manage PDF Files', safeFilename);
    saveDb(db);
    res.status(201).json({ ok: true, pdf: created, pdfFiles: db.pdfFiles });
  });

  adminRouter.post('/pdfs', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const filename = String(req.body?.filename || '').trim();
    const bookId = String(req.body?.bookId || '').trim();
    if (!filename || !bookId) {
      res.status(400).json({ error: 'Filename and linked book are required.' });
      return;
    }
    const book = db.bookVolumes.find((b) => b.id === bookId);
    const created = {
      id: `pdf-${Date.now()}`,
      bookId,
      bookTitle: String(req.body?.bookTitle || book?.title || bookId),
      filename,
      sizeBytes: Math.max(1024, Number(req.body?.sizeBytes) || 1_200_000),
      mimeType: 'application/pdf',
      accessStatus: (req.body?.accessStatus === 'private' ? 'private' : 'public') as 'public' | 'private',
      urlOrData: String(req.body?.urlOrData || `/assets/aistudio/${filename}`),
      uploadedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.pdfFiles = [created, ...db.pdfFiles];
    if (book) {
      book.pdfUrl = created.urlOrData;
    }
    appendAudit(db, req.authUser!, 'Attached PDF file', 'Manage PDF Files', filename);
    saveDb(db);
    res.status(201).json({ pdf: created });
  });

  adminRouter.patch('/pdfs/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const pdf = db.pdfFiles.find((p) => p.id === req.params.id);
    if (!pdf) {
      res.status(404).json({ error: 'PDF file not found.' });
      return;
    }
    if (typeof req.body?.filename === 'string') pdf.filename = req.body.filename.trim();
    if (typeof req.body?.bookId === 'string') pdf.bookId = req.body.bookId;
    if (typeof req.body?.bookTitle === 'string') pdf.bookTitle = req.body.bookTitle;
    if (req.body?.sizeBytes !== undefined) pdf.sizeBytes = Number(req.body.sizeBytes) || pdf.sizeBytes;
    if (typeof req.body?.urlOrData === 'string') pdf.urlOrData = req.body.urlOrData;
    if (req.body?.accessStatus === 'public' || req.body?.accessStatus === 'private') {
      pdf.accessStatus = req.body.accessStatus;
    }
    pdf.updatedAt = new Date().toISOString();
    appendAudit(db, req.authUser!, `Updated PDF (${pdf.accessStatus})`, 'Manage PDF Files', pdf.filename);
    saveDb(db);
    res.json({ pdf });
  });

  adminRouter.delete('/pdfs/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const target = db.pdfFiles.find((p) => p.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'PDF file not found.' });
      return;
    }
    db.pdfFiles = db.pdfFiles.filter((p) => p.id !== req.params.id);
    trackDeletedEntityId('pdf', req.params.id);
    appendAudit(db, req.authUser!, 'Deleted PDF file', 'Manage PDF Files', target.filename);
    saveDb(db);
    res.json({ ok: true });
  });

  // Section 19: Website Branding
  adminRouter.get('/branding', (_req, res) => {
    const db = getDb();
    res.json({ branding: db.branding, presets: BRANDING_PRESETS });
  });

  adminRouter.put('/branding', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const next = req.body || {};
    db.branding = {
      ...db.branding,
      activePresetId: String(next.activePresetId || db.branding.activePresetId),
      siteName: String(next.siteName || db.branding.siteName),
      controlRoomLabel: String(next.controlRoomLabel || db.branding.controlRoomLabel),
      logoUrl: String(next.logoUrl || db.branding.logoUrl),
      dark: { ...db.branding.dark, ...(next.dark || {}) },
      light: { ...db.branding.light, ...(next.light || {}) },
      updatedAt: new Date().toISOString(),
    };
    appendAudit(db, req.authUser!, 'Saved website branding', 'Website Branding', db.branding.activePresetId);
    saveDb(db);
    res.json({ branding: db.branding });
  });

  // Section 20: Homepage Content & Sections
  adminRouter.get('/homepage-config', (_req, res) => {
    const db = getDb();
    res.json({ config: db.homepageConfig });
  });

  adminRouter.put('/homepage-config', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const next = req.body || {};
    db.homepageConfig = {
      ...db.homepageConfig,
      ...next,
      sections: {
        ...db.homepageConfig.sections,
        ...(next.sections || {}),
      },
      hero: {
        ...db.homepageConfig.hero,
        ...(next.hero || {}),
      },
      welcome: {
        ...db.homepageConfig.welcome,
        ...(next.welcome || {}),
      },
      accessCards: {
        ...db.homepageConfig.accessCards,
        ...(next.accessCards || {}),
      },
      featuredReads: {
        ...db.homepageConfig.featuredReads,
        ...(next.featuredReads || {}),
      },
      newsletter: {
        ...db.homepageConfig.newsletter,
        ...(next.newsletter || {}),
      },
      finalCta: {
        ...db.homepageConfig.finalCta,
        ...(next.finalCta || {}),
      },
      footer: {
        ...db.homepageConfig.footer,
        ...(next.footer || {}),
      },
    };
    appendAudit(db, req.authUser!, 'Updated Homepage Content & Sections', 'Homepage Content', 'Homepage');
    saveDb(db);
    res.json({ ok: true, config: db.homepageConfig });
  });

  // Media Library Assets
  adminRouter.get('/media', (_req, res) => {
    const db = getDb();
    res.json({ mediaAssets: db.mediaAssets });
  });

  adminRouter.post('/media', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const name = String(req.body?.name || '').trim();
    if (!name) {
      res.status(400).json({ error: 'Asset name is required.' });
      return;
    }
    const newAsset: MediaAsset = {
      id: `media-${Date.now()}`,
      name,
      filename: String(req.body?.filename || name.replace(/[^a-zA-Z0-9._-]/g, '_')),
      url: String(req.body?.url || '/src/assets/images/reads_library_editorial_1794906192650.jpg'),
      fileType: (req.body?.fileType || 'PNG') as 'PNG' | 'JPG' | 'SVG' | 'PDF',
      fileSize: String(req.body?.fileSize || '1.0 MB'),
      usedIn: Array.isArray(req.body?.usedIn) ? req.body.usedIn : [],
      uploadedAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    db.mediaAssets = [newAsset, ...db.mediaAssets];
    appendAudit(db, req.authUser!, 'Uploaded media asset', 'Media Library', name);
    saveDb(db);
    res.status(201).json({ ok: true, asset: newAsset, mediaAssets: db.mediaAssets });
  });

  adminRouter.put('/media/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const target = db.mediaAssets.find((m) => m.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Media asset not found.' });
      return;
    }
    if (typeof req.body?.name === 'string') target.name = req.body.name.trim();
    if (typeof req.body?.url === 'string') target.url = req.body.url.trim();
    if (Array.isArray(req.body?.usedIn)) target.usedIn = req.body.usedIn;
    appendAudit(db, req.authUser!, 'Updated media asset', 'Media Library', target.name);
    saveDb(db);
    res.json({ ok: true, asset: target, mediaAssets: db.mediaAssets });
  });

  adminRouter.delete('/media/:id', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const target = db.mediaAssets.find((m) => m.id === req.params.id);
    if (!target) {
      res.status(404).json({ error: 'Media asset not found.' });
      return;
    }
    db.mediaAssets = db.mediaAssets.filter((m) => m.id !== req.params.id);
    appendAudit(db, req.authUser!, 'Deleted media asset', 'Media Library', target.name);
    saveDb(db);
    res.json({ ok: true, mediaAssets: db.mediaAssets });
  });

  // Section 21: About & Legal
  adminRouter.get('/about-legal', (_req, res) => {
    const db = getDb();
    res.json({ aboutLegal: db.aboutLegal });
  });

  adminRouter.put('/about-legal', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    db.aboutLegal = {
      ...db.aboutLegal,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    appendAudit(db, req.authUser!, `Saved About & Legal (${db.aboutLegal.status})`, 'About & Legal', db.aboutLegal.aboutTitle);
    saveDb(db);
    res.json({ aboutLegal: db.aboutLegal });
  });

  // Section 22: Contact Information
  adminRouter.get('/contact-info', (_req, res) => {
    const db = getDb();
    res.json({ contactInfo: db.contactInfo });
  });

  adminRouter.put('/contact-info', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    db.contactInfo = {
      ...db.contactInfo,
      ...req.body,
      updatedAt: new Date().toISOString(),
    };
    if (typeof req.body?.socialYoutube === 'string') {
      db.homepageConfig.footer.socialYoutube = req.body.socialYoutube;
    }
    appendAudit(db, req.authUser!, 'Updated contact information', 'Contact Information', db.contactInfo.officialEmail);
    saveDb(db);
    res.json({ contactInfo: db.contactInfo });
  });

  // General Admin Audit Hook
  adminRouter.post('/audit', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    appendAudit(
      db,
      req.authUser!,
      String(req.body?.action || 'Admin action'),
      String(req.body?.section || 'Control Room'),
      String(req.body?.target || 'Platform')
    );
    saveDb(db);
    res.json({ ok: true });
  });

  // Section 23: Data & Reset
  adminRouter.get('/export', (req: AuthenticatedRequest, res) => {
    const db = getDb();
    const { sessionSecret: _omit, ...safeSnapshot } = db;
    const sanitizedUsers = safeSnapshot.users.map(toPublicUser);
    appendAudit(db, req.authUser!, 'Exported platform data archive', 'Data & Reset', String(req.query.format || 'json'));
    saveDb(db);

    if (req.query.format === 'csv') {
      const csvLines = [
        'type,id,label,status,updatedAt',
        ...sanitizedUsers.map((u) => `user,${u.id},"${u.email}",${u.blocked ? 'blocked' : u.role},${u.lastActiveAt}`),
        ...db.leagueStatuses.map((l) => `league,${l.id},"${l.leagueName}",${l.stage},${l.updatedAt}`),
        ...db.pdfFiles.map((p) => `pdf,${p.id},"${p.filename}",${p.accessStatus},${p.updatedAt}`),
      ];
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="dodaeona-export.csv"');
      res.send(csvLines.join('\n'));
      return;
    }

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="dodaeona-backup.json"');
    res.json({
      exportedAt: new Date().toISOString(),
      exportedBy: req.authUser!.email,
      data: { ...safeSnapshot, users: sanitizedUsers, sessions: [] },
    });
  });

  adminRouter.post('/reset', (req: AuthenticatedRequest, res) => {
    const phrase = String(req.body?.confirmationPhrase || '').trim();
    const scope = String(req.body?.scope || '');
    if (phrase !== 'RESET DODAEONA') {
      res.status(400).json({ error: 'Exact confirmation phrase "RESET DODAEONA" is required.' });
      return;
    }
    const db = getDb();
    const fresh = buildSeedDatabase();

    if (scope === 'analytics') {
      db.analyticsEvents = [];
    } else if (scope === 'quiz') {
      db.quizSubmissions = [];
      db.quizReports = [];
    } else if (scope === 'simulation') {
      db.simulationMatches = fresh.simulationMatches;
      db.rankingOverrides = {};
      db.squadShirtOverrides = {};
      db.squadInjuryOverrides = {};
    } else if (scope === 'full') {
      const preservedAdmin = db.users.find((u) => u.id === req.authUser!.id);
      const preservedSessions = db.sessions.filter((s) => s.userId === req.authUser!.id);
      const preservedSecret = db.sessionSecret;
      Object.assign(db, fresh);
      db.sessionSecret = preservedSecret;
      if (preservedAdmin) {
        db.users = [preservedAdmin, ...fresh.users.filter((u) => u.email !== preservedAdmin.email)];
      }
      db.sessions = preservedSessions;
    } else {
      res.status(400).json({ error: 'Valid reset scope (analytics, quiz, simulation, full) is required.' });
      return;
    }

    appendAudit(db, req.authUser!, `Executed verified reset (${scope})`, 'Data & Reset', scope);
    saveDb(db);
    res.json({ ok: true, message: `Reset (${scope}) completed and logged.` });
  });

  adminRouter.post('/upload-verification', requireAdmin, (req: AuthenticatedRequest, res) => {
    const filename = String(req.body?.filename || '').trim();
    const content = String(req.body?.content || '');
    if (!filename || !filename.startsWith('google') || !filename.endsWith('.html') || !content) {
      res.status(400).json({ error: 'Valid Google verification HTML filename (google*.html) and content are required.' });
      return;
    }
    const safeName = path.basename(filename);
    const targetPath = path.join(process.cwd(), 'public', safeName);
    fs.writeFileSync(targetPath, content, 'utf8');
    const db = getDb();
    appendAudit(db, req.authUser!, `Uploaded Google Search Console verification file: ${safeName}`, 'SEO & Publishing', safeName);
    saveDb(db);
    res.json({ ok: true, filename: safeName, url: `/${safeName}` });
  });

  adminRouter.post('/cloud-sync/reconcile', async (req: AuthenticatedRequest, res) => {
    const rawHeaderToken = req.headers['x-firebase-id-token'];
    const idToken =
      (typeof rawHeaderToken === 'string' && rawHeaderToken.trim()) ||
      String(req.body?.idToken || '').trim();
    if (!idToken) {
      res.status(400).json({ error: 'Firebase ID token is required to reconcile cloud persistence.' });
      return;
    }
    const db = getDb();
    const result = await reconcileAdminWithFirestore(db, getSeedTemplate(), idToken);
    if (result.pulledChanges) {
      saveDb(db, { skipCloudSync: true });
    }
    res.json(result);
  });



  app.use('/api/admin', adminRouter);

  app.get('/assets/aistudio/Beyond_the_Final_Whistle_-_usesuno.com_2d5d5c3f.wav', (_req, res) => {
    res.redirect(301, '/assets/aistudio/Beyond_the_Final_Whistle_-_usesuno.com_2d5d5c3f.mp3');
  });

  // =========================================================================
  // 4. VITE MIDDLEWARE / PRODUCTION STATIC HOSTING
  // =========================================================================
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  // Hydrate DB from Firestore before accepting traffic so new versions preserve admin edits cleanly
  const initialDb = getDb();
  const hydratedChanged = await hydrateDbOnStartup(initialDb, getSeedTemplate());
  if (hydratedChanged) {
    saveDb(initialDb, { skipCloudSync: true });
  }

  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`DodaEona F.C. server listening on http://localhost:${port}`);
  });
  attachGeminiLiveWebSocket(server);

  const gracefulFlush = async () => {
    await flushPendingFirestoreSync().catch(() => {});
    server.close(() => process.exit(0));
  };
  process.once('SIGTERM', () => void gracefulFlush());
  process.once('SIGINT', () => void gracefulFlush());
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
