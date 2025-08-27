/**
 * Cross-Domain Sharing API Routes
 * Endpoints for managing cross-domain content sharing and permissions
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { requireDomainAdminCompat, requireDomainReadCompat, requireDomainWriteCompat } from '../../middleware/domainPermissionMiddleware.js';
import { validationMiddleware } from '../../middleware/validationMiddleware.js';
import { CrossDomainSharingService, DomainCacheService, getFeatureFlagService } from '@keeper/database';
import { getRedisLazy, type RedisClient } from '../../lib/redis.js';

const router: Router = Router();
const prisma = new PrismaClient();

// Lazy initialization - only create services when actually needed
let redis: RedisClient | null = null;
let sharingService: CrossDomainSharingService | null = null;

function getServices() {
  if (!redis) {
    redis = getRedisLazy();
  }
  
  if (!sharingService) {
    const cacheService = new DomainCacheService(redis);
    sharingService = new CrossDomainSharingService(prisma, cacheService);
  }
  
  return { redis, sharingService };
}

const featureFlags = getFeatureFlagService();

// Validation schemas
const shareRequestSchema = z.object({
  targetDomainId: z.string().uuid(),
  contentType: z.enum(['keeper', 'journey', 'moment', 'memory', 'custom']),
  contentId: z.string().min(1),
  requestType: z.enum(['share', 'collaborate', 'transfer']).default('share'),
  permissions: z.array(z.string()).default([]),
  accessLevel: z.enum(['read', 'write', 'admin']).default('read'),
  requestedDuration: z.number().min(1).max(365).optional(),
  title: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
  justification: z.string().max(500).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  useTemplate: z.string().uuid().optional(),
  workflowId: z.string().uuid().optional(),
});

const workflowSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  workflowType: z.enum(['content_share', 'memory_share', 'collaboration']),
  requiresApproval: z.boolean().default(true),
  approvalSteps: z.array(z.object({
    stepNumber: z.number().min(1),
    stepName: z.string().min(1),
    stepType: z.enum(['approval', 'notification', 'validation', 'transformation']),
    requiredRole: z.string().optional(),
    requiredUsers: z.array(z.string()).optional(),
    requireAllUsers: z.boolean().default(false),
    timeoutHours: z.number().min(1).max(168).optional(), // Max 1 week
  })),
  defaultExpirationDays: z.number().min(1).max(365).optional(),
  maxAccessCount: z.number().min(1).optional(),
  allowSubsharing: z.boolean().default(false),
  auditLevel: z.enum(['minimal', 'standard', 'comprehensive']).default('standard'),
});

const templateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  templateType: z.enum(['quick_share', 'collaboration', 'public_share', 'time_limited']),
  permissions: z.array(z.string()).default([]),
  accessLevel: z.enum(['read', 'write', 'admin']).default('read'),
  defaultDuration: z.number().min(1).max(365).optional(),
  maxAccess: z.number().min(1).optional(),
  workflowId: z.string().uuid().optional(),
  requireApproval: z.boolean().default(false),
  autoActivate: z.boolean().default(false),
  allowSubsharing: z.boolean().default(false),
  contentTypes: z.array(z.enum(['keeper', 'journey', 'moment', 'memory', 'custom'])).default([]),
});

const collaborationSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  collaborationType: z.enum(['project', 'temporary', 'ongoing']).default('project'),
  memberDomainIds: z.array(z.string().uuid()).min(1),
  permissions: z.record(z.any()),
  sharedResources: z.record(z.any()),
  accessRules: z.record(z.any()),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  auditLevel: z.enum(['minimal', 'standard', 'comprehensive']).default('standard'),
  requireMFA: z.boolean().default(false),
  allowedIPs: z.array(z.string()).default([]),
});

const activationSchema = z.object({
  activationType: z.enum(['direct', 'link', 'embedded']).default('direct'),
  ipRestrictions: z.array(z.string()).default([]),
  userRestrictions: z.array(z.string()).default([]),
  sessionTimeout: z.number().min(5).max(1440).optional(), // 5 minutes to 24 hours
  generateLink: z.boolean().default(false),
  generateEmbed: z.boolean().default(false),
});

// Apply middleware
router.use(authMiddlewareCompat);

/**
 * @route POST /api/sharing/:domainId/requests
 * @desc Create a new share request
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/requests',
  requireDomainAdminCompat,
  validationMiddleware(shareRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const requestData = req.body;
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      const { sharingService } = getServices();
      const requestId = await sharingService.createShareRequest(
        {
          ...requestData,
          sourceDomainId: domainId,
        },
        req.user.id
      );

      return res.status(201).json({
        success: true,
        data: { requestId },
      });
    } catch (error) {
      console.error('Create share request error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create share request',
      });
    }
  }
);

/**
 * @route GET /api/sharing/:domainId/requests
 * @desc List share requests for domain
 * @access Private (Domain User)
 */
router.get(
  '/:domainId/requests',
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const {
        status,
        contentType,
        direction = 'both',
        limit = '50',
        offset = '0',
      } = req.query;

      const { sharingService } = getServices();
      const requests = await sharingService.listShareRequests(domainId, {
        status: status as any,
        contentType: contentType as any,
        direction: direction as any,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json({
        success: true,
        data: requests,
        meta: {
          total: requests.length,
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
        },
      });
    } catch (error) {
      console.error('List share requests error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list share requests',
      });
    }
  }
);

/**
 * @route GET /api/sharing/requests/:requestId
 * @desc Get specific share request details
 * @access Private (Domain User)
 */
router.get(
  '/requests/:requestId',
  async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const userId = req.user!.id;

      const prisma = new PrismaClient();
      const request = await prisma.shareRequest.findUnique({
        where: { id: requestId },
        include: {
          Domain_ShareRequest_sourceDomainIdToDomain: { select: { id: true, name: true, slug: true } },
          Domain_ShareRequest_targetDomainIdToDomain: { select: { id: true, name: true, slug: true } },
          users_ShareRequest_requestedByTousers: { select: { id: true, name: true, email: true } },
        },
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Share request not found',
        });
      }

      return res.json({
        success: true,
        data: request,
      });
    } catch (error) {
      console.error('Get share request error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get share request',
      });
    }
  }
);

/**
 * @route PUT /api/sharing/requests/:requestId
 * @desc Update share request
 * @access Private (Domain User)
 */
router.put(
  '/requests/:requestId',
  async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const userId = req.user!.id;
      const { status, permissions, expiresAt } = req.body;

      const prisma = new PrismaClient();
      const request = await prisma.shareRequest.update({
        where: { id: requestId },
        data: {
          status: status as any,
          permissions: permissions ? JSON.parse(JSON.stringify(permissions)) : undefined,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        },
        include: {
          Domain_ShareRequest_sourceDomainIdToDomain: { select: { id: true, name: true, slug: true } },
          Domain_ShareRequest_targetDomainIdToDomain: { select: { id: true, name: true, slug: true } },
        },
      });

      return res.json({
        success: true,
        data: request,
        message: 'Share request updated successfully',
      });
    } catch (error) {
      console.error('Update share request error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update share request',
      });
    }
  }
);

/**
 * @route DELETE /api/sharing/requests/:requestId
 * @desc Cancel share request
 * @access Private (Domain User)
 */
router.delete(
  '/requests/:requestId',
  async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const userId = req.user!.id;

      const prisma = new PrismaClient();
      await prisma.shareRequest.update({
        where: { id: requestId },
        data: {
          status: 'cancelled',
        },
      });

      return res.json({
        success: true,
        message: 'Share request cancelled successfully',
      });
    } catch (error) {
      console.error('Cancel share request error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel share request',
      });
    }
  }
);

/**
 * @route POST /api/sharing/requests/:requestId/approve
 * @desc Approve a share request
 * @access Private (Target Domain Admin/User)
 */
router.post(
  '/requests/:requestId/approve',
  async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const userId = req.user!.id;
      const { comments } = req.body;

      const { sharingService } = getServices();
      await sharingService.approveShareRequest(requestId, userId, comments);

      res.json({
        success: true,
        message: 'Share request approved successfully',
      });
    } catch (error) {
      console.error('Approve share request error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve share request',
      });
    }
  }
);

/**
 * @route POST /api/sharing/requests/:requestId/reject
 * @desc Reject a share request
 * @access Private (Target Domain Admin/User)
 */
router.post(
  '/requests/:requestId/reject',
  async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const userId = req.user!.id;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          error: 'Rejection reason is required',
        });
      }

      const { sharingService } = getServices();
      await sharingService.rejectShareRequest(requestId, userId, rejectionReason);

      return res.json({
        success: true,
        message: 'Share request rejected successfully',
      });
    } catch (error) {
      console.error('Reject share request error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reject share request',
      });
    }
  }
);

/**
 * @route POST /api/sharing/requests/:requestId/activate
 * @desc Activate an approved share request
 * @access Private (Source or Target Domain User)
 */
router.post(
  '/requests/:requestId/activate',
  async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const userId = req.user!.id;
      const validation = activationSchema.parse(req.body);

      const { sharingService } = getServices();
      const accessToken = await sharingService.activateShare(requestId, userId, {
        activationType: validation.activationType,
        ipRestrictions: validation.ipRestrictions ?? [],
        userRestrictions: validation.userRestrictions ?? [],
        sessionTimeout: validation.sessionTimeout,
        generateLink: validation.generateLink ?? false,
        generateEmbed: validation.generateEmbed ?? false,
      });

      return res.json({
        success: true,
        data: { accessToken },
        message: 'Share activated successfully',
      });
    } catch (error) {
      console.error('Activate share error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to activate share',
      });
    }
  }
);

/**
 * @route GET /api/sharing/access/:accessToken
 * @desc Access shared content via access token
 * @access Public (with valid token)
 */
router.get(
  '/access/:accessToken',
  async (req: Request, res: Response) => {
    try {
      const { accessToken } = req.params;
      const userId = req.user?.id;
      const ipAddress = req.ip;
      const userAgent = req.headers['user-agent'];

      const { sharingService } = getServices();
      const accessInfo = await sharingService.accessSharedContent(
        accessToken,
        userId,
        ipAddress,
        userAgent
      );

      return res.json({
        success: true,
        data: accessInfo,
      });
    } catch (error) {
      console.error('Access shared content error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to access shared content',
      });
    }
  }
);

/**
 * @route POST /api/sharing/:domainId/workflows
 * @desc Create sharing workflow
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/workflows',
  requireDomainAdminCompat,
  validationMiddleware(workflowSchema),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const userId = req.user!.id;
      const validation = workflowSchema.parse(req.body);

      const prisma = new PrismaClient();
      const workflow = await prisma.shareWorkflow.create({
        data: {
          name: validation.name,
          description: validation.description,
          workflowType: validation.workflowType,
          requiresApproval: validation.requiresApproval ?? true,
          defaultExpirationDays: validation.defaultExpirationDays ?? 30,
          maxAccessCount: validation.maxAccessCount,
          allowSubsharing: validation.allowSubsharing ?? false,
          sourceDomainId: domainId,
          auditLevel: validation.auditLevel ?? 'standard',
          approvalSteps: JSON.parse(JSON.stringify(validation.approvalSteps)),
          createdBy: userId,
        },
      });

      return res.status(201).json({
        success: true,
        data: { workflow },
        message: 'Sharing workflow created successfully',
      });
    } catch (error) {
      console.error('Create workflow error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create workflow',
      });
    }
  }
);

/**
 * @route GET /api/sharing/:domainId/workflows
 * @desc List workflows for domain
 * @access Private (Domain Admin)
 */
router.get(
  '/:domainId/workflows',
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { workflowType, isActive = 'true' } = req.query;

      const prisma = new PrismaClient();
      const whereClause: Record<string, unknown> = { sourceDomainId: domainId };
      
      if (workflowType) {
        whereClause.workflowType = workflowType;
      }
      
      if (isActive !== 'all') {
        whereClause.isActive = isActive === 'true';
      }

      const workflows = await prisma.shareWorkflow.findMany({
        where: whereClause,
        include: {
          users: { select: { id: true, name: true, email: true } },
          Domain: true,
          ShareWorkflowStep: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: workflows,
      });
    } catch (error) {
      console.error('List workflows error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list workflows',
      });
    }
  }
);

/**
 * @route POST /api/sharing/:domainId/templates
 * @desc Create sharing template
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/templates',
  requireDomainAdminCompat,
  validationMiddleware(templateSchema),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const userId = req.user!.id;
      const validation = templateSchema.parse(req.body);

      const prisma = new PrismaClient();
      const template = await prisma.shareTemplate.create({
        data: {
          name: validation.name,
          description: validation.description,
          templateType: validation.templateType,
          permissions: validation.permissions,
          accessLevel: validation.accessLevel,
          defaultDuration: validation.defaultDuration,
          maxAccess: validation.maxAccess,
          workflowId: validation.workflowId,
          requireApproval: validation.requireApproval ?? false,
          autoActivate: validation.autoActivate ?? false,
          allowSubsharing: validation.allowSubsharing ?? false,
          domainId: domainId,
          contentTypes: validation.contentTypes,
          createdBy: userId,
        },
      });

      return res.status(201).json({
        success: true,
        data: { template },
        message: 'Sharing template created successfully',
      });
    } catch (error) {
      console.error('Create template error:', error);
      return res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create template',
      });
    }
  }
);

/**
 * @route GET /api/sharing/:domainId/templates
 * @desc List templates for domain
 * @access Private (Domain User)
 */
router.get(
  '/:domainId/templates',
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { templateType, isActive = 'true' } = req.query;

      const prisma = new PrismaClient();
      const whereClause: Record<string, unknown> = { domainId };
      
      if (templateType) {
        whereClause.templateType = templateType;
      }
      
      if (isActive !== 'all') {
        whereClause.isActive = isActive === 'true';
      }

      const templates = await prisma.shareTemplate.findMany({
        where: whereClause,
        include: {
          users: { select: { id: true, name: true, email: true } },
          Domain: true,
          ShareWorkflow: true,
        },
        orderBy: { usageCount: 'desc' },
      });

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      console.error('List templates error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list templates',
      });
    }
  }
);

/**
 * @route POST /api/sharing/:domainId/collaborations
 * @desc Create a cross-domain collaboration
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/collaborations',
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const userId = req.user!.id;
      const validation = collaborationSchema.parse(req.body);

      const config = {
        name: validation.name,
        description: validation.description,
        collaborationType: validation.collaborationType,
        memberDomainIds: validation.memberDomainIds,
        permissions: validation.permissions,
        sharedResources: validation.sharedResources,
        accessRules: validation.accessRules,
        startDate: validation.startDate ? new Date(validation.startDate) : undefined,
        endDate: validation.endDate ? new Date(validation.endDate) : undefined,
        auditLevel: validation.auditLevel,
        requireMFA: validation.requireMFA,
        allowedIPs: validation.allowedIPs,
      };

      const { sharingService } = getServices();
      const collaborationId = await sharingService.createCollaboration(
        domainId,
        config,
        userId
      );

      res.status(201).json({
        success: true,
        data: { collaborationId },
        message: 'Collaboration created successfully',
      });
    } catch (error) {
      console.error('Create collaboration error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create collaboration',
      });
    }
  }
);

/**
 * @route GET /api/sharing/:domainId/collaborations
 * @desc List collaborations for domain
 * @access Private (Domain User)
 */
router.get(
  '/:domainId/collaborations',
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { status, collaborationType } = req.query;

      const prisma = new PrismaClient();
      const whereClause: Record<string, unknown> = {
        OR: [
          { hostDomainId: domainId },
          { memberDomainIds: { has: domainId } },
        ],
      };

      if (status) {
        whereClause.status = status;
      }

      if (collaborationType) {
        whereClause.collaborationType = collaborationType;
      }

      const collaborations = await prisma.crossDomainCollaboration.findMany({
        where: whereClause,
        include: {
          Domain: { select: { id: true, name: true, slug: true } },
          users: { select: { id: true, name: true, email: true } },
          _count: { select: { CollaborationActivity: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: collaborations,
      });
    } catch (error) {
      console.error('List collaborations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list collaborations',
      });
    }
  }
);

/**
 * @route GET /api/sharing/:domainId/metrics
 * @desc Get sharing metrics for domain
 * @access Private (Domain Admin)
 */
router.get(
  '/:domainId/metrics',
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { days = '30' } = req.query;

      const { sharingService } = getServices();
      const metrics = await sharingService.getShareMetrics(
        domainId,
        parseInt(days as string)
      );

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error('Get sharing metrics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sharing metrics',
      });
    }
  }
);

/**
 * @route GET /api/sharing/:domainId/pending
 * @desc Get pending approval requests for domain
 * @access Private (Domain User)
 */
router.get(
  '/:domainId/pending',
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;

      const prisma = new PrismaClient();
      const pendingRequests = await prisma.shareRequest.findMany({
        where: {
          targetDomainId: domainId,
          status: 'pending',
        },
        include: {
          Domain_ShareRequest_sourceDomainIdToDomain: { select: { id: true, name: true, slug: true } },
          users_ShareRequest_requestedByTousers: { select: { id: true, name: true, email: true } },
          ShareWorkflow: { select: { id: true, name: true } },
        },
        orderBy: { requestedAt: 'asc' },
      });

      res.json({
        success: true,
        data: pendingRequests,
        meta: {
          count: pendingRequests.length,
        },
      });
    } catch (error) {
      console.error('Get pending requests error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pending requests',
      });
    }
  }
);

/**
 * @route GET /api/sharing/access/:accessToken/info
 * @desc Get information about shared content without accessing it
 * @access Public (with valid token)
 */
router.get(
  '/access/:accessToken/info',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { accessToken } = req.params;

      const prisma = new PrismaClient();
      const activation = await prisma.shareActivation.findUnique({
        where: { accessToken },
        include: {
          ShareRequest: {
            include: {
              Domain_ShareRequest_sourceDomainIdToDomain: true,
              Domain_ShareRequest_targetDomainIdToDomain: true,
            },
          },
        },
      });

      if (!activation) {
        res.status(404).json({
          success: false,
          error: 'Invalid access token',
        });
        return;
      }

      // Return basic information without accessing the content
      res.json({
        success: true,
        data: {
          ShareRequest: {
            id: activation.ShareRequest.id,
            title: activation.ShareRequest.title,
            description: activation.ShareRequest.description,
            contentType: activation.ShareRequest.contentType,
            permissions: activation.ShareRequest.permissions,
            accessLevel: activation.ShareRequest.accessLevel,
            sourceDomain: activation.ShareRequest.Domain_ShareRequest_sourceDomainIdToDomain,
          },
          activation: {
            activationType: activation.activationType,
            accessCount: activation.accessCount,
            expiresAt: activation.expiresAt,
            isExpired: activation.expiresAt ? new Date() > activation.expiresAt : false,
            isActive: !activation.deactivatedAt,
          },
        },
      });
      return;
    } catch (error) {
      console.error('Get access info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get access information',
      });
      return;
    }
  }
);

/**
 * @route POST /api/sharing/bulk/approve
 * @desc Bulk approve multiple share requests
 * @access Private (Domain Admin)
 */
router.post(
  '/bulk/approve',
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { requestIds, comments } = req.body;
      const userId = req.user!.id;

      if (!Array.isArray(requestIds) || requestIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Request IDs array is required',
        });
      }

      const { sharingService } = getServices();
      const results = await Promise.allSettled(
        requestIds.map((requestId: string) =>
          sharingService.approveShareRequest(requestId, userId, comments)
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return res.json({
        success: true,
        data: {
          successful,
          failed,
          total: requestIds.length,
        },
        message: `Bulk approval completed: ${successful} successful, ${failed} failed`,
      });
    } catch (error) {
      console.error('Bulk approve error:', error);
      return res.status(400).json({
        success: false,
        error: 'Failed to process bulk approval',
      });
    }
  }
);

/**
 * @route GET /api/sharing/:domainId/analytics
 * @desc Get sharing analytics for domain
 * @access Private (Domain Admin)
 */
router.get(
  '/:domainId/analytics',
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { period = '7d', type = 'all' } = req.query;

      const { sharingService } = getServices();
      const analytics = await sharingService.getSharingAnalytics(domainId, {
        period: period as string,
        type: type as string,
      });

      return res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Get sharing analytics error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get sharing analytics',
      });
    }
  }
);

/**
 * @route GET /api/sharing/:domainId/health
 * @desc Get sharing health status
 * @access Private (Domain Admin)
 */
router.get(
  '/:domainId/health',
  requireDomainAdminCompat,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { domainId } = req.params;

      const { sharingService } = getServices();
      const health = await sharingService.getSharingHealth(domainId);

      res.status(200).json({ success: true, data: null });
      return;
    } catch (error) {
      console.error('Get sharing health error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sharing health',
      });
      return;
    }
  }
);

export default router; 