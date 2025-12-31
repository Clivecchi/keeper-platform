import { Router } from 'express';

const r = Router();

r.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'api', ts: new Date().toISOString() });
});

r.get('/healthz', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

export default r;


