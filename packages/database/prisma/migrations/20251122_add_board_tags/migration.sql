-- 2025-11-22: Add tags column to Board for canonical system boards
ALTER TABLE "Board"
ADD COLUMN IF NOT EXISTS "tags" JSONB NOT NULL DEFAULT '[]';




