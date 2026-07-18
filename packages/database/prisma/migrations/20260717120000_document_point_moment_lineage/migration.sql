-- Document lifecycle on Dialog (Drafts → Kept → Presented as status).
-- Point→Moment lineage on Moment (additive; hierarchy models unchanged).

ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "document_status" TEXT NOT NULL DEFAULT 'drafts';

CREATE INDEX IF NOT EXISTS "Dialog_domain_id_document_status_idx" ON "Dialog"("domain_id", "document_status");

ALTER TABLE "Moment" ADD COLUMN IF NOT EXISTS "sourceDraftId" UUID;
ALTER TABLE "Moment" ADD COLUMN IF NOT EXISTS "sourcePointId" TEXT;
ALTER TABLE "Moment" ADD COLUMN IF NOT EXISTS "evolvedFromMomentId" TEXT;

CREATE INDEX IF NOT EXISTS "Moment_sourceDraftId_idx" ON "Moment"("sourceDraftId");
CREATE INDEX IF NOT EXISTS "Moment_sourcePointId_idx" ON "Moment"("sourcePointId");
CREATE INDEX IF NOT EXISTS "Moment_evolvedFromMomentId_idx" ON "Moment"("evolvedFromMomentId");
