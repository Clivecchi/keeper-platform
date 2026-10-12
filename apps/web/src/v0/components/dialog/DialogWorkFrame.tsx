"use client"

import * as React from "react"
import { AgentMessageContent } from "../../../components/agent/AgentMessageContent"
import type { DialogThinkingStep } from "./dialogThinking"
import {
  workElapsedLabel,
  workIsStalled,
  workVoiceName,
} from "./dialogWork"

const ink = "hsl(var(--theme-ink-primary))"
const inkSecondary = "hsl(var(--theme-ink-secondary))"
const inkTertiary = "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))"

function FrameSlide({
  context,
  title,
  children,
  index,
  count,
  onIndex,
}: {
  context: string
  title: string
  children: React.ReactNode
  index: number
  count: number
  onIndex: (next: number) => void
}) {
  return (
    <section
      aria-label={title}
      className="flex h-full min-h-0 w-full flex-col justify-center px-[8%] py-16"
    >
      <p className="text-[11px] uppercase tracking-[0.14em]" style={{ color: inkTertiary, margin: 0 }}>
        {context}
      </p>
      <h2 className="keeper-treatment-title mt-3 text-[34px] leading-tight" style={{ color: ink, marginTop: "0.75rem" }}>
        {title}
      </h2>
      <div className="mt-4 text-[18px] leading-relaxed" style={{ color: ink }}>
        {children}
      </div>
      {count > 1 ? (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            aria-label="Previous beat"
            disabled={index <= 0}
            onClick={() => onIndex(Math.max(0, index - 1))}
            className="text-[12px] disabled:opacity-30"
            style={{ color: inkSecondary }}
          >
            Back
          </button>
          <p className="text-[11px] tabular-nums tracking-[0.08em]" style={{ color: inkTertiary, margin: 0 }}>
            {index + 1} / {count}
          </p>
          <button
            type="button"
            aria-label="Next beat"
            disabled={index >= count - 1}
            onClick={() => onIndex(Math.min(count - 1, index + 1))}
            className="text-[12px] disabled:opacity-30"
            style={{ color: inkSecondary }}
          >
            Forward
          </button>
        </div>
      ) : null}
    </section>
  )
}

export interface DialogWorkFrameProps {
  liveLabel: string
  steps: readonly DialogThinkingStep[]
  agentName: string
  onStop?: () => void
}

/** Two beats inside the Dialog Frame: the live line, then the full turn. */
export function DialogWorkFrame({
  liveLabel,
  steps,
  agentName,
  onStop,
}: DialogWorkFrameProps) {
  const [index, setIndex] = React.useState(0)
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

  if (index === 1) {
    return (
      <FrameSlide context="Dialog" title="Full turn" index={1} count={2} onIndex={setIndex}>
        <ol className="list-decimal space-y-2 pl-5 text-[16px]" style={{ color: ink }}>
          {steps.length === 0 ? <li>Starting…</li> : null}
          {steps.map((step) => (
            <li key={step.id}>{step.label}</li>
          ))}
        </ol>
        {onStop ? (
          <button
            type="button"
            className="mt-5 text-[12px] underline-offset-4 hover:underline"
            style={{ color: ink }}
            onClick={() => {
              setStopping(true)
              onStop()
            }}
            disabled={stopping}
          >
            {stopping ? "Stopping…" : "Stop"}
          </button>
        ) : null}
      </FrameSlide>
    )
  }

  return (
    <FrameSlide context="Dialog" title={voice} index={0} count={2} onIndex={setIndex}>
      <p className="whitespace-pre-wrap" style={{ margin: 0 }}>
        {stalled ? "Still on this step." : beat}
      </p>
      {stalled ? (
        <p className="mt-3 text-[15px]" style={{ color: inkSecondary, marginTop: "0.75rem" }}>
          {beat}
        </p>
      ) : null}
      <p className="mt-5 text-[15px] tabular-nums" style={{ color: inkSecondary, marginTop: "1.25rem" }}>
        {elapsed}
      </p>
    </FrameSlide>
  )
}

/** The determined reply, in the same slide the work just occupied. */
export function DialogReplySlide({
  text,
  agentName,
}: {
  text: string
  agentName: string
}) {
  return (
    <FrameSlide context="Dialog" title={agentName} index={0} count={1} onIndex={() => {}}>
      <AgentMessageContent content={text} />
    </FrameSlide>
  )
}

export default DialogWorkFrame
