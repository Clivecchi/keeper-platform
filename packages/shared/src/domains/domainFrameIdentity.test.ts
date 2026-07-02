import { describe, expect, it } from 'vitest';
import {
  domainFrameLooksUnseeded,
  isPlatformFrameTagline,
  isPlatformFrameWordmark,
} from './domainFrameIdentity.js';

describe('domainFrameIdentity', () => {
  it('detects platform wordmarks and taglines', () => {
    expect(isPlatformFrameWordmark('KE3P')).toBe(true);
    expect(isPlatformFrameWordmark('Keeper')).toBe(true);
    expect(isPlatformFrameWordmark('livecchi.us')).toBe(false);
    expect(isPlatformFrameTagline('cryptically designed, wonderfully underfolded')).toBe(true);
    expect(isPlatformFrameTagline('Realm of the old ones')).toBe(false);
  });

  it('flags personal domains with platform fallback wordmark', () => {
    expect(
      domainFrameLooksUnseeded(
        { theme: { wordmark: 'KE3P', tagline: '' }, domain: 'livecchi-us' },
        'livecchi-us',
        'livecchi.us',
      ),
    ).toBe(true);
  });

  it('flags personal domains with domain wordmark but platform tagline', () => {
    expect(
      domainFrameLooksUnseeded(
        {
          theme: { wordmark: 'livecchi.us', tagline: 'cryptically designed, wonderfully underfolded' },
          domain: 'livecchi-us',
          keeper_type: 'domain',
        },
        'livecchi-us',
        'livecchi.us',
      ),
    ).toBe(true);
  });

  it('returns false when identity matches the domain', () => {
    expect(
      domainFrameLooksUnseeded(
        {
          theme: { wordmark: 'livecchi.us', tagline: 'Realm of the old ones' },
          domain: 'livecchi-us',
          keeper_type: 'domain',
          kip: { agent_id: 'livecchi-us-lead', greeting: 'Welcome to livecchi.us.' },
        },
        'livecchi-us',
        'livecchi.us',
      ),
    ).toBe(false);
  });

  it('never treats the platform default hub as unseeded', () => {
    expect(
      domainFrameLooksUnseeded(
        { theme: { wordmark: 'KE3P', tagline: 'cryptically designed, wonderfully underfolded' } },
        'default',
        'Default',
      ),
    ).toBe(false);
  });

  it('detects persisted platform keeper_type and kip defaults', () => {
    expect(
      domainFrameLooksUnseeded(
        {
          keeper_type: 'platform',
          kip: { agent_id: 'kip-default', greeting: 'Hello. What would you like to keep today?' },
        },
        'chuck-livecchi',
        'Chuck Livecchi',
      ),
    ).toBe(true);
  });
});
