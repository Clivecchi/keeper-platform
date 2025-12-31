/**
 * Domain-Integrated Keeper API Routes
 * Updated Keeper endpoints that respect domain permissions and boundaries
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { validationMiddleware } from '../../middleware/validationMiddleware.js';
import { requireDomainReadCompat, requireDomainWriteCompat, requireDomainAdminCompat } from '../../middleware/domainPermissionMiddleware.js';
import { DomainService, DomainCacheService, getFeatureFlagService } from '@keeper/database';
import { getRedis, type RedisClientOrNoOp } from '../../lib/redis.js';

const router: Router = Router();
const prisma = new PrismaClient();
const redis: RedisClientOrNoOp = getRedis();
const cacheService = new DomainCacheService(redis);
const domainService = new DomainService(prisma, cacheService);
const featureFlags = getFeatureFlagService();

// Validation schemas
const keeperSearchSchema = z.object({
  search: z.string().optional(),
  domainId: z.string().uuid().optional(),
  type: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const createKeeperSchema = z.object({
  title: z.string().min(1).max(200),
  purpose: z.string().min(1).max(1000),
  domainId: z.string().uuid(),
  type: z.string().optional(),
  isPublic: z.boolean().default(false),
  metadata: z.record(z.any()).optional(),
});

const updateKeeperSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  purpose: z.string().min(1).max(1000).optional(),
  type: z.string().optional(),
  isPublic: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * GET /api/keepers - Get keepers with filtering
 */
router.get('/', 
  authMiddlewareCompat,
  validationMiddleware(keeperSearchSchema),
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
          { purpose: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      // Status filtering
      if (filters.status && typeof filters.status === 'string') {
        where.status = filters.status;
      }

      // Type filtering
      if (filters.type && typeof filters.type === 'string') {
        where.type = filters.type;
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

      // Execute query
      const [keepers, total] = await Promise.all([
        prisma.keeper.findMany({
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
          },
        }),
        prisma.keeper.count({ where }),
      ]);

      return res.json({
        success: true,
        data: {
          keepers,
          total,
          page: Math.floor((Number(filters.offset) || 0) / (Number(filters.limit) || 20)) + 1,
          limit: Number(filters.limit) || 20,
        },
      });
    } catch (error) {
      console.error('Error fetching keepers:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/keepers/:id - Get specific keeper
 */
router.get('/:id',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const keeper = await prisma.keeper.findUnique({
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

      if (!keeper) {
        return res.status(404).json({ error: 'Keeper not found' });
      }

      return res.json({
        keeper: {
          ...keeper,
          permissions: {
            canEdit: (req as any).domainContext?.permissions.includes('write') || false,
            canShare: (req as any).domainContext?.permissions.includes('share') || false,
            canDelete: (req as any).domainContext?.permissions.includes('delete') || false,
            canManage: (req as any).domainContext?.permissions.includes('admin') || false,
          },
        },
      });
    } catch (error) {
      console.error('Error fetching keeper:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/keepers - Create new keeper
 */
router.post('/',
  authMiddlewareCompat,
  validationMiddleware(createKeeperSchema),
  requireDomainWriteCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId, ...keeperData } = req.body;

      // Check domain permission
      const hasPermission = await (req as any).domainScope?.canAccessDomain(domainId);
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied to domain' });
      }

      const keeper = await prisma.keeper.create({
        data: {
          ...keeperData,
          domainId,
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

      return res.status(201).json({ keeper });
    } catch (error) {
      console.error('Error creating keeper:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/keepers/:id - Update keeper
 */
router.put('/:id',
  authMiddlewareCompat,
  validationMiddleware(updateKeeperSchema),
  requireDomainWriteCompat,
  async (req: Request, res: Response) => {
    try {
      const keeper = await prisma.keeper.update({
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

      return res.json({ keeper });
    } catch (error) {
      console.error('Error updating keeper:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /api/keepers/:id - Delete keeper
 */
router.delete('/:id',
  authMiddlewareCompat,
  requireDomainWriteCompat,
  async (req: Request, res: Response) => {
    try {
      // Check if keeper has dependent moments
      const momentCount = await prisma.moment.count({ 
        where: { journeyId: req.params.id } 
      });

      if (momentCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete keeper with dependent moments',
          momentCount 
        });
      }

      await prisma.keeper.delete({
        where: { id: req.params.id },
      });

      return res.json({ message: 'Keeper deleted successfully' });
    } catch (error) {
      console.error('Error deleting keeper:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/keepers/:id/journeys - Get journeys for keeper
 */
router.get('/:id/journeys',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const journeys = await prisma.journey.findMany({
        where: { keeperId: req.params.id },
        orderBy: { createdAt: 'desc' },
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

      return res.json({ journeys });
    } catch (error) {
      console.error('Error fetching keeper journeys:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/keepers/:id/moments - Get moments for keeper
 */
router.get('/:id/moments',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const moments = await prisma.moment.findMany({
        where: { journeyId: req.params.id },
        orderBy: { createdAt: 'desc' },
        include: {
          Journey: {
            select: {
              id: true,
            },
          },
        },
      });

      return res.json({ moments });
    } catch (error) {
      console.error('Error fetching keeper moments:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/keepers/:id/share - Share keeper
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
          sourceDomainId: (req as any).domainContext!.domain.id as string,
          targetDomainId,
          contentType: 'keeper',
          contentId: req.params.id,
        },
      });

      return res.status(201).json({ share });
    } catch (error) {
      console.error('Error sharing keeper:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/keepers/:id/stats - Get keeper statistics
 */
router.get('/:id/stats',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const [journeyCount, momentCount, lastActivity] = await Promise.all([
        prisma.journey.count({ where: { keeperId: req.params.id } }),
        prisma.moment.count({ where: { journeyId: req.params.id } }),
        prisma.moment.findFirst({
          where: { journeyId: req.params.id },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        }),
      ]);

      return res.json({
        stats: {
          journeyCount,
          momentCount,
          lastActivity: lastActivity?.updatedAt,
        },
      });
    } catch (error) {
      console.error('Error fetching keeper stats:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router; 