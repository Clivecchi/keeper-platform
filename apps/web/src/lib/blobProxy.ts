/**
 * Blob proxy URL helper - routes Vercel Blob URLs through our API
 * to avoid 401 when the blob store is private or has access restrictions.
 *
 * Public blobs (*.public.blob.vercel-storage.com) use direct URL - they are
 * publicly readable. The proxy returns 500 for these, so bypass it.
 */

const BLOB_HOST_PATTERN = /\.(public|private)\.blob\.vercel-storage\.com/;
const PUBLIC_BLOB_PATTERN = /\.public\.blob\.vercel-storage\.com/;

const API_BASE = ((import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com').replace(/\/$/, '');

function getProxyBase(): string {
  if (typeof window === 'undefined') return API_BASE;
  const host = window.location.hostname;
  if (host === 'www.ke3p.com' || host === 'ke3p.com') return '';
  return API_BASE;
}

export function getBlobProxyUrl(url: string): string {
  if (!BLOB_HOST_PATTERN.test(url)) return url;
  // Public blobs: use direct URL (proxy returns 500 for these)
  if (PUBLIC_BLOB_PATTERN.test(url)) return url;
  const base = getProxyBase();
  const path = `/api/uploads/proxy?url=${encodeURIComponent(url)}`;
  return base ? `${base}${path}` : path;
}
