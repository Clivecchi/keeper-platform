import type { DomainInvitation, DomainPermission } from '@prisma/client';
import type { PrismaClient } from '@keeper/database';
import {
  DomainPermissionService,
  type DomainRole,
} from '@keeper/database';

export const CONNECTION_ROLES = ['friend', 'connection'] as const;
export type ConnectionRole = (typeof CONNECTION_ROLES)[number];

export type ResolvedInvitee = {
  id: string;
  email: string | null;
  name: string | null;
};

export type ConnectionListItem = {
  userId: string;
  name: string;
  email: string | null;
  role: ConnectionRole;
  permissions: string[];
  grantedAt: Date;
  expiresAt: Date | null;
  status: 'active';
};

export type PendingConnectionInvitation = {
  id: string;
  email: string;
  role: ConnectionRole;
  invitedBy: string;
  expiresAt: Date;
  createdAt: Date;
  status: 'pending';
};

export type InviteConnectionResult =
  | { outcome: 'granted'; permission: DomainPermission }
  | { outcome: 'invited'; invitation: DomainInvitation };

type UserLookupClient = Pick<PrismaClient, 'users' | 'domain' | 'domainPermission' | 'domainInvitation'>;

export function normalizeConnectionRole(role?: string): ConnectionRole {
  return role === 'friend' ? 'friend' : 'connection';
}

export function normalizeIdentifier(identifier: string): string {
  return identifier.trim();
}

export function looksLikeEmail(identifier: string): boolean {
  const trimmed = normalizeIdentifier(identifier);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function generateInvitationToken(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 18)}`;
}

export async function resolveUserByIdentifier(
  prisma: Pick<PrismaClient, 'users'>,
  identifier: string,
): Promise<ResolvedInvitee | null> {
  const normalized = normalizeIdentifier(identifier);
  if (!normalized) {
    return null;
  }

  if (looksLikeEmail(normalized)) {
    return prisma.users.findFirst({
      where: { email: { equals: normalized, mode: 'insensitive' } },
      select: { id: true, email: true, name: true },
    });
  }

  return prisma.users.findFirst({
    where: { name: { equals: normalized, mode: 'insensitive' } },
    select: { id: true, email: true, name: true },
  });
}

export async function listDomainConnections(
  prisma: UserLookupClient,
  domainId: string,
): Promise<{ connections: ConnectionListItem[]; pendingInvitations: PendingConnectionInvitation[] }> {
  const now = new Date();

  const [permissions, invitations] = await Promise.all([
    prisma.domainPermission.findMany({
      where: {
        domainId,
        role: { in: [...CONNECTION_ROLES] },
      },
      include: {
        users_DomainPermission_userIdTousers: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { grantedAt: 'desc' },
    }),
    prisma.domainInvitation.findMany({
      where: {
        domainId,
        role: { in: [...CONNECTION_ROLES] },
        acceptedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    connections: permissions.map((permission) => {
      const user = permission.users_DomainPermission_userIdTousers;
      return {
        userId: permission.userId,
        name: user?.name || user?.email || permission.userId,
        email: user?.email ?? null,
        role: permission.role as ConnectionRole,
        permissions: permission.permissions,
        grantedAt: permission.grantedAt,
        expiresAt: permission.expiresAt,
        status: 'active',
      };
    }),
    pendingInvitations: invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role as ConnectionRole,
      invitedBy: invitation.invitedBy,
      expiresAt: invitation.expiresAt,
      createdAt: invitation.createdAt,
      status: 'pending' as const,
    })),
  };
}

export async function inviteDomainConnection(
  prisma: UserLookupClient,
  permissionService: DomainPermissionService,
  params: {
    domainId: string;
    invitedBy: string;
    identifier: string;
    role?: ConnectionRole;
  },
): Promise<InviteConnectionResult> {
  const role = normalizeConnectionRole(params.role);
  const identifier = normalizeIdentifier(params.identifier);

  if (!identifier) {
    throw new Error('Identifier is required');
  }

  const domain = await prisma.domain.findUnique({
    where: { id: params.domainId },
    select: { ownerId: true },
  });

  if (!domain) {
    throw new Error('Domain not found');
  }

  const invitee = await resolveUserByIdentifier(prisma, identifier);

  if (invitee) {
    if (invitee.id === domain.ownerId) {
      throw new Error('Domain owner is already a member');
    }

    const existingPermission = await prisma.domainPermission.findUnique({
      where: {
        domainId_userId: {
          domainId: params.domainId,
          userId: invitee.id,
        },
      },
    });

    if (
      existingPermission &&
      !CONNECTION_ROLES.includes(existingPermission.role as ConnectionRole)
    ) {
      throw new Error('User already has a member role on this domain');
    }

    const permission = await permissionService.grantPermission({
      domainId: params.domainId,
      userId: invitee.id,
      role: role as DomainRole,
      grantedBy: params.invitedBy,
    });

    return { outcome: 'granted', permission };
  }

  if (!looksLikeEmail(identifier)) {
    throw new Error('User not found. Provide an email address to send an invitation.');
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invitation = await prisma.domainInvitation.upsert({
    where: {
      domainId_email: {
        domainId: params.domainId,
        email: identifier.toLowerCase(),
      },
    },
    create: {
      domainId: params.domainId,
      email: identifier.toLowerCase(),
      role,
      invitedBy: params.invitedBy,
      token: generateInvitationToken(),
      expiresAt,
    },
    update: {
      role,
      invitedBy: params.invitedBy,
      expiresAt,
      acceptedAt: null,
      token: generateInvitationToken(),
    },
  });

  return { outcome: 'invited', invitation };
}

export async function revokeDomainConnection(
  prisma: UserLookupClient,
  permissionService: DomainPermissionService,
  params: {
    domainId: string;
    userId: string;
    revokedBy: string;
  },
): Promise<void> {
  const permission = await prisma.domainPermission.findUnique({
    where: {
      domainId_userId: {
        domainId: params.domainId,
        userId: params.userId,
      },
    },
  });

  if (!permission) {
    throw new Error('Connection not found');
  }

  if (!CONNECTION_ROLES.includes(permission.role as ConnectionRole)) {
    throw new Error('User is not a connection on this domain');
  }

  await permissionService.revokePermission(params.domainId, params.userId, params.revokedBy);
}
