-- Add nullable soft-delete column for Domain
ALTER TABLE "Domain" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMPTZ NULL;
