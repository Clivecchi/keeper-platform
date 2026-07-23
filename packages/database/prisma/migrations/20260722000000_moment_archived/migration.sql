-- Moment.archived -- same "archive, never delete" convention as Dialog.is_archived and LibraryItem.category:archive.
-- Used to clean up Realm's Kept nav bucket of pre-existing kept Moments that predate ke3p's dialog consolidation.

ALTER TABLE "Moment" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
