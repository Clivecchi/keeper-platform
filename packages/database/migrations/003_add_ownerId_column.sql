-- Adds missing ownerId column to Keeper to match Prisma schema
ALTER TABLE "Keeper"
ADD COLUMN IF NOT EXISTS "ownerId" uuid;

-- If existing data uses userId, attempt to backfill ownerId from userId column
UPDATE "Keeper" SET "ownerId" = "userId" WHERE "ownerId" IS NULL AND "userId" IS NOT NULL;

-- Add foreign key (cannot use IF NOT EXISTS inside constraint easily)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'keeper_ownerId_fkey'
    ) THEN
        ALTER TABLE "Keeper"
        ADD CONSTRAINT keeper_ownerId_fkey FOREIGN KEY ("ownerId") REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$; 