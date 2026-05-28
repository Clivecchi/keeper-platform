/**
 * DraftPointProposeCard
 * Receipt card for draft.update.propose — a proposed Draft Point with Accept.
 */

import React from "react"
import type { DraftPoint, DraftPointType } from "@keeper/shared"

export interface DraftPointProposeCardProps {
  draftId: string
  draftTitle: string
  point: DraftPoint
  onAccept?: (draftId: string, pointId: string) => void
  onOpenDraft?: (draftId: string) => void
  isAccepting?: boolean
  accepted?: boolean
}

const TYPE_LABELS: Record<DraftPointType, string> = {
  moment: "Moment",
  decision: "Decision",
  context: "Context",
  general: "Point",
}

export const DraftPointProposeCard: React.FC<DraftPointProposeCardProps> = ({
  draftId,
  draftTitle,
  point,
  onAccept,
  onOpenDraft,
  isAccepting = false,
  accepted = false,
}) => {
  const typeLabel = TYPE_LABELS[point.type] ?? "Point"

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: "hsl(var(--theme-dialogue-border, 35 20% 88%))",
        backgroundColor: "hsl(var(--theme-dialogue-area-bg, 35 33% 97%))",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: "var(--theme-ink-primary-color)" }}>
            Proposed {typeLabel.toLowerCase()}
            {draftTitle ? (
              <>
                {" "}
                in <span className="font-medium">{draftTitle}</span>
              </>
            ) : null}
          </p>
          <p
            className="mt-1.5 text-sm leading-relaxed"
            style={{ color: "var(--theme-ink-secondary-color)" }}
          >
            {point.content}
          </p>
          <p className="mt-1 text-[11px]" style={{ color: "var(--theme-ink-tertiary-color)" }}>
            {point.proposedBy} · {point.status}
          </p>
        </div>
        {accepted && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              background: "hsl(142 40% 94%)",
              color: "hsl(142 50% 30%)",
              border: "1px solid hsl(142 30% 82%)",
            }}
          >
            Accepted
          </span>
        )}
      </div>

      {!accepted && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onAccept?.(draftId, point.id)}
            disabled={isAccepting || !onAccept}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))" }}
          >
            {isAccepting ? "Accepting…" : "Accept"}
          </button>
          {onOpenDraft && (
            <button
              type="button"
              onClick={() => onOpenDraft(draftId)}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold underline transition-colors hover:opacity-80"
              style={{ color: "var(--theme-ink-secondary-color)" }}
            >
              View Draft →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default DraftPointProposeCard
