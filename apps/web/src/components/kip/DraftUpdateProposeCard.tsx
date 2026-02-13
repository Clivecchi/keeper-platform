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
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs text-gray-500">
        Update rejected
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: "var(--theme-dialogue-border, hsl(35, 20%, 88%))",
        backgroundColor: "var(--theme-dialogue-area-bg, hsl(35, 33%, 97%))",
      }}
    >
      <p className="text-xs font-semibold text-gray-700">
        Proposed update: {draftTitle}
      </p>
      <p className="mt-1 text-xs text-gray-600">{summary}</p>
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
      >
        {expanded ? "▲" : "▼"} {expanded ? "Hide" : "See all"} changes
      </button>
      {expanded && (
        <pre className="mt-2 max-h-40 overflow-y-auto rounded bg-gray-100 p-2 text-xs text-gray-700">
          {JSON.stringify(payload, null, 2)}
        </pre>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onConfirm(draftId, payload)}
          disabled={isApplying}
          className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: "var(--theme-dialogue-user-bg, hsl(14, 60%, 56%))" }}
        >
          {isApplying ? "Applying…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={() => { setRejected(true); onReject() }}
          disabled={isApplying}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          Reject
        </button>
        {onOpenDraft && (
          <button
            type="button"
            onClick={() => onOpenDraft(draftId)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-600 underline hover:text-gray-800"
          >
            View Draft →
          </button>
        )}
      </div>
    </div>
  )
}

export default DraftUpdateProposeCard
