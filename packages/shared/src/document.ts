/**
 * Document + Point — Chronicle read/presentation contracts.
 *
 * - Point = atomic card (identity, title, body, status, Gloss)
 * - Document = Dialog-scoped container (cover + Points, lifecycle status)
 *
 * See docs/chronicle-document-architecture.md
 */

import type { GlossAnchor, GlossContentSnapshot } from './glossAnchor.js';

export type PointStatusTone = 'pending' | 'active' | 'error';

/** @deprecated Use PointStatusTone — alias during Document/Point naming settle. */
export type DocumentStatusTone = PointStatusTone;

/**
 * Cast Note — a voice-card beat attached to a Document Point.
 * Same shape as Dialog castVoices; Cast link on the Point opens these.
 */
export interface PointCastNote {
  slug?: string;
  attributedTo: string;
  content: string;
  status?: 'ok' | 'failed' | 'empty';
}

/**
 * Atomic card — one identity, one title, one body, one status, Gloss, Cast Notes.
 * This is what PointView renders.
 */
export interface Point {
  identity: { label: string; subtitle?: string; voice?: string };
  title: string;
  lede?: string;
  body: { text: string; clampLines?: number; expandable?: boolean };
  status?: { label: string; tone: PointStatusTone };
  gloss?: { anchor: GlossAnchor; snapshot?: GlossContentSnapshot };
  /** Cast Notes — voice cards associated with this Point (Cast link opens them). */
  cast?: { notes: PointCastNote[] };
  /** ISO time Point body last changed (from DraftPoint.updatedAt) — for “Updated” cues. */
  revisedAt?: string;
}

/**
 * @deprecated Use Point. Kept so early rename call sites that imported `Document`
 * as the atomic card continue to type-check during the container split.
 */
export type DocumentCard = Point;

/** Nav / Document lifecycle — Drafts → Kept → Presented as status, not separate models. */
export const DOCUMENT_LIFECYCLE_STATUSES = ['drafts', 'kept', 'presented'] as const;
export type DocumentLifecycleStatus = (typeof DOCUMENT_LIFECYCLE_STATUSES)[number];

export interface DocumentPathGroup {
  id: string;
  title?: string;
  prelude?: string;
  pointIds: string[];
  /** Optional section header imagery. */
  imageUrl?: string;
}

/**
 * Path declaration stored on Dialog.document_paths — titles once per Document.
 * Point membership is resolved at read time via DraftPoint.pathGroupId / entry.pathId.
 */
export interface DocumentPathDeclaration {
  id: string;
  title: string;
  prelude?: string;
  imageUrl?: string;
}

export function isDocumentPathDeclaration(value: unknown): value is DocumentPathDeclaration {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === 'string' && row.id.trim().length > 0
    && typeof row.title === 'string' && row.title.trim().length > 0;
}

export function parseDocumentPathDeclarations(value: unknown): DocumentPathDeclaration[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isDocumentPathDeclaration)
    .map((row) => ({
      id: row.id.trim(),
      title: row.title.trim(),
      ...(typeof row.prelude === 'string' && row.prelude.trim()
        ? { prelude: row.prelude.trim() }
        : {}),
      ...(typeof (row as { imageUrl?: unknown }).imageUrl === 'string'
        && (row as { imageUrl: string }).imageUrl.trim()
        ? { imageUrl: (row as { imageUrl: string }).imageUrl.trim() }
        : {}),
    }));
}

/**
 * Authored destination (Forward Layer 1) — stable North Star for the Document.
 * Distinct from DocumentStep, which is the live tip of the lineage.
 */
export interface DocumentForward {
  title: string;
  description: string;
  /** Optional cover imagery for picture-book Document headers. */
  imageUrl?: string;
}

/**
 * Current tip of Forward's lineage — a Point/Moment role, not a new entity.
 * See docs/chronicle-document-architecture.md (2026-07-19 Step decision).
 */
export interface DocumentStep {
  title: string;
  body: string;
}

/**
 * Document — one per Dialog. Cover + Points (optionally grouped by Path).
 * Durable identity is Dialog.id; kip_drafts holds the Point manuscript via dialog_id.
 */
export interface Document {
  dialogId: string;
  status: DocumentLifecycleStatus;
  title: string;
  cover?: { label: string; subtitle?: string; voice?: string };
  /** Authored destination — replaces a plain title/subtitle header when rendered. */
  forward?: DocumentForward;
  /** Live tip of the lineage when known; Back/Forward nav stays disabled until Layer 3. */
  step?: DocumentStep;
  paths: DocumentPathGroup[];
  points: Point[];
}

export function isDocumentLifecycleStatus(value: unknown): value is DocumentLifecycleStatus {
  return typeof value === 'string'
    && (DOCUMENT_LIFECYCLE_STATUSES as readonly string[]).includes(value);
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
