import type { Prisma, PrismaClient } from "@keeper/database"
import {
  CANONICAL_DOMAIN_LEAD_BINDINGS,
  isSyntheticLeadAgentSlug,
  resolveCanonicalLeadAgentSlug,
} from "@keeper/shared"

export interface DomainLeadBindingIssue {
  domainId: string
  domainSlug: string
  previousAgentId: string | null
  nextAgentId: string | null
  reason: "canonical_binding" | "already_correct" | "uncast_no_binding"
}

export interface RepairDomainLeadBindingsResult {
  patched: DomainLeadBindingIssue[]
  alreadyCorrect: string[]
  uncast: DomainLeadBindingIssue[]
  descriptionFixes: Array<{ domainSlug: string; from: string; to: string }>
}

const LIVECCHI_TYPO_PATTERN = /freindsd/gi

function readFrameAgentId(frameJson: unknown): string | null {
  if (!frameJson || typeof frameJson !== "object") return null
  const kip = (frameJson as { kip?: { agent_id?: unknown } }).kip
  const raw = kip?.agent_id
  return typeof raw === "string" && raw.trim() ? raw.trim() : null
}

function patchFrameAgentId(
  frameJson: unknown,
  nextAgentId: string,
): Record<string, unknown> {
  const base =
    frameJson && typeof frameJson === "object" && !Array.isArray(frameJson)
      ? ({ ...(frameJson as Record<string, unknown>) } as Record<string, unknown>)
      : {}
  const kip =
    base.kip && typeof base.kip === "object"
      ? { ...(base.kip as Record<string, unknown>) }
      : {}
  return {
    ...base,
    kip: {
      ...kip,
      agent_id: nextAgentId,
    },
  }
}

function fixLivecchiTypoInText(text: string | null | undefined): string | null {
  if (!text || !LIVECCHI_TYPO_PATTERN.test(text)) return null
  LIVECCHI_TYPO_PATTERN.lastIndex = 0
  return text.replace(LIVECCHI_TYPO_PATTERN, "friends")
}

function fixLivecchiTypoInFrame(frameJson: unknown): Record<string, unknown> | null {
  if (!frameJson || typeof frameJson !== "object" || Array.isArray(frameJson)) return null
  const frame = { ...(frameJson as Record<string, unknown>) }
  let changed = false

  const patchStringField = (key: string) => {
    const value = frame[key]
    if (typeof value !== "string") return
    const fixed = fixLivecchiTypoInText(value)
    if (fixed) {
      frame[key] = fixed
      changed = true
    }
  }

  patchStringField("description")
  if (frame.theme && typeof frame.theme === "object") {
    const theme = { ...(frame.theme as Record<string, unknown>) }
    const tagline = theme.tagline
    if (typeof tagline === "string") {
      const fixed = fixLivecchiTypoInText(tagline)
      if (fixed) {
        theme.tagline = fixed
        frame.theme = theme
        changed = true
      }
    }
  }

  if (frame.kip_context && typeof frame.kip_context === "object") {
    const ctx = { ...(frame.kip_context as Record<string, unknown>) }
    let ctxChanged = false
    for (const [key, value] of Object.entries(ctx)) {
      if (typeof value !== "string") continue
      const fixed = fixLivecchiTypoInText(value)
      if (fixed) {
        ctx[key] = fixed
        ctxChanged = true
      }
    }
    if (ctxChanged) {
      frame.kip_context = ctx
      changed = true
    }
  }

  if (frame.kip && typeof frame.kip === "object") {
    const kip = { ...(frame.kip as Record<string, unknown>) }
    const greeting = kip.greeting
    if (typeof greeting === "string") {
      const fixed = fixLivecchiTypoInText(greeting)
      if (fixed) {
        kip.greeting = fixed
        frame.kip = kip
        changed = true
      }
    }
  }

  if (frame.cover && typeof frame.cover === "object") {
    const cover = { ...(frame.cover as Record<string, unknown>) }
    if (cover.card && typeof cover.card === "object") {
      const card = { ...(cover.card as Record<string, unknown>) }
      const tagLine = card.tagLine
      if (typeof tagLine === "string") {
        const fixed = fixLivecchiTypoInText(tagLine)
        if (fixed) {
          card.tagLine = fixed
          cover.card = card
          frame.cover = cover
          changed = true
        }
      }
    }
  }

  return changed ? frame : null
}

/**
 * Repair placeholder `{slug}-lead` frame bindings and known canonical mappings.
 * Idempotent — safe to run on GET /api/domains/my.
 */
export async function repairDomainLeadBindings(
  prisma: PrismaClient,
  options?: { ownerId?: string; domainSlug?: string },
): Promise<RepairDomainLeadBindingsResult> {
  const result: RepairDomainLeadBindingsResult = {
    patched: [],
    alreadyCorrect: [],
    uncast: [],
    descriptionFixes: [],
  }

  const domains = await prisma.domain.findMany({
    where: {
      ...(options?.ownerId ? { ownerId: options.ownerId } : {}),
      ...(options?.domainSlug
        ? { slug: options.domainSlug.trim().toLowerCase() }
        : {}),
    },
    select: {
      id: true,
      slug: true,
      description: true,
      frame_json: true,
    },
  })

  for (const domain of domains) {
    const slug = domain.slug.trim().toLowerCase()
    const current = readFrameAgentId(domain.frame_json)
    const target = resolveCanonicalLeadAgentSlug(domain.slug, current)

    const descriptionFix = fixLivecchiTypoInText(domain.description)
    const frameTypoFix =
      slug === "livecchi" ? fixLivecchiTypoInFrame(domain.frame_json) : null

    if (descriptionFix && slug === "livecchi") {
      result.descriptionFixes.push({
        domainSlug: domain.slug,
        from: domain.description ?? "",
        to: descriptionFix,
      })
    }

    if (descriptionFix || frameTypoFix) {
      await prisma.domain.update({
        where: { id: domain.id },
        data: {
          ...(descriptionFix ? { description: descriptionFix } : {}),
          ...(frameTypoFix ? { frame_json: frameTypoFix as Prisma.InputJsonValue } : {}),
          updatedAt: new Date(),
        },
      })
    }

    if (target && current === target) {
      result.alreadyCorrect.push(domain.slug)
      continue
    }

    if (target && current !== target) {
      const agentExists = await prisma.kip_agents.findUnique({
        where: { slug: target },
        select: { id: true },
      })
      if (!agentExists) {
        result.uncast.push({
          domainId: domain.id,
          domainSlug: domain.slug,
          previousAgentId: current,
          nextAgentId: null,
          reason: "uncast_no_binding",
        })
        continue
      }

      await prisma.domain.update({
        where: { id: domain.id },
        data: {
          frame_json: patchFrameAgentId(domain.frame_json, target) as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      })

      result.patched.push({
        domainId: domain.id,
        domainSlug: domain.slug,
        previousAgentId: current,
        nextAgentId: target,
        reason: "canonical_binding",
      })
      continue
    }

    if (current && isSyntheticLeadAgentSlug(current)) {
      result.uncast.push({
        domainId: domain.id,
        domainSlug: domain.slug,
        previousAgentId: current,
        nextAgentId: null,
        reason: "uncast_no_binding",
      })
    } else if (current) {
      result.alreadyCorrect.push(domain.slug)
    }
  }

  if (result.patched.length > 0 || result.descriptionFixes.length > 0) {
    console.info("[domainLeadBindings] repair complete", {
      patched: result.patched.map((row) => ({
        slug: row.domainSlug,
        from: row.previousAgentId,
        to: row.nextAgentId,
      })),
      descriptionFixes: result.descriptionFixes,
      canonicalMap: CANONICAL_DOMAIN_LEAD_BINDINGS,
    })
  }

  return result
}
