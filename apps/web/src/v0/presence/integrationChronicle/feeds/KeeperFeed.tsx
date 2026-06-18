"use client"

import * as React from "react"
import { apiFetch } from "../../../../lib/apiFetch"

export type KeeperJourneyBrief = {
  id: string
  name: string
  forward: string
  updatedAt: string
  momentCount: number
  pathCount: number
}

export type KeeperEngagementTemplateBrief = {
  id: string
  label: string
  slug: string
  type: string
  targetType: string
}

export type KeeperDto = {
  id: string
  title: string
  purpose: string
  display_label: string | null
  description: string | null
  chronicle_blocks: string[]
  chronicle_actions: string[]
  keeperType: string | null
  memoryPattern: string | null
  domainId: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
  stats: {
    journeyCount: number
    pathCount: number
    soleMemoryCount: number
    engagementTemplateCount: number
  }
  journeys: KeeperJourneyBrief[]
  engagement_templates: KeeperEngagementTemplateBrief[]
}

export type KeeperFeedData = {
  keeper: KeeperDto
  reload: () => Promise<void>
}

export function useKeeperFeedData(keeperId: string): {
  data: KeeperFeedData | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
} {
  const [keeper, setKeeper] = React.useState<KeeperDto | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const reload = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = (await apiFetch(
        `/api/keepers/${encodeURIComponent(keeperId)}`,
      )) as { keeper?: KeeperDto }
      if (!res?.keeper) throw new Error("Keeper not found")
      setKeeper(res.keeper)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load keeper")
      setKeeper(null)
    } finally {
      setLoading(false)
    }
  }, [keeperId])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const data = keeper ? { keeper, reload } : null

  return { data, loading, error, reload }
}
