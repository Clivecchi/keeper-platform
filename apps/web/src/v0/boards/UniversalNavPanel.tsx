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
import { KipApi } from "../../lib/kipApi"
import { useAuth } from "../../context/AuthContext"
import { useFrameContextOptional } from "../shell/FrameContext"
import type { KipDraftSummary } from "../../lib/kipApi"
import { SidebarCard } from "../components/SidebarCard"
import type { SidebarCardItem } from "../components/SidebarCard"
import type { KeyNavRowPatch, DraftNavRowPatch, AgentNavRowPatch } from "./UniversalBoardContext"
import { useUniversalBoardOptional } from "./UniversalBoardContext"
import type { UniversalBoardDef, NavRenderBlock } from "./UniversalBoardDefinition"
import { useBoardDefs } from "./useBoardDefs"
import { useBoardDefinitionFromUrl } from "./useBoardDefinitionFromUrl"
import { useV0Shell } from "../shell/V0ShellContext"
import type { WorkspaceBoardId } from "./workspaceBoardNav"
import {
  collapseKeyNavRows,
  fetchAllDomainKeyRows,
  IDE_AI_PROVIDERS,
  keyChronicleTitle,
  keyStatusNavHint,
  type KeyNavRow,
} from "../presence/integrationChronicle/keyNavUtils"
import { DomainAiAccessNav } from "./domain/DomainAiAccessNav"
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
  selectedKeeperId?: string | null
  selectedDraftId?: string | null
  selectedAgentId?: string | null
  selectedServiceSlug?: string | null
  selectedKeyId?: string | null
  selectedCapabilityId?: string | null
  selectedLibraryItemId?: string | null

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
  updated_at: string
  session_count: number
  context: { board?: string; frame?: string; subject?: string }
  available_to: string[]
}

type JourneyItem = {
  id: string
  name: string
  momentCount?: number
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

type SectionKey = "dialogs" | "journeys" | "keepers" | "drafts" | "agents"

const DEFAULT_NAV_BLOCK_ORDER: NavRenderBlock[] = [
  "dialogs",
  "journeys",
  "keepers",
  "drafts",
  "integrations",
  "keys",
  "aiAccess",
  "capabilities",
  "library",
  "agents",
  "boardDefs",
  "boards",
]

const WORKSPACE_BOARD_NAV: { id: WorkspaceBoardId; label: string }[] = [
  { id: "ide", label: "IDE" },
  { id: "designer", label: "Design" },
  { id: "agent", label: "Agent" },
]

function resolveNavBlockOrder(def: UniversalBoardDef): NavRenderBlock[] {
  if (def.nav.navBlockOrder?.length) {
    const ordered = def.nav.navBlockOrder
    const remainder = DEFAULT_NAV_BLOCK_ORDER.filter((block) => {
      if (ordered.includes(block)) return false
      if (block === "library" && !(def.nav.sections.library ?? false)) return false
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
  selectedKeeperId,
  selectedDraftId,
  selectedAgentId,
  selectedServiceSlug,
  selectedKeyId,
  selectedCapabilityId,
  selectedLibraryItemId,
  onDialogSelect,
  onJourneySelect,
  onKeeperSelect,
  onDraftSelect,
  onAgentSelect,
  onServiceOpen,
  onKeySelect,
  onCapabilitySelect,
  onLibraryItemSelect,
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

  // ── designer board definitions — live from location.search ─────────────────
  const { selectBoardDefinition, switchWorkspace, workspaceBoardId } = useV0Shell()
  const boardDefinitionId = useBoardDefinitionFromUrl()
  const allBoardDefs = useBoardDefs()

  // ── Section data ────────────────────────────────────────────────────────────
  const [dialogs, setDialogs] = React.useState<DialogItem[] | null>(null)
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

  // ── Per-section error states ─────────────────────────────────────────────
  const [dialogError, setDialogError] = React.useState<string | null>(null)
  const [journeyError, setJourneyError] = React.useState<string | null>(null)
  const [keeperError, setKeeperError] = React.useState<string | null>(null)
  const [draftError, setDraftError] = React.useState<string | null>(null)
  const [agentError, setAgentError] = React.useState<string | null>(null)

  // ── Section expand state ─────────────────────────────────────────────────
  const [expanded, setExpanded] = React.useState<Set<SectionKey>>(new Set())

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
    setDialogs(null)
    setDialogError(null)
    apiFetch(`/api/domains/${encodeURIComponent(domainId)}/kip/dialogs`)
      .then((res: unknown) => {
        if (cancelled) return
        const list = (res as { dialogs?: DialogItem[] })?.dialogs ?? []
        setDialogs(Array.isArray(list) ? (list as DialogItem[]) : [])
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDialogError(err instanceof Error ? err.message : "Failed to load dialogs")
          setDialogs([])
        }
      })
    return () => { cancelled = true }
  }, [domainId, def.nav.sections.dialogs, dialogListVersion])

  // ── Fetch: Journeys ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!domainId || !def.nav.sections.journeys) return
    let cancelled = false
    setJourneys(null)
    setJourneyError(null)
    apiFetch(`/api/journeys?domainId=${encodeURIComponent(domainId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const list = (res as { data?: { journeys?: JourneyItem[] } })?.data?.journeys ?? []
        setJourneys(Array.isArray(list) ? (list as JourneyItem[]) : [])
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setJourneyError(err instanceof Error ? err.message : "Failed to load journeys")
          setJourneys([])
        }
      })
    return () => { cancelled = true }
  }, [domainId, def.nav.sections.journeys, journeyListVersion])

  // ── Fetch: Keepers ───────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!domainId || !def.nav.sections.keepers) return
    let cancelled = false
    setKeepers(null)
    setKeeperError(null)
    apiFetch(`/api/keepers?domainId=${encodeURIComponent(domainId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const list = (res as { data?: { keepers?: KeeperItem[] } })?.data?.keepers ?? []
        setKeepers(Array.isArray(list) ? (list as KeeperItem[]) : [])
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setKeeperError(err instanceof Error ? err.message : "Failed to load keepers")
          setKeepers([])
        }
      })
    return () => { cancelled = true }
  }, [domainId, def.nav.sections.keepers, keeperListVersion])

  // ── Fetch: Drafts — only when def.nav.sections.drafts is true ──────────
  React.useEffect(() => {
    if (!domainId) return
    if (!def.nav.sections.drafts) return
    let cancelled = false
    setDrafts(null)
    setDraftError(null)
    KipApi.listDrafts(domainId)
      .then((list) => {
        if (!cancelled) setDrafts(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setDraftError(err instanceof Error ? err.message : "Failed to load drafts")
          setDrafts([])
        }
      })
    return () => { cancelled = true }
  }, [domainId, def.nav.sections.drafts, draftListVersion])

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

  // ── Fetch: Agents — domain-scoped (Kip + domain lead), not global registry ──
  React.useEffect(() => {
    if (!domainId) return
    if (!def.nav.sections.agents) return
    let cancelled = false
    setAgents(null)
    setAgentError(null)
    apiFetch(`/api/domains/${encodeURIComponent(domainId)}/kip/agents`)
      .then((res: unknown) => {
        if (cancelled) return
        const payload = res as { data?: AgentItem[]; agents?: AgentItem[] }
        const list = payload.data ?? payload.agents ?? []
        setAgents(Array.isArray(list) ? list : [])
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setAgentError(err instanceof Error ? err.message : "Failed to load agents")
          setAgents([])
        }
      })
    return () => { cancelled = true }
  }, [domainId, def.nav.sections.agents, agentListVersion])

  const showKeysNav = (def.nav.integrations ?? []).some((item) => item.group === "ai")
  const showAiAccessNav = def.nav.aiAccessSummary === true
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

  // Dialogs: embed date suffix for recency signal
  const allDialogItems: SidebarCardItem[] = (dialogs ?? []).map((d) => ({
    id: d.id,
    label: d.updated_at
      ? `${d.title?.trim() || "Untitled dialog"} · ${formatDate(d.updated_at)}`
      : (d.title?.trim() || "Untitled dialog"),
    isSelected: d.id === selectedDialogId,
    onClick: () => onDialogSelect?.(d.id),
  }))

  // Journeys: embed moment count — matches IDE Board's label format
  const allJourneyItems: SidebarCardItem[] = (journeys ?? []).map((j) => ({
    id: j.id,
    label: `${j.name?.trim() || "Untitled journey"}${j.momentCount != null ? ` · ${j.momentCount} moment${j.momentCount === 1 ? "" : "s"}` : ""}`,
    isSelected: j.id === selectedJourneyId,
    onClick: () => onJourneySelect?.(j.id),
  }))

  // Keepers: display_label via keeperChronicleTitle (matches Chronicle cover)
  const allKeeperItems: SidebarCardItem[] = (patchedKeepers ?? []).map((k) => ({
    id: k.id,
    label: keeperChronicleTitle(k),
    isSelected: k.id === selectedKeeperId,
    onClick: () => onKeeperSelect?.(k.id),
  }))

  // Drafts: embed keeper name when available — matches IDE Board's label format
  const allDraftItems: SidebarCardItem[] = (patchedDrafts ?? []).map((d) => {
    const keeperName = d.keeperId
      ? keeperChronicleTitle(
          (patchedKeepers ?? []).find((k) => k.id === d.keeperId) ?? {
            id: d.keeperId,
            title: "Keeper",
            display_label: null,
          },
        )
      : null
    return {
      id: d.id,
      label: keeperName
        ? `${d.title?.trim() || "Untitled draft"} · ${keeperName}`
        : (d.title?.trim() || "Untitled draft"),
      isSelected: d.id === selectedDraftId,
      onClick: () => onDraftSelect?.(d.id),
    }
  })

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

  const showDrafts = def.nav.sections.drafts
  const showAgents = def.nav.sections.agents
  const showDialogs = def.nav.sections.dialogs
  const showJourneys = def.nav.sections.journeys
  const showKeepers = def.nav.sections.keepers
  const showBoardDefs = def.nav.sections.boardDefs ?? false
  const activeBoardDefId = showBoardDefs ? boardDefinitionId : null

  React.useEffect(() => {
    if (!showBoardDefs) return
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

  const boardNavItems: SidebarCardItem[] = WORKSPACE_BOARD_NAV.map((board) => ({
    id: board.id,
    label: board.label,
    isSelected: workspaceBoardId === board.id,
    onClick: () => switchWorkspace(board.id),
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
  ])

  // ── designer sections: Board Definitions ─────────────────────────────────

  const selectBoardDef = React.useCallback(
    (boardDefId: string) => {
      selectBoardDefinition(boardDefId)
    },
    [selectBoardDefinition],
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

  const navBlockOrder = resolveNavBlockOrder(def)

  const renderNavBlock = (block: NavRenderBlock): React.ReactNode => {
    switch (block) {
      case "dialogs":
        if (!showDialogs) return null
        return (
          <>
            <SidebarCard
              title="Dialogs"
              className="keeper-sidebar-card"
              description={!domainId ? "Loading…" : countLabel(dialogs?.length ?? null, "dialog")}
              items={slice("dialogs", allDialogItems).length ? slice("dialogs", allDialogItems) : undefined}
              onTitleClick={() => toggleExpanded("dialogs")}
              onAdd={() => { /* TODO: wire to dialog create callback in Moment 2.6 */ }}
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
              onAdd={() => { /* TODO: wire to keeper create callback in Moment 2.6 */ }}
            />
            {keeperError && (
              <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
                {keeperError}
              </p>
            )}
          </>
        )
      case "boards":
        if (def.boardId !== "domain") return null
        return (
          <SidebarCard
            className="keeper-sidebar-card"
            title="Boards"
            description="Workspace"
            items={boardNavItems}
          />
        )
      case "drafts":
        if (!showDrafts) return null
        return (
          <>
            <SidebarCard
              className="keeper-sidebar-card"
              title="Drafts"
              description={!domainId ? "Loading…" : countLabel(patchedDrafts?.length ?? null, "draft")}
              items={
                allDraftItems.length > NAV_COLLAPSE_ITEM_THRESHOLD
                  ? allDraftItems
                  : slice("drafts", allDraftItems).length
                    ? slice("drafts", allDraftItems)
                    : undefined
              }
              collapsible={allDraftItems.length > NAV_COLLAPSE_ITEM_THRESHOLD}
              defaultCollapsed={allDraftItems.length > NAV_COLLAPSE_ITEM_THRESHOLD}
              onTitleClick={
                allDraftItems.length > NAV_COLLAPSE_ITEM_THRESHOLD
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

  return (
    <div
      className="keeper-nav-panel flex flex-col h-full overflow-hidden"
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
          className="text-[13px] font-medium truncate flex-1 min-w-0"
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

      {/* Scrollable SidebarCards — order from def.nav.primarySection when set */}
      <div className="keeper-panel-scroll flex-1 min-h-0 space-y-3 overflow-y-auto p-3">
        {navBlockOrder.map((block) => (
          <React.Fragment key={block}>{renderNavBlock(block)}</React.Fragment>
        ))}
      </div>
    </div>
  )
}
