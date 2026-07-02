import { describe, expect, it } from 'vitest';
import { resolveDomainAudience } from './resolveDomainAudience.js';

describe('resolveDomainAudience', () => {
  it('returns guest when unauthenticated', () => {
    expect(
      resolveDomainAudience({
        isAuthenticated: false,
        isAdmin: false,
        isOwner: false,
        domainRole: 'admin',
      }),
    ).toBe('guest');
  });

  it('returns admin for platform admin', () => {
    expect(
      resolveDomainAudience({
        isAuthenticated: true,
        isAdmin: true,
        isOwner: false,
        domainRole: null,
      }),
    ).toBe('admin');
  });

  it('returns admin for domain owner and domain admin role', () => {
    expect(
      resolveDomainAudience({
        isAuthenticated: true,
        isAdmin: false,
        isOwner: true,
        domainRole: null,
      }),
    ).toBe('admin');

    expect(
      resolveDomainAudience({
        isAuthenticated: true,
        isAdmin: false,
        isOwner: false,
        domainRole: 'admin',
      }),
    ).toBe('admin');
  });

  it('returns friend for friend and connection domain roles', () => {
    expect(
      resolveDomainAudience({
        isAuthenticated: true,
        isAdmin: false,
        isOwner: false,
        domainRole: 'friend',
      }),
    ).toBe('friend');

    expect(
      resolveDomainAudience({
        isAuthenticated: true,
        isAdmin: false,
        isOwner: false,
        domainRole: 'connection',
      }),
    ).toBe('friend');
  });

  it('returns keeper for user role and authenticated visitors without membership', () => {
    expect(
      resolveDomainAudience({
        isAuthenticated: true,
        isAdmin: false,
        isOwner: false,
        domainRole: 'user',
      }),
    ).toBe('keeper');

    expect(
      resolveDomainAudience({
        isAuthenticated: true,
        isAdmin: false,
        isOwner: false,
        domainRole: null,
      }),
    ).toBe('keeper');
  });
});
