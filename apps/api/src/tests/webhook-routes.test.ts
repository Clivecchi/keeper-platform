/**
 * Webhook route tests — C2 signature verification + metadata updates
 */
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import {
  signGitHubWebhook,
  signRailwayWebhook,
  signVercelWebhook,
} from '../lib/webhookSignature.js';

const prismaMock = vi.hoisted(() => ({
  integration: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@keeper/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@keeper/database')>();
  return {
    ...actual,
    prisma: prismaMock,
  };
});

import webhookRoutes from '../routes/webhook-routes.js';

describe('webhook routes @smoke', () => {
  const env = process.env;
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use('/api/webhooks', webhookRoutes);
  });

  afterEach(() => {
    process.env = { ...env };
    vi.clearAllMocks();
    prismaMock.integration.findFirst.mockResolvedValue({
      id: 'int_test',
      service: 'railway',
      metadata: { health: { webhooks: { status: 'inactive', last_checked: '2026-01-01T00:00:00.000Z' } } },
    });
    prismaMock.integration.update.mockResolvedValue({ id: 'int_test' });
  });

  it('POST /api/webhooks/railway rejects missing signature when secret configured', async () => {
    process.env.RAILWAY_WEBHOOK_SECRET = 'railway-secret';
    const body = JSON.stringify({ type: 'Deployment.succeeded', details: { status: 'SUCCESS', id: 'dep_1' } });

    const res = await request(app)
      .post('/api/webhooks/railway')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toBe(401);
  });

  it('POST /api/webhooks/railway updates metadata on valid signature', async () => {
    process.env.RAILWAY_WEBHOOK_SECRET = 'railway-secret';
    const payload = {
      type: 'Deployment.succeeded',
      timestamp: '2026-06-08T12:00:00.000Z',
      details: {
        id: 'dep_rail_1',
        status: 'SUCCESS',
        branch: 'main',
        commitMessage: 'Deploy from webhook',
      },
      resource: {
        service: { id: 'svc_1', name: 'api' },
        deployment: { id: 'dep_rail_1' },
      },
    };
    const body = JSON.stringify(payload);
    const signature = signRailwayWebhook(Buffer.from(body), 'railway-secret');

    const res = await request(app)
      .post('/api/webhooks/railway')
      .set('Content-Type', 'application/json')
      .set('x-railway-signature', signature)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.processed).toBe(true);
    expect(prismaMock.integration.update).toHaveBeenCalled();
    const updateArg = prismaMock.integration.update.mock.calls[0]?.[0];
    const metadata = updateArg?.data?.metadata as {
      health?: { api?: { status: string }; webhooks?: { status: string } };
      last_deployment_event?: { id: string };
    };
    expect(metadata?.health?.webhooks?.status).toBe('live');
    expect(metadata?.health?.api?.status).toBe('live');
    expect(metadata?.last_deployment_event?.id).toBe('dep_rail_1');
  });

  it('POST /api/webhooks/vercel rejects invalid signature', async () => {
    process.env.VERCEL_WEBHOOK_SECRET = 'vercel-secret';
    const body = JSON.stringify({ type: 'deployment.ready', payload: { deployment: { id: 'dpl_1' } } });

    const res = await request(app)
      .post('/api/webhooks/vercel')
      .set('Content-Type', 'application/json')
      .set('x-vercel-signature', 'bad-signature')
      .send(body);

    expect(res.status).toBe(403);
  });

  it('POST /api/webhooks/vercel updates metadata on valid signature', async () => {
    process.env.VERCEL_WEBHOOK_SECRET = 'vercel-secret';
    prismaMock.integration.findFirst.mockResolvedValue({
      id: 'int_vercel',
      service: 'vercel',
      metadata: null,
    });

    const payload = {
      type: 'deployment.ready',
      payload: {
        deployment: {
          id: 'dpl_vercel_1',
          url: 'keeper-platform.vercel.app',
          readyState: 'READY',
          createdAt: 1717840800000,
        },
      },
    };
    const body = JSON.stringify(payload);
    const signature = signVercelWebhook(Buffer.from(body), 'vercel-secret');

    const res = await request(app)
      .post('/api/webhooks/vercel')
      .set('Content-Type', 'application/json')
      .set('x-vercel-signature', signature)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.processed).toBe(true);
    expect(prismaMock.integration.update).toHaveBeenCalled();
  });

  it('POST /api/webhooks/github updates repository activity on push', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'github-secret';
    prismaMock.integration.findFirst.mockResolvedValue({
      id: 'int_github',
      service: 'github',
      metadata: { repository_activity: { branchCount: 2 } },
    });

    const payload = {
      ref: 'refs/heads/main',
      head_commit: {
        message: 'feat: webhook push\n',
        timestamp: '2026-06-08T12:00:00.000Z',
        author: { name: 'Clive', username: 'clive' },
      },
    };
    const body = JSON.stringify(payload);
    const signature = signGitHubWebhook(Buffer.from(body), 'github-secret');

    const res = await request(app)
      .post('/api/webhooks/github')
      .set('Content-Type', 'application/json')
      .set('x-github-event', 'push')
      .set('x-hub-signature-256', signature)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.processed).toBe(true);
    const updateArg = prismaMock.integration.update.mock.calls[0]?.[0];
    const metadata = updateArg?.data?.metadata as {
      health?: { webhooks?: { status: string } };
      repository_activity?: { lastPush?: { message: string } };
    };
    expect(metadata?.health?.webhooks?.status).toBe('live');
    expect(metadata?.repository_activity?.lastPush?.message).toBe('feat: webhook push');
  });

  it('POST /api/webhooks/github rejects invalid signature', async () => {
    process.env.GITHUB_WEBHOOK_SECRET = 'github-secret';
    const body = JSON.stringify({ ref: 'refs/heads/main' });

    const res = await request(app)
      .post('/api/webhooks/github')
      .set('Content-Type', 'application/json')
      .set('x-github-event', 'push')
      .set('x-hub-signature-256', 'sha256=deadbeef')
      .send(body);

    expect(res.status).toBe(403);
  });
});
