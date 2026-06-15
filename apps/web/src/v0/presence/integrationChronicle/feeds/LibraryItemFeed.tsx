"use client"

import * as React from "react"
import { apiFetch } from "../../../../lib/apiFetch"

export type LibraryItemDto = {
  id: string
  domain_id: string
  source_type: string
  source_ref: string
  display_label: string | null
  description: string | null
  agent_perspective: string | null
  assigned_keeper_id: string | null
  assigned_agent_id: string | null
  assigned_keeper_name: string | null
  assigned_agent_name: string | null
  chronicle_blocks: string[]
  chronicle_actions: string[]
  has_embedding: boolean
  created_at: string
  updated_at: string
}

export type LibraryItemFeedData = {
  item: LibraryItemDto
  reload: () => Promise<void>
}

export function useLibraryItemFeedData(libraryItemId: string): {
  data: LibraryItemFeedData | null
  loading: boolean
  error: string | null
  reload: () => Promise<void>
} {
  const [item, setItem] = React.useState<LibraryItemDto | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const reload = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const row = (await apiFetch(
        `/api/library-items/${encodeURIComponent(libraryItemId)}`,
      )) as LibraryItemDto
      setItem(row)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load library item")
      setItem(null)
    } finally {
      setLoading(false)
    }
  }, [libraryItemId])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const data = item ? { item, reload } : null
  return { data, loading, error, reload }
}
