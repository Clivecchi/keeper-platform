import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useResolvedHostDomain } from '../hooks/useResolvedHostDomain';
import { normalizeBrandHostname } from '../lib/resolveHostDomain';
import { isKeeperPlatformWebHost, resolveTenantSlugFromHostname } from '../lib/platformHost';

/**
 * Safety net only: if a bookmarked URL has the wrong `/d/:slug` on a tenant host,
 * align it with the hostname. Primary routing resolves the correct slug at `/` — no ke3p detour.
 */
export function HostnameSlugGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { domain, loading } = useResolvedHostDomain();

  const hostname =
    typeof window !== 'undefined' ? normalizeBrandHostname(window.location.hostname) : '';
  const tenantSlug = hostname ? resolveTenantSlugFromHostname(hostname) : null;
  const canonicalSlug =
    tenantSlug ??
    (domain?.source === 'custom_domain' || domain?.source === 'tenant_subdomain'
      ? domain.slug
      : null);

  if (loading && !tenantSlug && !isKeeperPlatformWebHost(hostname)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm opacity-70">Loading…</div>
      </div>
    );
  }

  if (!canonicalSlug) return <>{children}</>;

  const match = location.pathname.match(/^\/d\/([^/]+)/);
  if (match && match[1].toLowerCase() !== canonicalSlug.toLowerCase()) {
    const search = location.search || '';
    return <Navigate to={`/d/${encodeURIComponent(canonicalSlug)}${search}`} replace />;
  }

  return <>{children}</>;
}
