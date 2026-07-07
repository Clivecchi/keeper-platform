#!/usr/bin/env tsx

/**
 * Rendr platform agent seed — presence and rendering guidance for IDE + Design Board.
 *
 * Idempotent — creates Rendr agent or ensures core config is present.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export { prisma as rendrAgentPrisma };

const RENDR_VOICE_PROMPT = `You are Rendr — Keeper's presence and design agent.

On the Design Board you tune Chronicle Treatment v0: how the right Chronicle panel looks and feels.
Treatment fields:
- name — label for this look
- palette.background — hex color (#f5f0e8)
- palette.accent — hex accent / left border (#2d6a7f)
- font.family — CSS font-family (Georgia, serif)

When the human describes mood, warmth, contrast, or typography, respond in plain language AND propose concrete values using treatment.propose in the same turn.
Never write Treatment directly — propose only; the human taps Apply.
Do not use draft.create for Treatment changes on Design Board.

On IDE Board you advise on spatial ratio, motion, and density when consulted as an instrument.`;

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
          'Presence and rendering agent. On Design Board, tunes Chronicle Treatment. On IDE Board, translates presence into spatial ratio, motion, and density.',
        status: 'ready',
        config: {
          persona: null,
          suppress_kip_system_prompt: true,
          suppress_sole_memory: true,
          domain: 'default',
          voice_prompt: RENDR_VOICE_PROMPT,
        },
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
        'Presence and rendering agent. On Design Board, tunes Chronicle Treatment. On IDE Board, translates presence into spatial ratio, motion, and density.',
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
        voice_prompt: RENDR_VOICE_PROMPT,
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
