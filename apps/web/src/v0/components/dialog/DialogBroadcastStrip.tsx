"use client"

import * as React from "react"
import { composeThinkingStoryBody, type DialogThinkingStep } from "./dialogThinking"

export interface DialogBroadcastStripProps {
  /** Live lower-third line — current beat while the agent works. */
  liveLabel: string
  steps: readonly DialogThinkingStep[]
  agentName?: string
  /** When true, the agent is still working through the request. */
  isActive?: boolean
}

/**
 * Broadcast Strip — unified working surface (replaces split Horizon status + Thinking Space).
 * Live beat on top; prior story beats scroll as a subtle ticker below.
 */
export function DialogBroadcastStrip({
  liveLabel,
  steps,
  agentName = "Kip",
  isActive = false,
}: DialogBroadcastStripProps) {
  const tickerBody = React.useMemo(
    () => composeThinkingStoryBody(steps, agentName),
    [steps, agentName],
  )

  if (!isActive && steps.length === 0 && !liveLabel.trim()) {
    return null
  }

  return (
    <div className="dialog-broadcast-content" aria-live="polite">
      <div className="dialog-broadcast-live">
        <span className="dialog-broadcast-live-marker" aria-hidden>
          ▶
        </span>
        <span className="dialog-broadcast-live-text dialog-think-pulse">{liveLabel}</span>
        {isActive ? <span className="dialog-broadcast-cursor" aria-hidden /> : null}
      </div>
      {tickerBody ? (
        <p className="dialog-broadcast-ticker">{tickerBody}</p>
      ) : isActive && steps.length === 0 ? (
        <p className="dialog-broadcast-ticker dialog-broadcast-ticker--pending">Tuning in…</p>
      ) : null}
    </div>
  )
}

export default DialogBroadcastStrip
