let cachedLiteData: any = null;
let cachedFullData: any = null;
let inFlightLite: Promise<any> | null = null;
let inFlightFull: Promise<any> | null = null;

export function invalidateBootstrapCache(): void {
  cachedLiteData = null;
  cachedFullData = null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('dodaeona:cloud-reconciled', invalidateBootstrapCache);
  window.addEventListener('dodaeona:branding-updated', invalidateBootstrapCache);
}

export async function fetchBootstrapLite(forceRefresh = false): Promise<any> {
  if (!forceRefresh) {
    if (cachedFullData) return cachedFullData;
    if (cachedLiteData) return cachedLiteData;
    if (inFlightFull) return inFlightFull;
    if (inFlightLite) return inFlightLite;
  }

  const req = fetch('/api/public/bootstrap?lite=1')
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data) {
        cachedLiteData = data;
      }
      return data;
    })
    .finally(() => {
      if (inFlightLite === req) {
        inFlightLite = null;
      }
    });

  inFlightLite = req;
  return req;
}

export async function fetchBootstrapFull(forceRefresh = false): Promise<any> {
  if (!forceRefresh) {
    if (cachedFullData) return cachedFullData;
    if (inFlightFull) return inFlightFull;
  }

  const req = fetch('/api/public/bootstrap')
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      if (data) {
        cachedFullData = data;
        cachedLiteData = data;
      }
      return data;
    })
    .finally(() => {
      if (inFlightFull === req) {
        inFlightFull = null;
      }
    });

  inFlightFull = req;
  return req;
}
