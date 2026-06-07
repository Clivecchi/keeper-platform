#!/usr/bin/env tsx

/**
 * Populates Integration Chronicle declaration fields for all platform integrations.
 * Idempotent — safe to re-run.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type IntegrationDeclaration = {
  display_label: string;
  description: string;
  connect_copy: string;
  is_gateway: boolean;
  chronicle_blocks: string[];
  chronicle_actions: string[];
};

export const INTEGRATION_CHRONICLE_DECLARATIONS: Record<string, IntegrationDeclaration> = {
  railway: {
    display_label: 'Railway',
    description: 'Infrastructure hosting — services, deployments, and logs',
    connect_copy: 'Connect Railway to monitor deployments and manage services from Chronicle',
    is_gateway: false,
    chronicle_blocks: ['connection_status', 'deployment_feed'],
    chronicle_actions: ['view_logs', 'redeploy', 'disconnect'],
  },
  vercel: {
    display_label: 'Vercel',
    description: 'Frontend deployments and build pipeline',
    connect_copy: 'Connect Vercel to track deployments and access build logs from Chronicle',
    is_gateway: false,
    chronicle_blocks: ['connection_status', 'deployment_feed'],
    chronicle_actions: ['open_deployment', 'view_build_logs', 'redeploy', 'disconnect'],
  },
  github: {
    display_label: 'GitHub',
    description: 'Source control — commits, pull requests, and branches',
    connect_copy: 'Connect GitHub to surface repository activity in Chronicle',
    is_gateway: false,
    chronicle_blocks: ['connection_status', 'repository_activity'],
    chronicle_actions: ['view_on_github', 'create_branch', 'open_pr', 'disconnect'],
  },
  anthropic: {
    display_label: 'Anthropic',
    description: 'Claude models — powers Kip and platform AI capabilities',
    connect_copy: 'Add an Anthropic API key to enable Claude-powered agents',
    is_gateway: false,
    chronicle_blocks: ['connection_status', 'key_health', 'linked_agents'],
    chronicle_actions: ['test_provider', 'manage_keys', 'disconnect'],
  },
  openai: {
    display_label: 'OpenAI',
    description: 'GPT models — available for agent configuration',
    connect_copy: 'Add an OpenAI API key to enable GPT-powered agents',
    is_gateway: false,
    chronicle_blocks: ['connection_status', 'key_health', 'linked_agents'],
    chronicle_actions: ['test_provider', 'manage_keys', 'disconnect'],
  },
  'together-ai': {
    display_label: 'Together AI',
    description: 'Open model catalog — image generation, JSON, and agent chat',
    connect_copy: 'Add a Together AI API key to access the open model catalog',
    is_gateway: true,
    chronicle_blocks: ['connection_status', 'key_health', 'model_catalog', 'linked_agents'],
    chronicle_actions: ['test_provider', 'refresh_models', 'manage_keys', 'disconnect'],
  },
  elevenlabs: {
    display_label: 'ElevenLabs',
    description: 'Voice synthesis — powers agent voice capabilities',
    connect_copy: 'Add an ElevenLabs API key to enable voice for agents',
    is_gateway: false,
    chronicle_blocks: ['connection_status', 'key_health', 'linked_agents'],
    chronicle_actions: ['test_provider', 'manage_keys', 'disconnect'],
  },
};

export default async function seedIntegrationChronicleDeclarations(): Promise<void> {
  console.log('🔗 Seeding Integration Chronicle declarations...');

  for (const [service, declaration] of Object.entries(INTEGRATION_CHRONICLE_DECLARATIONS)) {
    const result = await prisma.integration.updateMany({
      where: {
        service,
        tier: 'platform',
        domainId: null,
        userId: null,
      },
      data: declaration,
    });

    if (result.count === 0) {
      console.warn(`  ⚠ No platform Integration row found for service="${service}" — skipped`);
      continue;
    }

    console.log(`  ✓ ${service}`);
  }

  console.log('✅ Integration Chronicle declarations seeded');
}
