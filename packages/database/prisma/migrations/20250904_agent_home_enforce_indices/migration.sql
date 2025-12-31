-- Enforce one Agent Home Board per agent (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS "Board_agent_unique"
ON "Board" ("agentId") WHERE "agentId" IS NOT NULL;

-- Frames: one role per board
CREATE UNIQUE INDEX IF NOT EXISTS "Frame_board_role_unique"
ON "FrameInstance" ("boardId","role") WHERE "role" IS NOT NULL;

-- Frame configs: enforce unique default names globally
-- TODO: If per-frame config uniqueness is required, introduce a frameId column on FrameConfig.
CREATE UNIQUE INDEX IF NOT EXISTS "FrameConfig_name_unique"
ON "FrameConfig" ("name");

-- Backfill Board.agentId from JSON if missing
UPDATE "Board"
SET "agentId" = (data->>'agentId')::uuid
WHERE "agentId" IS NULL AND (data ? 'agentId');


