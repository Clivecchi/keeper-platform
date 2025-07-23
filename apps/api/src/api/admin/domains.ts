import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import Redis from 'ioredis';
import { DomainService, DomainCacheService } from '@keeper/database';
import { DomainPermissionService } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { requireSuperAdmin } from '../../middleware/platformRoleMiddleware.js';

const router = Router();

const prisma = new PrismaClient();
// @ts-ignore - Suppress type mismatch for Redis import in ESM
let redis: any | null = null;
if (process.env.REDIS_URL && process.env.DISABLE_REDIS !== 'true') {
  // @ts-ignore - Constructor typing issue in ESM default import
  redis = new Redis(process.env.REDIS_URL);
}
const cacheService = new DomainCacheService(redis);
const domainService = new DomainService(prisma, cacheService);
const permissionService = new DomainPermissionService(prisma, cacheService);

// Validation schema for creating a domain (mirrors createDomainSchema in public routes)
const createDomainSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(50).optional(),
  description: z.string().max(500).optional(),
  ownerId: z.string().uuid(),
  isPublic: z.boolean().optional(),
  allowRequests: z.boolean().optional(),
  categories: z.array(z.string()).optional(),
  customDomain: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/).optional(),
  features: z.record(z.any()).optional(),
  limits: z.record(z.any()).optional(),
  theme: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
});

/**
 * GET /api/admin/domains
 * List all domains (super-admin only)
 */
router.get('/', authMiddlewareCompat, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0, search } = req.query as Record<string, any>;
    const { domains, total } = await domainService.searchDomains({ search: search as string | undefined }, Number(limit), Number(offset));

    // Fetch owner names in a single query for efficiency
    const ownerIds = Array.from(new Set(domains.map((d: any) => d.ownerId)));
    const owners = await prisma.users.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, name: true },
    });
    const ownerMap = new Map(owners.map((o) => [o.id, o.name ?? '']));

    const enriched = domains.map((d: any) => {
      const ownerName = ownerMap.get(d.ownerId) || '';
      const isPrimary = ownerName && d.name.toLowerCase().includes(ownerName.toLowerCase());
      return {
        ...d,
        ownerName,
        isPrimary,
      };
    });

    res.json({
      domains: enriched,
      total,
      page: Math.floor((Number(offset) || 0) / (Number(limit) || 50)) + 1,
      limit: Number(limit),
    });
  } catch (error) {
    console.error('[AdminDomains] list error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ----- NEW: List members of a domain -----
router.get('/:id/members', authMiddlewareCompat, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const permissions = await prisma.domainPermission.findMany({
      where: { domainId: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const members = permissions.map((p) => ({
      userId: p.userId,
      name: p.user?.name || p.user?.email || p.userId,
      role: p.role,
      permissions: p.permissions,
      expiresAt: p.expiresAt,
    }));

    res.json({ members });
  } catch (error) {
    console.error('[AdminDomains] list members error', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/admin/domains
 * Create a new domain (super-admin only)
 */
router.post('/', authMiddlewareCompat, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = createDomainSchema.parse(req.body);
    const domain = await domainService.createDomain({
      ...parsed,
      ownerId: parsed.ownerId,
    });
    res.status(201).json({ domain });
  } catch (error: any) {
    console.error('[AdminDomains] create error', error);
    if (error?.issues) {
      return res.status(400).json({ error: 'Validation failed', details: error.issues });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

/**
 * PUT /api/admin/domains/:id
 * Update domain metadata (super-admin only)
 */
router.put('/:id', authMiddlewareCompat, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const domain = await domainService.updateDomain(req.params.id, req.body);
    res.json({ domain });
  } catch (error: any) {
    console.error('[AdminDomains] update error', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * PATCH /api/admin/domains/:id/suspend
 * Toggle suspension status
 */
router.patch('/:id/suspend', authMiddlewareCompat, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const current = await domainService.getDomainById(req.params.id);
    if (!current) return res.status(404).json({ error: 'Domain not found' });

    const status = current.status === 'suspended' ? 'active' : 'suspended';
    const domain = await domainService.updateDomain(req.params.id, { status });
    res.json({ domain });
  } catch (error: any) {
    console.error('[AdminDomains] suspend error', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/domains/:id
 * Soft delete (archive)
 */
router.delete('/:id', authMiddlewareCompat, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    await domainService.deleteDomain(req.params.id, (req as any).user.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[AdminDomains] delete error', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// ----- Member management -----

/**
 * POST /api/admin/domains/:id/members
 * Grant permission to a user
 * Body: { userId, role, permissions?, expiresAt? }
 */
router.post('/:id/members', authMiddlewareCompat, requireSuperAdmin, async (req: Request, res: Response) => {
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
    res.status(201).json({ permission });
  } catch (error: any) {
    console.error('[AdminDomains] add member error', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * DELETE /api/admin/domains/:id/members/:userId
 * Revoke permission
 */
router.delete('/:id/members/:userId', authMiddlewareCompat, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    await permissionService.revokePermission(req.params.id, req.params.userId, (req as any).user.id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('[AdminDomains] revoke member error', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}); 