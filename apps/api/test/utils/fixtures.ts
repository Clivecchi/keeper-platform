import { PrismaClient } from '@prisma/client';

/**
 * Create test users
 */
export async function createTestUser(prisma: PrismaClient, userData: { name: string; email: string }) {
  return await prisma.user.create({
    data: {
      name: userData.name,
      email: userData.email,
      // Add other required fields with defaults
    }
  });
}

/**
 * Create test users (plural)
 */
export async function createTestUsers(prisma: PrismaClient, count: number) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push(await createTestUser(prisma, {
      name: `Test User ${i + 1}`,
      email: `test${i + 1}@example.com`
    }));
  }
  return users;
}

/**
 * Create test domain
 */
export async function createTestDomain(prisma: PrismaClient, domainData: { name: string; slug: string; ownerId: string }) {
  return await prisma.domain.create({
    data: {
      name: domainData.name,
      slug: domainData.slug,
      ownerId: domainData.ownerId,
      // Add other required fields with defaults
    }
  });
}

/**
 * Create test domains (plural)
 */
export async function createTestDomains(prisma: PrismaClient, count: number) {
  const users = await createTestUsers(prisma, count);
  const domains = [];
  for (let i = 0; i < count; i++) {
    domains.push(await createTestDomain(prisma, {
      name: `Test Domain ${i + 1}`,
      slug: `test-domain-${i + 1}`,
      ownerId: users[i].id
    }));
  }
  return domains;
}

/**
 * Create test keepers
 */
export async function createTestKeepers(prisma: PrismaClient, domains: any[], users: any[]) {
  const keepers = [];
  for (let i = 0; i < Math.min(domains.length, users.length); i++) {
    const keeper = await prisma.keeper.create({
      data: {
        name: `Test Keeper ${i + 1}`,
        domainId: domains[i].id,
        ownerId: users[i].id,
        // Add other required fields with defaults
      }
    });
    keepers.push(keeper);
  }
  return keepers;
}
