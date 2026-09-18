import {
  formatInvitationSeedLines,
  isDomainRole as isPlatformDomainRole,
  normalizeInvitationSeed,
  resolveDomainRoleCatalog,
  resolveRoleInfoFromCatalog,
  type DomainRole,
  type DomainRoleCatalogEntry,
  type InvitationSeed,
} from "@keeper/shared"

export interface DomainOwnerRow {
  userId: string
  name: string
  email?: string | null
}

export interface DomainMemberRow {
  userId: string
  name: string
  email?: string | null
  role: string
  permissions?: string[]
  expiresAt?: string
  seed?: InvitationSeed | null
}

export interface PendingInvitationRow {
  id: string
  email: string
  role: string
  invitedBy?: string
  createdAt?: string | Date
  expiresAt?: string | Date
  status?: string
  acceptPath?: string
  seed?: InvitationSeed | null
}

export function isDomainRole(value: string): value is DomainRole {
  return isPlatformDomainRole(value)
}

export function resolveRoleInfo(
  role: string,
  catalog?: DomainRoleCatalogEntry[],
): { label: string; description: string } {
  return resolveRoleInfoFromCatalog(role, catalog)
}

export function membersExcludingOwner(
  members: DomainMemberRow[],
  ownerUserId: string | null | undefined,
): DomainMemberRow[] {
  if (!ownerUserId) return members
  return members.filter((member) => member.userId !== ownerUserId)
}

export function invitationAcceptUrl(
  acceptPath?: string | null,
  origin: string = typeof window !== "undefined" ? window.location.origin : "",
): string | null {
  const path = acceptPath?.trim()
  if (!path) return null
  if (path.startsWith("http://") || path.startsWith("https://")) return path
  if (!origin) return path
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`
}

export function parseDomainPeoplePayloads(
  membersResponse: {
    owner?: DomainOwnerRow | null
    members?: DomainMemberRow[]
    pendingInvitations?: PendingInvitationRow[]
    roles?: DomainRoleCatalogEntry[]
  },
  connectionsResponse: {
    pendingInvitations?: PendingInvitationRow[]
  } = {},
): {
  owner: DomainOwnerRow | null
  members: DomainMemberRow[]
  pendingInvitations: PendingInvitationRow[]
  roles: DomainRoleCatalogEntry[]
} {
  const owner = membersResponse.owner ?? null
  const pendingFromMembers = membersResponse.pendingInvitations
  return {
    owner,
    members: membersExcludingOwner(
      Array.isArray(membersResponse.members) ? membersResponse.members : [],
      owner?.userId,
    ),
    pendingInvitations: Array.isArray(pendingFromMembers)
      ? pendingFromMembers
      : Array.isArray(connectionsResponse.pendingInvitations)
        ? connectionsResponse.pendingInvitations
        : [],
    roles: Array.isArray(membersResponse.roles)
      ? membersResponse.roles
      : resolveDomainRoleCatalog({}),
  }
}

export function peopleMutationFeedback(
  kind:
    | "member-added"
    | "role-updated"
    | "member-removed"
    | "invited"
    | "invite-created"
    | "invite-resent"
    | "granted"
    | "invite-revoked"
    | "role-saved"
    | "role-added"
    | "role-removed"
    | "failed",
  errorMessage?: string,
): { ok: boolean; message: string } {
  if (kind === "failed") {
    return { ok: false, message: errorMessage?.trim() || "People change failed" }
  }
  const messages = {
    "member-added": "Member added",
    "role-updated": "Role updated",
    "member-removed": "Member removed",
    invited: "Invitation emailed",
    "invite-created": "Invitation created — email could not be sent",
    "invite-resent": "Invitation emailed again",
    granted: "Member added",
    "invite-revoked": "Invitation revoked",
    "role-saved": "Role updated",
    "role-added": "Role added",
    "role-removed": "Role removed",
  } as const
  return { ok: true, message: messages[kind] }
}

export function peopleSeedLines(
  seed?: InvitationSeed | null,
): string[] {
  return formatInvitationSeedLines(normalizeInvitationSeed(seed))
}

export function formatPeopleDate(value?: string | Date | null): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
