// apps/web/src/lib/apiFetch.ts
// Unified API fetch wrapper that:
// - Resolves API URLs to correct base
// - Includes credentials for CORS (cookie fallback)
// - Injects JWT Authorization header from authTokenStore (primary auth)
// - Returns parsed JSON on success
// - Throws Error on failure (with parsed error message if available)

import { getAuthToken } from './authTokenStore';

type FetchOptions = RequestInit & { headers?: Record<string, string> };

type ApiErrorPayload = {
  message?: string;
  error?: string | { message?: string; code?: string; type?: string };
  code?: string;
  requestId?: string;
  request_id?: string;
};

/** Resolve API base: use relative /api when on ke3p.com (Vercel rewrites to Railway); else env or fallback. Exported for api.ts. */
export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'www.ke3p.com' || host === 'ke3p.com') return ''; // Same-origin: /api → Vercel rewrite
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
  
  // Parse JSON response
  if (!response.ok) {
    let errorData: ApiErrorPayload | null = null;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }

    const errorMessage = pickApiErrorMessage(errorData, response);
    const error: any = new Error(errorMessage);
    error.status = response.status; // Attach status for handleAuthError
    error.response = response; // Attach response for additional context
    error.data = errorData;
    error.requestId = errorData?.requestId || errorData?.request_id || response.headers.get('x-request-id') || undefined;
    const errorCode = typeof errorData?.error === 'object'
      ? errorData.error.code || errorData.error.type
      : errorData?.code || (typeof errorData?.error === 'string' ? errorData.error : undefined);
    if (errorCode) {
      error.code = errorCode;
    }
    throw error;
  }
  
  // For successful responses, return parsed JSON
  return response.json();
}

function pickApiErrorMessage(errorData: ApiErrorPayload | null, response: Response): string {
  if (typeof errorData?.message === 'string' && errorData.message.trim()) {
    return errorData.message;
  }

  if (typeof errorData?.error === 'string' && errorData.error.trim()) {
    return errorData.error;
  }

  if (typeof errorData?.error === 'object' && typeof errorData.error.message === 'string' && errorData.error.message.trim()) {
    return errorData.error.message;
  }

  return `HTTP ${response.status}: ${response.statusText || 'Request failed'}`;
}

// Log API base in development
if ((import.meta as any)?.env?.DEV) {
  try { console.log('[Keeper] API base =', (import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com'); } catch {}
}
