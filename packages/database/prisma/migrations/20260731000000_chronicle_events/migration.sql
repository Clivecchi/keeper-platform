-- Chronicle Event — Dialog-scoped History timeline (not Realm arrival feed).
CREATE TABLE IF NOT EXISTS "chronicle_events" (
    "id" TEXT NOT NULL,
    "dialogId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "actorSlug" TEXT,
    "eventType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "anchor" JSONB,
    "parentEventId" TEXT,
    "sessionId" UUID,
    "messageId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chronicle_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "chronicle_events_dialogId_createdAt_idx"
  ON "chronicle_events"("dialogId", "createdAt");

CREATE INDEX IF NOT EXISTS "chronicle_events_domainId_createdAt_idx"
  ON "chronicle_events"("domainId", "createdAt");

CREATE INDEX IF NOT EXISTS "chronicle_events_parentEventId_idx"
  ON "chronicle_events"("parentEventId");

CREATE INDEX IF NOT EXISTS "chronicle_events_sessionId_idx"
  ON "chronicle_events"("sessionId");

ALTER TABLE "chronicle_events"
  ADD CONSTRAINT "chronicle_events_dialogId_fkey"
  FOREIGN KEY ("dialogId") REFERENCES "Dialog"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chronicle_events"
  ADD CONSTRAINT "chronicle_events_domainId_fkey"
  FOREIGN KEY ("domainId") REFERENCES "Domain"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chronicle_events"
  ADD CONSTRAINT "chronicle_events_parentEventId_fkey"
  FOREIGN KEY ("parentEventId") REFERENCES "chronicle_events"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
