/**
 * Domain-Integrated Keeper API Routes
 * Updated Keeper endpoints that respect domain permissions and boundaries
 */

import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/authMiddleware';
import { validationMiddleware } from '../../middleware/validationMiddleware';
import { 
  requireDomainReadCompat, 
  requireDomainWriteCompat, 
  requireDomainAdminCompat,
  AuthenticatedRequest as DomainAuthenticatedRequest 
} from '../../middleware/domainPermissionMiddleware';
import { DomainService, DomainCacheService, getFeatureFlagService } from '@keeper/database';
import { Redis } from 'ioredis';

const router = Router();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const cacheService = new DomainCacheService(redis);
const domainService = new DomainService(prisma, cacheService);
const featureFlags = getFeatureFlagService();

// Validation schemas
const createKeeperSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.string().default('personal'),
  metadata: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
  domainId: z.string().uuid(),
  isPublic: z.boolean().default(false),
  allowCollaboration: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

const updateKeeperSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  type: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
  isPublic: z.boolean().optional(),
  allowCollaboration: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const keeperSearchSchema = z.object({
  search: z.string().optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  domainId: z.string().uuid().optional(),
  isPublic: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

/**
 * GET /api/keepers - Get keepers with domain-based filtering
 */
router.get('/', 
  authMiddleware,
  requireDomainReadCompat,
  validationMiddleware(keeperSearchSchema, 'query'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const filters = req.query;
      const userId = req.user.id;

      // Build base query
      const where: any = {};

      // Domain filtering
      if (filters.domainId) {
        // Check if user has permission to access this domain
        const hasPermission = await req.domainScope?.canAccessDomain(filters.domainId);
        if (!hasPermission) {
          return res.status(403).json({ error: 'Access denied to domain' });
        }
        where.domainId = filters.domainId;
      } else {
        // Filter by user's accessible domains
        where.domainId = { in: req.domainScope?.userDomains || [] };
      }

      // Additional filters
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.type) {
        where.type = filters.type;
      }

      if (filters.tags && filters.tags.length > 0) {
        where.tags = { hasSome: filters.tags };
      }

      if (filters.isPublic !== undefined) {
        where.isPublic = filters.isPublic;
      }

      // Execute query
      const [keepers, total] = await Promise.all([
        prisma.keeper.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: filters.limit,
          skip: filters.offset,
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

      // Additional permission filtering for cross-domain access
      const filteredKeepers = await filterContentByDomainPermissions(keepers, userId, 'read');

      res.json({
        keepers: filteredKeepers,
        total,
        page: Math.floor(filters.offset / filters.limit) + 1,
        limit: filters.limit,
      });
    } catch (error) {
      console.error('Error fetching keepers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/keepers/:id - Get keeper by ID with permission check
 */
router.get('/:id',
  authMiddleware,
  requireContentPermission('keeper', 'read'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const keeper = await prisma.keeper.findUnique({
        where: { id: req.params.id },
        include: {
          domain: {
            select: {
              id: true,
              name: true,
              slug: true,
              ownerId: true,
            },
          },
          Journey: {
            select: {
              id: true,
              name: true,
              createdAt: true,
            },
          },
        },
      });

      if (!keeper) {
        return res.status(404).json({ error: 'Keeper not found' });
      }

      // Add permission context
      const response = {
        ...keeper,
        permissions: {
          canEdit: req.domainContext?.permissions.includes('write') || false,
          canShare: req.domainContext?.permissions.includes('share') || false,
          canDelete: req.domainContext?.permissions.includes('delete') || false,
          canManage: req.domainContext?.permissions.includes('admin') || false,
        },
      };

      res.json({ keeper: response });
    } catch (error) {
      console.error('Error fetching keeper:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/keepers - Create new keeper with domain validation
 */
router.post('/',
  authMiddleware,
  validationMiddleware(createKeeperSchema),
  requireDomainPermission({ 
    requiredPermission: 'write',
    domainIdParam: 'domainId',
    contentType: 'keeper'
  }),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const { domainId, ...keeperData } = req.body;

      // Verify domain exists and user has permission
      const domain = req.domainContext?.domain;
      if (!domain) {
        return res.status(400).json({ error: 'Invalid domain' });
      }

      // Check domain limits
      const stats = await domainService.getDomainStats(domainId);
      const limits = domain.limits as any;
      
      if (limits?.max_keepers && stats.keeperCount >= limits.max_keepers) {
        return res.status(400).json({ 
          error: 'Domain keeper limit reached',
          current: stats.keeperCount,
          limit: limits.max_keepers
        });
      }

      // Create keeper
      const keeper = await prisma.keeper.create({
        data: {
          ...keeperData,
          domainId,
          userId: req.user.id,
        },
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
      });

      res.status(201).json({ keeper });
    } catch (error) {
      console.error('Error creating keeper:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/keepers/:id - Update keeper with permission check
 */
router.put('/:id',
  authMiddleware,
  validationMiddleware(updateKeeperSchema),
  requireContentPermission('keeper', 'write'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const keeper = await prisma.keeper.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          updatedAt: new Date(),
        },
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
      });

      res.json({ keeper });
    } catch (error) {
      console.error('Error updating keeper:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Keeper not found' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /api/keepers/:id - Delete keeper with permission check
 */
router.delete('/:id',
  authMiddleware,
  requireContentPermission('keeper', 'delete'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      // Check if keeper has dependent content
      const [journeyCount, momentCount] = await Promise.all([
        prisma.journey.count({ where: { keeperId: req.params.id } }),
        prisma.moment.count({ where: { keeperId: req.params.id } }),
      ]);

      if (journeyCount > 0 || momentCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete keeper with associated content',
          dependentContent: {
            journeys: journeyCount,
            moments: momentCount,
          }
        });
      }

      await prisma.keeper.delete({
        where: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting keeper:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/keepers/:id/journeys - Get keeper's journeys with permission check
 */
router.get('/:id/journeys',
  authMiddleware,
  requireContentPermission('keeper', 'read'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const journeys = await prisma.journey.findMany({
        where: { keeperId: req.params.id },
        orderBy: { createdAt: 'desc' },
        include: {
          moments: {
            select: {
              id: true,
              title: true,
              createdAt: true,
            },
          },
        },
      });

      res.json({ journeys });
    } catch (error) {
      console.error('Error fetching keeper journeys:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/keepers/:id/moments - Get keeper's moments with permission check
 */
router.get('/:id/moments',
  authMiddleware,
  requireContentPermission('keeper', 'read'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const moments = await prisma.moment.findMany({
        where: { keeperId: req.params.id },
        orderBy: { createdAt: 'desc' },
        include: {
          journey: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      res.json({ moments });
    } catch (error) {
      console.error('Error fetching keeper moments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/keepers/:id/share - Share keeper across domains
 */
router.post('/:id/share',
  authMiddleware,
  requireContentPermission('keeper', 'share'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      if (!featureFlags.isEnabled('CROSS_DOMAIN_SHARING_ENABLED')) {
        return res.status(403).json({ error: 'Cross-domain sharing is disabled' });
      }

      const { targetDomainId, permissions = ['read'], expiresAt } = req.body;

      // Validate target domain
      const targetDomain = await domainService.getDomainById(targetDomainId);
      if (!targetDomain) {
        return res.status(404).json({ error: 'Target domain not found' });
      }

      // Create cross-domain share
      const share = await prisma.crossDomainShare.create({
        data: {
          sourceDomainId: req.domainContext!.domain.id,
          targetDomainId,
          contentType: 'keeper',
          contentId: req.params.id,
          permissions,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          requireApproval: true,
        },
      });

      res.status(201).json({ share });
    } catch (error) {
      console.error('Error sharing keeper:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/keepers/:id/stats - Get keeper statistics
 */
router.get('/:id/stats',
  authMiddleware,
  requireContentPermission('keeper', 'read'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const [journeyCount, momentCount, lastActivity] = await Promise.all([
        prisma.journey.count({ where: { keeperId: req.params.id } }),
        prisma.moment.count({ where: { keeperId: req.params.id } }),
        prisma.moment.findFirst({
          where: { keeperId: req.params.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
      ]);

      const stats = {
        journeyCount,
        momentCount,
        lastActivity: lastActivity?.createdAt,
      };

      res.json({ stats });
    } catch (error) {
      console.error('Error fetching keeper stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router; 