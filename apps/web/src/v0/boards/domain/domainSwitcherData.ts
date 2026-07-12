import { apiFetch } from "../../../lib/apiFetch"
import { getAuthToken } from "../../../lib/authTokenStore"
import { getBlobProxyUrl } from "../../../lib/blobProxy"
import { resolvePlaybillLeadAgentSlug } from "../../lib/frameLeadAgentIdentity"

export interface DomainSwitcherEntry {
  id: string
  slug: string
  name: string
  tagline: string
  coverImageUrl?: string | null
  /** Lead agent from domain `frame_json.kip.agent_id`, or null when uncast. */
  leadAgentSlug: string | null
}

/** Align with server domain list cache (~5 min). */
export const DOMAIN_SWITCHER_CACHE_TTL_MS = 5 * 60 * 1000

const SESSION_CACHE_KEY = "keeper.domainSwitcher.v2"

interface DomainSwitcherCacheSnapshot {
  fetchedAt: number
  entries: DomainSwitcherEntry[]
}

let memoryCache: DomainSwitcherCacheSnapshot | null = null
let inflightFetch: Promise<DomainSwitcherEntry[]> | null = null
const cacheListeners = new Set<() => void>()

function notifyDomainSwitcherCacheListeners(): void {
  cacheListeners.forEach((listener) => {
    try {
      listener()
    } catch {
      /* listener errors should not break cache updates */
    }
  })
}

/** Subscribe to in-memory domain switcher cache updates (e.g. after Chronicle save). */
export function subscribeDomainSwitcherCache(listener: () => void): () => void {
  cacheListeners.add(listener)
  return () => {
    cacheListeners.delete(listener)
  }
}

function readSessionCache(): DomainSwitcherCacheSnapshot | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DomainSwitcherCacheSnapshot
    if (
      !parsed ||
      typeof parsed.fetchedAt !== "number" ||
      !Array.isArray(parsed.entries)
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeSessionCache(snapshot: DomainSwitcherCacheSnapshot): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(snapshot))
  } catch {
    /* quota / private mode — memory cache still works */
  }
}

function isCacheFresh(snapshot: DomainSwitcherCacheSnapshot, now = Date.now()): boolean {
  return now - snapshot.fetchedAt < DOMAIN_SWITCHER_CACHE_TTL_MS
}

function commitCache(entries: DomainSwitcherEntry[]): DomainSwitcherCacheSnapshot {
  const snapshot: DomainSwitcherCacheSnapshot = {
    fetchedAt: Date.now(),
    entries,
  }
  memoryCache = snapshot
  writeSessionCache(snapshot)
  notifyDomainSwitcherCacheListeners()
  return snapshot
}

export type DomainSwitcherCachePatch = Partial<
  Pick<DomainSwitcherEntry, "name" | "tagline" | "coverImageUrl" | "slug" | "leadAgentSlug">
>

/** Patch one cached switcher row in place — keeps picker cards fresh after Chronicle saves. */
export function patchDomainSwitcherCacheEntry(
  slug: string,
  patch: DomainSwitcherCachePatch,
): void {
  const snapshot = memoryCache ?? readSessionCache()
  if (!snapshot) return

  const normalized = slug.trim().toLowerCase()
  let found = false
  const entries = snapshot.entries.map((entry) => {
    if (entry.slug.trim().toLowerCase() !== normalized) return entry
    found = true
    return { ...entry, ...patch }
  })

  if (!found) return
  commitCache(entries)
}

/** Returns cached domain list when still within TTL (memory, then sessionStorage). */
export function getCachedDomainSwitcherEntries(): DomainSwitcherEntry[] | null {
  const now = Date.now()
  if (memoryCache && isCacheFresh(memoryCache, now)) {
    return memoryCache.entries
  }

  const fromSession = readSessionCache()
  if (fromSession && isCacheFresh(fromSession, now)) {
    memoryCache = fromSession
    return fromSession.entries
  }

  return null
}

/** Clear client domain list cache (e.g. after create). */
export function invalidateDomainSwitcherCache(): void {
  memoryCache = null
  inflightFetch = null
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(SESSION_CACHE_KEY)
  } catch {
    /* ignore */
  }
  notifyDomainSwitcherCacheListeners()
}

export interface FetchDomainSwitcherOptions {
  /** Bypass TTL and always hit the network. */
  forceRefresh?: boolean
}

/** Warm the cache in the background — safe to call from board mount. */
export function prefetchDomainSwitcherEntries(): void {
  if (getCachedDomainSwitcherEntries()) return
  if (inflightFetch) return
  inflightFetch = fetchDomainSwitcherEntries().finally(() => {
    inflightFetch = null
  })
}

interface ApiDomainRow {
  id: string
  slug: string
  name: string
  description?: string | null
  customDomain?: string | null
  theme?: unknown
  frame_json?: unknown
  isActive?: boolean
  deletedAt?: string | null
  isPrimary?: boolean
}

function parseTheme(theme: unknown): { coverImage?: string; tagline?: string } {
  if (!theme || typeof theme !== "object") return {}
  const record = theme as Record<string, unknown>
  return {
    coverImage: typeof record.coverImage === "string" ? record.coverImage : undefined,
    tagline: typeof record.tagline === "string" ? record.tagline : undefined,
  }
}

function parseLeadAgentSlug(domainSlug: string, frameJson: unknown): string | null {
  if (!frameJson || typeof frameJson !== "object") return null
  return resolvePlaybillLeadAgentSlug(
    domainSlug,
    frameJson as { kip?: { agent_id?: string | null } },
  )
}

export function mapApiDomainToSwitcherEntry(domain: ApiDomainRow): DomainSwitcherEntry {
  const theme = parseTheme(domain.theme)
  const rawCover = theme.coverImage ?? null

  return {
    id: domain.id,
    slug: domain.slug,
    name: domain.name,
    tagline:
      theme.tagline?.trim() ||
      domain.description?.trim() ||
      domain.customDomain?.trim() ||
      domain.slug,
    coverImageUrl: rawCover ? getBlobProxyUrl(rawCover) : null,
    leadAgentSlug: parseLeadAgentSlug(domain.slug, domain.frame_json),
  }
}

/** Playbill travel targets — excludes anchor realm domain (arrival, not destination). */
export function filterPlaybillTravelDomains(
  entries: DomainSwitcherEntry[],
  anchorSlug: string | null | undefined,
): DomainSwitcherEntry[] {
  const anchor = anchorSlug?.trim().toLowerCase() ?? ""
  if (!anchor) return entries
  return entries.filter((entry) => entry.slug.trim().toLowerCase() !== anchor)
}

function isVisibleUserDomain(domain: ApiDomainRow): boolean {
  if (domain.deletedAt) return false
  if (domain.isActive === false) return false
  return Boolean(domain.id?.trim() && domain.slug?.trim() && domain.name?.trim())
}

async function fetchUserDomainsList(): Promise<ApiDomainRow[]> {
  const path = "/api/domains/my"
  const isLocalDev =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")

  // Vite dev server proxies /api to localhost:3002. apiFetch targets production when
  // VITE_API_URL is unset on localhost, so use same-origin fetch here in dev only.
  if (isLocalDev) {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const token = getAuthToken()
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(path, { credentials: "include", headers })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText || "Request failed"}`)
    }
    const data = (await response.json()) as ApiDomainRow[] | { error?: string }
    return Array.isArray(data) ? data : []
  }

  const data = (await apiFetch(path)) as ApiDomainRow[] | { error?: string }
  return Array.isArray(data) ? data : []
}

export async function fetchDomainSwitcherEntries(
  options?: FetchDomainSwitcherOptions,
): Promise<DomainSwitcherEntry[]> {
  if (!options?.forceRefresh) {
    const cached = getCachedDomainSwitcherEntries()
    if (cached) return cached
  }

  if (inflightFetch && !options?.forceRefresh) {
    return inflightFetch
  }

  const run = async (): Promise<DomainSwitcherEntry[]> => {
    const rows = await fetchUserDomainsList()
    const entries = rows.filter(isVisibleUserDomain).map(mapApiDomainToSwitcherEntry)
    commitCache(entries)
    return entries
  }

  if (options?.forceRefresh) {
    return run()
  }

  inflightFetch = run().finally(() => {
    inflightFetch = null
  })
  return inflightFetch
}

/**
 * Anchor domain for `/home` — primary owned domain, else first visible.
 * Returns null when the user has no domains (never falls back to platform `default`).
 */
export async function resolvePostLoginDomainSlug(): Promise<string | null> {
  try {
    const rows = await fetchUserDomainsList()
    const visible = rows.filter(isVisibleUserDomain)
    const primary = visible.find((d) => d.isPrimary)
    if (primary?.slug?.trim()) return primary.slug.trim()
    const first = visible[0]
    if (first?.slug?.trim()) return first.slug.trim()
  } catch {
    /* fall through */
  }
  return null
}

export function suggestDomainSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^(-)+|(-)+$/g, "")
    .slice(0, 50)
}

export interface CreateDomainPayload {
  name: string
  slug?: string
  description?: string
}

interface CreateDomainResponse {
  domain?: ApiDomainRow & { id?: string }
  error?: string
}

export async function createDomain(payload: CreateDomainPayload): Promise<ApiDomainRow> {
  const body = {
    name: payload.name.trim(),
    ...(payload.slug?.trim() ? { slug: payload.slug.trim() } : {}),
    ...(payload.description?.trim() ? { description: payload.description.trim() } : {}),
    isPublic: false,
    allowRequests: false,
  }

  const data = (await apiFetch("/api/domains", {
    method: "POST",
    body: JSON.stringify(body),
  })) as CreateDomainResponse

  if (!data.domain?.slug) {
    const message =
      typeof data.error === "string" ? data.error : "Domain was not created."
    throw new Error(message)
  }

  invalidateDomainSwitcherCache()
  return data.domain
}
