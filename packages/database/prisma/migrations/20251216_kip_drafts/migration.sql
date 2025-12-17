-- Create kip_drafts as a domain-scoped artifact directory
CREATE TABLE IF NOT EXISTS "kip_drafts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "domain_id" UUID NOT NULL,
  "owner_id" UUID NOT NULL,
  "agent_id" UUID,
  "kind" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "spec_json" JSONB NOT NULL DEFAULT '{}',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kip_drafts_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "kip_drafts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "kip_drafts_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "kip_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "kip_drafts_domain_owner_kind_status_idx"
  ON "kip_drafts" ("domain_id", "owner_id", "kind", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "kip_drafts_domain_owner_kind_key_uq"
  ON "kip_drafts" ("domain_id", "owner_id", "kind", "key");

-- Session pointer to active draft
ALTER TABLE "kip_sessions"
  ADD COLUMN IF NOT EXISTS "active_draft_id" UUID;

ALTER TABLE "kip_sessions"
  ADD CONSTRAINT "kip_sessions_active_draft_id_fkey"
  FOREIGN KEY ("active_draft_id") REFERENCES "kip_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "kip_sessions_active_draft_idx"
  ON "kip_sessions" ("active_draft_id");

