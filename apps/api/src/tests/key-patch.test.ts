import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const prismaMock = vi.hoisted(() => ({
  key: {
    findUnique: vi.fn(),
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

import keyRoutes from '../routes/key-entity-routes.js';

const baseKeyRow = {
  id: 'key_anthropic',
  provider: 'anthropic',
  key_source: 'user',
  status: 'valid',
  scope: 'Claude chat completions and agent reasoning',
  last_verified: new Date(),
  expires_at: null,
  domain_id: 'domain_default',
  user_id: 'user_test',
  integration_id: 'int_anthropic',
  chronicle_blocks: ['connection_status', 'key_health', 'linked_agents'],
  chronicle_actions: ['verify', 'rotate', 'revoke'],
  display_label: 'Anthropic Key',
  description: 'Claude models — powers Kip and platform AI capabilities',
  created_at: new Date(),
  updated_at: new Date(),
};

describe('PATCH /api/keys/:id @smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.key.findUnique.mockResolvedValue(baseKeyRow);
    prismaMock.key.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        ...baseKeyRow,
        display_label:
          typeof data.display_label === 'string' ? data.display_label : baseKeyRow.display_label,
        description:
          typeof data.description === 'string' ? data.description : baseKeyRow.description,
        updated_at: new Date(),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function app() {
    const expressApp = express();
    expressApp.use(express.json());
    expressApp.use('/api/keys', keyRoutes);
    return expressApp;
  }

  it('updates display_label and description', async () => {
    const res = await request(app())
      .patch('/api/keys/key_anthropic')
      .send({ display_label: 'Anthropic Production Key', description: 'Primary Claude key' });

    expect(res.status).toBe(200);
    expect(res.body.display_label).toBe('Anthropic Production Key');
    expect(res.body.description).toBe('Primary Claude key');
    expect(prismaMock.key.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'key_anthropic' },
        data: {
          display_label: 'Anthropic Production Key',
          description: 'Primary Claude key',
        },
      }),
    );
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app()).patch('/api/keys/key_anthropic').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid request body');
  });

  it('returns 404 when key is missing', async () => {
    prismaMock.key.findUnique.mockResolvedValue(null);
    const res = await request(app())
      .patch('/api/keys/key_missing')
      .send({ display_label: 'Missing Key' });
    expect(res.status).toBe(404);
  });
});
