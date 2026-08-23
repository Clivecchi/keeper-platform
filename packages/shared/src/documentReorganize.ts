/**
 * Review & Reorganize — proposed composition of an existing Dialog Document.
 *
 * The change set is the machine contract (Apply, undo, provenance).
 * Chronicle renders the Document as it could become — not a mutation list.
 *
 * Lead proposes. Keeper stores the difference. The human Applies.
 */

import type { DocumentPathDeclaration } from './document.js';
import { createDraftPoint, type DraftPoint } from './draftPoints.js';

export const DOCUMENT_REORGANIZE_VERSION = 1 as const;
export const DOCUMENT_REORGANIZE_SPEC_KEY = 'reorganizeProposal';

export const REORGANIZE_CHANGE_KINDS = [
  'unchanged',
  'new',
  'refine',
  'move',
  'merge',
  'retire',
] as const;

export type ReorganizeChangeKind = (typeof REORGANIZE_CHANGE_KINDS)[number];

export type ReorganizePointOp = {
  id: string;
  prelude?: string;
  content: string;
  sectionId?: string | null;
  change: ReorganizeChangeKind;
  fromSectionId?: string | null;
  originalPrelude?: string;
  originalContent?: string;
  replacesPointIds?: string[];
};

export type DocumentReorganizeProposal = {
  version: typeof DOCUMENT_REORGANIZE_VERSION;
  rationale?: string;
  proposedBy: string;
  createdAt: string;
  sections: DocumentPathDeclaration[];
  points: ReorganizePointOp[];
};

export type PointProposalMark = {
  kind: ReorganizeChangeKind;
  fromSectionTitle?: string | null;
  originalTitle?: string;
  originalBody?: string;
  replacesTitles?: string[];
};

export type ComposedProposedDocument = {
  sections: DocumentPathDeclaration[];
  points: DraftPoint[];
  marks: Record<string, PointProposalMark>;
};

const KIND_SET = new Set<string>(REORGANIZE_CHANGE_KINDS);

function trimmed(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const next = value.trim();
  return next ? next : null;
}

function isChangeKind(value: unknown): value is ReorganizeChangeKind {
  return typeof value === 'string' && KIND_SET.has(value);
}

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `rp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sectionTitle(
  sections: DocumentPathDeclaration[],
  sectionId: string | null | undefined,
): string | null {
  if (!sectionId || sectionId === 'open') return 'Open';
  return sections.find((section) => section.id === sectionId)?.title ?? sectionId;
}

export function parseDocumentReorganizeProposal(raw: unknown): DocumentReorganizeProposal | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const rec = raw as Record<string, unknown>;
  const pointsIn = Array.isArray(rec.points) ? rec.points : [];
  const sectionsIn = Array.isArray(rec.sections) ? rec.sections : [];
  const points: ReorganizePointOp[] = [];

  for (const item of pointsIn) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const change = isChangeKind(row.change) ? row.change : 'unchanged';
    const id = trimmed(row.id) ?? (change === 'new' || change === 'merge' ? newId() : null);
    const content = typeof row.content === 'string' ? row.content : '';
    if (!id) continue;
    if (change !== 'retire' && !content.trim() && !trimmed(row.prelude)) continue;
    const replaces = Array.isArray(row.replacesPointIds)
      ? row.replacesPointIds.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      : undefined;
    points.push({
      id,
      prelude: trimmed(row.prelude) ?? undefined,
      content,
      sectionId: row.sectionId === null ? null : trimmed(row.sectionId),
      change,
      fromSectionId: row.fromSectionId === null ? null : trimmed(row.fromSectionId),
      originalPrelude: trimmed(row.originalPrelude) ?? undefined,
      originalContent: typeof row.originalContent === 'string' ? row.originalContent : undefined,
      ...(replaces && replaces.length > 0 ? { replacesPointIds: replaces } : {}),
    });
  }

  if (points.length === 0) return null;

  const sections: DocumentPathDeclaration[] = [];
  for (const item of sectionsIn) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const id = trimmed(row.id);
    const title = trimmed(row.title);
    if (!id || !title || id === 'open') continue;
    sections.push({
      id,
      title,
      ...(trimmed(row.prelude) ? { prelude: trimmed(row.prelude)! } : {}),
    });
  }

  return {
    version: DOCUMENT_REORGANIZE_VERSION,
    rationale: trimmed(rec.rationale) ?? undefined,
    proposedBy: trimmed(rec.proposedBy) ?? 'Lead',
    createdAt: trimmed(rec.createdAt) ?? new Date().toISOString(),
    sections,
    points,
  };
}

/**
 * Complete a Lead payload against the current Document.
 * Listed ops win. Current Points not listed remain unchanged, so Proposed is always a full Document.
 */
export function normalizeDocumentReorganizeProposal(input: {
  raw: unknown;
  currentPoints: DraftPoint[];
  currentSections: DocumentPathDeclaration[];
  proposedBy?: string;
}): { ok: true; proposal: DocumentReorganizeProposal } | { ok: false; error: string } {
  const parsed = parseDocumentReorganizeProposal(input.raw);
  if (!parsed) {
    return { ok: false, error: 'A reorganize proposal needs at least one Point.' };
  }

  const currentById = new Map(input.currentPoints.map((point) => [point.id, point]));
  const listed = new Set<string>();
  const replaced = new Set<string>();
  const points: ReorganizePointOp[] = [];

  for (const op of parsed.points) {
    if (op.change === 'new') {
      const id = currentById.has(op.id) ? newId() : op.id;
      points.push({ ...op, id, change: 'new' });
      listed.add(id);
      continue;
    }

    if (op.change === 'merge') {
      const replaces = (op.replacesPointIds ?? []).filter((id) => currentById.has(id));
      if (replaces.length === 0) {
        return { ok: false, error: 'A merge must name the Points it replaces.' };
      }
      replaces.forEach((id) => replaced.add(id));
      const id = currentById.has(op.id) && !replaces.includes(op.id) ? newId() : op.id;
      points.push({
        ...op,
        id,
        change: 'merge',
        replacesPointIds: replaces.length > 0 ? replaces : op.replacesPointIds,
      });
      listed.add(id);
      continue;
    }

    const current = currentById.get(op.id);
    if (!current) {
      return { ok: false, error: `Unknown Point ${op.id} — Review can refine existing Points, not invent ids.` };
    }
    listed.add(op.id);
    const currentSection = current.pathGroupId ?? null;
    points.push({
      ...op,
      prelude: op.prelude ?? current.prelude,
      content: op.content.trim() ? op.content : current.content,
      sectionId: op.sectionId === undefined ? currentSection : op.sectionId,
      fromSectionId: op.fromSectionId ?? currentSection,
      originalPrelude: op.originalPrelude ?? current.prelude,
      originalContent: op.originalContent ?? current.content,
    });
  }

  for (const current of input.currentPoints) {
    if (listed.has(current.id) || replaced.has(current.id)) continue;
    points.push({
      id: current.id,
      prelude: current.prelude,
      content: current.content,
      sectionId: current.pathGroupId ?? null,
      change: 'unchanged',
      fromSectionId: current.pathGroupId ?? null,
      originalPrelude: current.prelude,
      originalContent: current.content,
    });
  }

  return {
    ok: true,
    proposal: {
      ...parsed,
      proposedBy: input.proposedBy?.trim() || parsed.proposedBy,
      sections: parsed.sections.length > 0 ? parsed.sections : input.currentSections,
      points,
    },
  };
}

export function composeProposedDocument(input: {
  currentPoints: DraftPoint[];
  currentSections: DocumentPathDeclaration[];
  proposal: DocumentReorganizeProposal;
}): ComposedProposedDocument {
  const currentById = new Map(input.currentPoints.map((point) => [point.id, point]));
  const sections = input.proposal.sections.length > 0 ? input.proposal.sections : input.currentSections;
  const points: DraftPoint[] = [];
  const marks: Record<string, PointProposalMark> = {};

  for (const op of input.proposal.points) {
    const current = currentById.get(op.id);
    const sectionId = op.sectionId === undefined ? current?.pathGroupId : op.sectionId ?? undefined;
    const draft: DraftPoint = current
      ? {
          ...current,
          prelude: op.prelude ?? current.prelude,
          content: op.change === 'retire' ? current.content : (op.content.trim() || current.content),
          pathGroupId: sectionId,
        }
      : createDraftPoint({
          id: op.id,
          content: op.content.trim() || op.prelude || 'New Point',
          proposedBy: input.proposal.proposedBy,
          status: 'accepted',
          prelude: op.prelude,
          pathGroupId: sectionId ?? undefined,
        });
    points.push(draft);

    const fromId = op.fromSectionId ?? current?.pathGroupId ?? null;
    const fromTitle =
      op.change === 'move' || (op.change === 'retire' && fromId)
        ? sectionTitle(input.currentSections, fromId)
        : null;
    const replacesTitles = (op.replacesPointIds ?? [])
      .map((id) => {
        const source = currentById.get(id);
        return source ? (source.prelude?.trim() || source.content.trim().slice(0, 48)) : null;
      })
      .filter((title): title is string => Boolean(title));

    if (op.change !== 'unchanged') {
      marks[op.id] = {
        kind: op.change,
        fromSectionTitle: fromTitle,
        originalTitle: op.originalPrelude ?? current?.prelude,
        originalBody: op.originalContent ?? current?.content,
        ...(replacesTitles.length > 0 ? { replacesTitles } : {}),
      };
    }
  }

  return { sections, points, marks };
}

export function reorganizeChangeLabel(kind: ReorganizeChangeKind): string {
  switch (kind) {
    case 'new':
      return 'New';
    case 'refine':
      return 'Refined';
    case 'move':
      return 'Moved';
    case 'merge':
      return 'Merged';
    case 'retire':
      return 'Retire';
    case 'unchanged':
      return '';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function readReorganizeProposalFromSpec(spec: unknown): DocumentReorganizeProposal | null {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return null;
  return parseDocumentReorganizeProposal(
    (spec as Record<string, unknown>)[DOCUMENT_REORGANIZE_SPEC_KEY],
  );
}

function isCastNote(point: DraftPoint): boolean {
  return Boolean(point.referencesPointId?.trim());
}

/**
 * Apply the stored proposal to current Points. Used by Keeper Apply.
 * Cast Notes stay attached; retired/replaced hosts drop their notes.
 */
export function applyReorganizeToPoints(input: {
  currentPoints: DraftPoint[];
  proposal: DocumentReorganizeProposal;
  proposedBy?: string;
}): DraftPoint[] {
  const currentById = new Map(input.currentPoints.map((point) => [point.id, point]));
  const retired = new Set<string>();
  const replaced = new Set<string>();

  for (const op of input.proposal.points) {
    if (op.change === 'retire') retired.add(op.id);
    if (op.change === 'merge') {
      for (const id of op.replacesPointIds ?? []) replaced.add(id);
    }
  }

  const next: DraftPoint[] = [];
  const seen = new Set<string>();
  const now = new Date().toISOString();

  for (const op of input.proposal.points) {
    if (op.change === 'retire') continue;
    if (replaced.has(op.id) && op.change !== 'merge') continue;

    const current = currentById.get(op.id);
    const sectionId =
      op.sectionId === undefined
        ? current?.pathGroupId
        : op.sectionId && op.sectionId !== 'open'
          ? op.sectionId
          : undefined;
    const proposedBy = input.proposedBy?.trim() || input.proposal.proposedBy;

    if (!current || op.change === 'new') {
      next.push(
        createDraftPoint({
          id: op.id,
          content: op.content.trim() || op.prelude || 'New Point',
          proposedBy,
          status: 'accepted',
          prelude: op.prelude,
          pathGroupId: sectionId,
        }),
      );
    } else {
      next.push({
        ...current,
        prelude: op.prelude ?? current.prelude,
        content: op.content.trim() || current.content,
        pathGroupId: sectionId,
        updatedAt: now,
      });
    }
    seen.add(op.id);
  }

  for (const current of input.currentPoints) {
    if (seen.has(current.id) || retired.has(current.id) || replaced.has(current.id)) continue;
    if (isCastNote(current)) {
      const host = current.referencesPointId?.trim();
      if (host && (retired.has(host) || replaced.has(host))) continue;
    }
    next.push(current);
  }

  return next;
}
