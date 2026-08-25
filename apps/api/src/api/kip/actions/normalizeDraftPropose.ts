/**
 * Coerce common model payload shapes for draft.update.propose.
 * Models often nest content or put the body in text/body/narrative/author fields.
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstNonEmptyString(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}

/** Pull a string body from a nested content-like object. */
function contentFromRecord(record: Record<string, unknown>): string | undefined {
  return firstNonEmptyString(
    record.content,
    record.text,
    record.body,
    record.narrative,
    record.markdown,
    record.document,
  );
}

/**
 * Resolve point body text from a propose payload.
 * Accepts flat synonyms and one level of nesting (content object / point / points[0]).
 */
export function coerceProposePointContent(payload: Record<string, unknown>): string {
  if (typeof payload.content === 'string' && payload.content.trim()) {
    return payload.content.trim();
  }

  if (isRecord(payload.content)) {
    const nested = contentFromRecord(payload.content);
    if (nested) return nested;
  }

  const flat = firstNonEmptyString(
    payload.text,
    payload.body,
    payload.narrative,
    payload.summary,
    payload.markdown,
    payload.document,
    payload.pointContent,
    payload.point_content,
  );
  if (flat) return flat;

  if (isRecord(payload.point)) {
    const fromPoint = contentFromRecord(payload.point);
    if (fromPoint) return fromPoint;
  }

  if (Array.isArray(payload.points) && payload.points.length > 0) {
    const first = payload.points[0];
    if (typeof first === 'string' && first.trim()) return first.trim();
    if (isRecord(first)) {
      const fromFirst = contentFromRecord(first);
      if (fromFirst) return fromFirst;
    }
  }

  return '';
}

/**
 * Resolve attribution label (proposedBy) when the user names an author.
 * Prefer explicit author fields over nested content.author.
 */
export function coerceProposePointAuthor(payload: Record<string, unknown>): string | undefined {
  const flat = firstNonEmptyString(
    payload.author,
    payload.proposedBy,
    payload.proposed_by,
    payload.attributedTo,
    payload.attributed_to,
  );
  if (flat) return flat;

  if (isRecord(payload.content)) {
    const nested = firstNonEmptyString(
      payload.content.author,
      payload.content.proposedBy,
      payload.content.attributedTo,
    );
    if (nested) return nested;
  }

  if (isRecord(payload.point)) {
    const fromPoint = firstNonEmptyString(
      payload.point.author,
      payload.point.proposedBy,
      payload.point.attributedTo,
    );
    if (fromPoint) return fromPoint;
  }

  if (Array.isArray(payload.points) && isRecord(payload.points[0])) {
    const first = payload.points[0];
    return firstNonEmptyString(first.author, first.proposedBy, first.attributedTo);
  }

  return undefined;
}

/** Normalize a draft.update.propose action payload for execution. */
export function normalizeDraftUpdateProposePayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };
  if (!out.id && typeof out.draftId === 'string') out.id = out.draftId;
  if (!out.draftId && typeof out.id === 'string') out.draftId = out.id;

  const content = coerceProposePointContent(payload);
  if (content) out.content = content;

  const author = coerceProposePointAuthor(payload);
  if (author) {
    out.author = author;
    if (!out.proposedBy) out.proposedBy = author;
  }

  const title = firstNonEmptyString(
    payload.prelude,
    payload.title,
    payload.pointTitle,
    payload.point_title,
    isRecord(payload.point) ? payload.point.prelude : undefined,
    isRecord(payload.point) ? payload.point.title : undefined,
  );
  if (title) out.prelude = title;

  return out;
}

/** Normalize draft.point.accept / promote / rewrite id aliases. */
export function normalizeDraftPointIdPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };
  if (!out.id && typeof out.draftId === 'string') out.id = out.draftId;
  if (!out.draftId && typeof out.id === 'string') out.draftId = out.id;
  if (!out.pointId && typeof out.point_id === 'string') out.pointId = out.point_id;
  if (!out.pointId && typeof out.point === 'string' && out.point.trim()) {
    out.pointId = out.point.trim();
  }
  if (!out.pointId && typeof out.point === 'number' && Number.isFinite(out.point)) {
    out.pointId = String(out.point);
  }
  const title = firstNonEmptyString(out.prelude, out.title);
  if (title) out.prelude = title;
  return out;
}
