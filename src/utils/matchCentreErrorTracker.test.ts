import assert from 'node:assert/strict';
import {
  clearModuleCachesAndForceReload,
  clearTrackedModuleErrors,
  getFailedModuleUrl,
  getTrackedModuleErrors,
  markModuleRecovered,
  recordModuleError,
  registerReloadableModule,
  subscribeModuleErrors,
} from './matchCentreErrorTracker';

async function run() {
  clearTrackedModuleErrors();
  let latestSnapshotCount = 0;
  const unsubscribe = subscribeModuleErrors((entries) => {
    latestSnapshotCount = entries.length;
  });

  // Mock browser caches + sessionStorage + fetch
  const deletedCaches: string[] = [];
  const fetchedUrls: string[] = [];
  let reloadTokenReceived = 0;

  (globalThis as any).window = {
    sessionStorage: {
      _data: new Map<string, string>(),
      getItem(k: string) {
        return this._data.get(k) ?? null;
      },
      setItem(k: string, v: string) {
        this._data.set(k, v);
      },
      removeItem(k: string) {
        this._data.delete(k);
      },
    },
    caches: {
      async keys() {
        return ['workbox-precache-v2', 'vite-runtime-cache'];
      },
      async delete(name: string) {
        deletedCaches.push(name);
        return true;
      },
    },
  };
  (globalThis as any).fetch = async (url: string) => {
    fetchedUrls.push(url);
    return { ok: true };
  };

  const unregister = registerReloadableModule('TeamsTab', (token) => {
    reloadTokenReceived = token;
  });

  const sampleError = new TypeError(
    'Failed to fetch dynamically imported module: https://example.com/src/components/matchCentre/TeamsTab.tsx (TeamsTab)'
  );
  const entry1 = recordModuleError({
    error: sampleError,
    sectionKey: 'teams',
  });

  assert.equal(entry1.moduleName, 'TeamsTab');
  assert.equal(entry1.category, 'dynamic-import');
  assert.equal(entry1.attemptCount, 1);
  assert.equal(entry1.recovered, false);
  assert.equal(
    entry1.failedUrl,
    'https://example.com/src/components/matchCentre/TeamsTab.tsx'
  );
  assert.equal(
    getFailedModuleUrl('TeamsTab'),
    'https://example.com/src/components/matchCentre/TeamsTab.tsx'
  );
  assert.equal(latestSnapshotCount, 1);

  const retryResult = await clearModuleCachesAndForceReload({
    moduleName: 'TeamsTab',
  });
  assert.equal(retryResult.clearedCaches, 2);
  assert.deepEqual(deletedCaches, ['workbox-precache-v2', 'vite-runtime-cache']);
  assert.deepEqual(retryResult.reloadedModules, ['TeamsTab']);
  assert.ok(reloadTokenReceived > 0);
  assert.ok(
    fetchedUrls.some((u) =>
      u.startsWith('https://example.com/src/components/matchCentre/TeamsTab.tsx?mc_cache_bust=')
    )
  );

  markModuleRecovered('TeamsTab');
  const updated = getTrackedModuleErrors();
  assert.equal(updated[0].recovered, true);

  unregister();
  unsubscribe();
  clearTrackedModuleErrors();
  console.log('matchCentreErrorTracker tests passed cleanly.');
}

void run();
