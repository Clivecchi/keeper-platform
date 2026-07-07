/**
 * Platform vs tenant host detection for ke3p.com and *.keeper.domains.
 */

export const KEEPER_DOMAINS_SUFFIX = 'keeper.domains' as const;

/** Subdomains that are infrastructure — not tenant slugs. */
export const RESERVED_KEEPER_SUBDOMAINS = new Set([
  'www',
  'api',
  'app',
  'studio',
  'docs',
  'support',
  'status',
  'blog',
  'services',
]);

/** Browser hostname for routing — safe when callers omit hostname (e.g. buildRealmShellPath). */
export function resolveWebHostname(hostname?: string): string {
  const explicit = hostname?.trim();
  if (explicit) return explicit.split(':')[0] ?? '';
  if (typeof window !== 'undefined') {
    return window.location.hostname.split(':')[0] ?? '';
  }
  return '';
}

export function isKe3pPlatformHost(hostname?: string): boolean {
  const host = resolveWebHostname(hostname).toLowerCase();
  return host === 'ke3p.com' || host === 'www.ke3p.com';
}

export function isKeeperDomainsHost(hostname?: string): boolean {
  const host = resolveWebHostname(hostname).toLowerCase();
  return host === KEEPER_DOMAINS_SUFFIX || host.endsWith(`.${KEEPER_DOMAINS_SUFFIX}`);
}

/** Hosts that use same-origin `/api` (Vercel rewrite → Railway). */
export function usesSameOriginApi(hostname?: string): boolean {
  const host = resolveWebHostname(hostname).toLowerCase();
  if (isKe3pPlatformHost(host) || isKeeperDomainsHost(host)) return true;
  // Custom domains on the same Vercel project share /api rewrites (see vercel.json).
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD && !host.includes('localhost')) {
    return true;
  }
  return false;
}

export function isKeeperPlatformWebHost(hostname?: string): boolean {
  const host = resolveWebHostname(hostname).toLowerCase();
  if (isKe3pPlatformHost(host)) return true;
  return host === KEEPER_DOMAINS_SUFFIX || host === `www.${KEEPER_DOMAINS_SUFFIX}`;
}

/**
 * Tenant slug from hostname, or null for platform / reserved / non-keeper hosts.
 * staging.keeper.domains → "staging"
 * www.keeper.domains / ke3p.com → null (use default platform slug)
 */
export function resolveTenantSlugFromHostname(hostname?: string): string | null {
  const host = resolveWebHostname(hostname).toLowerCase();
  if (!host) return null;
  if (!host.endsWith(`.${KEEPER_DOMAINS_SUFFIX}`)) return null;
  const subdomain = host.slice(0, -(KEEPER_DOMAINS_SUFFIX.length + 1));
  if (!subdomain || RESERVED_KEEPER_SUBDOMAINS.has(subdomain)) return null;
  return subdomain;
}

export function buildKeeperTenantHostname(slug: string): string {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return KEEPER_DOMAINS_SUFFIX
  return `${normalized}.${KEEPER_DOMAINS_SUFFIX}`
}

/** Hosts that default to the platform ke3p slug without an API lookup. */
export function usesPlatformDefaultSlug(hostname?: string): boolean {
  return isKeeperPlatformWebHost(hostname) || isKe3pPlatformHost(hostname);
}

/**
 * Brand URL (e.g. livecchi.us) or tenant `*.keeper.domains` — realm renders at `/`, not `/d/:slug`.
 */
export function usesCleanRealmPaths(hostname?: string): boolean {
  const host = resolveWebHostname(hostname).toLowerCase();
  if (!host) return false;
  if (host.includes('localhost') || host.includes('127.0.0.1')) return false;
  return !!resolveTenantSlugFromHostname(host) || isBrandCustomHost(host);
}

/**
 * Brand URL (e.g. livecchi.us) — same realm as `{slug}.keeper.domains`, resolved via API.
 * Must never fall back to the platform ke3p slug.
 */
export function isBrandCustomHost(hostname?: string): boolean {
  const host = resolveWebHostname(hostname).toLowerCase();
  if (!host) return false;
  if (host.includes('localhost') || host.includes('127.0.0.1')) return false;
  if (resolveTenantSlugFromHostname(host)) return false;
  if (usesPlatformDefaultSlug(host)) return false;
  return true;
}

/** Default domain board slug for the current host. */
export function resolveDefaultDomainSlugFromHostname(hostname?: string): string | null {
  const tenantSlug = resolveTenantSlugFromHostname(hostname);
  if (tenantSlug) return tenantSlug;
  if (usesPlatformDefaultSlug(hostname)) return 'ke3p';
  return null;
}

/** Post-login landing when no explicit returnTo is provided. */
export function resolvePostAuthPath(hostname?: string, returnTo?: string): string {
  if (returnTo?.trim()) return returnTo;
  const tenantSlug = resolveTenantSlugFromHostname(hostname);
  if (tenantSlug) {
    if (usesCleanRealmPaths(hostname)) return '/?board=domain';
    return `/d/${encodeURIComponent(tenantSlug)}?board=domain`;
  }
  return '/home';
}
