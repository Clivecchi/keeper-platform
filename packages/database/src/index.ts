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
import { PrismaClient } from '@prisma/client'
import type { Request } from 'express'

// Global singleton to prevent multiple instances in development
declare global {
  var __prisma: InstanceType<typeof PrismaClient> | undefined
}

/**
 * Prisma Client Singleton
 * 
 * In development, we want to prevent multiple instances of Prisma Client
 * due to module reloading. In production, we create a new instance.
 */
const prismaInstance = globalThis.__prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
})

// Store in global for development hot reloading
if (process.env.NODE_ENV === 'development') {
  globalThis.__prisma = prismaInstance
}

// Export the prisma instance
export { prismaInstance as prisma }

// =============================================================================
// PRISMA CLIENT EXPORT
// =============================================================================
export { PrismaClient } from '@prisma/client'

// =============================================================================
// QUERY HELPERS EXPORT
// =============================================================================
export * from './queries/index.js'

// =============================================================================
// SERVICES EXPORT
// =============================================================================
export { DomainService } from './services/DomainService.js'
export { DomainPermissionService } from './services/DomainPermissionService.js'
export { DomainCacheService } from './services/DomainCacheService.js'
export { DomainContextService } from './services/DomainContextService.js'
export { SslCertificateService } from './services/SslCertificateService.js'
export { DomainHealthMonitoringService } from './services/DomainHealthMonitoringService.js'
export { CrossDomainSharingService } from './services/CrossDomainSharingService.js'
export { ShareWorkflowAutomationService } from './services/ShareWorkflowAutomationService.js'
export { SoleMemoryIsolationService } from './services/SoleMemoryIsolationService.js'
export { FeatureFlagService, getFeatureFlagService } from './services/FeatureFlagService.js'
export { DomainResolutionService } from './services/DomainResolutionService.js'
export { DomainVerificationService } from './services/DomainVerificationService.js'
export { MemoryMigrationService } from './services/MemoryMigrationService.js'
export { MonitoringService } from './services/MonitoringService.js'
export { ProductionConfigService } from './services/ProductionConfigService.js'
export { DeploymentAutomationService } from './services/DeploymentAutomationService.js'
export { SlugValidationService } from './services/SlugValidationService.js'

// =============================================================================
// FACTORY EXPORTS
// =============================================================================
export { 
  DomainServiceFactory, 
  type DomainServiceFactoryConfig,
  type IDomainService,
  type IMemoryService 
} from './factories/DomainServiceFactory.js'

// =============================================================================
// SYSTEM BOARD EXPORTS
// =============================================================================
export {
  SYSTEM_BOARD_DEFINITIONS,
  ensureCanonicalBoard,
  ensureAllCanonicalBoards,
  type SystemBoardDefinition,
  type SystemFrameDefinition,
} from './system-boards/index.js'

// =============================================================================
// TYPE EXPORTS
// =============================================================================
export * from './types/domain.js'
export * from './types/ssl.js'
export * from './types.js'

// Export domain-specific types
export type {
  DomainContext,
  AuthenticatedRequest,
  DomainRole,
  DomainPermissionType,
  PermissionCheck,
  UserPermissionSummary,
  GrantPermissionRequest,
} from './types/domain.js'

// Export health monitoring types
export type {
  DomainHealthMetrics,
  AlertSeverity
} from './services/DomainHealthMonitoringService.js'

// Export domain context types
export type {
  DomainContextConfig,
  ContextOperation,
  ContextMetrics
} from './services/DomainContextService.js'

// Re-export Prisma generated types for convenience
export type {
  users as User,
  UserSettings,
  themes as Theme,
  KeeperMapping,
  MediaContent,
  FrameConfig,
  FrameInstance,
  Prisma
} from '@prisma/client'

// Re-export all custom types
export type {
  ModelProvider,
  ModelSettings,
  AgentRole,
  AgentInput,
  AgentResponse,
  AgentVisibility,
  AgentPermission,
  AgentLogInput,
  AgentLogWithRelations,
  KipCommandIntent,
  KipSessionInput,
  KipSessionWithRelations,
  KipMessageInput,
  KipMessageWithRelations,
  UserKeyInput,
  AgentPermissionInput,
  PlatformApiKey,
  PlatformApiKeyInput,
  DatabaseResult,
  PaginatedResult,
  DatabaseHealthResult,
  UserWithSettings,
  CreateUserInput,
  UpdateUserInput,
  UserSettingsWithTheme,
  UpdateUserSettingsInput,
  ThemeMode,
  CreateThemeInput
} from './types.js'

// Authentication types are exported from ./types/domain.ts

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Gracefully disconnect from database
 */
export async function disconnectDatabase() {
  await prismaInstance.$disconnect()
}

/**
 * Connect to database (usually not needed as Prisma connects lazily)
 */
export async function connectDatabase() {
  await prismaInstance.$connect()
}

/**
 * Check database connection health
 */
export async function checkDatabaseHealth() {
  try {
    await prismaInstance.$queryRaw`SELECT 1`
    return { status: 'healthy', timestamp: new Date() }
  } catch (error) {
    return { 
      status: 'unhealthy', 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date() 
    }
  }
} 