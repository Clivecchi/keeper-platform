import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { prisma } from '@keeper/database';

vi.mock('../../middleware/authMiddleware.js', () => ({
  authMiddlewareCompat: (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    (req as express.Request & { user?: { id: string; email: string } }).user = {
      id: '491307f3-b331-436c-b53a-09a11ec110cb',
      email: 'clivecchi@gmail.com',
    };
    next();
  },
}));

import modelsRouter from './models.js';
import integrationRoutes from '../../routes/integration-routes.js';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb('B3 connected gateway @integration', () => {
  const service = 'together-ai';
  const sampleItems = [
    {
      id: 'b3-test-model-live',
      label: 'B3 Test Model',
      type: 'chat',
      metadata: { source: 'b3-test' },
    },
  ];

  function modelsApp() {
    const app = express();
    app.use(express.json());
    app.use((req, _res, next) => {
      (req as express.Request & { user?: { id: string } }).user = {
        id: '491307f3-b331-436c-b53a-09a11ec110cb',
      };
      next();
    });
    app.use('/api/kip/models', modelsRouter);
    return app;
  }

  function integrationsApp() {
    const app = express();
    app.use(express.json());
    app.use('/api/integrations', integrationRoutes);
    return app;
  }

  beforeAll(async () => {
    process.env.TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || 'test-key-fallback-refresh';

    const fetchedAt = new Date().toISOString();
    const metadata = {
      catalog: { items: sampleItems, fetchedAt, source: 'live' as const },
      health: { api: 'connected' as const, lastChecked: fetchedAt },
    };

    const existing = await prisma.integration.findFirst({
      where: { service, tier: 'platform', domainId: null, userId: null },
    });

    if (existing) {
      await prisma.integration.update({
        where: { id: existing.id },
        data: {
          integration_type: 'AI_Model',
          status: 'connected',
          connectedAt: new Date(),
          metadata,
        },
      });
    } else {
      await prisma.integration.create({
        data: {
          service,
          integration_type: 'AI_Model',
          tier: 'platform',
          domainId: null,
          userId: null,
          scopes: [],
          status: 'connected',
          connectedAt: new Date(),
          metadata,
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/kip/models returns cached Integration catalog with source live', async () => {
    const res = await request(modelsApp())
      .get('/api/kip/models')
      .query({ provider: 'together-ai' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const models = res.body.data?.models as Array<{ id: string; source?: string }>;
    expect(models.some((m) => m.id === 'b3-test-model-live' && m.source === 'live')).toBe(true);
  });

  it('POST /api/integrations/:service/catalog/refresh returns fetchedAt and itemCount', async () => {
    const res = await request(integrationsApp())
      .post(`/api/integrations/${service}/catalog/refresh`);

    expect(res.status).toBe(200);
    expect(typeof res.body.fetchedAt).toBe('string');
    expect(typeof res.body.itemCount).toBe('number');
    expect(res.body.itemCount).toBeGreaterThan(0);
  });
});
