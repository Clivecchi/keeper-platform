"use client"

import * as React from "react"
import {
  fetchFrameLeadAgentDisplayName,
  getCachedFrameLeadAgentDisplayName,
  KIP_FALLBACK_DISPLAY_NAME,
  KIP_FALLBACK_SLUG,
} from "../lib/frameLeadAgentIdentity"

export interface FrameLeadAgentIdentity {
  slug: string | null
  displayName: string
  isLoading: boolean
}

/**
 * Shared resolver for `domainFrame.kip.agent_id` → human display name.
 * Used by Universal Dialog, Guided Arrival, and mobile Kip so all boards show the same lead agent label.
 */
export function useFrameLeadAgentIdentity(
  agentSlug: string | null | undefined,
  /** Shown while the agent record is loading (avoids flashing the technical slug). */
  pendingDisplayName: string = KIP_FALLBACK_DISPLAY_NAME,
): FrameLeadAgentIdentity {
  const slug = agentSlug?.trim() || null
  const resolvedSlug = slug && slug !== KIP_FALLBACK_SLUG ? slug : null

  const [displayName, setDisplayName] = React.useState(() => {
    if (!resolvedSlug) return KIP_FALLBACK_DISPLAY_NAME
    return getCachedFrameLeadAgentDisplayName(resolvedSlug) ?? pendingDisplayName
  })

  const [isLoading, setIsLoading] = React.useState(
    () => !!resolvedSlug && !getCachedFrameLeadAgentDisplayName(resolvedSlug),
  )

  React.useEffect(() => {
    if (!resolvedSlug) {
      setDisplayName(KIP_FALLBACK_DISPLAY_NAME)
      setIsLoading(false)
      return
    }

    const cached = getCachedFrameLeadAgentDisplayName(resolvedSlug)
    if (cached) {
      setDisplayName(cached)
      setIsLoading(false)
      return
    }

    setDisplayName(pendingDisplayName)
    setIsLoading(true)
    let cancelled = false

    void fetchFrameLeadAgentDisplayName(resolvedSlug).then((name) => {
      if (cancelled) return
      setDisplayName(name)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [resolvedSlug, pendingDisplayName])

  return {
    slug: resolvedSlug,
    displayName,
    isLoading,
  }
}
