-- Capability EntityKind registry (Pass 1)
CREATE TABLE IF NOT EXISTS "Capability" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "display_label" TEXT,
  "description" TEXT,
  "chronicle_blocks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "chronicle_actions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "domain_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Capability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Capability_slug_key" ON "Capability"("slug");
CREATE INDEX IF NOT EXISTS "Capability_kind_idx" ON "Capability"("kind");
CREATE INDEX IF NOT EXISTS "Capability_domain_id_idx" ON "Capability"("domain_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Capability_domain_id_fkey'
  ) THEN
    ALTER TABLE "Capability"
      ADD CONSTRAINT "Capability_domain_id_fkey"
      FOREIGN KEY ("domain_id") REFERENCES "Domain"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
