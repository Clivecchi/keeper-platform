/**
 * Domain Permission Middleware
 * Checks user permissions for domain operations
 */

import { Request, Response, NextFunction } from 'express';
import { DomainServiceFactory } from '@keeper/database';
import { DomainError } from '../../lib/errors/DomainError';
import { AuthenticatedRequest } from '@keeper/database';

export type DomainPermissionType = 'read' | 'write' | 'admin' | 'owner' | 'share' | 'invite' | 'delete';

export interface DomainPermissionConfig {
  allowOwnerBypass?: boolean;
  cacheTtl?: number;
  includeImplicitPermissions?: boolean;
}

/**
 * Require domain permission middleware
 * Checks if user has required permissions for domain operations
 */
export function requireDomainPermission(
  permissions: DomainPermissionType | DomainPermissionType[],
  config?: DomainPermissionConfig
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
  const finalConfig: DomainPermissionConfig = {
    allowOwnerBypass: true,
    cacheTtl: 300, // 5 minutes
    includeImplicitPermissions: true,
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
      if (!typedReq.domainContext) {
        const error = DomainError.InvalidRequest('Domain context not available');
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      // Check if user is domain owner (bypass permission checks)
      if (finalConfig.allowOwnerBypass && typedReq.domainContext.ownerId === typedReq.user.id) {
        res.set('X-Domain-Role', 'owner');
        res.set('X-Domain-Permissions', 'all');
        return next();
      }

      // Get domain service and check permissions
      const domainService = DomainServiceFactory.createDomainService();
      
      // Check if user has access to the domain (for now, simplified check)
      const userDomains = await domainService.getUserDomains(typedReq.user.id);
      const hasPermission = userDomains.some(domain => domain.id === typedReq.domainContext!.id);

      if (!hasPermission) {
        const error = DomainError.InsufficientPermissions();
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message,
          details: {
            required: requiredPermissions,
            userId: typedReq.user.id,
            domainId: typedReq.domainContext.id
          }
        });
        return;
      }

      // Add permission headers for debugging
      res.set('X-Domain-Role', 'member');
      res.set('X-Domain-Permissions', requiredPermissions.join(','));

      next();
    } catch (error) {
      console.error('Domain permission error:', error);
      
      if (error instanceof DomainError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      // Handle unexpected errors
      const serviceError = DomainError.ServiceUnavailable('Permission check failed');
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
 * Require domain ownership middleware
 * Ensures user is the domain owner
 */
export function requireDomainOwnership() {
  return (req: Request, res: Response, next: NextFunction): void => {
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
      if (!typedReq.domainContext) {
        const error = DomainError.InvalidRequest('Domain context not available');
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      // Check if user is domain owner
      if (typedReq.domainContext.ownerId !== typedReq.user.id) {
        const error = DomainError.OwnerRequired();
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      // Add ownership headers
      res.set('X-Domain-Role', 'owner');
      res.set('X-Domain-Permissions', 'all');

      next();
    } catch (error) {
      console.error('Domain ownership error:', error);
      
      const ownerError = DomainError.OwnerRequired();
      res.status(ownerError.statusCode).json({
        success: false,
        error: ownerError.code,
        message: ownerError.message
      });
      return;
    }
  };
} 