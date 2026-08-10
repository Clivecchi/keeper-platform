/**
 * Run prisma seed with retries for transient Railway P1001.
 * Seeds are idempotent — safe to re-run after a mid-seed disconnect.
 *
 * Usage: node scripts/seed-with-retry.js
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_ATTEMPTS = 5;
const DELAY_MS = 4_000;
const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runner = path.join(pkgRoot, 'scripts', 'run-with-direct-url.js');
const waitScript = path.join(pkgRoot, 'scripts', 'wait-for-database.js');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runNode(scriptPath, args = []) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [scriptPath, ...args], {
      stdio: 'inherit',
      env: process.env,
      cwd: pkgRoot,
    });
    child.on('exit', (code, signal) => {
      if (signal) {
        resolve({ ok: false, code: 1 });
        return;
      }
      resolve({ ok: code === 0, code: code ?? 1 });
    });
  });
}

async function main() {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    console.log(`[seed-with-retry] Attempt ${attempt}/${MAX_ATTEMPTS}`);

    // Re-check DB reachability before each attempt (proxy flaps mid-seed).
    const wait = await runNode(waitScript);
    if (!wait.ok) {
      console.log(`[seed-with-retry] wait-for-database failed (exit ${wait.code})`);
    } else {
      const seed = await runNode(runner, ['tsx', 'prisma/seed.ts']);
      if (seed.ok) {
        console.log('[seed-with-retry] seed succeeded');
        process.exit(0);
      }
      console.log(`[seed-with-retry] seed failed (exit ${seed.code})`);
    }

    if (attempt === MAX_ATTEMPTS) {
      console.error(
        `[seed-with-retry] seed failed after ${MAX_ATTEMPTS} attempts`,
      );
      process.exit(1);
    }

    console.log(
      `[seed-with-retry] Retrying in ${DELAY_MS / 1000}s…`,
    );
    await sleep(DELAY_MS);
  }
}

main().catch((error) => {
  console.error('[seed-with-retry] Unexpected error:', error);
  process.exit(1);
});
