/**
 * Domain Permission Integration Tests
 * Comprehensive testing for domain-based permission system
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { DomainService } from '../../../../packages/database/src/services/DomainService';
import { DomainPermissionService } from '../../../../packages/database/src/services/DomainPermissionService';
import { DomainCacheService } from '../../../../packages/database/src/services/DomainCacheService';
import DomainAuthManager from '../../../../packages/kam/src/auth/domainAuth';

const prisma = new PrismaClient();
const cacheService = new DomainCacheService();
const domainService = new DomainService(prisma, cacheService);
const permissionService = new DomainPermissionService(prisma, cacheService);
const domainAuthManager = new DomainAuthManager(prisma);

// Test data setup
let testUsers: any[] = [];
let testDomains: any[] = [];
let testKeepers: any[] = [];
let testJourneys: any[] = [];
let testMoments: any[] = [];
let authTokens: Map<string, string> = new Map();

describe('Domain Permission Integration', () => {
  beforeAll(async () => {
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });

  describe('Domain Context Middleware', () => {
    test('should establish domain context from hostname', async () => {
      const domain = testDomains[0];
      const token = authTokens.get(domain.ownerId);

      const response = await request(app)
        .get('/api/domains')
        .set('Host', `${domain.slug}.keeper.tools`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.domains).toBeDefined();
    });

    test('should establish domain context from domain parameter', async () => {
      const domain = testDomains[0];
      const token = authTokens.get(domain.ownerId);

      const response = await request(app)
        .get(`/api/domains/${domain.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.domain.id).toBe(domain.id);
    });

    test('should handle missing domain context gracefully', async () => {
      const token = authTokens.get(testUsers[0].id);

      const response = await request(app)
        .get('/api/domains')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.domains).toBeDefined();
    });
  });

  describe('Domain Permission Validation', () => {
    test('should allow domain owner full access', async () => {
      const domain = testDomains[0];
      const token = authTokens.get(domain.ownerId);

      const response = await request(app)
        .get(`/api/domains/${domain.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.domain.id).toBe(domain.id);
    });

    test('should deny access to unauthorized domain', async () => {
      const domain = testDomains[0];
      const unauthorizedUser = testUsers.find(u => u.id !== domain.ownerId);
      const token = authTokens.get(unauthorizedUser.id);

      await request(app)
        .get(`/api/domains/${domain.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    test('should respect granted domain permissions', async () => {
      const domain = testDomains[0];
      const user = testUsers.find(u => u.id !== domain.ownerId);
      const ownerToken = authTokens.get(domain.ownerId);
      const userToken = authTokens.get(user.id);

      // Grant read permission
      await request(app)
        .post(`/api/domains/${domain.id}/permissions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: user.id,
          role: 'user',
          permissions: ['read'],
        })
        .expect(201);

      // User should now have read access
      await request(app)
        .get(`/api/domains/${domain.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      // But not write access
      await request(app)
        .put(`/api/domains/${domain.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });

    test('should handle expired permissions', async () => {
      const domain = testDomains[1];
      const user = testUsers.find(u => u.id !== domain.ownerId);
      const ownerToken = authTokens.get(domain.ownerId);
      const userToken = authTokens.get(user.id);

      // Grant permission with immediate expiration
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      await request(app)
        .post(`/api/domains/${domain.id}/permissions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: user.id,
          role: 'user',
          permissions: ['read'],
          expiresAt: expiredDate.toISOString(),
        })
        .expect(201);

      // User should not have access due to expired permission
      await request(app)
        .get(`/api/domains/${domain.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });
  });

  describe('Keeper API Integration', () => {
    test('should create keeper in owned domain', async () => {
      const domain = testDomains[0];
      const token = authTokens.get(domain.ownerId);

      const response = await request(app)
        .post('/api/keepers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Keeper',
          description: 'Test keeper for domain',
          domainId: domain.id,
          type: 'personal',
        })
        .expect(201);

      expect(response.body.keeper.domainId).toBe(domain.id);
      expect(response.body.keeper.name).toBe('Test Keeper');
    });

    test('should deny keeper creation in unauthorized domain', async () => {
      const domain = testDomains[0];
      const unauthorizedUser = testUsers.find(u => u.id !== domain.ownerId);
      const token = authTokens.get(unauthorizedUser.id);

      await request(app)
        .post('/api/keepers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Unauthorized Keeper',
          domainId: domain.id,
          type: 'personal',
        })
        .expect(403);
    });

    test('should filter keepers by domain access', async () => {
      const userWithAccess = testUsers[0];
      const token = authTokens.get(userWithAccess.id);

      const response = await request(app)
        .get('/api/keepers')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Should only return keepers from accessible domains
      response.body.keepers.forEach((keeper: any) => {
        expect(userWithAccess.accessibleDomains).toContain(keeper.domainId);
      });
    });

    test('should respect domain limits', async () => {
      const domain = testDomains[2]; // Domain with limited keeper count
      const token = authTokens.get(domain.ownerId);

      // Create keepers up to the limit
      const limit = (domain.limits as any).max_keepers || 2;
      
      for (let i = 0; i < limit; i++) {
        await request(app)
          .post('/api/keepers')
          .set('Authorization', `Bearer ${token}`)
          .send({
            name: `Keeper ${i}`,
            domainId: domain.id,
            type: 'personal',
          })
          .expect(201);
      }

      // Next creation should fail due to limit
      await request(app)
        .post('/api/keepers')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Over Limit Keeper',
          domainId: domain.id,
          type: 'personal',
        })
        .expect(400);
    });
  });

  describe('Journey API Integration', () => {
    test('should create journey in valid keeper and domain', async () => {
      const keeper = testKeepers[0];
      const token = authTokens.get(keeper.userId);

      const response = await request(app)
        .post('/api/journeys')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Journey',
          description: 'Test journey for keeper',
          keeperId: keeper.id,
          domainId: keeper.domainId,
        })
        .expect(201);

      expect(response.body.journey.keeperId).toBe(keeper.id);
      expect(response.body.journey.domainId).toBe(keeper.domainId);
    });

    test('should deny journey creation with mismatched domain/keeper', async () => {
      const keeper = testKeepers[0];
      const wrongDomain = testDomains.find(d => d.id !== keeper.domainId);
      const token = authTokens.get(keeper.userId);

      await request(app)
        .post('/api/journeys')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Invalid Journey',
          keeperId: keeper.id,
          domainId: wrongDomain.id,
        })
        .expect(400);
    });

    test('should filter journeys by domain permissions', async () => {
      const user = testUsers[0];
      const token = authTokens.get(user.id);

      const response = await request(app)
        .get('/api/journeys')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // All returned journeys should be from accessible domains
      response.body.journeys.forEach((journey: any) => {
        expect(user.accessibleDomains).toContain(journey.domainId);
      });
    });
  });

  describe('Moment API Integration', () => {
    test('should create moment in valid journey/keeper/domain hierarchy', async () => {
      const journey = testJourneys[0];
      const token = authTokens.get(journey.userId);

      const response = await request(app)
        .post('/api/moments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Test Moment',
          content: 'Test moment content',
          journeyId: journey.id,
          keeperId: journey.keeperId,
          domainId: journey.domainId,
          type: 'text',
        })
        .expect(201);

      expect(response.body.moment.journeyId).toBe(journey.id);
      expect(response.body.moment.keeperId).toBe(journey.keeperId);
      expect(response.body.moment.domainId).toBe(journey.domainId);
    });

    test('should deny moment creation with invalid hierarchy', async () => {
      const journey = testJourneys[0];
      const wrongKeeper = testKeepers.find(k => k.id !== journey.keeperId);
      const token = authTokens.get(journey.userId);

      await request(app)
        .post('/api/moments')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Invalid Moment',
          content: 'Invalid moment content',
          journeyId: journey.id,
          keeperId: wrongKeeper.id,
          domainId: journey.domainId,
          type: 'text',
        })
        .expect(400);
    });

    test('should filter moments timeline by domain access', async () => {
      const user = testUsers[0];
      const token = authTokens.get(user.id);

      const response = await request(app)
        .get('/api/moments/timeline')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // All moments should be from accessible domains
      response.body.moments.forEach((moment: any) => {
        expect(user.accessibleDomains).toContain(moment.domainId);
      });
    });
  });

  describe('Cross-Domain Sharing', () => {
    test('should create cross-domain share with proper permissions', async () => {
      const sourceKeeper = testKeepers[0];
      const targetDomain = testDomains.find(d => d.id !== sourceKeeper.domainId);
      const token = authTokens.get(sourceKeeper.userId);

      const response = await request(app)
        .post(`/api/keepers/${sourceKeeper.id}/share`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          targetDomainId: targetDomain.id,
          permissions: ['read'],
        })
        .expect(201);

      expect(response.body.share.sourceDomainId).toBe(sourceKeeper.domainId);
      expect(response.body.share.targetDomainId).toBe(targetDomain.id);
      expect(response.body.share.contentType).toBe('keeper');
    });

    test('should deny sharing without share permissions', async () => {
      const keeper = testKeepers[0];
      const user = testUsers.find(u => u.id !== keeper.userId);
      const targetDomain = testDomains.find(d => d.id !== keeper.domainId);
      
      // Grant only read permission to user
      const ownerToken = authTokens.get(keeper.userId);
      await request(app)
        .post(`/api/domains/${keeper.domainId}/permissions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: user.id,
          role: 'connection',
          permissions: ['read'],
        })
        .expect(201);

      const userToken = authTokens.get(user.id);
      await request(app)
        .post(`/api/keepers/${keeper.id}/share`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          targetDomainId: targetDomain.id,
          permissions: ['read'],
        })
        .expect(403);
    });
  });

  describe('Domain Auth Manager Integration', () => {
    test('should create domain session with proper context', async () => {
      const user = testUsers[0];
      const domain = testDomains[0];

      const session = await domainAuthManager.createDomainSession(user, domain.id);

      expect(session.user.id).toBe(user.id);
      expect(session.domainContext?.domainId).toBe(domain.id);
      expect(session.domainContext?.permissions).toBeDefined();
    });

    test('should switch domain context properly', async () => {
      const user = testUsers[0];
      const domain1 = testDomains[0];
      const domain2 = testDomains[1];

      // Grant access to both domains
      await permissionService.grantPermission({
        domainId: domain2.id,
        userId: user.id,
        role: 'user',
        permissions: ['read', 'write'],
        grantedBy: domain2.ownerId,
      });

      const session = await domainAuthManager.createDomainSession(user, domain1.id);
      expect(session.domainContext?.domainId).toBe(domain1.id);

      const switchedSession = await domainAuthManager.switchDomainContext(session, domain2.id);
      expect(switchedSession.domainContext?.domainId).toBe(domain2.id);
    });

    test('should deny domain switch without permissions', async () => {
      const user = testUsers[0];
      const domain1 = testDomains[0];
      const domain2 = testDomains[1];

      const session = await domainAuthManager.createDomainSession(user, domain1.id);

      await expect(
        domainAuthManager.switchDomainContext(session, domain2.id)
      ).rejects.toThrow('Access denied to domain');
    });
  });

  describe('Performance and Caching', () => {
    test('should cache domain resolution results', async () => {
      const domain = testDomains[0];
      const token = authTokens.get(domain.ownerId);

      // First request
      const start1 = Date.now();
      await request(app)
        .get(`/api/domains/${domain.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const time1 = Date.now() - start1;

      // Second request (should be faster due to caching)
      const start2 = Date.now();
      await request(app)
        .get(`/api/domains/${domain.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      const time2 = Date.now() - start2;

      expect(time2).toBeLessThan(time1);
    });

    test('should invalidate cache on permission changes', async () => {
      const domain = testDomains[0];
      const user = testUsers.find(u => u.id !== domain.ownerId);
      const ownerToken = authTokens.get(domain.ownerId);
      const userToken = authTokens.get(user.id);

      // User should not have access initially
      await request(app)
        .get(`/api/domains/${domain.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      // Grant permission
      await request(app)
        .post(`/api/domains/${domain.id}/permissions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          userId: user.id,
          role: 'user',
          permissions: ['read'],
        })
        .expect(201);

      // User should now have access (cache invalidated)
      await request(app)
        .get(`/api/domains/${domain.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });
  });
});

/**
 * Test data setup functions
 */
async function setupTestData() {
  // Create test users
  testUsers = await Promise.all([
    createTestUser('owner1@test.com', 'Owner One'),
    createTestUser('owner2@test.com', 'Owner Two'),
    createTestUser('user1@test.com', 'User One'),
    createTestUser('user2@test.com', 'User Two'),
  ]);

  // Create test domains
  testDomains = await Promise.all([
    createTestDomain('Test Domain 1', 'test-domain-1', testUsers[0].id),
    createTestDomain('Test Domain 2', 'test-domain-2', testUsers[1].id),
    createTestDomain('Limited Domain', 'limited-domain', testUsers[2].id, {
      max_keepers: 2,
      max_journeys: 5,
      max_moments: 20,
    }),
  ]);

  // Create test keepers
  testKeepers = await Promise.all([
    createTestKeeper('Test Keeper 1', testDomains[0].id, testUsers[0].id),
    createTestKeeper('Test Keeper 2', testDomains[1].id, testUsers[1].id),
  ]);

  // Create test journeys
  testJourneys = await Promise.all([
    createTestJourney('Test Journey 1', testKeepers[0].id, testDomains[0].id, testUsers[0].id),
    createTestJourney('Test Journey 2', testKeepers[1].id, testDomains[1].id, testUsers[1].id),
  ]);

  // Create test moments
  testMoments = await Promise.all([
    createTestMoment('Test Moment 1', testJourneys[0].id, testKeepers[0].id, testDomains[0].id, testUsers[0].id),
    createTestMoment('Test Moment 2', testJourneys[1].id, testKeepers[1].id, testDomains[1].id, testUsers[1].id),
  ]);

  // Generate auth tokens
  testUsers.forEach(user => {
    authTokens.set(user.id, generateAuthToken(user));
  });

  // Set up accessible domains for users
  testUsers.forEach(user => {
    user.accessibleDomains = testDomains
      .filter(domain => domain.ownerId === user.id)
      .map(domain => domain.id);
  });
}

async function cleanupTestData() {
  // Clean up in reverse order of creation
  await prisma.moment.deleteMany({
    where: { id: { in: testMoments.map(m => m.id) } }
  });
  
  await prisma.journey.deleteMany({
    where: { id: { in: testJourneys.map(j => j.id) } }
  });
  
  await prisma.keeper.deleteMany({
    where: { id: { in: testKeepers.map(k => k.id) } }
  });
  
  await prisma.domainPermission.deleteMany({
    where: { domainId: { in: testDomains.map(d => d.id) } }
  });
  
  await prisma.domain.deleteMany({
    where: { id: { in: testDomains.map(d => d.id) } }
  });
  
  await prisma.user.deleteMany({
    where: { id: { in: testUsers.map(u => u.id) } }
  });
}

async function createTestUser(email: string, name: string) {
  return await prisma.user.create({
    data: { email, name, hashedPassword: 'test-hash' }
  });
}

async function createTestDomain(name: string, slug: string, ownerId: string, limits?: any) {
  return await domainService.createDomain({
    name,
    slug,
    description: `Test domain: ${name}`,
    ownerId,
    limits: limits || { max_keepers: 50, max_journeys: 100, max_moments: 1000 },
    features: { kip_enabled: true, custom_themes: false },
  });
}

async function createTestKeeper(name: string, domainId: string, userId: string) {
  return await prisma.keeper.create({
    data: { name, domainId, userId, type: 'personal' }
  });
}

async function createTestJourney(title: string, keeperId: string, domainId: string, userId: string) {
  return await prisma.journey.create({
    data: { title, keeperId, domainId, userId }
  });
}

async function createTestMoment(title: string, journeyId: string, keeperId: string, domainId: string, userId: string) {
  return await prisma.moment.create({
    data: { 
      title, 
      content: `Content for ${title}`,
      journeyId, 
      keeperId, 
      domainId, 
      userId,
      type: 'text'
    }
  });
}

function generateAuthToken(user: any): string {
  // In a real implementation, this would use JWT or similar
  return `test-token-${user.id}`;
}

// Mock Express app for testing
const app = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}; 