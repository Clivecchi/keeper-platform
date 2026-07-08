import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request } from 'express';
import {
  createKeeperCorsMiddleware,
  isCachedVerifiedCustomDomainHost,
  isKeeperWebOriginAllowed,
  parseOriginHostname,
  readForwardedHost,
  refreshVerifiedCustomDomainHosts,
} from './keeperCors.js';

function mockReq(headers: Record<string, string | undefined>): Pick<Request, 'get'> {
  return {
    get(name: string) {
      const key = Object.keys(headers).find((h) => h.toLowerCase() === name.toLowerCase());
      return key ? headers[key] : undefined;
    },
  };
}

const baseConfig = {
  allowlist: new Set(['https://www.ke3p.com']),
  wildcards: [] as RegExp[],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
};

describe('keeperCors', () => {
  beforeEach(async () => {
    await refreshVerifiedCustomDomainHosts({
      domain: {
        findMany: vi.fn().mockResolvedValue([
          { customDomain: 'livecchi.us' },
        ]),
      },
    } as any);
  });

  it('parses origin hostnames', () => {
    expect(parseOriginHostname('https://livecchi.us')).toBe('livecchi.us');
    expect(parseOriginHostname('not-a-url')).toBeNull();
  });

  it('reads forwarded host from proxy headers', () => {
    const req = mockReq({ 'x-forwarded-host': 'livecchi.us, other.example' });
    expect(readForwardedHost(req)).toBe('livecchi.us');
  });

  it('allows verified custom domain origins from cache', () => {
    expect(isCachedVerifiedCustomDomainHost('livecchi.us')).toBe(true);
    expect(
      isKeeperWebOriginAllowed('https://livecchi.us', undefined, baseConfig),
    ).toBe(true);
  });

  it('allows origin when it matches x-forwarded-host', () => {
    const req = mockReq({ 'x-forwarded-host': 'livecchi.us' });
    expect(
      isKeeperWebOriginAllowed('https://livecchi.us', req, baseConfig),
    ).toBe(true);
  });

  it('rejects unrelated origins with 403 (not 500)', () => {
    const middleware = createKeeperCorsMiddleware(baseConfig);
    const req = {
      method: 'GET',
      get: (name: string) => (name.toLowerCase() === 'origin' ? 'https://evil.example' : undefined),
    } as Request;
    const res = {
      statusCode: 200,
      body: undefined as unknown,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      json(payload: unknown) {
        this.body = payload;
        return this;
      },
      setHeader: vi.fn(),
    } as any;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ error: 'CORS_ORIGIN_NOT_ALLOWED' });
    expect(next).not.toHaveBeenCalled();
  });

  it('handles OPTIONS preflight for allowed custom domain', () => {
    const middleware = createKeeperCorsMiddleware(baseConfig);
    const req = {
      method: 'OPTIONS',
      get: (name: string) => {
        if (name.toLowerCase() === 'origin') return 'https://livecchi.us';
        if (name.toLowerCase() === 'x-forwarded-host') return 'livecchi.us';
        return undefined;
      },
    } as Request;
    const res = {
      statusCode: 200,
      status(code: number) {
        this.statusCode = code;
        return this;
      },
      sendStatus(code: number) {
        this.statusCode = code;
      },
      setHeader: vi.fn(),
      json: vi.fn(),
    } as any;
    const next = vi.fn();

    middleware(req, res, next);

    expect(res.statusCode).toBe(204);
    expect(next).not.toHaveBeenCalled();
  });
});
