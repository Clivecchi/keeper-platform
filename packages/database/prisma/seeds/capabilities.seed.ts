#!/usr/bin/env tsx

/**
 * Capability registry seed — platform-level Capability EntityKind rows (Pass 1).
 *
 * Sources: infraCapabilities.ts, agentCapabilityConstants.ts, Kip tools/permissions from kip-agents.seed.
 * Idempotent — upserts by slug.
 */

import { PrismaClient } from '@prisma/client';
import {
  resolveCapabilityChronicleDefaults,
  type CapabilityKind,
} from '@keeper/shared';

const prisma = new PrismaClient();

/** Mirrors apps/api/src/capabilities/infraCapabilities.ts INFRA_CAPABILITIES */
const INFRA_CAPABILITY_SLUGS = [
  'infra.railway.read',
  'infra.railway.deploy',
  'infra.vercel.read',
  'infra.vercel.deploy',
  'infra.github.read',
  'infra.github.write',
] as const;

/** Mirrors apps/api/src/capabilities/agentCapabilityConstants.ts CORE_CAPABILITIES */
const CORE_CAPABILITY_SLUGS = [
  'actions.execute',
  'actions.receipt',
  'sessions.persist',
  'sessions.resume',
  'sole.read',
  'sole.write',
  'echo.receive',
  'drafts.create',
] as const;

const KIP_TOOLS = [
  'thought_analysis',
  'idea_organization',
  'task_coordination',
  'conversation',
] as const;

const KIP_PERMISSIONS = [
  'read_user_data',
  'create_memories',
  'coordinate_agents',
  'access_platform',
] as const;

function titleCase(segment: string): string {
  return segment
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Derive readable display_label from slug and kind. */
export function slugToCapabilityDisplayLabel(slug: string, kind: CapabilityKind): string {
  if (kind === 'infra' && slug.startsWith('infra.')) {
    const parts = slug.split('.');
    const service = parts[1] ?? 'Infra';
    const action = parts[2] ?? 'Access';
    return `${titleCase(service)}: ${titleCase(action)}`;
  }
  if (kind === 'action' && slug.includes('.')) {
    const [ns, action] = slug.split('.');
    return `${titleCase(ns)}: ${titleCase(action)}`;
  }
  return titleCase(slug);
}

type RegistryEntry = {
  slug: string;
  kind: CapabilityKind;
  description?: string;
};

const REGISTRY: RegistryEntry[] = [
  ...INFRA_CAPABILITY_SLUGS.map((slug) => ({
    slug,
    kind: 'infra' as const,
    description:
      'Infrastructure capability — enforced via requireCapability on Railway/Vercel REST routes.',
  })),
  ...CORE_CAPABILITY_SLUGS.map((slug) => ({
    slug,
    kind: 'action' as const,
    description:
      'Core agent capability — declared in agentCapabilityConstants.ts (display reference in Pass 1).',
  })),
  ...KIP_TOOLS.map((slug) => ({
    slug,
    kind: 'tool' as const,
    description: 'Kip agent tool — seeded on kip_agents.tools.',
  })),
  ...KIP_PERMISSIONS.map((slug) => ({
    slug,
    kind: 'permission' as const,
    description: 'Kip agent permission — seeded on kip_agents.permissions.',
  })),
];

export default async function seedCapabilities() {
  console.log('🧩 Seeding Capability registry...');

  for (const entry of REGISTRY) {
    const defaults = resolveCapabilityChronicleDefaults(entry.kind);
    const display_label = slugToCapabilityDisplayLabel(entry.slug, entry.kind);

    await prisma.capability.upsert({
      where: { slug: entry.slug },
      create: {
        slug: entry.slug,
        kind: entry.kind,
        display_label,
        description: entry.description ?? null,
        chronicle_blocks: defaults.chronicle_blocks,
        chronicle_actions: defaults.chronicle_actions,
        domain_id: null,
      },
      update: {
        kind: entry.kind,
        display_label,
        description: entry.description ?? null,
        chronicle_blocks: defaults.chronicle_blocks,
        chronicle_actions: defaults.chronicle_actions,
        updated_at: new Date(),
      },
    });
  }

  console.log(`  ✅ ${REGISTRY.length} capability rows seeded`);
}

if (process.argv[1]?.includes('capabilities.seed')) {
  seedCapabilities()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Capability seed failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
