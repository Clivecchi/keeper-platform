/**
 * Domain-Integrated Moment API Routes
 * Updated Moment endpoints that respect domain permissions and boundaries
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { mergePresenceSchemaCover } from '@keeper/shared';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { queryValidationMiddleware, validationMiddleware } from '../../middleware/validationMiddleware.js';
import { 
  requireDomainReadCompat, 
  requireDomainWriteCompat, 
  requireDomainAdminCompat
} from '../../middleware/domainPermissionMiddleware.js';
import { DomainService, DomainCacheService, getFeatureFlagService } from '@keeper/database';
import { getRedis, type RedisClientOrNoOp } from '../../lib/redis.js';

const router: Router = Router();
const prisma = new PrismaClient();
const featureFlags = getFeatureFlagService();

// Validation schemas
const createMomentSchema = z.object({
  title: z.string().min(1).max(200),
  narrative: z.string().min(1),
  type: z.enum(['text', 'image', 'video', 'audio', 'link', 'file']).default('text'),
  journeyId: z.string().min(1),
  keeperId: z.string().min(1),
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
  narrative: z.string().min(1).optional(),
  type: z.enum(['text', 'image', 'video', 'audio', 'link', 'file']).optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  coverImage: z.string().url().nullable().optional(),
  coverImageKey: z.string().nullable().optional(),
  attachments: z.array(z.object({
    url: z.string().url(),
    type: z.string(),
    size: z.number().optional(),
    name: z.string().optional(),
  })).optional(),
});

const momentQuerySchema = z.object({
  search: z.string().optional(),
  domainId: z.string().uuid().optional(),
  journeyId: z.string().min(1).optional(),
  pathId: z.string().min(1).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /api/moments - Get moments with basic filtering
 */
router.get('/', 
  authMiddlewareCompat,
  requireDomainReadCompat,
  queryValidationMiddleware(momentQuerySchema),
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { search, limit = 20, offset = 0, domainId, journeyId, pathId } = req.query as {
        search?: string
        limit?: number
        offset?: number
        domainId?: string
        journeyId?: string
        pathId?: string
      };

      // Build basic query
      const where: Record<string, unknown> = {};

      // Search filtering
      if (search && typeof search === 'string') {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { narrative: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (journeyId) {
        where.journeyId = journeyId;
      }

      if (pathId) {
        where.pathId = pathId;
      }

      if (domainId) {
        const userId = (req as any).user?.id;
        if (userId) {
          const domain = await prisma.domain.findUnique({
            where: { id: domainId },
            select: { ownerId: true },
          });
          const isOwner = domain?.ownerId === userId;
          if (!isOwner) {
            const perm = await prisma.domainPermission.findFirst({
              where: { domainId, userId },
            });
            if (!perm) {
              return res.status(403).json({ error: 'Access denied to domain' });
            }
          }
        }
        where.domainId = domainId;
      } else {
        // Fallback: list moments for domains the user owns or has permission to
        const userId = (req as any).user?.id;
        if (userId) {
          const [ownedDomains, permDomains] = await Promise.all([
            prisma.domain.findMany({ where: { ownerId: userId }, select: { id: true } }),
            prisma.domainPermission.findMany({ where: { userId }, select: { domainId: true } }),
          ]);
          const domainIds = [
            ...ownedDomains.map(d => d.id),
            ...permDomains.map(d => d.domainId),
          ];
          if (domainIds.length > 0) {
            where.domainId = { in: [...new Set(domainIds)] };
          }
        }
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
async function updateMomentById(req: Request, res: Response): Promise<Response> {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = updateMomentSchema.parse(req.body);
    const { coverImage, coverImageKey, ...metadata } = payload;

    const existing = await prisma.moment.findUnique({
      where: { id: req.params.id },
      select: { id: true, presenceSchema: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Moment not found' });
    }

    const updateData: {
      title?: string;
      narrative?: string;
      type?: string;
      isPublic?: boolean;
      tags?: string[];
      metadata?: Record<string, unknown>;
      attachments?: unknown;
      presenceSchema?: unknown;
    } = { ...metadata };

    if (coverImage !== undefined) {
      updateData.presenceSchema = mergePresenceSchemaCover(
        existing.presenceSchema,
        coverImage,
        coverImageKey,
      );
    }

    const moment = await prisma.moment.update({
      where: { id: req.params.id },
      data: updateData,
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

router.put('/:id',
  authMiddlewareCompat,
  validationMiddleware(updateMomentSchema),
  requireDomainWriteCompat,
  updateMomentById
);

/**
 * PATCH /api/moments/:id - Partial update (Chronicle Config save)
 */
router.patch('/:id',
  authMiddlewareCompat,
  validationMiddleware(updateMomentSchema),
  requireDomainWriteCompat,
  updateMomentById
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