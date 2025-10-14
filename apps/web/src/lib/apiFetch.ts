// apps/web/src/lib/apiFetch.ts
type FetchOptions = RequestInit & { headers?: Record<string, string> };

const RAW_BASE = ((import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com').replace(/\/$/, '');
const API_HOST = (() => { try { return new URL(RAW_BASE).host; } catch { return 'api.ke3p.com'; } })();

function toApiUrl(input: string | URL): string {
  const u = typeof input === 'string' ? input : input.toString();
  if (u.startsWith(RAW_BASE)) return u;
  if (u.startsWith('/api/')) return `${RAW_BASE}${u}`;
  if (u.startsWith('https://www.ke3p.com/api/')) return u.replace('https://www.ke3p.com', RAW_BASE);
  return u;
}

export async function apiFetch(input: string | URL, opts: FetchOptions = {}) {
  const url = toApiUrl(input);
  const nextInit: RequestInit = {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  };

  // Strip Authorization for API host in production (cookie-only)
  if ((import.meta as any)?.env?.PROD) {
    try {
      const h = new Headers(nextInit.headers as any);
      const isApiHost = new URL(url).host === API_HOST;
      if (isApiHost && h.has('Authorization')) h.delete('Authorization');
      nextInit.headers = h as any;
    } catch {}
  }

  return fetch(url, nextInit);
}

// Optional dev log of API base
if ((import.meta as any)?.env?.DEV) {
  try { console.log('[Keeper] API base =', (import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com'); } catch {}
}


