import type { PrismaClient } from "@keeper/database"
import {
  readPrimaryAgentIdFromSettings,
  resolveDomainLeadAgentSlugSync,
} from "@keeper/shared"

export interface ResolvedDomainLeadAgent {
  id: string
  slug: string
  name: string
}

function readFrameAgentId(frameJson: unknown): string | null {
  if (!frameJson || typeof frameJson !== "object") return null
  const kip = (frameJson as { kip?: { agent_id?: unknown } }).kip
  const raw = kip?.agent_id
  return typeof raw === "string" && raw.trim() ? raw.trim() : null
}

/** Resolve domain lead from DB (`settings.primaryAgentId`) first, then frame, then legacy canonical map. */
export async function resolveDomainLeadAgentFromDomain(
  prisma: PrismaClient,
  domain: { slug: string; frame_json: unknown; settings: unknown },
): Promise<ResolvedDomainLeadAgent | null> {
  const primaryAgentId = readPrimaryAgentIdFromSettings(domain.settings)
  if (primaryAgentId) {
    const agent = await prisma.kip_agents.findUnique({
      where: { id: primaryAgentId },
      select: { id: true, slug: true, name: true },
    })
    if (agent?.slug?.trim()) {
      return {
        id: agent.id,
        slug: agent.slug.trim(),
        name: agent.name?.trim() || agent.slug.trim(),
      }
    }
  }

  const syncSlug = resolveDomainLeadAgentSlugSync({
    domainSlug: domain.slug,
    frameAgentId: readFrameAgentId(domain.frame_json),
  })
  if (!syncSlug) return null

  const agent = await prisma.kip_agents.findUnique({
    where: { slug: syncSlug },
    select: { id: true, slug: true, name: true },
  })
  if (!agent?.slug?.trim()) return null

  return {
    id: agent.id,
    slug: agent.slug.trim(),
    name: agent.name?.trim() || agent.slug.trim(),
  }
}

export interface DomainLeadAgentFields {
  leadAgentSlug: string | null
  leadAgentName: string | null
  leadAgentId: string | null
}

/** Batch-resolve lead agents for domain lists — one query for all primaryAgentId rows. */
export async function enrichDomainsWithLeadAgents<
  T extends { slug: string; frame_json: unknown; settings: unknown },
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

  const frameFallbackSlugs = new Set<string>()
  for (const domain of domains) {
    const primaryId = readPrimaryAgentIdFromSettings(domain.settings)
    if (primaryId && agentsById.has(primaryId)) continue
    const syncSlug = resolveDomainLeadAgentSlugSync({
      domainSlug: domain.slug,
      frameAgentId: readFrameAgentId(domain.frame_json),
    })
    if (syncSlug) frameFallbackSlugs.add(syncSlug)
  }

  const agentsBySlug = new Map<string, { id: string; slug: string; name: string | null }>()
  if (frameFallbackSlugs.size > 0) {
    const agents = await prisma.kip_agents.findMany({
      where: { slug: { in: [...frameFallbackSlugs] } },
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

    const syncSlug = resolveDomainLeadAgentSlugSync({
      domainSlug: domain.slug,
      frameAgentId: readFrameAgentId(domain.frame_json),
    })
    const frameAgent = syncSlug
      ? agentsBySlug.get(syncSlug.trim().toLowerCase())
      : null
    if (frameAgent?.slug?.trim()) {
      return {
        ...domain,
        leadAgentId: frameAgent.id,
        leadAgentSlug: frameAgent.slug.trim(),
        leadAgentName: frameAgent.name?.trim() || frameAgent.slug.trim(),
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
