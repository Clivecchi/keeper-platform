// Check Board.domainId data
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBoardData() {
  try {
    console.log('🔍 Checking Board data...\n');
    
    // Check column type
    const columnInfo = await prisma.$queryRawUnsafe(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'Board' AND column_name = 'domainId'
    `);
    console.log('Column info:', columnInfo);
    
    // Check sample data
    const boards = await prisma.$queryRawUnsafe(`
      SELECT id, "domainId", "boardType" 
      FROM "Board" 
      LIMIT 10
    `);
    console.log('\nSample boards:', boards);
    
    // Check distinct domainId values
    const distinctDomains = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT "domainId" 
      FROM "Board" 
      WHERE "domainId" IS NOT NULL
    `);
    console.log('\nDistinct domainIds:', distinctDomains);
    
    // Check if any are not valid UUIDs
    const invalidUUIDs = await prisma.$queryRawUnsafe(`
      SELECT id, "domainId" 
      FROM "Board" 
      WHERE "domainId" IS NOT NULL 
      AND "domainId" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    `);
    console.log('\nInvalid UUIDs:', invalidUUIDs);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBoardData();

