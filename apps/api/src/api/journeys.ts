/**
 * Journeys API Routes
 * API endpoints for journey data used by JourneyBoard
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { mergePresenceSchemaCover } from '@keeper/shared';
import { PrismaClient, type Prisma } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';

const router: Router = Router();
const prisma = new PrismaClient();

// Validation schemas
const journeyQuerySchema = z.object({
  domainId: z.string().optional(),
  keeperId: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
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
      success: true,
      data: {
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
          momentCount: journey.Moment.length,
        })),
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
      },
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
        totalMoments: journey.Path.reduce((total, path) => total + (path.Moment?.length || 0), 0) + journey.Moment.length,
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
 * PATCH /api/journeys/:id - Update journey metadata (Chronicle Config)
 */
router.patch('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const updateJourneySchema = z.object({
      name: z.string().min(2).max(200).optional(),
      forward: z.string().min(1).max(1000).optional(),
      coverImage: z.string().url().nullable().optional(),
      coverImageKey: z.string().nullable().optional(),
    });

    const data = updateJourneySchema.parse(req.body);

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const existing = await prisma.journey.findUnique({
      where: { id },
      select: { id: true, presenceSchema: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    const { coverImage, coverImageKey, ...metadata } = data;
    const updateData: {
      name?: string;
      forward?: string;
      presenceSchema?: Prisma.InputJsonValue;
      updatedAt: Date;
    } = {
      ...metadata,
      updatedAt: new Date(),
    };

    if (coverImage !== undefined) {
      updateData.presenceSchema = mergePresenceSchemaCover(
        existing.presenceSchema,
        coverImage,
        coverImageKey,
      ) as Prisma.InputJsonValue;
    }

    const journey = await prisma.journey.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        forward: true,
        updatedAt: true,
      },
    });

    return res.json({ success: true, data: journey });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request', details: error.errors });
    }
    console.error('Error updating journey:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/journeys/:id - Delete a journey
 */
router.delete('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const journey = await prisma.journey.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });

    if (!journey) {
      return res.status(404).json({ error: 'Journey not found' });
    }

    await prisma.journey.delete({ where: { id } });

    return res.json({ success: true, message: 'Journey deleted successfully' });
  } catch (error) {
    console.error('Error deleting journey:', error);
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
        id: `journey-${Date.now()}`, // Generate unique ID
        name: data.name,
        forward: data.forward,
        keeperId: data.keeperId,
        domainId: data.domainId,
        theme_id: data.theme_id,
        ownerId: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
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
