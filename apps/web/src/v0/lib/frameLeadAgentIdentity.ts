import { KipApi } from "../../lib/kipApi"

const displayNameCache = new Map<string, string>()

export const KIP_FALLBACK_SLUG = "kip" as const
export const KIP_FALLBACK_DISPLAY_NAME = "Kip" as const

export function getCachedFrameLeadAgentDisplayName(slug: string): string | null {
  const trimmed = slug.trim()
  if (!trimmed || trimmed === KIP_FALLBACK_SLUG) return KIP_FALLBACK_DISPLAY_NAME
  return displayNameCache.get(trimmed) ?? null
}

/**
 * Resolve a domain frame lead agent slug to its display name (`kip_agents.name`).
 * Falls back to slug when lookup fails; caches successful lookups for the session.
 */
export function clearFrameLeadAgentDisplayNameCache(): void {
  displayNameCache.clear()
}

export async function fetchFrameLeadAgentDisplayName(slug: string): Promise<string> {
  const trimmed = slug.trim()
  if (!trimmed || trimmed === KIP_FALLBACK_SLUG) return KIP_FALLBACK_DISPLAY_NAME

  const cached = displayNameCache.get(trimmed)
  if (cached) return cached

  try {
    const agent = await KipApi.getAgentBySlug(trimmed)
    const name = agent.name?.trim() || trimmed
    displayNameCache.set(trimmed, name)
    return name
  } catch {
    return trimmed
  }
}

export function readFrameLeadAgentSlug(
  domainFrame: { kip?: { agent_id?: string | null } } | null | undefined,
): string | null {
  const slug = domainFrame?.kip?.agent_id?.trim()
  if (!slug || slug === KIP_FALLBACK_SLUG) return null
  return slug
}
