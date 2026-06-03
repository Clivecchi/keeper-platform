import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const prismaMock = vi.hoisted(() => ({
  integration: {
    findFirst: vi.fn(),
    create: vi.fn(),
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

vi.mock('../middleware/authMiddleware.js', () => ({
  authMiddlewareCompat: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    (_req as express.Request & { user?: { id: string } }).user = { id: 'user_test' };
    next();
  },
}));

import integrationRoutes from '../routes/integration-routes.js';

describe('POST /api/integrations/oauth-callback @smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.integration.findFirst.mockResolvedValue({
      id: 'int_existing',
      service: 'github',
      integration_type: 'Services',
      status: 'disconnected',
      tier: 'platform',
      domainId: null,
      userId: null,
      nangoConnectionId: null,
      scopes: [],
      metadata: null,
      connectedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prismaMock.integration.update.mockResolvedValue({});
  });

  function app() {
    const expressApp = express();
    expressApp.use(express.json());
    expressApp.use('/api/integrations', integrationRoutes);
    return expressApp;
  }

  it('marks Integration connected after popup OAuth', async () => {
    const res = await request(app())
      .post('/api/integrations/oauth-callback')
      .send({
        service: 'github',
        connectionId: 'conn_popup_1',
        providerConfigKey: 'github',
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(prismaMock.integration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'connected',
          nangoConnectionId: 'conn_popup_1',
        }),
      }),
    );
  });
});
