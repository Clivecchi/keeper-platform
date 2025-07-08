/**
 * Enhanced Custom Domain API Routes
 * Comprehensive endpoints for custom domain management, verification, and monitoring
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { DomainService } from '../../../../packages/database/src/services/DomainService';
import { DomainVerificationService } from '../../../../packages/database/src/services/DomainVerificationService';
import { SslCertificateService } from '../../../../packages/database/src/services/SslCertificateService';
import { DomainHealthMonitoringService } from '../../../../packages/database/src/services/DomainHealthMonitoringService';
import { DomainCacheService } from '../../../../packages/database/src/services/DomainCacheService';
import { DynamicCorsManager } from '../../middleware/dynamicCorsMiddleware';
import { authMiddleware } from '../../middleware/authMiddleware';
import { domainPermissionMiddleware } from '../../middleware/domainPermissionMiddleware';
import { rateLimit } from 'express-rate-limit';

const router = Router();
const prisma = new PrismaClient();
const cacheService = new DomainCacheService();
const domainService = new DomainService(prisma, cacheService);
const verificationService = new DomainVerificationService(prisma, cacheService);
const sslService = new SslCertificateService(prisma, cacheService);
const healthService = new DomainHealthMonitoringService(
  prisma,
  domainService,
  verificationService,
  sslService,
  cacheService
);
const corsManager = new DynamicCorsManager(
  prisma,
  domainService,
  {} as any, // Would be properly initialized
  cacheService
);

// Rate limiting for domain operations
const domainRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many domain requests from this IP, please try again later.',
});

const verificationRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 verification requests per hour
  message: 'Too many verification requests, please try again later.',
});

// Validation schemas
const initiateVerificationSchema = z.object({
  customDomain: z.string().min(1).max(253).regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,})$/),
  method: z.enum(['DNS_TXT', 'DNS_CNAME', 'HTTP_FILE', 'META_TAG']).default('DNS_TXT'),
});

const requestCertificateSchema = z.object({
  provider: z.enum(['letsencrypt', 'cloudflare', 'vercel']).default('letsencrypt'),
  challengeType: z.enum(['http-01', 'dns-01', 'tls-alpn-01']).default('dns-01'),
  keyAlgorithm: z.enum(['RSA-2048', 'RSA-4096', 'ECDSA-P256', 'ECDSA-P384']).default('RSA-2048'),
  autoRenew: z.boolean().default(true),
  notificationEmail: z.string().email().optional(),
});

const updateCorsSettingsSchema = z.object({
  additionalOrigins: z.array(z.string().url()).optional(),
  restrictedMethods: z.array(z.string()).optional(),
  customHeaders: z.array(z.string()).optional(),
  allowCredentials: z.boolean().optional(),
  corsMaxAge: z.number().min(0).max(86400).optional(),
  embedAllowed: z.boolean().optional(),
  apiAccessAllowed: z.boolean().optional(),
});

// Apply middleware
router.use(domainRateLimit);
router.use(authMiddleware);

/**
 * @route POST /api/domains/:domainId/verification/initiate
 * @desc Initiate custom domain verification
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/verification/initiate',
  verificationRateLimit,
  domainPermissionMiddleware(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const validation = initiateVerificationSchema.parse(req.body);

      const config = await verificationService.initiateVerification(
        domainId,
        validation.customDomain,
        validation.method
      );

      res.json({
        success: true,
        data: config,
        message: 'Domain verification initiated successfully',
      });
    } catch (error) {
      console.error('Verification initiation error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate verification',
      });
    }
  }
);

/**
 * @route POST /api/domains/:domainId/verification/verify
 * @desc Verify custom domain ownership
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/verification/verify',
  verificationRateLimit,
  domainPermissionMiddleware(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;

      const result = await verificationService.verifyDomain(domainId);

      res.json({
        success: result.success,
        data: result,
        message: result.success 
          ? 'Domain verified successfully' 
          : 'Domain verification failed',
      });
    } catch (error) {
      console.error('Domain verification error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to verify domain',
      });
    }
  }
);

/**
 * @route GET /api/domains/:domainId/verification/status
 * @desc Get domain verification status
 * @access Private (Domain User)
 */
router.get(
  '/:domainId/verification/status',
  domainPermissionMiddleware(['admin', 'user']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;

      const domain = await domainService.getDomainById(domainId);
      if (!domain) {
        return res.status(404).json({
          success: false,
          error: 'Domain not found',
        });
      }

      const status = {
        customDomain: domain.customDomain,
        customDomainVerified: domain.customDomainVerified,
        verificationMethod: domain.verificationMethod,
        verifiedAt: domain.verifiedAt,
        hasVerificationToken: !!domain.verificationToken,
      };

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Verification status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get verification status',
      });
    }
  }
);

/**
 * @route GET /api/domains/:domainId/health
 * @desc Get domain health metrics
 * @access Private (Domain User)
 */
router.get(
  '/:domainId/health',
  domainPermissionMiddleware(['admin', 'user']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;

      const healthMetrics = await healthService.checkDomainHealth(domainId);

      res.json({
        success: true,
        data: healthMetrics,
      });
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check domain health',
      });
    }
  }
);

/**
 * @route POST /api/domains/:domainId/ssl/request
 * @desc Request SSL certificate for custom domain
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/ssl/request',
  domainPermissionMiddleware(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const validation = requestCertificateSchema.parse(req.body);

      const domain = await domainService.getDomainById(domainId);
      if (!domain || !domain.customDomain) {
        return res.status(400).json({
          success: false,
          error: 'Domain must have a custom domain configured',
        });
      }

      const certificateRequest = {
        domainId,
        customDomain: domain.customDomain,
        ...validation,
      };

      const certificate = await sslService.requestCertificate(certificateRequest);

      res.json({
        success: true,
        data: certificate,
        message: 'SSL certificate requested successfully',
      });
    } catch (error) {
      console.error('SSL request error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request SSL certificate',
      });
    }
  }
);

/**
 * @route GET /api/domains/:domainId/ssl/status
 * @desc Get SSL certificate status
 * @access Private (Domain User)
 */
router.get(
  '/:domainId/ssl/status',
  domainPermissionMiddleware(['admin', 'user']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;

      const domain = await domainService.getDomainById(domainId);
      if (!domain || !domain.customDomain) {
        return res.status(400).json({
          success: false,
          error: 'Domain must have a custom domain configured',
        });
      }

      const certificate = await sslService.getCertificateByDomain(domain.customDomain);
      const validation = certificate 
        ? await sslService.validateCertificate(domain.customDomain)
        : null;

      res.json({
        success: true,
        data: {
          certificate,
          validation,
        },
      });
    } catch (error) {
      console.error('SSL status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get SSL certificate status',
      });
    }
  }
);

/**
 * @route POST /api/domains/:domainId/ssl/renew
 * @desc Renew SSL certificate
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/ssl/renew',
  domainPermissionMiddleware(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;

      const domain = await domainService.getDomainById(domainId);
      if (!domain || !domain.customDomain) {
        return res.status(400).json({
          success: false,
          error: 'Domain must have a custom domain configured',
        });
      }

      const certificate = await sslService.getCertificateByDomain(domain.customDomain);
      if (!certificate) {
        return res.status(404).json({
          success: false,
          error: 'No SSL certificate found for this domain',
        });
      }

      const result = await sslService.renewCertificate(certificate.id);

      res.json({
        success: result.success,
        data: result,
        message: result.success 
          ? 'SSL certificate renewed successfully'
          : 'SSL certificate renewal failed',
      });
    } catch (error) {
      console.error('SSL renewal error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to renew SSL certificate',
      });
    }
  }
);

/**
 * @route PUT /api/domains/:domainId/cors
 * @desc Update CORS settings for domain
 * @access Private (Domain Admin)
 */
router.put(
  '/:domainId/cors',
  domainPermissionMiddleware(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const validation = updateCorsSettingsSchema.parse(req.body);

      // Update domain settings
      const domain = await domainService.updateDomain(domainId, {
        settings: {
          cors: validation,
        },
      });

      // Validate new CORS configuration
      const corsValidation = await corsManager.validateCorsConfig(domainId);

      res.json({
        success: true,
        data: {
          domain,
          corsValidation,
        },
        message: 'CORS settings updated successfully',
      });
    } catch (error) {
      console.error('CORS update error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update CORS settings',
      });
    }
  }
);

/**
 * @route GET /api/domains/:domainId/cors/validate
 * @desc Validate CORS configuration
 * @access Private (Domain User)
 */
router.get(
  '/:domainId/cors/validate',
  domainPermissionMiddleware(['admin', 'user']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;

      const validation = await corsManager.validateCorsConfig(domainId);

      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      console.error('CORS validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate CORS configuration',
      });
    }
  }
);

/**
 * @route POST /api/domains/:domainId/cors/test
 * @desc Test CORS configuration with specific origin
 * @access Private (Domain Admin)
 */
router.post(
  '/:domainId/cors/test',
  domainPermissionMiddleware(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { origin } = req.body;

      if (!origin || typeof origin !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Origin is required',
        });
      }

      const test = await corsManager.testCorsConfig(domainId, origin);

      res.json({
        success: true,
        data: test,
      });
    } catch (error) {
      console.error('CORS test error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test CORS configuration',
      });
    }
  }
);

/**
 * @route GET /api/domains/:domainId/cors/stats
 * @desc Get CORS statistics
 * @access Private (Domain Admin)
 */
router.get(
  '/:domainId/cors/stats',
  domainPermissionMiddleware(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const days = parseInt(req.query.days as string) || 7;

      const stats = await corsManager.getCorsStats(domainId, days);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('CORS stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get CORS statistics',
      });
    }
  }
);

/**
 * @route POST /api/domains/batch/verify
 * @desc Batch verify multiple domains
 * @access Private (Super Admin)
 */
router.post(
  '/batch/verify',
  async (req: Request, res: Response) => {
    try {
      // Check if user has super admin permissions
      if (req.user?.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }

      const { domainIds } = req.body;
      
      if (!Array.isArray(domainIds) || domainIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'domainIds array is required',
        });
      }

      const results = await verificationService.batchVerifyDomains(domainIds);

      res.json({
        success: true,
        data: Object.fromEntries(results),
        message: `Batch verification completed for ${domainIds.length} domains`,
      });
    } catch (error) {
      console.error('Batch verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform batch verification',
      });
    }
  }
);

/**
 * @route GET /api/domains/monitoring/report
 * @desc Get comprehensive monitoring report
 * @access Private (Super Admin)
 */
router.get(
  '/monitoring/report',
  async (req: Request, res: Response) => {
    try {
      // Check if user has super admin permissions
      if (req.user?.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }

      const timeRange = req.query.timeRange as '24h' | '7d' | '30d' || '24h';
      const report = await healthService.generateMonitoringReport(timeRange);

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      console.error('Monitoring report error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate monitoring report',
      });
    }
  }
);

/**
 * @route POST /api/domains/ssl/monitor-renewals
 * @desc Monitor and process SSL certificate renewals
 * @access Private (System/Cron)
 */
router.post(
  '/ssl/monitor-renewals',
  async (req: Request, res: Response) => {
    try {
      // Check if this is a system request (would use API key or system token)
      const systemToken = req.headers['x-system-token'];
      if (systemToken !== process.env.SYSTEM_TOKEN) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized system request',
        });
      }

      const result = await sslService.monitorRenewals();

      res.json({
        success: true,
        data: result,
        message: `Processed ${result.processed} certificates, ${result.renewed} renewed, ${result.failed} failed`,
      });
    } catch (error) {
      console.error('SSL monitoring error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to monitor SSL renewals',
      });
    }
  }
);

/**
 * @route GET /api/domains/:domainId/analytics
 * @desc Get domain analytics and usage metrics
 * @access Private (Domain Admin)
 */
router.get(
  '/:domainId/analytics',
  domainPermissionMiddleware(['admin']),
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const timeRange = req.query.timeRange as string || '7d';

      // Get various analytics
      const [healthMetrics, corsStats] = await Promise.all([
        healthService.checkDomainHealth(domainId),
        corsManager.getCorsStats(domainId, parseInt(timeRange.replace('d', '')) || 7),
      ]);

      // Get usage statistics from domain usage table
      const usageStats = await prisma.domainUsage.groupBy({
        by: ['action'],
        where: {
          domainId,
          timestamp: {
            gte: new Date(Date.now() - (parseInt(timeRange.replace('d', '')) || 7) * 24 * 60 * 60 * 1000),
          },
        },
        _count: {
          action: true,
        },
      });

      const analytics = {
        health: healthMetrics,
        cors: corsStats,
        usage: usageStats.reduce((acc, stat) => {
          acc[stat.action] = stat._count.action;
          return acc;
        }, {} as Record<string, number>),
        timeRange,
      };

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get domain analytics',
      });
    }
  }
);

export default router; 