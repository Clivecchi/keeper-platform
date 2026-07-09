import { extractPresenceAvatar } from "@keeper/shared"
import { apiFetch } from "../../lib/apiFetch"
import { getAuthToken } from "../../lib/authTokenStore"
import { getBlobProxyUrl } from "../../lib/blobProxy"
import { formatRelativeTime } from "../presence/integrationChronicle/shared"
import {
  formatDomainLeadDisplayName,
  isDomainLeadAgentSlug,
  isMissingLeadAgentSlug,
  resolveFrameLeadAgentIdentity,
  type ResolvedLeadAgentIdentity,
} from "./frameLeadAgentIdentity"

export interface DomainPlaybillStats {
  momentCount: number
  lastActivity?: string | null
}

export interface ResolvedPlaybillAgent {
  identity: ResolvedLeadAgentIdentity
  displayName: string
  roleLine: string
  avatarUrl: string | null
  iconFallback: string
}

const statsCache = new Map<string, DomainPlaybillStats>()
const statsInflight = new Map<string, Promise<DomainPlaybillStats>>()
const agentCache = new Map<string, ResolvedPlaybillAgent>()
const agentInflight = new Map<string, Promise<ResolvedPlaybillAgent | null>>()

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
  if (role?.trim()) return `AS THE ${role.trim().toUpperCase()} AGENT`
  if (purpose?.trim()) {
    const short = purpose.trim().slice(0, 64)
    return short.toUpperCase()
  }
  return "INNKEEPER"
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
    : "—"
  return `${momentLabel} · last active ${lastActive}`
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
}

async function fetchAgentRow(slug: string): Promise<KipAgentPlaybillRow | null> {
  const response = (await apiFetch(
    `/api/kip/agents?slug=${encodeURIComponent(slug)}`,
  )) as { success?: boolean; data?: KipAgentPlaybillRow }

  if (response?.success && response.data?.slug) {
    return response.data
  }
  return null
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

    const identity = await resolveFrameLeadAgentIdentity(slug, {
      allowKipFallback: !isDomainLeadAgentSlug(slug),
    })

    const row = await fetchAgentRow(slug)
    const displayName =
      row?.name?.trim() ||
      identity.displayName ||
      (isDomainLeadAgentSlug(slug) ? formatDomainLeadDisplayName(slug) : slug)

    const { avatar } = extractPresenceAvatar(row?.presenceSchema)
    const rawAvatar = avatar?.trim() ?? null
    const avatarUrl =
      rawAvatar && isAvatarImageSrc(rawAvatar) ? getBlobProxyUrl(rawAvatar) : null

    const resolved: ResolvedPlaybillAgent = {
      identity,
      displayName,
      roleLine: formatPlaybillRoleLine(row?.role, row?.purpose),
      avatarUrl,
      iconFallback: iconFallbackForAgent(displayName, slug),
    }

    agentCache.set(slug, resolved)
    return resolved
  })().finally(() => {
    agentInflight.delete(slug)
  })

  agentInflight.set(slug, promise)
  return promise
}
