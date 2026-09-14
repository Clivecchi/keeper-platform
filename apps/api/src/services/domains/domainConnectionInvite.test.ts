import { describe, expect, it, vi } from 'vitest';
import {
  invitationAcceptPath,
  looksLikeEmail,
  listDomainPeopleNotes,
  normalizeConnectionRole,
  normalizeDomainRole,
  normalizeIdentifier,
  resolveUserByIdentifier,
} from './domainConnectionInvite.js';

describe('invitationAcceptPath', () => {
  it('builds the copyable accept path without implying email delivery', () => {
    expect(invitationAcceptPath('tok/value')).toBe('/invite/accept?token=tok%2Fvalue');
  });
});

describe('listDomainConnections pending invitations', () => {
  it('includes acceptPath and never treats pending invitations as members', async () => {
    const { listDomainConnections } = await import('./domainConnectionInvite.js');
    const prisma = {
      domainPermission: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      domainInvitation: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'inv-1',
            email: 'new@example.com',
            role: 'connection',
            invitedBy: 'owner-1',
            expiresAt: new Date('2026-09-19T00:00:00.000Z'),
            createdAt: new Date('2026-09-12T00:00:00.000Z'),
            token: 'tok/value',
          },
        ]),
      },
    };

    const result = await listDomainConnections(prisma as never, 'domain-1');
    expect(result.connections).toEqual([]);
    expect(result.pendingInvitations).toEqual([
      expect.objectContaining({
        id: 'inv-1',
        email: 'new@example.com',
        status: 'pending',
        acceptPath: '/invite/accept?token=tok%2Fvalue',
      }),
    ]);
  });
});

describe('listDomainPeopleNotes', () => {
  it('keeps only invitations with seed content and skips expired pending', async () => {
    const now = Date.now();
    const prisma = {
      domainInvitation: {
        findMany: vi.fn().mockResolvedValue([
          {
            email: 'pat@example.com',
            role: 'friend',
            seed: { givenName: 'Pat', about: 'Knows Cover.' },
            acceptedAt: null,
            expiresAt: new Date(now + 86_400_000),
          },
          {
            email: 'old@example.com',
            role: 'user',
            seed: { givenName: 'Old' },
            acceptedAt: null,
            expiresAt: new Date(now - 1_000),
          },
          {
            email: 'member@example.com',
            role: 'admin',
            seed: { relation: 'studio' },
            acceptedAt: new Date(),
            expiresAt: new Date(now - 1_000),
          },
          {
            email: 'empty@example.com',
            role: 'connection',
            seed: {},
            acceptedAt: new Date(),
            expiresAt: new Date(now + 86_400_000),
          },
        ]),
      },
    };

    const notes = await listDomainPeopleNotes(prisma as never, 'domain-1');
    expect(notes).toEqual([
      {
        email: 'pat@example.com',
        role: 'friend',
        status: 'pending',
        seed: { givenName: 'Pat', about: 'Knows Cover.' },
      },
      {
        email: 'member@example.com',
        role: 'admin',
        status: 'member',
        seed: { relation: 'studio' },
      },
    ]);
  });
});

describe('domainConnectionInvite lookup helpers', () => {
  it('normalizes connection role with friend default override', () => {
    expect(normalizeConnectionRole()).toBe('connection');
    expect(normalizeConnectionRole('connection')).toBe('connection');
    expect(normalizeConnectionRole('friend')).toBe('friend');
    expect(normalizeConnectionRole('admin')).toBe('connection');
  });

  it('keeps all Domain roles on invite, not only friend and connection', () => {
    expect(normalizeDomainRole('admin')).toBe('admin');
    expect(normalizeDomainRole('user')).toBe('user');
    expect(normalizeDomainRole('friend')).toBe('friend');
    expect(normalizeDomainRole('connection')).toBe('connection');
    expect(normalizeDomainRole('unknown')).toBe('connection');
  });

  it('detects email-like identifiers', () => {
    expect(looksLikeEmail('alice@example.com')).toBe(true);
    expect(looksLikeEmail('  Bob@Domain.org  ')).toBe(true);
    expect(looksLikeEmail('Alice Smith')).toBe(false);
    expect(looksLikeEmail('not-an-email')).toBe(false);
  });

  it('trims identifiers before lookup', () => {
    expect(normalizeIdentifier('  Pat Lee  ')).toBe('Pat Lee');
  });
});

describe('resolveUserByIdentifier', () => {
  it('finds users by case-insensitive email first', async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce({ id: 'user-1', email: 'alice@example.com', name: 'Alice' });

    const prisma = { users: { findFirst } } as never;
    const result = await resolveUserByIdentifier(prisma, '  ALICE@example.com  ');

    expect(result).toEqual({ id: 'user-1', email: 'alice@example.com', name: 'Alice' });
    expect(findFirst).toHaveBeenCalledWith({
      where: { email: { equals: 'ALICE@example.com', mode: 'insensitive' } },
      select: { id: true, email: true, name: true },
    });
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it('finds users by case-insensitive display name when identifier is not an email', async () => {
    const findFirst = vi
      .fn()
      .mockResolvedValueOnce({ id: 'user-2', email: 'bob@example.com', name: 'Bob Builder' });

    const prisma = { users: { findFirst } } as never;
    const result = await resolveUserByIdentifier(prisma, 'bob builder');

    expect(result?.id).toBe('user-2');
    expect(findFirst).toHaveBeenCalledWith({
      where: { name: { equals: 'bob builder', mode: 'insensitive' } },
      select: { id: true, email: true, name: true },
    });
  });

  it('returns null when an email identifier does not match a user', async () => {
    const findFirst = vi.fn().mockResolvedValueOnce(null);
    const prisma = { users: { findFirst } } as never;

    await expect(resolveUserByIdentifier(prisma, 'casey@missing.test')).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledTimes(1);
  });

  it('returns null for blank identifiers without querying', async () => {
    const findFirst = vi.fn();
    const prisma = { users: { findFirst } } as never;

    await expect(resolveUserByIdentifier(prisma, '   ')).resolves.toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
  });
});
