/**
 * In-memory cache for Universal Nav list fetches (per domainId).
 * Survives workspace board switches (?board=domain → ide) within the same domain.
 */

import { apiFetch } from "../../lib/api"
import { KipApi } from "../../lib/kipApi"

export const BOARD_NAV_CACHE_TTL_MS = 2 * 60 * 1000

export type BoardNavCacheKey =
  | "dialogs"
  | "journeys"
  | "keepers"
  | "drafts"
  | "agents"
  | "library"

export interface BoardNavPrefetchSections {
  journeys?: boolean
  keepers?: boolean
  dialogs?: boolean
  drafts?: boolean
  agents?: boolean
  library?: boolean
}

interface CacheEntry<T> {
  fetchedAt: number
  data: T
}

const store = new Map<string, Partial<Record<BoardNavCacheKey, CacheEntry<unknown>>>>()
const inflight = new Map<string, Promise<unknown>>()

function entryKey(domainId: string, key: BoardNavCacheKey): string {
  return `${domainId}:${key}`
}

function isFresh(entry: CacheEntry<unknown>, now = Date.now()): boolean {
  return now - entry.fetchedAt < BOARD_NAV_CACHE_TTL_MS
}

export function getCachedBoardNavData<T>(
  domainId: string,
  key: BoardNavCacheKey,
): T | null {
  const entry = store.get(domainId)?.[key] as CacheEntry<T> | undefined
  if (!entry || !isFresh(entry)) return null
  return entry.data
}

export function setCachedBoardNavData<T>(
  domainId: string,
  key: BoardNavCacheKey,
  data: T,
): void {
  const domainEntry = store.get(domainId) ?? {}
  domainEntry[key] = { fetchedAt: Date.now(), data }
  store.set(domainId, domainEntry)
}

export function invalidateBoardNavCache(domainId?: string): void {
  if (!domainId) {
    store.clear()
    inflight.clear()
    return
  }
  store.delete(domainId)
  for (const key of [...inflight.keys()]) {
    if (key.startsWith(`${domainId}:`)) inflight.delete(key)
  }
}

/** Drop one row from a cached nav list (optimistic delete without full reload). */
export function removeCachedBoardNavRow(
  domainId: string,
  key: BoardNavCacheKey,
  id: string,
): void {
  const list = getCachedBoardNavData<Array<{ id: string }>>(domainId, key)
  if (!list) return
  setCachedBoardNavData(
    domainId,
    key,
    list.filter((row) => row.id !== id),
  )
}

/** Dedupe concurrent fetches for the same domain nav slice. */
export async function fetchBoardNavSlice<T>(
  domainId: string,
  key: BoardNavCacheKey,
  loader: () => Promise<T>,
  options?: { forceRefresh?: boolean },
): Promise<T> {
  if (!options?.forceRefresh) {
    const cached = getCachedBoardNavData<T>(domainId, key)
    if (cached) return cached
  }

  const dedupeKey = entryKey(domainId, key)
  const pending = inflight.get(dedupeKey) as Promise<T> | undefined
  if (pending && !options?.forceRefresh) return pending

  const run = loader()
    .then((data) => {
      setCachedBoardNavData(domainId, key, data)
      return data
    })
    .finally(() => {
      inflight.delete(dedupeKey)
    })

  inflight.set(dedupeKey, run)
  return run
}

async function loadDialogs(domainId: string) {
  const res = await apiFetch(`/api/domains/${encodeURIComponent(domainId)}/kip/dialogs`)
  const list = (res as { dialogs?: unknown[] })?.dialogs ?? []
  return Array.isArray(list) ? list : []
}

async function loadJourneys(domainId: string) {
  const res = await apiFetch(
    `/api/journeys?domainId=${encodeURIComponent(domainId)}&nav=true&limit=50`,
  )
  const list = (res as { data?: { journeys?: unknown[] } })?.data?.journeys ?? []
  return Array.isArray(list) ? list : []
}

async function loadKeepers(domainId: string) {
  const res = await apiFetch(`/api/keepers?domainId=${encodeURIComponent(domainId)}`)
  const list = (res as { data?: { keepers?: unknown[] } })?.data?.keepers ?? []
  return Array.isArray(list) ? list : []
}

async function loadDrafts(domainId: string) {
  return KipApi.listDrafts(domainId, undefined, {
    limit: 50,
    excludeStatus: ["promoted", "archived"],
  })
}

async function loadAgents(domainId: string) {
  const res = await apiFetch(`/api/domains/${encodeURIComponent(domainId)}/kip/agents`)
  const payload = res as { data?: unknown[]; agents?: unknown[] }
  const list = payload.data ?? payload.agents ?? []
  return Array.isArray(list) ? list : []
}

async function loadLibrary(domainId: string) {
  const rows = await apiFetch(
    `/api/library-items?domainId=${encodeURIComponent(domainId)}`,
  )
  return Array.isArray(rows) ? rows : []
}

const LOADERS: Record<BoardNavCacheKey, (domainId: string) => Promise<unknown>> = {
  dialogs: loadDialogs,
  journeys: loadJourneys,
  keepers: loadKeepers,
  drafts: loadDrafts,
  agents: loadAgents,
  library: loadLibrary,
}

export function resolvePrefetchKeys(sections?: BoardNavPrefetchSections): BoardNavCacheKey[] {
  if (!sections) {
    return ["journeys", "keepers"]
  }
  const keys: BoardNavCacheKey[] = []
  if (sections.journeys) keys.push("journeys")
  if (sections.keepers) keys.push("keepers")
  if (sections.dialogs) keys.push("dialogs")
  if (sections.drafts) keys.push("drafts")
  if (sections.agents) keys.push("agents")
  if (sections.library) keys.push("library")
  return keys
}

/** True when every requested nav slice is already cached and fresh. */
export function isBoardNavWarm(
  domainId: string,
  sections?: BoardNavPrefetchSections,
): boolean {
  if (!domainId) return false
  const keys = resolvePrefetchKeys(sections)
  if (keys.length === 0) return true
  return keys.every((key) => getCachedBoardNavData(domainId, key) != null)
}

/**
 * Await nav slices under the load curtain so the board does not populate after reveal.
 * Failed slices are swallowed — hard curtain timeout / board mount retry still apply.
 */
export async function prepareBoardNavData(
  domainId: string,
  sections?: BoardNavPrefetchSections,
): Promise<void> {
  if (!domainId) return
  const markName = `keeper:board-nav:${domainId}`
  if (typeof performance !== "undefined") performance.mark(`${markName}:start`)
  const keys = resolvePrefetchKeys(sections)
  await Promise.all(
    keys.map((key) => {
      if (getCachedBoardNavData(domainId, key)) return Promise.resolve()
      return fetchBoardNavSlice(domainId, key, () => LOADERS[key](domainId)).catch(() => {
        /* best-effort — do not trap the curtain on one failed list */
      })
    }),
  )
  if (typeof performance !== "undefined") {
    performance.mark(`${markName}:end`)
    try {
      performance.measure(markName, `${markName}:start`, `${markName}:end`)
    } catch {
      // A browser can evict marks before a background prefetch settles.
    }
  }
}

/** Warm shared nav slices when a board mounts — fire-and-forget, respects TTL. */
export function prefetchBoardNavData(
  domainId: string,
  sections?: BoardNavPrefetchSections,
): void {
  void prepareBoardNavData(domainId, sections)
}

export { loadDialogs, loadJourneys, loadKeepers, loadDrafts, loadAgents }

type KeeperNavRow = { id: string; title?: string; display_label?: string | null }
type JourneyNavRow = { id: string; name?: string }

/** Resolve keeper display title from cached nav list when available. */
export function lookupKeeperTitleFromCache(
  domainId: string,
  keeperId: string,
): string | null {
  const list = getCachedBoardNavData<KeeperNavRow[]>(domainId, "keepers")
  if (!list) return null
  const keeper = list.find((row) => row.id === keeperId)
  if (!keeper) return null
  return (keeper.display_label ?? keeper.title)?.trim() || null
}

/** Resolve journey name from cached nav list when available. */
export function lookupJourneyNameFromCache(
  domainId: string,
  journeyId: string,
): string | null {
  const list = getCachedBoardNavData<JourneyNavRow[]>(domainId, "journeys")
  if (!list) return null
  const journey = list.find((row) => row.id === journeyId)
  return journey?.name?.trim() || null
}

/** Journey rows with moment counts for feed badge / banner stats. */
export async function loadJourneyNavRows(domainId: string): Promise<JourneyNavRow[]> {
  return fetchBoardNavSlice(domainId, "journeys", () =>
    loadJourneys(domainId),
  ) as Promise<JourneyNavRow[]>
}

export async function loadKeeperNavRows(domainId: string): Promise<KeeperNavRow[]> {
  return fetchBoardNavSlice(domainId, "keepers", () =>
    loadKeepers(domainId),
  ) as Promise<KeeperNavRow[]>
}

export async function loadLibraryNavRows(domainId: string): Promise<unknown[]> {
  return fetchBoardNavSlice(domainId, "library", () => loadLibrary(domainId))
}
