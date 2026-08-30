/**
 * Author CRUD helpers for a Dialog Document — Sections, Point placement, stage.
 * Storage still uses document_paths / pathGroupId.
 */

import {
  DOCUMENT_LIFECYCLE_STATUSES,
  DOCUMENT_OPEN_SECTION,
  type DocumentLifecycleStatus,
  type DocumentPathDeclaration,
  isDocumentLifecycleStatus,
} from './document.js';
import type { DraftPoint } from './draftPoints.js';
import type { MarkdownHeadingBlock } from './markdownToDraftPoints.js';

export function cycleDocumentLifecycleStatus(
  status?: string | null,
): DocumentLifecycleStatus {
  const current = isDocumentLifecycleStatus(status) ? status : 'drafts';
  const index = DOCUMENT_LIFECYCLE_STATUSES.indexOf(current);
  const next = DOCUMENT_LIFECYCLE_STATUSES[(index + 1) % DOCUMENT_LIFECYCLE_STATUSES.length];
  return next ?? 'drafts';
}

function slugSectionId(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `${slug || 'section'}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createDocumentSection(
  paths: DocumentPathDeclaration[],
  title: string,
  prelude?: string,
): { paths: DocumentPathDeclaration[]; section: DocumentPathDeclaration } {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error('Section title is required.');
  }
  let id = slugSectionId(trimmed);
  const used = new Set(paths.map((path) => path.id));
  used.add(DOCUMENT_OPEN_SECTION.id);
  while (used.has(id)) {
    id = slugSectionId(trimmed);
  }
  const section: DocumentPathDeclaration = {
    id,
    title: trimmed,
    ...(prelude?.trim() ? { prelude: prelude.trim() } : {}),
  };
  return { paths: [...paths, section], section };
}

export function renameDocumentSection(
  paths: DocumentPathDeclaration[],
  sectionId: string,
  title: string,
): DocumentPathDeclaration[] {
  const trimmed = title.trim();
  if (!trimmed) return paths;
  return paths.map((path) =>
    path.id === sectionId ? { ...path, title: trimmed } : path,
  );
}

export function removeDocumentSection(
  paths: DocumentPathDeclaration[],
  sectionId: string,
): DocumentPathDeclaration[] {
  return paths.filter((path) => path.id !== sectionId);
}

export function moveDocumentSection(
  paths: DocumentPathDeclaration[],
  sectionId: string,
  direction: 'up' | 'down',
): DocumentPathDeclaration[] {
  const index = paths.findIndex((path) => path.id === sectionId);
  if (index < 0) return paths;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= paths.length) return paths;
  const next = [...paths];
  const [row] = next.splice(index, 1);
  if (!row) return paths;
  next.splice(target, 0, row);
  return next;
}

export function moveIdInOrder(
  ids: string[],
  id: string,
  direction: 'up' | 'down',
): string[] {
  const index = ids.indexOf(id);
  if (index < 0) return ids;
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= ids.length) return ids;
  const next = [...ids];
  const [row] = next.splice(index, 1);
  if (!row) return ids;
  next.splice(target, 0, row);
  return next;
}

function uniqueIngestSectionTitle(
  paths: DocumentPathDeclaration[],
  title: string,
): string {
  const base = title.trim() || 'Brought in';
  const taken = paths.some((path) => path.title.toLowerCase() === base.toLowerCase());
  return taken ? `${base} · brought in` : base;
}

/**
 * When writing is attached to an existing Document, give it its own Section.
 * Do not merge into a same-named Section — that hides the arrival as a dump.
 */
export function planIngestAttachSection(
  paths: DocumentPathDeclaration[],
  title: string,
  prelude?: string,
): { paths: DocumentPathDeclaration[]; section: DocumentPathDeclaration } {
  return createDocumentSection(
    paths,
    uniqueIngestSectionTitle(paths, title),
    prelude,
  );
}

export type PlanIngestHeadingSectionsInput = {
  paths: DocumentPathDeclaration[];
  blocks: MarkdownHeadingBlock[];
  /** File / Dialog title — used when no major headings can establish Sections. */
  fallbackTitle?: string;
  fallbackPrelude?: string;
  /**
   * Attach safety: if headings do not establish Sections, create one from
   * fallbackTitle so the new Points do not land in Open.
   */
  requireSection?: boolean;
};

export type PlanIngestHeadingSectionsResult = {
  paths: DocumentPathDeclaration[];
  points: DraftPoint[];
  createdSections: DocumentPathDeclaration[];
};

function placePoint(point: DraftPoint, sectionId: string | null): DraftPoint {
  if (!sectionId) {
    const { pathGroupId: _drop, ...rest } = point;
    return rest;
  }
  return { ...point, pathGroupId: sectionId };
}

/**
 * Major headings establish Section membership.
 * When ## exists, each ## is a Section; # is the title; ### (and a ## body)
 * become Points in the current Section. When there is no ##, later #
 * headings are Sections. Heading-only major headings are Sections, not Points.
 * Content before the first major heading stays Open.
 */
export function planIngestHeadingSections(
  input: PlanIngestHeadingSectionsInput,
): PlanIngestHeadingSectionsResult {
  const blocks = input.blocks;
  const hasH2 = blocks.some((block) => block.level === 2);
  const h1Count = blocks.filter((block) => block.level === 1).length;
  const sectionLevel = hasH2 ? 2 : h1Count > 1 ? 1 : 0;

  let paths = [...input.paths];
  const createdSections: DocumentPathDeclaration[] = [];
  const points: DraftPoint[] = [];
  let currentSectionId: string | null = null;
  let seenFirstH1 = false;

  const openSection = (title: string): string => {
    const created = createDocumentSection(
      paths,
      uniqueIngestSectionTitle(paths, title),
    );
    paths = created.paths;
    createdSections.push(created.section);
    currentSectionId = created.section.id;
    return created.section.id;
  };

  for (const block of blocks) {
    const isFirstH1 = block.level === 1 && !seenFirstH1;
    if (block.level === 1) seenFirstH1 = true;
    const hasBody = Boolean(block.body.trim());

    if (sectionLevel > 0 && block.level === sectionLevel) {
      if (sectionLevel === 1 && isFirstH1) {
        if (hasBody) points.push(placePoint(block.point, null));
        continue;
      }
      const sectionId = openSection(block.heading);
      if (hasBody) points.push(placePoint(block.point, sectionId));
      continue;
    }

    if (isFirstH1 && !hasBody && blocks.length > 1) {
      continue;
    }

    if (block.level === 3 || (hasH2 && block.level === 1) || block.level === 0) {
      const memberId = block.level === 3 ? currentSectionId : null;
      points.push(placePoint(block.point, memberId));
      continue;
    }

    points.push(placePoint(block.point, currentSectionId));
  }

  if (createdSections.length === 0 && input.requireSection) {
    const fallback = planIngestAttachSection(
      paths,
      input.fallbackTitle?.trim() || 'Brought in',
      input.fallbackPrelude,
    );
    return {
      paths: fallback.paths,
      points: points.map((point) => placePoint(point, fallback.section.id)),
      createdSections: [fallback.section],
    };
  }

  return { paths, points, createdSections };
}

export function isOpenSectionId(sectionId?: string | null): boolean {
  const id = sectionId?.trim();
  return !id || id === DOCUMENT_OPEN_SECTION.id;
}

export function composeAuthoredPoint(
  title: string,
  body: string,
): { content: string; prelude?: string } {
  const heading = title.trim();
  const text = body.trim();
  if (heading && text) {
    return { content: text, prelude: heading };
  }
  if (heading) {
    return { content: heading, prelude: heading };
  }
  return { content: text };
}
