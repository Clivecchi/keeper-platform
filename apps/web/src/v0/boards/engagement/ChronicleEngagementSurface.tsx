"use client"

import * as React from "react"
import { EngagementForm } from "../../../components/engagement/EngagementForm"
import { useBoardEngagement } from "./useBoardEngagement"
import type { BoardEngagementIntent } from "./useBoardEngagement"
import { useUniversalBoardOptional } from "../UniversalBoardContext"

export interface ChronicleEngagementSurfaceProps {
  intent: BoardEngagementIntent
  onClose: () => void
  onSuccess?: () => void
}

export function ChronicleEngagementSurface({
  intent,
  onClose,
  onSuccess,
}: ChronicleEngagementSurfaceProps) {
  const boardCtx = useUniversalBoardOptional()
  const engagement = useBoardEngagement(
    () => {
      onSuccess?.()
      boardCtx?.actions.bumpJourneyNav()
      onClose()
    },
    intent,
  )

  const hairline = "hsl(var(--theme-border-soft) / 0.35)"

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <div
        className="shrink-0 px-4 pt-4 pb-3"
        style={{ borderBottom: `1px solid ${hairline}` }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Act
        </p>
        <h2
          className="text-[20px] font-semibold leading-snug mt-1"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {intent.template.label}
        </h2>
        <p
          className="text-[13px] mt-1 leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          Complete the form to contribute to this domain.
        </p>
      </div>

      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 py-4">
        <EngagementForm
          template={intent.template}
          context={intent.context}
          onSubmit={engagement.handleSubmit}
          onCancel={() => {
            engagement.cancel()
            onClose()
          }}
          isLoading={engagement.submitting}
          variant="chronicle"
        />
      </div>
    </div>
  )
}
