-- AlterTable (idempotent: IF NOT EXISTS)
ALTER TABLE "SoleReflection" ADD COLUMN IF NOT EXISTS "journeyId" TEXT;
ALTER TABLE "SoleReflection" ADD COLUMN IF NOT EXISTS "momentId" TEXT;
ALTER TABLE "SoleReflection" ADD COLUMN IF NOT EXISTS "engagementTemplateId" UUID;

ALTER TABLE "SoleMemoryCard" ADD COLUMN IF NOT EXISTS "journeyId" TEXT;
ALTER TABLE "SoleMemoryCard" ADD COLUMN IF NOT EXISTS "momentId" TEXT;
ALTER TABLE "SoleMemoryCard" ADD COLUMN IF NOT EXISTS "engagementTemplateId" UUID;

-- CreateIndex (idempotent: IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "SoleReflection_journeyId_idx" ON "SoleReflection"("journeyId");
CREATE INDEX IF NOT EXISTS "SoleReflection_momentId_idx" ON "SoleReflection"("momentId");
CREATE INDEX IF NOT EXISTS "SoleReflection_engagementTemplateId_idx" ON "SoleReflection"("engagementTemplateId");

CREATE INDEX IF NOT EXISTS "SoleMemoryCard_journeyId_idx" ON "SoleMemoryCard"("journeyId");
CREATE INDEX IF NOT EXISTS "SoleMemoryCard_momentId_idx" ON "SoleMemoryCard"("momentId");
CREATE INDEX IF NOT EXISTS "SoleMemoryCard_engagementTemplateId_idx" ON "SoleMemoryCard"("engagementTemplateId");

-- AddForeignKey (idempotent: only if constraint does not exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SoleReflection_journeyId_fkey') THEN
    ALTER TABLE "SoleReflection" ADD CONSTRAINT "SoleReflection_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SoleReflection_momentId_fkey') THEN
    ALTER TABLE "SoleReflection" ADD CONSTRAINT "SoleReflection_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SoleReflection_engagementTemplateId_fkey') THEN
    ALTER TABLE "SoleReflection" ADD CONSTRAINT "SoleReflection_engagementTemplateId_fkey" FOREIGN KEY ("engagementTemplateId") REFERENCES "engagement_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SoleMemoryCard_journeyId_fkey') THEN
    ALTER TABLE "SoleMemoryCard" ADD CONSTRAINT "SoleMemoryCard_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SoleMemoryCard_momentId_fkey') THEN
    ALTER TABLE "SoleMemoryCard" ADD CONSTRAINT "SoleMemoryCard_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SoleMemoryCard_engagementTemplateId_fkey') THEN
    ALTER TABLE "SoleMemoryCard" ADD CONSTRAINT "SoleMemoryCard_engagementTemplateId_fkey" FOREIGN KEY ("engagementTemplateId") REFERENCES "engagement_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
