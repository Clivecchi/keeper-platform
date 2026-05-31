/**
 * Vercel deployment REST routes — capability-gated.
 * Domain operations remain on custom-domain-routes via VercelDomainManagerService.
 */

import { Router, type Request, type Response } from 'express';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { INFRA_CAPABILITIES } from '../capabilities/infraCapabilities.js';
import { VercelDeploymentService } from '../services/VercelDeploymentService.js';

const router = Router();

router.use(authMiddlewareCompat);

function getService(): VercelDeploymentService {
  return VercelDeploymentService.create();
}

router.get(
  '/deployments',
  requireCapability(INFRA_CAPABILITIES.VERCEL_READ),
  async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const deployments = await getService().getDeployments(limit);
      return res.json({ success: true, data: deployments });
    } catch (err) {
      console.error('[vercel/deployments]', err);
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to list Vercel deployments',
      });
    }
  },
);

router.get(
  '/deployments/:id',
  requireCapability(INFRA_CAPABILITIES.VERCEL_READ),
  async (req: Request, res: Response) => {
    try {
      const deployment = await getService().getDeploymentStatus(req.params.id);
      return res.json({ success: true, data: deployment });
    } catch (err) {
      console.error('[vercel/deployments/:id]', err);
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to get Vercel deployment status',
      });
    }
  },
);

router.get(
  '/deployments/:id/logs',
  requireCapability(INFRA_CAPABILITIES.VERCEL_READ),
  async (req: Request, res: Response) => {
    try {
      const logs = await getService().getDeploymentLogs(req.params.id);
      return res.json({ success: true, data: logs });
    } catch (err) {
      console.error('[vercel/deployments/:id/logs]', err);
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to get Vercel deployment logs',
      });
    }
  },
);

router.post(
  '/redeploy/:id',
  requireCapability(INFRA_CAPABILITIES.VERCEL_DEPLOY),
  async (req: Request, res: Response) => {
    try {
      const result = await getService().triggerRedeploy(req.params.id);
      return res.json({ success: true, data: result });
    } catch (err) {
      console.error('[vercel/redeploy/:id]', err);
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to trigger Vercel redeploy',
      });
    }
  },
);

router.get(
  '/project',
  requireCapability(INFRA_CAPABILITIES.VERCEL_READ),
  async (_req: Request, res: Response) => {
    try {
      const project = await getService().getProjectInfo();
      return res.json({ success: true, data: project });
    } catch (err) {
      console.error('[vercel/project]', err);
      return res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to get Vercel project info',
      });
    }
  },
);

export default router;
