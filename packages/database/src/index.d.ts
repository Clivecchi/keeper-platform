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
import { PrismaClient } from '@prisma/client';
declare global {
    var __prisma: InstanceType<typeof PrismaClient> | undefined;
}
/**
 * Prisma Client Singleton
 *
 * In development, we want to prevent multiple instances of Prisma Client
 * due to module reloading. In production, we create a new instance.
 */
export declare const prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, unknown, import("@prisma/client/runtime/library").InternalArgs>;
export { PrismaClient } from '@prisma/client';
export * from './queries/index.js';
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
export { DomainServiceFactory, type DomainServiceFactoryConfig, type IDomainService, type IMemoryService } from './factories/DomainServiceFactory.js';
export * from './types.js';
export type { DomainContext, AuthenticatedRequest, DomainRole, DomainPermissionType, PermissionCheck, UserPermissionSummary, GrantPermissionRequest, } from './types/domain.js';
export type { DomainHealthMetrics, AlertSeverity } from './services/DomainHealthMonitoringService.js';
export type { DomainContextConfig, ContextOperation, ContextMetrics } from './services/DomainContextService.js';
export type { users as User, UserSettings, themes as Theme, KeeperMapping, MediaContent, Prisma } from '@prisma/client';
/**
 * Gracefully disconnect from database
 */
export declare function disconnectDatabase(): Promise<void>;
/**
 * Connect to database (usually not needed as Prisma connects lazily)
 */
export declare function connectDatabase(): Promise<void>;
/**
 * Check database connection health
 */
export declare function checkDatabaseHealth(): Promise<{
    status: string;
    timestamp: Date;
    error?: undefined;
} | {
    status: string;
    error: string;
    timestamp: Date;
}>;
//# sourceMappingURL=index.d.ts.map