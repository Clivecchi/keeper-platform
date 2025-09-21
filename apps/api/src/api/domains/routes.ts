/**
 * Domain Management API Routes
 * RESTful endpoints for domain CRUD operations, permissions, and verification
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { DomainServiceFactory, DomainPermissionService, DomainCacheService, DomainVerificationService, type DomainPermissionType } from '@keeper/database';
import { getRedis, type RedisClientOrNoOp } from '../../lib/redis.js';
import { AuthenticatedRequest, authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { requireDomainAdminCompat, requireDomainReadCompat, requireDomainWriteCompat } from '../../middleware/domainPermissionMiddleware.js';
import { validationMiddleware } from '../../middleware/validationMiddleware.js';
import { getFeatureFlagService } from '@keeper/database';
import customDomainRoutes from './custom-domain-routes.js';
import { createDomainResolutionMiddleware } from '../../middleware/domainResolutionMiddleware.js';
import { ensureDomainTableShape } from '../../lib/db-guards.js';
import { DomainService } from '@keeper/database';
import { ensureDomainManagementBoard } from '../../services/boards/domainManagement.js';

const router: Router = Router();
const prisma = new PrismaClient();
const redis: RedisClientOrNoOp = getRedis();
const cacheService = new DomainCacheService(redis);
const domainService = new DomainService(prisma, cacheService);
const permissionService = new DomainPermissionService(prisma, cacheService);
const verificationService = new DomainVerificationService(prisma, cacheService);
const featureFlags = getFeatureFlagService();

// Apply domain resolution middleware
router.use(createDomainResolutionMiddleware());

// Mount custom domain routes to support both legacy and new paths
router.use(customDomainRoutes); // legacy: /api/domains/:domainId/custom-domain
router.use('/custom', customDomainRoutes); // new: /api/domains/custom/:domainId/custom-domain

// GET /api/domains/:domainId/management-board
router.get('/:domainId/management-board', authMiddlewareCompat, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // H4: guard to ensure 'deletedAt' (and future) column shape
    try { await ensureDomainTableShape(); } catch (e: any) {
      console.warn('[domains:management-board] guard warning', { message: e?.message });
    }
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const domainId = req.params.domainId;
    const perm = await permissionService.checkPermission({ userId: req.user.id, domainId, permission: 'admin' });
    if (!perm.hasPermission) return res.status(403).json({ error: 'Access denied' });

    // A: Return a real Prisma UUID for the domain's management/agent board
    const board = await ensureDomainManagementBoard(prisma as any, domainId);
    return res.json({ boardId: board.id, domainId });
  } catch (err) {
    console.error('[domains:management-board:error]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// User search for member management
router.get('/users/search', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Search query required' });
    }

    const users = await prisma.users.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    return res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    return res.status(500).json({ error: 'Failed to search users' });
  }
});

// Mount routes first
router.get('/my', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Pass user context to feature flag check
    if (!featureFlags.isEnabled('DOMAIN_LAYER_ENABLED', { 
      userId: req.user.id,
      userRole: req.user.role || 'user'
    })) {
      return res.status(404).json({ error: 'Feature not enabled' });
    }

    const userId = req.user.id;

    // First, attempt standard lookup (active domains + permissions logic)
    let domains = await domainService.getUserDomains(userId);

    // Fallback: if nothing found, broaden the query to include inactive domains the user owns
    if (domains.length === 0) {
      domains = await prisma.domain.findMany({
        where: {
          ownerId: userId,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Determine primary domain based on business logic
    // Primary domain is the first domain owned by the user that matches their name
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { name: true }
    });

    const domainsWithPrimary = domains.map((domain: any) => {
      const isPrimary = domain.ownerId === userId && 
                       user?.name && 
                       domain.name.toLowerCase().includes(user.name.toLowerCase());
      return {
        ...domain,
        isPrimary
      };
    });

    return res.json(domainsWithPrimary);
  } catch (error) {
    console.error('Error fetching user domains:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Validation schemas
const createDomainSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().default(false),
  allowRequests: z.boolean().default(false),
  categories: z.array(z.string()).default([]),
  customDomain: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/).optional(),
  features: z.record(z.any()).optional(),
  limits: z.record(z.any()).optional(),
  theme: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
});

const updateDomainSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  isPublic: z.boolean().optional(),
  allowRequests: z.boolean().optional(),
  categories: z.array(z.string()).optional(),
  customDomain: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/).optional(),
  features: z.record(z.any()).optional(),
  limits: z.record(z.any()).optional(),
  theme: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
});

const grantPermissionSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'user', 'friend', 'connection']),
  permissions: z.array(z.enum(['read', 'write', 'share', 'admin', 'invite', 'delete'])).optional(),
  expiresAt: z.string().datetime().optional(),
});

const searchDomainsSchema = z.object({
  search: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  isPublic: z.boolean().optional(),
  status: z.string().optional(),
  categories: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

/**
 * Domain CRUD Operations
 */

// GET /api/domains - Search and list domains
router.get('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    if (!featureFlags.isEnabled('DOMAIN_LAYER_ENABLED')) {
      return res.status(404).json({ error: 'Feature not enabled' });
    }

    const { search, limit = 20, offset = 0 } = req.query;
    const filters = { 
      search: typeof search === 'string' ? search : undefined, 
      limit: Number(limit), 
      offset: Number(offset) 
    };

    const { domains, total } = await domainService.searchDomains(filters);

    return res.json({
      domains,
      total,
      page: Math.floor((Number(filters.offset) || 0) / (Number(filters.limit) || 20)) + 1,
      limit: Number(filters.limit) || 20,
    });
  } catch (error) {
    console.error('Error searching domains:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/domains - Create a new domain
router.post('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Pass user context to feature flag check
    if (!featureFlags.isEnabled('DOMAIN_LAYER_ENABLED', { 
      userId: req.user.id,
      userRole: req.user.role || 'user'
    })) {
      return res.status(404).json({ error: 'Feature not enabled' });
    }

    const domain = await domainService.createDomain({
      ...req.body,
      ownerId: req.user.id,
    });

    return res.status(201).json({ domain });
  } catch (error) {
    console.error('Error creating domain:', error);
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/domains/:id - Get domain by ID
router.get('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const domain = await domainService.getDomainById(req.params.id);
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check permission
    const permission = await permissionService.checkPermission({
      userId: req.user.id,
      domainId: domain.id,
      permission: 'read',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.json({ domain });
  } catch (error) {
    console.error('Error fetching domain:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/domains/:id - Update domain
router.put('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check permission
    const permission = await permissionService.checkPermission({
      userId: req.user.id,
      domainId: req.params.id,
      permission: 'admin',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const domain = await domainService.updateDomain(req.params.id, req.body);

    return res.json({ domain });
  } catch (error) {
    console.error('Error updating domain:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('already in use')) {
        return res.status(409).json({ error: error.message });
      }
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/domains/:id - Update domain (partial update)
router.patch('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check permission
    const permission = await permissionService.checkPermission({
      userId: req.user.id,
      domainId: req.params.id,
      permission: 'admin',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const domain = await domainService.updateDomain(req.params.id, req.body);

    return res.json({ domain });
  } catch (error) {
    console.error('Error updating domain:', error);
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('already in use')) {
        return res.status(409).json({ error: error.message });
      }
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/domains/:id - Delete domain
router.delete('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check permission
    const permission = await permissionService.checkPermission({
      userId: req.user.id,
      domainId: req.params.id,
      permission: 'admin',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await domainService.deleteDomain(req.params.id, req.user.id);

    return res.status(204).send();
  } catch (error) {
    console.error('Error deleting domain:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Domain Permission Management
 */

// GET /api/domains/:id/permissions - Get domain permissions
router.get('/:id/permissions', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check permission
    const permission = await permissionService.checkPermission({
      userId: req.user.id,
      domainId: req.params.id,
      permission: 'admin',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const users = await permissionService.getDomainUsers(req.params.id);

    return res.json({ users });
  } catch (error) {
    console.error('Error fetching domain permissions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/domains/:id/permissions - Grant permission
router.post('/:id/permissions', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : undefined;

    const permission = await permissionService.grantPermission({
      domainId: req.params.id,
      userId: req.body.userId,
      role: req.body.role,
      permissions: req.body.permissions,
      grantedBy: req.user.id,
      expiresAt,
    });

    return res.status(201).json({ permission });
  } catch (error) {
    console.error('Error granting permission:', error);
    if (error instanceof Error) {
      if (error.message.includes('Insufficient permissions')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/domains/:id/permissions/:userId - Revoke permission
router.delete('/:id/permissions/:userId', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await permissionService.revokePermission(req.params.id, req.params.userId, req.user.id);

    return res.status(204).send();
  } catch (error) {
    console.error('Error revoking permission:', error);
    if (error instanceof Error) {
      if (error.message.includes('Insufficient permissions')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('Cannot revoke')) {
        return res.status(400).json({ error: error.message });
      }
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Domain Resolution and Verification
 */

// GET /api/domains/resolve/:hostname - Resolve domain by hostname
router.get('/resolve/:hostname', async (req: Request, res: Response) => {
  try {
    const hostname = req.params.hostname;
    const domain = await domainService.getDomainByHostname(hostname);

    return res.json({ domain });
  } catch (error) {
    console.error('Error resolving domain:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/domains/:id/verify - Verify custom domain
router.post('/:id/verify', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    if (!featureFlags.isEnabled('CUSTOM_DOMAINS_ENABLED')) {
      return res.status(403).json({ error: 'Custom domains are currently disabled' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check permission
    const permission = await permissionService.checkPermission({
      userId: req.user.id,
      domainId: req.params.id,
      permission: 'admin',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const domain = await domainService.getDomainById(req.params.id);
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    if (!domain.customDomain) {
      return res.status(400).json({ error: 'No custom domain configured' });
    }

    // Simulate verification
    const verified = await simulateCustomDomainVerification(domain.customDomain);

    if (verified) {
      await domainService.updateDomain(req.params.id, {
        customDomainVerified: true,
      });

      return res.json({
        success: true,
        message: 'Custom domain verified successfully',
        domain: { ...domain, customDomainVerified: true },
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Domain verification failed. Please check your DNS settings.',
      });
    }
  } catch (error) {
    console.error('Error verifying domain:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Domain Statistics and Health
 */

// GET /api/domains/:id/stats - Get domain statistics
router.get('/:id/stats', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const stats = await domainService.getDomainStats(req.params.id);

    return res.json({ stats });
  } catch (error) {
    console.error('Error fetching domain stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/domains/:id/health - Check domain health
router.get('/:id/health', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const health = await domainService.checkDomainHealth(req.params.id);

    return res.json({ health });
  } catch (error) {
    console.error('Error checking domain health:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Utility Functions
 */

async function simulateCustomDomainVerification(customDomain: string): Promise<boolean> {
  // In a real implementation, this would:
  // 1. Check DNS TXT records for verification token
  // 2. Perform HTTP(S) checks to verify domain ownership
  // 3. Validate SSL certificates
  // 4. Check for proper CNAME or A record configuration
  
  // For now, simulate verification based on domain format
  const isValidDomain = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/.test(customDomain);
  
  // Simulate async verification delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return isValidDomain;
}

// ----- Domain Member Management (User Scope) -----
 
// GET /api/domains/:id/members - list members (domain admin only)
router.get('/:id/members', authMiddlewareCompat, requireDomainAdminCompat, async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.domainPermission.findMany({
      where: { domainId: req.params.id },
      include: { users_DomainPermission_userIdTousers: { select: { id: true, name: true, email: true } } },
    });

    const members = permissions.map((p) => ({
      userId: p.userId,
      name: p.users_DomainPermission_userIdTousers?.name || p.users_DomainPermission_userIdTousers?.email || p.userId,
      role: p.role,
      permissions: p.permissions,
      expiresAt: p.expiresAt,
    }));

    return res.json({ members });
  } catch (error) {
    console.error('[DomainRoutes] list members error', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
 
// POST /api/domains/:id/members - grant permission (domain admin only)
router.post('/:id/members', authMiddlewareCompat, requireDomainAdminCompat, async (req: Request, res: Response) => {
  try {
    const { userId, role, permissions, expiresAt } = req.body;
    if (!userId || !role) return res.status(400).json({ error: 'userId and role required' });

    const permission = await permissionService.grantPermission({
      domainId: req.params.id,
      userId,
      role,
      permissions,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      grantedBy: (req as any).user.id,
    });

    return res.status(201).json({ permission });
  } catch (error: any) {
    console.error('[DomainRoutes] add member error', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});
 
// PATCH /api/domains/:id/members/:userId - update role/permissions/expiry
router.patch('/:id/members/:userId', authMiddlewareCompat, requireDomainAdminCompat, async (req: Request, res: Response) => {
  try {
    const { role, permissions, expiresAt } = req.body;
    const permission = await permissionService.updatePermission(req.params.id, req.params.userId, {
      role,
      permissions,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      updatedBy: (req as any).user.id,
    });
    return res.json({ permission });
  } catch (error: any) {
    console.error('[DomainRoutes] update member error', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});
 
// DELETE /api/domains/:id/members/:userId - revoke
router.delete('/:id/members/:userId', authMiddlewareCompat, requireDomainAdminCompat, async (req: Request, res: Response) => {
  try {
    await permissionService.revokePermission(req.params.id, req.params.userId, (req as any).user.id);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('[DomainRoutes] revoke member error', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Mount custom domain routes under /custom
router.use('/custom', customDomainRoutes);

export default router; 