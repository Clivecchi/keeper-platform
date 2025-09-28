/**
 * Centralized API fetch helper for the SPA.
 * - Normalizes path to start with "/"
 * - Preserves "/api/..." prefix shape
 * - Prefixes with VITE_API_URL when defined
 * - Sends credentials, default JSON headers
 * - Throws on non-OK responses with a readable error
 * - Returns JSON when possible, otherwise text
 */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<any> {
  const rawBase = (import.meta as any).env?.VITE_API_URL as string | undefined;
  const base = typeof rawBase === 'string' ? rawBase.replace(/\/$/, '') : '';

  const normalizedPath = (() => {
    const ensured = path.startsWith('/') ? path : `/${path}`;
    // Keep "/api/..." shape (ensure exactly one leading slash before api)
    return ensured.replace(/^\/?api\//, '/api/');
  })();

  const url = base ? `${base}${normalizedPath}` : normalizedPath;

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const headers: HeadersInit | undefined = (() => {
    if (!init.headers) return defaultHeaders;
    // Allow caller to override Content-Type
    const provided = init.headers as HeadersInit;
    if (Array.isArray(provided)) return provided;
    if (provided instanceof Headers) return provided;
    return { ...defaultHeaders, ...provided };
  })();

  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers,
  });

  if (!response.ok) {
    let message: string;
    try {
      const text = await response.text();
      message = text || response.statusText;
    } catch {
      message = response.statusText;
    }
    throw new Error(`HTTP ${response.status}: ${message}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('application/json')) {
    return response.json();
  }
  return response.text();
}

export function SystemStatus(): Promise<any> {
  return apiFetch('/api/health', { method: 'GET' });
}

// Back-compat: expose API_BASE for legacy imports (e.g., AppLayout)
export const API_BASE: string | undefined = ((import.meta as any).env?.VITE_API_URL as string | undefined)?.replace(/\/$/, '');