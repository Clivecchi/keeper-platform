/**
 * Journeys API Routes
 * API endpoints for journey data used by JourneyBoard
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';

const router: Router = Router();
const prisma = new PrismaClient();

// Validation schemas
const journeyQuerySchema = z.object({
  domainId: z.string().optional(),
  keeperId: z.string().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

/**
 * GET /api/journeys - Get all journeys
 */
router.get('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { domainId, keeperId, limit, offset } = journeyQuerySchema.parse(req.query);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const where: any = {};
    if (domainId) {
      where.domainId = domainId;
    }
    if (keeperId) {
      where.keeperId = keeperId;
    }

    const journeys = await prisma.journey.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        Keeper: {
          select: {
            id: true,
            title: true,
            keeperType: true,
          },
        },
        Path: {
          select: {
            id: true,
            name: true,
            prelude: true,
          },
        },
        Moment: {
          select: {
            id: true,
            title: true,
            narrative: true,
          },
        },
        themes: {
          select: {
            id: true,
            label: true,
            slug: true,
            palette: true,
          },
        },
      },
    });

    const total = await prisma.journey.count({ where });

    return res.json({
      journeys: journeys.map(journey => ({
        id: journey.id,
        name: journey.name,
        forward: journey.forward,
        ownerId: journey.ownerId,
        domainId: journey.domainId,
        keeperId: journey.keeperId,
        createdAt: journey.createdAt,
        updatedAt: journey.updatedAt,
        keeper: journey.Keeper,
        paths: journey.Path,
        moment: journey.Moment,
        theme: journey.themes,
        pathCount: journey.Path.length,
        momentCount: journey.Moment ? 1 : 0,
      })),
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    });
  } catch (error) {
    console.error('Error fetching journeys:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/journeys/:id - Get a specific journey by ID
 */
router.get('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const journey = await prisma.journey.findUnique({
      where: { id },
      include: {
        Keeper: {
          select: {
            id: true,
            title: true,
            purpose: true,
            keeperType: true,
          },
        },
        Path: {
          include: {
            Moment: {
              select: {
                id: true,
                title: true,
                narrative: true,
              },
            },
          },
        },
        Moment: true,
        themes: true,
      },
    });

    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    return res.json({
      id: journey.id,
      name: journey.name,
      forward: journey.forward,
      ownerId: journey.ownerId,
      domainId: journey.domainId,
      keeperId: journey.keeperId,
      createdAt: journey.createdAt,
      updatedAt: journey.updatedAt,
      keeper: journey.Keeper,
      paths: journey.Path,
      moment: journey.Moment,
      theme: journey.themes,
      stats: {
        totalPaths: journey.Path.length,
        totalMoments: journey.Path.filter(path => path.Moment).length + (journey.Moment ? 1 : 0),
        completedPaths: Math.floor(journey.Path.length * 0.6), // Mock completion rate
        progressPercentage: Math.floor(Math.random() * 40 + 40), // Mock progress 40-80%
      },
    });
  } catch (error) {
    console.error('Error fetching journey:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/journeys - Create a new journey
 */
router.post('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const createJourneySchema = z.object({
      name: z.string().min(1).max(200),
      forward: z.string().min(1).max(1000),
      keeperId: z.string(),
      domainId: z.string().optional(),
      theme_id: z.string().optional(),
    });

    const data = createJourneySchema.parse(req.body);

    const journey = await prisma.journey.create({
      data: {
        ...data,
        ownerId: userId,
      },
      include: {
        Keeper: {
          select: {
            id: true,
            title: true,
            keeperType: true,
          },
        },
      },
    });

    return res.status(201).json(journey);
  } catch (error) {
    console.error('Error creating journey:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
