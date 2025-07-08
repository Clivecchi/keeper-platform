/**
 * Cross-Domain Sharing API Routes
 * Comprehensive endpoints for secure cross-domain sharing and collaboration
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { CrossDomainSharingService, DomainCacheService, ShareWorkflowAutomationService } from '@keeper/database';
import { authMiddleware } from '../../middleware/authMiddleware.js';
import { domainPermissionMiddleware } from '../../middleware/domainPermissionMiddleware.js';
import rateLimit from 'express-rate-limit';
import { Redis } from 'ioredis';

const router = Router();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const cacheService = new DomainCacheService(redis);
const sharingService = new CrossDomainSharingService(prisma, cacheService);
const workflowService = new ShareWorkflowAutomationService(prisma, cacheService);

// Rate limiting for sharing operations
const sharingRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // limit each IP to 200 requests per windowMs
  message: 'Too many sharing requests from this IP, please try again later.',
});

const approvalRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // limit each IP to 50 approval requests per minute
  message: 'Too many approval requests, please try again later.',
});

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
router.use(sharingRateLimit);
router.use(authMiddleware);

/**
 * @route POST /api/sharing/:sourceDomainId/requests
 * @desc Create a new share request
 * @access Private (Domain User)
 */
router.post(
  '/:sourceDomainId/requests',
  domainPermissionMiddleware(['admin', 'user']),
  async (req: Request, res: Response) => {
    try {
      const { sourceDomainId } = req.params;
      const userId = req.user!.id;
      const validation = shareRequestSchema.parse(req.body);

      const requestId = await sharingService.createShareRequest(
        {
          sourceDomainId,
          ...validation,
        },
        userId
      );

      res.status(201).json({
        success: true,
        data: { requestId },
        message: 'Share request created successfully',
      });
    } catch (error) {
      console.error('Create share request error:', error);
      res.status(400).json({
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
  domainPermissionMiddleware(['admin', 'user']),
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

      const request = await prisma.shareRequest.findUnique({
        where: { id: requestId },
        include: {
          sourceDomain: { select: { id: true, name: true, slug: true } },
          targetDomain: { select: { id: true, name: true, slug: true } },
          requester: { select: { id: true, name: true, email: true } },
          approver: { select: { id: true, name: true, email: true } },
          workflow: { select: { id: true, name: true, workflowType: true } },
          stepExecutions: {
            include: {
              workflowStep: { select: { stepName: true, stepType: true } },
            },
            orderBy: { stepNumber: 'asc' },
          },
          shareActivations: {
            select: {
              id: true,
              activationType: true,
              accessCount: true,
              expiresAt: true,
              accessToken: true,
            },
          },
        },
      });

      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Share request not found',
        });
      }

      // Check if user has permission to view this request
      const hasPermission = await prisma.domainPermission.findFirst({
        where: {
          domainId: { in: [request.sourceDomainId, request.targetDomainId] },
          userId,
        },
      });

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions to view this request',
        });
      }

      res.json({
        success: true,
        data: request,
      });
    } catch (error) {
      console.error('Get share request error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get share request',
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
  approvalRateLimit,
  async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const userId = req.user!.id;
      const { comments } = req.body;

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
  approvalRateLimit,
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

      await sharingService.rejectShareRequest(requestId, userId, rejectionReason);

      res.json({
        success: true,
        message: 'Share request rejected successfully',
      });
    } catch (error) {
      console.error('Reject share request error:', error);
      res.status(400).json({
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

      const accessToken = await sharingService.activateShare(requestId, userId, validation);

      res.json({
        success: true,
        data: { accessToken },
        message: 'Share activated successfully',
      });
    } catch (error) {
      console.error('Activate share error:', error);
      res.status(400).json({
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

      const accessInfo = await sharingService.accessSharedContent(
        accessToken,
        userId,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        data: accessInfo,
      });
    } catch (error) {
      console.error('Access shared content error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to access shared content',
      });
    }
  }
);

/**
 * @route POST /api/sharing/:domainId/workflows
 * @desc Create a share workflow
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/workflows',
  domainPermissionMiddleware(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const userId = req.user!.id;
      const validation = workflowSchema.parse(req.body);

      const workflowId = await sharingService.createWorkflow(domainId, validation, userId);

      res.status(201).json({
        success: true,
        data: { workflowId },
        message: 'Workflow created successfully',
      });
    } catch (error) {
      console.error('Create workflow error:', error);
      res.status(400).json({
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
  domainPermissionMiddleware(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { workflowType, isActive = 'true' } = req.query;

      const whereClause: any = { sourceDomainId: domainId };
      
      if (workflowType) {
        whereClause.workflowType = workflowType;
      }
      
      if (isActive !== 'all') {
        whereClause.isActive = isActive === 'true';
      }

      const workflows = await prisma.shareWorkflow.findMany({
        where: whereClause,
        include: {
          creator: { select: { id: true, name: true, email: true } },
          workflowSteps: { orderBy: { order: 'asc' } },
          _count: { select: { shareRequests: true } },
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
 * @desc Create a share template
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/templates',
  domainPermissionMiddleware(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const userId = req.user!.id;
      const validation = templateSchema.parse(req.body);

      const templateId = await sharingService.createTemplate(domainId, validation, userId);

      res.status(201).json({
        success: true,
        data: { templateId },
        message: 'Template created successfully',
      });
    } catch (error) {
      console.error('Create template error:', error);
      res.status(400).json({
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
  domainPermissionMiddleware(['admin', 'user']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { templateType, isActive = 'true' } = req.query;

      const whereClause: any = { domainId };
      
      if (templateType) {
        whereClause.templateType = templateType;
      }
      
      if (isActive !== 'all') {
        whereClause.isActive = isActive === 'true';
      }

      const templates = await prisma.shareTemplate.findMany({
        where: whereClause,
        include: {
          creator: { select: { id: true, name: true, email: true } },
          workflow: { select: { id: true, name: true } },
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
  domainPermissionMiddleware(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const userId = req.user!.id;
      const validation = collaborationSchema.parse(req.body);

      const config = {
        ...validation,
        startDate: validation.startDate ? new Date(validation.startDate) : undefined,
        endDate: validation.endDate ? new Date(validation.endDate) : undefined,
      };

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
  domainPermissionMiddleware(['admin', 'user']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { status, collaborationType } = req.query;

      const whereClause: any = {
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
          hostDomain: { select: { id: true, name: true, slug: true } },
          creator: { select: { id: true, name: true, email: true } },
          _count: { select: { collaborationActivities: true } },
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
  domainPermissionMiddleware(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { days = '30' } = req.query;

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
  domainPermissionMiddleware(['admin', 'user']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;

      const pendingRequests = await prisma.shareRequest.findMany({
        where: {
          targetDomainId: domainId,
          status: 'pending',
        },
        include: {
          sourceDomain: { select: { id: true, name: true, slug: true } },
          requester: { select: { id: true, name: true, email: true } },
          workflow: { select: { id: true, name: true } },
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
  async (req: Request, res: Response) => {
    try {
      const { accessToken } = req.params;

      const activation = await prisma.shareActivation.findUnique({
        where: { accessToken },
        include: {
          shareRequest: {
            include: {
              sourceDomain: { select: { id: true, name: true, slug: true } },
              targetDomain: { select: { id: true, name: true, slug: true } },
            },
          },
        },
      });

      if (!activation) {
        return res.status(404).json({
          success: false,
          error: 'Invalid access token',
        });
      }

      // Return basic information without accessing the content
      res.json({
        success: true,
        data: {
          shareRequest: {
            id: activation.shareRequest.id,
            title: activation.shareRequest.title,
            description: activation.shareRequest.description,
            contentType: activation.shareRequest.contentType,
            permissions: activation.shareRequest.permissions,
            accessLevel: activation.shareRequest.accessLevel,
            sourceDomain: activation.shareRequest.sourceDomain,
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
    } catch (error) {
      console.error('Get access info error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get access information',
      });
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
  domainPermissionMiddleware(['admin']),
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

      const results = await Promise.allSettled(
        requestIds.map((requestId: string) =>
          sharingService.approveShareRequest(requestId, userId, comments)
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      res.json({
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
      res.status(400).json({
        success: false,
        error: 'Failed to process bulk approval',
      });
    }
  }
);

export default router; 