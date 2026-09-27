-- Humans present on a Dialog. Agents stay on DialogCastMember.

CREATE TABLE IF NOT EXISTS "DialogHumanMember" (
    "id" TEXT NOT NULL,
    "dialogId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "homeDomainId" TEXT,
    "addedByUserId" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'manual',

    CONSTRAINT "DialogHumanMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DialogHumanMember_dialogId_userId_key"
  ON "DialogHumanMember"("dialogId", "userId");

CREATE INDEX IF NOT EXISTS "DialogHumanMember_dialogId_idx" ON "DialogHumanMember"("dialogId");
CREATE INDEX IF NOT EXISTS "DialogHumanMember_userId_idx" ON "DialogHumanMember"("userId");
CREATE INDEX IF NOT EXISTS "DialogHumanMember_homeDomainId_idx" ON "DialogHumanMember"("homeDomainId");
CREATE INDEX IF NOT EXISTS "DialogHumanMember_addedByUserId_idx" ON "DialogHumanMember"("addedByUserId");

ALTER TABLE "DialogHumanMember"
  ADD CONSTRAINT "DialogHumanMember_dialogId_fkey"
  FOREIGN KEY ("dialogId") REFERENCES "Dialog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DialogHumanMember"
  ADD CONSTRAINT "DialogHumanMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DialogHumanMember"
  ADD CONSTRAINT "DialogHumanMember_homeDomainId_fkey"
  FOREIGN KEY ("homeDomainId") REFERENCES "Domain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DialogHumanMember"
  ADD CONSTRAINT "DialogHumanMember_addedByUserId_fkey"
  FOREIGN KEY ("addedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
