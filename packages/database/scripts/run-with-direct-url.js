/**
 * Run a Prisma (or other) command with DATABASE_URL + DIRECT_URL set in-process.
 *
 * Migrations must use DIRECT_URL (direct Postgres). App runtime uses DATABASE_URL
 * (PgBouncer pooled URL when configured on Railway).
 *
 * Usage:
 *   node scripts/run-with-direct-url.js prisma migrate deploy
 *   node scripts/run-with-direct-url.js --allow-placeholder prisma generate
 *   node scripts/run-with-direct-url.js tsx prisma/seed.ts
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLACEHOLDER = 'postgresql://postgres:postgres@127.0.0.1:5432/keeper_placeholder';
const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

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

function ensureEnv({ allowPlaceholder }) {
  if (!process.env.DATABASE_URL?.trim()) {
    if (!allowPlaceholder) {
      console.error('[run-with-direct-url] DATABASE_URL is not set');
      process.exit(1);
    }
    process.env.DATABASE_URL = PLACEHOLDER;
    console.log('[run-with-direct-url] DATABASE_URL unset — using generate placeholder');
  }

  if (!process.env.DIRECT_URL?.trim()) {
    process.env.DIRECT_URL = stripPoolerParams(process.env.DATABASE_URL);
    console.log('[run-with-direct-url] DIRECT_URL derived from DATABASE_URL');
  }
}

const rawArgs = process.argv.slice(2);
const allowPlaceholder = rawArgs[0] === '--allow-placeholder';
const args = allowPlaceholder ? rawArgs.slice(1) : rawArgs;

ensureEnv({ allowPlaceholder });

if (args.length === 0) {
  console.error('[run-with-direct-url] No command provided');
  process.exit(1);
}

const [command, ...commandArgs] = args;
// Always use a shell so `prisma` resolves via node_modules/.bin on Railway/Linux.
const child = spawn(command, commandArgs, {
  stdio: 'inherit',
  env: process.env,
  shell: true,
  cwd: pkgRoot,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
