/**
 * Domain Cache Service
 * Redis-based caching for domain resolution and permissions
 */
export class DomainCacheService {
    constructor(redis, config) {
        this.redis = redis;
        this.config = {
            ttl: {
                domain: 300, // 5 minutes
                permission: 180, // 3 minutes
                negative: 60, // 1 minute
            },
            keyPrefix: 'keeper:',
            ...config,
        };
    }
    /**
     * Check if Redis is available
     */
    isRedisAvailable() {
        return this.redis !== null;
    }
    /**
     * Safe Redis operation wrapper
     */
    async safeRedisOperation(operation) {
        if (!this.isRedisAvailable()) {
            return null;
        }
        try {
            return await operation();
        }
        catch (error) {
            console.error('Redis operation failed:', error);
            return null;
        }
    }
    /**
     * Get domain by slug with caching
     */
    async getDomainBySlug(slug) {
        if (!this.redis)
            return null;
        const cacheKey = this.getCacheKey(DomainCacheService.KEYS.DOMAIN_BY_SLUG, slug);
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                // Check if it's a negative cache entry
                if (cached === 'NULL') {
                    return null;
                }
                return JSON.parse(cached);
            }
            return null; // Cache miss
        }
        catch (error) {
            console.error('Cache error in getDomainBySlug:', error);
            return null;
        }
    }
    /**
     * Get domain by custom hostname with caching
     */
    async getDomainByHostname(hostname) {
        if (!this.redis)
            return null;
        const cacheKey = this.getCacheKey(DomainCacheService.KEYS.DOMAIN_BY_HOSTNAME, hostname);
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                if (cached === 'NULL') {
                    return null;
                }
                return JSON.parse(cached);
            }
            return null; // Cache miss
        }
        catch (error) {
            console.error('Cache error in getDomainByHostname:', error);
            return null;
        }
    }
    /**
     * Get domain by ID with caching
     */
    async getDomainById(id) {
        if (!this.redis)
            return null;
        const cacheKey = this.getCacheKey(DomainCacheService.KEYS.DOMAIN_BY_ID, id);
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                if (cached === 'NULL') {
                    return null;
                }
                return JSON.parse(cached);
            }
            return null; // Cache miss
        }
        catch (error) {
            console.error('Cache error in getDomainById:', error);
            return null;
        }
    }
    /**
     * Cache domain data with multiple keys
     */
    async cacheDomain(domain) {
        if (!this.redis)
            return;
        const domainJson = JSON.stringify(domain);
        const ttl = this.config.ttl.domain;
        try {
            const pipeline = this.redis.pipeline();
            // Cache by ID
            pipeline.setex(this.getCacheKey(DomainCacheService.KEYS.DOMAIN_BY_ID, domain.id), ttl, domainJson);
            // Cache by slug
            pipeline.setex(this.getCacheKey(DomainCacheService.KEYS.DOMAIN_BY_SLUG, domain.slug), ttl, domainJson);
            // Cache by custom domain if verified
            if (domain.customDomain && domain.customDomainVerified) {
                pipeline.setex(this.getCacheKey(DomainCacheService.KEYS.DOMAIN_BY_HOSTNAME, domain.customDomain), ttl, domainJson);
            }
            await pipeline.exec();
        }
        catch (error) {
            console.error('Cache error in cacheDomain:', error);
        }
    }
    /**
     * Cache negative result (domain not found)
     */
    async cacheNegativeResult(key, identifier) {
        if (!this.redis)
            return;
        try {
            const cacheKey = this.getCacheKey(key, identifier);
            await this.redis.setex(cacheKey, this.config.ttl.negative, 'NULL');
        }
        catch (error) {
            console.error('Cache error in cacheNegativeResult:', error);
        }
    }
    /**
     * Get user permissions for a domain
     */
    async getUserPermissions(userId, domainId) {
        if (!this.redis)
            return null;
        const cacheKey = this.getCacheKey(DomainCacheService.KEYS.USER_PERMISSIONS, `${userId}:${domainId}`);
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                if (cached === 'NULL') {
                    return null;
                }
                return JSON.parse(cached);
            }
            return null; // Cache miss
        }
        catch (error) {
            console.error('Cache error in getUserPermissions:', error);
            return null;
        }
    }
    /**
     * Cache user permissions
     */
    async cacheUserPermissions(permission) {
        if (!this.redis)
            return;
        try {
            if (permission && typeof permission === 'object' && 'userId' in permission && 'domainId' in permission) {
                const perm = permission;
                const cacheKey = this.getCacheKey('user_permissions:', `${perm.userId}:${perm.domainId}`);
                const value = JSON.stringify(permission);
                await this.redis.setex(cacheKey, this.config.ttl.permission, value);
            }
        }
        catch (error) {
            console.error('User permissions cache error:', error);
        }
    }
    /**
     * Get all users for a domain (cached)
     */
    async getDomainUsers(domainId) {
        if (!this.redis)
            return null;
        const cacheKey = this.getCacheKey(DomainCacheService.KEYS.DOMAIN_USERS, domainId);
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
            return null; // Cache miss
        }
        catch (error) {
            console.error('Cache error in getDomainUsers:', error);
            return null;
        }
    }
    /**
     * Cache domain users list
     */
    async cacheDomainUsers(domainId, userIds) {
        if (!this.redis)
            return;
        try {
            const cacheKey = this.getCacheKey(DomainCacheService.KEYS.DOMAIN_USERS, domainId);
            await this.redis.setex(cacheKey, this.config.ttl.permission, JSON.stringify(userIds));
        }
        catch (error) {
            console.error('Cache error in cacheDomainUsers:', error);
        }
    }
    /**
     * Get user's domains (cached)
     */
    async getUserDomains(userId) {
        if (!this.redis)
            return null;
        const cacheKey = this.getCacheKey(DomainCacheService.KEYS.USER_DOMAINS, userId);
        try {
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                return JSON.parse(cached);
            }
            return null; // Cache miss
        }
        catch (error) {
            console.error('Cache error in getUserDomains:', error);
            return null;
        }
    }
    /**
     * Cache user's domains list
     */
    async cacheUserDomains(userId, domainIds) {
        if (!this.redis)
            return;
        try {
            const cacheKey = this.getCacheKey(DomainCacheService.KEYS.USER_DOMAINS, userId);
            await this.redis.setex(cacheKey, this.config.ttl.permission, JSON.stringify(domainIds));
        }
        catch (error) {
            console.error('Cache error in cacheUserDomains:', error);
        }
    }
    /**
     * Invalidate all cache entries for a domain
     */
    async invalidateDomain(domainId) {
        if (!this.redis)
            return;
        try {
            // Get domain data first to know what keys to invalidate
            const domain = await this.getDomainById(domainId);
            const keysToDelete = [
                this.getCacheKey(DomainCacheService.KEYS.DOMAIN_BY_ID, domainId),
                this.getCacheKey(DomainCacheService.KEYS.DOMAIN_USERS, domainId),
                this.getCacheKey(DomainCacheService.KEYS.DOMAIN_PERMISSIONS, domainId),
            ];
            if (domain) {
                keysToDelete.push(this.getCacheKey(DomainCacheService.KEYS.DOMAIN_BY_SLUG, domain.slug));
                if (domain.customDomain) {
                    keysToDelete.push(this.getCacheKey(DomainCacheService.KEYS.DOMAIN_BY_HOSTNAME, domain.customDomain));
                }
            }
            // Delete permission cache patterns
            const permissionPattern = this.getCacheKey(DomainCacheService.KEYS.USER_PERMISSIONS, `*:${domainId}`);
            const permissionKeys = await this.redis.keys(permissionPattern);
            keysToDelete.push(...permissionKeys);
            // Delete all keys
            if (keysToDelete.length > 0) {
                await this.redis.del(...keysToDelete);
            }
        }
        catch (error) {
            console.error('Cache error in invalidateDomain:', error);
        }
    }
    /**
     * Invalidate user-specific cache entries
     */
    async invalidateUser(userId) {
        if (!this.redis)
            return;
        try {
            const keysToDelete = [
                this.getCacheKey(DomainCacheService.KEYS.USER_DOMAINS, userId),
            ];
            // Find all permission cache entries for this user
            const permissionPattern = this.getCacheKey(DomainCacheService.KEYS.USER_PERMISSIONS, `${userId}:*`);
            const permissionKeys = await this.redis.keys(permissionPattern);
            keysToDelete.push(...permissionKeys);
            // Delete all keys
            if (keysToDelete.length > 0) {
                await this.redis.del(...keysToDelete);
            }
        }
        catch (error) {
            console.error('Cache error in invalidateUser:', error);
        }
    }
    /**
     * Invalidate cache for a specific user-domain permission
     */
    async invalidateUserPermission(userId, domainId) {
        if (!this.redis)
            return;
        try {
            const pattern = this.getCacheKey('permission:', `${userId}:${domainId}:*`);
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
        catch (error) {
            console.error('Permission cache invalidation error:', error);
        }
    }
    /**
     * Warm up cache with frequently accessed data
     */
    async warmUpCache(domains) {
        if (!this.redis)
            return;
        try {
            for (const domain of domains) {
                await this.cacheDomain(domain);
            }
        }
        catch (error) {
            console.error('Cache error in warmUpCache:', error);
        }
    }
    /**
     * Clear all domain-related cache
     */
    async clearAllCache() {
        if (!this.redis)
            return;
        try {
            const pattern = this.getCacheKey('*');
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
        }
        catch (error) {
            console.error('Cache error in clearAllCache:', error);
        }
    }
    /**
     * Get cache statistics
     */
    async getCacheStats() {
        if (!this.redis)
            return { domains: 0, permissions: 0, totalKeys: 0, memoryUsage: 'N/A' };
        try {
            const pattern = this.getCacheKey('*');
            const allKeys = await this.redis.keys(pattern);
            const domainKeys = allKeys.filter(key => key.includes('domain:') && !key.includes('permissions:'));
            const permissionKeys = allKeys.filter(key => key.includes('permissions:'));
            const memoryInfo = await this.redis.memory('USAGE', pattern);
            return {
                domains: domainKeys.length,
                permissions: permissionKeys.length,
                totalKeys: allKeys.length,
                memoryUsage: memoryInfo ? `${memoryInfo} bytes` : 'N/A',
            };
        }
        catch (error) {
            console.error('Cache error in getCacheStats:', error);
            return {
                domains: 0,
                permissions: 0,
                totalKeys: 0,
                memoryUsage: 'Error',
            };
        }
    }
    /**
     * Batch operations for better performance
     */
    async batchGet(keys) {
        if (!this.redis)
            return new Array(keys.length).fill(null);
        try {
            const cacheKeys = keys.map(key => this.getCacheKey('', key));
            return await this.redis.mget(...cacheKeys);
        }
        catch (error) {
            console.error('Cache error in batchGet:', error);
            return new Array(keys.length).fill(null);
        }
    }
    async batchSet(entries) {
        if (!this.redis)
            return;
        try {
            const pipeline = this.redis.pipeline();
            for (const entry of entries) {
                const cacheKey = this.getCacheKey('', entry.key);
                const ttl = entry.ttl || this.config.ttl.domain;
                pipeline.setex(cacheKey, ttl, entry.value);
            }
            await pipeline.exec();
        }
        catch (error) {
            console.error('Cache error in batchSet:', error);
        }
    }
    /**
     * Private helper to generate cache keys
     */
    getCacheKey(prefix, identifier) {
        const base = `${this.config.keyPrefix}${prefix}`;
        return identifier ? `${base}${identifier}` : base;
    }
    /**
     * Health check for Redis connection
     */
    async healthCheck() {
        if (!this.redis)
            return false;
        try {
            const pong = await this.redis.ping();
            return pong === 'PONG';
        }
        catch (error) {
            console.error('Redis health check failed:', error);
            return false;
        }
    }
    /**
     * Generic cache data method
     */
    async cacheData(key, data, ttl) {
        if (!this.redis)
            return;
        try {
            const cacheKey = this.getCacheKey('data:', key);
            const value = JSON.stringify(data);
            const cacheTtl = ttl || this.config.ttl.domain;
            await this.redis.setex(cacheKey, cacheTtl, value);
        }
        catch (error) {
            console.error('Cache error in cacheData:', error);
        }
    }
    /**
     * Generic get data method
     */
    async getData(key) {
        if (!this.redis)
            return null;
        try {
            const cacheKey = this.getCacheKey('data:', key);
            const cached = await this.redis.get(cacheKey);
            if (cached) {
                if (cached === 'NULL') {
                    return null;
                }
                return JSON.parse(cached);
            }
            return null;
        }
        catch (error) {
            console.error('Cache error in getData:', error);
            return null;
        }
    }
    /**
     * Generic delete data method
     */
    async deleteData(key) {
        if (!this.redis)
            return;
        try {
            const cacheKey = this.getCacheKey('data:', key);
            await this.redis.del(cacheKey);
        }
        catch (error) {
            console.error('Cache error in deleteData:', error);
        }
    }
    /**
     * Cache verification configuration
     */
    async cacheVerificationConfig(domainId, config) {
        if (!this.redis)
            return;
        try {
            const cacheKey = this.getCacheKey(DomainCacheService.KEYS.VERIFICATION_STATUS, domainId);
            const value = JSON.stringify(config);
            await this.redis.setex(cacheKey, this.config.ttl.domain, value);
        }
        catch (error) {
            console.error('Cache error in cacheVerificationConfig:', error);
        }
    }
    /**
     * Cache permission data
     */
    async cachePermission(key, permission) {
        if (!this.redis)
            return;
        try {
            const cacheKey = this.getCacheKey('permission:', key);
            const value = JSON.stringify(permission);
            await this.redis.setex(cacheKey, this.config.ttl.permission, value);
        }
        catch (error) {
            console.error('Permission cache error:', error);
        }
    }
    /**
     * Get cached permission
     */
    async getPermission(key) {
        if (!this.redis)
            return null;
        try {
            const cacheKey = this.getCacheKey('permission:', key);
            const value = await this.redis.get(cacheKey);
            return value ? JSON.parse(value) : null;
        }
        catch (error) {
            console.error('Permission cache retrieval error:', error);
            return null;
        }
    }
}
// @ts-ignore - Suppressing null checks for development Redis handling
// Cache key patterns
DomainCacheService.KEYS = {
    DOMAIN_BY_SLUG: 'domain:slug:',
    DOMAIN_BY_HOSTNAME: 'domain:hostname:',
    DOMAIN_BY_ID: 'domain:id:',
    USER_PERMISSIONS: 'permissions:user:',
    DOMAIN_PERMISSIONS: 'permissions:domain:',
    NEGATIVE_CACHE: 'negative:',
    DOMAIN_USERS: 'domain:users:',
    USER_DOMAINS: 'user:domains:',
    VERIFICATION_STATUS: 'verification:',
};
export default DomainCacheService;
//# sourceMappingURL=DomainCacheService.js.map