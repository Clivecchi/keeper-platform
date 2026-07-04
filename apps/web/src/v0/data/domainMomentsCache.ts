/**
 * Dedupe domain-scoped moment list fetches (Chronicle feed + Domain banner).
 */

import { apiFetch } from "../../lib/api"

export const DOMAIN_MOMENTS_CACHE_TTL_MS = 2 * 60 * 1000

interface CacheEntry<T> {
  fetchedAt: number
  data: T
}

/** Single fetch size — callers slice to their display limit. */
const DOMAIN_MOMENTS_FETCH_LIMIT = 50

const store = new Map<string, CacheEntry<unknown>>()
const inflight = new Map<string, Promise<unknown>>()

function cacheKey(domainSlug: string, status: string): string {
  return `${domainSlug.trim().toLowerCase()}:${status}`
}

function isFresh(entry: CacheEntry<unknown>, now = Date.now()): boolean {
  return now - entry.fetchedAt < DOMAIN_MOMENTS_CACHE_TTL_MS
}

export type DomainMomentRow = {
  id: string
  title?: string
  keptAt?: string | null
  createdAt?: string
  journeyName?: string
}

export async function fetchDomainKeptMoments(
  domainSlug: string,
  options?: { limit?: number; forceRefresh?: boolean },
): Promise<DomainMomentRow[]> {
  const slug = domainSlug.trim()
  if (!slug) return []

  const displayLimit = options?.limit ?? DOMAIN_MOMENTS_FETCH_LIMIT
  const key = cacheKey(slug, "kept")

  if (!options?.forceRefresh) {
    const cached = store.get(key) as CacheEntry<DomainMomentRow[]> | undefined
    if (cached && isFresh(cached)) {
      return cached.data.slice(0, displayLimit)
    }
    const pending = inflight.get(key) as Promise<DomainMomentRow[]> | undefined
    if (pending) {
      return pending.then((rows) => rows.slice(0, displayLimit))
    }
  }

  const promise = apiFetch(
    `/api/v0/moments?domainSlug=${encodeURIComponent(slug)}&status=kept&limit=${DOMAIN_MOMENTS_FETCH_LIMIT}`,
  )
    .then((json: unknown) => {
      const data = (json as { data?: DomainMomentRow[] })?.data ?? []
      const rows = Array.isArray(data) ? data : []
      store.set(key, { fetchedAt: Date.now(), data: rows })
      return rows
    })
    .finally(() => {
      inflight.delete(key)
    })

  inflight.set(key, promise)
  return promise.then((rows) => rows.slice(0, displayLimit))
}
