"use client"

import * as React from "react"
import type { DialogThinkingStep } from "./dialogThinking"

interface DialogThinkStreamProps {
  steps: readonly DialogThinkingStep[]
  agentName?: string
}

/**
 * Thinking Space — scrollable chain-of-thought trace while the agent is working.
 * The Horizon shows a short summary of the latest step.
 */
export function DialogThinkStream({ steps, agentName = "Kip" }: DialogThinkStreamProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [steps.length])

  if (steps.length === 0) {
    return (
      <p className="dialog-think-stream-idle" aria-live="polite">
        {agentName} is working through your request…
      </p>
    )
  }

  return (
    <div className="dialog-think-stream">
      <div className="dialog-think-stream-head">
        <span className="dialog-think-stream-label">Chain of thought</span>
        <span className="dialog-think-stream-count">{steps.length} step{steps.length === 1 ? "" : "s"}</span>
      </div>
      <div ref={scrollRef} className="dialog-think-stream-scroll" aria-live="polite">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`dialog-think-step${index === steps.length - 1 ? " dialog-think-step--active" : ""}`}
          >
            <span className="dialog-think-step-index">{index + 1}</span>
            <span className="dialog-think-step-label">{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DialogThinkStream
