#!/usr/bin/env tsx

/**
 * Seeds Key EntityKind records from kip_user_keys, kip_platform_keys, and ENV detection.
 * Idempotent — does not modify credential tables.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PROVIDER_META: Record<
  string,
  { display_label: string; description: string; scope: string }
> = {
  anthropic: {
    display_label: 'Anthropic',
    description: 'Claude models — powers Kip and platform AI capabilities',
    scope: 'Claude chat completions and agent reasoning',
  },
  openai: {
    display_label: 'OpenAI',
    description: 'GPT models — available for agent configuration',
    scope: 'GPT chat completions and structured outputs',
  },
  'together-ai': {
    display_label: 'Together AI',
    description: 'Open model catalog — image generation, JSON, and agent chat',
    scope: 'Open-weight models, FLUX image generation, and JSON mode',
  },
  elevenlabs: {
    display_label: 'ElevenLabs',
    description: 'Voice synthesis — powers agent voice capabilities',
    scope: 'Text-to-speech and voice synthesis for agents',
  },
};

const CHRONICLE_BLOCKS = ['connection_status', 'key_health', 'linked_agents'];
const CHRONICLE_ACTIONS = ['verify', 'rotate', 'revoke'];

function envKeyForProvider(provider: string): string | null {
  const valid = (k: string | undefined) =>
    typeof k === 'string' && k.trim().length > 0 ? k.trim() : null;
  switch (provider) {
    case 'openai':
      return valid(process.env.OPENAI_API_KEY);
    case 'anthropic':
      return valid(process.env.ANTHROPIC_API_KEY);
    case 'together-ai':
      return valid(process.env.TOGETHER_API_KEY);
    case 'elevenlabs':
      return valid(process.env.ELEVENLABS_API_KEY);
    default:
      return null;
  }
}

async function resolvePlatformDomainId(): Promise<string> {
  const domain =
    (await prisma.domain.findFirst({ where: { slug: 'platform' } })) ??
    (await prisma.domain.findFirst({ where: { name: 'Platform' } })) ??
    (await prisma.domain.findFirst({ orderBy: { createdAt: 'asc' } }));

  if (!domain) {
    throw new Error('No domain found — run domain seed first');
  }
  return domain.id;
}

async function integrationIdForProvider(provider: string): Promise<string | null> {
  const row = await prisma.integration.findFirst({
    where: {
      service: provider,
      tier: 'platform',
      domainId: null,
      userId: null,
    },
    select: { id: true },
  });
  return row?.id ?? null;
}

async function upsertKeyRecord(params: {
  domain_id: string;
  provider: string;
  key_source: string;
  user_id: string | null;
  status: string;
  integration_id: string | null;
}) {
  const meta = PROVIDER_META[params.provider];
  if (!meta) {
    console.warn(`  ⚠ Unknown provider "${params.provider}" — skipped`);
    return;
  }

  const existing = await prisma.key.findFirst({
    where: {
      domain_id: params.domain_id,
      provider: params.provider,
      key_source: params.key_source,
      user_id: params.user_id,
    },
  });

  const data = {
    integration_id: params.integration_id,
    display_label: `${meta.display_label} Key`,
    description: meta.description,
    chronicle_blocks: CHRONICLE_BLOCKS,
    chronicle_actions: CHRONICLE_ACTIONS,
  };

  if (existing) {
    await prisma.key.update({ where: { id: existing.id }, data });
  } else {
    await prisma.key.create({
      data: {
        domain_id: params.domain_id,
        provider: params.provider,
        key_source: params.key_source,
        status: params.status,
        scope: meta.scope,
        user_id: params.user_id,
        ...data,
      },
    });
  }

  console.log(`  ✓ ${params.provider} (${params.key_source})`);
}

export default async function seedProviderKeys(): Promise<void> {
  console.log('🔑 Seeding Key EntityKind records...');

  const domainId = await resolvePlatformDomainId();
  const providers = Object.keys(PROVIDER_META);
  const envProviders = new Set<string>();

  for (const provider of providers) {
    if (envKeyForProvider(provider)) {
      envProviders.add(provider);
    }
  }

  const userKeys = await prisma.kip_user_keys.findMany();
  for (const row of userKeys) {
    const integrationId = await integrationIdForProvider(row.provider);
    await upsertKeyRecord({
      domain_id: domainId,
      provider: row.provider,
      key_source: 'user',
      user_id: row.user_id,
      status: 'valid',
      integration_id: integrationId,
    });
    envProviders.delete(row.provider);
  }

  const platformKeys = await prisma.kip_platform_keys.findMany();
  for (const row of platformKeys) {
    const integrationId = await integrationIdForProvider(row.provider);
    await upsertKeyRecord({
      domain_id: domainId,
      provider: row.provider,
      key_source: 'platform',
      user_id: null,
      status: row.is_active ? 'valid' : 'unknown',
      integration_id: integrationId,
    });
    if (!envKeyForProvider(row.provider)) {
      envProviders.delete(row.provider);
    }
  }

  for (const provider of envProviders) {
    const integrationId = await integrationIdForProvider(provider);
    await upsertKeyRecord({
      domain_id: domainId,
      provider,
      key_source: 'env',
      user_id: null,
      status: 'valid',
      integration_id: integrationId,
    });
  }

  console.log('✅ Key EntityKind records seeded');
}

// Self-run when invoked directly; imported as default from seed.ts otherwise.
const isDirectRun = process.argv[1]?.includes('provider-keys.seed');
if (isDirectRun) {
  seedProviderKeys()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
