export type TrackedFailureCategory = 'dynamic-import' | 'chunk-stale' | 'runtime';

export interface TrackedModuleError {
  id: string;
  timestamp: string;
  moduleName: string;
  sectionKey?: string;
  category: TrackedFailureCategory;
  errorMessage: string;
  failedUrl?: string;
  componentStack?: string;
  errorStack?: string;
  attemptCount: number;
  recovered: boolean;
}

type ReloadHandler = (cacheBustToken: number) => void;
type TrackerListener = (errors: TrackedModuleError[]) => void;

const STORAGE_KEY = 'dodaeona_mc_error_tracker_v1';
const RELOAD_COOLDOWN_KEY = 'dodaeona_chunk_reload_at';
const MAX_TRACKED_ERRORS = 40;

const reloadHandlers = new Map<string, ReloadHandler>();
const failedUrlsByModule = new Map<string, string>();
const listeners = new Set<TrackerListener>();

let trackedErrors: TrackedModuleError[] = loadInitialErrors();
let globalListenersInstalled = false;

function loadInitialErrors(): TrackedModuleError[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_TRACKED_ERRORS) : [];
  } catch {
    return [];
  }
}

function persistErrors(list: TrackedModuleError[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_TRACKED_ERRORS)));
  } catch {
    // Ignore storage quota or sandbox restrictions
  }
  try {
    (window as unknown as { __DODAEONA_MC_ERRORS__?: TrackedModuleError[] }).__DODAEONA_MC_ERRORS__ = list;
  } catch {
    // Ignore read-only window properties
  }
}

function notifyListeners(): void {
  const snapshot = [...trackedErrors];
  listeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // Never allow listener errors to propagate
    }
  });
}

export function isDynamicModuleImportError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  const lower = msg.toLowerCase();
  return (
    lower.includes('failed to fetch dynamically imported module') ||
    lower.includes('importing a module script failed') ||
    lower.includes('error loading dynamically imported module') ||
    lower.includes('loading chunk') ||
    lower.includes('chunkloaderror') ||
    lower.includes('outdated optimize dep') ||
    lower.includes('unexpected token') ||
    lower.includes('mime type') ||
    lower.includes('load failed') ||
    lower.includes('invalid hook call') ||
    lower.includes("reading 'usecontext'") ||
    lower.includes("reading 'usestate'")
  );
}

export function extractFailedModuleUrl(message: string): string | undefined {
  const match = message.match(/https?:\/\/[^\s)]+/i) || message.match(/(\/src\/[^\s)]+|\/assets\/[^\s)]+)/i);
  if (!match) return undefined;
  return match[0].replace(/[),.;]+$/, '');
}

export function inferModuleNameFromMessage(message: string, fallback = 'MatchCentreModule'): string {
  const parenMatch = message.match(/\(([A-Za-z0-9_-]+)\)\s*$/);
  if (parenMatch?.[1]) return parenMatch[1];

  const url = extractFailedModuleUrl(message);
  if (url) {
    const seg = url.split('/').pop()?.split('?')[0];
    if (seg) return seg.replace(/\.(tsx?|jsx?|mjs|js)$/i, '');
  }
  return fallback;
}

export function recordModuleError(params: {
  error: unknown;
  moduleName?: string;
  sectionKey?: string;
  componentStack?: string;
}): TrackedModuleError {
  const rawMessage =
    params.error instanceof Error
      ? params.error.message
      : String(params.error || 'Unknown module load failure');
  const errorStack = params.error instanceof Error ? params.error.stack : undefined;
  const resolvedModule = params.moduleName || inferModuleNameFromMessage(rawMessage);
  const failedUrl = extractFailedModuleUrl(rawMessage);
  const isDynamic = isDynamicModuleImportError(params.error);
  const lower = rawMessage.toLowerCase();
  const category: TrackedFailureCategory = lower.includes('outdated optimize dep')
    ? 'chunk-stale'
    : isDynamic
    ? 'dynamic-import'
    : 'runtime';

  if (failedUrl && resolvedModule) {
    failedUrlsByModule.set(resolvedModule, failedUrl);
  }

  const prevCount = trackedErrors.filter((e) => e.moduleName === resolvedModule).length;
  const entry: TrackedModuleError = {
    id: `mc-err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    moduleName: resolvedModule,
    sectionKey: params.sectionKey,
    category,
    errorMessage: rawMessage,
    failedUrl,
    componentStack: params.componentStack,
    errorStack,
    attemptCount: prevCount + 1,
    recovered: false,
  };

  trackedErrors = [entry, ...trackedErrors].slice(0, MAX_TRACKED_ERRORS);
  persistErrors(trackedErrors);
  notifyListeners();

  console.error('[MatchCentreErrorTracker]', {
    moduleName: entry.moduleName,
    sectionKey: entry.sectionKey,
    category: entry.category,
    attemptCount: entry.attemptCount,
    failedUrl: entry.failedUrl,
    errorMessage: entry.errorMessage,
    componentStack: entry.componentStack,
  });

  return entry;
}

export function markModuleRecovered(moduleName: string): void {
  let changed = false;
  trackedErrors = trackedErrors.map((entry) => {
    if (entry.moduleName === moduleName && !entry.recovered) {
      changed = true;
      return { ...entry, recovered: true };
    }
    return entry;
  });
  if (changed) {
    failedUrlsByModule.delete(moduleName);
    persistErrors(trackedErrors);
    notifyListeners();
  }
}

export function getTrackedModuleErrors(): TrackedModuleError[] {
  return [...trackedErrors];
}

export function clearTrackedModuleErrors(): void {
  trackedErrors = [];
  persistErrors(trackedErrors);
  notifyListeners();
}

export function subscribeModuleErrors(listener: TrackerListener): () => void {
  listeners.add(listener);
  listener([...trackedErrors]);
  return () => {
    listeners.delete(listener);
  };
}

export function registerReloadableModule(moduleName: string, handler: ReloadHandler): () => void {
  reloadHandlers.set(moduleName, handler);
  return () => {
    if (reloadHandlers.get(moduleName) === handler) {
      reloadHandlers.delete(moduleName);
    }
  };
}

export function getFailedModuleUrl(moduleName: string): string | undefined {
  return failedUrlsByModule.get(moduleName);
}

/**
 * Clears browser Cache Storage, session reload cooldowns, updates any active Service Worker,
 * refreshes HTTP cache for the failed module URL, and triggers a fresh lazy reload of the component.
 */
export async function clearModuleCachesAndForceReload(options?: {
  moduleName?: string;
  failedUrl?: string;
}): Promise<{ clearedCaches: number; reloadedModules: string[] }> {
  let clearedCaches = 0;
  const cacheBustToken = Date.now();

  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(RELOAD_COOLDOWN_KEY);
    } catch {
      // Ignore sessionStorage restrictions
    }

    if ('caches' in window && typeof window.caches?.keys === 'function') {
      try {
        const cacheNames = await window.caches.keys();
        await Promise.all(
          cacheNames.map(async (name) => {
            const deleted = await window.caches.delete(name);
            if (deleted) clearedCaches += 1;
          })
        );
      } catch {
        // Ignore CacheStorage access errors
      }
    }

    if ('serviceWorker' in navigator && typeof navigator.serviceWorker?.getRegistrations === 'function') {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.update().catch(() => {})));
      } catch {
        // Ignore SW errors
      }
    }

    const targetUrl =
      options?.failedUrl ||
      (options?.moduleName ? failedUrlsByModule.get(options.moduleName) : undefined);

    if (targetUrl) {
      try {
        const cleanUrl = targetUrl.split('?')[0];
        await fetch(`${cleanUrl}?mc_cache_bust=${cacheBustToken}`, {
          cache: 'reload',
          credentials: 'same-origin',
          headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
        }).catch(() => {});
      } catch {
        // Best-effort cache refresh
      }
    }
  }

  const reloadedModules: string[] = [];
  const targetName = options?.moduleName;

  if (targetName && reloadHandlers.has(targetName)) {
    reloadHandlers.get(targetName)!(cacheBustToken);
    reloadedModules.push(targetName);
  } else {
    // Reset all registered modules whose last recorded failure isn't recovered yet, or all handlers
    const pendingNames = new Set(
      trackedErrors.filter((e) => !e.recovered).map((e) => e.moduleName)
    );
    reloadHandlers.forEach((handler, name) => {
      if (pendingNames.size === 0 || pendingNames.has(name)) {
        handler(cacheBustToken);
        reloadedModules.push(name);
      }
    });
  }

  return { clearedCaches, reloadedModules };
}

/**
 * Installs global listeners within the Match Centre module to capture dynamic import failures
 * (including Vite preload errors and unhandled async import rejections).
 */
export function installMatchCentreGlobalErrorTracker(getSectionKey?: () => string): () => void {
  if (typeof window === 'undefined' || globalListenersInstalled) {
    return () => {};
  }
  globalListenersInstalled = true;

  const handleVitePreloadError = (event: Event) => {
    const customEvent = event as CustomEvent & { payload?: unknown };
    const err = customEvent?.payload ?? new Error('Vite dynamic module preload failed');
    recordModuleError({
      error: err,
      sectionKey: getSectionKey?.(),
    });
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event?.reason;
    if (isDynamicModuleImportError(reason)) {
      recordModuleError({
        error: reason,
        sectionKey: getSectionKey?.(),
      });
    }
  };

  const handleScriptError = (event: Event) => {
    const target = event?.target as HTMLScriptElement | null;
    if (target && target.tagName === 'SCRIPT' && target.src) {
      recordModuleError({
        error: new Error(`Failed to load script module: ${target.src}`),
        sectionKey: getSectionKey?.(),
      });
    }
  };

  window.addEventListener('vite:preloadError', handleVitePreloadError);
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  window.addEventListener('error', handleScriptError, true);

  return () => {
    globalListenersInstalled = false;
    window.removeEventListener('vite:preloadError', handleVitePreloadError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    window.removeEventListener('error', handleScriptError, true);
  };
}
