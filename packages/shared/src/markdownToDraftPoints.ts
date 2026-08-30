/**
 * Split external markdown into Dialog Document Points.
 * One Point per heading/section — v1 ingest, not a Library upload.
 * Heading level is kept so ingest can turn major headings into Sections.
 */

import { createDraftPoint, type DraftPoint } from './draftPoints.js';

export const INGEST_MAX_MARKDOWN_CHARS = 200_000;
export const INGEST_MAX_POINTS = 80;

/** 0 = preamble, 1 = #, 2 = ##, 3 = ### */
export type MarkdownHeadingLevel = 0 | 1 | 2 | 3;

export type MarkdownHeadingBlock = {
  heading: string;
  body: string;
  level: MarkdownHeadingLevel;
  point: DraftPoint;
};

export type MarkdownToDraftPointsResult = {
  title: string;
  points: DraftPoint[];
  /** Same order as points — heading level for Section membership. */
  blocks: MarkdownHeadingBlock[];
  /** True when more heading/sections existed than INGEST_MAX_POINTS. */
  truncated: boolean;
};

export type MarkdownToDraftPointsOptions = {
  proposedBy: string;
  pathGroupId?: string;
};

const HEADING_RE = /^(#{1,3})\s+(.+?)\s*$/;

function slugTitle(value: string): string {
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.slice(0, 200) || 'Brought in writing';
}

function firstMeaningfulLine(text: string): string {
  for (const line of text.split('\n')) {
    const trimmed = line.replace(/^#+\s*/, '').trim();
    if (trimmed) return trimmed;
  }
  return 'Brought in writing';
}

function makePoint(
  prelude: string,
  content: string,
  options: MarkdownToDraftPointsOptions,
): DraftPoint | null {
  const body = content.trim();
  const heading = prelude.trim();
  if (!body && !heading) return null;
  return createDraftPoint({
    content: body || heading,
    proposedBy: options.proposedBy,
    status: 'accepted',
    type: 'general',
    prelude: heading || firstMeaningfulLine(body).slice(0, 80),
    ...(options.pathGroupId ? { pathGroupId: options.pathGroupId } : {}),
  });
}

/**
 * Parse markdown into accepted DraftPoints.
 * Title prefers the first H1, then the first heading, then the first line.
 */
export function markdownToDraftPoints(
  markdown: string,
  options: MarkdownToDraftPointsOptions,
): MarkdownToDraftPointsResult {
  const text = markdown.replace(/\r\n/g, '\n').trim();
  if (!text) {
    return { title: 'Brought in writing', points: [], blocks: [], truncated: false };
  }

  const lines = text.split('\n');
  const sections: Array<{ heading: string; body: string; level: number }> = [];
  let current: { heading: string; bodyLines: string[]; level: number } | null = null;
  const preamble: string[] = [];

  for (const line of lines) {
    const match = line.match(HEADING_RE);
    if (match) {
      if (current) {
        sections.push({
          heading: current.heading,
          body: current.bodyLines.join('\n').trim(),
          level: current.level,
        });
      } else if (preamble.join('\n').trim()) {
        sections.push({
          heading: 'Opening',
          body: preamble.join('\n').trim(),
          level: 0,
        });
      }
      current = {
        heading: match[2]?.trim() ?? '',
        bodyLines: [],
        level: match[1]?.length ?? 1,
      };
      continue;
    }
    if (current) current.bodyLines.push(line);
    else preamble.push(line);
  }

  if (current) {
    sections.push({
      heading: current.heading,
      body: current.bodyLines.join('\n').trim(),
      level: current.level,
    });
  } else if (preamble.join('\n').trim()) {
    const opening = preamble.join('\n').trim();
    sections.push({
      heading: firstMeaningfulLine(opening).slice(0, 80),
      body: opening,
      level: 0,
    });
  }

  const points: DraftPoint[] = [];
  const blocks: MarkdownHeadingBlock[] = [];
  let truncated = false;
  for (const section of sections) {
    if (points.length >= INGEST_MAX_POINTS) {
      truncated = true;
      break;
    }
    const point = makePoint(section.heading, section.body, options);
    if (!point) continue;
    const level = (section.level <= 0
      ? 0
      : section.level >= 3
        ? 3
        : section.level) as MarkdownHeadingLevel;
    points.push(point);
    blocks.push({
      heading: section.heading,
      body: section.body,
      level,
      point,
    });
  }

  const h1 = sections.find((section) => section.level === 1)?.heading;
  const firstHeading = sections.find((section) => section.level > 0)?.heading;
  const title = slugTitle(h1 || firstHeading || firstMeaningfulLine(text));

  return { title, points, blocks, truncated };
}
