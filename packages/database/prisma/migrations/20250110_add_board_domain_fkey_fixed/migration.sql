-- Step 1: Drop the constraint if it exists (cleanup from failed attempt)
DO $$ BEGIN
  ALTER TABLE "Board" DROP CONSTRAINT IF EXISTS "Board_domainId_fkey";
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Step 2: Convert Board.domainId from TEXT to UUID
-- First, set invalid values to NULL
UPDATE "Board" SET "domainId" = NULL WHERE "domainId" IS NOT NULL AND "domainId" !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Then alter column type
ALTER TABLE "Board" ALTER COLUMN "domainId" TYPE UUID USING "domainId"::UUID;

-- Step 3: Add the foreign key constraint
ALTER TABLE "Board" ADD CONSTRAINT "Board_domainId_fkey" 
FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

