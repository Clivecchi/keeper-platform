import type { DomainPermissionType } from './domainPermissionMiddleware.js';

export type ResolvedParamDomainAccess = {
  permissions: DomainPermissionType[];
  role: string;
  isOwner: boolean;
};

export type ParamDomainAccessInput = {
  userId?: string | null;
  ownerId: string;
  isPublic: boolean;
  permission: {
    role: string;
    permissions: string[];
    expiresAt: Date | null;
  } | null;
  ownsKeeperInDomain: boolean;
  now?: Date;
};

function isExpired(expiresAt: Date | null, now: Date): boolean {
  return Boolean(expiresAt && expiresAt.getTime() <= now.getTime());
}

/**
 * Membership-first access for param-scoped domain routes.
 * Does not grant read to every authenticated user.
 */
export function resolveParamDomainAccess(input: ParamDomainAccessInput): ResolvedParamDomainAccess {
  const now = input.now ?? new Date();
  const userId = input.userId?.trim() || null;
  const isOwner = Boolean(userId && input.ownerId === userId);

  if (isOwner) {
    return {
      permissions: ['read', 'write', 'share', 'admin', 'invite', 'delete'],
      role: 'owner',
      isOwner: true,
    };
  }

  if (userId && input.permission && !isExpired(input.permission.expiresAt, now)) {
    return {
      permissions: (input.permission.permissions ?? []) as DomainPermissionType[],
      role: input.permission.role?.trim() || 'member',
      isOwner: false,
    };
  }

  if (userId && input.ownsKeeperInDomain) {
    return {
      permissions: ['read', 'write'],
      role: 'member',
      isOwner: false,
    };
  }

  if (input.isPublic) {
    return {
      permissions: ['read'],
      role: 'guest',
      isOwner: false,
    };
  }

  return {
    permissions: [],
    role: 'guest',
    isOwner: false,
  };
}
