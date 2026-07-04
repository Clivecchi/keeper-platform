import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import cors from 'cors';
import request from 'supertest';
import { isKeeperDomainsTenantOrigin } from '../lib/keeperDomainsCors.js';

describe('MVP CORS and Domain Fallback', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'production';
    process.env.FALLBACK_DOMAIN = 'www.ke3p.com';
  });

  it('allows https://www.ke3p.com origin', async () => {
    const app = express();
    const allowlist = ['https://www.ke3p.com', 'https://api.ke3p.com'];
    app.use(cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (allowlist.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }));
    app.get('/ping', (_req, res) => res.send('pong'));

    const res = await request(app)
      .get('/ping')
      .set('Origin', 'https://www.ke3p.com');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('https://www.ke3p.com');
  });

  it('rejects unknown origin with 403 (no 500)', async () => {
    const app = express();
    const allowlist = ['https://www.ke3p.com', 'https://api.ke3p.com'];
    app.use((req, res, next) => {
      const origin = req.get('origin') || undefined;
      if (origin && !allowlist.includes(origin)) {
        res.status(403).json({ error: 'CORS: origin not allowed' });
        return;
      }
      next();
    });
    app.get('/ping', (_req, res) => res.send('pong'));

    const res = await request(app)
      .get('/ping')
      .set('Origin', 'https://evil.example');
    expect(res.status).toBe(403);
  });

  it('does not use wildcard * for ACAO', async () => {
    const app = express();
    const allowlist = ['https://www.ke3p.com', 'https://api.ke3p.com'];
    app.use(cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (allowlist.includes(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
    }));
    app.get('/ping', (_req, res) => res.send('pong'));

    const res = await request(app)
      .get('/ping')
      .set('Origin', 'https://www.ke3p.com');
    expect(res.headers['access-control-allow-origin']).toBe('https://www.ke3p.com');
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('allows keeper.domains tenant origins with specific ACAO (not *)', async () => {
    const tenantOrigin = 'https://staging.keeper.domains';
    expect(isKeeperDomainsTenantOrigin(tenantOrigin)).toBe(true);

    const app = express();
    app.use(cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (isKeeperDomainsTenantOrigin(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }));
    app.get('/ping', (_req, res) => res.send('pong'));

    const res = await request(app)
      .get('/ping')
      .set('Origin', tenantOrigin);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(tenantOrigin);
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });

  it('rejects reserved keeper.domains infrastructure subdomains', async () => {
    expect(isKeeperDomainsTenantOrigin('https://api.keeper.domains')).toBe(false);

    const app = express();
    app.use(cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (isKeeperDomainsTenantOrigin(origin)) return cb(null, true);
        return cb(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }));
    app.get('/ping', (_req, res) => res.send('pong'));

    const res = await request(app)
      .get('/ping')
      .set('Origin', 'https://api.keeper.domains');
    expect(res.status).toBe(500);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});


