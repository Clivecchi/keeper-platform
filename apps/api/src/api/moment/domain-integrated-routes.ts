/**
 * Domain-Integrated Moment API Routes
 * Updated Moment endpoints that respect domain permissions and boundaries
 */

import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from '../../middleware/authMiddleware';
import { validationMiddleware } from '../../middleware/validationMiddleware';
import { 
  domainContextMiddleware, 
  requireDomainPermission, 
  requireContentPermission,
  domainScopedQuery,
  filterContentByDomainPermissions,
  type DomainAuthenticatedRequest 
} from '../../middleware/domainPermissionMiddleware';
import { DomainService } from '../../../../packages/database/src/services/DomainService';
import { DomainCacheService } from '../../../../packages/database/src/services/DomainCacheService';
import { getFeatureFlagService } from '../../../../packages/database/src/services/FeatureFlagService';

const router = Router();
const prisma = new PrismaClient();
const cacheService = new DomainCacheService();
const domainService = new DomainService(prisma, cacheService);
const featureFlags = getFeatureFlagService();

// Apply domain context middleware to all routes
router.use(domainContextMiddleware);

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

const momentSearchSchema = z.object({
  search: z.string().optional(),
  journeyId: z.string().uuid().optional(),
  keeperId: z.string().uuid().optional(),
  domainId: z.string().uuid().optional(),
  type: z.enum(['text', 'image', 'video', 'audio', 'link', 'file']).optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

/**
 * GET /api/moments - Get moments with domain-based filtering
 */
router.get('/', 
  authMiddleware,
  domainScopedQuery('user'),
  validationMiddleware(momentSearchSchema, 'query'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const filters = req.query;
      const userId = req.user.id;

      // Build base query
      const where: any = {};

      // Domain filtering
      if (filters.domainId) {
        const hasPermission = await req.domainScope?.canAccessDomain(filters.domainId);
        if (!hasPermission) {
          return res.status(403).json({ error: 'Access denied to domain' });
        }
        where.domainId = filters.domainId;
      } else {
        where.domainId = { in: req.domainScope?.userDomains || [] };
      }

      // Journey filtering
      if (filters.journeyId) {
        const journey = await prisma.journey.findUnique({
          where: { id: filters.journeyId },
          select: { domainId: true },
        });
        
        if (!journey) {
          return res.status(404).json({ error: 'Journey not found' });
        }

        const hasJourneyAccess = await req.domainScope?.canAccessDomain(journey.domainId);
        if (!hasJourneyAccess) {
          return res.status(403).json({ error: 'Access denied to journey' });
        }

        where.journeyId = filters.journeyId;
      }

      // Keeper filtering
      if (filters.keeperId) {
        const keeper = await prisma.keeper.findUnique({
          where: { id: filters.keeperId },
          select: { domainId: true },
        });
        
        if (!keeper) {
          return res.status(404).json({ error: 'Keeper not found' });
        }

        const hasKeeperAccess = await req.domainScope?.canAccessDomain(keeper.domainId);
        if (!hasKeeperAccess) {
          return res.status(403).json({ error: 'Access denied to keeper' });
        }

        where.keeperId = filters.keeperId;
      }

      // Additional filters
      if (filters.search) {
        where.OR = [
          { title: { contains: filters.search, mode: 'insensitive' } },
          { content: { contains: filters.search, mode: 'insensitive' } },
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

      // Date range filtering
      if (filters.dateFrom || filters.dateTo) {
        where.createdAt = {};
        if (filters.dateFrom) {
          where.createdAt.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          where.createdAt.lte = new Date(filters.dateTo);
        }
      }

      // Execute query
      const [moments, total] = await Promise.all([
        prisma.moment.findMany({
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
            keeper: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
            journey: {
              select: {
                id: true,
                title: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        prisma.moment.count({ where }),
      ]);

      // Additional permission filtering
      const filteredMoments = await filterContentByDomainPermissions(moments, userId, 'read');

      res.json({
        moments: filteredMoments,
        total,
        page: Math.floor(filters.offset / filters.limit) + 1,
        limit: filters.limit,
      });
    } catch (error) {
      console.error('Error fetching moments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/moments/:id - Get moment by ID with permission check
 */
router.get('/:id',
  authMiddleware,
  requireContentPermission('moment', 'read'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const moment = await prisma.moment.findUnique({
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
          keeper: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          journey: {
            select: {
              id: true,
              title: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!moment) {
        return res.status(404).json({ error: 'Moment not found' });
      }

      // Add permission context
      const response = {
        ...moment,
        permissions: {
          canEdit: req.domainContext?.permissions.includes('write') || false,
          canShare: req.domainContext?.permissions.includes('share') || false,
          canDelete: req.domainContext?.permissions.includes('delete') || false,
          canManage: req.domainContext?.permissions.includes('admin') || false,
        },
      };

      res.json({ moment: response });
    } catch (error) {
      console.error('Error fetching moment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/moments - Create new moment with domain validation
 */
router.post('/',
  authMiddleware,
  validationMiddleware(createMomentSchema),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const { domainId, keeperId, journeyId, ...momentData } = req.body;

      // Verify journey exists and belongs to the correct keeper/domain
      const journey = await prisma.journey.findUnique({
        where: { id: journeyId },
        select: { domainId: true, keeperId: true },
      });

      if (!journey) {
        return res.status(404).json({ error: 'Journey not found' });
      }

      if (journey.domainId !== domainId) {
        return res.status(400).json({ error: 'Journey does not belong to specified domain' });
      }

      if (journey.keeperId !== keeperId) {
        return res.status(400).json({ error: 'Journey does not belong to specified keeper' });
      }

      // Check domain permission
      const hasPermission = await req.domainScope?.canAccessDomain(domainId);
      if (!hasPermission) {
        return res.status(403).json({ error: 'Access denied to domain' });
      }

      // Verify domain limits
      const domain = await domainService.getDomainById(domainId);
      if (!domain) {
        return res.status(404).json({ error: 'Domain not found' });
      }

      const stats = await domainService.getDomainStats(domainId);
      const limits = domain.limits as any;
      
      if (limits?.max_moments && stats.momentCount >= limits.max_moments) {
        return res.status(400).json({ 
          error: 'Domain moment limit reached',
          current: stats.momentCount,
          limit: limits.max_moments
        });
      }

      // Create moment
      const moment = await prisma.moment.create({
        data: {
          ...momentData,
          domainId,
          keeperId,
          journeyId,
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
          keeper: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          journey: {
            select: {
              id: true,
              title: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.status(201).json({ moment });
    } catch (error) {
      console.error('Error creating moment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/moments/:id - Update moment with permission check
 */
router.put('/:id',
  authMiddleware,
  validationMiddleware(updateMomentSchema),
  requireContentPermission('moment', 'write'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const moment = await prisma.moment.update({
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
          keeper: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          journey: {
            select: {
              id: true,
              title: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json({ moment });
    } catch (error) {
      console.error('Error updating moment:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Moment not found' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /api/moments/:id - Delete moment with permission check
 */
router.delete('/:id',
  authMiddleware,
  requireContentPermission('moment', 'delete'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      await prisma.moment.delete({
        where: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting moment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/moments/:id/share - Share moment across domains
 */
router.post('/:id/share',
  authMiddleware,
  requireContentPermission('moment', 'share'),
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
          contentType: 'moment',
          contentId: req.params.id,
          permissions,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          requireApproval: true,
        },
      });

      res.status(201).json({ share });
    } catch (error) {
      console.error('Error sharing moment:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/moments/:id/history - Get moment edit history
 */
router.get('/:id/history',
  authMiddleware,
  requireContentPermission('moment', 'read'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      // For now, return empty history - this would be implemented with an audit log
      const history = [];

      res.json({ history });
    } catch (error) {
      console.error('Error fetching moment history:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/moments/:id/reactions - Add reaction to moment
 */
router.post('/:id/reactions',
  authMiddleware,
  requireContentPermission('moment', 'read'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const { emoji, type = 'like' } = req.body;

      // For now, just return success - this would be implemented with a reactions table
      const reaction = {
        id: 'temp-id',
        momentId: req.params.id,
        userId: req.user.id,
        emoji,
        type,
        createdAt: new Date(),
      };

      res.status(201).json({ reaction });
    } catch (error) {
      console.error('Error adding reaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/moments/timeline - Get moments timeline for domain
 */
router.get('/timeline',
  authMiddleware,
  domainScopedQuery('user'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const { domainId, limit = 20, offset = 0 } = req.query;
      const userId = req.user.id;

      // Build query
      const where: any = {};

      if (domainId) {
        const hasPermission = await req.domainScope?.canAccessDomain(domainId as string);
        if (!hasPermission) {
          return res.status(403).json({ error: 'Access denied to domain' });
        }
        where.domainId = domainId;
      } else {
        where.domainId = { in: req.domainScope?.userDomains || [] };
      }

      const moments = await prisma.moment.findMany({
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
            },
          },
          keeper: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          journey: {
            select: {
              id: true,
              title: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Filter by permissions
      const filteredMoments = await filterContentByDomainPermissions(moments, userId, 'read');

      res.json({ moments: filteredMoments });
    } catch (error) {
      console.error('Error fetching timeline:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router; 