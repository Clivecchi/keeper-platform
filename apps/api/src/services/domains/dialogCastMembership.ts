/**
 * Dialog cast membership — Phase 1 (enablement only, not delegation).
 *
 * A user may enable the lead agent of any domain they administer (owner or
 * DomainPermission.role === 'admin') onto a Dialog in another domain.
 * Admin is checked via direct Prisma at request time — never trusted from client.
 */

import { prisma } from "@keeper/database"
import { resolveDomainLeadAgentFromDomain } from "./resolveDomainLeadAgent.js"
import {
  DOMAIN_ACCESSIBLE_PLATFORM_AGENT_SLUGS,
  loadDomainScopedAgents,
} from "./loadDomainScopedAgents.js"

export type DialogCastCandidate = {
  homeDomainId: string
  homeDomainSlug: string
  homeDomainName: string
  agentId: string
  agentSlug: string
  agentName: string
}

export type DialogCastMemberRow = DialogCastCandidate & {
  enabledAt: string
}

/** Direct DB check — owner or unexpired admin role. No permission cache. */
export async function userHoldsDomainAdmin(
  userId: string,
  domainId: string,
): Promise<boolean> {
  const domain = await prisma.domain.findFirst({
    where: { id: domainId, deletedAt: null },
    select: { ownerId: true },
  })
  if (!domain) return false
  if (domain.ownerId === userId) return true

  const permission = await prisma.domainPermission.findFirst({
    where: {
      domainId,
      userId,
      role: "admin",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    select: { id: true },
  })
  return !!permission
}

async function loadDialogInDomain(domainId: string, dialogId: string) {
  return prisma.dialog.findFirst({
    where: { id: dialogId, domain_id: domainId, is_archived: false },
    select: { id: true, domain_id: true },
  })
}

/** Domains the user owns or holds admin DomainPermission on (direct DB). */
async function listUserAdminDomains(userId: string): Promise<
  Array<{ id: string; slug: string; name: string; settings: unknown; frame_json: unknown }>
> {
  const [owned, adminPerms] = await Promise.all([
    prisma.domain.findMany({
      where: { ownerId: userId, deletedAt: null, isActive: true },
      select: { id: true, slug: true, name: true, settings: true, frame_json: true },
    }),
    prisma.domainPermission.findMany({
      where: {
        userId,
        role: "admin",
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      select: { domainId: true },
    }),
  ])

  const ownedIds = new Set(owned.map((d) => d.id))
  const extraIds = adminPerms
    .map((p) => p.domainId)
    .filter((id) => !ownedIds.has(id))

  const fromPerms =
    extraIds.length === 0
      ? []
      : await prisma.domain.findMany({
          where: { id: { in: extraIds }, deletedAt: null, isActive: true },
          select: { id: true, slug: true, name: true, settings: true, frame_json: true },
        })

  return [...owned, ...fromPerms]
}

/**
 * Lead agents from domains the user administers, excluding the current domain
 * roster baseline (Kip / Cloud / Rendr / domain lead) and already-enabled members.
 */
export async function listDialogCastCandidates(params: {
  userId: string
  domainId: string
  dialogId: string
}): Promise<DialogCastCandidate[]> {
  const dialog = await loadDialogInDomain(params.domainId, params.dialogId)
  if (!dialog) {
    const err = new Error("DIALOG_NOT_FOUND")
    ;(err as Error & { code: string }).code = "DIALOG_NOT_FOUND"
    throw err
  }

  const [adminDomains, baselineAgents, existingMembers] = await Promise.all([
    listUserAdminDomains(params.userId),
    loadDomainScopedAgents(params.domainId),
    prisma.dialogCastMember.findMany({
      where: { dialogId: params.dialogId },
      select: { agentId: true },
    }),
  ])

  const blockedAgentIds = new Set(baselineAgents.map((a) => a.id))
  for (const row of existingMembers) blockedAgentIds.add(row.agentId)

  const blockedSlugs = new Set<string>([
    "kip",
    ...DOMAIN_ACCESSIBLE_PLATFORM_AGENT_SLUGS,
    ...baselineAgents.map((a) => a.slug.trim().toLowerCase()),
  ])

  const candidates: DialogCastCandidate[] = []

  for (const domain of adminDomains) {
    if (domain.id === params.domainId) continue

    const lead = await resolveDomainLeadAgentFromDomain(prisma, domain)
    if (!lead) continue
    if (blockedAgentIds.has(lead.id)) continue
    if (blockedSlugs.has(lead.slug.trim().toLowerCase())) continue

    candidates.push({
      homeDomainId: domain.id,
      homeDomainSlug: domain.slug,
      homeDomainName: domain.name,
      agentId: lead.id,
      agentSlug: lead.slug,
      agentName: lead.name,
    })
  }

  candidates.sort((a, b) => a.agentName.localeCompare(b.agentName))
  return candidates
}

/**
 * Enabled cast members for a Dialog. Re-checks Admin on homeDomainId for the
 * requesting user at read time — revoked admin hides the member.
 */
export async function listDialogCastMembers(params: {
  userId: string
  domainId: string
  dialogId: string
}): Promise<DialogCastMemberRow[]> {
  const dialog = await loadDialogInDomain(params.domainId, params.dialogId)
  if (!dialog) {
    const err = new Error("DIALOG_NOT_FOUND")
    ;(err as Error & { code: string }).code = "DIALOG_NOT_FOUND"
    throw err
  }

  const rows = await prisma.dialogCastMember.findMany({
    where: { dialogId: params.dialogId },
    include: {
      agent: { select: { id: true, slug: true, name: true } },
      homeDomain: {
        select: { id: true, slug: true, name: true, settings: true, frame_json: true },
      },
    },
    orderBy: { enabledAt: "asc" },
  })

  const members: DialogCastMemberRow[] = []
  for (const row of rows) {
    const stillAdmin = await userHoldsDomainAdmin(params.userId, row.homeDomainId)
    if (!stillAdmin) continue

    // Confirm agent is still that domain's lead (reuse resolution — no second path).
    const lead = await resolveDomainLeadAgentFromDomain(prisma, row.homeDomain)
    if (!lead || lead.id !== row.agentId) continue

    members.push({
      homeDomainId: row.homeDomain.id,
      homeDomainSlug: row.homeDomain.slug,
      homeDomainName: row.homeDomain.name,
      agentId: row.agent.id,
      agentSlug: row.agent.slug,
      agentName: row.agent.name,
      enabledAt: row.enabledAt.toISOString(),
    })
  }

  return members
}

/**
 * Enable the lead agent of homeDomainId on the Dialog.
 * Client supplies homeDomainId only — server resolves the lead and checks Admin.
 */
export async function enableDialogCastMember(params: {
  userId: string
  domainId: string
  dialogId: string
  homeDomainId: string
}): Promise<DialogCastMemberRow> {
  const dialog = await loadDialogInDomain(params.domainId, params.dialogId)
  if (!dialog) {
    const err = new Error("DIALOG_NOT_FOUND")
    ;(err as Error & { code: string }).code = "DIALOG_NOT_FOUND"
    throw err
  }

  if (params.homeDomainId === params.domainId) {
    const err = new Error("CANNOT_ENABLE_CURRENT_DOMAIN_LEAD")
    ;(err as Error & { code: string }).code = "CANNOT_ENABLE_CURRENT_DOMAIN_LEAD"
    throw err
  }

  const isAdmin = await userHoldsDomainAdmin(params.userId, params.homeDomainId)
  if (!isAdmin) {
    const err = new Error("ADMIN_REQUIRED_ON_HOME_DOMAIN")
    ;(err as Error & { code: string }).code = "ADMIN_REQUIRED_ON_HOME_DOMAIN"
    throw err
  }

  const homeDomain = await prisma.domain.findFirst({
    where: { id: params.homeDomainId, deletedAt: null, isActive: true },
    select: { id: true, slug: true, name: true, settings: true, frame_json: true },
  })
  if (!homeDomain) {
    const err = new Error("HOME_DOMAIN_NOT_FOUND")
    ;(err as Error & { code: string }).code = "HOME_DOMAIN_NOT_FOUND"
    throw err
  }

  const lead = await resolveDomainLeadAgentFromDomain(prisma, homeDomain)
  if (!lead) {
    const err = new Error("HOME_DOMAIN_HAS_NO_LEAD")
    ;(err as Error & { code: string }).code = "HOME_DOMAIN_HAS_NO_LEAD"
    throw err
  }

  const baseline = await loadDomainScopedAgents(params.domainId)
  if (
    baseline.some((a) => a.id === lead.id)
    || lead.slug.trim().toLowerCase() === "kip"
    || (DOMAIN_ACCESSIBLE_PLATFORM_AGENT_SLUGS as readonly string[]).includes(
      lead.slug.trim().toLowerCase(),
    )
  ) {
    const err = new Error("AGENT_ALREADY_ON_DOMAIN_ROSTER")
    ;(err as Error & { code: string }).code = "AGENT_ALREADY_ON_DOMAIN_ROSTER"
    throw err
  }

  const row = await prisma.dialogCastMember.upsert({
    where: {
      dialogId_agentId: {
        dialogId: params.dialogId,
        agentId: lead.id,
      },
    },
    create: {
      dialogId: params.dialogId,
      agentId: lead.id,
      homeDomainId: homeDomain.id,
      enabledByUserId: params.userId,
    },
    update: {
      homeDomainId: homeDomain.id,
      enabledByUserId: params.userId,
      enabledAt: new Date(),
    },
  })

  return {
    homeDomainId: homeDomain.id,
    homeDomainSlug: homeDomain.slug,
    homeDomainName: homeDomain.name,
    agentId: lead.id,
    agentSlug: lead.slug,
    agentName: lead.name,
    enabledAt: row.enabledAt.toISOString(),
  }
}

export async function disableDialogCastMember(params: {
  userId: string
  domainId: string
  dialogId: string
  agentId: string
}): Promise<void> {
  const dialog = await loadDialogInDomain(params.domainId, params.dialogId)
  if (!dialog) {
    const err = new Error("DIALOG_NOT_FOUND")
    ;(err as Error & { code: string }).code = "DIALOG_NOT_FOUND"
    throw err
  }

  const existing = await prisma.dialogCastMember.findUnique({
    where: {
      dialogId_agentId: {
        dialogId: params.dialogId,
        agentId: params.agentId,
      },
    },
    select: { homeDomainId: true },
  })
  if (!existing) {
    const err = new Error("CAST_MEMBER_NOT_FOUND")
    ;(err as Error & { code: string }).code = "CAST_MEMBER_NOT_FOUND"
    throw err
  }

  // Only someone who still admins the home domain (or who enabled it) may remove —
  // require Admin on home domain so revoke stays permission-driven.
  const isAdmin = await userHoldsDomainAdmin(params.userId, existing.homeDomainId)
  if (!isAdmin) {
    const err = new Error("ADMIN_REQUIRED_ON_HOME_DOMAIN")
    ;(err as Error & { code: string }).code = "ADMIN_REQUIRED_ON_HOME_DOMAIN"
    throw err
  }

  await prisma.dialogCastMember.delete({
    where: {
      dialogId_agentId: {
        dialogId: params.dialogId,
        agentId: params.agentId,
      },
    },
  })
}
