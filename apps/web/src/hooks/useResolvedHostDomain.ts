'use client';

import * as React from 'react';
import {
  fetchHostDomain,
  getCachedHostDomain,
  normalizeBrandHostname,
  type ResolvedHostDomain,
} from '../lib/resolveHostDomain';
import { isKeeperPlatformWebHost, resolveTenantSlugFromHostname } from '../lib/platformHost';

export interface UseResolvedHostDomainResult {
  domain: ResolvedHostDomain | null;
  loading: boolean;
}

export function useResolvedHostDomain(): UseResolvedHostDomainResult {
  const hostname =
    typeof window !== 'undefined' ? normalizeBrandHostname(window.location.hostname) : '';

  const [domain, setDomain] = React.useState<ResolvedHostDomain | null>(() =>
    hostname ? getCachedHostDomain(hostname) : null,
  );
  const [loading, setLoading] = React.useState(() => {
    if (!hostname) return false;
    if (resolveTenantSlugFromHostname(hostname) || isKeeperPlatformWebHost(hostname)) {
      return false;
    }
    return !getCachedHostDomain(hostname);
  });

  React.useEffect(() => {
    if (!hostname) {
      setDomain(null);
      setLoading(false);
      return;
    }

    const cached = getCachedHostDomain(hostname);
    if (cached) {
      setDomain(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void fetchHostDomain(hostname).then((resolved) => {
      if (cancelled) return;
      setDomain(resolved);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [hostname]);

  return { domain, loading };
}
