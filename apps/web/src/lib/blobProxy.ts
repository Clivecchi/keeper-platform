/**
 * Blob proxy URL helper - routes Vercel Blob URLs through our API
 * to avoid 401 when the blob store is private or has access restrictions.
 */

const BLOB_HOST_PATTERN = /\.(public|private)\.blob\.vercel-storage\.com/;

export function getBlobProxyUrl(url: string): string {
  if (!BLOB_HOST_PATTERN.test(url)) return url;
  const apiBase = (import.meta as any)?.env?.VITE_API_URL;
  const base = apiBase ? apiBase.replace(/\/$/, '') : '';
  return `${base}/api/uploads/proxy?url=${encodeURIComponent(url)}`;
}
