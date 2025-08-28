import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding platform roles...');

  const roles = [
    { id: randomUUID(), name: 'super-admin', description: 'Platform super administrator with full access' },
    { id: randomUUID(), name: 'admin', description: 'Platform administrator with domain management access' },
    { id: randomUUID(), name: 'support', description: 'Platform support staff with user assistance access' },
    { id: randomUUID(), name: 'moderator', description: 'Content moderator with content management access' },
    { id: randomUUID(), name: 'analyst', description: 'Data analyst with read-only access to analytics' },
    { id: randomUUID(), name: 'developer', description: 'Developer with API and technical access' },
    { id: randomUUID(), name: 'viewer', description: 'Read-only access to platform data' },
  ];

  for (const role of roles) {
    await prisma.roles.upsert({
      where: { name: role.name },
      update: { description: role.description, updatedAt: new Date() },
      create: { ...role, createdAt: new Date(), updatedAt: new Date() },
    });
    console.log(`✅ Role upserted: ${role.name}`);
  }

  console.log('🎉 Platform roles seed completed');
}

// Export main function for use in seed runner
export default main;

// Run if called directly
if (require.main === module) {
  main()
    .catch((e) => {
      console.error('❌ Error seeding roles:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
} 