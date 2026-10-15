import { afterEach, describe, expect, it } from 'vitest';
import { attachKeeperTenantHost } from './attachKeeperTenantHost.js';

const ORIGINAL_TOKEN = process.env.VERCEL_TOKEN;
const ORIGINAL_PROJECT = process.env.VERCEL_PROJECT_ID;

afterEach(() => {
  if (ORIGINAL_TOKEN === undefined) delete process.env.VERCEL_TOKEN;
  else process.env.VERCEL_TOKEN = ORIGINAL_TOKEN;
  if (ORIGINAL_PROJECT === undefined) delete process.env.VERCEL_PROJECT_ID;
  else process.env.VERCEL_PROJECT_ID = ORIGINAL_PROJECT;
});

describe('attachKeeperTenantHost', () => {
  it('registers the tenant hostname during setup', async () => {
    const seen: string[] = [];
    const result = await attachKeeperTenantHost('northstar', async (hostname) => {
      seen.push(hostname);
    });
    expect(seen).toEqual(['northstar.keeper.domains']);
    expect(result).toEqual({ hostname: 'northstar.keeper.domains', attached: true });
  });

  it('refuses a reserved tag', async () => {
    const result = await attachKeeperTenantHost('www', async () => {
      throw new Error('should not register');
    });
    expect(result.attached).toBe(false);
    expect(result.hostname).toBeNull();
  });

  it('reports a hosting failure without throwing', async () => {
    const result = await attachKeeperTenantHost('northstar', async () => {
      throw new Error('Vercel refused the name');
    });
    expect(result.attached).toBe(false);
    expect(result.error).toBe('Vercel refused the name');
  });

  it('reports missing server credentials instead of pretending the address is live', async () => {
    delete process.env.VERCEL_TOKEN;
    delete process.env.VERCEL_PROJECT_ID;
    const result = await attachKeeperTenantHost('northstar');
    expect(result.attached).toBe(false);
    expect(result.hostname).toBe('northstar.keeper.domains');
    expect(result.error).toMatch(/not configured/);
  });
});
