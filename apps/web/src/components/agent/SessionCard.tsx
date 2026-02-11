/**
 * SessionCard
 * Renders a single conversation session as a clickable card.
 * Extracted from KipAgentBoardPage for reuse in the new Agent Board frame.
 */

import React from "react"
import clsx from "clsx"
import type { AgentConversationSession } from "../../hooks/useAgentSessions"
import { formatDate, shortId } from "./helpers"

export interface SessionCardProps {
  session: AgentConversationSession
  isActive?: boolean
  onSelect?: () => void
  variant?: "compact" | "full"
  onEdit?: () => void
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  isActive,
  onSelect,
  variant = "compact",
  onEdit,
}) => {
  const secondaryLine =
    session.subtitle ||
    session.summary ||
    session.lastMessagePreview ||
    "No summary yet."
  const primaryLine = session.title || "Session"

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect) return
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect()
        }
      }}
      className={clsx(
        "w-full rounded-2xl border px-4 py-3 text-left transition-shadow focus:outline-none focus:ring-2 focus:ring-[#C96E59]/40",
        isActive
          ? "border-[#C96E59] bg-[#F7F1ED] shadow-sm"
          : "border-[#E6DED5] bg-white hover:shadow",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-900">{primaryLine}</p>
          {secondaryLine ? (
            <p className="mt-1 text-sm text-gray-500">{secondaryLine}</p>
          ) : null}
        </div>
        {onEdit ? (
          <button
            type="button"
            className="text-xs font-semibold text-[#C96E59] hover:underline"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onEdit()
            }}
          >
            Edit
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-gray-400">
        {formatDate(session.updatedAt || session.createdAt)}
      </p>
      {variant === "full" && (
        <p className="mt-1 text-xs text-gray-500">
          Session ID: {shortId(session.id)}
        </p>
      )}
    </div>
  )
}

export default SessionCard
