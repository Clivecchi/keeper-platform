/**
 * DraftUpdateProposeCard
 * Renders a confirmation card for draft.update.propose actions.
 * Shows summary, expandable "See all changes", and Confirm/Reject buttons.
 */

import React from "react"

export interface DraftUpdateProposeCardProps {
  draftId: string
  draftTitle: string
  summary: string
  proposedPayload: { id: string; title?: string; summary?: string; status?: string; spec?: unknown }
  onConfirm: (draftId: string, payload: { title?: string; summary?: string; status?: string; spec?: unknown }) => void
  onReject: () => void
  onOpenDraft?: (draftId: string) => void
  isApplying?: boolean
}

export const DraftUpdateProposeCard: React.FC<DraftUpdateProposeCardProps> = ({
  draftId,
  draftTitle,
  summary,
  proposedPayload,
  onConfirm,
  onReject,
  onOpenDraft,
  isApplying = false,
}) => {
  const [expanded, setExpanded] = React.useState(false)
  const [rejected, setRejected] = React.useState(false)
  const payload = {
    title: proposedPayload.title,
    summary: proposedPayload.summary,
    status: proposedPayload.status,
    spec: proposedPayload.spec,
  }

  if (rejected) {
    return (
      <div
        className="rounded-lg border p-2 text-xs"
        style={{
          borderColor: "hsl(var(--theme-border-soft))",
          backgroundColor: "hsl(var(--theme-surface-panel) / 0.8)",
          color: "var(--theme-ink-tertiary-color)",
        }}
      >
        Update rejected
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
        Proposed update: {draftTitle}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--theme-ink-secondary-color)" }}>{summary}</p>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-2 flex items-center gap-1 text-xs transition-colors hover:opacity-80"
        style={{ color: "var(--theme-ink-tertiary-color)" }}
      >
        {expanded ? "▲" : "▼"} {expanded ? "Hide" : "See all"} changes
      </button>
      {expanded && (
        <pre
          className="mt-2 max-h-40 overflow-y-auto rounded p-2 text-xs"
          style={{ backgroundColor: "hsl(var(--theme-surface-panel) / 0.8)", color: "var(--theme-ink-primary-color)" }}
        >
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onConfirm(draftId, payload)}
          disabled={isApplying}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))" }}
        >
          {isApplying ? "Applying…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => { setRejected(true); onReject() }}
          disabled={isApplying}
          className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-80 disabled:opacity-50"
          style={{
            borderColor: "hsl(var(--theme-border-soft))",
            backgroundColor: "hsl(var(--theme-surface-paper))",
            color: "var(--theme-ink-primary-color)",
          }}
        >
          Reject
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
    </div>
  )
}

export default DraftUpdateProposeCard
