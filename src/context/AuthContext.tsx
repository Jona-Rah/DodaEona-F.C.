import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import {
  auth,
  authPersistenceReady,
  googleProvider,
  syncGoogleUserProfileToFirestore,
} from '../firebase';
import { reconcileAdminCloudPersistence } from '../services/firestorePersistence';

export type AuthRole = 'admin' | 'member';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AuthRole;
  blocked: boolean;
  createdAt: string;
  lastActiveAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; user?: AuthUser }>;
  loginWithGoogle: () => Promise<{
    ok: boolean;
    error?: string;
    user?: AuthUser;
    isNewAccount?: boolean;
  }>;
  register: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string; user?: AuthUser }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<{ ok: boolean; error?: string; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const SESSION_TOKEN_STORAGE_KEY = 'dodaeona_session_token';

export function getStoredSessionToken(): string | null {
  try {
    const localToken = window.localStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
    if (localToken) return localToken;
    const legacySessionToken = window.sessionStorage.getItem(SESSION_TOKEN_STORAGE_KEY);
    if (legacySessionToken) {
      window.localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, legacySessionToken);
      window.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
      return legacySessionToken;
    }
    return null;
  } catch {
    return null;
  }
}

function setStoredSessionToken(token: string | null): void {
  try {
    if (token) {
      window.localStorage.setItem(SESSION_TOKEN_STORAGE_KEY, token);
      window.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    } else {
      window.localStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
      window.sessionStorage.removeItem(SESSION_TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage failures
  }
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getStoredSessionToken();
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const isManualAuthActionRef = useRef<boolean>(false);
  const reconciledUidRef = useRef<string | null>(null);
  const userRef = useRef<AuthUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const ensureGoogleProfileSynced = useCallback(
    async (
      fbUser: { uid: string; email: string | null; emailVerified: boolean; displayName: string | null },
      appUser: AuthUser
    ) => {
      if (fbUser.email && fbUser.emailVerified) {
        await syncGoogleUserProfileToFirestore({
          uid: fbUser.uid,
          email: fbUser.email,
          emailVerified: fbUser.emailVerified,
          displayName: fbUser.displayName || appUser.name || '',
        }).catch(() => {});
      }
    },
    []
  );

  const runPostAuthCloudSync = useCallback(
    async (
      fbUser: { uid: string; email: string | null; emailVerified: boolean; displayName: string | null },
      appUser: AuthUser,
      sessionToken: string | null
    ) => {
      await ensureGoogleProfileSynced(fbUser, appUser);
      if (appUser.role === 'admin' && reconciledUidRef.current !== fbUser.uid) {
        reconciledUidRef.current = fbUser.uid;
        await reconcileAdminCloudPersistence(sessionToken);
      }
    },
    [ensureGoogleProfileSynced]
  );

  const restoreExpressSessionFromFirebaseUser = useCallback(
    async (fbUser: {
      uid: string;
      email: string | null;
      emailVerified: boolean;
      displayName: string | null;
      getIdToken: () => Promise<string>;
    }): Promise<AuthUser | null> => {
      if (!fbUser.email || !fbUser.emailVerified) return null;
      try {
        const idToken = await fbUser.getIdToken();
        const res = await fetch('/api/auth/google', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.sessionToken) {
          setStoredSessionToken(String(data.sessionToken));
        }
        if (data?.user && !data.user.blocked) {
          await ensureGoogleProfileSynced(fbUser, data.user as AuthUser);
          setUser(data.user);
          if (data.user.role === 'admin' && reconciledUidRef.current !== fbUser.uid) {
            reconciledUidRef.current = fbUser.uid;
            void reconcileAdminCloudPersistence(data.sessionToken || getStoredSessionToken());
          }
          return data.user as AuthUser;
        }
      } catch {
        // ignore transient errors
      }
      return null;
    },
    [ensureGoogleProfileSynced]
  );

  const refreshSession = useCallback(async () => {
    try {
      await authPersistenceReady;
      await auth.authStateReady();

      const res = await fetch('/api/auth/me', {
        credentials: 'include',
        headers: authHeaders({ Accept: 'application/json' }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.isAuthenticated && data?.user && !data.user.blocked) {
          if (data?.sessionToken) {
            setStoredSessionToken(String(data.sessionToken));
          }
          if (auth.currentUser) {
            await ensureGoogleProfileSynced(auth.currentUser, data.user as AuthUser);
          }
          setUser(data.user);
          if (auth.currentUser && data.user.role === 'admin') {
            void runPostAuthCloudSync(
              auth.currentUser,
              data.user,
              data.sessionToken || getStoredSessionToken()
            );
          }
          return;
        }
        // Server explicitly confirmed no active session (or blocked)
        setStoredSessionToken(null);
      } else if (res.status === 401 || res.status === 403) {
        setStoredSessionToken(null);
      } else {
        // Transient server error (e.g. 502/503 during restart): keep stored token
        if (auth.currentUser) {
          const restored = await restoreExpressSessionFromFirebaseUser(auth.currentUser);
          if (restored) return;
        }
        return;
      }

      if (auth.currentUser) {
        const restored = await restoreExpressSessionFromFirebaseUser(auth.currentUser);
        if (restored) return;
      }
      setUser(null);
    } catch (err) {
      console.warn('Session resolution failed:', err);
      // Do NOT clear localStorage token on transient network outage
      if (auth.currentUser) {
        const restored = await restoreExpressSessionFromFirebaseUser(auth.currentUser);
        if (restored) return;
      }
    } finally {
      setIsLoading(false);
    }
  }, [ensureGoogleProfileSynced, restoreExpressSessionFromFirebaseUser, runPostAuthCloudSync]);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser || isManualAuthActionRef.current) return;
      const currentUser = userRef.current;
      if (currentUser && !currentUser.blocked) {
        if (currentUser.role === 'admin' && reconciledUidRef.current !== fbUser.uid) {
          void runPostAuthCloudSync(fbUser, currentUser, getStoredSessionToken());
        }
        return;
      }
      // Express session missing (e.g. after deploying a new site version) -> auto-restore from Firebase Auth
      await restoreExpressSessionFromFirebaseUser(fbUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [restoreExpressSessionFromFirebaseUser, runPostAuthCloudSync]);

  useEffect(() => {
    const handleStorageSync = (e: StorageEvent) => {
      if (e.key === SESSION_TOKEN_STORAGE_KEY) {
        void refreshSession();
      }
    };
    window.addEventListener('storage', handleStorageSync);
    return () => window.removeEventListener('storage', handleStorageSync);
  }, [refreshSession]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setStoredSessionToken(null);
      setUser(null);
    };
    window.addEventListener('dodaeona:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('dodaeona:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, password: string) => {
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error || 'Sign-in failed.';
        setAuthError(msg);
        return { ok: false, error: msg };
      }
      if (data?.sessionToken) {
        setStoredSessionToken(String(data.sessionToken));
      }
      setUser(data.user);
      if (auth.currentUser && data.user?.role === 'admin') {
        void runPostAuthCloudSync(auth.currentUser, data.user, data.sessionToken || null);
      }
      return { ok: true, user: data.user as AuthUser };
    } catch {
      const msg = 'Network error while signing in.';
      setAuthError(msg);
      return { ok: false, error: msg };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setAuthError(null);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data?.error || 'Registration failed.';
        setAuthError(msg);
        return { ok: false, error: msg };
      }
      if (data?.sessionToken) {
        setStoredSessionToken(String(data.sessionToken));
      }
      setUser(data.user);
      return { ok: true, user: data.user as AuthUser };
    } catch {
      const msg = 'Network error while creating account.';
      setAuthError(msg);
      return { ok: false, error: msg };
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    isManualAuthActionRef.current = true;
    try {
      await authPersistenceReady;
      const credential = await signInWithPopup(auth, googleProvider);
      const idToken = await credential.user.getIdToken();

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        await firebaseSignOut(auth).catch(() => {});
        const msg = data?.error || 'Google sign-in failed.';
        setAuthError(msg);
        return { ok: false, error: msg };
      }

      if (data?.sessionToken) {
        setStoredSessionToken(String(data.sessionToken));
      }
      await ensureGoogleProfileSynced(credential.user, data.user as AuthUser);
      setUser(data.user);

      reconciledUidRef.current = null;
      if (data.user?.role === 'admin') {
        void runPostAuthCloudSync(
          credential.user,
          data.user as AuthUser,
          data.sessionToken || getStoredSessionToken()
        );
      }

      return {
        ok: true,
        user: data.user as AuthUser,
        isNewAccount: Boolean(data.isNewAccount),
      };
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      let msg = 'Unable to complete Google sign-in.';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        msg = 'Google sign-in window was closed before completing.';
      } else if (code === 'auth/popup-blocked') {
        msg = 'Popup was blocked by your browser. Please allow popups for this site and try again.';
      } else if (code === 'auth/unauthorized-domain') {
        msg = 'This domain is not authorized for Google sign-in yet.';
      } else if (code === 'auth/network-request-failed') {
        msg = 'Network error while connecting to Google sign-in.';
      }
      setAuthError(msg);
      return { ok: false, error: msg };
    } finally {
      isManualAuthActionRef.current = false;
    }
  };

  const logout = async () => {
    isManualAuthActionRef.current = true;
    reconciledUidRef.current = null;
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders(),
      });
    } catch {
      // ignore network errors on logout
    }
    await firebaseSignOut(auth).catch(() => {});
    setStoredSessionToken(null);
    setUser(null);
    isManualAuthActionRef.current = false;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    try {
      const res = await fetch('/api/auth/password', {
        method: 'POST',
        credentials: 'include',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data?.error || 'Password update failed.' };
      }
      return { ok: true, message: data?.message || 'Password updated.' };
    } catch {
      return { ok: false, error: 'Network error updating password.' };
    }
  };

  const isAuthenticated = Boolean(user && !user.blocked);
  const isAdmin = Boolean(isAuthenticated && user?.role === 'admin');

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isAdmin,
        isLoading,
        authError,
        login,
        loginWithGoogle,
        register,
        logout,
        refreshSession,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
