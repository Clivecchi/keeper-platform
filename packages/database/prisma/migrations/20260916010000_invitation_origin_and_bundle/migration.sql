-- Invitation origin + bundle, and the first Domain that brought a person to Keeper.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invitedFromDomainId" TEXT;

ALTER TABLE "DomainInvitation" ADD COLUMN IF NOT EXISTS "originDomainId" TEXT;
ALTER TABLE "DomainInvitation" ADD COLUMN IF NOT EXISTS "bundleId" TEXT;

UPDATE "DomainInvitation"
SET "originDomainId" = "domainId"
WHERE "originDomainId" IS NULL;

CREATE INDEX IF NOT EXISTS "DomainInvitation_originDomainId_idx" ON "DomainInvitation"("originDomainId");
CREATE INDEX IF NOT EXISTS "DomainInvitation_bundleId_idx" ON "DomainInvitation"("bundleId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'DomainInvitation_originDomainId_fkey'
  ) THEN
    ALTER TABLE "DomainInvitation"
      ADD CONSTRAINT "DomainInvitation_originDomainId_fkey"
      FOREIGN KEY ("originDomainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
