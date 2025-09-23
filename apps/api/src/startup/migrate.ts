import { execSync } from 'node:child_process';

export function runMigrationsOnce() {
  try {
    console.log('[migrate] applying prisma migrate deploy…');
    // Use pnpm exec to run Prisma CLI inside the @keeper/database package context
    execSync('pnpm --filter @keeper/database exec prisma migrate deploy', { stdio: 'inherit' });
    console.log('[migrate] done');
  } catch (e: any) {
    console.error('[migrate:error]', e?.message || e);
  }
}


