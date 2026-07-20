/**
 * Shared Prisma client singleton.
 *
 * All API routes / services must import `{ prisma }` from here (via `@keeper/database`)
 * — never `new PrismaClient()` — so one process holds one pool.
 */

import { PrismaClient } from '@prisma/client'
import { createPrismaRetryExtension } from './prismaRetry.js'
import { ensureDatasourceUrls } from './datasourceUrl.js'

declare global {
  // eslint-disable-next-line no-var
  var __keeper_prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const { connectionLimit } = ensureDatasourceUrls()

  if (process.env.NODE_ENV !== 'test') {
    console.log(
      `[database] Prisma singleton ready (connection_limit=${connectionLimit}` +
        `${process.env.DIRECT_URL ? ', DIRECT_URL set' : ''})`,
    )
  }

  const base = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  // Cast: $extends changes the static type; runtime behavior stays PrismaClient-compatible.
  return base.$extends(createPrismaRetryExtension()) as unknown as PrismaClient
}

const prismaInstance = globalThis.__keeper_prisma || createPrismaClient()

// Always pin on globalThis so hot-reload / dual-package loads cannot open a second pool.
globalThis.__keeper_prisma = prismaInstance

export { prismaInstance as prisma }

export async function disconnectDatabase() {
  await prismaInstance.$disconnect()
}

export async function connectDatabase() {
  await prismaInstance.$connect()
}

export async function checkDatabaseHealth() {
  try {
    await prismaInstance.$queryRaw`SELECT 1`
    return { status: 'healthy' as const, timestamp: new Date() }
  } catch (error) {
    return {
      status: 'unhealthy' as const,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date(),
    }
  }
}
