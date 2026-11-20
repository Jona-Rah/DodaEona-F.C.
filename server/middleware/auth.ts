import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { getDb, saveDb } from '../store';
import type { PublicAuthUser, ServerSession, ServerUser } from '../types';

export const SESSION_COOKIE_NAME = 'dodaeona_sid';
export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 365; // 365 days persistent device login

export interface AuthenticatedRequest extends Request {
  authUser?: ServerUser;
  authSession?: ServerSession;
}

export function toPublicUser(user: ServerUser): PublicAuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    blocked: user.blocked,
    createdAt: user.createdAt,
    lastActiveAt: user.lastActiveAt,
  };
}

export function signSessionToken(sid: string, secret: string): string {
  const sig = crypto.createHmac('sha256', secret).update(sid).digest('hex');
  return `${sid}.${sig}`;
}

export function verifySignedSessionToken(rawToken: string, secret: string): string | null {
  const parts = rawToken.split('.');
  if (parts.length !== 2) return null;
  const [sid, providedSig] = parts;
  if (!sid || !providedSig) return null;
  const expectedSig = crypto.createHmac('sha256', secret).update(sid).digest('hex');
  try {
    const a = Buffer.from(providedSig, 'hex');
    const b = Buffer.from(expectedSig, 'hex');
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    return sid;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = decodeURIComponent(part.slice(idx + 1).trim());
    result[key] = val;
  }
  return result;
}

function isHttpsRequest(req?: Request): boolean {
  if (!req) return process.env.NODE_ENV === 'production';
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  return req.secure || proto === 'https' || process.env.NODE_ENV === 'production';
}

export function setSessionCookie(res: Response, signedToken: string, req?: Request): void {
  const secure = isHttpsRequest(req);
  res.cookie(SESSION_COOKIE_NAME, signedToken, {
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
    path: '/',
    maxAge: SESSION_DURATION_MS,
  });
}

export function clearSessionCookie(res: Response, req?: Request): void {
  const secure = isHttpsRequest(req);
  res.clearCookie(SESSION_COOKIE_NAME, {
    path: '/',
    httpOnly: true,
    sameSite: secure ? 'none' : 'lax',
    secure,
  });
}

export function resolveRequestSession(req: AuthenticatedRequest): {
  user: ServerUser | null;
  session: ServerSession | null;
} {
  const db = getDb();
  const cookies = parseCookies(req.headers.cookie);
  let rawToken = cookies[SESSION_COOKIE_NAME];
  if (!rawToken) {
    const authHeader = String(req.headers.authorization || '');
    if (authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.slice(7).trim();
    }
  }
  if (!rawToken) return { user: null, session: null };

  const sid = verifySignedSessionToken(rawToken, db.sessionSecret);
  if (!sid) return { user: null, session: null };

  const session = db.sessions.find((s) => s.sid === sid);
  if (!session) return { user: null, session: null };

  const nowMs = Date.now();
  if (new Date(session.expiresAt).getTime() < nowMs) {
    db.sessions = db.sessions.filter((s) => s.sid !== sid);
    saveDb(db, { skipCloudSync: true });
    return { user: null, session: null };
  }

  const user = db.users.find((u) => u.id === session.userId);
  if (!user || user.blocked) {
    return { user: null, session: null };
  }

  // Sliding renewal: refresh lastSeenAt & extend expiresAt periodically when active
  const lastSeenMs = new Date(session.lastSeenAt || session.createdAt).getTime();
  const expiresMs = new Date(session.expiresAt).getTime();
  if (
    !Number.isFinite(lastSeenMs) ||
    nowMs - lastSeenMs > 1000 * 60 * 5 ||
    expiresMs - nowMs < SESSION_DURATION_MS * 0.85
  ) {
    const nowIso = new Date(nowMs).toISOString();
    session.lastSeenAt = nowIso;
    session.expiresAt = new Date(nowMs + SESSION_DURATION_MS).toISOString();
    user.lastActiveAt = nowIso;
    saveDb(db, { skipCloudSync: true });
  }

  req.authUser = user;
  req.authSession = session;
  return { user, session };
}

export function attachAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  resolveRequestSession(req);
  next();
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const { user } = resolveRequestSession(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  if (user.blocked) {
    res.status(403).json({ error: 'Account access is suspended by an administrator.' });
    return;
  }
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const { user } = resolveRequestSession(req);
  if (!user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  if (user.blocked) {
    res.status(403).json({ error: 'Account access is suspended.' });
    return;
  }
  if (user.role !== 'admin') {
    res.status(403).json({
      error: 'Owners only: administrative permissions are refused by the library access rules.',
    });
    return;
  }
  next();
}
