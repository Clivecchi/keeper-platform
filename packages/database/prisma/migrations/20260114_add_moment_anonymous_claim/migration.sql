ALTER TABLE "Moment"
  ALTER COLUMN "ownerId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "anonKey" TEXT,
  ADD COLUMN IF NOT EXISTS "claimToken" TEXT,
  ADD COLUMN IF NOT EXISTS "claimTokenExpiresAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Moment_claimToken_idx" ON "Moment" ("claimToken");
