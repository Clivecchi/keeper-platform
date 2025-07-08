/**
 * Domain Service
 * Core CRUD operations for domain management with validation and caching
 */
import { PrismaClient, Domain, DomainPermission } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService';
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
export type DomainUpdateRequest = UpdateDomainRequest;
export interface DomainSearchFilters {
    ownerId?: string;
    isPublic?: boolean;
    status?: string;
    isActive?: boolean;
    categories?: string[];
    search?: string;
}
export interface DomainVerificationRequest {
    domainId: string;
    method: 'DNS_TXT' | 'CNAME' | 'FILE';
}
export interface DomainWithPermissions extends Domain {
    permissions?: DomainPermission[];
}
export declare class DomainService {
    private prisma;
    private cacheService;
    private featureFlags;
    constructor(prisma: PrismaClient, cacheService: DomainCacheService);
    /**
     * Create a new domain with validation
     */
    createDomain(request: CreateDomainRequest): Promise<Domain>;
    /**
     * Get domain by ID
     */
    getDomainById(domainId: string): Promise<DomainWithIncludes | null>;
    /**
     * Get domain by slug
     */
    getDomainBySlug(slug: string): Promise<DomainWithIncludes | null>;
    /**
     * Get domain by custom domain
     */
    getDomainByCustomDomain(customDomain: string): Promise<DomainWithIncludes | null>;
    /**
     * Get domain by custom hostname with caching
     */
    getDomainByHostname(hostname: string): Promise<Domain | null>;
    /**
     * Update domain
     */
    updateDomain(domainId: string, request: UpdateDomainRequest): Promise<Domain>;
    /**
     * Delete domain (soft delete)
     */
    deleteDomain(id: string, deletedBy: string): Promise<void>;
    /**
     * Search domains with filters
     */
    searchDomains(filters?: DomainSearchFilters, limit?: number, offset?: number): Promise<{
        domains: Domain[];
        total: number;
    }>;
    /**
     * Get domains for a user (owned or has permissions)
     */
    getUserDomains(userId: string): Promise<DomainWithPermissions[]>;
    /**
     * Validate custom domain format
     */
    private validateCustomDomain;
    /**
     * Log domain activity for analytics
     */
    private logDomainActivity;
    /**
     * Get domain statistics
     */
    getDomainStats(domainId: string): Promise<{
        userCount: number;
        keeperCount: number;
        journeyCount: number;
        momentCount: number;
        usageCount: number;
        lastActivity?: Date;
    }>;
    /**
     * Check if domain is healthy and accessible
     */
    checkDomainHealth(id: string): Promise<{
        isHealthy: boolean;
        status: string;
        issues: string[];
    }>;
}
export default DomainService;
//# sourceMappingURL=DomainService.d.ts.map