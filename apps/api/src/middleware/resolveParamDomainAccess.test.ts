import { describe, expect, it } from 'vitest';
import { resolveParamDomainAccess } from './resolveParamDomainAccess.js';

describe('resolveParamDomainAccess', () => {
  const ownerId = 'owner-1';

  it('gives the owner full permissions', () => {
    expect(
      resolveParamDomainAccess({
        userId: ownerId,
        ownerId,
        isPublic: false,
        permission: null,
        ownsKeeperInDomain: false,
      }),
    ).toEqual({
      permissions: ['read', 'write', 'share', 'admin', 'invite', 'delete'],
      role: 'owner',
      isOwner: true,
    });
  });

  it('uses DomainPermission when present and unexpired', () => {
    expect(
      resolveParamDomainAccess({
        userId: 'member-1',
        ownerId,
        isPublic: false,
        permission: { role: 'bride', permissions: ['read', 'write'], expiresAt: null },
        ownsKeeperInDomain: false,
      }),
    ).toEqual({
      permissions: ['read', 'write'],
      role: 'bride',
      isOwner: false,
    });
  });

  it('ignores expired DomainPermission', () => {
    expect(
      resolveParamDomainAccess({
        userId: 'member-1',
        ownerId,
        isPublic: false,
        permission: {
          role: 'user',
          permissions: ['read', 'write', 'share'],
          expiresAt: new Date('2020-01-01T00:00:00.000Z'),
        },
        ownsKeeperInDomain: false,
        now: new Date('2026-09-17T00:00:00.000Z'),
      }),
    ).toEqual({
      permissions: [],
      role: 'guest',
      isOwner: false,
    });
  });

  it('keeps the keeper-in-domain relationship fallback', () => {
    expect(
      resolveParamDomainAccess({
        userId: 'keeper-owner',
        ownerId,
        isPublic: false,
        permission: null,
        ownsKeeperInDomain: true,
      }),
    ).toEqual({
      permissions: ['read', 'write'],
      role: 'member',
      isOwner: false,
    });
  });

  it('grants public read only when the Domain is public', () => {
    expect(
      resolveParamDomainAccess({
        userId: 'stranger',
        ownerId,
        isPublic: true,
        permission: null,
        ownsKeeperInDomain: false,
      }),
    ).toEqual({
      permissions: ['read'],
      role: 'guest',
      isOwner: false,
    });
  });

  it('does not grant authenticated strangers read on a private Domain', () => {
    expect(
      resolveParamDomainAccess({
        userId: 'stranger',
        ownerId,
        isPublic: false,
        permission: null,
        ownsKeeperInDomain: false,
      }),
    ).toEqual({
      permissions: [],
      role: 'guest',
      isOwner: false,
    });
  });
});
