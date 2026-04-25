/**
 * SessionBannerCard
 *
 * Unified banner for the dialogue workspace combining:
 * - Session title (editable inline)
 * - Session ID
 * - Journey, Keeper, SOLE, Model (config context)
 *
 * Design: Single card with visual separation between header and context row.
 */

import * as React from "react"
import { PencilIcon, Cog6ToothIcon } from "@heroicons/react/24/outline"
import { shortId } from "./helpers"

const SURFACE = {
  bg: "hsl(var(--theme-surface-paper) / 0.95)",
  border: "hsl(var(--theme-border-soft))",
  inkPrimary: "var(--theme-ink-primary-color)",
  inkSecondary: "var(--theme-ink-secondary-color)",
}

export interface SessionBannerCardProps {
  /** Session title (editable) */
  sessionTitle: string
  /** Session ID for display */
  sessionId: string | null
  /** Callback when session title is saved */
  onSaveTitle?: (name: string) => Promise<void>
  /** Whether title save is in progress */
  isSavingTitle?: boolean
  /** Journey name */
  journeyName?: string | null
  /** Keeper name */
  keeperName?: string | null
  /** SOLE memory active */
  soleActive?: boolean
  /** Model provider (e.g. openai, anthropic) */
  modelProvider?: string | null
  /** Callback to open cockpit for model change */
  onOpenCockpit?: () => void
  /** Optional class name */
  className?: string
}

export const SessionBannerCard: React.FC<SessionBannerCardProps> = ({
  sessionTitle,
  sessionId,
  onSaveTitle,
  isSavingTitle = false,
  journeyName,
  keeperName,
  soleActive = false,
  modelProvider,
  onOpenCockpit,
  className = "",
}) => {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(sessionTitle)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setEditValue(sessionTitle)
  }, [sessionTitle])

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = async () => {
    const trimmed = editValue.trim()
    if (trimmed && trimmed !== sessionTitle && onSaveTitle) {
      await onSaveTitle(trimmed)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleSave()
    }
    if (e.key === "Escape") {
      setEditValue(sessionTitle)
      setIsEditing(false)
    }
  }

  const contextItems: { label: string; value: string; active: boolean }[] = [
    { label: "Keeper", value: keeperName || "None", active: Boolean(keeperName) },
    { label: "Journey", value: journeyName || "None", active: Boolean(journeyName) },
    { label: "Session", value: sessionId ? shortId(sessionId) : "None", active: Boolean(sessionId) },
    { label: "SOLE", value: soleActive ? "Active" : "Inactive", active: soleActive },
    {
      label: "Model",
      value: modelProvider ? modelProvider.toUpperCase() : "OpenAI",
      active: Boolean(modelProvider),
    },
  ]

  return (
    <div
      className={`rounded-xl border ${className}`}
      style={{
        backgroundColor: SURFACE.bg,
        borderColor: SURFACE.border,
      }}
    >
      {/* Header: Session title + Edit + Session ID */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: SURFACE.border }}>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              disabled={isSavingTitle}
              className="min-w-0 flex-1 rounded border bg-transparent px-2 py-1 text-lg font-semibold outline-none focus:ring-1"
              style={{
                borderColor: SURFACE.border,
                color: SURFACE.inkPrimary,
              }}
            />
          ) : (
            <h3 className="truncate text-lg font-semibold" style={{ color: SURFACE.inkPrimary }}>
              {sessionTitle}
            </h3>
          )}
          {onSaveTitle && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="shrink-0 rounded p-1 transition-colors hover:opacity-70"
              style={{ color: SURFACE.inkSecondary }}
              aria-label="Edit session name"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {sessionId && (
            <span className="text-xs" style={{ color: SURFACE.inkSecondary }}>
              {shortId(sessionId)}
            </span>
          )}
          {onOpenCockpit && (
            <button
              type="button"
              onClick={onOpenCockpit}
              className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors hover:opacity-90"
              style={{
                borderColor: SURFACE.border,
                color: SURFACE.inkSecondary,
                backgroundColor: "transparent",
              }}
            >
              <Cog6ToothIcon className="h-3.5 w-3.5" />
              Change model
            </button>
          )}
        </div>
      </div>

      {/* Context row: Journey, Keeper, SOLE, Session, Model */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
        {contextItems.map((item) => (
          <span key={item.label} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor: item.active ? "rgb(16 185 129)" : "rgb(209 213 219)",
              }}
            />
            <span style={{ color: SURFACE.inkSecondary }}>{item.label}:</span>
            <span
              className="font-medium"
              style={{ color: item.active ? SURFACE.inkPrimary : SURFACE.inkSecondary }}
            >
              {item.value}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default SessionBannerCard
