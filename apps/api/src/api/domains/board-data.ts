/**
 * Domain Board Data Hydration API
 * Loads the Domain Design Board template and enriches it with live domain data
 */

import { Router, Response } from 'express';
import { PrismaClient } from '@keeper/database';
import { AuthenticatedRequest, authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { DomainPermissionService, DomainCacheService } from '@keeper/database';
import { getRedis } from '../../lib/redis.js';

const router: Router = Router();
const prisma = new PrismaClient();
const redis = getRedis();
const cacheService = new DomainCacheService(redis);
const permissionService = new DomainPermissionService(prisma, cacheService);

/**
 * GET /api/domains/:domainId/board-data
 * 
 * Returns the Domain Design Board with live data hydration
 * 
 * Response structure:
 * {
 *   board: {
 *     id, name, description, theme, behavior,
 *     frames: [
 *       {
 *         id, name, pattern, visibility,
 *         props: [
 *           { id, type, config, value }  // value = hydrated data
 *         ]
 *       }
 *     ]
 *   },
 *   domain: { ... },  // Full domain object for context
 *   userPermissions: { canEdit: boolean, role: string }
 * }
 */
router.get('/:domainId/board-data', authMiddlewareCompat, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { domainId } = req.params;
    const userId = req.user?.id;

    // Load domain
    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      include: {
        users: {
          select: { id: true, name: true, email: true }
        },
        DomainPermission: userId ? {
          where: { userId },
          select: { permission: true }
        } : false,
      }
    });

    if (!domain) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    // Check permissions
    let userPermissions = { canEdit: false, role: 'visitor' as string };
    if (userId) {
      const perm = await permissionService.checkPermission({
        userId,
        domainId,
        permission: 'read'
      });
      
      if (perm.hasPermission) {
        userPermissions.canEdit = perm.permission === 'admin' || perm.permission === 'write';
        userPermissions.role = perm.permission || 'visitor';
      }
    }

    // Load Domain Design Board template
    const domainKeeperType = await prisma.keeperType.findFirst({
      where: { name: 'Domain' },
      include: {
        defaultBoardTemplate: {
          include: {
            frames: {
              orderBy: { orderIndex: 'asc' }
            }
          }
        }
      }
    });

    if (!domainKeeperType?.defaultBoardTemplate) {
      return res.status(500).json({ 
        error: 'Domain Design Board template not found. Run database seed.'
      });
    }

    const template = domainKeeperType.defaultBoardTemplate;

    // Filter frames by visibility
    const isAdmin = userPermissions.role === 'admin';
    const visibleFrames = template.frames.filter(frame => {
      const frameData = frame as any;
      const visibility = frameData.props?.visibility || (frame as any).visibility;
      return visibility === 'public' || (visibility === 'admin' && isAdmin);
    });

    // Hydrate props with live data
    const hydratedFrames = await Promise.all(
      visibleFrames.map(async (frame) => {
        const frameData = frame as any;
        const props = Array.isArray(frameData.props) ? frameData.props : [];

        const hydratedProps = await Promise.all(
          props.map(async (prop: any) => {
            // Filter by prop-level visibility
            const propVisibility = prop.config?.visibility;
            if (propVisibility === 'admin' && !isAdmin) {
              return null; // Hide admin-only props from non-admins
            }

            // Hydrate based on dataSource
            let value = prop.config?.content || prop.config?.defaultValue;
            const dataSource = prop.config?.dataSource;

            if (dataSource) {
              value = await hydrateDataSource(dataSource, domain, prisma);
            }

            return {
              id: prop.id,
              type: prop.type,
              config: prop.config,
              value, // Live data
              orderIndex: prop.orderIndex
            };
          })
        );

        // Remove null props (hidden by visibility)
        const filteredProps = hydratedProps.filter(p => p !== null);

        return {
          id: frame.id,
          name: frame.name,
          pattern: frame.pattern,
          visibility: frameData.visibility || 'public',
          layoutData: frame.layoutData,
          props: filteredProps
        };
      })
    );

    // Build response
    const response = {
      board: {
        id: template.id,
        name: template.name,
        description: template.description,
        slug: template.slug,
        theme: template.theme,
        behavior: template.behavior,
        frames: hydratedFrames
      },
      domain: {
        id: domain.id,
        name: domain.name,
        slug: domain.slug,
        description: domain.description,
        customDomain: domain.customDomain,
        customDomainVerified: domain.customDomainVerified,
        isPublic: domain.isPublic,
        theme: domain.theme,
        settings: domain.settings,
        owner: domain.users,
        status: domain.status
      },
      userPermissions
    };

    return res.json(response);

  } catch (error) {
    console.error('[domains:board-data] Error:', error);
    return res.status(500).json({ error: 'Failed to load board data' });
  }
});

/**
 * Hydrate a data source path with live data
 * 
 * Examples:
 *   domain.name → domain.name
 *   domain.description → domain.description
 *   domain.dns.statusMessage → computed DNS status
 *   domain.members → count of members
 *   domain.settings.primaryAgentSummary → agent info
 */
async function hydrateDataSource(
  dataSource: string,
  domain: any,
  prisma: PrismaClient
): Promise<any> {
  const parts = dataSource.split('.');

  // Handle simple domain properties
  if (parts[0] === 'domain' && parts.length === 2) {
    const field = parts[1];
    if (field in domain) {
      return domain[field];
    }
  }

  // Handle nested paths
  if (dataSource === 'domain.theme.coverImage') {
    return domain.theme?.coverImage || null;
  }

  if (dataSource === 'domain.dns.statusMessage') {
    return computeDnsStatus(domain);
  }

  if (dataSource === 'domain.members') {
    const count = await prisma.domainPermission.count({
      where: { domainId: domain.id }
    });
    return count;
  }

  if (dataSource === 'domain.featured.keepersOrJourneys') {
    // Load featured keepers/journeys
    const keepers = await prisma.keeper.findMany({
      where: { domainId: domain.id },
      take: 6,
      orderBy: { createdAt: 'desc' }
    });
    return keepers;
  }

  if (dataSource === 'domain.values.statement') {
    return domain.settings?.ethosStatement || domain.description || 'Building something meaningful.';
  }

  if (dataSource === 'domain.settings.primaryAgentSummary') {
    const agentId = domain.settings?.primaryAgentId;
    if (agentId) {
      const agent = await prisma.kip_agents.findUnique({
        where: { id: agentId },
        select: { id: true, name: true, persona: true }
      });
      return agent;
    }
    return null;
  }

  // Default: return null if not found
  return null;
}

/**
 * Compute DNS status message
 */
function computeDnsStatus(domain: any): string {
  if (!domain.customDomain) {
    return 'No custom domain configured.';
  }
  if (domain.customDomainVerified) {
    return `✓ ${domain.customDomain} is verified and active.`;
  }
  return `DNS detected for ${domain.customDomain} — waiting for verification. You may click Verify now.`;
}

export default router;
