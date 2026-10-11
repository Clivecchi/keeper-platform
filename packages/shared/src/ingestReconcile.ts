/**
 * Compare incoming writing with Points already on a Document.
 * Matching headings keep the earliest identity. Differences are a Review proposal.
 * Unmatched existing Points stay. This does not append a second copy.
 */

import type { DocumentPathDeclaration } from './document.js';
import { planIngestHeadingSections } from './documentAuthoring.js';
import type { DraftPoint } from './draftPoints.js';
import type { MarkdownHeadingBlock } from './markdownToDraftPoints.js';

export type IngestReconcileMatch = {
  id: string;
  number: number;
  prelude: string;
};

export type IngestReconcileRefinement = {
  id: string;
  number: number;
  prelude: string;
  content: string;
  originalPrelude?: string;
  originalContent: string;
};

export type IngestReconcileAddition = {
  prelude: string;
  content: string;
  sectionTitle?: string;
};

export type IngestReconcilePlan = {
  matched: IngestReconcileMatch[];
  refinements: IngestReconcileRefinement[];
  additions: IngestReconcileAddition[];
  /** Same heading already kept, so a later copy was not given a new identity. */
  duplicateCopiesLeft: number;
};

export type IngestReconcileProposalPoint = {
  id: string;
  prelude?: string;
  content: string;
  sectionId?: string;
  change: 'refine' | 'new';
  originalPrelude?: string;
  originalContent?: string;
};

export type IngestReconcileProposal = {
  rationale: string;
  sections: Array<{ id: string; title: string }>;
  points: IngestReconcileProposalPoint[];
};

function compact(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function sectionKey(title: string): string {
  return compact(title).replace(/ · brought in$/, '');
}

type Host = { point: DraftPoint; number: number };

function hostsOf(points: readonly DraftPoint[]): Host[] {
  const rows: Host[] = [];
  let number = 0;
  for (const point of points) {
    if (point.referencesPointId?.trim()) continue;
    number += 1;
    rows.push({ point, number });
  }
  return rows;
}

function incomingRows(blocks: readonly MarkdownHeadingBlock[]): IngestReconcileAddition[] {
  const planned = planIngestHeadingSections({
    paths: [],
    blocks: [...blocks],
    requireSection: false,
  });
  const titleById = new Map(planned.paths.map((section) => [section.id, section.title]));
  return planned.points.map((point) => {
    const sectionTitle = point.pathGroupId ? titleById.get(point.pathGroupId) : undefined;
    return {
      prelude: point.prelude?.trim() || '',
      content: point.content.trim(),
      ...(sectionTitle ? { sectionTitle } : {}),
    };
  });
}

export function reconcileIncomingWriting(input: {
  existing: readonly DraftPoint[];
  blocks: readonly MarkdownHeadingBlock[];
}): IngestReconcilePlan {
  const hosts = hostsOf(input.existing);
  const unused = new Set(hosts.map((host) => host.point.id));
  const matched: IngestReconcileMatch[] = [];
  const refinements: IngestReconcileRefinement[] = [];
  const additions: IngestReconcileAddition[] = [];
  const touchedPreludes = new Set<string>();

  const take = (predicate: (host: Host) => boolean): Host | undefined => {
    const host = hosts.find((row) => unused.has(row.point.id) && predicate(row));
    if (!host) return undefined;
    unused.delete(host.point.id);
    return host;
  };

  for (const row of incomingRows(input.blocks)) {
    const preludeKey = compact(row.prelude);
    const bodyKey = compact(row.content);
    const exact = take((host) =>
      compact(host.point.prelude) === preludeKey && compact(host.point.content) === bodyKey,
    );
    if (exact) {
      matched.push({
        id: exact.point.id,
        number: exact.number,
        prelude: exact.point.prelude?.trim() || row.prelude,
      });
      if (preludeKey) touchedPreludes.add(preludeKey);
      continue;
    }
    const sameHeading = preludeKey
      ? take((host) => compact(host.point.prelude) === preludeKey)
      : undefined;
    if (sameHeading) {
      refinements.push({
        id: sameHeading.point.id,
        number: sameHeading.number,
        prelude: row.prelude || sameHeading.point.prelude?.trim() || '',
        content: row.content,
        ...(sameHeading.point.prelude ? { originalPrelude: sameHeading.point.prelude } : {}),
        originalContent: sameHeading.point.content,
      });
      touchedPreludes.add(preludeKey);
      continue;
    }
    additions.push(row);
  }

  let duplicateCopiesLeft = 0;
  for (const host of hosts) {
    if (!unused.has(host.point.id)) continue;
    const key = compact(host.point.prelude);
    if (key && touchedPreludes.has(key)) duplicateCopiesLeft += 1;
  }

  return { matched, refinements, additions, duplicateCopiesLeft };
}

/** Earliest Section whose title is this heading, including a single “ · brought in” copy. */
export function matchExistingSectionTitle(
  wanted: string,
  sections: readonly { title: string }[],
): string | null {
  const key = sectionKey(wanted);
  if (!key) return null;
  const hit = sections.find((section) => sectionKey(section.title) === key);
  return hit?.title ?? null;
}

function slugId(title: string, used: Set<string>): string {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32) || 'section';
  let id = `ingest-${base}`;
  let n = 2;
  while (used.has(id)) {
    id = `ingest-${base}-${n}`;
    n += 1;
  }
  used.add(id);
  return id;
}

export function buildIngestReconcileProposal(input: {
  plan: IngestReconcilePlan;
  currentSections: readonly DocumentPathDeclaration[];
  sourceName: string;
  sourceTruncated: boolean;
}): IngestReconcileProposal | null {
  if (input.plan.refinements.length === 0 && input.plan.additions.length === 0) return null;

  const used = new Set(input.currentSections.map((section) => section.id));
  const sections = input.currentSections.map((section) => ({ id: section.id, title: section.title }));
  const points: IngestReconcileProposalPoint[] = input.plan.refinements.map((row) => ({
    id: row.id,
    prelude: row.prelude,
    content: row.content,
    change: 'refine',
    ...(row.originalPrelude ? { originalPrelude: row.originalPrelude } : {}),
    originalContent: row.originalContent,
  }));

  for (const row of input.plan.additions) {
    const wanted = row.sectionTitle?.trim() || '';
    const existingTitle = wanted ? matchExistingSectionTitle(wanted, sections) : null;
    let sectionId = existingTitle ?? undefined;
    if (wanted && !existingTitle) {
      const id = slugId(wanted, used);
      sections.push({ id, title: wanted });
      sectionId = wanted;
    }
    points.push({
      id: slugId(row.prelude || 'point', used),
      prelude: row.prelude,
      content: row.content,
      change: 'new',
      ...(sectionId ? { sectionId } : {}),
    });
  }

  const source = input.sourceName.trim() || 'the attachment';
  const parts = [
    `Compared “${source}” with this Document.`,
    `${input.plan.matched.length} existing Point${input.plan.matched.length === 1 ? '' : 's'} already match and keep their identities.`,
    `${points.length} difference${points.length === 1 ? '' : 's'} ${points.length === 1 ? 'is' : 'are'} proposed for review.`,
  ];
  if (input.plan.duplicateCopiesLeft > 0) {
    parts.push(
      `${input.plan.duplicateCopiesLeft} extra cop${input.plan.duplicateCopiesLeft === 1 ? 'y was' : 'ies were'} left in place.`,
    );
  }
  if (input.sourceTruncated) {
    parts.push('The read ended before the file ended, so this proposal is not the whole source. Existing Points that were not in the read stay.');
  }
  parts.push('Apply is the human. Nothing was appended.');

  return {
    rationale: parts.join(' '),
    sections,
    points,
  };
}
