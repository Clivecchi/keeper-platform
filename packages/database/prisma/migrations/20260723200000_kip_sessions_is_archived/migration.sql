-- kip_sessions.is_archived — archive, never delete (same convention as Dialog.is_archived).
-- Used to retire orphaned dialog-less echo sessions ("Domain Lead Collaboration") without wiping messages.

ALTER TABLE "kip_sessions" ADD COLUMN "is_archived" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "kip_sessions_is_archived_idx" ON "kip_sessions"("is_archived");
