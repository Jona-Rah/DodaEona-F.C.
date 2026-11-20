import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import type { UserPersonalLibrary } from '../types/reads';

export async function getFirebaseIdToken(): Promise<string | null> {
  const current = auth.currentUser;
  if (!current) return null;
  try {
    return await current.getIdToken();
  } catch {
    return null;
  }
}

export async function buildAuthorizedHeaders(
  sessionToken: string | null,
  extra?: Record<string, string>
): Promise<Record<string, string>> {
  const firebaseToken = await getFirebaseIdToken();
  return {
    ...(extra || {}),
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
    ...(firebaseToken ? { 'X-Firebase-Id-Token': firebaseToken } : {}),
  };
}

export async function reconcileAdminCloudPersistence(
  sessionToken: string | null
): Promise<{ ok: boolean; pushedCount: number; pulledChanges: boolean }> {
  const firebaseToken = await getFirebaseIdToken();
  if (!firebaseToken) {
    return { ok: false, pushedCount: 0, pulledChanges: false };
  }

  try {
    const res = await fetch('/api/admin/cloud-sync/reconcile', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        'X-Firebase-Id-Token': firebaseToken,
      },
      body: JSON.stringify({ idToken: firebaseToken }),
    });
    if (!res.ok) {
      return { ok: false, pushedCount: 0, pulledChanges: false };
    }
    const data = (await res.json()) as {
      ok?: boolean;
      pushedCount?: number;
      pulledChanges?: boolean;
    };
    const result = {
      ok: Boolean(data?.ok),
      pushedCount: Number(data?.pushedCount || 0),
      pulledChanges: Boolean(data?.pulledChanges),
    };
    if (result.pulledChanges && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dodaeona:cloud-reconciled'));
    }
    return result;
  } catch {
    return { ok: false, pushedCount: 0, pulledChanges: false };
  }
}

function sanitizeLibraryPayload(
  uid: string,
  library: UserPersonalLibrary
): Record<string, unknown> {
  const savedBookIds = Array.isArray(library.savedBookIds)
    ? library.savedBookIds.filter((id) => typeof id === 'string').slice(0, 500)
    : [];
  const bookmarks = Array.isArray(library.bookmarks)
    ? library.bookmarks.slice(0, 1000).map((bm) => ({ ...bm }))
    : [];
  const progress: Record<string, unknown> = {};
  if (library.progress && typeof library.progress === 'object') {
    for (const [k, v] of Object.entries(library.progress).slice(0, 1000)) {
      if (v && typeof v === 'object') progress[k] = { ...v };
    }
  }
  const recentBookIds = Array.isArray(library.recentBookIds)
    ? library.recentBookIds.filter((id) => typeof id === 'string').slice(0, 50)
    : [];

  return {
    uid,
    savedBookIds,
    bookmarks,
    progress,
    recentBookIds,
    updatedAt: serverTimestamp(),
  };
}

export async function loadUserLibraryFromFirestore(
  uid: string
): Promise<UserPersonalLibrary | null> {
  if (!uid || !auth.currentUser || auth.currentUser.uid !== uid || !auth.currentUser.emailVerified) {
    return null;
  }
  const path = `users/${uid}/library/personal`;
  try {
    const profileSnap = await getDoc(doc(db, 'users', uid));
    if (!profileSnap.exists()) return null;

    const snap = await getDoc(doc(db, 'users', uid, 'library', 'personal'));
    if (!snap.exists()) return null;
    const data = snap.data();
    const rawUpdated = data.updatedAt as { toDate?: () => Date } | string | undefined;
    const updatedAtIso =
      rawUpdated && typeof rawUpdated === 'object' && typeof rawUpdated.toDate === 'function'
        ? rawUpdated.toDate().toISOString()
        : typeof rawUpdated === 'string'
        ? rawUpdated
        : undefined;
    return {
      savedBookIds: Array.isArray(data.savedBookIds) ? data.savedBookIds : [],
      bookmarks: Array.isArray(data.bookmarks) ? data.bookmarks : [],
      progress:
        data.progress && typeof data.progress === 'object'
          ? (data.progress as UserPersonalLibrary['progress'])
          : {},
      recentBookIds: Array.isArray(data.recentBookIds) ? data.recentBookIds : [],
      ...(updatedAtIso ? { updatedAt: updatedUpdatedAtSafe(updatedAtIso) } : {}),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

function updatedUpdatedAtSafe(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : new Date().toISOString();
}

export async function syncUserLibraryToFirestore(
  uid: string,
  library: UserPersonalLibrary
): Promise<void> {
  if (!uid || !auth.currentUser || auth.currentUser.uid !== uid || !auth.currentUser.emailVerified) {
    return;
  }
  const path = `users/${uid}/library/personal`;
  try {
    const profileSnap = await getDoc(doc(db, 'users', uid));
    if (!profileSnap.exists()) return;
    await setDoc(doc(db, 'users', uid, 'library', 'personal'), sanitizeLibraryPayload(uid, library));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
