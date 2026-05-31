import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const prismaMock = vi.hoisted(() => ({
  integration: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  },
}));

vi.mock('@keeper/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@keeper/database')>();
  return {
    ...actual,
    prisma: prismaMock,
  };
});

import integrationRoutes from '../routes/integration-routes.js';

describe('integration webhook @smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.integration.findFirst.mockResolvedValue(null);
    prismaMock.integration.create.mockResolvedValue({
      id: 'int_test',
      service: 'railway',
      nangoConnectionId: 'conn_test',
      status: 'connected',
      tier: 'platform',
      scopes: [],
      domainId: null,
      userId: null,
      metadata: null,
      connectedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('POST /webhook returns 200 for auth creation payload', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/integrations', integrationRoutes);

    const res = await request(app)
      .post('/api/integrations/webhook')
      .send({
        type: 'auth',
        operation: 'creation',
        success: true,
        connectionId: 'conn_test',
        providerConfigKey: 'railway',
        tags: { end_user_id: 'platform', organization_id: 'platform' },
      });

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);
    expect(prismaMock.integration.create).toHaveBeenCalled();
  });

  it('POST /webhook returns 200 and ignores non-auth events', async () => {
    const app = express();
    app.use(express.json());
    app.use('/api/integrations', integrationRoutes);

    const res = await request(app)
      .post('/api/integrations/webhook')
      .send({ type: 'sync', success: true });

    expect(res.status).toBe(200);
    expect(res.body.ignored).toBe(true);
  });
});
