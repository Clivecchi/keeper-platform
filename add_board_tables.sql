-- Safe migration to add Board tables only
-- This script checks for table existence before creating

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

-- Add unique constraint and indexes for Board (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Board_keeperId_slug_key') THEN
        CREATE UNIQUE INDEX "Board_keeperId_slug_key" ON "Board"("keeperId", "slug");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'Board_keeperId_idx') THEN
        CREATE INDEX "Board_keeperId_idx" ON "Board"("keeperId");
    END IF;
END $$;

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

-- Add constraints and indexes for FrameInstance (only if they don't exist)
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
    
    -- Add indexes if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FrameInstance_boardId_idx') THEN
        CREATE INDEX "FrameInstance_boardId_idx" ON "FrameInstance"("boardId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FrameInstance_entityType_entityId_idx') THEN
        CREATE INDEX "FrameInstance_entityType_entityId_idx" ON "FrameInstance"("entityType", "entityId");
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'FrameInstance_currentContentId_key') THEN
        CREATE UNIQUE INDEX "FrameInstance_currentContentId_key" ON "FrameInstance"("currentContentId");
    END IF;
END $$;

-- Print success message
SELECT 'Board system tables created successfully!' as result;
