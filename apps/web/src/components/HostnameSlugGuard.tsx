import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { resolveTenantSlugFromHostname } from '../lib/platformHost';

/**
 * When the browser host is `{slug}.keeper.domains`, keep `/d/:slug` aligned with the hostname.
 */
export function HostnameSlugGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const tenantSlug =
    typeof window !== 'undefined'
      ? resolveTenantSlugFromHostname(window.location.hostname)
      : null;

  if (!tenantSlug) return <>{children}</>;

  const match = location.pathname.match(/^\/d\/([^/]+)/);
  if (match && match[1] !== tenantSlug) {
    const search = location.search || '';
    return <Navigate to={`/d/${tenantSlug}${search}`} replace />;
  }

  return <>{children}</>;
}
