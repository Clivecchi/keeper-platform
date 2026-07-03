/**
 * Wait for PostgreSQL to accept connections before prisma migrate deploy.
 * Railway sometimes starts the API container before the DB proxy is ready (P1001).
 *
 * Usage: DATABASE_URL=... node packages/database/scripts/wait-for-database.js
 */
import pg from 'pg';

const MAX_ATTEMPTS = 30;
const DELAY_MS = 2_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function redactDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '(invalid DATABASE_URL)';
  }
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
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    console.error('[wait-for-database] DATABASE_URL is not set');
    process.exit(1);
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
