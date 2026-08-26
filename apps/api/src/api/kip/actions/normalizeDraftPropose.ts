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

/** 1-based index, current title, or UUID — never require the model to guess a field name. */
export function stringifyPointRef(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(Math.trunc(value));
  }
  if (typeof value === 'string' && value.trim()) return value.trim();
  return undefined;
}

/**
 * Point identity for rewrite. Chronicle numbers (1–N) and titles count.
 * `payload.id` is handled separately — models often put the Point there and
 * Keeper used to treat it as a Draft id.
 */
export function coercePointRewriteRef(payload: Record<string, unknown>): string | undefined {
  const nested = isRecord(payload.point) ? payload.point : null;
  const firstRow =
    Array.isArray(payload.points) && isRecord(payload.points[0]) ? payload.points[0] : null;

  return (
    stringifyPointRef(payload.pointId)
    ?? stringifyPointRef(payload.point_id)
    ?? stringifyPointRef(payload.pointIndex)
    ?? stringifyPointRef(payload.point_index)
    ?? stringifyPointRef(payload.index)
    ?? stringifyPointRef(payload.n)
    ?? stringifyPointRef(payload.ref)
    ?? (typeof payload.point === 'string' || typeof payload.point === 'number'
      ? stringifyPointRef(payload.point)
      : undefined)
    ?? (nested
      ? stringifyPointRef(nested.pointId)
        ?? stringifyPointRef(nested.id)
        ?? stringifyPointRef(nested.n)
        ?? stringifyPointRef(nested.index)
      : undefined)
    ?? (firstRow
      ? stringifyPointRef(firstRow.pointId)
        ?? stringifyPointRef(firstRow.id)
        ?? stringifyPointRef(firstRow.n)
      : undefined)
    ?? stringifyPointRef(payload.currentTitle)
    ?? stringifyPointRef(payload.current_title)
  );
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
  if (typeof out.pointId === 'number' && Number.isFinite(out.pointId)) {
    out.pointId = String(Math.trunc(out.pointId));
  }
  const title = firstNonEmptyString(out.prelude, out.title);
  if (title) out.prelude = title;
  return out;
}

/**
 * Rewrite is Document management — identity is 1–N / title / UUID.
 * Do not copy a Point number or Point UUID onto draftId.
 */
export function normalizeDraftPointRewritePayload(
  payload: Record<string, unknown>,
  manuscriptDraftId?: string | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...payload };
  let pointId = coercePointRewriteRef(out);
  const rawId = stringifyPointRef(out.id);
  const manuscript = typeof manuscriptDraftId === 'string' ? manuscriptDraftId.trim() : '';
  const draftId = stringifyPointRef(out.draftId);
  if (!pointId && rawId && rawId !== manuscript && rawId !== draftId) {
    pointId = rawId;
  }
  if (pointId) out.pointId = pointId;
  if (rawId && pointId && rawId === pointId) {
    delete out.id;
  }

  const nested = isRecord(out.point) ? out.point : null;
  const title = firstNonEmptyString(
    out.prelude,
    out.title,
    out.pointTitle,
    out.point_title,
    nested?.prelude,
    nested?.title,
  );
  if (title) out.prelude = title;

  const content = firstNonEmptyString(
    out.content,
    out.body,
    out.text,
    nested?.content,
    nested?.body,
  );
  if (content) out.content = content;

  return out;
}

export function expandDraftPointRewriteActions(
  action: { type: string; payload?: unknown },
): Array<{ type: string; payload?: unknown }> {
  if (action.type !== 'draft.point.rewrite') return [action];
  const payload =
    action.payload && typeof action.payload === 'object' && !Array.isArray(action.payload)
      ? (action.payload as Record<string, unknown>)
      : {};
  if (!Array.isArray(payload.points) || payload.points.length === 0) return [action];
  const base = { ...payload };
  delete base.points;
  return payload.points.map((row) => {
    const rowRec = isRecord(row) ? row : { pointId: row };
    return { type: 'draft.point.rewrite', payload: { ...base, ...rowRec } };
  });
}

/** When every rewrite in the turn omitted identity, zip them to Point 1–N. */
export function assignMissingRewritePointIndexes(
  actions: Array<{ type: string; payload?: unknown }>,
): Array<{ type: string; payload?: unknown }> {
  const rewrites = actions.filter((action) => action.type === 'draft.point.rewrite');
  if (rewrites.length < 2) return actions;
  const missing = rewrites.filter((action) => {
    const payload =
      action.payload && typeof action.payload === 'object' && !Array.isArray(action.payload)
        ? (action.payload as Record<string, unknown>)
        : {};
    return !coercePointRewriteRef(payload);
  });
  if (missing.length !== rewrites.length) return actions;
  let next = 1;
  return actions.map((action) => {
    if (action.type !== 'draft.point.rewrite') return action;
    const payload =
      action.payload && typeof action.payload === 'object' && !Array.isArray(action.payload)
        ? { ...(action.payload as Record<string, unknown>) }
        : {};
    payload.pointId = String(next);
    next += 1;
    return { type: action.type, payload };
  });
}
