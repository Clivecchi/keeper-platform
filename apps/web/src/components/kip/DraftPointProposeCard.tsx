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
  onOpenPoint?: (draftId: string, pointId: string) => void
  isAccepting?: boolean
  accepted?: boolean
  failed?: boolean
  failureReason?: string
  /** True when Keeper refused a second copy of a Point already on the host. */
  alreadyPresent?: boolean
  /** Document vs working Draft — drives "Open in Document" copy. */
  hostKind?: "document" | "draft"
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
  onOpenPoint,
  isAccepting = false,
  accepted = false,
  failed = false,
  failureReason,
  alreadyPresent = false,
  hostKind = "draft",
}) => {
  const typeLabel = TYPE_LABELS[point.type] ?? "Point"
  const hostLabel = hostKind === "document" ? "Document" : "Draft"
  const heading = failed
    ? `Not added · ${typeLabel.toLowerCase()}`
    : alreadyPresent
      ? `Already on this ${hostLabel.toLowerCase()}`
      : `${accepted ? "Added" : "Proposed"} ${typeLabel.toLowerCase()}`
  const handleOpen = onOpenPoint
    ? () => onOpenPoint(draftId, point.id)
    : onOpenDraft
      ? () => onOpenDraft(draftId)
      : undefined

  return (
    <div
      className="rounded-lg border p-3"
      onClick={handleOpen && !failed ? handleOpen : undefined}
      style={{
        borderColor: failed
          ? "hsl(14 50% 70%)"
          : "hsl(var(--theme-dialogue-border, 35 20% 88%))",
        backgroundColor: failed
          ? "hsl(14 40% 96%)"
          : "hsl(var(--theme-dialogue-area-bg, 35 33% 97%))",
        cursor: handleOpen && !failed ? "pointer" : "default",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold" style={{ color: "var(--theme-ink-primary-color)" }}>
            {heading}
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
            {failed
              ? (failureReason || "The Dialog Document was not updated.")
              : `${point.proposedBy} · ${point.status}`}
          </p>
        </div>
        {failed && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              background: "hsl(14 40% 94%)",
              color: "hsl(14 50% 32%)",
              border: "1px solid hsl(14 30% 80%)",
            }}
          >
            Not added
          </span>
        )}
        {accepted && !failed && (
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

      {!failed && handleOpen && (
        <div className="mt-3 flex flex-wrap gap-2">
          {!accepted && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                onAccept?.(draftId, point.id)
              }}
              disabled={isAccepting || !onAccept}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))" }}
            >
              {isAccepting ? "Accepting…" : "Accept"}
            </button>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              handleOpen()
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold underline transition-colors hover:opacity-80"
            style={{ color: "var(--theme-ink-secondary-color)" }}
          >
            Open in {draftTitle || hostLabel} →
          </button>
        </div>
      )}
    </div>
  )
}

export default DraftPointProposeCard
