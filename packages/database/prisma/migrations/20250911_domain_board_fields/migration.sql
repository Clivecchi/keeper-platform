-- Add domainId and boardType to Board, with indexes
ALTER TABLE "Board" ADD COLUMN IF NOT EXISTS "domainId" TEXT;
ALTER TABLE "Board" ADD COLUMN IF NOT EXISTS "boardType" TEXT;

-- Indexes to support lookup and uniqueness
CREATE INDEX IF NOT EXISTS "Board_domainId_idx" ON "Board"("domainId");
DO $$ BEGIN
  CREATE UNIQUE INDEX "Board_domainId_boardType_key" ON "Board"("domainId","boardType");
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

