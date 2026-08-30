"use client"

import * as React from "react"
import { StageAgencyStrip } from "./StageAgencyStrip"
import { fetchComposerCast, useKeeperStageOptional, type ComposerCastAgent } from "./useKeeperStage"

/** Agency fields inside elevated Composer — only when an agent is selected on Stage. */
export function ComposerStageAgency({ domainId }: { domainId: string | null }) {
  const stageApi = useKeeperStageOptional()
  const [cast, setCast] = React.useState<ComposerCastAgent[]>([])

  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    void fetchComposerCast(domainId).then((agents) => {
      if (!cancelled) setCast(agents)
    })
    return () => {
      cancelled = true
    }
  }, [domainId])

  const selected = stageApi?.selected
  if (!stageApi || selected?.kind !== "agent") return null

  const agent = cast.find((item) => item.id === selected.objectId) ?? null

  return (
    <StageAgencyStrip
      layout="composer"
      presence={selected}
      agent={agent}
      onChange={(patch) => stageApi.updateAgency(selected.id, patch)}
    />
  )
}
