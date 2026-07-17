/**
 * Document — read/presentation contract for Chronicle Focus mode (atomic card / Point).
 * See docs/chronicle-document-architecture.md
 */

import type { GlossAnchor, GlossContentSnapshot } from './glossAnchor.js';

export type DocumentStatusTone = 'pending' | 'active' | 'error';

/** Atomic-card status tone — same as DocumentStatusTone. */
export type PointStatusTone = DocumentStatusTone;

/**
 * Read/presentation contract for one atomic card (identity, title, body, status, Gloss).
 * Architecture doc also calls this a Point; both names export the same shape.
 */
export interface Document {
  identity: { label: string; subtitle?: string; voice?: string };
  title: string;
  lede?: string;
  body: { text: string; clampLines?: number; expandable?: boolean };
  status?: { label: string; tone: DocumentStatusTone };
  gloss?: { anchor: GlossAnchor; snapshot?: GlossContentSnapshot };
}

/** Atomic-card alias — identical to Document. */
export type Point = Document;

/** Ephemeral synthetic gloss — session-scoped, anchored to Dialog message stream. */
export function buildEphemeralSyntheticGlossAnchor(params: {
  stableKey: string;
  messageId: string;
  entityId?: string;
}): GlossAnchor {
  return {
    entityKind: 'message',
    entityId: params.entityId ?? params.messageId,
    messageId: params.messageId,
    nodeId: `synthetic-${params.stableKey}`,
  };
}

/** Persisted synthetic content should promote to LibraryItem — gloss uses library anchor. */
export function buildLibraryGlossAnchor(libraryItemId: string): GlossAnchor {
  return {
    entityKind: 'library',
    entityId: libraryItemId,
    nodeId: 'card',
  };
}
