/**
 * Memory Access Middleware
 * Controls access to SOLE memory based on domain permissions
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@keeper/database';
import { Redis } from 'ioredis';
import { 
  DomainCacheService,
  SoleMemoryIsolationService,
  FeatureFlagService
} from '@keeper/database';

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const cacheService = new DomainCacheService(redis);
const soleMemoryService = new SoleMemoryIsolationService(prisma, cacheService);
const featureFlagService = new FeatureFlagService();

// Basic feature flag service implementation
const getFeatureFlagService = () => ({
  isEnabled: (flag: string, domainId?: string) => {
    switch (flag) {
      case 'sole_memory_isolation':
      case 'memory_access_control':
        return true;
      default:
        return false;
    }
  }
});

// Basic SOLE memory service implementation
const getSoleMemoryService = () => ({
  async checkMemoryAccess(userId: string, memoryId: string, accessType: string) {
    // Basic implementation - enhance based on your needs
    return {
      hasAccess: true,
      accessLevel: 'read' as const,
      restrictions: []
    };
  },
  
  async getMemoryPermissions(userId: string, memoryId: string) {
    return {
      canRead: true,
      canWrite: true,
      canAdmin: false
    };
  }
});

export type MemoryAccessType = 'read' | 'write' | 'admin';

export interface MemoryAccessRequest extends Request {
  user?: {
    id: string;
    email: string | null;
    name?: string | null;
    role?: string | null;
  };
  memoryContext?: {
    memoryId: string;
    accessType: MemoryAccessType;
    permissions: string[];
    domainId?: string;
    memoryScope?: any;
    accessLevel?: string;
    quotaStatus?: {
      current: number;
      max: number;
      percentage: number;
      exceeded: boolean;
    };
    restrictions?: string[];
    allowedCategories?: string[];
  };
}

export interface MemoryAccessConfig {
  requireDomainContext?: boolean;
  minAccessLevel?: 'read' | 'write' | 'admin';
  checkQuota?: boolean;
  enforceIsolation?: boolean;
  allowCrossDomainAccess?: boolean;
  logAccess?: boolean;
}

export class MemoryAccessManager {
  private prisma: PrismaClient;
  private memoryService: SoleMemoryIsolationService;
  private cacheService: DomainCacheService;
  private featureFlags = getFeatureFlagService();

  constructor(
    prisma: PrismaClient,
    memoryService: SoleMemoryIsolationService,
    cacheService: DomainCacheService
  ) {
    this.prisma = prisma;
    this.memoryService = memoryService;
    this.cacheService = cacheService;
  }

  /**
   * Create memory access middleware
   */
  createMiddleware(config: MemoryAccessConfig = {}) {
    const {
      requireDomainContext = true,
      minAccessLevel = 'read',
      checkQuota = true,
      enforceIsolation = true,
      allowCrossDomainAccess = false,
      logAccess = true,
    } = config;

    return async (req: MemoryAccessRequest, res: Response, next: NextFunction) => {
      try {
        // Check if memory isolation is enabled
        if (!this.featureFlags.isEnabled('SOLE_MEMORY_ISOLATION')) {
          return next();
        }

        // Extract domain context
        const domainId = this.extractDomainId(req);
        if (requireDomainContext && !domainId) {
          return res.status(400).json({
            success: false,
            error: 'Domain context is required for memory operations',
          });
        }

        // Extract user context
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({
            success: false,
            error: 'Authentication required for memory access',
          });
        }

        // Get memory scope
        let memoryScope: any = null;
        if (domainId) {
          try {
            memoryScope = await this.memoryService.getMemoryScope(domainId);
          } catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
              // Initialize memory scope if it doesn't exist
              memoryScope = await this.memoryService.initializeMemoryScope(domainId, userId);
            } else {
              throw error;
            }
          }
        }

        // Check access permissions
        const accessLevel = await this.determineAccessLevel(domainId!, userId, memoryScope);
        if (!this.hasRequiredAccess(accessLevel, minAccessLevel)) {
          return res.status(403).json({
            success: false,
            error: `Insufficient memory access permissions. Required: ${minAccessLevel}, Current: ${accessLevel}`,
          });
        }

        // Check quota if required
        let quotaStatus = null;
        if (checkQuota && domainId) {
          quotaStatus = await this.checkQuotaStatus(domainId);
          if (quotaStatus.exceeded && req.method !== 'GET') {
            return res.status(429).json({
              success: false,
              error: 'Memory quota exceeded',
              quota: quotaStatus,
            });
          }
        }

        // Enforce isolation if required
        if (enforceIsolation) {
          const isolationCheck = await this.checkIsolationCompliance(req, domainId!, allowCrossDomainAccess);
          if (!isolationCheck.compliant) {
            return res.status(403).json({
              success: false,
              error: 'Memory isolation violation detected',
              details: isolationCheck.violations,
            });
          }
        }

        // Determine allowed categories and restrictions
        const allowedCategories = this.getAllowedCategories(memoryScope, accessLevel);
        const restrictions = this.getAccessRestrictions(memoryScope, userId);

        // Set memory context
        req.memoryContext = {
          memoryId: domainId! + '_memory',
          accessType: minAccessLevel as MemoryAccessType,
          permissions: allowedCategories,
          domainId: domainId!,
          memoryScope,
          accessLevel,
          quotaStatus: quotaStatus || {
            current: 0,
            max: 0,
            percentage: 0,
            exceeded: false,
          },
          restrictions,
          allowedCategories,
        };

        // Log access if required
        if (logAccess && domainId) {
          await this.logMemoryAccess(req, domainId, userId, accessLevel);
        }

        // Add memory headers
        this.addMemoryHeaders(res, req.memoryContext);

        next();
      } catch (error) {
        console.error('Memory access middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Memory access check failed',
        });
      }
    };
  }

  /**
   * Middleware specifically for cross-domain memory operations
   */
  createCrossDomainMiddleware() {
    return async (req: MemoryAccessRequest, res: Response, next: NextFunction) => {
      try {
        const sourceDomainId = req.params.sourceDomainId || req.body.sourceDomainId;
        const targetDomainId = req.params.targetDomainId || req.body.targetDomainId;
        const userId = req.user?.id;

        if (!sourceDomainId || !targetDomainId || !userId) {
          return res.status(400).json({
            success: false,
            error: 'Source domain, target domain, and user context required',
          });
        }

        // Check permissions on both domains
        const [sourceAccess, targetAccess] = await Promise.all([
          this.memoryService.checkMemoryAccess(sourceDomainId, userId, 'admin'),
          this.memoryService.checkMemoryAccess(targetDomainId, userId, 'read'),
        ]);

        if (!sourceAccess) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions on source domain',
          });
        }

        if (!targetAccess) {
          return res.status(403).json({
            success: false,
            error: 'Insufficient permissions on target domain',
          });
        }

        // Check cross-domain sharing policies
        const crossDomainCheck = await this.validateCrossDomainOperation(
          sourceDomainId,
          targetDomainId,
          req.method,
          req.body
        );

        if (!crossDomainCheck.allowed) {
          return res.status(403).json({
            success: false,
            error: 'Cross-domain operation not allowed',
            reason: crossDomainCheck.reason,
          });
        }

        // Set cross-domain context
        req.memoryContext = {
          ...req.memoryContext,
          crossDomain: {
            sourceDomainId,
            targetDomainId,
            operation: req.method,
            restrictions: crossDomainCheck.restrictions,
          },
        } as any;

        next();
      } catch (error) {
        console.error('Cross-domain memory middleware error:', error);
        res.status(500).json({
          success: false,
          error: 'Cross-domain memory access check failed',
        });
      }
    };
  }

  /**
   * Extract domain ID from request
   */
  private extractDomainId(req: Request): string | null {
    // Try various sources for domain ID
    return (
      req.params.domainId ||
      req.body.domainId ||
      req.headers['x-domain-id'] as string ||
      req.domainContext?.domain?.id ||
      null
    );
  }

  /**
   * Determine user's access level for domain memory
   */
  private async determineAccessLevel(
    domainId: string,
    userId: string,
    memoryScope: any
  ): Promise<'read' | 'write' | 'admin' | 'none'> {
    if (!memoryScope) return 'none';

    // Check admin access first
    if (await this.memoryService.checkMemoryAccess(domainId, userId, 'admin')) {
      return 'admin';
    }

    // Check write access
    if (await this.memoryService.checkMemoryAccess(domainId, userId, 'write')) {
      return 'write';
    }

    // Check read access
    if (await this.memoryService.checkMemoryAccess(domainId, userId, 'read')) {
      return 'read';
    }

    return 'none';
  }

  /**
   * Check if user has required access level
   */
  private hasRequiredAccess(
    userAccess: string,
    requiredAccess: string
  ): boolean {
    const accessLevels = ['none', 'read', 'write', 'admin'];
    const userLevel = accessLevels.indexOf(userAccess);
    const requiredLevel = accessLevels.indexOf(requiredAccess);
    return userLevel >= requiredLevel;
  }

  /**
   * Check quota status for domain
   */
  private async checkQuotaStatus(domainId: string): Promise<{
    current: number;
    max: number;
    percentage: number;
    exceeded: boolean;
  }> {
    try {
      const quota = await this.memoryService.getMemoryQuota(domainId);
      return {
        current: quota.currentMemorySize,
        max: quota.maxMemorySize,
        percentage: quota.usagePercentage,
        exceeded: quota.usagePercentage >= 100,
      };
    } catch (error) {
      console.error('Error checking quota status:', error);
      return {
        current: 0,
        max: 0,
        percentage: 0,
        exceeded: false,
      };
    }
  }

  /**
   * Check isolation compliance
   */
  private async checkIsolationCompliance(
    req: Request,
    domainId: string,
    allowCrossDomainAccess: boolean
  ): Promise<{ compliant: boolean; violations: string[] }> {
    const violations: string[] = [];

    // Check for cross-domain references in request body
    if (req.body) {
      const crossDomainRefs = this.findCrossDomainReferences(req.body, domainId);
      if (crossDomainRefs.length > 0 && !allowCrossDomainAccess) {
        violations.push(`Cross-domain references detected: ${crossDomainRefs.join(', ')}`);
      }
    }

    // Check for invalid memory scope access
    const requestedScope = req.body.memoryScope || req.params.memoryScope;
    if (requestedScope && requestedScope !== domainId) {
      violations.push(`Invalid memory scope access: ${requestedScope}`);
    }

    return {
      compliant: violations.length === 0,
      violations,
    };
  }

  /**
   * Find cross-domain references in data
   */
  private findCrossDomainReferences(data: any, currentDomainId: string): string[] {
    const references: string[] = [];
    
    function traverse(obj: any, path: string = '') {
      if (typeof obj === 'string' && obj.length === 36 && obj.includes('-')) {
        // Potential UUID reference
        if (obj !== currentDomainId && obj.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          references.push(`${path}: ${obj}`);
        }
      } else if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          traverse(value, path ? `${path}.${key}` : key);
        }
      }
    }

    traverse(data);
    return references;
  }

  /**
   * Get allowed memory categories for user
   */
  private getAllowedCategories(memoryScope: any, accessLevel: string): string[] {
    const allCategories = ['conversational', 'factual', 'procedural', 'episodic', 'semantic'];
    
    // Admin and write access get all categories
    if (accessLevel === 'admin' || accessLevel === 'write') {
      return allCategories;
    }

    // Read access gets limited categories
    if (accessLevel === 'read') {
      return ['conversational', 'factual', 'procedural'];
    }

    return [];
  }

  /**
   * Get access restrictions for user
   */
  private getAccessRestrictions(memoryScope: any, userId: string): string[] {
    const restrictions: string[] = [];

    if (!memoryScope) {
      restrictions.push('No memory scope available');
      return restrictions;
    }

    // Check isolation level
    if (memoryScope.isolationLevel === 'strict') {
      restrictions.push('Strict isolation mode - no cross-domain access');
    }

    // Check cross-domain settings
    if (!memoryScope.allowCrossDomain) {
      restrictions.push('Cross-domain access disabled');
    }

    // Check quota status
    const usagePercentage = (memoryScope.currentMemorySize / memoryScope.maxMemorySize) * 100;
    if (usagePercentage > 90) {
      restrictions.push('Memory quota near limit - write operations may be restricted');
    }

    return restrictions;
  }

  /**
   * Validate cross-domain operation
   */
  private async validateCrossDomainOperation(
    sourceDomainId: string,
    targetDomainId: string,
    method: string,
    body: any
  ): Promise<{ allowed: boolean; reason?: string; restrictions?: string[] }> {
    try {
      // Get memory scopes for both domains
      const [sourceScope, targetScope] = await Promise.all([
        this.memoryService.getMemoryScope(sourceDomainId),
        this.memoryService.getMemoryScope(targetDomainId),
      ]);

      // Check if source allows cross-domain operations
      if (!sourceScope.allowCrossDomain) {
        return {
          allowed: false,
          reason: 'Source domain does not allow cross-domain operations',
        };
      }

      // Check isolation levels
      if (sourceScope.isolationLevel === 'strict' || targetScope.isolationLevel === 'strict') {
        return {
          allowed: false,
          reason: 'Strict isolation mode prevents cross-domain operations',
        };
      }

      // Check for existing share agreement
      const existingShare = await this.prisma.memoryShare.findFirst({
        where: {
          sourceMemoryId: sourceDomainId,
          targetMemoryId: targetDomainId,
          status: 'approved',
        },
      });

      if (!existingShare && method !== 'GET') {
        return {
          allowed: false,
          reason: 'No approved memory share agreement exists',
        };
      }

      // Validate share permissions
      if (existingShare) {
        const restrictions = this.validateSharePermissions(existingShare, method, body);
        if (restrictions.length > 0) {
          return {
            allowed: false,
            reason: 'Share agreement restrictions violated',
            restrictions,
          };
        }
      }

      return { allowed: true };
    } catch (error) {
      console.error('Error validating cross-domain operation:', error);
      return {
        allowed: false,
        reason: 'Failed to validate cross-domain operation',
      };
    }
  }

  /**
   * Validate share agreement permissions
   */
  private validateSharePermissions(shareAgreement: any, method: string, body: any): string[] {
    const violations: string[] = [];

    // Check share type restrictions
    if (shareAgreement.shareType === 'read_only' && method !== 'GET') {
      violations.push('Share agreement only allows read operations');
    }

    // Check expiration
    if (shareAgreement.expiresAt && new Date() > shareAgreement.expiresAt) {
      violations.push('Share agreement has expired');
    }

    // Check access limits
    if (shareAgreement.maxAccess && shareAgreement.currentAccess >= shareAgreement.maxAccess) {
      violations.push('Share agreement access limit exceeded');
    }

    // Check memory categories
    if (body.category && !shareAgreement.memoryCategories.includes(body.category)) {
      violations.push(`Memory category '${body.category}' not allowed by share agreement`);
    }

    return violations;
  }

  /**
   * Log memory access
   */
  private async logMemoryAccess(
    req: Request,
    domainId: string,
    userId: string,
    accessLevel: string
  ): Promise<void> {
    try {
      const operation = `${req.method.toLowerCase()}_${req.route?.path?.split('/').pop() || 'unknown'}`;
      
      await this.prisma.memoryAccess.create({
        data: {
          memoryId: domainId,
          userId,
          accessType: accessLevel as any,
          operation,
          requestSource: 'api',
          sessionId: (req as any).sessionId || 'unknown',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          accessGranted: true,
          timestamp: new Date(),
          memoryCategory: 'general',
        },
      });
    } catch (error) {
      console.error('Failed to log memory access:', error);
    }
  }

  /**
   * Add memory-related headers to response
   */
  private addMemoryHeaders(res: Response, memoryContext: any): void {
    res.setHeader('X-Memory-Domain', memoryContext.domainId);
    res.setHeader('X-Memory-Access-Level', memoryContext.accessLevel);
    res.setHeader('X-Memory-Quota-Usage', `${memoryContext.quotaStatus.percentage}%`);
    
    if (memoryContext.restrictions.length > 0) {
      res.setHeader('X-Memory-Restrictions', memoryContext.restrictions.join(', '));
    }
    
    if (memoryContext.allowedCategories.length > 0) {
      res.setHeader('X-Memory-Categories', memoryContext.allowedCategories.join(', '));
    }
  }
}

/**
 * Factory function to create memory access middleware
 */
export function createMemoryAccessMiddleware(
  config?: MemoryAccessConfig
): (req: MemoryAccessRequest, res: Response, next: NextFunction) => Promise<void> {
  const prisma = new PrismaClient();
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  const cacheService = new DomainCacheService(redis);
  const memoryService = new SoleMemoryIsolationService(prisma, cacheService);
  
  const manager = new MemoryAccessManager(prisma, memoryService, cacheService);
  return manager.createMiddleware(config);
}

/**
 * Factory function to create cross-domain memory middleware
 */
export function createCrossDomainMemoryMiddleware(): (
  req: MemoryAccessRequest,
  res: Response,
  next: NextFunction
) => Promise<void> {
  const prisma = new PrismaClient();
  const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  const cacheService = new DomainCacheService(redis);
  const memoryService = new SoleMemoryIsolationService(prisma, cacheService);
  
  const manager = new MemoryAccessManager(prisma, memoryService, cacheService);
  return manager.createCrossDomainMiddleware();
}

export default MemoryAccessManager; 