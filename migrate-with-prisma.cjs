const { PrismaClient } = require('@prisma/client');

async function createBoardTables() {
  const prisma = new PrismaClient();

  try {
    console.log('✅ Connected to Railway database via Prisma');

    // Execute raw SQL to create Board table
    console.log('🔄 Creating Board table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Board" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "keeperId" TEXT NOT NULL,
          "name" TEXT NOT NULL,
          "slug" TEXT NOT NULL,
          "description" TEXT,
          "icon" TEXT,
          "theme" JSONB NOT NULL DEFAULT '{}',
          "behavior" JSONB NOT NULL DEFAULT '{}',
          "data" JSONB NOT NULL DEFAULT '{}',
          "access" JSONB NOT NULL DEFAULT '{}',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
      );
    `;

    // Create FrameConfig table
    console.log('🔄 Creating FrameConfig table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "FrameConfig" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "name" TEXT NOT NULL,
          "description" TEXT,
          "theme" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "FrameConfig_pkey" PRIMARY KEY ("id")
      );
    `;

    // Create FrameInstance table
    console.log('🔄 Creating FrameInstance table...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "FrameInstance" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "entityType" TEXT NOT NULL,
          "entityId" TEXT NOT NULL,
          "configId" UUID NOT NULL,
          "currentContentId" UUID,
          "boardId" UUID,
          "role" TEXT,
          "name" TEXT NOT NULL DEFAULT 'Untitled Frame',
          "pattern" TEXT NOT NULL DEFAULT 'dialogic',
          "frameType" TEXT NOT NULL DEFAULT 'media_card',
          "orderIndex" INTEGER NOT NULL DEFAULT 0,
          "layoutKind" TEXT NOT NULL DEFAULT 'canvas',
          "layoutData" JSONB NOT NULL DEFAULT '{}',
          "props" JSONB NOT NULL DEFAULT '{}',
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "FrameInstance_pkey" PRIMARY KEY ("id")
      );
    `;

    // Add indexes and constraints
    console.log('🔄 Creating indexes and constraints...');
    
    // Board indexes
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "Board_keeperId_slug_key" ON "Board"("keeperId", "slug");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Board_keeperId_idx" ON "Board"("keeperId");`;

    // FrameInstance foreign key constraints
    await prisma.$executeRaw`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='FrameInstance_configId_fkey') THEN
              ALTER TABLE "FrameInstance" ADD CONSTRAINT "FrameInstance_configId_fkey" 
                  FOREIGN KEY ("configId") REFERENCES "FrameConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='FrameInstance_boardId_fkey') THEN
              ALTER TABLE "FrameInstance" ADD CONSTRAINT "FrameInstance_boardId_fkey" 
                  FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;
          END IF;
      END $$;
    `;

    // FrameInstance indexes
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "FrameInstance_boardId_idx" ON "FrameInstance"("boardId");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "FrameInstance_entityType_entityId_idx" ON "FrameInstance"("entityType", "entityId");`;
    await prisma.$executeRaw`CREATE UNIQUE INDEX IF NOT EXISTS "FrameInstance_currentContentId_key" ON "FrameInstance"("currentContentId");`;

    // Verify tables exist
    const tables = await prisma.$queryRaw`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('Board', 'FrameInstance', 'FrameConfig')
      ORDER BY table_name;
    `;

    console.log('📋 Created tables:', tables.map(row => row.table_name));
    console.log('🎉 Board system migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createBoardTables();
