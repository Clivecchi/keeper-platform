/**
 * Resolve the Keeper domain slug for the current browser hostname.
 * Supports *.keeper.domains, platform hosts, and verified custom domains.
 */

import { getApiBase } from './apiFetch';
import {
  isKeeperPlatformWebHost,
  resolveDefaultDomainSlugFromHostname,
  resolvePostAuthPath,
  resolveTenantSlugFromHostname,
} from './platformHost';

export interface ResolvedHostDomain {
  slug: string;
  id?: string;
  name?: string;
  customDomain?: string | null;
  source: 'tenant_subdomain' | 'platform' | 'custom_domain' | 'fallback';
}

interface HostSlugCacheEntry {
  hostname: string;
  domain: ResolvedHostDomain | null;
}

let hostSlugCache: HostSlugCacheEntry | null = null;

export function normalizeBrandHostname(hostname: string): string {
  const host = hostname.trim().toLowerCase().split(':')[0] ?? '';
  if (host.startsWith('www.')) return host.slice(4);
  return host;
}

function resolveSyncHostDomain(hostname: string): ResolvedHostDomain | null {
  const normalized = normalizeBrandHostname(hostname);
  const tenantSlug = resolveTenantSlugFromHostname(normalized);
  if (tenantSlug) {
    return { slug: tenantSlug, source: 'tenant_subdomain' };
  }
  if (isKeeperPlatformWebHost(normalized)) {
    return { slug: 'ke3p', source: 'platform' };
  }
  return null;
}

export function getCachedHostDomain(hostname: string): ResolvedHostDomain | null {
  const normalized = normalizeBrandHostname(hostname);
  const sync = resolveSyncHostDomain(normalized);
  if (sync) return sync;
  if (hostSlugCache?.hostname === normalized) return hostSlugCache.domain;
  return null;
}

export async function fetchHostDomain(hostname: string): Promise<ResolvedHostDomain> {
  const normalized = normalizeBrandHostname(hostname);
  const sync = resolveSyncHostDomain(normalized);
  if (sync) return sync;

  if (hostSlugCache?.hostname === normalized && hostSlugCache.domain) {
    return hostSlugCache.domain;
  }

  try {
    const base = getApiBase();
    const response = await fetch(
      `${base}/api/domains/resolve-host/${encodeURIComponent(normalized)}`,
    );
    if (!response.ok) {
      hostSlugCache = { hostname: normalized, domain: null };
      return {
        slug: resolveDefaultDomainSlugFromHostname(normalized),
        source: 'fallback',
      };
    }

    const data = (await response.json()) as {
      slug?: string;
      id?: string;
      name?: string;
      customDomain?: string | null;
    };

    if (!data.slug) {
      hostSlugCache = { hostname: normalized, domain: null };
      return {
        slug: resolveDefaultDomainSlugFromHostname(normalized),
        source: 'fallback',
      };
    }

    const resolved: ResolvedHostDomain = {
      slug: data.slug,
      id: data.id,
      name: data.name,
      customDomain: data.customDomain,
      source: 'custom_domain',
    };
    hostSlugCache = { hostname: normalized, domain: resolved };
    return resolved;
  } catch {
    return {
      slug: resolveDefaultDomainSlugFromHostname(normalized),
      source: 'fallback',
    };
  }
}

export function resolveLandingPathAfterAuth(
  hostname: string,
  returnTo?: string | null,
): string {
  if (returnTo?.trim()) return returnTo.trim();
  const cached = getCachedHostDomain(hostname);
  if (cached?.source === 'custom_domain') {
    return `/d/${encodeURIComponent(cached.slug)}?board=domain`;
  }
  return resolvePostAuthPath(hostname);
}

export function buildDefaultPathForHost(
  hostname: string,
  isAuthenticated: boolean,
  searchParams: URLSearchParams,
): string {
  const cached = getCachedHostDomain(hostname);
  const slug =
    cached?.slug ?? resolveDefaultDomainSlugFromHostname(normalizeBrandHostname(hostname));
  const params = new URLSearchParams(searchParams);

  if (isAuthenticated && isKeeperPlatformWebHost(normalizeBrandHostname(hostname))) {
    return '/home';
  }

  if (cached?.source === 'custom_domain' && !isAuthenticated) {
    if (!params.get('board') && !params.get('frame')) {
      params.delete('board');
      params.set('frame', 'cover');
    }
    return `/d/${encodeURIComponent(slug)}?${params.toString()}`;
  }

  if (!params.get('board') && !params.get('frame')) {
    params.set('board', 'domain');
  }
  return `/d/${encodeURIComponent(slug)}?${params.toString()}`;
}
