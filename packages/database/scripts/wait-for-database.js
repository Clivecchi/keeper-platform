/**
 * Wait for PostgreSQL to accept connections before prisma migrate deploy.
 * Prefer DIRECT_URL (direct Postgres) so we do not wait on a saturated pooler.
 *
 * Usage: node packages/database/scripts/wait-for-database.js
 */
import pg from 'pg';

const MAX_ATTEMPTS = 30;
const DELAY_MS = 2_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripPoolerParams(url) {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('pgbouncer');
    parsed.searchParams.delete('connection_limit');
    parsed.searchParams.delete('pool_timeout');
    return parsed.toString();
  } catch {
    return url;
  }
}

function redactDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '(invalid connection URL)';
  }
}

function resolveWaitUrl() {
  const direct = process.env.DIRECT_URL?.trim();
  if (direct) return direct;
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) return null;
  // Derive a direct-ish URL when DIRECT_URL is unset (pre-PgBouncer or misconfig).
  return stripPoolerParams(databaseUrl);
}

async function canConnect(connectionString) {
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 5_000,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[wait-for-database] connect failed: ${message}`);
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const connectionString = resolveWaitUrl();
  if (!connectionString) {
    console.error('[wait-for-database] DATABASE_URL (or DIRECT_URL) is not set');
    process.exit(1);
  }

  if (!process.env.DIRECT_URL?.trim()) {
    process.env.DIRECT_URL = connectionString;
  }

  console.log(
    `[wait-for-database] Waiting for PostgreSQL (${redactDatabaseUrl(connectionString)})…`
  );

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    if (await canConnect(connectionString)) {
      console.log(`[wait-for-database] Connected on attempt ${attempt}/${MAX_ATTEMPTS}`);
      return;
    }

    if (attempt === MAX_ATTEMPTS) {
      console.error(
        `[wait-for-database] Database unreachable after ${MAX_ATTEMPTS} attempts (~${(MAX_ATTEMPTS * DELAY_MS) / 1000}s)`
      );
      process.exit(1);
    }

    console.log(
      `[wait-for-database] Attempt ${attempt}/${MAX_ATTEMPTS} failed; retrying in ${DELAY_MS / 1000}s…`
    );
    await sleep(DELAY_MS);
  }
}

main().catch((error) => {
  console.error('[wait-for-database] Unexpected error:', error);
  process.exit(1);
});
