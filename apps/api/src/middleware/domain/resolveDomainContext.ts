/**
 * Domain Context Resolution Middleware
 * Resolves domain context from request using various strategies
 */

import { Request, Response, NextFunction } from 'express';
import { DomainServiceFactory } from '@keeper/database';
import { DomainError } from '../../lib/errors/DomainError.js';
import { AuthenticatedRequest } from '@keeper/database';
import { extractDomainId } from './utils.js';

export type DomainContextStrategy = 'param' | 'subdomain' | 'header' | 'query';

export interface DomainResolutionConfig {
  strategy: DomainContextStrategy;
  required?: boolean;
  fallbackStrategy?: DomainContextStrategy;
}

/**
 * Resolve domain context middleware
 * Adds domain context to request based on strategy
 */
export function resolveDomainContext(
  strategy: DomainContextStrategy = 'param',
  config?: Partial<DomainResolutionConfig>
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const finalConfig: DomainResolutionConfig = {
    strategy,
    required: true,
    ...config
  };

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Extract domain ID using primary strategy
      let domainId = extractDomainId(req, finalConfig.strategy);

      // Try fallback strategy if primary fails
      if (!domainId && finalConfig.fallbackStrategy) {
        domainId = extractDomainId(req, finalConfig.fallbackStrategy);
      }

      // Handle missing domain ID
      if (!domainId) {
        if (finalConfig.required) {
          const error = DomainError.InvalidRequest('Domain ID is required');
          res.status(error.statusCode).json({
            success: false,
            error: error.code,
            message: error.message
          });
          return;
        }
        // If not required, continue without domain context
        return next();
      }

      // Validate domain ID format
      if (!isValidDomainId(domainId)) {
        const error = DomainError.InvalidDomainId(domainId);
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      // Get domain service and resolve domain
      const domainService = DomainServiceFactory.createDomainService();
      
      // Use the correct method name from the interface
      const domain = await domainService.getDomainById(domainId);

      if (!domain) {
        const error = DomainError.DomainNotFound();
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      // Check domain status
      if ((domain as any).status !== 'active') {
        res.status(400).json({
          success: false,
          error: 'Domain is not active',
        });
        return;
      }

      // Set domain context
      (req as any).domainContext = {
        id: (domain as any).id,
        name: (domain as any).name,
        ownerId: (domain as any).ownerId,
        settings: (domain as any).settings || {},
      };

      // Set response headers
      res.set('X-Domain-Id', (domain as any).id);
      res.set('X-Domain-Name', (domain as any).name);
      res.set('X-Domain-Strategy', finalConfig.strategy);

      next();
    } catch (error) {
      console.error('Domain resolution error:', error);
      
      if (error instanceof DomainError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      // Handle unexpected errors
      const serviceError = DomainError.ServiceUnavailable('Domain resolution failed');
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
 * Validate domain ID format (UUID v4)
 */
function isValidDomainId(domainId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(domainId);
} 