/**
 * Review & Reorganize — proposed composition of an existing Dialog Document.
 *
 * The change set is the machine contract (Apply, undo, provenance).
 * Chronicle renders the Document as it could become — not a mutation list.
 *
 * Lead proposes. Keeper stores the difference. The human Applies.
 */

import type { DocumentPathDeclaration } from './document.js';
import { isOpenSectionId } from './documentAuthoring.js';
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

export type DocumentForwardProposal = {
  title?: string;
  description?: string;
};

export type DocumentReorganizeProposal = {
  version: typeof DOCUMENT_REORGANIZE_VERSION;
  rationale?: string;
  proposedBy: string;
  createdAt: string;
  /** Proposed Dialog / Document name. Applied on human Apply. */
  title?: string;
  /** Proposed Forward (directional objective). Applied on human Apply. */
  forward?: DocumentForwardProposal;
  /** True when the Lead named Sections in this payload (not copied from Current). */
  leadNamedSections?: boolean;
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
  title?: string;
  forward?: DocumentForwardProposal;
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
  if (isOpenSectionId(sectionId) || !sectionId) return 'Open';
  return sections.find((section) => section.id === sectionId)?.title ?? sectionId;
}

const SECTION_ID_KEYS = ['sectionId', 'section', 'path', 'pathId', 'pathGroupId'] as const;

/**
 * Omitted sectionId means "keep the current Section".
 * Explicit null / "open" / empty means Open.
 */
function readOptionalSectionId(row: Record<string, unknown>): string | null | undefined {
  const hasKey = SECTION_ID_KEYS.some((key) => key in row && row[key] !== undefined);
  if (!hasKey) return undefined;
  for (const key of SECTION_ID_KEYS) {
    if (!(key in row) || row[key] === undefined) continue;
    const raw = row[key];
    if (raw === null) return null;
    const value = trimmed(raw);
    return value && !isOpenSectionId(value) ? value : null;
  }
  return undefined;
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function slugId(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || newId();
}

function documentHostPoints(points: DraftPoint[]): DraftPoint[] {
  return points.filter((point) => !point.referencesPointId?.trim());
}

function normalizeKey(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function oneBasedIndex(ref: string): number | null {
  const match = ref.trim().match(/^(?:point\s+|p)?(\d+)$/i);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Keeper owns identities. The Lead may refer to a Point by UUID, 1-based
 * number, or title. Title wins over number when both are present.
 */
export function resolveReorganizePointRef(
  ref: string | undefined,
  currentPoints: DraftPoint[],
  used: ReadonlySet<string>,
  hints?: { prelude?: string; content?: string },
): string | null {
  const hosts = documentHostPoints(currentPoints);
  const byId = new Map(currentPoints.map((point) => [point.id, point]));
  const available = (point: DraftPoint | undefined): point is DraftPoint =>
    Boolean(point && !used.has(point.id));

  const exact = ref ? byId.get(ref) : undefined;
  if (available(exact)) return exact.id;

  const preludeHint = normalizeKey(hints?.prelude);
  if (preludeHint) {
    const byPrelude = hosts.find(
      (point) => available(point) && normalizeKey(point.prelude) === preludeHint,
    );
    if (byPrelude) return byPrelude.id;
  }

  const contentHint = hints?.content?.trim();
  if (contentHint && contentHint.length >= 24) {
    const needle = contentHint.slice(0, 48).toLowerCase();
    const byContent = hosts.find(
      (point) =>
        available(point) && point.content.trim().toLowerCase().startsWith(needle),
    );
    if (byContent) return byContent.id;
  }

  const titleRef = normalizeKey(ref);
  if (titleRef && !oneBasedIndex(ref ?? '') && !isUuidLike(ref ?? '')) {
    const byTitle = hosts.find(
      (point) => available(point) && normalizeKey(point.prelude) === titleRef,
    );
    if (byTitle) return byTitle.id;
  }

  const index = ref ? oneBasedIndex(ref) : null;
  if (index != null) {
    const byIndex = hosts[index - 1];
    if (available(byIndex)) return byIndex.id;
  }

  return null;
}

/** Same identity rules as Review & Reorganize — one Point, no used-set. */
export function resolveDraftPointRef(
  ref: string | undefined,
  currentPoints: DraftPoint[],
  hints?: { prelude?: string; content?: string },
): string | null {
  return resolveReorganizePointRef(ref, currentPoints, new Set(), hints);
}

export function resolveReorganizeSectionId(
  ref: string | null | undefined,
  sections: DocumentPathDeclaration[],
): string | null {
  if (isOpenSectionId(ref) || !ref) return null;
  if (sections.some((section) => section.id === ref)) return ref;
  const byTitle = sections.find(
    (section) => normalizeKey(section.title) === normalizeKey(ref),
  );
  return byTitle?.id ?? ref;
}

/** Reuse current Section ids when the Lead restates the same titles. */
export function rematchProposedSections(
  proposed: DocumentPathDeclaration[],
  current: DocumentPathDeclaration[],
): DocumentPathDeclaration[] {
  if (proposed.length === 0) return current;
  const used = new Set<string>(['open']);
  return proposed.map((section) => {
    if (section.id && section.id !== 'open' && !used.has(section.id)
      && current.some((row) => row.id === section.id)) {
      used.add(section.id);
      return section;
    }
    const currentByTitle = current.find(
      (row) => normalizeKey(row.title) === normalizeKey(section.title) && !used.has(row.id),
    );
    if (currentByTitle) {
      used.add(currentByTitle.id);
      return { ...section, id: currentByTitle.id };
    }
    let id = section.id && section.id !== 'open' && !used.has(section.id)
      ? section.id
      : slugId(section.title);
    while (used.has(id)) {
      id = `${slugId(section.title)}-${used.size}`;
    }
    used.add(id);
    return { ...section, id };
  });
}

function resolveKeptSectionId(
  currentSectionId: string | null | undefined,
  sections: DocumentPathDeclaration[],
  currentSections: DocumentPathDeclaration[],
): string | null {
  if (isOpenSectionId(currentSectionId)) return null;
  if (sections.some((section) => section.id === currentSectionId)) {
    return currentSectionId ?? null;
  }
  const previous = currentSections.find((section) => section.id === currentSectionId);
  const remapped = previous
    && sections.find((section) => normalizeKey(section.title) === normalizeKey(previous.title));
  return remapped?.id ?? currentSectionId ?? null;
}

function pickString(row: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = trimmed(row[key]);
    if (value) return value;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function coerceDocumentForwardProposal(raw: unknown): DocumentForwardProposal | undefined {
  if (typeof raw === 'string' && raw.trim()) {
    return { description: raw.trim() };
  }
  if (!isRecord(raw)) return undefined;
  const nested = isRecord(raw.forward) ? raw.forward : null;
  const title =
    (nested ? pickString(nested, ['title', 'name', 'label']) : null)
    ?? pickString(raw, ['forwardTitle', 'forward_title']);
  const description =
    (nested
      ? pickString(nested, ['description', 'body', 'text', 'content', 'objective'])
      : null)
    ?? pickString(raw, [
      'forwardDescription',
      'forward_description',
      'objective',
      'forwardBody',
    ]);
  const fromString = typeof raw.forward === 'string' ? trimmed(raw.forward) : null;
  const nextDescription = description ?? fromString;
  if (!title && !nextDescription) return undefined;
  return {
    ...(title ? { title } : {}),
    ...(nextDescription ? { description: nextDescription } : {}),
  };
}

export function coerceDocumentTitleProposal(raw: unknown): string | null {
  if (!isRecord(raw)) return null;
  return pickString(raw, ['documentTitle', 'dialogTitle', 'document_title', 'dialog_title', 'title']);
}

export function hasDocumentIdentityProposal(proposal: {
  title?: string | null;
  forward?: DocumentForwardProposal | null;
}): boolean {
  return Boolean(
    proposal.title?.trim()
    || proposal.forward?.title?.trim()
    || proposal.forward?.description?.trim(),
  );
}

function coercePointRow(item: unknown, fallbackSectionId?: string | null): Record<string, unknown> | null {
  if (typeof item === 'string' && item.trim()) {
    return {
      prelude: item.trim(),
      change: fallbackSectionId ? 'move' : 'unchanged',
      ...(fallbackSectionId ? { sectionId: fallbackSectionId } : {}),
    };
  }
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
  const row = item as Record<string, unknown>;
  const prelude = pickString(row, ['prelude', 'title', 'name', 'label']);
  const content = pickString(row, ['content', 'body', 'text', 'narrative']) ?? '';
  const explicitSectionId = readOptionalSectionId(row);
  const sectionId = explicitSectionId !== undefined ? explicitSectionId : fallbackSectionId;
  const id = pickString(row, ['id', 'pointId', 'point']);
  const change = isChangeKind(row.change) ? row.change : sectionId ? 'move' : 'unchanged';
  return {
    ...row,
    ...(id ? { id } : {}),
    ...(prelude ? { prelude } : {}),
    content,
    ...(sectionId !== undefined ? { sectionId } : {}),
    change,
  };
}

/**
 * Accept the shapes the Lead actually emits: nested proposal, string Sections,
 * Points nested under Sections, title/body synonyms, missing change.
 */
export function coerceDocumentReorganizePayload(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const rec = raw as Record<string, unknown>;
  const nested =
    rec.proposal && typeof rec.proposal === 'object' && !Array.isArray(rec.proposal)
      ? (rec.proposal as Record<string, unknown>)
      : rec;
  const sectionsIn = Array.isArray(nested.sections)
    ? nested.sections
    : Array.isArray(nested.paths)
      ? nested.paths
      : [];
  let pointsIn = Array.isArray(nested.points)
    ? [...nested.points]
    : Array.isArray(nested.items)
      ? [...nested.items]
      : [];

  const sections: Array<Record<string, unknown>> = [];
  for (const item of sectionsIn) {
    if (typeof item === 'string' && item.trim() && item.trim().toLowerCase() !== 'open') {
      const title = item.trim();
      sections.push({ id: slugId(title), title });
      continue;
    }
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const title = pickString(row, ['title', 'name', 'label']);
    if (!title || title.toLowerCase() === 'open') continue;
    const id = pickString(row, ['id']) ?? slugId(title);
    sections.push({ ...row, id, title });
    const nestedPoints = row.points ?? row.items;
    if (Array.isArray(nestedPoints)) {
      for (const point of nestedPoints) {
        const coerced = coercePointRow(point, id);
        if (coerced) pointsIn.push(coerced);
      }
    }
  }

  const points = pointsIn
    .map((item) => coercePointRow(item))
    .filter((row): row is Record<string, unknown> => Boolean(row));

  const title = coerceDocumentTitleProposal(nested) ?? coerceDocumentTitleProposal(rec);
  const forward = coerceDocumentForwardProposal(nested) ?? coerceDocumentForwardProposal(rec);

  return {
    ...nested,
    rationale: pickString(nested, ['rationale', 'summary']) ?? pickString(rec, ['rationale', 'summary']) ?? undefined,
    ...(title ? { title } : {}),
    ...(forward ? { forward } : {}),
    sections,
    points,
  };
}

export function parseDocumentReorganizeProposal(raw: unknown): DocumentReorganizeProposal | null {
  const rec = coerceDocumentReorganizePayload(raw);
  const pointsIn = Array.isArray(rec.points) ? rec.points : [];
  const sectionsIn = Array.isArray(rec.sections) ? rec.sections : [];
  const points: ReorganizePointOp[] = [];

  for (const item of pointsIn) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const change = isChangeKind(row.change) ? row.change : 'unchanged';
    const id =
      trimmed(row.id)
      ?? trimmed(row.prelude)
      ?? (change === 'new' || change === 'merge' ? newId() : null);
    const content = typeof row.content === 'string' ? row.content : '';
    if (!id) continue;
    const replaces = Array.isArray(row.replacesPointIds)
      ? row.replacesPointIds.filter((value): value is string => typeof value === 'string' && Boolean(value.trim()))
      : undefined;
    points.push({
      id,
      prelude: trimmed(row.prelude) ?? undefined,
      content,
      sectionId: readOptionalSectionId(row),
      change,
      fromSectionId: row.fromSectionId === null ? null : trimmed(row.fromSectionId),
      originalPrelude: trimmed(row.originalPrelude) ?? undefined,
      originalContent: typeof row.originalContent === 'string' ? row.originalContent : undefined,
      ...(replaces && replaces.length > 0 ? { replacesPointIds: replaces } : {}),
    });
  }

  const sections: DocumentPathDeclaration[] = [];
  for (const item of sectionsIn) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const title = trimmed(row.title);
    if (!title || title.toLowerCase() === 'open') continue;
    const id = trimmed(row.id) && trimmed(row.id) !== 'open' ? trimmed(row.id)! : slugId(title);
    if (id === 'open') continue;
    sections.push({
      id,
      title,
      ...(trimmed(row.prelude) ? { prelude: trimmed(row.prelude)! } : {}),
    });
  }

  const title = coerceDocumentTitleProposal(rec);
  const forward = coerceDocumentForwardProposal(rec);
  const leadNamedSections =
    rec.leadNamedSections === true
      ? true
      : rec.leadNamedSections === false
        ? false
        : sections.length > 0;

  if (points.length === 0 && sections.length === 0 && !title && !forward) return null;

  return {
    version: DOCUMENT_REORGANIZE_VERSION,
    rationale: trimmed(rec.rationale) ?? undefined,
    proposedBy: trimmed(rec.proposedBy) ?? 'Lead',
    createdAt: trimmed(rec.createdAt) ?? new Date().toISOString(),
    ...(title ? { title } : {}),
    ...(forward ? { forward } : {}),
    leadNamedSections,
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
}): { ok: true; proposal: DocumentReorganizeProposal; openDumpRepaired: boolean } | { ok: false; error: string } {
  const parsed = parseDocumentReorganizeProposal(input.raw);
  if (!parsed) {
    return {
      ok: false,
      error: 'A reorganize proposal needs Sections or Points — Keeper will keep the rest of the Document.',
    };
  }

  const currentById = new Map(input.currentPoints.map((point) => [point.id, point]));
  const listed = new Set<string>();
  const replaced = new Set<string>();
  const points: ReorganizePointOp[] = [];
  const sections = rematchProposedSections(
    parsed.sections.length > 0 ? parsed.sections : input.currentSections,
    input.currentSections,
  );

  const takeRef = (ref: string | undefined, hints?: { prelude?: string; content?: string }) =>
    resolveReorganizePointRef(ref, input.currentPoints, listed, hints);

  for (const op of parsed.points) {
    const sectionId =
      op.sectionId === undefined ? undefined : resolveReorganizeSectionId(op.sectionId, sections);
    const fromSectionId =
      op.fromSectionId === undefined
        ? undefined
        : resolveReorganizeSectionId(op.fromSectionId, input.currentSections);

    if (op.change === 'new') {
      const id = currentById.has(op.id) || listed.has(op.id) ? newId() : op.id;
      points.push({ ...op, id, change: 'new', sectionId });
      listed.add(id);
      continue;
    }

    if (op.change === 'merge') {
      const replaces = (op.replacesPointIds ?? [])
        .map((ref) => takeRef(ref))
        .filter((id): id is string => Boolean(id));
      const resolved = takeRef(op.id, { prelude: op.prelude, content: op.content });
      const id = resolved && !replaces.includes(resolved) ? resolved : newId();
      if (replaces.length === 0) {
        points.push({
          ...op,
          id,
          change: 'new',
          sectionId,
          fromSectionId,
        });
        listed.add(id);
        continue;
      }
      replaces.forEach((replaceId) => replaced.add(replaceId));
      points.push({
        ...op,
        id,
        change: 'merge',
        sectionId,
        fromSectionId,
        replacesPointIds: replaces,
      });
      listed.add(id);
      continue;
    }

    const resolved = takeRef(op.id, { prelude: op.prelude, content: op.content });
    if (!resolved) {
      const id = newId();
      points.push({
        ...op,
        id,
        change: 'new',
        sectionId,
        fromSectionId,
      });
      listed.add(id);
      continue;
    }

    listed.add(resolved);
    const current = currentById.get(resolved);
    if (!current) continue;
    const currentSection = resolveKeptSectionId(
      current.pathGroupId ?? null,
      sections,
      input.currentSections,
    );
    points.push({
      ...op,
      id: resolved,
      prelude: op.prelude ?? current.prelude,
      content: op.content.trim() ? op.content : current.content,
      sectionId: sectionId === undefined ? currentSection : sectionId,
      fromSectionId: fromSectionId ?? current.pathGroupId ?? null,
      originalPrelude: op.originalPrelude ?? current.prelude,
      originalContent: op.originalContent ?? current.content,
    });
  }

  for (const current of input.currentPoints) {
    if (listed.has(current.id) || replaced.has(current.id)) continue;
    const currentSection = resolveKeptSectionId(
      current.pathGroupId ?? null,
      sections,
      input.currentSections,
    );
    points.push({
      id: current.id,
      prelude: current.prelude,
      content: current.content,
      sectionId: currentSection,
      change: 'unchanged',
      fromSectionId: current.pathGroupId ?? null,
      originalPrelude: current.prelude,
      originalContent: current.content,
    });
  }

  const assembled: DocumentReorganizeProposal = {
    ...parsed,
    proposedBy: input.proposedBy?.trim() || parsed.proposedBy,
    leadNamedSections: parsed.leadNamedSections === true,
    sections,
    points,
  };
  const openDumpRepaired = isDocumentReorganizeOpenDump(assembled, input.currentPoints);
  return {
    ok: true,
    openDumpRepaired,
    proposal: openDumpRepaired
      ? repairNamedWorkDumpedToOpen(assembled, input.currentPoints)
      : assembled,
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
    const sameSection =
      (isOpenSectionId(fromId) && isOpenSectionId(sectionId))
      || fromId === sectionId;
    const fromTitle =
      op.change === 'move'
      || (op.change !== 'new' && op.change !== 'unchanged' && !sameSection)
      || (op.change === 'retire' && Boolean(fromId))
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

  return {
    sections,
    points,
    marks,
    ...(input.proposal.title?.trim() ? { title: input.proposal.title.trim() } : {}),
    ...(input.proposal.forward ? { forward: input.proposal.forward } : {}),
  };
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

/**
 * True when every Point that already lives in a named Section would land in Open.
 * That is not a reorganization — Open is only for unplaced Points.
 */
export function isDocumentReorganizeOpenDump(
  proposal: DocumentReorganizeProposal,
  currentPoints: DraftPoint[],
): boolean {
  const named = documentHostPoints(currentPoints).filter(
    (point) => !isOpenSectionId(point.pathGroupId),
  );
  if (named.length === 0) return false;
  const surviving = named.filter((point) => {
    const op = proposal.points.find((row) => row.id === point.id);
    return op && op.change !== 'retire';
  });
  if (surviving.length === 0) return false;
  return surviving.every((point) => {
    const op = proposal.points.find((row) => row.id === point.id);
    return isOpenSectionId(op?.sectionId);
  });
}

export function repairNamedWorkDumpedToOpen(
  proposal: DocumentReorganizeProposal,
  currentPoints: DraftPoint[],
): DocumentReorganizeProposal {
  const currentById = new Map(currentPoints.map((point) => [point.id, point]));
  return {
    ...proposal,
    points: proposal.points.map((op) => {
      const current = currentById.get(op.id);
      if (!current || isOpenSectionId(current.pathGroupId) || op.change === 'retire') {
        return op;
      }
      if (!isOpenSectionId(op.sectionId)) return op;
      return {
        ...op,
        sectionId: current.pathGroupId ?? null,
        change: op.change === 'move' ? 'unchanged' : op.change,
        fromSectionId: current.pathGroupId ?? null,
      };
    }),
  };
}

/** True when the Lead named Sections but did not place, refine, or retire any Point. */
export function isDocumentReorganizeSpineOnly(proposal: DocumentReorganizeProposal): boolean {
  const noPointChanges = proposal.points.every((point) => point.change === 'unchanged');
  if (!noPointChanges) return false;
  if (hasDocumentIdentityProposal(proposal) && proposal.leadNamedSections !== true) {
    return false;
  }
  const namedSections = proposal.leadNamedSections ?? proposal.sections.length > 0;
  return namedSections;
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
