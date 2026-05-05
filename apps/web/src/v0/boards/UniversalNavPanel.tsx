"use client"

/**
 * UniversalNavPanel
 * =================
 * KE3P · Keeper Platform · Moment 2.2
 *
 * Standard left nav panel used by all Boards that render data records.
 * Replaces four divergent nav implementations (IDEBoardNav, AgentBoardNav,
 * DomainBoard inline JSX, DesignBoardList) with one component driven by
 * Board context.
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
 *
 * Wiring to Boards happens in Moment 2.6–2.9. This file is a standalone
 * component only — no existing Board is modified.
 */

import * as React from "react"
import { apiFetch } from "../../lib/api"
import { KipApi } from "../../lib/kipApi"
import type { KipDraftSummary } from "../../lib/kipApi"

// ─── Props ────────────────────────────────────────────────────────────────────

export interface UniversalNavPanelProps {
  // Identity — resolved by the Board, never by this component
  domainId: string | null
  domainSlug: string
  domainName: string

  // Board context — drives filtering and instrument section
  boardContext: "ide" | "agent" | "domain" | "designer"

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

// Confirmed from apps/api/src/api/domains/kip-dialogs.ts GET /:domainId/kip/dialogs
// API returns { dialogs: Array<{ id, title, domain_id, user_id, available_to, context, is_archived, session_count, created_at, updated_at }> }
// NOTE: The spec references this field as "name" but the API model field is "title". Using "title" per the confirmed API.
type DialogItem = {
  id: string
  title: string
  updated_at: string
  session_count: number
  context: { board?: string; frame?: string; subject?: string }
  available_to: string[]
}

// Confirmed from apps/api/src/api/journeys.ts GET /
// API returns { success: true, data: { journeys: Journey[], total, page, limit } }
type JourneyItem = {
  id: string
  name: string
  momentCount?: number
  updatedAt: string
}

// Confirmed from apps/api/src/api/keeper/domain-integrated-routes.ts GET /
// API returns { success: true, data: { keepers: Keeper[], total, page, limit } }
// Keeper model has "title" field (not "name") — confirmed from createKeeperSchema in domain-integrated-routes.ts
type KeeperItem = {
  id: string
  title: string
  domainId?: string
}

// Confirmed from apps/api/src/api/agents.ts GET /
// API returns { agents: AgentItem[], total, page, limit }
// NOTE: GET /api/agents accepts domainId query param but the WHERE clause does not use it;
// all agents are returned. This is a known limitation of the current agents endpoint.
type AgentItem = {
  id: string
  name: string
  model: string | null
  model_provider: string | null
  status: string | null
}

type SectionKey = "dialogs" | "journeys" | "keepers" | "drafts" | "agents"

// Maximum records shown in collapsed section state before "Show more"
const SECTION_PREVIEW_LIMIT = 3

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

// ─── SVG Primitives ──────────────────────────────────────────────────────────

function PlusIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
      <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

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

// ─── NavItem — single record row ─────────────────────────────────────────────

interface NavItemProps {
  id: string
  primary: string
  secondary?: string
  isActive: boolean
  onClick?: () => void
}

function NavItem({ primary, secondary, isActive, onClick }: NavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-3 py-1.5 rounded-md transition-colors"
      style={{
        background: isActive
          ? "hsl(var(--theme-surface-selected, var(--theme-surface-elevated)))"
          : "transparent",
      }}
    >
      <p
        className="text-[12px] leading-snug truncate"
        style={{
          color: isActive
            ? "hsl(var(--theme-accent-fg, var(--theme-ink-primary)))"
            : "hsl(var(--theme-ink-primary))",
          fontWeight: isActive ? 500 : 400,
        }}
      >
        {primary}
      </p>
      {secondary && (
        <p
          className="text-[10px] leading-snug truncate mt-0.5"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {secondary}
        </p>
      )}
    </button>
  )
}

// ─── NavSection — section block with header, loading, empty, error, items ────

interface NavSectionItem {
  id: string
  primary: string
  secondary?: string
  isActive?: boolean
  onClick?: () => void
}

interface NavSectionProps {
  title: string
  /** null = loading, [] = empty, [...] = loaded */
  items: NavSectionItem[] | null
  error: string | null
  emptyText: string
  expanded: boolean
  onToggleExpanded: () => void
  onAdd?: () => void
}

function NavSection({
  title,
  items,
  error,
  emptyText,
  expanded,
  onToggleExpanded,
  onAdd,
}: NavSectionProps) {
  const hasMore = items !== null && items.length > SECTION_PREVIEW_LIMIT
  const visibleItems =
    items === null
      ? null
      : expanded
        ? items
        : items.slice(0, SECTION_PREVIEW_LIMIT)

  return (
    <div className="mb-2">
      {/* Section header — title is clickable to toggle expand */}
      <div className="flex items-center justify-between px-3 mb-0.5">
        <button
          type="button"
          onClick={onToggleExpanded}
          className="flex items-center gap-1 transition-opacity hover:opacity-70"
          aria-expanded={expanded}
          aria-label={`Toggle ${title} section`}
        >
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {title}
          </span>
        </button>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add ${title.toLowerCase()}`}
            className="flex items-center justify-center w-5 h-5 rounded transition-opacity hover:opacity-60"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            <PlusIcon />
          </button>
        )}
      </div>

      {/* Loading state */}
      {items === null && (
        <p
          className="px-3 text-[11px] py-0.5"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Loading…
        </p>
      )}

      {/* Empty state — explicit string, not silent */}
      {items !== null && items.length === 0 && (
        <p
          className="px-3 text-[11px] py-0.5"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {emptyText}
        </p>
      )}

      {/* Item list */}
      {items !== null && items.length > 0 && (
        <ul>
          {visibleItems!.map((item) => (
            <li key={item.id}>
              <NavItem
                id={item.id}
                primary={item.primary}
                secondary={item.secondary}
                isActive={item.isActive ?? false}
                onClick={item.onClick}
              />
            </li>
          ))}
        </ul>
      )}

      {/* Show more affordance — expands the section in-place, no navigation */}
      {!expanded && hasMore && (
        <button
          type="button"
          onClick={onToggleExpanded}
          className="w-full text-left px-3 py-0.5 text-[11px] transition-opacity hover:opacity-70"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Show more ({items!.length - SECTION_PREVIEW_LIMIT} more)
        </button>
      )}

      {/* Error state — visible, never silently discarded */}
      {error && (
        <p
          className="px-3 text-[11px] mt-0.5"
          style={{ color: "hsl(var(--destructive))" }}
        >
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UniversalNavPanel({
  domainId,
  domainSlug: _domainSlug, // accepted for API contract completeness; domain resolution is the Board's responsibility
  domainName,
  boardContext,
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

  // ── Fetch: Dialogs ───────────────────────────────────────────────────────
  // Confirmed shape from apps/api/src/api/domains/kip-dialogs.ts GET /:domainId/kip/dialogs:
  //   { dialogs: Array<{ id, title, domain_id, user_id, available_to, context, is_archived, session_count, created_at, updated_at }> }
  //
  // NOTE: The API list endpoint does not support a ?board= query parameter — it filters
  // by ?available_to=admin|keeper scope. boardContext-based filtering (e.g. ?board=ide)
  // is not yet implemented on the server. The resolve/active endpoint supports ?board=
  // but returns a single dialog. The list endpoint is used here to surface multiple
  // recent dialogs. When the API adds board context filtering to the list endpoint,
  // add: &board=${encodeURIComponent(boardContext)} to the URL below.
  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    setDialogs(null)
    setDialogError(null)
    apiFetch(`/api/domains/${encodeURIComponent(domainId)}/kip/dialogs`)
      .then((res: unknown) => {
        if (cancelled) return
        // API returns { dialogs: DialogItem[] }
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
  // Confirmed shape from apps/api/src/api/journeys.ts GET /:
  //   { success: true, data: { journeys: JourneyItem[], total, page, limit } }
  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    setJourneys(null)
    setJourneyError(null)
    apiFetch(`/api/journeys?domainId=${encodeURIComponent(domainId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        // API returns { success: true, data: { journeys: JourneyItem[] } }
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
  // Confirmed shape from apps/api/src/api/keeper/domain-integrated-routes.ts GET /:
  //   { success: true, data: { keepers: KeeperItem[], total, page, limit } }
  // Keeper model field is "title" (not "name") — confirmed from createKeeperSchema.
  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    setKeepers(null)
    setKeeperError(null)
    apiFetch(`/api/keepers?domainId=${encodeURIComponent(domainId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        // API returns { success: true, data: { keepers: KeeperItem[] } }
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

  // ── Fetch: Drafts — only for "ide" and "agent" boardContext ─────────────
  // KipApi.listDrafts calls GET /api/domains/:domainId/kip/drafts
  // Confirmed shape from apps/web/src/lib/kipApi.ts listDrafts method:
  //   Returns KipDraftSummary[] — the method normalises { drafts: [] } | { data: { drafts: [] } }
  React.useEffect(() => {
    if (!domainId) return
    if (boardContext !== "ide" && boardContext !== "agent") return
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
  }, [domainId, boardContext, draftListVersion])

  // ── Fetch: Agents — Layer 2, only for boardContext === "agent" ───────────
  // Confirmed shape from apps/api/src/api/agents.ts GET /:
  //   { agents: AgentItem[], total, page, limit }
  // NOTE: The domainId query param is accepted by the agents endpoint schema but is not
  // currently applied to the Prisma WHERE clause. All agents are returned regardless.
  React.useEffect(() => {
    if (!domainId) return
    if (boardContext !== "agent") return
    let cancelled = false
    setAgents(null)
    setAgentError(null)
    apiFetch(`/api/agents?domainId=${encodeURIComponent(domainId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        // API returns { agents: AgentItem[], total, page, limit }
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
  }, [domainId, boardContext])

  // ── Collapsed state — 36px with centered expand chevron ─────────────────
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

  // ── Derived item arrays ──────────────────────────────────────────────────

  // Dialog items: the spec references the display field as "name" but the API returns "title".
  // Using d.title — the confirmed API field name from kip-dialogs.ts.
  // Secondary label: most recent session timestamp (updated_at) with session count fallback.
  const dialogItems: NavSectionItem[] = (dialogs ?? []).map((d) => ({
    id: d.id,
    primary: d.title?.trim() || "Untitled dialog",
    secondary: d.updated_at
      ? formatDate(d.updated_at)
      : d.session_count != null
        ? `${d.session_count} session${d.session_count === 1 ? "" : "s"}`
        : undefined,
    isActive: d.id === selectedDialogId,
    onClick: () => onDialogSelect?.(d.id),
  }))

  const journeyItems: NavSectionItem[] = (journeys ?? []).map((j) => ({
    id: j.id,
    primary: j.name?.trim() || "Untitled journey",
    secondary:
      j.momentCount != null
        ? `${j.momentCount} moment${j.momentCount === 1 ? "" : "s"}`
        : j.updatedAt
          ? formatDate(j.updatedAt)
          : undefined,
    isActive: j.id === selectedJourneyId,
    onClick: () => onJourneySelect?.(j.id),
  }))

  const keeperItems: NavSectionItem[] = (keepers ?? []).map((k) => ({
    id: k.id,
    primary: k.title?.trim() || "Untitled keeper",
    isActive: k.id === selectedKeeperId,
    onClick: () => onKeeperSelect?.(k.id),
  }))

  const draftItems: NavSectionItem[] = (drafts ?? []).map((d) => ({
    id: d.id,
    primary: d.title?.trim() || "Untitled draft",
    secondary: d.updatedAt
      ? formatDate(typeof d.updatedAt === "string" ? d.updatedAt : d.updatedAt?.toString())
      : undefined,
    isActive: d.id === selectedDraftId,
    onClick: () => onDraftSelect?.(d.id),
  }))

  const agentItems: NavSectionItem[] = (agents ?? []).map((a) => ({
    id: a.id,
    primary: a.name?.trim() || "Unnamed agent",
    secondary: a.model ?? a.model_provider ?? undefined,
    isActive: a.id === selectedAgentId,
    onClick: () => onAgentSelect?.(a.id),
  }))

  // Layer 2: static instrument items for IDE and Designer contexts.
  // Well-known identifiers: "cloud" → Cloud instrument, "rendr" → Rendr instrument.
  // The onAgentSelect callback is reused for instrument selection (agent-like interaction).
  const ideStaticInstruments = [
    { id: "cloud", label: "Cloud" },
    { id: "rendr", label: "Rendr" },
  ]
  const designerStaticInstruments = [{ id: "rendr", label: "Rendr" }]

  const showDrafts = boardContext === "ide" || boardContext === "agent"
  const showInstruments = boardContext !== "domain"

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
      {/* Domain name — Layer 1 header. Quiet anchor — not interactive. */}
      <div
        className="shrink-0 flex items-center justify-between px-3 pt-3 pb-2"
        style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.2)" }}
      >
        <p
          className="text-[11px] font-medium truncate flex-1 min-w-0"
          style={{
            color: "hsl(var(--theme-ink-tertiary))",
            letterSpacing: "0.01em",
          }}
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

      {/* Scrollable section body */}
      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto py-2">

        {/* ── Layer 1: Domain Records ──────────────────────────────────────── */}

        {/* Dialogs */}
        <NavSection
          title="Dialogs"
          items={!domainId ? null : dialogs === null ? null : dialogItems}
          error={dialogError}
          emptyText="No dialogs yet"
          expanded={expanded.has("dialogs")}
          onToggleExpanded={() => toggleExpanded("dialogs")}
          onAdd={() => { /* TODO: wire to dialog create callback in Moment 2.6 */ }}
        />

        {/* Journeys */}
        <NavSection
          title="Journeys"
          items={!domainId ? null : journeys === null ? null : journeyItems}
          error={journeyError}
          emptyText="No journeys yet"
          expanded={expanded.has("journeys")}
          onToggleExpanded={() => toggleExpanded("journeys")}
          onAdd={() => { /* TODO: wire to journey create callback in Moment 2.6 */ }}
        />

        {/* Keepers */}
        <NavSection
          title="Keepers"
          items={!domainId ? null : keepers === null ? null : keeperItems}
          error={keeperError}
          emptyText="No keepers yet"
          expanded={expanded.has("keepers")}
          onToggleExpanded={() => toggleExpanded("keepers")}
          onAdd={() => { /* TODO: wire to keeper create callback in Moment 2.6 */ }}
        />

        {/* Drafts — only for "ide" and "agent" boardContext */}
        {showDrafts && (
          <NavSection
            title="Drafts"
            items={!domainId ? null : drafts === null ? null : draftItems}
            error={draftError}
            emptyText="No drafts yet"
            expanded={expanded.has("drafts")}
            onToggleExpanded={() => toggleExpanded("drafts")}
            onAdd={() => { /* TODO: wire to draft create callback in Moment 2.6 */ }}
          />
        )}

        {/* ── Layer 2: Board Instruments ───────────────────────────────────── */}
        {/* Visually lighter — smaller type, distinct section label, gap from Layer 1 */}
        {/* No divider line — separation via spacing and typographic weight shift only */}

        {showInstruments && (
          <div className="mt-3">
            <div className="px-3 mb-1">
              <span
                className="text-[9px] font-semibold uppercase tracking-widest"
                style={{ color: "hsl(var(--theme-ink-tertiary) / 0.6)" }}
              >
                Instruments
              </span>
            </div>

            {/* "ide" → Cloud and Rendr — static named items */}
            {boardContext === "ide" && (
              <ul>
                {ideStaticInstruments.map((inst) => (
                  <li key={inst.id}>
                    <button
                      type="button"
                      onClick={() => onAgentSelect?.(inst.id)}
                      className="w-full text-left px-3 py-1.5 rounded-md transition-colors"
                      style={{
                        background:
                          inst.id === selectedAgentId
                            ? "hsl(var(--theme-surface-selected, var(--theme-surface-elevated)))"
                            : "transparent",
                      }}
                    >
                      <p
                        className="text-[11px] leading-snug"
                        style={{
                          color:
                            inst.id === selectedAgentId
                              ? "hsl(var(--theme-accent-fg, var(--theme-ink-primary)))"
                              : "hsl(var(--theme-ink-secondary))",
                          fontWeight: inst.id === selectedAgentId ? 500 : 400,
                        }}
                      >
                        {inst.label}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* "agent" → Agents — fetched from /api/agents */}
            {boardContext === "agent" && (
              <NavSection
                title="Agents"
                items={!domainId ? null : agents === null ? null : agentItems}
                error={agentError}
                emptyText="No agents registered"
                expanded={expanded.has("agents")}
                onToggleExpanded={() => toggleExpanded("agents")}
                onAdd={() => { /* TODO: wire to agent register callback in Moment 2.6 */ }}
              />
            )}

            {/* "designer" → Rendr — static named item */}
            {boardContext === "designer" && (
              <ul>
                {designerStaticInstruments.map((inst) => (
                  <li key={inst.id}>
                    <button
                      type="button"
                      onClick={() => onAgentSelect?.(inst.id)}
                      className="w-full text-left px-3 py-1.5 rounded-md transition-colors"
                      style={{
                        background:
                          inst.id === selectedAgentId
                            ? "hsl(var(--theme-surface-selected, var(--theme-surface-elevated)))"
                            : "transparent",
                      }}
                    >
                      <p
                        className="text-[11px] leading-snug"
                        style={{
                          color:
                            inst.id === selectedAgentId
                              ? "hsl(var(--theme-accent-fg, var(--theme-ink-primary)))"
                              : "hsl(var(--theme-ink-secondary))",
                          fontWeight: inst.id === selectedAgentId ? 500 : 400,
                        }}
                      >
                        {inst.label}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {/* "domain" → No instruments — this branch is guarded by showInstruments above */}
          </div>
        )}
      </div>
    </div>
  )
}
