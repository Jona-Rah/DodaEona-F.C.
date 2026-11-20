import { initializeApp } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  setPersistence,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const authPersistenceReady: Promise<void> = setPersistence(
  auth,
  browserLocalPersistence
).catch(() => {
  // Fallback cleanly if storage is partitioned/restricted
});
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}


function sanitizeDisplayName(rawName: string | null | undefined, email: string): string {
  const fallback = email.split('@')[0] || 'DodaEona Member';
  const cleaned = String(rawName || fallback).trim();
  return (cleaned || 'DodaEona Member').slice(0, 80);
}

export async function syncGoogleUserProfileToFirestore(input: {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
}): Promise<void> {
  if (!input.uid || !input.email || !input.emailVerified) return;
  const uidPattern = /^[a-zA-Z0-9_-]+$/;
  if (!uidPattern.test(input.uid) || input.uid.length > 128) return;

  const userPath = `users/${input.uid}`;
  const privatePath = `users/${input.uid}/private/info`;
  const displayName = sanitizeDisplayName(input.displayName, input.email);
  const email = input.email.trim().slice(0, 254);

  let existingSnap;
  try {
    existingSnap = await getDoc(doc(db, 'users', input.uid));
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  const isBootstrappedAdmin = [
    'jonathan.elraheb@gmail.com',
    'david.emanoueel.gr7@gmail.com',
    'admin@dodaeona.fc',
    'malak.marian1984@gmail.com',
  ].includes(email.toLowerCase());

  if (existingSnap && !existingSnap.exists()) {
    try {
      const batch = writeBatch(db);
      batch.set(doc(db, 'users', input.uid), {
        uid: input.uid,
        displayName,
        role: isBootstrappedAdmin ? 'admin' : 'member',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'users', input.uid, 'private', 'info'), {
        uid: input.uid,
        email,
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `${userPath} | ${privatePath}`);
    }
  } else if (existingSnap && existingSnap.exists() && isBootstrappedAdmin) {
    const existingData = existingSnap.data();
    if (existingData?.role !== 'admin') {
      try {
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', input.uid), {
          role: 'admin',
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, userPath);
      }
    }
  }
}
