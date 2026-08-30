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

/**
 * When writing is attached to an existing Document, give it its own Section.
 * Do not merge into a same-named Section — that hides the arrival as a dump.
 */
export function planIngestAttachSection(
  paths: DocumentPathDeclaration[],
  title: string,
  prelude?: string,
): { paths: DocumentPathDeclaration[]; section: DocumentPathDeclaration } {
  const base = title.trim() || 'Brought in';
  const taken = paths.some((path) => path.title.toLowerCase() === base.toLowerCase());
  return createDocumentSection(
    paths,
    taken ? `${base} · brought in` : base,
    prelude,
  );
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
