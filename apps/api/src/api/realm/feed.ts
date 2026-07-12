import { Router, type Request, type Response } from "express"
import {
  DomainCacheService,
  DomainService,
  prisma,
} from "@keeper/database"
import type { RealmFeedEvent, RealmFeedResponse } from "@keeper/shared"
import { authMiddlewareCompat } from "../../middleware/authMiddleware.js"
import { getRedis } from "../../lib/redis.js"
import { resolveDomainLeadAgentFromDomain } from "../../services/domains/resolveDomainLeadAgent.js"

const router = Router()

const REMARKS_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000
const MAX_EVENTS = 40

let cacheService: DomainCacheService | null = null
let domainService: DomainService | null = null

function getDomainService(): DomainService {
  if (!domainService) {
    if (!cacheService) {
      cacheService = new DomainCacheService(getRedis())
    }
    domainService = new DomainService(prisma, cacheService)
  }
  return domainService
}

function buildRemarks(events: RealmFeedEvent[], agentName: string): string {
  if (events.length === 0) {
    return `Welcome back. ${agentName} is here when you're ready — type below or choose a door.`
  }

  const parts: string[] = []
  const drafts = events.filter((e) => e.type === "draft_waiting")
  const sessions = events.filter((e) => e.type === "session_updated")
  const moments = events.filter((e) => e.type === "moment_kept")

  if (sessions.length > 0) {
    parts.push(
      sessions.length === 1
        ? `You left a thread open in ${sessions[0]!.domainName}.`
        : `${sessions.length} conversations have moved since your last visit.`,
    )
  }

  if (drafts.length > 0) {
    parts.push(
      drafts.length === 1
        ? `A draft is waiting in ${drafts[0]!.domainName}.`
        : `${drafts.length} drafts are waiting across your domains.`,
    )
  }

  if (moments.length > 0) {
    parts.push(
      moments.length === 1
        ? `Something was kept in ${moments[0]!.domainName}.`
        : `${moments.length} moments landed while you were away.`,
    )
  }

  if (parts.length === 0) {
    parts.push(`Activity stirred in ${events[0]!.domainName}.`)
  }

  return parts.slice(0, 3).join(" ")
}

async function resolveAnchorAgentName(domainId: string): Promise<string> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { slug: true, frame_json: true, settings: true },
  })
  if (!domain) return "your lead agent"

  const lead = await resolveDomainLeadAgentFromDomain(prisma, domain)
  return lead?.name?.trim() || "your lead agent"
}

// GET /api/realm/feed — person-scoped cross-domain activity
router.get("/feed", authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" })
    }

    const since = new Date(Date.now() - REMARKS_LOOKBACK_MS)
    const domains = await getDomainService().getUserDomains(userId)
    const domainIds = domains.map((d) => d.id).filter(Boolean)
    const domainById = new Map(domains.map((d) => [d.id, d]))

    if (domainIds.length === 0) {
      const empty: RealmFeedResponse = {
        events: [],
        remarks: "Welcome. Your realm is ready when you add a domain.",
        counts: { drafts: 0, sessions: 0, moments: 0, domains: 0 },
      }
      return res.json(empty)
    }

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { primaryDomainId: true },
    })

    const anchorDomainId = user?.primaryDomainId?.trim() || domainIds[0]!
    const anchorDomain = domainById.get(anchorDomainId) ?? domains[0]!
    const anchorAgentName = await resolveAnchorAgentName(anchorDomain.id)

    const [drafts, sessions, moments] = await Promise.all([
      prisma.kip_drafts.findMany({
        where: {
          domain_id: { in: domainIds },
          owner_id: userId,
          status: { in: ["draft", "active"] },
          updated_at: { gte: since },
        },
        orderBy: { updated_at: "desc" },
        take: 15,
        select: {
          id: true,
          title: true,
          domain_id: true,
          updated_at: true,
        },
      }),
      prisma.kip_sessions.findMany({
        where: {
          user_id: userId,
          updated_at: { gte: since },
        },
        orderBy: { updated_at: "desc" },
        take: 15,
        select: {
          id: true,
          session_name: true,
          topic: true,
          updated_at: true,
          dialog_id: true,
          dialog: { select: { domain_id: true } },
        },
      }),
      prisma.moment.findMany({
        where: {
          domainId: { in: domainIds },
          ownerId: userId,
          updatedAt: { gte: since },
        },
        orderBy: { updatedAt: "desc" },
        take: 15,
        select: {
          id: true,
          title: true,
          domainId: true,
          updatedAt: true,
          keptAt: true,
        },
      }),
    ])

    const events: RealmFeedEvent[] = []

    for (const draft of drafts) {
      const domain = domainById.get(draft.domain_id)
      if (!domain) continue
      events.push({
        id: `draft:${draft.id}`,
        type: "draft_waiting",
        occurredAt: draft.updated_at.toISOString(),
        domainId: domain.id,
        domainSlug: domain.slug,
        domainName: domain.name,
        summary: draft.title?.trim() || "Untitled draft",
        entityId: draft.id,
        deepLink: `/d/${encodeURIComponent(domain.slug)}?board=domain`,
      })
    }

    for (const session of sessions) {
      const sessionDomainId = session.dialog?.domain_id?.trim() || null
      const domain =
        (sessionDomainId ? domainById.get(sessionDomainId) : null) ?? anchorDomain
      const label =
        session.session_name?.trim() ||
        session.topic?.trim() ||
        "Conversation"
      const dialogQuery = session.dialog_id
        ? `&dialog=${encodeURIComponent(session.dialog_id)}`
        : ""
      events.push({
        id: `session:${session.id}`,
        type: "session_updated",
        occurredAt: session.updated_at.toISOString(),
        domainId: domain.id,
        domainSlug: domain.slug,
        domainName: domain.name,
        summary: label,
        entityId: session.id,
        dialogId: session.dialog_id ?? undefined,
        deepLink: `/d/${encodeURIComponent(domain.slug)}?board=domain${dialogQuery}`,
      })
    }

    for (const moment of moments) {
      if (!moment.domainId) continue
      const domain = domainById.get(moment.domainId)
      if (!domain) continue
      const when = moment.keptAt ?? moment.updatedAt
      events.push({
        id: `moment:${moment.id}`,
        type: "moment_kept",
        occurredAt: when.toISOString(),
        domainId: domain.id,
        domainSlug: domain.slug,
        domainName: domain.name,
        summary: moment.title?.trim() || "Moment",
        entityId: moment.id,
        deepLink: `/d/${encodeURIComponent(domain.slug)}?board=domain`,
      })
    }

    events.sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )

    const trimmed = events.slice(0, MAX_EVENTS)
    const response: RealmFeedResponse = {
      events: trimmed,
      remarks: buildRemarks(trimmed, anchorAgentName),
      counts: {
        drafts: drafts.length,
        sessions: sessions.length,
        moments: moments.length,
        domains: domainIds.length,
      },
    }

    return res.json(response)
  } catch (error) {
    console.error("[realm/feed] error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

// PATCH /api/realm/anchor — persist personal realm anchor (users.primaryDomainId)
router.patch("/anchor", authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" })
    }

    const body = req.body as { domainId?: string; domainSlug?: string }
    const domainId = body.domainId?.trim() || ""
    const domainSlug = body.domainSlug?.trim().toLowerCase() || ""

    if (!domainId && !domainSlug) {
      return res.status(400).json({ error: "domainId or domainSlug required" })
    }

    const domains = await getDomainService().getUserDomains(userId)
    const match = domainId
      ? domains.find((d) => d.id === domainId)
      : domains.find((d) => d.slug.trim().toLowerCase() === domainSlug)

    if (!match) {
      return res.status(403).json({ error: "Domain not in your reach" })
    }

    await prisma.users.update({
      where: { id: userId },
      data: { primaryDomainId: match.id },
    })

    return res.json({
      success: true,
      anchorDomainId: match.id,
      anchorDomainSlug: match.slug,
    })
  } catch (error) {
    console.error("[realm/anchor] error:", error)
    return res.status(500).json({ error: "Internal server error" })
  }
})

export default router
