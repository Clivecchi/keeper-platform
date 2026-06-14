-- AgentCapability join table (Pass 2a) + one-time backfill from kip_agents arrays.

CREATE TABLE IF NOT EXISTS "AgentCapability" (
  "id" TEXT NOT NULL,
  "agent_id" UUID NOT NULL,
  "capability_id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AgentCapability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentCapability_agent_id_capability_id_key"
  ON "AgentCapability"("agent_id", "capability_id");
CREATE INDEX IF NOT EXISTS "AgentCapability_capability_id_idx" ON "AgentCapability"("capability_id");
CREATE INDEX IF NOT EXISTS "AgentCapability_agent_id_idx" ON "AgentCapability"("agent_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AgentCapability_agent_id_fkey'
  ) THEN
    ALTER TABLE "AgentCapability"
      ADD CONSTRAINT "AgentCapability_agent_id_fkey"
      FOREIGN KEY ("agent_id") REFERENCES "kip_agents"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AgentCapability_capability_id_fkey'
  ) THEN
    ALTER TABLE "AgentCapability"
      ADD CONSTRAINT "AgentCapability_capability_id_fkey"
      FOREIGN KEY ("capability_id") REFERENCES "Capability"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill: capabilities[] → source "capabilities"
INSERT INTO "AgentCapability" ("id", "agent_id", "capability_id", "source", "created_at")
SELECT
  'ac_' || replace(gen_random_uuid()::text, '-', ''),
  a."id",
  c."id",
  'capabilities',
  CURRENT_TIMESTAMP
FROM "kip_agents" a
CROSS JOIN LATERAL unnest(a."capabilities") AS u(cap_slug)
INNER JOIN "Capability" c ON c."slug" = u.cap_slug
ON CONFLICT ("agent_id", "capability_id") DO NOTHING;

-- Backfill: tools[] → source "tools"
INSERT INTO "AgentCapability" ("id", "agent_id", "capability_id", "source", "created_at")
SELECT
  'ac_' || replace(gen_random_uuid()::text, '-', ''),
  a."id",
  c."id",
  'tools',
  CURRENT_TIMESTAMP
FROM "kip_agents" a
CROSS JOIN LATERAL unnest(a."tools") AS u(cap_slug)
INNER JOIN "Capability" c ON c."slug" = u.cap_slug
ON CONFLICT ("agent_id", "capability_id") DO NOTHING;

-- Backfill: permissions[] → source "permissions"
INSERT INTO "AgentCapability" ("id", "agent_id", "capability_id", "source", "created_at")
SELECT
  'ac_' || replace(gen_random_uuid()::text, '-', ''),
  a."id",
  c."id",
  'permissions',
  CURRENT_TIMESTAMP
FROM "kip_agents" a
CROSS JOIN LATERAL unnest(a."permissions") AS u(cap_slug)
INNER JOIN "Capability" c ON c."slug" = u.cap_slug
ON CONFLICT ("agent_id", "capability_id") DO NOTHING;

-- Report slugs with no matching Capability row (do not fail migration).
DO $$
DECLARE
  unmatched TEXT;
BEGIN
  SELECT string_agg(DISTINCT x.cap_slug, ', ' ORDER BY x.cap_slug)
  INTO unmatched
  FROM (
    SELECT unnest("capabilities") AS cap_slug FROM "kip_agents"
    UNION
    SELECT unnest("tools") AS cap_slug FROM "kip_agents"
    UNION
    SELECT unnest("permissions") AS cap_slug FROM "kip_agents"
  ) x
  WHERE x.cap_slug IS NOT NULL
    AND x.cap_slug <> ''
    AND NOT EXISTS (SELECT 1 FROM "Capability" c WHERE c."slug" = x.cap_slug);

  IF unmatched IS NOT NULL AND unmatched <> '' THEN
    RAISE NOTICE 'AgentCapability backfill — unmatched slugs (skipped): %', unmatched;
  ELSE
    RAISE NOTICE 'AgentCapability backfill — no unmatched slugs';
  END IF;
END $$;
