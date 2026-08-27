/**
 * Same-Point identity for draft.update.propose.
 * Keeper owns dedupe so a Lead "yes" cannot land the same Point twice.
 */

import type { DraftPoint } from './draftPoints.js';

export type PointProposeIdentity = {
  prelude: string;
  content: string;
};

const MIN_PRELUDE_CHARS = 12;
const CONTENT_PREFIX_CHARS = 48;

export function normalizePointCompareText(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function pointProposeIdentityFrom(input: {
  prelude?: string | null;
  title?: string | null;
  content?: string | null;
}): PointProposeIdentity {
  return {
    prelude: normalizePointCompareText(input.prelude || input.title),
    content: normalizePointCompareText(input.content),
  };
}

export function isDuplicatePointIdentity(
  existing: PointProposeIdentity,
  candidate: PointProposeIdentity,
): boolean {
  if (candidate.content && existing.content && candidate.content === existing.content) {
    return true;
  }
  if (
    candidate.prelude.length >= MIN_PRELUDE_CHARS
    && existing.prelude.length >= MIN_PRELUDE_CHARS
    && candidate.prelude === existing.prelude
  ) {
    if (!candidate.content || !existing.content) return true;
    if (candidate.content === existing.content) return true;
    const shorter =
      candidate.content.length <= existing.content.length ? candidate.content : existing.content;
    const longer =
      candidate.content.length <= existing.content.length ? existing.content : candidate.content;
    if (longer.startsWith(shorter)) return true;
    return (
      shorter.length >= CONTENT_PREFIX_CHARS
      && shorter.slice(0, CONTENT_PREFIX_CHARS) === longer.slice(0, CONTENT_PREFIX_CHARS)
    );
  }
  return false;
}

/** Host Points only — Cast Notes are not duplicates of the body they sit on. */
export function findDuplicateHostPoint(
  points: readonly DraftPoint[],
  candidate: PointProposeIdentity,
): DraftPoint | undefined {
  if (!candidate.prelude && !candidate.content) return undefined;
  return points.find((point) => {
    if (point.referencesPointId?.trim()) return false;
    return isDuplicatePointIdentity(pointProposeIdentityFrom(point), candidate);
  });
}

export function pointProposeIdentityKey(identity: PointProposeIdentity): string {
  return `${identity.prelude}::${identity.content}`;
}

/** Drop later draft.update.propose actions that match an earlier one in the same turn. */
export function collapseDuplicateDraftProposeActions<T extends { type: string; payload?: unknown }>(
  actions: T[],
): T[] {
  const keptIdentities: PointProposeIdentity[] = [];
  const out: T[] = [];
  for (const action of actions) {
    if (action.type !== 'draft.update.propose') {
      out.push(action);
      continue;
    }
    const payload =
      action.payload && typeof action.payload === 'object' && !Array.isArray(action.payload)
        ? (action.payload as Record<string, unknown>)
        : {};
    const identity = pointProposeIdentityFrom({
      prelude: typeof payload.prelude === 'string' ? payload.prelude : null,
      title: typeof payload.title === 'string' ? payload.title : null,
      content: typeof payload.content === 'string' ? payload.content : null,
    });
    if (!identity.prelude && !identity.content) {
      out.push(action);
      continue;
    }
    if (keptIdentities.some((existing) => isDuplicatePointIdentity(existing, identity))) {
      continue;
    }
    keptIdentities.push(identity);
    out.push(action);
  }
  return out;
}
