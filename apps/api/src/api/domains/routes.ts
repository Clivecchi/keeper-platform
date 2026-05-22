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
import contactRoutes from './contact.js';
import boardDataRoutes from './board-data.js';
import kipDraftRoutes from './kip-drafts.js';
import kipDesignerRoutes from './kip-designer.js';
import kipDialogRoutes from './kip-dialogs.js';
import presenceSchemaRoutes from './presence-schema-routes.js';
import { createDomainResolutionMiddleware } from '../../middleware/domainResolutionMiddleware.js';
import { ensureDomainTableShape } from '../../lib/db-guards.js';
import { DomainService } from '@keeper/database';
import { ensureDomainHomeBoard, ensureDomainManagementBoard } from '../../services/boards/domainManagement.js';
import { KipAgentService } from '../kip/agents.js';
import type { AgentResponse, KipCommandIntent } from '@keeper/database';
import { buildKipEnvironmentContext } from '../../services/kip/buildKipEnvironmentContext.js';
import { loadDomainPolicy, upsertDomainPolicy } from '../../policy/domainPolicyService.js';
import { DEFAULT_POLICY_PACK_V1, DEFAULT_POLICY_VERSION } from '../../policy/policyPack.js';
import { loadDomainAgentPolicy, ensureDomainAgentPolicy } from '../../governance/index.js';

const router: Router = Router();
const prisma = new PrismaClient();

// Lazy initialization - services will be created only when needed during request processing
let cacheService: DomainCacheService | null = null;
let domainService: DomainService | null = null;
let permissionService: DomainPermissionService | null = null;
let verificationService: DomainVerificationService | null = null;

function getDomainService(): DomainService {
  if (!domainService) {
    if (!cacheService) {
      const redis = getRedis(); // This will now work since dotenv is loaded at startup
      cacheService = new DomainCacheService(redis);
    }
    domainService = new DomainService(prisma, cacheService);
  }
  return domainService;
}

function getPermissionService(): DomainPermissionService {
  if (!permissionService) {
    if (!cacheService) {
      const redis = getRedis(); // This will now work since dotenv is loaded at startup
      cacheService = new DomainCacheService(redis);
    }
    permissionService = new DomainPermissionService(prisma, cacheService);
  }
  return permissionService;
}

function getVerificationService(): DomainVerificationService {
  if (!verificationService) {
    if (!cacheService) {
      const redis = getRedis(); // This will now work since dotenv is loaded at startup
      cacheService = new DomainCacheService(redis);
    }
    verificationService = new DomainVerificationService(prisma, cacheService);
  }
  return verificationService;
}
const featureFlags = getFeatureFlagService();
const domainPolicySchema = z.object({
  policy: z.record(z.any()).default(DEFAULT_POLICY_PACK_V1 as Record<string, unknown>),
  version: z.string().optional(),
});

// ============================================================================
// PUBLIC ROUTES (Before middleware that requires auth)
// ============================================================================

// GET /api/domains/by-slug/:slug - Public route for landing pages
router.get('/by-slug/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    const domain = await prisma.domain.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isPublic: true,
        customDomain: true,
        customDomainVerified: true,
        ownerId: true,
        theme: true,
      }
    });

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    return res.json(domain);
  } catch (error) {
    console.error('Error getting domain by slug:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/domains/:slug/frame - Public. Returns the domain frame JSON.
// Drives the public cover card, InteractionBar, and companion config.
// Falls back to the default frame shape if frame_json is null or empty on the record.
const DEFAULT_FRAME_FALLBACK = {
  domain: 'default',
  keeper_type: 'platform',
  theme: {
    wordmark: 'KE3P',
    tagline: 'cryptically designed, wonderfully underfolded',
    background: '/images/keeper-dawn.jpg',
    colors: { primary: '#2d6a7f', accent: '#b8963e', surface: '#fdfaf4' },
    fonts: { display: 'Cormorant Garamond', ui: 'Outfit' },
  },
  kip: {
    agent_id: 'kip-default',
    model: 'claude-sonnet-4-6',
    visibility: 'public',
    greeting: 'Hello. What would you like to keep today?',
  },
  audience_roles: ['guest', 'keeper', 'admin'],
  cover: {
    slide_type: 'domain_cover',
    card: { type: 'journey_invitation', available_to: ['guest', 'keeper', 'admin'] },
  },
  forward: { label: 'Forward', destination: 'journey/default', available_to: ['guest', 'keeper', 'admin'] },
  directions: [
    { label: 'Journeys', frame: 'journeys', available_to: ['keeper', 'admin'] },
    { label: 'Sign In', action: 'auth.signin', available_to: ['guest'] },
  ],
  kip_context: {
    guest: 'A visitor exploring Keeper for the first time. Warm welcome. Offer Forward.',
    keeper: 'An authenticated keeper. Orient to their journeys and moments.',
    admin: 'Platform admin. Full context available.',
  },
  interaction_bar: {
    primary: 'forward',
    secondary: ['kip'],
    auth: { guest: ['sign_in'], keeper: [], admin: ['settings'] },
    labels: {
      forward: 'Forward',
      kip: 'Kip',
      sign_in: 'Sign In',
      settings: 'Settings',
    },
  },
};

router.get('/:slug/frame', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    const domain = await prisma.domain.findUnique({
      where: { slug },
      select: { frame_json: true },
    });

    if (!domain) {
      return res.status(404).json({
        error: 'DOMAIN_NOT_FOUND',
        message: `No domain found with slug "${slug}"`,
      });
    }

    const frameJson = domain.frame_json;
    const isEmpty =
      frameJson === null ||
      frameJson === undefined ||
      (typeof frameJson === 'object' && Object.keys(frameJson as object).length === 0);

    return res.json(isEmpty ? DEFAULT_FRAME_FALLBACK : frameJson);
  } catch (error) {
    console.error('[domains:frame:error]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/domains/:slug/frame — deep-merge a partial frame_json update (admin only)
// Uses raw SQL to avoid Prisma JSONB serialization quirks.
router.patch('/:slug/frame', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const authedReq = req as AuthenticatedRequest;
    if (!authedReq.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { slug } = req.params;
    const domain = await prisma.domain.findUnique({
      where: { slug },
      select: { id: true, frame_json: true },
    });
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    const permission = await getPermissionService().checkPermission({
      userId: authedReq.user.id,
      domainId: domain.id,
      permission: 'admin',
    });
    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const current = (domain.frame_json as Record<string, unknown>) ?? {};
    const patch = req.body as Record<string, unknown>;

    // Deep-merge top-level keys; for 'theme', also merge nested sub-objects
    const merged: Record<string, unknown> = { ...current };
    for (const key of Object.keys(patch)) {
      const pVal = patch[key];
      const cVal = current[key];
      if (pVal !== null && typeof pVal === 'object' && !Array.isArray(pVal) &&
          cVal !== null && typeof cVal === 'object' && !Array.isArray(cVal)) {
        // Shallow merge objects one level deep
        const merged1: Record<string, unknown> = { ...(cVal as Record<string, unknown>), ...(pVal as Record<string, unknown>) };
        // For 'theme', also deep-merge 'colors' and 'fonts' sub-objects
        if (key === 'theme') {
          const pTheme = pVal as Record<string, unknown>;
          const cTheme = cVal as Record<string, unknown>;
          if (pTheme['colors'] && typeof pTheme['colors'] === 'object') {
            merged1['colors'] = { ...(cTheme['colors'] as object ?? {}), ...(pTheme['colors'] as object) };
          }
          if (pTheme['fonts'] && typeof pTheme['fonts'] === 'object') {
            merged1['fonts'] = { ...(cTheme['fonts'] as object ?? {}), ...(pTheme['fonts'] as object) };
          }
        }
        merged[key] = merged1;
      } else {
        merged[key] = pVal;
      }
    }

    const mergedJson = JSON.stringify(merged);
    await prisma.$executeRaw`UPDATE "Domain" SET frame_json = ${mergedJson}::jsonb WHERE id = ${domain.id}`;

    return res.json({ ok: true, frame: merged });
  } catch (error) {
    console.error('[domains:frame:patch:error]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// Apply domain resolution middleware (affects routes below)
// ============================================================================
// Lazy middleware creation to avoid Redis initialization at import time
router.use((req, res, next) => {
  const middleware = createDomainResolutionMiddleware();
  return middleware(req, res, next);
});

// Mount custom domain routes to support both legacy and new paths
router.use(customDomainRoutes); // legacy: /api/domains/:domainId/custom-domain
router.use('/custom', customDomainRoutes); // new: /api/domains/custom/:domainId/custom-domain

// Mount contact routes
router.use(contactRoutes);

// Mount board data routes
router.use(boardDataRoutes);
router.use(kipDraftRoutes);
router.use(kipDesignerRoutes);
router.use(kipDialogRoutes);
router.use(presenceSchemaRoutes);

// GET /api/domains/:domainId/kip/sole-memory-cards - Domain anchor SOLE (Option B)
router.get('/:domainId/kip/sole-memory-cards', authMiddlewareCompat, requireDomainReadCompat, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
    }

    const { domainId } = req.params;
    const domain = await getDomainService().getDomainById(domainId);

    if (!domain) {
      return res.status(404).json({ error: 'DOMAIN_NOT_FOUND', message: 'Domain not found' });
    }

    const permission = await getPermissionService().checkPermission({
      userId: req.user.id,
      domainId,
      permission: 'read',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'ACCESS_DENIED', message: 'You do not have access to this domain' });
    }

    const memoryCards = await prisma.soleMemoryCard.findMany({
      where: {
        domainId,
        keeperId: null,
      },
      include: {
        SoleReflection: {
          select: {
            id: true,
            agentId: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: memoryCards,
    });
  } catch (error) {
    console.error('[domains:sole-memory-cards:error]', error);
    return res.status(500).json({
      error: 'FAILED_TO_LOAD_SOLE',
      message: 'Failed to load domain SOLE memory cards',
    });
  }
});

// PUT /api/domains/:domainId/kip/sole-memory-cards/:id - Update domain anchor SOLE card
const updateDomainSoleCardSchema = z.object({
  content: z.string().min(1).optional(),
  topic: z.string().optional(),
});
router.put('/:domainId/kip/sole-memory-cards/:id', authMiddlewareCompat, requireDomainWriteCompat, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
    }
    const { domainId, id } = req.params;
    const parsed = updateDomainSoleCardSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    }
    const domain = await getDomainService().getDomainById(domainId);
    if (!domain) {
      return res.status(404).json({ error: 'DOMAIN_NOT_FOUND', message: 'Domain not found' });
    }
    const permission = await getPermissionService().checkPermission({
      userId: req.user.id,
      domainId,
      permission: 'write',
    });
    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'ACCESS_DENIED', message: 'You do not have write access to this domain' });
    }
    const card = await prisma.soleMemoryCard.findFirst({
      where: { id, domainId, keeperId: null },
    });
    if (!card) {
      return res.status(404).json({ error: 'CARD_NOT_FOUND', message: 'SOLE memory card not found' });
    }
    const updateData: { content?: string; topic?: string; embedded?: boolean; embedding?: string | null } = { ...parsed.data };
    if (parsed.data.content && parsed.data.content !== card.content) {
      updateData.embedded = false;
      updateData.embedding = null;
    }
    const updated = await prisma.soleMemoryCard.update({
      where: { id },
      data: updateData,
    });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[domains:sole-memory-cards:put:error]', error);
    return res.status(500).json({
      error: 'FAILED_TO_UPDATE_SOLE',
      message: 'Failed to update domain SOLE memory card',
    });
  }
});

// GET /api/domains/:domainId/kip/agents - Domain-scoped agents list
router.get('/:domainId/kip/agents', authMiddlewareCompat, requireDomainReadCompat, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
    }

    const { domainId } = req.params;
    const domain = await getDomainService().getDomainById(domainId);

    if (!domain) {
      return res.status(404).json({ error: 'DOMAIN_NOT_FOUND', message: 'Domain not found' });
    }

    const permission = await getPermissionService().checkPermission({
      userId: req.user.id,
      domainId,
      permission: 'read',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'ACCESS_DENIED', message: 'You do not have access to this domain' });
    }

    // Get primary agent from domain settings
    const domainSettings = ((domain.settings as Record<string, any>) || {});
    const primaryAgentId = typeof domainSettings.primaryAgentId === 'string' ? domainSettings.primaryAgentId : null;

    const agents = [];
    
    if (primaryAgentId) {
      const primaryAgent = await prisma.kip_agents.findUnique({
        where: { id: primaryAgentId },
        select: {
          id: true,
          slug: true,
          name: true,
          purpose: true,
          model: true,
          context_scope: true,
          memory_enabled: true,
          tools: true,
          permissions: true,
          config: true,
          status: true,
          agent_class: true,
          model_provider: true,
          model_settings: true,
          visibility: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (primaryAgent) {
        agents.push(primaryAgent);
      }
    }

    // If no primary agent, ensure Kip is assigned (auto-assign)
    if (agents.length === 0) {
      const kipAgentId = await ensurePrimaryAgentAssignment(domain);
      if (kipAgentId) {
        const kipAgent = await prisma.kip_agents.findUnique({
          where: { id: kipAgentId },
          select: {
            id: true,
            slug: true,
            name: true,
            purpose: true,
            model: true,
            context_scope: true,
            memory_enabled: true,
            tools: true,
            permissions: true,
            config: true,
            status: true,
            agent_class: true,
            model_provider: true,
            model_settings: true,
            visibility: true,
            created_at: true,
            updated_at: true,
          },
        });
        if (kipAgent) {
          agents.push(kipAgent);
        }
      }
    }

    return res.json({ success: true, data: agents });
  } catch (error) {
    console.error('[domains:kip-agents:error]', error);
    return res.status(500).json({ error: 'FAILED_TO_LOAD_AGENTS', message: 'Failed to load domain agents' });
  }
});

// GET /api/domains/:domainId/management-board
router.get('/:domainId/management-board', authMiddlewareCompat, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // H4: guard to ensure 'deletedAt' (and future) column shape
    try { await ensureDomainTableShape(); } catch (e: any) {
      console.warn('[domains:management-board] guard warning', { message: e?.message });
    }
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });

    const domainId = req.params.domainId;
    const perm = await getPermissionService().checkPermission({ userId: req.user.id, domainId, permission: 'admin' });
    if (!perm.hasPermission) return res.status(403).json({ error: 'Access denied' });

    // A: Return a real Prisma UUID for the domain's management/agent board
    const board = await ensureDomainManagementBoard(prisma as any, domainId);
    return res.json({ boardId: board.id, domainId });
  } catch (err) {
    console.error('[domains:management-board:error]', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/domains/:domainId/home-board
router.get(
  '/:domainId/home-board',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    const reqId = (req as any).reqId || req.get('x-request-id') || '';
    try {
      try { await ensureDomainTableShape(); } catch (e: any) {
        console.warn('[domains:home-board] guard warning', { message: e?.message });
      }
      if (!req.user) return res.status(401).json({ error: 'Authentication required', reqId });

      const domainId = req.params.domainId;
      const domain = await getDomainService().getDomainById(domainId);
      if (!domain) return res.status(404).json({ error: 'Domain not found', reqId });

      const board = await ensureDomainHomeBoard(prisma as any, domainId, { reqId });
      const frames = (board.frames || []).map((frame) => ({
        id: frame.id,
        name: frame.name,
        role: frame.role,
        pattern: frame.pattern,
        frameType: frame.frameType,
        orderIndex: frame.orderIndex,
      }));

      return res.json({
        success: true,
        data: {
          id: board.id,
          name: board.name,
          slug: board.slug,
          boardType: board.boardType,
          domainId: board.domainId,
          frames,
        },
        reqId,
      });
    } catch (err) {
      console.error('[domains:home-board:error]', err);
      return res.status(500).json({ error: 'Internal server error', reqId });
    }
  },
);

// GET /api/domains/by-slug/:slug/home-board
router.get('/by-slug/:slug/home-board', authMiddlewareCompat, async (req: AuthenticatedRequest, res: Response) => {
  const reqId = (req as any).reqId || req.get('x-request-id') || '';
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required', reqId });

    const { slug } = req.params;
    const domain = await prisma.domain.findUnique({ where: { slug } });
    if (!domain) return res.status(404).json({ error: 'Domain not found', reqId });

    const permission = await getPermissionService().checkPermission({
      userId: req.user.id,
      domainId: domain.id,
      permission: 'read',
    });
    if (!permission.hasPermission) return res.status(403).json({ error: 'Access denied', reqId });

    const board = await ensureDomainHomeBoard(prisma as any, domain.id, { reqId });
    const frames = (board.frames || []).map((frame) => ({
      id: frame.id,
      name: frame.name,
      role: frame.role,
      pattern: frame.pattern,
      frameType: frame.frameType,
      orderIndex: frame.orderIndex,
    }));

    return res.json({
      success: true,
      data: {
        id: board.id,
        name: board.name,
        slug: board.slug,
        boardType: board.boardType,
        domainId: board.domainId,
        frames,
      },
      reqId,
    });
  } catch (err) {
    console.error('[domains:home-board-by-slug:error]', err);
    return res.status(500).json({ error: 'Internal server error', reqId });
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
    let domains = await getDomainService().getUserDomains(userId);

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
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
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

const domainAgentExecutionSchema = z.object({
  message: z.string().min(1, 'Message is required'),
  context: z
    .object({
      location: z.enum(['kip', 'feed', 'keepers', 'journeys', 'profile']).default('kip'),
      keeperId: z.string().optional(),
      journeyId: z.string().optional(),
      extra: z.record(z.any()).optional(),
    })
    .optional(),
  focus: z
    .object({
      boardId: z.string().optional(),
      keeperId: z.string().optional(),
      journeyId: z.string().optional(),
      pathId: z.string().optional(),
    })
    .optional(),
  sessionId: z.string().optional(),
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

    const { domains, total } = await getDomainService().searchDomains(filters);

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

    const domain = await getDomainService().createDomain({
      ...req.body,
      ownerId: req.user.id,
    });

    await ensureDomainAgentPolicy(domain.id).catch((err) =>
      console.warn('[domains] Failed to ensure domain agent policy:', err)
    );

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
    const domain = await getDomainService().getDomainById(req.params.id);
    
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check permission
    const permission = await getPermissionService().checkPermission({
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
    const permission = await getPermissionService().checkPermission({
      userId: req.user.id,
      domainId: req.params.id,
      permission: 'admin',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const domain = await getDomainService().updateDomain(req.params.id, req.body);

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
    const permission = await getPermissionService().checkPermission({
      userId: req.user.id,
      domainId: req.params.id,
      permission: 'admin',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const domain = await getDomainService().updateDomain(req.params.id, req.body);

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
    const permission = await getPermissionService().checkPermission({
      userId: req.user.id,
      domainId: req.params.id,
      permission: 'admin',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await getDomainService().deleteDomain(req.params.id, req.user.id);

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
    const permission = await getPermissionService().checkPermission({
      userId: req.user.id,
      domainId: req.params.id,
      permission: 'admin',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const users = await getPermissionService().getDomainUsers(req.params.id);

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

    const permission = await getPermissionService().grantPermission({
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

    await getPermissionService().revokePermission(req.params.id, req.params.userId, req.user.id);

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

router.get('/:domainId/kip/environment', authMiddlewareCompat, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
    }

    const { domainId } = req.params;
    const domain = await getDomainService().getDomainById(domainId);

    if (!domain) {
      return res.status(404).json({ error: 'DOMAIN_NOT_FOUND', message: 'Domain not found' });
    }

    const permission = await getPermissionService().checkPermission({
      userId: req.user.id,
      domainId,
      permission: 'read',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'ACCESS_DENIED', message: 'You do not have access to this domain' });
    }

    const sessionId =
      typeof req.query.sessionId === 'string'
        ? (req.query.sessionId as string)
        : undefined;

    const environment = await buildKipEnvironmentContext({
      domainId,
      userId: req.user.id,
      sessionId,
    });

    return res.json({ environment });
  } catch (error) {
    console.error('[domains:kip-environment:error]', error);
    return res.status(500).json({
      error: 'ENVIRONMENT_UNAVAILABLE',
      message: 'Failed to build environment context.',
    });
  }
});

router.get(
  '/:domainId/policy',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const { domainId } = req.params;
      const domain = await getDomainService().getDomainById(domainId);
      if (!domain) {
        return res.status(404).json({ error: 'DOMAIN_NOT_FOUND', message: 'Domain not found' });
      }

      const policy = await loadDomainPolicy(domainId);
      return res.json({ policy });
    } catch (error) {
      console.error('[domains:policy:get:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_LOAD_POLICY' });
    }
  },
);

// GET /api/domains/:domainId/governance - Domain agent policy + contract summary
router.get(
  '/:domainId/governance',
  authMiddlewareCompat,
  requireDomainReadCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { domainId } = req.params;
      const policy = await loadDomainAgentPolicy(domainId);
      if (!policy) {
        return res.status(404).json({ error: 'GOVERNANCE_NOT_FOUND', message: 'No agent policy for this domain' });
      }
      return res.json({
        policyId: policy.id,
        domainId: policy.domainId,
        contractId: policy.contractId,
        contractName: policy.contract.name,
        contractVersion: policy.contract.version,
        enforcementMode: policy.enforcementMode,
      });
    } catch (error) {
      console.error('[domains:governance:get:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_LOAD_GOVERNANCE' });
    }
  }
);

// PATCH /api/domains/:domainId/governance - Update enforcement mode
router.patch(
  '/:domainId/governance',
  authMiddlewareCompat,
  requireDomainAdminCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { domainId } = req.params;
      const { enforcementMode, contractId } = req.body ?? {};
      const validModes = ['strict', 'warn', 'off'];
      if (enforcementMode && !validModes.includes(enforcementMode)) {
        return res.status(400).json({ error: 'INVALID_MODE', message: 'enforcementMode must be strict, warn, or off' });
      }
      const existing = await prisma.domainAgentPolicy.findUnique({ where: { domainId } });
      if (!existing) {
        return res.status(404).json({ error: 'GOVERNANCE_NOT_FOUND', message: 'No agent policy for this domain' });
      }
      const updated = await prisma.domainAgentPolicy.update({
        where: { domainId },
        data: {
          ...(enforcementMode ? { enforcementMode } : {}),
          ...(contractId ? { contractId } : {}),
          updatedAt: new Date(),
        },
        include: { contract: { select: { id: true, name: true, version: true } } },
      });
      return res.json({
        policyId: updated.id,
        domainId: updated.domainId,
        contractId: updated.contractId,
        contractName: updated.contract.name,
        contractVersion: updated.contract.version,
        enforcementMode: updated.enforcementMode,
      });
    } catch (error) {
      console.error('[domains:governance:patch:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_UPDATE_GOVERNANCE' });
    }
  }
);

// GET /api/domains/:domainId/governance/compliance - Compliance metrics (admin only)
router.get(
  '/:domainId/governance/compliance',
  authMiddlewareCompat,
  requireDomainAdminCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { domainId } = req.params;
      const limit = Math.min(parseInt(String(req.query.limit || '100'), 10) || 100, 500);
      const logs = await prisma.governanceComplianceLog.findMany({
        where: { domainId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          ruleKey: true,
          required: true,
          present: true,
          passed: true,
          enforcementMode: true,
          createdAt: true,
          metadata: true,
        },
      });
      const draftTriggerTotal = logs.filter((l) => l.ruleKey === 'draft_trigger').length;
      const draftTriggerPassed = logs.filter((l) => l.ruleKey === 'draft_trigger' && l.passed).length;
      const toolFirstViolations = logs.filter((l) => l.ruleKey === 'tool_first' && !l.passed).length;
      return res.json({
        logs,
        metrics: {
          draftTriggerSuccessPct: draftTriggerTotal > 0 ? (draftTriggerPassed / draftTriggerTotal) * 100 : null,
          toolFirstViolations: toolFirstViolations,
          totalChecks: logs.length,
        },
      });
    } catch (error) {
      console.error('[domains:governance:compliance:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_LOAD_COMPLIANCE' });
    }
  }
);

router.patch(
  '/:domainId/policy',
  authMiddlewareCompat,
  validationMiddleware(domainPolicySchema),
  requireDomainWriteCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
      }

      const { domainId } = req.params;
      const domain = await getDomainService().getDomainById(domainId);
      if (!domain) {
        return res.status(404).json({ error: 'DOMAIN_NOT_FOUND', message: 'Domain not found' });
      }

      const payload = domainPolicySchema.parse(req.body ?? {});
      const policy = await upsertDomainPolicy(domainId, payload.policy ?? DEFAULT_POLICY_PACK_V1, payload.version ?? DEFAULT_POLICY_VERSION);

      return res.json({ policy });
    } catch (error) {
      console.error('[domains:policy:update:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_SAVE_POLICY' });
    }
  },
);

router.post('/:domainId/agent/execute', authMiddlewareCompat, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Authentication required' });
    }

    const { domainId } = req.params;
    const payload = domainAgentExecutionSchema.parse(req.body ?? {});
    const domain = await getDomainService().getDomainById(domainId);

    if (!domain) {
      return res.status(404).json({ error: 'DOMAIN_NOT_FOUND', message: 'Domain not found' });
    }

    const permission = await getPermissionService().checkPermission({
      userId: req.user.id,
      domainId,
      permission: 'read',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'ACCESS_DENIED', message: 'You do not have access to this domain' });
    }

    const domainSettings = ((domain.settings as Record<string, any>) || {});
    let primaryAgentId = typeof domainSettings.primaryAgentId === 'string' ? domainSettings.primaryAgentId : null;

    if (!primaryAgentId) {
      primaryAgentId = await ensurePrimaryAgentAssignment(domain);
    }

    if (!primaryAgentId) {
      console.warn('[domains:agent-execute] Missing primary agent', {
        domainId,
        slug: domain.slug,
      });
      return res.status(400).json({
        error: 'NO_PRIMARY_AGENT',
        message: 'No primary agent is configured for this domain.',
      });
    }

    const focus = payload.focus ?? undefined;
    const environment = await buildKipEnvironmentContext({
      domainId,
      userId: req.user.id,
      focus,
      sessionId: payload.sessionId,
    });

    const agentResult = await KipAgentService.runAgent(
      primaryAgentId,
      payload.message,
      req.user.id,
      payload.sessionId,
      { domainId, domainSlug: domain.slug, mode: 'domain', environment },
    );

    if (!isAgentResponse(agentResult)) {
      return res.status(502).json({
        error: 'AGENT_EXECUTION_FAILED',
        message: 'Agent returned an unsupported payload.',
        details: agentResult,
      });
    }

    if (!agentResult.success) {
      const errorResponse = mapAgentExecutionFailure(agentResult);
      return res.status(errorResponse.status).json(errorResponse.body);
    }

    const reply = extractAgentReply(agentResult) || 'Kip responded without additional details.';
    const normalizedContext = normalizeExecutionContext(payload.context);
    const sessionIdFromResult = extractSessionId(agentResult) ?? payload.sessionId ?? null;
    const actionResults = extractActionResults(agentResult);

    return res.json({
      reply,
      actionResults: actionResults.length > 0 ? actionResults : undefined,
      metadata: {
        agentId: primaryAgentId,
        domainId,
        model: extractAgentModel(agentResult),
        usedMemoryPattern: extractMemoryPattern(agentResult),
        executionId: null,
        sessionId: sessionIdFromResult,
        context: normalizedContext,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'INVALID_REQUEST',
        message: 'Invalid request body',
        details: error.errors,
      });
    }

    console.error('[domains:agent-execute:error]', error);
    return res.status(500).json({
      error: 'AGENT_EXECUTION_ERROR',
      message: 'Failed to execute the domain agent.',
    });
  }
});

type DomainAgentContextInput = {
  location?: 'kip' | 'feed' | 'keepers' | 'journeys' | 'profile';
  keeperId?: string;
  journeyId?: string;
  extra?: Record<string, unknown>;
};

type AgentExecutionResult = AgentResponse | KipCommandIntent;

function isAgentResponse(result: AgentExecutionResult): result is AgentResponse {
  return typeof (result as AgentResponse)?.success === 'boolean';
}

function extractAgentReply(agentResult: any): string | null {
  const payload = agentResult?.data;
  if (!payload) return null;
  if (payload?.data?.response && typeof payload.data.response === 'string') {
    return payload.data.response;
  }
  if (typeof payload?.message === 'string') {
    return payload.message;
  }
  if (typeof payload?.data?.message === 'string') {
    return payload.data.message;
  }
  return null;
}

function extractAgentModel(agentResult: any): string | undefined {
  const payload = agentResult?.data;
  if (typeof payload?.data?.model === 'string') {
    return payload.data.model;
  }
  return undefined;
}

function extractMemoryPattern(agentResult: any): string | null {
  const payload = agentResult?.data;
  if (payload?.data?.memory_enabled) {
    return 'SOLE';
  }
  return null;
}

function extractSessionId(agentResult: any): string | undefined {
  const payload = agentResult?.data;
  if (typeof payload?.data?.session_id === 'string') {
    return payload.data.session_id;
  }
  if (typeof payload?.data?.sessionId === 'string') {
    return payload.data.sessionId;
  }
  return undefined;
}

function extractActionResults(agentResult: any): Array<{
  type: string;
  ok: boolean;
  result?: any;
  error?: { code?: string; message: string; details?: any };
}> {
  const payload = agentResult?.data;
  const actions = payload?.data?.actions;
  if (!Array.isArray(actions)) return [];

  // Transform ActionExecutionResult[] to the expected format
  return actions.map((action: any) => {
    if (action.status === 'success') {
      return {
        type: action.type,
        ok: true,
        result: {
          ...(action.data || {}),
          message: action.message, // Include message in result for normalization
        },
      };
    } else {
      return {
        type: action.type,
        ok: false,
        error: {
          code: action.errorCode || (action.status === 'error' ? 'EXECUTION_ERROR' : 'SKIPPED'),
          message: action.message || 'Action execution failed',
          details: action.data,
        },
      };
    }
  });
}

function extractAgentError(agentResult: any): string {
  if (agentResult?.data?.error && typeof agentResult.data.error === 'string') {
    return agentResult.data.error;
  }
  return 'Agent execution failed';
}

function normalizeExecutionContext(context?: DomainAgentContextInput) {
  return {
    location: context?.location ?? 'kip',
    keeperId: context?.keeperId ?? null,
    journeyId: context?.journeyId ?? null,
    extra: context?.extra ?? {},
  };
}

async function ensurePrimaryAgentAssignment(domain: any): Promise<string | null> {
  try {
    const kipAgent = await prisma.kip_agents.findFirst({
      where: { slug: 'kip' },
      select: { id: true },
    });

    if (!kipAgent) {
      console.warn('[domains:agent-execute] Unable to auto-assign primary agent – Kip agent missing', {
        domainId: domain.id,
        slug: domain.slug,
      });
      return null;
    }

    const nextSettings = {
      ...((domain.settings as Record<string, any>) || {}),
      primaryAgentId: kipAgent.id,
    };

    await prisma.domain.update({
      where: { id: domain.id },
      data: { settings: nextSettings },
    });

    console.info('[domains:agent-execute] Auto-assigned Kip as primary agent', {
      domainId: domain.id,
      slug: domain.slug,
      agentId: kipAgent.id,
    });

    // Ensure callers can read the new value immediately
    domain.settings = nextSettings;
    return kipAgent.id;
  } catch (error) {
    console.error('[domains:agent-execute] Failed to auto-assign Kip agent', {
      domainId: domain.id,
      slug: domain.slug,
      error: error instanceof Error ? error.message : error,
    });
    return null;
  }
}

type AgentPipelineErrorCode =
  | 'MISSING_API_KEY'
  | 'INVALID_MODEL'
  | 'AGENT_MISCONFIGURED'
  | 'PROVIDER_UNAVAILABLE'
  | 'AGENT_EXECUTION_FAILED';

const AGENT_ERROR_TAXONOMY: Record<
  AgentPipelineErrorCode,
  { status: number; layer: 'provider' | 'agent'; message: string }
> = {
  MISSING_API_KEY: {
    status: 400,
    layer: 'provider',
    message: 'Kip cannot run because no AI provider API key is configured for this agent.',
  },
  INVALID_MODEL: {
    status: 400,
    layer: 'provider',
    message: 'The model configured for this agent is not available. Please update it to a supported model.',
  },
  AGENT_MISCONFIGURED: {
    status: 400,
    layer: 'agent',
    message: 'Kip’s configuration is incomplete. Re-save the agent in Studio or assign a different primary agent.',
  },
  PROVIDER_UNAVAILABLE: {
    status: 503,
    layer: 'provider',
    message: 'The AI provider is temporarily unavailable. Please try again shortly.',
  },
  AGENT_EXECUTION_FAILED: {
    status: 502,
    layer: 'agent',
    message: 'Agent returned an unsupported payload.',
  },
};

/**
 * Agent error taxonomy (provider/agent layers) → HTTP response mapping.
 * Domain-level errors (AUTH_REQUIRED, ACCESS_DENIED, NO_PRIMARY_AGENT, etc.)
 * are handled earlier in the route so this function only worries about
 * failures coming back from KipAgentService / ModelProviderService.
 */
function mapAgentExecutionFailure(agentResult: AgentResponse) {
  const errorPayload = (agentResult?.data as any) || {};
  const providerMessage = typeof errorPayload.error === 'string' ? errorPayload.error : 'Agent execution failed';
  const details = errorPayload.details ?? errorPayload;
  const rawCode: string | undefined = typeof errorPayload.errorCode === 'string' ? errorPayload.errorCode : undefined;
  const normalizedCode: AgentPipelineErrorCode =
    rawCode && rawCode in AGENT_ERROR_TAXONOMY ? (rawCode as AgentPipelineErrorCode) : 'AGENT_EXECUTION_FAILED';
  const taxonomy = AGENT_ERROR_TAXONOMY[normalizedCode];

  return {
    status: taxonomy.status,
    body: {
      error: normalizedCode,
      message: normalizedCode === 'AGENT_EXECUTION_FAILED' ? providerMessage : taxonomy.message,
      details,
    },
  };
}

/**
 * Domain Resolution and Verification
 */

// GET /api/domains/resolve/:hostname - Resolve domain by hostname
router.get('/resolve/:hostname', async (req: Request, res: Response) => {
  try {
    const hostname = req.params.hostname;
    const domain = await getDomainService().getDomainByHostname(hostname);

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
    const permission = await getPermissionService().checkPermission({
      userId: req.user.id,
      domainId: req.params.id,
      permission: 'admin',
    });

    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const domain = await getDomainService().getDomainById(req.params.id);
    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    if (!domain.customDomain) {
      return res.status(400).json({ error: 'No custom domain configured' });
    }

    // Simulate verification
    const verified = await simulateCustomDomainVerification(domain.customDomain);

    if (verified) {
      await getDomainService().updateDomain(req.params.id, {
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

    const stats = await getDomainService().getDomainStats(req.params.id);

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

    const health = await getDomainService().checkDomainHealth(req.params.id);

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

    const permission = await getPermissionService().grantPermission({
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
    const permission = await getPermissionService().updatePermission(req.params.id, req.params.userId, {
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
    await getPermissionService().revokePermission(req.params.id, req.params.userId, (req as any).user.id);
    return res.json({ success: true });
  } catch (error: any) {
    console.error('[DomainRoutes] revoke member error', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// Mount custom domain routes under /custom
router.use('/custom', customDomainRoutes);

export default router; 