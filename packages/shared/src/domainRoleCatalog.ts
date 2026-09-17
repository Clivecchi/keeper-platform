import {
  DOMAIN_ROLE_PERMISSIONS,
  OWNER_ROLE_INFO,
  ROLE_MAP,
  isDomainRole,
  type DomainPermissionName,
  type DomainRole,
  type RoleInfo,
} from './roles.js';

export const DOMAIN_ROLE_CATALOG_SETTINGS_KEY = 'roles';
export const CUSTOM_DOMAIN_ROLE_LIMIT = 24;
export const DOMAIN_ROLE_LABEL_MAX = 40;
export const DOMAIN_ROLE_DESCRIPTION_MAX = 160;

export type BuiltInDomainRoleKey = 'owner' | DomainRole;

export interface DomainRoleOverride {
  label?: string;
  description?: string;
}

export interface CustomDomainRole {
  id: string;
  name: string;
  description: string;
  mapsTo: DomainRole;
}

export interface DomainRoleCatalogRecord {
  owner?: DomainRoleOverride;
  labels?: Partial<Record<DomainRole, DomainRoleOverride>>;
  custom?: CustomDomainRole[];
}

export interface DomainRoleCatalogEntry {
  key: string;
  kind: 'owner' | 'platform' | 'custom';
  label: string;
  description: string;
  mapsTo: DomainRole | null;
  assignable: boolean;
  locked: boolean;
}

const RESERVED_ROLE_KEYS = new Set<string>(['owner', 'admin', 'user', 'friend', 'connection']);
const PLATFORM_ROLE_ORDER: DomainRole[] = ['admin', 'user', 'friend', 'connection'];

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function trimTo(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function parseOverride(value: unknown): DomainRoleOverride | undefined {
  const record = asRecord(value);
  if (!record) return undefined;
  const label = trimTo(record.label, DOMAIN_ROLE_LABEL_MAX);
  const description = trimTo(record.description, DOMAIN_ROLE_DESCRIPTION_MAX);
  if (!label && !description) return undefined;
  return {
    ...(label ? { label } : {}),
    ...(description ? { description } : {}),
  };
}

function parseCustomRole(value: unknown): CustomDomainRole | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = slugifyRoleId(typeof record.id === 'string' ? record.id : '');
  const name = trimTo(record.name, DOMAIN_ROLE_LABEL_MAX);
  const description = trimTo(record.description, DOMAIN_ROLE_DESCRIPTION_MAX);
  const mapsTo = isDomainRole(String(record.mapsTo ?? '')) ? (record.mapsTo as DomainRole) : 'connection';
  if (!id || RESERVED_ROLE_KEYS.has(id) || !name) return null;
  return { id, name, description, mapsTo };
}

export function slugifyRoleId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function readDomainRoleCatalog(settings: unknown): DomainRoleCatalogRecord {
  const root = asRecord(settings);
  const raw = asRecord(root?.[DOMAIN_ROLE_CATALOG_SETTINGS_KEY]);
  if (!raw) return {};

  const labels: Partial<Record<DomainRole, DomainRoleOverride>> = {};
  const labelsRaw = asRecord(raw.labels);
  if (labelsRaw) {
    for (const key of PLATFORM_ROLE_ORDER) {
      const override = parseOverride(labelsRaw[key]);
      if (override) labels[key] = override;
    }
  }

  const custom: CustomDomainRole[] = [];
  const seen = new Set<string>();
  if (Array.isArray(raw.custom)) {
    for (const item of raw.custom) {
      const role = parseCustomRole(item);
      if (!role || seen.has(role.id) || custom.length >= CUSTOM_DOMAIN_ROLE_LIMIT) continue;
      seen.add(role.id);
      custom.push(role);
    }
  }

  return {
    ...(parseOverride(raw.owner) ? { owner: parseOverride(raw.owner) } : {}),
    ...(Object.keys(labels).length > 0 ? { labels } : {}),
    ...(custom.length > 0 ? { custom } : {}),
  };
}

function withOverride(info: RoleInfo, override?: DomainRoleOverride): RoleInfo {
  return {
    label: override?.label?.trim() || info.label,
    description: override?.description?.trim() || info.description,
  };
}

export function resolveDomainRoleCatalog(settings: unknown): DomainRoleCatalogEntry[] {
  const record = readDomainRoleCatalog(settings);
  const owner = withOverride(OWNER_ROLE_INFO, record.owner);
  const entries: DomainRoleCatalogEntry[] = [
    {
      key: 'owner',
      kind: 'owner',
      label: owner.label,
      description: owner.description,
      mapsTo: null,
      assignable: false,
      locked: true,
    },
  ];

  for (const key of PLATFORM_ROLE_ORDER) {
    const info = withOverride(ROLE_MAP[key], record.labels?.[key]);
    entries.push({
      key,
      kind: 'platform',
      label: info.label,
      description: info.description,
      mapsTo: key,
      assignable: true,
      locked: true,
    });
  }

  for (const role of record.custom ?? []) {
    entries.push({
      key: role.id,
      kind: 'custom',
      label: role.name,
      description: role.description,
      mapsTo: role.mapsTo,
      assignable: true,
      locked: false,
    });
  }

  return entries;
}

export function assignableDomainRoles(catalog: DomainRoleCatalogEntry[]): DomainRoleCatalogEntry[] {
  return catalog.filter((entry) => entry.assignable);
}

export function findDomainRoleEntry(
  catalog: DomainRoleCatalogEntry[],
  role: string | null | undefined,
): DomainRoleCatalogEntry | undefined {
  const key = role?.trim();
  if (!key) return undefined;
  return catalog.find((entry) => entry.key === key);
}

export function resolveRoleBundle(
  role: string | null | undefined,
  catalog?: DomainRoleCatalogEntry[],
): DomainRole {
  if (catalog) {
    const entry = findDomainRoleEntry(catalog, role);
    if (entry?.mapsTo) return entry.mapsTo;
  }
  return isDomainRole(role ?? '') ? role as DomainRole : 'connection';
}

export function resolveRoleInfoFromCatalog(
  role: string,
  catalog?: DomainRoleCatalogEntry[],
): RoleInfo {
  const entry = catalog ? findDomainRoleEntry(catalog, role) : undefined;
  if (entry) {
    return { label: entry.label, description: entry.description };
  }
  if (isDomainRole(role)) return ROLE_MAP[role];
  if (role === 'owner') return OWNER_ROLE_INFO;
  return {
    label: role.trim() || 'Unknown',
    description: 'Role recorded on this domain.',
  };
}

export function uniqueCustomRoleId(name: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  const base = slugifyRoleId(name) || 'role';
  let candidate = base;
  let index = 2;
  while (RESERVED_ROLE_KEYS.has(candidate) || taken.has(candidate)) {
    const suffix = `-${index}`;
    candidate = `${base.slice(0, Math.max(1, 32 - suffix.length))}${suffix}`;
    index += 1;
  }
  return candidate;
}

export function applyDomainRoleCatalogWrite(
  settings: unknown,
  write:
    | { action: 'update'; key: string; label: string; description: string; mapsTo?: DomainRole }
    | { action: 'create'; name: string; description: string; mapsTo?: DomainRole }
    | { action: 'delete'; key: string },
): { record: DomainRoleCatalogRecord; removed?: CustomDomainRole } {
  const record = readDomainRoleCatalog(settings);

  if (write.action === 'create') {
    const custom = [...(record.custom ?? [])];
    if (custom.length >= CUSTOM_DOMAIN_ROLE_LIMIT) {
      throw new Error('This Domain already has the maximum number of custom roles.');
    }
    const name = trimTo(write.name, DOMAIN_ROLE_LABEL_MAX);
    if (!name) throw new Error('Role name is required.');
    const mapsTo = write.mapsTo && isDomainRole(write.mapsTo) ? write.mapsTo : 'connection';
    custom.push({
      id: uniqueCustomRoleId(name, custom.map((role) => role.id)),
      name,
      description: trimTo(write.description, DOMAIN_ROLE_DESCRIPTION_MAX),
      mapsTo,
    });
    return { record: { ...record, custom } };
  }

  if (write.action === 'delete') {
    const custom = record.custom ?? [];
    const removed = custom.find((role) => role.id === write.key);
    if (!removed) {
      throw new Error('Only custom roles can be removed.');
    }
    return {
      record: {
        ...record,
        custom: custom.filter((role) => role.id !== write.key),
      },
      removed,
    };
  }

  const label = trimTo(write.label, DOMAIN_ROLE_LABEL_MAX);
  const description = trimTo(write.description, DOMAIN_ROLE_DESCRIPTION_MAX);
  if (!label) throw new Error('Role name is required.');

  if (write.key === 'owner') {
    return {
      record: {
        ...record,
        owner: compactOverride(OWNER_ROLE_INFO, { label, description }),
      },
    };
  }

  if (isDomainRole(write.key)) {
    const labels = { ...(record.labels ?? {}) };
    const next = compactOverride(ROLE_MAP[write.key], { label, description });
    if (next) labels[write.key] = next;
    else delete labels[write.key];
    return {
      record: {
        ...record,
        ...(Object.keys(labels).length > 0 ? { labels } : { labels: undefined }),
      },
    };
  }

  const custom = [...(record.custom ?? [])];
  const index = custom.findIndex((role) => role.id === write.key);
  if (index < 0) throw new Error('Role not found.');
  const mapsTo = write.mapsTo && isDomainRole(write.mapsTo) ? write.mapsTo : custom[index].mapsTo;
  custom[index] = {
    ...custom[index],
    name: label,
    description,
    mapsTo,
  };
  return { record: { ...record, custom } };
}

function compactOverride(defaults: RoleInfo, next: { label: string; description: string }): DomainRoleOverride | undefined {
  const label = next.label === defaults.label ? undefined : next.label;
  const description = next.description === defaults.description ? undefined : next.description;
  if (!label && !description) return undefined;
  return { ...(label ? { label } : {}), ...(description ? { description } : {}) };
}

export function permissionsForCatalogRole(
  role: string,
  catalog?: DomainRoleCatalogEntry[],
): DomainPermissionName[] {
  return [...DOMAIN_ROLE_PERMISSIONS[resolveRoleBundle(role, catalog)]];
}
