/**
 * Memory Migration Service
 * Handles migration of memories between domains with transformation and validation
 */
import { getFeatureFlagService } from './FeatureFlagService';
// Type guards for safe property access
function isMigrationRecord(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'sourceMemoryId' in obj &&
        'migrationType' in obj &&
        'memoryCategories' in obj &&
        'preserveSource' in obj &&
        'status' in obj);
}
function isValidationResultInternal(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'ruleId' in obj &&
        'ruleName' in obj &&
        'passed' in obj &&
        'message' in obj &&
        'severity' in obj);
}
function isMemoryScope(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'domainId' in obj &&
        'conversationMemory' in obj &&
        'factualMemory' in obj &&
        'proceduralMemory' in obj &&
        'episodicMemory' in obj &&
        'semanticMemory' in obj);
}
function hasObjectKeys(obj) {
    return typeof obj === 'object' && obj !== null;
}
export class MemoryMigrationService {
    constructor(prisma, memoryService, cacheService) {
        this.featureFlags = getFeatureFlagService();
        // Migration performance settings
        this.DEFAULT_BATCH_SIZE = 100;
        this.DEFAULT_CONCURRENCY = 3;
        this.DEFAULT_RETRY_ATTEMPTS = 3;
        this.DEFAULT_RETRY_DELAY = 1000;
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
     * Preview migration
     */
    async previewMigration(migrationId) {
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
        const analysis = await this.analyzeMemoryContent(sourceScope, migration.memoryCategories);
        // Apply transformation rules if any
        const transformationRules = Array.isArray(migration.transformRules)
            ? migration.transformRules
            : [];
        const transformedData = await this.applyTransformationRules(analysis, transformationRules);
        // Validate transformation results
        const validationRules = Array.isArray(migration.validationRules)
            ? migration.validationRules
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
    async executeMigration(migrationId, options = {}) {
        const migration = await this.prisma.memoryMigration.findUnique({
            where: { id: migrationId }
        });
        if (!migration) {
            throw new Error('Migration not found');
        }
        // Convert database object to proper typed object
        const migrationRecord = {
            id: migration.id,
            sourceMemoryId: migration.sourceMemoryId,
            targetMemoryId: migration.targetMemoryId,
            migrationType: migration.migrationType,
            memoryCategories: migration.memoryCategories,
            preserveSource: migration.preserveSource,
            transformRules: migration.transformRules,
            mappingRules: migration.mappingRules,
            validationRules: migration.validationRules,
            initiatedBy: migration.initiatedBy,
            status: migration.status,
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
            where: { id: migrationId }
        });
        if (!migration) {
            throw new Error('Migration not found');
        }
        // Convert database object to proper typed object
        const migrationRecord = {
            id: migration.id,
            sourceMemoryId: migration.sourceMemoryId,
            targetMemoryId: migration.targetMemoryId,
            migrationType: migration.migrationType,
            memoryCategories: migration.memoryCategories,
            preserveSource: migration.preserveSource,
            transformRules: migration.transformRules,
            mappingRules: migration.mappingRules,
            validationRules: migration.validationRules,
            initiatedBy: migration.initiatedBy,
            status: migration.status,
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
     * List migrations
     */
    async listMigrations(domainId, filters = {}) {
        const whereClause = {};
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
                processingTime: 0,
                throughput: 0,
                errorRate: 0,
            },
        }));
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
    async copyMemoryCategory(categoryMemory, migration, category) {
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
            ...(typeof targetScope[categoryField] === 'object' && targetScope[categoryField] !== null ? targetScope[categoryField] : {}),
            ...(typeof categoryMemory === 'object' && categoryMemory !== null ? categoryMemory : {}),
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
                ...(typeof additionalData === 'object' && additionalData !== null ? additionalData : {}),
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
        let transformedData = {};
        if (typeof analysis === 'object' && analysis !== null) {
            transformedData = { ...analysis };
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
            }
            catch (error) {
                console.error(`Error applying transformation rule ${rule.id}:`, error);
            }
        }
        return typeof transformedData === 'object' && transformedData !== null ? transformedData : {};
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
        if (rule.transformation.config.conditions &&
            typeof rule.transformation.config.conditions === 'object' &&
            rule.transformation.config.conditions !== null &&
            'excludePatterns' in rule.transformation.config.conditions) {
            // Apply exclusion patterns
            return typeof data === 'object' && data !== null ? data : {};
        }
        return typeof data === 'object' && data !== null ? data : {};
    }
    applyTransformRule(data, rule) {
        // Basic transformation logic
        if (rule.transformation.config.conditions &&
            typeof rule.transformation.config.conditions === 'object' &&
            rule.transformation.config.conditions !== null &&
            'mappings' in rule.transformation.config.conditions) {
            // Apply field mappings
            return typeof data === 'object' && data !== null ? data : {};
        }
        return typeof data === 'object' && data !== null ? data : {};
    }
    applyMergeRule(data, rule) {
        // Basic merge logic
        if (rule.transformation.config.conditions &&
            typeof rule.transformation.config.conditions === 'object' &&
            rule.transformation.config.conditions !== null &&
            'mergeTargets' in rule.transformation.config.conditions) {
            // Apply merge operations
            return typeof data === 'object' && data !== null ? data : {};
        }
        return typeof data === 'object' && data !== null ? data : {};
    }
    async validateRule(data, rule) {
        // Basic validation logic
        try {
            if (rule.validator.config.conditions &&
                typeof rule.validator.config.conditions === 'object' &&
                rule.validator.config.conditions !== null &&
                'requiredFields' in rule.validator.config.conditions) {
                const requiredFields = rule.validator.config.conditions.requiredFields;
                if (Array.isArray(requiredFields)) {
                    const missing = requiredFields.filter((field) => {
                        if (typeof data === 'object' && data !== null && field in data) {
                            return !data[field];
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
        const transformationRules = Array.isArray(migration.transformRules)
            ? migration.transformRules
            : [];
        const transformedData = await this.applyTransformationRules(analysis, transformationRules);
        // Validate transformation results
        const validationRules = Array.isArray(migration.validationRules)
            ? migration.validationRules
            : [];
        const validationResults = await this.validateTransformation(transformedData, validationRules);
        // Check for validation errors
        validationResults.forEach((result) => {
            if (typeof result === 'object' && result !== null && 'passed' in result && !result.passed &&
                'severity' in result && result.severity === 'error') {
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
            transformationPreview: typeof transformedData === 'object' && transformedData !== null ? transformedData : {},
            validationResults: validationResults.map((r) => ({
                ruleId: r.ruleId,
                ruleName: r.ruleName,
                passed: r.passed,
                message: r.message
            })),
            warnings: validationResults.filter((r) => typeof r === 'object' && r !== null && 'severity' in r && r.severity === 'warning').map((r) => r.message),
            errors: validationResults.filter((r) => typeof r === 'object' && r !== null && 'severity' in r && r.severity === 'error').map((r) => r.message)
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