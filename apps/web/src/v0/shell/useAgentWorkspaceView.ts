/**
 * useAgentWorkspaceView
 * URL-driven workspace view state for the Agent Board frame.
 *
 * Manages a discriminated union of agent-specific view states
 * serialized to URL search params:
 *   - ?view=dialogue                    (default)
 *   - ?view=dialogue&sessionId=xxx      (specific session)
 *   - ?view=draft&draftId=yyy
 *   - ?view=cockpit
 *
 * @example
 * const [view, setView] = useAgentWorkspaceView()
 *
 * // Open a specific session dialogue
 * setView({ kind: "dialogue", sessionId: "abc-123" })
 *
 * // View a draft
 * setView({ kind: "draft", draftId: "draft-456" })
 *
 * // Open cockpit
 * setView({ kind: "cockpit" })
 */

import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"

// =============================================================================
// Types
// =============================================================================

export type AgentListType = "drafts" | "journeys" | "keepers" | "sessions"

export type AgentWorkspaceView =
  | { kind: "dialogue"; sessionId?: string }
  | { kind: "draft"; draftId: string }
  | { kind: "cockpit" }
  | { kind: "list"; type: AgentListType }
  | { kind: "journey"; journeyId: string }
  | { kind: "keeper"; keeperId: string }

// =============================================================================
// Hook
// =============================================================================

export function useAgentWorkspaceView(): [AgentWorkspaceView, (next: AgentWorkspaceView) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Deserialize from URL ──
  const rawKind = searchParams.get("view")?.toLowerCase() ?? ""

  let currentView: AgentWorkspaceView

  switch (rawKind) {
    case "draft": {
      const draftId = searchParams.get("draftId")
      if (draftId) {
        currentView = { kind: "draft", draftId }
      } else {
        currentView = { kind: "dialogue" }
      }
      break
    }
    case "cockpit":
      currentView = { kind: "cockpit" }
      break
    case "list": {
      const type = searchParams.get("type")?.toLowerCase() as AgentListType | undefined
      if (type && ["drafts", "journeys", "keepers", "sessions"].includes(type)) {
        currentView = { kind: "list", type }
      } else {
        currentView = { kind: "dialogue" }
      }
      break
    }
    case "journey": {
      const journeyId = searchParams.get("journeyId")
      if (journeyId) {
        currentView = { kind: "journey", journeyId }
      } else {
        currentView = { kind: "dialogue" }
      }
      break
    }
    case "keeper": {
      const keeperId = searchParams.get("keeperId")
      if (keeperId) {
        currentView = { kind: "keeper", keeperId }
      } else {
        currentView = { kind: "dialogue" }
      }
      break
    }
    case "dialogue":
    default: {
      const sessionId = searchParams.get("sessionId") || undefined
      currentView = { kind: "dialogue", sessionId }
      break
    }
  }

  // ── Serialize to URL ──
  const setView = useCallback(
    (next: AgentWorkspaceView) => {
      const nextParams = new URLSearchParams(searchParams)

      // Clear all view-related params
      nextParams.delete("view")
      nextParams.delete("sessionId")
      nextParams.delete("draftId")
      nextParams.delete("type")
      nextParams.delete("journeyId")
      nextParams.delete("keeperId")

      switch (next.kind) {
        case "dialogue":
          nextParams.set("view", "dialogue")
          if (next.sessionId) {
            nextParams.set("sessionId", next.sessionId)
          }
          break
        case "draft":
          nextParams.set("view", "draft")
          nextParams.set("draftId", next.draftId)
          break
        case "cockpit":
          nextParams.set("view", "cockpit")
          break
        case "list":
          nextParams.set("view", "list")
          nextParams.set("type", next.type)
          break
        case "journey":
          nextParams.set("view", "journey")
          nextParams.set("journeyId", next.journeyId)
          break
        case "keeper":
          nextParams.set("view", "keeper")
          nextParams.set("keeperId", next.keeperId)
          break
      }

      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  return [currentView, setView]
}

export default useAgentWorkspaceView
