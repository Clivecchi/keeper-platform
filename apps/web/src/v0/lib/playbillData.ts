import { extractPresenceAvatar, resolvePlaybillStarName, isPlatformDomainSlugAlias } from "@keeper/shared"
import { apiFetch } from "../../lib/apiFetch"
import { getAuthToken } from "../../lib/authTokenStore"
import { KipApi } from "../../lib/kipApi"
import { formatRelativeTime } from "../presence/integrationChronicle/shared"
import { resolveCoverAvatarDisplay } from "../presence/cover/coverImageUtils"
import {
  formatDomainLeadDisplayName,
  isDomainLeadAgentSlug,
  isMissingLeadAgentSlug,
  resolveFrameLeadAgentIdentity,
  type ResolvedLeadAgentIdentity,
} from "./frameLeadAgentIdentity"

export { resolvePlaybillStarName }

export interface DomainPlaybillStats {
  momentCount: number
  lastActivity?: string | null
}

export interface ResolvedPlaybillAgent {
  identity: ResolvedLeadAgentIdentity
  displayName: string
  roleLine: string
  avatarUrl: string | null
  /** Emoji or short glyph from agent config when no image URL is set. */
  avatarEmoji: string | null
  iconFallback: string
}

const statsCache = new Map<string, DomainPlaybillStats>()
const statsInflight = new Map<string, Promise<DomainPlaybillStats>>()
const agentCache = new Map<string, ResolvedPlaybillAgent>()
const agentInflight = new Map<string, Promise<ResolvedPlaybillAgent | null>>()

const PORTRAIT_PRELOAD_TIMEOUT_MS = 2_000

/** Decode portrait bytes before a reveal so cast images never pop in after the curtain. */
export async function preloadPlaybillPortrait(url: string | null | undefined): Promise<void> {
  if (typeof Image === "undefined" || !url?.trim()) return
  await new Promise<void>((resolve) => {
    let settled = false
    const done = () => {
      if (settled) return
      settled = true
      resolve()
    }
    const timer = window.setTimeout(done, PORTRAIT_PRELOAD_TIMEOUT_MS)
    const image = new Image()
    image.onload = () => {
      if ("decode" in image) {
        void image.decode().catch(() => undefined).finally(() => {
          window.clearTimeout(timer)
          done()
        })
      } else {
        window.clearTimeout(timer)
        done()
      }
    }
    image.onerror = () => {
      window.clearTimeout(timer)
      done()
    }
    image.src = url
  })
}

export function clearPlaybillAgentCache(slug?: string): void {
  if (slug?.trim()) {
    agentCache.delete(slug.trim())
    agentInflight.delete(slug.trim())
    return
  }
  agentCache.clear()
  agentInflight.clear()
}

/** Sync read — Playbill cards seed from cache to avoid reload flash across domains. */
export function peekPlaybillAgent(slug: string): ResolvedPlaybillAgent | null {
  const key = slug.trim()
  if (!key) return null
  return agentCache.get(key) ?? null
}

/** Warm every switcher lead into the shared agent cache (no wipe). */
export async function prefetchPlaybillAgentsForDomains(
  entries: Array<{ leadAgentSlug: string | null | undefined }>,
): Promise<void> {
  const slugs = [
    ...new Set(
      entries
        .map((entry) => entry.leadAgentSlug?.trim())
        .filter((slug): slug is string => !!slug),
    ),
  ]
  if (!slugs.length) return
  await Promise.all(slugs.map(async (slug) => {
    const agent = await resolvePlaybillAgent(slug).catch(() => null)
    await preloadPlaybillPortrait(agent?.avatarUrl)
  }))
}

function isAvatarImageSrc(value: string): boolean {
  const trimmed = value.trim()
  return (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/api/") ||
    trimmed.startsWith("data:image/")
  )
}

function formatPlaybillRoleLine(role?: string | null, purpose?: string | null): string {
  if (purpose?.trim()) {
    const short = purpose.trim().slice(0, 64)
    return short.charAt(0).toUpperCase() + short.slice(1)
  }
  if (role?.trim()) {
    const normalized = role.trim().toLowerCase()
    if (normalized === "lead") return "Domain lead"
    return role.trim().charAt(0).toUpperCase() + role.trim().slice(1).toLowerCase()
  }
  return "Domain lead"
}

export function formatPlaybillRoleSubtitle(
  agent: ResolvedPlaybillAgent | null,
  domainSlug: string,
  isUncast: boolean,
): string {
  if (isUncast) return "Domain lead"
  const leadSlug = agent?.identity.slug?.trim().toLowerCase() ?? ""
  const normalizedDomain = domainSlug.trim().toLowerCase()
  if (leadSlug === "kip" && isPlatformDomainSlugAlias(domainSlug)) {
    return "Platform director"
  }
  return agent?.roleLine ?? "Domain lead"
}

function iconFallbackForAgent(displayName: string, slug: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase()
  }
  const initial = (parts[0]?.slice(0, 1) ?? slug.slice(0, 1) ?? "?").toUpperCase()
  return initial
}

export function formatPlaybillActivity(stats: DomainPlaybillStats | null | undefined): string {
  const count = stats?.momentCount ?? 0
  const momentLabel = count === 1 ? "1 moment" : `${count} moments`
  const lastActive = stats?.lastActivity
    ? formatRelativeTime(stats.lastActivity)
    : "quiet"
  return `${momentLabel} · ${lastActive}`
}

async function fetchDomainStatsRaw(domainId: string): Promise<DomainPlaybillStats> {
  const path = `/api/domains/${encodeURIComponent(domainId)}/stats`
  const isLocalDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")

  if (isLocalDev) {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const token = getAuthToken()
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(path, { credentials: "include", headers })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText || "Request failed"}`)
    }
    const data = (await response.json()) as { stats?: Record<string, unknown> }
    const stats = data.stats ?? {}
    return {
      momentCount: typeof stats.momentCount === "number" ? stats.momentCount : 0,
      lastActivity:
        typeof stats.lastActivity === "string"
          ? stats.lastActivity
          : stats.lastActivity instanceof Date
            ? stats.lastActivity.toISOString()
            : null,
    }
  }

  const data = (await apiFetch(path)) as { stats?: Record<string, unknown> }
  const stats = data.stats ?? {}
  return {
    momentCount: typeof stats.momentCount === "number" ? stats.momentCount : 0,
    lastActivity:
      typeof stats.lastActivity === "string"
        ? stats.lastActivity
        : stats.lastActivity instanceof Date
          ? stats.lastActivity.toISOString()
          : null,
  }
}

export async function fetchDomainPlaybillStats(domainId: string): Promise<DomainPlaybillStats> {
  const key = domainId.trim()
  if (!key) return { momentCount: 0, lastActivity: null }

  const cached = statsCache.get(key)
  if (cached) return cached

  const pending = statsInflight.get(key)
  if (pending) return pending

  const promise = fetchDomainStatsRaw(key)
    .then((stats) => {
      statsCache.set(key, stats)
      return stats
    })
    .finally(() => {
      statsInflight.delete(key)
    })

  statsInflight.set(key, promise)
  return promise
}

interface KipAgentPlaybillRow {
  id: string
  slug: string
  name?: string | null
  role?: string | null
  purpose?: string | null
  presenceSchema?: unknown
  config?: unknown
  avatar?: string | null
}

function resolveAgentAvatarSource(row: KipAgentPlaybillRow): string | null {
  const { avatar: presenceAvatar } = extractPresenceAvatar(row.presenceSchema)
  if (presenceAvatar?.trim()) return presenceAvatar.trim()

  if (row.presenceSchema && typeof row.presenceSchema === "object" && !Array.isArray(row.presenceSchema)) {
    const direct = (row.presenceSchema as Record<string, unknown>).avatar
    if (typeof direct === "string" && direct.trim()) {
      return direct.trim()
    }
  }

  if (typeof row.avatar === "string" && row.avatar.trim()) {
    return row.avatar.trim()
  }

  if (row.config && typeof row.config === "object" && !Array.isArray(row.config)) {
    const cfgAvatar = (row.config as Record<string, unknown>).avatar
    if (typeof cfgAvatar === "string" && cfgAvatar.trim()) {
      return cfgAvatar.trim()
    }
  }

  return null
}

function resolvePlaybillPortraitFromRow(row: KipAgentPlaybillRow): {
  avatarUrl: string | null
  avatarEmoji: string | null
} {
  const rawAvatar = resolveAgentAvatarSource(row)
  if (!rawAvatar) {
    return { avatarUrl: null, avatarEmoji: null }
  }
  if (isAvatarImageSrc(rawAvatar)) {
    return {
      avatarUrl: resolveCoverAvatarDisplay(rawAvatar, ""),
      avatarEmoji: null,
    }
  }
  return { avatarUrl: null, avatarEmoji: rawAvatar.slice(0, 4) }
}

async function fetchAgentRow(slug: string): Promise<KipAgentPlaybillRow | null> {
  try {
    const agent = await KipApi.getAgentBySlug(slug)
    const extended = agent as typeof agent & {
      presenceSchema?: unknown
      avatar?: string
      role?: string
      purpose?: string
    }

    let row: KipAgentPlaybillRow = {
      id: agent.id,
      slug: agent.slug,
      name: agent.name,
      role: extended.role ?? null,
      purpose: agent.purpose,
      presenceSchema: extended.presenceSchema,
      config: agent.config,
      avatar: extended.avatar,
    }

    if (!resolveAgentAvatarSource(row) && row.id) {
      try {
        const full = (await apiFetch(`/api/agents/${encodeURIComponent(row.id)}`)) as {
          presenceSchema?: unknown
          config?: unknown
          avatar?: string
        }
        row = {
          ...row,
          presenceSchema: full.presenceSchema ?? row.presenceSchema,
          config: full.config ?? row.config,
          avatar: full.avatar ?? row.avatar,
        }
      } catch {
        /* Chronicle path optional — slug fetch is primary */
      }
    }

    return row
  } catch {
    return null
  }
}

export async function resolvePlaybillAgent(
  leadAgentSlug: string,
): Promise<ResolvedPlaybillAgent | null> {
  const slug = leadAgentSlug.trim()
  if (!slug) return null

  const cached = agentCache.get(slug)
  if (cached) return cached

  const pending = agentInflight.get(slug)
  if (pending) return pending

  const promise = (async (): Promise<ResolvedPlaybillAgent | null> => {
    if (isMissingLeadAgentSlug(slug) && !isDomainLeadAgentSlug(slug)) {
      return null
    }

    const row = await fetchAgentRow(slug)
    if (!row?.slug) {
      return null
    }

    let identity: ResolvedLeadAgentIdentity
    try {
      identity = await resolveFrameLeadAgentIdentity(slug, {
        allowKipFallback: !isDomainLeadAgentSlug(slug),
      })
    } catch {
      identity = {
        id: row.id,
        slug: row.slug,
        displayName: row.name?.trim() || formatDomainLeadDisplayName(slug),
      }
    }

    const displayName = row.name?.trim() || identity.displayName?.trim() || ""
    if (!displayName) {
      return null
    }

    const { avatarUrl, avatarEmoji } = resolvePlaybillPortraitFromRow(row)

    const resolved: ResolvedPlaybillAgent = {
      identity,
      displayName,
      roleLine: formatPlaybillRoleLine(row.role, row.purpose),
      avatarUrl,
      avatarEmoji,
      iconFallback: iconFallbackForAgent(displayName, slug),
    }

    agentCache.set(slug, resolved)
    void preloadPlaybillPortrait(resolved.avatarUrl)
    return resolved
  })().finally(() => {
    agentInflight.delete(slug)
  })

  agentInflight.set(slug, promise)
  return promise
}
