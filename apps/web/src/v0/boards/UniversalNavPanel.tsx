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
 * CRITICAL RULES:
 * - This component NEVER calls /api/domains/by-slug. domainId is resolved
 *   by the Board and passed as a prop.
 * - All selection state is controlled by the Board. This component fires callbacks.
 * - All colors use hsl(var(--theme-*)) CSS variables only. Zero hardcoded hex.
 *
 * Panel structure:
 *   Layer 1 — Domain Records: Dialogs, Journeys, Keepers, [Drafts]
 *   Layer 2 — Board Instruments: conditional on boardContext
 */

import * as React from "react"
import { apiFetch } from "../../lib/api"
import { KipApi } from "../../lib/kipApi"
import type { KipDraftSummary } from "../../lib/kipApi"
import { SidebarCard } from "../components/SidebarCard"
import type { SidebarCardItem } from "../components/SidebarCard"
import type { UniversalBoardDef } from "./UniversalBoardDefinition"
import { BOARD_DEFINITIONS } from "./UniversalBoardDefinition"
import { useUniversalBoardOptional } from "./UniversalBoardContext"
import { useDesignerDraftOptional } from "./DesignerDraftContext"
import { BOARD_FRAMES } from "./designer/DesignBoardFrameList"
import { FRAME_TO_JSON_KEY } from "../shell/frameRegistryMap"

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

  // Selection callbacks — fired by this component, handled by the Board
  onDialogSelect?: (id: string) => void
  onJourneySelect?: (id: string) => void
  onKeeperSelect?: (id: string) => void
  onDraftSelect?: (id: string) => void
  onAgentSelect?: (id: string) => void

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

// ─── FramesSidebarCard ────────────────────────────────────────────────────────
// Renders the Frames section for designer mode. Uses the same panel chrome as
// SidebarCard but adds live/draft status dots per row.

function FramesSidebarCard({
  items,
  activeBoardForFrames,
}: {
  items: SidebarCardItem[]
  activeBoardForFrames: string
}) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: "1px solid hsl(var(--theme-border-soft) / 0.3)",
        background: "hsl(var(--theme-surface-elevated) / 0.15)",
      }}
    >
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.15)" }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Frames
        </p>
        <p
          className="text-[10px] font-mono"
          style={{ color: "hsl(var(--theme-ink-tertiary) / 0.6)" }}
        >
          {activeBoardForFrames}
        </p>
      </div>
      <div className="py-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors"
            style={{
              background: item.isSelected ? "hsl(var(--theme-surface-elevated))" : "transparent",
              borderLeft: `2px solid ${item.isSelected ? "hsl(var(--theme-ink-primary))" : "transparent"}`,
            }}
          >
            <span
              className="shrink-0 rounded-full"
              style={{
                width: 6,
                height: 6,
                background: item.description === "draft"
                  ? "hsl(38 92% 50%)"
                  : "hsl(152 69% 43%)",
              }}
              title={item.description === "draft" ? "Draft differs from live" : "Live"}
            />
            <span
              className="flex-1 text-[12px] leading-snug truncate"
              style={{
                color: item.isSelected
                  ? "hsl(var(--theme-ink-primary))"
                  : "hsl(var(--theme-ink-secondary))",
                fontWeight: item.isSelected ? 500 : 400,
              }}
            >
              {item.label}
            </span>
          </button>
        ))}
        {items.length === 0 && (
          <p
            className="px-3 py-2 text-[11px]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            No frames
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UniversalNavPanel({
  domainId,
  domainSlug: _domainSlug,
  domainName,
  def,
  selectedDialogId,
  selectedJourneyId,
  selectedKeeperId,
  selectedDraftId,
  selectedAgentId,
  onDialogSelect,
  onJourneySelect,
  onKeeperSelect,
  onDraftSelect,
  onAgentSelect,
  collapsed = false,
  onToggleCollapsed,
  dialogListVersion = 0,
  journeyListVersion = 0,
  keeperListVersion = 0,
  draftListVersion = 0,
}: UniversalNavPanelProps) {

  // ── designer context — must be called before any early returns ─────────────
  const boardCtx = useUniversalBoardOptional()
  const draftCtx = useDesignerDraftOptional()

  // ── Section data ────────────────────────────────────────────────────────────
  const [dialogs, setDialogs] = React.useState<DialogItem[] | null>(null)
  const [journeys, setJourneys] = React.useState<JourneyItem[] | null>(null)
  const [keepers, setKeepers] = React.useState<KeeperItem[] | null>(null)
  const [drafts, setDrafts] = React.useState<KipDraftSummary[] | null>(null)
  const [agents, setAgents] = React.useState<AgentItem[] | null>(null)

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
    if (!domainId) return
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
  }, [domainId, dialogListVersion])

  // ── Fetch: Journeys ──────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!domainId) return
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
  }, [domainId, journeyListVersion])

  // ── Fetch: Keepers ───────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!domainId) return
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
  }, [domainId, keeperListVersion])

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

  // ── Collapsed state — 36px strip with centered expand chevron ────────────
  if (collapsed) {
    return (
      <div
        className="flex flex-col items-center justify-start pt-3 h-full overflow-hidden"
        style={{
          width: 36,
          minWidth: 36,
          background: "hsl(var(--theme-surface-panel) / 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: "8px",
          border: "1px solid hsl(var(--theme-border-soft) / 0.3)",
        }}
      >
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="p-1.5 rounded-md transition-opacity hover:opacity-70"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          aria-label="Expand navigation panel"
        >
          <ChevronRightIcon />
        </button>
      </div>
    )
  }

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
  const showFrames = def.nav.sections.frames ?? false
  const showBoardDefs = def.nav.sections.boardDefs ?? false
  const instruments: SidebarCardItem[] = (def.nav.instruments ?? []).map((inst) => ({
    id: inst.id,
    label: inst.label,
    isSelected: selectedAgentId === inst.id,
    onClick: () => onAgentSelect?.(inst.id),
  }))

  // ── designer sections: Frames + Board Definitions ────────────────────────

  const frameItems: SidebarCardItem[] = React.useMemo(() => {
    if (!showFrames) return []
    const activeBoard = boardCtx?.selection.activeBoardForFrames ?? "domain"
    const activeKey = boardCtx?.selection.selectedFrameKey ?? null
    const draftSpec = draftCtx?.draftSpecJson ?? null
    const liveFrame = draftCtx?.liveDomainFrame ?? null
    const frames = BOARD_FRAMES[activeBoard] ?? []

    return frames.map((f) => {
      const jsonKey = FRAME_TO_JSON_KEY[f.key] ?? null
      const isDraft = !!(jsonKey && liveFrame && draftSpec
        ? (() => {
            try {
              return JSON.stringify((liveFrame as Record<string, unknown>)[jsonKey])
                !== JSON.stringify((draftSpec as Record<string, unknown>)[jsonKey])
            } catch { return true }
          })()
        : false)

      return {
        id: f.key,
        label: f.name,
        isSelected: f.key === activeKey,
        // Status dot color encoded as a suffix the SidebarCard can render, or
        // we render a custom left slot — handled via description field for now.
        description: isDraft ? "draft" : "live",
        onClick: () => boardCtx?.actions.onFrameSelect(f.key),
      }
    })
  }, [showFrames, boardCtx, draftCtx])

  const boardDefItems: SidebarCardItem[] = React.useMemo(() => {
    if (!showBoardDefs) return []
    const activeDef = boardCtx?.selection.selectedBoardDefId ?? null
    return Object.values(BOARD_DEFINITIONS).map((d) => ({
      id: d.boardId,
      label: d.displayName,
      isSelected: d.boardId === activeDef,
      onClick: () => boardCtx?.actions.onBoardDefSelect(d.boardId),
    }))
  }, [showBoardDefs, boardCtx])

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{
        background: "hsl(var(--theme-surface-panel) / 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: "8px",
        border: "1px solid hsl(var(--theme-border-soft) / 0.3)",
        color: "hsl(var(--theme-ink-primary))",
      }}
    >
      {/* Domain name header — quiet anchor, not interactive */}
      <div
        className="shrink-0 flex items-center justify-between px-3 pt-3 pb-2"
        style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.2)" }}
      >
        <p
          className="text-[11px] font-medium truncate flex-1 min-w-0"
          style={{ color: "hsl(var(--theme-ink-tertiary))", letterSpacing: "0.01em" }}
          title={domainName}
        >
          {domainName}
        </p>
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="shrink-0 ml-1 p-1 rounded-md transition-opacity hover:opacity-60"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          aria-label="Collapse navigation panel"
        >
          <ChevronLeftIcon />
        </button>
      </div>

      {/* Scrollable SidebarCards — space-y-3 matches IDEBoardNav */}
      <div className="keeper-panel-scroll flex-1 min-h-0 space-y-3 overflow-y-auto p-3">

        {/* Dialogs */}
        <SidebarCard
          title="Dialogs"
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

        {/* Journeys */}
        <SidebarCard
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

        {/* Keepers */}
        <SidebarCard
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

        {/* Drafts — def.nav.sections.drafts only */}
        {showDrafts && (
          <>
            <SidebarCard
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
        )}

        {/* Agents — def.nav.sections.agents only */}
        {showAgents && (
          <>
            <SidebarCard
              title="Agents"
              description={!domainId ? "Loading…" : countLabel(agents?.length ?? null, "agent")}
              items={slice("agents", allAgentItems).length ? slice("agents", allAgentItems) : undefined}
              onTitleClick={() => toggleExpanded("agents")}
              onAdd={() => { /* TODO: wire to agent register callback in Moment 2.6 */ }}
            />
            {agentError && (
              <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
                {agentError}
              </p>
            )}
          </>
        )}

        {/* Frames — def.nav.sections.frames only */}
        {showFrames && (
          <FramesSidebarCard
            items={frameItems}
            activeBoardForFrames={boardCtx?.selection.activeBoardForFrames ?? "domain"}
          />
        )}

        {/* Board Definitions — def.nav.sections.boardDefs only */}
        {showBoardDefs && boardDefItems.length > 0 && (
          <SidebarCard
            title="Board Definitions"
            items={boardDefItems}
          />
        )}

        {/* Instruments — def.nav.instruments drives this list */}
        {instruments.length > 0 && (
          <SidebarCard
            title="Instruments"
            items={instruments}
          />
        )}

      </div>
    </div>
  )
}
