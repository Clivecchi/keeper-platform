import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { usesCleanRealmPaths } from '../lib/realmPaths';

/**
 * On brand hosts, strip legacy `/d/:slug` paths — realm lives at `/`.
 * Platform hosts keep `/d/:slug` alignment via tenant subdomain rules.
 */
export function HostnameSlugGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const hostname =
    typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';

  if (usesCleanRealmPaths(hostname)) {
    const legacyMatch = location.pathname.match(/^\/d\/[^/]+/);
    if (legacyMatch) {
      const search = location.search || '';
      return <Navigate to={search || '/'} replace />;
    }
    return <>{children}</>;
  }

  return <>{children}</>;
}
