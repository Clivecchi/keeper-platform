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