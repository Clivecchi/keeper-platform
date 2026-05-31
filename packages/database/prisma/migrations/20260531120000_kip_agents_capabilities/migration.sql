-- Add capabilities field to kip_agents (data-governed agent capability declarations)
ALTER TABLE "kip_agents" ADD COLUMN IF NOT EXISTS "capabilities" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
