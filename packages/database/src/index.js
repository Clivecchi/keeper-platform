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
// IMPORTS
// =============================================================================
import { PrismaClient } from '@prisma/client';
/**
 * Prisma Client Singleton
 *
 * In development, we want to prevent multiple instances of Prisma Client
 * due to module reloading. In production, we create a new instance.
 */
const prismaInstance = globalThis.__prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
});
// Store in global for development hot reloading
if (process.env.NODE_ENV === 'development') {
    globalThis.__prisma = prismaInstance;
}
// Export the prisma instance
export { prismaInstance as prisma };
// =============================================================================
// PRISMA CLIENT EXPORT
// =============================================================================
export { PrismaClient } from '@prisma/client';
// =============================================================================
// QUERY HELPERS EXPORT
// =============================================================================
export * from './queries/index';
// =============================================================================
// SERVICES EXPORT
// =============================================================================
export { DomainService } from './services/DomainService';
export { DomainPermissionService } from './services/DomainPermissionService';
export { DomainCacheService } from './services/DomainCacheService';
export { DomainContextService } from './services/DomainContextService';
export { SslCertificateService } from './services/SslCertificateService';
export { DomainHealthMonitoringService } from './services/DomainHealthMonitoringService';
export { CrossDomainSharingService } from './services/CrossDomainSharingService';
export { ShareWorkflowAutomationService } from './services/ShareWorkflowAutomationService';
export { SoleMemoryIsolationService } from './services/SoleMemoryIsolationService';
export { FeatureFlagService, getFeatureFlagService } from './services/FeatureFlagService';
export { DomainResolutionService } from './services/DomainResolutionService';
export { DomainVerificationService } from './services/DomainVerificationService';
export { MemoryMigrationService } from './services/MemoryMigrationService';
export { MonitoringService } from './services/MonitoringService';
export { ProductionConfigService } from './services/ProductionConfigService';
export { DeploymentAutomationService } from './services/DeploymentAutomationService';
export { SlugValidationService } from './services/SlugValidationService';
// =============================================================================
// FACTORY EXPORTS
// =============================================================================
export { DomainServiceFactory } from './factories/DomainServiceFactory';
// =============================================================================
// TYPE EXPORTS
// =============================================================================
export * from './types';
// Authentication types are exported from ./types/domain.ts
// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================
/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase() {
    await prismaInstance.$disconnect();
}
/**
 * Connect to database (usually not needed as Prisma connects lazily)
 */
export async function connectDatabase() {
    await prismaInstance.$connect();
}
/**
 * Check database connection health
 */
export async function checkDatabaseHealth() {
    try {
        await prismaInstance.$queryRaw `SELECT 1`;
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