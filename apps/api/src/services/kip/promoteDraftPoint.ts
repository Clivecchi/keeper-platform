/**
 * Promote an accepted journey_spec draft point to Path + Moments via direct Prisma.
 */

import { randomUUID } from 'crypto';
import type { Prisma, PrismaClient } from '@keeper/database';
import { prisma } from '@keeper/database';
import {
  buildDraftPointPromotionPlan,
  findDraftPoint,
  updateDraftPointInSpec,
  type DraftPoint,
  type DraftPointPromotion,
  type DraftPointPromotionPlanErrorCode,
} from '@keeper/shared';
import { ensureDraftLinkedToSessionDialog } from './linkDraftToSessionDialog.js';

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface PromoteDraftPointInput {
  domainId: string;
  userId: string;
  draftId: string;
  pointId: string;
  journeyId: string;
  sessionId?: string | null;
}

export type PromoteDraftPointErrorCode =
  | 'DRAFT_NOT_FOUND'
  | 'POINT_NOT_FOUND'
  | 'POINT_NOT_ACCEPTED'
  | 'INVALID_DRAFT_KIND'
  | 'VALIDATION_ERROR'
  | 'JOURNEY_NOT_FOUND'
  | 'JOURNEY_NOT_IN_DOMAIN'
  | 'KEEPER_MISMATCH'
  | 'PATH_PROMOTION_STALE'
  | 'EXECUTION_ERROR';

export interface PromoteDraftPointSuccess {
  ok: true;
  draftId: string;
  point: DraftPoint;
  journeyId: string;
  pathId: string;
  momentIds: string[];
  idempotent: boolean;
  promotion: DraftPointPromotion;
  path: { id: string; name: string; prelude: string; journeyId: string; keeperId: string };
  moments: Array<{ id: string; title: string; narrative: string; pathId: string; journeyId: string }>;
}

export type PromoteDraftPointResult =
  | PromoteDraftPointSuccess
  | { ok: false; code: PromoteDraftPointErrorCode; message: string };

function mapPlanErrorCode(code: DraftPointPromotionPlanErrorCode): PromoteDraftPointErrorCode {
  switch (code) {
    case 'INVALID_DRAFT_KIND':
      return 'INVALID_DRAFT_KIND';
    case 'POINT_NOT_ACCEPTED':
      return 'POINT_NOT_ACCEPTED';
    case 'POINT_NOT_FOUND':
      return 'POINT_NOT_FOUND';
    case 'MISSING_JOURNEY_ID':
    default:
      return 'VALIDATION_ERROR';
  }
}

function mergeTargetJourneyId(spec: unknown, journeyId: string): Record<string, unknown> {
  if (typeof spec !== 'object' || spec === null || Array.isArray(spec)) {
    return { targetJourneyId: journeyId };
  }
  const record = spec as Record<string, unknown>;
  if (typeof record.targetJourneyId === 'string' && record.targetJourneyId.trim()) {
    return record;
  }
  return { ...record, targetJourneyId: journeyId };
}

export async function promoteDraftPointInTransaction(
  tx: DbClient,
  input: PromoteDraftPointInput,
): Promise<PromoteDraftPointResult> {
  const { domainId, userId, draftId, pointId, journeyId, sessionId } = input;

  const draft = await tx.kip_drafts.findFirst({
    where: { id: draftId, domain_id: domainId, owner_id: userId },
    select: {
      id: true,
      kind: true,
      keeper_id: true,
      spec_json: true,
      title: true,
      summary: true,
      status: true,
    },
  });

  if (!draft) {
    return { ok: false, code: 'DRAFT_NOT_FOUND', message: 'Draft not found' };
  }

  const existing = findDraftPoint(draft.spec_json, pointId);
  if (!existing) {
    return { ok: false, code: 'POINT_NOT_FOUND', message: 'Point not found' };
  }

  const existingPromotion = existing.promotion;
  if (existingPromotion?.promotedPathId) {
    const existingPath = await tx.path.findUnique({
      where: { id: existingPromotion.promotedPathId },
      select: {
        id: true,
        name: true,
        prelude: true,
        journeyId: true,
        keeperId: true,
      },
    });
    if (!existingPath) {
      return {
        ok: false,
        code: 'PATH_PROMOTION_STALE',
        message: 'Previously promoted path no longer exists',
      };
    }

    const moments =
      existingPromotion.promotedMomentIds.length > 0
        ? await tx.moment.findMany({
            where: { id: { in: existingPromotion.promotedMomentIds } },
            select: {
              id: true,
              title: true,
              narrative: true,
              pathId: true,
              journeyId: true,
            },
          })
        : [];

    return {
      ok: true,
      draftId: draft.id,
      point: existing,
      journeyId: existingPromotion.promotedJourneyId,
      pathId: existingPromotion.promotedPathId,
      momentIds: existingPromotion.promotedMomentIds,
      idempotent: true,
      promotion: existingPromotion,
      path: existingPath,
      moments: moments.map((moment) => ({
        id: moment.id,
        title: moment.title,
        narrative: moment.narrative,
        pathId: moment.pathId ?? existingPath.id,
        journeyId: moment.journeyId ?? existingPromotion.promotedJourneyId,
      })),
    };
  }

  const plan = buildDraftPointPromotionPlan({
    point: existing,
    draftKind: draft.kind,
    journeyId,
  });

  if (plan.ok === false) {
    return {
      ok: false,
      code: mapPlanErrorCode(plan.code),
      message: plan.message,
    };
  }

  const journey = await tx.journey.findUnique({
    where: { id: plan.journeyId },
    select: { id: true, keeperId: true, domainId: true },
  });

  if (!journey) {
    return { ok: false, code: 'JOURNEY_NOT_FOUND', message: 'Journey not found' };
  }

  if (journey.domainId && journey.domainId !== domainId) {
    return {
      ok: false,
      code: 'JOURNEY_NOT_IN_DOMAIN',
      message: 'Journey does not belong to this domain',
    };
  }

  if (draft.keeper_id && journey.keeperId !== draft.keeper_id) {
    return {
      ok: false,
      code: 'KEEPER_MISMATCH',
      message: 'Journey keeper does not match draft keeper',
    };
  }

  const pathId = randomUUID();
  const promotedAt = new Date().toISOString();

  try {
    const path = await tx.path.create({
      data: {
        id: pathId,
        name: plan.path.name,
        prelude: plan.path.prelude,
        journeyId: journey.id,
        keeperId: journey.keeperId,
        ownerId: userId,
      },
      select: {
        id: true,
        name: true,
        prelude: true,
        journeyId: true,
        keeperId: true,
      },
    });

    const createdMoments: PromoteDraftPointSuccess['moments'] = [];
    const momentIds: string[] = [];

    for (const momentPlan of plan.moments) {
      const moment = await tx.moment.create({
        data: {
          title: momentPlan.title,
          narrative: momentPlan.narrative,
          pathId,
          journeyId: journey.id,
          ownerId: userId,
          domainId: journey.domainId ?? domainId,
        },
        select: {
          id: true,
          title: true,
          narrative: true,
          pathId: true,
          journeyId: true,
        },
      });
      momentIds.push(moment.id);
      createdMoments.push({
        id: moment.id,
        title: moment.title,
        narrative: moment.narrative,
        pathId: moment.pathId ?? pathId,
        journeyId: moment.journeyId ?? journey.id,
      });
    }

    const promotion: DraftPointPromotion = {
      promotedAt,
      promotedJourneyId: journey.id,
      promotedPathId: pathId,
      promotedMomentIds: momentIds,
    };

    const specWithTarget = mergeTargetJourneyId(draft.spec_json, journey.id);
    const { spec: nextSpec, point: updatedPoint } = updateDraftPointInSpec(
      specWithTarget,
      pointId,
      { promotion },
    );

    if (!updatedPoint) {
      return { ok: false, code: 'EXECUTION_ERROR', message: 'Failed to update draft point' };
    }

    await tx.kip_draft_versions.create({
      data: {
        draft_id: draft.id,
        version: await tx.kip_draft_versions
          .count({ where: { draft_id: draft.id } })
          .then((n) => n + 1),
        spec_json: (draft.spec_json ?? {}) as Prisma.InputJsonValue,
        title: draft.title,
        summary: draft.summary ?? null,
        status: draft.status,
        created_by_session_id: sessionId ?? null,
      },
    });

    await tx.kip_drafts.update({
      where: { id: draft.id },
      data: {
        spec_json: nextSpec as object,
        updated_at: new Date(),
      },
    });

    await ensureDraftLinkedToSessionDialog(tx, {
      draftId: draft.id,
      sessionId,
    });

    return {
      ok: true,
      draftId: draft.id,
      point: updatedPoint,
      journeyId: journey.id,
      pathId,
      momentIds,
      idempotent: false,
      promotion,
      path,
      moments: createdMoments,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to promote draft point';
    return { ok: false, code: 'EXECUTION_ERROR', message };
  }
}

export async function promoteDraftPoint(input: PromoteDraftPointInput): Promise<PromoteDraftPointResult> {
  return prisma.$transaction((tx) => promoteDraftPointInTransaction(tx, input));
}
