-- LibraryItem category tags + honest source_type for draft-originated pointers.
-- Used by ke3p Becoming Together consolidation (archive orphaned drafts as Library items).

ALTER TYPE "LibraryItemSourceType" ADD VALUE 'draft';

ALTER TABLE "LibraryItem" ADD COLUMN "category" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
