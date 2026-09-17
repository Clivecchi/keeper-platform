import { describe, expect, it } from 'vitest';
import {
  applyDomainRoleCatalogWrite,
  permissionsForCatalogRole,
  readDomainRoleCatalog,
  resolveDomainRoleCatalog,
  resolveRoleBundle,
  resolveRoleInfoFromCatalog,
  slugifyRoleId,
} from './domainRoleCatalog.js';

describe('domain role catalog', () => {
  it('resolves platform defaults when settings have no catalog', () => {
    const catalog = resolveDomainRoleCatalog({});
    expect(catalog.map((entry) => entry.key)).toEqual([
      'owner',
      'admin',
      'user',
      'friend',
      'connection',
    ]);
    expect(catalog[0]?.assignable).toBe(false);
    expect(catalog.find((entry) => entry.key === 'user')?.label).toBe('Member');
  });

  it('applies Domain label overrides and custom roles that map onto bundles', () => {
    const catalog = resolveDomainRoleCatalog({
      roles: {
        owner: { label: 'Steward' },
        labels: { user: { label: 'Resident', description: 'Lives here.' } },
        custom: [{ id: 'patron', name: 'Patron', description: 'Supports the work.', mapsTo: 'friend' }],
      },
    });

    expect(resolveRoleInfoFromCatalog('owner', catalog)).toEqual({
      label: 'Steward',
      description: 'Owns the Domain. Not assigned by invitation. Transfer is a later Act.',
    });
    expect(resolveRoleInfoFromCatalog('user', catalog)).toEqual({
      label: 'Resident',
      description: 'Lives here.',
    });
    expect(resolveRoleBundle('patron', catalog)).toBe('friend');
    expect(permissionsForCatalogRole('patron', catalog)).toEqual(['read', 'write']);
  });

  it('creates, updates, and deletes custom roles without inventing a permission engine', () => {
    const created = applyDomainRoleCatalogWrite({}, {
      action: 'create',
      name: 'Patron',
      description: 'Supports the work.',
      mapsTo: 'friend',
    });
    expect(created.record.custom).toEqual([
      { id: 'patron', name: 'Patron', description: 'Supports the work.', mapsTo: 'friend' },
    ]);

    const updated = applyDomainRoleCatalogWrite(wrap(created.record), {
      action: 'update',
      key: 'patron',
      label: 'Benefactor',
      description: 'Funds the season.',
      mapsTo: 'user',
    });
    expect(updated.record.custom?.[0]).toEqual({
      id: 'patron',
      name: 'Benefactor',
      description: 'Funds the season.',
      mapsTo: 'user',
    });

    const deleted = applyDomainRoleCatalogWrite(wrap(updated.record), { action: 'delete', key: 'patron' });
    expect(deleted.removed?.id).toBe('patron');
    expect(deleted.record.custom).toEqual([]);
  });

  it('stores only built-in overrides that differ from platform copy', () => {
    const updated = applyDomainRoleCatalogWrite({}, {
      action: 'update',
      key: 'admin',
      label: 'Admin',
      description: 'Manage People, Config, and invitations on this Domain.',
    });
    expect(updated.record.labels).toBeUndefined();
  });

  it('slugifies custom ids and ignores reserved keys in stored JSON', () => {
    expect(slugifyRoleId(' Studio Guest ')).toBe('studio-guest');
    expect(readDomainRoleCatalog({
      roles: { custom: [{ id: 'admin', name: 'Nope', mapsTo: 'admin' }] },
    }).custom).toBeUndefined();
  });
});

function wrap(record: ReturnType<typeof readDomainRoleCatalog>) {
  return { roles: record };
}
