/**
 * Railway's public TCP proxy (*.proxy.rlwy.net) drops connections during a
 * long seed. On the private network Postgres is postgres.railway.internal:5432.
 * Probe that host once and use it when it answers.
 */
import pg from 'pg';

function redactDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return '(invalid connection URL)';
  }
}

export function isPublicRailwayProxy(url) {
  try {
    return new URL(url).hostname.endsWith('.proxy.rlwy.net');
  } catch {
    return false;
  }
}

function privateCandidate(url) {
  const explicit = process.env.DATABASE_PRIVATE_URL?.trim();
  if (explicit) return explicit;
  const parsed = new URL(url);
  parsed.hostname = process.env.RAILWAY_DATABASE_PRIVATE_HOST?.trim() || 'postgres.railway.internal';
  parsed.port = '5432';
  return parsed.toString();
}

async function canConnect(connectionString) {
  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 3_000,
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

/**
 * When this process is on Railway and DATABASE_URL is the public proxy,
 * switch DATABASE_URL and DIRECT_URL to the private host if it accepts a connection.
 * Returns the URL the caller should wait on.
 */
export async function applyRailwayPrivateUrl(connectionString) {
  const onRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
  if (!onRailway || !connectionString || !isPublicRailwayProxy(connectionString)) {
    return connectionString;
  }

  let candidate;
  try {
    candidate = privateCandidate(connectionString);
  } catch {
    return connectionString;
  }

  if (!(await canConnect(candidate))) {
    console.log(
      `[railway-database-url] private Postgres did not answer; staying on ${redactDatabaseUrl(connectionString)}`,
    );
    return connectionString;
  }

  console.log(
    `[railway-database-url] using private Postgres (${redactDatabaseUrl(candidate)})`,
  );
  process.env.DATABASE_URL = candidate;
  process.env.DIRECT_URL = candidate;
  return candidate;
}
