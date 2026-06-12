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
import { useFrameContextOptional } from "../shell/FrameContext"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UniversalBoardSelection {
  activeSessionId: string | null
  /** Domain-level active journey — persisted via FrameContext; used by Set as Active in Chronicle. */
  activeJourneyId: string | null
  selectedDialogId: string | null
  selectedJourneyId: string | null
  selectedMomentId: string | null
  selectedKeeperId: string | null
  selectedDraftId: string | null
  selectedAgentId: string | null
  selectedServiceSlug: string | null
  selectedKeyId: string | null
  /** When set, Chronicle shows this SOLE memory card stacked above the current entity (e.g. draft). */
  selectedSoleMemoryId: string | null
  /** designer mode: the board definition currently selected in the nav — drives right-panel BoardDefView. */
  selectedBoardDefId: string | null
  /** Increment to refetch draft presence in Chronicle after point mutations. */
  draftPresenceRevision: number
  /** Agent Board: Chronicle Training Mode — entered via Train on agent cover. */
  trainingMode: boolean
}

export interface UniversalBoardActions {
  onSessionSelect: (id: string | null) => void
  /** Marks a journey as the domain-active journey (Kip sessions, moment keeping). */
  onSetActiveJourney: (id: string) => void
  onDialogSelect: (id: string) => void
  onJourneySelect: (id: string) => void
  onMomentSelect: (id: string) => void
  onKeeperSelect: (id: string) => void
  onDraftSelect: (id: string) => void
  onAgentSelect: (id: string) => void
  onServiceOpen: (slug: string) => void
  onKeySelect: (id: string) => void
  /** Opens a SOLE memory card in Chronicle; pass null to return to the underlying selection. */
  onSoleMemorySelect: (id: string | null) => void
  clearSelection: () => void
  /** designer mode: selects a board definition — drives right-panel BoardDefView. Pass null to clear. */
  onBoardDefSelect: (id: string | null) => void
  bumpDraftPresence: () => void
  onEnterTrainingMode: () => void
  onExitTrainingMode: () => void
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
  const frameCtx = useFrameContextOptional()

  // ── Selection state ────────────────────────────────────────────────────────
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)
  const [selectedDialogId, setSelectedDialogId] = React.useState<string | null>(null)
  const [selectedJourneyId, setSelectedJourneyId] = React.useState<string | null>(null)
  const [selectedMomentId, setSelectedMomentId] = React.useState<string | null>(null)
  const [selectedKeeperId, setSelectedKeeperId] = React.useState<string | null>(null)
  const [selectedDraftId, setSelectedDraftId] = React.useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null)
  const [selectedServiceSlug, setSelectedServiceSlug] = React.useState<string | null>(null)
  const [selectedKeyId, setSelectedKeyId] = React.useState<string | null>(null)
  const [selectedSoleMemoryId, setSelectedSoleMemoryId] = React.useState<string | null>(null)
  const [selectedBoardDefId, setSelectedBoardDefId] = React.useState<string | null>(null)
  const [draftPresenceRevision, setDraftPresenceRevision] = React.useState(0)
  const [trainingMode, setTrainingMode] = React.useState(false)

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

  const onSetActiveJourney = React.useCallback(
    (id: string) => {
      frameCtx?.setActiveJourneyId(id)
    },
    [frameCtx],
  )

  const onDialogSelect = React.useCallback((id: string) => {
    setSelectedDialogId(id)
    setSelectedJourneyId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
  }, [])

  const onJourneySelect = React.useCallback((id: string) => {
    setSelectedJourneyId(id)
    setSelectedDialogId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
  }, [])

  const onMomentSelect = React.useCallback((id: string) => {
    setSelectedMomentId(id)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
  }, [])

  const onKeeperSelect = React.useCallback((id: string) => {
    setSelectedKeeperId(id)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedMomentId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
  }, [])

  const onDraftSelect = React.useCallback((id: string) => {
    setSelectedSoleMemoryId(null)
    setSelectedDraftId(id)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
  }, [])

  const onAgentSelect = React.useCallback((id: string) => {
    setTrainingMode(false)
    setSelectedAgentId(id)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
  }, [])

  const onServiceOpen = React.useCallback((slug: string) => {
    setSelectedServiceSlug(slug)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedKeyId(null)
  }, [])

  const onKeySelect = React.useCallback((id: string) => {
    setSelectedKeyId(id)
    setSelectedSoleMemoryId(null)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
  }, [])

  const onSoleMemorySelect = React.useCallback((id: string | null) => {
    setSelectedSoleMemoryId(id)
  }, [])

  const onEnterTrainingMode = React.useCallback(() => {
    setTrainingMode(true)
  }, [])

  const onExitTrainingMode = React.useCallback(() => {
    setTrainingMode(false)
  }, [])

  const clearSelection = React.useCallback(() => {
    setTrainingMode(false)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
    setSelectedSoleMemoryId(null)
    setSelectedBoardDefId(null)
  }, [])

  const onBoardDefSelect = React.useCallback((id: string | null) => {
    setSelectedBoardDefId(id)
  }, [])

  const bumpDraftPresence = React.useCallback(() => {
    setDraftPresenceRevision((n) => n + 1)
  }, [])

  const onToggleNavCollapsed = React.useCallback(() => {
    setNavCollapsed((c) => !c)
  }, [])

  // ── Value ─────────────────────────────────────────────────────────────────

  const value = React.useMemo<UniversalBoardContextValue>(
    () => ({
      selection: {
        activeSessionId,
        activeJourneyId: frameCtx?.selection.activeJourneyId ?? null,
        selectedDialogId,
        selectedJourneyId,
        selectedMomentId,
        selectedKeeperId,
        selectedDraftId,
        selectedAgentId,
        selectedServiceSlug,
        selectedKeyId,
        selectedSoleMemoryId,
        selectedBoardDefId,
        draftPresenceRevision,
        trainingMode,
      },
      actions: {
        onSessionSelect,
        onSetActiveJourney,
        onDialogSelect,
        onJourneySelect,
        onMomentSelect,
        onKeeperSelect,
        onDraftSelect,
        onAgentSelect,
        onServiceOpen,
        onKeySelect,
        onSoleMemorySelect,
        clearSelection,
        onBoardDefSelect,
        bumpDraftPresence,
        onEnterTrainingMode,
        onExitTrainingMode,
      },
      navCollapsed,
      onToggleNavCollapsed,
    }),
    [
      activeSessionId,
      frameCtx?.selection.activeJourneyId,
      onSetActiveJourney,
      selectedDialogId,
      selectedJourneyId,
      selectedMomentId,
      selectedKeeperId,
      selectedDraftId,
      selectedAgentId,
      selectedServiceSlug,
      selectedKeyId,
      selectedSoleMemoryId,
      selectedBoardDefId,
      draftPresenceRevision,
      trainingMode,
      onSessionSelect,
      onSetActiveJourney,
      onDialogSelect,
      onJourneySelect,
      onMomentSelect,
      onKeeperSelect,
      onDraftSelect,
      onAgentSelect,
      onServiceOpen,
      onKeySelect,
      onSoleMemorySelect,
      clearSelection,
      onBoardDefSelect,
      bumpDraftPresence,
      onEnterTrainingMode,
      onExitTrainingMode,
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
