/**
 * Blob proxy URL helper - routes ALL Vercel Blob URLs through our API.
 *
 * Direct blob URLs fail with "Failed to fetch" (CORS) when used as
 * background-image from www.ke3p.com. The proxy is same-origin, so
 * the browser requests our API; our server fetches the blob (no CORS).
 *
 * On ke3p.com uses relative /api/uploads/proxy (Vercel rewrites to API).
 */

const BLOB_HOST_PATTERN = /\.(public|private)\.blob\.vercel-storage\.com/;

const API_BASE = ((import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com').replace(/\/$/, '');

function getProxyBase(): string {
  if (typeof window === 'undefined') return API_BASE;
  const host = window.location.hostname;
  if (host === 'www.ke3p.com' || host === 'ke3p.com') return '';
  return API_BASE;
}

export function getBlobProxyUrl(url: string): string {
  if (!BLOB_HOST_PATTERN.test(url)) return url;
  const base = getProxyBase();
  const path = `/api/uploads/proxy?url=${encodeURIComponent(url)}`;
  return base ? `${base}${path}` : path;
}
