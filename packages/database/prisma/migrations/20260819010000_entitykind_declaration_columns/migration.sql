-- EntityKind declaration columns for remaining Partial EntityKind models.
-- Domain already has description; add display_label + chronicle arrays only.

ALTER TABLE "Journey" ADD COLUMN IF NOT EXISTS "display_label" TEXT;
ALTER TABLE "Journey" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Journey" ADD COLUMN IF NOT EXISTS "chronicle_blocks" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Journey" ADD COLUMN IF NOT EXISTS "chronicle_actions" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Journey"
SET "display_label" = "name"
WHERE "display_label" IS NULL OR TRIM("display_label") = '';

UPDATE "Journey"
SET "description" = "forward"
WHERE "description" IS NULL OR TRIM("description") = '';

ALTER TABLE "Path" ADD COLUMN IF NOT EXISTS "display_label" TEXT;
ALTER TABLE "Path" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Path" ADD COLUMN IF NOT EXISTS "chronicle_blocks" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Path" ADD COLUMN IF NOT EXISTS "chronicle_actions" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Path"
SET "display_label" = "name"
WHERE "display_label" IS NULL OR TRIM("display_label") = '';

UPDATE "Path"
SET "description" = "prelude"
WHERE "description" IS NULL OR TRIM("description") = '';

ALTER TABLE "Moment" ADD COLUMN IF NOT EXISTS "display_label" TEXT;
ALTER TABLE "Moment" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Moment" ADD COLUMN IF NOT EXISTS "chronicle_blocks" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Moment" ADD COLUMN IF NOT EXISTS "chronicle_actions" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Moment"
SET "display_label" = "title"
WHERE "display_label" IS NULL OR TRIM("display_label") = '';

UPDATE "Moment"
SET "description" = LEFT("narrative", 500)
WHERE "description" IS NULL OR TRIM("description") = '';

ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "display_label" TEXT;
ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "chronicle_blocks" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "chronicle_actions" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Dialog"
SET "display_label" = "title"
WHERE "display_label" IS NULL OR TRIM("display_label") = '';

UPDATE "Dialog"
SET "description" = COALESCE("forward_description", "forward_title")
WHERE "description" IS NULL OR TRIM("description") = '';

ALTER TABLE "kip_drafts" ADD COLUMN IF NOT EXISTS "display_label" TEXT;
ALTER TABLE "kip_drafts" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "kip_drafts" ADD COLUMN IF NOT EXISTS "chronicle_blocks" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "kip_drafts" ADD COLUMN IF NOT EXISTS "chronicle_actions" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "kip_drafts"
SET "display_label" = "title"
WHERE "display_label" IS NULL OR TRIM("display_label") = '';

UPDATE "kip_drafts"
SET "description" = "summary"
WHERE ("description" IS NULL OR TRIM("description") = '') AND "summary" IS NOT NULL;

ALTER TABLE "kip_agents" ADD COLUMN IF NOT EXISTS "display_label" TEXT;
ALTER TABLE "kip_agents" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "kip_agents" ADD COLUMN IF NOT EXISTS "chronicle_blocks" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "kip_agents" ADD COLUMN IF NOT EXISTS "chronicle_actions" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "kip_agents"
SET "display_label" = "name"
WHERE "display_label" IS NULL OR TRIM("display_label") = '';

UPDATE "kip_agents"
SET "description" = "purpose"
WHERE "description" IS NULL OR TRIM("description") = '';

ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "display_label" TEXT;
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "chronicle_blocks" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "chronicle_actions" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Domain"
SET "display_label" = "name"
WHERE "display_label" IS NULL OR TRIM("display_label") = '';
