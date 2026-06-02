import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyRailwayCustomConnect } from '../lib/integrationCustomConnect.js';

describe('verifyRailwayCustomConnect @smoke', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    process.env = env;
    vi.unstubAllGlobals();
  });

  it('fails when RAILWAY_TOKEN is missing', async () => {
    delete process.env.RAILWAY_TOKEN;
    process.env.RAILWAY_PROJECT_ID = 'proj_test';

    const result = await verifyRailwayCustomConnect();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('RAILWAY_TOKEN');
    }
  });

  it('fails when RAILWAY_PROJECT_ID is missing', async () => {
    process.env.RAILWAY_TOKEN = 'token_test';
    delete process.env.RAILWAY_PROJECT_ID;

    const result = await verifyRailwayCustomConnect();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('RAILWAY_PROJECT_ID');
    }
  });

  it('succeeds when env vars are set and Railway API responds', async () => {
    process.env.RAILWAY_TOKEN = 'token_test';
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

    const result = await verifyRailwayCustomConnect();
    expect(result).toEqual({ ok: true });
  });
});
