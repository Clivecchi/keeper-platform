/**
 * SOLE Memory Isolation Service
 * Core service for managing domain-scoped memory isolation for AI agents
 */
import { PrismaClient } from '@prisma/client';
import { DomainCacheService } from './DomainCacheService';
export type MemoryCategory = 'conversational' | 'factual' | 'procedural' | 'episodic' | 'semantic';
export type AccessType = 'read' | 'write' | 'admin';
export type IsolationLevel = 'strict' | 'permissive' | 'shared';
export type ShareType = 'read_only' | 'read_write' | 'reference_only';
export type MigrationType = 'copy' | 'move' | 'merge' | 'split';
export interface MemoryContent {
    id: string;
    category: MemoryCategory;
    content: any;
    metadata: {
        timestamp: Date;
        source: string;
        confidence: number;
        tags: string[];
        relations: string[];
    };
    access: {
        level: AccessType;
        users: string[];
        expires?: Date;
    };
}
export interface MemoryQuery {
    domainId: string;
    userId: string;
    category?: MemoryCategory;
    query: string;
    limit?: number;
    offset?: number;
    filters?: {
        dateRange?: {
            start: Date;
            end: Date;
        };
        tags?: string[];
        confidence?: {
            min: number;
            max: number;
        };
        source?: string[];
    };
}
export interface MemoryInsert {
    domainId: string;
    userId: string;
    category: MemoryCategory;
    content: any;
    metadata?: Partial<MemoryContent['metadata']>;
    access?: Partial<MemoryContent['access']>;
}
export interface MemoryShareRequest {
    sourceMemoryId: string;
    targetMemoryId: string;
    shareType: ShareType;
    memoryCategories: MemoryCategory[];
    accessLevel: 'limited' | 'full' | 'custom';
    requestedBy: string;
    purpose?: string;
    expiresAt?: Date;
    maxAccess?: number;
}
export interface MemoryMigrationRequest {
    sourceMemoryId: string;
    targetMemoryId?: string;
    migrationType: MigrationType;
    memoryCategories: MemoryCategory[];
    preserveSource: boolean;
    transformRules?: any;
    mappingRules?: any;
    validationRules?: any;
    initiatedBy: string;
}
export interface MemoryQuota {
    domainId: string;
    maxMemorySize: number;
    currentMemorySize: number;
    usagePercentage: number;
    categoryBreakdown: Record<MemoryCategory, number>;
    recommendedCleanup: boolean;
}
export interface MemoryAnalytics {
    domainId: string;
    timeRange: {
        start: Date;
        end: Date;
    };
    metrics: {
        totalAccesses: number;
        uniqueUsers: number;
        avgResponseTime: number;
        errorRate: number;
        popularCategories: Array<{
            category: MemoryCategory;
            count: number;
        }>;
    };
    usage: {
        reads: number;
        writes: number;
        shares: number;
        migrations: number;
    };
    growth: {
        memorySize: number;
        accessCount: number;
        userCount: number;
    };
}
export declare class SoleMemoryIsolationService {
    private prisma;
    private cacheService;
    private featureFlags;
    private readonly DEFAULT_MEMORY_LIMITS;
    private readonly CACHE_TTL;
    constructor(prisma: PrismaClient, cacheService: DomainCacheService);
    /**
     * Initialize memory scope for a domain
     */
    initializeMemoryScope(domainId: string, createdBy: string): Promise<any>;
    /**
     * Get memory scope for domain
     */
    getMemoryScope(domainId: string): Promise<any>;
    /**
     * Check if user has access to memory scope
     */
    checkMemoryAccess(domainId: string, userId: string, accessType: AccessType): Promise<boolean>;
    /**
     * Query memory content
     */
    queryMemory(query: MemoryQuery): Promise<MemoryContent[]>;
    /**
     * Insert memory content
     */
    insertMemory(insert: MemoryInsert): Promise<string>;
    /**
     * Update memory content
     */
    updateMemory(domainId: string, memoryId: string, userId: string, updates: Partial<MemoryContent>): Promise<void>;
    /**
     * Delete memory content
     */
    deleteMemory(domainId: string, memoryId: string, userId: string): Promise<void>;
    /**
     * Request memory share between domains
     */
    requestMemoryShare(request: MemoryShareRequest): Promise<string>;
    /**
     * Approve memory share request
     */
    approveMemoryShare(shareId: string, approvedBy: string): Promise<void>;
    /**
     * Get memory quota information
     */
    getMemoryQuota(domainId: string): Promise<MemoryQuota>;
    /**
     * Get memory analytics
     */
    getMemoryAnalytics(domainId: string, days?: number): Promise<MemoryAnalytics>;
    /**
     * Private helper methods
     */
    private isValidMemoryCategory;
    private calculateContentSize;
    private filterMemoryContent;
    private logMemoryAccess;
    private createMemoryAlert;
}
export default SoleMemoryIsolationService;
//# sourceMappingURL=SoleMemoryIsolationService.d.ts.map