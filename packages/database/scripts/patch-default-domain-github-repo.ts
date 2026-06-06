/**
 * Patch default domain IDE build context with platform GitHub repository.
 * Run from repo: pnpm exec tsx packages/database/scripts/patch-default-domain-github-repo.ts
 *
 * Loads DATABASE_URL from env, or from apps/api/.env / .env (first match).
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_GITHUB_REPOSITORY = 'Clivecchi/keeper-platform';
const DEFAULT_GITHUB_BRANCH = 'main';

function ensureDatabaseUrl(): void {
  if (process.env.DATABASE_URL?.trim()) return;
  const roots = [
    resolve(__dirname, '../../../apps/api/.env'),
    resolve(__dirname, '../../../.env'),
    resolve(__dirname, '../prisma/.env'),
  ];
  for (const p of roots) {
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, 'utf8');
    const m = raw.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/m);
    if (m) {
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env.DATABASE_URL = v;
      return;
    }
  }
}

ensureDatabaseUrl();

const prisma = new PrismaClient();

async function main() {
  const row = await prisma.domain.findUnique({
    where: { slug: 'default' },
    select: { id: true, settings: true },
  });
  if (!row) {
    console.error('No domain with slug "default"');
    process.exit(1);
  }

  const settings =
    row.settings && typeof row.settings === 'object' && !Array.isArray(row.settings)
      ? (row.settings as Record<string, unknown>)
      : {};
  const ideBuild =
    settings.ideBuildContext &&
    typeof settings.ideBuildContext === 'object' &&
    !Array.isArray(settings.ideBuildContext)
      ? (settings.ideBuildContext as Record<string, unknown>)
      : {};

  const currentRepo =
    typeof ideBuild.activeRepository === 'string' ? ideBuild.activeRepository.trim() : '';
  if (currentRepo && currentRepo !== 'owner/repo') {
    console.log(`default domain already has activeRepository=${currentRepo} — skipping`);
    return;
  }

  const nextSettings = {
    ...settings,
    ideBuildContext: {
      ...ideBuild,
      activeRepository: DEFAULT_GITHUB_REPOSITORY,
      activeBranch:
        typeof ideBuild.activeBranch === 'string' && ideBuild.activeBranch.trim()
          ? ideBuild.activeBranch.trim()
          : DEFAULT_GITHUB_BRANCH,
    },
  };

  await prisma.domain.update({
    where: { slug: 'default' },
    data: { settings: nextSettings, updatedAt: new Date() },
  });

  console.log(`Patched default domain ideBuildContext.activeRepository=${DEFAULT_GITHUB_REPOSITORY}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
