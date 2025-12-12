-- Add topic metadata fields to kip_sessions
ALTER TABLE "kip_sessions"
  ADD COLUMN IF NOT EXISTS "topic" TEXT,
  ADD COLUMN IF NOT EXISTS "summary" TEXT,
  ADD COLUMN IF NOT EXISTS "tags" TEXT[],
  ADD COLUMN IF NOT EXISTS "primary_keeper_id" TEXT,
  ADD COLUMN IF NOT EXISTS "primary_journey_id" TEXT;

