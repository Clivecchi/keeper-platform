-- Document Forward / Step / Paths live on Dialog (Document durable identity).
-- No Journey, no new top-level entity.

ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "forward_title" TEXT;
ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "forward_description" TEXT;
ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "step_title" TEXT;
ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "step_body" TEXT;
ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "document_paths" JSONB;
