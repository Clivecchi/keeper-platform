import { describe, it, expect } from 'vitest';
import {
  KEEPER_DOMAINS_SUFFIX,
  RESERVED_KEEPER_SUBDOMAINS,
  resolveTenantSlugFromHostname,
  buildKeeperTenantHostname,
  buildKeeperTenantOrigin,
  isKeeperDomainsPlatformHostname,
  isKeeperDomainsNonTenantHostname,
} from './keeperDomainsHost.js';

describe('keeperDomainsHost', () => {
  it('resolves tenant slug from hostname', () => {
    expect(resolveTenantSlugFromHostname('staging.keeper.domains')).toBe('staging');
    expect(resolveTenantSlugFromHostname('chuck-livecchi.keeper.domains')).toBe('chuck-livecchi');
  });

  it('returns null for reserved and platform keeper.domains hosts', () => {
    expect(resolveTenantSlugFromHostname('www.keeper.domains')).toBeNull();
    expect(resolveTenantSlugFromHostname('api.keeper.domains')).toBeNull();
    expect(resolveTenantSlugFromHostname('keeper.domains')).toBeNull();
    expect(resolveTenantSlugFromHostname('ke3p.com')).toBeNull();
    for (const reserved of RESERVED_KEEPER_SUBDOMAINS) {
      expect(resolveTenantSlugFromHostname(`${reserved}.keeper.domains`)).toBeNull();
    }
  });

  it('builds tenant hostnames and origins', () => {
    expect(buildKeeperTenantHostname('Staging')).toBe('staging.keeper.domains');
    expect(buildKeeperTenantOrigin('staging')).toBe('https://staging.keeper.domains');
    expect(KEEPER_DOMAINS_SUFFIX).toBe('keeper.domains');
  });

  it('detects platform vs non-tenant keeper.domains hosts', () => {
    expect(isKeeperDomainsPlatformHostname('keeper.domains')).toBe(true);
    expect(isKeeperDomainsPlatformHostname('www.keeper.domains')).toBe(true);
    expect(isKeeperDomainsPlatformHostname('staging.keeper.domains')).toBe(false);
    expect(isKeeperDomainsNonTenantHostname('api.keeper.domains')).toBe(true);
    expect(isKeeperDomainsNonTenantHostname('staging.keeper.domains')).toBe(false);
  });
});
