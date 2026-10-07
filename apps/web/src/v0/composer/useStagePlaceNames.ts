"use client"

/**
 * Place labels for the orientation path.
 * State stays with the dialog frame so a presentation that hides the bar
 * does not drop names already learned.
 * `active` is the performance posture. Dialog mode does not load Realm truth.
 */

import * as React from "react"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { useStagePassOptional } from "./stagePass"
import { useRealmWhereWeAreTruth } from "./useStageTruth"

export function useStagePlaceNames(
  shellDomainId: string | null,
  active: boolean,
): Record<string, string> {
  const pass = useStagePassOptional()
  const shell = useV0ShellOptional()
  const realmTruth = useRealmWhereWeAreTruth(active && pass?.truth === "realm-where-we-are")
  const [names, setNames] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (!active) return
    const wordmark = shell?.domainFrame?.theme.wordmark?.trim() ?? ""
    const continuations = realmTruth.truth?.continuations ?? []
    setNames((current) => {
      const next = { ...current }
      let changed = false
      if (shellDomainId && wordmark && next[shellDomainId] !== wordmark) {
        next[shellDomainId] = wordmark
        changed = true
      }
      for (const row of continuations) {
        const label = row.domainName?.trim() ?? ""
        if (label && next[row.domainId] !== label) {
          next[row.domainId] = label
          changed = true
        }
      }
      return changed ? next : current
    })
  }, [active, shellDomainId, realmTruth.truth, shell?.domainFrame?.theme.wordmark])

  return names
}
