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
  const res = await apiFetch(`/api/journeys?domainId=${encodeURIComponent(domainId)}`)
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

const LOADERS: Record<BoardNavCacheKey, (domainId: string) => Promise<unknown>> = {
  dialogs: loadDialogs,
  journeys: loadJourneys,
  keepers: loadKeepers,
  drafts: loadDrafts,
  agents: loadAgents,
}

/** Warm shared nav slices when a board mounts — best-effort, respects TTL. */
export function prefetchBoardNavData(domainId: string): void {
  if (!domainId) return
  const keys: BoardNavCacheKey[] = ["journeys", "keepers", "dialogs", "drafts"]
  for (const key of keys) {
    if (getCachedBoardNavData(domainId, key)) continue
    void fetchBoardNavSlice(domainId, key, () => LOADERS[key](domainId)).catch(() => {
      /* prefetch is best-effort */
    })
  }
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
