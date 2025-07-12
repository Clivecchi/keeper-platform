/**
 * Domain Context Service
 * Scoped domain state management with Redis-based cache safety
 */
import { Redis } from 'ioredis';
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
export declare class DomainContextService {
    private redis;
    private domainId;
    private config;
    private metrics;
    private static readonly DEFAULT_CONFIG;
    constructor(redis: Redis, domainId: string, config?: Partial<DomainContextConfig>);
    /**
     * Get value from domain-scoped cache with safe error handling
     */
    get<T>(key: string): Promise<T | null>;
    /**
     * Set value in domain-scoped cache with optional TTL
     */
    set<T>(key: string, value: T, ttlSeconds?: number): Promise<ContextOperation>;
    /**
     * Delete value from domain-scoped cache
     */
    delete(key: string): Promise<ContextOperation>;
    /**
     * Check if key exists in domain-scoped cache
     */
    exists(key: string): Promise<boolean>;
    /**
     * Get multiple values at once
     */
    mget<T>(keys: string[]): Promise<Record<string, T | null>>;
    /**
     * Set multiple values at once
     */
    mset<T>(data: Record<string, T>, ttlSeconds?: number): Promise<ContextOperation>;
    /**
     * Get all keys in domain scope with optional pattern
     */
    keys(pattern?: string): Promise<string[]>;
    /**
     * Clear all data for this domain
     */
    clear(): Promise<ContextOperation>;
    /**
     * Increment a counter in domain scope
     */
    increment(key: string, by?: number): Promise<number | null>;
    /**
     * Set expiration for a key
     */
    expire(key: string, ttlSeconds: number): Promise<ContextOperation>;
    /**
     * Get TTL for a key
     */
    ttl(key: string): Promise<number | null>;
    /**
     * Get domain context metrics
     */
    getMetrics(): ContextMetrics;
    /**
     * Reset metrics
     */
    resetMetrics(): void;
    /**
     * Get domain ID
     */
    getDomainId(): string;
    /**
     * Check Redis connection health
     */
    healthCheck(): Promise<{
        healthy: boolean;
        latency?: number;
        error?: string;
    }>;
    /**
     * Private helper methods
     */
    private buildKey;
    private stripPrefix;
    private safeOperation;
    private delay;
    private incrementMetric;
    private updateLastAccessed;
}
export default DomainContextService;
//# sourceMappingURL=DomainContextService.d.ts.map