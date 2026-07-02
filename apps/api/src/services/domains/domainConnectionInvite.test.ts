import { describe, expect, it, vi } from 'vitest';
import {
  looksLikeEmail,
  normalizeConnectionRole,
  normalizeIdentifier,
  resolveUserByIdentifier,
} from './domainConnectionInvite.js';

describe('domainConnectionInvite lookup helpers', () => {
  it('normalizes connection role with friend default override', () => {
    expect(normalizeConnectionRole()).toBe('connection');
    expect(normalizeConnectionRole('connection')).toBe('connection');
    expect(normalizeConnectionRole('friend')).toBe('friend');
    expect(normalizeConnectionRole('admin')).toBe('connection');
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
