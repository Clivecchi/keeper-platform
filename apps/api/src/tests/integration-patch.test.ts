import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

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

describe('PATCH /api/integrations/:service @smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.integration.findFirst.mockResolvedValue({
      id: 'int_railway',
      service: 'railway',
      integration_type: 'Custom',
      nangoConnectionId: null,
      status: 'connected',
      tier: 'platform',
      scopes: [],
      domainId: null,
      userId: null,
      metadata: null,
      connectedAt: new Date().toISOString(),
      chronicle_blocks: ['connection_status', 'deployment_feed'],
      chronicle_actions: ['view_logs', 'redeploy', 'disconnect'],
      is_gateway: false,
      display_label: 'Railway',
      description: 'Infrastructure hosting — services, deployments, and logs',
      connect_copy: 'Connect Railway to monitor deployments and manage services from Chronicle',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prismaMock.integration.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'int_railway',
        service: 'railway',
        integration_type: 'Custom',
        nangoConnectionId: null,
        status: 'connected',
        tier: 'platform',
        scopes: [],
        domainId: null,
        userId: null,
        metadata: null,
        connectedAt: new Date(),
        chronicle_blocks: ['connection_status', 'deployment_feed'],
        chronicle_actions: ['view_logs', 'redeploy', 'disconnect'],
        is_gateway: false,
        display_label: data.display_label ?? 'Railway',
        description: data.description ?? 'Infrastructure hosting — services, deployments, and logs',
        connect_copy:
          data.connect_copy ??
          'Connect Railway to monitor deployments and manage services from Chronicle',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function app() {
    const expressApp = express();
    expressApp.use(express.json());
    expressApp.use('/api/integrations', integrationRoutes);
    return expressApp;
  }

  it('updates display_label and description', async () => {
    const res = await request(app())
      .patch('/api/integrations/railway')
      .send({ display_label: 'Railway Ops', description: 'Ops hosting surface' });

    expect(res.status).toBe(200);
    expect(res.body.display_label).toBe('Railway Ops');
    expect(res.body.description).toBe('Ops hosting surface');
    expect(prismaMock.integration.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'int_railway' },
        data: { display_label: 'Railway Ops', description: 'Ops hosting surface' },
      }),
    );
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app()).patch('/api/integrations/railway').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request body');
  });

  it('returns 404 when integration row is missing', async () => {
    prismaMock.integration.findFirst.mockResolvedValue(null);
    const res = await request(app())
      .patch('/api/integrations/railway')
      .send({ display_label: 'Railway Ops' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for unknown service slug', async () => {
    const res = await request(app())
      .patch('/api/integrations/unknown-service')
      .send({ display_label: 'Unknown' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Unknown integration service');
  });
});
