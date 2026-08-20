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
 * - Nav selects one subject. Dialog, Draft, Journey, Glossary, Board Definition, …
 *   are mutually exclusive. That subject loads into Dialog, then Chronicle.
 * - Session is which thread of the selected Dialog — not a second subject.
 * - Design `?definition=` is idle board-spec only. It must not steal Chronicle
 *   from a Dialog or Draft.
 * - Collapsed nav panel state lives here — the board owns collapse, not the panel.
 */

import * as React from "react"
import { useSearchParams } from "react-router-dom"
import { useFrameContextOptional } from "../shell/FrameContext"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import type { GlossAnchor, GlossContentSnapshot, ChroniclePanelMode, ChronicleView } from "@keeper/shared"
import { glossAnchorToDraftDiscuss, hasChronicleEntitySubject, OBJECT_GLOSSARY_SUBJECT_ID, resolveChronicleView } from "@keeper/shared"
import { useBoardDefinitionFromUrl } from "./useBoardDefinitionFromUrl"
import type { CapabilityNavRowPatch } from "../presence/integrationChronicle/capabilityNavUtils"
import type { KeeperNavRowPatch } from "../presence/integrationChronicle/keeperNavUtils"
import type { LibraryNavRowPatch } from "../presence/integrationChronicle/libraryNavUtils"
import type { CastMemberSlug } from "./UniversalBoardDefinition"
import type { VoicePromptSectionKey } from "../presence/cover/voicePromptSections"
import type { BoardEngagementIntent } from "./engagement/useBoardEngagement"
import type { EngagementContext } from "../../components/engagement/EngagementForm"
import { parseEngagementTemplateResponse } from "./engagement/parseEngagementTemplateResponse"
import { apiFetch } from "../../lib/api"
import { GuidedArrivalProvider } from "../guidedArrival/GuidedArrivalContext"
import { clearPrefetchedDialogSession } from "./domain/dialogSessionPrefetch"

// ─── Types ────────────────────────────────────────────────────────────────────

export type KeyNavRowPatch = {
  keyId: string
  display_label?: string
  description?: string
}

export type DraftNavRowPatch = {
  draftId: string
  title?: string
}

export type AgentNavRowPatch = {
  agentId: string
  name?: string
  model?: string | null
}

export interface UniversalBoardSelection {
  activeSessionId: string | null
  /** Domain-level active journey — persisted via FrameContext; used by Set as Active in Chronicle. */
  activeJourneyId: string | null
  selectedDialogId: string | null
  selectedJourneyId: string | null
  selectedPathId: string | null
  selectedMomentId: string | null
  selectedKeeperId: string | null
  selectedDraftId: string | null
  selectedAgentId: string | null
  selectedServiceSlug: string | null
  selectedKeyId: string | null
  selectedCapabilityId: string | null
  selectedLibraryItemId: string | null
  /** Object Glossary — governing vocabulary subject (not a Dialog Document). */
  selectedGlossaryId: string | null
  /**
   * title_source by Dialog id from Nav. Chronicle Document shell only for user_set.
   * Chatter / system_promoted stay conversations.
   */
  dialogTitleSourceById: Record<string, string>
  /** When set, Chronicle shows this SOLE memory card stacked above the current entity (e.g. draft). */
  selectedSoleMemoryId: string | null
  /** designer mode: the board definition currently selected in the nav — drives right-panel BoardDefView. */
  selectedBoardDefId: string | null
  /** Increment to refetch draft presence in Chronicle after point mutations. */
  draftPresenceRevision: number
  /** Increment to refetch Keys nav list after Key metadata save. */
  keyNavRevision: number
  /** Optimistic Keys nav row patch applied before refetch completes. */
  keyNavRowPatch: KeyNavRowPatch | null
  /** Increment to refetch Capabilities nav list after Capability metadata save. */
  capabilityNavRevision: number
  /** Optimistic Capabilities nav row patch applied before refetch completes. */
  capabilityNavRowPatch: CapabilityNavRowPatch | null
  /** Increment to refetch Library nav list after Library metadata save. */
  libraryNavRevision: number
  /** Optimistic Library nav row patch applied before refetch completes. */
  libraryNavRowPatch: LibraryNavRowPatch | null
  /** Increment to refetch Keepers nav list after Keeper metadata save. */
  keeperNavRevision: number
  /** Optimistic Keepers nav row patch applied before refetch completes. */
  keeperNavRowPatch: KeeperNavRowPatch | null
  /** Increment to refetch Journeys nav list after engagement creates a journey. */
  journeyNavRevision: number
  /** Increment to refetch Dialogs nav list after dialog create or archive. */
  dialogNavRevision: number
  /** Increment to refetch Drafts nav list after create or metadata save. */
  draftNavRevision: number
  /** Optimistic Drafts nav row patch applied before refetch completes. */
  draftNavRowPatch: DraftNavRowPatch | null
  /** Increment to refetch Agents nav list after agent metadata save. */
  agentNavRevision: number
  /** Optimistic Agents nav row patch applied before refetch completes. */
  agentNavRowPatch: AgentNavRowPatch | null
  /** When set, the next Dialog run includes this anchor in agentContext. */
  draftDiscussAnchor: GlossAnchor | null
  /** Optional snapshot (library perspective, chronicle body) for the next Dialog gloss exchange. */
  draftDiscussGlossContent: GlossContentSnapshot | null
  /** When rewrite, Kip receives draftDiscussIntent and a stronger rewrite prompt. */
  draftDiscussIntent: "discuss" | "rewrite" | null
  /** Prefills Dialog composer once (e.g. Rewrite draft point). */
  draftComposeHint: string | null
  /** Agent Board: Chronicle Training Mode — entered via Train on agent cover. */
  trainingMode: boolean
  /** Agent Board training storyboard — which voice-prompt frame is in focus. */
  activeTrainingFrame: VoicePromptSectionKey
  /** Directed cueing (IDE/Designer): single pinned Cast member for dialog delegation. */
  activeCastMember: CastMemberSlug | null
  /**
   * Domain/Realm multi-select: cued non-lead Cast members (Cloud + Rendr, etc.).
   * Lead is always engaged separately — not represented in this list.
   */
  cuedCastMembers: ReadonlyArray<CastMemberSlug>
  chroniclePanelMode: ChroniclePanelMode
  chroniclePointTarget: { pointId: string | null; breadcrumb: string[] | null }
  /** Bumped when a deep-link requests the mobile Chronicle overlay open. */
  chronicleOpenRequestId: number
}

export interface UniversalBoardActions {
  onSessionSelect: (id: string | null) => void
  /** Marks a journey as the domain-active journey (Kip sessions, moment keeping). */
  onSetActiveJourney: (id: string) => void
  onDialogSelect: (id: string) => void
  onJourneySelect: (id: string) => void
  onPathSelect: (id: string) => void
  onMomentSelect: (id: string) => void
  /** Clears moment focus only — e.g. mobile moment overlay dismiss. */
  onMomentClear: () => void
  onKeeperSelect: (id: string) => void
  onDraftSelect: (id: string) => void
  onAgentSelect: (id: string) => void
  onServiceOpen: (slug: string) => void
  onKeySelect: (id: string) => void
  onCapabilitySelect: (id: string) => void
  onLibraryItemSelect: (id: string) => void
  /** Opens the Object Glossary in Chronicle (Domain read / Design definition). */
  onGlossarySelect: () => void
  /** Open Chronicle Act to bring writing from outside Keeper into a Dialog. */
  requestDialogIngest: (options?: { dialogId?: string | null; dialogTitle?: string | null }) => void
  closeDialogIngest: () => void
  /** Opens a SOLE memory card in Chronicle; pass null to return to the underlying selection. */
  onSoleMemorySelect: (id: string | null) => void
  clearSelection: () => void
  /** designer mode: selects a board definition — drives right-panel BoardDefView. Pass null to clear. */
  onBoardDefSelect: (id: string | null) => void
  bumpDraftPresence: () => void
  bumpKeyNav: (patch?: KeyNavRowPatch) => void
  bumpCapabilityNav: (patch?: CapabilityNavRowPatch) => void
  bumpLibraryNav: (patch?: LibraryNavRowPatch) => void
  bumpKeeperNav: (patch?: KeeperNavRowPatch) => void
  bumpJourneyNav: () => void
  bumpDialogNav: () => void
  /** Hydrate Dialog title_source from Nav so Chronicle can tell Chatter from named Dialogs. */
  setDialogTitleSources: (byId: Record<string, string>) => void
  bumpDraftNav: (patch?: DraftNavRowPatch) => void
  bumpAgentNav: (patch?: AgentNavRowPatch) => void
  /** Pass a gloss anchor into Dialog context for the next Kip exchange. */
  requestDiscussDraftPoint: (
    anchor: GlossAnchor,
    options?: { dialogId?: string | null; glossContent?: GlossContentSnapshot },
  ) => void
  /** Alias for requestDiscussDraftPoint — Gloss terminology. */
  requestGloss: (
    anchor: GlossAnchor,
    options?: { dialogId?: string | null; glossContent?: GlossContentSnapshot },
  ) => void
  /** Opens Dialog with rewrite intent and prefills composer for draft.point.rewrite. */
  requestRewriteDraftPoint: (
    anchor: GlossAnchor,
    options?: { dialogId?: string | null; pointPreview?: string },
  ) => void
  clearDraftDiscussAnchor: () => void
  clearDraftComposeHint: () => void
  /** Prefill Dialog composer once (guided arrival, etc.). */
  setDraftComposeHint: (hint: string | null) => void
  /** Open an engagement form in Chronicle (right panel), not Nav. */
  requestChronicleEngagement: (slug: string, context: EngagementContext) => Promise<void>
  closeChronicleEngagement: () => void
  onEnterTrainingMode: () => void
  onExitTrainingMode: () => void
  onTrainingFrameSelect: (frame: VoicePromptSectionKey) => void
  /** IDE/Designer single-swap — replaces the active pin. */
  onSetActiveCastMember: (slug: CastMemberSlug | null) => void
  /** Domain/Realm multi-select — toggle one non-lead Cast member in/out of the cued set. */
  onToggleCastCue: (slug: CastMemberSlug) => void
  /** Domain/Realm — replace the cued set (e.g. clear all). */
  onSetCuedCastMembers: (slugs: ReadonlyArray<CastMemberSlug>) => void
  openChronicleDocument: (options: { dialogId: string; pointId?: string | null; breadcrumb?: string[] | null }) => void
  setChroniclePanelMode: (mode: ChroniclePanelMode) => void
}

export interface UniversalBoardContextValue {
  selection: UniversalBoardSelection
  actions: UniversalBoardActions
  /** Active engagement form — renders in Chronicle, never in Nav. */
  chronicleEngagement: BoardEngagementIntent | null
  /** Bring-in-writing Act — Chronicle, never Nav. */
  dialogIngest: { dialogId: string | null; dialogTitle?: string | null } | null
  /** Layer-1 Chronicle subject + overlay derived from selection (compat shim). */
  chronicleView: ChronicleView
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
  const shell = useV0ShellOptional()
  const [searchParams, setSearchParams] = useSearchParams()

  // ── Selection state ────────────────────────────────────────────────────────
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(null)
  const [selectedDialogId, setSelectedDialogId] = React.useState<string | null>(null)
  const [dialogTitleSourceById, setDialogTitleSourceById] = React.useState<Record<string, string>>({})
  const [selectedJourneyId, setSelectedJourneyId] = React.useState<string | null>(null)
  const [selectedPathId, setSelectedPathId] = React.useState<string | null>(null)
  const [selectedMomentId, setSelectedMomentId] = React.useState<string | null>(null)
  const [selectedKeeperId, setSelectedKeeperId] = React.useState<string | null>(null)
  const [selectedDraftId, setSelectedDraftId] = React.useState<string | null>(null)
  const [selectedAgentId, setSelectedAgentId] = React.useState<string | null>(null)
  const [selectedServiceSlug, setSelectedServiceSlug] = React.useState<string | null>(null)
  const [selectedKeyId, setSelectedKeyId] = React.useState<string | null>(null)
  const [selectedCapabilityId, setSelectedCapabilityId] = React.useState<string | null>(null)
  const [selectedLibraryItemId, setSelectedLibraryItemId] = React.useState<string | null>(null)
  const [selectedGlossaryId, setSelectedGlossaryId] = React.useState<string | null>(null)
  const [selectedSoleMemoryId, setSelectedSoleMemoryId] = React.useState<string | null>(null)
  const [selectedBoardDefId, setSelectedBoardDefId] = React.useState<string | null>(null)
  const [draftPresenceRevision, setDraftPresenceRevision] = React.useState(0)
  const [keyNavRevision, setKeyNavRevision] = React.useState(0)
  const [keyNavRowPatch, setKeyNavRowPatch] = React.useState<KeyNavRowPatch | null>(null)
  const [capabilityNavRevision, setCapabilityNavRevision] = React.useState(0)
  const [capabilityNavRowPatch, setCapabilityNavRowPatch] =
    React.useState<CapabilityNavRowPatch | null>(null)
  const [libraryNavRevision, setLibraryNavRevision] = React.useState(0)
  const [libraryNavRowPatch, setLibraryNavRowPatch] =
    React.useState<LibraryNavRowPatch | null>(null)
  const [keeperNavRevision, setKeeperNavRevision] = React.useState(0)
  const [keeperNavRowPatch, setKeeperNavRowPatch] =
    React.useState<KeeperNavRowPatch | null>(null)
  const [journeyNavRevision, setJourneyNavRevision] = React.useState(0)
  const [dialogNavRevision, setDialogNavRevision] = React.useState(0)
  const [draftNavRevision, setDraftNavRevision] = React.useState(0)
  const [draftNavRowPatch, setDraftNavRowPatch] =
    React.useState<DraftNavRowPatch | null>(null)
  const [agentNavRevision, setAgentNavRevision] = React.useState(0)
  const [agentNavRowPatch, setAgentNavRowPatch] =
    React.useState<AgentNavRowPatch | null>(null)
  const [draftDiscussAnchor, setDraftDiscussAnchor] =
    React.useState<GlossAnchor | null>(null)
  const [draftDiscussGlossContent, setDraftDiscussGlossContent] =
    React.useState<GlossContentSnapshot | null>(null)
  const [draftDiscussIntent, setDraftDiscussIntent] =
    React.useState<"discuss" | "rewrite" | null>(null)
  const [draftComposeHint, setDraftComposeHint] =
    React.useState<string | null>(null)
  const [chronicleEngagement, setChronicleEngagement] =
    React.useState<BoardEngagementIntent | null>(null)
  const [dialogIngest, setDialogIngest] = React.useState<{
    dialogId: string | null
    dialogTitle?: string | null
  } | null>(null)
  const [trainingMode, setTrainingMode] = React.useState(false)
  const [activeTrainingFrame, setActiveTrainingFrame] =
    React.useState<VoicePromptSectionKey>("currently")
  const [activeCastMember, setActiveCastMember] =
    React.useState<CastMemberSlug | null>(null)
  const [cuedCastMembers, setCuedCastMembers] =
    React.useState<CastMemberSlug[]>([])
  const [chroniclePanelMode, setChroniclePanelMode] = React.useState<ChroniclePanelMode>("document")
  const [chroniclePointTarget, setChroniclePointTarget] = React.useState<{ pointId: string | null; breadcrumb: string[] | null }>({
    pointId: null,
    breadcrumb: null,
  })
  const [chronicleOpenRequestId, setChronicleOpenRequestId] = React.useState(0)

  const urlDraftId = shell?.draftId ?? searchParams.get("draftId")

  /** Remove ?draftId= so nav selections (Dialog, Journey, …) are not overwritten by URL sync. */
  const clearDraftIdFromUrl = React.useCallback(() => {
    setSearchParams(
      (prev) => {
        if (!prev.get("draftId")) return prev
        const next = new URLSearchParams(prev)
        next.delete("draftId")
        return next
      },
      { replace: true },
    )
  }, [setSearchParams])

  React.useEffect(() => {
    if (!urlDraftId || urlDraftId === selectedDraftId) return
    // Explicit Dialog nav wins over stale ?draftId= in the URL.
    if (selectedDialogId) return
    setSelectedSoleMemoryId(null)
    setSelectedDraftId(urlDraftId)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedPathId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
    setSelectedCapabilityId(null)
    setSelectedLibraryItemId(null)
    setSelectedGlossaryId(null)
  }, [urlDraftId, selectedDraftId, selectedDialogId])

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
    clearDraftIdFromUrl()
    setSelectedDialogId(id)
    setSelectedJourneyId(null)
    setSelectedPathId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
    setSelectedCapabilityId(null)
    setSelectedLibraryItemId(null)
    setSelectedGlossaryId(null)
    setSelectedBoardDefId(null)
    setChroniclePanelMode("document")
    setChroniclePointTarget({ pointId: null, breadcrumb: null })
  }, [clearDraftIdFromUrl])

  const openChronicleDocument = React.useCallback((options: {
    dialogId: string
    pointId?: string | null
    breadcrumb?: string[] | null
  }) => {
    setDialogTitleSourceById((prev) => ({ ...prev, [options.dialogId]: "user_set" }))
    onDialogSelect(options.dialogId)
    setChroniclePanelMode("document")
    setChroniclePointTarget({
      pointId: options.pointId ?? null,
      breadcrumb: options.breadcrumb ?? null,
    })
    setChronicleOpenRequestId((n) => n + 1)
  }, [onDialogSelect])

  const onJourneySelect = React.useCallback((id: string) => {
    clearDraftIdFromUrl()
    setSelectedJourneyId(id)
    setSelectedPathId(null)
    setSelectedDialogId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
    setSelectedCapabilityId(null)
    setSelectedLibraryItemId(null)
    setSelectedGlossaryId(null)
  }, [clearDraftIdFromUrl])

  const onPathSelect = React.useCallback((id: string) => {
    clearDraftIdFromUrl()
    setSelectedPathId(id)
    setSelectedMomentId(null)
    setSelectedDialogId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
    setSelectedCapabilityId(null)
    setSelectedLibraryItemId(null)
    setSelectedGlossaryId(null)
  }, [clearDraftIdFromUrl])

  const onMomentSelect = React.useCallback((id: string) => {
    clearDraftIdFromUrl()
    setSelectedMomentId(id)
    setSelectedPathId(null)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
    setSelectedCapabilityId(null)
    setSelectedLibraryItemId(null)
    setSelectedGlossaryId(null)
  }, [clearDraftIdFromUrl])

  const onMomentClear = React.useCallback(() => {
    setSelectedMomentId(null)
  }, [])

  const onKeeperSelect = React.useCallback((id: string) => {
    clearDraftIdFromUrl()
    setSelectedKeeperId(id)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedPathId(null)
    setSelectedMomentId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
    setSelectedCapabilityId(null)
    setSelectedLibraryItemId(null)
    setSelectedGlossaryId(null)
  }, [clearDraftIdFromUrl])

  const onDraftSelect = React.useCallback((id: string) => {
    setSelectedSoleMemoryId(null)
    setSelectedDraftId(id)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedPathId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
    setSelectedCapabilityId(null)
    setSelectedLibraryItemId(null)
    setSelectedGlossaryId(null)
    setSelectedBoardDefId(null)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set("draftId", id)
        if (!next.get("board")) next.set("board", "domain")
        return next
      },
      { replace: true },
    )
  }, [setSearchParams])

  const onAgentSelect = React.useCallback((id: string) => {
    clearDraftIdFromUrl()
    setTrainingMode(false)
    setSelectedAgentId(id)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedPathId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
    setSelectedCapabilityId(null)
    setSelectedLibraryItemId(null)
    setSelectedGlossaryId(null)
  }, [clearDraftIdFromUrl])

  const onServiceOpen = React.useCallback((slug: string) => {
    setSelectedServiceSlug(slug)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedPathId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedKeyId(null)
    setSelectedCapabilityId(null)
    setSelectedLibraryItemId(null)
    setSelectedGlossaryId(null)
  }, [])

  const onKeySelect = React.useCallback((id: string) => {
    setSelectedKeyId(id)
    setSelectedCapabilityId(null)
    setSelectedLibraryItemId(null)
    setSelectedGlossaryId(null)
    setSelectedSoleMemoryId(null)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedPathId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
  }, [])

  const onCapabilitySelect = React.useCallback((id: string) => {
    setSelectedCapabilityId(id)
    setSelectedKeyId(null)
    setSelectedLibraryItemId(null)
    setSelectedGlossaryId(null)
    setSelectedSoleMemoryId(null)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedPathId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
  }, [])

  const onLibraryItemSelect = React.useCallback((id: string) => {
    setSelectedLibraryItemId(id)
    setSelectedGlossaryId(null)
    setSelectedKeyId(null)
    setSelectedCapabilityId(null)
    setSelectedSoleMemoryId(null)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedPathId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
  }, [])

  const onGlossarySelect = React.useCallback(() => {
    setSelectedGlossaryId(OBJECT_GLOSSARY_SUBJECT_ID)
    setSelectedLibraryItemId(null)
    setSelectedSoleMemoryId(null)
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedPathId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
    setSelectedCapabilityId(null)
    setSelectedBoardDefId(null)
    shell?.clearBoardDefinition()
  }, [shell])

  const onSoleMemorySelect = React.useCallback((id: string | null) => {
    setSelectedSoleMemoryId(id)
  }, [])

  const onEnterTrainingMode = React.useCallback(() => {
    setTrainingMode(true)
    setActiveTrainingFrame("currently")
  }, [])

  const onExitTrainingMode = React.useCallback(() => {
    setTrainingMode(false)
  }, [])

  const onTrainingFrameSelect = React.useCallback((frame: VoicePromptSectionKey) => {
    setActiveTrainingFrame(frame)
  }, [])

  const onSetActiveCastMember = React.useCallback((slug: CastMemberSlug | null) => {
    setActiveCastMember(slug)
  }, [])

  const onToggleCastCue = React.useCallback((slug: CastMemberSlug) => {
    const key = slug.trim()
    if (!key) return
    setCuedCastMembers((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
    )
  }, [])

  const onSetCuedCastMembers = React.useCallback(
    (slugs: ReadonlyArray<CastMemberSlug>) => {
      setCuedCastMembers(
        slugs.map((s) => s.trim()).filter(Boolean),
      )
    },
    [],
  )

  const clearSelection = React.useCallback(() => {
    setTrainingMode(false)
    setActiveCastMember(null)
    setCuedCastMembers([])
    setSelectedDialogId(null)
    setSelectedJourneyId(null)
    setSelectedPathId(null)
    setSelectedMomentId(null)
    setSelectedKeeperId(null)
    setSelectedDraftId(null)
    setSelectedAgentId(null)
    setSelectedServiceSlug(null)
    setSelectedKeyId(null)
    setSelectedCapabilityId(null)
    setSelectedLibraryItemId(null)
    setSelectedGlossaryId(null)
    setSelectedSoleMemoryId(null)
    setSelectedBoardDefId(null)
  }, [])

  const onBoardDefSelect = React.useCallback((id: string | null) => {
    setSelectedBoardDefId(id)
    if (id) {
      setSelectedSoleMemoryId(null)
      setSelectedDialogId(null)
      setSelectedJourneyId(null)
      setSelectedPathId(null)
      setSelectedMomentId(null)
      setSelectedKeeperId(null)
      setSelectedDraftId(null)
      setSelectedAgentId(null)
      setSelectedServiceSlug(null)
      setSelectedKeyId(null)
      setSelectedCapabilityId(null)
      setSelectedLibraryItemId(null)
      setSelectedGlossaryId(null)
    }
  }, [])

  // Design workspace: mirror ?definition= into context when Design is idle.
  // A Nav entity (Dialog, Draft, Glossary, …) is the subject — do not let the
  // URL default (`domain`) wipe it via onBoardDefSelect.
  const definitionFromUrl = useBoardDefinitionFromUrl()
  const entitySubjectActive = hasChronicleEntitySubject({
    selectedDialogId,
    selectedJourneyId,
    selectedPathId,
    selectedMomentId,
    selectedKeeperId,
    selectedDraftId,
    selectedAgentId,
    selectedServiceSlug,
    selectedKeyId,
    selectedCapabilityId,
    selectedLibraryItemId,
    selectedGlossaryId,
    selectedSoleMemoryId,
    selectedBoardDefId,
  })

  React.useEffect(() => {
    if (entitySubjectActive) return
    if (definitionFromUrl === selectedBoardDefId) return
    onBoardDefSelect(definitionFromUrl)
  }, [definitionFromUrl, selectedBoardDefId, onBoardDefSelect, entitySubjectActive])

  const bumpDraftPresence = React.useCallback(() => {
    setDraftPresenceRevision((n) => n + 1)
  }, [])

  const bumpKeyNav = React.useCallback((patch?: KeyNavRowPatch) => {
    setKeyNavRowPatch(patch ?? null)
    setKeyNavRevision((n) => n + 1)
  }, [])

  const bumpCapabilityNav = React.useCallback((patch?: CapabilityNavRowPatch) => {
    setCapabilityNavRowPatch(patch ?? null)
    setCapabilityNavRevision((n) => n + 1)
  }, [])

  const bumpLibraryNav = React.useCallback((patch?: LibraryNavRowPatch) => {
    setLibraryNavRowPatch(patch ?? null)
    setLibraryNavRevision((n) => n + 1)
  }, [])

  const bumpKeeperNav = React.useCallback((patch?: KeeperNavRowPatch) => {
    setKeeperNavRowPatch(patch ?? null)
    setKeeperNavRevision((n) => n + 1)
  }, [])

  const bumpJourneyNav = React.useCallback(() => {
    setJourneyNavRevision((n) => n + 1)
  }, [])

  const bumpDialogNav = React.useCallback(() => {
    setDialogNavRevision((n) => n + 1)
  }, [])

  const setDialogTitleSources = React.useCallback((byId: Record<string, string>) => {
    setDialogTitleSourceById(byId)
  }, [])

  const bumpDraftNav = React.useCallback((patch?: DraftNavRowPatch) => {
    setDraftNavRowPatch(patch ?? null)
    setDraftNavRevision((n) => n + 1)
  }, [])

  const bumpAgentNav = React.useCallback((patch?: AgentNavRowPatch) => {
    setAgentNavRowPatch(patch ?? null)
    setAgentNavRevision((n) => n + 1)
  }, [])

  const requestDiscussDraftPoint = React.useCallback(
    (
      anchor: GlossAnchor,
      options?: { dialogId?: string | null; glossContent?: GlossContentSnapshot },
    ) => {
      setDraftDiscussAnchor(anchor)
      setDraftDiscussGlossContent(options?.glossContent ?? null)
      setDraftDiscussIntent("discuss")
      setDraftComposeHint(null)
      if (options?.dialogId) {
        onDialogSelect(options.dialogId)
      }
    },
    [onDialogSelect],
  )

  const requestRewriteDraftPoint = React.useCallback(
    (
      anchor: GlossAnchor,
      options?: { dialogId?: string | null; pointPreview?: string },
    ) => {
      setDraftDiscussAnchor(anchor)
      setDraftDiscussIntent("rewrite")
      const draftDiscuss = glossAnchorToDraftDiscuss(anchor)
      if (draftDiscuss) {
        const preview = options?.pointPreview?.trim()
        const hint = preview
          ? [
              `Rewrite this draft point using draft.point.rewrite.`,
              `Draft id: ${draftDiscuss.draftId}`,
              `pointId: ${draftDiscuss.pointId}`,
              "",
              "Current text:",
              preview,
              "",
              "Describe how you want it revised:",
            ].join("\n")
          : [
              `Rewrite draft point ${draftDiscuss.pointId} on draft ${draftDiscuss.draftId}.`,
              "Use draft.point.rewrite with the exact pointId above.",
              "Describe how you want it revised:",
            ].join("\n")
        setDraftComposeHint(hint)
      }
      if (options?.dialogId) {
        onDialogSelect(options.dialogId)
      }
    },
    [onDialogSelect],
  )

  const clearDraftDiscussAnchor = React.useCallback(() => {
    setDraftDiscussAnchor(null)
    setDraftDiscussGlossContent(null)
    setDraftDiscussIntent(null)
  }, [])

  const clearDraftComposeHint = React.useCallback(() => {
    setDraftComposeHint(null)
  }, [])

  const setDraftComposeHintAction = React.useCallback((hint: string | null) => {
    setDraftComposeHint(hint)
  }, [])

  const closeChronicleEngagement = React.useCallback(() => {
    setChronicleEngagement(null)
  }, [])

  const closeDialogIngest = React.useCallback(() => {
    setDialogIngest(null)
  }, [])

  const requestDialogIngest = React.useCallback(
    (options?: { dialogId?: string | null; dialogTitle?: string | null }) => {
      setChronicleEngagement(null)
      setDialogIngest({
        dialogId: options?.dialogId?.trim() ? options.dialogId : null,
        dialogTitle: options?.dialogTitle ?? null,
      })
    },
    [],
  )

  const prevDomainSlugRef = React.useRef(shell?.domainSlug ?? "")
  React.useEffect(() => {
    const nextSlug = shell?.domainSlug ?? ""
    if (!nextSlug || prevDomainSlugRef.current === nextSlug) return
    prevDomainSlugRef.current = nextSlug
    clearPrefetchedDialogSession()
    clearSelection()
    closeChronicleEngagement()
    closeDialogIngest()
    setActiveSessionId(null)
    setDraftDiscussAnchor(null)
    setDraftDiscussGlossContent(null)
    setDraftDiscussIntent(null)
    setDraftComposeHint(null)
    setTrainingMode(false)
    setActiveCastMember(null)
    shell?.clearBoardDefinition()
  }, [shell?.domainSlug, shell, clearSelection, closeChronicleEngagement, closeDialogIngest])

  const requestChronicleEngagement = React.useCallback(
    async (slug: string, context: EngagementContext) => {
      try {
        const response = await apiFetch(
          `/api/engagement/templates/${encodeURIComponent(slug)}`,
        )
        const template = parseEngagementTemplateResponse(response, slug)
        if (!template) {
          const message = `Could not open ${slug}. The engagement template may not be seeded.`
          console.error("[UniversalBoard] Chronicle engagement unavailable:", message, response)
          window.alert(message)
          return
        }
        setDialogIngest(null)
        setChronicleEngagement({ template, context })
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : `Could not open ${slug}. Check your connection and try again.`
        console.error("[UniversalBoard] Chronicle engagement failed:", error)
        window.alert(message)
      }
    },
    [],
  )

  const onToggleNavCollapsed = React.useCallback(() => {
    setNavCollapsed((c) => !c)
  }, [])

  // ── Value ─────────────────────────────────────────────────────────────────

  const chronicleView = React.useMemo(
    () =>
      resolveChronicleView(
        {
          selectedDialogId,
          selectedJourneyId,
          selectedPathId,
          selectedMomentId,
          selectedKeeperId,
          selectedDraftId,
          selectedAgentId,
          selectedServiceSlug,
          selectedKeyId,
          selectedCapabilityId,
          selectedLibraryItemId,
          selectedSoleMemoryId,
          selectedBoardDefId,
          selectedGlossaryId,
        },
        chronicleEngagement
          ? { templateSlug: chronicleEngagement.template.slug }
          : null,
      ),
    [
      selectedDialogId,
      selectedJourneyId,
      selectedPathId,
      selectedMomentId,
      selectedKeeperId,
      selectedDraftId,
      selectedAgentId,
      selectedServiceSlug,
      selectedKeyId,
      selectedCapabilityId,
      selectedLibraryItemId,
      selectedSoleMemoryId,
      selectedBoardDefId,
      selectedGlossaryId,
      chronicleEngagement,
    ],
  )

  const value = React.useMemo<UniversalBoardContextValue>(
    () => ({
      selection: {
        activeSessionId,
        activeJourneyId: frameCtx?.selection.activeJourneyId ?? null,
        selectedDialogId,
        dialogTitleSourceById,
        selectedJourneyId,
        selectedPathId,
        selectedMomentId,
        selectedKeeperId,
        selectedDraftId,
        selectedAgentId,
        selectedServiceSlug,
        selectedKeyId,
        selectedCapabilityId,
        selectedLibraryItemId,
        selectedGlossaryId,
        selectedSoleMemoryId,
        selectedBoardDefId,
        draftPresenceRevision,
        keyNavRevision,
        keyNavRowPatch,
        capabilityNavRevision,
        capabilityNavRowPatch,
        libraryNavRevision,
        libraryNavRowPatch,
        keeperNavRevision,
        keeperNavRowPatch,
        journeyNavRevision,
        dialogNavRevision,
        draftNavRevision,
        draftNavRowPatch,
        agentNavRevision,
        agentNavRowPatch,
        draftDiscussAnchor,
        draftDiscussGlossContent,
        draftDiscussIntent,
        draftComposeHint,
        trainingMode,
        activeTrainingFrame,
        activeCastMember,
        cuedCastMembers,
        chroniclePanelMode,
        chroniclePointTarget,
        chronicleOpenRequestId,
      },
      actions: {
        onSessionSelect,
        onSetActiveJourney,
        onDialogSelect,
        onJourneySelect,
        onPathSelect,
        onMomentSelect,
        onMomentClear,
        onKeeperSelect,
        onDraftSelect,
        onAgentSelect,
        onServiceOpen,
        onKeySelect,
        onCapabilitySelect,
        onLibraryItemSelect,
        onGlossarySelect,
        requestDialogIngest,
        closeDialogIngest,
        onSoleMemorySelect,
        clearSelection,
        onBoardDefSelect,
        bumpDraftPresence,
        bumpKeyNav,
        bumpCapabilityNav,
        bumpLibraryNav,
        bumpKeeperNav,
        bumpJourneyNav,
        bumpDialogNav,
        setDialogTitleSources,
        bumpDraftNav,
        bumpAgentNav,
        requestDiscussDraftPoint,
        requestGloss: requestDiscussDraftPoint,
        requestRewriteDraftPoint,
        clearDraftDiscussAnchor,
        clearDraftComposeHint,
        setDraftComposeHint: setDraftComposeHintAction,
        requestChronicleEngagement,
        closeChronicleEngagement,
        onEnterTrainingMode,
        onExitTrainingMode,
        onTrainingFrameSelect,
        onSetActiveCastMember,
        onToggleCastCue,
        onSetCuedCastMembers,
        openChronicleDocument,
        setChroniclePanelMode,
      },
      navCollapsed,
      onToggleNavCollapsed,
      chronicleEngagement,
      dialogIngest,
      chronicleView,
    }),
    [
      activeSessionId,
      frameCtx?.selection.activeJourneyId,
      onSetActiveJourney,
      selectedDialogId,
      dialogTitleSourceById,
      selectedJourneyId,
      selectedPathId,
      selectedMomentId,
      selectedKeeperId,
      selectedDraftId,
      selectedAgentId,
      selectedServiceSlug,
      selectedKeyId,
      selectedCapabilityId,
      selectedLibraryItemId,
      selectedGlossaryId,
      selectedSoleMemoryId,
      selectedBoardDefId,
      draftPresenceRevision,
      keyNavRevision,
      keyNavRowPatch,
      capabilityNavRevision,
      capabilityNavRowPatch,
      libraryNavRevision,
      libraryNavRowPatch,
      keeperNavRevision,
      keeperNavRowPatch,
      journeyNavRevision,
      dialogNavRevision,
      draftNavRevision,
      draftNavRowPatch,
      agentNavRevision,
      agentNavRowPatch,
      draftDiscussAnchor,
      draftDiscussGlossContent,
      draftDiscussIntent,
      draftComposeHint,
      trainingMode,
      activeTrainingFrame,
      activeCastMember,
      cuedCastMembers,
      chroniclePanelMode,
      chroniclePointTarget,
      chronicleOpenRequestId,
      onSessionSelect,
      onSetActiveJourney,
      onDialogSelect,
      onJourneySelect,
      onPathSelect,
      onMomentSelect,
      onMomentClear,
      onKeeperSelect,
      onDraftSelect,
      onAgentSelect,
      onServiceOpen,
      onKeySelect,
      onCapabilitySelect,
      onLibraryItemSelect,
      onGlossarySelect,
      onSoleMemorySelect,
      clearSelection,
      onBoardDefSelect,
      bumpDraftPresence,
      bumpKeyNav,
      bumpCapabilityNav,
      bumpLibraryNav,
      bumpKeeperNav,
      bumpJourneyNav,
      bumpDialogNav,
      setDialogTitleSources,
      bumpDraftNav,
      bumpAgentNav,
      requestDiscussDraftPoint,
      requestRewriteDraftPoint,
      clearDraftDiscussAnchor,
      clearDraftComposeHint,
      setDraftComposeHintAction,
      requestChronicleEngagement,
      closeChronicleEngagement,
      requestDialogIngest,
      closeDialogIngest,
      onEnterTrainingMode,
      onExitTrainingMode,
      onTrainingFrameSelect,
      onSetActiveCastMember,
      onToggleCastCue,
      onSetCuedCastMembers,
      openChronicleDocument,
      setChroniclePanelMode,
      navCollapsed,
      onToggleNavCollapsed,
      chronicleEngagement,
      dialogIngest,
      chronicleView,
    ],
  )

  return (
    <UniversalBoardCtx.Provider value={value}>
      <GuidedArrivalProvider>{children}</GuidedArrivalProvider>
    </UniversalBoardCtx.Provider>
  )
}
