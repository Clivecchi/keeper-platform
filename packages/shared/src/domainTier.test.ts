import { describe, expect, it } from 'vitest';
import {
  applyTierToResolvedProviderKey,
  getDomainTierKeyPolicy,
  isKeySourceAllowedForTier,
  parseDomainTier,
} from '@keeper/shared';

describe('domainTier', () => {
  it('defaults personal domains to free tier', () => {
    expect(parseDomainTier({ slug: 'chuck-livecchi' })).toBe('free');
  });

  it('defaults platform canonical slug to studio', () => {
    expect(parseDomainTier({ slug: 'default' })).toBe('studio');
  });

  it('reads tier from settings over slug fallback', () => {
    expect(parseDomainTier({ slug: 'default', settings: { tier: 'keeper' } })).toBe('keeper');
  });

  it('free tier allows included but not BYOK', () => {
    const policy = getDomainTierKeyPolicy('free');
    expect(isKeySourceAllowedForTier('platform', policy)).toBe(true);
    expect(isKeySourceAllowedForTier('user', policy)).toBe(false);
  });

  it('keeper tier allows BYOK and included', () => {
    const policy = getDomainTierKeyPolicy('keeper');
    expect(isKeySourceAllowedForTier('platform', policy)).toBe(true);
    expect(isKeySourceAllowedForTier('user', policy)).toBe(true);
  });

  it('applyTier strips user keys on free tier', () => {
    const policy = getDomainTierKeyPolicy('free');
    expect(
      applyTierToResolvedProviderKey({ key: 'sk-test', source: 'user' }, policy),
    ).toEqual({ key: null, source: 'none' });
  });
});
