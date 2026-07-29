"use client"

import * as React from "react"
import { peekPlaybillAgent, resolvePlaybillAgent, type ResolvedPlaybillAgent } from "../lib/playbillData"

export interface PlaybillCardData {
  isUncast: boolean
  isLoading: boolean
  agent: ResolvedPlaybillAgent | null
}

export interface UsePlaybillCardInput {
  domainId: string
  leadAgentSlug: string | null
  /** Pre-resolved display name from API enrichment — avoids flash before agent fetch. */
  leadAgentName?: string | null
}

export function usePlaybillCard({
  leadAgentSlug,
  leadAgentName,
}: UsePlaybillCardInput): PlaybillCardData {
  const slug = leadAgentSlug?.trim() ?? ""
  const slugUncast = !slug
  const nameHint = leadAgentName?.trim() || null
  const cached = slugUncast ? null : peekPlaybillAgent(slug)
  const [agent, setAgent] = React.useState<ResolvedPlaybillAgent | null>(cached)
  // Name from API enrichment is enough to paint — portrait may still resolve in background.
  const [isLoading, setIsLoading] = React.useState(!slugUncast && !cached && !nameHint)

  React.useEffect(() => {
    let cancelled = false

    if (slugUncast) {
      setAgent(null)
      setIsLoading(false)
      return
    }

    const warm = peekPlaybillAgent(slug)
    if (warm) {
      setAgent(warm)
      setIsLoading(false)
      return
    }

    // Keep showing leadAgentName while avatar/config loads — no "…" flash.
    setIsLoading(!nameHint)
    void resolvePlaybillAgent(slug)
      .catch(() => null)
      .then((nextAgent) => {
        if (cancelled) return
        setAgent(nextAgent)
        setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [slug, slugUncast, nameHint])

  return {
    isUncast: slugUncast,
    isLoading,
    agent,
  }
}
