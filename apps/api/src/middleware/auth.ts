import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const { JWT_SECRET = '' } = process.env;
const COOKIE_CANDIDATES = ['token', 'keeper_token', 'auth_token'];

function getToken(req: Request): string | null {
  const auth = req.headers.authorization || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  const cookies = (req as any).cookies || {};
  for (const name of COOKIE_CANDIDATES) if (cookies[name]) return cookies[name];
  return null;
}

export function attachUser(req: Request, _res: Response, next: NextFunction) {
  try {
    const sessUser = (req as any).session?.user;
    if (sessUser?.id) {
      (req as any).user = { id: sessUser.id, email: sessUser.email, roles: sessUser.roles ?? [] };
      return next();
    }
    const token = getToken(req);
    if (!token || !JWT_SECRET) return next();
    const payload = jwt.verify(token, JWT_SECRET) as { id?: string; userId?: string; email?: string; roles?: string[] };
    const id = (payload as any)?.id || (payload as any)?.userId;
    if (id) (req as any).user = { id, email: (payload as any)?.email, roles: (payload as any)?.roles ?? [] };
    return next();
  } catch {
    return next();
  }
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const u = (req as any).user;
  if (!u?.id) return res.status(401).json({ error: 'Unauthorized' });
  next();
}


