-- Add frame_json to Domain model
-- Stores the per-domain frame configuration JSON (DomainFrameJson shape).
-- Nullable with an empty-object default; populated by the domain seed and
-- editable per domain without touching other domains.

ALTER TABLE "Domain" ADD COLUMN "frame_json" JSONB DEFAULT '{}';
