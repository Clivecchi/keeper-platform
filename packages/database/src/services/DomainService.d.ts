/**
 * Domain Service
 * Core CRUD operations for domain management with validation and caching
 */
import { PrismaClient } from '@prisma/client';
import type { Domain, DomainPermission } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService';
export type DomainWithIncludes = Domain & {
    keepers: unknown[];
    journeys: unknown[];
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
    features?: Record<string, unknown>;
    limits?: Record<string, unknown>;
    theme?: Record<string, unknown>;
    settings?: Record<string, unknown>;
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
export interface DomainEvent {
    ownerId?: string;
    isPublic?: boolean;
    status?: string;
    isActive?: boolean;
    categories?: {
        hasSome: string[];
    };
    OR?: Array<{
        name?: {
            contains: string;
            mode: string;
        };
        description?: {
            contains: string;
            mode: string;
        };
        slug?: {
            contains: string;
            mode: string;
        };
    }>;
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
    /**
     * Get domain settings
     */
    getDomainSettings(domainId: string): Promise<{
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
    }>;
    /**
     * Get share agreement between domains
     */
    getShareAgreement(sourceDomainId: string, targetDomainId: string): Promise<{
        id: string;
        sourceDomainId: string;
        targetDomainId: string;
        shareType: 'read_only' | 'read_write' | 'reference_only';
        status: 'pending' | 'approved' | 'rejected' | 'expired';
        expiresAt?: Date;
        maxAccess?: number;
        currentAccess: number;
        memoryCategories: string[];
    } | null>;
    /**
     * Get memory scope for domain
     */
    getMemoryScope(domainId: string): Promise<{
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
    } | null>;
}
export default DomainService;
//# sourceMappingURL=DomainService.d.ts.map