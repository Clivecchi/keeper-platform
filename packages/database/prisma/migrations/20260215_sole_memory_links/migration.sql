-- AlterTable
ALTER TABLE "SoleReflection" ADD COLUMN "journeyId" TEXT,
ADD COLUMN "momentId" TEXT,
ADD COLUMN "engagementTemplateId" UUID;

-- AlterTable
ALTER TABLE "SoleMemoryCard" ADD COLUMN "journeyId" TEXT,
ADD COLUMN "momentId" TEXT,
ADD COLUMN "engagementTemplateId" UUID;

-- CreateIndex
CREATE INDEX "SoleReflection_journeyId_idx" ON "SoleReflection"("journeyId");

-- CreateIndex
CREATE INDEX "SoleReflection_momentId_idx" ON "SoleReflection"("momentId");

-- CreateIndex
CREATE INDEX "SoleReflection_engagementTemplateId_idx" ON "SoleReflection"("engagementTemplateId");

-- CreateIndex
CREATE INDEX "SoleMemoryCard_journeyId_idx" ON "SoleMemoryCard"("journeyId");

-- CreateIndex
CREATE INDEX "SoleMemoryCard_momentId_idx" ON "SoleMemoryCard"("momentId");

-- CreateIndex
CREATE INDEX "SoleMemoryCard_engagementTemplateId_idx" ON "SoleMemoryCard"("engagementTemplateId");

-- AddForeignKey
ALTER TABLE "SoleReflection" ADD CONSTRAINT "SoleReflection_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoleReflection" ADD CONSTRAINT "SoleReflection_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoleReflection" ADD CONSTRAINT "SoleReflection_engagementTemplateId_fkey" FOREIGN KEY ("engagementTemplateId") REFERENCES "engagement_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoleMemoryCard" ADD CONSTRAINT "SoleMemoryCard_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoleMemoryCard" ADD CONSTRAINT "SoleMemoryCard_momentId_fkey" FOREIGN KEY ("momentId") REFERENCES "Moment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoleMemoryCard" ADD CONSTRAINT "SoleMemoryCard_engagementTemplateId_fkey" FOREIGN KEY ("engagementTemplateId") REFERENCES "engagement_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
