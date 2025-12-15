import { describe, it, expect, beforeAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

describe('GET /api/debug/req/:id', () => {
  const app = express();
  app.use(express.json());

  beforeAll(async () => {
    // Mock prisma.requestLog
    const hoisted = (globalThis as any).__reqLogs || ((globalThis as any).__reqLogs = {
      findMany: vi.fn()
    });
    vi.mock('@keeper/database', () => ({ prisma: { requestLog: { findMany: hoisted.findMany } } }));
    const router = (await import('../api/debug.js')).default;
    app.use('/api/debug', router);
  });

  it('returns durable logs', async () => {
    const hoisted = (globalThis as any).__reqLogs;
    hoisted.findMany.mockResolvedValueOnce([{ id: '1', reqId: 'r1', at: new Date(), level: 'info', step: 'X', meta: {} }]);
    const res = await request(app).get('/api/debug/req/r1');
    expect(res.status).toBe(200);
    expect(res.body?.count).toBeGreaterThan(0);
  });
});


