-- Insert a test Coordinator agent
INSERT INTO kip_agents (
  slug,
  name,
  purpose,
  model,
  agent_class,
  context_scope,
  memory_enabled,
  tools,
  permissions,
  config,
  status
) VALUES (
  'code-coordinator',
  'CodeCoordinator',
  'Orchestrates code-related tasks using specialized sub-agents for analysis, generation, and platform management',
  'gpt-4o',
  'Coordinator',
  'development',
  true,
  ARRAY['orchestration', 'coordination', 'workflow_management'],
  ARRAY['execute_agents', 'coordinate_workflows', 'manage_tasks'],
  '{"bundle": ["type-agent", "platform-agent", "code-agent"], "max_concurrent": 3, "execution_strategy": "sequential"}',
  'ready'
) ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  purpose = EXCLUDED.purpose,
  model = EXCLUDED.model,
  agent_class = EXCLUDED.agent_class,
  context_scope = EXCLUDED.context_scope,
  memory_enabled = EXCLUDED.memory_enabled,
  tools = EXCLUDED.tools,
  permissions = EXCLUDED.permissions,
  config = EXCLUDED.config,
  status = EXCLUDED.status,
  updated_at = NOW(); 