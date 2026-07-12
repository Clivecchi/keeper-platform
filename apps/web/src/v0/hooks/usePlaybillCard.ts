"use client"

import * as React from "react"
import {
  fetchDomainPlaybillStats,
  formatPlaybillActivity,
  resolvePlaybillAgent,
  type DomainPlaybillStats,
  type ResolvedPlaybillAgent,
} from "../lib/playbillData"

export interface PlaybillCardData {
  isUncast: boolean
  isLoading: boolean
  agent: ResolvedPlaybillAgent | null
  stats: DomainPlaybillStats | null
  activityLine: string
}

export interface UsePlaybillCardInput {
  domainId: string
  leadAgentSlug: string | null
  /** Pre-resolved display name from API enrichment — avoids flash before agent fetch. */
  leadAgentName?: string | null
}

export function usePlaybillCard({
  domainId,
  leadAgentSlug,
  leadAgentName,
}: UsePlaybillCardInput): PlaybillCardData {
  const slug = leadAgentSlug?.trim() ?? ""
  const slugUncast = !slug
  const [agent, setAgent] = React.useState<ResolvedPlaybillAgent | null>(null)
  const [stats, setStats] = React.useState<DomainPlaybillStats | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    const statsPromise = domainId
      ? fetchDomainPlaybillStats(domainId).catch(() => ({ momentCount: 0, lastActivity: null }))
      : Promise.resolve({ momentCount: 0, lastActivity: null })

    const agentPromise = slugUncast
      ? Promise.resolve(null)
      : resolvePlaybillAgent(slug).catch(() => null)

    void Promise.all([statsPromise, agentPromise]).then(([nextStats, nextAgent]) => {
      if (cancelled) return
      setStats(nextStats)
      setAgent(nextAgent)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [domainId, slug, slugUncast])

  const activityLine = formatPlaybillActivity(stats)
  const isUncast = slugUncast

  return {
    isUncast,
    isLoading,
    agent,
    stats,
    activityLine,
  }
}
