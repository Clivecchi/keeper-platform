-- Insert Lead agents for standalone AI interfaces
INSERT INTO kip_agents (
  slug,
  name,
  purpose,
  model,
  role,
  context_scope,
  memory_enabled,
  tools,
  permissions,
  config,
  status
) VALUES 
-- Kip Lead Agent
(
  'kip',
  'Kip',
  'Your intelligent assistant for thought processing, idea organization, and creative collaboration. Kip helps you capture insights, analyze patterns, and coordinate tasks across the Keeper platform.',
  'claude-3.5-sonnet',
  'Lead',
  'user_interaction',
  true,
  ARRAY['thought_analysis', 'idea_organization', 'task_coordination', 'conversation'],
  ARRAY['read_user_data', 'create_memories', 'coordinate_agents', 'access_platform'],
  '{"tagline": "Your AI companion for thoughts and ideas", "personality": "helpful, insightful, organized", "capabilities": ["thought processing", "idea organization", "task coordination"], "avatar": "🤖", "theme_color": "#3b82f6"}',
  'ready'
),
-- CEO Executive Assistant
(
  'ceox',
  'CeoX',
  'Executive AI assistant specialized in strategic thinking, business analysis, and leadership support. CeoX provides high-level insights, strategic recommendations, and executive decision support.',
  'gpt-4o',
  'Lead',
  'executive',
  true,
  ARRAY['strategic_analysis', 'business_intelligence', 'decision_support', 'leadership_coaching'],
  ARRAY['access_business_data', 'generate_reports', 'strategic_planning', 'executive_support'],
  '{"tagline": "Your strategic AI executive partner", "personality": "strategic, analytical, decisive", "capabilities": ["strategic analysis", "business intelligence", "executive coaching"], "avatar": "👔", "theme_color": "#dc2626"}',
  'ready'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  purpose = EXCLUDED.purpose,
  model = EXCLUDED.model,
  role = EXCLUDED.role,
  context_scope = EXCLUDED.context_scope,
  memory_enabled = EXCLUDED.memory_enabled,
  tools = EXCLUDED.tools,
  permissions = EXCLUDED.permissions,
  config = EXCLUDED.config,
  status = EXCLUDED.status,
  updated_at = NOW(); 