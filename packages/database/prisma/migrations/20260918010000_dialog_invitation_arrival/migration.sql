-- First Introduction: durable Dialog ↔ DomainInvitation link.
ALTER TABLE "Dialog" ADD COLUMN IF NOT EXISTS "invitationId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Dialog_invitationId_key" ON "Dialog"("invitationId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Dialog_invitationId_fkey'
  ) THEN
    ALTER TABLE "Dialog"
      ADD CONSTRAINT "Dialog_invitationId_fkey"
      FOREIGN KEY ("invitationId") REFERENCES "DomainInvitation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
