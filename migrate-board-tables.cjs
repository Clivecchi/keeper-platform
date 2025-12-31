const { Client } = require('pg');

async function createBoardTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to Railway database');

    // Execute the migration SQL
    const sql = `
      -- Create Board table if it doesn't exist
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

      -- Create FrameConfig table if it doesn't exist
      CREATE TABLE IF NOT EXISTS "FrameConfig" (
          "id" UUID NOT NULL DEFAULT gen_random_uuid(),
          "name" TEXT NOT NULL,
          "description" TEXT,
          "theme" JSONB,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "FrameConfig_pkey" PRIMARY KEY ("id")
      );

      -- Create FrameInstance table if it doesn't exist
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

    console.log('🔄 Creating Board system tables...');
    await client.query(sql);
    console.log('✅ Board system tables created successfully!');

    // Create indexes and constraints
    const indexSql = `
      -- Add Board indexes if they don't exist
      CREATE UNIQUE INDEX IF NOT EXISTS "Board_keeperId_slug_key" ON "Board"("keeperId", "slug");
      CREATE INDEX IF NOT EXISTS "Board_keeperId_idx" ON "Board"("keeperId");

      -- Add FrameInstance constraints and indexes
      DO $$
      BEGIN
          -- Add foreign key constraints if they don't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='FrameInstance_configId_fkey') THEN
              ALTER TABLE "FrameInstance" ADD CONSTRAINT "FrameInstance_configId_fkey" 
                  FOREIGN KEY ("configId") REFERENCES "FrameConfig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='FrameInstance_boardId_fkey') THEN
              ALTER TABLE "FrameInstance" ADD CONSTRAINT "FrameInstance_boardId_fkey" 
                  FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE SET NULL ON UPDATE CASCADE;
          END IF;
      END $$;

      -- Add indexes if they don't exist
      CREATE INDEX IF NOT EXISTS "FrameInstance_boardId_idx" ON "FrameInstance"("boardId");
      CREATE INDEX IF NOT EXISTS "FrameInstance_entityType_entityId_idx" ON "FrameInstance"("entityType", "entityId");
      CREATE UNIQUE INDEX IF NOT EXISTS "FrameInstance_currentContentId_key" ON "FrameInstance"("currentContentId");
    `;

    console.log('🔄 Creating indexes and constraints...');
    await client.query(indexSql);
    console.log('✅ Indexes and constraints created successfully!');

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_name IN ('Board', 'FrameInstance', 'FrameConfig')
      ORDER BY table_name;
    `);

    console.log('📋 Created tables:', result.rows.map(row => row.table_name));
    
    console.log('🎉 Board system migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createBoardTables();
