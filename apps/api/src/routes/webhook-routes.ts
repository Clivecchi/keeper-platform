/**
 * General webhook router — inbound service webhooks live here.
 */

import { Router, type Request, type Response } from 'express';

const router = Router();

/**
 * POST /api/webhooks/railway
 * Receives Railway deployment events.
 */
router.post('/railway', async (req: Request, res: Response) => {
  // incomplete — add Railway webhook signature verification before public launch
  // RAILWAY_WEBHOOK_SECRET env var stubbed for future use
  const secretConfigured = Boolean(process.env.RAILWAY_WEBHOOK_SECRET?.trim());
  console.log('[webhooks/railway] received', {
    secretConfigured,
    payload: req.body,
    headers: {
      'x-railway-signature': req.headers['x-railway-signature'] ?? null,
    },
  });
  // incomplete — webhook event processing is stub; full status update logic is follow-up
  console.log('[webhooks/railway] would update deployment status in platform (stub)');
  return res.status(200).json({ received: true, provider: 'railway', processed: false });
});

/**
 * POST /api/webhooks/vercel
 * Receives Vercel deployment events: deployment.created, deployment.succeeded, deployment.error
 */
router.post('/vercel', async (req: Request, res: Response) => {
  // incomplete — add Vercel webhook signature verification before public launch
  // VERCEL_WEBHOOK_SECRET env var stubbed for future use
  const secretConfigured = Boolean(process.env.VERCEL_WEBHOOK_SECRET?.trim());
  console.log('[webhooks/vercel] received', {
    secretConfigured,
    payload: req.body,
    type: (req.body as { type?: string })?.type ?? null,
  });
  // incomplete — webhook event processing is stub; full status update logic is follow-up
  console.log('[webhooks/vercel] would update deployment status in platform (stub)');
  return res.status(200).json({ received: true, provider: 'vercel', processed: false });
});

/**
 * POST /api/webhooks/github
 * Receives GitHub repository and deployment events.
 */
router.post('/github', async (req: Request, res: Response) => {
  // incomplete — add GitHub webhook signature verification before public launch
  // GITHUB_WEBHOOK_SECRET env var stubbed for future use
  const secretConfigured = Boolean(process.env.GITHUB_WEBHOOK_SECRET?.trim());
  console.log('[webhooks/github] received', {
    secretConfigured,
    payload: req.body,
    event: req.headers['x-github-event'] ?? null,
    delivery: req.headers['x-github-delivery'] ?? null,
  });
  // incomplete — webhook event processing is stub; full status update logic is follow-up
  console.log('[webhooks/github] would update deployment status in platform (stub)');
  return res.status(200).json({ received: true, provider: 'github', processed: false });
});

export default router;
