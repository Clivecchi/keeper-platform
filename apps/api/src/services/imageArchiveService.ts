/**
 * Archive remote images (e.g. Together AI hosted URLs) into Vercel Blob storage.
 */

import { put } from '@vercel/blob';
import { prisma } from '@keeper/database';
import { contextualizeLibraryItem } from './LibraryItemIngestionService.js';
import { resolveLibraryChronicleDefaults } from '@keeper/shared';

const IMAGE_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function extensionForContentType(contentType: string): string {
  switch (contentType) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
}

function isBlobStorageUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

export function extractMarkdownImageUrl(body: string): string | null {
  const match = body.match(/!\[[^\]]*\]\(([^)]+)\)/);
  const candidate = match?.[1]?.trim();
  return candidate || null;
}

export { mergePresenceSchemaCover } from '@keeper/shared';

export async function archiveRemoteImageToBlob(params: {
  sourceUrl: string;
  userId: string;
  domainId: string;
  filenameHint?: string;
}): Promise<{ url: string; key: string; contentType: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error('BLOB_READ_WRITE_TOKEN not configured');
  }

  if (isBlobStorageUrl(params.sourceUrl)) {
    return {
      url: params.sourceUrl,
      key: params.sourceUrl,
      contentType: 'image/jpeg',
    };
  }

  const response = await fetch(params.sourceUrl, {
    headers: { Accept: 'image/*' },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch image (${response.status})`);
  }

  const contentType = (response.headers.get('content-type') || 'image/jpeg')
    .split(';')[0]
    .trim()
    .toLowerCase();
  if (!IMAGE_CONTENT_TYPES.has(contentType)) {
    throw new Error(`Unsupported image content type: ${contentType}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const safeHint = (params.filenameHint ?? 'generated-image')
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .slice(0, 80);
  const ext = extensionForContentType(contentType);
  const key = [
    'uploads',
    params.userId,
    'library',
    'domain',
    params.domainId,
    'generated',
    `${Date.now()}-${safeHint}.${ext}`,
  ].join('/');

  const blob = await put(key, buffer, {
    access: 'public',
    contentType,
    token,
  });

  return { url: blob.url, key, contentType };
}

export async function persistImageToLibrary(params: {
  sourceUrl: string;
  userId: string;
  domainId: string;
  displayLabel?: string | null;
  keeperId?: string | null;
}): Promise<{ libraryItemId: string; persistedUrl: string }> {
  const archived = await archiveRemoteImageToBlob({
    sourceUrl: params.sourceUrl,
    userId: params.userId,
    domainId: params.domainId,
    filenameHint: params.displayLabel ?? 'kip-generated',
  });

  const defaults = resolveLibraryChronicleDefaults();
  const created = await prisma.libraryItem.create({
    data: {
      domain_id: params.domainId,
      source_type: 'upload',
      source_ref: archived.url,
      display_label: params.displayLabel?.trim() || 'Generated image',
      assigned_keeper_id: params.keeperId ?? null,
      chronicle_blocks: defaults.chronicle_blocks,
      chronicle_actions: defaults.chronicle_actions,
    },
  });

  void contextualizeLibraryItem({
    libraryItemId: created.id,
    sourceType: 'upload',
    sourceRef: archived.url,
    displayLabel: created.display_label,
    userId: params.userId,
  }).catch((err) => {
    console.warn('[imageArchive] library ingestion failed (non-fatal):', err);
  });

  return { libraryItemId: created.id, persistedUrl: archived.url };
}

export function replaceMarkdownImageUrl(body: string, nextUrl: string): string {
  if (/!\[[^\]]*\]\([^)]+\)/.test(body)) {
    return body.replace(/!\[([^\]]*)\]\([^)]+\)/, `![$1](${nextUrl})`);
  }
  return `${body.trim()}\n\n![image](${nextUrl})`.trim();
}
