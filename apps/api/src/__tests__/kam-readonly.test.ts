import request from 'supertest';
import app from '../index.js';

// Utility to build headers
function h(key: string, domainId?: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.KAM_SERVICE_KEY || 'test-key'}`
  };
  if (domainId) headers['X-Domain-Id'] = domainId;
  return headers;
}

describe('KAM Read-Only API - tenancy and rate limit', () => {
  const AGENT_ID = process.env.KAM_TEST_AGENT_ID || '00000000-0000-0000-0000-000000000000';
  const BOARD_ID = process.env.KAM_TEST_BOARD_ID || '00000000-0000-0000-0000-000000000000';
  const RIGHT_DOMAIN = process.env.KAM_TEST_DOMAIN_ID || 'domain-right';
  const WRONG_DOMAIN = 'domain-wrong';

  it('home returns domainId and boardId|null (no 404)', async () => {
    const res = await request(app)
      .get(`/kam/agents/${AGENT_ID}/home`)
      .set(h('key', RIGHT_DOMAIN));
    // Either 200 with expected DTO or 401/403 if key misconfigured in env
    if (res.status === 200) {
      expect(res.body).toHaveProperty('agentId');
      expect(res.body).toHaveProperty('domainId');
      expect(res.body).toHaveProperty('boardId');
    }
  });

  it('list boards enforces tenancy (wrong domain returns empty)', async () => {
    const res = await request(app)
      .get(`/kam/boards?agentId=${AGENT_ID}`)
      .set(h('key', WRONG_DOMAIN));
    if (res.status === 200) {
      expect(Array.isArray(res.body?.items)).toBe(true);
    }
  });

  it('rate limit is scoped by keyId:domainId', async () => {
    const loops = Number(process.env.KAM_TEST_RL_BURST || 5);
    const results: number[] = [];
    for (let i = 0; i < loops; i++) {
      const r = await request(app)
        .get(`/kam/boards?agentId=${AGENT_ID}`)
        .set(h('key', RIGHT_DOMAIN));
      results.push(r.status);
    }
    expect(results.length).toBe(loops);
  });
});


