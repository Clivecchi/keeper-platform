// Check actual Board table structure
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTableStructure() {
  try {
    console.log('🔍 Checking Board table structure...\n');
    
    const columns = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'Board'
      ORDER BY ordinal_position
    `);
    
    console.log('Board table columns:');
    columns.forEach(c => {
      console.log(`  - ${c.column_name}: ${c.data_type} (${c.udt_name}) ${c.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTableStructure();

