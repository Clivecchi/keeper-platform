/**
 * Domain-Integrated Journey API Routes
 * Updated Journey endpoints that respect domain permissions and boundaries
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
const createJourneySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  keeperId: z.string().uuid(),
  domainId: z.string().uuid(),
  isPublic: z.boolean().default(false),
  allowCollaboration: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
});

const updateJourneySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().optional(),
  allowCollaboration: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
});

const journeySearchSchema = z.object({
  search: z.string().optional(),
  keeperId: z.string().uuid().optional(),
  domainId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

/**
 * GET /api/journeys - Get journeys with domain-based filtering
 */
router.get('/', 
  authMiddleware,
  domainScopedQuery('user'),
  validationMiddleware(journeySearchSchema, 'query'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const filters = req.query;
      const userId = req.user.id;

      // Build base query
      const where: Event = {};

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

      // Keeper filtering
      if (filters.keeperId) {
        // Verify user has access to the keeper
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
          { description: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.tags && filters.tags.length > 0) {
        where.tags = { hasSome: filters.tags };
      }

      if (filters.isPublic !== undefined) {
        where.isPublic = filters.isPublic;
      }

      // Execute query
      const [journeys, total] = await Promise.all([
        prisma.journey.findMany({
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
            Moment: {
              select: {
                id: true,
                title: true,
                createdAt: true,
              },
            },
          },
        }),
        prisma.journey.count({ where }),
      ]);

      // Additional permission filtering
      const filteredJourneys = await filterContentByDomainPermissions(journeys, userId, 'read');

      res.json({
        journeys: filteredJourneys,
        total,
        page: Math.floor(filters.offset / filters.limit) + 1,
        limit: filters.limit,
      });
    } catch (error) {
      console.error('Error fetching journeys:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/journeys/:id - Get journey by ID with permission check
 */
router.get('/:id',
  authMiddleware,
  requireContentPermission('journey', 'read'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const journey = await prisma.journey.findUnique({
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
          moments: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!journey) {
        return res.status(404).json({ error: 'Journey not found' });
      }

      // Add permission context
      const response = {
        ...journey,
        permissions: {
          canEdit: req.domainContext?.permissions.includes('write') || false,
          canShare: req.domainContext?.permissions.includes('share') || false,
          canDelete: req.domainContext?.permissions.includes('delete') || false,
          canManage: req.domainContext?.permissions.includes('admin') || false,
        },
      };

      res.json({ journey: response });
    } catch (error) {
      console.error('Error fetching journey:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/journeys - Create new journey with domain validation
 */
router.post('/',
  authMiddleware,
  validationMiddleware(createJourneySchema),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const { domainId, keeperId, ...journeyData } = req.body;

      // Verify keeper exists and user has access
      const keeper = await prisma.keeper.findUnique({
        where: { id: keeperId },
        select: { domainId: true, userId: true },
      });

      if (!keeper) {
        return res.status(404).json({ error: 'Keeper not found' });
      }

      if (keeper.domainId !== domainId) {
        return res.status(400).json({ error: 'Keeper does not belong to specified domain' });
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
      const limits = domain.limits as Record<string, unknown>;
      
      if (typeof limits?.max_journeys === 'number' && stats.journeyCount >= limits.max_journeys) {
        return res.status(400).json({ 
          error: 'Domain journey limit reached',
          current: stats.journeyCount,
          limit: limits.max_journeys
        });
      }

      // Create journey
      const journey = await prisma.journey.create({
        data: {
          ...journeyData,
          domainId,
          keeperId,
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
        },
      });

      res.status(201).json({ journey });
    } catch (error) {
      console.error('Error creating journey:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/journeys/:id - Update journey with permission check
 */
router.put('/:id',
  authMiddleware,
  validationMiddleware(updateJourneySchema),
  requireContentPermission('journey', 'write'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const journey = await prisma.journey.update({
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
        },
      });

      res.json({ journey });
    } catch (error) {
      console.error('Error updating journey:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ error: 'Journey not found' });
      }
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * DELETE /api/journeys/:id - Delete journey with permission check
 */
router.delete('/:id',
  authMiddleware,
  requireContentPermission('journey', 'delete'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      // Check if journey has dependent moments
      const momentCount = await prisma.moment.count({ 
        where: { journeyId: req.params.id } 
      });

      if (momentCount > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete journey with associated moments',
          momentCount,
        });
      }

      await prisma.journey.delete({
        where: { id: req.params.id },
      });

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting journey:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/journeys/:id/moments - Get journey's moments with permission check
 */
router.get('/:id/moments',
  authMiddleware,
  requireContentPermission('journey', 'read'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const moments = await prisma.moment.findMany({
        where: { journeyId: req.params.id },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      res.json({ moments });
    } catch (error) {
      console.error('Error fetching journey moments:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * POST /api/journeys/:id/moments - Add moment to journey
 */
router.post('/:id/moments',
  authMiddleware,
  requireContentPermission('journey', 'write'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const journey = await prisma.journey.findUnique({
        where: { id: req.params.id },
        select: { domainId: true, keeperId: true },
      });

      if (!journey) {
        return res.status(404).json({ error: 'Journey not found' });
      }

      // Check domain limits
      const domain = await domainService.getDomainById(journey.domainId);
      const stats = await domainService.getDomainStats(journey.domainId);
      const limits = domain?.limits as Record<string, unknown>;
      
      if (typeof limits?.max_moments === 'number' && stats.momentCount >= limits.max_moments) {
        return res.status(400).json({ 
          error: 'Domain moment limit reached',
          current: stats.momentCount,
          limit: limits.max_moments
        });
      }

      const moment = await prisma.moment.create({
        data: {
          ...req.body,
          journeyId: req.params.id,
          keeperId: journey.keeperId,
          domainId: journey.domainId,
          userId: req.user.id,
        },
        include: {
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
 * POST /api/journeys/:id/share - Share journey across domains
 */
router.post('/:id/share',
  authMiddleware,
  requireContentPermission('journey', 'share'),
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
          contentType: 'journey',
          contentId: req.params.id,
          permissions,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          requireApproval: true,
        },
      });

      res.status(201).json({ share });
    } catch (error) {
      console.error('Error sharing journey:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/journeys/:id/stats - Get journey statistics
 */
router.get('/:id/stats',
  authMiddleware,
  requireContentPermission('journey', 'read'),
  async (req: DomainAuthenticatedRequest, res) => {
    try {
      const [momentCount, lastActivity, participants] = await Promise.all([
        prisma.moment.count({ where: { journeyId: req.params.id } }),
        prisma.moment.findFirst({
          where: { journeyId: req.params.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        }),
        prisma.moment.findMany({
          where: { journeyId: req.params.id },
          select: { 
            userId: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          distinct: ['userId'],
        }),
      ]);

      const stats = {
        momentCount,
        lastActivity: lastActivity?.createdAt,
        participantCount: participants.length,
        participants: participants.map(p => p.user),
      };

      res.json({ stats });
    } catch (error) {
      console.error('Error fetching journey stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router; 