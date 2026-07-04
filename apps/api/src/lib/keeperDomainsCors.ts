/**
 * CORS origin validation for tenant hosts on *.keeper.domains.
 * Mirrors RESERVED_KEEPER_SUBDOMAINS in apps/web/src/lib/platformHost.ts.
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

/** True for https://{slug}.keeper.domains when slug is a valid tenant (not reserved). */
export function isKeeperDomainsTenantOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') return false;
    if (url.username || url.password) return false;
    return resolveTenantSlugFromHostname(url.hostname) !== null;
  } catch {
    return false;
  }
}

export function buildKeeperDomainsTenantOrigin(slug: string): string {
  return `https://${slug.trim().toLowerCase()}.${KEEPER_DOMAINS_SUFFIX}`;
}
