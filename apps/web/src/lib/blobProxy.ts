/**
 * Blob proxy URL helper - routes ALL Vercel Blob URLs through our API.
 *
 * Direct blob URLs fail with "Failed to fetch" (CORS) when used as
 * background-image from www.ke3p.com. The proxy is same-origin, so
 * the browser requests our API; our server fetches the blob (no CORS).
 *
 * On ke3p.com uses relative /api/uploads/proxy (Vercel rewrites to API).
 */

import { getApiBase } from './apiFetch';

const BLOB_HOST_PATTERN = /\.(public|private)\.blob\.vercel-storage\.com/;

function getProxyBase(): string {
  return getApiBase(); // '' on ke3p.com (relative /api), else env or api.ke3p.com
}

export function getBlobProxyUrl(url: string): string {
  if (!BLOB_HOST_PATTERN.test(url)) return url;
  const base = getProxyBase();
  const path = `/api/uploads/proxy?url=${encodeURIComponent(url)}`;
  return base ? `${base}${path}` : path;
}
