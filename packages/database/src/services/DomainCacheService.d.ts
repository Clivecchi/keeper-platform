/**
 * Domain Cache Service
 * Redis-based caching for domain resolution and permissions
 */
import { Redis } from 'ioredis';
export interface Domain {
    id: string;
    slug: string;
    customDomain?: string | null;
    customDomainVerified: boolean;
    ownerId: string;
    status: string;
    isActive: boolean;
    settings?: any;
    features?: any;
    createdAt: Date;
    updatedAt: Date;
}
export interface DomainPermission {
    id: string;
    domainId: string;
    userId: string;
    role: string;
    permissions: string[];
    expiresAt?: Date | null;
    grantedBy: string;
    grantedAt: Date;
}
export interface CacheConfig {
    ttl: {
        domain: number;
        permission: number;
        negative: number;
    };
    keyPrefix: string;
}
export declare class DomainCacheService {
    private redis;
    private config;
    private static readonly KEYS;
    constructor(redis: Redis | null, config?: Partial<CacheConfig>);
    /**
     * Check if Redis is available
     */
    private isRedisAvailable;
    /**
     * Safe Redis operation wrapper
     */
    private safeRedisOperation;
    /**
     * Get domain by slug with caching
     */
    getDomainBySlug(slug: string): Promise<Domain | null>;
    /**
     * Get domain by custom hostname with caching
     */
    getDomainByHostname(hostname: string): Promise<Domain | null>;
    /**
     * Get domain by ID with caching
     */
    getDomainById(id: string): Promise<Domain | null>;
    /**
     * Cache domain data with multiple keys
     */
    cacheDomain(domain: Domain): Promise<void>;
    /**
     * Cache negative result (domain not found)
     */
    cacheNegativeResult(key: string, identifier: string): Promise<void>;
    /**
     * Get user permissions for a domain
     */
    getUserPermissions(userId: string, domainId: string): Promise<DomainPermission | null>;
    /**
     * Cache user permissions
     */
    cacheUserPermissions(permission: unknown): Promise<void>;
    /**
     * Get all users for a domain (cached)
     */
    getDomainUsers(domainId: string): Promise<string[] | null>;
    /**
     * Cache domain users list
     */
    cacheDomainUsers(domainId: string, userIds: string[]): Promise<void>;
    /**
     * Get user's domains (cached)
     */
    getUserDomains(userId: string): Promise<string[] | null>;
    /**
     * Cache user's domains list
     */
    cacheUserDomains(userId: string, domainIds: string[]): Promise<void>;
    /**
     * Invalidate all cache entries for a domain
     */
    invalidateDomain(domainId: string): Promise<void>;
    /**
     * Invalidate user-specific cache entries
     */
    invalidateUser(userId: string): Promise<void>;
    /**
     * Invalidate cache for a specific user-domain permission
     */
    invalidateUserPermission(userId: string, domainId: string): Promise<void>;
    /**
     * Warm up cache with frequently accessed data
     */
    warmUpCache(domains: Domain[]): Promise<void>;
    /**
     * Clear all domain-related cache
     */
    clearAllCache(): Promise<void>;
    /**
     * Get cache statistics
     */
    getCacheStats(): Promise<{
        domains: number;
        permissions: number;
        totalKeys: number;
        memoryUsage: string;
    }>;
    /**
     * Batch operations for better performance
     */
    batchGet(keys: string[]): Promise<(string | null)[]>;
    batchSet(entries: Array<{
        key: string;
        value: string;
        ttl?: number;
    }>): Promise<void>;
    /**
     * Private helper to generate cache keys
     */
    private getCacheKey;
    /**
     * Health check for Redis connection
     */
    healthCheck(): Promise<boolean>;
    /**
     * Generic cache data method
     */
    cacheData(key: string, data: unknown, ttl?: number): Promise<void>;
    /**
     * Generic get data method
     */
    getData(key: string): Promise<any | null>;
    /**
     * Generic delete data method
     */
    deleteData(key: string): Promise<void>;
    /**
     * Cache verification configuration
     */
    cacheVerificationConfig(domainId: string, config: Record<string, unknown>): Promise<void>;
    /**
     * Cache permission data
     */
    cachePermission(key: string, permission: unknown): Promise<void>;
    /**
     * Get cached permission
     */
    getPermission(key: string): Promise<any | null>;
}
export default DomainCacheService;
//# sourceMappingURL=DomainCacheService.d.ts.map