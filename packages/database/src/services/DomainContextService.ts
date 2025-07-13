/**
 * Domain Context Service
 * Scoped domain state management with Redis-based cache safety
 */

import { Redis } from 'ioredis';
import { logger } from '@keeper/shared';

export interface DomainContextConfig {
  defaultTTL?: number;
  keyPrefix?: string;
  enableMetrics?: boolean;
  maxRetries?: number;
}

export interface ContextOperation {
  success: boolean;
  error?: string;
  duration?: number;
}

export interface ContextMetrics {
  hits: number;
  misses: number;
  operations: number;
  errors: number;
  lastAccessed?: Date;
}

export class DomainContextService {
  private redis: Redis | null;
  private domainId: string;
  private config: Required<DomainContextConfig>;
  private metrics: ContextMetrics;

  private static readonly DEFAULT_CONFIG: Required<DomainContextConfig> = {
    defaultTTL: 3600, // 1 hour
    keyPrefix: 'domain',
    enableMetrics: true,
    maxRetries: 3,
  };

  constructor(redis: Redis | null, domainId: string, config?: Partial<DomainContextConfig>) {
    this.redis = redis;
    this.domainId = domainId;
    this.config = { ...DomainContextService.DEFAULT_CONFIG, ...config };
    this.metrics = {
      hits: 0,
      misses: 0,
      operations: 0,
      errors: 0,
    };
  }

  /**
   * Get value from domain-scoped cache with safe error handling
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.redis) return null;
    
    const operation = await this.safeOperation(async () => {
      const fullKey = this.buildKey(key);
      const raw = await this.redis!.get(fullKey);
      
      if (raw === null) {
        this.incrementMetric('misses');
        return null;
      }

      this.incrementMetric('hits');
      this.updateLastAccessed();
      
      try {
        return JSON.parse(raw) as T;
      } catch (parseError) {
        logger.warn(`Failed to parse cached value for key ${fullKey}:`, parseError);
        return null;
             }
     });

     return operation.success ? (operation.result ?? null) : null;
   }

   /**
    * Set value in domain-scoped cache with optional TTL
    */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<ContextOperation> {
    if (!this.redis) return { success: false, error: 'Redis not available' };
    
    return await this.safeOperation(async () => {
      const fullKey = this.buildKey(key);
      const serializedValue = JSON.stringify(value);
      const ttl = ttlSeconds ?? this.config.defaultTTL;

      if (ttl > 0) {
        await this.redis!.set(fullKey, serializedValue, 'EX', ttl);
      } else {
        await this.redis!.set(fullKey, serializedValue);
      }

      this.updateLastAccessed();
      logger.debug(`Set domain context: ${fullKey} (TTL: ${ttl}s)`);
    });
  }

  /**
   * Delete value from domain-scoped cache
   */
  async delete(key: string): Promise<ContextOperation> {
    if (!this.redis) return { success: false, error: 'Redis not available' };
    
    return await this.safeOperation(async () => {
      const fullKey = this.buildKey(key);
      const deleted = await this.redis!.del(fullKey);
      
      this.updateLastAccessed();
      logger.debug(`Deleted domain context: ${fullKey} (existed: ${deleted > 0})`);
      
      return { deleted: deleted > 0 };
    });
  }

  /**
   * Check if key exists in domain-scoped cache
   */
  async exists(key: string): Promise<boolean> {
    if (!this.redis) return false;
    
    const operation = await this.safeOperation(async () => {
      const fullKey = this.buildKey(key);
      const exists = await this.redis!.exists(fullKey);
      return exists === 1;
    });

         return operation.success ? (operation.result ?? false) : false;
  }

  /**
   * Get multiple values at once
   */
  async mget<T>(keys: string[]): Promise<Record<string, T | null>> {
    if (!this.redis) return {};
    
    const operation = await this.safeOperation(async () => {
      const fullKeys = keys.map(key => this.buildKey(key));
      const values = await this.redis!.mget(fullKeys);
      
      const result: Record<string, T | null> = {};
      
      keys.forEach((key, index) => {
        const raw = values[index];
        if (raw === null) {
          result[key] = null;
          this.incrementMetric('misses');
        } else {
          try {
            result[key] = JSON.parse(raw) as T;
            this.incrementMetric('hits');
          } catch (parseError) {
            logger.warn(`Failed to parse cached value for key ${key}:`, parseError);
            result[key] = null;
          }
        }
      });

      this.updateLastAccessed();
      return result;
    });

         return operation.success ? (operation.result ?? {}) : {};
  }

  /**
   * Set multiple values at once
   */
  async mset<T>(data: Record<string, T>, ttlSeconds?: number): Promise<ContextOperation> {
    if (!this.redis) return { success: false, error: 'Redis not available' };
    
    return await this.safeOperation(async () => {
      const pairs: string[] = [];
      const keys: string[] = [];
      
      for (const [key, value] of Object.entries(data)) {
        const fullKey = this.buildKey(key);
        pairs.push(fullKey, JSON.stringify(value));
        keys.push(fullKey);
      }

      if (pairs.length === 0) {
        return { set: 0 };
      }

      await this.redis!.mset(pairs);

      // Set TTL for each key if specified
      if (ttlSeconds && ttlSeconds > 0) {
        const pipeline = this.redis!.pipeline();
        keys.forEach(fullKey => {
          pipeline.expire(fullKey, ttlSeconds);
        });
        await pipeline.exec();
      }

      this.updateLastAccessed();
      logger.debug(`Set ${keys.length} domain context values (TTL: ${ttlSeconds ?? 'none'}s)`);
      
      return { set: keys.length };
    });
  }

  /**
   * Get all keys in domain scope with optional pattern
   */
  async keys(pattern: string = '*'): Promise<string[]> {
    if (!this.redis) return [];
    
    const operation = await this.safeOperation(async () => {
      const searchPattern = this.buildKey(pattern);
      const fullKeys = await this.redis!.keys(searchPattern);
      
      // Strip domain prefix from returned keys
      return fullKeys.map(fullKey => this.stripPrefix(fullKey));
    });

         return operation.success ? (operation.result ?? []) : [];
  }

  /**
   * Clear all data for this domain
   */
  async clear(): Promise<ContextOperation> {
    if (!this.redis) return { success: false, error: 'Redis not available' };
    return await this.safeOperation(async () => {
      const pattern = this.buildKey('*');
      const keys = await this.redis!.keys(pattern);
      if (keys.length === 0) {
        return { deleted: 0 };
      }
      const deleted = await this.redis!.del(keys);
      this.updateLastAccessed();
      logger.debug(`Cleared ${deleted} domain context keys for domain ${this.domainId}`);
      return { deleted };
    });
  }

  /**
   * Increment a counter in domain scope
   */
  async increment(key: string, by: number = 1): Promise<number | null> {
    if (!this.redis) return null;
    const operation = await this.safeOperation(async () => {
      const fullKey = this.buildKey(key);
      const result = await this.redis!.incrby(fullKey, by);
      this.updateLastAccessed();
      return result;
    });
    return operation.success ? (operation.result ?? null) : null;
  }

  /**
   * Set expiration for a key
   */
  async expire(key: string, ttlSeconds: number): Promise<ContextOperation> {
    if (!this.redis) return { success: false, error: 'Redis not available' };
    return await this.safeOperation(async () => {
      const fullKey = this.buildKey(key);
      const result = await this.redis!.expire(fullKey, ttlSeconds);
      this.updateLastAccessed();
      return { expired: result === 1 };
    });
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number | null> {
    if (!this.redis) return null;
    const operation = await this.safeOperation(async () => {
      const fullKey = this.buildKey(key);
      return await this.redis!.ttl(fullKey);
    });
    return operation.success ? (operation.result ?? null) : null;
  }

  /**
   * Get domain context metrics
   */
  getMetrics(): ContextMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      operations: 0,
      errors: 0,
    };
  }

  /**
   * Get domain ID
   */
  getDomainId(): string {
    return this.domainId;
  }

  /**
   * Check Redis connection health
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    if (!this.redis) return { healthy: false, error: 'Redis not available' };
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      return { healthy: true, latency };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Private helper methods
   */

  private buildKey(key: string): string {
    return `${this.config.keyPrefix}:${this.domainId}:${key}`;
  }

  private stripPrefix(fullKey: string): string {
    const prefix = `${this.config.keyPrefix}:${this.domainId}:`;
    return fullKey.startsWith(prefix) ? fullKey.slice(prefix.length) : fullKey;
  }

  private async safeOperation<T>(
    operation: () => Promise<T>
  ): Promise<{ success: boolean; result?: T; error?: string; duration: number }> {
    const start = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    this.incrementMetric('operations');

    while (attempt < this.config.maxRetries) {
      try {
        const result = await operation();
        const duration = Date.now() - start;
        
        return { success: true, result, duration };
      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        if (attempt < this.config.maxRetries) {
          const delay = Math.pow(2, attempt - 1) * 100; // Exponential backoff
          await this.delay(delay);
          logger.warn(`Redis operation failed, retrying (${attempt}/${this.config.maxRetries}):`, error);
        }
      }
    }

    const duration = Date.now() - start;
    const errorMessage = lastError?.message || 'Unknown Redis error';
    
    this.incrementMetric('errors');
    logger.error(`Redis operation failed after ${this.config.maxRetries} retries:`, lastError);
    
    return { success: false, error: errorMessage, duration };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private incrementMetric(metric: keyof ContextMetrics): void {
    if (!this.config.enableMetrics) return;
    
    if (typeof this.metrics[metric] === 'number') {
      (this.metrics[metric] as number)++;
    }
  }

  private updateLastAccessed(): void {
    if (this.config.enableMetrics) {
      this.metrics.lastAccessed = new Date();
    }
  }
}

export default DomainContextService; 