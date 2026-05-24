"use client"

/**
 * UniversalBoardContext
 * =====================
 * KE3P · Keeper Platform · Universal Board
 *
 * Unified selection state for Universal Board.
 * Provides the board's active selections and actions to all three panels
 * without prop-drilling through the board shell.
 *
 * Selection rules:
 * - Domain entity selections are mutually exclusive:
 *   selecting a Journey clears Keeper, Draft, Agent, Moment, Service.
 * - Session selection is independent: it does not clear entity focus.
 *   The conversation can change sessions while the right panel stays in context.
 * - Collapsed nav panel state lives here — the board owns collapse, not the panel.
 */

import * as React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UniversalBoardSelection {
  activeSessionId: string | null
  selectedDialogId: string | null
  selectedJourneyId: string | null
  selectedMomentId: string | null
  selectedKeeperId: string | null
  selectedDraftId: string | null
  selectedAgentId: string | null
  selectedServiceSlug: string | null
  /** designer mode: the active frame key — independent of domain entity selections. */
  selectedFrameKey: string | null
  /**
   * designer mode: which board's frame list the nav panel displays.
   * Defaults to "domain". Changed when a Board Definition row is selected.
   */
  activeBoardForFrames: string
  /** designer mode: the board definition currently selected in the nav — drives right-panel BoardDefView. */
  selectedBoardDefId: string | null
}

export interface UniversalBoardActions {
  onSessionSelect: (id: string | null) => void
  onDialogSelect: (id: string) => void
  onJourneySelect: (id: string) => void
  onMomentSelect: (id: string) => void
  onKeeperSelect: (id: string) => void
  onDraftSelect: (id: string) => void
  onAgentSelect: (id: string) => void
  onServiceOpen: (slug: string) => void
  clearSelection: () => void
  /** designer mode: selects a frame key. Independent — does not clear other selections. */
  onFrameSelect: (key: string) => void
  /**
   * designer mode: selects a board definition. Sets both activeBoardForFrames (frame list)
   * and selectedBoardDefId (right-panel BoardDefView). Clears selectedFrameKey.
   */
  onBoardDefSelect: (id: string) => void
}

export interface UniversalBoardContextValue {
  selection: UniversalBoardSelection
  actions: UniversalBoardActions
  /** Whether the left nav panel is collapsed. Controlled by the board. */
  navCollapsed: boolean
  onToggleNavCollapsed: () => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

const UniversalBoardCtx = React.createContext<UniversalBoardContextValue | null>(null)

export function useUniversalBoard(): UniversalBoardContextValue {
  const ctx = React.useContext(UniversalBoardCtx)
  if (!ctx) {
    throw new Error("useUniversalBoard must be used within UniversalBoardProvider")
  }
  return ctx
}

/** Returns null if outside a UniversalBoardProvider — safe for panels used in non-universal boards. */
export function useUniversalBoardOptional(): UniversalBoardContextValue | null {
  return React.useContext(UniversalBoardCtx)
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface UniversalBoardProviderProps {
  children: React.ReactNode
}

export function UniversalBoardProvider({ children }: UniversalBoardProviderProps) {
  // ── Selection state ────────────────────────────────────────────────────────
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)
  const [selectedDialogId, setSelectedDialogId] = React.useState<string | null>(null)
  const [selectedJourneyId, setSelectedJourneyId] = React.useState<string | null>(null)
  const [selectedMomentId, setSelectedMomentId] = React.useState<string | null>(null)
  const [selectedKeeperId, setSelectedKeeperId] = React.useState<string | null>(null)
  const [selectedDraftId, setSelectedDraftId] = React.useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null)
  const [selectedServiceSlug, setSelectedServiceSlug] = React.useState<string | null>(null)
  const [selectedFrameKey, setSelectedFrameKey] = React.useState<string | null>(null)
  const [activeBoardForFrames, setActiveBoardForFrames] = React.useState("domain")
  const [selectedBoardDefId, setSelectedBoardDefId] = React.useState<string | null>(null)

  // ── Nav state ──────────────────────────────────────────────────────────────
  const [navCollapsed, setNavCollapsed] = React.useState(false)

  // ── Actions ───────────────────────────────────────────────────────────────
  // Domain entity selections are mutually exclusive.
  // Selecting any one clears all others — the right panel shifts to show the new presence.

  const onSessionSelect = React.useCallback((id: string | null) => {
    setActiveSessionId(id)
    // Session selection does not clear entity focus — conversation can shift
    // while the right panel stays in the same domain context.
  }, [])

  const onDialogSelect = React.useCallback((id: string) => {
    setSelectedDialogId(id)
    setSelectedJourneyId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
  }, [])

  const onJourneySelect = React.useCallback((id: string) => {
    setSelectedJourneyId(id)
    setSelectedDialogId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
  }, [])

  const onMomentSelect = React.useCallback((id: string) => {
    setSelectedMomentId(id)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
  }, [])

  const onKeeperSelect = React.useCallback((id: string) => {
    setSelectedKeeperId(id)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedMomentId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
  }, [])

  const onDraftSelect = React.useCallback((id: string) => {
    setSelectedDraftId(id)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
  }, [])

  const onAgentSelect = React.useCallback((id: string) => {
    setSelectedAgentId(id)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedServiceSlug(null)
  }, [])

  const onServiceOpen = React.useCallback((slug: string) => {
    setSelectedServiceSlug(slug)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
  }, [])

  const clearSelection = React.useCallback(() => {
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedFrameKey(null)
    setSelectedBoardDefId(null)
  }, [])

  const onFrameSelect = React.useCallback((key: string) => {
    setSelectedFrameKey(key)
    setSelectedBoardDefId(null)
  }, [])

  const onBoardDefSelect = React.useCallback((id: string) => {
    setActiveBoardForFrames(id)
    setSelectedBoardDefId(id)
    setSelectedFrameKey(null)
  }, [])

  const onToggleNavCollapsed = React.useCallback(() => {
    setNavCollapsed((c) => !c)
  }, [])

  // ── Value ─────────────────────────────────────────────────────────────────

  const value = React.useMemo<UniversalBoardContextValue>(
    () => ({
      selection: {
        activeSessionId,
        selectedDialogId,
        selectedJourneyId,
        selectedMomentId,
        selectedKeeperId,
        selectedDraftId,
        selectedAgentId,
        selectedServiceSlug,
        selectedFrameKey,
        activeBoardForFrames,
        selectedBoardDefId,
      },
      actions: {
        onSessionSelect,
        onDialogSelect,
        onJourneySelect,
        onMomentSelect,
        onKeeperSelect,
        onDraftSelect,
        onAgentSelect,
        onServiceOpen,
        clearSelection,
        onFrameSelect,
        onBoardDefSelect,
      },
      navCollapsed,
      onToggleNavCollapsed,
    }),
    [
      activeSessionId,
      selectedDialogId,
      selectedJourneyId,
      selectedMomentId,
      selectedKeeperId,
      selectedDraftId,
      selectedAgentId,
      selectedServiceSlug,
      selectedFrameKey,
      activeBoardForFrames,
      selectedBoardDefId,
      onSessionSelect,
      onDialogSelect,
      onJourneySelect,
      onMomentSelect,
      onKeeperSelect,
      onDraftSelect,
      onAgentSelect,
      onServiceOpen,
      clearSelection,
      onFrameSelect,
      onBoardDefSelect,
      navCollapsed,
      onToggleNavCollapsed,
    ],
  )

  return (
    <UniversalBoardCtx.Provider value={value}>
      {children}
    </UniversalBoardCtx.Provider>
  )
}
