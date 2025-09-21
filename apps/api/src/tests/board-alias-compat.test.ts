import { describe, it, expect, beforeAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

describe('GET /api/board-data/:id alias → UUID', () => {
  const app = express();
  app.use(express.json());

  beforeAll(async () => {
    // Bypass auth middleware in boards router
    vi.mock('../middleware/authMiddleware.js', () => ({ authMiddlewareCompat: (_req: any, _res: any, next: any) => next() }));
    // Mock PrismaClient used by boards router
    const hoisted = (globalThis as any).__hoisted || ((globalThis as any).__hoisted = {
      aliasFind: vi.fn(),
      boardFind: vi.fn(),
    });
    vi.mock('@keeper/database', () => ({
      PrismaClient: class {
        boardAlias = { findUnique: hoisted.aliasFind };
        board = { findUnique: hoisted.boardFind };
      }
    }));

    const { default: router } = await import('../api/boards.js');
    // Auth stub
    const injectCtx = (req: any, _res: any, next: any) => { req.user = { id: 'u1' }; req.domainContext = { domain: { id: 'd1' } }; next(); };
    app.use('/api/board-data', injectCtx, router);
  });

  it('resolves alias and returns 200', async () => {
    const hoisted = (globalThis as any).__hoisted;
    hoisted.aliasFind.mockResolvedValueOnce({ id: 'a1', domainId: 'd1', alias: 'domain-board-1', boardId: '11111111-1111-1111-1111-111111111111' });
    hoisted.boardFind.mockResolvedValueOnce({ id: '11111111-1111-1111-1111-111111111111', data: {}, behavior: {}, updatedAt: new Date(), frames: [] });
    const res = await request(app).get('/api/board-data/domain-board-1');
    expect(res.status).toBe(200);
    expect(res.body?.reqId).toBeTruthy();
  });
});


