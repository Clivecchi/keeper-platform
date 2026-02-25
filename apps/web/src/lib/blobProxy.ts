/**
 * Blob proxy URL helper - routes Vercel Blob URLs through our API
 * to avoid 401 when the blob store is private or has access restrictions.
 *
 * Public blobs (*.public.blob.vercel-storage.com) are used directly since they
 * are publicly readable; the proxy can return 500 or add latency.
 */

const BLOB_HOST_PATTERN = /\.(public|private)\.blob\.vercel-storage\.com/;
const PUBLIC_BLOB_PATTERN = /\.public\.blob\.vercel-storage\.com/;

export function getBlobProxyUrl(url: string): string {
  if (!BLOB_HOST_PATTERN.test(url)) return url;
  // Public blobs are directly accessible; bypass proxy to avoid 500/failures
  if (PUBLIC_BLOB_PATTERN.test(url)) return url;
  const apiBase = (import.meta as any)?.env?.VITE_API_URL || 'https://api.ke3p.com';
  const base = apiBase.replace(/\/$/, '');
  return `${base}/api/uploads/proxy?url=${encodeURIComponent(url)}`;
}
