-- AlterTable
ALTER TABLE "Integration" ADD COLUMN "chronicle_blocks" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Integration" ADD COLUMN "chronicle_actions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Integration" ADD COLUMN "is_gateway" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Integration" ADD COLUMN "display_label" TEXT;
ALTER TABLE "Integration" ADD COLUMN "description" TEXT;
ALTER TABLE "Integration" ADD COLUMN "connect_copy" TEXT;
