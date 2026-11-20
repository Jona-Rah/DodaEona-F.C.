import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReadingSeriesItem,
  BookVolume,
  UserPersonalLibrary,
  Bookmark,
  ReadingProgressRecord,
  UserSession,
} from '../types/reads';
import { INITIAL_READING_SERIES, INITIAL_BOOK_VOLUMES } from '../data/readsInitialData';
import { getStoredSessionToken, useAuth } from './AuthContext';
import { auth } from '../firebase';
import {
  buildAuthorizedHeaders,
  loadUserLibraryFromFirestore,
  syncUserLibraryToFirestore,
} from '../services/firestorePersistence';

interface ReadsContextType {
  series: ReadingSeriesItem[];
  publishedSeries: ReadingSeriesItem[];
  books: BookVolume[];
  publishedBooks: BookVolume[];
  userLibrary: UserPersonalLibrary;
  userSession: UserSession;

  // Library operations
  saveBook: (bookId: string) => void;
  unsaveBook: (bookId: string) => void;
  isBookSaved: (bookId: string) => boolean;
  addBookmark: (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => void;
  removeBookmark: (bookmarkId: string) => void;
  updateReadingProgress: (bookId: string, currentPage: number, totalPages: number) => void;
  recordBookOpened: (bookId: string) => void;

  // Admin content management operations (strictly admin verified on UI & backend)
  createSeries: (seriesData: Omit<ReadingSeriesItem, 'id'>) => Promise<ReadingSeriesItem>;
  updateSeries: (seriesData: ReadingSeriesItem) => Promise<void>;
  deleteSeries: (seriesId: string) => Promise<void>;
  createBook: (bookData: Omit<BookVolume, 'id'>) => Promise<BookVolume>;
  updateBook: (bookData: BookVolume) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  deleteBooks: (bookIds: string[]) => Promise<void>;
  toggleBookPublish: (bookId: string) => Promise<void>;
  toggleBookDownload: (bookId: string) => Promise<void>;
}

const ReadsContext = createContext<ReadsContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SERIES: 'dodaeona_reads_series_v2',
  BOOKS: 'dodaeona_reads_books_v2',
  USER_LIBRARY: 'dodaeona_reads_user_library_v2',
};

const DEFAULT_LIBRARY: UserPersonalLibrary = {
  savedBookIds: [],
  bookmarks: [],
  progress: {},
  recentBookIds: [],
};

function getUserLibraryStorageKey(userId?: string | null): string {
  return userId ? `${STORAGE_KEYS.USER_LIBRARY}:${userId}` : `${STORAGE_KEYS.USER_LIBRARY}:guest`;
}

function normalizeLibrary(raw: Partial<UserPersonalLibrary> | null | undefined): UserPersonalLibrary {
  if (!raw || typeof raw !== 'object') return DEFAULT_LIBRARY;
  const progress: Record<string, ReadingProgressRecord> = {};
  if (raw.progress && typeof raw.progress === 'object' && !Array.isArray(raw.progress)) {
    for (const [k, v] of Object.entries(raw.progress)) {
      if (v && typeof v === 'object') {
        progress[k] = v;
      }
    }
  }
  return {
    savedBookIds: Array.isArray(raw.savedBookIds)
      ? raw.savedBookIds.filter((id): id is string => typeof id === 'string')
      : [],
    bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks : [],
    progress,
    recentBookIds: Array.isArray(raw.recentBookIds)
      ? raw.recentBookIds.filter((id): id is string => typeof id === 'string')
      : [],
    ...(typeof raw.updatedAt === 'string' && raw.updatedAt ? { updatedAt: raw.updatedAt } : {}),
  };
}

function hasLibraryData(lib: UserPersonalLibrary | null | undefined): boolean {
  if (!lib) return false;
  return (
    lib.savedBookIds.length > 0 ||
    lib.bookmarks.length > 0 ||
    Object.keys(lib.progress).length > 0 ||
    lib.recentBookIds.length > 0
  );
}

function mergeTwoLibraries(base: UserPersonalLibrary, extra: UserPersonalLibrary): UserPersonalLibrary {
  const savedSet = new Set<string>([...base.savedBookIds, ...extra.savedBookIds]);
  const recentSet = new Set<string>([...base.recentBookIds, ...extra.recentBookIds]);
  const bookmarkMap = new Map<string, Bookmark>();
  for (const bm of [...base.bookmarks, ...extra.bookmarks]) {
    if (bm && bm.id && !bookmarkMap.has(bm.id)) {
      bookmarkMap.set(bm.id, bm);
    }
  }
  const mergedProgress: Record<string, ReadingProgressRecord> = { ...base.progress };
  for (const [bookId, rec] of Object.entries(extra.progress || {})) {
    const prev = mergedProgress[bookId];
    if (!prev) {
      mergedProgress[bookId] = rec;
    } else if (
      rec.percent > prev.percent ||
      (rec.percent === prev.percent && rec.currentPage > prev.currentPage)
    ) {
      mergedProgress[bookId] = {
        ...rec,
        completed: Boolean(rec.completed || prev.completed),
      };
    } else if (prev.completed !== (prev.completed || rec.completed)) {
      mergedProgress[bookId] = { ...prev, completed: true };
    }
  }
  return {
    savedBookIds: Array.from(savedSet),
    recentBookIds: Array.from(recentSet).slice(0, 10),
    bookmarks: Array.from(bookmarkMap.values()),
    progress: mergedProgress,
    updatedAt: new Date().toISOString(),
  };
}

function readScopedLibraryFromStorage(key: string): UserPersonalLibrary | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return normalizeLibrary(JSON.parse(raw) as Partial<UserPersonalLibrary>);
  } catch {
    return null;
  }
}

function librarySignature(lib: UserPersonalLibrary): string {
  return JSON.stringify({
    savedBookIds: lib.savedBookIds,
    bookmarks: lib.bookmarks,
    progress: lib.progress,
    recentBookIds: lib.recentBookIds,
  });
}

export const ReadsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const activeUserId = isAuthenticated && user ? user.id : null;

  // Trusted userSession derived ONLY from AuthContext (never localStorage or URL)
  const userSession: UserSession = useMemo(
    () =>
      isAuthenticated && user
        ? {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isAuthenticated: true,
          }
        : {
            id: 'visitor',
            name: 'Guest Reader',
            email: '',
            role: 'visitor',
            isAuthenticated: false,
          },
    [user, isAuthenticated]
  );

  // Clean up legacy v1 seed cache keys
  useEffect(() => {
    try {
      localStorage.removeItem('dodaeona_reads_series_v1');
      localStorage.removeItem('dodaeona_reads_books_v1');
      localStorage.removeItem('dodaeona_reads_user_library_v1');
    } catch {
      // ignore
    }
  }, []);

  // 1. Series State
  const [series, setSeries] = useState<ReadingSeriesItem[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.SERIES);
      if (cached) return JSON.parse(cached);
    } catch {
      // ignore
    }
    return INITIAL_READING_SERIES;
  });

  // 2. Books State (sanitized against deleted series)
  const [books, setBooks] = useState<BookVolume[]>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.BOOKS);
      if (cached) {
        const parsed: BookVolume[] = JSON.parse(cached);
        const validSeriesIds = new Set(series.map((s) => s.id));
        return parsed.filter((b) => validSeriesIds.has(b.seriesId));
      }
    } catch {
      // ignore
    }
    return INITIAL_BOOK_VOLUMES;
  });

  // 3. User Library State (scoped per authenticated user ID or guest)
  const [userLibrary, setUserLibrary] = useState<UserPersonalLibrary>(() => {
    return (
      readScopedLibraryFromStorage(getUserLibraryStorageKey(activeUserId)) ||
      readScopedLibraryFromStorage(STORAGE_KEYS.USER_LIBRARY) ||
      DEFAULT_LIBRARY
    );
  });

  // Immediately switch cached library view when signed-in account changes or signs out
  useEffect(() => {
    const scopedKey = getUserLibraryStorageKey(activeUserId);
    const scoped = readScopedLibraryFromStorage(scopedKey);
    if (scoped) {
      setUserLibrary(scoped);
      return;
    }
    if (activeUserId) {
      const legacy = readScopedLibraryFromStorage(STORAGE_KEYS.USER_LIBRARY);
      if (legacy && hasLibraryData(legacy)) {
        try {
          localStorage.setItem(scopedKey, JSON.stringify(legacy));
          localStorage.removeItem(STORAGE_KEYS.USER_LIBRARY);
        } catch {
          // ignore
        }
        setUserLibrary(legacy);
        return;
      }
    }
    setUserLibrary(DEFAULT_LIBRARY);
  }, [activeUserId]);

  const pushUserLibraryToStores = useCallback(
    (updatedLib: UserPersonalLibrary, targetUserId?: string | null) => {
      const effectiveUserId = targetUserId !== undefined ? targetUserId : activeUserId;
      try {
        localStorage.setItem(getUserLibraryStorageKey(effectiveUserId), JSON.stringify(updatedLib));
      } catch {
        // ignore storage quota errors
      }
      if (!effectiveUserId) return;

      const token = getStoredSessionToken();
      const bodyStr = JSON.stringify({ library: updatedLib });
      fetch('/api/user/library', {
        method: 'PUT',
        credentials: 'include',
        keepalive: bodyStr.length < 60_000,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: bodyStr,
      }).catch(() => {});

      if (auth.currentUser?.uid && auth.currentUser.emailVerified) {
        void syncUserLibraryToFirestore(auth.currentUser.uid, updatedLib).catch(() => {});
      }
    },
    [activeUserId]
  );

  // 1. Fetch catalog on mount and whenever admin auth or cloud reconciliation completes
  const loadCatalogue = useCallback(async () => {
    try {
      const headers = await buildAuthorizedHeaders(getStoredSessionToken());
      const res = await fetch('/api/public/reads/catalogue', {
        credentials: 'include',
        headers,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.series)) {
          setSeries(data.series);
        }
        if (Array.isArray(data?.books)) {
          setBooks(data.books);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch public reads catalogue from server, using local cache:', e);
    }
  }, []);

  // 2. Fetch & reconcile user library across server, Firestore, and device storage when authenticated
  const loadUserLibrary = useCallback(async () => {
    if (!activeUserId) return;
    const token = getStoredSessionToken();
    const scopedKey = getUserLibraryStorageKey(activeUserId);

    const localLib = readScopedLibraryFromStorage(scopedKey);
    const guestLib = readScopedLibraryFromStorage(getUserLibraryStorageKey(null));

    let serverLib: UserPersonalLibrary | null = null;
    let serverExists = false;
    try {
      const res = await fetch('/api/user/library', {
        credentials: 'include',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.library) {
          const parsedServer = normalizeLibrary(data.library);
          serverExists = Boolean(data.exists) || hasLibraryData(parsedServer) || Boolean(parsedServer.updatedAt);
          if (serverExists) {
            serverLib = parsedServer;
          }
        }
      }
    } catch {
      // ignore network failure and continue with Firestore/local cache
    }

    let firestoreLib: UserPersonalLibrary | null = null;
    if (auth.currentUser?.uid && auth.currentUser.emailVerified) {
      try {
        const cloud = await loadUserLibraryFromFirestore(auth.currentUser.uid);
        if (cloud && (hasLibraryData(cloud) || cloud.updatedAt)) {
          firestoreLib = normalizeLibrary(cloud);
        }
      } catch {
        // handled by handleFirestoreError
      }
    }

    const candidates: Array<{ source: 'local' | 'server' | 'firestore'; lib: UserPersonalLibrary }> = [];
    if (localLib && (hasLibraryData(localLib) || localLib.updatedAt)) {
      candidates.push({ source: 'local', lib: localLib });
    }
    if (serverLib && (hasLibraryData(serverLib) || serverLib.updatedAt)) {
      candidates.push({ source: 'server', lib: serverLib });
    }
    if (firestoreLib && (hasLibraryData(firestoreLib) || firestoreLib.updatedAt)) {
      candidates.push({ source: 'firestore', lib: firestoreLib });
    }

    let chosen: UserPersonalLibrary = DEFAULT_LIBRARY;
    if (candidates.length > 0) {
      const nonEmpty = candidates.filter((c) => hasLibraryData(c.lib));
      const pool = nonEmpty.length > 0 ? nonEmpty : candidates;
      pool.sort((a, b) => {
        const aTime = a.lib.updatedAt ? Date.parse(a.lib.updatedAt) : 0;
        const bTime = b.lib.updatedAt ? Date.parse(b.lib.updatedAt) : 0;
        if (Number.isFinite(aTime) && Number.isFinite(bTime) && aTime !== bTime) {
          return bTime - aTime;
        }
        const priority = { firestore: 3, server: 2, local: 1 };
        return priority[b.source] - priority[a.source];
      });
      chosen = pool[0].lib;
    }

    if (guestLib && hasLibraryData(guestLib)) {
      chosen = mergeTwoLibraries(chosen, guestLib);
      try {
        localStorage.removeItem(getUserLibraryStorageKey(null));
      } catch {
        // ignore
      }
    }

    if (!chosen.updatedAt && hasLibraryData(chosen)) {
      chosen = { ...chosen, updatedAt: new Date().toISOString() };
    }

    setUserLibrary(chosen);
    try {
      localStorage.setItem(scopedKey, JSON.stringify(chosen));
    } catch {
      // ignore
    }

    const chosenSig = librarySignature(chosen);
    const needsServerBackfill =
      (!serverLib && hasLibraryData(chosen)) ||
      (serverLib !== null && librarySignature(serverLib) !== chosenSig);
    const needsFirestoreBackfill =
      Boolean(auth.currentUser?.uid && auth.currentUser.emailVerified) &&
      ((!firestoreLib && hasLibraryData(chosen)) ||
        (firestoreLib !== null && librarySignature(firestoreLib) !== chosenSig));

    if (needsServerBackfill || needsFirestoreBackfill) {
      pushUserLibraryToStores(chosen, activeUserId);
    }
  }, [activeUserId, pushUserLibraryToStores]);

  useEffect(() => {
    void loadCatalogue();
  }, [loadCatalogue, isAdmin]);

  useEffect(() => {
    const handleReconciled = () => {
      void loadCatalogue();
    };
    window.addEventListener('dodaeona:cloud-reconciled', handleReconciled);
    return () => window.removeEventListener('dodaeona:cloud-reconciled', handleReconciled);
  }, [loadCatalogue]);

  useEffect(() => {
    if (isAuthenticated && activeUserId) {
      void loadUserLibrary();
    }
  }, [isAuthenticated, activeUserId, loadUserLibrary]);

  const storageMountFlagsRef = React.useRef<{ s?: boolean; b?: boolean }>({});

  // Sync catalogue cache to localStorage
  useEffect(() => {
    if (!storageMountFlagsRef.current.s) { storageMountFlagsRef.current.s = true; return; }
    try {
      localStorage.setItem(STORAGE_KEYS.SERIES, JSON.stringify(series));
    } catch {}
  }, [series]);

  useEffect(() => {
    if (!storageMountFlagsRef.current.b) { storageMountFlagsRef.current.b = true; return; }
    try {
      localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
    } catch {}
  }, [books]);

  const syncUserLibraryToServer = useCallback(
    (updatedLib: UserPersonalLibrary) => {
      pushUserLibraryToStores(updatedLib, activeUserId);
    },
    [activeUserId, pushUserLibraryToStores]
  );

  const publishedBooks = books.filter((b) => b.published);
  const seriesWithLiveCounts = series.map((s) => ({
    ...s,
    volumeCount: books.filter((b) => b.seriesId === s.id).length,
  }));
  const publishedSeries = series
    .filter((s) => s.published)
    .map((s) => ({
      ...s,
      volumeCount: publishedBooks.filter((b) => b.seriesId === s.id).length,
    }));

  const trackAnalytics = (bookId: string, eventType: 'view' | 'read' | 'download' | 'bookmark') => {
    const book = books.find((b) => b.id === bookId);
    fetch('/api/analytics/event', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bookId,
        bookTitle: book?.title || bookId,
        seriesTitle: book?.seriesTitle || 'Library',
        eventType,
      }),
    }).catch(() => {});
  };

  const saveBook = (bookId: string) => {
    setUserLibrary((prev) => {
      if (prev.savedBookIds.includes(bookId)) return prev;
      trackAnalytics(bookId, 'bookmark');
      const next: UserPersonalLibrary = {
        ...prev,
        savedBookIds: [bookId, ...prev.savedBookIds],
        updatedAt: new Date().toISOString(),
      };
      syncUserLibraryToServer(next);
      return next;
    });
  };

  const unsaveBook = (bookId: string) => {
    setUserLibrary((prev) => {
      const next: UserPersonalLibrary = {
        ...prev,
        savedBookIds: prev.savedBookIds.filter((id) => id !== bookId),
        updatedAt: new Date().toISOString(),
      };
      syncUserLibraryToServer(next);
      return next;
    });
  };

  const isBookSaved = (bookId: string) => userLibrary.savedBookIds.includes(bookId);

  const addBookmark = (bmData: Omit<Bookmark, 'id' | 'createdAt'>) => {
    const newBm: Bookmark = {
      ...bmData,
      id: `bm-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    trackAnalytics(bmData.bookId, 'bookmark');
    setUserLibrary((prev) => {
      const next: UserPersonalLibrary = {
        ...prev,
        bookmarks: [newBm, ...prev.bookmarks],
        updatedAt: new Date().toISOString(),
      };
      syncUserLibraryToServer(next);
      return next;
    });
  };

  const removeBookmark = (bookmarkId: string) => {
    setUserLibrary((prev) => {
      const next: UserPersonalLibrary = {
        ...prev,
        bookmarks: prev.bookmarks.filter((b) => b.id !== bookmarkId),
        updatedAt: new Date().toISOString(),
      };
      syncUserLibraryToServer(next);
      return next;
    });
  };

  const updateReadingProgress = (bookId: string, currentPage: number, totalPages: number) => {
    const safeTotal = Math.max(1, totalPages);
    const percent = Math.min(100, Math.round((currentPage / safeTotal) * 100));
    const completed = percent >= 98;
    setUserLibrary((prev) => {
      const existing = prev.progress[bookId];
      if (
        existing &&
        existing.currentPage === currentPage &&
        existing.totalPages === safeTotal &&
        existing.percent === percent
      ) {
        return prev;
      }
      const next: UserPersonalLibrary = {
        ...prev,
        progress: {
          ...prev.progress,
          [bookId]: {
            bookId,
            percent,
            currentPage,
            totalPages: safeTotal,
            lastReadAt: new Date().toISOString().split('T')[0],
            completed,
          },
        },
        updatedAt: new Date().toISOString(),
      };
      syncUserLibraryToServer(next);
      return next;
    });
  };

  const recordBookOpened = (bookId: string) => {
    trackAnalytics(bookId, 'read');
    setUserLibrary((prev) => {
      const next: UserPersonalLibrary = {
        ...prev,
        recentBookIds: [bookId, ...prev.recentBookIds.filter((id) => id !== bookId)].slice(0, 10),
        updatedAt: new Date().toISOString(),
      };
      syncUserLibraryToServer(next);
      return next;
    });
  };

  const createSeries = async (seriesData: Omit<ReadingSeriesItem, 'id'>): Promise<ReadingSeriesItem> => {
    if (!isAdmin) throw new Error('Owners only: publishing privileges required.');
    const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
      'Content-Type': 'application/json',
    });
    const res = await fetch('/api/admin/reads/series', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(seriesData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Failed to create reading series.');
    }
    const data = await res.json();
    const newSeries: ReadingSeriesItem = data.series;
    if (Array.isArray(data.allSeries)) {
      setSeries(data.allSeries);
    } else {
      setSeries((prev) => [newSeries, ...prev]);
    }
    return newSeries;
  };

  const updateSeries = async (seriesData: ReadingSeriesItem): Promise<void> => {
    if (!isAdmin) return;
    const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
      'Content-Type': 'application/json',
    });
    const res = await fetch(`/api/admin/reads/series/${seriesData.id}`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify(seriesData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Failed to update reading series.');
    }
    const data = await res.json();
    if (Array.isArray(data.allSeries)) {
      setSeries(data.allSeries);
    } else {
      setSeries((prev) => prev.map((s) => (s.id === seriesData.id ? seriesData : s)));
    }
  };

  const deleteSeries = async (seriesId: string): Promise<void> => {
    if (!isAdmin) return;
    const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
      'Content-Type': 'application/json',
    });
    const res = await fetch(`/api/admin/reads/series/${seriesId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Failed to delete reading series.');
    }
    const data = await res.json();
    if (Array.isArray(data.allSeries)) {
      setSeries(data.allSeries);
    } else {
      setSeries((prev) => prev.filter((s) => s.id !== seriesId));
    }
    setBooks((prev) => prev.filter((b) => b.seriesId !== seriesId));
  };

  const createBook = async (bookData: Omit<BookVolume, 'id'>): Promise<BookVolume> => {
    if (!isAdmin) throw new Error('Owners only: publishing privileges required.');
    const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
      'Content-Type': 'application/json',
    });
    const res = await fetch('/api/admin/reads/books', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify(bookData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Failed to create book volume.');
    }
    const data = await res.json();
    const newBook: BookVolume = data.book;
    if (Array.isArray(data.allBooks)) {
      setBooks(data.allBooks);
    } else {
      setBooks((prev) => [newBook, ...prev]);
    }
    return newBook;
  };

  const updateBook = async (bookData: BookVolume): Promise<void> => {
    if (!isAdmin) return;
    const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
      'Content-Type': 'application/json',
    });
    const res = await fetch(`/api/admin/reads/books/${bookData.id}`, {
      method: 'PUT',
      credentials: 'include',
      headers,
      body: JSON.stringify(bookData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Failed to update book volume.');
    }
    const data = await res.json();
    if (Array.isArray(data.allBooks)) {
      setBooks(data.allBooks);
    } else {
      setBooks((prev) => prev.map((b) => (b.id === bookData.id ? bookData : b)));
    }
  };

  const deleteBooks = async (bookIds: string[]): Promise<void> => {
    if (!isAdmin) return;
    const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
      'Content-Type': 'application/json',
    });
    const res = await fetch('/api/admin/reads/books', {
      method: 'DELETE',
      credentials: 'include',
      headers,
      body: JSON.stringify({ bookIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Failed to delete book volumes.');
    }
    const data = await res.json();
    if (Array.isArray(data.allBooks)) {
      setBooks(data.allBooks);
    } else {
      const removeSet = new Set(bookIds);
      setBooks((prev) => prev.filter((b) => !removeSet.has(b.id)));
    }
  };

  const deleteBook = (bookId: string) => deleteBooks([bookId]);

  const toggleBookPublish = async (bookId: string): Promise<void> => {
    if (!isAdmin) return;
    const target = books.find((b) => b.id === bookId);
    if (!target) return;
    const nextPublished = !target.published;
    const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
      'Content-Type': 'application/json',
    });
    const res = await fetch(`/api/admin/reads/books/${bookId}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers,
      body: JSON.stringify({ published: nextPublished }),
    });
    if (!res.ok) throw new Error('Failed to update book publish status in database.');
    setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, published: nextPublished } : b)));
  };

  const toggleBookDownload = async (bookId: string): Promise<void> => {
    if (!isAdmin) return;
    const target = books.find((b) => b.id === bookId);
    if (!target) return;
    const nextDownload = !target.downloadEnabled;
    const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
      'Content-Type': 'application/json',
    });
    const res = await fetch(`/api/admin/reads/books/${bookId}/status`, {
      method: 'PATCH',
      credentials: 'include',
      headers,
      body: JSON.stringify({ downloadEnabled: nextDownload }),
    });
    if (!res.ok) throw new Error('Failed to update book download status in database.');
    setBooks((prev) => prev.map((b) => (b.id === bookId ? { ...b, downloadEnabled: nextDownload } : b)));
  };

  return (
    <ReadsContext.Provider
      value={{
        series: seriesWithLiveCounts,
        publishedSeries,
        books,
        publishedBooks,
        userLibrary,
        userSession,
        saveBook,
        unsaveBook,
        isBookSaved,
        addBookmark,
        removeBookmark,
        updateReadingProgress,
        recordBookOpened,
        createSeries,
        updateSeries,
        deleteSeries,
        createBook,
        updateBook,
        deleteBook,
        deleteBooks,
        toggleBookPublish,
        toggleBookDownload,
      }}
    >
      {children}
    </ReadsContext.Provider>
  );
};

export const useReads = (): ReadsContextType => {
  const context = useContext(ReadsContext);
  if (!context) {
    throw new Error('useReads must be used within a ReadsProvider');
  }
  return context;
};
