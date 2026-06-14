"use client"

import * as React from "react"
import { apiFetch } from "../../../../lib/apiFetch"

export type CapabilityUsedByEntry = {
  agentId: string
  agentName: string
  agentSlug: string
  column: "capabilities" | "tools" | "permissions"
}

export type CapabilityDto = {
  id: string
  slug: string
  kind: string
  display_label: string | null
  description: string | null
  chronicle_blocks: string[]
  chronicle_actions: string[]
  domain_id: string | null
  used_by: CapabilityUsedByEntry[]
  created_at: string
  updated_at: string
}

export type CapabilityFeedData = {
  capability: CapabilityDto
  reload: () => Promise<void>
}

export function useCapabilityFeedData(capabilityId: string): {
  data: CapabilityFeedData | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
} {
  const [capability, setCapability] = React.useState<CapabilityDto | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const reload = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const row = (await apiFetch(
        `/api/capabilities/${encodeURIComponent(capabilityId)}`,
      )) as CapabilityDto
      setCapability(row)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load capability")
      setCapability(null)
    } finally {
      setLoading(false)
    }
  }, [capabilityId])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const data = capability ? { capability, reload } : null

  return { data, loading, error, reload }
}
