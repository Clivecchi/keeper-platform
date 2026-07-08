import { KipApi } from "../../lib/kipApi"

const displayNameCache = new Map<string, string>()
const missingLeadSlugs = new Set<string>()

const MISSING_LEAD_STORAGE_KEY = "keeper:missing-lead-slugs"

function hydrateMissingLeadSlugsFromStorage(): void {
  if (typeof sessionStorage === "undefined") return
  try {
    const raw = sessionStorage.getItem(MISSING_LEAD_STORAGE_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return
    for (const entry of parsed) {
      if (typeof entry === "string" && entry.trim()) {
        missingLeadSlugs.add(entry.trim())
      }
    }
  } catch {
    /* ignore corrupt storage */
  }
}

function persistMissingLeadSlug(slug: string): void {
  missingLeadSlugs.add(slug)
  if (typeof sessionStorage === "undefined") return
  try {
    sessionStorage.setItem(
      MISSING_LEAD_STORAGE_KEY,
      JSON.stringify([...missingLeadSlugs]),
    )
  } catch {
    /* ignore quota errors */
  }
}

hydrateMissingLeadSlugsFromStorage()

export const KIP_FALLBACK_SLUG = "kip" as const
export const KIP_FALLBACK_DISPLAY_NAME = "Kip" as const

/** Platform dialog agents — never silently substitute Kip when lookup fails. */
export const STRICT_PLATFORM_AGENT_SLUGS = new Set<string>(["rendr", "cloud"])

export type ResolveLeadAgentOptions = {
  /** When false, missing slug throws instead of falling back to Kip. Default: strict for rendr/cloud. */
  allowKipFallback?: boolean
}

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
  resolvedLeadIdentity.clear()
  leadIdentityInflight.clear()
  if (typeof sessionStorage !== "undefined") {
    try {
      sessionStorage.removeItem(MISSING_LEAD_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }
}

export interface ResolvedLeadAgentIdentity {
  id: string
  slug: string
  displayName: string
}

const resolvedLeadIdentity = new Map<string, ResolvedLeadAgentIdentity>()
const leadIdentityInflight = new Map<string, Promise<ResolvedLeadAgentIdentity>>()

export function isMissingLeadAgentSlug(slug: string | null | undefined): boolean {
  const trimmed = slug?.trim()
  if (!trimmed) return false
  return missingLeadSlugs.has(trimmed)
}

export function getCachedLeadAgentIdentity(
  slug: string,
): ResolvedLeadAgentIdentity | null {
  const primary = normalizeLeadAgentSlug(slug)
  if (missingLeadSlugs.has(primary) && primary !== KIP_FALLBACK_SLUG) {
    return resolvedLeadIdentity.get(KIP_FALLBACK_SLUG) ?? null
  }
  return resolvedLeadIdentity.get(primary) ?? null
}

/** Singleflight: resolve lead agent id + display name; falls back to platform `kip` unless strict. */
export async function resolveFrameLeadAgentIdentity(
  slug: string,
  options?: ResolveLeadAgentOptions,
): Promise<ResolvedLeadAgentIdentity> {
  const primary = normalizeLeadAgentSlug(slug)
  const allowKipFallback =
    options?.allowKipFallback ?? !STRICT_PLATFORM_AGENT_SLUGS.has(primary)

  if (missingLeadSlugs.has(primary) && primary !== KIP_FALLBACK_SLUG) {
    if (!allowKipFallback) {
      throw new Error(`${primary} agent is not available`)
    }
    return resolveFrameLeadAgentIdentity(KIP_FALLBACK_SLUG)
  }

  const cached = resolvedLeadIdentity.get(primary)
  if (cached) return cached

  const pending = leadIdentityInflight.get(primary)
  if (pending) return pending

  const promise = (async (): Promise<ResolvedLeadAgentIdentity> => {
    try {
      const agent = await KipApi.getAgentBySlug(primary)
      const result: ResolvedLeadAgentIdentity = {
        id: agent.id,
        slug: primary,
        displayName: agent.name?.trim() || KIP_FALLBACK_DISPLAY_NAME,
      }
      displayNameCache.set(primary, result.displayName)
      resolvedLeadIdentity.set(primary, result)
      return result
    } catch {
      if (primary === KIP_FALLBACK_SLUG) {
        throw new Error("Platform Kip agent not found")
      }
      if (!allowKipFallback) {
        throw new Error(`${primary} agent is not available`)
      }
      persistMissingLeadSlug(primary)
      return resolveFrameLeadAgentIdentity(KIP_FALLBACK_SLUG)
    }
  })().finally(() => {
    leadIdentityInflight.delete(primary)
  })

  leadIdentityInflight.set(primary, promise)
  return promise
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
    const resolved = await resolveFrameLeadAgentIdentity(trimmed)
    return resolved.displayName
  } catch {
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
  if (custom && isMissingLeadAgentSlug(custom)) {
    return KIP_FALLBACK_SLUG
  }
  return custom ?? KIP_FALLBACK_SLUG
}

/** Resolve agent UUID for dialog — falls back to platform `kip` when domain lead is missing (unless strict). */
export async function resolveLeadAgentId(
  slug: string,
  options?: ResolveLeadAgentOptions,
): Promise<string> {
  const resolved = await resolveFrameLeadAgentIdentity(slug, options)
  return resolved.id
}
