-- Populate Integration Chronicle declaration fields (Stage 2 rendering refactor)

UPDATE "Integration" SET
  "display_label" = 'Railway',
  "description" = 'Infrastructure hosting — services, deployments, and logs',
  "connect_copy" = 'Connect Railway to monitor deployments and manage services from Chronicle',
  "is_gateway" = false,
  "chronicle_blocks" = ARRAY['connection_status', 'deployment_feed'],
  "chronicle_actions" = ARRAY['view_logs', 'redeploy', 'disconnect']
WHERE "service" = 'railway';

UPDATE "Integration" SET
  "display_label" = 'Vercel',
  "description" = 'Frontend deployments and build pipeline',
  "connect_copy" = 'Connect Vercel to track deployments and access build logs from Chronicle',
  "is_gateway" = false,
  "chronicle_blocks" = ARRAY['connection_status', 'deployment_feed'],
  "chronicle_actions" = ARRAY['open_deployment', 'view_build_logs', 'redeploy', 'disconnect']
WHERE "service" = 'vercel';

UPDATE "Integration" SET
  "display_label" = 'GitHub',
  "description" = 'Source control — commits, pull requests, and branches',
  "connect_copy" = 'Connect GitHub to surface repository activity in Chronicle',
  "is_gateway" = false,
  "chronicle_blocks" = ARRAY['connection_status', 'repository_activity'],
  "chronicle_actions" = ARRAY['view_on_github', 'create_branch', 'open_pr', 'disconnect']
WHERE "service" = 'github';

UPDATE "Integration" SET
  "display_label" = 'Anthropic',
  "description" = 'Claude models — powers Kip and platform AI capabilities',
  "connect_copy" = 'Add an Anthropic API key to enable Claude-powered agents',
  "is_gateway" = false,
  "chronicle_blocks" = ARRAY['connection_status', 'key_health', 'linked_agents'],
  "chronicle_actions" = ARRAY['test_provider', 'manage_keys', 'disconnect']
WHERE "service" = 'anthropic';

UPDATE "Integration" SET
  "display_label" = 'OpenAI',
  "description" = 'GPT models — available for agent configuration',
  "connect_copy" = 'Add an OpenAI API key to enable GPT-powered agents',
  "is_gateway" = false,
  "chronicle_blocks" = ARRAY['connection_status', 'key_health', 'linked_agents'],
  "chronicle_actions" = ARRAY['test_provider', 'manage_keys', 'disconnect']
WHERE "service" = 'openai';

UPDATE "Integration" SET
  "display_label" = 'Together AI',
  "description" = 'Open model catalog — image generation, JSON, and agent chat',
  "connect_copy" = 'Add a Together AI API key to access the open model catalog',
  "is_gateway" = true,
  "chronicle_blocks" = ARRAY['connection_status', 'key_health', 'model_catalog', 'linked_agents'],
  "chronicle_actions" = ARRAY['test_provider', 'refresh_models', 'manage_keys', 'disconnect']
WHERE "service" = 'together-ai';

UPDATE "Integration" SET
  "display_label" = 'ElevenLabs',
  "description" = 'Voice synthesis — powers agent voice capabilities',
  "connect_copy" = 'Add an ElevenLabs API key to enable voice for agents',
  "is_gateway" = false,
  "chronicle_blocks" = ARRAY['connection_status', 'key_health', 'linked_agents'],
  "chronicle_actions" = ARRAY['test_provider', 'manage_keys', 'disconnect']
WHERE "service" = 'elevenlabs';
