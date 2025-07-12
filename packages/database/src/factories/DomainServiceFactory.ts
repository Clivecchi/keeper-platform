import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { DomainService } from '../services/DomainService';
import { DomainCacheService } from '../services/DomainCacheService';
import { DomainContextService } from '../services/DomainContextService';
import { SoleMemoryIsolationService } from '../services/SoleMemoryIsolationService';
import { logger } from '@keeper/shared';

export interface DomainServiceFactoryConfig {
  redis: Redis;
  prisma: PrismaClient;
  maxRetries?: number;
  retryDelayMs?: number;
}

export interface IMemoryService {
  getMemoryScope(domainId: string): Promise<unknown>;
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
  getDomainById(id: string): Promise<unknown>;
  getUserDomains(userId: string): Promise<any[]>;
}

export class DomainServiceFactory {
  private static redis: Redis | null = null;
  private static prisma: PrismaClient | null = null;
  private static initialized = false;
  private static initializing = false;
  private static initializationPromise: Promise<void> | null = null;

  private static readonly DEFAULT_MAX_RETRIES = 5;
  private static readonly DEFAULT_RETRY_DELAY_MS = 2000;

  /**
   * Initialize the factory with retry logic for Redis and Prisma connections
   */
  static async initialize(config?: Partial<DomainServiceFactoryConfig>): Promise<void> {
    if (this.initialized) {
      logger.debug('DomainServiceFactory already initialized');
      return;
    }

    if (this.initializing) {
      logger.debug('DomainServiceFactory initialization in progress, waiting...');
      return this.initializationPromise!;
    }

    this.initializing = true;
    this.initializationPromise = this._performInitialization(config);
    
    try {
      await this.initializationPromise;
      this.initialized = true;
      logger.info('DomainServiceFactory initialized successfully');
    } catch (error) {
      this.initializing = false;
      this.initializationPromise = null;
      throw error;
    }
  }

  private static async _performInitialization(config?: Partial<DomainServiceFactoryConfig>): Promise<void> {
    const maxRetries = config?.maxRetries || this.DEFAULT_MAX_RETRIES;
    const retryDelayMs = config?.retryDelayMs || this.DEFAULT_RETRY_DELAY_MS;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`DomainServiceFactory initialization attempt ${attempt}/${maxRetries}`);
        
        // Initialize Redis connection
        if (config?.redis) {
          this.redis = config.redis;
        } else {
          await this._initializeRedis();
        }

        // Initialize Prisma connection
        if (config?.prisma) {
          this.prisma = config.prisma;
        } else {
          await this._initializePrisma();
        }

        // Test connections
        await this._testConnections();

        logger.info('DomainServiceFactory connections established successfully');
        return;

      } catch (error) {
        lastError = error as Error;
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

  private static async _initializeRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is required');
    }

    logger.debug('Initializing Redis connection');
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    // Test Redis connection
    await this.redis.connect();
    logger.debug('Redis connection established');
  }

  private static async _initializePrisma(): Promise<void> {
    logger.debug('Initializing Prisma connection');
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

    // Test Prisma connection
    await this.prisma.$connect();
    logger.debug('Prisma connection established');
  }

  private static async _testConnections(): Promise<void> {
    if (!this.redis || !this.prisma) {
      throw new Error('Redis or Prisma not initialized');
    }

    // Test Redis
    await this.redis.ping();
    logger.debug('Redis ping successful');

    // Test Prisma
    await this.prisma.$queryRaw`SELECT 1`;
    logger.debug('Prisma query test successful');
  }

  private static _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if the factory is ready to create services
   */
  static isReady(): boolean {
    return this.initialized && !!this.redis && !!this.prisma;
  }

  /**
   * Assert that the factory is ready, throw error if not
   */
  static assertReady(): void {
    if (!this.isReady()) {
      throw new Error('DomainServiceFactory not initialized. Call initialize() first.');
    }
  }

  /**
   * Get initialization status
   */
  static getStatus(): { initialized: boolean; initializing: boolean; ready: boolean } {
    return {
      initialized: this.initialized,
      initializing: this.initializing,
      ready: this.isReady(),
    };
  }

  /**
   * Create a DomainService instance
   */
  static createDomainService(): IDomainService {
    this.assertReady();
    return new DomainService(this.prisma!, this.createCacheService());
  }

  /**
   * Create a DomainCacheService instance
   */
  static createCacheService(): DomainCacheService {
    this.assertReady();
    return new DomainCacheService(this.redis!);
  }

  /**
   * Create a MemoryService instance
   */
  static createMemoryService(): IMemoryService {
    this.assertReady();
    return new SoleMemoryIsolationService(this.prisma!, this.createCacheService());
  }

  /**
   * Create a domain-scoped context service
   */
  static createDomainContextService(domainId: string): DomainContextService {
    this.assertReady();
    return new DomainContextService(this.redis!, domainId);
  }

  /**
   * Gracefully shutdown all connections
   */
  static async shutdown(): Promise<void> {
    logger.info('Shutting down DomainServiceFactory...');

    const shutdownPromises: Promise<void>[] = [];

    if (this.redis) {
      shutdownPromises.push(
        Promise.resolve().then(() => this.redis!.disconnect()).catch((err: unknown) => 
          logger.warn('Error disconnecting Redis:', err)
        )
      );
    }

    if (this.prisma) {
      shutdownPromises.push(
        this.prisma.$disconnect().catch(err => 
          logger.warn('Error disconnecting Prisma:', err)
        )
      );
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

 