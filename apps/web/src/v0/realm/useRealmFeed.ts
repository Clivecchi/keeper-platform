"use client"

import * as React from "react"
import { apiFetch } from "../../lib/apiFetch"
import type { RealmFeedResponse } from "@keeper/shared"

const CACHE_TTL_MS = 2 * 60 * 1000

let memoryCache: { fetchedAt: number; data: RealmFeedResponse } | null = null
let inflight: Promise<RealmFeedResponse> | null = null

export function invalidateRealmFeedCache(): void {
  memoryCache = null
  inflight = null
}

export async function fetchRealmFeed(options?: {
  forceRefresh?: boolean
}): Promise<RealmFeedResponse> {
  const now = Date.now()
  if (!options?.forceRefresh && memoryCache && now - memoryCache.fetchedAt < CACHE_TTL_MS) {
    return memoryCache.data
  }

  if (!options?.forceRefresh && inflight) {
    return inflight
  }

  const run = async (): Promise<RealmFeedResponse> => {
    const data = (await apiFetch("/api/realm/feed")) as RealmFeedResponse
    memoryCache = { fetchedAt: Date.now(), data }
    return data
  }

  inflight = run().finally(() => {
    inflight = null
  })
  return inflight
}

export function useRealmFeed(enabled = true): {
  feed: RealmFeedResponse | null
  isLoading: boolean
  error: string | null
  refresh: () => void
} {
  const [feed, setFeed] = React.useState<RealmFeedResponse | null>(null)
  const [isLoading, setIsLoading] = React.useState(enabled)
  const [error, setError] = React.useState<string | null>(null)
  const [tick, setTick] = React.useState(0)

  const refresh = React.useCallback(() => {
    invalidateRealmFeedCache()
    setTick((v) => v + 1)
  }, [])

  React.useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }
    let cancelled = false
    setIsLoading(true)
    setError(null)
    void fetchRealmFeed()
      .then((data) => {
        if (!cancelled) {
          setFeed(data)
          setIsLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load realm feed")
          setIsLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [enabled, tick])

  return { feed, isLoading, error, refresh }
}
