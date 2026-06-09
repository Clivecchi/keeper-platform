/**
 * Railway infrastructure REST routes — capability-gated.
 */

import { Router, type Request, type Response } from 'express';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { INFRA_CAPABILITIES } from '../capabilities/infraCapabilities.js';
import { RailwayService } from '../services/RailwayService.js';
import {
  findPlatformIntegration,
  readLastDeploymentEvent,
  webhookEventToRailwayDeployment,
  prependWebhookDeployment,
} from '../lib/integrationWebhookStore.js';

const router = Router();

router.use(authMiddlewareCompat);

router.get(
  '/services',
  requireCapability(INFRA_CAPABILITIES.RAILWAY_READ),
  async (_req: Request, res: Response) => {
    try {
      const services = await RailwayService.getServices();
      return res.json({ success: true, data: services });
    } catch (err) {
      console.error('[railway/services]', err);
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to list Railway services',
      });
    }
  },
);

router.get(
  '/deployments',
  requireCapability(INFRA_CAPABILITIES.RAILWAY_READ),
  async (req: Request, res: Response) => {
    try {
      const serviceId = typeof req.query.serviceId === 'string' ? req.query.serviceId : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const deployments = await RailwayService.getDeployments(serviceId, limit);
      const integration = await findPlatformIntegration('railway');
      const webhookEvent = readLastDeploymentEvent(integration?.metadata);
      const webhookRow = webhookEvent ? webhookEventToRailwayDeployment(webhookEvent) : null;
      const merged = prependWebhookDeployment(deployments, webhookRow, limit);
      return res.json({ success: true, data: merged });
    } catch (err) {
      console.error('[railway/deployments]', err);
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to list Railway deployments',
      });
    }
  },
);

router.get(
  '/deployments/:id',
  requireCapability(INFRA_CAPABILITIES.RAILWAY_READ),
  async (req: Request, res: Response) => {
    try {
      const deployment = await RailwayService.getDeploymentStatus(req.params.id);
      return res.json({ success: true, data: deployment });
    } catch (err) {
      console.error('[railway/deployments/:id]', err);
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to get Railway deployment status',
      });
    }
  },
);

router.get(
  '/logs/:serviceId',
  requireCapability(INFRA_CAPABILITIES.RAILWAY_READ),
  async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      const logs = await RailwayService.getLogs(req.params.serviceId, limit);
      return res.json({ success: true, data: logs });
    } catch (err) {
      console.error('[railway/logs/:serviceId]', err);
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to get Railway logs',
      });
    }
  },
);

router.post(
  '/redeploy/:serviceId',
  requireCapability(INFRA_CAPABILITIES.RAILWAY_DEPLOY),
  async (req: Request, res: Response) => {
    try {
      const result = await RailwayService.triggerRedeploy(req.params.serviceId);
      return res.json({ success: true, data: result });
    } catch (err) {
      console.error('[railway/redeploy/:serviceId]', err);
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to trigger Railway redeploy',
      });
    }
  },
);

router.get(
  '/env/:serviceId',
  requireCapability(INFRA_CAPABILITIES.RAILWAY_READ),
  async (req: Request, res: Response) => {
    try {
      const vars = await RailwayService.getEnvironmentVariables(req.params.serviceId);
      return res.json({ success: true, data: vars });
    } catch (err) {
      console.error('[railway/env/:serviceId]', err);
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to list Railway env var names',
      });
    }
  },
);

export default router;
