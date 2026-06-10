#!/usr/bin/env tsx

/**
 * Agent cover personality lines — config.personality for Identity Block voice quote.
 * Idempotent; safe to re-run via prisma db seed or standalone script.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const KIP_COVER_PERSONALITY =
  'Experience Director. I think alongside the people building this.';

export const CLOUD_COVER_PERSONALITY =
  'Technical Execution Agent. I read, build, and ship.';

async function setAgentPersonality(slug: string, personality: string): Promise<void> {
  const agent = await prisma.kip_agents.findFirst({
    where: { slug },
    select: { id: true, name: true, config: true },
  });

  if (!agent) {
    console.log(`  ⏭️  No agent with slug "${slug}" — skipped`);
    return;
  }

  const existing =
    agent.config && typeof agent.config === 'object' && !Array.isArray(agent.config)
      ? (agent.config as Record<string, unknown>)
      : {};

  await prisma.kip_agents.update({
    where: { id: agent.id },
    data: {
      config: {
        ...existing,
        personality,
      },
    },
  });

  console.log(`  ✅ ${agent.name} (${slug}) personality updated`);
}

export default async function seedAgentPersonalities() {
  console.log('🎭 Seeding agent cover personalities...');
  await setAgentPersonality('kip', KIP_COVER_PERSONALITY);
  await setAgentPersonality('cloud', CLOUD_COVER_PERSONALITY);
}

if (process.argv[1]?.includes('agent-personalities.seed')) {
  seedAgentPersonalities()
    .catch((err) => {
      console.error('Agent personalities seed failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
