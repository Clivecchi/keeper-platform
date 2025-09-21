-- CreateTable BoardAlias and RequestLog

CREATE TABLE IF NOT EXISTS "BoardAlias" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "domainId" text NOT NULL,
  "boardId" uuid NOT NULL,
  "alias" text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "BoardAlias_domainId_alias_key"
  ON "BoardAlias" ("domainId", "alias");

CREATE TABLE IF NOT EXISTS "RequestLog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "reqId" text NOT NULL,
  "at" timestamptz NOT NULL DEFAULT now(),
  "level" text NOT NULL,
  "step" text NOT NULL,
  "meta" jsonb
);

CREATE INDEX IF NOT EXISTS "RequestLog_reqId_at_idx"
  ON "RequestLog" ("reqId", "at");


