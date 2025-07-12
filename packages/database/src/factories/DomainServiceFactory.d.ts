import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { DomainCacheService } from '../services/DomainCacheService';
import { DomainContextService } from '../services/DomainContextService';
export interface DomainServiceFactoryConfig {
    redis: Redis;
    prisma: PrismaClient;
    maxRetries?: number;
    retryDelayMs?: number;
}
export interface IMemoryService {
    getMemoryScope(domainId: string): Promise<any>;
    getMemoryQuota(domainId: string): Promise<{
        domainId: string;
        maxMemorySize: number;
        currentMemorySize: number;
        usagePercentage: number;
        categoryBreakdown: Record<string, number>;
        recommendedCleanup: boolean;
    }>;
    checkMemoryAccess(domainId: string, userId: string, accessType: string): Promise<boolean>;
}
export interface IDomainService {
    getDomainById(id: string): Promise<any>;
    getUserDomains(userId: string): Promise<any[]>;
}
export declare class DomainServiceFactory {
    private static redis;
    private static prisma;
    private static initialized;
    private static initializing;
    private static initializationPromise;
    private static readonly DEFAULT_MAX_RETRIES;
    private static readonly DEFAULT_RETRY_DELAY_MS;
    /**
     * Initialize the factory with retry logic for Redis and Prisma connections
     */
    static initialize(config?: Partial<DomainServiceFactoryConfig>): Promise<void>;
    private static _performInitialization;
    private static _initializeRedis;
    private static _initializePrisma;
    private static _testConnections;
    private static _delay;
    /**
     * Check if the factory is ready to create services
     */
    static isReady(): boolean;
    /**
     * Assert that the factory is ready, throw error if not
     */
    static assertReady(): void;
    /**
     * Get initialization status
     */
    static getStatus(): {
        initialized: boolean;
        initializing: boolean;
        ready: boolean;
    };
    /**
     * Create a DomainService instance
     */
    static createDomainService(): IDomainService;
    /**
     * Create a DomainCacheService instance
     */
    static createCacheService(): DomainCacheService;
    /**
     * Create a MemoryService instance
     */
    static createMemoryService(): IMemoryService;
    /**
     * Create a domain-scoped context service
     */
    static createDomainContextService(domainId: string): DomainContextService;
    /**
     * Gracefully shutdown all connections
     */
    static shutdown(): Promise<void>;
}
//# sourceMappingURL=DomainServiceFactory.d.ts.map