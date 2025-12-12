-- Add topic metadata fields to kip_sessions
ALTER TABLE "kip_sessions"
  ADD COLUMN IF NOT EXISTS "topic" TEXT,
  ADD COLUMN IF NOT EXISTS "summary" TEXT,
  ADD COLUMN IF NOT EXISTS "tags" TEXT[],
  ADD COLUMN IF NOT EXISTS "primary_keeper_id" TEXT,
  ADD COLUMN IF NOT EXISTS "primary_journey_id" TEXT;

-- Ensure tags is non-null with an empty-array default
UPDATE "kip_sessions" SET "tags" = '{}' WHERE "tags" IS NULL;
ALTER TABLE "kip_sessions" ALTER COLUMN "tags" SET DEFAULT '{}';
ALTER TABLE "kip_sessions" ALTER COLUMN "tags" SET NOT NULL;

