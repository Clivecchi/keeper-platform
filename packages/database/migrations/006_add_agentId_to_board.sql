-- 006_add_agentId_to_board.sql
-- Safely add agentId column to Board and set up FK and indexes

ALTER TABLE "Board" ADD COLUMN IF NOT EXISTS "agentId" UUID;

-- Index to speed up queries by agentId
CREATE INDEX IF NOT EXISTS "Board_agentId_idx" ON "Board"("agentId");

-- Foreign key to kip_agents(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'Board_agentId_fkey' AND table_name = 'Board'
  ) THEN
    ALTER TABLE "Board"
      ADD CONSTRAINT "Board_agentId_fkey"
      FOREIGN KEY ("agentId") REFERENCES "kip_agents"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;


