/**
 * One Prisma client for the whole seed process.
 *
 * Each seed file used to call `new PrismaClient()`, and each client opens its
 * own pool. On Railway that pile of pools goes through the public proxy and
 * the proxy stops accepting connections mid-seed.
 */
import { PrismaClient } from '@prisma/client';

function capConnectionLimit(url: string, limit: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('connection_limit', limit);
    return parsed.toString();
  } catch {
    return url;
  }
}

const limit = process.env.SEED_CONNECTION_LIMIT?.trim() || '1';
if (process.env.DATABASE_URL?.trim()) {
  process.env.DATABASE_URL = capConnectionLimit(process.env.DATABASE_URL, limit);
}
if (process.env.DIRECT_URL?.trim()) {
  process.env.DIRECT_URL = capConnectionLimit(process.env.DIRECT_URL, limit);
}

const globalForSeed = globalThis as typeof globalThis & {
  __keeperSeedPrisma?: PrismaClient;
};

export const prisma: PrismaClient =
  globalForSeed.__keeperSeedPrisma ??
  new PrismaClient({
    log: ['error'],
  });

globalForSeed.__keeperSeedPrisma = prisma;
