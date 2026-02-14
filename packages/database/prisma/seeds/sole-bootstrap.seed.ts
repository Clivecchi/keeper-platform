#!/usr/bin/env tsx

/**
 * SOLE Bootstrap Seed
 *
 * Seeds domain anchor SOLE memory cards so Kip has initial knowledge from first load.
 * Two bootstrap cards: SOLE usage and Drafts usage.
 *
 * Runs after domain and kip-agents seeds. Idempotent — skips if bootstrap already exists.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BOOTSTRAP_TOPIC = 'kip-bootstrap';

const BOOTSTRAP_CARDS = [
  {
    topic: 'sole-usage',
    content:
      'You are Kip, the Keeper Platform Lead Agent. Use sole.save for insights, learnings, corrections, and anything you want to remember for future conversations. Do NOT use drafts for memory — drafts are for documents (journey specs, keeper proposals, checklists). When the user asks what you can do, present capabilities as structured cards. Use action cards (sole.save, draft.create, moment.create) to show what you did.',
  },
  {
    topic: 'drafts-vs-sole',
    content:
      'Drafts: for documents, specs, proposals. Use draft.create when the user explicitly asks for a new draft. Use sole.save for memory, insights, and learnings. When you learn something important or the user corrects you, use sole.save — not draft.create.',
  },
];

export default async function seed() {
  console.log('🧠 Seeding SOLE bootstrap cards...');

  const kipAgent = await prisma.kip_agents.findFirst({
    where: { slug: 'kip' },
    select: { id: true },
  });

  if (!kipAgent) {
    console.log('  ⏭️ Kip agent not found, skipping SOLE bootstrap');
    return;
  }

  const domains = await prisma.domain.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, slug: true },
  });

  if (domains.length === 0) {
    console.log('  ⏭️ No domains found, skipping SOLE bootstrap');
    return;
  }

  let seeded = 0;
  for (const domain of domains) {
    const existing = await prisma.soleMemoryCard.count({
      where: {
        domainId: domain.id,
        keeperId: null,
        SoleReflection: { topic: BOOTSTRAP_TOPIC },
      },
    });

    if (existing > 0) {
      console.log(`  ⏭️ SOLE bootstrap already exists for ${domain.name} (${domain.slug})`);
      continue;
    }

    for (const card of BOOTSTRAP_CARDS) {
      const reflection = await prisma.soleReflection.create({
        data: {
          keeperId: null,
          domainId: domain.id,
          agentId: kipAgent.id,
          content: card.content,
          topic: BOOTSTRAP_TOPIC,
          promotedToMemoryCard: true,
          promotedAt: new Date(),
        },
      });

      await prisma.soleMemoryCard.create({
        data: {
          keeperId: null,
          domainId: domain.id,
          reflectionId: reflection.id,
          content: card.content,
          topic: card.topic,
        },
      });
    }
    seeded++;
    console.log(`  ✅ SOLE bootstrap seeded for ${domain.name} (${domain.slug})`);
  }

  if (seeded === 0) {
    console.log('  ⏭️ All domains already have SOLE bootstrap');
  }
}

// Run standalone when executed directly: npx tsx prisma/seeds/sole-bootstrap.seed.ts
if (process.argv[1]?.includes('sole-bootstrap.seed')) {
  seed()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('SOLE bootstrap seed failed:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
