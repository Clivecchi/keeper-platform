// Check what migrations have been applied
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMigrations() {
  try {
    console.log('🔍 Checking applied migrations...\n');
    
    const migrations = await prisma.$queryRawUnsafe(`
      SELECT migration_name, started_at, finished_at, applied_steps_count 
      FROM "_prisma_migrations" 
      ORDER BY started_at
    `);
    
    console.log('Applied migrations:');
    migrations.forEach(m => {
      const status = m.finished_at ? '✅' : '❌';
      console.log(`${status} ${m.migration_name} (${m.finished_at ? 'completed' : 'FAILED'})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMigrations();

