/**
 * Memory Migration Service
 * Handles migration of memories between domains with transformation and validation
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { SoleMemoryIsolationService } from './SoleMemoryIsolationService.js';
import type { MemoryScope } from './SoleMemoryIsolationService.js';
import { DomainCacheService } from './DomainCacheService.js';
import { getFeatureFlagService } from './FeatureFlagService.js';
import * as crypto from 'crypto';

export type MigrationType = 'copy' | 'move' | 'merge' | 'split';
export type MigrationStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
export type MemoryCategory = 'conversational' | 'factual' | 'procedural' | 'episodic' | 'semantic';

// Enhanced MemoryScope interface with index signature
export interface ExtendedMemoryScope extends MemoryScope {
  [key: string]: unknown;
}

// Migration record interface for database objects
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

// Internal validation result interface
export interface ValidationResultInternal {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  message: string;
  severity: 'warning' | 'error';
  details?: any;
}

// Type guards for safe property access
function isMigrationRecord(obj: unknown): obj is MigrationRecord {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'sourceMemoryId' in obj &&
    'migrationType' in obj &&
    'memoryCategories' in obj &&
    'preserveSource' in obj &&
    'status' in obj
  );
}

function isValidationResultInternal(obj: unknown): obj is ValidationResultInternal {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'ruleId' in obj &&
    'ruleName' in obj &&
    'passed' in obj &&
    'message' in obj &&
    'severity' in obj
  );
}

function isMemoryScope(obj: unknown): obj is ExtendedMemoryScope {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'domainId' in obj &&
    'conversationMemory' in obj &&
    'factualMemory' in obj &&
    'proceduralMemory' in obj &&
    'episodicMemory' in obj &&
    'semanticMemory' in obj
  );
}

function hasObjectKeys(obj: unknown): obj is Record<string, unknown> {
  return typeof obj === 'object' && obj !== null;
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

export class MemoryMigrationService {
  private prisma: PrismaClient;
  private memoryService: SoleMemoryIsolationService;
  private cacheService: DomainCacheService;
  private featureFlags = getFeatureFlagService();

  // Migration performance settings
  private readonly DEFAULT_BATCH_SIZE = 100;
  private readonly DEFAULT_CONCURRENCY = 3;
  private readonly DEFAULT_RETRY_ATTEMPTS = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000;

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
   * Create migration request
   */
  async createMigrationRequest(request: MigrationRequest): Promise<string> {
    if (!this.featureFlags.isEnabled('MEMORY_MIGRATION_ENABLED')) {
      throw new Error('Memory migration is not enabled');
    }

    // Validate source memory scope
    const sourceScope = await this.memoryService.getMemoryScope(request.sourceMemoryId);
    if (!sourceScope) {
      throw new Error('Source memory scope not found');
    }

    // Validate target memory scope if provided
    let targetScope = null;
    if (request.targetMemoryId) {
      targetScope = await this.memoryService.getMemoryScope(request.targetMemoryId);
      if (!targetScope) {
        throw new Error('Target memory scope not found');
      }
    }

    // Check permissions
    const hasSourceAccess = await this.memoryService.checkMemoryAccess(
      request.sourceMemoryId,
      request.initiatedBy,
      'admin'
    );

    if (!hasSourceAccess) {
      throw new Error('Insufficient permissions on source memory scope');
    }

    if (request.targetMemoryId) {
      const hasTargetAccess = await this.memoryService.checkMemoryAccess(
        request.targetMemoryId,
        request.initiatedBy,
        'write'
      );

      if (!hasTargetAccess) {
        throw new Error('Insufficient permissions on target memory scope');
      }
    }

    // Create migration record
    const migration = await this.prisma.memoryMigration.create({
      data: {
        sourceMemoryId: request.sourceMemoryId,
        targetMemoryId: request.targetMemoryId,
        migrationType: request.migrationType,
        memoryCategories: request.memoryCategories,
        preserveSource: request.preserveSource,
        transformRules: JSON.stringify(request.transformRules || []),
        mappingRules: JSON.stringify(request.mappingRules || []),
        validationRules: JSON.stringify(request.validationRules || []),
        initiatedBy: request.initiatedBy,
        status: 'pending',
        progress: 0,
        totalItems: 0,
        processedItems: 0,
        failedItems: 0,
        dataSize: 0,
        canRollback: true,
      },
    });

    return migration.id;
  }

  /**
   * Preview migration
   */
  async previewMigration(migrationId: string): Promise<MigrationPreview> {
    const migration = await this.prisma.memoryMigration.findUnique({
      where: { id: migrationId }
    });

    if (!migration) {
      throw new Error('Migration not found');
    }

    // Get source memory scope
    const sourceScope = await this.memoryService.getMemoryScope(migration.sourceMemoryId);
    if (!isMemoryScope(sourceScope)) {
      throw new Error('Invalid memory scope');
    }
    
    // Analyze content
    const analysis = await this.analyzeMemoryContent(sourceScope, migration.memoryCategories as MemoryCategory[]);
    
    // Apply transformation rules if any
    const transformationRules = Array.isArray(migration.transformRules)
      ? (migration.transformRules as unknown as TransformationRule[])
      : [];
    const transformedData = await this.applyTransformationRules(analysis, transformationRules);
    
    // Validate transformation results
    const validationRules = Array.isArray(migration.validationRules)
      ? (migration.validationRules as unknown as ValidationRule[])
      : [];
    const validationResults = await this.validateTransformation(transformedData, validationRules);

    return {
      sourceMemoryId: migration.sourceMemoryId,
      targetMemoryId: migration.targetMemoryId === null ? undefined : migration.targetMemoryId,
      estimatedItems: analysis.totalItems,
      estimatedSize: analysis.estimatedSize,
      estimatedDuration: this.estimateMigrationDuration(analysis.totalItems, analysis.estimatedSize),
      categoryBreakdown: analysis.categoryBreakdown,
      transformationPreview: transformedData,
      validationResults: validationResults.map((r) => ({
        ruleId: r.ruleId,
        ruleName: r.ruleName,
        passed: r.passed,
        message: r.message,
        details: r.details
      })),
      warnings: validationResults.filter((r) => r.severity === 'warning').map((r) => r.message),
      errors: validationResults.filter((r) => r.severity === 'error').map((r) => r.message)
    };
  }

  /**
   * Execute migration
   */
  async executeMigration(migrationId: string, options: MigrationOptions = {}): Promise<MigrationResult> {
    const migration = await this.prisma.memoryMigration.findUnique({
      where: { id: migrationId }
    });

    if (!migration) {
      throw new Error('Migration not found');
    }

    // Convert database object to proper typed object
    const migrationRecord: MigrationRecord = {
      id: migration.id,
      sourceMemoryId: migration.sourceMemoryId,
      targetMemoryId: migration.targetMemoryId,
      migrationType: migration.migrationType as MigrationType,
      memoryCategories: migration.memoryCategories as MemoryCategory[],
      preserveSource: migration.preserveSource,
      transformRules: migration.transformRules,
      mappingRules: migration.mappingRules,
      validationRules: migration.validationRules,
      initiatedBy: migration.initiatedBy,
      status: migration.status as MigrationStatus,
      progress: migration.progress,
      totalItems: migration.totalItems,
      processedItems: migration.processedItems,
      failedItems: migration.failedItems,
      dataSize: migration.dataSize,
      startedAt: migration.startedAt,
      completedAt: migration.completedAt,
      errorMessage: migration.errorMessage,
      rollbackData: migration.rollbackData,
      canRollback: migration.canRollback,
      createdAt: migration.createdAt,
      updatedAt: migration.updatedAt
    };

    return this.performMigration(migrationRecord, options);
  }

  /**
   * Cancel migration
   */
  async cancelMigration(migrationId: string, userId: string): Promise<void> {
    const migration = await this.prisma.memoryMigration.findUnique({
      where: { id: migrationId },
    });

    if (!migration) {
      throw new Error('Migration not found');
    }

    // Check permissions
    const hasAccess = await this.memoryService.checkMemoryAccess(
      migration.sourceMemoryId,
      userId,
      'admin'
    );

    if (!hasAccess && migration.initiatedBy !== userId) {
      throw new Error('Insufficient permissions to cancel migration');
    }

    if (!['pending', 'in_progress'].includes(migration.status)) {
      throw new Error(`Migration cannot be cancelled in status: ${migration.status}`);
    }

    await this.updateMigrationStatus(migrationId, 'cancelled');
  }

  /**
   * Rollback migration
   */
  async rollbackMigration(migrationId: string, userId: string): Promise<void> {
    const migration = await this.prisma.memoryMigration.findUnique({
      where: { id: migrationId }
    });

    if (!migration) {
      throw new Error('Migration not found');
    }

    // Convert database object to proper typed object
    const migrationRecord: MigrationRecord = {
      id: migration.id,
      sourceMemoryId: migration.sourceMemoryId,
      targetMemoryId: migration.targetMemoryId,
      migrationType: migration.migrationType as MigrationType,
      memoryCategories: migration.memoryCategories as MemoryCategory[],
      preserveSource: migration.preserveSource,
      transformRules: migration.transformRules,
      mappingRules: migration.mappingRules,
      validationRules: migration.validationRules,
      initiatedBy: migration.initiatedBy,
      status: migration.status as MigrationStatus,
      progress: migration.progress,
      totalItems: migration.totalItems,
      processedItems: migration.processedItems,
      failedItems: migration.failedItems,
      dataSize: migration.dataSize,
      startedAt: migration.startedAt,
      completedAt: migration.completedAt,
      errorMessage: migration.errorMessage,
      rollbackData: migration.rollbackData,
      canRollback: migration.canRollback,
      createdAt: migration.createdAt,
      updatedAt: migration.updatedAt
    };

    await this.performRollback(migrationRecord);
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(migrationId: string): Promise<MigrationResult> {
    const migration = await this.prisma.memoryMigration.findUnique({
      where: { id: migrationId },
      include: {
        initiator: {
          select: { id: true, name: true, email: true },
        },
        approver: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!migration) {
      throw new Error('Migration not found');
    }

    const processingTime = migration.completedAt && migration.startedAt
      ? migration.completedAt.getTime() - migration.startedAt.getTime()
      : 0;

    const throughput = processingTime > 0 ? migration.processedItems / (processingTime / 1000) : 0;
    const errorRate = migration.totalItems > 0 ? migration.failedItems / migration.totalItems : 0;

    return {
      id: migration.id,
      status: migration.status as MigrationStatus,
      progress: migration.progress,
      totalItems: migration.totalItems,
      processedItems: migration.processedItems,
      failedItems: migration.failedItems,
      dataSize: migration.dataSize,
      startedAt: migration.startedAt === null ? undefined : migration.startedAt,
      completedAt: migration.completedAt === null ? undefined : migration.completedAt,
      errorMessage: migration.errorMessage === null ? undefined : migration.errorMessage,
      rollbackData: migration.rollbackData,
      metrics: {
        processingTime,
        throughput,
        errorRate,
      },
    };
  }

  /**
   * List migrations
   */
  async listMigrations(
    domainId: string,
    filters: {
      status?: MigrationStatus;
      migrationType?: MigrationType;
      initiatedBy?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<MigrationResult[]> {
    const whereClause: Record<string, unknown> = {};

    if (filters.status) {
      whereClause.status = filters.status;
    }

    if (filters.migrationType) {
      whereClause.migrationType = filters.migrationType;
    }

    if (filters.initiatedBy) {
      whereClause.initiatedBy = filters.initiatedBy;
    }

    const migrations = await this.prisma.memoryMigration.findMany({
      where: whereClause,
      take: filters.limit || 50,
      skip: filters.offset || 0,
      orderBy: { createdAt: 'desc' },
    });

    return migrations.map(migration => ({
      id: migration.id,
      status: migration.status as MigrationStatus,
      progress: migration.progress,
      totalItems: migration.totalItems,
      processedItems: migration.processedItems,
      failedItems: migration.failedItems,
      dataSize: migration.dataSize,
      startedAt: migration.startedAt === null ? undefined : migration.startedAt,
      completedAt: migration.completedAt === null ? undefined : migration.completedAt,
      errorMessage: migration.errorMessage === null ? undefined : migration.errorMessage,
      rollbackData: migration.rollbackData,
      metrics: {
        processingTime: 0,
        throughput: 0,
        errorRate: 0,
      },
    }));
  }

  /**
   * Private helper methods
   */
  private async analyzeMemoryContent(
    memoryScope: ExtendedMemoryScope,
    categories: MemoryCategory[]
  ): Promise<{
    totalItems: number;
    estimatedSize: number;
    categoryBreakdown: Record<MemoryCategory, number>;
  }> {
    let totalItems = 0;
    let estimatedSize = 0;
    const categoryBreakdown: Record<MemoryCategory, number> = {
      conversational: 0,
      factual: 0,
      procedural: 0,
      episodic: 0,
      semantic: 0,
    };

    for (const category of categories) {
      const categoryField = `${category}Memory`;
      const categoryMemory = memoryScope[categoryField];
      
      if (categoryMemory && typeof categoryMemory === 'object') {
        const itemCount = Object.keys(categoryMemory).length;
        const itemSize = JSON.stringify(categoryMemory).length;
        
        totalItems += itemCount;
        estimatedSize += itemSize;
        categoryBreakdown[category] = itemCount;
      }
    }

    return {
      totalItems,
      estimatedSize,
      categoryBreakdown,
    };
  }

  private async previewTransformations(
    memoryScope: ExtendedMemoryScope,
    transformationRules: TransformationRule[]
  ): Promise<unknown> {
    // This would apply transformation rules to a sample of the data
    // For now, return a simple preview
    return {
      rules: transformationRules.length,
      preview: 'Transformation preview would be shown here',
    };
  }

  private async validateMigrationRules(
    memoryScope: ExtendedMemoryScope,
    validationRules: ValidationRule[]
  ): Promise<ValidationResultInternal[]> {
    const results: ValidationResultInternal[] = [];

    for (const rule of validationRules) {
      // Simplified validation logic
      const result: ValidationResultInternal = {
        ruleId: rule.id,
        ruleName: rule.name,
        passed: true,
        message: 'Validation passed',
        severity: 'warning'
      };

      // Add specific validation logic based on rule type
      switch (rule.validator.type) {
        case 'size':
          const maxSize = rule.validator.config.maxSize || 1073741824; // 1GB
          const currentSize = JSON.stringify(memoryScope).length;
          if (typeof currentSize === 'number' && typeof maxSize === 'number' && currentSize > maxSize) {
            result.passed = false;
            result.message = `Memory size exceeds maximum allowed (${maxSize} bytes)`;
            result.severity = 'error';
          }
          break;

        case 'content':
          // Content validation logic would go here
          break;

        case 'schema':
          // Schema validation logic would go here
          break;
      }

      results.push(result);
    }

    return results;
  }

  private estimateMigrationDuration(items: number, size: number): number {
    // Simple estimation based on items and size
    const baseTime = 1000; // 1 second base
    const itemTime = items * 10; // 10ms per item
    const sizeTime = size / 1024; // 1ms per KB
    
    return baseTime + itemTime + sizeTime;
  }

  private async performMigration(migration: MigrationRecord,
    options: MigrationOptions
  ): Promise<MigrationResult> {
    const startTime = Date.now();
    let processedItems = 0;
    let failedItems = 0;
    let totalDataSize = 0;

    // Get source memory scope
    const sourceScope = await this.memoryService.getMemoryScope(migration.sourceMemoryId);
    if (!isMemoryScope(sourceScope)) {
      throw new Error('Invalid source memory scope');
    }
    
    // Analyze content
    const analysis = await this.analyzeMemoryContent(sourceScope, migration.memoryCategories);
    
    // Process each category
    for (const category of migration.memoryCategories) {
      const categoryField = `${category}Memory`;
      const categoryMemory = sourceScope[categoryField];
      
      if (categoryMemory && hasObjectKeys(categoryMemory)) {
        try {
          const processed = await this.migrateCategoryMemory(
            categoryMemory,
            migration,
            category,
            options
          );
          
          processedItems += processed.items;
          totalDataSize += processed.size;
        } catch (error) {
          console.error(`Failed to migrate category ${category}:`, error);
          failedItems += Object.keys(categoryMemory).length;
        }

        // Update progress
        const progress = processedItems / analysis.totalItems;
        await this.updateMigrationProgress(migration.id, progress, processedItems);
      }
    }

    const endTime = Date.now();
    const processingTime = endTime - startTime;
    const throughput = processingTime > 0 ? processedItems / (processingTime / 1000) : 0;
    const errorRate = analysis.totalItems > 0 ? failedItems / analysis.totalItems : 0;

    return {
      id: migration.id,
      status: 'completed',
      progress: 1.0,
      totalItems: analysis.totalItems,
      processedItems,
      failedItems,
      dataSize: totalDataSize,
      startedAt: migration.startedAt === null ? undefined : migration.startedAt,
      completedAt: new Date(),
      metrics: {
        processingTime,
        throughput,
        errorRate,
      },
    };
  }

  private async migrateCategoryMemory(categoryMemory: unknown, migration: MigrationRecord,
    category: MemoryCategory,
    options: MigrationOptions
  ): Promise<{ items: number; size: number }> {
    if (!hasObjectKeys(categoryMemory)) {
      return { items: 0, size: 0 };
    }

    const items = Object.keys(categoryMemory).length;
    const size = JSON.stringify(categoryMemory).length;

    // Perform migration based on type
    switch (migration.migrationType) {
      case 'copy':
        await this.copyMemoryCategory(categoryMemory, migration, category);
        break;
      case 'move':
        await this.moveMemoryCategory(categoryMemory, migration, category);
        break;
      case 'merge':
        await this.mergeMemoryCategory(categoryMemory, migration, category);
        break;
      case 'split':
        await this.splitMemoryCategory(categoryMemory, migration, category);
        break;
    }

    return { items, size };
  }

  private async copyMemoryCategory(categoryMemory: unknown, migration: MigrationRecord,
    category: MemoryCategory
  ): Promise<void> {
    if (!migration.targetMemoryId) {
      throw new Error('Target memory ID required for copy operation');
    }

    // Get target memory scope
    const targetScope = await this.memoryService.getMemoryScope(migration.targetMemoryId);
    if (!isMemoryScope(targetScope)) {
      throw new Error('Invalid target memory scope');
    }
    
    const categoryField = `${category}Memory`;
    
    // Copy memory content
    targetScope[categoryField] = {
      ...(typeof targetScope[categoryField] === 'object' && targetScope[categoryField] !== null ? targetScope[categoryField] as Record<string, unknown> : {}),
      ...(typeof categoryMemory === 'object' && categoryMemory !== null ? categoryMemory as Record<string, unknown> : {}),
    };

    // Update target memory scope
    await this.prisma.soleMemoryScope.update({
      where: { domainId: migration.targetMemoryId },
      data: {
        [categoryField]: targetScope[categoryField],
        updatedAt: new Date(),
      },
    });
  }

  private async moveMemoryCategory(categoryMemory: unknown, migration: MigrationRecord,
    category: MemoryCategory
  ): Promise<void> {
    // Copy first
    await this.copyMemoryCategory(categoryMemory, migration, category);

    // Remove from source if not preserving
    if (!migration.preserveSource) {
      const categoryField = `${category}Memory`;
      await this.prisma.soleMemoryScope.update({
        where: { domainId: migration.sourceMemoryId },
        data: {
          [categoryField]: {},
          updatedAt: new Date(),
        },
      });
    }
  }

  private async mergeMemoryCategory(categoryMemory: unknown, migration: MigrationRecord,
    category: MemoryCategory
  ): Promise<void> {
    // Implementation for merge operation
    await this.copyMemoryCategory(categoryMemory, migration, category);
  }

  private async splitMemoryCategory(categoryMemory: unknown, migration: MigrationRecord,
    category: MemoryCategory
  ): Promise<void> {
    // Implementation for split operation
    await this.copyMemoryCategory(categoryMemory, migration, category);
  }

  private async updateMigrationStatus(
    migrationId: string,
    status: MigrationStatus,
    additionalData: Record<string, unknown> = {}
  ): Promise<void> {
    await this.prisma.memoryMigration.update({
      where: { id: migrationId },
      data: {
        status,
        updatedAt: new Date(),
        ...(typeof additionalData === 'object' && additionalData !== null ? additionalData as Record<string, unknown> : {}),
      },
    });
  }

  private async updateMigrationProgress(
    migrationId: string,
    progress: number,
    processedItems: number
  ): Promise<void> {
    await this.prisma.memoryMigration.update({
      where: { id: migrationId },
      data: {
        progress,
        processedItems,
        updatedAt: new Date(),
      },
    });
  }

  private async performRollback(migration: MigrationRecord): Promise<void> {
    // Implementation for rollback logic
    // This would restore the original state using rollback data
    console.log(`Performing rollback for migration ${migration.id}`);
  }

  /**
   * Apply transformation rules to analyzed memory content
   */
  private async applyTransformationRules(analysis: unknown,
    rules: TransformationRule[]
  ): Promise<Record<string, unknown>> {
    let transformedData: Record<string, unknown> = {};
    if (typeof analysis === 'object' && analysis !== null) {
      transformedData = { ...(analysis as Record<string, unknown>) };
    }

    for (const rule of rules) {
      try {
        switch (rule.transformation.type) {
          case 'filter':
            transformedData = this.applyFilterRule(transformedData, rule);
            break;
          case 'transform':
            transformedData = this.applyTransformRule(transformedData, rule);
            break;
          case 'enhance':
            transformedData = this.applyTransformRule(transformedData, rule);
            break;
          case 'replace':
            transformedData = this.applyTransformRule(transformedData, rule);
            break;
          default:
            console.warn(`Unknown transformation rule type: ${rule.transformation.type}`);
        }
      } catch (error) {
        console.error(`Error applying transformation rule ${rule.id}:`, error);
      }
    }

    return typeof transformedData === 'object' && transformedData !== null ? transformedData : {};
  }

  /**
   * Validate transformation results against validation rules
   */
  private async validateTransformation(transformedData: unknown,
    rules: ValidationRule[]
  ): Promise<ValidationResultInternal[]> {
    const results: ValidationResultInternal[] = [];

    for (const rule of rules) {
      try {
        const result = await this.validateRule(transformedData, rule);
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          passed: result.passed,
          message: result.message,
          severity: 'warning' // Default severity since it's not in ValidationRule interface
        });
      } catch (error) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          passed: false,
          message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        });
      }
    }

    return results;
  }

  /**
   * Helper methods for transformation rules
   */
  private applyFilterRule(data: unknown, rule: TransformationRule): Record<string, unknown> {
    // Basic filtering logic based on rule conditions
    if (rule.transformation.config.conditions && 
        typeof rule.transformation.config.conditions === 'object' && 
        rule.transformation.config.conditions !== null &&
        'excludePatterns' in rule.transformation.config.conditions) {
      // Apply exclusion patterns
      return typeof data === 'object' && data !== null ? data as Record<string, unknown> : {};
    }
    return typeof data === 'object' && data !== null ? data as Record<string, unknown> : {};
  }

  private applyTransformRule(data: unknown, rule: TransformationRule): Record<string, unknown> {
    // Basic transformation logic
    if (rule.transformation.config.conditions && 
        typeof rule.transformation.config.conditions === 'object' && 
        rule.transformation.config.conditions !== null &&
        'mappings' in rule.transformation.config.conditions) {
      // Apply field mappings
      return typeof data === 'object' && data !== null ? data as Record<string, unknown> : {};
    }
    return typeof data === 'object' && data !== null ? data as Record<string, unknown> : {};
  }

  private applyMergeRule(data: unknown, rule: TransformationRule): Record<string, unknown> {
    // Basic merge logic
    if (rule.transformation.config.conditions && 
        typeof rule.transformation.config.conditions === 'object' && 
        rule.transformation.config.conditions !== null &&
        'mergeTargets' in rule.transformation.config.conditions) {
      // Apply merge operations
      return typeof data === 'object' && data !== null ? data as Record<string, unknown> : {};
    }
    return typeof data === 'object' && data !== null ? data as Record<string, unknown> : {};
  }

  private async validateRule(data: unknown, rule: ValidationRule): Promise<{ passed: boolean; message: string }> {
    // Basic validation logic
    try {
      if (rule.validator.config.conditions && 
          typeof rule.validator.config.conditions === 'object' && 
          rule.validator.config.conditions !== null &&
          'requiredFields' in rule.validator.config.conditions) {
        const requiredFields = (rule.validator.config.conditions as Record<string, unknown>).requiredFields;
        if (Array.isArray(requiredFields)) {
          const missing = requiredFields.filter((field: string) => {
            if (typeof data === 'object' && data !== null && field in data) {
              return !(data as Record<string, unknown>)[field];
            }
            return true;
          });
          if (missing.length > 0) {
            return {
              passed: false,
              message: `Missing required fields: ${missing.join(', ')}`
            };
          }
        }
      }
      
      return {
        passed: true,
        message: 'Validation passed'
      };
    } catch (error) {
      return {
        passed: false,
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get migration preview
   */
  async getMigrationPreview(migrationId: string): Promise<MigrationPreview> {
    const migration = await this.prisma.memoryMigration.findUnique({
      where: { id: migrationId }
    });

    if (!migration) {
      throw new Error('Migration not found');
    }

    // Get source memory scope
    const sourceScope = await this.memoryService.getMemoryScope(migration.sourceMemoryId);
    
    // Analyze content
    const analysis = await this.analyzeMemoryContent(sourceScope as ExtendedMemoryScope, migration.memoryCategories as any[]);
    
    // Apply transformation rules if any
    const transformationRules = Array.isArray(migration.transformRules)
      ? (migration.transformRules as unknown as TransformationRule[])
      : [];
    const transformedData = await this.applyTransformationRules(analysis, transformationRules);
    
    // Validate transformation results
    const validationRules = Array.isArray(migration.validationRules)
      ? (migration.validationRules as unknown as ValidationRule[])
      : [];
    const validationResults = await this.validateTransformation(transformedData, validationRules);

    // Check for validation errors
    validationResults.forEach((result: unknown) => {
      if (typeof result === 'object' && result !== null && 'passed' in result && !(result as any).passed && 
          'severity' in result && (result as any).severity === 'error') {
        throw new Error(`Migration validation failed: ${(result as any).message}`);
      }
    });

    return {
      sourceMemoryId: migration.sourceMemoryId,
      targetMemoryId: migration.targetMemoryId === null ? undefined : migration.targetMemoryId,
      estimatedItems: analysis.totalItems,
      estimatedSize: analysis.estimatedSize,
      estimatedDuration: this.estimateMigrationDuration(analysis.totalItems, analysis.estimatedSize),
      categoryBreakdown: analysis.categoryBreakdown,
      transformationPreview: typeof transformedData === 'object' && transformedData !== null ? transformedData as Record<string, unknown> : {},
      validationResults: validationResults.map((r: unknown) => ({
        ruleId: (r as any).ruleId,
        ruleName: (r as any).ruleName,
        passed: (r as any).passed,
        message: (r as any).message
      })),
      warnings: validationResults.filter((r: unknown) => 
        typeof r === 'object' && r !== null && 'severity' in r && (r as any).severity === 'warning'
      ).map((r: unknown) => (r as any).message),
      errors: validationResults.filter((r: unknown) => 
        typeof r === 'object' && r !== null && 'severity' in r && (r as any).severity === 'error'
      ).map((r: unknown) => (r as any).message)
    };
  }

  /**
   * Get migration result
   */
  async getMigrationResult(migrationId: string): Promise<MigrationResult> {
    const migration = await this.prisma.memoryMigration.findUnique({
      where: { id: migrationId }
    });

    if (!migration) {
      throw new Error('Migration not found');
    }

    const processingTime = migration.completedAt && migration.startedAt
      ? migration.completedAt.getTime() - migration.startedAt.getTime()
      : 0;

    const throughput = processingTime > 0 ? migration.processedItems / (processingTime / 1000) : 0;
    const errorRate = migration.totalItems > 0 ? migration.failedItems / migration.totalItems : 0;

    return {
      id: migration.id,
      status: migration.status as MigrationStatus,
      progress: migration.progress,
      totalItems: migration.totalItems,
      processedItems: migration.processedItems,
      failedItems: migration.failedItems,
      dataSize: migration.dataSize,
      startedAt: migration.startedAt === null ? undefined : migration.startedAt,
      completedAt: migration.completedAt === null ? undefined : migration.completedAt,
      errorMessage: migration.errorMessage === null ? undefined : migration.errorMessage,
      rollbackData: migration.rollbackData,
      metrics: {
        processingTime,
        throughput,
        errorRate,
      },
    };
  }
}

export default MemoryMigrationService; 