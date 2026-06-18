-- Keeper EntityKind — Recipe declaration columns (Session C)

ALTER TABLE "Keeper" ADD COLUMN IF NOT EXISTS "display_label" TEXT;
ALTER TABLE "Keeper" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Keeper" ADD COLUMN IF NOT EXISTS "chronicle_blocks" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Keeper" ADD COLUMN IF NOT EXISTS "chronicle_actions" TEXT[] DEFAULT ARRAY[]::TEXT[];

UPDATE "Keeper"
SET "display_label" = "title"
WHERE "display_label" IS NULL OR TRIM("display_label") = '';

UPDATE "Keeper"
SET "description" = "purpose"
WHERE "description" IS NULL OR TRIM("description") = '';

UPDATE "Keeper"
SET "chronicle_blocks" = ARRAY['definition', 'journeys', 'engagement_templates', 'sole_memory']::TEXT[]
WHERE cardinality("chronicle_blocks") = 0;

ALTER TABLE "Keeper" DROP COLUMN IF EXISTS "presenceSchema";
