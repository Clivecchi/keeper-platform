"use client"

import * as React from "react"
import { composeThinkingStoryBody, type DialogThinkingStep } from "./dialogThinking"

interface DialogThinkStreamProps {
  steps: readonly DialogThinkingStep[]
  agentName?: string
  /** When true, the agent is still working through the request. */
  isActive?: boolean
}

/**
 * Thinking Space — compositional story while the agent works.
 * The live beat lives on the Horizon; prior beats accumulate here as prose.
 */
export function DialogThinkStream({
  steps,
  agentName = "Kip",
  isActive = false,
}: DialogThinkStreamProps) {
  const storyBody = React.useMemo(
    () => composeThinkingStoryBody(steps, agentName),
    [steps, agentName],
  )

  if (!isActive && steps.length === 0) {
    return null
  }

  return (
    <div className="dialog-think-stream" aria-live="polite">
      <p className="dialog-think-story-lead">{agentName} is working</p>
      {storyBody ? (
        <p className="dialog-think-story-body">{storyBody}</p>
      ) : isActive && steps.length === 0 ? (
        <p className="dialog-think-story-body dialog-think-story-body--pending">
          Listening to your message…
        </p>
      ) : null}
    </div>
  )
}

export default DialogThinkStream
