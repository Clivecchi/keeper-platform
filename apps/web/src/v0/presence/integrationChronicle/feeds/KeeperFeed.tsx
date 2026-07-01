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
  presenceSchema?: unknown
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

export function recordToKeeperDto(
  keeperId: string,
  src: Record<string, unknown>,
): KeeperDto {
  const statsRaw =
    src.stats && typeof src.stats === "object" && !Array.isArray(src.stats)
      ? (src.stats as Record<string, number>)
      : {}

  return {
    id: String(src.id ?? keeperId),
    title: String(src.title ?? ""),
    purpose: String(src.purpose ?? src.description ?? ""),
    display_label: src.display_label != null ? String(src.display_label) : null,
    description: src.description != null ? String(src.description) : null,
    chronicle_blocks: Array.isArray(src.chronicle_blocks)
      ? (src.chronicle_blocks as string[])
      : [],
    chronicle_actions: Array.isArray(src.chronicle_actions)
      ? (src.chronicle_actions as string[])
      : [],
    keeperType: src.keeperType != null ? String(src.keeperType) : null,
    memoryPattern: src.memoryPattern != null ? String(src.memoryPattern) : null,
    domainId: src.domainId != null ? String(src.domainId) : null,
    ownerId: String(src.ownerId ?? ""),
    presenceSchema: src.presenceSchema,
    createdAt: String(src.createdAt ?? new Date().toISOString()),
    updatedAt: String(src.updatedAt ?? new Date().toISOString()),
    stats: {
      journeyCount: statsRaw.journeyCount ?? 0,
      pathCount: statsRaw.pathCount ?? 0,
      soleMemoryCount: statsRaw.soleMemoryCount ?? 0,
      engagementTemplateCount: statsRaw.engagementTemplateCount ?? 0,
    },
    journeys: Array.isArray(src.journeys)
      ? (src.journeys as KeeperJourneyBrief[])
      : [],
    engagement_templates: Array.isArray(src.engagement_templates)
      ? (src.engagement_templates as KeeperEngagementTemplateBrief[])
      : [],
  }
}

export function useKeeperFeedData(keeperId: string, domainId: string): {
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
        `/api/keepers/${encodeURIComponent(keeperId)}?domainId=${encodeURIComponent(domainId)}`,
      )) as { keeper?: KeeperDto }
      if (!res?.keeper) throw new Error("Keeper not found")
      setKeeper(res.keeper)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load keeper")
      setKeeper(null)
    } finally {
      setLoading(false)
    }
  }, [keeperId, domainId])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const data = keeper ? { keeper, reload } : null

  return { data, loading, error, reload }
}
