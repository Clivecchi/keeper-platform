// src/kam/session.ts
// Session management utilities for HttpOnly cookie-based authentication
// Provides cookie helpers, auth middleware, and CSRF protection

import type { Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'keeper_session';
const DOMAIN = process.env.COOKIE_DOMAIN || '.ke3p.com'; // works for www.ke3p.com and api.ke3p.com
const JWT_SECRET = process.env.JWT_SECRET!; // ensure set in Railway

// Check if request is from a Vercel preview deployment
function isPreviewOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  if (!origin) return false;
  
  try {
    const url = new URL(origin);
    const suffix = process.env.WEB_PREVIEW_HOST_SUFFIX || '.vercel.app';
    const prefix = process.env.WEB_PREVIEW_HOST_PREFIX || '';
    const endsWithSuffix = url.hostname.endsWith(suffix);
    const startsWithPrefix = prefix ? url.hostname.startsWith(prefix) : true;
    return endsWithSuffix && startsWithPrefix;
  } catch {
    return false;
  }
}

// Set secure HttpOnly session cookie (preview-aware)
export function setSessionCookie(req: Request, res: Response, token: string) {
  const isPreview = isPreviewOrigin(req);
  
  // Build cookie string manually to ensure it's set correctly
  const maxAge = 7 * 24 * 3600; // 7 days in seconds
  const cookieValue = [
    `${COOKIE_NAME}=${token}`,
    `Domain=${DOMAIN}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    `Max-Age=${maxAge}`
  ].join('; ');
  
  // Set cookie header directly
  res.setHeader('Set-Cookie', cookieValue);
  
  console.log('[session] Cookie set manually:', { domain: DOMAIN, origin: req.headers.origin, isPreview });
  
  if (isPreview) {
    console.log('[session] Set preview cookie (SameSite=None) for origin:', req.headers.origin);
  }
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
  const origin = req.headers.origin; // present for browser CORS/XHR/fetch
  const cliHeader = (req.headers['x-client'] || '').toString().toLowerCase() === 'cli';

  const cookieToken = req.cookies?.[COOKIE_NAME];
  const headerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  // Accept header token only when NOT a browser fetch (no Origin) or explicitly marked CLI
  const allowHeader = !origin || cliHeader;

  const token = cookieToken || (allowHeader ? headerToken : '');
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
  
  // Check production origins
  const okProd =
    origin.endsWith('.ke3p.com') ||
    referer.includes('.ke3p.com') ||
    !origin; // Allow server-to-server (no Origin header)

  // Check preview origins (if enabled)
  let okPreview = false;
  if (process.env.WEB_PREVIEW_ALLOW === '1') {
    try {
      const urlToCheck = origin || referer || '';
      if (urlToCheck) {
        const url = new URL(urlToCheck);
        const suffix = process.env.WEB_PREVIEW_HOST_SUFFIX || '.vercel.app';
        const prefix = process.env.WEB_PREVIEW_HOST_PREFIX || '';
        const endsWithSuffix = url.hostname.endsWith(suffix);
        const startsWithPrefix = prefix ? url.hostname.startsWith(prefix) : true;
        okPreview = endsWithSuffix && startsWithPrefix;
      }
    } catch {}
  }

  if (okProd || okPreview) return next();
  
  console.warn(`[CSRF] Rejected request from origin: ${origin}, referer: ${referer}`);
  return res.status(403).json({ error: 'CSRF check failed' });
}

// Helper: require authenticated user
export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!(req as any).user?.id) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

