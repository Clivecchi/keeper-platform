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
      if ((req as any).kam && Array.isArray((req as any).kam.scopes)) return next();
      userJwtAuth(req, res, () => {
        if ((req as any).user) return next();
        res.status(401).json({ error: 'unauthorized' });
        return;
      });
    });
    return;
  }

  // Default to user JWT first when Authorization looks like a JWT or no KAM headers
  userJwtAuth(req, res, () => {
    if ((req as any).user) return next();
    kamAuth(req, res, () => {
      if ((req as any).kam && Array.isArray((req as any).kam.scopes)) return next();
      res.status(401).json({ error: 'unauthorized' });
      return;
    });
  });
}

export function roBoardsGuard(req: Request, res: Response, next: NextFunction): void {
  const kamScopes: string[] = ((req as any).kam?.scopes as string[]) || [];
  if (kamScopes.includes('boards.ro')) return next();
  if ((req as any).user) return next();
  res.status(403).json({ error: 'forbidden' });
  return;
}


