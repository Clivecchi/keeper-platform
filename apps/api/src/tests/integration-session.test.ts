import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const prismaMock = vi.hoisted(() => ({
  integration: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const nangoMock = vi.hoisted(() => ({
  isNangoConfigured: vi.fn(),
  createKeeperConnectSession: vi.fn(),
  getNango: vi.fn(),
}));

vi.mock('@keeper/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@keeper/database')>();
  return {
    ...actual,
    prisma: prismaMock,
  };
});

vi.mock('../lib/nango.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/nango.js')>();
  return {
    ...actual,
    isNangoConfigured: nangoMock.isNangoConfigured,
    createKeeperConnectSession: nangoMock.createKeeperConnectSession,
    getNango: nangoMock.getNango,
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

describe('POST /api/integrations/session @smoke', () => {
  const env = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...env };
    prismaMock.integration.findFirst.mockResolvedValue(null);
    prismaMock.integration.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      id: 'int_new',
      ...data,
      scopes: [],
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    nangoMock.isNangoConfigured.mockReturnValue(true);
    nangoMock.createKeeperConnectSession.mockResolvedValue({ data: { token: 'nango_sess_token' } });
    nangoMock.getNango.mockReturnValue({});
  });

  afterEach(() => {
    process.env = env;
    vi.unstubAllGlobals();
  });

  function app() {
    const expressApp = express();
    expressApp.use(express.json());
    expressApp.use('/api/integrations', integrationRoutes);
    return expressApp;
  }

  it('railway (Custom) returns connected without sessionToken and does not call Nango', async () => {
    process.env.RAILWAY_TOKEN = 'test-railway-token';
    process.env.RAILWAY_PROJECT_ID = 'proj_test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({ data: { project: { id: 'proj_test' } } }),
      }),
    );

    const res = await request(app())
      .post('/api/integrations/session')
      .send({ service: 'railway', domainId: 'domain-1' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ connected: true, service: 'railway' });
    expect(res.body.sessionToken).toBeUndefined();
    expect(nangoMock.createKeeperConnectSession).not.toHaveBeenCalled();
    expect(prismaMock.integration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          service: 'railway',
          integration_type: 'Custom',
          status: 'connected',
        }),
      }),
    );
  });

  it('railway (Custom) returns 503 when RAILWAY_TOKEN is missing', async () => {
    delete process.env.RAILWAY_TOKEN;
    process.env.RAILWAY_PROJECT_ID = 'proj_test';

    const res = await request(app())
      .post('/api/integrations/session')
      .send({ service: 'railway' });

    expect(res.status).toBe(503);
    expect(res.body.message).toContain('RAILWAY_TOKEN');
    expect(nangoMock.createKeeperConnectSession).not.toHaveBeenCalled();
  });

  it('vercel (Services) returns Nango sessionToken', async () => {
    const res = await request(app())
      .post('/api/integrations/session')
      .send({ service: 'vercel' });

    expect(res.status).toBe(200);
    expect(res.body.sessionToken).toBe('nango_sess_token');
    expect(res.body.connected).toBeUndefined();
    expect(nangoMock.createKeeperConnectSession).toHaveBeenCalled();
    expect(prismaMock.integration.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          service: 'vercel',
          integration_type: 'Services',
          status: 'disconnected',
        }),
      }),
    );
  });

  it('github (Services) returns Nango sessionToken', async () => {
    const res = await request(app())
      .post('/api/integrations/session')
      .send({ service: 'github' });

    expect(res.status).toBe(200);
    expect(res.body.sessionToken).toBe('nango_sess_token');
    expect(nangoMock.createKeeperConnectSession).toHaveBeenCalled();
  });
});
