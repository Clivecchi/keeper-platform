-- Explicit Document component drafts (non-manuscript) — distinct from Nav-only dialog_id links.
ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "document_components" JSONB;
