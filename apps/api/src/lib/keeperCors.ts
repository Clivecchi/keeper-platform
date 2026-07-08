/**
 * Keeper web CORS — static allowlist, tenant *.keeper.domains, verified custom domains,
 * and same-site custom domains via x-forwarded-host (Vercel → Railway rewrites).
 */

import type { Request, Response, NextFunction } from 'express';
import type { PrismaClient } from '@keeper/database';
import { isKeeperDomainsTenantOrigin } from './keeperDomainsCors.js';

export interface KeeperCorsStaticConfig {
  allowlist: Set<string>;
  wildcards: RegExp[];
  methods: string[];
  allowedHeaders: string[];
  maxAge: number;
}

const verifiedCustomDomainHosts = new Set<string>();
let refreshTimer: ReturnType<typeof setInterval> | null = null;

export function parseOriginHostname(origin: string): string | null {
  try {
    const url = new URL(origin);
    if (url.username || url.password) return null;
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export function readForwardedHost(req: Pick<Request, 'get'>): string | null {
  const raw = req.get('x-forwarded-host') || req.get('x-vercel-forwarded-host') || '';
  const host = raw.split(',')[0]?.trim().split(':')[0]?.toLowerCase() ?? '';
  return host || null;
}

export function isCachedVerifiedCustomDomainHost(hostname: string): boolean {
  return verifiedCustomDomainHosts.has(hostname.trim().toLowerCase());
}

export async function refreshVerifiedCustomDomainHosts(
  db: Pick<PrismaClient, 'domain'>,
): Promise<void> {
  const rows = await db.domain.findMany({
    where: {
      customDomainVerified: true,
      customDomain: { not: null },
      deletedAt: null,
    },
    select: { customDomain: true },
  });

  verifiedCustomDomainHosts.clear();
  for (const row of rows) {
    const host = row.customDomain?.trim().toLowerCase();
    if (host) verifiedCustomDomainHosts.add(host);
  }
}

export function scheduleVerifiedCustomDomainRefresh(
  db: Pick<PrismaClient, 'domain'>,
  intervalMs = 5 * 60 * 1000,
): void {
  if (refreshTimer) return;
  void refreshVerifiedCustomDomainHosts(db).catch((err) => {
    console.warn('[keeperCors] Initial custom-domain refresh failed:', err);
  });
  refreshTimer = setInterval(() => {
    void refreshVerifiedCustomDomainHosts(db).catch((err) => {
      console.warn('[keeperCors] Custom-domain refresh failed:', err);
    });
  }, intervalMs);
}

function isPreviewOriginAllowed(origin: string): boolean {
  if (process.env.WEB_PREVIEW_ALLOW !== '1') return false;
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

export function isKeeperWebOriginAllowed(
  origin: string | undefined,
  req: Pick<Request, 'get'> | undefined,
  config: KeeperCorsStaticConfig,
): boolean {
  if (!origin) return true;

  if (config.allowlist.size === 0 && config.wildcards.length === 0) return true;
  if (config.allowlist.has(origin)) return true;
  if (config.wildcards.some((rx) => rx.test(origin))) return true;
  if (isKeeperDomainsTenantOrigin(origin)) return true;
  if (isPreviewOriginAllowed(origin)) return true;

  const originHost = parseOriginHostname(origin);
  if (!originHost) return false;

  const forwardedHost = req ? readForwardedHost(req) : null;
  if (forwardedHost && originHost === forwardedHost) return true;

  if (isCachedVerifiedCustomDomainHost(originHost)) return true;

  return false;
}

export function createKeeperCorsMiddleware(config: KeeperCorsStaticConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const origin = req.get('origin');

    if (origin) {
      const allow = isKeeperWebOriginAllowed(origin, req, config);
      if (!allow) {
        res.status(403).json({
          success: false,
          error: 'CORS_ORIGIN_NOT_ALLOWED',
          message: 'CORS: origin not allowed',
        });
        return;
      }

      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    if (req.method === 'OPTIONS') {
      if (origin) {
        res.setHeader('Access-Control-Allow-Methods', config.methods.join(','));
        res.setHeader('Access-Control-Allow-Headers', config.allowedHeaders.join(','));
        res.setHeader('Access-Control-Max-Age', String(config.maxAge));
      }
      res.sendStatus(204);
      return;
    }

    next();
  };
}
