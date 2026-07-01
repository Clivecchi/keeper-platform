/**
 * Structured interpretation of draft points — especially journey_spec paths.
 *
 * Promotion mapping (journey_spec):
 * - Draft point  → Path
 * - point.prelude (or pathSubtitle) → Path.prelude
 * - pathName     → Path.name
 * - moments[]    → Moment records (title → Moment.title, narrative → Moment.narrative)
 */

import type { DraftPoint, DraftPointMoment } from './draftPoints.js';

export type { DraftPointMoment };

export interface DraftPointStructure {
  /** High-level beat — becomes Path.prelude on promote */
  prelude: string;
  /** Parsed path label, e.g. ESTABLISH */
  pathName?: string;
  /** Parsed path subtitle, e.g. Claiming Your Realm */
  pathSubtitle?: string;
  /** Body copy between path header and moments list */
  description?: string;
  /** Moment beats inside this path — each title becomes Moment.title on promote */
  moments: DraftPointMoment[];
  /** Landing line below the body */
  closer?: string;
  /** True when content matches PATH / Moments patterns */
  isPathSpec: boolean;
}

const PATH_HEADER_RE =
  /^PATH\s*(\d+)\s*:\s*([^—–\-\n]+?)\s*[—–-]\s*(.*)$/im;

const MOMENTS_SECTION_RE = /\bMoments?\s*:/i;

const MOMENT_ITEM_RE = /(\d+)\.\s*(.+?)(?:\s*[—–-]\s*(.+?))?(?=\s*\d+\.|$)/g;

const DESCRIPTION_START_RE =
  /^(.+?)\s+((?:The|This|An|A|It|When|Where|Each|Every|Run|Build|Co-CEO)\b.+)$/i;

function cleanLabel(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitSubtitleAndDescription(text: string): {
  subtitle?: string;
  description?: string;
} {
  const trimmed = cleanLabel(text);
  if (!trimmed) return {};

  const match = trimmed.match(DESCRIPTION_START_RE);
  if (match) {
    return {
      subtitle: cleanLabel(match[1] ?? ''),
      description: cleanLabel(match[2] ?? ''),
    };
  }

  if (trimmed.length <= 48) {
    return { subtitle: trimmed };
  }

  return { description: trimmed };
}

/** Parse freeform journey-spec path content into structured beats. */
export function parseDraftPointContent(content: string): Omit<DraftPointStructure, 'prelude' | 'closer'> & {
  prelude?: string;
  closer?: string;
} {
  const trimmed = content.trim();
  if (!trimmed) {
    return { moments: [], isPathSpec: false };
  }

  const headerMatch = trimmed.match(PATH_HEADER_RE);
  if (!headerMatch) {
    return { moments: [], isPathSpec: false };
  }

  const pathName = cleanLabel(headerMatch[2] ?? '');
  const afterDash = headerMatch[3] ?? '';
  const momentsSplit = afterDash.split(MOMENTS_SECTION_RE);
  const beforeMoments = momentsSplit[0]?.trim() ?? '';
  const { subtitle: pathSubtitle, description } = splitSubtitleAndDescription(beforeMoments);

  const moments: DraftPointMoment[] = [];
  const momentsBlock = momentsSplit[1] ?? '';
  if (momentsBlock) {
    for (const match of momentsBlock.matchAll(MOMENT_ITEM_RE)) {
      const title = cleanLabel(match[2] ?? '');
      if (!title) continue;
      const narrative = match[3] ? cleanLabel(match[3]) : undefined;
      moments.push({ title, ...(narrative ? { narrative } : {}) });
    }
  }

  return {
    pathName,
    pathSubtitle,
    description,
    moments,
    isPathSpec: true,
  };
}

function momentListFromPoint(point: DraftPoint): DraftPointMoment[] {
  if (!point.moments || point.moments.length === 0) return [];
  return point.moments.map((moment) => ({
    title: cleanLabel(moment.title),
    ...(moment.narrative ? { narrative: cleanLabel(moment.narrative) } : {}),
  }));
}

/** Resolve display + promotion structure for a draft point. */
export function resolveDraftPointStructure(point: DraftPoint): DraftPointStructure {
  const parsed = parseDraftPointContent(point.content);
  const storedMoments = momentListFromPoint(point);
  const moments = storedMoments.length > 0 ? storedMoments : parsed.moments;

  const prelude =
    point.prelude?.trim() ||
    parsed.pathSubtitle ||
    parsed.pathName ||
    '';

  const closer = point.closer?.trim() || undefined;

  return {
    prelude,
    pathName: parsed.pathName,
    pathSubtitle: parsed.pathSubtitle,
    description: parsed.description,
    moments,
    closer,
    isPathSpec: parsed.isPathSpec || storedMoments.length > 0,
  };
}

/** One-line beat for summaries and film-strip labels. */
export function draftPointBeatLabel(point: DraftPoint): string {
  const structure = resolveDraftPointStructure(point);
  return (
    structure.prelude ||
    structure.pathSubtitle ||
    structure.pathName ||
    point.content.trim().slice(0, 80)
  );
}
