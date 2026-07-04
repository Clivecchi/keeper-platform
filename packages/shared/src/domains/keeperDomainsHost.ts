/**
 * Shared hostname helpers for keeper.domains tenant resolution.
 * Aligns with apps/web/src/lib/platformHost.ts and apps/api keeperDomainsCors.
 */

export const KEEPER_DOMAINS_SUFFIX = 'keeper.domains' as const;

/** Infrastructure subdomains — not tenant slugs. */
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

export function resolveTenantSlugFromHostname(hostname: string): string | null {
  const host = hostname.toLowerCase();
  if (!host.endsWith(`.${KEEPER_DOMAINS_SUFFIX}`)) return null;
  const subdomain = host.slice(0, -(KEEPER_DOMAINS_SUFFIX.length + 1));
  if (!subdomain || RESERVED_KEEPER_SUBDOMAINS.has(subdomain)) return null;
  return subdomain;
}

export function buildKeeperTenantHostname(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return KEEPER_DOMAINS_SUFFIX;
  return `${normalized}.${KEEPER_DOMAINS_SUFFIX}`;
}

export function buildKeeperTenantOrigin(slug: string): string {
  return `https://${buildKeeperTenantHostname(slug)}`;
}

/** Apex or www — platform web hosts, not tenant slugs. */
export function isKeeperDomainsPlatformHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === KEEPER_DOMAINS_SUFFIX || host === `www.${KEEPER_DOMAINS_SUFFIX}`;
}

/** Host is platform/reserved on keeper.domains (not a tenant slug host). */
export function isKeeperDomainsNonTenantHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host.endsWith(`.${KEEPER_DOMAINS_SUFFIX}`) && host !== KEEPER_DOMAINS_SUFFIX) {
    return false;
  }
  return resolveTenantSlugFromHostname(host) === null;
}
