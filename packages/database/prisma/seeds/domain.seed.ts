import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export default async function seedDomain() {
  const hostname = process.env.FALLBACK_DOMAIN ?? 'www.ke3p.com';
  const ownerEmail = process.env.SEED_OWNER_EMAIL || 'seed@ke3p.com';

  // Find or create owner user
  let owner = await prisma.users.findUnique({ where: { email: ownerEmail } }).catch(() => null);
  if (!owner) {
    owner = await prisma.users.create({
      data: {
        id: randomUUID(),
        email: ownerEmail,
        name: 'Seed Owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  // Ensure a single platform domain exists
  const existing = await prisma.domain.findFirst({
    where: {
      OR: [
        { customDomain: hostname },
        { name: 'Platform' },
        { slug: 'platform' },
      ],
    },
  });

  if (!existing) {
    await prisma.domain.create({
      data: {
        id: randomUUID(),
        name: 'Platform',
        slug: 'platform',
        customDomain: hostname,
        customDomainVerified: true,
        status: 'active',
        isActive: true,
        ownerId: owner.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        features: {},
        settings: {},
      },
    });
    // Also set as primaryDomain if missing
    await prisma.users.update({ where: { id: owner.id }, data: { primaryDomainId: undefined } }).catch(() => {});
  }
}


