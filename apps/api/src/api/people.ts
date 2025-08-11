/**
 * People API Routes
 * API endpoints for people/user data used by PeopleBoard
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';

const router: Router = Router();
const prisma = new PrismaClient();

// Validation schemas
const peopleQuerySchema = z.object({
  domainId: z.string().optional(),
  role: z.string().optional(),
  status: z.enum(['active', 'inactive', 'pending']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

/**
 * GET /api/people - Get all people/users
 */
router.get('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { domainId, role, status, limit, offset } = peopleQuerySchema.parse(req.query);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Build where clause for users
    const where: any = {};

    // If domainId is specified, filter by domain permissions
    let domainFilter: any = {};
    if (domainId) {
      domainFilter = {
        domainPermissions: {
          some: {
            domainId: domainId,
          },
        },
      };
    }

    const users = await prisma.users.findMany({
      where: {
        ...where,
        ...domainFilter,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        domainPermissions: {
          include: {
            domain: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        user_roles: {
          include: {
            roles: {
              select: {
                id: true,
                name: true,
                description: true,
              },
            },
          },
        },
        ownedDomains: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        kip_sessions: {
          take: 1,
          orderBy: { created_at: 'desc' },
          select: {
            created_at: true,
          },
        },
      },
    });

    const total = await prisma.users.count({
      where: {
        ...where,
        ...domainFilter,
      },
    });

    return res.json({
      people: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar_url: user.avatar_url,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        lastKipSession: user.kip_sessions[0]?.created_at,
        status: determineUserStatus(user),
        domains: user.domainPermissions.map(dp => ({
          ...dp.domain,
          role: dp.role,
          permissions: dp.permissions,
        })),
        ownedDomains: user.ownedDomains,
        roles: user.user_roles.map(ur => ur.roles),
        stats: {
          domainsCount: user.domainPermissions.length,
          ownedDomainsCount: user.ownedDomains.length,
          rolesCount: user.user_roles.length,
        },
      })),
      total,
      page: Math.floor(offset / limit) + 1,
      limit,
    });
  } catch (error) {
    console.error('Error fetching people:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/people/:id - Get a specific person by ID
 */
router.get('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await prisma.users.findUnique({
      where: { id },
      include: {
        domainPermissions: {
          include: {
            domain: true,
            grantor: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        user_roles: {
          include: {
            roles: true,
          },
        },
        ownedDomains: {
          include: {
            permissions: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        kip_sessions: {
          take: 10,
          orderBy: { created_at: 'desc' },
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        kip_agent_logs: {
          take: 10,
          orderBy: { created_at: 'desc' },
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Person not found' });
    }

    return res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      avatar_url: user.avatar_url,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      emailVerified: user.emailVerified,
      status: determineUserStatus(user),
      domains: user.domainPermissions.map(dp => ({
        ...dp.domain,
        role: dp.role,
        permissions: dp.permissions,
        grantedBy: dp.grantor,
        grantedAt: dp.grantedAt,
      })),
      ownedDomains: user.ownedDomains,
      roles: user.user_roles.map(ur => ur.roles),
      recentSessions: user.kip_sessions,
      recentLogs: user.kip_agent_logs,
      stats: {
        totalDomains: user.domainPermissions.length,
        ownedDomains: user.ownedDomains.length,
        totalSessions: user.kip_sessions.length,
        totalInteractions: user.kip_agent_logs.length,
        collaborations: calculateCollaborations(user.domainPermissions),
      },
      activity: {
        lastActive: user.lastLoginAt || user.kip_sessions[0]?.created_at,
        sessionsThisWeek: user.kip_sessions.filter(s => 
          new Date(s.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
        interactionsThisWeek: user.kip_agent_logs.filter(l => 
          new Date(l.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        ).length,
      },
    });
  } catch (error) {
    console.error('Error fetching person:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/people/stats - Get people statistics
 */
router.get('/stats', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { domainId } = req.query;

    // Build domain filter if specified
    let domainFilter: any = {};
    if (domainId && typeof domainId === 'string') {
      domainFilter = {
        domainPermissions: {
          some: {
            domainId: domainId,
          },
        },
      };
    }

    const totalPeople = await prisma.users.count({
      where: domainFilter,
    });

    const activePeople = await prisma.users.count({
      where: {
        ...domainFilter,
        lastLoginAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    });

    const totalDomains = await prisma.domain.count({
      where: domainId ? { id: domainId } : {},
    });

    const pendingInvites = await prisma.domainInvitation.count({
      where: {
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
        ...(domainId ? { domainId } : {}),
      },
    });

    return res.json({
      totalPeople,
      activePeople,
      pendingInvites,
      totalDomains,
      inactivePeople: totalPeople - activePeople,
    });
  } catch (error) {
    console.error('Error fetching people stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions
function determineUserStatus(user: any): 'active' | 'inactive' | 'pending' {
  if (!user.emailVerified) {
    return 'pending';
  }
  
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  if (user.lastLoginAt && new Date(user.lastLoginAt) > thirtyDaysAgo) {
    return 'active';
  }
  
  return 'inactive';
}

function calculateCollaborations(domainPermissions: any[]): number {
  // Count unique domains where user has write or admin permissions
  return domainPermissions.filter(dp => 
    dp.permissions.includes('write') || dp.permissions.includes('admin') || dp.role === 'admin'
  ).length;
}

export default router;
