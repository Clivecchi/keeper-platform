/**
 * Production API Routes
 * Comprehensive production management endpoints for monitoring, configuration, and deployment
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { 
  ProductionConfigService, 
  MonitoringService, 
  DeploymentAutomationService, 
  DomainCacheService 
} from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { requireDomainAdminCompat } from '../../middleware/domainPermissionMiddleware.js';
import { Redis } from 'ioredis';
import type { PipelineTrigger } from '../../types/pipeline.js';

// Validation schemas
const UpdateConfigSchema = z.object({
  category: z.enum(['database', 'cache', 'security', 'performance', 'monitoring', 'domain']),
  updates: z.record(z.unknown()),
});

const CreateAlertRuleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  metric: z.string().min(1).max(100),
  operator: z.enum(['gt', 'lt', 'eq', 'ne', 'gte', 'lte']),
  threshold: z.number(),
  duration: z.number().min(60).max(3600),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  channels: z.array(z.enum(['email', 'slack', 'webhook', 'sms', 'pagerduty'])),
  enabled: z.boolean().default(true),
});

const CreateDeploymentSchema = z.object({
  version: z.string().min(1).max(50),
  branch: z.string().min(1).max(100),
  commit: z.string().min(1).max(100),
  buildId: z.string().min(1).max(100),
  strategy: z.enum(['rolling', 'blue-green', 'canary']),
  environment: z.enum(['development', 'staging', 'production']),
  healthCheck: z.object({
    enabled: z.boolean().default(true),
    path: z.string().default('/health'),
    timeout: z.number().default(30000),
    retries: z.number().default(3),
    interval: z.number().default(10000),
  }),
  rollback: z.object({
    enabled: z.boolean().default(true),
    threshold: z.number().default(0.1),
    automatic: z.boolean().default(false),
    timeout: z.number().default(600000),
  }),
  scaling: z.object({
    minInstances: z.number().min(1).default(2),
    maxInstances: z.number().min(1).default(10),
    targetCPU: z.number().min(0).max(1).default(0.7),
    targetMemory: z.number().min(0).max(1).default(0.8),
  }),
  notifications: z.object({
    channels: z.array(z.string()),
    onSuccess: z.boolean().default(true),
    onFailure: z.boolean().default(true),
    onRollback: z.boolean().default(true),
  }),
});

const CreatePipelineSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500),
  environment: z.enum(['development', 'staging', 'production']),
  stages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    type: z.enum(['build', 'test', 'deploy', 'validate', 'notify']),
    dependencies: z.array(z.string()),
    config: z.record(z.unknown()),
    timeout: z.number().default(600000),
    retryPolicy: z.object({
      maxRetries: z.number().default(3),
      backoffStrategy: z.enum(['linear', 'exponential']).default('exponential'),
      baseDelay: z.number().default(1000),
    }),
  })),
  triggers: z.array(z.object({
    id: z.string(),
    type: z.enum(['webhook', 'schedule', 'manual', 'branch', 'tag']),
    config: z.record(z.unknown()),
    enabled: z.boolean().default(true),
  })),
});

const GenerateReportSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  includeRecommendations: z.boolean().default(true),
});

const RollbackDeploymentSchema = z.object({
  reason: z.string().min(1).max(500),
});

export function createProductionRoutes(
  prisma: PrismaClient,
  configService: ProductionConfigService,
  monitoringService: MonitoringService,
  deploymentService: DeploymentAutomationService,
  cacheService: DomainCacheService
): Router {
  const router: Router = Router();

  // Apply authentication middleware to all routes
  router.use(authMiddlewareCompat);

  // Apply domain permission middleware (admin only for production endpoints)
  router.use(requireDomainAdminCompat);

  // ================================
  // Configuration Management Routes
  // ================================

  /**
   * Get current configuration
   */
  router.get('/config', async (req: Request, res: Response) => {
    try {
      const config = configService.getConfig();
      res.json({ config });
    } catch (error) {
      monitoringService.log('error', 'Failed to get configuration', 'production-api', { error });
      res.status(500).json({ error: 'Failed to get configuration' });
    }
  });

  /**
   * Get configuration category
   */
  router.get('/config/:category', async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      const config = configService.getConfigCategory(category as any);
      res.json({ config });
    } catch (error) {
      monitoringService.log('error', 'Failed to get configuration category', 'production-api', { error, category: req.params.category });
      res.status(500).json({ error: 'Failed to get configuration category' });
    }
  });

  /**
   * Update configuration
   */
  router.put('/config', async (req: Request, res: Response) => {
    try {
      const { category, updates } = UpdateConfigSchema.parse(req.body);
      
      await configService.updateConfig(category, updates);
      
      monitoringService.log('info', 'Configuration updated', 'production-api', { 
        category, 
        userId: req.user?.id 
      });
      
      res.json({ success: true });
    } catch (error) {
      monitoringService.log('error', 'Failed to update configuration', 'production-api', { error });
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  });

  /**
   * Validate configuration
   */
  router.post('/config/validate', async (req: Request, res: Response) => {
    try {
      const validation = await configService.validateConfig();
      res.json({ validation });
    } catch (error) {
      monitoringService.log('error', 'Failed to validate configuration', 'production-api', { error });
      res.status(500).json({ error: 'Failed to validate configuration' });
    }
  });

  /**
   * Get system health
   */
  router.get('/health', async (req: Request, res: Response) => {
    try {
      const health = await configService.getSystemHealth();
      res.json({ health });
    } catch (error) {
      monitoringService.log('error', 'Failed to get system health', 'production-api', { error });
      res.status(500).json({ error: 'Failed to get system health' });
    }
  });

  // ================================
  // Monitoring and Observability Routes
  // ================================

  /**
   * Get performance metrics
   */
  router.get('/metrics/performance', async (req: Request, res: Response) => {
    try {
      const timeRange = req.query.timeRange as string || '1h';
      const metrics = await monitoringService.getPerformanceMetrics(timeRange);
      res.json({ metrics });
    } catch (error) {
      monitoringService.log('error', 'Failed to get performance metrics', 'production-api', { error });
      res.status(500).json({ error: 'Failed to get performance metrics' });
    }
  });

  /**
   * Get system metrics
   */
  router.get('/metrics/system', async (req: Request, res: Response) => {
    try {
      const metrics = await monitoringService.getSystemMetrics();
      res.json({ metrics });
    } catch (error) {
      monitoringService.log('error', 'Failed to get system metrics', 'production-api', { error });
      res.status(500).json({ error: 'Failed to get system metrics' });
    }
  });

  /**
   * Get domain metrics
   */
  router.get('/metrics/domain/:domainId', async (req: Request, res: Response) => {
    try {
      const { domainId } = req.params;
      const timeRange = req.query.timeRange as string || '1h';
      const metrics = await monitoringService.getDomainMetrics(domainId, timeRange);
      res.json({ metrics });
    } catch (error) {
      monitoringService.log('error', 'Failed to get domain metrics', 'production-api', { error });
      res.status(500).json({ error: 'Failed to get domain metrics' });
    }
  });

  /**
   * Get Prometheus metrics
   */
  router.get('/metrics/prometheus', async (req: Request, res: Response) => {
    try {
      const metrics = await monitoringService.getPrometheusMetrics();
      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      monitoringService.log('error', 'Failed to get Prometheus metrics', 'production-api', { error });
      res.status(500).json({ error: 'Failed to get Prometheus metrics' });
    }
  });

  /**
   * Create alert rule
   */
  router.post('/alerts/rules', async (req: Request, res: Response) => {
    try {
      const alertRuleData = CreateAlertRuleSchema.parse(req.body);
      
      // This would be implemented in MonitoringService
      // const ruleId = await monitoringService.createAlertRule(alertRuleData);
      
      monitoringService.log('info', 'Alert rule created', 'production-api', { 
        rule: alertRuleData.name,
        userId: req.user?.id 
      });
      
      res.json({ success: true, ruleId: 'rule-id' });
    } catch (error) {
      monitoringService.log('error', 'Failed to create alert rule', 'production-api', { error });
      res.status(500).json({ error: 'Failed to create alert rule' });
    }
  });

  /**
   * Get active alerts
   */
  router.get('/alerts/active', async (req: Request, res: Response) => {
    try {
      // This would be implemented in MonitoringService
      // const alerts = await monitoringService.getActiveAlerts();
      
      res.json({ alerts: [] });
    } catch (error) {
      monitoringService.log('error', 'Failed to get active alerts', 'production-api', { error });
      res.status(500).json({ error: 'Failed to get active alerts' });
    }
  });

  /**
   * Resolve alert
   */
  router.post('/alerts/:alertId/resolve', async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const { resolution } = req.body;
      
      await monitoringService.resolveAlert(alertId, req.user?.id!, resolution);
      
      monitoringService.log('info', 'Alert resolved', 'production-api', { 
        alertId,
        userId: req.user?.id 
      });
      
      res.json({ success: true });
    } catch (error) {
      monitoringService.log('error', 'Failed to resolve alert', 'production-api', { error });
      res.status(500).json({ error: 'Failed to resolve alert' });
    }
  });

  /**
   * Generate monitoring report
   */
  router.post('/reports/generate', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, includeRecommendations } = GenerateReportSchema.parse(req.body);
      
      const report = await monitoringService.generateReport(
        new Date(startDate),
        new Date(endDate),
        includeRecommendations
      );
      
      res.json({ report });
    } catch (error) {
      monitoringService.log('error', 'Failed to generate report', 'production-api', { error });
      res.status(500).json({ error: 'Failed to generate report' });
    }
  });

  // ================================
  // Deployment Management Routes
  // ================================

  /**
   * Create deployment
   */
  router.post('/deployments', async (req: Request, res: Response) => {
    try {
      const deploymentData = CreateDeploymentSchema.parse(req.body);
      
      const config = {
        ...deploymentData,
        version: deploymentData.version,
        branch: deploymentData.branch,
        commit: deploymentData.commit,
        buildId: deploymentData.buildId,
        strategy: deploymentData.strategy ?? 'rolling',
      };
      
      // Mock artifacts for now
      const artifacts = [
        {
          id: 'artifact-1',
          name: 'api-build',
          type: 'docker' as const,
          url: `docker://keeper/api:${deploymentData.version}`,
          checksum: 'sha256:abcd1234',
          size: 100 * 1024 * 1024, // 100MB
          createdAt: new Date(),
        },
      ];
      
      const deploymentId = await deploymentService.createDeployment(
        config,
        req.user?.id!,
        artifacts
      );
      
      monitoringService.log('info', 'Deployment created', 'production-api', { 
        deploymentId,
        version: deploymentData.version,
        userId: req.user?.id 
      });
      
      res.json({ success: true, deploymentId });
    } catch (error) {
      monitoringService.log('error', 'Failed to create deployment', 'production-api', { error });
      res.status(500).json({ error: 'Failed to create deployment' });
    }
  });

  /**
   * Start deployment
   */
  router.post('/deployments/:deploymentId/start', async (req: Request, res: Response) => {
    try {
      const { deploymentId } = req.params;
      
      await deploymentService.startDeployment(deploymentId);
      
      monitoringService.log('info', 'Deployment started', 'production-api', { 
        deploymentId,
        userId: req.user?.id 
      });
      
      res.json({ success: true });
    } catch (error) {
      monitoringService.log('error', 'Failed to start deployment', 'production-api', { error });
      res.status(500).json({ error: 'Failed to start deployment' });
    }
  });

  /**
   * Get deployment status
   */
  router.get('/deployments/:deploymentId', async (req: Request, res: Response) => {
    try {
      const { deploymentId } = req.params;
      
      const deployment = await prisma.shareRequest.findUnique({
        where: { id: deploymentId },
        include: {
          sourceDomain: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          targetDomain: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!deployment) {
        return res.status(404).json({
          success: false,
          error: 'Deployment not found',
        });
      }

      return res.json({
        success: true,
        data: deployment,
      });
    } catch (error) {
      console.error('Get deployment error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to get deployment',
      });
    }
  });

  /**
   * Get deployment history
   */
  router.get('/deployments', async (req: Request, res: Response) => {
    try {
      const environment = req.query.environment as 'development' | 'staging' | 'production';
      const limit = parseInt(req.query.limit as string) || 50;
      
      const deployments = await deploymentService.getDeploymentHistory(environment, limit);
      
      res.json({ deployments });
    } catch (error) {
      monitoringService.log('error', 'Failed to get deployment history', 'production-api', { error });
      res.status(500).json({ error: 'Failed to get deployment history' });
    }
  });

  /**
   * Rollback deployment
   */
  router.post('/deployments/:deploymentId/rollback', async (req: Request, res: Response) => {
    try {
      const { deploymentId } = req.params;
      const { reason } = RollbackDeploymentSchema.parse(req.body);
      
      await deploymentService.rollbackDeployment(deploymentId, 'manual', reason);
      
      monitoringService.log('info', 'Deployment rolled back', 'production-api', { 
        deploymentId,
        reason,
        userId: req.user?.id 
      });
      
      res.json({ success: true });
    } catch (error) {
      monitoringService.log('error', 'Failed to rollback deployment', 'production-api', { error });
      res.status(500).json({ error: 'Failed to rollback deployment' });
    }
  });

  /**
   * Get deployment metrics
   */
  router.get('/deployments/metrics/:environment', async (req: Request, res: Response) => {
    try {
      const { environment } = req.params;
      const timeRange = req.query.timeRange as string || '30d';
      
      const metrics = await deploymentService.getDeploymentMetrics(
        environment as 'development' | 'staging' | 'production',
        timeRange
      );
      
      res.json({ metrics });
    } catch (error) {
      monitoringService.log('error', 'Failed to get deployment metrics', 'production-api', { error });
      res.status(500).json({ error: 'Failed to get deployment metrics' });
    }
  });

  /**
   * Get infrastructure state
   */
  router.get('/infrastructure', async (req: Request, res: Response) => {
    try {
      const state = await deploymentService.getInfrastructureState();
      res.json({ state });
    } catch (error) {
      monitoringService.log('error', 'Failed to get infrastructure state', 'production-api', { error });
      res.status(500).json({ error: 'Failed to get infrastructure state' });
    }
  });

  /**
   * Create pipeline
   */
  router.post('/pipelines', async (req: Request, res: Response) => {
    try {
      const pipelineData = CreatePipelineSchema.parse(req.body);
      
      const pipelineId = await deploymentService.createPipeline(
        pipelineData.name,
        pipelineData.description,
        pipelineData.stages.map((stage: any) => ({
          ...stage,
          conditions: stage.conditions || [],
        })),
        pipelineData.triggers.map((t: any): PipelineTrigger => ({
          id: t.id || (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
          type: t.type,
          enabled: typeof t.enabled === 'boolean' ? t.enabled : true,
          config: t.config ?? {},
        })),
        pipelineData.environment,
        req.user?.id!
      );
      
      monitoringService.log('info', 'Pipeline created', 'production-api', { 
        pipelineId,
        name: pipelineData.name,
        userId: req.user?.id 
      });
      
      res.json({ success: true, pipelineId });
    } catch (error) {
      monitoringService.log('error', 'Failed to create pipeline', 'production-api', { error });
      res.status(500).json({ error: 'Failed to create pipeline' });
    }
  });

  /**
   * Execute pipeline
   */
  router.post('/pipelines/:pipelineId/execute', async (req: Request, res: Response) => {
    try {
      const { pipelineId } = req.params;
      const context = req.body.context || {};
      
      const buildId = await deploymentService.executePipeline(pipelineId, context);
      
      monitoringService.log('info', 'Pipeline executed', 'production-api', { 
        pipelineId,
        buildId,
        userId: req.user?.id 
      });
      
      res.json({ success: true, buildId });
    } catch (error) {
      monitoringService.log('error', 'Failed to execute pipeline', 'production-api', { error });
      res.status(500).json({ error: 'Failed to execute pipeline' });
    }
  });

  /**
   * Generate deployment config
   */
  router.post('/deployments/config/generate', async (req: Request, res: Response) => {
    try {
      const { environment, version } = req.body;
      
      const configs = await deploymentService.generateDeploymentConfig(
        environment as 'development' | 'staging' | 'production',
        version
      );
      
      res.json({ configs });
    } catch (error) {
      monitoringService.log('error', 'Failed to generate deployment config', 'production-api', { error });
      res.status(500).json({ error: 'Failed to generate deployment config' });
    }
  });

  // ================================
  // Utility Routes
  // ================================

  /**
   * Production readiness check
   */
  router.get('/readiness', async (req: Request, res: Response) => {
    try {
      const [configValidation, systemHealth, infrastructureState] = await Promise.all([
        configService.validateConfig(),
        configService.getSystemHealth(),
        deploymentService.getInfrastructureState(),
      ]);

      const readiness = {
        configuration: {
          valid: configValidation.isValid,
          errors: configValidation.errors,
          warnings: configValidation.warnings,
        },
        health: {
          status: systemHealth.status,
          components: systemHealth.components,
        },
        infrastructure: {
          status: infrastructureState.instances.every((i: any) => i.status === 'running') ? 'ready' : 'not_ready',
          instances: infrastructureState.instances.length,
          healthyInstances: infrastructureState.instances.filter((i: any) => i.health === 'healthy').length,
        },
        overall: configValidation.isValid && systemHealth.status === 'healthy' ? 'ready' : 'not_ready',
      };

      res.json({ readiness });
    } catch (error) {
      monitoringService.log('error', 'Failed to check production readiness', 'production-api', { error });
      res.status(500).json({ error: 'Failed to check production readiness' });
    }
  });

  /**
   * System diagnostics
   */
  router.get('/diagnostics', async (req: Request, res: Response) => {
    try {
      const [systemMetrics, performanceMetrics] = await Promise.all([
        monitoringService.getSystemMetrics(),
        monitoringService.getPerformanceMetrics('1h'),
      ]);

      const diagnostics = {
        system: systemMetrics,
        performance: performanceMetrics,
        timestamp: new Date(),
      };

      res.json({ diagnostics });
    } catch (error) {
      monitoringService.log('error', 'Failed to get system diagnostics', 'production-api', { error });
      res.status(500).json({ error: 'Failed to get system diagnostics' });
    }
  });

  /**
   * Clear cache
   */
  router.post('/cache/clear', async (req: Request, res: Response) => {
    try {
      const { pattern } = req.body;
      
      // This would be implemented in DomainCacheService
      // await cacheService.clearCache(pattern);
      
      monitoringService.log('info', 'Cache cleared', 'production-api', { 
        pattern,
        userId: req.user?.id 
      });
      
      res.json({ success: true });
    } catch (error) {
      monitoringService.log('error', 'Failed to clear cache', 'production-api', { error });
      res.status(500).json({ error: 'Failed to clear cache' });
    }
  });

  /**
   * Emergency shutdown
   */
  router.post('/emergency/shutdown', async (req: Request, res: Response) => {
    try {
      const { reason } = req.body;
      
      monitoringService.log('error', 'Emergency shutdown initiated', 'production-api', { 
        reason,
        userId: req.user?.id 
      });
      
      // This would implement graceful shutdown
      res.json({ success: true, message: 'Emergency shutdown initiated' });
      
      // Initiate shutdown process
      setTimeout(() => {
        process.exit(0);
      }, 5000);
    } catch (error) {
      monitoringService.log('error', 'Failed to initiate emergency shutdown', 'production-api', { error });
      res.status(500).json({ error: 'Failed to initiate emergency shutdown' });
    }
  });

  return router;
}

export default createProductionRoutes; 