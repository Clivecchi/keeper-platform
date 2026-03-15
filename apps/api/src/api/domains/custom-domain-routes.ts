/**
 * Custom Domain Management Routes
 * Advanced domain configuration, SSL, and CORS management
 */

import { Router, Request, Response, NextFunction } from 'express';
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
  requireDomainReadCompat,
  loadDomainPermissionsCompat 
} from '../../middleware/domainPermissionMiddleware.js';
import { rateLimit } from 'express-rate-limit';
import { getRedis, type RedisClientOrNoOp } from '../../lib/redis.js';
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

// Attach domain context for any route that contains :domainId
router.param('domainId', async (req, res, next, domainId) => {
  try {
    if (!domainService) {
      if (!cacheService) {
        const redis = getRedis();
        cacheService = new DomainCacheService(redis);
      }
      domainService = new DomainService(prisma, cacheService);
    }
    const domain = await domainService.getDomainById(domainId);
    if (domain) {
      console.log('[PARAM PROBE] domainId:', domainId, 'domain:', domain);
    try { const { addLog } = await import('../../utils/LogStore.js'); addLog('param-probe', { domainId, found: !!domain }); } catch {}
    (req as any).domainContext = {
        domain,
        isCustomDomain: !!domain.customDomain,
        originalHostname: req.hostname,
        resolvedSlug: domain.slug,
        permissions: [],
        role: undefined,
        isOwner: false
      };
    }
  } catch (err) {
    console.error('Error loading domain context:', err);
  } finally {
    next();
  }
});
// After domain context is attached, authentication middleware must run first
// so that req.user is available to permission loader.
router.use(authMiddlewareCompat);
// Load permissions only for routes that include :domainId (after param ran)
router.use('/:domainId', loadDomainPermissionsCompat);

const prisma = new PrismaClient();

// Lazy initialization - services will be created only when needed during request processing
let cacheService: DomainCacheService | null = null;
let domainService: DomainService | null = null;
let verificationService: DomainVerificationService | null = null;
let sslService: SslCertificateService | null = null;
let healthService: DomainHealthMonitoringService | null = null;

function getHealthService(): DomainHealthMonitoringService {
  if (!healthService) {
    if (!cacheService) {
      const redis = getRedis(); // This will now work since dotenv is loaded at startup
      cacheService = new DomainCacheService(redis);
    }
    if (!domainService) {
      domainService = new DomainService(prisma, cacheService);
    }
    if (!verificationService) {
      verificationService = new DomainVerificationService(prisma, cacheService);
    }
    if (!sslService) {
      sslService = new SslCertificateService(prisma, cacheService);
    }
    healthService = new DomainHealthMonitoringService(
      prisma,
      domainService,
      verificationService,
      sslService,
      cacheService
    );
  }
  return healthService;
}

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

// Auth middleware already applied earlier after param loader

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

      const health = await getHealthService().checkDomainHealth(domainId);
      
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
      const health = await getHealthService().checkDomainHealth(domainId);
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
      const health = await getHealthService().checkDomainHealth(domainId);
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
      const health = await getHealthService().checkDomainHealth(domainId);
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
router.post(
  '/:domainId/custom-domain',
  async (req: Request, res: Response, next: NextFunction) => {
    console.log('[ENTRY PROBE] Reached custom-domain route');
    try {
      const { addLog } = await import('../../utils/LogStore.js');
      addLog('custom-domain-entry', { params: req.params, body: req.body });
    } catch {}
    next();
  },
  requireDomainAdminCompat,
  async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;
    console.log('Adding domain to Vercel:', { domainId, body: req.body });

    // Get the domain to ensure it exists
    const domain = await domainService.getDomainById(domainId);
    console.log('Found domain:', domain);

    if (!domain) {
      console.log('Domain not found');
      return res.status(404).json({ error: 'Domain not found' });
    }
    if (!domain.customDomain) {
      console.log('No custom domain configured');
      return res.status(400).json({ error: 'No custom domain configured for this domain' });
    }

    try {
      console.log('Calling Vercel API to add domain:', domain.customDomain);
      const vercelService = getVercelService();
      console.log('Vercel service initialized with:', {
        baseUrl: vercelService['baseUrl'],
        projectId: vercelService['projectId'],
        hasToken: !!vercelService['token']
      });

      const { dnsRecords } = await vercelService.addDomain(domain.customDomain);
      console.log('Vercel API response:', { dnsRecords });
      return res.json({ success: true, dnsRecords });
    } catch (vercelErr: any) {
      // Pass through Vercel API errors with details
      console.error('Vercel API error:', {
        message: vercelErr.message,
        stack: vercelErr.stack,
        cause: vercelErr.cause
      });
      try {
        const { addLog } = await import('../../utils/LogStore.js');
        addLog('vercel-route', {
          msg: vercelErr.message,
          code: vercelErr.code ?? 'unknown',
          stack: vercelErr.stack
        });
      } catch (logErr) {
        /* ignore logging errors to avoid masking root issue */
      }
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

// GET /api/domains/:domainId/custom-domain/status - attached, configured, verified, records
router.get('/:domainId/custom-domain/status', requireDomainAdminCompat, async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;
    const domain = await domainService.getDomainById(domainId);
    if (!domain?.customDomain) return res.status(400).json({ error: 'No custom domain configured' });

    console.log('API: Getting domain status for:', { domainId, customDomain: domain.customDomain });

    const svc = getVercelService();
    const status = await svc.getDomainStatus(domain.customDomain);
    
    console.log('API: Vercel status response:', {
      domainId,
      customDomain: domain.customDomain,
      status
    });

    let records: any[] = [];
    let configured = false;
    let nameServers: string[] = [];
    let error = null;
    let errorCode = null;

    if (status.attached) {
      try {
        const cfg = await svc.getDomainConfig(domain.customDomain);
        records = cfg.records;
        configured = cfg.configured;
        nameServers = cfg.nameServers || [];
        
        console.log('API: Domain config loaded:', {
          domainId,
          customDomain: domain.customDomain,
          configured,
          recordsCount: records.length,
          nameServersCount: nameServers.length
        });
      } catch (configError) {
        console.error('API: Failed to get domain config:', {
          domainId,
          customDomain: domain.customDomain,
          error: configError
        });
        error = 'Failed to load DNS configuration';
        errorCode = 'DNS_CONFIG_ERROR';
      }
    } else if (status.error) {
      error = status.error;
      errorCode = status.errorCode;
      
      console.log('API: Domain status error:', {
        domainId,
        customDomain: domain.customDomain,
        error,
        errorCode,
        details: status.details
      });
    }

    const response = {
      attached: status.attached,
      verified: status.verified,
      configured,
      records,
      nameServers,
      error,
      errorCode,
      details: status.details
    };

    console.log('API: Returning domain status:', {
      domainId,
      customDomain: domain.customDomain,
      response
    });

    return res.json(response);
  } catch (err) {
    console.error('API: Domain status error:', err);
    return res.status(500).json({ 
      error: 'Failed to fetch domain status',
      details: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});

// GET /api/domains/:domainId/custom-domain/dns - return required DNS records
router.get('/:domainId/custom-domain/dns', requireDomainAdminCompat, async (req: Request, res: Response) => {
  try {
    const { domainId } = req.params;
    const domain = await domainService.getDomainById(domainId);
    if (!domain?.customDomain) return res.status(400).json({ error: 'No custom domain configured' });

    const cfg = await getVercelService().getDomainConfig(domain.customDomain);
    return res.json(cfg); // { configured: boolean, records: [...] }
  } catch (err) {
    console.error('Get DNS config error:', err);
    return res.status(500).json({ error: 'Failed to fetch DNS configuration' });
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