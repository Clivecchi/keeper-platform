/**
 * Resolve the Keeper domain slug for the current browser hostname.
 * Supports *.keeper.domains, platform hosts, and verified custom domains.
 */

import { getApiBase } from './apiFetch';
import {
  isBrandCustomHost,
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
  source: 'tenant_subdomain' | 'platform' | 'custom_domain' | 'fallback' | 'unresolved';
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
  if (isBrandCustomHost(normalized)) {
    return null;
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
      if (isBrandCustomHost(normalized)) {
        return { slug: '', source: 'unresolved' };
      }
      hostSlugCache = { hostname: normalized, domain: null };
      const fallbackSlug = resolveDefaultDomainSlugFromHostname(normalized);
      return {
        slug: fallbackSlug ?? 'ke3p',
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
      if (isBrandCustomHost(normalized)) {
        return { slug: '', source: 'unresolved' };
      }
      hostSlugCache = { hostname: normalized, domain: null };
      const fallbackSlug = resolveDefaultDomainSlugFromHostname(normalized);
      return {
        slug: fallbackSlug ?? 'ke3p',
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
    if (isBrandCustomHost(normalized)) {
      return { slug: '', source: 'unresolved' };
    }
    const fallbackSlug = resolveDefaultDomainSlugFromHostname(normalized);
    return {
      slug: fallbackSlug ?? 'ke3p',
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
): string | null {
  const cached = getCachedHostDomain(hostname);
  const normalized = normalizeBrandHostname(hostname);

  if (cached?.source === 'unresolved') return null;

  const slug = cached?.slug ?? resolveDefaultDomainSlugFromHostname(normalized);
  if (!slug) return null;

  const params = new URLSearchParams(searchParams);

  if (isAuthenticated && isKeeperPlatformWebHost(normalized)) {
    return '/home';
  }

  const isTenantOrBrand =
    cached?.source === 'custom_domain' || cached?.source === 'tenant_subdomain';

  if (isTenantOrBrand && !isAuthenticated) {
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
