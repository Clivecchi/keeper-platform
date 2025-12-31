// Run this once to resolve the failed migration
// Usage: node packages/database/scripts/resolve-failed-migration.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resolveMigration() {
  try {
    console.log('🔧 Resolving failed migration...');
    
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "_prisma_migrations" WHERE migration_name IN ('20250110_add_board_domain_fkey', '20250110_add_board_domain_fkey_fixed')`
    );
    
    console.log('✅ Deleted failed migration record');
    console.log(`Rows affected: ${result}`);
    
    // Verify it's gone
    const remaining = await prisma.$queryRawUnsafe(
      `SELECT migration_name, started_at, finished_at FROM "_prisma_migrations" WHERE migration_name LIKE '%board_domain%'`
    );
    
    console.log('Remaining board_domain migrations:', remaining);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resolveMigration();

