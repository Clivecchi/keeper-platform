import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { createDomainResolutionMiddleware } from '../../middleware/domainResolutionMiddleware.js';
import { authMiddlewareCompat, optionalAuthMiddleware } from '../../middleware/authMiddleware.js';
import crypto from 'crypto';

const router: Router = Router();
const prisma = new PrismaClient();

// Domain resolution middleware - applied only to routes that need it
const domainResolutionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  const domainResolution = createDomainResolutionMiddleware({
    fallbackDomain: process.env.FALLBACK_DOMAIN ?? 'www.ke3p.com',
  });
  return domainResolution(req, res, next);
};

// Validation schemas
const createDraftSchema = z.object({
  themeSlug: z.string().optional(),
  title: z.string().optional(),
  body: z.string().optional(),
});

const updateDraftSchema = z.object({
  title: z.string().optional(),
  body: z.string().optional(),
  themeSlug: z.string().optional(),
});

const claimSchema = z.object({
  token: z.string().min(10),
});

const listMomentsSchema = z.object({
  domainSlug: z.string().optional(),
  status: z.enum(['kept', 'draft']).optional(),
  limit: z.string().optional(),
});

function getAnonKey(req: Request) {
  const anonKey = req.headers['x-anon-key'];
  return typeof anonKey === 'string' ? anonKey : undefined;
}

async function resolveDomainId(req: Request) {
  let domainId = (req as any).domain?.id;
  if (!domainId) {
    const domainSlug = req.headers['x-domain-slug'] as string;
    if (domainSlug) {
      try {
        const domain = await prisma.domain.findUnique({
          where: { slug: domainSlug },
          select: { id: true, slug: true, name: true }
        });
        if (domain) {
          domainId = domain.id;
          (req as any).domain = domain;
        }
      } catch (error) {
        console.error('[v0:moments] Error looking up domain by slug:', domainSlug, error);
      }
    }
  }

  if (!domainId) {
    const host = req.headers.host;
    if (host === 'www.ke3p.com' || host === 'ke3p.com') {
      try {
        const defaultDomain = await prisma.domain.findUnique({
          where: { slug: 'default' },
          select: { id: true, slug: true, name: true }
        });
        if (defaultDomain) {
          domainId = defaultDomain.id;
          (req as any).domain = defaultDomain;
        }
      } catch (error) {
        console.error('[v0:moments] Error looking up default domain:', error);
      }
    }
  }

  return domainId;
}

function createClaimToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * GET /v0/moments - List moments scoped to a domain
 */
router.get('/', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const parsed = listMomentsSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: parsed.error.errors,
      });
    }

    const domainSlug = parsed.data.domainSlug || (req.headers['x-domain-slug'] as string | undefined);
    if (!domainSlug) {
      return res.status(400).json({
        success: false,
        error: 'DOMAIN_REQUIRED',
        message: 'domainSlug is required to list moments.',
      });
    }

    const domain = await prisma.domain.findUnique({
      where: { slug: domainSlug },
      select: { id: true, name: true, slug: true },
    });

    if (!domain) {
      return res.status(404).json({
        success: false,
        error: 'DOMAIN_NOT_FOUND',
      });
    }

    const limit = Math.min(Number(parsed.data.limit) || 10, 50);
    const status = parsed.data.status || 'kept';

    const where: Record<string, unknown> = {
      domainId: domain.id,
    };

    if (status === 'kept') {
      where.keptAt = { not: null };
    } else {
      where.keptAt = null;
    }

    const moments = await prisma.moment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        title: true,
        narrative: true,
        keptAt: true,
        createdAt: true,
      },
    });

    return res.json({
      success: true,
      data: moments.map((moment) => ({
        id: moment.id,
        title: moment.title,
        body: moment.narrative,
        keptAt: moment.keptAt,
        createdAt: moment.createdAt,
        domain,
      })),
    });
  } catch (error) {
    console.error('[v0:moments] Error listing moments:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to list moments',
    });
  }
});

/**
 * POST /v0/moments/drafts - Create a new draft moment
 * Drafts require domain context for proper scoping and organization
 */
router.post('/drafts', optionalAuthMiddleware, domainResolutionMiddleware, async (req: Request, res: Response) => {
  try {
    const anonKey = getAnonKey(req);
    const domainId = await resolveDomainId(req);

    if (!domainId) {
      console.log('[v0:moments] Draft creation failed: domain required but not resolved', {
        host: req.headers.host,
        domainSlug: req.headers['x-domain-slug'],
        middlewareDomain: (req as any).domain
      });
      return res.status(400).json({
        success: false,
        error: 'DOMAIN_REQUIRED',
        message: 'Domain context is required to create draft moments. Please ensure you are accessing this from a valid domain.',
      });
    }

    if (!req.user?.id && !anonKey) {
      console.log('[v0:moments] Draft creation failed: missing auth or anonymous key');
      return res.status(401).json({
        success: false,
        error: 'Authentication required to create draft moments',
      });
    }

    const { themeSlug, title, body } = createDraftSchema.parse(req.body);

    // Ensure themeSlug is never null/undefined - default to 'neutral'
    const themeSlugSafe = themeSlug || 'neutral';

    const ownerId = req.user?.id ?? null;

    // Ensure required fields are not empty
    const safeTitle = (title || '').trim() || 'Untitled Moment';
    const safeNarrative = (body || '').trim() || '';

    console.log('[v0:moments] Creating domain-scoped draft:', {
      ownerId: ownerId ?? 'anonymous',
      domainId,
      safeTitle,
      safeNarrativeLength: safeNarrative.length,
      themeSlugSafe,
    });

    // Create the draft moment with domain binding
    const moment = await prisma.moment.create({
      data: {
        title: safeTitle,
        narrative: safeNarrative,
        ownerId,
        domainId, // Bind to domain at draft creation time
        ...(ownerId ? {} : { anonKey }),
      },
      select: {
        id: true,
        title: true,
        narrative: true,
        createdAt: true,
        updatedAt: true,
        domain: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    console.log(`[v0:moments] Created draft moment: ${moment.id} for user: ${ownerId ?? 'anonymous'} in domain: ${domainId}`);

    return res.status(201).json({
      success: true,
      data: {
        id: moment.id,
        title: moment.title,
        body: moment.narrative,
        status: 'draft', // All newly created moments are drafts
        themeSlug: themeSlugSafe,
        createdAt: moment.createdAt,
        updatedAt: moment.updatedAt,
        domain: moment.domain,
      },
    });
  } catch (error) {
    console.error('[v0:moments] Error creating draft:', error);

    // Structured error handling - never return 500 for domain issues
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }

    // Log unexpected errors but don't expose internal details
    console.error('[v0:moments] Unexpected error creating draft:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create draft moment',
    });
  }
});

/**
 * PATCH /v0/moments/drafts/:id - Update a draft moment
 */
router.patch('/drafts/:id', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, body, themeSlug } = updateDraftSchema.parse(req.body);

    // For update, we allow themeSlug to remain as is (can be undefined to not change it)
    // Only apply 'neutral' default if explicitly setting to null
    const themeSlugSafe = themeSlug === null ? 'neutral' : themeSlug;

    // First check if the moment exists and is a draft
    const existingMoment = await prisma.moment.findUnique({
      where: { id },
      select: { id: true, ownerId: true, anonKey: true },
    });

    if (!existingMoment) {
      return res.status(404).json({
        success: false,
        error: 'Draft moment not found',
      });
    }

    if (existingMoment.ownerId) {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required to update draft moments',
        });
      }
      if (existingMoment.ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    } else {
      const anonKey = getAnonKey(req);
      if (!anonKey || anonKey !== existingMoment.anonKey) {
        return res.status(403).json({
          success: false,
          error: 'Anonymous access denied',
        });
      }
    }

    // Update the draft moment
    const moment = await prisma.moment.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(body !== undefined && { narrative: body }),
        // ...(themeSlug !== undefined && { theme_id: await getThemeIdBySlug(themeSlug) }), // TODO: Fix theme_id assignment
        updatedAt: new Date(),
      } as any, // TODO: Fix Prisma types
      select: {
        id: true,
        title: true,
        narrative: true,
        createdAt: true,
        updatedAt: true,
        keptAt: true,
      },
    });

    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[v0:moments] Updated draft moment: ${moment.id}`);
    }

    return res.json({
      success: true,
      data: {
        id: moment.id,
        title: moment.title,
        body: moment.narrative,
        status: moment.keptAt ? 'kept' : 'draft', // Derive status from keptAt
        themeSlug: themeSlug,
        createdAt: moment.createdAt,
        updatedAt: moment.updatedAt,
      },
    });
  } catch (error) {
    console.error('[v0:moments] Error updating draft:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    if ((error as any).code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Draft moment not found',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to update draft moment',
    });
  }
});

/**
 * POST /v0/moments/:id/keep - Mark a moment as kept (published)
 * Domain binding happens here - requires domain context
 */
router.post('/:id/keep', optionalAuthMiddleware, domainResolutionMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get domain from resolved context - required for keeping
    const domainId = await resolveDomainId(req);

    if (!domainId) {
      console.log('[v0:moments] Keep failed: domain required but not resolved', {
        host: req.headers.host,
        domainSlug: req.headers['x-domain-slug'],
        middlewareDomain: (req as any).domain
      });
      return res.status(400).json({
        success: false,
        error: 'DOMAIN_REQUIRED_TO_KEEP',
        message: 'Domain context is required to keep moments. Please ensure you are accessing this from a valid domain.',
      });
    }

    // First check if the moment exists and belongs to the authenticated user
    const existingMoment = await prisma.moment.findUnique({
      where: { id },
      select: { id: true, ownerId: true, anonKey: true },
    });

    if (!existingMoment) {
      return res.status(404).json({
        success: false,
        error: 'Moment not found',
      });
    }

    if (existingMoment.ownerId) {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required to keep moments',
        });
      }
      if (existingMoment.ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    } else {
      const anonKey = getAnonKey(req);
      if (!anonKey || anonKey !== existingMoment.anonKey) {
        return res.status(403).json({
          success: false,
          error: 'Anonymous access denied',
        });
      }
    }

    const claimToken = existingMoment.ownerId ? null : createClaimToken();
    const claimTokenExpiresAt = claimToken
      ? new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
      : null;

    // Update the moment: set domainId, status to 'kept', and keptAt timestamp
    const moment = await prisma.moment.update({
      where: { id },
      data: {
        domainId, // Bind to domain at keep time
        keptAt: new Date(),
        updatedAt: new Date(),
        ...(claimToken ? { claimToken, claimTokenExpiresAt } : {}),
      },
      select: {
        id: true,
        title: true,
        narrative: true,
        createdAt: true,
        updatedAt: true,
        keptAt: true,
        domain: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    console.log(`[v0:moments] Kept moment: ${moment.id} in domain: ${domainId}`);

    return res.json({
      success: true,
      data: {
        id: moment.id,
        title: moment.title,
        body: moment.narrative,
        status: 'kept', // Moments with keptAt are "kept"
        keptAt: moment.keptAt,
        createdAt: moment.createdAt,
        updatedAt: moment.updatedAt,
        domain: moment.domain,
      },
      ...(claimToken
        ? { claim: { token: claimToken, expiresAt: claimTokenExpiresAt?.toISOString() } }
        : {}),
    });
  } catch (error) {
    console.error('[v0:moments] Error keeping moment:', error);
    if ((error as any).code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Draft moment not found',
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to keep moment',
    });
  }
});

/**
 * POST /v0/moments/claim - Claim an anonymous kept moment
 */
router.post('/claim', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { token } = claimSchema.parse(req.body);

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to claim moments',
      });
    }

    const moment = await prisma.moment.findFirst({
      where: {
        claimToken: token,
        claimTokenExpiresAt: {
          gt: new Date(),
        },
      },
      select: {
        id: true,
        title: true,
        narrative: true,
        keptAt: true,
        createdAt: true,
        updatedAt: true,
        domain: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!moment) {
      return res.status(404).json({
        success: false,
        error: 'Claim token not found or expired',
      });
    }

    const updated = await prisma.moment.update({
      where: { id: moment.id },
      data: {
        ownerId: req.user.id,
        anonKey: null,
        claimToken: null,
        claimTokenExpiresAt: null,
      },
      select: {
        id: true,
        title: true,
        narrative: true,
        keptAt: true,
        createdAt: true,
        updatedAt: true,
        domain: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return res.json({
      success: true,
      data: {
        id: updated.id,
        title: updated.title,
        body: updated.narrative,
        status: updated.keptAt ? 'kept' : 'draft',
        keptAt: updated.keptAt,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        domain: updated.domain,
      },
    });
  } catch (error) {
    console.error('[v0:moments] Error claiming moment:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Failed to claim moment',
    });
  }
});

/**
 * GET /v0/moments/drafts/:id - Get a draft moment (for loading on page refresh)
 */
router.get('/drafts/:id', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const moment = await prisma.moment.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        narrative: true,
        createdAt: true,
        updatedAt: true,
        keptAt: true,
        ownerId: true,
        anonKey: true,
      },
    });

    if (!moment) {
      return res.status(404).json({
        success: false,
        error: 'Draft moment not found',
      });
    }

    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`[v0:moments] Retrieved draft moment: ${moment.id}`);
    }

    if (moment.ownerId) {
      if (!req.user?.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required to view draft moments',
        });
      }
      if (moment.ownerId !== req.user.id) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
        });
      }
    } else {
      const anonKey = getAnonKey(req);
      if (!anonKey || anonKey !== moment.anonKey) {
        return res.status(403).json({
          success: false,
          error: 'Anonymous access denied',
        });
      }
    }

    return res.json({
      success: true,
      data: {
        id: moment.id,
        title: moment.title,
        body: moment.narrative,
        status: moment.keptAt ? 'kept' : 'draft', // Derive status from keptAt
        themeSlug: undefined, // Not available in current select
        createdAt: moment.createdAt,
        updatedAt: moment.updatedAt,
      },
    });
  } catch (error) {
    console.error('[v0:moments] Error retrieving draft:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve draft moment',
    });
  }
});

// TODO: Implement theme support when Prisma types are fixed
// /**
//  * Helper function to get theme ID by slug
//  */
// async function getThemeIdBySlug(slug: string): Promise<string | null> {
//   try {
//     const theme = await prisma.themes.findUnique({
//       where: { slug },
//       select: { id: true },
//     });
//     return theme?.id || null;
//   } catch (error) {
//     console.error('[v0:moments] Error finding theme:', error);
//     return null;
//   }
// }

export default router;