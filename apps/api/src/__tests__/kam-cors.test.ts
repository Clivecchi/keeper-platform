/**
 * KAM (Keeper Authentication Manager) and Domain-scoped CORS Integration Tests
 * ============================================================================
 *
 * Comprehensive tests that prove:
 * 1. KAM authentication enforcement
 * 2. Domain-scoped CORS behavior
 * 3. No wildcard "*" in production configs
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

// Import types
import { AuthenticatedRequest } from '@keeper/database';

// Test utilities
const prisma = new PrismaClient();

// JWT secret for testing
const TEST_JWT_SECRET = 'test-jwt-secret-for-kam-cors-testing';

// Test state
let dbAvailable = false;

// Test data
let testApp: express.Application;
let testUser: any;
let testDomain: any;
let testDomain2: any;
let validToken: string;
let validTokenWrongDomain: string;

describe('KAM (Keeper Authentication Manager) and Domain-scoped CORS', () => {
  beforeAll(async () => {
    // Set test environment to disable Redis BEFORE any imports
    process.env.DISABLE_REDIS = 'true';
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    process.env.NODE_ENV = 'test';

    // Create test app
    testApp = express();
    testApp.use(express.json());

    // Check database connectivity before proceeding
    try {
      await prisma.$connect();
      dbAvailable = true;
      console.log('✅ Database connection established');
    } catch (error) {
      console.log('⚠️  Database not available, running tests in mock mode');
      dbAvailable = false;
    }

    if (dbAvailable) {
      // Setup test data only if database is available
      await setupTestData();
    } else {
      // Setup mock data for tests that don't require database
      setupMockData();
    }

    // Setup protected routes (after env vars are set)
    await setupTestRoutes();

    console.log('✅ KAM-CORS test setup complete');
  });

  afterAll(async () => {
    // Cleanup test data only if database was available
    if (dbAvailable) {
      if (testUser && testUser.id && !testUser.id.startsWith('mock-')) {
        await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
      }
      if (testDomain && testDomain.id && !testDomain.id.startsWith('mock-')) {
        await prisma.domain.delete({ where: { id: testDomain.id } }).catch(() => {});
      }
      if (testDomain2 && testDomain2.id && !testDomain2.id.startsWith('mock-')) {
        await prisma.domain.delete({ where: { id: testDomain2.id } }).catch(() => {});
      }

      await prisma.$disconnect();
    }

    // Reset environment
    delete process.env.DISABLE_REDIS;
    delete process.env.JWT_SECRET;
    delete process.env.NODE_ENV;

    console.log('🧹 KAM-CORS test cleanup complete');
  });

  describe('KAM Authentication Guard', () => {
    describe('No JWT Token', () => {
      it('should return 401 when accessing protected route without JWT', async () => {
        const response = await request(testApp)
          .get('/api/protected')
          .set('Host', `${testDomain.slug}.keeper.tools`);

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          error: 'AUTH_REQUIRED'
        });
      });

      it('should return 401 when accessing domain-protected route without JWT', async () => {
        const response = await request(testApp)
          .get('/api/domain-protected')
          .set('Host', `${testDomain.slug}.keeper.tools`);

        expect(response.status).toBe(401);
        expect(response.body).toMatchObject({
          error: 'AUTH_REQUIRED'
        });
      });
    });

    describe('Valid JWT but Wrong Domain', () => {
      it('should return 403 when JWT user does not have domain access', async () => {
        const response = await request(testApp)
          .get('/api/domain-protected')
          .set('Host', `${testDomain.slug}.keeper.tools`)
          .set('Authorization', `Bearer ${validTokenWrongDomain}`);

        expect(response.status).toBe(403);
        expect(response.body).toMatchObject({
          success: false,
          error: 'INSUFFICIENT_PERMISSIONS',
          message: expect.stringContaining('permission')
        });
      });

      it('should include domain context in permission denial', async () => {
        const response = await request(testApp)
          .get('/api/domain-protected')
          .set('Host', `${testDomain.slug}.keeper.tools`)
          .set('Authorization', `Bearer ${validTokenWrongDomain}`);

        expect(response.status).toBe(403);
        expect(response.body.details).toBeDefined();
        expect(response.body.details.domainId).toBe(testDomain.id);
      });
    });

    describe('Valid JWT and Correct Domain', () => {
      it('should return 200 when JWT user has correct domain access', async () => {
        const response = await request(testApp)
          .get('/api/domain-protected')
          .set('Host', `${testDomain.slug}.keeper.tools`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          message: 'Domain access granted',
          user: expect.objectContaining({
            id: testUser.id,
            email: testUser.email
          }),
          domain: expect.objectContaining({
            id: testDomain.id,
            slug: testDomain.slug
          })
        });
      });

      it('should set appropriate response headers', async () => {
        const response = await request(testApp)
          .get('/api/domain-protected')
          .set('Host', `${testDomain.slug}.keeper.tools`)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.headers['x-user-id']).toBe(testUser.id);
        expect(response.headers['x-user-email']).toBe(testUser.email);
        expect(response.headers['x-domain-role']).toBe('member');
        expect(response.headers['x-domain-permissions']).toBe('read');
      });
    });

    describe('JWT Token Validation', () => {
      it('should return 401 for malformed JWT', async () => {
        const response = await request(testApp)
          .get('/api/protected')
          .set('Authorization', 'Bearer malformed-jwt-token');

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('AUTH_REQUIRED');
      });

      it('should return 401 for expired JWT', async () => {
        const expiredToken = jwt.sign(
          { userId: testUser.id },
          TEST_JWT_SECRET,
          { expiresIn: '-1h' }
        );

        const response = await request(testApp)
          .get('/api/protected')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('AUTH_REQUIRED');
      });
    });
  });

  describe('Domain-scoped CORS Behavior', () => {
    let allowedOrigins: string[];

    beforeAll(() => {
      allowedOrigins = [
        'https://keeper.tools',
        'https://app.keeper.tools',
        `https://${testDomain.slug}.keeper.tools`,
        'http://localhost:3000',
        'http://localhost:5173'
      ];
    });

    const disallowedOrigins = [
      'https://evil.com',
      'https://malicious-site.org',
      'https://random-domain.com'
    ];

    describe('Allowed Origins', () => {
      it('should set ACAO header for platform origins', async () => {
        const platformOrigins = ['https://keeper.tools', 'https://app.keeper.tools'];

        for (const origin of platformOrigins) {
          const response = await request(testApp)
            .options('/api/cors-test')
            .set('Origin', origin)
            .set('Access-Control-Request-Method', 'GET');

          expect(response.status).toBe(200);
          expect(response.headers['access-control-allow-origin']).toBe(origin);
          expect(response.headers['access-control-allow-methods']).toContain('GET');
          expect(response.headers['access-control-allow-headers']).toContain('Content-Type');
          expect(response.headers['access-control-allow-credentials']).toBe('true');
        }
      });

      it('should set ACAO header for subdomain origin', async () => {
        const subdomainOrigin = `https://test.keeper.tools`;
        const response = await request(testApp)
          .options('/api/cors-test')
          .set('Origin', subdomainOrigin)
          .set('Access-Control-Request-Method', 'GET');

        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBe(subdomainOrigin);
      });

      it('should set ACAO header for localhost origins', async () => {
        const localhostOrigins = ['http://localhost:3000', 'http://localhost:5173'];

        for (const origin of localhostOrigins) {
          const response = await request(testApp)
            .options('/api/cors-test')
            .set('Origin', origin)
            .set('Access-Control-Request-Method', 'GET');

          expect(response.status).toBe(200);
          expect(response.headers['access-control-allow-origin']).toBe(origin);
        }
      });
    });

    describe('Disallowed Origins', () => {
      it('should NOT set ACAO header for disallowed origins', async () => {
        for (const origin of disallowedOrigins) {
          const response = await request(testApp)
            .options('/api/cors-test')
            .set('Origin', origin)
            .set('Access-Control-Request-Method', 'GET');

          // CORS middleware should block the request
          expect(response.status).toBe(500); // CORS error status
          expect(response.headers['access-control-allow-origin']).toBeUndefined();
        }
      });
    });

    describe('No Origin Requests', () => {
      it('should allow requests without Origin header (mobile apps, curl)', async () => {
        const response = await request(testApp)
          .get('/api/cors-test');

        expect(response.status).toBe(200);
        // No ACAO header needed for same-origin or no-origin requests
      });
    });

    describe('Production Safety', () => {
      it('should NOT use wildcard "*" in ACAO header', async () => {
        // Test platform origins to ensure none return "*"
        const platformOrigins = ['https://keeper.tools', 'https://app.keeper.tools'];
        for (const origin of platformOrigins) {
          const response = await request(testApp)
            .options('/api/cors-test')
            .set('Origin', origin)
            .set('Access-Control-Request-Method', 'GET');

          expect(response.headers['access-control-allow-origin']).not.toBe('*');
          expect(response.headers['access-control-allow-origin']).toBe(origin);
        }
      });

      it('should have reasonable CORS max-age', async () => {
        const response = await request(testApp)
          .options('/api/cors-test')
          .set('Origin', 'https://keeper.tools')
          .set('Access-Control-Request-Method', 'GET');

        const maxAge = parseInt(response.headers['access-control-max-age']);
        expect(maxAge).toBeGreaterThan(0);
        expect(maxAge).toBeLessThanOrEqual(86400); // 24 hours max
      });
    });

    describe('Custom Domain CORS', () => {
      beforeAll(async () => {
        // Update test domain with custom domain
        await prisma.domain.update({
          where: { id: testDomain.id },
          data: {
            customDomain: 'test.example.com',
            customDomainVerified: true
          }
        });
      });

      it('should allow CORS from verified custom domain', async () => {
        const customOrigin = 'https://test.example.com';

        const response = await request(testApp)
          .options('/api/cors-test')
          .set('Origin', customOrigin)
          .set('Host', 'test.example.com')
          .set('Access-Control-Request-Method', 'GET');

        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBe(customOrigin);
      });

      it('should reject CORS from unverified custom domain', async () => {
        const unverifiedOrigin = 'https://unverified.example.com';

        const response = await request(testApp)
          .options('/api/cors-test')
          .set('Origin', unverifiedOrigin)
          .set('Host', 'unverified.example.com')
          .set('Access-Control-Request-Method', 'GET');

        expect(response.status).toBe(500); // CORS blocked
        expect(response.headers['access-control-allow-origin']).toBeUndefined();
      });
    });
  });

  describe('Integration Scenarios', () => {
    describe('Complete Request Flow', () => {
      it('should handle authenticated request with proper CORS headers', async () => {
        const allowedOrigin = 'https://keeper.tools';

        const response = await request(testApp)
          .get('/api/protected')
          .set('Origin', allowedOrigin)
          .set('Authorization', `Bearer ${validToken}`);

        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
        expect(response.headers['x-user-id']).toBe(testUser.id);
      });

      it('should reject unauthenticated request even with allowed origin', async () => {
        const allowedOrigin = 'https://keeper.tools';

        const response = await request(testApp)
          .get('/api/protected')
          .set('Origin', allowedOrigin);

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('AUTH_REQUIRED');
        // CORS headers should still be set for allowed origins even on auth failures
        expect(response.headers['access-control-allow-origin']).toBe(allowedOrigin);
      });
    });
  });
});

function setupMockData() {
  // Mock test data for when database is not available
  testUser = {
    id: 'mock-user-id',
    email: 'test-user@keeper.tools',
    name: 'Test User'
  };

  testDomain = {
    id: 'mock-domain-id',
    name: 'Test Domain',
    slug: 'test-domain',
    ownerId: testUser.id
  };

  testDomain2 = {
    id: 'mock-domain2-id',
    name: 'Test Domain 2',
    slug: 'test-domain-2',
    ownerId: 'different-user-id'
  };

  // Generate JWT tokens (matching middleware expectations)
  validToken = jwt.sign(
    { userId: testUser.id },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );

  validTokenWrongDomain = jwt.sign(
    { userId: 'different-user-id' },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Test setup utilities
async function setupTestData() {
  // Create test user
  testUser = await prisma.user.create({
    data: {
      email: 'test-user@keeper.tools',
      hashedPassword: 'hashed-password',
      name: 'Test User',
      isActive: true,
      emailVerified: true
    }
  });

  // Create test domains
  testDomain = await prisma.domain.create({
    data: {
      name: 'Test Domain',
      slug: 'test-domain',
      ownerId: testUser.id,
      isActive: true
    }
  });

  testDomain2 = await prisma.domain.create({
    data: {
      name: 'Test Domain 2',
      slug: 'test-domain-2',
      ownerId: 'different-user-id', // Different owner for wrong domain tests
      isActive: true
    }
  });

  // Create domain permission for test user
  await prisma.domainPermission.create({
    data: {
      domainId: testDomain.id,
      userId: testUser.id,
      role: 'user',
      permissions: ['read', 'write']
    }
  });

  // Generate JWT tokens (matching middleware expectations)
  validToken = jwt.sign(
    { userId: testUser.id },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );

  validTokenWrongDomain = jwt.sign(
    { userId: 'different-user-id' },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function setupTestRoutes() {
  // Import middleware dynamically after environment variables are set
  const { requireAuth } = await import('../middleware/domain/requireAuth.js');
  const { requireDomainPermission } = await import('../middleware/domain/requireDomainPermission.js');
  const { resolveDomainContext } = await import('../middleware/domain/resolveDomainContext.js');
  const { createDynamicCorsMiddleware } = await import('../middleware/dynamicCorsMiddleware.js');

  // Apply CORS middleware globally
  const corsMiddleware = createDynamicCorsMiddleware();
  testApp.use(corsMiddleware);

  // Domain resolution middleware (needed for domain permission checks)
  testApp.use('/api/domain-protected', resolveDomainContext({}));

  // Basic auth-protected route
  testApp.get('/api/protected', requireAuth(), (req: Request, res: Response) => {
    const typedReq = req as AuthenticatedRequest;
    res.json({
      success: true,
      message: 'Protected route accessed',
      user: typedReq.user
    });
  });

  // Domain-protected route
  testApp.get('/api/domain-protected', requireDomainPermission('read'), (req: Request, res: Response) => {
    const typedReq = req as AuthenticatedRequest;
    res.json({
      success: true,
      message: 'Domain access granted',
      user: typedReq.user,
      domain: typedReq.domainContext?.domain
    });
  });

  // CORS test route
  testApp.get('/api/cors-test', (req: Request, res: Response) => {
    res.json({ success: true, message: 'CORS test endpoint' });
  });

  // Handle CORS preflight
  testApp.options('/api/cors-test', corsMiddleware, (req: Request, res: Response) => {
    res.status(200).end();
  });
}
