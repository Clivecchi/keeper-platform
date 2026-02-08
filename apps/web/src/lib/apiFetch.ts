// apps/web/src/lib/apiFetch.ts
// Unified API fetch wrapper that:
// - Resolves API URLs to correct base
// - Includes credentials for CORS (cookie fallback)
// - Injects JWT Authorization header from authTokenStore (primary auth)
// - Returns parsed JSON on success
// - Throws Error on failure (with parsed error message if available)

import { getAuthToken } from './authTokenStore';

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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
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
    // For error responses, try to parse JSON error message
    try {
      const errorData = await response.json();
      const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
      const error: any = new Error(errorMessage);
      error.status = response.status; // Attach status for handleAuthError
      error.response = response; // Attach response for additional context
      if (errorData?.error) {
        error.code = errorData.error;
      }
      error.data = errorData;
      throw error;
    } catch (err) {
      // If JSON parsing fails or we already threw, use status code
      if (err instanceof Error && err.message.startsWith('HTTP')) {
        // Re-throw our custom error (already has status attached from above)
        if (!(err as any).status) {
          (err as any).status = response.status;
          (err as any).response = response;
        }
        throw err;
      }
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status; // Attach status for handleAuthError
      error.response = response; // Attach response for additional context
      throw error;
    }
  }
  
  // For successful responses, return parsed JSON
  return response.json();
}

// Log API base in development
if ((import.meta as any)?.env?.DEV) {
  try { console.log('[Keeper] API base =', (import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com'); } catch {}
}
