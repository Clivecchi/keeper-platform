/**
 * Domain Permission Middleware
 * Validates domain permissions for API requests and adds domain context
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@keeper/database';
import { Redis } from 'ioredis';
import { 
  DomainPermissionService, 
  DomainService, 
  DomainCacheService,
  DomainResolutionService,
  type DomainPermissionType
} from '@keeper/database';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const cacheService = new DomainCacheService(redis);
const domainService = new DomainService(prisma, cacheService);
const permissionService = new DomainPermissionService(prisma, cacheService);
const resolutionService = new DomainResolutionService(domainService, cacheService);

// Create a basic resolution service implementation
const resolutionService = {
  async resolveDomain(hostname: string) {
    // Simple hostname-based resolution
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      return { domain: null, isCustomDomain: false };
    }
    
    // Try to find domain by custom domain
    const domain = await domainService.getDomainByHostname(hostname);
    return { 
      domain, 
      isCustomDomain: !!domain?.customDomain,
      originalHostname: hostname,
      resolvedSlug: domain?.slug || ''
    };
  }
};

export interface DomainAuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  domainContext?: {
    domain: any;
    permissions: DomainPermissionType[];
    role: string;
    isOwner: boolean;
  };
}

export interface DomainPermissionOptions {
  requiredPermission?: DomainPermissionType;
  allowOwnerBypass?: boolean;
  domainIdParam?: string; // Parameter name for domain ID (e.g., 'domainId', 'id')
  contentType?: 'keeper' | 'journey' | 'moment' | 'general';
  optional?: boolean; // Don't fail if no domain context
}

/**
 * Middleware to establish domain context for requests
 */
export const domainContextMiddleware = async (
  req: DomainAuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Get domain from various sources
    let domainId: string | undefined;
    
    // 1. Check URL parameters
    domainId = req.params.domainId || req.params.id;
    
    // 2. Check query parameters
    if (!domainId) {
      domainId = req.query.domainId as string;
    }
    
    // 3. Check request body
    if (!domainId && req.body) {
      domainId = req.body.domainId;
    }
    
    // 4. Check domain resolution from hostname
    if (!domainId) {
      const hostname = req.headers.host || req.headers['x-forwarded-host'] as string;
      if (hostname) {
        const resolution = await resolutionService.resolveDomain(hostname);
        if (resolution.domain) {
          domainId = resolution.domain.id;
        }
      }
    }

    // If no domain found, continue without domain context
    if (!domainId) {
      return next();
    }

    // Get domain and user permissions
    const domain = await domainService.getDomainById(domainId);
    if (!domain) {
      return next();
    }

    // Check user permissions for this domain
    const permissionResult = await permissionService.checkPermission({
      userId: req.user.id,
      domainId: domain.id,
      permission: 'read', // Base permission check
    });

    // Add domain context to request
    req.domainContext = {
      domain,
      permissions: permissionResult.permissions,
      role: permissionResult.role || 'none',
      isOwner: domain.ownerId === req.user.id,
    };

    next();
  } catch (error) {
    console.error('Error in domain context middleware:', error);
    next(); // Continue without domain context on error
  }
};

/**
 * Middleware to check specific domain permissions
 */
export const requireDomainPermission = (options: DomainPermissionOptions = {}) => {
  return async (req: DomainAuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const {
        requiredPermission = 'read',
        allowOwnerBypass = true,
        domainIdParam = 'domainId',
        contentType = 'general',
        optional = false,
      } = options;

      // Get domain ID from request
      let domainId: string | undefined;
      
      if (domainIdParam === 'id') {
        domainId = req.params.id;
      } else {
        domainId = req.params[domainIdParam] || req.query[domainIdParam] as string;
      }

      // Check if domain context was established
      if (!domainId && !req.domainContext) {
        if (optional) {
          return next();
        }
        return res.status(400).json({ 
          error: 'Domain context required',
          code: 'DOMAIN_REQUIRED'
        });
      }

      // Use domain from context if available
      if (req.domainContext && !domainId) {
        domainId = req.domainContext.domain.id;
      }

      // Get or verify domain
      let domain = req.domainContext?.domain;
      if (!domain && domainId) {
        domain = await domainService.getDomainById(domainId);
        if (!domain) {
          return res.status(404).json({ 
            error: 'Domain not found',
            code: 'DOMAIN_NOT_FOUND'
          });
        }
      }

      // Check if user is domain owner (bypass permission check)
      if (allowOwnerBypass && domain?.ownerId === req.user.id) {
        req.domainContext = {
          domain,
          permissions: ['read', 'write', 'share', 'admin', 'invite', 'delete'],
          role: 'admin',
          isOwner: true,
        };
        return next();
      }

      // Check specific permission
      const permissionResult = await permissionService.checkPermission({
        userId: req.user.id,
        domainId: domain.id,
        permission: requiredPermission,
      });

      if (!permissionResult.hasPermission) {
        return res.status(403).json({ 
          error: `Insufficient ${contentType} permissions`,
          code: 'INSUFFICIENT_PERMISSIONS',
          required: requiredPermission,
          current: permissionResult.permissions,
        });
      }

      // Add or update domain context
      req.domainContext = {
        domain,
        permissions: permissionResult.permissions,
        role: permissionResult.role || 'none',
        isOwner: domain.ownerId === req.user.id,
      };

      next();
    } catch (error) {
      console.error('Error in domain permission middleware:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

/**
 * Middleware to check permissions for content within a domain
 */
export const requireContentPermission = (
  contentType: 'keeper' | 'journey' | 'moment',
  permission: DomainPermissionType = 'read'
) => {
  return async (req: DomainAuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const contentId = req.params.id;
      if (!contentId) {
        return res.status(400).json({ 
          error: 'Content ID required',
          code: 'CONTENT_ID_REQUIRED'
        });
      }

      // Get content and its domain
      let content: any;
      let domainId: string;

      switch (contentType) {
        case 'keeper':
          content = await prisma.keeper.findUnique({
            where: { id: contentId },
            select: { id: true, domainId: true, userId: true, name: true }
          });
          break;
        case 'journey':
          content = await prisma.journey.findUnique({
            where: { id: contentId },
            select: { id: true, domainId: true, userId: true, title: true }
          });
          break;
        case 'moment':
          content = await prisma.moment.findUnique({
            where: { id: contentId },
            select: { id: true, domainId: true, userId: true, title: true }
          });
          break;
      }

      if (!content) {
        return res.status(404).json({ 
          error: `${contentType} not found`,
          code: 'CONTENT_NOT_FOUND'
        });
      }

      if (!content.domainId) {
        return res.status(400).json({ 
          error: `${contentType} not associated with domain`,
          code: 'CONTENT_NO_DOMAIN'
        });
      }

      domainId = content.domainId;

      // Check if user owns the content (bypass domain permission check)
      if (content.userId === req.user.id) {
        const domain = await domainService.getDomainById(domainId);
        req.domainContext = {
          domain,
          permissions: ['read', 'write', 'share', 'admin', 'invite', 'delete'],
          role: 'admin',
          isOwner: domain?.ownerId === req.user.id,
        };
        return next();
      }

      // Check domain permission
      const permissionResult = await permissionService.checkPermission({
        userId: req.user.id,
        domainId,
        permission,
      });

      if (!permissionResult.hasPermission) {
        return res.status(403).json({ 
          error: `Insufficient permissions for ${contentType}`,
          code: 'INSUFFICIENT_CONTENT_PERMISSIONS',
          required: permission,
          current: permissionResult.permissions,
        });
      }

      // Add domain context
      const domain = await domainService.getDomainById(domainId);
      req.domainContext = {
        domain,
        permissions: permissionResult.permissions,
        role: permissionResult.role || 'none',
        isOwner: domain?.ownerId === req.user.id,
      };

      next();
    } catch (error) {
      console.error('Error in content permission middleware:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        code: 'CONTENT_PERMISSION_ERROR'
      });
    }
  };
};

/**
 * Middleware to filter query results by domain permissions
 */
export const domainScopedQuery = (defaultScope: 'user' | 'domain' | 'public' = 'user') => {
  return async (req: DomainAuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user.id;
      
      // Get user's domains
      const userDomains = await domainService.getUserDomains(userId);
      const domainIds = userDomains.map(d => d.id);

      // Add domain scope to request for use in route handlers
      req.domainScope = {
        userDomains: domainIds,
        defaultScope,
        canAccessDomain: async (domainId: string) => {
          const result = await permissionService.checkPermission({
            userId,
            domainId,
            permission: 'read',
          });
          return result.hasPermission;
        },
      };

      next();
    } catch (error) {
      console.error('Error in domain scoped query middleware:', error);
      next(); // Continue without domain scope on error
    }
  };
};

/**
 * Utility function to check if user can access multiple domains
 */
export const checkMultipleDomainAccess = async (
  userId: string,
  domainIds: string[],
  permission: DomainPermissionType = 'read'
): Promise<Map<string, boolean>> => {
  const results = new Map<string, boolean>();
  
  const checks = domainIds.map(domainId => ({
    userId,
    domainId,
    permission,
  }));

  const permissionResults = await permissionService.checkPermissions(checks);
  
  checks.forEach(check => {
    const key = `${check.userId}:${check.domainId}:${check.permission}`;
    const result = permissionResults.get(key);
    results.set(check.domainId, result?.hasPermission || false);
  });

  return results;
};

/**
 * Utility function to filter content by domain permissions
 */
export const filterContentByDomainPermissions = async <T extends { domainId: string }>(
  content: T[],
  userId: string,
  permission: DomainPermissionType = 'read'
): Promise<T[]> => {
  if (content.length === 0) return content;

  const domainIds = [...new Set(content.map(item => item.domainId))];
  const accessMap = await checkMultipleDomainAccess(userId, domainIds, permission);

  return content.filter(item => accessMap.get(item.domainId) === true);
};

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      domainScope?: {
        userDomains: string[];
        defaultScope: 'user' | 'domain' | 'public';
        canAccessDomain: (domainId: string) => Promise<boolean>;
      };
    }
  }
}

export default {
  domainContextMiddleware,
  requireDomainPermission,
  requireContentPermission,
  domainScopedQuery,
  checkMultipleDomainAccess,
  filterContentByDomainPermissions,
}; 