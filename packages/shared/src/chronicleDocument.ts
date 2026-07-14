/**
 * ChronicleDocument — read/presentation contract for Chronicle Focus mode.
 * See docs/chronicle-document-architecture.md
 */

import type { GlossAnchor, GlossContentSnapshot } from './glossAnchor.js';

export type ChronicleDocumentStatusTone = 'pending' | 'active' | 'error';

export interface ChronicleDocument {
  identity: { label: string; subtitle?: string; voice?: string };
  title: string;
  lede?: string;
  body: { text: string; clampLines?: number; expandable?: boolean };
  status?: { label: string; tone: ChronicleDocumentStatusTone };
  gloss?: { anchor: GlossAnchor; snapshot?: GlossContentSnapshot };
}

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
