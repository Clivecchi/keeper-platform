/**
 * Domain-Aware Authentication Extensions
 * Extends KAM with domain context and permissions
 */

import { users } from '@prisma/client';
import { 
  DomainPermissionService, 
  DomainService, 
  DomainCacheService,
  type DomainPermissionType,
  type PermissionCheck,
  type UserPermissionSummary
} from '@keeper/database';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

export interface DomainAuthUser extends users {
  domainPermissions?: Map<string, {
    role: string;
    permissions: string[];
    isOwner: boolean;
  }>;
  defaultDomainId?: string;
  activeDomainId?: string;
}

export interface DomainAuthSession {
  user: DomainAuthUser;
  domainContext?: {
    domainId: string;
    role: string;
    permissions: string[];
    isOwner: boolean;
  };
  sessionId: string;
  expiresAt: Date;
}

export interface DomainAuthOptions {
  requiredPermission?: string;
  allowDomainSwitching?: boolean;
  inheritParentDomainPermissions?: boolean;
  enforceExplicitDomainAccess?: boolean;
}

export class DomainAuthManager {
  private prisma: PrismaClient;
  private domainService: DomainService;
  private permissionService: DomainPermissionService;
  private cacheService: DomainCacheService;

  constructor(prisma: PrismaClient, redis?: Redis) {
    this.prisma = prisma;
    
    const redisInstance = redis || new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.cacheService = new DomainCacheService(redisInstance);
    
    this.domainService = new DomainService(prisma, this.cacheService);
    this.permissionService = new DomainPermissionService(prisma, this.cacheService);
  }

  /**
   * Enhance user session with domain permissions
   */
  async enhanceUserWithDomainPermissions(user: users): Promise<DomainAuthUser> {
    const domainAuthUser: DomainAuthUser = {
      ...user,
      domainPermissions: new Map(),
    };

    try {
      // Get all user domains and permissions
      const userPermissions = await this.permissionService.getUserPermissions(user.id);
      
      // Get user's owned domains
      const ownedDomains = await this.prisma.domain.findMany({
        where: { ownerId: user.id, isActive: true },
        select: { id: true, name: true, slug: true },
      });

      // Build permission map
      const permissionMap = new Map<string, {
        role: string;
        permissions: string[];
        isOwner: boolean;
      }>();

      // Add owned domains (full admin permissions)
      ownedDomains.forEach(domain => {
        permissionMap.set(domain.id, {
          role: 'admin',
          permissions: ['read', 'write', 'share', 'admin', 'invite', 'delete'],
          isOwner: true,
        });
      });

      // Add granted permissions
      userPermissions.forEach((permission: UserPermissionSummary) => {
        if (!permissionMap.has(permission.domainId)) {
          permissionMap.set(permission.domainId, {
            role: permission.role,
            permissions: permission.permissions,
            isOwner: permission.isOwner,
          });
        }
      });

      domainAuthUser.domainPermissions = permissionMap;

      // Set default domain (first owned domain or first accessible domain)
      if (ownedDomains.length > 0) {
        domainAuthUser.defaultDomainId = ownedDomains[0].id;
      } else if (userPermissions.length > 0) {
        domainAuthUser.defaultDomainId = userPermissions[0].domainId;
      }

      // Set active domain as default initially
      domainAuthUser.activeDomainId = domainAuthUser.defaultDomainId;

    } catch (error) {
      console.error('Error enhancing user with domain permissions:', error);
    }

    return domainAuthUser;
  }

  /**
   * Create domain-aware session
   */
  async createDomainSession(
    user: users,
    domainId?: string,
    options: DomainAuthOptions = {}
  ): Promise<DomainAuthSession> {
    const domainAuthUser = await this.enhanceUserWithDomainPermissions(user);

    // Determine active domain
    let activeDomainId = domainId || domainAuthUser.defaultDomainId;
    let domainContext = undefined;

    if (activeDomainId) {
      // Verify user has access to the domain
      const domainPermissions = domainAuthUser.domainPermissions?.get(activeDomainId);
      
      if (!domainPermissions) {
        if (options.enforceExplicitDomainAccess) {
          throw new Error('Access denied to domain');
        }
        // Fall back to default domain
        activeDomainId = domainAuthUser.defaultDomainId;
      }

      if (activeDomainId && domainAuthUser.domainPermissions?.has(activeDomainId)) {
        const permissions = domainAuthUser.domainPermissions.get(activeDomainId)!;
        domainContext = {
          domainId: activeDomainId,
          role: permissions.role,
          permissions: permissions.permissions,
          isOwner: permissions.isOwner,
        };
      }
    }

    // Update user's active domain
    domainAuthUser.activeDomainId = activeDomainId;

    const session: DomainAuthSession = {
      user: domainAuthUser,
      domainContext,
      sessionId: this.generateSessionId(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    return session;
  }

  /**
   * Switch domain context for existing session
   */
  async switchDomainContext(
    session: DomainAuthSession,
    newDomainId: string
  ): Promise<DomainAuthSession> {
    const user = session.user;
    const domainPermissions = user.domainPermissions?.get(newDomainId);

    if (!domainPermissions) {
      throw new Error('Access denied to domain');
    }

    // Update session with new domain context
    session.domainContext = {
      domainId: newDomainId,
      role: domainPermissions.role,
      permissions: domainPermissions.permissions,
      isOwner: domainPermissions.isOwner,
    };

    session.user.activeDomainId = newDomainId;

    return session;
  }

  /**
   * Validate domain permission for session
   */
  async validateDomainPermission(
    session: DomainAuthSession,
    domainId: string,
    requiredPermission: string
  ): Promise<boolean> {
    const user = session.user;
    const domainPermissions = user.domainPermissions?.get(domainId);

    if (!domainPermissions) {
      return false;
    }

    // Check if user has required permission
    return domainPermissions.permissions.includes(requiredPermission) ||
           domainPermissions.permissions.includes('admin');
  }

  /**
   * Get accessible domains for user
   */
  async getAccessibleDomains(userId: string): Promise<Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    permissions: string[];
    isOwner: boolean;
  }>> {
    const domains = await this.domainService.getUserDomains(userId);
    const userPermissions = await this.permissionService.getUserPermissions(userId);

    const accessibleDomains = await Promise.all(
      domains.map(async (domain: any) => {
        const permissions = await this.permissionService.getDomainPermissions(domain.id, userId);
        const permission = permissions[0];
        return {
          id: domain.id,
          name: domain.name,
          slug: domain.slug,
          role: permission?.role || 'none',
          permissions: permission?.permissions || [],
          isOwner: permission?.isOwner || false,
        };
      })
    );

    return accessibleDomains;
  }

  /**
   * Refresh domain permissions for user
   */
  async refreshDomainPermissions(userId: string): Promise<void> {
    // Invalidate cached permissions
    await this.cacheService.invalidateUser(userId);
    
    // Clear domain-related caches
    const userDomains = await this.domainService.getUserDomains(userId);
    await Promise.all(
      userDomains.map((domain: any) => this.cacheService.invalidateDomain(domain.id))
    );
  }

  /**
   * Check if user can access multiple domains
   */
  async canAccessDomains(
    userId: string,
    domainIds: string[],
    permission: string = 'read'
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    const checks: PermissionCheck[] = domainIds.map(domainId => ({
      userId,
      domainId,
      permission: permission as DomainPermissionType,
    }));

    const permissionResults = await this.permissionService.checkPermissions(checks);
    
    checks.forEach(check => {
      const key = `${check.userId}:${check.domainId}:${check.permission}`;
      const result = permissionResults.get(key);
      results.set(check.domainId, result?.hasPermission || false);
    });

    return results;
  }

  /**
   * Create domain invitation token
   */
  async createDomainInvitation(
    domainId: string,
    invitedBy: string,
    inviteeEmail: string,
    role: string,
    permissions: string[],
    expiresAt?: Date
  ): Promise<string> {
    const invitation = await this.prisma.domainInvitation.create({
      data: {
        domainId,
        invitedBy,
        email: inviteeEmail,
        role,
        expiresAt: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        token: this.generateInvitationToken(),
      },
    });

    return invitation.token;
  }

  /**
   * Accept domain invitation
   */
  async acceptDomainInvitation(
    token: string,
    userId: string
  ): Promise<void> {
    const invitation = await this.prisma.domainInvitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw new Error('Invitation has expired');
    }

    if (invitation.acceptedAt) {
      throw new Error('Invitation already accepted');
    }

    // Create domain permission
    await this.permissionService.grantPermission({
      domainId: invitation.domainId,
      userId,
      role: invitation.role as any,
      permissions: ['read', 'write'] as DomainPermissionType[],
      grantedBy: invitation.invitedBy,
    });

    // Mark invitation as accepted
    await this.prisma.domainInvitation.update({
      where: { id: invitation.id },
      data: {
        acceptedAt: new Date(),
      },
    });

    // Refresh user's domain permissions
    await this.refreshDomainPermissions(userId);
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate invitation token
   */
  private generateInvitationToken(): string {
    return `inv_${Date.now()}_${Math.random().toString(36).substr(2, 16)}`;
  }

  /**
   * Validate session and domain context
   */
  async validateSession(
    sessionId: string,
    domainId?: string
  ): Promise<DomainAuthSession | null> {
    // In a real implementation, this would check session storage
    // For now, return null as sessions would be stored separately
    return null;
  }

  /**
   * Logout and cleanup domain session
   */
  async logout(sessionId: string): Promise<void> {
    // In a real implementation, this would cleanup session storage
    // For now, this is a placeholder
    console.log(`Logging out session: ${sessionId}`);
  }
}

/**
 * Domain-aware authentication middleware factory
 */
export function createDomainAuthMiddleware(
  domainAuthManager: DomainAuthManager,
  options: DomainAuthOptions = {}
) {
  return async (req: any, res: any, next: any) => {
    try {
      // Get user from regular auth middleware
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Get domain context from request
      const domainId = req.params.domainId || 
                      req.query.domainId || 
                      req.body.domainId ||
                      req.headers['x-domain-id'];

      // Create domain session
      const session = await domainAuthManager.createDomainSession(
        user,
        domainId,
        options
      );

      // Check required permission if specified
      if (options.requiredPermission && session.domainContext) {
        const hasPermission = await domainAuthManager.validateDomainPermission(
          session,
          session.domainContext.domainId,
          options.requiredPermission
        );

        if (!hasPermission) {
          return res.status(403).json({ 
            error: 'Insufficient domain permissions',
            required: options.requiredPermission,
            current: session.domainContext.permissions,
          });
        }
      }

      // Add domain session to request
      req.domainSession = session;
      req.domainAuth = domainAuthManager;

      next();
    } catch (error) {
      console.error('Domain auth middleware error:', error);
      res.status(500).json({ error: 'Domain authentication failed' });
    }
  };
}

export default DomainAuthManager; 