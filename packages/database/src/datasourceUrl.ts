/**
 * Datasource URL helpers for Railway Postgres + optional PgBouncer.
 *
 * Runtime app traffic should use DATABASE_URL (pooled via PgBouncer when configured).
 * Prisma Migrate / introspection must use DIRECT_URL (direct Postgres, not the pooler).
 */

const DEFAULT_CONNECTION_LIMIT = 5

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback
  const parsed = Number.parseInt(value.trim(), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Set or replace a query param on a Postgres connection URL.
 * Preserves other params and credentials.
 */
export function withDatabaseUrlParam(url: string, key: string, value: string): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set(key, value)
    return parsed.toString()
  } catch {
    const separator = url.includes('?') ? '&' : '?'
    const stripped = url
      .replace(new RegExp(`([?&])${key}=[^&]*&?`), '$1')
      .replace(/[?&]$/, '')
    return `${stripped}${separator}${key}=${encodeURIComponent(value)}`
  }
}

/** True when the URL looks like a PgBouncer / pooled endpoint. */
export function isPooledDatabaseUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return (
    lower.includes('pgbouncer=true') ||
    lower.includes(':6432') ||
    lower.includes('pooler') ||
    lower.includes('pgbouncer')
  )
}

/**
 * Ensure process.env has:
 * - DIRECT_URL for migrate (falls back to DATABASE_URL when unset)
 * - DATABASE_URL capped with connection_limit for Prisma's client-side pool
 *
 * Call once before constructing PrismaClient.
 */
export function ensureDatasourceUrls(): {
  databaseUrl: string | undefined
  directUrl: string | undefined
  connectionLimit: number
} {
  const rawDatabaseUrl = process.env.DATABASE_URL?.trim()
  if (!rawDatabaseUrl) {
    return { databaseUrl: undefined, directUrl: process.env.DIRECT_URL?.trim(), connectionLimit: DEFAULT_CONNECTION_LIMIT }
  }

  const directUrl = process.env.DIRECT_URL?.trim() || rawDatabaseUrl
  if (!process.env.DIRECT_URL?.trim()) {
    process.env.DIRECT_URL = directUrl
  }

  const connectionLimit = parsePositiveInt(
    process.env.PRISMA_CONNECTION_LIMIT,
    DEFAULT_CONNECTION_LIMIT,
  )

  // Cap Prisma's own pool. With PgBouncer this is clients→pooler; without it, clients→Postgres.
  const databaseUrl = withDatabaseUrlParam(rawDatabaseUrl, 'connection_limit', String(connectionLimit))

  // PgBouncer transaction mode needs this hint for Prisma prepared statements.
  const withPoolerHint = isPooledDatabaseUrl(databaseUrl)
    ? withDatabaseUrlParam(databaseUrl, 'pgbouncer', 'true')
    : databaseUrl

  process.env.DATABASE_URL = withPoolerHint

  return {
    databaseUrl: withPoolerHint,
    directUrl,
    connectionLimit,
  }
}
