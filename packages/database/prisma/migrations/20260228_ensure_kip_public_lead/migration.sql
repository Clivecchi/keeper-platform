-- Ensure Kip agent is public and Lead class for Agent Board frame
-- Required for GET /api/kip/agents?slug=kip (public route) to return agent metadata
UPDATE kip_agents
SET visibility = 'public', agent_class = 'Lead'
WHERE slug = 'kip'
  AND (visibility IS NULL OR visibility != 'public' OR agent_class IS NULL OR agent_class != 'Lead');
