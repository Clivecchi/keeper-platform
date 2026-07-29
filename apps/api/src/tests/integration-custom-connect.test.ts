import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifyRailwayCustomConnect } from '../lib/integrationCustomConnect.js';
import {
  buildRailwayAuthHeaders,
  resolveRailwayTokenKind,
  RAILWAY_GRAPHQL_URL,
} from '../lib/railwayGraphql.js';

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

    const fetchMock = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      const body = typeof init?.body === 'string' ? init.body : '';
      if (body.includes('IntegrationConnectProbe')) {
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ data: { project: { id: 'proj_test' } } }),
        };
      }
      if (body.includes('ConnectProbeDeployments')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: { deployments: { edges: [{ node: { id: 'dep_1' } }] } },
            }),
        };
      }
      if (body.includes('ConnectProbeLogs')) {
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              data: { deploymentLogs: [{ message: 'ok' }] },
            }),
        };
      }
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ data: {} }),
      };
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await verifyRailwayCustomConnect();
    expect(result).toEqual({ ok: true });
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(RAILWAY_GRAPHQL_URL);
  });

  it('fails when deploymentLogs is Not Authorized', async () => {
    process.env.RAILWAY_TOKEN = 'token_test';
    process.env.RAILWAY_PROJECT_ID = 'proj_test';

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        const body = typeof init?.body === 'string' ? init.body : '';
        if (body.includes('IntegrationConnectProbe')) {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({ data: { project: { id: 'proj_test' } } }),
          };
        }
        if (body.includes('ConnectProbeDeployments')) {
          return {
            ok: true,
            status: 200,
            text: async () =>
              JSON.stringify({
                data: { deployments: { edges: [{ node: { id: 'dep_1' } }] } },
              }),
          };
        }
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({ errors: [{ message: 'Not Authorized' }] }),
        };
      }),
    );

    const result = await verifyRailwayCustomConnect();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Not Authorized/i);
    }
  });
});

describe('railwayGraphql auth headers @smoke', () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it('uses Project-Access-Token for UUID project tokens', () => {
    delete process.env.RAILWAY_TOKEN_KIND;
    const uuid = '11111111-2222-4333-8444-555555555555';
    expect(resolveRailwayTokenKind(uuid)).toBe('project');
    expect(buildRailwayAuthHeaders(uuid)).toEqual({
      'Project-Access-Token': uuid,
    });
  });

  it('uses Bearer for account-style tokens', () => {
    delete process.env.RAILWAY_TOKEN_KIND;
    expect(resolveRailwayTokenKind('token_abc123')).toBe('account');
    expect(buildRailwayAuthHeaders('token_abc123')).toEqual({
      Authorization: 'Bearer token_abc123',
    });
  });

  it('honors RAILWAY_TOKEN_KIND override', () => {
    process.env.RAILWAY_TOKEN_KIND = 'project';
    expect(buildRailwayAuthHeaders('token_abc123')).toEqual({
      'Project-Access-Token': 'token_abc123',
    });
  });
});
