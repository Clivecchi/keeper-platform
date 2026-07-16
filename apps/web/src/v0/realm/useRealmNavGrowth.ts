"use client"

import * as React from "react"
import { KipApi } from "../../lib/kipApi"
import { getKeptMoments } from "../api/v0Moments"
import { fetchDomainLibraryNavRows } from "../presence/integrationChronicle/libraryNavUtils"
import {
  draftToRealmNavEntry,
  groupRealmNavEntries,
  libraryRowToKeptNavEntry,
  libraryRowToPresentedNavEntry,
  momentToKeptNavEntry,
  type RealmNavEntry,
  type RealmNavStage,
} from "./realmNavGrowth"

export interface RealmNavGrowthState {
  loading: boolean
  error: string | null
  byStage: Record<RealmNavStage, RealmNavEntry[]>
  refresh: () => void
}

export function useRealmNavGrowth(
  domainId: string | null,
  domainSlug: string | null,
  enabled: boolean,
): RealmNavGrowthState {
  const [byStage, setByStage] = React.useState<Record<RealmNavStage, RealmNavEntry[]>>(
    () => groupRealmNavEntries([]),
  )
  const [loading, setLoading] = React.useState(enabled)
  const [error, setError] = React.useState<string | null>(null)
  const [tick, setTick] = React.useState(0)

  const refresh = React.useCallback(() => setTick((v) => v + 1), [])

  React.useEffect(() => {
    if (!enabled || !domainId) {
      setLoading(false)
      setByStage(groupRealmNavEntries([]))
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const [drafts, libraryRows, keptMoments] = await Promise.all([
          KipApi.listDrafts(domainId, undefined, {
            limit: 40,
            excludeStatus: ["promoted", "archived"],
          }).catch(() => []),
          fetchDomainLibraryNavRows(domainId).catch(() => []),
          domainSlug
            ? getKeptMoments({ domainSlug, limit: 30 }).catch(() => [])
            : Promise.resolve([]),
        ])

        if (cancelled) return

        const entries: RealmNavEntry[] = [
          ...drafts.map(draftToRealmNavEntry),
          ...libraryRows.map(libraryRowToKeptNavEntry),
          ...keptMoments.map(momentToKeptNavEntry),
          // Presented: library rows indexed for show — heuristic until Present surface wires status
          ...libraryRows.slice(0, 8).map(libraryRowToPresentedNavEntry),
        ]

        setByStage(groupRealmNavEntries(entries))
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load nav")
          setByStage(groupRealmNavEntries([]))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [domainId, domainSlug, enabled, tick])

  return { loading, error, byStage, refresh }
}
