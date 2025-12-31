import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createDomainResolutionMiddleware } from '../middleware/domainResolutionMiddleware.js';

describe('Domain fallback behavior', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'production';
    process.env.FALLBACK_DOMAIN = 'www.ke3p.com';
  });

  it('redirects unknown host to FALLBACK_DOMAIN in production', async () => {
    const app = express();
    app.use(createDomainResolutionMiddleware());
    app.get('/ok', (_req, res) => res.send('ok'));

    const res = await request(app)
      .get('/ok')
      .set('Host', 'unknown.example.com');

    expect([301, 302]).toContain(res.status);
    expect(res.headers['location']).toBe('https://www.ke3p.com');
  });
});


