/**
 * Domain Management API Routes
 * RESTful endpoints for domain CRUD operations, permissions, and verification
 */

import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { DomainService, DomainPermissionService, DomainCacheService, DomainVerificationService, type DomainPermissionType } from '@keeper/database';
import { Redis } from 'ioredis';
import { AuthenticatedRequest, authMiddleware } from '../../middleware/authMiddleware.js';
import { validationMiddleware } from '../../middleware/validationMiddleware.js';
import { getFeatureFlagService } from '../../../../packages/database/src/services/FeatureFlagService';
import customDomainRoutes from './custom-domain-routes.js';
import { createDynamicCorsMiddleware } from '../../middleware/dynamicCorsMiddleware.js';
import { createDomainResolutionMiddleware } from '../../middleware/domainResolutionMiddleware.js';

const router = Router();
const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const cacheService = new DomainCacheService(redis);
const domainService = new DomainService(prisma, cacheService);
const permissionService = new DomainPermissionService(prisma, cacheService);
const verificationService = new DomainVerificationService(prisma);
const featureFlags = getFeatureFlagService();

// Apply dynamic CORS middleware
router.use(createDynamicCorsMiddleware());

// Apply domain resolution middleware
router.use(createDomainResolutionMiddleware());

// Mount custom domain routes
router.use('/domains', customDomainRoutes);

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
router.get('/', authMiddleware, validationMiddleware(searchDomainsSchema, 'query'), async (req, res) => {
  try {
    if (!featureFlags.isEnabled('DOMAIN_LAYER_ENABLED')) {
      return res.status(403).json({ error: 'Domain functionality is currently disabled' });
    }

    const filters = req.query;
    const { domains, total } = await domainService.searchDomains(filters);

    res.json({
      domains,
      total,
      page: Math.floor(filters.offset / filters.limit) + 1,
      limit: filters.limit,
    });
  } catch (error) {
    console.error('Error searching domains:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/domains/my - Get user's domains
router.get('/my', authMiddleware, async (req, res) => {
  try {
    if (!featureFlags.isEnabled('DOMAIN_LAYER_ENABLED')) {
      return res.status(403).json({ error: 'Domain functionality is currently disabled' });
    }

    const userId = req.user.id;
    const domains = await domainService.getUserDomains(userId);

    res.json({ domains });
  } catch (error) {
    console.error('Error fetching user domains:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/domains - Create a new domain
router.post('/', authMiddleware, validationMiddleware(createDomainSchema), async (req, res) => {
  try {
    if (!featureFlags.isEnabled('DOMAIN_LAYER_ENABLED')) {
      return res.status(403).json({ error: 'Domain functionality is currently disabled' });
    }

    const domain = await domainService.createDomain({
      ...req.body,
      ownerId: req.user.id,
    });

    res.status(201).json({ domain });
  } catch (error) {
    console.error('Error creating domain:', error);
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({ error: error.message });
      }
      if (error.message.includes('Invalid slug')) {
        return res.status(400).json({ error: error.message });
      }
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/domains/:id - Get domain by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const domain = await domainService.getDomainById(req.params.id);
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
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

    res.json({ domain });
  } catch (error) {
    console.error('Error fetching domain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/domains/:id - Update domain
router.put('/:id', authMiddleware, validationMiddleware(updateDomainSchema), async (req, res) => {
  try {
    // Check permission
    const permission = await permissionService.checkPermission({
      userId: req.user.id,
      domainId: req.params.id,
      permission: 'admin',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const domain = await domainService.updateDomain(req.params.id, req.body, req.user.id);

    res.json({ domain });
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/domains/:id - Delete domain
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
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

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting domain:', error);
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Domain Permission Management
 */

// GET /api/domains/:id/permissions - Get domain permissions
router.get('/:id/permissions', authMiddleware, async (req, res) => {
  try {
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

    res.json({ users });
  } catch (error) {
    console.error('Error fetching domain permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/domains/:id/permissions - Grant permission
router.post('/:id/permissions', authMiddleware, validationMiddleware(grantPermissionSchema), async (req, res) => {
  try {
    const expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt) : undefined;

    const permission = await permissionService.grantPermission({
      domainId: req.params.id,
      userId: req.body.userId,
      role: req.body.role,
      permissions: req.body.permissions,
      grantedBy: req.user.id,
      expiresAt,
    });

    res.status(201).json({ permission });
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/domains/:id/permissions/:userId - Revoke permission
router.delete('/:id/permissions/:userId', authMiddleware, async (req, res) => {
  try {
    await permissionService.revokePermission(req.params.id, req.params.userId, req.user.id);

    res.status(204).send();
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Domain Resolution and Verification
 */

// GET /api/domains/resolve/:hostname - Resolve domain by hostname
router.get('/resolve/:hostname', async (req, res) => {
  try {
    const hostname = req.params.hostname;
    const resolution = await verificationService.resolveDomain(hostname);

    res.json(resolution);
  } catch (error) {
    console.error('Error resolving domain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/domains/:id/verify - Verify custom domain
router.post('/:id/verify', authMiddleware, async (req, res) => {
  try {
    if (!featureFlags.isEnabled('CUSTOM_DOMAINS_ENABLED')) {
      return res.status(403).json({ error: 'Custom domains are currently disabled' });
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

    // In a real implementation, this would perform actual DNS/HTTP verification
    // For now, we'll simulate verification
    const isVerified = await simulateCustomDomainVerification(domain.customDomain);

    if (isVerified) {
      await domainService.updateDomain(req.params.id, {
        customDomain: domain.customDomain,
      }, req.user.id);

      res.json({ success: true, message: 'Domain verified successfully' });
    } else {
      res.status(400).json({ error: 'Domain verification failed' });
    }
  } catch (error) {
    console.error('Error verifying domain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Domain Statistics and Health
 */

// GET /api/domains/:id/stats - Get domain statistics
router.get('/:id/stats', authMiddleware, async (req, res) => {
  try {
    // Check permission
    const permission = await permissionService.checkPermission({
      userId: req.user.id,
      domainId: req.params.id,
      permission: 'read',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [domainStats, permissionStats] = await Promise.all([
      domainService.getDomainStats(req.params.id),
      permissionService.getPermissionStats(req.params.id),
    ]);

    res.json({
      ...domainStats,
      permissions: permissionStats,
    });
  } catch (error) {
    console.error('Error fetching domain stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/domains/:id/health - Check domain health
router.get('/:id/health', authMiddleware, async (req, res) => {
  try {
    // Check permission
    const permission = await permissionService.checkPermission({
      userId: req.user.id,
      domainId: req.params.id,
      permission: 'read',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const health = await domainService.checkDomainHealth(req.params.id);

    res.json(health);
  } catch (error) {
    console.error('Error checking domain health:', error);
    res.status(500).json({ error: 'Internal server error' });
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

export default router; 