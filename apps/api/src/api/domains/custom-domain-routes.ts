/**
 * Custom Domain Management Routes
 * Advanced domain configuration, SSL, and CORS management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { 
  DomainService, 
  DomainVerificationService, 
  SslCertificateService, 
  DomainHealthMonitoringService, 
  DomainCacheService,
  DomainPermissionService
} from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { 
  requireDomainAdminCompat, 
  requireDomainWriteCompat, 
  requireDomainReadCompat 
} from '../../middleware/domainPermissionMiddleware.js';
import { rateLimit } from 'express-rate-limit';
import Redis from 'ioredis';
import { VercelDomainManagerService } from '../../services/VercelDomainManagerService.js';

function getVercelService(): VercelDomainManagerService {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) {
    throw new Error('Vercel integration not configured');
  }
  return new VercelDomainManagerService(token, projectId);
}

const router: Router = Router();
const prisma = new PrismaClient();
let redis: Redis | null = null;
if (process.env.REDIS_URL && process.env.DISABLE_REDIS !== 'true') {
  redis = new Redis(process.env.REDIS_URL);
} else if (process.env.NODE_ENV === 'development') {
  console.warn('Redis not available in development. Features will degrade gracefully.');
}
const cacheService = new DomainCacheService(redis);
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

// Create a mock CORS manager for now
const corsManager = {
  validateCorsConfig: async (domainId: string) => ({ valid: true }),
  testCorsConfig: async (domainId: string, origin: string) => ({ success: true }),
  getCorsStats: async (domainId: string, days: number) => ({ requests: 0, errors: 0 }),
};

// Rate limiters
const verificationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 verification attempts per window
  message: 'Too many verification attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const sslRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 SSL requests per hour
  message: 'Too many SSL requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply auth middleware to all routes
router.use(authMiddlewareCompat);

/**
 * Custom Domain Verification Routes
 */

// POST /api/domains/custom/:domainId/verification/initiate
router.post(
  '/:domainId/verification/initiate',
  verificationRateLimit,
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { customDomain } = req.body;

      const verification = await verificationService.initiateVerification(domainId, customDomain);
      
      return res.json({
        success: true,
        verification,
        message: 'Domain verification initiated',
      });
    } catch (error) {
      console.error('Error initiating domain verification:', error);
      return res.status(500).json({ error: 'Failed to initiate verification' });
    }
  }
);

// POST /api/domains/custom/:domainId/verification/complete
router.post(
  '/:domainId/verification/complete',
  verificationRateLimit,
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { verificationToken } = req.body;

      // Use the actual verification method available
      const result = await verificationService.verifyDomain(domainId);
      
      return res.json({
        success: result.success,
        message: result.success ? 'Verification completed' : 'Verification failed',
        domain: result,
      });
    } catch (error) {
      console.error('Error completing domain verification:', error);
      return res.status(500).json({ error: 'Failed to complete verification' });
    }
  }
);

// GET /api/domains/custom/:domainId/verification/status
router.get(
  '/:domainId/verification/status',
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const domain = await domainService.getDomainById(domainId);
      
      if (!domain) {
        return res.status(404).json({ error: 'Domain not found' });
      }
      
      const status = {
        customDomain: domain.customDomain,
        customDomainVerified: domain.customDomainVerified,
        verificationMethod: domain.verificationMethod,
        verifiedAt: domain.verifiedAt,
      };
      
      return res.json(status);
    } catch (error) {
      console.error('Error getting verification status:', error);
      return res.status(500).json({ error: 'Failed to get verification status' });
    }
  }
);

/**
 * SSL Certificate Management Routes
 */

// GET /api/domains/custom/:domainId/ssl/certificates
router.get(
  '/:domainId/ssl/certificates',
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const domain = await domainService.getDomainById(domainId);
      
      if (!domain || !domain.customDomain) {
        return res.json({ certificates: [] });
      }
      
      const certificate = await sslService.getCertificateById(domain.customDomain);
      const certificates = certificate ? [certificate] : [];
      
      return res.json({ certificates });
    } catch (error) {
      console.error('Error getting SSL certificates:', error);
      return res.status(500).json({ error: 'Failed to get SSL certificates' });
    }
  }
);

// POST /api/domains/custom/:domainId/ssl/provision
router.post(
  '/:domainId/ssl/provision',
  sslRateLimit,
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { customDomain } = req.body;

      // Use the request certificate method
      const result = await sslService.requestCertificate({
        domainId,
        customDomain,
        provider: 'letsencrypt',
        challengeType: 'dns-01',
        keyAlgorithm: 'RSA-2048',
        autoRenewal: true,
      });
      
      return res.json({
        success: true,
        message: 'SSL certificate provisioned successfully',
        certificate: result,
      });
    } catch (error) {
      console.error('Error provisioning SSL certificate:', error);
      return res.status(500).json({ error: 'Failed to provision SSL certificate' });
    }
  }
);

// GET /api/domains/custom/:domainId/ssl/status
router.get(
  '/:domainId/ssl/status',
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const domain = await domainService.getDomainById(domainId);
      
      if (!domain || !domain.customDomain) {
        return res.json({ status: 'no_custom_domain' });
      }
      
      const certificate = await sslService.getCertificateById(domain.customDomain);
      const status = certificate ? 'active' : 'not_found';
      
      return res.json({ status, certificate });
    } catch (error) {
      console.error('Error getting SSL status:', error);
      return res.status(500).json({ error: 'Failed to get SSL status' });
    }
  }
);

// POST /api/domains/custom/:domainId/ssl/renew
router.post(
  '/:domainId/ssl/renew',
  sslRateLimit,
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { certificateId } = req.body;

      // Use the renew certificate method with proper CertificateInfo
      const certificate = await sslService.getCertificateById(certificateId);
      if (!certificate) {
        return res.status(404).json({ error: 'Certificate not found' });
      }

      const result = await sslService.renewCertificate(certificate);
      
      return res.json({
        success: true,
        message: 'Certificate renewed successfully',
        certificate: result,
      });
    } catch (error) {
      console.error('Error renewing SSL certificate:', error);
      return res.status(500).json({ error: 'Failed to renew SSL certificate' });
    }
  }
);

/**
 * CORS Configuration Routes
 */

// GET /api/domains/custom/:domainId/cors
router.get(
  '/:domainId/cors',
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const corsValidation = await corsManager.validateCorsConfig(domainId);
      
      return res.json(corsValidation);
    } catch (error) {
      console.error('Error getting CORS configuration:', error);
      return res.status(500).json({ error: 'Failed to get CORS configuration' });
    }
  }
);

// GET /api/domains/custom/:domainId/cors/validate
router.get(
  '/:domainId/cors/validate',
  requireDomainReadCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const validation = await corsManager.validateCorsConfig(domainId);
      
      return res.json(validation);
    } catch (error) {
      console.error('Error validating CORS configuration:', error);
      return res.status(500).json({ error: 'Failed to validate CORS configuration' });
    }
  }
);

// POST /api/domains/custom/:domainId/cors/test
router.post(
  '/:domainId/cors/test',
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { origin } = req.body;

      const test = await corsManager.testCorsConfig(domainId, origin);
      
      return res.json(test);
    } catch (error) {
      console.error('Error testing CORS configuration:', error);
      return res.status(500).json({ error: 'Failed to test CORS configuration' });
    }
  }
);

// GET /api/domains/custom/:domainId/cors/stats
router.get(
  '/:domainId/cors/stats',
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { days = 7 } = req.query;
      
      const stats = await corsManager.getCorsStats(domainId, Number(days));
      
      return res.json(stats);
    } catch (error) {
      console.error('Error getting CORS stats:', error);
      return res.status(500).json({ error: 'Failed to get CORS stats' });
    }
  }
);

/**
 * Domain Health Monitoring Routes
 */

// GET /api/domains/custom/:domainId/health
router.get(
  '/:domainId/health',
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      
      // Check if user has super admin role
      if (req.user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const health = await healthService.checkDomainHealth(domainId);
      
      return res.json(health);
    } catch (error) {
      console.error('Error getting domain health:', error);
      return res.status(500).json({ error: 'Failed to get domain health' });
    }
  }
);

// GET /api/domains/custom/:domainId/health/history
router.get(
  '/:domainId/health/history',
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      
      // Check if user has super admin role
      if (req.user?.role !== 'super_admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { days = 7 } = req.query;
      
      // Use checkDomainHealth for now until health history is implemented
      const health = await healthService.checkDomainHealth(domainId);
      const history = [{ timestamp: new Date(), ...health }];
      
      return res.json(history);
    } catch (error) {
      console.error('Error getting domain health history:', error);
      return res.status(500).json({ error: 'Failed to get domain health history' });
    }
  }
);

// GET /api/domains/custom/:domainId/health/alerts
router.get(
  '/:domainId/health/alerts',
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      
      // Use the health check to determine alerts
      const health = await healthService.checkDomainHealth(domainId);
      const alerts: unknown[] = []; // Placeholder until alerts system is implemented
      
      return res.json(alerts);
    } catch (error) {
      console.error('Error getting domain health alerts:', error);
      return res.status(500).json({ error: 'Failed to get domain health alerts' });
    }
  }
);

/**
 * Domain Analytics Routes
 */

  // GET /api/domains/custom/:domainId/analytics
router.get(
  '/:domainId/analytics',
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const { timeRange = '7d' } = req.query;
      
      // Parse timeRange safely
      const timeRangeStr = typeof timeRange === 'string' ? timeRange : '7d';
      const days = parseInt(timeRangeStr.replace('d', '')) || 7;

      // Get basic domain info and health
      const domain = await domainService.getDomainById(domainId);
      const health = await healthService.checkDomainHealth(domainId);
      const corsStats = await corsManager.getCorsStats(domainId, days);

      return res.json({
        domain,
        health,
        cors: corsStats,
        timeRange: timeRangeStr,
      });
    } catch (error) {
      console.error('Error getting domain analytics:', error);
      return res.status(500).json({ error: 'Failed to get domain analytics' });
    }
  }
);

// --- Custom Domain via Vercel ---
// POST /api/domains/:domainId/custom-domain
router.post('/:domainId/custom-domain', requireDomainAdminCompat, async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;
    const { customDomain } = req.body;
    if (!customDomain) return res.status(400).json({ error: 'customDomain required' });

    // Get the domain to ensure it exists
    const domain = await domainService.getDomainById(domainId);
    if (!domain) return res.status(404).json({ error: 'Domain not found' });
    if (!domain.customDomain) return res.status(400).json({ error: 'No custom domain configured for this domain' });

    try {
      // Add domain to Vercel and get DNS records
      const { dnsRecords } = await getVercelService().addDomain(domain.customDomain);
      return res.json({ success: true, dnsRecords });
    } catch (vercelErr: any) {
      // Pass through Vercel API errors with details
      console.error('Vercel API error:', vercelErr);
      return res.status(400).json({ 
        error: 'Vercel API error',
        details: vercelErr.message,
        code: 'VERCEL_API_ERROR'
      });
    }
  } catch (err) {
    console.error('Add custom domain error:', err);
    return res.status(500).json({ error: 'Failed to add custom domain' });
  }
});

// POST /api/domains/:domainId/custom-domain/verify
router.post('/:domainId/custom-domain/verify', requireDomainAdminCompat, async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;
    const domain = await domainService.getDomainById(domainId);
    if (!domain?.customDomain) return res.status(400).json({ error: 'No custom domain configured' });

    const cfg = await getVercelService().getDomainConfig(domain.customDomain);
    if (!cfg.configured) {
      return res.status(400).json({ error: 'DNS_NOT_CONFIGURED', records: cfg.records });
    }

    await getVercelService().verifyDomain(domain.customDomain);
    const updated = await domainService.updateDomain(domainId, { customDomainVerified: true });
    return res.json({ success: true, domain: updated });
  } catch (err) {
    console.error('Verify custom domain error:', err);
    return res.status(500).json({ error: 'Failed to verify custom domain' });
  }
});

// DELETE /api/domains/:domainId/custom-domain
router.delete('/:domainId/custom-domain', requireDomainAdminCompat, async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;
    const domain = await domainService.getDomainById(domainId);
    if (domain?.customDomain) {
      await getVercelService().removeDomain(domain.customDomain);
    }
    const updated = await domainService.updateDomain(domainId, { customDomain: null as any, customDomainVerified: false });
    return res.json({ success: true, domain: updated });
  } catch (err) {
    console.error('Delete custom domain error:', err);
    return res.status(500).json({ error: 'Failed to delete custom domain' });
  }
});

export default router; 