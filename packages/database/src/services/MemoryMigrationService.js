/**
 * Memory Migration Service
 * Handles migration of memories between domains with transformation and validation
 */
import { getFeatureFlagService } from './FeatureFlagService';
export class MemoryMigrationService {
    prisma;
    memoryService;
    cacheService;
    featureFlags = getFeatureFlagService();
    // Migration performance settings
    DEFAULT_BATCH_SIZE = 100;
    DEFAULT_CONCURRENCY = 3;
    DEFAULT_RETRY_ATTEMPTS = 3;
    DEFAULT_RETRY_DELAY = 1000;
    constructor(prisma, memoryService, cacheService) {
        this.prisma = prisma;
        this.memoryService = memoryService;
        this.cacheService = cacheService;
    }
    /**
     * Create migration request
     */
    async createMigrationRequest(request) {
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
        const hasSourceAccess = await this.memoryService.checkMemoryAccess(request.sourceMemoryId, request.initiatedBy, 'admin');
        if (!hasSourceAccess) {
            throw new Error('Insufficient permissions on source memory scope');
        }
        if (request.targetMemoryId) {
            const hasTargetAccess = await this.memoryService.checkMemoryAccess(request.targetMemoryId, request.initiatedBy, 'write');
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
     * Preview migration before execution
     */
    async previewMigration(migrationId) {
        const migration = await this.prisma.memoryMigration.findUnique({
            where: { id: migrationId },
        });
        if (!migration) {
            throw new Error('Migration not found');
        }
        const sourceScope = await this.memoryService.getMemoryScope(migration.sourceMemoryId);
        // Analyze source memory content for transformation
        const analysis = await this.analyzeMemoryContent(sourceScope, migration.memoryCategories);
        // Apply transformation rules
        const transformedData = await this.applyTransformationRules(analysis, JSON.parse(migration.transformRules));
        // Validate transformation results
        const validationResults = await this.validateTransformation(transformedData, JSON.parse(migration.validationRules));
        // Check for warnings and errors
        const warnings = [];
        const errors = [];
        if (analysis.estimatedSize > 1073741824) { // 1GB
            warnings.push('Large data size may affect performance');
        }
        if (migration.migrationType === 'move' && !migration.preserveSource) {
            warnings.push('Source memory will be permanently deleted');
        }
        validationResults.forEach(result => {
            if (!result.passed && result.details?.required) {
                errors.push(`Validation failed: ${result.message}`);
            }
        });
        return {
            sourceMemoryId: migration.sourceMemoryId,
            targetMemoryId: migration.targetMemoryId === null ? undefined : migration.targetMemoryId,
            estimatedItems: analysis.totalItems,
            estimatedSize: analysis.estimatedSize,
            estimatedDuration: this.estimateMigrationDuration(analysis.totalItems, analysis.estimatedSize),
            categoryBreakdown: analysis.categoryBreakdown,
            transformationPreview: transformedData.preview,
            validationResults,
            warnings,
            errors,
        };
    }
    /**
     * Execute migration
     */
    async executeMigration(migrationId, options = {}) {
        const migration = await this.prisma.memoryMigration.findUnique({
            where: { id: migrationId },
        });
        if (!migration) {
            throw new Error('Migration not found');
        }
        if (migration.status !== 'pending') {
            throw new Error(`Migration cannot be executed in status: ${migration.status}`);
        }
        const migrationOptions = {
            batchSize: options.batchSize || this.DEFAULT_BATCH_SIZE,
            concurrency: options.concurrency || this.DEFAULT_CONCURRENCY,
            retryAttempts: options.retryAttempts || this.DEFAULT_RETRY_ATTEMPTS,
            retryDelay: options.retryDelay || this.DEFAULT_RETRY_DELAY,
            dryRun: options.dryRun || false,
            validateOnly: options.validateOnly || false,
            compression: options.compression || false,
            encryption: options.encryption || false,
            backup: options.backup || true,
            ...options,
        };
        try {
            // Update migration status
            await this.updateMigrationStatus(migrationId, 'in_progress', {
                startedAt: new Date(),
            });
            const result = await this.performMigration(migration, migrationOptions);
            // Update migration status on completion
            await this.updateMigrationStatus(migrationId, 'completed', {
                completedAt: new Date(),
                progress: 1.0,
                totalItems: result.totalItems,
                processedItems: result.processedItems,
                failedItems: result.failedItems,
                dataSize: result.dataSize,
            });
            return result;
        }
        catch (error) {
            // Update migration status on failure
            await this.updateMigrationStatus(migrationId, 'failed', {
                failedAt: new Date(),
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    /**
     * Cancel migration
     */
    async cancelMigration(migrationId, userId) {
        const migration = await this.prisma.memoryMigration.findUnique({
            where: { id: migrationId },
        });
        if (!migration) {
            throw new Error('Migration not found');
        }
        // Check permissions
        const hasAccess = await this.memoryService.checkMemoryAccess(migration.sourceMemoryId, userId, 'admin');
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
    async rollbackMigration(migrationId, userId) {
        const migration = await this.prisma.memoryMigration.findUnique({
            where: { id: migrationId },
        });
        if (!migration) {
            throw new Error('Migration not found');
        }
        if (!migration.canRollback) {
            throw new Error('Migration cannot be rolled back');
        }
        if (migration.status !== 'completed') {
            throw new Error('Only completed migrations can be rolled back');
        }
        // Check permissions
        const hasAccess = await this.memoryService.checkMemoryAccess(migration.sourceMemoryId, userId, 'admin');
        if (!hasAccess && migration.initiatedBy !== userId) {
            throw new Error('Insufficient permissions to rollback migration');
        }
        try {
            // Perform rollback using stored rollback data
            if (migration.rollbackData) {
                await this.performRollback(migration);
                await this.prisma.memoryMigration.update({
                    where: { id: migrationId },
                    data: {
                        rolledBackAt: new Date(),
                        canRollback: false,
                    },
                });
            }
        }
        catch (error) {
            throw new Error(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Get migration status
     */
    async getMigrationStatus(migrationId) {
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
            status: migration.status,
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
     * List migrations for domain
     */
    async listMigrations(domainId, filters = {}) {
        const whereClause = {
            OR: [
                { sourceMemoryId: domainId },
                { targetMemoryId: domainId },
            ],
        };
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
            include: {
                initiator: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: filters.limit || 50,
            skip: filters.offset || 0,
        });
        return Promise.all(migrations.map(migration => this.getMigrationStatus(migration.id)));
    }
    /**
     * Private helper methods
     */
    async analyzeMemoryContent(memoryScope, categories) {
        let totalItems = 0;
        let estimatedSize = 0;
        const categoryBreakdown = {
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
    async previewTransformations(memoryScope, transformationRules) {
        // This would apply transformation rules to a sample of the data
        // For now, return a simple preview
        return {
            rules: transformationRules.length,
            preview: 'Transformation preview would be shown here',
        };
    }
    async validateMigrationRules(memoryScope, validationRules) {
        const results = [];
        for (const rule of validationRules) {
            // Simplified validation logic
            const result = {
                ruleId: rule.id,
                ruleName: rule.name,
                passed: true,
                message: 'Validation passed',
            };
            // Add specific validation logic based on rule type
            switch (rule.validator.type) {
                case 'size':
                    const maxSize = rule.validator.config.maxSize || 1073741824; // 1GB
                    const currentSize = JSON.stringify(memoryScope).length;
                    if (currentSize > maxSize) {
                        result.passed = false;
                        result.message = `Memory size exceeds maximum allowed (${maxSize} bytes)`;
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
    estimateMigrationDuration(items, size) {
        // Simple estimation based on items and size
        const baseTime = 1000; // 1 second base
        const itemTime = items * 10; // 10ms per item
        const sizeTime = size / 1024; // 1ms per KB
        return baseTime + itemTime + sizeTime;
    }
    async performMigration(migration, options) {
        const startTime = Date.now();
        let processedItems = 0;
        let failedItems = 0;
        let totalDataSize = 0;
        // Get source memory scope
        const sourceScope = await this.memoryService.getMemoryScope(migration.sourceMemoryId);
        // Analyze content
        const analysis = await this.analyzeMemoryContent(sourceScope, migration.memoryCategories);
        // Process each category
        for (const category of migration.memoryCategories) {
            const categoryField = `${category}Memory`;
            const categoryMemory = sourceScope[categoryField];
            if (categoryMemory && typeof categoryMemory === 'object') {
                try {
                    const processed = await this.migrateCategoryMemory(categoryMemory, migration, category, options);
                    processedItems += processed.items;
                    totalDataSize += processed.size;
                }
                catch (error) {
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
    async migrateCategoryMemory(categoryMemory, migration, category, options) {
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
    async copyMemoryCategory(categoryMemory, migration, category) {
        if (!migration.targetMemoryId) {
            throw new Error('Target memory ID required for copy operation');
        }
        // Get target memory scope
        const targetScope = await this.memoryService.getMemoryScope(migration.targetMemoryId);
        const categoryField = `${category}Memory`;
        // Copy memory content
        targetScope[categoryField] = {
            ...targetScope[categoryField],
            ...categoryMemory,
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
    async moveMemoryCategory(categoryMemory, migration, category) {
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
    async mergeMemoryCategory(categoryMemory, migration, category) {
        // Implementation for merge operation
        await this.copyMemoryCategory(categoryMemory, migration, category);
    }
    async splitMemoryCategory(categoryMemory, migration, category) {
        // Implementation for split operation
        await this.copyMemoryCategory(categoryMemory, migration, category);
    }
    async updateMigrationStatus(migrationId, status, additionalData = {}) {
        await this.prisma.memoryMigration.update({
            where: { id: migrationId },
            data: {
                status,
                updatedAt: new Date(),
                ...additionalData,
            },
        });
    }
    async updateMigrationProgress(migrationId, progress, processedItems) {
        await this.prisma.memoryMigration.update({
            where: { id: migrationId },
            data: {
                progress,
                processedItems,
                updatedAt: new Date(),
            },
        });
    }
    async performRollback(migration) {
        // Implementation for rollback logic
        // This would restore the original state using rollback data
        console.log(`Performing rollback for migration ${migration.id}`);
    }
    /**
     * Apply transformation rules to analyzed memory content
     */
    async applyTransformationRules(analysis, rules) {
        let transformedData = { ...analysis };
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
            }
            catch (error) {
                console.error(`Error applying transformation rule ${rule.id}:`, error);
            }
        }
        return transformedData;
    }
    /**
     * Validate transformation results against validation rules
     */
    async validateTransformation(transformedData, rules) {
        const results = [];
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
            }
            catch (error) {
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
    applyFilterRule(data, rule) {
        // Basic filtering logic based on rule conditions
        if (rule.transformation.config.conditions && rule.transformation.config.conditions.excludePatterns) {
            // Apply exclusion patterns
            return data; // Simplified implementation
        }
        return data;
    }
    applyTransformRule(data, rule) {
        // Basic transformation logic
        if (rule.transformation.config.conditions && rule.transformation.config.conditions.mappings) {
            // Apply field mappings
            return data; // Simplified implementation
        }
        return data;
    }
    applyMergeRule(data, rule) {
        // Basic merge logic
        if (rule.transformation.config.conditions && rule.transformation.config.conditions.mergeTargets) {
            // Apply merge operations
            return data; // Simplified implementation
        }
        return data;
    }
    async validateRule(data, rule) {
        // Basic validation logic
        try {
            if (rule.validator.config.conditions && rule.validator.config.conditions.requiredFields) {
                const missing = rule.validator.config.conditions.requiredFields.filter((field) => !data[field]);
                if (missing.length > 0) {
                    return {
                        passed: false,
                        message: `Missing required fields: ${missing.join(', ')}`
                    };
                }
            }
            return {
                passed: true,
                message: 'Validation passed'
            };
        }
        catch (error) {
            return {
                passed: false,
                message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
    /**
     * Get migration preview
     */
    async getMigrationPreview(migrationId) {
        const migration = await this.prisma.memoryMigration.findUnique({
            where: { id: migrationId }
        });
        if (!migration) {
            throw new Error('Migration not found');
        }
        // Get source memory scope
        const sourceScope = await this.memoryService.getMemoryScope(migration.sourceMemoryId);
        // Analyze content
        const analysis = await this.analyzeMemoryContent(sourceScope, migration.memoryCategories);
        // Apply transformation rules if any
        const transformationRules = migration.transformRules || [];
        const transformedData = await this.applyTransformationRules(analysis, transformationRules);
        // Validate transformation results
        const validationRules = migration.validationRules || [];
        const validationResults = await this.validateTransformation(transformedData, validationRules);
        // Check for validation errors
        validationResults.forEach((result) => {
            if (!result.passed && result.severity === 'error') {
                throw new Error(`Migration validation failed: ${result.message}`);
            }
        });
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
                message: r.message
            })),
            warnings: validationResults.filter((r) => r.severity === 'warning').map((r) => r.message),
            errors: validationResults.filter((r) => r.severity === 'error').map((r) => r.message)
        };
    }
    /**
     * Get migration result
     */
    async getMigrationResult(migrationId) {
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
            status: migration.status,
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
//# sourceMappingURL=MemoryMigrationService.js.map