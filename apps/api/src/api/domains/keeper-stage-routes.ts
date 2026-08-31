/**
 * Keeper Stage — domain-scoped composition (presence/reference, not clones).
 *
 *   GET   /:domainId/keeper-stage
 *   PATCH /:domainId/keeper-stage
 */

import { Router, type Response } from 'express';
import { z } from 'zod';
import { authMiddlewareCompat, type AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { requireDomainReadCompat, requireDomainWriteCompat } from '../../middleware/domainPermissionMiddleware.js';
import { loadKeeperStage, saveKeeperStage } from '../../services/domains/keeperStageStore.js';
import { logger } from '@keeper/shared';

const router = Router();

const presenceSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(['agent', 'dialog', 'draft', 'journey', 'keeper', 'moment', 'library']),
  objectId: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  contextualRole: z.string().max(120).nullable().optional(),
  direction: z.string().max(800).nullable().optional(),
});

const storySlideSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  slideType: z.enum(['text_slide', 'domain_cover']).optional(),
  kind: z.enum(['root', 'beat', 'title']).optional(),
  title: z.string().min(1).max(200),
  body: z.string().max(4000).optional(),
  source: z
    .object({
      kind: z.enum(['live', 'point', 'moment', 'path', 'keeper', 'journey']),
      id: z.string().max(80).nullable().optional(),
    })
    .optional(),
});

const patchSchema = z.object({
  title: z.string().min(1).max(80).optional(),
  selectedPresenceId: z.string().max(80).nullable().optional(),
  presences: z.array(presenceSchema).max(40).optional(),
  story: z
    .object({
      slides: z.array(storySlideSchema).max(24),
    })
    .nullable()
    .optional(),
});

router.get(
  '/:domainId/keeper-stage',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId } = req.params;
    try {
      const stage = await loadKeeperStage(domainId);
      return res.json({ stage });
    } catch (error) {
      logger.error({ err: error, domainId }, '[keeper-stage] load failed');
      return res.status(500).json({ error: 'FAILED_TO_LOAD_KEEPER_STAGE' });
    }
  },
);

router.patch(
  '/:domainId/keeper-stage',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId } = req.params;
    const parsed = patchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'INVALID_STAGE', details: parsed.error.flatten() });
    }
    try {
      const stage = await saveKeeperStage(domainId, parsed.data);
      return res.json({ stage });
    } catch (error) {
      logger.error({ err: error, domainId }, '[keeper-stage] save failed');
      return res.status(500).json({ error: 'FAILED_TO_SAVE_KEEPER_STAGE' });
    }
  },
);

export default router;
