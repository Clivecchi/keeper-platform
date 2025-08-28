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
