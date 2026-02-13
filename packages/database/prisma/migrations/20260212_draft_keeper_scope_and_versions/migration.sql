-- Add keeper_id to kip_drafts (keeper-scoped drafts)
ALTER TABLE "kip_drafts" ADD COLUMN IF NOT EXISTS "keeper_id" TEXT;

ALTER TABLE "kip_drafts"
  ADD CONSTRAINT "kip_drafts_keeper_id_fkey"
  FOREIGN KEY ("keeper_id") REFERENCES "Keeper"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "kip_drafts_keeper_owner_idx"
  ON "kip_drafts" ("keeper_id", "owner_id");

-- Drop old unique constraint
DROP INDEX IF EXISTS "kip_drafts_domain_owner_kind_key_uq";

-- Partial unique: domain-level drafts (keeper_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS "kip_drafts_domain_owner_kind_key_domain_uq"
  ON "kip_drafts" ("domain_id", "owner_id", "kind", "key")
  WHERE "keeper_id" IS NULL;

-- Partial unique: keeper-level drafts (keeper_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS "kip_drafts_domain_keeper_owner_kind_key_uq"
  ON "kip_drafts" ("domain_id", "keeper_id", "owner_id", "kind", "key")
  WHERE "keeper_id" IS NOT NULL;

-- Create kip_draft_versions for versioning
CREATE TABLE IF NOT EXISTS "kip_draft_versions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "draft_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "spec_json" JSONB NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "status" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by_session_id" UUID,
  CONSTRAINT "kip_draft_versions_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "kip_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "kip_draft_versions_draft_version_uq"
  ON "kip_draft_versions" ("draft_id", "version");

CREATE INDEX IF NOT EXISTS "kip_draft_versions_draft_id_idx"
  ON "kip_draft_versions" ("draft_id");
