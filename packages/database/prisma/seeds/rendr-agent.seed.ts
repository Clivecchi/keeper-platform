#!/usr/bin/env tsx

/**
 * Rendr platform agent seed — presence and rendering guidance for the IDE Board.
 *
 * Idempotent — creates Rendr agent or ensures core config is present.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export { prisma as rendrAgentPrisma };

export default async function seedRendrAgent() {
  console.log('🎨 Seeding Rendr platform agent...');

  const existing = await prisma.kip_agents.findFirst({
    where: { slug: 'rendr' },
    select: { id: true },
  });

  if (existing) {
    const agent = await prisma.kip_agents.update({
      where: { id: existing.id },
      data: {
        name: 'Rendr',
        purpose:
          'Presence and rendering agent. Translates presenceTreatment into spatial ratio, motion, density, and what comes forward.',
        status: 'ready',
      },
    });
    console.log(`  ✅ Rendr agent updated — id: ${agent.id}`);
    return;
  }

  const agent = await prisma.kip_agents.create({
    data: {
      name: 'Rendr',
      slug: 'rendr',
      model: 'claude-sonnet-4-6',
      model_provider: 'anthropic',
      purpose:
        'Presence and rendering agent. Translates presenceTreatment into spatial ratio, motion, density, and what comes forward.',
      role: 'System',
      status: 'ready',
      visibility: 'private',
      memory_enabled: true,
      tools: [],
      permissions: [],
      capabilities: [],
      config: {
        persona: null,
        suppress_kip_system_prompt: true,
        suppress_sole_memory: true,
        domain: 'default',
      },
      model_settings: {},
    },
  });

  console.log(`  ✅ Rendr agent created — id: ${agent.id}, name: ${agent.name}`);
}

if (process.argv[1]?.includes('rendr-agent.seed')) {
  seedRendrAgent()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Rendr agent seed failed:', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
