-- Rename agent_class to role on kip_agents
ALTER TABLE "kip_agents" RENAME COLUMN "agent_class" TO "role";
