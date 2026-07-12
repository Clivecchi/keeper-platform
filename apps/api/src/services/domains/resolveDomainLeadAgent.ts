import type { Prisma, PrismaClient } from "@keeper/database"
import {
  frameLeadMirrorNeedsSync,
  patchFrameLeadAgentMirror,
  readFrameLeadAgentMirror,
  readPrimaryAgentIdFromSettings,
  type DomainLeadResolutionSource,
} from "@keeper/shared"

export interface ResolvedDomainLeadAgent {
  id: string
  slug: string
  name: string
  source: DomainLeadResolutionSource
}

function readDomainSettings(settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return {}
  return settings as Record<string, unknown>
}

async function loadAgentById(
  prisma: PrismaClient,
  agentId: string,
): Promise<ResolvedDomainLeadAgent | null> {
  const agent = await prisma.kip_agents.findUnique({
    where: { id: agentId },
    select: { id: true, slug: true, name: true },
  })
  if (!agent?.slug?.trim()) return null
  return {
    id: agent.id,
    slug: agent.slug.trim(),
    name: agent.name?.trim() || agent.slug.trim(),
    source: "db",
  }
}

async function loadAgentBySlug(
  prisma: PrismaClient,
  slug: string,
  source: DomainLeadResolutionSource,
): Promise<ResolvedDomainLeadAgent | null> {
  const trimmed = slug.trim()
  if (!trimmed) return null
  const agent = await prisma.kip_agents.findUnique({
    where: { slug: trimmed },
    select: { id: true, slug: true, name: true },
  })
  if (!agent?.slug?.trim()) return null
  return {
    id: agent.id,
    slug: agent.slug.trim(),
    name: agent.name?.trim() || agent.slug.trim(),
    source,
  }
}

/**
 * DB-first lead resolution.
 * 1. settings.primaryAgentId → kip_agents
 * 2. frame mirror slug → kip_agents row (migration read only; repair persists primaryAgentId)
 */
export async function resolveDomainLeadAgentFromDomain(
  prisma: PrismaClient,
  domain: { slug: string; frame_json: unknown; settings: unknown },
): Promise<ResolvedDomainLeadAgent | null> {
  const primaryAgentId = readPrimaryAgentIdFromSettings(domain.settings)
  if (primaryAgentId) {
    const fromDb = await loadAgentById(prisma, primaryAgentId)
    if (fromDb) return fromDb
  }

  const mirrorSlug = readFrameLeadAgentMirror(domain.frame_json)
  if (mirrorSlug) {
    const fromMirror = await loadAgentBySlug(prisma, mirrorSlug, "mirror")
    if (fromMirror) return fromMirror
  }

  return null
}

export interface SyncDomainLeadMirrorResult {
  settingsPatched: boolean
  framePatched: boolean
  lead: ResolvedDomainLeadAgent | null
}

/**
 * One write path: persist primaryAgentId when missing, sync frame_json mirror from authoritative lead.
 */
export async function syncDomainLeadAuthority(
  prisma: PrismaClient,
  domain: {
    id: string
    slug: string
    frame_json: unknown
    settings: unknown
  },
): Promise<SyncDomainLeadMirrorResult> {
  const lead = await resolveDomainLeadAgentFromDomain(prisma, domain)
  if (!lead) {
    return { settingsPatched: false, framePatched: false, lead: null }
  }

  const settings = readDomainSettings(domain.settings)
  const primaryAgentId = readPrimaryAgentIdFromSettings(domain.settings)
  let settingsPatched = false
  let nextSettings = settings

  if (!primaryAgentId || primaryAgentId !== lead.id) {
    nextSettings = { ...settings, primaryAgentId: lead.id }
    settingsPatched = true
  }

  const frameNeedsSync = frameLeadMirrorNeedsSync(domain.frame_json, lead.slug)
  let framePatched = false
  let nextFrame: Record<string, unknown> | null = null

  if (frameNeedsSync) {
    nextFrame = patchFrameLeadAgentMirror(domain.frame_json, lead.slug)
    framePatched = true
  }

  if (settingsPatched || framePatched) {
    await prisma.domain.update({
      where: { id: domain.id },
      data: {
        ...(settingsPatched
          ? { settings: nextSettings as Prisma.InputJsonValue }
          : {}),
        ...(framePatched && nextFrame
          ? { frame_json: nextFrame as Prisma.InputJsonValue }
          : {}),
        updatedAt: new Date(),
      },
    })
  }

  return {
    settingsPatched,
    framePatched,
    lead: { ...lead, source: "db" },
  }
}

export interface DomainLeadAgentFields {
  leadAgentSlug: string | null
  leadAgentName: string | null
  leadAgentId: string | null
}

/** Batch-resolve lead agents for domain lists — DB-first, mirror row lookup as fallback. */
export async function enrichDomainsWithLeadAgents<
  T extends { id: string; slug: string; frame_json: unknown; settings: unknown },
>(
  prisma: PrismaClient,
  domains: T[],
): Promise<Array<T & DomainLeadAgentFields>> {
  if (domains.length === 0) return []

  const primaryIds = [
    ...new Set(
      domains
        .map((domain) => readPrimaryAgentIdFromSettings(domain.settings))
        .filter((id): id is string => !!id),
    ),
  ]

  const agentsById = new Map<string, { id: string; slug: string; name: string | null }>()
  if (primaryIds.length > 0) {
    const agents = await prisma.kip_agents.findMany({
      where: { id: { in: primaryIds } },
      select: { id: true, slug: true, name: true },
    })
    for (const agent of agents) {
      agentsById.set(agent.id, agent)
    }
  }

  const mirrorSlugs = new Set<string>()
  for (const domain of domains) {
    const primaryId = readPrimaryAgentIdFromSettings(domain.settings)
    if (primaryId && agentsById.has(primaryId)) continue
    const mirror = readFrameLeadAgentMirror(domain.frame_json)
    if (mirror) mirrorSlugs.add(mirror.trim())
  }

  const agentsBySlug = new Map<string, { id: string; slug: string; name: string | null }>()
  if (mirrorSlugs.size > 0) {
    const agents = await prisma.kip_agents.findMany({
      where: { slug: { in: [...mirrorSlugs] } },
      select: { id: true, slug: true, name: true },
    })
    for (const agent of agents) {
      agentsBySlug.set(agent.slug.trim().toLowerCase(), agent)
    }
  }

  return domains.map((domain) => {
    const primaryId = readPrimaryAgentIdFromSettings(domain.settings)
    const primaryAgent = primaryId ? agentsById.get(primaryId) : null
    if (primaryAgent?.slug?.trim()) {
      return {
        ...domain,
        leadAgentId: primaryAgent.id,
        leadAgentSlug: primaryAgent.slug.trim(),
        leadAgentName: primaryAgent.name?.trim() || primaryAgent.slug.trim(),
      }
    }

    const mirror = readFrameLeadAgentMirror(domain.frame_json)
    const mirrorAgent = mirror
      ? agentsBySlug.get(mirror.trim().toLowerCase())
      : null
    if (mirrorAgent?.slug?.trim()) {
      return {
        ...domain,
        leadAgentId: mirrorAgent.id,
        leadAgentSlug: mirrorAgent.slug.trim(),
        leadAgentName: mirrorAgent.name?.trim() || mirrorAgent.slug.trim(),
      }
    }

    return {
      ...domain,
      leadAgentId: null,
      leadAgentSlug: null,
      leadAgentName: null,
    }
  })
}
