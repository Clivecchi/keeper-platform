import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizeJourneyListScope } from './journeyListScope.js';

function createDb(overrides?: {
  domain?: Record<string, { ownerId: string; isPublic: boolean }>;
  permissions?: Record<string, { role: string; permissions: string[]; expiresAt: Date | null }>;
  keepers?: Record<string, { domainId: string | null; ownerId?: string }>;
  ownedKeepers?: string[];
}) {
  const domains = overrides?.domain ?? {};
  const permissions = overrides?.permissions ?? {};
  const keepers = overrides?.keepers ?? {};
  const ownedKeepers = overrides?.ownedKeepers ?? [];

  return {
    domain: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const row = domains[where.id];
        return row ? { id: where.id, ownerId: row.ownerId, isPublic: row.isPublic } : null;
      }),
    },
    domainPermission: {
      findFirst: vi.fn(async ({ where }: { where: { domainId: string; userId: string } }) => {
        return permissions[`${where.domainId}:${where.userId}`] ?? null;
      }),
    },
    keeper: {
      findFirst: vi.fn(async ({ where }: { where: { domainId: string; ownerId: string } }) => {
        return ownedKeepers.includes(`${where.domainId}:${where.ownerId}`) ? { id: 'owned-keeper' } : null;
      }),
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
        const row = keepers[where.id];
        return row ? { id: where.id, domainId: row.domainId } : null;
      }),
    },
  };
}

describe('authorizeJourneyListScope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects an unscoped list', async () => {
    const result = await authorizeJourneyListScope(createDb() as never, { userId: 'user-1' });
    expect(result).toMatchObject({
      ok: false,
      status: 400,
      body: { error: 'domainId or keeperId is required' },
    });
  });

  it('returns scoped journeys for an authorized domain owner', async () => {
    const db = createDb({
      domain: { 'domain-a': { ownerId: 'user-1', isPublic: false } },
    });
    const result = await authorizeJourneyListScope(db as never, {
      userId: 'user-1',
      domainId: 'domain-a',
    });
    expect(result).toEqual({
      ok: true,
      where: { domainId: 'domain-a' },
      keeperDomainUnresolved: false,
    });
  });

  it('rejects a domain the caller cannot access', async () => {
    const db = createDb({
      domain: { 'domain-b': { ownerId: 'other', isPublic: false } },
    });
    const result = await authorizeJourneyListScope(db as never, {
      userId: 'user-1',
      domainId: 'domain-b',
    });
    expect(result).toMatchObject({
      ok: false,
      status: 403,
      body: { error: 'Insufficient permissions', required: ['read'] },
    });
  });

  it('authorizes a member with an explicit DomainPermission read grant', async () => {
    const db = createDb({
      domain: { 'domain-a': { ownerId: 'owner', isPublic: false } },
      permissions: {
        'domain-a:user-1': { role: 'member', permissions: ['read'], expiresAt: null },
      },
    });
    const result = await authorizeJourneyListScope(db as never, {
      userId: 'user-1',
      domainId: 'domain-a',
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.where).toEqual({ domainId: 'domain-a' });
  });

  it('rejects keeper-only listing when the caller cannot access the Keeper domain', async () => {
    const db = createDb({
      domain: { 'domain-a': { ownerId: 'owner', isPublic: false } },
      keepers: { 'keeper-1': { domainId: 'domain-a' } },
    });
    const result = await authorizeJourneyListScope(db as never, {
      userId: 'user-1',
      keeperId: 'keeper-1',
    });
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it('preserves keeper-scoped listing when the caller can access the Keeper domain', async () => {
    const db = createDb({
      domain: { 'domain-a': { ownerId: 'user-1', isPublic: false } },
      keepers: { 'keeper-1': { domainId: 'domain-a' } },
    });
    const result = await authorizeJourneyListScope(db as never, {
      userId: 'user-1',
      keeperId: 'keeper-1',
    });
    expect(result).toEqual({
      ok: true,
      where: { keeperId: 'keeper-1' },
      keeperDomainUnresolved: false,
    });
  });

  it('intersects domainId and keeperId after authorizing both visible domains', async () => {
    const db = createDb({
      domain: { 'domain-a': { ownerId: 'user-1', isPublic: false } },
      keepers: { 'keeper-1': { domainId: 'domain-a' } },
    });
    const result = await authorizeJourneyListScope(db as never, {
      userId: 'user-1',
      domainId: 'domain-a',
      keeperId: 'keeper-1',
    });
    expect(result).toEqual({
      ok: true,
      where: { domainId: 'domain-a', keeperId: 'keeper-1' },
      keeperDomainUnresolved: false,
    });
  });

  it('rejects domain+keeper when the Keeper belongs to a Domain the caller cannot access', async () => {
    const db = createDb({
      domain: {
        'domain-a': { ownerId: 'user-1', isPublic: false },
        'domain-b': { ownerId: 'other', isPublic: false },
      },
      keepers: { 'keeper-b': { domainId: 'domain-b' } },
    });
    const result = await authorizeJourneyListScope(db as never, {
      userId: 'user-1',
      domainId: 'domain-a',
      keeperId: 'keeper-b',
    });
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it('keeps keeper-only listing when Keeper.domainId is null and flags the ambiguity', async () => {
    const db = createDb({
      keepers: { 'keeper-orphan': { domainId: null } },
    });
    const result = await authorizeJourneyListScope(db as never, {
      userId: 'user-1',
      keeperId: 'keeper-orphan',
    });
    expect(result).toEqual({
      ok: true,
      where: { keeperId: 'keeper-orphan' },
      keeperDomainUnresolved: true,
    });
  });

  it('returns 404 when the Keeper does not exist', async () => {
    const result = await authorizeJourneyListScope(createDb() as never, {
      userId: 'user-1',
      keeperId: 'missing',
    });
    expect(result).toMatchObject({ ok: false, status: 404, body: { error: 'Keeper not found' } });
  });
});
