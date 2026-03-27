/**
 * Public read-only journey endpoints (no authentication).
 * Mounted at /api/public
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@keeper/database';
import { rateLimit } from 'express-rate-limit';

const router = Router();
const prisma = new PrismaClient();

const publicJourneyRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Too many requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/** GET /api/public/:domainSlug/journeys/:journeyId */
router.get(
  '/:domainSlug/journeys/:journeyId',
  publicJourneyRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { domainSlug, journeyId } = req.params;

      const domain = await prisma.domain.findUnique({
        where: { slug: domainSlug },
      });

      if (!domain) {
        return res.status(404).json({ error: 'Domain not found' });
      }

      const journey = await prisma.journey.findUnique({
        where: { id: journeyId },
      });

      if (!journey || journey.domainId !== domain.id) {
        return res.status(404).json({ error: 'Journey not found' });
      }

      const [paths, moments] = await Promise.all([
        prisma.path.findMany({
          where: { journeyId },
          select: {
            id: true,
            name: true,
            prelude: true,
          },
        }),
        prisma.moment.findMany({
          where: { journeyId },
          select: {
            id: true,
            title: true,
            narrative: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        }),
      ]);

      return res.json({
        journey: {
          id: journey.id,
          name: journey.name,
          forward: journey.forward,
          createdAt: journey.createdAt,
          updatedAt: journey.updatedAt,
        },
        paths,
        moments,
      });
    } catch (err) {
      console.error('[public/journeys] detail error', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/** GET /api/public/:domainSlug/journeys */
router.get('/:domainSlug/journeys', publicJourneyRateLimit, async (req: Request, res: Response) => {
  try {
    const { domainSlug } = req.params;

    const domain = await prisma.domain.findUnique({
      where: { slug: domainSlug },
    });

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const journeys = await prisma.journey.findMany({
      where: { domainId: domain.id },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return res.json({ journeys });
  } catch (err) {
    console.error('[public/journeys] list error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
