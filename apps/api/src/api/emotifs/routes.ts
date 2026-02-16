/**
 * Emotifs API
 *
 * GET  /api/domains/:domainId/emotifs — list Platform + Domain emotifs for domain
 * GET  /api/users/me/emotifs — list User emotifs
 * GET  /api/moments/:momentId/emotifs — list reactions (for display)
 * POST /api/moments/:momentId/emotifs — add emotif (body: { emotifId, emotifType })
 * DELETE /api/moments/:momentId/emotifs/:emotifId — remove (current user's reaction)
 */

import { Router, type Request, type Response } from 'express';
import { prisma } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { z } from 'zod';

const router = Router();

const POST_EMOTIF_SCHEMA = z.object({
  emotifId: z.string().min(1),
  emotifType: z.enum(['platform', 'domain', 'user']),
});

/** GET /api/domains/:domainId/emotifs — Platform + Domain emotifs */
router.get('/domains/:domainId/emotifs', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;

    const [platform, domain] = await Promise.all([
      prisma.platformEmotif.findMany({ orderBy: { symbol: 'asc' } }),
      prisma.domainEmotif.findMany({
        where: { domainId },
        orderBy: { slot: 'asc' },
      }),
    ]);

    return res.json({
      platform: platform.map((p) => ({ id: p.id, symbol: p.symbol, label: p.label })),
      domain: domain.map((d) => ({ id: d.id, symbol: d.symbol, label: d.label, slot: d.slot })),
    });
  } catch (err) {
    console.error('[Emotifs] GET domain emotifs error', err);
    return res.status(500).json({ error: 'Failed to load emotifs' });
  }
});

/** GET /api/users/me/emotifs — User emotifs */
router.get('/users/me/emotifs', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const userEmotifs = await prisma.userEmotif.findMany({
      where: { userId },
      orderBy: { slot: 'asc' },
    });

    return res.json(
      userEmotifs.map((u) => ({ id: u.id, symbol: u.symbol, label: u.label, slot: u.slot }))
    );
  } catch (err) {
    console.error('[Emotifs] GET user emotifs error', err);
    return res.status(500).json({ error: 'Failed to load user emotifs' });
  }
});

/** GET /api/moments/:momentId/emotifs — list reactions on moment */
router.get('/moments/:momentId/emotifs', async (req: Request, res: Response) => {
  try {
    const { momentId } = req.params;

    const reactions = await prisma.momentEmotif.findMany({
      where: { momentId },
      select: {
        id: true,
        emotifId: true,
        emotifType: true,
        userId: true,
        createdAt: true,
      },
    });

    return res.json(reactions);
  } catch (err) {
    console.error('[Emotifs] GET moment emotifs error', err);
    return res.status(500).json({ error: 'Failed to load moment emotifs' });
  }
});

/** POST /api/moments/:momentId/emotifs — add emotif reaction */
router.post('/moments/:momentId/emotifs', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { momentId } = req.params;
    const parsed = POST_EMOTIF_SCHEMA.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const { emotifId, emotifType } = parsed.data;

    // Validate emotif exists and is valid for type
    if (emotifType === 'platform') {
      const exists = await prisma.platformEmotif.findUnique({ where: { id: emotifId } });
      if (!exists) return res.status(400).json({ error: 'Invalid platform emotif' });
    } else if (emotifType === 'domain') {
      const moment = await prisma.moment.findUnique({
        where: { id: momentId },
        select: { domainId: true },
      });
      if (!moment?.domainId) return res.status(400).json({ error: 'Moment has no domain' });
      const exists = await prisma.domainEmotif.findFirst({
        where: { id: emotifId, domainId: moment.domainId },
      });
      if (!exists) return res.status(400).json({ error: 'Invalid domain emotif' });
    } else {
      const exists = await prisma.userEmotif.findFirst({
        where: { id: emotifId, userId },
      });
      if (!exists) return res.status(400).json({ error: 'Invalid user emotif' });
    }

    const existing = await prisma.momentEmotif.findUnique({
      where: {
        momentId_emotifId_userId: { momentId, emotifId, userId },
      },
    });
    if (existing) {
      return res.json(existing); // idempotent
    }

    const created = await prisma.momentEmotif.create({
      data: { momentId, emotifId, emotifType, userId },
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error('[Emotifs] POST moment emotif error', err);
    return res.status(500).json({ error: 'Failed to add emotif' });
  }
});

/** DELETE /api/moments/:momentId/emotifs/:emotifId — remove current user's reaction */
router.delete(
  '/moments/:momentId/emotifs/:emotifId',
  authMiddlewareCompat,
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id as string | undefined;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { momentId, emotifId } = req.params;

      await prisma.momentEmotif.deleteMany({
        where: { momentId, emotifId, userId },
      });

      return res.status(204).send();
    } catch (err) {
      console.error('[Emotifs] DELETE moment emotif error', err);
      return res.status(500).json({ error: 'Failed to remove emotif' });
    }
  }
);

export default router;
