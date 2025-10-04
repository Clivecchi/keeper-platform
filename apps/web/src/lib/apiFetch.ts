// apps/web/src/lib/apiFetch.ts
import { getStoredToken } from './token';

type FetchOptions = RequestInit & { headers?: Record<string, string> };

function getApiBase(): string {
  // Priority: explicit env → injected global → same-origin
  const env = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
  const injected = (globalThis as any).__API_URL as string | undefined;
  if (env && env.startsWith('http')) return env.replace(/\/+$/, '');
  if (injected && injected.startsWith('http')) return injected.replace(/\/+$/, '');
  // same-origin fallback: works on ke3p.com via Next/Vercel API proxy or direct origin
  return `${location.origin}`.replace(/\/+$/, '');
}

function getJWT(): string | undefined {
  // 1) explicit key first (our real source of truth)
  const direct = getStoredToken();
  if (direct) return direct;

  // 2) legacy heuristic fallback (keep for safety)
  const scan = (store: Storage) => {
    try {
      for (let i = 0; i < store.length; i++) {
        const k = store.key(i)!;
        const v = store.getItem(k);
        if (v && v.split('.').length === 3 && v.length > 80) return v;
      }
    } catch {}
    return undefined;
  };
  return scan(localStorage) || scan(sessionStorage) || undefined;
}

export async function apiFetch(path: string, opts: FetchOptions = {}) {
  const base = getApiBase();
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers: Record<string, string> = { ...(opts.headers || {}) };

  // JSON defaults
  const isObjectBody = opts.body && typeof opts.body === 'object' && !(opts.body instanceof FormData);
  const isStringBody = typeof opts.body === 'string';
  if (!headers['Content-Type']) {
    if (isObjectBody) headers['Content-Type'] = 'application/json';
    else if (isStringBody) headers['Content-Type'] = 'application/json';
  }

  // Auth - inject Authorization header if not present
  if (!headers['Authorization'] && !headers['authorization']) {
    const jwt = getJWT();
    if (jwt) headers['Authorization'] = `Bearer ${jwt}`;
  }

  // Normalize body
  let body: BodyInit | undefined = opts.body as any;
  if (isObjectBody) {
    try {
      body = JSON.stringify(opts.body);
    } catch {}
  }

  const res = await fetch(url, { ...opts, headers, body, credentials: opts.credentials ?? 'include' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`HTTP ${res.status}: ${text}`);
    (err as any).status = res.status;
    (err as any).body = text;
    throw err;
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

// Optional: make available for legacy code expecting global
;(globalThis as any).apiFetch = apiFetch;

export const __internal = { getApiBase };


