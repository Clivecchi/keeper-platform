/**
 * LibraryItem semantic search ΓÇö cosine similarity over stored Float[] embeddings.
 * Pass 1: no pgvector required; uses in-memory scan per domain.
 */

import { prisma } from '@keeper/database';
import { generateLibraryItemEmbeddingVector } from './LibraryItemEmbeddingService.js';

export type LibrarySearchResult = {
  id: string;
  domain_id: string;
  display_label: string | null;
  source_type: string;
  agent_perspective: string | null;
  score: number;
};

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function searchLibraryItems(params: {
  domainId: string;
  query: string;
  limit?: number;
  userId?: string | null;
}): Promise<LibrarySearchResult[]> {
  const trimmed = params.query.trim();
  if (!trimmed) return [];

  const limit = Math.min(Math.max(params.limit ?? 10, 1), 50);

  const queryVector = await generateLibraryItemEmbeddingVector(trimmed, params.userId);
  if (!queryVector) return [];

  const rows = await prisma.libraryItem.findMany({
    where: {
      domain_id: params.domainId,
      embedding: { isEmpty: false },
    },
    select: {
      id: true,
      domain_id: true,
      display_label: true,
      source_type: true,
      agent_perspective: true,
      embedding: true,
    },
    orderBy: { updated_at: 'desc' },
    take: 500,
  });

  const scored = rows
    .map((row) => ({
      id: row.id,
      domain_id: row.domain_id,
      display_label: row.display_label,
      source_type: row.source_type,
      agent_perspective: row.agent_perspective,
      score: cosineSimilarity(queryVector, row.embedding),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
