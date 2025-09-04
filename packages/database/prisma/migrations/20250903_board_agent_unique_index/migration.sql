-- 2.1 partial unique index: at most one board per agent
CREATE UNIQUE INDEX IF NOT EXISTS "Board_one_home_per_agent"
ON "Board" ("agentId") WHERE "agentId" IS NOT NULL;


