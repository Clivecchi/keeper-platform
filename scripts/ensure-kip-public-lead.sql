-- Ensure Kip agent is public and Lead class for Agent Board frame
-- Run with: psql $DATABASE_URL -f scripts/ensure-kip-public-lead.sql
-- Or via Prisma: npx prisma db execute --file scripts/ensure-kip-public-lead.sql --schema packages/database/prisma/schema.prisma

-- Check current state
SELECT slug, visibility, agent_class FROM kip_agents WHERE slug = 'kip';

-- Update if needed
UPDATE kip_agents
SET visibility = 'public', agent_class = 'Lead'
WHERE slug = 'kip'
  AND (visibility IS NULL OR visibility != 'public' OR agent_class IS NULL OR agent_class != 'Lead');

-- Verify
SELECT slug, visibility, agent_class FROM kip_agents WHERE slug = 'kip';
