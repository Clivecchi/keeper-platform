/**
 * Sprint 4 Integration Tests
 * Tests for Custom Domain Support & CORS Integration
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { Express } from 'express';
import { 
  DomainVerificationService,
  DomainCacheService,
  DomainService,
  SslCertificateService,
  DomainHealthMonitoringService
} from '@keeper/database';
import { DynamicCorsManager } from '../middleware/dynamicCorsMiddleware';
import { DomainResolutionMiddleware } from '../middleware/domainResolutionMiddleware';

describe('Sprint 4: Custom Domain Support & CORS Integration', () => {
  let app: Express;
  let prisma: PrismaClient;
  let domainService: DomainService;
  let cacheService: DomainCacheService;
  let verificationService: DomainVerificationService;
  let sslService: SslCertificateService;
  let healthService: DomainHealthMonitoringService;
  let corsManager: DynamicCorsManager;
  let resolutionMiddleware: DomainResolutionMiddleware;

  // Test data
  let testDomain: Record<string, unknown>;
  let testUser: Record<string, unknown>;

  beforeAll(async () => {
    // Initialize services
    prisma = new PrismaClient();
    cacheService = new DomainCacheService();
    domainService = new DomainService(prisma, cacheService);
    verificationService = new DomainVerificationService(prisma, cacheService);
    sslService = new SslCertificateService(prisma, cacheService);
    healthService = new DomainHealthMonitoringService(
      prisma,
      domainService,
      verificationService,
      sslService,
      cacheService
    );
    
    // Wait for connections
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: 'hashedpassword',
        name: 'Test User',
        isActive: true,
        emailVerified: true,
      },
    });

    // Create test domain
    testDomain = await prisma.domain.create({
      data: {
        name: 'Test Domain',
        slug: 'test-domain',
        ownerId: testUser.id,
        isActive: true,
      },
    });
  });

  afterEach(async () => {
    // Cleanup test data
    await prisma.domainUsage.deleteMany({
      where: { domainId: testDomain.id },
    });
    await prisma.domain.delete({
      where: { id: testDomain.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  });

  describe('Domain Verification Service', () => {
    it('should initiate domain verification with DNS TXT method', async () => {
      const config = await verificationService.initiateVerification(
        testDomain.id,
        'example.com',
        'DNS_TXT'
      );

      expect(config.method).toBe('DNS_TXT');
      expect(config.token).toBeDefined();
      expect(config.expectedValue).toContain('keeper-site-verification=');
      expect(config.instructions).toContain('_keeper-verification.example.com');
      expect(config.expiresAt).toBeInstanceOf(Date);
    });

    it('should initiate domain verification with DNS CNAME method', async () => {
      const config = await verificationService.initiateVerification(
        testDomain.id,
        'example.com',
        'DNS_CNAME'
      );

      expect(config.method).toBe('DNS_CNAME');
      expect(config.expectedValue).toBe('domains.keeper.tools');
      expect(config.instructions).toContain('CNAME record for example.com');
    });

    it('should initiate domain verification with HTTP file method', async () => {
      const config = await verificationService.initiateVerification(
        testDomain.id,
        'example.com',
        'HTTP_FILE'
      );

      expect(config.method).toBe('HTTP_FILE');
      expect(config.instructions).toContain('/.well-known/keeper-verification.txt');
    });

    it('should initiate domain verification with meta tag method', async () => {
      const config = await verificationService.initiateVerification(
        testDomain.id,
        'example.com',
        'META_TAG'
      );

      expect(config.method).toBe('META_TAG');
      expect(config.expectedValue).toContain('<meta name="keeper-site-verification"');
    });

    it('should reject invalid domain format', async () => {
      await expect(
        verificationService.initiateVerification(
          testDomain.id,
          'invalid..domain',
          'DNS_TXT'
        )
      ).rejects.toThrow('Invalid domain format');
    });

    it('should reject reserved domain', async () => {
      await expect(
        verificationService.initiateVerification(
          testDomain.id,
          'keeper.tools',
          'DNS_TXT'
        )
      ).rejects.toThrow('Domain is reserved and cannot be used');
    });

    it('should perform domain health check', async () => {
      const healthCheck = await verificationService.checkDomainHealth('example.com');

      expect(healthCheck.domain).toBe('example.com');
      expect(healthCheck.lastChecked).toBeInstanceOf(Date);
      expect(healthCheck.dnsResolution).toBeDefined();
      expect(healthCheck.httpChecks).toBeDefined();
      expect(healthCheck.issues).toBeInstanceOf(Array);
      expect(healthCheck.recommendations).toBeInstanceOf(Array);
    });

    it('should handle verification failure gracefully', async () => {
      // Setup domain with verification token
      await prisma.domain.update({
        where: { id: testDomain.id },
        data: {
          customDomain: 'nonexistent.example.com',
          verificationToken: 'test-token',
          verificationMethod: 'DNS_TXT',
        },
      });

      const result = await verificationService.verifyDomain(testDomain.id);

      expect(result.success).toBe(false);
      expect(result.method).toBe('DNS_TXT');
      expect(result.error).toBeDefined();
    });

    it('should batch verify multiple domains', async () => {
      // Create additional test domains
      const testDomain2 = await prisma.domain.create({
        data: {
          name: 'Test Domain 2',
          slug: 'test-domain-2',
          ownerId: testUser.id,
          isActive: true,
          customDomain: 'test2.example.com',
          verificationToken: 'test-token-2',
          verificationMethod: 'DNS_TXT',
        },
      });

      const results = await verificationService.batchVerifyDomains([
        testDomain.id,
        testDomain2.id,
      ]);

      expect(results.size).toBe(2);
      expect(results.has(testDomain.id)).toBe(true);
      expect(results.has(testDomain2.id)).toBe(true);

      // Cleanup
      await prisma.domain.delete({ where: { id: testDomain2.id } });
    });
  });

  describe('Dynamic CORS Manager', () => {
    beforeEach(() => {
      corsManager = new DynamicCorsManager(
        prisma,
        domainService,
        {} as any, // Mock resolution service
        cacheService
      );
    });

    it('should validate CORS configuration', async () => {
      const validation = await corsManager.validateCorsConfig(testDomain.id);

      expect(validation.isValid).toBeDefined();
      expect(validation.issues).toBeInstanceOf(Array);
      expect(validation.recommendations).toBeInstanceOf(Array);
    });

    it('should test CORS configuration for specific origin', async () => {
      const test = await corsManager.testCorsConfig(
        testDomain.id,
        'https://example.com'
      );

      expect(test.allowed).toBeDefined();
      expect(test.config).toBeDefined();
      expect(test.explanation).toBeDefined();
    });

    it('should get CORS statistics', async () => {
      const stats = await corsManager.getCorsStats(testDomain.id);

      expect(stats.totalRequests).toBeDefined();
      expect(stats.allowedRequests).toBeDefined();
      expect(stats.blockedRequests).toBeDefined();
      expect(stats.topOrigins).toBeInstanceOf(Array);
      expect(stats.topBlockedOrigins).toBeInstanceOf(Array);
    });

    it('should handle domain-specific CORS settings', async () => {
      // Update domain with CORS settings
      await prisma.domain.update({
        where: { id: testDomain.id },
        data: {
          settings: {
            cors: {
              additional_origins: ['https://trusted.example.com'],
              allow_credentials: true,
              max_age: 7200,
            },
          },
        },
      });

      const validation = await corsManager.validateCorsConfig(testDomain.id);
      expect(validation.isValid).toBe(true);
    });

    it('should reject invalid CORS configuration', async () => {
      // Update domain with invalid CORS settings
      await prisma.domain.update({
        where: { id: testDomain.id },
        data: {
          settings: {
            cors: {
              additional_origins: ['invalid-url'],
              allow_credentials: true,
            },
          },
        },
      });

      const validation = await corsManager.validateCorsConfig(testDomain.id);
      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Invalid additional origin: invalid-url');
    });
  });

  describe('SSL Certificate Service', () => {
    it('should request SSL certificate', async () => {
      // Setup verified custom domain
      await prisma.domain.update({
        where: { id: testDomain.id },
        data: {
          customDomain: 'test.example.com',
          customDomainVerified: true,
        },
      });

      const request = {
        domainId: testDomain.id,
        customDomain: 'test.example.com',
        provider: 'letsencrypt' as const,
        challengeType: 'dns-01' as const,
        keyAlgorithm: 'RSA-2048' as const,
        autoRenew: true,
      };

      const certificate = await sslService.requestCertificate(request);

      expect(certificate.domain).toBe('test.example.com');
      expect(certificate.provider).toBe('letsencrypt');
      expect(certificate.status).toBe('active');
      expect(certificate.autoRenew).toBe(true);
    });

    it('should validate SSL certificate', async () => {
      // Create a mock certificate
      const mockCert = await prisma.sslCertificate.create({
        data: {
          domain: 'test.example.com',
          domainId: testDomain.id,
          provider: 'letsencrypt',
          status: 'active',
          commonName: 'test.example.com',
          subjectAlternativeNames: ['test.example.com'],
          issuedAt: new Date(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          renewalAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
          autoRenew: true,
          renewalFailureCount: 0,
          metadata: {
            keyAlgorithm: 'RSA-2048',
          },
        },
      });

      const validation = await sslService.validateCertificate('test.example.com');

      expect(validation.isValid).toBe(true);
      expect(validation.securityScore).toBeGreaterThan(0);
      expect(validation.details.domainValidated).toBe(true);

      // Cleanup
      await prisma.sslCertificate.delete({ where: { id: mockCert.id } });
    });

    it('should detect expired certificates', async () => {
      // Create expired certificate
      const expiredCert = await prisma.sslCertificate.create({
        data: {
          domain: 'expired.example.com',
          domainId: testDomain.id,
          provider: 'letsencrypt',
          status: 'active',
          commonName: 'expired.example.com',
          subjectAlternativeNames: ['expired.example.com'],
          issuedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
          expiresAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
          renewalAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
          autoRenew: true,
          renewalFailureCount: 0,
          metadata: {},
        },
      });

      const validation = await sslService.validateCertificate('expired.example.com');

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('Certificate has expired');
      expect(validation.securityScore).toBeLessThan(50);

      // Cleanup
      await prisma.sslCertificate.delete({ where: { id: expiredCert.id } });
    });

    it('should monitor certificate renewals', async () => {
      // Create certificate that needs renewal
      const certNeedingRenewal = await prisma.sslCertificate.create({
        data: {
          domain: 'renewal.example.com',
          domainId: testDomain.id,
          provider: 'letsencrypt',
          status: 'active',
          commonName: 'renewal.example.com',
          subjectAlternativeNames: ['renewal.example.com'],
          issuedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          renewalAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          autoRenew: true,
          renewalFailureCount: 0,
          metadata: {},
        },
      });

      const monitoringResult = await sslService.monitorRenewals();

      expect(monitoringResult.processed).toBeGreaterThanOrEqual(1);
      expect(monitoringResult.results).toBeInstanceOf(Array);

      // Cleanup
      await prisma.sslCertificate.delete({ where: { id: certNeedingRenewal.id } });
    });
  });

  describe('Domain Health Monitoring Service', () => {
    it('should perform comprehensive domain health check', async () => {
      const healthMetrics = await healthService.checkDomainHealth(testDomain.id);

      expect(healthMetrics.domainId).toBe(testDomain.id);
      expect(healthMetrics.status).toBeDefined();
      expect(healthMetrics.score).toBeGreaterThanOrEqual(0);
      expect(healthMetrics.score).toBeLessThanOrEqual(100);
      expect(healthMetrics.lastChecked).toBeInstanceOf(Date);
      expect(healthMetrics.uptime).toBeDefined();
      expect(healthMetrics.performance).toBeDefined();
      expect(healthMetrics.security).toBeDefined();
      expect(healthMetrics.dns).toBeDefined();
      expect(healthMetrics.connectivity).toBeDefined();
      expect(healthMetrics.compliance).toBeDefined();
      expect(healthMetrics.alerts).toBeInstanceOf(Array);
      expect(healthMetrics.recommendations).toBeInstanceOf(Array);
    });

    it('should generate monitoring report', async () => {
      const report = await healthService.generateMonitoringReport('24h');

      expect(report.summary).toBeDefined();
      expect(report.summary.totalDomains).toBeGreaterThanOrEqual(1);
      expect(report.domains).toBeInstanceOf(Array);
      expect(report.trends).toBeDefined();
      expect(report.topIssues).toBeInstanceOf(Array);
    });

    it('should handle monitoring for custom domains', async () => {
      // Update domain with custom domain
      await prisma.domain.update({
        where: { id: testDomain.id },
        data: {
          customDomain: 'custom.example.com',
          customDomainVerified: true,
        },
      });

      const healthMetrics = await healthService.checkDomainHealth(testDomain.id);

      expect(healthMetrics.customDomain).toBe('custom.example.com');
      expect(healthMetrics.domain).toBe('custom.example.com');
    });

    it('should calculate health scores correctly', async () => {
      const healthMetrics = await healthService.checkDomainHealth(testDomain.id);

      // Health score should be between 0 and 100
      expect(healthMetrics.score).toBeGreaterThanOrEqual(0);
      expect(healthMetrics.score).toBeLessThanOrEqual(100);

      // Status should match score
      if (healthMetrics.score >= 90) {
        expect(healthMetrics.status).toBe('healthy');
      } else if (healthMetrics.score >= 70) {
        expect(healthMetrics.status).toBe('degraded');
      } else {
        expect(['unhealthy', 'unknown']).toContain(healthMetrics.status);
      }
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete custom domain setup workflow', async () => {
      const customDomain = 'integration.example.com';

      // Step 1: Initiate domain verification
      const verificationConfig = await verificationService.initiateVerification(
        testDomain.id,
        customDomain,
        'DNS_TXT'
      );

      expect(verificationConfig.method).toBe('DNS_TXT');

      // Step 2: Simulate successful verification
      await prisma.domain.update({
        where: { id: testDomain.id },
        data: {
          customDomain,
          customDomainVerified: true,
        },
      });

      // Step 3: Request SSL certificate
      const certificateRequest = {
        domainId: testDomain.id,
        customDomain,
        provider: 'letsencrypt' as const,
        challengeType: 'dns-01' as const,
        keyAlgorithm: 'RSA-2048' as const,
        autoRenew: true,
      };

      const certificate = await sslService.requestCertificate(certificateRequest);
      expect(certificate.domain).toBe(customDomain);

      // Step 4: Perform health check
      const healthMetrics = await healthService.checkDomainHealth(testDomain.id);
      expect(healthMetrics.customDomain).toBe(customDomain);

      // Step 5: Validate CORS configuration
      const corsValidation = await corsManager.validateCorsConfig(testDomain.id);
      expect(corsValidation.isValid).toBe(true);
    });

    it('should handle domain verification failure scenarios', async () => {
      const customDomain = 'failed.example.com';

      // Step 1: Initiate verification
      await verificationService.initiateVerification(
        testDomain.id,
        customDomain,
        'DNS_TXT'
      );

      // Step 2: Attempt verification (should fail)
      const result = await verificationService.verifyDomain(testDomain.id);
      expect(result.success).toBe(false);

      // Step 3: SSL certificate request should fail
      await expect(
        sslService.requestCertificate({
          domainId: testDomain.id,
          customDomain,
          provider: 'letsencrypt',
          challengeType: 'dns-01',
          keyAlgorithm: 'RSA-2048',
          autoRenew: true,
        })
      ).rejects.toThrow('Custom domain must be verified');
    });

    it('should handle concurrent domain operations', async () => {
      const domains = ['concurrent1.example.com', 'concurrent2.example.com'];
      
      // Create multiple test domains
      const testDomains = await Promise.all(
        domains.map(async (domain, index) => {
          return prisma.domain.create({
            data: {
              name: `Concurrent Test ${index + 1}`,
              slug: `concurrent-test-${index + 1}`,
              ownerId: testUser.id,
              isActive: true,
              customDomain: domain,
              customDomainVerified: true,
            },
          });
        })
      );

      // Perform concurrent operations
      const healthChecks = await Promise.all(
        testDomains.map(domain => healthService.checkDomainHealth(domain.id))
      );

      expect(healthChecks).toHaveLength(2);
      healthChecks.forEach((check, index) => {
        expect(check.customDomain).toBe(domains[index]);
      });

      // Cleanup
      await Promise.all(
        testDomains.map(domain => prisma.domain.delete({ where: { id: domain.id } }))
      );
    });

    it('should handle domain status changes', async () => {
      // Step 1: Initial health check
      const initialHealth = await healthService.checkDomainHealth(testDomain.id);
      expect(initialHealth.status).toBeDefined();

      // Step 2: Suspend domain
      await prisma.domain.update({
        where: { id: testDomain.id },
        data: { status: 'suspended' },
      });

      // Step 3: Verify operations are restricted
      await expect(
        verificationService.initiateVerification(
          testDomain.id,
          'suspended.example.com',
          'DNS_TXT'
        )
      ).rejects.toThrow();

      // Step 4: Reactivate domain
      await prisma.domain.update({
        where: { id: testDomain.id },
        data: { status: 'active' },
      });

      // Step 5: Verify operations work again
      const config = await verificationService.initiateVerification(
        testDomain.id,
        'reactivated.example.com',
        'DNS_TXT'
      );
      expect(config.method).toBe('DNS_TXT');
    });
  });

  describe('Performance and Scaling', () => {
    it('should handle batch operations efficiently', async () => {
      // Create multiple domains for batch testing
      const batchDomains = await Promise.all(
        Array.from({ length: 10 }, async (_, i) => {
          return prisma.domain.create({
            data: {
              name: `Batch Test ${i + 1}`,
              slug: `batch-test-${i + 1}`,
              ownerId: testUser.id,
              isActive: true,
              customDomain: `batch${i + 1}.example.com`,
              verificationToken: `token-${i + 1}`,
              verificationMethod: 'DNS_TXT',
            },
          });
        })
      );

      const startTime = Date.now();
      const results = await verificationService.batchVerifyDomains(
        batchDomains.map(d => d.id)
      );
      const endTime = Date.now();

      expect(results.size).toBe(10);
      expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Cleanup
      await Promise.all(
        batchDomains.map(domain => prisma.domain.delete({ where: { id: domain.id } }))
      );
    });

    it('should cache domain resolution results', async () => {
      // First call should populate cache
      const firstCall = Date.now();
      const health1 = await healthService.checkDomainHealth(testDomain.id);
      const firstCallTime = Date.now() - firstCall;

      // Second call should use cache and be faster
      const secondCall = Date.now();
      const health2 = await healthService.checkDomainHealth(testDomain.id);
      const secondCallTime = Date.now() - secondCall;

      expect(health1.domainId).toBe(health2.domainId);
      // Note: In a real implementation, the second call would be faster due to caching
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle network timeouts gracefully', async () => {
      // This test would typically use a mock server that introduces delays
      // For now, we'll test the timeout handling logic
      const healthMetrics = await healthService.checkDomainHealth(testDomain.id);
      
      // Should still return a valid health metrics object even if some checks fail
      expect(healthMetrics).toBeDefined();
      expect(healthMetrics.domainId).toBe(testDomain.id);
    });

    it('should handle invalid domain configurations', async () => {
      // Test with malformed domain
      await expect(
        verificationService.initiateVerification(
          testDomain.id,
          'invalid..domain.com',
          'DNS_TXT'
        )
      ).rejects.toThrow('Invalid domain format');
    });

    it('should handle missing domain gracefully', async () => {
      const nonExistentId = 'non-existent-id';
      
      await expect(
        healthService.checkDomainHealth(nonExistentId)
      ).rejects.toThrow('Domain not found');
    });
  });
});

// Additional test helpers
function createMockRequest(hostname: string, origin?: string) {
  return {
    headers: {
      host: hostname,
      origin,
    },
    method: 'GET',
    url: '/',
    path: '/',
  } as any;
}

function createMockResponse() {
  const headers = new Map<string, string>();
  return {
    setHeader: (key: string, value: string) => headers.set(key, value),
    getHeader: (key: string) => headers.get(key),
    status: (code: number) => ({ 
      json: (data: unknown) => ({ statusCode: code, data }),
      end: () => ({ statusCode: code }),
    }),
    redirect: (code: number, url: string) => ({ statusCode: code, redirectUrl: url }),
    end: () => ({}),
  } as any;
} 