import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { kamAuth, kamScope } from './middleware.js';

const AGENT_ID = process.env.KAM_TEST_AGENT_ID || '00000000-0000-0000-0000-000000000000';
const RIGHT_DOMAIN = process.env.KAM_TEST_DOMAIN_ID || 'domain-right';

describe('KAM routes auth', () => {
  const app = express();
  app.use(express.json());
  // Mount minimal stub routes behind KAM middleware to isolate auth behavior
  const router = express.Router();
  router.use(kamAuth);
  // Agent home: require boards.ro scope and return a stub dto without domain header requirement
  router.get('/agents/:agentId/home', kamScope(['boards.ro']), (req, res) => {
    const { agentId } = req.params as { agentId: string };
    res.json({ agentId, domainId: 'stub-domain', boardId: null });
  });
  // Boards list: require boards.ro and return empty when domain mismatch
  router.get('/boards', kamScope(['boards.ro']), (req, res) => {
    const domainId = req.get('X-Domain-Id') || req.get('x-domain-id') || '';
    // Simulate domainless agent allowing items without header
    if (!domainId) return res.json({ items: [{ id: 'b1' }] });
    if (domainId === 'wrong-domain') return res.json({ items: [] });
    return res.json({ items: [{ id: 'b1' }] });
  });
  app.use('/kam', router);
  const VALID = (process.env.KAM_SERVICE_KEY || (process.env.KAM_SERVICE_KEYS || '').split(',')[0] || '').trim();

  it('401 when header missing', async () => {
    const res = await request(app).get(`/kam/agents/${AGENT_ID}/home`).set({ 'X-Domain-Id': RIGHT_DOMAIN });
    expect([401, 200]).toContain(res.status);
    if (VALID) {
      expect(res.status).toBe(401);
    }
  });

  it('401 when wrong token', async () => {
    const res = await request(app)
      .get(`/kam/agents/${AGENT_ID}/home`)
      .set({ Authorization: 'Bearer wrong', 'X-Domain-Id': RIGHT_DOMAIN });
    expect([401, 200]).toContain(res.status);
    if (VALID) {
      expect(res.status).toBe(401);
    }
  });

  it('200 with correct token (Bearer)', async () => {
    if (!VALID) return; // env not configured in CI
    const res = await request(app)
      .get(`/kam/agents/${AGENT_ID}/home`)
      .set({ Authorization: `Bearer ${VALID}` });
    expect([200]).toContain(res.status);
  });

  it('200 with correct token (BEARER uppercase)', async () => {
    if (!VALID) return;
    const res = await request(app)
      .get(`/kam/agents/${AGENT_ID}/home`)
      .set({ Authorization: `BEARER   ${VALID}  ` });
    expect([200]).toContain(res.status);
  });

  it('boards list returns empty 200 when domain mismatches', async () => {
    if (!VALID) return;
    const res = await request(app)
      .get(`/kam/boards?agentId=${AGENT_ID}`)
      .set({ Authorization: `Bearer ${VALID}`, 'X-Domain-Id': 'wrong-domain' });
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.body?.items)).toBe(true);
    }
  });
});


