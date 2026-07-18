/**
 * Keep an accepted journey_spec draft Point as a Moment (identity preserved).
 *
 * - Primary Moment.id = Point.id (1:1 identity carry-through)
 * - Additional plan moments get new ids with sourcePointId = Point.id
 * - Evolution (evolvesMomentId) updates the existing Moment instead of minting a new row
 * - Path may be supplied, resolved from pathGroupId, created from plan, or omitted (pathless keep)
 * - Point stays on the draft manuscript; promotion metadata records lineage
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
  /**
   * Path assignment at keep-time:
   * - string → use this existing Path (must belong to journey)
   * - null → keep Moment without a Path
   * - undefined → create Path from plan (legacy default) or reuse pathGroupId if it is a real Path id
   */
  pathId?: string | null;
  /** Evolve this Moment instead of creating — defaults to point.evolvesMomentId when set. */
  evolvesMomentId?: string | null;
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
  | 'PATH_NOT_FOUND'
  | 'PATH_PROMOTION_STALE'
  | 'MOMENT_NOT_FOUND'
  | 'EXECUTION_ERROR';

export interface PromoteDraftPointSuccess {
  ok: true;
  draftId: string;
  point: DraftPoint;
  journeyId: string;
  pathId: string | null;
  momentIds: string[];
  idempotent: boolean;
  evolved: boolean;
  promotion: DraftPointPromotion;
  path: { id: string; name: string; prelude: string; journeyId: string; keeperId: string } | null;
  moments: Array<{ id: string; title: string; narrative: string; pathId: string | null; journeyId: string }>;
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

async function bumpDialogDocumentStatus(
  tx: DbClient,
  dialogId: string | null | undefined,
): Promise<void> {
  if (!dialogId) return;
  await tx.dialog.updateMany({
    where: {
      id: dialogId,
      document_status: 'drafts',
    },
    data: { document_status: 'kept' },
  });
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
      dialog_id: true,
    },
  });

  if (!draft) {
    return { ok: false, code: 'DRAFT_NOT_FOUND', message: 'Draft not found' };
  }

  const existing = findDraftPoint(draft.spec_json, pointId);
  if (!existing) {
    return { ok: false, code: 'POINT_NOT_FOUND', message: 'Point not found' };
  }

  const evolveTargetId =
    (typeof input.evolvesMomentId === 'string' && input.evolvesMomentId.trim()
      ? input.evolvesMomentId.trim()
      : null)
    ?? (existing.evolvesMomentId?.trim() || null);

  const existingPromotion = existing.promotion;
  // Idempotent re-keep (non-evolution): return prior lineage when Moments still exist.
  if (!evolveTargetId && existingPromotion?.promotedMomentIds?.length) {
    const moments = await tx.moment.findMany({
      where: { id: { in: existingPromotion.promotedMomentIds } },
      select: {
        id: true,
        title: true,
        narrative: true,
        pathId: true,
        journeyId: true,
      },
    });
    if (moments.length === 0) {
      return {
        ok: false,
        code: 'PATH_PROMOTION_STALE',
        message: 'Previously kept moments no longer exist',
      };
    }

    let path: PromoteDraftPointSuccess['path'] = null;
    if (existingPromotion.promotedPathId) {
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
      path = existingPath;
    }

    return {
      ok: true,
      draftId: draft.id,
      point: existing,
      journeyId: existingPromotion.promotedJourneyId,
      pathId: existingPromotion.promotedPathId ?? null,
      momentIds: existingPromotion.promotedMomentIds,
      idempotent: true,
      evolved: existingPromotion.evolved === true,
      promotion: existingPromotion,
      path,
      moments: moments.map((moment) => ({
        id: moment.id,
        title: moment.title,
        narrative: moment.narrative,
        pathId: moment.pathId ?? existingPromotion.promotedPathId ?? null,
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

  const promotedAt = new Date().toISOString();
  const primaryPlan = plan.moments[0];
  if (!primaryPlan) {
    return { ok: false, code: 'VALIDATION_ERROR', message: 'Promotion plan has no moments' };
  }

  try {
    // ── Evolution path: update existing Moment, keep Point id lineage ─────────
    if (evolveTargetId) {
      const target = await tx.moment.findFirst({
        where: {
          id: evolveTargetId,
          OR: [{ domainId }, { journeyId: journey.id }],
        },
        select: {
          id: true,
          title: true,
          narrative: true,
          pathId: true,
          journeyId: true,
        },
      });
      if (!target) {
        return { ok: false, code: 'MOMENT_NOT_FOUND', message: 'Evolution target Moment not found' };
      }

      let resolvedPathId: string | null = target.pathId;
      if (typeof input.pathId === 'string' && input.pathId.trim()) {
        const path = await tx.path.findFirst({
          where: { id: input.pathId.trim(), journeyId: journey.id },
          select: { id: true },
        });
        if (!path) {
          return { ok: false, code: 'PATH_NOT_FOUND', message: 'Path not found on journey' };
        }
        resolvedPathId = path.id;
      }

      const updated = await tx.moment.update({
        where: { id: target.id },
        data: {
          title: primaryPlan.title,
          narrative: primaryPlan.narrative,
          pathId: resolvedPathId,
          journeyId: journey.id,
          domainId: journey.domainId ?? domainId,
          keptAt: new Date(),
          sourceDraftId: draft.id,
          sourcePointId: existing.id,
        },
        select: {
          id: true,
          title: true,
          narrative: true,
          pathId: true,
          journeyId: true,
        },
      });

      const promotion: DraftPointPromotion = {
        promotedAt,
        promotedJourneyId: journey.id,
        ...(resolvedPathId ? { promotedPathId: resolvedPathId } : {}),
        promotedMomentIds: [updated.id],
        evolved: true,
      };

      const specWithTarget = mergeTargetJourneyId(draft.spec_json, journey.id);
      const { spec: nextSpec, point: updatedPoint } = updateDraftPointInSpec(
        specWithTarget,
        pointId,
        { promotion, evolvesMomentId: updated.id },
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

      const linkedDialogId =
        draft.dialog_id
        ?? (await tx.kip_drafts.findUnique({
          where: { id: draft.id },
          select: { dialog_id: true },
        }))?.dialog_id;
      await bumpDialogDocumentStatus(tx, linkedDialogId);

      let path: PromoteDraftPointSuccess['path'] = null;
      if (resolvedPathId) {
        path = await tx.path.findUnique({
          where: { id: resolvedPathId },
          select: {
            id: true,
            name: true,
            prelude: true,
            journeyId: true,
            keeperId: true,
          },
        });
      }

      return {
        ok: true,
        draftId: draft.id,
        point: updatedPoint,
        journeyId: journey.id,
        pathId: resolvedPathId,
        momentIds: [updated.id],
        idempotent: false,
        evolved: true,
        promotion,
        path,
        moments: [
          {
            id: updated.id,
            title: updated.title,
            narrative: updated.narrative,
            pathId: updated.pathId,
            journeyId: updated.journeyId ?? journey.id,
          },
        ],
      };
    }

    // ── First-time keep: identity-preserving Moment create ───────────────────
    let resolvedPathId: string | null = null;
    let path: PromoteDraftPointSuccess['path'] = null;

    if (typeof input.pathId === 'string' && input.pathId.trim()) {
      const existingPath = await tx.path.findFirst({
        where: { id: input.pathId.trim(), journeyId: journey.id },
        select: {
          id: true,
          name: true,
          prelude: true,
          journeyId: true,
          keeperId: true,
        },
      });
      if (!existingPath) {
        return { ok: false, code: 'PATH_NOT_FOUND', message: 'Path not found on journey' };
      }
      resolvedPathId = existingPath.id;
      path = existingPath;
    } else if (input.pathId === null) {
      resolvedPathId = null;
    } else if (existing.pathGroupId) {
      const emergent = await tx.path.findFirst({
        where: { id: existing.pathGroupId, journeyId: journey.id },
        select: {
          id: true,
          name: true,
          prelude: true,
          journeyId: true,
          keeperId: true,
        },
      });
      if (emergent) {
        resolvedPathId = emergent.id;
        path = emergent;
      }
    }

    if (resolvedPathId === null && input.pathId !== null && !path) {
      // Create Path from plan (default when path not supplied and not explicitly pathless).
      const pathId = randomUUID();
      path = await tx.path.create({
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
      resolvedPathId = path.id;
    }

    const createdMoments: PromoteDraftPointSuccess['moments'] = [];
    const momentIds: string[] = [];

    for (let index = 0; index < plan.moments.length; index += 1) {
      const momentPlan = plan.moments[index]!;
      // Primary Moment carries Point.id — identity continues through the keep.
      const momentId = index === 0 ? existing.id : randomUUID();

      const moment = await tx.moment.create({
        data: {
          id: momentId,
          title: momentPlan.title,
          narrative: momentPlan.narrative,
          pathId: resolvedPathId,
          journeyId: journey.id,
          ownerId: userId,
          domainId: journey.domainId ?? domainId,
          keptAt: new Date(),
          sourceDraftId: draft.id,
          sourcePointId: existing.id,
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
        pathId: moment.pathId,
        journeyId: moment.journeyId ?? journey.id,
      });
    }

    const promotion: DraftPointPromotion = {
      promotedAt,
      promotedJourneyId: journey.id,
      ...(resolvedPathId ? { promotedPathId: resolvedPathId } : {}),
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

    const linkedDialogId =
      draft.dialog_id
      ?? (await tx.kip_drafts.findUnique({
        where: { id: draft.id },
        select: { dialog_id: true },
      }))?.dialog_id;
    await bumpDialogDocumentStatus(tx, linkedDialogId);

    return {
      ok: true,
      draftId: draft.id,
      point: updatedPoint,
      journeyId: journey.id,
      pathId: resolvedPathId,
      momentIds,
      idempotent: false,
      evolved: false,
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
