"use client"

import * as React from "react"
import { Pencil } from "lucide-react"
import { AuthorSaveBar } from "./ChronicleAuthorControls"
import { formatDocumentStatusLabel } from "./documentHeader"

export interface DocumentHeaderProps {
  title: string
  status?: string | null
  pointCount: number
  componentCount?: number
  editing?: boolean
  onToggleEdit?: () => void
  onTitleSave?: (title: string) => void
  onCycleStatus?: () => void
  onFocusSections?: () => void
  documentControl?: React.ReactNode
  busy?: boolean
}

/**
 * Universal Document identity header — same Chronicle header family as Draft (`Cdraft`).
 * Pencil opens author mode. The title itself is the field. Save / Cancel commit it.
 */
export function DocumentHeader({
  title,
  status,
  pointCount,
  componentCount = 0,
  editing = false,
  onToggleEdit,
  onTitleSave,
  onCycleStatus,
  onFocusSections,
  documentControl,
  busy = false,
}: DocumentHeaderProps) {
  const [draftTitle, setDraftTitle] = React.useState(title)

  React.useEffect(() => {
    setDraftTitle(title)
  }, [title, editing])

  const dirty = draftTitle.trim() !== title.trim() && draftTitle.trim().length > 0

  return (
    <div className="cdraft shrink-0" data-document-header="">
      <header className="cdraft-header">
        <div className="flex items-start gap-3">
          {editing && onTitleSave ? (
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  if (dirty) onTitleSave(draftTitle.trim())
                }
                if (event.key === "Escape") {
                  setDraftTitle(title)
                }
              }}
              aria-label="Document title"
              className="cdraft-title min-w-0 flex-1 border-0 bg-transparent px-0 py-0 outline-none"
            />
          ) : (
            <h1 className="cdraft-title min-w-0 flex-1">{title}</h1>
          )}
          {onToggleEdit ? (
            <button
              type="button"
              onClick={onToggleEdit}
              className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
              style={{
                color: editing
                  ? "hsl(var(--theme-accent-primary))"
                  : "hsl(var(--theme-ink-tertiary))",
              }}
              aria-pressed={editing}
              aria-label={editing ? "Done editing Document" : "Edit Document"}
              title={editing ? "Done" : "Edit"}
            >
              <Pencil className="h-4 w-4" strokeWidth={1.75} />
            </button>
          ) : null}
        </div>
        {editing && onTitleSave ? (
          <AuthorSaveBar
            saveLabel="Save title"
            dirty={dirty}
            busy={busy}
            onSave={() => {
              if (dirty) onTitleSave(draftTitle.trim())
            }}
            onCancel={() => setDraftTitle(title)}
          />
        ) : null}
        <div className="cdraft-meta-strip">
          {onCycleStatus ? (
            <button
              type="button"
              className="cdraft-status-pill"
              onClick={onCycleStatus}
              title="Document stage — drafts, kept, or presented. Click to cycle."
            >
              {formatDocumentStatusLabel(status)}
            </button>
          ) : (
            <span className="cdraft-status-pill">{formatDocumentStatusLabel(status)}</span>
          )}
          <span className="cdraft-meta-item">
            {pointCount} {pointCount === 1 ? "point" : "points"}
          </span>
          {componentCount > 0 ? (
            onFocusSections ? (
              <button
                type="button"
                className="cdraft-meta-item"
                onClick={onFocusSections}
                title="Linked Drafts on this Document — open the Sections list"
              >
                {componentCount} {componentCount === 1 ? "draft" : "drafts"}
              </button>
            ) : (
              <span className="cdraft-meta-item">
                {componentCount} {componentCount === 1 ? "draft" : "drafts"}
              </span>
            )
          ) : null}
        </div>
        {documentControl ? (
          <div className="cdraft-document-control mt-2">{documentControl}</div>
        ) : null}
      </header>
    </div>
  )
}
