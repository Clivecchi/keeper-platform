/**
 * Unified API client - single source of truth
 * Re-exports from apiFetch.ts which handles:
 * - Base URL resolution (VITE_API_URL)
 * - Explicit keeper_token injection
 * - credentials: 'include' for CORS
 * - JSON body/header defaults
 * - Error handling
 */
export { apiFetch } from './apiFetch';

export function SystemStatus(): Promise<any> {
  return apiFetch('/api/health', { method: 'GET' });
}

// Back-compat: expose API_BASE for legacy imports (e.g., AppLayout)
export const API_BASE: string | undefined = ((import.meta as any).env?.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

// Back-compat: expose simple api.{get,post} wrapper used by older pages
export const api = {
  get: (path: string, init?: RequestInit) => apiFetch(path, { ...(init || {}), method: 'GET' }),
  post: (path: string, body?: unknown, init?: RequestInit) =>
    apiFetch(path, {
      ...(init || {}),
      method: 'POST',
      body: typeof body === 'string' ? body : body != null ? JSON.stringify(body) : undefined,
    }),
};