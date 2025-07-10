/**
 * SOLE Memory API Routes
 * Comprehensive endpoints for domain-scoped memory operations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { SoleMemoryIsolationService, DomainCacheService } from '@keeper/database';
import { authMiddleware } from '../../middleware/authMiddleware';
import { 
  requireDomainReadCompat, 
  requireDomainWriteCompat, 
  requireDomainAdminCompat 
} from '../../middleware/domainPermissionMiddleware';
import { createMemoryAccessMiddleware, createCrossDomainMemoryMiddleware } from '../../middleware/memoryAccessMiddleware';
import { rateLimit } from 'express-rate-limit';
import { Redis } from 'ioredis';

const router = Router();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const cacheService = new DomainCacheService(redis);
const memoryService = new SoleMemoryIsolationService(prisma, cacheService);

// Rate limiting for memory operations
const memoryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many memory requests from this IP, please try again later.',
});

const memoryWriteLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 write requests per minute
  message: 'Too many memory write requests, please try again later.',
});

// Validation schemas
const memoryQuerySchema = z.object({
  query: z.string().min(1).max(1000),
  category: z.enum(['conversational', 'factual', 'procedural', 'episodic', 'semantic']).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  filters: z.object({
    dateRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional(),
    tags: z.array(z.string()).optional(),
    confidence: z.object({
      min: z.number().min(0).max(1),
      max: z.number().min(0).max(1),
    }).optional(),
    source: z.array(z.string()).optional(),
  }).optional(),
});

const memoryInsertSchema = z.object({
  category: z.enum(['conversational', 'factual', 'procedural', 'episodic', 'semantic']),
  content: z.any(),
  metadata: z.object({
    confidence: z.number().min(0).max(1).default(1.0),
    tags: z.array(z.string()).default([]),
    relations: z.array(z.string()).default([]),
  }).optional(),
  access: z.object({
    level: z.enum(['read', 'write', 'admin']).default('read'),
    users: z.array(z.string()).optional(),
    expires: z.string().datetime().optional(),
  }).optional(),
});

const memoryUpdateSchema = z.object({
  content: z.any().optional(),
  metadata: z.object({
    confidence: z.number().min(0).max(1).optional(),
    tags: z.array(z.string()).optional(),
    relations: z.array(z.string()).optional(),
  }).optional(),
  access: z.object({
    level: z.enum(['read', 'write', 'admin']).optional(),
    users: z.array(z.string()).optional(),
    expires: z.string().datetime().optional(),
  }).optional(),
});

const memoryShareRequestSchema = z.object({
  targetDomainId: z.string().uuid(),
  shareType: z.enum(['read_only', 'read_write', 'reference_only']),
  memoryCategories: z.array(z.enum(['conversational', 'factual', 'procedural', 'episodic', 'semantic'])),
  accessLevel: z.enum(['limited', 'full', 'custom']).default('limited'),
  purpose: z.string().max(500).optional(),
  expiresAt: z.string().datetime().optional(),
  maxAccess: z.number().min(1).optional(),
});

const memoryMigrationRequestSchema = z.object({
  targetDomainId: z.string().uuid().optional(),
  migrationType: z.enum(['copy', 'move', 'merge', 'split']),
  memoryCategories: z.array(z.enum(['conversational', 'factual', 'procedural', 'episodic', 'semantic'])),
  preserveSource: z.boolean().default(true),
  transformRules: z.any().optional(),
  mappingRules: z.any().optional(),
  validationRules: z.any().optional(),
});

// Apply middleware
router.use(memoryRateLimit);
router.use(authMiddleware);

/**
 * @route GET /api/memory/:domainId/scope
 * @desc Get memory scope information for domain
 * @access Private (Domain User)
 */
router.get(
  '/:domainId/scope',
  requireDomainReadCompat,
  createMemoryAccessMiddleware({ minAccessLevel: 'read' }),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;

      const memoryScope = await memoryService.getMemoryScope(domainId);
      const quota = await memoryService.getMemoryQuota(domainId);

      res.json({
        success: true,
        data: {
          scope: memoryScope,
          quota,
        },
      });
    } catch (error) {
      console.error('Get memory scope error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get memory scope',
      });
    }
  }
);

/**
 * @route POST /api/memory/:domainId/query
 * @desc Query memory content
 * @access Private (Domain User)
 */
router.post(
  '/:domainId/query',
  requireDomainReadCompat,
  createMemoryAccessMiddleware({ minAccessLevel: 'read' }),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }
      
      const userId = req.user.id;
      const validation = memoryQuerySchema.parse(req.body);

      const query = {
        domainId,
        userId,
        ...validation,
        filters: validation.filters ? {
          ...validation.filters,
          dateRange: validation.filters.dateRange ? {
            start: new Date(validation.filters.dateRange.start),
            end: new Date(validation.filters.dateRange.end),
          } : undefined,
        } : undefined,
      };

      const memories = await memoryService.queryMemory(query);

      res.json({
        success: true,
        data: memories,
        meta: {
          total: memories.length,
          limit: validation.limit,
          offset: validation.offset,
        },
      });
    } catch (error) {
      console.error('Memory query error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to query memory',
      });
    }
  }
);

/**
 * @route POST /api/memory/:domainId/insert
 * @desc Insert new memory content
 * @access Private (Domain User with Write Access)
 */
router.post(
  '/:domainId/insert',
  memoryWriteLimit,
  domainPermissionMiddleware(['admin', 'user']),
  createMemoryAccessMiddleware({ minAccessLevel: 'write', checkQuota: true }),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const userId = req.user!.id;
      const validation = memoryInsertSchema.parse(req.body);

      const insert = {
        domainId,
        userId,
        ...validation,
        metadata: validation.metadata ? {
          ...validation.metadata,
          source: userId,
          timestamp: new Date(),
        } : {
          confidence: 1.0,
          tags: [],
          relations: [],
          source: userId,
          timestamp: new Date(),
        },
        access: validation.access ? {
          ...validation.access,
          users: validation.access.users || [userId],
          expires: validation.access.expires ? new Date(validation.access.expires) : undefined,
        } : {
          level: 'read' as const,
          users: [userId],
        },
      };

      const memoryId = await memoryService.insertMemory(insert);

      res.status(201).json({
        success: true,
        data: { memoryId },
        message: 'Memory content inserted successfully',
      });
    } catch (error) {
      console.error('Memory insert error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to insert memory',
      });
    }
  }
);

/**
 * @route PUT /api/memory/:domainId/:memoryId
 * @desc Update memory content
 * @access Private (Domain User with Write Access)
 */
router.put(
  '/:domainId/:memoryId',
  memoryWriteLimit,
  domainPermissionMiddleware(['admin', 'user']),
  createMemoryAccessMiddleware({ minAccessLevel: 'write' }),
  async (req: Request, res: Response) => {
    try {
      const { domainId, memoryId } = req.params;
      const userId = req.user!.id;
      const validation = memoryUpdateSchema.parse(req.body);

      const updates = {
        ...validation,
        metadata: validation.metadata ? {
          ...validation.metadata,
          timestamp: new Date(),
        } : undefined,
        access: validation.access ? {
          ...validation.access,
          expires: validation.access.expires ? new Date(validation.access.expires) : undefined,
        } : undefined,
      };

      await memoryService.updateMemory(domainId, memoryId, userId, updates);

      res.json({
        success: true,
        message: 'Memory content updated successfully',
      });
    } catch (error) {
      console.error('Memory update error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update memory',
      });
    }
  }
);

/**
 * @route DELETE /api/memory/:domainId/:memoryId
 * @desc Delete memory content
 * @access Private (Domain User with Write Access)
 */
router.delete(
  '/:domainId/:memoryId',
  domainPermissionMiddleware(['admin', 'user']),
  createMemoryAccessMiddleware({ minAccessLevel: 'write' }),
  async (req: Request, res: Response) => {
    try {
      const { domainId, memoryId } = req.params;
      const userId = req.user!.id;

      await memoryService.deleteMemory(domainId, memoryId, userId);

      res.json({
        success: true,
        message: 'Memory content deleted successfully',
      });
    } catch (error) {
      console.error('Memory delete error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete memory',
      });
    }
  }
);

/**
 * @route GET /api/memory/:domainId/quota
 * @desc Get memory quota information
 * @access Private (Domain User)
 */
router.get(
  '/:domainId/quota',
  domainPermissionMiddleware(['admin', 'user']),
  createMemoryAccessMiddleware({ minAccessLevel: 'read' }),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;

      const quota = await memoryService.getMemoryQuota(domainId);

      res.json({
        success: true,
        data: quota,
      });
    } catch (error) {
      console.error('Memory quota error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get memory quota',
      });
    }
  }
);

/**
 * @route GET /api/memory/:domainId/analytics
 * @desc Get memory analytics
 * @access Private (Domain Admin)
 */
router.get(
  '/:domainId/analytics',
  domainPermissionMiddleware(['admin']),
  createMemoryAccessMiddleware({ minAccessLevel: 'admin' }),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const days = parseInt(req.query.days as string) || 30;

      const analytics = await memoryService.getMemoryAnalytics(domainId, days);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Memory analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get memory analytics',
      });
    }
  }
);

/**
 * @route POST /api/memory/:domainId/share/request
 * @desc Request memory share with another domain
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/share/request',
  domainPermissionMiddleware(['admin']),
  createMemoryAccessMiddleware({ minAccessLevel: 'admin' }),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const userId = req.user!.id;
      const validation = memoryShareRequestSchema.parse(req.body);

      const shareRequest = {
        sourceMemoryId: domainId,
        targetMemoryId: validation.targetDomainId,
        shareType: validation.shareType,
        memoryCategories: validation.memoryCategories,
        accessLevel: validation.accessLevel,
        requestedBy: userId,
        purpose: validation.purpose,
        expiresAt: validation.expiresAt ? new Date(validation.expiresAt) : undefined,
        maxAccess: validation.maxAccess,
      };

      const shareId = await memoryService.requestMemoryShare(shareRequest);

      res.status(201).json({
        success: true,
        data: { shareId },
        message: 'Memory share request created successfully',
      });
    } catch (error) {
      console.error('Memory share request error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create memory share request',
      });
    }
  }
);

/**
 * @route POST /api/memory/:domainId/share/:shareId/approve
 * @desc Approve memory share request
 * @access Private (Target Domain Admin)
 */
router.post(
  '/:domainId/share/:shareId/approve',
  domainPermissionMiddleware(['admin']),
  createMemoryAccessMiddleware({ minAccessLevel: 'admin' }),
  async (req: Request, res: Response) => {
    try {
      const { shareId } = req.params;
      const userId = req.user!.id;

      await memoryService.approveMemoryShare(shareId, userId);

      res.json({
        success: true,
        message: 'Memory share request approved successfully',
      });
    } catch (error) {
      console.error('Memory share approval error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve memory share request',
      });
    }
  }
);

/**
 * @route GET /api/memory/:domainId/shares
 * @desc Get memory shares for domain
 * @access Private (Domain Admin)
 */
router.get(
  '/:domainId/shares',
  domainPermissionMiddleware(['admin']),
  createMemoryAccessMiddleware({ minAccessLevel: 'admin' }),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const status = req.query.status as string;

      const whereClause: any = {
        OR: [
          { sourceMemoryId: domainId },
          { targetMemoryId: domainId },
        ],
      };

      if (status) {
        whereClause.status = status;
      }

      const shares = await prisma.memoryShare.findMany({
        where: whereClause,
        include: {
          requester: {
            select: { id: true, name: true, email: true },
          },
          approver: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: shares,
      });
    } catch (error) {
      console.error('Get memory shares error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get memory shares',
      });
    }
  }
);

/**
 * @route POST /api/memory/cross-domain/access
 * @desc Access memory from another domain (with approved share)
 * @access Private (Cross-domain access)
 */
router.post(
  '/cross-domain/access',
  createCrossDomainMemoryMiddleware(),
  async (req: Request, res: Response) => {
    try {
      const { sourceDomainId, targetDomainId, operation, data } = req.body;

      // This endpoint handles cross-domain memory access
      // The middleware ensures proper permissions and share agreements

      let result;
      switch (operation) {
        case 'query':
          result = await memoryService.queryMemory({
            domainId: sourceDomainId,
            userId: req.user!.id,
            ...data,
          });
          break;

        case 'insert':
          result = await memoryService.insertMemory({
            domainId: targetDomainId,
            userId: req.user!.id,
            ...data,
          });
          break;

        default:
          throw new Error(`Unsupported cross-domain operation: ${operation}`);
      }

      res.json({
        success: true,
        data: result,
        message: `Cross-domain ${operation} completed successfully`,
      });
    } catch (error) {
      console.error('Cross-domain memory access error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Cross-domain memory access failed',
      });
    }
  }
);

/**
 * @route POST /api/memory/:domainId/initialize
 * @desc Initialize memory scope for domain
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/initialize',
  domainPermissionMiddleware(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const userId = req.user!.id;

      const memoryScope = await memoryService.initializeMemoryScope(domainId, userId);

      res.status(201).json({
        success: true,
        data: memoryScope,
        message: 'Memory scope initialized successfully',
      });
    } catch (error) {
      console.error('Memory scope initialization error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize memory scope',
      });
    }
  }
);

/**
 * @route GET /api/memory/:domainId/access-logs
 * @desc Get memory access logs
 * @access Private (Domain Admin)
 */
router.get(
  '/:domainId/access-logs',
  domainPermissionMiddleware(['admin']),
  createMemoryAccessMiddleware({ minAccessLevel: 'admin' }),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const offset = parseInt(req.query.offset as string) || 0;

      const accessLogs = await prisma.memoryAccess.findMany({
        where: { memoryId: domainId },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      });

      const totalCount = await prisma.memoryAccess.count({
        where: { memoryId: domainId },
      });

      res.json({
        success: true,
        data: accessLogs,
        meta: {
          total: totalCount,
          limit,
          offset,
        },
      });
    } catch (error) {
      console.error('Memory access logs error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get memory access logs',
      });
    }
  }
);

/**
 * @route GET /api/memory/:domainId/alerts
 * @desc Get memory alerts
 * @access Private (Domain Admin)
 */
router.get(
  '/:domainId/alerts',
  domainPermissionMiddleware(['admin']),
  createMemoryAccessMiddleware({ minAccessLevel: 'admin' }),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const status = req.query.status as string || 'active';

      const alerts = await prisma.memoryAlert.findMany({
        where: {
          memoryId: domainId,
          status,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      console.error('Memory alerts error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get memory alerts',
      });
    }
  }
);

/**
 * @route POST /api/memory/:domainId/alerts/:alertId/acknowledge
 * @desc Acknowledge memory alert
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/alerts/:alertId/acknowledge',
  domainPermissionMiddleware(['admin']),
  createMemoryAccessMiddleware({ minAccessLevel: 'admin' }),
  async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const userId = req.user!.id;

      await prisma.memoryAlert.update({
        where: { id: alertId },
        data: {
          status: 'acknowledged',
          acknowledgedBy: userId,
          acknowledgedAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Memory alert acknowledged successfully',
      });
    } catch (error) {
      console.error('Memory alert acknowledgment error:', error);
      res.status(400).json({
        success: false,
        error: 'Failed to acknowledge memory alert',
      });
    }
  }
);

export default router; 