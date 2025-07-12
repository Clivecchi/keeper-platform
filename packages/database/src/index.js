/**
 * @keeper/database - Database Package
 * ===================================
 *
 * This package provides centralized database access using Prisma ORM.
 * It includes the Prisma client, common queries, and database utilities.
 *
 * Usage Examples:
 *
 * ```typescript
 * // Import Prisma client
 * import { prisma } from '@keeper/database'
 *
 * // Import query helpers
 * import { getUserWithSettings, createUserWithDefaultSettings } from '@keeper/database/queries'
 *
 * // Import types
 * import type { User, UserSettings, Theme } from '@keeper/database/types'
 * ```
 */
// =============================================================================
// PRISMA CLIENT SETUP
// =============================================================================
import { PrismaClient } from '@prisma/client';
/**
 * Prisma Client Singleton
 *
 * In development, we want to prevent multiple instances of Prisma Client
 * due to module reloading. In production, we create a new instance.
 */
export const prisma = globalThis.__prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});
// Store in global for development hot reloading
if (process.env.NODE_ENV === 'development') {
    globalThis.__prisma = prisma;
}
// =============================================================================
// PRISMA CLIENT EXPORT
// =============================================================================
export { PrismaClient } from '@prisma/client';
// =============================================================================
// QUERY HELPERS EXPORT
// =============================================================================
export * from './queries/index.js';
// =============================================================================
// SERVICES EXPORT
// =============================================================================
export { DomainService } from './services/DomainService.js';
export { DomainPermissionService } from './services/DomainPermissionService.js';
export { DomainCacheService } from './services/DomainCacheService.js';
export { DomainContextService } from './services/DomainContextService.js';
export { SslCertificateService } from './services/SslCertificateService.js';
export { DomainHealthMonitoringService } from './services/DomainHealthMonitoringService.js';
export { CrossDomainSharingService } from './services/CrossDomainSharingService.js';
export { ShareWorkflowAutomationService } from './services/ShareWorkflowAutomationService.js';
export { SoleMemoryIsolationService } from './services/SoleMemoryIsolationService.js';
export { FeatureFlagService, getFeatureFlagService } from './services/FeatureFlagService.js';
export { DomainResolutionService } from './services/DomainResolutionService.js';
export { DomainVerificationService } from './services/DomainVerificationService.js';
export { MemoryMigrationService } from './services/MemoryMigrationService.js';
export { MonitoringService } from './services/MonitoringService.js';
export { ProductionConfigService } from './services/ProductionConfigService.js';
export { DeploymentAutomationService } from './services/DeploymentAutomationService.js';
export { SlugValidationService } from './services/SlugValidationService.js';
// =============================================================================
// FACTORY EXPORTS
// =============================================================================
export { DomainServiceFactory } from './factories/DomainServiceFactory.js';
// =============================================================================
// TYPE EXPORTS
// =============================================================================
export * from './types.js';
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase() {
    await prisma.$disconnect();
}
/**
 * Connect to database (usually not needed as Prisma connects lazily)
 */
export async function connectDatabase() {
    await prisma.$connect();
}
/**
 * Check database connection health
 */
export async function checkDatabaseHealth() {
    try {
        await prisma.$queryRaw `SELECT 1`;
        return { status: 'healthy', timestamp: new Date() };
    }
    catch (error) {
        return {
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date()
        };
    }
}
//# sourceMappingURL=index.js.map