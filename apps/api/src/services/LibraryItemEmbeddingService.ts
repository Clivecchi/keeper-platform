/**
 * LibraryItem embedding generation — OpenAI via resolveProviderApiKeyWithSource (env → user → platform).
 * Separate from SoleMemoryCard embedding stubs; LibraryItem-only infrastructure.
 */

import { prisma } from '@keeper/database';
import { resolveProviderApiKeyWithSource } from '../lib/resolveProviderApiKey.js';

export const LIBRARY_EMBEDDING_MODEL = 'text-embedding-3-small';
export const LIBRARY_EMBEDDING_DIMENSION = 1536;

export async function generateLibraryItemEmbeddingVector(
  text: string,
  userId?: string | null,
): Promise<number[] | null> {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const { key } = await resolveProviderApiKeyWithSource('openai', userId ?? undefined);
  if (!key) {
    console.warn('[LibraryItemEmbedding] No OpenAI key available for embedding generation');
    return null;
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LIBRARY_EMBEDDING_MODEL,
      input: trimmed.slice(0, 8000),
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error('[LibraryItemEmbedding] OpenAI embeddings API failed:', response.status, errText);
    return null;
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };
  const vector = payload.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length !== LIBRARY_EMBEDDING_DIMENSION) {
    console.error('[LibraryItemEmbedding] Unexpected embedding shape:', vector?.length);
    return null;
  }
  return vector;
}

export async function storeLibraryItemEmbedding(
  libraryItemId: string,
  vector: number[],
): Promise<boolean> {
  if (vector.length !== LIBRARY_EMBEDDING_DIMENSION) return false;

  try {
    await prisma.libraryItem.update({
      where: { id: libraryItemId },
      data: { embedding: vector },
    });
    return true;
  } catch (err) {
    console.error('[LibraryItemEmbedding] Failed to store embedding:', err);
    return false;
  }
}

export async function embedLibraryItemPerspective(
  libraryItemId: string,
  perspective: string,
  userId?: string | null,
): Promise<boolean> {
  const vector = await generateLibraryItemEmbeddingVector(perspective, userId);
  if (!vector) return false;
  return storeLibraryItemEmbedding(libraryItemId, vector);
}

/** Diagnostic helper — confirms pgvector extension on the connected database. */
export async function diagnosePgVectorExtension(): Promise<{
  enabled: boolean;
  version: string | null;
  storageMode: 'pgvector' | 'float_array';
  note: string;
}> {
  try {
    const rows = await prisma.$queryRaw<Array<{ extname: string; extversion: string | null }>>`
      SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'
    `;
    const row = rows[0];
    const enabled = Boolean(row);
    return {
      enabled,
      version: row?.extversion ?? null,
      storageMode: enabled ? 'pgvector' : 'float_array',
      note: enabled
        ? 'pgvector extension is enabled — migrate embedding column to vector(1536) when ready.'
        : 'pgvector extension is not installed on this Postgres host. LibraryItem.embedding uses DOUBLE PRECISION[] (Pass 1 fallback).',
    };
  } catch (err) {
    console.error('[LibraryItemEmbedding] pgvector diagnostic failed:', err);
    return {
      enabled: false,
      version: null,
      storageMode: 'float_array',
      note: 'Could not query pg_extension; using float_array storage fallback.',
    };
  }
}
