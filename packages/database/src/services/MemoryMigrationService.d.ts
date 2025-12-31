/**
 * Memory Migration Service
 * Handles migration of memories between domains with transformation and validation
 */
import { PrismaClient, Prisma } from '@prisma/client';
import { SoleMemoryIsolationService } from './SoleMemoryIsolationService';
import type { MemoryScope } from './SoleMemoryIsolationService';
import { DomainCacheService } from './DomainCacheService';
export type MigrationType = 'copy' | 'move' | 'merge' | 'split';
export type MigrationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type MemoryCategory = 'conversational' | 'factual' | 'procedural' | 'episodic' | 'semantic';
export interface ExtendedMemoryScope extends MemoryScope {
    [key: string]: unknown;
}
export interface MigrationRecord {
    id: string;
    sourceMemoryId: string;
    targetMemoryId?: string | null;
    migrationType: MigrationType;
    memoryCategories: MemoryCategory[];
    preserveSource: boolean;
    transformRules?: Prisma.JsonValue;
    mappingRules?: Prisma.JsonValue;
    validationRules?: Prisma.JsonValue;
    initiatedBy: string;
    status: MigrationStatus;
    progress: number;
    totalItems: number;
    processedItems: number;
    failedItems: number;
    dataSize: number;
    startedAt?: Date | null;
    completedAt?: Date | null;
    errorMessage?: string | null;
    rollbackData?: Prisma.JsonValue;
    canRollback: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface ValidationResultInternal {
    ruleId: string;
    ruleName: string;
    passed: boolean;
    message: string;
    severity: 'warning' | 'error';
    details?: any;
}
export interface MigrationRequest {
    sourceMemoryId: string;
    targetMemoryId?: string;
    migrationType: MigrationType;
    memoryCategories: MemoryCategory[];
    preserveSource: boolean;
    transformRules?: TransformationRule[];
    mappingRules?: MappingRule[];
    validationRules?: ValidationRule[];
    initiatedBy: string;
    options?: MigrationOptions;
}
export interface TransformationRule {
    id: string;
    name: string;
    description: string;
    category: MemoryCategory | 'all';
    transformation: {
        type: 'replace' | 'transform' | 'filter' | 'enhance';
        config: Record<string, unknown>;
    };
    order: number;
}
export interface MappingRule {
    id: string;
    sourcePattern: string;
    targetPattern: string;
    category: MemoryCategory | 'all';
    preserveOriginal: boolean;
}
export interface ValidationRule {
    id: string;
    name: string;
    category: MemoryCategory | 'all';
    validator: {
        type: 'schema' | 'content' | 'size' | 'custom';
        config: Record<string, unknown>;
    };
    required: boolean;
}
export interface MigrationOptions {
    batchSize?: number;
    concurrency?: number;
    retryAttempts?: number;
    retryDelay?: number;
    dryRun?: boolean;
    validateOnly?: boolean;
    compression?: boolean;
    encryption?: boolean;
    backup?: boolean;
}
export interface MigrationResult {
    id: string;
    status: MigrationStatus;
    progress: number;
    totalItems: number;
    processedItems: number;
    failedItems: number;
    dataSize: number;
    startedAt?: Date;
    completedAt?: Date;
    errorMessage?: string;
    rollbackData?: any;
    metrics: {
        processingTime: number;
        throughput: number;
        errorRate: number;
        compressionRatio?: number;
    };
}
export interface MigrationPreview {
    sourceMemoryId: string;
    targetMemoryId?: string;
    estimatedItems: number;
    estimatedSize: number;
    estimatedDuration: number;
    categoryBreakdown: Record<MemoryCategory, number>;
    transformationPreview: Record<string, unknown>;
    validationResults: ValidationResult[];
    warnings: string[];
    errors: string[];
}
export interface ValidationResult {
    ruleId: string;
    ruleName: string;
    passed: boolean;
    message: string;
    details?: any;
}
export declare class MemoryMigrationService {
    private prisma;
    private memoryService;
    private cacheService;
    private featureFlags;
    private readonly DEFAULT_BATCH_SIZE;
    private readonly DEFAULT_CONCURRENCY;
    private readonly DEFAULT_RETRY_ATTEMPTS;
    private readonly DEFAULT_RETRY_DELAY;
    constructor(prisma: PrismaClient, memoryService: SoleMemoryIsolationService, cacheService: DomainCacheService);
    /**
     * Create migration request
     */
    createMigrationRequest(request: MigrationRequest): Promise<string>;
    /**
     * Preview migration
     */
    previewMigration(migrationId: string): Promise<MigrationPreview>;
    /**
     * Execute migration
     */
    executeMigration(migrationId: string, options?: MigrationOptions): Promise<MigrationResult>;
    /**
     * Cancel migration
     */
    cancelMigration(migrationId: string, userId: string): Promise<void>;
    /**
     * Rollback migration
     */
    rollbackMigration(migrationId: string, userId: string): Promise<void>;
    /**
     * Get migration status
     */
    getMigrationStatus(migrationId: string): Promise<MigrationResult>;
    /**
     * List migrations
     */
    listMigrations(domainId: string, filters?: {
        status?: MigrationStatus;
        migrationType?: MigrationType;
        initiatedBy?: string;
        limit?: number;
        offset?: number;
    }): Promise<MigrationResult[]>;
    /**
     * Private helper methods
     */
    private analyzeMemoryContent;
    private previewTransformations;
    private validateMigrationRules;
    private estimateMigrationDuration;
    private performMigration;
    private migrateCategoryMemory;
    private copyMemoryCategory;
    private moveMemoryCategory;
    private mergeMemoryCategory;
    private splitMemoryCategory;
    private updateMigrationStatus;
    private updateMigrationProgress;
    private performRollback;
    /**
     * Apply transformation rules to analyzed memory content
     */
    private applyTransformationRules;
    /**
     * Validate transformation results against validation rules
     */
    private validateTransformation;
    /**
     * Helper methods for transformation rules
     */
    private applyFilterRule;
    private applyTransformRule;
    private applyMergeRule;
    private validateRule;
    /**
     * Get migration preview
     */
    getMigrationPreview(migrationId: string): Promise<MigrationPreview>;
    /**
     * Get migration result
     */
    getMigrationResult(migrationId: string): Promise<MigrationResult>;
}
export default MemoryMigrationService;
//# sourceMappingURL=MemoryMigrationService.d.ts.map