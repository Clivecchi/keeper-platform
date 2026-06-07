// apps/web/src/lib/apiFetch.ts
// Unified API fetch wrapper that:
// - Resolves API URLs to correct base
// - Includes credentials for CORS (cookie fallback)
// - Injects JWT Authorization header from authTokenStore (primary auth)
// - Returns parsed JSON on success
// - Throws Error on failure (with parsed error message if available)

import { getAuthToken } from './authTokenStore';

type FetchOptions = RequestInit & { headers?: Record<string, string> };

/** Resolve API base: use relative /api when on ke3p.com (Vercel rewrites to Railway); else env or fallback. Exported for api.ts. */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'www.ke3p.com' || host === 'ke3p.com') return ''; // Same-origin: /api → Vercel rewrite
    if (host === 'localhost' || host === '127.0.0.1') return ''; // Dev: /api → Vite proxy → localhost:3002
  }
  const env = (import.meta as any)?.env?.VITE_API_URL;
  return (env || 'https://api.ke3p.com').replace(/\/$/, '');
}

const RAW_BASE = getApiBase();

function toApiUrl(input: string | URL): string {
  const u = typeof input === 'string' ? input : input.toString();
  if (u.startsWith('http')) return u; // Already absolute
  if (u.startsWith('/api/')) return RAW_BASE ? `${RAW_BASE}${u}` : u; // Relative when on ke3p.com
  return RAW_BASE ? `${RAW_BASE}${u}` : u;
}

export async function apiFetch(input: string | URL, opts: FetchOptions = {}) {
  const url = toApiUrl(input);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined || {}),
  };

  // Inject JWT Authorization header if we have a stored token and
  // the caller hasn't already set one. This is the primary auth mechanism.
  // Cookies (via credentials: 'include') serve as a secondary fallback.
  if (!headers['Authorization']) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const nextInit: RequestInit = {
    ...opts,
    credentials: 'include', // Also send cookies when available
    headers,
  };

  const response = await fetch(url, nextInit);

  if (!response.ok) {
    const raw = await response.text();
    let errorData: Record<string, unknown> | null = null;
    if (raw) {
      try {
        errorData = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        errorData = null;
      }
    }

    const fromBody =
      typeof errorData?.message === 'string'
        ? errorData.message
        : typeof errorData?.error === 'string'
          ? errorData.error
          : null;
    const errorMessage = fromBody ?? `HTTP ${response.status}: ${response.statusText}`;

    const error = new Error(errorMessage) as Error & {
      status: number;
      response: Response;
      code?: string;
      data?: Record<string, unknown>;
    };
    error.status = response.status;
    error.response = response;
    if (typeof errorData?.error === 'string') {
      error.code = errorData.error;
    }
    if (errorData) {
      error.data = errorData;
    }
    throw error;
  }
  
  const raw = await response.text();
  if (!raw.trim()) {
    throw new Error('Server returned an empty response. Please try again.');
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('Server returned an invalid response. Please try again.');
  }
}

// Log API base in development
if ((import.meta as any)?.env?.DEV) {
  try { console.log('[Keeper] API base =', (import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com'); } catch {}
}
