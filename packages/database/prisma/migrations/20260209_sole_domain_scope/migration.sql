-- SOLE domain scope (Option B): domain anchor + keeper-specific
-- SoleReflection and SoleMemoryCard can be linked to domain (anchor) or keeper (specific)
-- Constraint: (keeperId IS NOT NULL) OR (domainId IS NOT NULL)

-- SoleReflection: add domainId, make keeperId nullable
ALTER TABLE "SoleReflection" ADD COLUMN IF NOT EXISTS "domainId" TEXT;
ALTER TABLE "SoleReflection" ALTER COLUMN "keeperId" DROP NOT NULL;

ALTER TABLE "SoleReflection"
  ADD CONSTRAINT "SoleReflection_domainId_fkey"
  FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "SoleReflection_domainId_idx" ON "SoleReflection"("domainId");

ALTER TABLE "SoleReflection"
  ADD CONSTRAINT "SoleReflection_scope_check"
  CHECK (("keeperId" IS NOT NULL) OR ("domainId" IS NOT NULL));

-- SoleMemoryCard: add domainId, make keeperId nullable
ALTER TABLE "SoleMemoryCard" ADD COLUMN IF NOT EXISTS "domainId" TEXT;
ALTER TABLE "SoleMemoryCard" ALTER COLUMN "keeperId" DROP NOT NULL;

ALTER TABLE "SoleMemoryCard"
  ADD CONSTRAINT "SoleMemoryCard_domainId_fkey"
  FOREIGN KEY ("domainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "SoleMemoryCard_domainId_idx" ON "SoleMemoryCard"("domainId");

ALTER TABLE "SoleMemoryCard"
  ADD CONSTRAINT "SoleMemoryCard_scope_check"
  CHECK (("keeperId" IS NOT NULL) OR ("domainId" IS NOT NULL));
