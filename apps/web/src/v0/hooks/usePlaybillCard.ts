"use client"

import * as React from "react"
import { resolvePlaybillAgent, type ResolvedPlaybillAgent } from "../lib/playbillData"

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
}: UsePlaybillCardInput): PlaybillCardData {
  const slug = leadAgentSlug?.trim() ?? ""
  const slugUncast = !slug
  const [agent, setAgent] = React.useState<ResolvedPlaybillAgent | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    const agentPromise = slugUncast
      ? Promise.resolve(null)
      : resolvePlaybillAgent(slug).catch(() => null)

    void agentPromise.then((nextAgent) => {
      if (cancelled) return
      setAgent(nextAgent)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [slug, slugUncast])

  const isUncast = slugUncast

  return {
    isUncast,
    isLoading,
    agent,
  }
}
