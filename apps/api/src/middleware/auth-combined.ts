import type { Request, Response, NextFunction } from 'express';
import { kamAuth } from '../kam/middleware.js';
import { authMiddlewareCompat as userJwtAuth } from './authMiddleware.js';

export function kamOrUserAuth(req: Request, res: Response, next: NextFunction): void {
  // Try KAM first; if it did not set req.kam, fall back to user JWT
  kamAuth(req, res, () => {
    if ((req as any).kam && Array.isArray((req as any).kam.scopes)) {
      return next();
    }
    userJwtAuth(req, res, () => {
      if ((req as any).user) return next();
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


