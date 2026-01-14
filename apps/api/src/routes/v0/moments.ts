import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { createDomainResolutionMiddleware } from '../../middleware/domainResolutionMiddleware.js';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';

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

/**
 * POST /v0/moments/drafts - Create a new draft moment
 * Drafts require domain context for proper scoping and organization
 */
router.post('/drafts', authMiddlewareCompat, domainResolutionMiddleware, async (req: Request, res: Response) => {
  try {
    // Check authentication - required for draft creation
    if (!req.user?.id) {
      console.log('[v0:moments] Draft creation failed: no authenticated user');
      return res.status(401).json({
        success: false,
        error: 'Authentication required to create draft moments',
      });
    }

    // Get domain from resolved context - required for drafts
    let domainId = (req as any).domain?.id;

    // If domain not resolved via middleware, try x-domain-slug header
    if (!domainId) {
      const domainSlug = req.headers['x-domain-slug'] as string;
      if (domainSlug) {
        try {
          // Look up domain by slug
          const domain = await prisma.domain.findUnique({
            where: { slug: domainSlug },
            select: { id: true, slug: true, name: true }
          });
          if (domain) {
            domainId = domain.id;
            // Set domain context for consistency
            (req as any).domain = domain;
          }
        } catch (error) {
          console.error('[v0:moments] Error looking up domain by slug:', domainSlug, error);
        }
      }
    }

    // If still no domain and host is www.ke3p.com or ke3p.com, use "default" domain
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

    const { themeSlug, title, body } = createDraftSchema.parse(req.body);

    // Ensure themeSlug is never null/undefined - default to 'neutral'
    const themeSlugSafe = themeSlug || 'neutral';

    const ownerId = req.user.id;

    // Ensure required fields are not empty
    const safeTitle = (title || '').trim() || 'Untitled Moment';
    const safeNarrative = (body || '').trim() || '';

    console.log('[v0:moments] Creating domain-scoped draft:', {
      ownerId,
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

    console.log(`[v0:moments] Created draft moment: ${moment.id} for user: ${ownerId} in domain: ${domainId}`);

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
router.patch('/drafts/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, body, themeSlug } = updateDraftSchema.parse(req.body);

    // For update, we allow themeSlug to remain as is (can be undefined to not change it)
    // Only apply 'neutral' default if explicitly setting to null
    const themeSlugSafe = themeSlug === null ? 'neutral' : themeSlug;

    // First check if the moment exists and is a draft
    const existingMoment = await prisma.moment.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingMoment) {
      return res.status(404).json({
        success: false,
        error: 'Draft moment not found',
      });
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
router.post('/:id/keep', authMiddlewareCompat, domainResolutionMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get domain from resolved context - required for keeping
    const domainId = (req as any).domain?.id;
    if (!domainId) {
      console.log('[v0:moments] Keep failed: domain required but not resolved');
      return res.status(400).json({
        success: false,
        error: 'DOMAIN_REQUIRED_TO_KEEP',
        message: 'Domain context is required to keep moments. Please ensure you are accessing this from a valid domain.',
      });
    }

    // First check if the moment exists and belongs to the authenticated user
    const existingMoment = await prisma.moment.findUnique({
      where: { id },
      select: { id: true, ownerId: true },
    });

    if (!existingMoment) {
      return res.status(404).json({
        success: false,
        error: 'Moment not found',
      });
    }

    // Ensure user owns this moment
    if (existingMoment.ownerId !== req.user?.id) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    // Update the moment: set domainId, status to 'kept', and keptAt timestamp
    const moment = await prisma.moment.update({
      where: { id },
      data: {
        domainId, // Bind to domain at keep time
        keptAt: new Date(),
        updatedAt: new Date(),
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
 * GET /v0/moments/drafts/:id - Get a draft moment (for loading on page refresh)
 */
router.get('/drafts/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
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