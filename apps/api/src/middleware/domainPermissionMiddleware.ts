/**
 * Domain Permission Middleware
 * Handles domain-based access control and permission checking
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@keeper/database';
import { AuthenticatedRequest } from './authMiddleware.js';

const prisma = new PrismaClient();

export type DomainPermissionType = 'read' | 'write' | 'share' | 'admin' | 'invite' | 'delete';

export interface DomainData {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  settings?: unknown;
  limits?: unknown;
  features?: unknown;
  theme?: unknown;
  [key: string]: unknown;
}

export interface DomainContext {
  domain: DomainData;
  isCustomDomain: boolean;
  originalHostname: string;
  resolvedSlug: string;
  permissions?: DomainPermissionType[];
  role?: string;
  isOwner?: boolean;
}

export interface DomainPermissionRequest extends AuthenticatedRequest {
  domainContext?: DomainContext;
}

export interface DomainPermissionConfig {
  allowPublicRead?: boolean;
  requireOwnershipForAdmin?: boolean;
  cacheTtl?: number;
  fallbackPermissions?: DomainPermissionType[];
}

/**
 * Domain Permission Middleware
 * Checks if user has required permissions for domain operations
 */
export class DomainPermissionMiddleware {
  private config: DomainPermissionConfig;

  constructor(config: DomainPermissionConfig = {}) {
    this.config = {
      allowPublicRead: false,
      requireOwnershipForAdmin: true,
      cacheTtl: 300, // 5 minutes
      fallbackPermissions: ['read'],
      ...config,
    };
  }

  /**
   * Create permission check middleware
   */
  checkPermission(requiredPermissions: DomainPermissionType | DomainPermissionType[]) {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    return async (req: DomainPermissionRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Check if domain context exists
        if (!req.domainContext) {
          res.status(400).json({ error: 'Domain context not available' });
          return;
        }

        // Check if user is authenticated for non-public operations
        if (!req.user && !this.config.allowPublicRead) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        // Check permissions
        const hasPermission = await this.hasPermission(req, permissions);
        
        if (!hasPermission) {
          res.status(403).json({ 
            error: 'Insufficient permissions',
            required: permissions,
            current: req.domainContext.permissions || []
          });
          return;
        }

        next();
      } catch (error) {
        console.error('Permission check error:', error);
        res.status(500).json({ error: 'Permission check failed' });
      }
    };
  }

  /**
   * Require domain ownership
   */
  requireOwnership() {
    return async (req: DomainPermissionRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.domainContext) {
          res.status(400).json({ error: 'Domain context not available' });
          return;
        }

        if (!req.user) {
          res.status(401).json({ error: 'Authentication required' });
          return;
        }

        const isOwner = await this.isDomainOwner(req.user.id, req.domainContext.domain);
        
        if (!isOwner) {
          res.status(403).json({ error: 'Domain ownership required' });
          return;
        }

        // Update domain context with ownership info
        req.domainContext = {
          ...req.domainContext,
          permissions: ['read', 'write', 'share', 'admin', 'invite', 'delete'],
          role: 'owner',
          isOwner: true,
        };

        next();
      } catch (error) {
        console.error('Ownership check error:', error);
        res.status(500).json({ error: 'Ownership check failed' });
      }
    };
  }

  /**
   * Load user permissions for domain
   */
  loadPermissions() {
    return async (req: DomainPermissionRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        if (!req.domainContext) {
          res.status(400).json({ error: 'Domain context not available' });
          return;
        }

        // If no user, set public permissions
        if (!req.user) {
          req.domainContext = {
            ...req.domainContext,
            permissions: this.config.allowPublicRead ? ['read'] : [],
            role: 'guest',
            isOwner: false,
          };
          next();
          return;
        }

        // Check if user is domain owner
        const isOwner = await this.isDomainOwner(req.user.id, req.domainContext.domain);
        
        if (isOwner) {
          req.domainContext = {
            ...req.domainContext,
            permissions: ['read', 'write', 'share', 'admin', 'invite', 'delete'],
            role: 'owner',
            isOwner: true,
          };
          next();
          return;
        }

        // Load user permissions from database
        const userPermissions = await this.getUserPermissions(req.user.id, req.domainContext.domain);
        
        req.domainContext = {
          ...req.domainContext,
          permissions: userPermissions.permissions,
          role: userPermissions.role,
          isOwner: false,
        };

        next();
      } catch (error) {
        console.error('Permission loading error:', error);
        res.status(500).json({ error: 'Failed to load permissions' });
      }
    };
  }

  /**
   * Check if user has required permissions
   */
  private async hasPermission(req: DomainPermissionRequest, requiredPermissions: DomainPermissionType[]): Promise<boolean> {
    if (!req.domainContext) {
      return false;
    }

    const userPermissions = req.domainContext.permissions || [];
    
    // Check if user has all required permissions
    return requiredPermissions.every(permission => 
      userPermissions.includes(permission) || 
      (req.domainContext?.isOwner && permission !== 'delete') // Owner has all permissions except delete (which requires explicit permission)
    );
  }

  /**
   * Check if user is domain owner
   */
  private async isDomainOwner(userId: string, domain: DomainData): Promise<boolean> {
    if (!domain) {
      return false;
    }

    return domain.ownerId === userId;
  }

  /**
   * Get user permissions for domain
   */
  private async getUserPermissions(userId: string, domain: DomainData): Promise<{
    permissions: DomainPermissionType[];
    role: string;
  }> {
    if (!domain) {
      return { permissions: [], role: 'guest' };
    }

    try {
      // Check for explicit domain permissions
      const domainPermission = await prisma.domainPermission.findFirst({
        where: {
          domainId: domain.id,
          userId: userId,
        },
      });

      if (domainPermission) {
        return {
          permissions: domainPermission.permissions as DomainPermissionType[],
          role: domainPermission.role,
        };
      }

      // Check for inherited permissions through domain relationships
      const relationshipPermissions = await this.getRelationshipPermissions(userId, domain.id);
      
      return {
        permissions: relationshipPermissions,
        role: 'member',
      };
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return { permissions: [], role: 'guest' };
    }
  }

  /**
   * Get permissions through domain relationships
   */
  private async getRelationshipPermissions(userId: string, domainId: string): Promise<DomainPermissionType[]> {
    try {
      // Check if user has access through keeper relationships
      const keeperAccess = await prisma.keeper.findFirst({
        where: {
          domainId: domainId,
          ownerId: userId,
        },
      });

      if (keeperAccess) {
        return ['read', 'write'];
      }

      // Check if user has access through journey relationships
      const journeyAccess = await prisma.journey.findFirst({
        where: {
          domainId: domainId,
          ownerId: userId,
        },
      });

      if (journeyAccess) {
        return ['read', 'write'];
      }

      // Check if user has access through moment relationships
      const momentAccess = await prisma.moment.findFirst({
        where: {
          domainId: domainId,
          ownerId: userId,
        },
      });

      if (momentAccess) {
        return ['read', 'write'];
      }

      // Check for shared access
      const sharedAccess = await this.getSharedAccess(userId, domainId);
      if (sharedAccess.length > 0) {
        return sharedAccess;
      }

      // Default fallback permissions
      return this.config.fallbackPermissions || [];
    } catch (error) {
      console.error('Error getting relationship permissions:', error);
      return [];
    }
  }

  /**
   * Get shared access permissions
   */
  private async getSharedAccess(userId: string, domainId: string): Promise<DomainPermissionType[]> {
    try {
      // Check cross-domain sharing
      const sharedDomain = await prisma.crossDomainShare.findFirst({
        where: {
          targetDomainId: domainId,
        },
        include: {
          Domain_CrossDomainShare_sourceDomainIdToDomain: true,
        },
      });

      if (sharedDomain) {
        // Check if user has access to source domain
        const sourceAccess = await this.getUserPermissions(userId, sharedDomain.Domain_CrossDomainShare_sourceDomainIdToDomain);
        if (sourceAccess.permissions.includes('read')) {
          return ['read']; // Shared domains typically only allow read access
        }
      }

      return [];
    } catch (error) {
      console.error('Error getting shared access:', error);
      return [];
    }
  }

  /**
   * Grant permission to user
   */
  async grantPermission(
    domainId: string,
    userId: string,
    permissions: DomainPermissionType[],
    role: string,
    grantedBy: string
  ): Promise<void> {
    try {
      await prisma.domainPermission.upsert({
        where: {
          domainId_userId: {
            domainId,
            userId,
          },
        },
        update: {
          permissions,
          role,
          grantedBy,
          grantedAt: new Date(),
        },
        create: {
          domainId,
          userId,
          permissions,
          role,
          grantedBy,
          grantedAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Error granting permission:', error);
      throw error;
    }
  }

  /**
   * Revoke permission from user
   */
  async revokePermission(domainId: string, userId: string): Promise<void> {
    try {
      await prisma.domainPermission.delete({
        where: {
          domainId_userId: {
            domainId,
            userId,
          },
        },
      });
    } catch (error) {
      console.error('Error revoking permission:', error);
      throw error;
    }
  }

  /**
   * Get domain users with their permissions
   */
  async getDomainUsers(domainId: string): Promise<Array<{
    userId: string;
    permissions: DomainPermissionType[];
    role: string;
    isOwner: boolean;
  }>> {
    try {
      const domainPermissions = await prisma.domainPermission.findMany({
        where: {
          domainId,
        },
        include: {
          users_DomainPermission_userIdTousers: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return domainPermissions.map((permission: any) => ({
        userId: permission.userId,
        permissions: permission.permissions as DomainPermissionType[],
        role: permission.role,
        isOwner: false, // Owner is handled separately
      }));
    } catch (error) {
      console.error('Error getting domain users:', error);
      throw error;
    }
  }
}

/**
 * Create domain permission middleware instance
 */
export function createDomainPermissionMiddleware(config?: DomainPermissionConfig): DomainPermissionMiddleware {
  return new DomainPermissionMiddleware(config);
}

/**
 * Common permission check functions
 */
export const domainPermissionMiddleware = new DomainPermissionMiddleware();

export const requireDomainRead = domainPermissionMiddleware.checkPermission('read');
export const requireDomainWrite = domainPermissionMiddleware.checkPermission('write');
export const requireDomainAdmin = domainPermissionMiddleware.checkPermission('admin');
export const requireDomainOwnership = domainPermissionMiddleware.requireOwnership();
export const loadDomainPermissions = domainPermissionMiddleware.loadPermissions();

/**
 * Express-compatible middleware wrappers
 * These work with standard Express Request type and handle internal type conversion.
 *
 * When domainContext is NOT set (e.g., API routes where domain resolution from
 * hostname is skipped), these helpers fall back to resolving the domain from
 * req.params.domainId and checking ownership / DomainPermission table directly.
 */

/**
 * Ensure domainContext exists and user permissions are loaded.
 * If domainContext is missing (hostname resolution skipped), resolves domain
 * from req.params.domainId and populates context + permissions.
 */
async function ensureDomainContext(req: Request, _res: Response): Promise<DomainPermissionRequest> {
  const typed = req as DomainPermissionRequest;

  // If domainContext already has permissions loaded, nothing to do
  if (typed.domainContext?.permissions) {
    return typed;
  }

  // Try to resolve domain from URL params when domainContext is missing or incomplete
  const domainId = req.params?.domainId;
  if (!domainId) {
    return typed; // No domain ID available — downstream middleware will handle the error
  }

  try {
    const domain = await prisma.domain.findUnique({
      where: { id: domainId },
      select: { id: true, name: true, slug: true, ownerId: true, settings: true },
    });

    if (!domain) {
      return typed; // Domain not found — downstream middleware will handle
    }

    const userId = typed.user?.id;
    const isOwner = Boolean(userId && domain.ownerId === userId);

    // Build permissions based on ownership or DomainPermission record
    let permissions: DomainPermissionType[] = [];
    let role = 'guest';

    if (isOwner) {
      permissions = ['read', 'write', 'share', 'admin', 'invite', 'delete'];
      role = 'owner';
    } else if (userId) {
      // Check DomainPermission table
      const perm = await prisma.domainPermission.findFirst({
        where: { domainId: domain.id, userId },
      });
      if (perm) {
        permissions = (perm.permissions ?? []) as DomainPermissionType[];
        role = perm.role ?? 'member';
      } else {
        // Fallback: allow read for authenticated users who own entities in this domain
        const hasRelationship = await prisma.keeper.findFirst({
          where: { domainId: domain.id, ownerId: userId },
          select: { id: true },
        }).then(Boolean).catch(() => false);

        if (hasRelationship) {
          permissions = ['read', 'write'];
          role = 'member';
        } else {
          // Default read for any authenticated user (single-domain MVP)
          permissions = ['read'];
          role = 'viewer';
        }
      }
    }

    typed.domainContext = {
      domain: domain as unknown as DomainData,
      isCustomDomain: false,
      originalHostname: req.get('host') || '',
      resolvedSlug: domain.slug,
      permissions,
      role,
      isOwner,
    };
  } catch (error) {
    console.error('[domainPermission] Failed to resolve domain from params:', error);
  }

  return typed;
}

export const requireDomainReadCompat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const typed = await ensureDomainContext(req, res);
  return requireDomainRead(typed, res, next);
};

export const requireDomainWriteCompat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const typed = await ensureDomainContext(req, res);
  return requireDomainWrite(typed, res, next);
};

export const requireDomainAdminCompat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const typed = await ensureDomainContext(req, res);
  return requireDomainAdmin(typed, res, next);
};

export const requireDomainOwnershipCompat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const typed = await ensureDomainContext(req, res);
  return requireDomainOwnership(typed, res, next);
};

export const loadDomainPermissionsCompat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { addLog } = await import('../utils/LogStore.js');
    addLog('perm-probe-enter', { domainContextExists: !!(req as any).domainContext, params: req.params });
  } catch {}

  // Ensure domainContext is populated from params if not from hostname resolution
  await ensureDomainContext(req, res);

  // If still no domain context (e.g., routes like /my), skip permission loading.
  if (!(req as any).domainContext) {
    return next();
  }

  return loadDomainPermissions(req as DomainPermissionRequest, res, next);
}; 