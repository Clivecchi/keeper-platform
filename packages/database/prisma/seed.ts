#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  try {
    // Import and run individual seed files
    console.log('📝 Seeding roles...');
    const seedRoles = await import('./seeds/roles.seed.ts');
    await seedRoles.default();

    console.log('🎨 Seeding themes...');
    const seedThemes = await import('./seeds/themes.seed.ts');
    await seedThemes.default();

    console.log('🌐 Seeding platform Domain...');
    const seedDomain = await import('./seeds/domain.seed.ts');
    await seedDomain.default();

    console.log('📜 Seeding domain policies...');
    const seedDomainPolicies = await import('./seeds/policy.seed.ts');
    await seedDomainPolicies.default();

    console.log('🧊 Seeding canonical system boards...');
    const seedSystemBoards = await import('./seeds/system-boards.seed.ts');
    await seedSystemBoards.default();

    console.log('🎨 Seeding Design Board Templates...');
    const seedDesignBoards = await import('./seeds/design-boards.seed.ts');
    await seedDesignBoards.default();

    console.log('🧭 Seeding default domain journeys...');
    const seedDefaultJourneys = await import('./seeds/default-domain-journeys.seed.ts');
    await seedDefaultJourneys.default();

    console.log('🎭 Seeding Domain Engagement Templates...');
    const seedDomainEngagement = await import('./seeds/domain-engagement-templates.seed.ts');
    await seedDomainEngagement.default();

    console.log('🧭 Seeding Journey/Path/Moment Engagement Templates...');
    const seedJourneyPathMoment = await import('./seeds/journey-path-moment-engagement-templates.seed.ts');
    await seedJourneyPathMoment.default();

    console.log('🎯 Seeding Domain Board Management Templates...');
    const seedDomainBoardEngagement = await import('./seeds/domain-board-engagement-templates.seed.ts');
    await seedDomainBoardEngagement.default();

    console.log('🤖 Seeding Kip agents (Lead + supporting)...');
    const seedKipAgents = await import('./seeds/kip-agents.seed.ts');
    await seedKipAgents.default();

    console.log('🔭 Seeding Kip lenses...');
    const seedLenses = await import('./seeds/lenses.seed.ts');
    await seedLenses.default();

    console.log('🧠 Seeding SOLE bootstrap cards...');
    const seedSoleBootstrap = await import('./seeds/sole-bootstrap.seed.ts');
    await seedSoleBootstrap.default();

    console.log('🎉 Database seed completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
