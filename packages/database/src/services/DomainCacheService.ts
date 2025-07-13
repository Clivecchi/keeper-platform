/**
 * Domain Cache Service
 * Redis-based caching for domain resolution and permissions
 */

import { Redis } from 'ioredis';

// Types
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
    domain: number;        // Domain data TTL (seconds)
    permission: number;    // Permission data TTL (seconds)
    negative: number;      // Negative cache TTL (seconds)
  };
  keyPrefix: string;
}

export class DomainCacheService {
  private redis: Redis;
  private config: CacheConfig;

  // Cache key patterns
  private static readonly KEYS = {
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

  constructor(redis: Redis, config?: Partial<CacheConfig>) {
    this.redis = redis;
    this.config = {
      ttl: {
        domain: 300,      // 5 minutes
        permission: 180,  // 3 minutes
        negative: 60,     // 1 minute
      },
      keyPrefix: 'keeper:',
      ...config,
    };
  }

  /**
   * Get domain by slug with caching
   */
  async getDomainBySlug(slug: string): Promise<Domain | null> {
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
    } catch (error) {
      console.error('Cache error in getDomainBySlug:', error);
      return null;
    }
  }

  /**
   * Get domain by custom hostname with caching
   */
  async getDomainByHostname(hostname: string): Promise<Domain | null> {
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
    } catch (error) {
      console.error('Cache error in getDomainByHostname:', error);
      return null;
    }
  }

  /**
   * Get domain by ID with caching
   */
  async getDomainById(id: string): Promise<Domain | null> {
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
    } catch (error) {
      console.error('Cache error in getDomainById:', error);
      return null;
    }
  }

  /**
   * Cache domain data with multiple keys
   */
  async cacheDomain(domain: Domain): Promise<void> {
    const domainJson = JSON.stringify(domain);
    const ttl = this.config.ttl.domain;
    
    try {
      const pipeline = this.redis.pipeline();
      
      // Cache by ID
      pipeline.setex(
        this.getCacheKey(DomainCacheService.KEYS.DOMAIN_BY_ID, domain.id),
        ttl,
        domainJson
      );
      
      // Cache by slug
      pipeline.setex(
        this.getCacheKey(DomainCacheService.KEYS.DOMAIN_BY_SLUG, domain.slug),
        ttl,
        domainJson
      );
      
      // Cache by custom domain if verified
      if (domain.customDomain && domain.customDomainVerified) {
        pipeline.setex(
          this.getCacheKey(DomainCacheService.KEYS.DOMAIN_BY_HOSTNAME, domain.customDomain),
          ttl,
          domainJson
        );
      }
      
      await pipeline.exec();
    } catch (error) {
      console.error('Cache error in cacheDomain:', error);
    }
  }

  /**
   * Cache negative result (domain not found)
   */
  async cacheNegativeResult(key: string, identifier: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key, identifier);
      await this.redis.setex(cacheKey, this.config.ttl.negative, 'NULL');
    } catch (error) {
      console.error('Cache error in cacheNegativeResult:', error);
    }
  }

  /**
   * Get user permissions for a domain
   */
  async getUserPermissions(userId: string, domainId: string): Promise<DomainPermission | null> {
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
    } catch (error) {
      console.error('Cache error in getUserPermissions:', error);
      return null;
    }
  }

  /**
   * Cache user permissions
   */
  async cacheUserPermissions(permission: unknown): Promise<void> {
    try {
      if (permission && typeof permission === 'object' && 'userId' in permission && 'domainId' in permission) {
        const perm = permission as { userId: string; domainId: string };
        const cacheKey = this.getCacheKey('user_permissions:', `${perm.userId}:${perm.domainId}`);
        const value = JSON.stringify(permission);
        await this.redis.setex(cacheKey, this.config.ttl.permission, value);
      }
    } catch (error) {
      console.error('User permissions cache error:', error);
    }
  }

  /**
   * Get all users for a domain (cached)
   */
  async getDomainUsers(domainId: string): Promise<string[] | null> {
    const cacheKey = this.getCacheKey(DomainCacheService.KEYS.DOMAIN_USERS, domainId);
    
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null; // Cache miss
    } catch (error) {
      console.error('Cache error in getDomainUsers:', error);
      return null;
    }
  }

  /**
   * Cache domain users list
   */
  async cacheDomainUsers(domainId: string, userIds: string[]): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(DomainCacheService.KEYS.DOMAIN_USERS, domainId);
      await this.redis.setex(
        cacheKey,
        this.config.ttl.permission,
        JSON.stringify(userIds)
      );
    } catch (error) {
      console.error('Cache error in cacheDomainUsers:', error);
    }
  }

  /**
   * Get user's domains (cached)
   */
  async getUserDomains(userId: string): Promise<string[] | null> {
    const cacheKey = this.getCacheKey(DomainCacheService.KEYS.USER_DOMAINS, userId);
    
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      
      return null; // Cache miss
    } catch (error) {
      console.error('Cache error in getUserDomains:', error);
      return null;
    }
  }

  /**
   * Cache user's domains list
   */
  async cacheUserDomains(userId: string, domainIds: string[]): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(DomainCacheService.KEYS.USER_DOMAINS, userId);
      await this.redis.setex(
        cacheKey,
        this.config.ttl.permission,
        JSON.stringify(domainIds)
      );
    } catch (error) {
      console.error('Cache error in cacheUserDomains:', error);
    }
  }

  /**
   * Invalidate all cache entries for a domain
   */
  async invalidateDomain(domainId: string): Promise<void> {
    try {
      // Get domain data first to know what keys to invalidate
      const domain = await this.getDomainById(domainId);
      
      const keysToDelete = [
        this.getCacheKey(DomainCacheService.KEYS.DOMAIN_BY_ID, domainId),
        this.getCacheKey(DomainCacheService.KEYS.DOMAIN_USERS, domainId),
        this.getCacheKey(DomainCacheService.KEYS.DOMAIN_PERMISSIONS, domainId),
      ];
      
      if (domain) {
        keysToDelete.push(
          this.getCacheKey(DomainCacheService.KEYS.DOMAIN_BY_SLUG, domain.slug)
        );
        
        if (domain.customDomain) {
          keysToDelete.push(
            this.getCacheKey(DomainCacheService.KEYS.DOMAIN_BY_HOSTNAME, domain.customDomain)
          );
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
    } catch (error) {
      console.error('Cache error in invalidateDomain:', error);
    }
  }

  /**
   * Invalidate user-specific cache entries
   */
  async invalidateUser(userId: string): Promise<void> {
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
    } catch (error) {
      console.error('Cache error in invalidateUser:', error);
    }
  }

  /**
   * Invalidate cache for a specific user-domain permission
   */
  async invalidateUserPermission(userId: string, domainId: string): Promise<void> {
    try {
      const pattern = this.getCacheKey('permission:', `${userId}:${domainId}:*`);
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Permission cache invalidation error:', error);
    }
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(domains: Domain[]): Promise<void> {
    try {
      for (const domain of domains) {
        await this.cacheDomain(domain);
      }
    } catch (error) {
      console.error('Cache error in warmUpCache:', error);
    }
  }

  /**
   * Clear all domain-related cache
   */
  async clearAllCache(): Promise<void> {
    try {
      const pattern = this.getCacheKey('*');
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache error in clearAllCache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    domains: number;
    permissions: number;
    totalKeys: number;
    memoryUsage: string;
  }> {
    try {
      const pattern = this.getCacheKey('*');
      const allKeys = await this.redis.keys(pattern);
      
      const domainKeys = allKeys.filter(key => 
        key.includes('domain:') && !key.includes('permissions:')
      );
      const permissionKeys = allKeys.filter(key => 
        key.includes('permissions:')
      );
      
      const memoryInfo = await this.redis.memory('USAGE', pattern);
      
      return {
        domains: domainKeys.length,
        permissions: permissionKeys.length,
        totalKeys: allKeys.length,
        memoryUsage: memoryInfo ? `${memoryInfo} bytes` : 'N/A',
      };
    } catch (error) {
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
  async batchGet(keys: string[]): Promise<(string | null)[]> {
    try {
      const cacheKeys = keys.map(key => this.getCacheKey('', key));
      return await this.redis.mget(...cacheKeys);
    } catch (error) {
      console.error('Cache error in batchGet:', error);
      return new Array(keys.length).fill(null);
    }
  }

  async batchSet(entries: Array<{ key: string; value: string; ttl?: number }>): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      
      for (const entry of entries) {
        const cacheKey = this.getCacheKey('', entry.key);
        const ttl = entry.ttl || this.config.ttl.domain;
        pipeline.setex(cacheKey, ttl, entry.value);
      }
      
      await pipeline.exec();
    } catch (error) {
      console.error('Cache error in batchSet:', error);
    }
  }

  /**
   * Private helper to generate cache keys
   */
  private getCacheKey(prefix: string, identifier?: string): string {
    const base = `${this.config.keyPrefix}${prefix}`;
    return identifier ? `${base}${identifier}` : base;
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const pong = await this.redis.ping();
      return pong === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return false;
    }
  }

  /**
   * Generic cache data method
   */
  async cacheData(key: string, data: unknown, ttl?: number): Promise<void> {
    try {
      const cacheKey = this.getCacheKey('data:', key);
      const value = JSON.stringify(data);
      const cacheTtl = ttl || this.config.ttl.domain;
      
      await this.redis.setex(cacheKey, cacheTtl, value);
    } catch (error) {
      console.error('Cache error in cacheData:', error);
    }
  }

  /**
   * Generic get data method
   */
  async getData(key: string): Promise<any | null> {
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
    } catch (error) {
      console.error('Cache error in getData:', error);
      return null;
    }
  }

  /**
   * Generic delete data method
   */
  async deleteData(key: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey('data:', key);
      await this.redis.del(cacheKey);
    } catch (error) {
      console.error('Cache error in deleteData:', error);
    }
  }

  /**
   * Cache verification configuration
   */
  async cacheVerificationConfig(domainId: string, config: Record<string, unknown>): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(DomainCacheService.KEYS.VERIFICATION_STATUS, domainId);
      const value = JSON.stringify(config);
      
      await this.redis.setex(cacheKey, this.config.ttl.domain, value);
    } catch (error) {
      console.error('Cache error in cacheVerificationConfig:', error);
    }
  }

  /**
   * Cache permission data
   */
  async cachePermission(key: string, permission: unknown): Promise<void> {
    try {
      const cacheKey = this.getCacheKey('permission:', key);
      const value = JSON.stringify(permission);
      await this.redis.setex(cacheKey, this.config.ttl.permission, value);
    } catch (error) {
      console.error('Permission cache error:', error);
    }
  }

  /**
   * Get cached permission
   */
  async getPermission(key: string): Promise<any | null> {
    try {
      const cacheKey = this.getCacheKey('permission:', key);
      const value = await this.redis.get(cacheKey);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Permission cache retrieval error:', error);
      return null;
    }
  }
}

export default DomainCacheService; 