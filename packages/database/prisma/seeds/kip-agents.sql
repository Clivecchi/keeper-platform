-- Seed file for KIP Agents with Model Integration
-- This file contains the initial agents for the Keeper Interface Protocol with real model configurations

INSERT INTO kip_agents (slug, name, purpose, model, context_scope, memory_enabled, tools, permissions, config, status, model_provider, model_settings) VALUES
('type-agent', 'TypeAgent', 'Extracts structured data and intent from natural language inputs', 'claude-3-5-sonnet-20241022', 'user_input', true, 
 ARRAY['text_analysis', 'entity_extraction', 'intent_classification'], 
 ARRAY['read_user_input', 'extract_entities'], 
 '{"confidence_threshold": 0.7, "supported_formats": ["json", "yaml"]}', 'ready',
 'anthropic',
 '{"model": "claude-3-5-sonnet-20241022", "temperature": 0.1, "max_tokens": 4000, "retry": {"max_retries": 3, "retry_delay_ms": 1000}}'),

('platform-agent', 'PlatformAgent', 'Manages platform operations and system orchestration', 'gpt-4o', 'platform_wide', true,
 ARRAY['database_operations', 'user_management', 'system_monitoring'],
 ARRAY['read_system_data', 'write_system_data', 'manage_users'],
 '{"system_access_level": "admin", "monitoring_interval": 300}', 'ready',
 'openai',
 '{"model": "gpt-4o", "temperature": 0.2, "max_tokens": 8000, "top_p": 0.9, "retry": {"max_retries": 5, "retry_delay_ms": 2000}}'),

('code-agent', 'CodeAgent', 'Generates, analyzes, and maintains code across the platform', 'gpt-4o', 'codebase', true,
 ARRAY['code_generation', 'code_analysis', 'debugging', 'testing'],
 ARRAY['read_codebase', 'write_code', 'execute_tests'],
 '{"supported_languages": ["typescript", "javascript", "sql", "prisma"], "code_style": "strict"}', 'ready',
 'openai',
 '{"model": "gpt-4o", "temperature": 0.0, "max_tokens": 8000, "frequency_penalty": 0.1, "presence_penalty": 0.1, "retry": {"max_retries": 3, "retry_delay_ms": 1500}}')

ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  purpose = EXCLUDED.purpose,
  model = EXCLUDED.model,
  context_scope = EXCLUDED.context_scope,
  memory_enabled = EXCLUDED.memory_enabled,
  tools = EXCLUDED.tools,
  permissions = EXCLUDED.permissions,
  config = EXCLUDED.config,
  status = EXCLUDED.status,
  model_provider = EXCLUDED.model_provider,
  model_settings = EXCLUDED.model_settings,
  updated_at = now(); 