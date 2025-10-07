// src/kam/session.ts
// Session management utilities for HttpOnly cookie-based authentication
// Provides cookie helpers, auth middleware, and CSRF protection

import type { Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'keeper_session';
const DOMAIN = '.ke3p.com'; // works for www.ke3p.com and api.ke3p.com
const JWT_SECRET = process.env.JWT_SECRET!; // ensure set in Railway

// Set secure HttpOnly session cookie
export function setSessionCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true, // HTTPS only
    sameSite: 'lax', // Changed from 'Lax' to 'lax' for TypeScript
    domain: DOMAIN,
    path: '/',
    maxAge: 7 * 24 * 3600_000, // 7 days
  });
}

// Clear session cookie on logout
export function clearSessionCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    domain: DOMAIN,
    path: '/',
  });
}

// Auth middleware: prefer cookie, fallback to Authorization header for tools/CLI
export function authWeb(req: Request, _res: Response, next: NextFunction) {
  const cookieToken = req.cookies?.[COOKIE_NAME];
  const headerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  const token = cookieToken || headerToken || '';
  if (!token) return next();

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = { id: payload.userId, email: payload.email };
  } catch {}

  return next();
}

// Simple CSRF guard for mutating methods using Origin/Referer checks
export function csrfGuard(req: Request, res: Response, next: NextFunction) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const ok =
    origin.endsWith('.ke3p.com') ||
    referer.includes('.ke3p.com') ||
    !origin; // Allow server-to-server (no Origin header)

  if (!ok) {
    console.warn(`[CSRF] Rejected request from origin: ${origin}, referer: ${referer}`);
    return res.status(403).json({ error: 'CSRF check failed' });
  }
  return next();
}

// Helper: require authenticated user
export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).user?.id) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

