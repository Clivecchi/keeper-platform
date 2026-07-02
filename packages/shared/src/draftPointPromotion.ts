/**
 * Draft point promotion plan — journey_spec accepted point → Path + Moments.
 */

import type { DraftPoint } from './draftPoints.js';
import { draftPointBeatLabel, resolveDraftPointStructure } from './draftPointStructure.js';

export const MAX_PATH_PRELUDE_LENGTH = 1000;

export type DraftPointPromotionPlanErrorCode =
  | 'POINT_NOT_FOUND'
  | 'POINT_NOT_ACCEPTED'
  | 'MISSING_JOURNEY_ID'
  | 'INVALID_DRAFT_KIND';

export interface DraftPointPromotionPlanPath {
  name: string;
  prelude: string;
}

export interface DraftPointPromotionPlanMoment {
  title: string;
  narrative: string;
}

export interface DraftPointPromotionPlanSuccess {
  ok: true;
  journeyId: string;
  path: DraftPointPromotionPlanPath;
  moments: DraftPointPromotionPlanMoment[];
}

export type DraftPointPromotionPlanResult =
  | DraftPointPromotionPlanSuccess
  | { ok: false; code: DraftPointPromotionPlanErrorCode; message: string };

export interface BuildDraftPointPromotionPlanInput {
  point: DraftPoint | null;
  draftKind: string;
  journeyId: string;
}

function truncatePrelude(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_PATH_PRELUDE_LENGTH) return trimmed;
  return trimmed.slice(0, MAX_PATH_PRELUDE_LENGTH);
}

function fallbackPathName(point: DraftPoint): string {
  const label = draftPointBeatLabel(point).trim();
  return label || 'Untitled Path';
}

/** Build Path + Moment create plan from an accepted journey_spec draft point. */
export function buildDraftPointPromotionPlan(
  input: BuildDraftPointPromotionPlanInput,
): DraftPointPromotionPlanResult {
  const journeyId = input.journeyId?.trim() ?? '';
  if (!journeyId) {
    return { ok: false, code: 'MISSING_JOURNEY_ID', message: 'journeyId is required' };
  }

  if (input.draftKind !== 'journey_spec') {
    return {
      ok: false,
      code: 'INVALID_DRAFT_KIND',
      message: 'Only journey_spec drafts support point promotion',
    };
  }

  if (!input.point) {
    return { ok: false, code: 'POINT_NOT_FOUND', message: 'Draft point not found' };
  }

  if (input.point.status !== 'accepted') {
    return {
      ok: false,
      code: 'POINT_NOT_ACCEPTED',
      message: 'Only accepted points can be promoted',
    };
  }

  const structure = resolveDraftPointStructure(input.point);

  const pathName =
    structure.pathName?.trim()
    || structure.pathSubtitle?.trim()
    || fallbackPathName(input.point);

  const prelude = truncatePrelude(
    structure.prelude?.trim() || structure.pathSubtitle?.trim() || '',
  );

  let moments = structure.moments
    .map((moment) => ({
      title: moment.title.trim(),
      narrative: moment.narrative?.trim() || moment.title.trim(),
    }))
    .filter((moment) => moment.title.length > 0);

  if (moments.length === 0 && input.point.type === 'moment') {
    const narrative =
      structure.description?.trim()
      || input.point.content.trim();
    if (narrative) {
      moments = [{ title: fallbackPathName(input.point), narrative }];
    }
  }

  return {
    ok: true,
    journeyId,
    path: { name: pathName, prelude },
    moments,
  };
}
