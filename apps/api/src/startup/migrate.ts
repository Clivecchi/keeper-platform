import { execSync } from 'node:child_process';

export function runMigrationsOnce() {
  try {
    console.log('[migrate] applying prisma migrate deploy…');
    execSync('pnpm --filter @keeper/database prisma migrate deploy', { stdio: 'inherit' });
    console.log('[migrate] done');
  } catch (e: any) {
    console.error('[migrate:error]', e?.message || e);
  }
}


