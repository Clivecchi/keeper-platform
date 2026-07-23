-- DialogCastMember: user-permission-driven cast enablement per Dialog.
-- Not CrossDomainShare (approval-gated domain↔domain sharing) — different shape.

CREATE TABLE IF NOT EXISTS "DialogCastMember" (
    "id" TEXT NOT NULL,
    "dialogId" TEXT NOT NULL,
    "agentId" UUID NOT NULL,
    "homeDomainId" TEXT NOT NULL,
    "enabledByUserId" TEXT NOT NULL,
    "enabledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DialogCastMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DialogCastMember_dialogId_agentId_key"
  ON "DialogCastMember"("dialogId", "agentId");

CREATE INDEX IF NOT EXISTS "DialogCastMember_dialogId_idx" ON "DialogCastMember"("dialogId");
CREATE INDEX IF NOT EXISTS "DialogCastMember_agentId_idx" ON "DialogCastMember"("agentId");
CREATE INDEX IF NOT EXISTS "DialogCastMember_homeDomainId_idx" ON "DialogCastMember"("homeDomainId");
CREATE INDEX IF NOT EXISTS "DialogCastMember_enabledByUserId_idx" ON "DialogCastMember"("enabledByUserId");

ALTER TABLE "DialogCastMember"
  ADD CONSTRAINT "DialogCastMember_dialogId_fkey"
  FOREIGN KEY ("dialogId") REFERENCES "Dialog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DialogCastMember"
  ADD CONSTRAINT "DialogCastMember_agentId_fkey"
  FOREIGN KEY ("agentId") REFERENCES "kip_agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DialogCastMember"
  ADD CONSTRAINT "DialogCastMember_homeDomainId_fkey"
  FOREIGN KEY ("homeDomainId") REFERENCES "Domain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DialogCastMember"
  ADD CONSTRAINT "DialogCastMember_enabledByUserId_fkey"
  FOREIGN KEY ("enabledByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
