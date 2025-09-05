import type { Request, Response, NextFunction } from 'express';

type KamServiceKeyRecord = {
  keyId: string;
  scopes: string[];
};

declare module 'express-serve-static-core' {
  interface Request {
    kam?: KamServiceKeyRecord;
    requestStartTs?: number;
  }
}

// In-memory rate limiter state: (keyId:domainId) -> { windowStart: number, count: number }
const RATE_LIMIT_WINDOW_MS = Number(process.env.KAM_RATE_LIMIT_WINDOW_MS || 5 * 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.KAM_RATE_LIMIT_MAX || 100);
const keyRateState = new Map<string, { windowStart: number; count: number }>();

function parseServiceKeysFromEnv(): Record<string, string[]> {
  // Format 1: KAM_SERVICE_KEYS as JSON mapping { "key": [scopes...] }
  const raw = process.env.KAM_SERVICE_KEYS;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, string[]>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {}
  }
  // Format 2: single key with default read-only scopes
  const single = process.env.KAM_SERVICE_KEY;
  if (single && typeof single === 'string') {
    return { [single]: ['boards.ro', 'frames.ro', 'topics.ro'] };
  }
  return {};
}

const SERVICE_KEYS: Record<string, string[]> = parseServiceKeysFromEnv();

export function kamAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    req.requestStartTs = Date.now();
    const auth = req.get('authorization') || req.get('Authorization') || '';
    const domainId = req.get('X-Domain-Id') || req.get('x-domain-id');
    if (!auth || !auth.startsWith('Bearer ')) {
      res.set('x-request-id', (req as any).reqId || '');
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    if (!domainId) {
      res.set('x-request-id', (req as any).reqId || '');
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    const token = auth.slice('Bearer '.length).trim();
    const scopes = SERVICE_KEYS[token];
    if (!scopes) {
      res.set('x-request-id', (req as any).reqId || '');
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    req.kam = { keyId: token.substring(0, 6) + '…', scopes };
    next();
  } catch (err) {
    res.set('x-request-id', (req as any).reqId || '');
    res.status(500).json({ error: 'internal', requestId: (req as any).reqId || '' });
  }
}

export function kamScope(required: string[]) {
  return function (req: Request, res: Response, next: NextFunction): void {
    const got = req.kam?.scopes || [];
    const missing = required.filter((s) => !got.includes(s));
    if (missing.length) {
      res.set('x-request-id', (req as any).reqId || '');
      res.status(403).json({ error: 'forbidden', missingScopes: missing });
      return;
    }
    next();
  };
}

export function kamRateLimit(req: Request, res: Response, next: NextFunction): void {
  const keyId = req.kam?.keyId || 'anon';
  const domainId = req.get('X-Domain-Id') || req.get('x-domain-id') || 'unknown';
  const compoundKey = `${keyId}:${domainId}`;
  const now = Date.now();
  const entry = keyRateState.get(compoundKey);
  if (!entry || now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    keyRateState.set(compoundKey, { windowStart: now, count: 1 });
    return next();
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW_MS - now) / 1000);
    res.set('Retry-After', String(retryAfterSec));
    res.set('x-request-id', (req as any).reqId || '');
    res.status(429).json({ error: 'rate_limited', retryAfterSec });
    return;
  }
  entry.count += 1;
  next();
}

export function kamAudit(req: Request, res: Response, next: NextFunction): void {
  const start = req.requestStartTs || Date.now();
  const reqId = (req as any).reqId || '';
  const domainId = req.get('X-Domain-Id') || req.get('x-domain-id') || '';
  const ip = req.get('x-real-ip') || req.ip;
  const keyId = req.kam?.keyId || 'unknown';
  const scopes = req.kam?.scopes || [];

  res.on('finish', () => {
    try {
      const durationMs = Date.now() - start;
      const bytes = Number(res.get('content-length') || 0);
      const payload = {
        ts: new Date().toISOString(),
        ip,
        domainId,
        route: req.originalUrl,
        method: req.method,
        durationMs,
        keyId,
        scopes,
        status: res.statusCode,
        bytes,
        agent: { id: req.params?.agentId },
        meta: {
          boardId: req.params?.boardId,
          frameInstanceId: req.params?.frameInstanceId
        },
        requestId: reqId
      };
      // JSON line audit sink (stdout)
      console.log('[kam:audit]', JSON.stringify(payload));
    } catch {}
  });
  next();
}


