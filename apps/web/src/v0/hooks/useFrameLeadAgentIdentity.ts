"use client"

import * as React from "react"
import {
  clearMissingLeadSlug,
  formatDomainLeadDisplayName,
  getCachedFrameLeadAgentDisplayName,
  getCachedLeadAgentIdentity,
  isDomainLeadAgentSlug,
  isMissingLeadAgentSlug,
  KIP_FALLBACK_DISPLAY_NAME,
  KIP_FALLBACK_SLUG,
  resolveFrameLeadAgentIdentity,
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
    return (
      getCachedFrameLeadAgentDisplayName(resolvedSlug)
      ?? (isDomainLeadAgentSlug(resolvedSlug) ? formatDomainLeadDisplayName(resolvedSlug) : pendingDisplayName)
    )
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

    if (isMissingLeadAgentSlug(resolvedSlug)) {
      clearMissingLeadSlug(resolvedSlug)
    }

    const identityCached = getCachedLeadAgentIdentity(resolvedSlug)
    if (identityCached) {
      setDisplayName(identityCached.displayName)
      setIsLoading(false)
      return
    }

    const cached = getCachedFrameLeadAgentDisplayName(resolvedSlug)
    if (cached) {
      setDisplayName(cached)
      setIsLoading(false)
      return
    }

    const pendingLabel = isDomainLeadAgentSlug(resolvedSlug)
      ? formatDomainLeadDisplayName(resolvedSlug)
      : pendingDisplayName
    setDisplayName(pendingLabel)
    setIsLoading(true)
    let cancelled = false

    void resolveFrameLeadAgentIdentity(resolvedSlug, {
      allowKipFallback: !isDomainLeadAgentSlug(resolvedSlug),
    }).then((identity) => {
      if (cancelled) return
      setDisplayName(identity.displayName)
      setIsLoading(false)
    }).catch(() => {
      if (cancelled) return
      setDisplayName(
        isDomainLeadAgentSlug(resolvedSlug)
          ? formatDomainLeadDisplayName(resolvedSlug)
          : KIP_FALLBACK_DISPLAY_NAME,
      )
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
