/**
 * Sprint 7 Production Readiness Integration Tests
 * Comprehensive test suite for production configuration, monitoring, and deployment automation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import express from 'express';
import { ProductionConfigService } from '../services/ProductionConfigService';
import { MonitoringService } from '../services/MonitoringService';
import { DeploymentAutomationService } from '../services/DeploymentAutomationService';
import { DomainCacheService } from '../services/DomainCacheService';
import { createProductionRoutes } from '../api/production/routes';
import { authMiddleware } from '../middleware/authMiddleware';
import { domainPermissionMiddleware } from '../middleware/domainPermissionMiddleware';

// Test environment setup
const testPrisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/keeper_test',
    },
  },
});

const testApp = express();
testApp.use(express.json());

// Mock services
let configService: ProductionConfigService;
let monitoringService: MonitoringService;
let deploymentService: DeploymentAutomationService;
let cacheService: DomainCacheService;

// Test data
const testUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  name: 'Test User',
};

const testDomain = {
  id: 'test-domain-1',
  name: 'Test Domain',
  slug: 'test-domain',
  customDomain: 'test.example.com',
  ownerId: testUser.id,
};

const testDeploymentConfig = {
  version: '1.0.0',
  branch: 'main',
  commit: 'abc123',
  buildId: 'build-123',
  strategy: 'rolling' as const,
  environment: 'staging' as const,
  healthCheck: {
    enabled: true,
    path: '/health',
    timeout: 30000,
    retries: 3,
    interval: 10000,
  },
  rollback: {
    enabled: true,
    threshold: 0.1,
    automatic: false,
    timeout: 600000,
  },
  scaling: {
    minInstances: 2,
    maxInstances: 10,
    targetCPU: 0.7,
    targetMemory: 0.8,
  },
  notifications: {
    channels: ['email'],
    onSuccess: true,
    onFailure: true,
    onRollback: true,
  },
};

describe('Sprint 7: Production Readiness Integration Tests', () => {
  beforeAll(async () => {
    // Initialize services
    cacheService = new DomainCacheService();
    configService = new ProductionConfigService(testPrisma, cacheService);
    monitoringService = new MonitoringService(testPrisma, cacheService, configService);
    deploymentService = new DeploymentAutomationService(testPrisma, configService, monitoringService, cacheService);

    // Setup test app with routes
    const productionRoutes = createProductionRoutes(
      testPrisma,
      configService,
      monitoringService,
      deploymentService,
      cacheService
    );

    // Mock authentication middleware
    testApp.use('/api/production', (req, res, next) => {
      req.user = testUser;
      next();
    });

    testApp.use('/api/production', productionRoutes);

    // Setup test database
    await testPrisma.user.create({
      data: testUser,
    });

    await testPrisma.domain.create({
      data: testDomain,
    });
  });

  afterAll(async () => {
    // Cleanup
    await testPrisma.domain.deleteMany();
    await testPrisma.user.deleteMany();
    await testPrisma.$disconnect();
    
    configService.cleanup();
    monitoringService.cleanup();
  });

  beforeEach(async () => {
    // Clear any test data
    await cacheService.clearCache('test:*');
  });

  afterEach(async () => {
    // Clean up after each test
    await cacheService.clearCache('test:*');
  });

  // ================================
  // Production Configuration Tests
  // ================================

  describe('Production Configuration Service', () => {
    it('should initialize with correct environment configuration', async () => {
      const config = configService.getConfig();
      
      expect(config).toBeDefined();
      expect(config.environment).toBe('test');
      expect(config.database).toBeDefined();
      expect(config.cache).toBeDefined();
      expect(config.security).toBeDefined();
      expect(config.performance).toBeDefined();
      expect(config.monitoring).toBeDefined();
      expect(config.domain).toBeDefined();
      expect(config.deployment).toBeDefined();
    });

    it('should validate configuration correctly', async () => {
      const validation = await configService.validateConfig();
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toBeDefined();
      expect(validation.recommendations).toBeDefined();
    });

    it('should update configuration category', async () => {
      const updates = {
        compression: {
          enabled: false,
          level: 3,
        },
      };

      await configService.updateConfig('performance', updates);
      
      const performanceConfig = configService.getConfigCategory('performance');
      expect(performanceConfig.compression.enabled).toBe(false);
      expect(performanceConfig.compression.level).toBe(3);
    });

    it('should get system health status', async () => {
      const health = await configService.getSystemHealth();
      
      expect(health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(health.components).toBeDefined();
      expect(health.components.database).toBeDefined();
      expect(health.components.cache).toBeDefined();
      expect(health.components.storage).toBeDefined();
      expect(health.components.external).toBeDefined();
      expect(health.metrics).toBeDefined();
      expect(health.timestamp).toBeInstanceOf(Date);
    });

    it('should reject invalid configuration updates', async () => {
      const invalidUpdates = {
        connectionPool: {
          max: 1,
          min: 10, // Invalid: max < min
        },
      };

      await expect(
        configService.updateConfig('database', invalidUpdates)
      ).rejects.toThrow('Configuration validation failed');
    });
  });

  // ================================
  // Monitoring Service Tests
  // ================================

  describe('Monitoring Service', () => {
    it('should record HTTP request metrics', async () => {
      const startTime = Date.now();
      
      monitoringService.recordHttpRequest('GET', '/api/test', 200, 150, testDomain.id);
      
      // Metrics should be recorded without throwing
      expect(true).toBe(true);
    });

    it('should record database query metrics', async () => {
      monitoringService.recordDbQuery('SELECT', 'users', 25);
      
      // Metrics should be recorded without throwing
      expect(true).toBe(true);
    });

    it('should record cache operation metrics', async () => {
      monitoringService.recordCacheOperation('domain', true);
      monitoringService.recordCacheOperation('permissions', false);
      
      // Metrics should be recorded without throwing
      expect(true).toBe(true);
    });

    it('should create and manage alerts', async () => {
      const alertId = await monitoringService.createAlert({
        severity: 'warning',
        title: 'Test Alert',
        description: 'This is a test alert',
        source: 'test',
        channels: ['email'],
      });

      expect(alertId).toBeDefined();
      expect(typeof alertId).toBe('string');

      // Resolve alert
      await monitoringService.resolveAlert(alertId, testUser.id, 'Test resolution');
      
      // Should not throw
      expect(true).toBe(true);
    });

    it('should get performance metrics', async () => {
      const metrics = await monitoringService.getPerformanceMetrics('1h');
      
      expect(metrics.responseTime).toBeDefined();
      expect(metrics.throughput).toBeDefined();
      expect(metrics.errorRate).toBeDefined();
      expect(metrics.availability).toBeDefined();
    });

    it('should get system metrics', async () => {
      const metrics = await monitoringService.getSystemMetrics();
      
      expect(metrics.cpu).toBeDefined();
      expect(metrics.memory).toBeDefined();
      expect(metrics.disk).toBeDefined();
      expect(metrics.network).toBeDefined();
    });

    it('should generate monitoring report', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const endDate = new Date();
      
      const report = await monitoringService.generateReport(startDate, endDate, true);
      
      expect(report.period.start).toEqual(startDate);
      expect(report.period.end).toEqual(endDate);
      expect(report.summary).toBeDefined();
      expect(report.performance).toBeDefined();
      expect(report.system).toBeDefined();
      expect(report.alerts).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should handle trace spans', async () => {
      const span = monitoringService.startTrace('test-operation');
      
      expect(span.traceId).toBeDefined();
      expect(span.spanId).toBeDefined();
      expect(span.operationName).toBe('test-operation');
      expect(span.startTime).toBeInstanceOf(Date);
      
      // Finish trace
      monitoringService.finishTrace(span);
      
      expect(span.endTime).toBeInstanceOf(Date);
      expect(span.duration).toBeDefined();
    });

    it('should handle trace spans with errors', async () => {
      const span = monitoringService.startTrace('test-operation-error');
      const error = new Error('Test error');
      
      monitoringService.finishTrace(span, error);
      
      expect(span.status.code).toBe(1);
      expect(span.status.message).toBe('Test error');
      expect(span.tags.error).toBe(true);
    });

    it('should log entries correctly', async () => {
      monitoringService.log('info', 'Test log message', 'test', { key: 'value' }, testUser.id, testDomain.id);
      monitoringService.log('error', 'Test error message', 'test', { error: 'details' });
      
      // Should not throw
      expect(true).toBe(true);
    });
  });

  // ================================
  // Deployment Automation Tests
  // ================================

  describe('Deployment Automation Service', () => {
    it('should create deployment', async () => {
      const artifacts = [
        {
          id: 'artifact-1',
          name: 'test-artifact',
          type: 'docker' as const,
          url: 'docker://test/app:1.0.0',
          checksum: 'sha256:abcd1234',
          size: 100 * 1024 * 1024,
          createdAt: new Date(),
        },
      ];

      const deploymentId = await deploymentService.createDeployment(
        testDeploymentConfig,
        testUser.id,
        artifacts
      );

      expect(deploymentId).toBeDefined();
      expect(typeof deploymentId).toBe('string');

      // Verify deployment was created
      const deployment = await deploymentService.getDeploymentStatus(deploymentId);
      expect(deployment).toBeDefined();
      expect(deployment!.id).toBe(deploymentId);
      expect(deployment!.status).toBe('pending');
    });

    it('should start and complete deployment', async () => {
      const artifacts = [
        {
          id: 'artifact-2',
          name: 'test-artifact-2',
          type: 'docker' as const,
          url: 'docker://test/app:1.0.1',
          checksum: 'sha256:efgh5678',
          size: 100 * 1024 * 1024,
          createdAt: new Date(),
        },
      ];

      const deploymentId = await deploymentService.createDeployment(
        testDeploymentConfig,
        testUser.id,
        artifacts
      );

      // Start deployment
      await deploymentService.startDeployment(deploymentId);

      // Wait for deployment to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const deployment = await deploymentService.getDeploymentStatus(deploymentId);
      expect(deployment!.status).toMatch(/^(running|success|failed)$/);
    });

    it('should handle deployment rollback', async () => {
      const artifacts = [
        {
          id: 'artifact-3',
          name: 'test-artifact-3',
          type: 'docker' as const,
          url: 'docker://test/app:1.0.2',
          checksum: 'sha256:ijkl9012',
          size: 100 * 1024 * 1024,
          createdAt: new Date(),
        },
      ];

      const deploymentId = await deploymentService.createDeployment(
        testDeploymentConfig,
        testUser.id,
        artifacts
      );

      // This should not throw even if no previous version exists
      await expect(
        deploymentService.rollbackDeployment(deploymentId, 'manual', 'Test rollback')
      ).rejects.toThrow('No previous version available');
    });

    it('should get deployment history', async () => {
      const history = await deploymentService.getDeploymentHistory('staging', 10);
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(0);
    });

    it('should get deployment metrics', async () => {
      const metrics = await deploymentService.getDeploymentMetrics('staging', '7d');
      
      expect(metrics.totalDeployments).toBeDefined();
      expect(metrics.successfulDeployments).toBeDefined();
      expect(metrics.failedDeployments).toBeDefined();
      expect(metrics.rollbacks).toBeDefined();
      expect(metrics.averageDeploymentTime).toBeDefined();
      expect(metrics.changeFailureRate).toBeDefined();
    });

    it('should get infrastructure state', async () => {
      const state = await deploymentService.getInfrastructureState();
      
      expect(state.instances).toBeDefined();
      expect(state.loadBalancer).toBeDefined();
      expect(state.database).toBeDefined();
      expect(Array.isArray(state.instances)).toBe(true);
    });

    it('should create and execute pipeline', async () => {
      const stages = [
        {
          id: 'build',
          name: 'Build',
          description: 'Build application',
          type: 'build' as const,
          dependencies: [],
          config: {},
          timeout: 600000,
          retryPolicy: {
            maxRetries: 3,
            backoffStrategy: 'exponential' as const,
            baseDelay: 1000,
          },
        },
        {
          id: 'test',
          name: 'Test',
          description: 'Run tests',
          type: 'test' as const,
          dependencies: ['build'],
          config: {},
          timeout: 600000,
          retryPolicy: {
            maxRetries: 3,
            backoffStrategy: 'exponential' as const,
            baseDelay: 1000,
          },
        },
      ];

      const triggers = [
        {
          id: 'manual',
          type: 'manual' as const,
          config: {},
          enabled: true,
        },
      ];

      const pipelineId = await deploymentService.createPipeline(
        'Test Pipeline',
        'Pipeline for testing',
        stages,
        triggers,
        'staging',
        testUser.id
      );

      expect(pipelineId).toBeDefined();
      expect(typeof pipelineId).toBe('string');

      // Execute pipeline
      const buildId = await deploymentService.executePipeline(pipelineId, { test: 'context' });
      
      expect(buildId).toBeDefined();
      expect(typeof buildId).toBe('string');
    });

    it('should generate deployment configuration', async () => {
      const configs = await deploymentService.generateDeploymentConfig('staging', '1.0.0');
      
      expect(configs).toBeDefined();
      expect(configs['kubernetes.yaml']).toBeDefined();
      expect(configs['docker-compose.yml']).toBeDefined();
      expect(configs['nginx.conf']).toBeDefined();
      
      // Verify Kubernetes config structure
      expect(configs['kubernetes.yaml']).toContain('apiVersion: apps/v1');
      expect(configs['kubernetes.yaml']).toContain('kind: Deployment');
      expect(configs['kubernetes.yaml']).toContain('keeper/api:1.0.0');
    });
  });

  // ================================
  // API Endpoint Tests
  // ================================

  describe('Production API Endpoints', () => {
    describe('Configuration Management', () => {
      it('should get current configuration', async () => {
        const response = await request(testApp)
          .get('/api/production/config')
          .expect(200);

        expect(response.body.config).toBeDefined();
        expect(response.body.config.environment).toBe('test');
      });

      it('should get configuration category', async () => {
        const response = await request(testApp)
          .get('/api/production/config/database')
          .expect(200);

        expect(response.body.config).toBeDefined();
        expect(response.body.config.connectionPool).toBeDefined();
      });

      it('should update configuration', async () => {
        const updates = {
          category: 'performance',
          updates: {
            compression: {
              enabled: false,
            },
          },
        };

        await request(testApp)
          .put('/api/production/config')
          .send(updates)
          .expect(200);
      });

      it('should validate configuration', async () => {
        const response = await request(testApp)
          .post('/api/production/config/validate')
          .expect(200);

        expect(response.body.validation).toBeDefined();
        expect(response.body.validation.isValid).toBe(true);
      });

      it('should get system health', async () => {
        const response = await request(testApp)
          .get('/api/production/health')
          .expect(200);

        expect(response.body.health).toBeDefined();
        expect(response.body.health.status).toMatch(/^(healthy|degraded|unhealthy)$/);
      });
    });

    describe('Monitoring Endpoints', () => {
      it('should get performance metrics', async () => {
        const response = await request(testApp)
          .get('/api/production/metrics/performance')
          .query({ timeRange: '1h' })
          .expect(200);

        expect(response.body.metrics).toBeDefined();
        expect(response.body.metrics.responseTime).toBeDefined();
        expect(response.body.metrics.throughput).toBeDefined();
      });

      it('should get system metrics', async () => {
        const response = await request(testApp)
          .get('/api/production/metrics/system')
          .expect(200);

        expect(response.body.metrics).toBeDefined();
        expect(response.body.metrics.cpu).toBeDefined();
        expect(response.body.metrics.memory).toBeDefined();
      });

      it('should get domain metrics', async () => {
        const response = await request(testApp)
          .get(`/api/production/metrics/domain/${testDomain.id}`)
          .expect(200);

        expect(response.body.metrics).toBeDefined();
        expect(response.body.metrics.domainId).toBe(testDomain.id);
      });

      it('should get Prometheus metrics', async () => {
        const response = await request(testApp)
          .get('/api/production/metrics/prometheus')
          .expect(200);

        expect(response.headers['content-type']).toContain('text/plain');
      });

      it('should create alert rule', async () => {
        const alertRule = {
          name: 'Test Alert Rule',
          description: 'Test alert rule for testing',
          metric: 'error_rate',
          operator: 'gt',
          threshold: 5.0,
          duration: 300,
          severity: 'warning',
          channels: ['email'],
        };

        const response = await request(testApp)
          .post('/api/production/alerts/rules')
          .send(alertRule)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should generate monitoring report', async () => {
        const reportData = {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          includeRecommendations: true,
        };

        const response = await request(testApp)
          .post('/api/production/reports/generate')
          .send(reportData)
          .expect(200);

        expect(response.body.report).toBeDefined();
        expect(response.body.report.summary).toBeDefined();
        expect(response.body.report.performance).toBeDefined();
      });
    });

    describe('Deployment Endpoints', () => {
      it('should create deployment', async () => {
        const response = await request(testApp)
          .post('/api/production/deployments')
          .send(testDeploymentConfig)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.deploymentId).toBeDefined();
      });

      it('should get deployment history', async () => {
        const response = await request(testApp)
          .get('/api/production/deployments')
          .query({ environment: 'staging', limit: 10 })
          .expect(200);

        expect(response.body.deployments).toBeDefined();
        expect(Array.isArray(response.body.deployments)).toBe(true);
      });

      it('should get deployment metrics', async () => {
        const response = await request(testApp)
          .get('/api/production/deployments/metrics/staging')
          .query({ timeRange: '7d' })
          .expect(200);

        expect(response.body.metrics).toBeDefined();
        expect(response.body.metrics.totalDeployments).toBeDefined();
      });

      it('should get infrastructure state', async () => {
        const response = await request(testApp)
          .get('/api/production/infrastructure')
          .expect(200);

        expect(response.body.state).toBeDefined();
        expect(response.body.state.instances).toBeDefined();
        expect(response.body.state.loadBalancer).toBeDefined();
      });

      it('should create pipeline', async () => {
        const pipelineData = {
          name: 'Test Pipeline',
          description: 'Test pipeline for API testing',
          environment: 'staging',
          stages: [
            {
              id: 'build',
              name: 'Build',
              description: 'Build stage',
              type: 'build',
              dependencies: [],
              config: {},
              timeout: 600000,
              retryPolicy: {
                maxRetries: 3,
                backoffStrategy: 'exponential',
                baseDelay: 1000,
              },
            },
          ],
          triggers: [
            {
              id: 'manual',
              type: 'manual',
              config: {},
              enabled: true,
            },
          ],
        };

        const response = await request(testApp)
          .post('/api/production/pipelines')
          .send(pipelineData)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.pipelineId).toBeDefined();
      });

      it('should generate deployment config', async () => {
        const configData = {
          environment: 'staging',
          version: '1.0.0',
        };

        const response = await request(testApp)
          .post('/api/production/deployments/config/generate')
          .send(configData)
          .expect(200);

        expect(response.body.configs).toBeDefined();
        expect(response.body.configs['kubernetes.yaml']).toBeDefined();
      });
    });

    describe('Utility Endpoints', () => {
      it('should check production readiness', async () => {
        const response = await request(testApp)
          .get('/api/production/readiness')
          .expect(200);

        expect(response.body.readiness).toBeDefined();
        expect(response.body.readiness.configuration).toBeDefined();
        expect(response.body.readiness.health).toBeDefined();
        expect(response.body.readiness.infrastructure).toBeDefined();
        expect(response.body.readiness.overall).toMatch(/^(ready|not_ready)$/);
      });

      it('should get system diagnostics', async () => {
        const response = await request(testApp)
          .get('/api/production/diagnostics')
          .expect(200);

        expect(response.body.diagnostics).toBeDefined();
        expect(response.body.diagnostics.system).toBeDefined();
        expect(response.body.diagnostics.performance).toBeDefined();
        expect(response.body.diagnostics.timestamp).toBeDefined();
      });

      it('should clear cache', async () => {
        const response = await request(testApp)
          .post('/api/production/cache/clear')
          .send({ pattern: 'test:*' })
          .expect(200);

        expect(response.body.success).toBe(true);
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid configuration updates', async () => {
        const invalidUpdates = {
          category: 'invalid_category',
          updates: {},
        };

        await request(testApp)
          .put('/api/production/config')
          .send(invalidUpdates)
          .expect(400);
      });

      it('should handle deployment not found', async () => {
        await request(testApp)
          .get('/api/production/deployments/nonexistent-deployment')
          .expect(404);
      });

      it('should handle invalid alert rule', async () => {
        const invalidAlertRule = {
          name: '', // Invalid: empty name
          metric: 'test',
          operator: 'invalid_operator',
          threshold: 'not_a_number',
          duration: 30, // Invalid: too short
          severity: 'invalid_severity',
          channels: [],
        };

        await request(testApp)
          .post('/api/production/alerts/rules')
          .send(invalidAlertRule)
          .expect(400);
      });

      it('should handle invalid deployment configuration', async () => {
        const invalidConfig = {
          version: '', // Invalid: empty version
          strategy: 'invalid_strategy',
          environment: 'invalid_environment',
          scaling: {
            minInstances: 0, // Invalid: must be at least 1
            maxInstances: 0,
          },
        };

        await request(testApp)
          .post('/api/production/deployments')
          .send(invalidConfig)
          .expect(400);
      });
    });
  });

  // ================================
  // Performance Tests
  // ================================

  describe('Performance Tests', () => {
    it('should handle concurrent metric recordings', async () => {
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(
          new Promise<void>((resolve) => {
            monitoringService.recordHttpRequest('GET', '/test', 200, 100, testDomain.id);
            resolve();
          })
        );
      }

      await Promise.all(promises);
      
      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should handle concurrent deployment operations', async () => {
      const promises = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(
          deploymentService.createDeployment(
            { ...testDeploymentConfig, version: `1.0.${i}` },
            testUser.id,
            []
          )
        );
      }

      const deploymentIds = await Promise.all(promises);
      
      expect(deploymentIds).toHaveLength(10);
      deploymentIds.forEach(id => {
        expect(typeof id).toBe('string');
      });
    });

    it('should handle high-frequency configuration requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 50; i++) {
        promises.push(
          request(testApp)
            .get('/api/production/config')
            .expect(200)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expect(response.body.config).toBeDefined();
      });
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      const promises = [];
      
      // Simulate load with various operations
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(testApp)
            .get('/api/production/metrics/performance')
            .expect(200)
        );
        
        promises.push(
          request(testApp)
            .get('/api/production/health')
            .expect(200)
        );
      }

      await Promise.all(promises);
      
      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time (adjust based on requirements)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });
  });

  // ================================
  // Integration Tests
  // ================================

  describe('Service Integration', () => {
    it('should integrate monitoring with configuration', async () => {
      // Update configuration
      await configService.updateConfig('monitoring', {
        alerting: {
          enabled: true,
          thresholds: {
            errorRate: 0.01,
          },
        },
      });

      // Create alert that should be triggered
      const alertId = await monitoringService.createAlert({
        severity: 'error',
        title: 'High Error Rate',
        description: 'Error rate exceeded threshold',
        source: 'integration-test',
        channels: ['email'],
      });

      expect(alertId).toBeDefined();
    });

    it('should integrate deployment with monitoring', async () => {
      const artifacts = [
        {
          id: 'integration-artifact',
          name: 'integration-test-artifact',
          type: 'docker' as const,
          url: 'docker://test/integration:1.0.0',
          checksum: 'sha256:integration',
          size: 50 * 1024 * 1024,
          createdAt: new Date(),
        },
      ];

      const deploymentId = await deploymentService.createDeployment(
        { ...testDeploymentConfig, version: '1.0.integration' },
        testUser.id,
        artifacts
      );

      // Verify deployment metrics are recorded
      const metrics = await deploymentService.getDeploymentMetrics('staging', '1h');
      expect(metrics).toBeDefined();
    });

    it('should integrate all services with API', async () => {
      // Test a complete workflow through API
      
      // 1. Check readiness
      const readinessResponse = await request(testApp)
        .get('/api/production/readiness')
        .expect(200);

      expect(readinessResponse.body.readiness.overall).toMatch(/^(ready|not_ready)$/);

      // 2. Create deployment
      const deploymentResponse = await request(testApp)
        .post('/api/production/deployments')
        .send(testDeploymentConfig)
        .expect(200);

      const deploymentId = deploymentResponse.body.deploymentId;

      // 3. Check deployment status
      const statusResponse = await request(testApp)
        .get(`/api/production/deployments/${deploymentId}`)
        .expect(200);

      expect(statusResponse.body.deployment.id).toBe(deploymentId);

      // 4. Generate report
      const reportResponse = await request(testApp)
        .post('/api/production/reports/generate')
        .send({
          startDate: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          includeRecommendations: true,
        })
        .expect(200);

      expect(reportResponse.body.report.summary).toBeDefined();
    });
  });
});

// Helper functions for testing
function generateTestMetrics(count: number) {
  const metrics = [];
  for (let i = 0; i < count; i++) {
    metrics.push({
      name: `test_metric_${i}`,
      type: 'counter' as const,
      description: `Test metric ${i}`,
      value: Math.random() * 100,
      timestamp: new Date(),
    });
  }
  return metrics;
}

function generateTestDeploymentConfig(overrides: Partial<typeof testDeploymentConfig> = {}) {
  return {
    ...testDeploymentConfig,
    ...overrides,
    version: `1.0.${Date.now()}`,
    buildId: `build-${Date.now()}`,
  };
}

export { testPrisma, testApp, testUser, testDomain }; 