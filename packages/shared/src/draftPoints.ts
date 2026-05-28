/**
 * Draft Point model — stored in kip_drafts.spec_json.points
 */

export const DRAFT_POINT_STATUSES = ['proposed', 'accepted', 'pending'] as const;
export type DraftPointStatus = (typeof DRAFT_POINT_STATUSES)[number];

export const DRAFT_POINT_TYPES = ['moment', 'decision', 'context', 'general'] as const;
export type DraftPointType = (typeof DRAFT_POINT_TYPES)[number];

export interface DraftPoint {
  id: string;
  content: string;
  status: DraftPointStatus;
  type: DraftPointType;
  proposedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DraftSection {
  title: string;
  content: string;
}

/** Canonical shape for kip_drafts.spec_json */
export interface DraftSpecJson {
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

  return {
    id: value.id,
    content: value.content,
    status,
    type,
    proposedBy,
    createdAt,
    updatedAt,
  };
}

/** Parse and validate points from spec_json (invalid entries dropped). */
export function parseDraftPoints(spec: unknown): DraftPoint[] {
  if (!isRecord(spec) || !Array.isArray(spec.points)) return [];
  return spec.points
    .map(normalizeDraftPoint)
    .filter((point): point is DraftPoint => point !== null);
}

/**
 * Normalize spec_json for API responses — preserves legacy sections, ensures points array.
 */
export function normalizeDraftSpecJson(spec: unknown): DraftSpecJson {
  if (!isRecord(spec)) {
    return { points: [] };
  }

  const sections = Array.isArray(spec.sections)
    ? spec.sections
        .map(normalizeDraftSection)
        .filter((section): section is DraftSection => section !== null)
    : undefined;

  const points = parseDraftPoints(spec);

  return {
    ...(sections && sections.length > 0 ? { sections } : {}),
    points,
  };
}

export interface CreateDraftPointInput {
  content: string;
  type?: DraftPointType;
  proposedBy: string;
  status?: DraftPointStatus;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** Build a new point for append to spec_json.points */
export function createDraftPoint(input: CreateDraftPointInput): DraftPoint {
  const now = input.createdAt ?? new Date().toISOString();
  return {
    id: input.id ?? crypto.randomUUID(),
    content: input.content.trim(),
    status: input.status ?? DEFAULT_DRAFT_POINT_STATUS,
    type: input.type ?? DEFAULT_DRAFT_POINT_TYPE,
    proposedBy: input.proposedBy,
    createdAt: now,
    updatedAt: input.updatedAt ?? now,
  };
}

/** Merge a new point into spec_json without mutating the input object. */
export function appendDraftPointToSpec(spec: unknown, point: DraftPoint): DraftSpecJson {
  const normalized = normalizeDraftSpecJson(spec);
  return {
    ...normalized,
    points: [...(normalized.points ?? []), point],
  };
}

/** Update a point by id within spec_json.points */
export function updateDraftPointInSpec(
  spec: unknown,
  pointId: string,
  patch: Partial<Pick<DraftPoint, 'status' | 'content' | 'type'>>,
): { spec: DraftSpecJson; point: DraftPoint | null } {
  const normalized = normalizeDraftSpecJson(spec);
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
    spec: { ...normalized, points: nextPoints },
    point: updatedPoint,
  };
}

export function findDraftPoint(spec: unknown, pointId: string): DraftPoint | null {
  return parseDraftPoints(spec).find((point) => point.id === pointId) ?? null;
}
