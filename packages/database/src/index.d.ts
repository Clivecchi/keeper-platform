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
    var __prisma: PrismaClient | undefined;
}
/**
 * Prisma Client Singleton
 *
 * In development, we want to prevent multiple instances of Prisma Client
 * due to module reloading. In production, we create a new instance.
 */
export declare const prisma: PrismaClient<import("@prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export { PrismaClient } from '@prisma/client';
export * from './queries/index.js';
export * from './types.js';
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