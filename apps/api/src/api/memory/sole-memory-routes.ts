/**
 * SOLE Memory API Routes
 * Comprehensive endpoints for domain-scoped memory operations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { SoleMemoryIsolationService, DomainCacheService } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { 
  requireDomainReadCompat, 
  requireDomainWriteCompat, 
  requireDomainAdminCompat 
} from '../../middleware/domainPermissionMiddleware.js';
import { createMemoryAccessMiddleware, createCrossDomainMemoryMiddleware } from '../../middleware/memoryAccessMiddleware.js';
import { rateLimit } from 'express-rate-limit';
import { getRedis, type RedisClient } from '../../lib/redis.js';

type MemoryCategory = 'conversational' | 'factual' | 'procedural' | 'episodic' | 'semantic';

const router: Router = Router();
const prisma = new PrismaClient();
const redis: RedisClient = getRedis();
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
router.use(authMiddlewareCompat);

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

      return res.json({
        success: true,
        data: {
          scope: memoryScope,
          quota,
        },
      });
    } catch (error) {
      console.error('Get memory scope error:', error);
      return res.status(500).json({
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
        query: validation.query || '',
        filters: validation.filters ? {
          ...validation.filters,
          dateRange: validation.filters.dateRange ? {
            start: new Date(validation.filters.dateRange.start),
            end: new Date(validation.filters.dateRange.end),
          } : undefined,
        } : undefined,
      };

      const memories = await memoryService.queryMemory(query);

      return res.json({
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
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to query memory',
      });
    }
  }
);

/**
 * @route POST /api/memory/:domainId/insert
 * @desc Insert new memory content
 * @access Private (Domain User)
 */
router.post(
  '/:domainId/insert',
  memoryWriteLimit,
  requireDomainWriteCompat,
  createMemoryAccessMiddleware({ minAccessLevel: 'write' }),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }
      
      const userId = req.user.id;
      const validation = memoryInsertSchema.parse(req.body);

      const insert = {
        domainId,
        userId,
        category: validation.category,
        content: validation.content,
        metadata: {
          source: 'api',
          timestamp: new Date(),
          confidence: validation.metadata?.confidence ?? 1.0,
          tags: validation.metadata?.tags ?? [],
          relations: validation.metadata?.relations ?? [],
        } as {
          source: string;
          timestamp: Date;
          confidence: number;
          tags: string[];
          relations: string[];
        },
        access: validation.access ? {
          ...validation.access,
          level: validation.access.level as 'read' | 'write' | 'admin',
          users: validation.access.users || [],
          expires: validation.access.expires ? new Date(validation.access.expires) : undefined,
        } : {
          level: 'read' as 'read' | 'write' | 'admin',
          users: [],
        },
      };

      const memoryId = await memoryService.insertMemory(insert);

      return res.status(201).json({
        success: true,
        data: { memoryId },
        message: 'Memory inserted successfully',
      });
    } catch (error) {
      console.error('Memory insert error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to insert memory',
      });
    }
  }
);

/**
 * @route PUT /api/memory/:domainId/:memoryId
 * @desc Update memory content
 * @access Private (Domain User)
 */
router.put(
  '/:domainId/:memoryId',
  memoryWriteLimit,
  requireDomainWriteCompat,
  createMemoryAccessMiddleware({ minAccessLevel: 'write' }),
  async (req: Request, res: Response) => {
    try {
      const { domainId, memoryId } = req.params;
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }
      
      const userId = req.user.id;
      const validation = memoryUpdateSchema.parse(req.body);

      const updates = {
        content: validation.content,
        metadata: validation.metadata ? {
          ...validation.metadata,
          source: 'api',
          timestamp: new Date(),
          confidence: validation.metadata.confidence ?? 1.0,
          tags: validation.metadata.tags ?? [],
          relations: validation.metadata.relations ?? [],
        } as {
          source: string;
          timestamp: Date;
          confidence: number;
          tags: string[];
          relations: string[];
        } : {
          source: 'api',
          timestamp: new Date(),
          confidence: 1.0,
          tags: [],
          relations: [],
        } as {
          source: string;
          timestamp: Date;
          confidence: number;
          tags: string[];
          relations: string[];
        },
        access: validation.access ? {
          ...validation.access,
          level: validation.access.level as 'read' | 'write' | 'admin',
          users: validation.access.users || [],
          expires: validation.access.expires ? new Date(validation.access.expires) : undefined,
        } : undefined,
      };

      await memoryService.updateMemory(domainId, memoryId, userId, updates);

      return res.json({
        success: true,
        message: 'Memory updated successfully',
      });
    } catch (error) {
      console.error('Memory update error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update memory',
      });
    }
  }
);

/**
 * @route DELETE /api/memory/:domainId/:memoryId
 * @desc Delete memory content
 * @access Private (Domain User)
 */
router.delete(
  '/:domainId/:memoryId',
  memoryWriteLimit,
  requireDomainWriteCompat,
  createMemoryAccessMiddleware({ minAccessLevel: 'write' }),
  async (req: Request, res: Response) => {
    try {
      const { domainId, memoryId } = req.params;
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }
      
      const userId = req.user.id;

      await memoryService.deleteMemory(domainId, memoryId, userId);

      return res.json({
        success: true,
        message: 'Memory deleted successfully',
      });
    } catch (error) {
      console.error('Memory delete error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete memory',
      });
    }
  }
);

/**
 * @route POST /api/memory/:domainId/share
 * @desc Share memory with another domain
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/share',
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }
      
      const userId = req.user.id;
      const validation = memoryShareRequestSchema.parse(req.body);

      const shareId = await memoryService.shareMemory(domainId, {
        targetDomainId: validation.targetDomainId as string,
        shareType: validation.shareType,
        memoryCategories: validation.memoryCategories as any,
        accessLevel: validation.accessLevel,
        sourceUserId: userId,
        expiresAt: validation.expiresAt ? new Date(validation.expiresAt) : undefined,
        maxAccess: validation.maxAccess,
      });

      return res.status(201).json({
        success: true,
        data: { shareId },
        message: 'Memory share request created',
      });
    } catch (error) {
      console.error('Memory share error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share memory',
      });
    }
  }
);

/**
 * @route POST /api/memory/:domainId/migrate
 * @desc Migrate memory to another domain
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/migrate',
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }
      
      const userId = req.user.id;
      const validation = memoryMigrationRequestSchema.parse(req.body);

      if (!validation.targetDomainId) {
        return res.status(400).json({
          success: false,
          error: 'targetDomainId is required',
        });
      }

      const migrationId = await memoryService.migrateMemory(domainId, {
        targetDomainId: validation.targetDomainId as string,
        sourceUserId: userId,
        memoryCategories: validation.memoryCategories,
        transformRules: validation.transformRules ? JSON.parse(JSON.stringify(validation.transformRules)) : undefined,
        mappingRules: validation.mappingRules ? JSON.parse(JSON.stringify(validation.mappingRules)) : undefined,
        validationRules: validation.validationRules ? JSON.parse(JSON.stringify(validation.validationRules)) : undefined,
      });

      return res.status(201).json({
        success: true,
        data: { migrationId },
        message: 'Memory migration started',
      });
    } catch (error) {
      console.error('Memory migration error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to migrate memory',
      });
    }
  }
);

/**
 * @route GET /api/memory/:domainId/analytics
 * @desc Get memory analytics
 * @access Private (Domain User)
 */
router.get(
  '/:domainId/analytics',
  requireDomainReadCompat,
  createMemoryAccessMiddleware({ minAccessLevel: 'read' }),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }
      
      const userId = req.user.id;
      const { period = '30d' } = req.query;

      const analytics = await memoryService.getMemoryAnalytics(domainId, 30);

      return res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Memory analytics error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get memory analytics',
      });
    }
  }
);

/**
 * @route GET /api/memory/:domainId/health
 * @desc Get memory health status
 * @access Private (Domain Admin)
 */
router.get(
  '/:domainId/health',
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }
      
      const userId = req.user.id;

      const health = await memoryService.getMemoryHealth(domainId, userId);

      return res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      console.error('Memory health error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get memory health',
      });
    }
  }
);

/**
 * @route POST /api/memory/:domainId/cleanup
 * @desc Clean up expired or invalid memory
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/cleanup',
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }
      
      const userId = req.user.id;
      const validation = z.object({
        dryRun: z.boolean().optional().default(false),
        categories: z.array(z.string()).optional(),
        retentionDays: z.number().optional(),
      }).parse(req.body);

      const cleanup = await memoryService.cleanupMemory(domainId, {
        sourceUserId: userId,
        categories: (validation.categories ?? []) as MemoryCategory[],
        retentionDays: validation.retentionDays,
        dryRun: validation.dryRun,
      });

      return res.json({
        success: true,
        data: cleanup,
        message: validation.dryRun ? 'Cleanup simulation completed' : 'Memory cleanup completed',
      });
    } catch (error) {
      console.error('Memory cleanup error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup memory',
      });
    }
  }
);

/**
 * @route POST /api/memory/:domainId/backup
 * @desc Create memory backup
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/backup',
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }
      
      const userId = req.user.id;
      const validation = z.object({
        includeMetadata: z.boolean().optional().default(true),
        categories: z.array(z.string()).optional(),
      }).parse(req.body);

      const backup = await memoryService.createMemoryBackup(domainId, {
        sourceUserId: userId,
        includeMetadata: validation.includeMetadata,
        categories: (validation.categories ?? []) as MemoryCategory[],
      });

      return res.json({
        success: true,
        data: backup,
        message: 'Memory backup created successfully',
      });
    } catch (error) {
      console.error('Memory backup error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create memory backup',
      });
    }
  }
);

/**
 * @route POST /api/memory/:domainId/restore
 * @desc Restore memory from backup
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/restore',
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      
      if (!req.user) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }
      
      const userId = req.user.id;
      const validation = z.object({
        backupId: z.string().uuid(),
        overwrite: z.boolean().optional().default(false),
      }).parse(req.body);

      const restore = await memoryService.restoreMemoryBackup(domainId, {
        sourceUserId: userId,
        backupId: validation.backupId,
        overwrite: validation.overwrite,
      });

      return res.json({
        success: true,
        data: restore,
        message: 'Memory restore completed successfully',
      });
    } catch (error) {
      console.error('Memory restore error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to restore memory',
      });
    }
  }
);

export default router; 