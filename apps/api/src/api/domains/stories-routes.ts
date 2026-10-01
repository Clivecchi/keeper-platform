/**
 * Domain Stories — ordered narrative references.
 *
 *   GET /:domainId/stories
 *   PUT /:domainId/stories
 */

import { Router, type Response } from 'express';
import { z } from 'zod';
import { parseDomainStories } from '@keeper/shared';
import { logger } from '@keeper/shared';
import { authMiddlewareCompat, type AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import { requireDomainReadCompat, requireDomainWriteCompat } from '../../middleware/domainPermissionMiddleware.js';
import { loadDomainStories, saveDomainStories } from '../../services/domains/storyStore.js';

const router = Router();

const materialSchema = z.object({
  id: z.string().min(1).max(80).optional(),
  kind: z.enum(['capture', 'moment', 'message', 'point', 'media']),
  sourceId: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(2000).optional(),
  dialogId: z.string().max(80).nullable().optional(),
  beatIndex: z.number().int().min(0).max(12).optional(),
});

const storySchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(['shaping', 'staged']).optional(),
  createdBy: z.string().max(80).nullable().optional(),
  createdAt: z.string().max(40).optional(),
  updatedAt: z.string().max(40).optional(),
  material: z.array(materialSchema).max(24).optional(),
});

const putSchema = z.object({
  activeStoryId: z.string().max(80).nullable().optional(),
  stories: z.array(storySchema).max(24),
});

router.get(
  '/:domainId/stories',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId } = req.params;
    try {
      const stories = await loadDomainStories(domainId);
      return res.json({ stories });
    } catch (error) {
      logger.error({ err: error, domainId }, '[stories] load failed');
      return res.status(500).json({ error: 'FAILED_TO_LOAD_STORIES' });
    }
  },
);

router.put(
  '/:domainId/stories',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const { domainId } = req.params;
    const parsed = putSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'INVALID_STORIES', details: parsed.error.flatten() });
    }
    try {
      const stories = await saveDomainStories(
        domainId,
        parseDomainStories({ version: 1, ...parsed.data }),
        req.user?.id ?? null,
      );
      return res.json({ stories });
    } catch (error) {
      logger.error({ err: error, domainId }, '[stories] save failed');
      return res.status(500).json({ error: 'FAILED_TO_SAVE_STORIES' });
    }
  },
);

export default router;
