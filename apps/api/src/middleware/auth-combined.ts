import type { Request, Response, NextFunction } from 'express';
import { kamAuth } from '../kam/middleware.js';
import { authMiddlewareCompat as userJwtAuth } from './authMiddleware.js';

export function kamOrUserAuth(req: Request, res: Response, next: NextFunction): void {
  const headerKey = (req.get('X-KAM-Service-Key') || req.get('x-kam-service-key') || '').trim();
  const auth = (req.get('authorization') || req.get('Authorization') || '').trim();
  const looksLikeJwt = /^Bearer\s+[^.]+\.[^.]+\.[^.]+$/i.test(auth);
  const hasKamSignal = Boolean(headerKey) || (Boolean(auth) && !looksLikeJwt);

  if (hasKamSignal) {
    // Prefer KAM path when explicitly signaled; if it doesn't attach req.kam, fall back to JWT
    kamAuth(req, res, () => {
      if ((req as any).kam && Array.isArray((req as any).kam.scopes)) {
        const rawScopes = (req.get('X-KAM-Scopes') || req.get('x-kam-scopes') || '').trim();
        const scopes = rawScopes
          ? rawScopes.split(',').map((s) => s.trim()).filter(Boolean)
          : ((req as any).kam.scopes as string[]);
        (req as any).auth = { kind: 'kam', scopes };
        return next();
      }
      userJwtAuth(req, res, () => {
        if ((req as any).user) {
          (req as any).auth = { kind: 'user', userId: (req as any).user.id };
          return next();
        }
        res.status(401).json({ error: 'unauthorized' });
        return;
      });
    });
    // Dev-only diagnostics for /api/board-data
    if (process.env.NODE_ENV !== 'production' && req.path.startsWith('/api/board-data')) {
      const seenHeaders: string[] = [];
      if (req.get('authorization') || req.get('Authorization')) seenHeaders.push('Authorization');
      if (req.get('X-KAM-Service-Key') || req.get('x-kam-service-key')) seenHeaders.push('X-KAM-Service-Key');
      if (req.get('X-KAM-Scopes') || req.get('x-kam-scopes')) seenHeaders.push('X-KAM-Scopes');
      console.log('[board-data:auth]', { path: req.path, method: req.method, used: 'KAM-first', headers: seenHeaders });
    }
    return;
  }

  // Default to user JWT first when Authorization looks like a JWT or no KAM headers
  userJwtAuth(req, res, () => {
    if ((req as any).user) {
      (req as any).auth = { kind: 'user', userId: (req as any).user.id };
      return next();
    }
    kamAuth(req, res, () => {
      if ((req as any).kam && Array.isArray((req as any).kam.scopes)) {
        const rawScopes = (req.get('X-KAM-Scopes') || req.get('x-kam-scopes') || '').trim();
        const scopes = rawScopes
          ? rawScopes.split(',').map((s) => s.trim()).filter(Boolean)
          : ((req as any).kam.scopes as string[]);
        (req as any).auth = { kind: 'kam', scopes };
        return next();
      }
      res.status(401).json({ error: 'unauthorized' });
      return;
    });
  });
  // Dev-only diagnostics for /api/board-data
  if (process.env.NODE_ENV !== 'production' && req.path.startsWith('/api/board-data')) {
    const seenHeaders: string[] = [];
    if (req.get('authorization') || req.get('Authorization')) seenHeaders.push('Authorization');
    if (req.get('X-KAM-Service-Key') || req.get('x-kam-service-key')) seenHeaders.push('X-KAM-Service-Key');
    if (req.get('X-KAM-Scopes') || req.get('x-kam-scopes')) seenHeaders.push('X-KAM-Scopes');
    console.log('[board-data:auth]', { path: req.path, method: req.method, used: 'JWT-first', headers: seenHeaders });
  }
}

export function roBoardsGuard(req: Request, res: Response, next: NextFunction): void {
  const kamScopes: string[] = ((req as any).kam?.scopes as string[]) || [];
  const isGet = (req.method || 'GET').toUpperCase() === 'GET';
  // KAM: allow if boards.ro or read-only GET
  if ((req as any).kam) {
    if (kamScopes.includes('boards.ro')) return next();
    if (isGet) return next();
  }
  // User JWT: allow read-only GET; for simplicity allow any route read here (RO routes only)
  if ((req as any).user) return next();
  res.status(403).json({ error: 'forbidden' });
  return;
}


