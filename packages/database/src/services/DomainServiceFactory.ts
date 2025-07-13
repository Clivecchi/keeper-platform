/**
 * Domain Service Factory
 * Provides a clean way to initialize DomainService with dependencies
 */

import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { DomainService } from './DomainService';
import { DomainCacheService } from './DomainCacheService';

export class DomainServiceFactory {
  /**
   * Create a DomainService instance with proper dependencies
   */
  static createDomainService(prisma: PrismaClient, redis?: Redis): DomainService {
    // Create cache service if Redis is provided
    const cacheService = redis ? new DomainCacheService(redis) : new DomainCacheService({} as Redis);
    
    return new DomainService(prisma, cacheService);
  }
  
  /**
   * Create a DomainService instance with minimal dependencies for testing
   */
  static createMinimalDomainService(prisma: PrismaClient): DomainService {
    // Create a no-op cache service
    const noOpCacheService = new DomainCacheService({} as any);
    
    return new DomainService(prisma, noOpCacheService);
  }
} 