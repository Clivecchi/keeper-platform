/**
 * Inbound service webhooks — Railway, Vercel, GitHub (C2).
 */

import { Router, type Request, type Response } from 'express';
import express from 'express';
import {
  verifyGitHubWebhookSignature,
  verifyRailwayWebhookSignature,
  verifyVercelWebhookSignature,
} from '../lib/webhookSignature.js';
import { updateIntegrationWebhookMetadata, findPlatformIntegration } from '../lib/integrationWebhookStore.js';
import {
  parseGitHubWebhookEvent,
  parseRailwayWebhookEvent,
  parseVercelWebhookEvent,
} from '../lib/webhookEventParsers.js';

const router = Router();

router.use(express.raw({ type: 'application/json', limit: '2mb' }));

function rawBody(req: Request): Buffer | null {
  if (Buffer.isBuffer(req.body)) return req.body;
  return null;
}

function parseJsonBody(raw: Buffer): unknown {
  return JSON.parse(raw.toString('utf8'));
}

/**
 * POST /api/webhooks/railway
 */
router.post('/railway', async (req: Request, res: Response) => {
  const raw = rawBody(req);
  if (!raw) {
    return res.status(400).json({ error: 'Expected raw JSON body' });
  }

  const verification = verifyRailwayWebhookSignature(
    raw,
    typeof req.headers['x-railway-signature'] === 'string'
      ? req.headers['x-railway-signature']
      : undefined,
    process.env.RAILWAY_WEBHOOK_SECRET,
  );
  if (verification.ok === false) {
    return res.status(verification.status).json({ error: verification.error });
  }

  let payload: unknown;
  try {
    payload = parseJsonBody(raw);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const parsed = parseRailwayWebhookEvent(payload);
  if (!parsed) {
    return res.status(400).json({ error: 'Unrecognized Railway webhook payload' });
  }

  const result = await updateIntegrationWebhookMetadata({
    service: 'railway',
    healthPatch: parsed.healthPatch,
    lastDeploymentEvent: parsed.summary,
  });

  return res.status(200).json({
    received: true,
    provider: 'railway',
    processed: result.updated,
    eventType: parsed.summary.eventType,
  });
});

/**
 * POST /api/webhooks/vercel
 */
router.post('/vercel', async (req: Request, res: Response) => {
  const raw = rawBody(req);
  if (!raw) {
    return res.status(400).json({ error: 'Expected raw JSON body' });
  }

  const verification = verifyVercelWebhookSignature(
    raw,
    typeof req.headers['x-vercel-signature'] === 'string'
      ? req.headers['x-vercel-signature']
      : undefined,
    process.env.VERCEL_WEBHOOK_SECRET,
  );
  if (verification.ok === false) {
    return res.status(verification.status).json({ error: verification.error });
  }

  let payload: unknown;
  try {
    payload = parseJsonBody(raw);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const parsed = parseVercelWebhookEvent(payload);
  if (!parsed) {
    return res.status(400).json({ error: 'Unrecognized Vercel webhook payload' });
  }

  const result = await updateIntegrationWebhookMetadata({
    service: 'vercel',
    healthPatch: parsed.healthPatch,
    lastDeploymentEvent: parsed.summary,
  });

  return res.status(200).json({
    received: true,
    provider: 'vercel',
    processed: result.updated,
    eventType: parsed.summary.eventType,
  });
});

/**
 * POST /api/webhooks/github
 */
router.post('/github', async (req: Request, res: Response) => {
  const raw = rawBody(req);
  if (!raw) {
    return res.status(400).json({ error: 'Expected raw JSON body' });
  }

  const verification = verifyGitHubWebhookSignature(
    raw,
    typeof req.headers['x-hub-signature-256'] === 'string'
      ? req.headers['x-hub-signature-256']
      : undefined,
    process.env.GITHUB_WEBHOOK_SECRET,
  );
  if (verification.ok === false) {
    return res.status(verification.status).json({ error: verification.error });
  }

  const eventName =
    typeof req.headers['x-github-event'] === 'string' ? req.headers['x-github-event'] : '';
  if (!eventName) {
    return res.status(400).json({ error: 'Missing x-github-event header' });
  }

  let payload: unknown;
  try {
    payload = parseJsonBody(raw);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const integration = await findPlatformIntegration('github');
  const parsed = parseGitHubWebhookEvent(eventName, payload, integration?.metadata);
  if (!parsed) {
    return res.status(400).json({ error: 'Unrecognized GitHub webhook payload' });
  }

  const result = await updateIntegrationWebhookMetadata({
    service: 'github',
    healthPatch: parsed.healthPatch,
    repositoryActivity: parsed.activity,
  });

  return res.status(200).json({
    received: true,
    provider: 'github',
    processed: result.updated,
    event: eventName,
  });
});

export default router;
