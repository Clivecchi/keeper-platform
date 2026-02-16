// Run this once to resolve failed migrations
// Usage: DATABASE_URL=... node packages/database/scripts/resolve-failed-migration.js [migration_name]
// Example: node scripts/resolve-failed-migration.js 20260215_sole_memory_links

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MIGRATIONS_TO_RESOLVE = [
  '20250110_add_board_domain_fkey',
  '20250110_add_board_domain_fkey_fixed',
  '20260215_sole_memory_links',
];

async function resolveMigration() {
  const migrationName = process.argv[2];
  const toDelete = migrationName
    ? [migrationName]
    : MIGRATIONS_TO_RESOLVE;

  try {
    console.log('🔧 Resolving failed migration(s)...', toDelete);

    const inList = toDelete.map((n) => `'${n.replace(/'/g, "''")}'`).join(', ');
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "_prisma_migrations" WHERE migration_name IN (${inList})`
    );

    console.log('✅ Deleted failed migration record(s)');
    console.log(`Rows affected: ${result}`);

    const remaining = await prisma.$queryRawUnsafe(
      `SELECT migration_name, started_at, finished_at FROM "_prisma_migrations" WHERE finished_at IS NULL`
    );
    console.log('Remaining failed migrations:', remaining);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resolveMigration();

