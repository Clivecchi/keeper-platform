/**
 * Domain Permission Service
 * Handles role-based access control for domains with caching and inheritance
 */

import { PrismaClient } from '@prisma/client';
import type { DomainPermission } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService';
import { getFeatureFlagService } from './FeatureFlagService';
import type { 
  DomainRole, 
  DomainPermissionType, 
  DomainPermissionSummary, 
  UserPermissionSummary,
  GrantPermissionRequest,
  PermissionCheck,
  PermissionResult
} from '../types/domain';
import { convertNullToUndefined } from '../types/domain';

export class DomainPermissionService {
  private prisma: PrismaClient;
  private cacheService: DomainCacheService;
  private featureFlags = getFeatureFlagService();

  // Role hierarchy - roles inherit permissions from lower roles
  private readonly ROLE_HIERARCHY: Record<DomainRole, DomainPermissionType[]> = {
    connection: ['read'],
    friend: ['read', 'write'],
    user: ['read', 'write', 'share'],
    admin: ['read', 'write', 'share', 'admin', 'invite', 'delete'],
  };

  // Permission inheritance - some permissions automatically grant others
  private readonly PERMISSION_INHERITANCE: Record<DomainPermissionType, DomainPermissionType[]> = {
    admin: ['read', 'write', 'share', 'invite', 'delete'],
    share: ['read'],
    write: ['read'],
    invite: ['read'],
    delete: ['read', 'write'],
    read: [],
  };

  constructor(prisma: PrismaClient, cacheService: DomainCacheService) {
    this.prisma = prisma;
    this.cacheService = cacheService;
  }

  /**
   * Grant permission to a user for a domain
   */
  async grantPermission(request: GrantPermissionRequest): Promise<DomainPermission> {
    if (!this.featureFlags.isEnabled('DOMAIN_PERMISSIONS_ENABLED')) {
      throw new Error('Domain permissions are currently disabled');
    }

    // Validate the granter has admin permission
    const granterPermission = await this.checkPermission({
      userId: request.grantedBy,
      domainId: request.domainId,
      permission: 'admin',
    });

    if (!granterPermission.hasPermission) {
      throw new Error('Insufficient permissions to grant access');
    }

    // Validate role and permissions
    const permissions = request.permissions || this.ROLE_HIERARCHY[request.role];
    if (!this.validatePermissionsForRole(request.role, permissions)) {
      throw new Error(`Invalid permissions for role: ${request.role}`);
    }

    // Check if permission already exists
    const existingPermission = await this.prisma.domainPermission.findUnique({
      where: {
        domainId_userId: {
          domainId: request.domainId,
          userId: request.userId,
        },
      },
    });

    if (existingPermission) {
      // Update existing permission
      const updatedPermission = await this.prisma.domainPermission.update({
        where: {
          domainId_userId: {
            domainId: request.domainId,
            userId: request.userId,
          },
        },
        data: {
          role: request.role,
          permissions,
          expiresAt: request.expiresAt,
          grantedBy: request.grantedBy,
          grantedAt: new Date(),
        },
      });

      // Invalidate cache
      await this.cacheService.invalidateUserPermission(request.userId, request.domainId);

      return updatedPermission;
    }

    // Create new permission
    const newPermission = await this.prisma.domainPermission.create({
      data: {
        domainId: request.domainId,
        userId: request.userId,
        role: request.role,
        permissions,
        expiresAt: request.expiresAt,
        grantedBy: request.grantedBy,
        grantedAt: new Date(),
      },
    });

    // Invalidate cache
    await this.cacheService.invalidateUserPermission(request.userId, request.domainId);

    return newPermission;
  }

  /**
   * Revoke permission from a user for a domain
   */
  async revokePermission(domainId: string, userId: string, revokedBy: string): Promise<void> {
    // Validate the revoker has admin permission
    const revokerPermission = await this.checkPermission({
      userId: revokedBy,
      domainId,
      permission: 'admin',
    });

    if (!revokerPermission.hasPermission) {
      throw new Error('Insufficient permissions to revoke access');
    }

    // Don't allow revoking owner permissions
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      select: { ownerId: true },
    });

    if (domain?.ownerId === userId) {
      throw new Error('Cannot revoke permissions from domain owner');
    }

    await this.prisma.domainPermission.delete({
      where: {
        domainId_userId: {
          domainId,
          userId,
        },
      },
    });

    // Invalidate cache
    await this.cacheService.invalidateUserPermission(userId, domainId);
  }

  /**
   * Check if a user has a specific permission for a domain
   */
  async checkPermission(check: PermissionCheck): Promise<PermissionResult> {
    // Check cache first
    const cacheKey = `permission:${check.userId}:${check.domainId}:${check.permission}`;
    const cached = await this.cacheService.getPermission(cacheKey);
    
    if (cached && !this.isPermissionExpired(cached)) {
      return this.evaluatePermission(cached, check.permission);
    }

    // Check if user is domain owner
    const domain = await this.prisma.domain.findUnique({
      where: { id: check.domainId },
    });

    if (domain?.ownerId === check.userId) {
      return {
        hasPermission: true,
        role: 'admin',
        permissions: ['admin', 'read', 'write', 'share', 'invite', 'delete'],
        inherited: false,
        source: 'ownership',
      };
    }

    // Check explicit permissions
    const permission = await this.prisma.domainPermission.findUnique({
      where: {
        domainId_userId: {
          domainId: check.domainId,
          userId: check.userId,
        },
      },
    });

    if (!permission || this.isPermissionExpired(permission)) {
      return {
        hasPermission: false,
        role: undefined,
        permissions: [],
        inherited: false,
        source: 'none',
      };
    }

    // Cache the result
    await this.cacheService.cachePermission(cacheKey, permission);

    return this.evaluatePermission(permission, check.permission);
  }

  /**
   * Get all permissions for a user across all domains
   */
  async getUserPermissions(userId: string): Promise<UserPermissionSummary[]> {
    // Check cache first
    const cachedDomainIds = await this.cacheService.getUserDomains(userId);
    
    if (cachedDomainIds) {
      const permissions = await Promise.all(
        cachedDomainIds.map(async (domainId) => {
          const permission = await this.cacheService.getUserPermissions(userId, domainId);
          if (permission && !this.isPermissionExpired(permission)) {
            return {
              domainId,
              role: permission.role as DomainRole,
              permissions: permission.permissions as DomainPermissionType[],
              grantedAt: permission.grantedAt,
              expiresAt: permission.expiresAt === null ? undefined : permission.expiresAt,
              isOwner: false,
              source: 'direct',
            } as UserPermissionSummary;
          }
          return null;
        })
      );
      
      const validPermissions = permissions.filter(Boolean) as UserPermissionSummary[];
      
      // Add owned domains
      const ownedDomains = await this.prisma.domain.findMany({
        where: { ownerId: userId, isActive: true },
        select: { id: true, createdAt: true },
      });

      ownedDomains.forEach(domain => {
        if (!validPermissions.some(p => p.domainId === domain.id)) {
          validPermissions.push({
            domainId: domain.id,
            role: 'admin',
            permissions: this.ROLE_HIERARCHY.admin,
            grantedAt: domain.createdAt,
            expiresAt: undefined,
            isOwner: true,
            source: 'ownership',
          });
        }
      });

      return validPermissions;
    }

    // Fetch from database
    const [permissions, ownedDomains] = await Promise.all([
      this.prisma.domainPermission.findMany({
        where: {
          userId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      }),
      this.prisma.domain.findMany({
        where: { ownerId: userId, isActive: true },
        select: { id: true, createdAt: true },
      }),
    ]);

    const result: UserPermissionSummary[] = [
      ...permissions.map(p => ({
        domainId: p.domainId,
        role: p.role as DomainRole,
        permissions: p.permissions as DomainPermissionType[],
        grantedAt: p.grantedAt,
        expiresAt: p.expiresAt === null ? undefined : p.expiresAt,
        isOwner: false,
        source: 'direct',
      })),
      ...ownedDomains.map(d => ({
        domainId: d.id,
        role: 'admin' as DomainRole,
        permissions: this.ROLE_HIERARCHY.admin,
        grantedAt: d.createdAt,
        expiresAt: undefined,
        isOwner: true,
        source: 'ownership',
      })),
    ];

    return result;
  }

  /**
   * Get all users with permissions for a domain
   */
  async getDomainUsers(domainId: string): Promise<Array<{
    userId: string;
    role: DomainRole;
    permissions: DomainPermissionType[];
    grantedAt: Date;
    expiresAt?: Date;
    isOwner: boolean;
  }>> {
    // Check cache first
    const cachedUserIds = await this.cacheService.getDomainUsers(domainId);
    
    if (cachedUserIds) {
      const users = await Promise.all(
        cachedUserIds.map(async (userId) => {
          const permission = await this.cacheService.getUserPermissions(userId, domainId);
          if (permission && !this.isPermissionExpired(permission)) {
            return {
              userId,
              role: permission.role as DomainRole,
              permissions: permission.permissions as DomainPermissionType[],
              grantedAt: permission.grantedAt,
              expiresAt: permission.expiresAt === null ? undefined : permission.expiresAt,
              isOwner: false,
            };
          }
          return null;
        })
      );
      
      const validUsers = users.filter(Boolean) as any[];
      
      // Add domain owner
      const domain = await this.prisma.domain.findUnique({
        where: { id: domainId },
        select: { ownerId: true, createdAt: true },
      });

      if (domain && !validUsers.some(u => u.userId === domain.ownerId)) {
        validUsers.unshift({
          userId: domain.ownerId,
          role: 'admin',
          permissions: this.ROLE_HIERARCHY.admin,
          grantedAt: domain.createdAt,
          expiresAt: undefined,
          isOwner: true,
        });
      }

      return validUsers;
    }

    // Fetch from database
    const [permissions, domain] = await Promise.all([
      this.prisma.domainPermission.findMany({
        where: {
          domainId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      }),
      this.prisma.domain.findUnique({
        where: { id: domainId },
        select: { ownerId: true, createdAt: true },
      }),
    ]);

    const result = permissions.map(p => ({
      userId: p.userId,
      role: p.role as DomainRole,
      permissions: p.permissions as DomainPermissionType[],
      grantedAt: p.grantedAt,
      expiresAt: p.expiresAt === null ? undefined : p.expiresAt,
      isOwner: false,
    }));

    // Add domain owner if not already in permissions
    if (domain && !result.some(u => u.userId === domain.ownerId)) {
      result.unshift({
        userId: domain.ownerId,
        role: 'admin',
        permissions: this.ROLE_HIERARCHY.admin,
        grantedAt: domain.createdAt,
        expiresAt: undefined,
        isOwner: true,
      });
    }

    // Cache the result
    const userIds = result.map(u => u.userId);
    await this.cacheService.cacheDomainUsers(domainId, userIds);

    return result;
  }

  /**
   * Bulk permission check for multiple permissions
   */
  async checkPermissions(checks: PermissionCheck[]): Promise<Map<string, PermissionResult>> {
    const results = new Map<string, PermissionResult>();
    
    // Group checks by user-domain pairs to avoid duplicate queries
    const uniqueChecks = new Map<string, PermissionCheck[]>();
    
    checks.forEach(check => {
      const key = `${check.userId}:${check.domainId}`;
      if (!uniqueChecks.has(key)) {
        uniqueChecks.set(key, []);
      }
      uniqueChecks.get(key)!.push(check);
    });

    // Process each unique user-domain pair
    for (const [key, userChecks] of uniqueChecks) {
      const firstCheck = userChecks[0];
      const basePermission = await this.checkPermission({
        userId: firstCheck.userId,
        domainId: firstCheck.domainId,
        permission: 'read', // Base check
      });

      // Evaluate each permission for this user-domain pair
      userChecks.forEach(check => {
        const checkKey = `${check.userId}:${check.domainId}:${check.permission}`;
        if (basePermission.source === 'none') {
          results.set(checkKey, basePermission);
        } else {
          const hasSpecificPermission = this.hasPermissionInList(
            check.permission,
            basePermission.permissions
          );
          results.set(checkKey, {
            ...basePermission,
            hasPermission: hasSpecificPermission,
          });
        }
      });
    }

    return results;
  }

  /**
   * Update permission expiration
   */
  async updatePermissionExpiration(
    domainId: string,
    userId: string,
    expiresAt: Date | null,
    updatedBy: string
  ): Promise<void> {
    // Validate the updater has admin permission
    const updaterPermission = await this.checkPermission({
      userId: updatedBy,
      domainId,
      permission: 'admin',
    });

    if (!updaterPermission.hasPermission) {
      throw new Error('Insufficient permissions to update expiration');
    }

    await this.prisma.domainPermission.update({
      where: {
        domainId_userId: {
          domainId,
          userId,
        },
      },
      data: {
        expiresAt,
      },
    });

    // Invalidate cache
    await this.cacheService.invalidateUserPermission(userId, domainId);
  }

  /**
   * Private helper methods
   */
  private evaluatePermission(permission: { 
    role: string; 
    permissions: string[]; 
    expiresAt: Date | null | undefined;
  }, requestedPermission: DomainPermissionType): PermissionResult {
    if (this.isPermissionExpired(permission)) {
      return {
        hasPermission: false,
        role: permission.role as DomainRole,
        permissions: [],
        inherited: false,
        source: 'none',
      };
    }

    const hasPermission = this.hasPermissionInList(requestedPermission, permission.permissions as DomainPermissionType[]);
    
    return {
      hasPermission,
      role: permission.role as DomainRole,
      permissions: permission.permissions as DomainPermissionType[],
      inherited: false,
      expiresAt: permission.expiresAt || undefined,
      source: 'direct',
    };
  }

  private hasPermissionInList(permission: DomainPermissionType, permissions: DomainPermissionType[]): boolean {
    // Direct permission check
    if (permissions.includes(permission)) {
      return true;
    }

    // Check for inherited permissions
    const inheritedPermissions = this.PERMISSION_INHERITANCE[permission] || [];
    return inheritedPermissions.some(inherited => permissions.includes(inherited));
  }

  private validatePermissionsForRole(role: DomainRole, permissions: DomainPermissionType[]): boolean {
    const allowedPermissions = this.ROLE_HIERARCHY[role];
    return permissions.every(permission => allowedPermissions.includes(permission));
  }

  /**
   * Check if permission is expired
   */
  private isPermissionExpired(permission: { expiresAt?: Date | null }): boolean {
    if (!permission.expiresAt) {
      return false; // No expiration = never expired
    }
    return permission.expiresAt < new Date();
  }

  /**
   * Convert permission to summary format
   */
  private permissionToSummary(
    permission: { 
      domainId: string; 
      userId: string;
      role: string; 
      permissions: string[]; 
      grantedAt: Date; 
      expiresAt?: Date | null; 
    }, 
    isExpired: boolean
  ): DomainPermissionSummary {
    return {
      userId: permission.userId,
      role: permission.role as DomainRole,
      permissions: permission.permissions as DomainPermissionType[],
      grantedAt: permission.grantedAt,
      expiresAt: permission.expiresAt === null ? undefined : permission.expiresAt,
      isOwner: false,
    };
  }

  /**
   * Clean up expired permissions
   */
  async cleanupExpiredPermissions(): Promise<number> {
    const result = await this.prisma.domainPermission.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    // Invalidate affected caches
    // Note: This is a simplified approach. In production, you'd want to
    // track which specific permissions were deleted and invalidate only those caches
    await this.cacheService.clearAllCache();

    return result.count;
  }

  /**
   * Get permission statistics for a domain
   */
  async getPermissionStats(domainId: string): Promise<{
    totalUsers: number;
    adminUsers: number;
    regularUsers: number;
    friendUsers: number;
    connectionUsers: number;
    expiredPermissions: number;
  }> {
    const permissions = await this.prisma.domainPermission.findMany({
      where: { domainId },
    });

    const now = new Date();
    const activePermissions = permissions.filter(p => !p.expiresAt || p.expiresAt > now);
    const expiredPermissions = permissions.filter(p => p.expiresAt && p.expiresAt <= now);

    const roleCounts = activePermissions.reduce((acc, p) => {
      acc[p.role] = (acc[p.role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalUsers: activePermissions.length + 1, // +1 for owner
      adminUsers: (roleCounts.admin || 0) + 1, // +1 for owner
      regularUsers: roleCounts.user || 0,
      friendUsers: roleCounts.friend || 0,
      connectionUsers: roleCounts.connection || 0,
      expiredPermissions: expiredPermissions.length,
    };
  }

  /**
   * Get domain permissions for user  
   */
  async getDomainPermissions(domainId: string, userId: string): Promise<DomainPermissionSummary[]> {
    // Get domain and permissions
    const [domain, permissions] = await Promise.all([
      this.prisma.domain.findUnique({
        where: { id: domainId },
        select: { ownerId: true }
      }),
      this.prisma.domainPermission.findMany({
        where: { domainId, userId },
        orderBy: { grantedAt: 'desc' }
      })
    ]);

    if (!domain) {
      throw new Error('Domain not found');
    }

    const result: DomainPermissionSummary[] = permissions.map(p => ({
      userId: p.userId,
      role: p.role as DomainRole,
      permissions: p.permissions as DomainPermissionType[],
      grantedAt: p.grantedAt,
      expiresAt: p.expiresAt || undefined, // Convert null to undefined
      isOwner: false
    }));

    // Add owner permission
    if (domain.ownerId === userId) {
      result.unshift({
        userId: domain.ownerId,
        role: 'admin' as DomainRole,
        permissions: ['read', 'write', 'admin', 'share', 'delete'] as DomainPermissionType[],
        grantedAt: new Date(), // Use current date for owner
        expiresAt: undefined, // Owner permissions never expire
        isOwner: true,
      });
    }

    return result;
  }
}

export default DomainPermissionService; 