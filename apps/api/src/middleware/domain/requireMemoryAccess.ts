/**
 * Memory Access Middleware
 * Controls access to domain memory based on permissions and quotas
 */

import { Request, Response, NextFunction } from 'express';
import { DomainServiceFactory } from '@keeper/database';
import { DomainError } from '../../lib/errors/DomainError.js';
import { AuthenticatedRequest } from '@keeper/database';

export type MemoryAccessType = 'read' | 'write' | 'admin';

export interface MemoryAccessConfig {
  checkQuota?: boolean;
  quotaBypass?: boolean;
  logAccess?: boolean;
  requireDomainContext?: boolean;
}

/**
 * Require memory access middleware
 * Checks if user has access to domain memory
 */
export function requireMemoryAccess(
  accessType: MemoryAccessType = 'read',
  config?: MemoryAccessConfig
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const finalConfig: MemoryAccessConfig = {
    checkQuota: true,
    quotaBypass: false,
    logAccess: true,
    requireDomainContext: true,
    ...config
  };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const typedReq = req as AuthenticatedRequest;

      // Check if user is authenticated
      if (!typedReq.user) {
        const error = DomainError.AuthRequired();
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      // Check if domain context exists
      if (finalConfig.requireDomainContext && !typedReq.domainContext) {
        const error = DomainError.InvalidRequest('Domain context required for memory access');
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      const domainId = typeof typedReq.domainContext?.domain.id === 'string' ? typedReq.domainContext.domain.id : '';
      if (!domainId) {
        const error = DomainError.InvalidRequest('Domain ID required for memory access');
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      // Get memory service
      const memoryService = DomainServiceFactory.createMemoryService();

      // Check if user has memory access using the correct method
      const hasAccess = await memoryService.checkMemoryAccess(
        domainId,
        typedReq.user.id,
        accessType
      );

      if (!hasAccess) {
        const error = DomainError.MemoryAccessDenied(domainId);
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      // Check quota if enabled and not bypassed
      if (finalConfig.checkQuota && !finalConfig.quotaBypass) {
        try {
          const memoryScope = await memoryService.getMemoryScope(domainId);
          
          // Check if quota is exceeded for write operations
          if (memoryScope && (memoryScope as any).quotaExceeded && (accessType === 'write' || accessType === 'admin')) {
            res.status(429).json({
              success: false,
              error: 'Memory quota exceeded',
            });
            return;
          }

          // Set quota headers
          if (memoryScope) {
            res.set('X-Memory-Quota-Used', (memoryScope as any).usage?.toString() || '0');
            res.set('X-Memory-Quota-Max', (memoryScope as any).maxUsage?.toString() || '0');
            res.set('X-Memory-Quota-Exceeded', (memoryScope as any).quotaExceeded?.toString() || 'false');
          }
        } catch (quotaError) {
          console.error('Memory quota check error:', quotaError);
          // Continue if quota check fails, but log the error
        }
      }

      // Log access if enabled
      if (finalConfig.logAccess) {
        await logMemoryAccess(
          typedReq.user.id,
          domainId,
          accessType,
          req.method,
          req.originalUrl
        );
      }

      // Add memory access headers
      res.set('X-Memory-Access-Type', accessType);
      res.set('X-Memory-Access-Level', hasAccess ? accessType : 'none');

      next();
    } catch (error) {
      console.error('Memory access error:', error);
      
      if (error instanceof DomainError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      // Handle unexpected errors
      const serviceError = DomainError.ServiceUnavailable('Memory access check failed');
      res.status(serviceError.statusCode).json({
        success: false,
        error: serviceError.code,
        message: serviceError.message
      });
      return;
    }
  };
}

/**
 * Log memory access for audit trail
 */
async function logMemoryAccess(
  userId: string,
  domainId: string,
  accessType: MemoryAccessType,
  method: string,
  url: string
): Promise<void> {
  try {
    // Get context service for logging
    const contextService = DomainServiceFactory.createDomainContextService(domainId);
    
    const accessLog = {
      userId,
      domainId,
      accessType,
      method,
      url,
      timestamp: new Date().toISOString()
    };

    // Store in domain-scoped log
    await contextService.set(`memory_access_log:${Date.now()}`, accessLog, 86400); // 24 hours TTL
  } catch (error) {
    console.error('Memory access logging error:', error);
    // Don't fail request if logging fails
  }
} 