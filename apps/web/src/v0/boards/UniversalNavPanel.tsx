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
import type { KipDraftSummary } from "../../lib/kipApi"
import { SidebarCard } from "../components/SidebarCard"
import type { SidebarCardItem } from "../components/SidebarCard"
import type { UniversalBoardDef, NavSectionKey } from "./UniversalBoardDefinition"
import { useBoardDefs } from "./useBoardDefs"
import { useBoardDefinitionFromUrl } from "./useBoardDefinitionFromUrl"
import { useV0Shell } from "../shell/V0ShellContext"
import {
  fetchDomainKeyNavRows,
  keyNavLabel,
  keyStatusNavHint,
  type KeyNavRow,
} from "../presence/integrationChronicle/keyNavUtils"

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

  // Selection callbacks — fired by this component, handled by the Board
  onDialogSelect?: (id: string) => void
  onJourneySelect?: (id: string) => void
  onKeeperSelect?: (id: string) => void
  onDraftSelect?: (id: string) => void
  onAgentSelect?: (id: string) => void
  onServiceOpen?: (slug: string) => void
  onKeySelect?: (id: string) => void

  // Collapse state — controlled by the Board
  collapsed?: boolean
  onToggleCollapsed?: () => void

  // Version counters — increment to trigger re-fetch of that section
  dialogListVersion?: number
  journeyListVersion?: number
  keeperListVersion?: number
  draftListVersion?: number
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

type NavRenderBlock = SectionKey | "boardDefs" | "integrations" | "keys"

const DEFAULT_NAV_BLOCK_ORDER: NavRenderBlock[] = [
  "dialogs",
  "journeys",
  "keepers",
  "drafts",
  "integrations",
  "keys",
  "agents",
  "boardDefs",
]

function resolveNavBlockOrder(primarySection?: NavSectionKey): NavRenderBlock[] {
  if (!primarySection) return DEFAULT_NAV_BLOCK_ORDER
  return [primarySection, ...DEFAULT_NAV_BLOCK_ORDER.filter((block) => block !== primarySection)]
}

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
  onDialogSelect,
  onJourneySelect,
  onKeeperSelect,
  onDraftSelect,
  onAgentSelect,
  onServiceOpen,
  onKeySelect,
  collapsed = false,
  onToggleCollapsed,
  dialogListVersion = 0,
  journeyListVersion = 0,
  keeperListVersion = 0,
  draftListVersion = 0,
}: UniversalNavPanelProps) {

  // ── designer board definitions — live from location.search ─────────────────
  const { selectBoardDefinition } = useV0Shell()
  const boardDefinitionId = useBoardDefinitionFromUrl()
  const allBoardDefs = useBoardDefs()

  // ── Section data ────────────────────────────────────────────────────────────
  const [dialogs, setDialogs] = React.useState<DialogItem[] | null>(null)
  const [journeys, setJourneys] = React.useState<JourneyItem[] | null>(null)
  const [keepers, setKeepers] = React.useState<KeeperItem[] | null>(null)
  const [drafts, setDrafts] = React.useState<KipDraftSummary[] | null>(null)
  const [agents, setAgents] = React.useState<AgentItem[] | null>(null)
  const [keys, setKeys] = React.useState<KeyNavRow[] | null>(null)
  const [keyError, setKeyError] = React.useState<string | null>(null)

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

  // ── Fetch: Agents — only when def.nav.sections.agents is true ───────────
  React.useEffect(() => {
    if (!domainId) return
    if (!def.nav.sections.agents) return
    let cancelled = false
    setAgents(null)
    setAgentError(null)
    apiFetch(`/api/agents?domainId=${encodeURIComponent(domainId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const list = (res as { agents?: AgentItem[] })?.agents ?? []
        setAgents(Array.isArray(list) ? (list as AgentItem[]) : [])
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setAgentError(err instanceof Error ? err.message : "Failed to load agents")
          setAgents([])
        }
      })
    return () => { cancelled = true }
  }, [domainId, def.nav.sections.agents])

  const showKeysNav = def.boardId === "ide" && (def.nav.integrations ?? []).some((item) => item.group === "ai")

  // ── Fetch: Keys — IDE Board Layer 3 only ─────────────────────────────────
  React.useEffect(() => {
    if (!domainId || !showKeysNav) return
    let cancelled = false
    setKeys(null)
    setKeyError(null)
    void fetchDomainKeyNavRows(domainId)
      .then((rows) => {
        if (!cancelled) setKeys(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setKeyError(err instanceof Error ? err.message : "Failed to load keys")
          setKeys([])
        }
      })
    return () => { cancelled = true }
  }, [domainId, showKeysNav])

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

  // Keepers: title only (no secondary metadata yet)
  const allKeeperItems: SidebarCardItem[] = (keepers ?? []).map((k) => ({
    id: k.id,
    label: k.title?.trim() || "Untitled keeper",
    isSelected: k.id === selectedKeeperId,
    onClick: () => onKeeperSelect?.(k.id),
  }))

  // Drafts: embed keeper name when available — matches IDE Board's label format
  const allDraftItems: SidebarCardItem[] = (drafts ?? []).map((d) => {
    const keeperName = d.keeperId
      ? (keepers ?? []).find((k) => k.id === d.keeperId)?.title
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
  const allAgentItems: SidebarCardItem[] = (agents ?? []).map((a) => ({
    id: a.id,
    label: a.model
      ? `${a.name?.trim() || "Unnamed agent"} · ${a.model}`
      : (a.name?.trim() || "Unnamed agent"),
    isSelected: a.id === selectedAgentId,
    onClick: () => onAgentSelect?.(a.id),
  }))

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

  const keyItems: SidebarCardItem[] = (keys ?? []).map((key) => ({
    id: key.id,
    label: keyNavLabel(key),
    description: keyStatusNavHint(key.status),
    isSelected: key.id === selectedKeyId,
    onClick: () => onKeySelect?.(key.id),
  }))

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

  const navBlockOrder = resolveNavBlockOrder(def.nav.primarySection)

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
              onAdd={() => { /* TODO: wire to journey create callback in Moment 2.6 */ }}
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
              title="Keepers"
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
      case "drafts":
        if (!showDrafts) return null
        return (
          <>
            <SidebarCard
              className="keeper-sidebar-card"
              title="Drafts"
              description={!domainId ? "Loading…" : countLabel(drafts?.length ?? null, "draft")}
              items={slice("drafts", allDraftItems).length ? slice("drafts", allDraftItems) : undefined}
              onTitleClick={() => toggleExpanded("drafts")}
              onAdd={() => { /* TODO: wire to draft create callback in Moment 2.6 */ }}
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
              />
            ) : null}
            {aiItems.length > 0 ? (
              <SidebarCard
                className="keeper-sidebar-card"
                title="AI Providers"
                description="Model connections"
                items={aiItems}
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
            />
            {keyError && (
              <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
                {keyError}
              </p>
            )}
          </>
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
