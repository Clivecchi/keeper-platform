export type DomainRole = 'admin' | 'user' | 'friend' | 'connection';
export type DomainPermissionName = 'read' | 'write' | 'share' | 'admin' | 'invite' | 'delete';

export interface RoleInfo {
  label: string;
  description: string;
}

/**
 * Platform-wide Domain relationships. Owner is not in this map — it is
 * `Domain.ownerId`, displayed as a role, never assigned through invite.
 * `user` is stored as the Member relationship (legacy key; do not rename yet).
 */
export const ROLE_MAP: Record<DomainRole, RoleInfo> = {
  admin: {
    label: 'Admin',
    description: 'Manage People, Config, and invitations on this Domain.',
  },
  user: {
    label: 'Member',
    description: 'Work on this Domain — read, write, and share.',
  },
  friend: {
    label: 'Friend',
    description: 'Collaborator with write access. Not People management.',
  },
  connection: {
    label: 'Connection',
    description: 'Known here. Read-only until the relationship grows.',
  },
};

export const OWNER_ROLE_INFO: RoleInfo = {
  label: 'Owner',
  description: 'Owns the Domain. Not assigned by invitation. Transfer is a later Act.',
};

export const DOMAIN_ROLE_PERMISSIONS: Record<DomainRole, readonly DomainPermissionName[]> = {
  connection: ['read'],
  friend: ['read', 'write'],
  user: ['read', 'write', 'share'],
  admin: ['read', 'write', 'share', 'admin', 'invite', 'delete'],
};

export const ROLE_OPTIONS = (Object.entries(ROLE_MAP) as Array<[DomainRole, RoleInfo]>).map(
  ([value, info]) => ({ value, label: info.label, description: info.description }),
);

/** Custom Domain roles map onto these bundles. Not a new permission engine. */
export const CUSTOM_DOMAIN_ROLES_ENABLED = true;

export function isDomainRole(value: string): value is DomainRole {
  return value in ROLE_MAP;
}

export function permissionsForDomainRole(role: string): DomainPermissionName[] {
  const key = isDomainRole(role) ? role : 'connection';
  return [...DOMAIN_ROLE_PERMISSIONS[key]];
}
