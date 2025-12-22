import { Router, type Response } from 'express';
import { PrismaClient } from '@keeper/database';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { z } from 'zod';
import { logger } from '@keeper/shared';
import { authMiddlewareCompat, type AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { requireDomainReadCompat, requireDomainWriteCompat } from '../../middleware/domainPermissionMiddleware.js';
import { validationMiddleware } from '../../middleware/validationMiddleware.js';

const prisma = new PrismaClient();
const router = Router();

const draftStatusEnum = z.enum(['draft', 'reviewed', 'approved', 'promoted', 'archived']);

const createDraftSchema = z.object({
  kind: z.string().min(1, 'kind is required'),
  key: z.string().min(1, 'key is required'),
  title: z.string().min(1, 'title is required'),
  summary: z.string().optional().nullable(),
  spec: z.record(z.any()).optional(),
  agentId: z.string().uuid().optional(),
});

const updateDraftSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().optional().nullable(),
  status: draftStatusEnum.optional(),
  spec: z.record(z.any()).optional(),
});

const setActiveDraftSchema = z.object({
  draftId: z.string().uuid(),
});

const mapDraftSummary = (draft: any) => ({
  id: draft.id,
  kind: draft.kind,
  key: draft.key,
  title: draft.title,
  status: draft.status,
  summary: draft.summary ?? null,
  updatedAt: draft.updated_at,
});

async function ensureSessionForUser(sessionId: string, userId: string) {
  const session = await prisma.kip_sessions.findUnique({
    where: { id: sessionId },
    select: { id: true, user_id: true },
  });

  if (!session) return null;
  if (session.user_id && session.user_id !== userId) return null;
  return session;
}

router.get(
  '/:domainId/kip/drafts',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const { domainId } = req.params;
      const drafts = await prisma.kip_drafts.findMany({
        where: { domain_id: domainId, owner_id: req.user.id },
        select: {
          id: true,
          kind: true,
          key: true,
          title: true,
          status: true,
          summary: true,
          updated_at: true,
        },
        orderBy: { updated_at: 'desc' },
      });

      const mappedDrafts = drafts.map(mapDraftSummary);
      
      logger.info({ domainId, count: mappedDrafts.length }, 'kip drafts list ok');
      
      return res.status(200).json({
        drafts: mappedDrafts,
      });
    } catch (error) {
      logger.error({ err: error, domainId: req.params.domainId }, 'kip drafts list failed');
      return res.status(500).json({ error: 'FAILED_TO_LIST_DRAFTS' });
    }
  },
);

router.get(
  '/:domainId/kip/drafts/:draftId',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const { domainId, draftId } = req.params;
      const draft = await prisma.kip_drafts.findFirst({
        where: { id: draftId, domain_id: domainId, owner_id: req.user.id },
      });

      if (!draft) {
        return res.status(404).json({ error: 'DRAFT_NOT_FOUND' });
      }

      return res.json({
        draft: {
          ...draft,
          spec: draft.spec_json,
        },
      });
    } catch (error) {
      console.error('[domains:kip-drafts:read:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_READ_DRAFT' });
    }
  },
);

router.post(
  '/:domainId/kip/drafts',
  authMiddlewareCompat,
  validationMiddleware(createDraftSchema),
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = (req.headers['x-request-id'] || req.headers['x-railway-request-id'] || 'unknown') as string;
    const domainId = req.params.domainId;
    
    try {
      if (!req.user) {
        logger.error({ requestId, domainId }, 'kip drafts create: unauthenticated');
        return res.status(401).json({ error: 'UNAUTHENTICATED', code: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const ownerId = req.user.id;
      const body = createDraftSchema.parse(req.body ?? {});

      if (!body.kind || !body.key || !body.title) {
        logger.warn({ requestId, domainId, ownerId, body }, 'kip drafts create: invalid payload');
        return res.status(400).json({ error: 'INVALID_DRAFT_PAYLOAD', code: 'INVALID_DRAFT_PAYLOAD', message: 'kind, key, and title are required' });
      }

      const now = new Date();

      const updateData: any = {
        title: body.title,
        summary: body.summary ?? null,
        status: 'draft',
        spec_json: body.spec ?? {},
        updated_at: now,
      };

      // Only update agent_id if provided
      if (body.agentId !== undefined) {
        updateData.agent_id = body.agentId ?? null;
      }

      const draft = await prisma.kip_drafts.upsert({
        where: {
          domain_id_owner_id_kind_key: {
            domain_id: domainId,
            owner_id: ownerId,
            kind: body.kind,
            key: body.key,
          },
        },
        update: updateData,
        create: {
          domain_id: domainId,
          owner_id: ownerId,
          agent_id: body.agentId ?? null,
          kind: body.kind,
          key: body.key,
          title: body.title,
          summary: body.summary ?? null,
          status: 'draft',
          spec_json: body.spec ?? {},
          created_at: now,
          updated_at: now,
        },
      });

      logger.info({ requestId, domainId, ownerId, draftId: draft.id, kind: body.kind, key: body.key }, 'kip drafts create ok');

      return res.status(200).json({
        draft: {
          ...draft,
          spec: draft.spec_json,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.warn({ requestId, domainId, err: error.errors }, 'kip drafts create: validation error');
        return res.status(400).json({ error: 'INVALID_DRAFT_PAYLOAD', code: 'VALIDATION_ERROR', message: error.errors.map(e => e.message).join(', ') });
      }
      
      logger.error({ requestId, domainId, err: error, userId: req.user?.id }, 'kip drafts create failed');
      return res.status(500).json({ error: 'FAILED_TO_CREATE_DRAFT', code: 'INTERNAL_ERROR' });
    }
  },
);

router.patch(
  '/:domainId/kip/drafts/:draftId',
  authMiddlewareCompat,
  validationMiddleware(updateDraftSchema),
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const { domainId, draftId } = req.params;
      const body = updateDraftSchema.parse(req.body ?? {});

      const existing = await prisma.kip_drafts.findFirst({
        where: { id: draftId, domain_id: domainId, owner_id: req.user.id },
      });

      if (!existing) {
        return res.status(404).json({ error: 'DRAFT_NOT_FOUND' });
      }

      const updatePayload: any = {
        updated_at: new Date(),
      };

      if (body.title !== undefined) updatePayload.title = body.title;
      if (body.summary !== undefined) updatePayload.summary = body.summary ?? null;
      if (body.status !== undefined) updatePayload.status = body.status;
      if (body.spec !== undefined) updatePayload.spec_json = body.spec ?? {};

      const updated = await prisma.kip_drafts.update({
        where: { id: existing.id },
        data: updatePayload,
      });

      return res.json({
        draft: {
          ...updated,
          spec: updated.spec_json,
        },
      });
    } catch (error) {
      console.error('[domains:kip-drafts:update:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_UPDATE_DRAFT' });
    }
  },
);

router.post(
  '/:domainId/kip/sessions/:sessionId/active-draft',
  authMiddlewareCompat,
  validationMiddleware(setActiveDraftSchema),
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const { domainId, sessionId } = req.params;
      const { draftId } = setActiveDraftSchema.parse(req.body ?? {});

      const draft = await prisma.kip_drafts.findFirst({
        where: { id: draftId, domain_id: domainId, owner_id: req.user.id },
      });

      if (!draft) {
        return res.status(404).json({ error: 'DRAFT_NOT_FOUND' });
      }

      const session = await ensureSessionForUser(sessionId, req.user.id);
      if (!session) {
        return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      }

      await prisma.kip_sessions.updateMany({
        where: { id: sessionId },
        data: { active_draft_id: draft.id, updated_at: new Date() },
      });

      return res.json({ success: true, activeDraft: mapDraftSummary(draft) });
    } catch (error) {
      console.error('[domains:kip-drafts:set-active:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_SET_ACTIVE_DRAFT' });
    }
  },
);

router.delete(
  '/:domainId/kip/sessions/:sessionId/active-draft',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const { sessionId } = req.params;
      const session = await ensureSessionForUser(sessionId, req.user.id);
      if (!session) {
        return res.status(404).json({ error: 'SESSION_NOT_FOUND' });
      }

      await prisma.kip_sessions.updateMany({
        where: { id: sessionId },
        data: { active_draft_id: null, updated_at: new Date() },
      });

      return res.json({ success: true });
    } catch (error) {
      console.error('[domains:kip-drafts:clear-active:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_CLEAR_ACTIVE_DRAFT' });
    }
  },
);

router.delete(
  '/:domainId/kip/drafts/:draftId',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const requestId = (req.headers['x-request-id'] || req.headers['x-railway-request-id'] || 'unknown') as string;
    const { domainId, draftId } = req.params;

    try {
      if (!req.user) {
        logger.error({ requestId, domainId, draftId }, 'kip drafts delete: unauthenticated');
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const ownerId = req.user.id;

      // Find the draft and verify ownership
      const draft = await prisma.kip_drafts.findFirst({
        where: {
          id: draftId,
          domain_id: domainId,
          owner_id: ownerId,
        },
      });

      if (!draft) {
        logger.warn({ requestId, domainId, draftId, ownerId }, 'kip drafts delete: not found');
        return res.status(404).json({ error: 'DRAFT_NOT_FOUND', message: 'Draft not found in this domain' });
      }

      // Delete the draft
      await prisma.kip_drafts.delete({
        where: { id: draftId },
      });

      logger.info({ requestId, domainId, draftId, ownerId, title: draft.title }, 'kip drafts delete ok');

      return res.json({ success: true });
    } catch (error) {
      logger.error({ requestId, domainId, draftId, err: error, userId: req.user?.id }, 'kip drafts delete failed');
      return res.status(500).json({ error: 'FAILED_TO_DELETE_DRAFT', code: 'INTERNAL_ERROR' });
    }
  },
);

export default router;

