/**
 * Draft Point model — stored in kip_drafts.spec_json.points
 */

import { draftPointBeatLabel } from './draftPointStructure.js';

export const DRAFT_POINT_STATUSES = ['proposed', 'accepted', 'pending'] as const;
export type DraftPointStatus = (typeof DRAFT_POINT_STATUSES)[number];

export const DRAFT_POINT_TYPES = ['moment', 'decision', 'context', 'general'] as const;
export type DraftPointType = (typeof DRAFT_POINT_TYPES)[number];

/** Moment beat inside a journey_spec path point — promotes to Moment.title */
export interface DraftPointMoment {
  title: string;
  narrative?: string;
}

export interface DraftPoint {
  id: string;
  content: string;
  status: DraftPointStatus;
  type: DraftPointType;
  proposedBy: string;
  createdAt: string;
  updatedAt: string;
  /** High-level beat — promotes to Path.prelude for journey_spec points */
  prelude?: string;
  /** Landing sentiment below the body */
  closer?: string;
  /** Structured moment beats — promote to Path.Moment records */
  moments?: DraftPointMoment[];
  /** Cluster id for path-emergence grouping — optional in spec_json.points */
  pathGroupId?: string;
}

/** @deprecated Legacy sections shape — read compat only; canonical content is `points`. */
export interface DraftSection {
  title: string;
  content: string;
}

/** Canonical shape for kip_drafts.spec_json — persisted writes use `points` only. */
export interface DraftSpecJson {
  /** @deprecated Present only on read when legacy rows not yet backfilled. */
  sections?: DraftSection[];
  points?: DraftPoint[];
}

const DEFAULT_DRAFT_POINT_TYPE: DraftPointType = 'general';
const DEFAULT_DRAFT_POINT_STATUS: DraftPointStatus = 'proposed';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDraftPointStatus(value: unknown): value is DraftPointStatus {
  return typeof value === 'string' && (DRAFT_POINT_STATUSES as readonly string[]).includes(value);
}

function isDraftPointType(value: unknown): value is DraftPointType {
  return typeof value === 'string' && (DRAFT_POINT_TYPES as readonly string[]).includes(value);
}

export function isDraftPoint(value: unknown): value is DraftPoint {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string'
    && typeof value.content === 'string'
    && isDraftPointStatus(value.status)
    && isDraftPointType(value.type)
    && typeof value.proposedBy === 'string'
    && typeof value.createdAt === 'string'
    && typeof value.updatedAt === 'string'
  );
}

function normalizeDraftSection(value: unknown): DraftSection | null {
  if (!isRecord(value)) return null;
  return {
    title: typeof value.title === 'string' ? value.title : '',
    content: typeof value.content === 'string' ? value.content : '',
  };
}

function normalizeDraftPoint(value: unknown): DraftPoint | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== 'string' || !value.id.trim()) return null;
  if (typeof value.content !== 'string') return null;

  const status = isDraftPointStatus(value.status) ? value.status : DEFAULT_DRAFT_POINT_STATUS;
  const type = isDraftPointType(value.type) ? value.type : DEFAULT_DRAFT_POINT_TYPE;
  const proposedBy = typeof value.proposedBy === 'string' ? value.proposedBy : '';
  const createdAt = typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString();
  const updatedAt = typeof value.updatedAt === 'string' ? value.updatedAt : createdAt;

  const prelude = typeof value.prelude === 'string' ? value.prelude : undefined;
  const closer = typeof value.closer === 'string' ? value.closer : undefined;
  const moments = normalizeDraftPointMoments(value.moments);
  const pathGroupId =
    typeof value.pathGroupId === 'string'
      ? value.pathGroupId
      : typeof value.path_group_id === 'string'
        ? value.path_group_id
        : undefined;

  return {
    id: value.id,
    content: value.content,
    status,
    type,
    proposedBy,
    createdAt,
    updatedAt,
    ...(prelude ? { prelude } : {}),
    ...(closer ? { closer } : {}),
    ...(moments.length > 0 ? { moments } : {}),
    ...(pathGroupId ? { pathGroupId } : {}),
  };
}

function normalizeDraftPointMoments(value: unknown): DraftPointMoment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry): DraftPointMoment | null => {
      if (!isRecord(entry)) return null;
      const title = typeof entry.title === 'string' ? entry.title.trim() : '';
      if (!title) return null;
      const narrative =
        typeof entry.narrative === 'string' ? entry.narrative.trim() : undefined;
      return { title, ...(narrative ? { narrative } : {}) };
    })
    .filter((row): row is DraftPointMoment => row !== null);
}

/** Parse and validate points from spec_json (invalid entries dropped). */
export function parseDraftPoints(spec: unknown): DraftPoint[] {
  if (!isRecord(spec) || !Array.isArray(spec.points)) return [];
  return spec.points
    .map(normalizeDraftPoint)
    .filter((point): point is DraftPoint => point !== null);
}

/**
 * Convert legacy sections into draft points (accepted — historical create path).
 */
export function sectionsToDraftPoints(
  sections: DraftSection[],
  proposedBy = 'migration',
): DraftPoint[] {
  const now = new Date().toISOString();
  return sections
    .map((section) => {
      const title = section.title.trim();
      const body = section.content.trim();
      const content = [title, body].filter(Boolean).join('\n\n').trim();
      if (!content) return null;
      return createDraftPoint({
        content,
        type: 'general',
        proposedBy,
        status: 'accepted',
        createdAt: now,
        updatedAt: now,
      });
    })
    .filter((point): point is DraftPoint => point !== null);
}

/**
 * Normalize spec_json for API responses.
 * Legacy `sections` are merged into `points` when points are empty (read compat).
 */
export function normalizeDraftSpecJson(spec: unknown): DraftSpecJson {
  if (!isRecord(spec)) {
    return { points: [] };
  }

  const legacySections = Array.isArray(spec.sections)
    ? spec.sections
        .map(normalizeDraftSection)
        .filter((section): section is DraftSection => section !== null)
    : [];

  let points = parseDraftPoints(spec);

  if (points.length === 0 && legacySections.length > 0) {
    points = sectionsToDraftPoints(legacySections);
  }

  const result: DraftSpecJson = { points };

  // Read compat: expose deprecated sections until backfill completes everywhere.
  if (legacySections.length > 0) {
    result.sections = legacySections;
  }

  return result;
}

/**
 * Canonical storage shape for writes — points only, no sections.
 * Converts legacy sections to accepted points when points are empty.
 * Preserves non-content keys (e.g. purpose, rules, source).
 */
export function canonicalizeDraftSpecJson(
  spec: unknown,
  options?: { proposedBy?: string },
): DraftSpecJson & Record<string, unknown> {
  if (!isRecord(spec)) {
    return { points: [] };
  }

  const legacySections = Array.isArray(spec.sections)
    ? spec.sections
        .map(normalizeDraftSection)
        .filter((section): section is DraftSection => section !== null)
    : [];

  let points = parseDraftPoints(spec);

  if (points.length === 0 && legacySections.length > 0) {
    points = sectionsToDraftPoints(
      legacySections,
      options?.proposedBy ?? 'migration',
    );
  }

  const extras: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(spec)) {
    if (key !== 'sections' && key !== 'points') {
      extras[key] = value;
    }
  }

  return { ...extras, points };
}

export interface CreateDraftPointInput {
  content: string;
  type?: DraftPointType;
  proposedBy: string;
  status?: DraftPointStatus;
  prelude?: string;
  closer?: string;
  moments?: DraftPointMoment[];
  pathGroupId?: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Build a new point for append to spec_json.points */
export function createDraftPoint(input: CreateDraftPointInput): DraftPoint {
  const now = input.createdAt ?? new Date().toISOString();
  const prelude = input.prelude?.trim();
  const closer = input.closer?.trim();
  const moments = normalizeDraftPointMoments(input.moments);
  const pathGroupId = input.pathGroupId?.trim();

  return {
    id: input.id ?? crypto.randomUUID(),
    content: input.content.trim(),
    status: input.status ?? DEFAULT_DRAFT_POINT_STATUS,
    type: input.type ?? DEFAULT_DRAFT_POINT_TYPE,
    proposedBy: input.proposedBy,
    createdAt: now,
    updatedAt: input.updatedAt ?? now,
    ...(prelude ? { prelude } : {}),
    ...(closer ? { closer } : {}),
    ...(moments.length > 0 ? { moments } : {}),
    ...(pathGroupId ? { pathGroupId } : {}),
  };
}

/** Accepted points are anchors — content cannot be rewritten in place. */
export function isDraftPointRewritable(status: DraftPointStatus): boolean {
  return status !== 'accepted';
}

/** Compact point index for agent environment (ids + rewrite eligibility). */
export function summarizeDraftPointsForAgent(spec: unknown): Array<{
  id: string;
  status: DraftPointStatus;
  type: DraftPointType;
  preview: string;
  prelude?: string;
  momentCount?: number;
  rewritable: boolean;
}> {
  return parseDraftPoints(spec).map((point) => ({
    id: point.id,
    status: point.status,
    type: point.type,
    preview: point.content.trim().slice(0, 160),
    ...(point.prelude?.trim() ? { prelude: point.prelude.trim() } : {}),
    ...(point.moments && point.moments.length > 0
      ? { momentCount: point.moments.length }
      : {}),
    rewritable: isDraftPointRewritable(point.status),
  }));
}

function mergeDraftPointsById(existingPoints: DraftPoint[], patchPoints: DraftPoint[]): DraftPoint[] {
  if (patchPoints.length === 0) return existingPoints;

  const byId = new Map(existingPoints.map((point) => [point.id, point]));
  for (const patchPoint of patchPoints) {
    const existing = byId.get(patchPoint.id);
    if (
      existing
      && existing.status === 'accepted'
      && patchPoint.content.trim() !== existing.content.trim()
    ) {
      // Anchor — preserve accepted content; ignore agent content overwrite.
      continue;
    }
    byId.set(patchPoint.id, patchPoint);
  }

  const ordered: DraftPoint[] = [];
  const seen = new Set<string>();

  for (const point of existingPoints) {
    const merged = byId.get(point.id);
    if (merged) {
      ordered.push(merged);
      seen.add(point.id);
    }
  }

  for (const patchPoint of patchPoints) {
    if (!seen.has(patchPoint.id)) {
      ordered.push(patchPoint);
    }
  }

  return ordered;
}

function withDraftPointsPreservingExtras(spec: unknown, points: DraftPoint[]): DraftSpecJson & Record<string, unknown> {
  const normalized = canonicalizeDraftSpecJson(spec);
  const extras: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(normalized)) {
    if (key !== 'sections' && key !== 'points') {
      extras[key] = value;
    }
  }

  return canonicalizeDraftSpecJson({ ...extras, points });
}

/** Merge a new point into spec_json without mutating the input object. */
export function appendDraftPointToSpec(spec: unknown, point: DraftPoint): DraftSpecJson {
  const normalized = canonicalizeDraftSpecJson(spec);
  return withDraftPointsPreservingExtras(spec, [...(normalized.points ?? []), point]);
}

export type RewriteDraftPointResult =
  | { ok: true; spec: DraftSpecJson; point: DraftPoint }
  | { ok: false; code: 'POINT_NOT_FOUND' | 'POINT_ANCHORED' | 'VALIDATION_ERROR' };

/** Rewrite draft point content in place. Accepted (kept) points cannot be rewritten. */
export function rewriteDraftPointInSpec(
  spec: unknown,
  pointId: string,
  content: string,
  type?: DraftPointType,
  extras?: Partial<Pick<DraftPoint, 'prelude' | 'closer' | 'moments'>>,
): RewriteDraftPointResult {
  const trimmed = content.trim();
  if (!trimmed) {
    return { ok: false, code: 'VALIDATION_ERROR' };
  }

  const existing = findDraftPoint(spec, pointId);
  if (!existing) {
    return { ok: false, code: 'POINT_NOT_FOUND' };
  }
  if (!isDraftPointRewritable(existing.status)) {
    return { ok: false, code: 'POINT_ANCHORED' };
  }

  const { spec: nextSpec, point } = updateDraftPointInSpec(spec, pointId, {
    content: trimmed,
    ...(type ? { type } : {}),
    ...(extras ?? {}),
  });

  if (!point) {
    return { ok: false, code: 'POINT_NOT_FOUND' };
  }

  return { ok: true, spec: nextSpec, point };
}

/** Update a point by id within spec_json.points */
export function updateDraftPointInSpec(
  spec: unknown,
  pointId: string,
  patch: Partial<Pick<DraftPoint, 'status' | 'content' | 'type' | 'prelude' | 'closer' | 'moments'>>,
): { spec: DraftSpecJson; point: DraftPoint | null } {
  const normalized = canonicalizeDraftSpecJson(spec);
  const points = normalized.points ?? [];
  let updatedPoint: DraftPoint | null = null;

  const nextPoints = points.map((point) => {
    if (point.id !== pointId) return point;
    updatedPoint = {
      ...point,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    return updatedPoint;
  });

  return {
    spec: withDraftPointsPreservingExtras(spec, nextPoints),
    point: updatedPoint,
  };
}

export function findDraftPoint(spec: unknown, pointId: string): DraftPoint | null {
  return parseDraftPoints(spec).find((point) => point.id === pointId) ?? null;
}

/**
 * Merge a partial spec patch into existing spec_json.
 * Preserves `points` when omitted from the patch (common agent/client mistake).
 * Merges `points` by id when provided; empty patch points never wipe existing points.
 * Preserves non-content spec keys (paths, purpose, etc.) from both sides.
 */
export function mergeDraftSpecPatch(existingSpec: unknown, patchSpec: unknown): DraftSpecJson {
  const existing = canonicalizeDraftSpecJson(existingSpec);
  if (!isRecord(patchSpec)) return existing;

  const mergedExtras: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(existing)) {
    if (key !== 'sections' && key !== 'points') {
      mergedExtras[key] = value;
    }
  }
  for (const [key, value] of Object.entries(patchSpec)) {
    if (key !== 'sections' && key !== 'points') {
      mergedExtras[key] = value;
    }
  }

  let nextPoints = existing.points ?? [];

  if ('sections' in patchSpec) {
    const legacySections = normalizeDraftSpecJson(patchSpec).sections ?? [];
    if (legacySections.length > 0) {
      nextPoints = [
        ...nextPoints,
        ...sectionsToDraftPoints(legacySections, 'agent'),
      ];
    }
  }

  if ('points' in patchSpec) {
    const patchPoints = parseDraftPoints(patchSpec);
    if (patchPoints.length === 0 && nextPoints.length > 0) {
      // Agent sent points: [] — preserve existing rather than wipe.
    } else if (patchPoints.length > 0) {
      nextPoints = mergeDraftPointsById(nextPoints, patchPoints);
    }
  }

  return canonicalizeDraftSpecJson({ ...mergedExtras, points: nextPoints });
}

/** Build a short story arc from accepted point beats — not a content dump. */
export function buildDraftSummaryFromAcceptedPoints(spec: unknown): string {
  return parseDraftPoints(spec)
    .filter((point) => point.status === 'accepted')
    .map((point) => draftPointBeatLabel(point))
    .filter(Boolean)
    .join(' → ');
}
