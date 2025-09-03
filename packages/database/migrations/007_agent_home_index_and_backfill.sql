-- 007_agent_home_index_and_backfill.sql
-- Backfill Board.agentId from JSON safely and enforce one home per agent

-- Backfill only valid UUID strings from data->>'agentId'
UPDATE "Board"
SET "agentId" = (data->>'agentId')::uuid
WHERE "agentId" IS NULL
  AND (data ? 'agentId')
  AND (data->>'agentId') ~* '^[0-9a-f-]{36}$';

-- Enforce one home board per agent (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS "Board_one_home_per_agent"
ON "Board" ("agentId")
WHERE "agentId" IS NOT NULL;

