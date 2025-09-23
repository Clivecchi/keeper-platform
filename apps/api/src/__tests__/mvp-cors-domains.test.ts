import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import cors from 'cors';
import request from 'supertest';

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

  it('rejects unknown origin', async () => {
    const app = express();
    const allowlist = ['https://www.ke3p.com', 'https://api.ke3p.com'];
    app.use((req, res, next) => {
      cors({
        origin(origin, cb) {
          if (!origin) return cb(null, true);
          if (allowlist.includes(origin)) return cb(null, true);
          return cb(new Error('Not allowed by CORS'));
        },
      })(req, res, (err) => {
        if (err) return res.status(500).send('CORS error');
        next();
      });
    });
    app.get('/ping', (_req, res) => res.send('pong'));

    const res = await request(app)
      .get('/ping')
      .set('Origin', 'https://evil.example');
    expect(res.status).toBe(500);
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
});


