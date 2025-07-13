/**
 * Domain-Integrated Moment API Routes
 * Updated Moment endpoints that respect domain permissions and boundaries
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { validationMiddleware } from '../../middleware/validationMiddleware.js';
import { 
  requireDomainReadCompat, 
  requireDomainWriteCompat, 
  requireDomainAdminCompat
} from '../../middleware/domainPermissionMiddleware.js';
import { DomainService, DomainCacheService, getFeatureFlagService } from '@keeper/database';
import { Redis } from 'ioredis';

const router: Router = Router();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const cacheService = new DomainCacheService(redis);
const domainService = new DomainService(prisma, cacheService);
const featureFlags = getFeatureFlagService();

// Validation schemas
const createMomentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  type: z.enum(['text', 'image', 'video', 'audio', 'link', 'file']).default('text'),
  journeyId: z.string().uuid(),
  keeperId: z.string().uuid(),
  domainId: z.string().uuid(),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    type: z.string(),
    size: z.number().optional(),
    name: z.string().optional(),
  })).optional(),
});

const updateMomentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).optional(),
  type: z.enum(['text', 'image', 'video', 'audio', 'link', 'file']).optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    type: z.string(),
    size: z.number().optional(),
    name: z.string().optional(),
  })).optional(),
});

/**
 * GET /api/moments - Get moments with basic filtering
 */
router.get('/', 
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { search, limit = 20, offset = 0 } = req.query;
      const userId = req.user.id;

      // Build basic query
      const where: Record<string, unknown> = {};

      // Search filtering
      if (search && typeof search === 'string') {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { content: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Execute query
      const [moments, total] = await Promise.all([
        prisma.moment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: Number(limit),
          skip: Number(offset),
          include: {
            domain: {
              select: {
                id: true,
                name: true,
                slug: true,
                ownerId: true,
              },
            },
          },
        }),
        prisma.moment.count({ where }),
      ]);

      return res.json({
        moments,
        total,
        page: Math.floor(Number(offset) / Number(limit)) + 1,
        limit: Number(limit),
      });
    } catch (error) {
      console.error('Error fetching moments:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/moments/:id - Get specific moment
 */
router.get('/:id',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const moment = await prisma.moment.findUnique({
        where: { id: req.params.id },
        include: {
          domain: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!moment) {
        return res.status(404).json({ error: 'Moment not found' });
      }

      return res.json({ moment });
    } catch (error) {
      console.error('Error fetching moment:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/moments - Create new moment
 */
router.post('/',
  authMiddlewareCompat,
  validationMiddleware(createMomentSchema),
  requireDomainWriteCompat,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { domainId, keeperId, journeyId, ...momentData } = req.body;

      const moment = await prisma.moment.create({
        data: {
          ...momentData,
          domainId,
          keeperId,
          journeyId,
          ownerId: req.user.id,
        },
        include: {
          domain: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      return res.status(201).json({ moment });
    } catch (error) {
      console.error('Error creating moment:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/moments/:id - Update moment
 */
router.put('/:id',
  authMiddlewareCompat,
  validationMiddleware(updateMomentSchema),
  requireDomainWriteCompat,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const moment = await prisma.moment.update({
        where: { id: req.params.id },
        data: req.body,
        include: {
          domain: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      return res.json({ moment });
    } catch (error) {
      console.error('Error updating moment:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /api/moments/:id - Delete moment
 */
router.delete('/:id',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      await prisma.moment.delete({
        where: { id: req.params.id },
      });

      return res.json({ message: 'Moment deleted successfully' });
    } catch (error) {
      console.error('Error deleting moment:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router; 