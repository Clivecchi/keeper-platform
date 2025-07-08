/**
 * Domain Service
 * Core CRUD operations for domain management with validation and caching
 */

import { PrismaClient, Domain, DomainPermission } from '@prisma/client';
import { SlugValidationService } from './SlugValidationService';
import { DomainCacheService } from './DomainCacheService';
import { getFeatureFlagService } from './FeatureFlagService';

// Define the Domain with includes type for Prisma queries
export type DomainWithIncludes = Domain & {
  keepers: any[];
  journeys: any[];
  permissions: DomainPermission[];
};

export interface CreateDomainRequest {
  name: string;
  slug?: string;
  description?: string;
  isPublic?: boolean;
  allowRequests?: boolean;
  categories?: string[];
  customDomain?: string;
  ownerId: string;
  features?: Record<string, any>;
  limits?: Record<string, any>;
  theme?: Record<string, any>;
  settings?: Record<string, any>;
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
  features?: Record<string, any>;
  limits?: Record<string, any>;
  theme?: Record<string, any>;
  settings?: Record<string, any>;
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
  permissions?: DomainPermission[];
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
          name: request.name.trim(),
          slug: finalSlug,
          slugHistory: [],
          description: request.description?.trim(),
          isPublic: request.isPublic ?? false,
          allowRequests: request.allowRequests ?? false,
          categories: request.categories ?? [],
          customDomain: request.customDomain,
          customDomainVerified: false,
          ownerId: request.ownerId,
          status: 'active',
          features: { ...defaultFeatures, ...request.features },
          limits: { ...defaultLimits, ...request.limits },
          theme: request.theme ?? {},
          settings: request.settings ?? {},
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
        permissions: true
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
        permissions: true
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
        permissions: true
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
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Handle optional fields
    if (request.name !== undefined) updateData.name = request.name;
    if (request.customDomain !== undefined) updateData.customDomain = request.customDomain;
    if (request.customDomainVerified !== undefined) updateData.customDomainVerified = request.customDomainVerified;
    if (request.isActive !== undefined) updateData.isActive = request.isActive;

    // Handle JsonValue fields with proper type casting
    if (request.features !== undefined) {
      const existingFeatures = existingDomain.features as Record<string, any> || {};
      const requestFeatures = request.features as Record<string, any> || {};
      updateData.features = { ...existingFeatures, ...requestFeatures };
    }
    
    if (request.limits !== undefined) {
      const existingLimits = existingDomain.limits as Record<string, any> || {};
      const requestLimits = request.limits as Record<string, any> || {};
      updateData.limits = { ...existingLimits, ...requestLimits };
    }
    
    if (request.theme !== undefined) {
      const existingTheme = existingDomain.theme as Record<string, any> || {};
      const requestTheme = request.theme as Record<string, any> || {};
      updateData.theme = { ...existingTheme, ...requestTheme };
    }
    
    if (request.settings !== undefined) {
      const existingSettings = existingDomain.settings as Record<string, any> || {};
      const requestSettings = request.settings as Record<string, any> || {};
      updateData.settings = { ...existingSettings, ...requestSettings };
    }

    // Update domain
    const updatedDomain = await this.prisma.domain.update({
      where: { id: domainId },
      data: updateData,
      include: {
        keepers: true,
        journeys: true,
        permissions: true
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
    const where: any = {};

    if (filters.ownerId) where.ownerId = filters.ownerId;
    if (filters.isPublic !== undefined) where.isPublic = filters.isPublic;
    if (filters.status) where.status = filters.status;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (filters.categories?.length) {
      where.categories = {
        hasSome: filters.categories,
      };
    }

    // Search in name, description, slug
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
        { slug: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [domains, total] = await Promise.all([
      this.prisma.domain.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.domain.count({ where }),
    ]);

    return { domains, total };
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
            permissions: {
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
        permissions: {
          where: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Cache the result
    const domainIds = domains.map(d => d.id);
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
    metadata: Record<string, any> = {}
  ): Promise<void> {
    if (!this.featureFlags.isEnabled('DOMAIN_ANALYTICS_ENABLED')) {
      return;
    }

    try {
      await this.prisma.domainUsage.create({
        data: {
          domainId,
          userId,
          action,
          metadata,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      // Don't fail the operation if logging fails
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
}

export default DomainService; 