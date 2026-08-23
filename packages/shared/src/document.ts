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
 * Quieter Section for Points that do not yet have an authored Section.
 * Always available on every named Dialog Document.
 */
export const DOCUMENT_OPEN_SECTION = {
  id: 'open',
  title: 'Open',
  prelude: 'Points that do not yet have a Section.',
} as const;

/** Authored Sections use Domain treatment accent. Open is quieter. */
export type DocumentSectionWeight = 'authored' | 'open';

/**
 * Section declaration stored on Dialog.document_paths — titles once per Document.
 * User-facing name is Section. Storage still uses document_paths / pathGroupId
 * until that column is renamed.
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
 * Draft registered as a Document component (not manuscript Point storage).
 * Stored on Dialog.document_components — distinct from Nav-only dialog_id links.
 */
export interface DocumentComponentDeclaration {
  draftId: string;
  order?: number;
  label?: string;
}

export function isDocumentComponentDeclaration(
  value: unknown,
): value is DocumentComponentDeclaration {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return typeof row.draftId === 'string' && row.draftId.trim().length > 0;
}

export function parseDocumentComponentDeclarations(
  value: unknown,
): DocumentComponentDeclaration[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: DocumentComponentDeclaration[] = [];
  for (const raw of value) {
    if (!isDocumentComponentDeclaration(raw)) continue;
    const draftId = raw.draftId.trim();
    if (!draftId || seen.has(draftId)) continue;
    seen.add(draftId);
    const order =
      typeof raw.order === 'number' && Number.isFinite(raw.order)
        ? Math.floor(raw.order)
        : undefined;
    const label =
      typeof raw.label === 'string' && raw.label.trim()
        ? raw.label.trim()
        : undefined;
    out.push({
      draftId,
      ...(order !== undefined ? { order } : {}),
      ...(label ? { label } : {}),
    });
  }
  out.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return out;
}

/**
 * Directional objective of the Dialog — where this conversation is going.
 * Every named Dialog Document can have a Forward. Distinct from DocumentStep
 * (the live tip) and from the Document’s name.
 */
export interface DocumentForward {
  title: string;
  description: string;
  /** Optional cover imagery for picture-book Document headers. */
  imageUrl?: string;
}

export type ResolveDocumentForwardInput = {
  forwardTitle?: string | null;
  forwardDescription?: string | null;
  dialogTitle?: string | null;
  imageUrl?: string | null;
};

/**
 * Every named Document resolves a Forward.
 * Authored title/description win. Otherwise the Dialog title holds the slot
 * until the directional objective is written.
 */
export function resolveDocumentForward(
  input: ResolveDocumentForwardInput,
): DocumentForward {
  const authoredTitle = input.forwardTitle?.trim() ?? '';
  const dialogTitle = input.dialogTitle?.trim() ?? '';
  const description = input.forwardDescription?.trim() ?? '';
  const imageUrl = input.imageUrl?.trim() ?? '';
  return {
    title: authoredTitle || dialogTitle || 'Forward',
    description,
    ...(imageUrl ? { imageUrl } : {}),
  };
}

export function isAuthoredDocumentForward(input: ResolveDocumentForwardInput): boolean {
  return Boolean(input.forwardTitle?.trim() || input.forwardDescription?.trim());
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
 * Document — one per named Dialog. Forward + Sections + Points.
 * Durable identity is Dialog.id; kip_drafts holds the Point manuscript via dialog_id.
 */
/** Resolved Document component draft for Chronicle (presentation). */
export interface DocumentComponentDraft {
  draftId: string;
  title: string;
  kind: string;
  status: string;
  summary?: string | null;
  order?: number;
  label?: string;
}

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
  /** Non-manuscript drafts registered on this Document (not Point storage). */
  components?: DocumentComponentDraft[];
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

const SECTION_INTRO_MAX_CHARS = 160;

/**
 * High-level Section intro. Authored prelude wins.
 * Otherwise Keeper derives a short spine from Point titles — not a mutation list.
 */
export function resolveSectionIntro(input: {
  prelude?: string | null;
  pointTitles: string[];
  maxChars?: number;
}): string | null {
  const authored = input.prelude?.trim();
  if (authored) return authored;

  const titles = input.pointTitles
    .map((title) => title.trim())
    .filter((title) => title.length > 0);
  if (titles.length === 0) return null;

  const max = input.maxChars ?? SECTION_INTRO_MAX_CHARS;
  let out = titles[0] ?? '';
  for (let i = 1; i < titles.length; i += 1) {
    const next = `${out} · ${titles[i]}`;
    if (next.length > max) break;
    out = next;
  }
  if (out.length > max) {
    return `${out.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
  }
  return out;
}

export type SectionChangeCue = {
  kind: 'new' | 'refine' | 'move' | 'merge' | 'retire';
  count: number;
};

/** Compact Proposed-view cues for a Section — counts only, not a change manager. */
export function resolveSectionChangeCues(
  kinds: Array<'unchanged' | 'new' | 'refine' | 'move' | 'merge' | 'retire' | undefined>,
): SectionChangeCue[] {
  const counts: Record<SectionChangeCue['kind'], number> = {
    new: 0,
    refine: 0,
    move: 0,
    merge: 0,
    retire: 0,
  };
  for (const kind of kinds) {
    if (!kind || kind === 'unchanged') continue;
    counts[kind] += 1;
  }
  const order: SectionChangeCue['kind'][] = ['new', 'refine', 'move', 'merge', 'retire'];
  return order
    .filter((kind) => counts[kind] > 0)
    .map((kind) => ({ kind, count: counts[kind] }));
}
