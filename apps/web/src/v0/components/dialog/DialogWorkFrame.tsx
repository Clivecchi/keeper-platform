"use client"

import * as React from "react"
import type { DialogThinkingStep } from "./dialogThinking"
import {
  workElapsedLabel,
  workIsStalled,
  workVoiceName,
  type DialogWorkTab,
} from "./dialogWork"

export interface DialogWorkFrameProps {
  liveLabel: string
  steps: readonly DialogThinkingStep[]
  agentName: string
  onStop?: () => void
}

/**
 * Center card while a turn runs.
 * At work is one voice and one line. Full turn is the line-by-line record, with Stop.
 */
export function DialogWorkFrame({
  liveLabel,
  steps,
  agentName,
  onStop,
}: DialogWorkFrameProps) {
  const [tab, setTab] = React.useState<DialogWorkTab>("at-work")
  const [stopping, setStopping] = React.useState(false)
  const startedAt = React.useRef(Date.now())
  const stepMark = React.useRef(Date.now())
  const [now, setNow] = React.useState(() => Date.now())
  const latest = steps[steps.length - 1]
  const stepKey = `${liveLabel}|${latest?.id ?? ""}`

  React.useEffect(() => {
    stepMark.current = Date.now()
  }, [stepKey])

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const voice = workVoiceName(liveLabel, agentName)
  const beat = liveLabel.trim() || `${voice} is working…`
  const stalled = workIsStalled(now - stepMark.current)
  const elapsed = workElapsedLabel(now - startedAt.current)

  return (
    <section className="dialog-work-card" aria-label="Dialog at work" data-stalled={stalled || undefined}>
      <div className="dialog-work-tabs" role="tablist" aria-label="Turn view">
        <button
          type="button"
          role="tab"
          id="dialog-work-tab-at-work"
          aria-selected={tab === "at-work"}
          aria-controls="dialog-work-panel-at-work"
          className={tab === "at-work" ? "dialog-work-tab dialog-work-tab--active" : "dialog-work-tab"}
          onClick={() => setTab("at-work")}
        >
          At work
        </button>
        <button
          type="button"
          role="tab"
          id="dialog-work-tab-full-turn"
          aria-selected={tab === "full-turn"}
          aria-controls="dialog-work-panel-full-turn"
          className={tab === "full-turn" ? "dialog-work-tab dialog-work-tab--active" : "dialog-work-tab"}
          onClick={() => setTab("full-turn")}
        >
          Full turn
        </button>
      </div>

      {tab === "at-work" ? (
        <div
          role="tabpanel"
          id="dialog-work-panel-at-work"
          aria-labelledby="dialog-work-tab-at-work"
          className="dialog-work-panel"
        >
          <div className="dialog-work-live">
            <span className={stalled ? "dialog-work-pulse dialog-work-pulse--stalled" : "dialog-work-pulse"} aria-hidden />
            <h2 className="dialog-work-voice">{voice}</h2>
            <span className="dialog-work-elapsed">{elapsed}</span>
          </div>
          <p className="dialog-work-beat" aria-live="polite">
            {stalled ? "Still on this step." : beat}
          </p>
          {stalled ? <p className="dialog-work-beat-prior">{beat}</p> : null}
          <p className="dialog-work-hint">Full turn shows each line, and Stop.</p>
        </div>
      ) : (
        <div
          role="tabpanel"
          id="dialog-work-panel-full-turn"
          aria-labelledby="dialog-work-tab-full-turn"
          className="dialog-work-panel"
        >
          <ol className="dialog-work-lines">
            {steps.length === 0 ? <li>Starting…</li> : null}
            {steps.map((step) => (
              <li key={step.id}>{step.label}</li>
            ))}
          </ol>
          {onStop ? (
            <button
              type="button"
              className="dialog-work-stop"
              onClick={() => {
                setStopping(true)
                onStop()
              }}
              disabled={stopping}
            >
              {stopping ? "Stopping…" : "Stop"}
            </button>
          ) : null}
        </div>
      )}
    </section>
  )
}

export default DialogWorkFrame
