import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { kamAuth } from '../kam/middleware.js';
import { roBoardsGuard } from '../middleware/auth-combined.js';

describe('Board-Data RO auth: KAM service key OR user JWT', () => {
  const KEY = 'dev';
  const app = express();
  app.use(express.json());

  // Ensure KAM key available for tests
  beforeAll(() => {
    process.env.KAM_SERVICE_KEYS = KEY;
  });

  // Local composite auth to avoid DB/JWT dependency in tests
  function stubUserJwtAuth(req: any, _res: any, next: any) {
    // If header present, treat as authenticated Studio user
    if (req.get('X-Test-User') === '1') {
      req.user = { id: 'test-user' };
    }
    next();
  }
  function localKamOrUserAuth(req: any, res: any, next: any) {
    const headerKey = (req.get('X-KAM-Service-Key') || req.get('x-kam-service-key') || '').trim();
    const auth = (req.get('authorization') || req.get('Authorization') || '').trim();
    const looksLikeJwt = /^Bearer\s+[^.]+\.[^.]+\.[^.]+$/i.test(auth);
    const hasKamSignal = Boolean(headerKey) || (Boolean(auth) && !looksLikeJwt);

    if (!hasKamSignal) {
      // Prefer user path when signaled (or no auth) to avoid KAM 401 short-circuiting tests
      stubUserJwtAuth(req, res, () => {
        if (req.user) return next();
        // If no user, try KAM as fallback
        kamAuth(req, res, () => {
          if (req.kam && Array.isArray(req.kam.scopes)) return next();
          res.status(401).json({ error: 'unauthorized' });
        });
      });
      return;
    }

    kamAuth(req, res, () => {
      if (req.kam && Array.isArray(req.kam.scopes)) return next();
      res.status(401).json({ error: 'unauthorized' });
    });
  }

  // Stub board-data route that represents RO shape (no Prisma)
  const router = express.Router();
  router.get('/agents/:id/home', (_req, res) => {
    res.json({ boardId: 'stub-board', frames: [] });
  });
  router.get('/:boardId', (_req, res) => {
    res.json({ id: 'stub-board', frames: [] });
  });

  app.use('/api/board-data', localKamOrUserAuth, roBoardsGuard, router);

  it('200 with Authorization: Bearer <service key>', async () => {
    const res = await request(app)
      .get('/api/board-data/agents/00000000-0000-0000-0000-000000000000/home')
      .set({ Authorization: `Bearer ${KEY}` });
    expect(res.status).toBe(200);
  });

  it('200 with X-KAM-Service-Key header', async () => {
    const res = await request(app)
      .get('/api/board-data/agents/00000000-0000-0000-0000-000000000000/home')
      .set({ 'X-KAM-Service-Key': KEY, 'X-KAM-Scopes': 'boards.ro' });
    expect(res.status).toBe(200);
  });

  it('200 with user JWT (stubbed via X-Test-User)', async () => {
    const res = await request(app)
      .get('/api/board-data/agents/00000000-0000-0000-0000-000000000000/home')
      .set({ 'X-Test-User': '1' });
    expect(res.status).toBe(200);
  });

  it('200 for GET /api/board-data/{boardId} with X-KAM-Service-Key only', async () => {
    const res = await request(app)
      .get('/api/board-data/11111111-1111-1111-1111-111111111111')
      .set({ 'X-KAM-Service-Key': KEY });
    expect(res.status).toBe(200);
  });

  it('200 for GET /api/board-data/{boardId} with Authorization: Bearer <service-key> (non-JWT)', async () => {
    const res = await request(app)
      .get('/api/board-data/11111111-1111-1111-1111-111111111111')
      .set({ Authorization: `Bearer ${KEY}` });
    expect(res.status).toBe(200);
  });

  it('200 for GET /api/board-data/{boardId} with user JWT', async () => {
    const res = await request(app)
      .get('/api/board-data/11111111-1111-1111-1111-111111111111')
      .set({ 'X-Test-User': '1' });
    expect(res.status).toBe(200);
  });

  it('401 with no auth', async () => {
    const res = await request(app)
      .get('/api/board-data/agents/00000000-0000-0000-0000-000000000000/home');
    expect(res.status).toBe(401);
    expect(res.body?.error).toBe('unauthorized');
  });
});


