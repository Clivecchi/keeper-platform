#!/usr/bin/env tsx

/**
 * Kip Agents Seed
 *
 * Seeds the Kip Lead agent, supporting agents (TypeAgent, PlatformAgent, CodeAgent),
 * and the CodeCoordinator into the kip_agents table.
 *
 * Uses Prisma upserts so this seed is idempotent and safe to re-run.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function seed() {
  console.log('🤖 Seeding Kip agents...');

  // ── 1. Kip Lead Agent (critical for Golden Path) ──────────────────────────
  await prisma.$executeRawUnsafe(`
    INSERT INTO kip_agents (
      slug, name, purpose, model, role, context_scope,
      memory_enabled, tools, permissions, config, status,
      model_provider, model_settings, visibility
    ) VALUES (
      'kip',
      'Kip',
      'Kip is the Keeper Platform''s Lead Agent, guiding users with wisdom, humor, and clarity. Sincere, playful, and sharp — the embodiment of ''Building worth Keeping.''',
      'gpt-4o',
      'Lead',
      'user_interaction',
      true,
      ARRAY['thought_analysis', 'idea_organization', 'task_coordination', 'conversation'],
      ARRAY['read_user_data', 'create_memories', 'coordinate_agents', 'access_platform'],
      '{"tagline": "Your AI companion for thoughts and ideas", "personality": "Experience Director. I think alongside the people building this.", "capabilities": ["thought processing", "idea organization", "task coordination"], "avatar": "🤖", "theme_color": "#3b82f6"}',
      'ready',
      'openai',
      '{"model": "gpt-4o", "temperature": 0.3, "max_tokens": 4000, "retry": {"max_retries": 3, "retry_delay_ms": 1000}}',
      'public'
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
      model_provider = EXCLUDED.model_provider,
      model_settings = EXCLUDED.model_settings,
      visibility = EXCLUDED.visibility,
      updated_at = NOW();
  `);
  console.log('  ✅ Kip Lead agent seeded');

  // ── 2. CeoX Lead Agent ────────────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    INSERT INTO kip_agents (
      slug, name, purpose, model, role, context_scope,
      memory_enabled, tools, permissions, config, status,
      model_provider, model_settings, visibility
    ) VALUES (
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
      'ready',
      'openai',
      '{"model": "gpt-4o", "temperature": 0.2, "max_tokens": 8000, "retry": {"max_retries": 3, "retry_delay_ms": 1000}}',
      'shared'
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
      model_provider = EXCLUDED.model_provider,
      model_settings = EXCLUDED.model_settings,
      visibility = EXCLUDED.visibility,
      updated_at = NOW();
  `);
  console.log('  ✅ CeoX Lead agent seeded');

  // ── 3. Supporting agents with model integration ────────────────────────────
  await prisma.$executeRawUnsafe(`
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
      updated_at = NOW();
  `);
  console.log('  ✅ Supporting agents (TypeAgent, PlatformAgent, CodeAgent) seeded');

  // ── 4. CodeCoordinator agent ───────────────────────────────────────────────
  await prisma.$executeRawUnsafe(`
    INSERT INTO kip_agents (
      slug, name, purpose, model, role, context_scope,
      memory_enabled, tools, permissions, config, status
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
      role = EXCLUDED.role,
      context_scope = EXCLUDED.context_scope,
      memory_enabled = EXCLUDED.memory_enabled,
      tools = EXCLUDED.tools,
      permissions = EXCLUDED.permissions,
      config = EXCLUDED.config,
      status = EXCLUDED.status,
      updated_at = NOW();
  `);
  console.log('  ✅ CodeCoordinator agent seeded');

  // ── 5. Ensure Kip is public (for logged-out visitors on cover) ─────────────────
  await prisma.kip_agents.updateMany({
    where: { slug: 'kip', role: 'Lead' },
    data: { visibility: 'public' },
  });
  console.log('  ✅ Kip visibility ensured (public for cover)');

  console.log('\n✅ All Kip agents seeded successfully!');
}
