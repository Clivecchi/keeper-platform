"use client"

/**
 * UniversalNavPanel
 * =================
 * KE3P · Keeper Platform · Moment 2.2 → upgraded Moment 2.4
 *
 * Standard left nav panel used by all Boards that render data records.
 * Replaces four divergent nav implementations (IDEBoardNav, AgentBoardNav,
 * DomainBoard inline JSX, DesignBoardList) with one component driven by Board context.
 *
 * Visual standard: SidebarCard treatment — rounded card chrome, count descriptions,
 * dot-bullet item lists, + affordance. Meets or exceeds IDEBoardNav quality.
 *
 * Nav selection modes:
 * - entity — dialogs, journeys, keepers, drafts, agents, keys, integrations.
 *   onClick → board context action (same frame). No URL change.
 * - boardDef — Design-only meta/spec nav (built-in board definitions).
 *   onClick → shell selectBoardDefinition (?definition=). Reads selection from useBoardDefinitionFromUrl().
 *
 * CRITICAL RULES:
 * - This component NEVER calls /api/domains/by-slug. domainId is resolved
 *   by the Board and passed as a prop.
 * - All selection state is controlled by the Board. This component fires callbacks.
 * - All colors use hsl(var(--theme-*)) CSS variables only. Zero hardcoded hex.
 *
 * Panel structure — one component, one card type (SidebarCard), def-driven sections only.
 */

import * as React from "react"
import { apiFetch } from "../../lib/api"
import { deleteDialog } from "../../lib/kipDialogSession"
import { KipApi, type KipDraftSummary } from "../../lib/kipApi"
import { useAuth } from "../../context/AuthContext"
import { useFrameContextOptional } from "../shell/FrameContext"
import { SidebarCard } from "../components/SidebarCard"
import type { SidebarCardItem } from "../components/SidebarCard"
import type { KeyNavRowPatch, DraftNavRowPatch, AgentNavRowPatch } from "./UniversalBoardContext"
import { useUniversalBoardOptional } from "./UniversalBoardContext"
import type { UniversalBoardDef, NavRenderBlock } from "./UniversalBoardDefinition"
import { shouldRenderContentGatedBlock } from "./navContentGating"
import { useBoardDefs } from "./useBoardDefs"
import { useBoardDefinitionFromUrl } from "./useBoardDefinitionFromUrl"
import { useV0Shell } from "../shell/V0ShellContext"
import type { WorkspaceBoardId } from "./workspaceBoardNav"
import { resolveWorkspaceBoardNavItems } from "./domainWorkspaceBoards"
import {
  collapseKeyNavRows,
  fetchAllDomainKeyRows,
  IDE_AI_PROVIDERS,
  keyChronicleTitle,
  keyStatusNavHint,
  type KeyNavRow,
} from "../presence/integrationChronicle/keyNavUtils"
import { DomainAiAccessNav } from "./domain/DomainAiAccessNav"
import { DomainExternalAccessNav } from "./domain/DomainExternalAccessNav"
import {
  applyCapabilityNavRowPatch,
  capabilityChronicleTitle,
  CAPABILITY_KIND_LABELS,
  fetchAllCapabilityRows,
  groupCapabilitiesByKind,
  type CapabilityKind,
  type CapabilityNavRow,
  type CapabilityNavRowPatch,
} from "../presence/integrationChronicle/capabilityNavUtils"
import {
  applyLibraryNavRowPatch,
  fetchDomainLibraryNavRows,
  libraryItemChronicleTitle,
  type LibraryNavRow,
  type LibraryNavRowPatch,
} from "../presence/integrationChronicle/libraryNavUtils"
import {
  applyKeeperNavRowPatch,
  keeperChronicleTitle,
  type KeeperNavRowPatch,
} from "../presence/integrationChronicle/keeperNavUtils"
import { applyAgentNavRowPatch } from "../presence/integrationChronicle/agentNavUtils"
import { addLibraryUploadFromFile, createLibraryItem } from "../presence/integrationChronicle/libraryNavCreate"
import { RealmStagedNav } from "../realm/RealmStagedNav"
import { resolveDomainTreatment } from "../treatment/resolveDomainTreatment"
import { TreatmentAccentShell } from "../treatment/TreatmentAccentShell"
import {
  countDraftNavTitles,
  draftNavLabel,
  filterVisibleDraftNavRows,
  groupDraftsByKind,
} from "../presence/integrationChronicle/draftNavUtils"
import { formatDraftKindLabel } from "../presence/integrationChronicle/draftManuscriptUtils"
import {
  fetchBoardNavSlice,
  getCachedBoardNavData,
  loadAgents,
  loadDialogs,
  loadDrafts,
  loadJourneys,
  loadKeepers,
  removeCachedBoardNavRow,
} from "./boardNavDataCache"
import { OBJECT_GLOSSARY_SUBJECT_ID } from "@keeper/shared"
import { CrossNavIndex, type CrossNavIndexItem } from "./CrossNavIndex"

// ─── Props ────────────────────────────────────────────────────────────────────

export interface UniversalNavPanelProps {
  // Identity — resolved by the Board, never by this component
  domainId: string | null
  domainSlug: string
  domainName: string

  // Board definition — drives filtering and instrument section
  def: UniversalBoardDef

  // Selection state — controlled by the Board
  selectedDialogId?: string | null
  selectedJourneyId?: string | null
  selectedPathId?: string | null
  selectedKeeperId?: string | null
  selectedDraftId?: string | null
  selectedAgentId?: string | null
  selectedServiceSlug?: string | null
  selectedKeyId?: string | null
  selectedCapabilityId?: string | null
  selectedLibraryItemId?: string | null
  selectedGlossaryId?: string | null
  selectedMomentId?: string | null

  // Selection callbacks — fired by this component, handled by the Board
  onDialogSelect?: (id: string) => void
  onJourneySelect?: (id: string) => void
  onKeeperSelect?: (id: string) => void
  onDraftSelect?: (id: string) => void
  onAgentSelect?: (id: string) => void
  onServiceOpen?: (slug: string) => void
  onKeySelect?: (id: string) => void
  onCapabilitySelect?: (id: string) => void
  onLibraryItemSelect?: (id: string) => void
  onGlossarySelect?: () => void
  onMomentSelect?: (id: string) => void

  // Collapse state — controlled by the Board
  collapsed?: boolean
  onToggleCollapsed?: () => void

  // Version counters — increment to trigger re-fetch of that section
  dialogListVersion?: number
  journeyListVersion?: number
  keeperListVersion?: number
  draftListVersion?: number
  draftNavRowPatch?: DraftNavRowPatch | null
  keyListVersion?: number
  keyNavRowPatch?: KeyNavRowPatch | null
  capabilityListVersion?: number
  capabilityNavRowPatch?: CapabilityNavRowPatch | null
  libraryListVersion?: number
  libraryNavRowPatch?: LibraryNavRowPatch | null
  keeperNavRowPatch?: KeeperNavRowPatch | null
  agentListVersion?: number
  agentNavRowPatch?: AgentNavRowPatch | null
}

// ─── Internal Types ──────────────────────────────────────────────────────────

type DialogItem = {
  id: string
  title: string
  title_source?: string | null
  updated_at: string
  session_count: number
  context: { board?: string; frame?: string; subject?: string }
  available_to: string[]
  forward_title?: string | null
  forwardTitle?: string | null
  step_title?: string | null
  drafts?: Array<{ id: string; title?: string | null }>
}

function isChatterDialog(dialog: DialogItem): boolean {
  // Prefer schema title_source; fall back to auto-title heuristic for pre-migration rows.
  if (dialog.title_source === "auto_generated") return true
  if (dialog.title_source === "user_set" || dialog.title_source === "system_promoted") {
    return false
  }
  const title = dialog.title?.trim() ?? ""
  return /^[A-Za-z][\w\s]* · .+ · (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}$/.test(
    title,
  )
}

/** Prefer authored titles; blank shells are not labeled "Untitled" until they have activity. */
function resolveDialogNavTitle(dialog: DialogItem): string {
  return (
    dialog.title?.trim()
    || dialog.forward_title?.trim()
    || dialog.forwardTitle?.trim()
    || dialog.step_title?.trim()
    || ""
  )
}

function isNavVisibleDialog(dialog: DialogItem): boolean {
  if (resolveDialogNavTitle(dialog)) return true
  // Keep untitled Dialogs that already have sessions; drop empty untitled shells.
  return (dialog.session_count ?? 0) > 0
}

type JourneyItem = {
  id: string
  name: string
  momentCount?: number
  keeperId?: string
  updatedAt: string
}

type KeeperItem = {
  id: string
  title: string
  display_label?: string | null
  domainId?: string
}

type AgentItem = {
  id: string
  name: string
  model: string | null
  model_provider: string | null
  status: string | null
}

type ConnectionNavItem = {
  id: string
  label: string
  description?: string
}

type SectionKey = "dialogs" | "journeys" | "keepers" | "drafts" | "agents" | "chatter"

const DEFAULT_NAV_BLOCK_ORDER: NavRenderBlock[] = [
  "dialogs",
  "journeys",
  "keepers",
  "drafts",
  "integrations",
  "keys",
  "aiAccess",
  "externalAccess",
  "capabilities",
  "library",
  "glossary",
  "chatter",
  "connections",
  "agents",
  "boardDefs",
  "boards",
]

function resolveSidebarWorkspaceBoardNavItems(
  domainSlug: string,
  currentBoardId: WorkspaceBoardId,
): { id: WorkspaceBoardId; label: string }[] {
  return resolveWorkspaceBoardNavItems(domainSlug, currentBoardId)
}

function isNavSectionEnabled(def: UniversalBoardDef, block: NavRenderBlock): boolean {
  if (block === "library") return def.nav.sections.library === true
  if (block === "glossary") return def.nav.sections.glossary === true
  if (block === "drafts") return def.nav.sections.drafts === true
  if (block === "dialogs") return def.nav.sections.dialogs === true
  if (block === "journeys") return def.nav.sections.journeys === true
  if (block === "keepers") return def.nav.sections.keepers === true
  if (block === "agents") return def.nav.sections.agents === true
  if (block === "boardDefs") return def.nav.sections.boardDefs === true
  return true
}

function resolveNavBlockOrder(def: UniversalBoardDef): NavRenderBlock[] {
  if (def.nav.navBlockOrder?.length) {
    const ordered = def.nav.navBlockOrder
    const remainder = DEFAULT_NAV_BLOCK_ORDER.filter((block) => {
      if (ordered.includes(block)) return false
      if (!isNavSectionEnabled(def, block)) return false
      return true
    })
    return [...ordered, ...remainder]
  }
  if (def.nav.primarySection) {
    return [
      def.nav.primarySection,
      ...DEFAULT_NAV_BLOCK_ORDER.filter((block) => block !== def.nav.primarySection),
    ]
  }
  return DEFAULT_NAV_BLOCK_ORDER
}

/** Nav sections with more than this many items default collapsed when collapsible. */
const NAV_COLLAPSE_ITEM_THRESHOLD = 4

// Items shown before expand (onTitleClick toggles full list)
const PREVIEW_LIMIT: Record<SectionKey, number> = {
  dialogs: 3,
  journeys: 4,
  keepers: 4,
  drafts: 5,
  agents: 5,
  chatter: 3,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function countLabel(n: number | null, singular: string): string {
  if (n === null) return "Loading…"
  return `${n} ${n === 1 ? singular : `${singular}s`}`
}

// ─── SVG Primitives ──────────────────────────────────────────────────────────

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M4 2L8 6L4 10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronLeftIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M8 2L4 6L8 10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UniversalNavPanel({
  domainId,
  domainSlug,
  domainName,
  def,
  selectedDialogId,
  selectedJourneyId,
  selectedPathId,
  selectedKeeperId,
  selectedDraftId,
  selectedAgentId,
  selectedServiceSlug,
  selectedKeyId,
  selectedCapabilityId,
  selectedLibraryItemId,
  selectedGlossaryId,
  selectedMomentId,
  onDialogSelect,
  onJourneySelect,
  onKeeperSelect,
  onDraftSelect,
  onAgentSelect,
  onServiceOpen,
  onKeySelect,
  onCapabilitySelect,
  onLibraryItemSelect,
  onGlossarySelect,
  onMomentSelect,
  collapsed = false,
  onToggleCollapsed,
  dialogListVersion = 0,
  journeyListVersion = 0,
  keeperListVersion = 0,
  draftListVersion = 0,
  draftNavRowPatch = null,
  keyListVersion = 0,
  keyNavRowPatch = null,
  capabilityListVersion = 0,
  capabilityNavRowPatch = null,
  libraryListVersion = 0,
  libraryNavRowPatch = null,
  keeperNavRowPatch = null,
  agentListVersion = 0,
  agentNavRowPatch = null,
}: UniversalNavPanelProps) {
  const { domainFrame } = useV0Shell()
  const realmTreatment = React.useMemo(
    () => resolveDomainTreatment(domainFrame ?? null),
    [domainFrame],
  )
  const navStages = def.nav.navStages

  const { user } = useAuth()
  const frameCtx = useFrameContextOptional()
  const boardCtx = useUniversalBoardOptional()

  const handleJourneyCreate = React.useCallback(() => {
    if (!domainId || !user || !boardCtx) return
    const keeperId =
      boardCtx.selection.selectedKeeperId ??
      frameCtx?.selection.activeKeeperId ??
      undefined
    void boardCtx.actions.requestChronicleEngagement("journey.create", {
      entityType: "domain",
      entityId: domainId,
      domainId,
      keeperId,
    })
  }, [
    boardCtx,
    domainId,
    frameCtx?.selection.activeKeeperId,
    user,
  ])

  const handleDraftCreate = React.useCallback(() => {
    if (!domainId || !user || !boardCtx) return
    const keeperId =
      boardCtx.selection.selectedKeeperId ??
      frameCtx?.selection.activeKeeperId ??
      undefined
    const dialogId = boardCtx.selection.selectedDialogId ?? undefined
    void boardCtx.actions.requestChronicleEngagement("draft.create", {
      entityType: "domain",
      entityId: domainId,
      domainId,
      keeperId,
      dialogId,
      kind: "journey_spec",
    })
  }, [
    boardCtx,
    domainId,
    frameCtx?.selection.activeKeeperId,
    user,
  ])

  const handleKeeperCreate = React.useCallback(() => {
    if (!domainId || !user || !boardCtx) return
    void boardCtx.actions.requestChronicleEngagement("keeper.create", {
      entityType: "domain",
      entityId: domainId,
      domainId,
    })
  }, [boardCtx, domainId, user])

  const handleDialogCreate = React.useCallback(() => {
    if (!domainId || !user || !boardCtx) return
    void boardCtx.actions.requestChronicleEngagement("dialog.create", {
      entityType: "domain",
      entityId: domainId,
      domainId,
    })
  }, [boardCtx, domainId, user])

  const handleAgentCreate = React.useCallback(() => {
    if (!domainId || !user || !boardCtx) return
    void boardCtx.actions.requestChronicleEngagement("agent.create", {
      entityType: "domain",
      entityId: domainId,
      domainId,
      model: "claude-sonnet-4-6",
      model_provider: "anthropic",
      role: "Lead",
    })
  }, [boardCtx, domainId, user])

  // ── designer board definitions — live from location.search ─────────────────
  const { selectBoardDefinition, switchWorkspace, workspaceBoardId, shellMode: contextShellMode, openDomainWorkspace: contextOpenDomainWorkspace, anchorDomainSlug } = useV0Shell()
  const boardDefinitionId = useBoardDefinitionFromUrl()
  const allBoardDefs = useBoardDefs()

  // ── Section data ────────────────────────────────────────────────────────────
  const [dialogs, setDialogs] = React.useState<DialogItem[] | null>(null)
  /** Inline confirm target for hard-delete (Draft-style; Nav list only). */
  const [confirmingDeleteDialogId, setConfirmingDeleteDialogId] = React.useState<string | null>(null)
  const [confirmingDeleteDraftId, setConfirmingDeleteDraftId] = React.useState<string | null>(null)
  const [confirmingDeleteJourneyId, setConfirmingDeleteJourneyId] = React.useState<string | null>(null)
  const [confirmingDeleteLibraryId, setConfirmingDeleteLibraryId] = React.useState<string | null>(null)

  const handleDialogIngest = React.useCallback(() => {
    if (!domainId || !user || !boardCtx) return
    const selectedId = boardCtx.selection.selectedDialogId
    const selectedTitle = selectedId
      ? dialogs?.find((row) => row.id === selectedId)?.title ?? null
      : null
    boardCtx.actions.requestDialogIngest({
      dialogId: selectedId,
      dialogTitle: selectedTitle,
    })
  }, [boardCtx, dialogs, domainId, user])

  React.useEffect(() => {
    setConfirmingDeleteDialogId(null)
    setConfirmingDeleteDraftId(null)
    setConfirmingDeleteJourneyId(null)
    setConfirmingDeleteLibraryId(null)
  }, [domainId])
  const [journeys, setJourneys] = React.useState<JourneyItem[] | null>(null)
  const [keepers, setKeepers] = React.useState<KeeperItem[] | null>(null)
  const [drafts, setDrafts] = React.useState<KipDraftSummary[] | null>(null)
  const [agents, setAgents] = React.useState<AgentItem[] | null>(null)
  const [allKeyRows, setAllKeyRows] = React.useState<KeyNavRow[] | null>(null)
  const [keyError, setKeyError] = React.useState<string | null>(null)
  const [allCapabilityRows, setAllCapabilityRows] = React.useState<CapabilityNavRow[] | null>(null)
  const [capabilityError, setCapabilityError] = React.useState<string | null>(null)
  const [allLibraryRows, setAllLibraryRows] = React.useState<LibraryNavRow[] | null>(null)
  const [libraryError, setLibraryError] = React.useState<string | null>(null)
  const [libraryCreating, setLibraryCreating] = React.useState(false)
  const libraryFileInputRef = React.useRef<HTMLInputElement>(null)

  const handleConfirmDeleteDialog = React.useCallback(
    async (dialogId: string) => {
      if (!domainId) throw new Error("Domain not ready")
      await deleteDialog(domainId, dialogId)
      setDialogs((prev) => (prev ? prev.filter((d) => d.id !== dialogId) : prev))
      removeCachedBoardNavRow(domainId, "dialogs", dialogId)
      setConfirmingDeleteDialogId(null)
      if (selectedDialogId === dialogId) {
        boardCtx?.actions.clearSelection()
        boardCtx?.actions.onSessionSelect(null)
      }
    },
    [domainId, selectedDialogId, boardCtx],
  )

  const handleConfirmDeleteDraft = React.useCallback(
    async (draftId: string) => {
      if (!domainId) throw new Error("Domain not ready")
      await KipApi.deleteDraft(domainId, draftId)
      setDrafts((prev) => (prev ? prev.filter((d) => d.id !== draftId) : prev))
      removeCachedBoardNavRow(domainId, "drafts", draftId)
      setConfirmingDeleteDraftId(null)
      if (selectedDraftId === draftId) {
        boardCtx?.actions.clearSelection()
      }
    },
    [domainId, selectedDraftId, boardCtx],
  )

  const handleConfirmDeleteJourney = React.useCallback(
    async (journeyId: string) => {
      await KipApi.deleteJourney(journeyId)
      setJourneys((prev) => (prev ? prev.filter((j) => j.id !== journeyId) : prev))
      if (domainId) removeCachedBoardNavRow(domainId, "journeys", journeyId)
      setConfirmingDeleteJourneyId(null)
      if (selectedJourneyId === journeyId) {
        boardCtx?.actions.clearSelection()
      }
    },
    [domainId, selectedJourneyId, boardCtx],
  )

  const handleConfirmDeleteLibraryItem = React.useCallback(
    async (itemId: string) => {
      await KipApi.deleteLibraryItem(itemId)
      setAllLibraryRows((prev) => (prev ? prev.filter((row) => row.id !== itemId) : prev))
      if (domainId) removeCachedBoardNavRow(domainId, "library", itemId)
      setConfirmingDeleteLibraryId(null)
      if (selectedLibraryItemId === itemId) {
        boardCtx?.actions.clearSelection()
      }
    },
    [domainId, selectedLibraryItemId, boardCtx],
  )

  const [connectionItems, setConnectionItems] = React.useState<ConnectionNavItem[] | null>(null)
  const [connectionError, setConnectionError] = React.useState<string | null>(null)

  const showConnectionsNav = def.nav.navBlockOrder?.includes("connections") ?? false

  const dialogVersionRef = React.useRef(dialogListVersion ?? 0)
  const journeyVersionRef = React.useRef(journeyListVersion)
  const keeperVersionRef = React.useRef(keeperListVersion)
  const draftVersionRef = React.useRef(draftListVersion)
  const agentVersionRef = React.useRef(agentListVersion)

  const keys = React.useMemo(
    () => (allKeyRows ? collapseKeyNavRows(allKeyRows, selectedKeyId) : null),
    [allKeyRows, selectedKeyId],
  )

  const applyKeyNavRowPatch = React.useCallback(
    (rows: KeyNavRow[]): KeyNavRow[] => {
      if (!keyNavRowPatch) return rows
      return rows.map((row) =>
        row.id === keyNavRowPatch.keyId
          ? {
              ...row,
              ...(keyNavRowPatch.display_label !== undefined
                ? { display_label: keyNavRowPatch.display_label }
                : {}),
            }
          : row,
      )
    },
    [keyNavRowPatch],
  )

  const capabilitiesByKind = React.useMemo(
    () => (allCapabilityRows ? groupCapabilitiesByKind(allCapabilityRows) : null),
    [allCapabilityRows],
  )

  const applyCapabilityNavPatch = React.useCallback(
    (rows: CapabilityNavRow[]) => applyCapabilityNavRowPatch(rows, capabilityNavRowPatch),
    [capabilityNavRowPatch],
  )

  const applyLibraryNavPatch = React.useCallback(
    (rows: LibraryNavRow[]) => applyLibraryNavRowPatch(rows, libraryNavRowPatch),
    [libraryNavRowPatch],
  )

  const patchedKeepers = React.useMemo(
    () =>
      keepers
        ? applyKeeperNavRowPatch(
            keepers.map((k) => ({
              id: k.id,
              display_label: k.display_label ?? null,
              title: k.title,
            })),
            keeperNavRowPatch,
          )
        : null,
    [keepers, keeperNavRowPatch],
  )

  const resolveEngagementKeeperId = React.useCallback(
    (journeyKeeperId?: string) =>
      journeyKeeperId ??
      boardCtx?.selection.selectedKeeperId ??
      frameCtx?.selection.activeKeeperId ??
      keepers?.[0]?.id ??
      undefined,
    [
      boardCtx?.selection.selectedKeeperId,
      frameCtx?.selection.activeKeeperId,
      keepers,
    ],
  )

  const handlePathCreate = React.useCallback(() => {
    if (!domainId || !user || !boardCtx || !selectedJourneyId) return
    const journey = journeys?.find((item) => item.id === selectedJourneyId)
    void boardCtx.actions.requestChronicleEngagement("path.create", {
      entityType: "journey",
      entityId: selectedJourneyId,
      domainId,
      journeyId: selectedJourneyId,
      keeperId: resolveEngagementKeeperId(journey?.keeperId),
    })
  }, [
    boardCtx,
    domainId,
    journeys,
    resolveEngagementKeeperId,
    selectedJourneyId,
    user,
  ])

  const handleMomentCreate = React.useCallback(() => {
    if (!domainId || !user || !boardCtx || !selectedJourneyId) return
    const journey = journeys?.find((item) => item.id === selectedJourneyId)
    void boardCtx.actions.requestChronicleEngagement("moment.create", {
      entityType: "journey",
      entityId: selectedJourneyId,
      domainId,
      journeyId: selectedJourneyId,
      pathId: selectedPathId ?? undefined,
      keeperId: resolveEngagementKeeperId(journey?.keeperId),
    })
  }, [
    boardCtx,
    domainId,
    journeys,
    resolveEngagementKeeperId,
    selectedJourneyId,
    selectedPathId,
    user,
  ])

  // ── Per-section error states ─────────────────────────────────────────────
  const [dialogError, setDialogError] = React.useState<string | null>(null)
  const [journeyError, setJourneyError] = React.useState<string | null>(null)
  const [keeperError, setKeeperError] = React.useState<string | null>(null)
  const [draftError, setDraftError] = React.useState<string | null>(null)
  const [agentError, setAgentError] = React.useState<string | null>(null)

  // ── Section expand state ─────────────────────────────────────────────────
  const [expanded, setExpanded] = React.useState<Set<SectionKey>>(new Set())
  const [crossNavOpen, setCrossNavOpen] = React.useState(false)

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setCrossNavOpen(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const handleCrossNavSelect = React.useCallback(
    (item: CrossNavIndexItem) => {
      if (item.kind === "dialog") onDialogSelect?.(item.id)
      else if (item.kind === "draft") onDraftSelect?.(item.id)
      else if (item.kind === "keeper") onKeeperSelect?.(item.id)
      else if (item.kind === "library") onLibraryItemSelect?.(item.id)
    },
    [onDialogSelect, onDraftSelect, onKeeperSelect, onLibraryItemSelect],
  )

  const toggleExpanded = React.useCallback((section: SectionKey) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }, [])

  // Slice to preview limit unless section is expanded
  const slice = React.useCallback(
    <T,>(section: SectionKey, items: T[]): T[] =>
      expanded.has(section) ? items : items.slice(0, PREVIEW_LIMIT[section]),
    [expanded],
  )

  // ── Fetch: Dialogs ───────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!domainId || !def.nav.sections.dialogs) return
    let cancelled = false
    const cached = getCachedBoardNavData<DialogItem[]>(domainId, "dialogs")
    if (cached) setDialogs(cached)
    else setDialogs(null)
    setDialogError(null)
    const dialogVersion = dialogListVersion ?? 0
    const forceRefresh = dialogVersion > dialogVersionRef.current
    dialogVersionRef.current = dialogVersion
    void fetchBoardNavSlice(
      domainId,
      "dialogs",
      () => loadDialogs(domainId) as Promise<DialogItem[]>,
      { forceRefresh },
    )
      .then((list) => {
        if (!cancelled) setDialogs(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDialogError(err instanceof Error ? err.message : "Failed to load dialogs")
          if (!cached) setDialogs([])
        }
      })
    return () => { cancelled = true }
  }, [domainId, def.nav.sections.dialogs, dialogListVersion])

  // ── Fetch: Journeys ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!domainId || !def.nav.sections.journeys) return
    let cancelled = false
    const cached = getCachedBoardNavData<JourneyItem[]>(domainId, "journeys")
    if (cached) setJourneys(cached)
    else setJourneys(null)
    setJourneyError(null)
    const forceRefresh = journeyListVersion > journeyVersionRef.current
    journeyVersionRef.current = journeyListVersion
    void fetchBoardNavSlice(
      domainId,
      "journeys",
      () => loadJourneys(domainId) as Promise<JourneyItem[]>,
      { forceRefresh },
    )
      .then((list) => {
        if (!cancelled) setJourneys(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setJourneyError(err instanceof Error ? err.message : "Failed to load journeys")
          if (!cached) setJourneys([])
        }
      })
    return () => { cancelled = true }
  }, [domainId, def.nav.sections.journeys, journeyListVersion])

  // ── Fetch: Keepers ───────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!domainId || !def.nav.sections.keepers) return
    let cancelled = false
    const cached = getCachedBoardNavData<KeeperItem[]>(domainId, "keepers")
    if (cached) setKeepers(cached)
    else setKeepers(null)
    setKeeperError(null)
    const forceRefresh = keeperListVersion > keeperVersionRef.current
    keeperVersionRef.current = keeperListVersion
    void fetchBoardNavSlice(
      domainId,
      "keepers",
      () => loadKeepers(domainId) as Promise<KeeperItem[]>,
      { forceRefresh },
    )
      .then((list) => {
        if (!cancelled) setKeepers(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setKeeperError(err instanceof Error ? err.message : "Failed to load keepers")
          if (!cached) setKeepers([])
        }
      })
    return () => { cancelled = true }
  }, [domainId, def.nav.sections.keepers, keeperListVersion])

  const showDrafts = def.nav.sections.drafts

  // ── Fetch: Drafts — for top-level Drafts nav and nesting under Dialogs ──────
  const loadDraftsForNav =
    Boolean(def.nav.sections.drafts) || Boolean(def.nav.sections.dialogs)
  React.useEffect(() => {
    if (!domainId || !loadDraftsForNav) return
    let cancelled = false
    const cached = getCachedBoardNavData<KipDraftSummary[]>(domainId, "drafts")
    if (cached) setDrafts(cached)
    else setDrafts(null)
    setDraftError(null)
    const forceRefresh = draftListVersion > draftVersionRef.current
    draftVersionRef.current = draftListVersion
    void fetchBoardNavSlice(
      domainId,
      "drafts",
      () => loadDrafts(domainId),
      { forceRefresh },
    )
      .then((list) => {
        if (!cancelled) setDrafts(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDraftError(err instanceof Error ? err.message : "Failed to load drafts")
          if (!cached) setDrafts([])
        }
      })
    return () => { cancelled = true }
  }, [domainId, loadDraftsForNav, draftListVersion])

  const patchedDrafts = React.useMemo(() => {
    if (!drafts || !draftNavRowPatch) return drafts
    return drafts.map((draft) =>
      draft.id === draftNavRowPatch.draftId
        ? {
            ...draft,
            ...(draftNavRowPatch.title ? { title: draftNavRowPatch.title } : {}),
          }
        : draft,
    )
  }, [drafts, draftNavRowPatch])

  const visibleDrafts = React.useMemo(
    () => filterVisibleDraftNavRows(patchedDrafts ?? []),
    [patchedDrafts],
  )

  // Top-level Drafts bucket only lists orphans — drafts with dialog_id nest under Dialogs.
  const orphanDraftsForNav = React.useMemo(
    () => visibleDrafts.filter((d) => !d.dialog_id?.trim()),
    [visibleDrafts],
  )

  const draftNavGroups = React.useMemo(
    () => groupDraftsByKind(orphanDraftsForNav, selectedDraftId),
    [orphanDraftsForNav, selectedDraftId],
  )

  const draftNavTitleCounts = React.useMemo(
    () => countDraftNavTitles(orphanDraftsForNav),
    [orphanDraftsForNav],
  )

  const buildDraftNavItems = React.useCallback(
    (groupDrafts: KipDraftSummary[]): SidebarCardItem[] =>
      groupDrafts.map((draft) => ({
        id: draft.id,
        label: draftNavLabel(draft, draftNavTitleCounts),
        isSelected: draft.id === selectedDraftId,
        onClick: () => onDraftSelect?.(draft.id),
        onRequestDelete: () => setConfirmingDeleteDraftId(draft.id),
        deleteConfirming: confirmingDeleteDraftId === draft.id,
        onConfirmDelete: () => handleConfirmDeleteDraft(draft.id),
        onCancelDelete: () => setConfirmingDeleteDraftId(null),
        deleteConfirmLabel: `Delete draft "${draft.title?.trim() || "Untitled draft"}"?`,
      })),
    [
      draftNavTitleCounts,
      selectedDraftId,
      onDraftSelect,
      confirmingDeleteDraftId,
      handleConfirmDeleteDraft,
    ],
  )

  // ── Fetch: Agents — domain-accessible roster (lead + Kip + Cloud + Rendr) ──
  React.useEffect(() => {
    if (!domainId) return
    if (!def.nav.sections.agents) return
    let cancelled = false
    const cached = getCachedBoardNavData<AgentItem[]>(domainId, "agents")
    if (cached) setAgents(cached)
    else setAgents(null)
    setAgentError(null)
    const forceRefresh = agentListVersion > agentVersionRef.current
    agentVersionRef.current = agentListVersion
    void fetchBoardNavSlice(
      domainId,
      "agents",
      () => loadAgents(domainId) as Promise<AgentItem[]>,
      { forceRefresh },
    )
      .then((list) => {
        if (!cancelled) setAgents(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setAgentError(err instanceof Error ? err.message : "Failed to load agents")
          if (!cached) setAgents([])
        }
      })
    return () => { cancelled = true }
  }, [domainId, def.nav.sections.agents, agentListVersion])

  // ── Fetch: Connections — Realm Board only ─────────────────────────────────
  React.useEffect(() => {
    if (!domainId || !showConnectionsNav) return
    let cancelled = false
    setConnectionItems(null)
    setConnectionError(null)
    apiFetch(`/api/domains/${encodeURIComponent(domainId)}/connections`)
      .then((res: unknown) => {
        if (cancelled) return
        const payload = res as {
          connections?: Array<{ userId: string; name: string; role: string }>
          pendingInvitations?: Array<{ id: string; email: string; role: string }>
        }
        const active = (payload.connections ?? []).map((entry) => ({
          id: entry.userId,
          label: entry.name?.trim() || entry.userId,
          description: entry.role,
        }))
        const pending = (payload.pendingInvitations ?? []).map((entry) => ({
          id: entry.id,
          label: entry.email?.trim() || entry.id,
          description: `Pending · ${entry.role}`,
        }))
        setConnectionItems([...active, ...pending])
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setConnectionError(err instanceof Error ? err.message : "Failed to load connections")
          setConnectionItems([])
        }
      })
    return () => { cancelled = true }
  }, [domainId, showConnectionsNav, dialogListVersion])

  const showKeysNav = (def.nav.integrations ?? []).some((item) => item.group === "ai")
  const showAiAccessNav = def.nav.aiAccessSummary === true
  const showExternalAccessNav = def.nav.externalAccessSummary === true
  const keysDomainRef = React.useRef<string | null>(null)

  const handleAddDomainKey = React.useCallback(async () => {
    if (!domainId || !onKeySelect) return
    for (const provider of IDE_AI_PROVIDERS) {
      try {
        await apiFetch(
          `/api/keys?domainId=${encodeURIComponent(domainId)}&provider=${encodeURIComponent(provider)}&sync=1`,
        )
        const rows = await fetchAllDomainKeyRows(domainId)
        const row = collapseKeyNavRows(rows).find((entry) => entry.provider === provider)
        if (row) {
          onKeySelect(row.id)
          return
        }
      } catch {
        // try next provider
      }
    }
  }, [domainId, onKeySelect])

  // ── Fetch: Keys — IDE Board Layer 3 only ─────────────────────────────────
  React.useEffect(() => {
    if (!domainId || !showKeysNav) return
    let cancelled = false
    if (keysDomainRef.current !== domainId) {
      keysDomainRef.current = domainId
      setAllKeyRows(null)
    }
    setKeyError(null)
    void fetchAllDomainKeyRows(domainId)
      .then((rows) => {
        if (!cancelled) setAllKeyRows(applyKeyNavRowPatch(rows))
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setKeyError(err instanceof Error ? err.message : "Failed to load keys")
          setAllKeyRows([])
        }
      })
    return () => { cancelled = true }
  }, [domainId, showKeysNav, keyListVersion, applyKeyNavRowPatch])

  const showCapabilitiesNav =
    def.boardId === "ide" && (def.nav.sections.capabilities ?? false)

  React.useEffect(() => {
    if (!showCapabilitiesNav) return
    let cancelled = false
    setCapabilityError(null)
    void fetchAllCapabilityRows()
      .then((rows) => {
        if (!cancelled) setAllCapabilityRows(applyCapabilityNavPatch(rows))
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setCapabilityError(err instanceof Error ? err.message : "Failed to load capabilities")
          setAllCapabilityRows([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [showCapabilitiesNav, capabilityListVersion, applyCapabilityNavPatch])

  React.useEffect(() => {
    if (!capabilityNavRowPatch) return
    setAllCapabilityRows((prev) => (prev ? applyCapabilityNavPatch(prev) : prev))
  }, [capabilityListVersion, capabilityNavRowPatch, applyCapabilityNavPatch])

  React.useEffect(() => {
    if (!keyNavRowPatch) return
    setAllKeyRows((prev) => (prev ? applyKeyNavRowPatch(prev) : prev))
  }, [keyListVersion, keyNavRowPatch, applyKeyNavRowPatch])

  const showLibraryNav = def.nav.sections.library ?? false

  React.useEffect(() => {
    if (!domainId || !showLibraryNav) return
    let cancelled = false
    setLibraryError(null)
    void fetchDomainLibraryNavRows(domainId)
      .then((rows) => {
        if (!cancelled) setAllLibraryRows(applyLibraryNavPatch(rows))
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLibraryError(err instanceof Error ? err.message : "Failed to load library")
          setAllLibraryRows([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [domainId, showLibraryNav, libraryListVersion, applyLibraryNavPatch])

  React.useEffect(() => {
    if (!libraryNavRowPatch) return
    setAllLibraryRows((prev) => (prev ? applyLibraryNavPatch(prev) : prev))
  }, [libraryListVersion, libraryNavRowPatch, applyLibraryNavPatch])

  const activeKeeperIdForLibrary =
    selectedKeeperId ?? frameCtx?.selection.activeKeeperId ?? null
  const activeAgentIdForLibrary = selectedAgentId ?? null

  const handleLibraryUploadClick = React.useCallback(() => {
    libraryFileInputRef.current?.click()
  }, [])

  const handleLibraryFileChange = React.useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ""
      if (!file || !domainId || !user?.id) {
        if (!user?.id) alert("Sign in to upload library files.")
        return
      }

      setLibraryCreating(true)
      try {
        const created = await addLibraryUploadFromFile({
          domainId,
          userId: user.id,
          file,
          activeKeeperId: activeKeeperIdForLibrary,
          activeAgentId: activeAgentIdForLibrary,
        })
        onLibraryItemSelect?.(created.id)
        boardCtx?.actions.bumpLibraryNav()
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to add upload to library")
      } finally {
        setLibraryCreating(false)
      }
    },
    [
      domainId,
      user?.id,
      activeKeeperIdForLibrary,
      activeAgentIdForLibrary,
      onLibraryItemSelect,
      boardCtx?.actions,
    ],
  )

  const handleLibraryAddUrl = React.useCallback(async () => {
    if (!domainId || !user?.id) {
      alert("Sign in to add library links.")
      return
    }
    const url = window.prompt("Paste a URL to add to the library:")
    if (!url?.trim()) return
    try {
      new URL(url.trim())
    } catch {
      alert("Enter a valid URL (including https://).")
      return
    }

    setLibraryCreating(true)
    try {
      const created = await createLibraryItem({
        domainId,
        userId: user.id,
        sourceType: "url",
        sourceRef: url.trim(),
        activeKeeperId: activeKeeperIdForLibrary,
        activeAgentId: activeAgentIdForLibrary,
      })
      onLibraryItemSelect?.(created.id)
      boardCtx?.actions.bumpLibraryNav()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add URL to library")
    } finally {
      setLibraryCreating(false)
    }
  }, [
    domainId,
    user?.id,
    activeKeeperIdForLibrary,
    activeAgentIdForLibrary,
    onLibraryItemSelect,
    boardCtx?.actions,
  ])

  // ── Derived SidebarCardItem arrays ───────────────────────────────────────

  const toDialogNavItem = React.useCallback(
    (d: DialogItem): SidebarCardItem => {
      const title = resolveDialogNavTitle(d) || "Untitled dialog"
      return {
        id: d.id,
        label: d.updated_at ? `${title} · ${formatDate(d.updated_at)}` : title,
        isSelected: d.id === selectedDialogId,
        onClick: () => onDialogSelect?.(d.id),
        onRequestDelete: () => setConfirmingDeleteDialogId(d.id),
        deleteConfirming: confirmingDeleteDialogId === d.id,
        onConfirmDelete: () => handleConfirmDeleteDialog(d.id),
        onCancelDelete: () => setConfirmingDeleteDialogId(null),
        deleteConfirmLabel: `Delete dialog "${title}"?`,
      }
    },
    [
      selectedDialogId,
      onDialogSelect,
      confirmingDeleteDialogId,
      handleConfirmDeleteDialog,
    ],
  )

  // Named / promoted Dialogs only — Chatter (auto_generated) is a separate bucket.
  const namedDialogs = React.useMemo(
    () => (dialogs ?? []).filter(isNavVisibleDialog).filter((d) => !isChatterDialog(d)),
    [dialogs],
  )

  const draftsByDialogId = React.useMemo(() => {
    const map = new Map<string, KipDraftSummary[]>()
    for (const draft of visibleDrafts) {
      const dialogId = draft.dialog_id?.trim()
      if (!dialogId) continue
      const list = map.get(dialogId) ?? []
      list.push(draft)
      map.set(dialogId, list)
    }
    return map
  }, [visibleDrafts])

  // Dialog rows with nested Draft children (flat list; indent via label prefix).
  const allDialogItems: SidebarCardItem[] = React.useMemo(() => {
    const items: SidebarCardItem[] = []
    for (const dialog of namedDialogs) {
      items.push(toDialogNavItem(dialog))
      const nested = draftsByDialogId.get(dialog.id) ?? []
      for (const draft of nested) {
        items.push({
          id: `draft-under-${draft.id}`,
          label: `↳ ${draft.title?.trim() || "Untitled draft"}`,
          description: "draft",
          isSelected: draft.id === selectedDraftId,
          onClick: () => onDraftSelect?.(draft.id),
          onRequestDelete: () => setConfirmingDeleteDraftId(draft.id),
          deleteConfirming: confirmingDeleteDraftId === draft.id,
          onConfirmDelete: () => handleConfirmDeleteDraft(draft.id),
          onCancelDelete: () => setConfirmingDeleteDraftId(null),
          deleteConfirmLabel: `Delete draft "${draft.title?.trim() || "Untitled draft"}"?`,
        })
      }
    }
    return items
  }, [
    namedDialogs,
    draftsByDialogId,
    toDialogNavItem,
    selectedDraftId,
    onDraftSelect,
    confirmingDeleteDraftId,
    handleConfirmDeleteDraft,
  ])

  const chatterDialogs = React.useMemo(
    () => (dialogs ?? []).filter(isNavVisibleDialog).filter(isChatterDialog),
    [dialogs],
  )
  const allChatterItems: SidebarCardItem[] = chatterDialogs.map(toDialogNavItem)

  // Journeys: embed moment count — matches IDE Board's label format
  const allJourneyItems: SidebarCardItem[] = (journeys ?? []).map((j) => {
    const name = j.name?.trim() || "Untitled journey"
    return {
      id: j.id,
      label: `${name}${j.momentCount != null ? ` · ${j.momentCount} moment${j.momentCount === 1 ? "" : "s"}` : ""}`,
      isSelected: j.id === selectedJourneyId,
      onClick: () => onJourneySelect?.(j.id),
      onRequestDelete: () => setConfirmingDeleteJourneyId(j.id),
      deleteConfirming: confirmingDeleteJourneyId === j.id,
      onConfirmDelete: () => handleConfirmDeleteJourney(j.id),
      onCancelDelete: () => setConfirmingDeleteJourneyId(null),
      deleteConfirmLabel: `Delete journey "${name}"?`,
    }
  })

  // Keepers: display_label via keeperChronicleTitle (matches Chronicle cover)
  const allKeeperItems: SidebarCardItem[] = (patchedKeepers ?? []).map((k) => ({
    id: k.id,
    label: keeperChronicleTitle(k),
    isSelected: k.id === selectedKeeperId,
    onClick: () => onKeeperSelect?.(k.id),
  }))

  // Agents: embed model name when available
  const allAgentItems: SidebarCardItem[] = React.useMemo(() => {
    const patched = applyAgentNavRowPatch(agents ?? [], agentNavRowPatch)
    return patched.map((a) => ({
      id: a.id,
      label: a.model
        ? `${a.name?.trim() || "Unnamed agent"} · ${a.model}`
        : (a.name?.trim() || "Unnamed agent"),
      isSelected: a.id === selectedAgentId,
      onClick: () => onAgentSelect?.(a.id),
    }))
  }, [agents, agentNavRowPatch, selectedAgentId, onAgentSelect])

  const showAgents = def.nav.sections.agents
  const showDialogs = def.nav.sections.dialogs
  const showJourneys = def.nav.sections.journeys
  const showKeepers = def.nav.sections.keepers
  const showBoardDefs = def.nav.sections.boardDefs ?? false
  const showGlossaryNav = def.nav.sections.glossary ?? false
  const activeBoardDefId = showBoardDefs ? boardDefinitionId : null

  React.useEffect(() => {
    if (!showBoardDefs) return
    if (!(import.meta as any).env?.DEV) return
    console.log(
      "[UniversalNavPanel]",
      JSON.stringify({
        definition: boardDefinitionId,
        activeBoardDefId,
        windowDefinition:
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("definition")
            : null,
      }),
    )
  }, [showBoardDefs, boardDefinitionId, activeBoardDefId])

  const integrationDefs = def.nav.integrations ?? []
  const infrastructureIntegrations = integrationDefs.filter((item) => item.group !== "ai")
  const aiIntegrations = integrationDefs.filter((item) => item.group === "ai")
  const toIntegrationItem = (item: (typeof integrationDefs)[number]): SidebarCardItem => ({
    id: item.id,
    label: item.label,
    isSelected: selectedServiceSlug === item.id,
    onClick: () => onServiceOpen?.(item.id),
  })
  const infrastructureItems = infrastructureIntegrations.map(toIntegrationItem)
  const aiItems = aiIntegrations.map(toIntegrationItem)
  const integrationItems: SidebarCardItem[] = [...infrastructureItems, ...aiItems]

  const shellMode = contextShellMode ?? "domain"
  const isHomeShell = shellMode === "home"
  const boardNavDomainSlug = isHomeShell ? (anchorDomainSlug ?? domainSlug) : domainSlug

  const boardNavItems: SidebarCardItem[] = resolveSidebarWorkspaceBoardNavItems(
    boardNavDomainSlug,
    def.boardId as WorkspaceBoardId,
  ).map((board) => ({
    id: board.id,
    label: board.label,
    isSelected: workspaceBoardId === board.id,
    onClick: () => {
      if (isHomeShell && contextOpenDomainWorkspace) {
        contextOpenDomainWorkspace(board.id)
      } else {
        switchWorkspace(board.id)
      }
    },
  }))

  const keeperSectionTitle = def.nav.keeperSectionTitle ?? "Keepers"

  const keyItems: SidebarCardItem[] = (keys ?? []).map((key) => ({
    id: key.id,
    label: keyChronicleTitle(key),
    description: keyStatusNavHint(key.status),
    isSelected: key.id === selectedKeyId,
    onClick: () => onKeySelect?.(key.id),
  }))

  const libraryItems: SidebarCardItem[] = React.useMemo(() => {
    const rows = (allLibraryRows ?? []).filter(
      (row) => row.id && row.source_ref?.trim() && libraryItemChronicleTitle(row).trim(),
    )
    const items: SidebarCardItem[] = rows.map((row) => ({
      id: row.id,
      label: libraryItemChronicleTitle(row),
      isSelected: row.id === selectedLibraryItemId,
      onClick: () => onLibraryItemSelect?.(row.id),
      onRequestDelete: () => setConfirmingDeleteLibraryId(row.id),
      deleteConfirming: confirmingDeleteLibraryId === row.id,
      onConfirmDelete: () => handleConfirmDeleteLibraryItem(row.id),
      onCancelDelete: () => setConfirmingDeleteLibraryId(null),
      deleteConfirmLabel: `Delete library item "${libraryItemChronicleTitle(row)}"?`,
    }))
    if (showLibraryNav && !libraryCreating) {
      items.push({
        id: "__library_add_url__",
        label: "Add URL…",
        onClick: () => void handleLibraryAddUrl(),
      })
    }
    return items
  }, [
    allLibraryRows,
    selectedLibraryItemId,
    onLibraryItemSelect,
    showLibraryNav,
    libraryCreating,
    handleLibraryAddUrl,
    confirmingDeleteLibraryId,
    handleConfirmDeleteLibraryItem,
  ])

  // ── designer sections: Board Definitions ─────────────────────────────────

  const selectBoardDef = React.useCallback(
    (boardDefId: string) => {
      boardCtx?.actions.onBoardDefSelect(boardDefId)
      selectBoardDefinition(boardDefId)
    },
    [boardCtx, selectBoardDefinition],
  )

  const boardDefItems = React.useMemo<SidebarCardItem[]>(
    () => {
      if (!showBoardDefs) return []
      return allBoardDefs.map((d) => ({
        id: d.boardId,
        label: d.displayName,
        isSelected: d.boardId === activeBoardDefId,
        onClick: () => selectBoardDef(d.boardId),
      }))
    },
    [showBoardDefs, allBoardDefs, activeBoardDefId, selectBoardDef],
  )

  const navBlockOrder = resolveNavBlockOrder(def)

  const libraryRowCount = (allLibraryRows ?? []).filter(
    (row) => row.id && row.source_ref?.trim(),
  ).length

  const navContentCounts = React.useMemo(
    () => ({
      dialogs: dialogs === null ? null : namedDialogs.length,
      journeys: journeys?.length ?? null,
      keepers: keepers?.length ?? null,
      drafts: patchedDrafts === null ? null : orphanDraftsForNav.length,
      agents: agents?.length ?? null,
      library: allLibraryRows === null ? null : libraryRowCount,
      chatter: dialogs === null ? null : chatterDialogs.length,
      connections: connectionItems === null ? null : connectionItems.length,
    }),
    [
      dialogs,
      namedDialogs.length,
      journeys,
      keepers,
      patchedDrafts,
      orphanDraftsForNav.length,
      agents,
      allLibraryRows,
      libraryRowCount,
      chatterDialogs.length,
      connectionItems,
    ],
  )

  // ── Collapsed state — 36px strip with centered expand chevron ────────────
  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center justify-start pt-3 h-full overflow-hidden"
        style={{
          width: 36,
          minWidth: 36,
          background: "hsl(var(--theme-surface-panel) / 0.93)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: "8px",
          border: "1px solid hsl(var(--theme-border-soft) / 0.5)",
        }}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="p-1.5 rounded-md transition-opacity hover:opacity-70"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
          aria-label="Expand navigation panel"
        >
          <ChevronRightIcon />
        </button>
      </div>
    )
  }

  const renderNavBlock = (block: NavRenderBlock): React.ReactNode => {
    if (!shouldRenderContentGatedBlock(block, def.nav, navContentCounts)) return null

    switch (block) {
      case "dialogs":
        if (!showDialogs) return null
        return (
          <>
            <SidebarCard
              title="Dialogs"
              className="keeper-sidebar-card"
              description={
                !domainId ? "Loading…" : countLabel(namedDialogs.length, "dialog")
              }
              items={slice("dialogs", allDialogItems).length ? slice("dialogs", allDialogItems) : undefined}
              onTitleClick={() => toggleExpanded("dialogs")}
              onAdd={user && domainId ? handleDialogCreate : undefined}
              onImport={user && domainId ? handleDialogIngest : undefined}
              onImportLabel="Bring in writing"
            />
            {dialogError && (
              <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
                {dialogError}
              </p>
            )}
          </>
        )
      case "journeys":
        if (!showJourneys) return null
        return (
          <>
            <SidebarCard
              className="keeper-sidebar-card"
              title="Journeys"
              description={!domainId ? "Loading…" : countLabel(journeys?.length ?? null, "journey")}
              items={slice("journeys", allJourneyItems).length ? slice("journeys", allJourneyItems) : undefined}
              onTitleClick={() => toggleExpanded("journeys")}
              onAdd={user && domainId ? handleJourneyCreate : undefined}
            />
            {selectedJourneyId && user && domainId ? (
              <>
                <SidebarCard
                  className="keeper-sidebar-card"
                  title="Path"
                  description="Add to selected journey"
                  onAdd={handlePathCreate}
                />
                <SidebarCard
                  className="keeper-sidebar-card"
                  title="Moment"
                  description={
                    selectedPathId
                      ? "Add on selected path"
                      : "Add on selected journey"
                  }
                  onAdd={handleMomentCreate}
                />
              </>
            ) : null}
            {journeyError && (
              <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
                {journeyError}
              </p>
            )}
          </>
        )
      case "keepers":
        if (!showKeepers) return null
        return (
          <>
            <SidebarCard
              className="keeper-sidebar-card"
              title={keeperSectionTitle}
              description={!domainId ? "Loading…" : countLabel(keepers?.length ?? null, "keeper")}
              items={slice("keepers", allKeeperItems).length ? slice("keepers", allKeeperItems) : undefined}
              onTitleClick={() => toggleExpanded("keepers")}
              onAdd={user && domainId ? handleKeeperCreate : undefined}
            />
            {keeperError && (
              <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
                {keeperError}
              </p>
            )}
          </>
        )
      case "boards":
        if (def.boardId !== "domain" && def.boardId !== "realm") return null
        return (
          <SidebarCard
            className="keeper-sidebar-card"
            title="Boards"
            description="Workspace"
            items={boardNavItems}
          />
        )
      case "chatter":
        if (def.boardId !== "domain" && def.boardId !== "realm") return null
        return (
          <>
            <SidebarCard
              title="Chatter"
              className="keeper-sidebar-card"
              description={
                !domainId
                  ? "Loading…"
                  : countLabel(chatterDialogs.length, "session")
              }
              // Collapsed by default — only show items when expanded.
              items={
                expanded.has("chatter") && allChatterItems.length
                  ? slice("chatter", allChatterItems)
                  : undefined
              }
              onTitleClick={() => toggleExpanded("chatter")}
            />
          </>
        )
      case "connections":
        if (def.boardId !== "realm") return null
        return (
          <>
            <SidebarCard
              title="Connections"
              className="keeper-sidebar-card"
              description={
                !domainId
                  ? "Loading…"
                  : countLabel(connectionItems?.length ?? null, "connection")
              }
              items={
                (connectionItems ?? []).map((entry) => ({
                  id: entry.id,
                  label: entry.label,
                  description: entry.description,
                }))
              }
            />
            {connectionError && (
              <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
                {connectionError}
              </p>
            )}
          </>
        )
      case "drafts":
        if (!showDrafts) return null
        {
          const multiKindDraftGroups = draftNavGroups.length > 1
          if (draftNavGroups.length === 0) {
            return (
              <>
                <SidebarCard
                  className="keeper-sidebar-card"
                  title="Drafts"
                  description={
                    !domainId
                      ? "Loading…"
                      : countLabel(patchedDrafts === null ? null : 0, "draft")
                  }
                  onAdd={handleDraftCreate}
                />
                {draftError && (
                  <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
                    {draftError}
                  </p>
                )}
              </>
            )
          }

          if (!multiKindDraftGroups) {
            const groupItems = buildDraftNavItems(draftNavGroups[0].drafts)
            return (
              <>
                <SidebarCard
                  className="keeper-sidebar-card"
                  title="Drafts"
                  description={
                    !domainId ? "Loading…" : countLabel(orphanDraftsForNav.length, "loose draft")
                  }
                  items={
                    groupItems.length > NAV_COLLAPSE_ITEM_THRESHOLD
                      ? groupItems
                      : slice("drafts", groupItems).length
                        ? slice("drafts", groupItems)
                        : undefined
                  }
                  collapsible={groupItems.length > NAV_COLLAPSE_ITEM_THRESHOLD}
                  defaultCollapsed={groupItems.length > NAV_COLLAPSE_ITEM_THRESHOLD}
                  onTitleClick={
                    groupItems.length > NAV_COLLAPSE_ITEM_THRESHOLD
                      ? undefined
                      : () => toggleExpanded("drafts")
                  }
                  onAdd={handleDraftCreate}
                />
                {draftError && (
                  <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
                    {draftError}
                  </p>
                )}
              </>
            )
          }

          return (
            <>
              <div className="flex flex-col gap-3">
                {draftNavGroups.map(({ kind, drafts: groupDrafts }, index) => {
                  const groupItems = buildDraftNavItems(groupDrafts)
                  const kindLabel = formatDraftKindLabel(kind)
                  const isFirst = index === 0
                  return (
                    <SidebarCard
                      key={kind}
                      className="keeper-sidebar-card"
                      title={isFirst ? "Drafts" : kindLabel}
                      description={
                        isFirst
                          ? (!domainId
                              ? "Loading…"
                              : countLabel(orphanDraftsForNav.length, "loose draft"))
                          : countLabel(groupDrafts.length, "draft")
                      }
                      items={groupItems.length ? groupItems : undefined}
                      collapsible={groupItems.length > NAV_COLLAPSE_ITEM_THRESHOLD}
                      defaultCollapsed={groupItems.length > NAV_COLLAPSE_ITEM_THRESHOLD}
                      onAdd={isFirst ? handleDraftCreate : undefined}
                    />
                  )
                })}
              </div>
              {draftError && (
                <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
                  {draftError}
                </p>
              )}
            </>
          )
        }
      case "integrations":
        if (integrationItems.length === 0) return null
        return (
          <div className="flex flex-col gap-3">
            {infrastructureItems.length > 0 ? (
              <SidebarCard
                className="keeper-sidebar-card"
                title="Integrations"
                description="Infrastructure"
                items={infrastructureItems}
                collapsible={infrastructureItems.length > NAV_COLLAPSE_ITEM_THRESHOLD}
                defaultCollapsed={infrastructureItems.length > NAV_COLLAPSE_ITEM_THRESHOLD}
              />
            ) : null}
            {aiItems.length > 0 ? (
              <SidebarCard
                className="keeper-sidebar-card"
                title="AI Providers"
                description="Model connections"
                items={aiItems}
                collapsible={aiItems.length >= NAV_COLLAPSE_ITEM_THRESHOLD}
                defaultCollapsed={aiItems.length >= NAV_COLLAPSE_ITEM_THRESHOLD}
              />
            ) : null}
          </div>
        )
      case "keys":
        if (!showKeysNav) return null
        return (
          <>
            <SidebarCard
              className="keeper-sidebar-card"
              title="Keys"
              description={!domainId ? "Loading…" : countLabel(keys?.length ?? null, "key")}
              items={keyItems.length ? keyItems : undefined}
              collapsible={keyItems.length > NAV_COLLAPSE_ITEM_THRESHOLD}
              defaultCollapsed={keyItems.length > NAV_COLLAPSE_ITEM_THRESHOLD}
            />
            {keyError && (
              <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
                {keyError}
              </p>
            )}
          </>
        )
      case "aiAccess":
        if (!showAiAccessNav) return null
        return (
          <DomainAiAccessNav
            domainId={domainId}
            onManageKey={onKeySelect}
            onAddKey={() => void handleAddDomainKey()}
          />
        )
      case "externalAccess":
        if (!showExternalAccessNav) return null
        return (
          <DomainExternalAccessNav
            domainId={domainId}
            selectedKeyId={selectedKeyId}
            onManageKey={onKeySelect}
          />
        )
      case "library":
        if (!showLibraryNav) return null
        return (
          <div className="flex flex-col gap-2">
            <input
              ref={libraryFileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.txt,.md,.pdf,.json,.csv"
              onChange={(event) => void handleLibraryFileChange(event)}
            />
            <SidebarCard
              className="keeper-sidebar-card"
              title="Library"
              description={
                libraryCreating
                  ? "Adding item…"
                  : !domainId
                    ? "Loading…"
                    : countLabel(
                        (allLibraryRows ?? []).filter((row) => row.id && row.source_ref?.trim()).length,
                        "item",
                      )
              }
              items={libraryItems.length ? libraryItems : undefined}
              collapsible={libraryItems.length > NAV_COLLAPSE_ITEM_THRESHOLD}
              defaultCollapsed={libraryItems.length > NAV_COLLAPSE_ITEM_THRESHOLD}
              onAdd={libraryCreating ? undefined : handleLibraryUploadClick}
            />
            {libraryError && (
              <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
                {libraryError}
              </p>
            )}
          </div>
        )
      case "glossary":
        if (!showGlossaryNav) return null
        return (
          <SidebarCard
            className="keeper-sidebar-card"
            title="Glossary"
            description={def.boardId === "designer" ? "Definition ownership" : "Governing vocabulary"}
            items={[
              {
                id: OBJECT_GLOSSARY_SUBJECT_ID,
                label: "Object Glossary",
                isSelected: selectedGlossaryId === OBJECT_GLOSSARY_SUBJECT_ID,
                onClick: () => onGlossarySelect?.(),
              },
            ]}
          />
        )
      case "capabilities":
        if (!showCapabilitiesNav || !capabilitiesByKind) return null
        return (
          <div className="flex flex-col gap-3">
            <p className="keeper-nav-section-title px-1">Capabilities</p>
            {(["infra", "tool", "permission", "action"] as CapabilityKind[]).map((kind) => {
              const rows = capabilitiesByKind[kind]
              if (!rows.length) return null
              const items: SidebarCardItem[] = rows.map((cap) => ({
                id: cap.id,
                label: capabilityChronicleTitle(cap),
                isSelected: cap.id === selectedCapabilityId,
                onClick: () => onCapabilitySelect?.(cap.id),
              }))
              return (
                <SidebarCard
                  key={kind}
                  className="keeper-sidebar-card"
                  title={CAPABILITY_KIND_LABELS[kind]}
                  description={countLabel(rows.length, "capability")}
                  items={items}
                  collapsible
                  defaultCollapsed
                />
              )
            })}
            {capabilityError && (
              <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
                {capabilityError}
              </p>
            )}
          </div>
        )
      case "agents":
        if (!showAgents) return null
        return (
          <>
            <SidebarCard
              className="keeper-sidebar-card"
              title="Agents"
              description={!domainId ? "Loading…" : countLabel(agents?.length ?? null, "agent")}
              items={slice("agents", allAgentItems).length ? slice("agents", allAgentItems) : allAgentItems}
              onTitleClick={() => toggleExpanded("agents")}
              onAdd={user && domainId ? handleAgentCreate : undefined}
            />
            {agentError && (
              <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
                {agentError}
              </p>
            )}
          </>
        )
      case "boardDefs":
        if (!showBoardDefs) return null
        return (
          <SidebarCard
            className="keeper-sidebar-card"
            title="Board Definitions"
            description={countLabel(boardDefItems.length, "definition")}
            items={boardDefItems.length ? boardDefItems : undefined}
          />
        )
      default:
        return null
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (navStages?.length) {
    return (
      <TreatmentAccentShell treatment={realmTreatment} className="keeper-nav-panel overflow-hidden">
        <div
          className="flex flex-col h-full min-h-0 overflow-hidden"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          <div
            className="shrink-0 flex items-center justify-between px-3 pt-3 pb-2"
            style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.4)" }}
          >
            <p
              className="keeper-treatment-title text-[13px] font-medium truncate flex-1 min-w-0"
              style={{ color: "hsl(var(--theme-ink-secondary))", letterSpacing: "0.01em" }}
              title={domainName}
            >
              {domainName}
            </p>
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="shrink-0 ml-1 p-1 rounded-md transition-opacity hover:opacity-60"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
              aria-label="Collapse navigation panel"
            >
              <ChevronLeftIcon />
            </button>
          </div>
          <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto">
            <RealmStagedNav
              domainId={domainId}
              domainSlug={domainSlug}
              treatment={realmTreatment}
              stages={navStages}
              selectedDialogId={selectedDialogId}
              selectedDraftId={selectedDraftId}
              selectedLibraryItemId={selectedLibraryItemId}
              selectedMomentId={selectedMomentId}
              onDialogSelect={onDialogSelect}
              onDraftSelect={onDraftSelect}
              onLibraryItemSelect={onLibraryItemSelect}
              onMomentSelect={onMomentSelect}
              onDraftCreate={user && domainId ? handleDraftCreate : undefined}
            />
          </div>
        </div>
      </TreatmentAccentShell>
    )
  }

  return (
    <TreatmentAccentShell treatment={realmTreatment} className="keeper-nav-panel overflow-hidden">
      <div
        className="flex flex-col h-full min-h-0 overflow-hidden"
        style={{
          color: "hsl(var(--theme-ink-primary))",
        }}
      >
        {/* Domain name header — quiet anchor, not interactive */}
        <div
          className="shrink-0 flex items-center justify-between px-3 pt-3 pb-2"
          style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.4)" }}
        >
          <p
            className="keeper-treatment-title text-[13px] font-medium truncate flex-1 min-w-0"
            style={{ color: "hsl(var(--theme-ink-secondary))", letterSpacing: "0.01em" }}
            title={domainName}
          >
            {domainName}
          </p>
          <div className="shrink-0 flex items-center gap-0.5 ml-1">
            {domainId ? (
              <button
                type="button"
                onClick={() => setCrossNavOpen(true)}
                className="p-1 rounded-md transition-opacity hover:opacity-60 text-[11px] font-medium"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
                aria-label="Search across Dialogs, Keepers, Library, Drafts"
                title="Search (⌘K)"
              >
                ⌕
              </button>
            ) : null}
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="p-1 rounded-md transition-opacity hover:opacity-60"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
              aria-label="Collapse navigation panel"
            >
              <ChevronLeftIcon />
            </button>
          </div>
        </div>

        {/* Scrollable SidebarCards — order from def.nav.primarySection when set */}
        <div className="keeper-panel-scroll flex-1 min-h-0 space-y-3 overflow-y-auto p-3">
          {navBlockOrder.map((block) => (
            <React.Fragment key={block}>{renderNavBlock(block)}</React.Fragment>
          ))}
        </div>
      </div>
      {domainId ? (
        <CrossNavIndex
          domainId={domainId}
          open={crossNavOpen}
          onClose={() => setCrossNavOpen(false)}
          onSelect={handleCrossNavSelect}
        />
      ) : null}
    </TreatmentAccentShell>
  )
}
