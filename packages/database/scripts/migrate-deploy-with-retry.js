/**
 * Run `prisma migrate deploy` with retries for transient Railway P1001
 * (proxy briefly unreachable after wait-for-database already succeeded).
 *
 * Usage: node scripts/migrate-deploy-with-retry.js
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_ATTEMPTS = 5;
const DELAY_MS = 3_000;
const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runner = path.join(pkgRoot, 'scripts', 'run-with-direct-url.js');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runMigrateDeploy() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [runner, 'prisma', 'migrate', 'deploy'], {
      stdio: 'inherit',
      env: process.env,
      cwd: pkgRoot,
    });
    child.on('exit', (code, signal) => {
      if (signal) {
        resolve({ ok: false, code: 1, signal });
        return;
      }
      resolve({ ok: code === 0, code: code ?? 1 });
    });
  });
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    console.log(`[migrate-deploy-with-retry] Attempt ${attempt}/${MAX_ATTEMPTS}`);
    const result = await runMigrateDeploy();
    if (result.ok) {
      console.log('[migrate-deploy-with-retry] migrate deploy succeeded');
      process.exit(0);
    }

    if (attempt === MAX_ATTEMPTS) {
      console.error(
        `[migrate-deploy-with-retry] migrate deploy failed after ${MAX_ATTEMPTS} attempts (last exit ${result.code})`,
      );
      process.exit(result.code || 1);
    }

    console.log(
      `[migrate-deploy-with-retry] Attempt ${attempt} failed; retrying in ${DELAY_MS / 1000}s…`,
    );
    await sleep(DELAY_MS);
  }
}

main().catch((error) => {
  console.error('[migrate-deploy-with-retry] Unexpected error:', error);
  process.exit(1);
});
