"use client"

import * as React from "react"
import {
  createEmptyPromptPoint,
  parsePromptToPoints,
  serializePromptPoints,
  type PromptPoint,
} from "./promptPoints"
import { ComposedPromptPreview } from "./ComposedPromptPreview.tsx"

export interface AgentPromptsSectionProps {
  lensValue: string
  composedValue?: string
  /** Lead agents: runtime preview only. Other agents: editable voice on this agent. */
  showAgentVoice: boolean
  showComposed: boolean
  /** Shown for System / non-Lead agents when composed prompt is hidden */
  operationalContext?: string
  lensError?: string
  onLensChange: (value: string) => void
}

function PromptPointList({
  points,
  editable,
  onChange,
}: {
  points: PromptPoint[]
  editable: boolean
  onChange?: (next: PromptPoint[]) => void
}) {
  const updatePoint = (id: string, content: string) => {
    if (!onChange) return
    onChange(points.map((p) => (p.id === id ? { ...p, content } : p)))
  }

  const removePoint = (id: string) => {
    if (!onChange) return
    const next = points.filter((p) => p.id !== id)
    onChange(next.length > 0 ? next : [createEmptyPromptPoint()])
  }

  const addPoint = () => {
    if (!onChange) return
    onChange([...points, createEmptyPromptPoint()])
  }

  if (!editable && points.every((p) => !p.content.trim())) {
    return (
      <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        No prompt points yet.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {points.map((point, index) => (
          <li
            key={point.id}
            className="rounded-lg border px-3 py-2.5"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.45)",
              background: editable
                ? "hsl(var(--theme-surface-elevated) / 0.35)"
                : "hsl(var(--theme-surface-elevated) / 0.28)",
            }}
          >
            <div className="flex items-start gap-2">
              <span
                className="shrink-0 pt-0.5 text-[12px] font-medium tabular-nums"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                aria-hidden
              >
                {index + 1}.
              </span>
              {editable ? (
                <textarea
                  value={point.content}
                  onChange={(e) => updatePoint(point.id, e.target.value)}
                  rows={2}
                  placeholder="One instruction or behavior…"
                  className="flex-1 min-w-0 resize-y bg-transparent text-[14px] leading-relaxed outline-none"
                  style={{ color: "hsl(var(--theme-ink-primary))" }}
                />
              ) : (
                <p
                  className="flex-1 text-[14px] leading-relaxed"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                >
                  {point.content}
                </p>
              )}
              {editable && points.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePoint(point.id)}
                  className="shrink-0 text-[12px] px-1.5 py-0.5 rounded opacity-70 hover:opacity-100"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                  aria-label={`Remove point ${index + 1}`}
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {editable && (
        <button
          type="button"
          onClick={addPoint}
          className="text-[13px] font-medium px-2 py-1 rounded-md border"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.55)",
            color: "hsl(var(--theme-ink-secondary))",
          }}
        >
          + Add point
        </button>
      )}
    </div>
  )
}

function useSyncedPoints(value: string) {
  const [points, setPoints] = React.useState<PromptPoint[]>(() => parsePromptToPoints(value))
  const lastSerialized = React.useRef(value)

  React.useEffect(() => {
    if (value === lastSerialized.current) return
    lastSerialized.current = value
    setPoints(parsePromptToPoints(value))
  }, [value])

  return { points, setPoints, lastSerialized }
}

export function AgentPromptsSection({
  lensValue,
  composedValue = "",
  showAgentVoice,
  showComposed,
  operationalContext,
  lensError,
  onLensChange,
}: AgentPromptsSectionProps) {
  const { points: lensPoints, setPoints, lastSerialized } = useSyncedPoints(lensValue)

  const handleLensPointsChange = (next: PromptPoint[]) => {
    setPoints(next)
    const serialized = serializePromptPoints(next)
    // Only propagate to parent when serialized text changes — empty draft points
    // must stay local or they vanish on re-parse (serialize drops blank lines).
    if (serialized !== lensValue) {
      lastSerialized.current = serialized
      onLensChange(serialized)
    }
  }

  return (
    <div className="space-y-5">
      {!showComposed && operationalContext?.trim() && (
        <div>
          <p className="keeper-presence-field-label mb-1.5">System context</p>
          <p
            className="text-[12px] mb-2 leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Operational prompt for this agent (purpose / role). Lead agents use composed prompt instead.
          </p>
          <pre
            className="keeper-presence-field-value whitespace-pre-wrap break-words font-mono text-[14px] rounded-lg border px-3 py-2.5"
            style={{
              color: "hsl(var(--theme-ink-secondary))",
              borderColor: "hsl(var(--theme-border-soft) / 0.45)",
            }}
          >
            {operationalContext.trim()}
          </pre>
        </div>
      )}
      {showAgentVoice && (
        <div>
          <p className="keeper-presence-field-label mb-1.5">Agent voice</p>
          <p
            className="text-[12px] mb-2 leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Instructions for this agent only — saved on this agent record (Save required). Does not
            affect other agents.
          </p>
          <PromptPointList
            points={lensPoints}
            editable
            onChange={handleLensPointsChange}
          />
          {lensError ? (
            <p
              className="text-[13px] mt-2 leading-relaxed"
              style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
            >
              {lensError}
            </p>
          ) : null}
        </div>
      )}

      {showComposed && (
        <div>
          <p className="keeper-presence-field-label mb-1.5">Runtime assembly</p>
          <ComposedPromptPreview value={composedValue} />
        </div>
      )}
    </div>
  )
}
