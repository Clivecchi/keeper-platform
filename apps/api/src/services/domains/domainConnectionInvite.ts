import type { DomainInvitation, DomainPermission } from '@prisma/client';
import type { Prisma, PrismaClient } from '@keeper/database';
import {
  DomainPermissionService,
  type DomainRole,
} from '@keeper/database';
import {
  findDomainRoleEntry,
  invitationSeedHasContent,
  normalizeInvitationSeed,
  permissionsForCatalogRole,
  resolveDomainRoleCatalog,
  resolveRoleBundle,
  type DomainPersonNote,
  type InvitationArrivalDialogDoor,
  type InvitationArrivalDoor,
  type InvitationSeed,
} from '@keeper/shared';
import { ensureInviteeHomeRealm } from './ensureInviteeHomeRealm.js';
import { ensureInvitationArrival } from './ensureInvitationArrival.js';

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
  hasAccount?: boolean;
  accountName?: string | null;
};

export type InvitationPreviewStatus = 'pending' | 'accepted' | 'expired';

export type InvitationPreview = {
  status: InvitationPreviewStatus;
  domainName: string;
  domainSlug: string;
  role: string;
  inviterName: string;
  email: string;
  hasAccount: boolean;
  suggestedName: string | null;
  expiresAt: Date;
};

export type PendingInvitationArrival = {
  domainId: string;
  domainSlug: string;
  additionalAccepted: number;
  dialogId?: string;
  homeRealmSlug?: string;
  homeDialogId?: string;
};

export function invitationAcceptPath(token: string): string {
  return `/invite/accept?token=${encodeURIComponent(token)}`;
}

export type AdditionalInviteResult =
  | { domainId: string; name: string; slug: string; outcome: 'granted' | 'invited' }
  | { domainId: string; name: string; slug: string; outcome: 'skipped'; error: string };

export type InviteConnectionResult =
  | { outcome: 'granted'; permission: DomainPermission; additional: AdditionalInviteResult[] }
  | { outcome: 'invited'; invitation: DomainInvitation; additional: AdditionalInviteResult[] };

export type AdministrableDomain = {
  id: string;
  name: string;
  slug: string;
  via: 'owner' | 'admin';
};

export type AcceptInvitationResult = {
  domainId: string;
  domainSlug: string;
  additionalAccepted: number;
  dialogId?: string;
  homeRealmSlug?: string;
  homeDialogId?: string;
};

type UserLookupClient = Pick<PrismaClient, 'users' | 'domain' | 'domainPermission' | 'domainInvitation' | 'dialog'>;

async function loadInvitationDoors(
  prisma: Pick<PrismaClient, 'domain'>,
  rows: DomainInvitation[],
): Promise<InvitationArrivalDoor[]> {
  const ids = [...new Set(rows.map((row) => row.domainId))];
  if (ids.length === 0) return [];
  const domains = await prisma.domain.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: { id: true, slug: true, name: true },
  });
  const byId = new Map(domains.map((domain) => [domain.id, domain]));
  const doors: InvitationArrivalDoor[] = [];
  for (const row of rows) {
    const domain = byId.get(row.domainId);
    if (!domain?.slug) continue;
    if (doors.some((door) => door.domainId === domain.id)) continue;
    doors.push({
      domainId: domain.id,
      domainSlug: domain.slug,
      domainName: domain.name,
      role: row.role,
    });
  }
  return doors;
}

async function loadAssignedDialogDoors(
  prisma: Pick<PrismaClient, 'dialog' | 'domain'>,
  invitation: DomainInvitation,
  doors: InvitationArrivalDoor[],
): Promise<InvitationArrivalDialogDoor[]> {
  const seed = normalizeInvitationSeed(invitation.seed);
  const ids = seed?.assignedDialogIds ?? [];
  if (ids.length === 0) return [];
  const allowed = new Set(doors.map((door) => door.domainId));
  allowed.add(invitation.domainId);
  if (invitation.originDomainId) allowed.add(invitation.originDomainId);
  const dialogs = await prisma.dialog.findMany({
    where: {
      id: { in: ids },
      is_archived: false,
      domain_id: { in: [...allowed] },
    },
    select: { id: true, title: true, domain_id: true },
  });
  const domainIds = [...new Set(dialogs.map((dialog) => dialog.domain_id))];
  const domains = await prisma.domain.findMany({
    where: { id: { in: domainIds } },
    select: { id: true, slug: true, name: true },
  });
  const byId = new Map(domains.map((domain) => [domain.id, domain]));
  return dialogs.flatMap((dialog) => {
    const domain = byId.get(dialog.domain_id);
    if (!domain?.slug) return [];
    return [{
      dialogId: dialog.id,
      title: dialog.title,
      domainId: domain.id,
      domainSlug: domain.slug,
      domainName: domain.name,
    }];
  });
}

async function completeFirstIntroduction(
  prisma: UserLookupClient,
  invitation: DomainInvitation,
  userId: string,
  bundleRows: DomainInvitation[],
): Promise<{ dialogId?: string; homeRealmSlug?: string; homeDialogId?: string }> {
  try {
    const home = await ensureInviteeHomeRealm(userId);
    const doors = await loadInvitationDoors(prisma, bundleRows);
    const assignedDialogs = await loadAssignedDialogDoors(prisma, invitation, doors);
    const arrival = await ensureInvitationArrival({
      invitation,
      userId,
      inviteeHomeDomainId: home?.id ?? null,
      doors,
      assignedDialogs,
    });
    return {
      ...(arrival?.dialogId ? { dialogId: arrival.dialogId } : {}),
      ...(home?.slug ? { homeRealmSlug: home.slug } : {}),
      ...(arrival?.homeDialogId ? { homeDialogId: arrival.homeDialogId } : {}),
    };
  } catch (error) {
    console.warn('[first-introduction] arrival orchestration failed', {
      invitationId: invitation.id,
      userId,
      error,
    });
    return {};
  }
}

export function generateInvitationBundleId(): string {
  return `bun_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function normalizeConnectionRole(role?: string): ConnectionRole {
  return role === 'friend' ? 'friend' : 'connection';
}

const DOMAIN_ROLES: DomainRole[] = ['admin', 'user', 'friend', 'connection'];

export function normalizeDomainRole(role?: string): DomainRole {
  return DOMAIN_ROLES.includes(role as DomainRole) ? (role as DomainRole) : 'connection';
}

export function resolveAssignableDomainRole(
  role: string | undefined,
  settings: unknown,
  fallbackBundle?: DomainRole,
): { role: string; permissions: ReturnType<typeof permissionsForCatalogRole> } {
  const catalog = resolveDomainRoleCatalog(settings);
  const requested = role?.trim() || fallbackBundle || 'connection';
  const entry = findDomainRoleEntry(catalog, requested);
  if (entry?.assignable) {
    return { role: entry.key, permissions: permissionsForCatalogRole(entry.key, catalog) };
  }
  const fallback = findDomainRoleEntry(catalog, fallbackBundle);
  if (fallback?.assignable) {
    return { role: fallback.key, permissions: permissionsForCatalogRole(fallback.key, catalog) };
  }
  const normalized = normalizeDomainRole(requested);
  return { role: normalized, permissions: permissionsForCatalogRole(normalized, catalog) };
}

export function normalizeIdentifier(identifier: string): string {
  return identifier.trim();
}

export function looksLikeEmail(identifier: string): boolean {
  const trimmed = normalizeIdentifier(identifier);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

export function emailsMatch(left?: string | null, right?: string | null): boolean {
  const a = left?.trim().toLowerCase();
  const b = right?.trim().toLowerCase();
  return Boolean(a && b && a === b);
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
    pendingInvitations: await withInvitationAccountPresence(
      prisma,
      invitations.map((invitation) => ({
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
    ),
  };
}

export async function withInvitationAccountPresence<T extends { email: string }>(
  prisma: Pick<PrismaClient, 'users'>,
  invitations: T[],
): Promise<Array<T & { hasAccount: boolean; accountName: string | null }>> {
  if (invitations.length === 0) return [];
  const uniqueEmails = [...new Set(invitations.map((row) => row.email.trim()).filter(Boolean))];
  const accounts =
    uniqueEmails.length === 0
      ? []
      : await prisma.users.findMany({
          where: {
            OR: uniqueEmails.map((email) => ({
              email: { equals: email, mode: 'insensitive' as const },
            })),
          },
          select: { email: true, name: true },
        });
  const byEmail = new Map(
    accounts
      .filter((account) => account.email)
      .map((account) => [account.email!.trim().toLowerCase(), account.name?.trim() || null]),
  );
  return invitations.map((invitation) => {
    const key = invitation.email.trim().toLowerCase();
    const accountName = byEmail.get(key);
    return {
      ...invitation,
      hasAccount: byEmail.has(key),
      accountName: accountName ?? null,
    };
  });
}

async function persistGrantedInvitationSeed(
  prisma: UserLookupClient,
  params: {
    domainId: string;
    invitedBy: string;
    email: string;
    role: string;
    seed: InvitationSeed;
    originDomainId: string;
    bundleId: string;
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
      originDomainId: params.originDomainId,
      bundleId: params.bundleId,
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
      originDomainId: params.originDomainId,
      bundleId: params.bundleId,
      acceptedAt: new Date(),
      seed: invitationSeedJson(params.seed),
    },
  });
}

export async function listAdministrableDomains(
  prisma: UserLookupClient,
  userId: string,
  excludeDomainId?: string,
): Promise<AdministrableDomain[]> {
  const [owned, adminRows] = await Promise.all([
    prisma.domain.findMany({
      where: { ownerId: userId, deletedAt: null },
      select: { id: true, name: true, slug: true },
    }),
    prisma.domainPermission.findMany({
      where: { userId, role: 'admin' },
      select: {
        domainId: true,
        Domain: { select: { id: true, name: true, slug: true, deletedAt: true, ownerId: true } },
      },
    }),
  ]);

  const byId = new Map<string, AdministrableDomain>();
  for (const domain of owned) {
    if (excludeDomainId && domain.id === excludeDomainId) continue;
    byId.set(domain.id, { id: domain.id, name: domain.name, slug: domain.slug, via: 'owner' });
  }
  for (const row of adminRows) {
    const domain = row.Domain;
    if (!domain || domain.deletedAt) continue;
    if (excludeDomainId && domain.id === excludeDomainId) continue;
    if (domain.ownerId === userId) continue;
    if (byId.has(domain.id)) continue;
    byId.set(domain.id, { id: domain.id, name: domain.name, slug: domain.slug, via: 'admin' });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
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

async function inviteOntoOneDomain(
  prisma: UserLookupClient,
  permissionService: DomainPermissionService,
  params: {
    domainId: string;
    originDomainId: string;
    bundleId: string;
    invitedBy: string;
    identifier: string;
    role: string;
    fallbackBundle?: DomainRole;
    seed: InvitationSeed | null;
    invitee: ResolvedInvitee | null;
  },
): Promise<InviteConnectionResult> {
  const domain = await prisma.domain.findUnique({
    where: { id: params.domainId },
    select: { ownerId: true, settings: true },
  });

  if (!domain) {
    throw new Error('Domain not found');
  }

  const resolved = resolveAssignableDomainRole(params.role, domain.settings, params.fallbackBundle);

  const originFields = {
    originDomainId: params.originDomainId,
    bundleId: params.bundleId,
  };

  if (params.invitee) {
    if (params.invitee.id === domain.ownerId) {
      throw new Error('Domain owner is already a member');
    }

    const existingPermission = await prisma.domainPermission.findUnique({
      where: {
        domainId_userId: {
          domainId: params.domainId,
          userId: params.invitee.id,
        },
      },
    });

    if (
      existingPermission &&
      !CONNECTION_ROLES.includes(
        resolveRoleBundle(existingPermission.role, resolveDomainRoleCatalog(domain.settings)) as ConnectionRole,
      )
    ) {
      throw new Error('User already has a member role on this domain');
    }

    const permission = await permissionService.grantPermission({
      domainId: params.domainId,
      userId: params.invitee.id,
      role: resolved.role,
      permissions: resolved.permissions,
      grantedBy: params.invitedBy,
    });

    if (params.seed && params.invitee.email) {
      await persistGrantedInvitationSeed(prisma, {
        domainId: params.domainId,
        invitedBy: params.invitedBy,
        email: params.invitee.email.toLowerCase(),
        role: resolved.role,
        seed: params.seed,
        ...originFields,
      });
    }

    return { outcome: 'granted', permission, additional: [] };
  }

  if (!looksLikeEmail(params.identifier)) {
    throw new Error('User not found. Provide an email address to send an invitation.');
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invitation = await prisma.domainInvitation.upsert({
    where: {
      domainId_email: {
        domainId: params.domainId,
        email: params.identifier.toLowerCase(),
      },
    },
    create: {
      domainId: params.domainId,
      email: params.identifier.toLowerCase(),
      role: resolved.role,
      invitedBy: params.invitedBy,
      token: generateInvitationToken(),
      expiresAt,
      ...originFields,
      ...(params.seed ? { seed: invitationSeedJson(params.seed) } : {}),
    },
    update: {
      role: resolved.role,
      invitedBy: params.invitedBy,
      expiresAt,
      acceptedAt: null,
      token: generateInvitationToken(),
      ...originFields,
      ...(params.seed ? { seed: invitationSeedJson(params.seed) } : {}),
    },
  });

  return { outcome: 'invited', invitation, additional: [] };
}

export async function inviteDomainConnection(
  prisma: UserLookupClient,
  permissionService: DomainPermissionService,
  params: {
    domainId: string;
    invitedBy: string;
    identifier: string;
    role?: string;
    seed?: unknown;
    additionalDomainIds?: string[];
    additionalDomains?: Array<{ domainId: string; role?: string }>;
  },
): Promise<InviteConnectionResult> {
  const identifier = normalizeIdentifier(params.identifier);
  const seed = normalizeInvitationSeed(params.seed);
  const primaryDomain = await prisma.domain.findUnique({
    where: { id: params.domainId },
    select: { settings: true },
  });
  const primaryResolved = resolveAssignableDomainRole(params.role, primaryDomain?.settings);
  const role = primaryResolved.role;
  const fallbackBundle = resolveRoleBundle(role, resolveDomainRoleCatalog(primaryDomain?.settings));

  if (!identifier) {
    throw new Error('Identifier is required');
  }

  const invitee = await resolveUserByIdentifier(prisma, identifier);
  const bundleId = generateInvitationBundleId();
  const originDomainId = params.domainId;

  const primary = await inviteOntoOneDomain(prisma, permissionService, {
    domainId: params.domainId,
    originDomainId,
    bundleId,
    invitedBy: params.invitedBy,
    identifier,
    role,
    fallbackBundle,
    seed,
    invitee,
  });

  const roleByDomain = new Map<string, string>();
  for (const row of params.additionalDomains ?? []) {
    const id = row.domainId?.trim();
    if (!id || id === params.domainId) continue;
    roleByDomain.set(id, row.role?.trim() || 'user');
  }
  for (const id of params.additionalDomainIds ?? []) {
    const trimmed = id?.trim();
    if (!trimmed || trimmed === params.domainId || roleByDomain.has(trimmed)) continue;
    roleByDomain.set(trimmed, 'user');
  }
  if (roleByDomain.size === 0) {
    return primary;
  }

  const administrable = await listAdministrableDomains(prisma, params.invitedBy, params.domainId);
  const allowed = new Map(administrable.map((domain) => [domain.id, domain]));
  const additional: AdditionalInviteResult[] = [];

  for (const [domainId, requestedRole] of roleByDomain) {
    const target = allowed.get(domainId);
    if (!target) {
      additional.push({
        domainId,
        name: domainId,
        slug: '',
        outcome: 'skipped',
        error: 'You cannot invite people onto that Domain.',
      });
      continue;
    }
    try {
      const targetDomain = await prisma.domain.findUnique({
        where: { id: domainId },
        select: { settings: true },
      });
      const resolved = resolveAssignableDomainRole(requestedRole, targetDomain?.settings);
      const result = await inviteOntoOneDomain(prisma, permissionService, {
        domainId,
        originDomainId,
        bundleId,
        invitedBy: params.invitedBy,
        identifier,
        role: resolved.role,
        fallbackBundle: resolveRoleBundle(resolved.role, resolveDomainRoleCatalog(targetDomain?.settings)),
        seed,
        invitee,
      });
      additional.push({
        domainId: target.id,
        name: target.name,
        slug: target.slug,
        outcome: result.outcome,
      });
    } catch (error) {
      additional.push({
        domainId: target.id,
        name: target.name,
        slug: target.slug,
        outcome: 'skipped',
        error: error instanceof Error ? error.message : 'Could not invite onto that Domain.',
      });
    }
  }

  return { ...primary, additional };
}

export async function revokeDomainInvitation(
  prisma: UserLookupClient,
  params: { domainId: string; invitationId: string },
): Promise<void> {
  const invitation = await prisma.domainInvitation.findUnique({
    where: { id: params.invitationId },
    select: { id: true, domainId: true, acceptedAt: true },
  });
  if (!invitation || invitation.domainId !== params.domainId) {
    throw new Error('Invitation not found');
  }
  if (invitation.acceptedAt) {
    throw new Error('Invitation already accepted');
  }
  await prisma.domainInvitation.delete({ where: { id: invitation.id } });
}

async function domainSlugFor(
  prisma: UserLookupClient,
  domainId: string,
): Promise<string> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { slug: true },
  });
  return domain?.slug ?? '';
}

async function userMayRedeemInvitation(
  prisma: UserLookupClient,
  params: { userId: string; domainId: string },
): Promise<boolean> {
  const [domain, permission] = await Promise.all([
    prisma.domain.findUnique({
      where: { id: params.domainId },
      select: { ownerId: true },
    }),
    prisma.domainPermission.findUnique({
      where: {
        domainId_userId: {
          domainId: params.domainId,
          userId: params.userId,
        },
      },
      select: { userId: true },
    }),
  ]);
  return domain?.ownerId === params.userId || Boolean(permission);
}

export async function previewDomainInvitation(
  prisma: Pick<PrismaClient, 'domainInvitation' | 'domain' | 'users'>,
  token: string,
): Promise<InvitationPreview | null> {
  const trimmed = token.trim();
  if (!trimmed) return null;
  const invitation = await prisma.domainInvitation.findUnique({
    where: { token: trimmed },
  });
  if (!invitation) return null;
  const [domain, inviter] = await Promise.all([
    prisma.domain.findUnique({
      where: { id: invitation.domainId },
      select: { name: true, slug: true },
    }),
    prisma.users.findUnique({
      where: { id: invitation.invitedBy },
      select: { name: true, email: true },
    }),
  ]);
  if (!domain) return null;

  const email = invitation.email?.trim().toLowerCase() ?? '';
  const account = email
    ? await prisma.users.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      })
    : null;
  const seed = normalizeInvitationSeed(invitation.seed);
  const accepted = Boolean(invitation.acceptedAt);
  const expired = invitation.expiresAt <= new Date();
  const status: InvitationPreviewStatus = accepted ? 'accepted' : expired ? 'expired' : 'pending';

  return {
    status,
    domainName: domain.name,
    domainSlug: domain.slug,
    role: invitation.role,
    inviterName: inviter?.name?.trim() || inviter?.email?.trim() || 'Someone on Keeper',
    email,
    hasAccount: Boolean(account),
    suggestedName: seed?.givenName ?? null,
    expiresAt: invitation.expiresAt,
  };
}

/**
 * Invited registration must not also create a personal Domain.
 * That Domain was landing people away from the invitation.
 */
export async function shouldSkipPersonalDomainForInvitation(
  prisma: Pick<PrismaClient, 'domainInvitation'>,
  token: string | undefined,
  email: string,
): Promise<boolean> {
  const trimmed = token?.trim();
  if (!trimmed || !email.trim()) return false;
  const invitation = await prisma.domainInvitation.findUnique({
    where: { token: trimmed },
    select: { email: true, acceptedAt: true, expiresAt: true },
  });
  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) return false;
  return emailsMatch(invitation.email, email);
}

export async function acceptDomainInvitation(
  prisma: UserLookupClient,
  permissionService: DomainPermissionService,
  params: { token: string; userId: string },
): Promise<AcceptInvitationResult> {
  const invitation = await prisma.domainInvitation.findUnique({
    where: { token: params.token },
  });

  if (!invitation) {
    throw new Error('Invalid invitation token');
  }

  const user = await prisma.users.findUnique({
    where: { id: params.userId },
    select: { email: true, invitedFromDomainId: true },
  });
  if (user?.email && !emailsMatch(user.email, invitation.email)) {
    throw new Error('This invitation was sent to a different email.');
  }

  if (invitation.acceptedAt) {
    if (await userMayRedeemInvitation(prisma, { userId: params.userId, domainId: invitation.domainId })) {
      const arrival = await completeFirstIntroduction(prisma, invitation, params.userId, [invitation]);
      return {
        domainId: invitation.domainId,
        domainSlug: await domainSlugFor(prisma, invitation.domainId),
        additionalAccepted: 0,
        ...arrival,
      };
    }
    throw new Error('Invitation already accepted');
  }

  if (invitation.expiresAt < new Date()) {
    throw new Error('Invitation has expired');
  }

  const related = invitation.bundleId
    ? await prisma.domainInvitation.findMany({
        where: {
          bundleId: invitation.bundleId,
          email: invitation.email,
          acceptedAt: null,
          expiresAt: { gt: new Date() },
        },
      })
    : [invitation];

  let additionalAccepted = 0;
  for (const row of related) {
    try {
      const target = await prisma.domain.findUnique({
        where: { id: row.domainId },
        select: { settings: true },
      });
      const resolved = resolveAssignableDomainRole(row.role, target?.settings);
      await permissionService.grantPermission({
        domainId: row.domainId,
        userId: params.userId,
        role: resolved.role,
        permissions: resolved.permissions,
        grantedBy: row.invitedBy,
      });
      await prisma.domainInvitation.update({
        where: { id: row.id },
        data: { acceptedAt: new Date() },
      });
      if (row.id !== invitation.id) additionalAccepted += 1;
    } catch (error) {
      if (row.id === invitation.id) {
        throw error;
      }
    }
  }

  const originDomainId = invitation.originDomainId ?? invitation.domainId;
  if (user && !user.invitedFromDomainId) {
    await prisma.users.update({
      where: { id: params.userId },
      data: { invitedFromDomainId: originDomainId },
    });
  }

  const arrival = await completeFirstIntroduction(prisma, invitation, params.userId, related);
  return {
    domainId: invitation.domainId,
    domainSlug: await domainSlugFor(prisma, invitation.domainId),
    additionalAccepted,
    ...arrival,
  };
}

export async function acceptPendingInvitationsForUser(
  prisma: UserLookupClient,
  permissionService: DomainPermissionService,
  params: { userId: string; email: string },
): Promise<PendingInvitationArrival | null> {
  const email = params.email.trim();
  if (!email) return null;

  const pending = await prisma.domainInvitation.findMany({
    where: {
      email: { equals: email, mode: 'insensitive' },
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'asc' },
  });
  if (pending.length === 0) return null;

  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const row of pending) {
    const key = row.bundleId || row.id;
    if (seen.has(key)) continue;
    seen.add(key);
    tokens.push(row.token);
  }

  let first: AcceptInvitationResult | null = null;
  let extra = 0;
  for (const token of tokens) {
    try {
      const accepted = await acceptDomainInvitation(prisma, permissionService, {
        token,
        userId: params.userId,
      });
      if (!first) {
        first = accepted;
      } else {
        extra += 1 + accepted.additionalAccepted;
      }
    } catch {
      // Skip rows that cannot be redeemed; auth must still succeed.
    }
  }
  if (!first) return null;
  return {
    domainId: first.domainId,
    domainSlug: first.domainSlug,
    additionalAccepted: first.additionalAccepted + extra,
    ...(first.dialogId ? { dialogId: first.dialogId } : {}),
    ...(first.homeRealmSlug ? { homeRealmSlug: first.homeRealmSlug } : {}),
    ...(first.homeDialogId ? { homeDialogId: first.homeDialogId } : {}),
  };
}

/**
 * Take a member who never finished arrival back to a pending invitation.
 * Membership is removed. The accept link works again.
 */
export async function returnMemberToInvitation(
  prisma: UserLookupClient,
  permissionService: DomainPermissionService,
  params: { domainId: string; userId: string; returnedBy: string },
): Promise<DomainInvitation> {
  const domain = await prisma.domain.findUnique({
    where: { id: params.domainId },
    select: { ownerId: true },
  });
  if (!domain) {
    throw new Error('Domain not found');
  }
  if (domain.ownerId === params.userId) {
    throw new Error('The owner cannot be returned to an invitation');
  }

  const user = await prisma.users.findUnique({
    where: { id: params.userId },
    select: { email: true },
  });
  const email = user?.email?.trim().toLowerCase();
  if (!email) {
    throw new Error('This person has no email address to invite');
  }

  const permission = await prisma.domainPermission.findUnique({
    where: {
      domainId_userId: {
        domainId: params.domainId,
        userId: params.userId,
      },
    },
    select: { role: true },
  });
  if (!permission) {
    throw new Error('Member not found');
  }

  const existing = await prisma.domainInvitation.findUnique({
    where: {
      domainId_email: {
        domainId: params.domainId,
        email,
      },
    },
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const token = generateInvitationToken();
  const invitation = existing
    ? await prisma.domainInvitation.update({
        where: { id: existing.id },
        data: {
          acceptedAt: null,
          token,
          expiresAt,
          role: permission.role || existing.role,
          invitedBy: params.returnedBy,
        },
      })
    : await prisma.domainInvitation.create({
        data: {
          domainId: params.domainId,
          originDomainId: params.domainId,
          email,
          role: permission.role,
          invitedBy: params.returnedBy,
          token,
          expiresAt,
        },
      });

  await permissionService.revokePermission(params.domainId, params.userId, params.returnedBy);
  return invitation;
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
