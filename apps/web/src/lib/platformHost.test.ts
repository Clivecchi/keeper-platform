import { describe, expect, it } from 'vitest';
import {
  isKeeperDomainsHost,
  isKe3pPlatformHost,
  resolveDefaultDomainSlugFromHostname,
  resolvePostAuthPath,
  resolveTenantSlugFromHostname,
  usesSameOriginApi,
} from './platformHost';

describe('platformHost', () => {
  it('detects ke3p platform hosts', () => {
    expect(isKe3pPlatformHost('www.ke3p.com')).toBe(true);
    expect(isKe3pPlatformHost('ke3p.com')).toBe(true);
    expect(isKe3pPlatformHost('staging.keeper.domains')).toBe(false);
  });

  it('detects keeper.domains hosts for same-origin API', () => {
    expect(isKeeperDomainsHost('staging.keeper.domains')).toBe(true);
    expect(isKeeperDomainsHost('www.keeper.domains')).toBe(true);
    expect(isKeeperDomainsHost('keeper.domains')).toBe(true);
    expect(usesSameOriginApi('staging.keeper.domains')).toBe(true);
    expect(usesSameOriginApi('www.ke3p.com')).toBe(true);
    expect(usesSameOriginApi('evil.example')).toBe(false);
  });

  it('resolves tenant slug from subdomain', () => {
    expect(resolveTenantSlugFromHostname('staging.keeper.domains')).toBe('staging');
    expect(resolveTenantSlugFromHostname('chuck-livecchi.keeper.domains')).toBe('chuck-livecchi');
    expect(resolveTenantSlugFromHostname('www.keeper.domains')).toBeNull();
    expect(resolveTenantSlugFromHostname('api.keeper.domains')).toBeNull();
    expect(resolveTenantSlugFromHostname('services.keeper.domains')).toBeNull();
    expect(resolveTenantSlugFromHostname('www.ke3p.com')).toBeNull();
  });

  it('resolves default domain slug', () => {
    expect(resolveDefaultDomainSlugFromHostname('staging.keeper.domains')).toBe('staging');
    expect(resolveDefaultDomainSlugFromHostname('www.ke3p.com')).toBe('ke3p');
    expect(resolveDefaultDomainSlugFromHostname('www.keeper.domains')).toBe('ke3p');
    expect(resolveDefaultDomainSlugFromHostname('livecchi.us')).toBeNull();
  });

  it('resolves post-auth path for tenant hosts', () => {
    expect(resolvePostAuthPath('staging.keeper.domains')).toBe('/?board=domain');
    expect(resolvePostAuthPath('www.ke3p.com')).toBe('/home');
    expect(resolvePostAuthPath('staging.keeper.domains', '/settings')).toBe('/settings');
  });
});
