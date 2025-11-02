/**
 * Domain Board Data API
 * 
 * Provides all data needed for the Domain Design Board (5 frames)
 * Handles permission-based data filtering (public vs admin view)
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/domains/:id/board-data
 * 
 * Returns all data for Domain Design Board frames:
 * - Frame A: Hero / Identity (public)
 * - Frame B: Activity / Assets (public)
 * - Frame C: People / Membership (public)
 * - Frame D: Domain Operations (admin only)
 * - Frame E: Keys / Integrations (admin only)
 */
router.get('/:id/board-data', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id: domainId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Check permissions
    const permission = await prisma.domainPermission.findUnique({
      where: { 
        domainId_userId: { 
          domainId, 
          userId 
        } 
      }
    });

    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      select: { ownerId: true }
    });

    const isOwner = domain?.ownerId === userId;
    const isAdmin = isOwner || permission?.role === 'admin' || permission?.role === 'owner';

    // Fetch domain with all necessary relations
    const domainData = await prisma.domain.findUnique({
      where: { id: domainId },
      include: {
        // People / Membership (Frame C)
        DomainPermission: {
          include: {
            users_DomainPermission_userIdTousers: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar_url: true
              }
            }
          },
          orderBy: { grantedAt: 'asc' }
        },
        // Activity / Assets (Frame B)
        keepers: {
          select: {
            id: true,
            title: true,
            purpose: true,
            theme_id: true,
            createdAt: true,
            Journey: {
              select: { id: true }
            },
            KeeperType: {
              select: { name: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20 // Limit for performance
        },
        journeys: {
          select: {
            id: true,
            name: true,
            forward: true,
            createdAt: true,
            Keeper: {
              select: {
                id: true,
                title: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: 20
        },
        boards: {
          select: {
            id: true,
            name: true,
            slug: true,
            description: true
          },
          where: {
            isTemplate: false
          },
          orderBy: { updatedAt: 'desc' },
          take: 10
        }
      }
    });

    if (!domainData) {
      return res.status(404).json({ 
        success: false, 
        error: 'Domain not found' 
      });
    }

    // Transform members for Frame C
    const members = domainData?.DomainPermission?.map(dp => ({
      id: dp.id,
      role: dp.role,
      permissions: dp.permissions,
      grantedAt: dp.grantedAt,
      user: {
        id: dp.users_DomainPermission_userIdTousers.id,
        name: dp.users_DomainPermission_userIdTousers.name,
        email: dp.users_DomainPermission_userIdTousers.email,
        avatarUrl: dp.users_DomainPermission_userIdTousers.avatar_url
      }
    })) || [];

    // Transform keepers for Frame B
    const keepers = domainData?.keepers?.map(k => ({
      id: k.id,
      title: k.title,
      purpose: k.purpose,
      theme: {
        coverImage: null // Add when theme system is implemented
      },
      journeyCount: k.Journey.length,
      keeperType: k.KeeperType?.name,
      createdAt: k.createdAt
    })) || [];

    // Transform journeys for Frame B
    const journeys = domainData?.journeys?.map(j => ({
      id: j.id,
      name: j.name,
      forward: j.forward,
      keeper: j.Keeper,
      createdAt: j.createdAt
    })) || [];

    // Base response (always included for public + admin)
    const response: any = {
      // Frame A: Hero / Identity
      domain: {
        id: domainData.id,
        name: domainData.name,
        slug: domainData.slug,
        description: domainData.description,
        status: domainData.status,
        createdAt: domainData.createdAt,
        theme: (domainData.theme as any) || {
          coverImage: null,
          primaryColor: '#3b82f6'
        }
      },
      
      // Frame B: Activity / Assets
      keepers,
      journeys,
      boards: domainData?.boards || [],
      
      // Frame C: People / Membership
      members: isAdmin ? members : members.slice(0, 5), // Limit to 5 for public
      
      verification: {
        badge: domainData.customDomainVerified 
          ? `Verified domain of ${domainData.name}` 
          : null
      },
      
      // Viewer permissions (for frame visibility)
      viewerPermissions: {
        isOwner,
        isAdmin,
        canEdit: isAdmin,
        role: permission?.role || (isOwner ? 'owner' : 'viewer')
      },
      
      // Available actions
      actions: getAvailableActions(isAdmin)
    };

    // Frame D & E: Admin-only data
    if (isAdmin) {
      // Frame D: Domain Operations
      response.dns = {
        configured: !!domainData.customDomain,
        verified: domainData.customDomainVerified,
        nameservers: [
          'ns1.vercel-dns.com',
          'ns2.vercel-dns.com'
        ], // These would come from your DNS provider
        records: domainData.customDomain ? [
          {
            type: 'CNAME',
            name: domainData.customDomain,
            value: 'cname.vercel-dns.com',
            status: domainData.customDomainVerified ? 'verified' : 'pending'
          }
        ] : []
      };
      
      response.ssl = {
        issued: domainData.customDomainVerified,
        pending: !!domainData.customDomain && !domainData.customDomainVerified,
        expiresAt: null // Add when SSL cert system is implemented
      };
      
      response.customDomains = domainData.customDomain ? [{
        domain: domainData.customDomain,
        verified: domainData.customDomainVerified,
        status: domainData.customDomainVerified ? 'verified' : 'pending',
        verificationMethod: domainData.verificationMethod || 'CNAME'
      }] : [];
      
      // Frame E: Keys / Integrations
      // Check for user's API keys
      const userKeys = await prisma.kip_user_keys.findMany({
        where: { user_id: userId },
        select: {
          provider: true,
          created_at: true
        }
      });
      
      response.keys = {
        openai: {
          configured: userKeys.some(k => k.provider === 'openai'),
          status: getKeyStatus(userKeys, 'openai'),
          lastUsed: null // Add when usage tracking is implemented
        },
        anthropic: {
          configured: userKeys.some(k => k.provider === 'anthropic'),
          status: getKeyStatus(userKeys, 'anthropic'),
          lastUsed: null
        }
      };
      
      // Primary agent (if domain has one assigned)
      // For now, we'll look for agents associated with this domain's keepers
      const domainAgents = await prisma.kip_agents.findMany({
        where: {
          OR: [
            { name: { contains: domainData.name } },
            // Add domain-agent relation when schema supports it
          ]
        },
        select: {
          id: true,
          name: true,
          slug: true,
          agent_class: true
        },
        take: 1
      });
      
      if (domainAgents.length > 0) {
        response.primaryAgent = {
          id: domainAgents[0].id,
          name: domainAgents[0].name,
          slug: domainAgents[0].slug,
          agentClass: domainAgents[0].agent_class
        };
      }
    }

    return res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error fetching domain board data:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Helper: Get available engagement template actions
 */
function getAvailableActions(isAdmin: boolean): any[] {
  const publicActions = [
    { 
      id: 'domain.public.contact', 
      name: 'Contact Domain', 
      visibility: 'public',
      availableInFrame: 'hero-identity'
    }
  ];
  
  const adminActions = [
    { 
      id: 'domain.admin.update', 
      name: 'Update Domain Info', 
      visibility: 'admin',
      availableInFrame: 'domain-operations'
    },
    { 
      id: 'domain.admin.verify', 
      name: 'Verify Domain', 
      visibility: 'admin',
      availableInFrame: 'domain-operations'
    },
    { 
      id: 'domain.admin.addCustomDomain', 
      name: 'Add Custom Domain', 
      visibility: 'admin',
      availableInFrame: 'domain-operations'
    },
    { 
      id: 'domain.admin.editApiKey', 
      name: 'Edit API Key', 
      visibility: 'admin',
      availableInFrame: 'keys-integrations'
    },
    { 
      id: 'domain.admin.assignAgent', 
      name: 'Assign Primary Agent', 
      visibility: 'admin',
      availableInFrame: 'keys-integrations'
    }
  ];
  
  return isAdmin ? [...publicActions, ...adminActions] : publicActions;
}

/**
 * Helper: Determine API key status
 */
function getKeyStatus(userKeys: any[], provider: string): 'active' | 'fallback' | 'missing' {
  const key = userKeys.find(k => k.provider === provider);
  
  if (!key) {
    return 'missing';
  }
  
  // If key exists and was created, assume active
  // In future, could check last_used or other metrics
  return 'active';
}

export default router;

