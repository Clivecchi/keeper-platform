/**
 * Prisma connection-retry helpers
 *
 * Railway / managed Postgres often idle-closes pooled sockets. Prisma then fails
 * the next query with P1017 ("Server has closed the connection") instead of
 * transparently reconnecting. This module retries transient connection errors
 * via a client `$extends` query wrapper.
 */

import { Prisma } from '@prisma/client'

/** Transient Prisma / network codes worth one reconnect + retry. */
export const TRANSIENT_CONNECTION_ERROR_CODES = [
  'P1001', // Can't reach database server
  'P1002', // Database server timed out
  'P1008', // Operations timed out
  'P1011', // Error opening a TLS connection
  'P1017', // Server has closed the connection
] as const

const TRANSIENT_MESSAGE_FRAGMENTS = [
  'server has closed the connection',
  'connection reset',
  'econnreset',
  'econnrefused',
  'etimedout',
  "can't reach database server",
  'connection terminated unexpectedly',
  'connection refused',
] as const

export type PrismaRetryOptions = {
  maxRetries?: number
  /** Base delay in ms; doubles each attempt (capped). */
  baseDelayMs?: number
  maxDelayMs?: number
  onRetry?: (info: {
    attempt: number
    maxRetries: number
    error: unknown
    model?: string
    operation?: string
  }) => void
}

const DEFAULT_MAX_RETRIES = 3
const DEFAULT_BASE_DELAY_MS = 75
const DEFAULT_MAX_DELAY_MS = 1500

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined
  const record = error as { code?: unknown; errorCode?: unknown }
  if (typeof record.code === 'string') return record.code
  if (typeof record.errorCode === 'string') return record.errorCode
  return undefined
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return String(error ?? '')
}

/**
 * True when the failure is a dropped / unreachable DB connection that may
 * succeed after Prisma opens a fresh socket.
 */
export function isTransientConnectionError(error: unknown): boolean {
  const code = getErrorCode(error)
  if (
    code &&
    (TRANSIENT_CONNECTION_ERROR_CODES as readonly string[]).includes(code)
  ) {
    return true
  }

  const message = getErrorMessage(error).toLowerCase()
  return TRANSIENT_MESSAGE_FRAGMENTS.some((fragment) => message.includes(fragment))
}

export async function withConnectionRetry<T>(
  operation: () => Promise<T>,
  options: PrismaRetryOptions & { model?: string; operation?: string } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS

  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (!isTransientConnectionError(error) || attempt >= maxRetries) {
        throw error
      }

      options.onRetry?.({
        attempt: attempt + 1,
        maxRetries,
        error,
        model: options.model,
        operation: options.operation,
      })

      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs)
      await sleep(delay)
    }
  }

  throw lastError
}

type RetryableQueryArgs = {
  args: unknown
  query: (args: unknown) => Promise<unknown>
  model?: string
  operation?: string
}

async function runWithRetry(
  { args, query, model, operation }: RetryableQueryArgs,
  options: PrismaRetryOptions,
): Promise<unknown> {
  return withConnectionRetry(() => query(args), {
    ...options,
    model,
    operation,
  })
}

/**
 * Prisma client extension that retries model + raw queries on transient
 * connection drops (e.g. Railway idle disconnect → P1017).
 */
export function createPrismaRetryExtension(options: PrismaRetryOptions = {}) {
  const retryOptions: PrismaRetryOptions = {
    maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
    baseDelayMs: options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS,
    maxDelayMs: options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS,
    onRetry:
      options.onRetry ??
      ((info) => {
        const target = info.model
          ? `${info.model}.${info.operation ?? 'query'}`
          : info.operation ?? 'query'
        const code = getErrorCode(info.error)
        console.warn(
          `[prisma.retry] transient connection error on ${target}` +
            ` (attempt ${info.attempt}/${info.maxRetries}` +
            `${code ? `, code ${code}` : ''}); retrying…`,
        )
      }),
  }

  return Prisma.defineExtension({
    name: 'keeper-connection-retry',
    query: {
      $allModels: {
        async $allOperations({ args, query, model, operation }) {
          return runWithRetry({ args, query, model, operation }, retryOptions)
        },
      },
      async $queryRaw({ args, query }) {
        return runWithRetry(
          { args, query, operation: '$queryRaw' },
          retryOptions,
        )
      },
      async $executeRaw({ args, query }) {
        return runWithRetry(
          { args, query, operation: '$executeRaw' },
          retryOptions,
        )
      },
      async $queryRawUnsafe({ args, query }) {
        return runWithRetry(
          { args, query, operation: '$queryRawUnsafe' },
          retryOptions,
        )
      },
      async $executeRawUnsafe({ args, query }) {
        return runWithRetry(
          { args, query, operation: '$executeRawUnsafe' },
          retryOptions,
        )
      },
    },
  })
}
