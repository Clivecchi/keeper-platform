-- Add domainId and boardType columns to Board table (fresh start)
-- These columns are missing even though a previous migration claimed to add them

-- Add domainId as UUID (matching Domain.id type)
ALTER TABLE "Board" ADD COLUMN IF NOT EXISTS "domainId" UUID;

-- Add boardType for board classification
ALTER TABLE "Board" ADD COLUMN IF NOT EXISTS "boardType" TEXT;

-- Add index on domainId for performance
CREATE INDEX IF NOT EXISTS "Board_domainId_idx" ON "Board"("domainId");

-- Add unique constraint on (domainId, boardType) combination
-- Use DO block to handle case where it already exists
DO $$ BEGIN
  ALTER TABLE "Board" ADD CONSTRAINT "Board_domainId_boardType_key" UNIQUE ("domainId", "boardType");
EXCEPTION 
  WHEN duplicate_table THEN NULL;
  WHEN others THEN NULL;
END $$;

-- Add foreign key constraint
DO $$ BEGIN
  ALTER TABLE "Board" ADD CONSTRAINT "Board_domainId_fkey" 
  FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION 
  WHEN duplicate_object THEN NULL;
  WHEN others THEN NULL;
END $$;

