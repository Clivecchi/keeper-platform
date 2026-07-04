import { describe, it, expect } from 'vitest';
import {
  isKeeperDomainsTenantOrigin,
  buildKeeperDomainsTenantOrigin,
  RESERVED_KEEPER_SUBDOMAINS,
} from './keeperDomainsCors.js';

describe('keeperDomainsCors', () => {
  it('allows https tenant origins on keeper.domains', () => {
    expect(isKeeperDomainsTenantOrigin('https://staging.keeper.domains')).toBe(true);
    expect(isKeeperDomainsTenantOrigin('https://livecchi.keeper.domains')).toBe(true);
    expect(isKeeperDomainsTenantOrigin('https://my-domain.keeper.domains')).toBe(true);
  });

  it('rejects reserved infrastructure subdomains', () => {
    for (const reserved of RESERVED_KEEPER_SUBDOMAINS) {
      expect(isKeeperDomainsTenantOrigin(`https://${reserved}.keeper.domains`)).toBe(false);
    }
  });

  it('rejects non-https, apex, and unrelated origins', () => {
    expect(isKeeperDomainsTenantOrigin('http://staging.keeper.domains')).toBe(false);
    expect(isKeeperDomainsTenantOrigin('https://keeper.domains')).toBe(false);
    expect(isKeeperDomainsTenantOrigin('https://evil.example')).toBe(false);
    expect(isKeeperDomainsTenantOrigin('https://www.ke3p.com')).toBe(false);
  });

  it('builds normalized tenant origins', () => {
    expect(buildKeeperDomainsTenantOrigin('Staging')).toBe('https://staging.keeper.domains');
  });
});
