-- Production drift repair:
-- An applied migration (20260802170000_dialog_document_sections_rename) renamed
-- Dialog.document_paths -> document_sections, but that migration is not in this
-- repo and the platform canon is document_paths (Path declarations on Dialog).
-- Restore the canonical column name so Prisma Dialog queries stop 500ing.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Dialog' AND column_name = 'document_sections'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Dialog' AND column_name = 'document_paths'
  ) THEN
    ALTER TABLE "Dialog" RENAME COLUMN "document_sections" TO "document_paths";
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Dialog' AND column_name = 'document_paths'
  ) THEN
    ALTER TABLE "Dialog" ADD COLUMN "document_paths" JSONB;
  END IF;
END
$$;