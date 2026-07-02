"use client"

import * as React from "react"
import { GUIDED_ARRIVAL_COMPOSE_HINT } from "@keeper/shared"
import { useUniversalBoard } from "../boards/UniversalBoardContext"
import { useGuidedArrival } from "./GuidedArrivalContext"
import { GuidedArrivalBanner } from "./GuidedArrivalBanner"

export interface GuidedArrivalOrchestratorProps {
  /** Mobile Domain Screen — focus Kip tab on first owner visit. */
  focusMobileKipTab?: () => void
  /** When false, only runs activation side-effects (mobile shell). */
  showBanner?: boolean
}

export function GuidedArrivalOrchestrator({
  focusMobileKipTab,
  showBanner = true,
}: GuidedArrivalOrchestratorProps) {
  const guidedArrival = useGuidedArrival()
  const { actions } = useUniversalBoard()
  const activatedRef = React.useRef(false)

  React.useEffect(() => {
    if (!guidedArrival.isActive || activatedRef.current) return
    activatedRef.current = true
    actions.clearSelection()
    actions.setDraftComposeHint(GUIDED_ARRIVAL_COMPOSE_HINT)
    focusMobileKipTab?.()
  }, [guidedArrival.isActive, actions, focusMobileKipTab])

  if (!guidedArrival.isActive || !showBanner) return null

  return (
    <div className="absolute top-[52px] left-0 right-0 z-20 pointer-events-none">
      <div className="pointer-events-auto max-w-3xl mx-auto">
        <GuidedArrivalBanner
          agentName={guidedArrival.leadAgentDisplayName}
          greeting={guidedArrival.greeting}
          dismissed={guidedArrival.isBannerDismissed}
          onDismiss={guidedArrival.dismissBanner}
          onAcknowledge={() => void guidedArrival.acknowledge()}
        />
      </div>
    </div>
  )
}
