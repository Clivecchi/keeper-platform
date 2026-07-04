// src/kam/session.ts
// Session management utilities for HttpOnly cookie-based authentication
// Provides cookie helpers, auth middleware, and CSRF protection

import type { Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'keeper_session';
const COOKIE_CANDIDATES = [COOKIE_NAME, 'keeper_token', 'token', 'auth_token'];
const KE3P_COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || '.ke3p.com'; // www.ke3p.com + api.ke3p.com
const KEEPER_DOMAINS_COOKIE_DOMAIN =
  process.env.KEEPER_DOMAINS_COOKIE_DOMAIN || '.keeper.domains';
const JWT_SECRET = process.env.JWT_SECRET!; // ensure set in Railway

function isKeeperDomainsOrigin(req: Request): boolean {
  const originOrReferer = req.headers.origin || req.headers.referer || '';
  if (!originOrReferer) return false;
  try {
    const url = new URL(originOrReferer);
    const host = url.hostname;
    return host === 'keeper.domains' || host.endsWith('.keeper.domains');
  } catch {
    return false;
  }
}

/** Cookie Domain attribute for the incoming request origin. */
export function resolveCookieDomain(req: Request): string {
  return isKeeperDomainsOrigin(req) ? KEEPER_DOMAINS_COOKIE_DOMAIN : KE3P_COOKIE_DOMAIN;
}

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
  const cookieDomain = resolveCookieDomain(req);

  // Build cookie string manually to ensure it's set correctly
  const maxAge = 7 * 24 * 3600; // 7 days in seconds
  const cookieValue = [
    `${COOKIE_NAME}=${token}`,
    `Domain=${cookieDomain}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    `Max-Age=${maxAge}`
  ].join('; ');
  
  // Set cookie header directly
  res.setHeader('Set-Cookie', cookieValue);
  
  console.log('[session] Cookie set manually:', { domain: cookieDomain, origin: req.headers.origin, isPreview });
  
  if (isPreview) {
    console.log('[session] Set preview cookie (SameSite=None) for origin:', req.headers.origin);
  }
}

// Clear session cookie on logout
// CRITICAL: sameSite must match the value used when setting the cookie (SameSite=None)
// otherwise the browser won't clear it correctly
export function clearSessionCookie(res: Response, req?: Request) {
  const domains = req
    ? [resolveCookieDomain(req)]
    : [KE3P_COOKIE_DOMAIN, KEEPER_DOMAINS_COOKIE_DOMAIN];

  for (const domain of domains) {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain,
      path: '/',
    });
  }
}

function readCookieToken(req: Request): string | undefined {
  const cookies = req.cookies || {};
  for (const name of COOKIE_CANDIDATES) {
    if (cookies[name]) {
      return cookies[name] as string;
    }
  }
  return undefined;
}

// Auth middleware: prefer cookie, then Authorization header as fallback.
// Both mechanisms are accepted from all clients (browsers, CLI, server-to-server).
export function authWeb(req: Request, _res: Response, next: NextFunction) {
  // Legacy V0 sessions still ship `keeper_token`, so treat it as an alias to
  // avoid noisy /api/kam/auth/me 401s without changing the cookie contract.
  const cookieToken = readCookieToken(req);
  const headerToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  // Prefer cookie auth, but always accept Authorization header as fallback.
  // The previous restriction that blocked header auth from browsers
  // caused a dead end when cookies were unavailable (SameSite issues, browser
  // settings, cross-subdomain problems). The frontend now sends the JWT as
  // both a cookie AND a Bearer token for reliability.
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
  
  // Check production origins
  const okProd =
    origin.endsWith('.ke3p.com') ||
    referer.includes('.ke3p.com') ||
    origin.endsWith('.keeper.domains') ||
    referer.includes('.keeper.domains') ||
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

