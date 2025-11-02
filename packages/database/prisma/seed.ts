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

    console.log('🎨 Seeding Design Board Templates...');
    const seedDesignBoards = await import('./seeds/design-boards.seed.ts');
    await seedDesignBoards.default();

    console.log('🎭 Seeding Domain Engagement Templates...');
    const seedDomainEngagement = await import('./seeds/domain-engagement-templates.seed.ts');
    await seedDomainEngagement.default();

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
