/**
 * draft.create payload coercion — working drafts, never Dialog manuscripts.
 */

import {
  canonicalizeDraftSpecJson,
  createDraftPoint,
  markdownToDraftPoints,
  parseDraftPoints,
  type DraftSpecJson,
} from '@keeper/shared';

export const DOCUMENT_MANUSCRIPT_KIND = 'document_manuscript';
export const WORKING_DRAFT_KIND = 'draft';

export function coerceWorkingDraftKind(kind: string | null | undefined): {
  kind: string;
  remappedFromManuscript: boolean;
} {
  const trimmed = typeof kind === 'string' ? kind.trim() : '';
  if (trimmed === DOCUMENT_MANUSCRIPT_KIND) {
    return { kind: WORKING_DRAFT_KIND, remappedFromManuscript: true };
  }
  return { kind: trimmed || WORKING_DRAFT_KIND, remappedFromManuscript: false };
}

/**
 * Persist first Point(s) from spec.points or a markdown/text `content` field.
 * Agents often send content and omit spec.points — that used to create an empty draft.
 */
export function mergeDraftCreateSpec(params: {
  spec: unknown;
  content?: unknown;
  title?: string;
  proposedBy: string;
}): DraftSpecJson {
  const specRecord =
    params.spec && typeof params.spec === 'object' && !Array.isArray(params.spec)
      ? { ...(params.spec as Record<string, unknown>) }
      : {};
  const existingPoints = parseDraftPoints(specRecord);
  if (existingPoints.length > 0) {
    return canonicalizeDraftSpecJson(specRecord, { proposedBy: params.proposedBy });
  }

  const content = typeof params.content === 'string' ? params.content.trim() : '';
  const title = params.title?.trim() ?? '';
  if (!content) {
    return canonicalizeDraftSpecJson(specRecord, { proposedBy: params.proposedBy });
  }

  const parsed = markdownToDraftPoints(content, { proposedBy: params.proposedBy });
  const points =
    parsed.points.length > 0
      ? parsed.points.map((point) => ({ ...point, status: 'proposed' as const }))
      : [
          createDraftPoint({
            content,
            proposedBy: params.proposedBy,
            status: 'proposed',
            ...(title ? { prelude: title } : {}),
          }),
        ];

  return canonicalizeDraftSpecJson(
    { ...specRecord, points },
    { proposedBy: params.proposedBy },
  );
}
