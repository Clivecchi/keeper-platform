/**
 * Domain Service
 * Core CRUD operations for domain management with validation and caching
 */

import { PrismaClient, Prisma } from '@prisma/client';
import type { Domain, DomainPermission } from '@prisma/client';
import { SlugValidationService } from './SlugValidationService.js';
import { DomainCacheService } from './DomainCacheService.js';
import { getFeatureFlagService } from './FeatureFlagService.js';

// Define the Domain with includes type using Prisma-derived types
export type DomainWithIncludes = Prisma.DomainGetPayload<{
  include: {
    keepers: true;
    journeys: true;
    DomainPermission: true;
  };
}>;

export interface CreateDomainRequest {
  name: string;
  slug?: string;
  description?: string;
  isPublic?: boolean;
  allowRequests?: boolean;
  categories?: string[];
  customDomain?: string;
  ownerId: string;
  features?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  theme?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export interface UpdateDomainRequest {
  name?: string;
  description?: string;
  isPublic?: boolean;
  allowRequests?: boolean;
  categories?: string[];
  customDomain?: string;
  customDomainVerified?: boolean;
  isActive?: boolean;
  /**
   * Domain status string, e.g., 'active', 'suspended', 'archived'.
   * Included to allow admin-level APIs to update suspension status.
   */
  status?: string;
  features?: Record<string, unknown>;
  limits?: Record<string, unknown>;
  theme?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

// Add alias for backward compatibility
export type DomainUpdateRequest = UpdateDomainRequest;

export interface DomainSearchFilters {
  ownerId?: string;
  isPublic?: boolean;
  status?: string;
  isActive?: boolean;
  categories?: string[];
  search?: string; // Search in name, description, slug
}

export interface DomainVerificationRequest {
  domainId: string;
  method: 'DNS_TXT' | 'CNAME' | 'FILE';
}

export interface DomainWithPermissions extends Domain {
  DomainPermission?: DomainPermission[];
}

export interface DomainEvent {
  ownerId?: string;
  isPublic?: boolean;
  status?: string;
  isActive?: boolean;
  categories?: { hasSome: string[] };
  OR?: Array<{ name?: { contains: string; mode: string }; description?: { contains: string; mode: string }; slug?: { contains: string; mode: string } }>;
}

export class DomainService {
  private prisma: PrismaClient;
  private cacheService: DomainCacheService;
  private featureFlags = getFeatureFlagService();

  constructor(prisma: PrismaClient, cacheService: DomainCacheService) {
    this.prisma = prisma;
    this.cacheService = cacheService;
  }

  /**
   * Create a new domain with validation
   */
  async createDomain(request: CreateDomainRequest): Promise<Domain> {
    // Feature flag check
    if (!this.featureFlags.isEnabled('DOMAIN_LAYER_ENABLED')) {
      throw new Error('Domain functionality is currently disabled');
    }

    // Validate and sanitize slug
    const { slug: finalSlug, validation } = SlugValidationService.validateAndSanitize(
      request.slug || request.name
    );

    if (!validation.isValid) {
      throw new Error(`Invalid slug: ${validation.reason}`);
    }

    // Check for slug conflicts
    const existingDomain = await this.getDomainBySlug(finalSlug);
    if (existingDomain) {
      throw new Error(`Domain with slug "${finalSlug}" already exists`);
    }

    // Validate custom domain if provided
    if (request.customDomain) {
      if (!this.featureFlags.isEnabled('CUSTOM_DOMAINS_ENABLED')) {
        throw new Error('Custom domains are currently disabled');
      }
      await this.validateCustomDomain(request.customDomain);
    }

    // Apply default limits and features
    const defaultLimits = { max_keepers: 50, max_users: 10 };
    const defaultFeatures = { kip_enabled: true, custom_themes: false };

    try {
      const domain = await this.prisma.domain.create({
        data: {
          name: request.name,
          slug: finalSlug,
          description: request.description,
          isPublic: request.isPublic ?? false,
          allowRequests: request.allowRequests ?? false,
          categories: request.categories ?? [],
          customDomain: request.customDomain,
          customDomainVerified: false,
          ownerId: request.ownerId,
          status: 'active',
          features: JSON.parse(JSON.stringify({ ...defaultFeatures, ...request.features })),
          limits: JSON.parse(JSON.stringify({ ...defaultLimits, ...request.limits })),
          theme: JSON.parse(JSON.stringify(request.theme ?? {})),
          settings: JSON.parse(JSON.stringify(request.settings ?? {})),
          isActive: true,
        },
      });

      // Create owner permission
      await this.prisma.domainPermission.create({
        data: {
          domainId: domain.id,
          userId: request.ownerId,
          role: 'admin',
          permissions: ['read', 'write', 'share', 'admin'],
          grantedBy: request.ownerId,
        },
      });

      // Cache the new domain
      await this.cacheService.cacheDomain(domain);

      // Log domain creation
      await this.logDomainActivity(domain.id, request.ownerId, 'create_domain', {
        slug: finalSlug,
        name: request.name,
      });

      return domain;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        throw new Error('A domain with this slug or custom domain already exists');
      }
      throw error;
    }
  }

  /**
   * Get domain by ID
   */
  async getDomainById(domainId: string): Promise<DomainWithIncludes | null> {
    const domain = await this.prisma.domain.findUnique({
      where: { id: domainId },
      include: {
        keepers: true,
        journeys: true,
        DomainPermission: true
      }
    });

    return domain;
  }

  /**
   * Get domain by slug
   */
  async getDomainBySlug(slug: string): Promise<DomainWithIncludes | null> {
    const domain = await this.prisma.domain.findUnique({
      where: { slug },
      include: {
        keepers: true,
        journeys: true,
        DomainPermission: true
      }
    });

    return domain;
  }

  /**
   * Get domain by custom domain
   */
  async getDomainByCustomDomain(customDomain: string): Promise<DomainWithIncludes | null> {
    const domain = await this.prisma.domain.findUnique({
      where: { customDomain },
      include: {
        keepers: true,
        journeys: true,
        DomainPermission: true
      }
    });

    return domain;
  }

  /**
   * Get domain by custom hostname with caching
   */
  async getDomainByHostname(hostname: string): Promise<Domain | null> {
    // Try cache first
    let domain = await this.cacheService.getDomainByHostname(hostname);
    
    if (!domain) {
      // Cache miss - fetch from database
      domain = await this.prisma.domain.findFirst({
        where: {
          customDomain: hostname,
          customDomainVerified: true,
          isActive: true,
        },
      });

      if (domain) {
        await this.cacheService.cacheDomain(domain);
      } else {
        await this.cacheService.cacheNegativeResult('domain:hostname:', hostname);
      }
    }

    // Cast to Domain type to ensure compatibility
    return domain as Domain | null;
  }

  /**
   * Update domain
   */
  async updateDomain(domainId: string, request: UpdateDomainRequest): Promise<Domain> {
    // Get existing domain to merge with updates
    const existingDomain = await this.prisma.domain.findUnique({
      where: { id: domainId }
    });

    if (!existingDomain) {
      throw new Error('Domain not found');
    }

    // Prepare update data with proper JsonValue handling
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Handle optional fields
    if (request.name !== undefined) updateData.name = request.name;
    if (request.description !== undefined) updateData.description = request.description;
    if (request.customDomain !== undefined) updateData.customDomain = request.customDomain;
    if (request.customDomainVerified !== undefined) updateData.customDomainVerified = request.customDomainVerified;
    if (request.isActive !== undefined) updateData.isActive = request.isActive;
    if (request.status !== undefined) updateData.status = request.status;

    // Handle JsonValue fields with proper type casting
    if (request.features !== undefined) {
      const existingFeatures = existingDomain.features as Record<string, unknown> || {};
      const requestFeatures = request.features as Record<string, unknown> || {};
      updateData.features = { ...existingFeatures, ...requestFeatures } as any;
    }
    
    if (request.limits !== undefined) {
      const existingLimits = existingDomain.limits as Record<string, unknown> || {};
      const requestLimits = request.limits as Record<string, unknown> || {};
      updateData.limits = { ...existingLimits, ...requestLimits } as any;
    }
    
    if (request.theme !== undefined) {
      const existingTheme = existingDomain.theme as Record<string, unknown> || {};
      const requestTheme = request.theme as Record<string, unknown> || {};
      updateData.theme = { ...existingTheme, ...requestTheme } as any;
    }
    
    if (request.settings !== undefined) {
      const existingSettings = existingDomain.settings as Record<string, unknown> || {};
      const requestSettings = request.settings as Record<string, unknown> || {};
      updateData.settings = { ...existingSettings, ...requestSettings } as any;
    }

    // Update domain
    const updatedDomain = await this.prisma.domain.update({
      where: { id: domainId },
      data: updateData,
      include: {
        keepers: true,
        journeys: true,
        DomainPermission: true
      }
    });

    // Return domain with proper type casting
    return updatedDomain as Domain;
  }

  /**
   * Delete domain (soft delete)
   */
  async deleteDomain(id: string, deletedBy: string): Promise<void> {
    const domain = await this.getDomainById(id);
    if (!domain) {
      throw new Error('Domain not found');
    }

    // Archive instead of hard delete
    await this.prisma.domain.update({
      where: { id },
      data: {
        status: 'archived',
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    await this.cacheService.invalidateDomain(id);

    // Log domain deletion
    await this.logDomainActivity(id, deletedBy, 'delete_domain', {
      slug: domain.slug,
      name: domain.name,
    });
  }

  /**
   * Search domains with filters
   */
  async searchDomains(filters: DomainSearchFilters = {}, limit = 50, offset = 0): Promise<{
    domains: Domain[];
    total: number;
  }> {
    const whereClause: Record<string, unknown> = {};
    
    if (filters.ownerId) {
      whereClause.ownerId = filters.ownerId;
    }
    
    if (filters.isPublic !== undefined) {
      whereClause.isPublic = filters.isPublic;
    }
    
    if (filters.status) {
      whereClause.status = filters.status;
    }
    
    if (filters.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }
    
    if (filters.categories && filters.categories.length > 0) {
      whereClause.categories = {
        hasSome: filters.categories,
      };
    }
    
    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [domains, total] = await Promise.all([
      this.prisma.domain.findMany({
        where: whereClause as any,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.domain.count({ where: whereClause as any }),
    ]);

    return {
      domains: domains as Domain[],
      total,
    };
  }

  /**
   * Get domains for a user (owned or has permissions)
   */
  async getUserDomains(userId: string): Promise<DomainWithPermissions[]> {
    // Check cache first
    const cachedDomainIds = await this.cacheService.getUserDomains(userId);
    
    if (cachedDomainIds) {
      const domains = await Promise.all(
        cachedDomainIds.map(id => this.getDomainById(id))
      );
      return domains.filter(Boolean) as DomainWithPermissions[];
    }

    // Fetch from database
    const domains = await this.prisma.domain.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            DomainPermission: {
              some: {
                userId,
                OR: [
                  { expiresAt: null },
                  { expiresAt: { gt: new Date() } },
                ],
              },
            },
          },
        ],
        isActive: true,
      },
      include: {
        DomainPermission: {
          where: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Cache the result
    const domainIds = domains.map((d: any) => d.id);
    await this.cacheService.cacheUserDomains(userId, domainIds);

    return domains;
  }

  /**
   * Validate custom domain format
   */
  private async validateCustomDomain(customDomain: string): Promise<void> {
    // Basic domain format validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
    if (!domainRegex.test(customDomain)) {
      throw new Error('Invalid domain format');
    }

    // Check if domain is already in use
    const existingDomain = await this.prisma.domain.findFirst({
      where: {
        customDomain,
        customDomainVerified: true,
      },
    });

    if (existingDomain) {
      throw new Error('Custom domain is already in use');
    }

    // Check against reserved domains
    const reservedDomains = [
      'localhost',
      'keeper.tools',
      'api.keeper.tools',
      'admin.keeper.tools',
      'studio.keeper.tools',
    ];

    if (reservedDomains.some(reserved => 
      customDomain === reserved || customDomain.endsWith(`.${reserved}`)
    )) {
      throw new Error('Domain is reserved and cannot be used');
    }
  }

  /**
   * Log domain activity for analytics
   */
  private async logDomainActivity(
    domainId: string,
    userId: string,
    action: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      // Log to console for now since domainActivityLog doesn't exist in schema
      console.log(`Domain Activity: ${action}`, {
        domainId,
        userId,
        metadata,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Failed to log domain activity:', error);
    }
  }

  /**
   * Get domain statistics
   */
  async getDomainStats(domainId: string): Promise<{
    userCount: number;
    keeperCount: number;
    journeyCount: number;
    momentCount: number;
    usageCount: number;
    lastActivity?: Date;
  }> {
    const [
      userCount,
      keeperCount,
      journeyCount,
      momentCount,
      usageCount,
      lastUsage,
    ] = await Promise.all([
      this.prisma.domainPermission.count({
        where: { domainId },
      }),
      this.prisma.keeper.count({
        where: { domainId },
      }),
      this.prisma.journey.count({
        where: { domainId },
      }),
      this.prisma.moment.count({
        where: { domainId },
      }),
      this.prisma.domainUsage.count({
        where: { domainId },
      }),
      this.prisma.domainUsage.findFirst({
        where: { domainId },
        orderBy: { timestamp: 'desc' },
        select: { timestamp: true },
      }),
    ]);

    return {
      userCount,
      keeperCount,
      journeyCount,
      momentCount,
      usageCount,
      lastActivity: lastUsage?.timestamp,
    };
  }

  /**
   * Check if domain is healthy and accessible
   */
  async checkDomainHealth(id: string): Promise<{
    isHealthy: boolean;
    status: string;
    issues: string[];
  }> {
    const domain = await this.getDomainById(id);
    if (!domain) {
      return {
        isHealthy: false,
        status: 'not_found',
        issues: ['Domain not found'],
      };
    }

    const issues: string[] = [];

    // Check domain status
    if (domain.status !== 'active') {
      issues.push(`Domain status is ${domain.status}`);
    }

    // Check if domain is active
    if (!domain.isActive) {
      issues.push('Domain is not active');
    }

    // Check custom domain verification if configured
    if (domain.customDomain && !domain.customDomainVerified) {
      issues.push('Custom domain is not verified');
    }

    // Check if domain has reached limits
    const stats = await this.getDomainStats(id);
    const limits = domain.limits as any;
    
    if (limits?.max_keepers && stats.keeperCount >= limits.max_keepers) {
      issues.push('Keeper limit reached');
    }

    if (limits?.max_users && stats.userCount >= limits.max_users) {
      issues.push('User limit reached');
    }

    return {
      isHealthy: issues.length === 0,
      status: domain.status,
      issues,
    };
  }

  /**
   * Get domain settings
   */
  async getDomainSettings(domainId: string): Promise<{
    domainId: string;
    settings: Record<string, unknown>;
    features: Record<string, unknown>;
    limits: Record<string, unknown>;
    theme: Record<string, unknown>;
    customDomain?: string;
    customDomainVerified: boolean;
    status: string;
    isActive: boolean;
    isPublic: boolean;
    allowRequests: boolean;
    categories: string[];
    createdAt: Date;
    updatedAt: Date;
  }> {
    const domain = await this.getDomainById(domainId);
    
    if (!domain) {
      throw new Error(`Domain not found: ${domainId}`);
    }

    return {
      domainId: domain.id,
      settings: domain.settings as Record<string, unknown> || {},
      features: domain.features as Record<string, unknown> || {},
      limits: domain.limits as Record<string, unknown> || {},
      theme: domain.theme as Record<string, unknown> || {},
      customDomain: domain.customDomain || undefined,
      customDomainVerified: domain.customDomainVerified,
      status: domain.status,
      isActive: domain.isActive,
      isPublic: domain.isPublic,
      allowRequests: domain.allowRequests,
      categories: domain.categories,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }

  /**
   * Get share agreement between domains
   */
  async getShareAgreement(sourceDomainId: string, targetDomainId: string): Promise<{
    id: string;
    sourceDomainId: string;
    targetDomainId: string;
    shareType: 'read_only' | 'read_write' | 'reference_only';
    status: 'pending' | 'approved' | 'rejected' | 'expired';
    expiresAt?: Date;
    maxAccess?: number;
    currentAccess: number;
    memoryCategories: string[];
  } | null> {
    try {
      const shareAgreement = await this.prisma.memoryShare.findFirst({
        where: {
          sourceMemoryId: sourceDomainId,
          targetMemoryId: targetDomainId,
          status: { in: ['approved', 'pending'] },
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      if (!shareAgreement) {
        return null;
      }

      return {
        id: shareAgreement.id,
        sourceDomainId: shareAgreement.sourceMemoryId,
        targetDomainId: shareAgreement.targetMemoryId,
        shareType: shareAgreement.shareType as 'read_only' | 'read_write' | 'reference_only',
        status: shareAgreement.status as 'pending' | 'approved' | 'rejected' | 'expired',
        expiresAt: shareAgreement.expiresAt || undefined,
        maxAccess: shareAgreement.maxAccess || undefined,
        currentAccess: shareAgreement.currentAccess,
        memoryCategories: shareAgreement.memoryCategories,
      };
    } catch (error) {
      console.error('Error getting share agreement:', error);
      return null;
    }
  }

  /**
   * Get memory scope for domain
   */
  async getMemoryScope(domainId: string): Promise<{
    id: string;
    domainId: string;
    isolationLevel: string;
    allowCrossDomain: boolean;
    maxMemorySize: number;
    currentMemorySize: number;
    compressionLevel: string;
    readAccess: string[];
    writeAccess: string[];
    adminAccess: string[];
    createdAt: Date;
    updatedAt: Date;
  } | null> {
    try {
      const memoryScope = await this.prisma.soleMemoryScope.findUnique({
        where: { domainId },
      });

      if (!memoryScope) {
        return null;
      }

      return {
        id: memoryScope.id,
        domainId: memoryScope.domainId,
        isolationLevel: memoryScope.isolationLevel,
        allowCrossDomain: memoryScope.allowCrossDomain,
        maxMemorySize: memoryScope.maxMemorySize,
        currentMemorySize: memoryScope.currentMemorySize,
        compressionLevel: memoryScope.compressionLevel,
        readAccess: memoryScope.readAccess,
        writeAccess: memoryScope.writeAccess,
        adminAccess: memoryScope.adminAccess,
        createdAt: memoryScope.createdAt,
        updatedAt: memoryScope.updatedAt,
      };
    } catch (error) {
      console.error('Error getting memory scope:', error);
      return null;
    }
  }
}

export default DomainService; 