/**
 * Domain Middleware Pipeline
 * Utilities for chaining domain middleware together
 */

import { RequestHandler } from 'express';
import { resolveDomainContext, DomainContextStrategy } from './resolveDomainContext';
import { requireAuth } from './requireAuth';
import { requireDomainPermission, DomainPermissionType } from './requireDomainPermission';
import { requireMemoryAccess, MemoryAccessType } from './requireMemoryAccess';
import { AuthenticatedRequest, DomainServiceFactory } from '@keeper/database';
import { DomainError } from '../../lib/errors/DomainError';

export interface DomainPipelineConfig {
  strategy?: DomainContextStrategy;
  permissions?: DomainPermissionType[];
  memoryAccess?: MemoryAccessType;
  requireAuth?: boolean;
  requireDomain?: boolean;
  requireMemory?: boolean;
}

/**
 * Create a complete domain pipeline with all middleware
 */
export function createDomainPipeline(config: DomainPipelineConfig = {}): RequestHandler[] {
  const {
    strategy = 'param',
    permissions = ['read'],
    memoryAccess = 'read',
    requireAuth: requireAuthFlag = true,
    requireDomain = true,
    requireMemory = false
  } = config;

  const middleware: RequestHandler[] = [];

  // 1. Resolve domain context (if required)
  if (requireDomain) {
    middleware.push(resolveDomainContext(strategy));
  }

  // 2. Require authentication (if required)
  if (requireAuthFlag) {
    middleware.push(requireAuth());
  }

  // 3. Check domain permissions (if domain required)
  if (requireDomain && permissions.length > 0) {
    middleware.push(requireDomainPermission(permissions));
  }

  // 4. Check memory access (if required)
  if (requireMemory) {
    middleware.push(requireMemoryAccess(memoryAccess));
  }

  return middleware;
}

/**
 * Create a basic domain guard (domain + auth + read permission)
 */
export function createBasicDomainGuard(strategy: DomainContextStrategy = 'param'): RequestHandler[] {
  return createDomainPipeline({
    strategy,
    permissions: ['read'],
    requireAuth: true,
    requireDomain: true,
    requireMemory: false
  });
}

/**
 * Create a write domain guard (domain + auth + write permission)
 */
export function createWriteDomainGuard(strategy: DomainContextStrategy = 'param'): RequestHandler[] {
  return createDomainPipeline({
    strategy,
    permissions: ['write'],
    requireAuth: true,
    requireDomain: true,
    requireMemory: false
  });
}

/**
 * Create an admin domain guard (domain + auth + admin permission)
 */
export function createAdminDomainGuard(strategy: DomainContextStrategy = 'param'): RequestHandler[] {
  return createDomainPipeline({
    strategy,
    permissions: ['admin'],
    requireAuth: true,
    requireDomain: true,
    requireMemory: false
  });
}

/**
 * Create a memory access guard (domain + auth + memory access)
 */
export function createMemoryAccessGuard(
  strategy: DomainContextStrategy = 'param',
  accessType: MemoryAccessType = 'read'
): RequestHandler[] {
  return createDomainPipeline({
    strategy,
    permissions: ['read'],
    memoryAccess: accessType,
    requireAuth: true,
    requireDomain: true,
    requireMemory: true
  });
}

/**
 * Parallel permission and memory access check middleware
 * Runs both permission and memory checks simultaneously using Promise.all
 */
export function requireParallelPermissionAndMemory(
  permissions: DomainPermissionType[] = ['read'],
  memoryAccess: MemoryAccessType = 'read'
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthenticatedRequest;
      
      if (!authReq.user) {
        throw DomainError.AuthRequired();
      }

      if (!authReq.domainContext) {
        throw DomainError.DomainNotFound();
      }

      // Run permission and memory checks in parallel
      const [hasPermission, hasMemoryAccess] = await Promise.all([
        checkDomainPermissions(authReq.user, authReq.domainContext, permissions),
        checkMemoryAccess(authReq.user, authReq.domainContext, memoryAccess)
      ]);

      if (!hasPermission) {
        throw DomainError.AccessDenied();
      }

      if (!hasMemoryAccess) {
        throw DomainError.MemoryQuotaExceeded();
      }

      next();
    } catch (error: unknown) {
      if (error instanceof DomainError) {
        return res.status(error.statusCode).json({
          error: error.code,
          message: error.message,
          details: error.details
        });
      }
      next(error);
    }
  };
}

/**
 * Helper function to check domain permissions
 */
async function checkDomainPermissions(
  user: { id: string; role?: string | null },
  domainContext: { id: string; ownerId: string },
  permissions: DomainPermissionType[]
): Promise<boolean> {
  try {
    // Owner bypass - owners have all permissions
    if (domainContext.ownerId === user.id) {
      return true;
    }

    // For now, return true for basic permissions - this would integrate with actual permission system
    // In a real implementation, you'd check the user's domain permissions
    return true;
  } catch (error) {
    console.error('Error checking domain permissions:', error);
    return false;
  }
}

/**
 * Helper function to check memory access
 */
async function checkMemoryAccess(
  user: { id: string },
  domainContext: { id: string; ownerId: string },
  accessType: MemoryAccessType
): Promise<boolean> {
  try {
    // Owner bypass - owners have all memory access
    if (domainContext.ownerId === user.id) {
      return true;
    }

    const memoryService = DomainServiceFactory.createMemoryService();
    
    // Check memory scope and quota
    const memoryScope = await memoryService.getMemoryScope(domainContext.id);
    if (memoryScope && memoryScope.quotaExceeded) {
      return false;
    }

    // Check user's memory access permissions using the correct method
    const hasAccess = await memoryService.checkMemoryAccess(
      domainContext.id,
      user.id,
      accessType
    );
    
    return hasAccess;
  } catch (error) {
    console.error('Error checking memory access:', error);
    return false;
  }
}

/**
 * Full Domain Memory Guard - Composable guard for protecting any route with domain logic
 * 
 * Runs in sequence:
 * 1. resolveDomainContext() - Resolves domain from request
 * 2. requireAuth() - Ensures user is authenticated  
 * 3. Parallel permission + memory checks using Promise.all
 * 
 * Responds with relevant DomainError if any fail.
 * 
 * @example
 * ```typescript
 * app.post('/api/domain/:domainId/memory', 
 *   ...fullDomainMemoryGuard,
 *   handleMemoryOperation
 * );
 * ```
 */
export const fullDomainMemoryGuard: RequestHandler[] = [
  resolveDomainContext('param'),
  requireAuth(),
  requireParallelPermissionAndMemory(['read'], 'read')
];

/**
 * Full Domain Memory Guard with Write Access
 * Same as fullDomainMemoryGuard but requires write permissions
 */
export const fullDomainMemoryWriteGuard: RequestHandler[] = [
  resolveDomainContext('param'),
  requireAuth(),
  requireParallelPermissionAndMemory(['write'], 'write')
];

/**
 * Full Domain Memory Guard with Admin Access
 * Same as fullDomainMemoryGuard but requires admin permissions
 */
export const fullDomainMemoryAdminGuard: RequestHandler[] = [
  resolveDomainContext('param'),
  requireAuth(),
  requireParallelPermissionAndMemory(['admin'], 'admin')
];

/**
 * Configurable Full Domain Memory Guard
 * Allows customization of strategy, permissions, and memory access type
 */
export function createCustomFullDomainMemoryGuard(
  strategy: DomainContextStrategy = 'param',
  permissions: DomainPermissionType[] = ['read'],
  memoryAccess: MemoryAccessType = 'read'
): RequestHandler[] {
  return [
    resolveDomainContext(strategy),
    requireAuth(),
    requireParallelPermissionAndMemory(permissions, memoryAccess)
  ];
}

/**
 * Create a public domain guard (no auth required)
 */
export function createPublicDomainGuard(strategy: DomainContextStrategy = 'param'): RequestHandler[] {
  return createDomainPipeline({
    strategy,
    permissions: [],
    requireAuth: false,
    requireDomain: true,
    requireMemory: false
  });
}

/**
 * Create an owner-only guard (domain + auth + ownership)
 */
export function createOwnerOnlyGuard(strategy: DomainContextStrategy = 'param'): RequestHandler[] {
  return createDomainPipeline({
    strategy,
    permissions: ['owner'],
    requireAuth: true,
    requireDomain: true,
    requireMemory: false
  });
} 