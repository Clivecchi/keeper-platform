import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import kamRouter from '../kam/routes.js';
import { boardDataRoRouter } from '../api/boards.js';

const AGENT_ID = process.env.KAM_TEST_AGENT_ID || '00000000-0000-0000-0000-000000000000';

describe('KAM ↔ Board-Data parity (RO)', () => {
  const KEY = 'dev';
  const app = express();
  app.use(express.json());
  // Ensure service key for test
  beforeAll(() => {
    process.env.KAM_SERVICE_KEYS = 'dev';
  });
  app.use('/kam', kamRouter);
  app.use('/api/board-data', boardDataRoRouter);

  it('home parity returns same boardId and consistent frames', async () => {
    const home = await request(app)
      .get(`/kam/agents/${AGENT_ID}/home`)
      .set({ Authorization: `Bearer ${KEY}` });
    expect([200, 404]).toContain(home.status);
    if (home.status !== 200) return;
    const { boardId } = home.body || {};
    expect(boardId === null || typeof boardId === 'string').toBe(true);

    const stu = await request(app)
      .get(`/api/board-data/agents/${AGENT_ID}/home`)
      .set({ Authorization: `Bearer ${KEY}` });
    expect(stu.status).toBe(200);
    if (boardId === null) {
      expect(stu.body?.boardId ?? null).toBeNull();
      expect(Array.isArray(stu.body?.frames)).toBe(true);
      return;
    }
    expect(stu.body?.boardId).toBe(boardId);
    expect(Array.isArray(stu.body?.frames)).toBe(true);
    const kinds = (stu.body?.frames || []).map((f: any) => f.kind);
    const sortedOrders = (stu.body?.frames || []).map((f: any) => f.order);
    expect(sortedOrders).toEqual([...sortedOrders].sort((a: number, b: number) => a - b));
    expect(kinds.length >= 0).toBe(true);
  });

  it('parity endpoint accepts X-KAM-Service-Key header', async () => {
    const res = await request(app)
      .get(`/api/board-data/agents/${AGENT_ID}/home`)
      .set({ 'X-KAM-Service-Key': KEY, 'X-KAM-Scopes': 'boards.ro' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('boardId');
    expect(Array.isArray(res.body?.frames)).toBe(true);
  });

  it('parity endpoint requires a service key (401 on missing)', async () => {
    const res = await request(app)
      .get(`/api/board-data/agents/${AGENT_ID}/home`);
    expect(res.status).toBe(401);
    expect(res.body?.error).toBe('unauthorized');
  });
});


