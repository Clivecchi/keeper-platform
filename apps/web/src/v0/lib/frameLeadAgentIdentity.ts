import { KipApi } from "../../lib/kipApi"

const displayNameCache = new Map<string, string>()
const missingLeadSlugs = new Set<string>()

export const KIP_FALLBACK_SLUG = "kip" as const
export const KIP_FALLBACK_DISPLAY_NAME = "Kip" as const

/** Placeholder slugs in frame JSON — not real `kip_agents` rows. */
export const PLACEHOLDER_LEAD_AGENT_SLUGS = new Set<string>([
  KIP_FALLBACK_SLUG,
  "kip-default",
])

export function normalizeLeadAgentSlug(slug: string | null | undefined): string {
  const trimmed = slug?.trim()
  if (!trimmed || PLACEHOLDER_LEAD_AGENT_SLUGS.has(trimmed)) {
    return KIP_FALLBACK_SLUG
  }
  return trimmed
}

export function getCachedFrameLeadAgentDisplayName(slug: string): string | null {
  const trimmed = slug.trim()
  if (!trimmed || PLACEHOLDER_LEAD_AGENT_SLUGS.has(trimmed)) {
    return KIP_FALLBACK_DISPLAY_NAME
  }
  return displayNameCache.get(trimmed) ?? null
}

export function clearFrameLeadAgentDisplayNameCache(): void {
  displayNameCache.clear()
  missingLeadSlugs.clear()
}

export async function fetchFrameLeadAgentDisplayName(slug: string): Promise<string> {
  const trimmed = slug.trim()
  if (!trimmed || PLACEHOLDER_LEAD_AGENT_SLUGS.has(trimmed)) {
    return KIP_FALLBACK_DISPLAY_NAME
  }

  if (missingLeadSlugs.has(trimmed)) {
    return KIP_FALLBACK_DISPLAY_NAME
  }

  const cached = displayNameCache.get(trimmed)
  if (cached) return cached

  try {
    const agent = await KipApi.getAgentBySlug(trimmed)
    const name = agent.name?.trim() || trimmed
    displayNameCache.set(trimmed, name)
    return name
  } catch {
    missingLeadSlugs.add(trimmed)
    return KIP_FALLBACK_DISPLAY_NAME
  }
}

/** Custom lead slug from frame JSON, or null when platform default (`kip` / `kip-default`). */
export function readFrameLeadAgentSlug(
  domainFrame: { kip?: { agent_id?: string | null } } | null | undefined,
): string | null {
  const slug = domainFrame?.kip?.agent_id?.trim()
  if (!slug || PLACEHOLDER_LEAD_AGENT_SLUGS.has(slug)) return null
  return slug
}

/** Slug passed to dialog bootstrap — never a placeholder id. */
export function resolveDialogAgentSlug(
  domainFrame: { kip?: { agent_id?: string | null } } | null | undefined,
): string {
  const custom = readFrameLeadAgentSlug(domainFrame)
  return custom ?? KIP_FALLBACK_SLUG
}

/** Resolve agent UUID for dialog — falls back to platform `kip` when domain lead is missing. */
export async function resolveLeadAgentId(slug: string): Promise<string> {
  const primary = normalizeLeadAgentSlug(slug)
  if (primary === KIP_FALLBACK_SLUG) {
    const agent = await KipApi.getAgentBySlug(KIP_FALLBACK_SLUG)
    return agent.id
  }
  if (missingLeadSlugs.has(primary)) {
    const agent = await KipApi.getAgentBySlug(KIP_FALLBACK_SLUG)
    return agent.id
  }
  try {
    const agent = await KipApi.getAgentBySlug(primary)
    return agent.id
  } catch (primaryError) {
    missingLeadSlugs.add(primary)
    if (primary === KIP_FALLBACK_SLUG) throw primaryError
    const agent = await KipApi.getAgentBySlug(KIP_FALLBACK_SLUG)
    return agent.id
  }
}
