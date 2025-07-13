import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { DomainService } from '../services/DomainService';
import { DomainCacheService } from '../services/DomainCacheService';
import { DomainContextService } from '../services/DomainContextService';
import { SoleMemoryIsolationService } from '../services/SoleMemoryIsolationService';
import { logger } from '@keeper/shared';
export class DomainServiceFactory {
    /**
     * Initialize the factory with retry logic for Redis and Prisma connections
     */
    static async initialize(config) {
        if (this.initialized) {
            logger.debug('DomainServiceFactory already initialized');
            return;
        }
        if (this.initializing) {
            logger.debug('DomainServiceFactory initialization in progress, waiting...');
            return this.initializationPromise;
        }
        this.initializing = true;
        this.initializationPromise = this._performInitialization(config);
        try {
            await this.initializationPromise;
            this.initialized = true;
            logger.info('DomainServiceFactory initialized successfully');
        }
        catch (error) {
            this.initializing = false;
            this.initializationPromise = null;
            throw error;
        }
    }
    static async _performInitialization(config) {
        const maxRetries = config?.maxRetries || this.DEFAULT_MAX_RETRIES;
        const retryDelayMs = config?.retryDelayMs || this.DEFAULT_RETRY_DELAY_MS;
        let lastError = null;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`DomainServiceFactory initialization attempt ${attempt}/${maxRetries}`);
                // Initialize Redis connection
                if (config?.redis) {
                    this.redis = config.redis;
                }
                else {
                    await this._initializeRedis();
                }
                // Initialize Prisma connection
                if (config?.prisma) {
                    this.prisma = config.prisma;
                }
                else {
                    await this._initializePrisma();
                }
                // Test connections
                await this._testConnections();
                logger.info('DomainServiceFactory connections established successfully');
                return;
            }
            catch (error) {
                lastError = error;
                logger.warn(`DomainServiceFactory initialization attempt ${attempt} failed:`, error);
                if (attempt < maxRetries) {
                    const delay = retryDelayMs * Math.pow(2, attempt - 1); // Exponential backoff
                    logger.info(`Retrying in ${delay}ms...`);
                    await this._delay(delay);
                }
            }
        }
        throw new Error(`DomainServiceFactory initialization failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
    }
    static async _initializeRedis() {
        // Skip Redis in development if explicitly disabled
        if (process.env.NODE_ENV === 'development' && process.env.DISABLE_REDIS === 'true') {
            logger.warn('Redis disabled in development via DISABLE_REDIS=true');
            this.redis = null;
            return;
        }
        const redisUrl = process.env.REDIS_URL;
        // In development, allow Redis to be optional
        if (!redisUrl) {
            if (process.env.NODE_ENV === 'development') {
                logger.warn('REDIS_URL not set in development. Redis features will be disabled.');
                this.redis = null;
                return;
            }
            else {
                throw new Error('REDIS_URL environment variable is required');
            }
        }
        logger.debug('Initializing Redis connection');
        this.redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            connectTimeout: 10000,
            commandTimeout: 5000,
        });
        try {
            // Test Redis connection
            await this.redis.connect();
            logger.debug('Redis connection established');
        }
        catch (error) {
            if (process.env.NODE_ENV === 'development') {
                logger.warn('Failed to connect to Redis in development. Redis features will be disabled.');
                this.redis = null;
            }
            else {
                throw error;
            }
        }
    }
    static async _initializePrisma() {
        logger.debug('Initializing Prisma connection');
        this.prisma = new PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
        });
        // Test Prisma connection
        await this.prisma.$connect();
        logger.debug('Prisma connection established');
    }
    static async _testConnections() {
        if (!this.prisma) {
            throw new Error('Prisma not initialized');
        }
        // Test Redis if available
        if (this.redis) {
            try {
                await this.redis.ping();
                logger.debug('Redis ping successful');
            }
            catch (error) {
                if (process.env.NODE_ENV === 'development') {
                    logger.warn('Redis ping failed in development. Continuing without Redis.');
                    this.redis = null;
                }
                else {
                    throw error;
                }
            }
        }
        // Test Prisma
        await this.prisma.$queryRaw `SELECT 1`;
        logger.debug('Prisma query test successful');
    }
    static _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Check if the factory is ready to create services
     */
    static isReady() {
        return this.initialized && !!this.prisma;
    }
    /**
     * Assert that the factory is ready, throw error if not
     */
    static assertReady() {
        if (!this.isReady()) {
            throw new Error('DomainServiceFactory not initialized. Call initialize() first.');
        }
    }
    /**
     * Get initialization status
     */
    static getStatus() {
        return {
            initialized: this.initialized,
            initializing: this.initializing,
            ready: this.isReady(),
        };
    }
    /**
     * Create a DomainService instance
     */
    static createDomainService() {
        this.assertReady();
        return new DomainService(this.prisma, this.createCacheService());
    }
    /**
     * Create a DomainCacheService instance
     */
    static createCacheService() {
        this.assertReady();
        return new DomainCacheService(this.redis);
    }
    /**
     * Create a MemoryService instance
     */
    static createMemoryService() {
        this.assertReady();
        return new SoleMemoryIsolationService(this.prisma, this.createCacheService());
    }
    /**
     * Create a domain-scoped context service
     */
    static createDomainContextService(domainId) {
        this.assertReady();
        if (!this.redis) {
            throw new Error('Redis is required for domain context service. Set REDIS_URL environment variable.');
        }
        return new DomainContextService(this.redis, domainId);
    }
    /**
     * Gracefully shutdown all connections
     */
    static async shutdown() {
        logger.info('Shutting down DomainServiceFactory...');
        const shutdownPromises = [];
        if (this.redis) {
            shutdownPromises.push(Promise.resolve().then(() => this.redis.disconnect()).catch((err) => logger.warn('Error disconnecting Redis:', err)));
        }
        if (this.prisma) {
            shutdownPromises.push(this.prisma.$disconnect().catch(err => logger.warn('Error disconnecting Prisma:', err)));
        }
        await Promise.allSettled(shutdownPromises);
        this.redis = null;
        this.prisma = null;
        this.initialized = false;
        this.initializing = false;
        this.initializationPromise = null;
        logger.info('DomainServiceFactory shutdown complete');
    }
}
DomainServiceFactory.redis = null;
DomainServiceFactory.prisma = null;
DomainServiceFactory.initialized = false;
DomainServiceFactory.initializing = false;
DomainServiceFactory.initializationPromise = null;
DomainServiceFactory.DEFAULT_MAX_RETRIES = 5;
DomainServiceFactory.DEFAULT_RETRY_DELAY_MS = 2000;
//# sourceMappingURL=DomainServiceFactory.js.map