import { Router } from 'express';

const r = Router();

r.get('/healthz', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

export default r;


