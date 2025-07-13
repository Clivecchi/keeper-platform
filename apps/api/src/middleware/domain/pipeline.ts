/**
 * Domain Middleware Pipeline
 * Utilities for chaining domain middleware together
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { resolveDomainContext, DomainContextStrategy } from './resolveDomainContext';
import { requireAuth } from './requireAuth';
import { requireDomainRead, requireDomainWrite, requireDomainAdmin } from './requireDomainPermissions';
import { requireMemoryAccess } from './requireMemoryAccess';
import { DomainService, DomainCacheService } from '@keeper/database';
import { PrismaClient } from '@keeper/database';
import Redis from 'ioredis';

const prisma = new PrismaClient();
let redis: Redis | null = null;
if (process.env.REDIS_URL && process.env.DISABLE_REDIS !== 'true') {
  redis = new Redis(process.env.REDIS_URL);
} else if (process.env.NODE_ENV === 'development') {
  console.warn('Redis not available in development. Features will degrade gracefully.');
}
const cacheService = new DomainCacheService(redis);
const domainService = new DomainService(prisma, cacheService);

export interface DomainPipelineConfig {
  requireDomainContext?: boolean;
  requireAuthentication?: boolean;
  requirePermissions?: string[];
  memoryAccess?: {
    minAccessLevel: 'read' | 'write' | 'admin';
    checkQuota?: boolean;
  };
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

export function createDomainPipeline(config: DomainPipelineConfig = {}): RequestHandler[] {
  const middleware: RequestHandler[] = [];

  // Add domain context resolution
  if (config.requireDomainContext !== false) {
    middleware.push(resolveDomainContext('param'));
  }

  // Add authentication
  if (config.requireAuthentication !== false) {
    middleware.push(requireAuth);
  }

  // Add domain permissions
  if (config.requirePermissions && config.requirePermissions.length > 0) {
    if (config.requirePermissions.includes('admin')) {
      middleware.push(requireDomainAdmin as RequestHandler);
    } else if (config.requirePermissions.includes('write')) {
      middleware.push(requireDomainWrite as RequestHandler);
    } else {
      middleware.push(requireDomainRead as RequestHandler);
    }
  }

  // Add memory access
  if (config.memoryAccess) {
    middleware.push(requireMemoryAccess(config.memoryAccess.minAccessLevel) as RequestHandler);
  }

  return middleware;
}

export function createBasicDomainGuard(strategy: DomainContextStrategy = 'param'): RequestHandler[] {
  return [
    resolveDomainContext(strategy),
    requireAuth,
    requireDomainRead,
  ];
}

export function createWriteDomainGuard(strategy: DomainContextStrategy = 'param'): RequestHandler[] {
  return [
    resolveDomainContext(strategy),
    requireAuth,
    requireDomainWrite,
  ];
}

export function createAdminDomainGuard(strategy: DomainContextStrategy = 'param'): RequestHandler[] {
  return [
    resolveDomainContext(strategy),
    requireAuth,
    requireDomainAdmin,
  ];
}

export function createMemoryGuard(
  accessLevel: 'read' | 'write' | 'admin',
  strategy: DomainContextStrategy = 'param'
): RequestHandler[] {
  return [
    resolveDomainContext(strategy),
    requireAuth,
    requireMemoryAccess(accessLevel),
  ];
}

export function createDomainMemoryGuard(
  accessLevel: 'read' | 'write' | 'admin',
  strategy: DomainContextStrategy = 'param'
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Resolve domain context
      await resolveDomainContext(strategy)(req, res, () => {});
      
      const domainContext = (req as any).domainContext;
      if (!domainContext) {
        return res.status(400).json({
          success: false,
          error: 'Domain context required',
        });
      }

      // Check authentication
      if (!(req as any).user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
      }

      // Check memory access
      const domainId = (domainContext as any).domain?.id;
      const userId = (req as any).user?.id;

      if (!domainId || !userId) {
        return res.status(400).json({
          success: false,
          error: 'Domain ID and user ID required',
        });
      }

      // Get memory scope
      const memoryScope = await domainService.getMemoryScope(domainId);
      
      if (!memoryScope) {
        return res.status(404).json({
          success: false,
          error: 'Memory scope not found',
        });
      }

      // Check quota limits
      if (memoryScope && (memoryScope as any).quotaExceeded && (accessLevel === 'write' || accessLevel === 'admin')) {
        return res.status(429).json({
          success: false,
          error: 'Memory quota exceeded',
        });
      }

      // Check access level
      const currentAccessLevel = (memoryScope as any).accessLevel || 'read';
      const accessLevels = { read: 1, write: 2, admin: 3 };
      
      if (accessLevels[accessLevel] > accessLevels[currentAccessLevel as keyof typeof accessLevels]) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient access level',
        });
      }

      // Set memory context
      (req as any).memoryContext = memoryScope;

      return next();
    } catch (error) {
      console.error('Domain memory guard error:', error);
      return res.status(500).json({
        success: false,
        error: 'Memory access check failed',
      });
    }
  };
}

export const fullDomainMemoryGuard: RequestHandler[] = [
  resolveDomainContext('param'),
  requireAuth,
  requireMemoryAccess('read'),
];

export const fullDomainMemoryWriteGuard: RequestHandler[] = [
  resolveDomainContext('param'),
  requireAuth,
  requireMemoryAccess('write'),
];

export const fullDomainMemoryAdminGuard: RequestHandler[] = [
  resolveDomainContext('param'),
  requireAuth,
  requireMemoryAccess('admin'),
];

export function createCrossDomainGuard(
  sourceDomainId: string,
  targetDomainId: string,
  strategy: DomainContextStrategy = 'param'
): RequestHandler[] {
  return [
    resolveDomainContext(strategy),
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Check share agreement
        const shareAgreement = await domainService.getShareAgreement(sourceDomainId, targetDomainId);
        
        if (!shareAgreement) {
          return res.status(403).json({
            success: false,
            error: 'No valid share agreement found',
          });
        }

        // Validate share agreement
        const violations: string[] = [];
        const method = req.method;

        if ((shareAgreement as any).shareType === 'read_only' && method !== 'GET') {
          violations.push('Read-only share agreement does not allow write operations');
        }

        if ((shareAgreement as any).expiresAt && new Date() > (shareAgreement as any).expiresAt) {
          violations.push('Share agreement has expired');
        }

        if ((shareAgreement as any).maxAccess && (shareAgreement as any).currentAccess >= (shareAgreement as any).maxAccess) {
          violations.push('Share agreement access limit exceeded');
        }

        if (violations.length > 0) {
          return res.status(403).json({
            success: false,
            error: 'Share agreement violations',
            violations,
          });
        }

        return next();
      } catch (error) {
        console.error('Cross-domain guard error:', error);
        return res.status(500).json({
          success: false,
          error: 'Cross-domain access check failed',
        });
      }
    },
  ];
}

export function createPublicDomainGuard(strategy: DomainContextStrategy = 'param'): RequestHandler[] {
  return [
    resolveDomainContext(strategy),
    // No authentication required for public access
  ];
}

export function createOwnerOnlyGuard(strategy: DomainContextStrategy = 'param'): RequestHandler[] {
  return [
    resolveDomainContext(strategy),
    requireAuth,
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const domainContext = (req as any).domainContext;
        const user = (req as any).user;

        if (!domainContext || !user) {
          return res.status(400).json({
            success: false,
            error: 'Domain context and user required',
          });
        }

        // Check if user is domain owner
        if ((domainContext as any).domain?.ownerId !== user.id) {
          return res.status(403).json({
            success: false,
            error: 'Only domain owner can perform this action',
          });
        }

        return next();
      } catch (error) {
        console.error('Owner only guard error:', error);
        return res.status(500).json({
          success: false,
          error: 'Owner check failed',
        });
      }
    },
  ];
} 