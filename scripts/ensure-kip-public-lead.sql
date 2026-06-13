-- Ensure Kip agent is public and Lead class for Agent Board frame
-- Run with: psql $DATABASE_URL -f scripts/ensure-kip-public-lead.sql
-- Or via Prisma: npx prisma db execute --file scripts/ensure-kip-public-lead.sql --schema packages/database/prisma/schema.prisma

-- Check current state
SELECT slug, visibility, role FROM kip_agents WHERE slug = 'kip';

-- Update if needed
UPDATE kip_agents
SET visibility = 'public', role = 'Lead'
WHERE slug = 'kip'
  AND (visibility IS NULL OR visibility != 'public' OR role IS NULL OR role != 'Lead');

-- Verify
SELECT slug, visibility, role FROM kip_agents WHERE slug = 'kip';
