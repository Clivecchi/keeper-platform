/**
 * Webhook route smoke tests — Step 3B
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import webhookRoutes from '../routes/webhook-routes.js';

describe('webhook routes @smoke', () => {
  let app: express.Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/webhooks', webhookRoutes);
  });

  it('POST /api/webhooks/railway returns 200', async () => {
    const res = await request(app)
      .post('/api/webhooks/railway')
      .send({ type: 'deployment.succeeded', deploymentId: 'dep_test' });
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.provider).toBe('railway');
  });

  it('POST /api/webhooks/vercel returns 200', async () => {
    const res = await request(app)
      .post('/api/webhooks/vercel')
      .send({ type: 'deployment.succeeded', id: 'dpl_test' });
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.provider).toBe('vercel');
  });

  it('POST /api/webhooks/github returns 200', async () => {
    const res = await request(app)
      .post('/api/webhooks/github')
      .set('x-github-event', 'push')
      .send({ ref: 'refs/heads/main' });
    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(res.body.provider).toBe('github');
  });
});
