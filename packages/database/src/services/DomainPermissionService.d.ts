/**
 * Domain Permission Service
 * Handles role-based access control for domains with caching and inheritance
 */
import { PrismaClient } from '@prisma/client';
import type { DomainPermission } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService';
import type { DomainRole, DomainPermissionType, DomainPermissionSummary, UserPermissionSummary, GrantPermissionRequest, PermissionCheck, PermissionResult } from '../types/domain';
export declare class DomainPermissionService {
    private prisma;
    private cacheService;
    private featureFlags;
    private readonly ROLE_HIERARCHY;
    private readonly PERMISSION_INHERITANCE;
    constructor(prisma: PrismaClient, cacheService: DomainCacheService);
    /**
     * Grant permission to a user for a domain
     */
    grantPermission(request: GrantPermissionRequest): Promise<DomainPermission>;
    /**
     * Revoke permission from a user for a domain
     */
    revokePermission(domainId: string, userId: string, revokedBy: string): Promise<void>;
    /**
     * Check if a user has a specific permission for a domain
     */
    checkPermission(check: PermissionCheck): Promise<PermissionResult>;
    /**
     * Get all permissions for a user across all domains
     */
    getUserPermissions(userId: string): Promise<UserPermissionSummary[]>;
    /**
     * Get all users with permissions for a domain
     */
    getDomainUsers(domainId: string): Promise<Array<{
        userId: string;
        role: DomainRole;
        permissions: DomainPermissionType[];
        grantedAt: Date;
        expiresAt?: Date;
        isOwner: boolean;
    }>>;
    /**
     * Bulk permission check for multiple permissions
     */
    checkPermissions(checks: PermissionCheck[]): Promise<Map<string, PermissionResult>>;
    /**
     * Update permission expiration
     */
    updatePermissionExpiration(domainId: string, userId: string, expiresAt: Date | null, updatedBy: string): Promise<void>;
    /**
     * Update an existing permission (role, permissions, expiry)
     */
    updatePermission(domainId: string, userId: string, params: {
        role?: DomainRole;
        permissions?: DomainPermissionType[];
        expiresAt?: Date | null;
        updatedBy: string;
    }): Promise<DomainPermission>;
    /**
     * Private helper methods
     */
    private evaluatePermission;
    private hasPermissionInList;
    private validatePermissionsForRole;
    /**
     * Check if permission is expired
     */
    private isPermissionExpired;
    /**
     * Convert permission to summary format
     */
    private permissionToSummary;
    /**
     * Clean up expired permissions
     */
    cleanupExpiredPermissions(): Promise<number>;
    /**
     * Get permission statistics for a domain
     */
    getPermissionStats(domainId: string): Promise<{
        totalUsers: number;
        adminUsers: number;
        regularUsers: number;
        friendUsers: number;
        connectionUsers: number;
        expiredPermissions: number;
    }>;
    /**
     * Get domain permissions for user
     */
    getDomainPermissions(domainId: string, userId: string): Promise<DomainPermissionSummary[]>;
}
export default DomainPermissionService;
//# sourceMappingURL=DomainPermissionService.d.ts.map