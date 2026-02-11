/**
 * useWorkspaceView
 * URL-driven workspace view state with open-ended view kinds.
 *
 * Unlike useWorkspaceMode (which manages a fixed enum of modes), this hook
 * manages a discriminated union of view states serialized to URL search params.
 * The workspace can show any entity, a creation form, or the default feed.
 *
 * URL serialization:
 *   - ?view=feed             (default, or no params)
 *   - ?view=entity&entityType=journey&entityId=xxx
 *   - ?view=create&template=journey.create
 *   - ?view=summary
 *
 * @example
 * const [view, setView] = useWorkspaceView()
 *
 * // Navigate to a journey detail
 * setView({ kind: "entity", entityType: "journey", entityId: "abc-123" })
 *
 * // Back to feed
 * setView({ kind: "feed" })
 *
 * // Open creation form
 * setView({ kind: "create", templateSlug: "moment.create" })
 */

import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"

// =============================================================================
// Types
// =============================================================================

export type WorkspaceEntityType = "journey" | "keeper" | "moment"

export type WorkspaceView =
  | { kind: "feed" }
  | { kind: "entity"; entityType: WorkspaceEntityType; entityId: string }
  | { kind: "create"; templateSlug: string }
  | { kind: "summary" }

// =============================================================================
// Hook
// =============================================================================

export function useWorkspaceView(): [WorkspaceView, (next: WorkspaceView) => void] {
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Deserialize from URL ──
  const rawKind = searchParams.get("view")?.toLowerCase() ?? ""

  let currentView: WorkspaceView

  switch (rawKind) {
    case "entity": {
      const entityType = searchParams.get("entityType")?.toLowerCase() as WorkspaceEntityType | undefined
      const entityId = searchParams.get("entityId")
      if (entityType && entityId && ["journey", "keeper", "moment"].includes(entityType)) {
        currentView = { kind: "entity", entityType, entityId }
      } else {
        currentView = { kind: "feed" }
      }
      break
    }
    case "create": {
      const templateSlug = searchParams.get("template")
      if (templateSlug) {
        currentView = { kind: "create", templateSlug }
      } else {
        currentView = { kind: "feed" }
      }
      break
    }
    case "summary":
      currentView = { kind: "summary" }
      break
    case "feed":
    default:
      currentView = { kind: "feed" }
      break
  }

  // ── Serialize to URL ──
  const setView = useCallback(
    (next: WorkspaceView) => {
      const nextParams = new URLSearchParams(searchParams)

      // Clear all view-related params first
      nextParams.delete("view")
      nextParams.delete("entityType")
      nextParams.delete("entityId")
      nextParams.delete("template")
      // Also clean up legacy "experience" param if present
      nextParams.delete("experience")

      switch (next.kind) {
        case "feed":
          nextParams.set("view", "feed")
          break
        case "entity":
          nextParams.set("view", "entity")
          nextParams.set("entityType", next.entityType)
          nextParams.set("entityId", next.entityId)
          break
        case "create":
          nextParams.set("view", "create")
          nextParams.set("template", next.templateSlug)
          break
        case "summary":
          nextParams.set("view", "summary")
          break
      }

      setSearchParams(nextParams, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  return [currentView, setView]
}

export default useWorkspaceView
