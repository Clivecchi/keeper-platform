/**
 * TreatmentProposeCard
 * Inline confirmation for treatment.propose — Rendr suggests, human applies.
 */

import React from "react"
import type { DomainFrameTreatment } from "../../v0/data/domain-frame.types"

export interface TreatmentProposeCardProps {
  summary: string
  rationale?: string
  proposal: DomainFrameTreatment
  onApply: (proposal: DomainFrameTreatment) => void
  onDismiss: () => void
  isApplying?: boolean
}

export const TreatmentProposeCard: React.FC<TreatmentProposeCardProps> = ({
  summary,
  rationale,
  proposal,
  onApply,
  onDismiss,
  isApplying = false,
}) => {
  const [dismissed, setDismissed] = React.useState(false)

  if (dismissed) {
    return (
      <div
        className="rounded-lg border p-2 text-xs"
        style={{
          borderColor: "hsl(var(--theme-border-soft))",
          backgroundColor: "hsl(var(--theme-surface-panel) / 0.8)",
          color: "var(--theme-ink-tertiary-color)",
        }}
      >
        Treatment proposal dismissed
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))",
        backgroundColor: "hsl(var(--theme-dialogue-area-bg, 35 33% 97%))",
      }}
    >
      <p className="text-xs font-semibold" style={{ color: "var(--theme-ink-primary-color)" }}>
        Proposed Treatment
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--theme-ink-secondary-color)" }}>
        {summary}
      </p>
      {rationale ? (
        <p className="mt-1 text-xs italic" style={{ color: "var(--theme-ink-tertiary-color)" }}>
          {rationale}
        </p>
      ) : null}
      <div
        className="mt-3 grid gap-2 rounded-lg p-2 text-xs"
        style={{
          backgroundColor: "hsl(var(--theme-surface-panel) / 0.8)",
          color: "var(--theme-ink-primary-color)",
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span style={{ color: "var(--theme-ink-tertiary-color)" }}>Name</span>
          <span className="font-medium">{proposal.name}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span style={{ color: "var(--theme-ink-tertiary-color)" }}>Background</span>
          <span className="flex items-center gap-2 font-medium">
            <span
              className="inline-block h-4 w-4 rounded border"
              style={{
                backgroundColor: proposal.palette.background,
                borderColor: "hsl(var(--theme-border-soft))",
              }}
              aria-hidden
            />
            {proposal.palette.background}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span style={{ color: "var(--theme-ink-tertiary-color)" }}>Accent</span>
          <span className="flex items-center gap-2 font-medium">
            <span
              className="inline-block h-4 w-4 rounded border"
              style={{
                backgroundColor: proposal.palette.accent,
                borderColor: "hsl(var(--theme-border-soft))",
              }}
              aria-hidden
            />
            {proposal.palette.accent}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span style={{ color: "var(--theme-ink-tertiary-color)" }}>Font</span>
          <span className="font-medium" style={{ fontFamily: proposal.font.family }}>
            {proposal.font.family}
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onApply(proposal)}
          disabled={isApplying}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))" }}
        >
          {isApplying ? "Applying…" : "Apply"}
        </button>
        <button
          type="button"
          onClick={() => {
            setDismissed(true)
            onDismiss()
          }}
          disabled={isApplying}
          className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-80 disabled:opacity-50"
          style={{
            borderColor: "hsl(var(--theme-border-soft))",
            backgroundColor: "hsl(var(--theme-surface-paper))",
            color: "var(--theme-ink-primary-color)",
          }}
        >
          Not now
        </button>
      </div>
    </div>
  )
}

export default TreatmentProposeCard
