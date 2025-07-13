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
declare const prismaInstance: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, unknown, import("@prisma/client/runtime/library").InternalArgs>;
export { prismaInstance as prisma };
export { PrismaClient } from '@prisma/client';
export * from './queries/index';
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
export { DomainServiceFactory, type DomainServiceFactoryConfig, type IDomainService, type IMemoryService } from './factories/DomainServiceFactory';
export * from './types';
export type { DomainContext, AuthenticatedRequest, DomainRole, DomainPermissionType, PermissionCheck, UserPermissionSummary, GrantPermissionRequest, } from './types/domain';
export type { DomainHealthMetrics, AlertSeverity } from './services/DomainHealthMonitoringService';
export type { DomainContextConfig, ContextOperation, ContextMetrics } from './services/DomainContextService';
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