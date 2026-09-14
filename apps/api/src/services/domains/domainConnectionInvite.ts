import type { DomainInvitation, DomainPermission } from '@prisma/client';
import type { Prisma, PrismaClient } from '@keeper/database';
import {
  DomainPermissionService,
  type DomainRole,
} from '@keeper/database';
import {
  invitationSeedHasContent,
  normalizeInvitationSeed,
  type DomainPersonNote,
  type InvitationSeed,
} from '@keeper/shared';

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
  /** Copyable redeem path for domain admins — email delivery is not wired. */
  acceptPath: string;
  seed?: InvitationSeed | null;
};

export function invitationAcceptPath(token: string): string {
  return `/invite/accept?token=${encodeURIComponent(token)}`;
}

export type InviteConnectionResult =
  | { outcome: 'granted'; permission: DomainPermission }
  | { outcome: 'invited'; invitation: DomainInvitation };

type UserLookupClient = Pick<PrismaClient, 'users' | 'domain' | 'domainPermission' | 'domainInvitation'>;

export function normalizeConnectionRole(role?: string): ConnectionRole {
  return role === 'friend' ? 'friend' : 'connection';
}

const DOMAIN_ROLES: DomainRole[] = ['admin', 'user', 'friend', 'connection'];

export function normalizeDomainRole(role?: string): DomainRole {
  return DOMAIN_ROLES.includes(role as DomainRole) ? (role as DomainRole) : 'connection';
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

function invitationSeedJson(seed: InvitationSeed): Prisma.InputJsonValue {
  return { ...seed } as Prisma.InputJsonValue;
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
      acceptPath: invitationAcceptPath(invitation.token),
      seed: normalizeInvitationSeed(invitation.seed),
    })),
  };
}

async function persistGrantedInvitationSeed(
  prisma: UserLookupClient,
  params: {
    domainId: string;
    invitedBy: string;
    email: string;
    role: DomainRole;
    seed: InvitationSeed;
  },
): Promise<void> {
  const expiresAt = new Date();
  await prisma.domainInvitation.upsert({
    where: {
      domainId_email: {
        domainId: params.domainId,
        email: params.email,
      },
    },
    create: {
      domainId: params.domainId,
      email: params.email,
      role: params.role,
      invitedBy: params.invitedBy,
      token: generateInvitationToken(),
      expiresAt,
      acceptedAt: new Date(),
      seed: invitationSeedJson(params.seed),
    },
    update: {
      role: params.role,
      invitedBy: params.invitedBy,
      acceptedAt: new Date(),
      seed: invitationSeedJson(params.seed),
    },
  });
}

export async function listDomainPeopleNotes(
  prisma: Pick<PrismaClient, 'domainInvitation'>,
  domainId: string,
): Promise<DomainPersonNote[]> {
  const now = new Date();
  const invitations = await prisma.domainInvitation.findMany({
    where: { domainId },
    select: {
      email: true,
      role: true,
      seed: true,
      acceptedAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 40,
  });

  const notes: DomainPersonNote[] = [];
  for (const invitation of invitations) {
    const seed = normalizeInvitationSeed(invitation.seed);
    if (!invitationSeedHasContent(seed)) continue;
    const accepted = Boolean(invitation.acceptedAt);
    if (!accepted && invitation.expiresAt <= now) continue;
    notes.push({
      email: invitation.email,
      role: invitation.role,
      status: accepted ? 'member' : 'pending',
      seed,
    });
    if (notes.length >= 20) break;
  }
  return notes;
}

export async function inviteDomainConnection(
  prisma: UserLookupClient,
  permissionService: DomainPermissionService,
  params: {
    domainId: string;
    invitedBy: string;
    identifier: string;
    role?: DomainRole;
    seed?: unknown;
  },
): Promise<InviteConnectionResult> {
  const role = normalizeDomainRole(params.role);
  const identifier = normalizeIdentifier(params.identifier);
  const seed = normalizeInvitationSeed(params.seed);

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

    if (seed && invitee.email) {
      await persistGrantedInvitationSeed(prisma, {
        domainId: params.domainId,
        invitedBy: params.invitedBy,
        email: invitee.email.toLowerCase(),
        role,
        seed,
      });
    }

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
      ...(seed ? { seed: invitationSeedJson(seed) } : {}),
    },
    update: {
      role,
      invitedBy: params.invitedBy,
      expiresAt,
      acceptedAt: null,
      token: generateInvitationToken(),
      ...(seed ? { seed: invitationSeedJson(seed) } : {}),
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
