/**
 * Clear failed / unfinished Prisma migration rows so `migrate deploy` can proceed.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/resolve-failed-migration.js
 *     → deletes ALL rows where finished_at IS NULL
 *   DATABASE_URL=... node scripts/resolve-failed-migration.js 20260215_sole_memory_links
 *     → deletes only that migration name
 *
 * Safe when schema is already applied (common on Railway after flaky deploys left
 * zombie failed rows). Does not mark migrations as applied — only removes blockers.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resolveMigration() {
  const migrationName = process.argv[2]?.trim();

  try {
    let deleted;
    if (migrationName) {
      console.log('🔧 Resolving failed migration(s)...', [migrationName]);
      const safe = migrationName.replace(/'/g, "''");
      deleted = await prisma.$executeRawUnsafe(
        `DELETE FROM "_prisma_migrations" WHERE migration_name = '${safe}' AND finished_at IS NULL`,
      );
    } else {
      console.log('🔧 Clearing all unfinished Prisma migration records (finished_at IS NULL)…');
      deleted = await prisma.$executeRawUnsafe(
        `DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL`,
      );
    }

    console.log('✅ Deleted unfinished migration record(s)');
    console.log(`Rows affected: ${deleted}`);

    const remaining = await prisma.$queryRawUnsafe(
      `SELECT migration_name, started_at, finished_at FROM "_prisma_migrations" WHERE finished_at IS NULL ORDER BY started_at`,
    );
    console.log('Remaining unfinished migrations:', remaining);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resolveMigration();
