import React, { lazy, useEffect, useState } from 'react';
import {
  getFailedModuleUrl,
  isDynamicModuleImportError,
  markModuleRecovered,
  recordModuleError,
  registerReloadableModule,
} from './matchCentreErrorTracker';

const RELOAD_COOLDOWN_KEY = 'dodaeona_chunk_reload_at';
const RELOAD_COOLDOWN_MS = 15_000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveDefaultExport<T extends React.ComponentType<any>>(
  mod: any,
  moduleName?: string
): { default: T } {
  if (mod && typeof mod.default === 'function') {
    return { default: mod.default as T };
  }
  if (mod && moduleName && typeof mod[moduleName] === 'function') {
    return { default: mod[moduleName] as T };
  }
  if (mod && typeof mod === 'object') {
    const candidate = Object.values(mod).find((val) => typeof val === 'function');
    if (candidate) {
      return { default: candidate as T };
    }
  }
  return mod as { default: T };
}

export function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  moduleName?: string
): React.FC<React.ComponentProps<T>> {
  const buildLazyComponent = (cacheBustToken: number) =>
    lazy(async () => {
      const delays = [250, 600, 1200];
      let lastError: unknown;

      // On forced retry with a cache-bust token, try bypassing browser ESM module cache if a failed URL is known
      if (cacheBustToken > 0 && moduleName && typeof window !== 'undefined') {
        const failedUrl = getFailedModuleUrl(moduleName);
        if (failedUrl) {
          try {
            const cleanUrl = failedUrl.split('?')[0];
            const freshMod = await import(/* @vite-ignore */ `${cleanUrl}?mc_retry=${cacheBustToken}`);
            const resolved = resolveDefaultExport<T>(freshMod, moduleName);
            if (resolved?.default) {
              markModuleRecovered(moduleName);
              return resolved;
            }
          } catch {
            // Fall through to standard importer retries
          }
        }
      }

      for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
          const loaded = await importer();
          if (moduleName) {
            markModuleRecovered(moduleName);
          }
          return loaded;
        } catch (err) {
          lastError = err;
          if (attempt < delays.length && isDynamicModuleImportError(err)) {
            await wait(delays[attempt]);
            continue;
          }
          break;
        }
      }

      if (moduleName || isDynamicModuleImportError(lastError)) {
        recordModuleError({
          error: lastError,
          moduleName,
        });
      }

      if (typeof window !== 'undefined' && isDynamicModuleImportError(lastError)) {
        try {
          const lastReloadRaw = window.sessionStorage.getItem(RELOAD_COOLDOWN_KEY);
          const lastReloadAt = lastReloadRaw ? Number(lastReloadRaw) : 0;
          const now = Date.now();
          if (!Number.isFinite(lastReloadAt) || now - lastReloadAt > RELOAD_COOLDOWN_MS) {
            window.sessionStorage.setItem(RELOAD_COOLDOWN_KEY, String(now));
            window.location.reload();
            // Keep Suspense pending briefly while browser navigates/reloads
            await wait(5000);
          }
        } catch {
          // Ignore sessionStorage errors in restricted iframes
        }
      }

      if (lastError instanceof Error && moduleName && !lastError.message.endsWith(`(${moduleName})`)) {
        lastError.message = `${lastError.message} (${moduleName})`;
      }
      throw lastError;
    });

  let currentToken = 0;
  let CurrentLazy = buildLazyComponent(currentToken);
  const bumpListeners = new Set<(token: number) => void>();

  if (moduleName) {
    registerReloadableModule(moduleName, (nextToken: number) => {
      currentToken = nextToken || Date.now();
      CurrentLazy = buildLazyComponent(currentToken);
      bumpListeners.forEach((fn) => fn(currentToken));
    });
  }

  const ReloadableLazyWrapper: React.FC<React.ComponentProps<T>> = (props) => {
    const [, setToken] = useState(currentToken);

    useEffect(() => {
      const listener = (next: number) => setToken(next);
      bumpListeners.add(listener);
      return () => {
        bumpListeners.delete(listener);
      };
    }, []);

    return React.createElement(CurrentLazy, props);
  };

  ReloadableLazyWrapper.displayName = moduleName ? `LazyWithRetry(${moduleName})` : 'LazyWithRetry';
  return ReloadableLazyWrapper;
}
