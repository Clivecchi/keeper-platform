-- Document Orientation lives on Dialog, beside Forward.
-- Lead-maintained operational map. Not regenerated each turn.

ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "orientation" TEXT;
ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "orientation_updated_at" TIMESTAMP(3);
ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "orientation_updated_by" TEXT;
