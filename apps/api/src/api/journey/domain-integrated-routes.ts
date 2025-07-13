/**
 * Domain-Integrated Journey API Routes
 * Updated Journey endpoints that respect domain permissions and boundaries
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { validationMiddleware } from '../../middleware/validationMiddleware.js';
import { requireDomainReadCompat, requireDomainWriteCompat, requireDomainAdminCompat } from '../../middleware/domainPermissionMiddleware.js';
import { DomainService, DomainCacheService, getFeatureFlagService } from '@keeper/database';
import Redis from 'ioredis';

const router = Router();
const prisma = new PrismaClient();
let redis: Redis | null = null;
if (process.env.REDIS_URL && process.env.DISABLE_REDIS !== 'true') {
  redis = new Redis(process.env.REDIS_URL);
} else if (process.env.NODE_ENV === 'development') {
  console.warn('Redis not available in development. Features will degrade gracefully.');
}
const cacheService = new DomainCacheService(redis);
const domainService = new DomainService(prisma, cacheService);
const featureFlags = getFeatureFlagService();

// Validation schemas
const journeySearchSchema = z.object({
  search: z.string().optional(),
  domainId: z.string().uuid().optional(),
  keeperId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['active', 'archived', 'draft']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const createJourneySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  domainId: z.string().uuid(),
  keeperId: z.string().uuid(),
  tags: z.array(z.string()).default([]),
  isPublic: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
});

const updateJourneySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

// Apply domain context middleware to all routes
router.use(requireDomainReadCompat);

/**
 * GET /api/journeys - Get journeys with filtering
 */
router.get('/', 
  authMiddlewareCompat,
  validationMiddleware(journeySearchSchema),
  async (req: Request, res: Response) => {
    try {
      const filters = req.query;
      const userId = (req as any).user?.id;

      // Build base query
      const where: Record<string, unknown> = {};

      // Search filtering
      if (filters.search && typeof filters.search === 'string') {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Status filtering
      if (filters.status && typeof filters.status === 'string') {
        where.status = filters.status;
      }

      // Tags filtering
      if (filters.tags && Array.isArray(filters.tags) && (filters.tags as string[]).length > 0) {
        where.tags = { hasSome: filters.tags as string[] };
      }

      // Domain filtering
      if (filters.domainId && typeof filters.domainId === 'string') {
        const hasPermission = await (req as any).domainScope?.canAccessDomain(filters.domainId);
        if (!hasPermission) {
          return res.status(403).json({ error: 'Access denied to domain' });
        }
        where.domainId = filters.domainId;
      } else {
        where.domainId = { in: (req as any).domainScope?.userDomains || [] };
      }

      // Keeper filtering
      if (filters.keeperId && typeof filters.keeperId === 'string') {
        const keeper = await prisma.keeper.findUnique({
          where: { id: filters.keeperId },
          select: { domainId: true },
        });

        if (!keeper) {
          return res.status(404).json({ error: 'Keeper not found' });
        }

        const hasKeeperAccess = await (req as any).domainScope?.canAccessDomain(keeper.domainId);
        if (!hasKeeperAccess) {
          return res.status(403).json({ error: 'Access denied to keeper' });
        }

        where.keeperId = filters.keeperId;
      }

      // Execute query
      const [journeys, total] = await Promise.all([
        prisma.journey.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: Number(filters.limit) || 20,
          skip: Number(filters.offset) || 0,
          include: {
            domain: {
              select: {
                id: true,
                name: true,
                slug: true,
                ownerId: true,
              },
            },
            Keeper: {
              select: {
                id: true,
                title: true,
                purpose: true,
              },
            },
          },
        }),
        prisma.journey.count({ where }),
      ]);

      return res.json({
        journeys,
        total,
        page: Math.floor((Number(filters.offset) || 0) / (Number(filters.limit) || 20)) + 1,
        limit: Number(filters.limit) || 20,
      });
    } catch (error) {
      console.error('Error fetching journeys:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/journeys/:id - Get specific journey
 */
router.get('/:id',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const journey = await prisma.journey.findUnique({
        where: { id: req.params.id },
        include: {
          domain: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          Keeper: {
            select: {
              id: true,
              title: true,
              purpose: true,
            },
          },
        },
      });

      if (!journey) {
        return res.status(404).json({ error: 'Journey not found' });
      }

      return res.json({
        journey: {
          ...journey,
          permissions: {
            canEdit: (req as any).domainContext?.permissions.includes('write') || false,
            canShare: (req as any).domainContext?.permissions.includes('share') || false,
            canDelete: (req as any).domainContext?.permissions.includes('delete') || false,
            canManage: (req as any).domainContext?.permissions.includes('admin') || false,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching journey:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/journeys - Create new journey
 */
router.post('/',
  authMiddlewareCompat,
  validationMiddleware(createJourneySchema),
  requireDomainWriteCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId, keeperId, ...journeyData } = req.body;

      // Check domain permission
      const hasPermission = await (req as any).domainScope?.canAccessDomain(domainId);
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied to domain' });
      }

      const journey = await prisma.journey.create({
        data: {
          ...journeyData,
          domainId,
          keeperId,
          userId: (req as any).user?.id,
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

      return res.status(201).json({ journey });
    } catch (error) {
      console.error('Error creating journey:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/journeys/:id - Update journey
 */
router.put('/:id',
  authMiddlewareCompat,
  validationMiddleware(updateJourneySchema),
  requireDomainWriteCompat,
  async (req: Request, res: Response) => {
    try {
      const journey = await prisma.journey.update({
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

      return res.json({ journey });
    } catch (error) {
      console.error('Error updating journey:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /api/journeys/:id - Delete journey
 */
router.delete('/:id',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: Request, res: Response) => {
    try {
      // Check if journey has dependent moments
      const momentCount = await prisma.moment.count({
        where: { journeyId: req.params.id },
      });

      if (momentCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete journey with dependent moments',
          momentCount 
        });
      }

      await prisma.journey.delete({
        where: { id: req.params.id },
      });

      return res.json({ message: 'Journey deleted successfully' });
    } catch (error) {
      console.error('Error deleting journey:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/journeys/:id/moments - Get moments for journey
 */
router.get('/:id/moments',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const moments = await prisma.moment.findMany({
        where: { journeyId: req.params.id },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          narrative: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return res.json({ moments });
    } catch (error) {
      console.error('Error fetching journey moments:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/journeys/:id/moments - Add moment to journey
 */
router.post('/:id/moments',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: Request, res: Response) => {
    try {
      const journey = await prisma.journey.findUnique({
        where: { id: req.params.id },
        select: { keeperId: true, domainId: true },
      });

      if (!journey) {
        return res.status(404).json({ error: 'Journey not found' });
      }

      const moment = await prisma.moment.create({
        data: {
          ...req.body,
          journeyId: req.params.id,
          keeperId: journey.keeperId,
          domainId: journey.domainId,
          ownerId: (req as any).user?.id,
        },
        select: {
          id: true,
          title: true,
          narrative: true,
          ownerId: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return res.status(201).json({ moment });
    } catch (error) {
      console.error('Error adding moment to journey:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/journeys/:id/share - Share journey
 */
router.post('/:id/share',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: Request, res: Response) => {
    try {
      if (!featureFlags.isEnabled('CROSS_DOMAIN_SHARING_ENABLED')) {
        return res.status(400).json({ error: 'Cross-domain sharing is not enabled' });
      }

      const { targetDomainId, shareType = 'read_only' } = req.body;

      const share = await prisma.crossDomainShare.create({
        data: {
          sourceDomainId: (req as any).domainContext!.domain.id,
          targetDomainId,
          contentType: 'journey',
          contentId: req.params.id,
        },
      });

      return res.status(201).json({ share });
    } catch (error) {
      console.error('Error sharing journey:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/journeys/:id/stats - Get journey statistics
 */
router.get('/:id/stats',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const [momentCount, lastActivity, participants] = await Promise.all([
        prisma.moment.count({ where: { journeyId: req.params.id } }),
        prisma.moment.findFirst({
          where: { journeyId: req.params.id },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
        prisma.moment.findMany({
          where: { journeyId: req.params.id },
          select: { ownerId: true },
          distinct: ['ownerId'],
        }),
      ]);

      const journey = await prisma.journey.findUnique({
        where: { id: req.params.id },
        select: { domainId: true },
      });

      if (!journey) {
        return res.status(404).json({ error: 'Journey not found' });
      }

      if (!journey.domainId) {
        return res.status(400).json({ error: 'Journey has no domain' });
      }

      const domain = await domainService.getDomainById(journey.domainId);
      const stats = await domainService.getDomainStats(journey.domainId);

      return res.json({
        stats: {
          momentCount,
          lastActivity: lastActivity?.updatedAt,
          participantCount: participants.length,
          domain,
          domainStats: stats,
        },
      });
    } catch (error) {
      console.error('Error fetching journey stats:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router; 