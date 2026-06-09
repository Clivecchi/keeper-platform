#!/usr/bin/env tsx

/**
 * C1 — Seed per-layer health into Integration.metadata for all platform integrations.
 * Idempotent — merges health into existing metadata without dropping catalog fields.
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

type LayerStatus = 'live' | 'degraded' | 'inactive';

type LayerHealthEntry = {
  status: LayerStatus;
  last_checked: string;
};

type IntegrationLayerHealthMetadata = {
  api?: LayerHealthEntry;
  mcp?: LayerHealthEntry;
  webhooks?: LayerHealthEntry;
};

const SERVICES = [
  'railway',
  'vercel',
  'github',
  'anthropic',
  'openai',
  'together-ai',
  'elevenlabs',
] as const;

const LAYERS: Record<(typeof SERVICES)[number], Array<keyof IntegrationLayerHealthMetadata>> = {
  railway: ['api', 'webhooks'],
  vercel: ['api', 'webhooks'],
  github: ['api', 'mcp', 'webhooks'],
  anthropic: ['api'],
  openai: ['api'],
  'together-ai': ['api'],
  elevenlabs: ['api'],
};

function buildHealth(service: (typeof SERVICES)[number], status: string, now: string): IntegrationLayerHealthMetadata {
  const connected = status === 'connected';
  const health: IntegrationLayerHealthMetadata = {};

  for (const layer of LAYERS[service]) {
    if (layer === 'api') {
      health.api = { status: connected ? 'live' : 'inactive', last_checked: now };
    } else if (layer === 'webhooks') {
      health.webhooks = { status: 'inactive', last_checked: now };
    } else if (layer === 'mcp') {
      health.mcp = {
        status: service === 'github' ? 'live' : 'inactive',
        last_checked: now,
      };
    }
  }

  return health;
}

function mergeMetadata(
  existing: Prisma.JsonValue | null,
  health: IntegrationLayerHealthMetadata,
): Prisma.InputJsonValue {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing)
      ? { ...(existing as Record<string, unknown>) }
      : {};
  return JSON.parse(
    JSON.stringify({
      ...base,
      health,
    }),
  ) as Prisma.InputJsonValue;
}

export default async function seedIntegrationHealth(): Promise<void> {
  console.log('🩺 Seeding Integration per-layer health metadata...');
  const now = new Date().toISOString();

  for (const service of SERVICES) {
    const row = await prisma.integration.findFirst({
      where: { service, tier: 'platform', domainId: null, userId: null },
      select: { id: true, status: true, metadata: true },
    });

    if (!row) {
      console.warn(`  ⚠ No platform Integration row for service="${service}" — skipped`);
      continue;
    }

    const health = buildHealth(service, row.status, now);
    await prisma.integration.update({
      where: { id: row.id },
      data: { metadata: mergeMetadata(row.metadata, health) },
    });
    console.log(`  ✓ ${service}`);
  }

  console.log('✅ Integration layer health seeded');
}
