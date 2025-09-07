import { describe, it, expect, beforeAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { kamAuth } from '../kam/middleware.js';

// Minimal stub auth that sets req.auth when KAM key with scopes is present
function stubKamOrUserAuth(req: any, res: any, next: any) {
  if (req.get('X-Test-User') === '1') {
    req.user = { id: 'u1' };
    req.auth = { kind: 'user', userId: 'u1' };
    return next();
  }
  kamAuth(req, res, () => {
    if (req.kam) {
      const rawScopes = (req.get('X-KAM-Scopes') || '').trim();
      const scopes = rawScopes ? rawScopes.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
      req.auth = { kind: 'kam', scopes };
      return next();
    }
    res.status(401).json({ error: 'unauthorized' });
  });
}

// Mock prisma calls inside dev router by monkey-patching require cache if needed; here we rely on real prisma but won't hit DB
// We'll short-circuit by mocking the prisma client methods using vi.spyOn if accessible via module scope; for minimal test, we skip DB and just assert 403/400 paths.

describe('Board-Data Dev write (max-messages)', async () => {
  const KEY = 'dev';
  const app = express();
  app.use(express.json());

  // Hoisted mocks for PrismaClient before importing the router
  const hoisted = vi.hoisted(() => ({
    findUnique: vi.fn(),
    update: vi.fn(),
  }));
  vi.mock('@keeper/database', () => ({
    PrismaClient: class {
      frameInstance = {
        findUnique: hoisted.findUnique,
        update: hoisted.update,
      };
    }
  }));

  const { boardDataDevRouter } = await import('../api/board-data/dev.js');
  app.use('/api/board-data', stubKamOrUserAuth, boardDataDevRouter);

  beforeAll(() => {
    process.env.KAM_SERVICE_KEYS = KEY;
  });

  it('403 with KAM key without boards.rw.dev', async () => {
    const res = await request(app)
      .patch('/api/board-data/dev/frames/f1/max-messages')
      .set({ 'X-KAM-Service-Key': KEY })
      .send({ value: 51 });
    expect(res.status).toBe(403);
  });

  it('403 with user JWT (no write allowed)', async () => {
    const res = await request(app)
      .patch('/api/board-data/dev/frames/f1/max-messages')
      .set({ 'X-Test-User': '1' })
      .send({ value: 51 });
    expect(res.status).toBe(403);
  });

  it('200 with KAM + boards.rw.dev and updates dialog frame', async () => {
    hoisted.findUnique.mockResolvedValueOnce({ id: 'f1', role: 'dialog', frameType: 'dialog', props: {} });
    hoisted.update.mockResolvedValueOnce({});
    const res = await request(app)
      .patch('/api/board-data/dev/frames/f1/max-messages')
      .set({ 'X-KAM-Service-Key': KEY, 'X-KAM-Scopes': 'boards.rw.dev' })
      .send({ value: 51 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'f1', kind: 'dialog', props: { maxMessages: 51 } });
    expect(hoisted.update).toHaveBeenCalled();
  });

  it('400 when non-dialog frame', async () => {
    hoisted.findUnique.mockResolvedValueOnce({ id: 'f2', role: null, frameType: 'media_card', props: {} });
    const res = await request(app)
      .patch('/api/board-data/dev/frames/f2/max-messages')
      .set({ 'X-KAM-Service-Key': KEY, 'X-KAM-Scopes': 'boards.rw.dev' })
      .send({ value: 10 });
    expect(res.status).toBe(400);
  });

  it('404 when unknown id', async () => {
    hoisted.findUnique.mockResolvedValueOnce(null);
    const res = await request(app)
      .patch('/api/board-data/dev/frames/unknown/max-messages')
      .set({ 'X-KAM-Service-Key': KEY, 'X-KAM-Scopes': 'boards.rw.dev' })
      .send({ value: 10 });
    expect(res.status).toBe(404);
  });
});


