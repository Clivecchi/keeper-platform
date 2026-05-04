"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"
import { getApiBase } from "../../../lib/apiFetch"
import type { KipDraftSummary } from "../../../lib/kipApi"

// ─── Props ────────────────────────────────────────────────────────────────────

interface AgentBoardNavProps {
  domainSlug: string
  /** Board-resolved domainId. Keeper fetch fires only when this is non-null. */
  domainId: string | null
  onAgentSelect?: (agentId: string) => void
  selectedAgentId?: string | null
  onDraftSelect?: (draftId: string) => void
  selectedDraftId?: string | null
  drafts?: KipDraftSummary[] | null
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentItem = {
  id: string
  name: string
  model: string | null
  model_provider: string | null
  status: string | null
}

type JourneyItem = { id: string; name: string; createdAt: string }
type KeeperItem  = { id: string; name: string; type?: string; createdAt?: string }

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

// ─── NavSection (secondary) ───────────────────────────────────────────────────

interface NavSectionProps {
  title: string
  items: Array<{ id: string; primary: string; secondary: string; onClick?: () => void; isActive?: boolean }> | null
  emptyText: string
}

function NavSection({ title, items, emptyText }: NavSectionProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between px-3 mb-1">
        <span
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {title}
        </span>
        <button
          type="button"
          aria-label={`Add ${title.toLowerCase()}`}
          className="flex items-center justify-center w-5 h-5 rounded transition-opacity hover:opacity-60"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {items === null ? (
        <p className="px-3 text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Loading…
        </p>
      ) : items.length === 0 ? (
        <p className="px-3 text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          {emptyText}
        </p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={item.onClick}
                className="w-full text-left px-3 py-1.5 rounded-md transition-colors"
                style={{
                  background: item.isActive
                    ? "hsl(var(--theme-accent-subtle, var(--theme-surface-elevated)))"
                    : "transparent",
                }}
              >
                <p
                  className="text-[12px] leading-snug truncate"
                  style={{
                    color: item.isActive
                      ? "hsl(var(--theme-accent-fg, var(--theme-ink-primary)))"
                      : "hsl(var(--theme-ink-primary))",
                  }}
                >
                  {item.primary}
                </p>
                <p
                  className="text-[10px] leading-snug truncate"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                >
                  {item.secondary}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentBoardNav({ domainSlug, domainId, onAgentSelect, selectedAgentId, onDraftSelect, selectedDraftId, drafts }: AgentBoardNavProps) {
  const [agents, setAgents]         = React.useState<AgentItem[] | null>(null)
  const [journeys, setJourneys]     = React.useState<JourneyItem[] | null>(null)
  const [keepers, setKeepers]       = React.useState<KeeperItem[] | null>(null)
  const [showAllKeepers, setShowAllKeepers] = React.useState(false)
  const [moreOpen, setMoreOpen]     = React.useState(false)

  // Agents — auth-protected; degrade to empty on failure
  React.useEffect(() => {
    let cancelled = false
    apiFetch("/api/agents")
      .then((res: unknown) => {
        if (cancelled) return
        const list = (res as { agents?: AgentItem[] })?.agents ?? []
        setAgents(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) setAgents([])
      })
    return () => { cancelled = true }
  }, [])

  // Journeys — public endpoint, no auth required
  React.useEffect(() => {
    if (!domainSlug) return
    let cancelled = false
    const base = getApiBase()
    fetch(`${base}/api/public/${encodeURIComponent(domainSlug)}/journeys`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { journeys?: JourneyItem[] }) => {
        if (!cancelled) setJourneys(Array.isArray(json.journeys) ? json.journeys : [])
      })
      .catch(() => { if (!cancelled) setJourneys([]) })
    return () => { cancelled = true }
  }, [domainSlug])

  // Keepers — fires from Board-resolved domainId (no duplicate domain slug resolution).
  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    apiFetch(`/api/keepers?domainId=${encodeURIComponent(domainId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        // CONFIRMED: GET /api/keepers returns { success: true, data: { keepers: KeeperItem[] } }
        const list = (res as { data?: { keepers?: KeeperItem[] } })?.data?.keepers ?? []
        setKeepers(Array.isArray(list) ? (list as KeeperItem[]) : [])
      })
      .catch(() => { if (!cancelled) setKeepers([]) })
    return () => { cancelled = true }
  }, [domainId])

  // ─── Derived items ──────────────────────────────────────────────────────────

  const journeyItems =
    journeys?.slice(0, 5).map((j) => ({
      id: j.id,
      primary: j.name?.trim() || "Untitled journey",
      secondary: formatDate(j.createdAt),
    })) ?? null

  const KEEPER_INITIAL_LIMIT = 10
  const keeperItems =
    keepers?.map((k) => ({
      id: k.id,
      primary: k.name?.trim() || "Untitled keeper",
      secondary: k.type ?? "Keeper",
    })) ?? null
  const visibleKeeperItems = keeperItems
    ? showAllKeepers
      ? keeperItems
      : keeperItems.slice(0, KEEPER_INITIAL_LIMIT)
    : null

  const draftItems =
    drafts == null
      ? null
      : drafts.slice(0, 5).map((d) => ({
          id: d.id,
          primary: d.title?.trim() || "Untitled draft",
          secondary: formatDate(typeof d.updatedAt === "string" ? d.updatedAt : d.updatedAt?.toString()),
          isActive: d.id === selectedDraftId,
          onClick: () => onDraftSelect?.(d.id),
        }))

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      {/* Scrollable content */}
      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto py-3">

        {/* ── PRIMARY: Agents ─────────────────────────────────────────────── */}
        <div className="mb-4">
          <div className="flex items-center justify-between px-3 mb-1">
            <span
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              Agents
            </span>
            <button
              type="button"
              aria-label="Register agent"
              className="flex items-center justify-center w-5 h-5 rounded transition-opacity hover:opacity-60"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {agents === null ? (
            <p className="px-3 text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              Loading…
            </p>
          ) : agents.length === 0 ? (
            <p className="px-3 text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              No agents registered
            </p>
          ) : (
            <ul>
              {agents.map((agent) => {
                const isActive = agent.id === selectedAgentId
                return (
                  <li key={agent.id}>
                    <button
                      type="button"
                      onClick={() => onAgentSelect?.(agent.id)}
                      className="w-full text-left px-3 py-2 rounded-md mx-0 transition-colors"
                      style={{
                        background: isActive
                          ? "hsl(var(--theme-accent-subtle, var(--theme-surface-elevated)))"
                          : "transparent",
                      }}
                    >
                      <p
                        className="text-[12px] leading-snug truncate font-medium"
                        style={{
                          color: isActive
                            ? "hsl(var(--theme-accent-fg, var(--theme-ink-primary)))"
                            : "hsl(var(--theme-ink-primary))",
                        }}
                      >
                        {agent.name}
                      </p>
                      <p
                        className="text-[10px] leading-snug truncate font-mono mt-0.5"
                        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                      >
                        {agent.model ?? agent.model_provider ?? "—"}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Divider between primary and secondary */}
        <div
          className="mx-3 mb-3 border-t"
          style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
        />

        {/* ── SECONDARY: Journeys, Keepers, Drafts ────────────────────────── */}
        <NavSection title="Journeys" items={journeyItems} emptyText="No journeys yet" />

        {/* Keepers with "Show all" affordance when count exceeds initial limit */}
        <NavSection title="Keepers" items={visibleKeeperItems} emptyText="No keepers yet" />
        {!showAllKeepers && keeperItems && keeperItems.length > KEEPER_INITIAL_LIMIT && (
          <button
            type="button"
            onClick={() => setShowAllKeepers(true)}
            className="w-full text-left px-3 pb-2 text-[11px] transition-opacity hover:opacity-70"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Show all ({keeperItems.length})
          </button>
        )}

        <NavSection title="Drafts" items={draftItems} emptyText="No drafts yet" />
      </div>

      {/* ··· More — pinned to bottom */}
      <div
        className="shrink-0 border-t px-3 py-2"
        style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
      >
        <button
          type="button"
          onClick={() => setMoreOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-1 py-1 rounded-sm transition-opacity hover:opacity-70"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          aria-expanded={moreOpen}
          aria-label="More options"
        >
          <span className="text-[15px] leading-none tracking-widest select-none">···</span>
          <span className="text-[11px] font-medium">More</span>
        </button>
        {moreOpen && (
          <ul className="mt-1 space-y-0.5 pb-1">
            {(["Dialogue", "Configuration", "Diagnostics"] as const).map((label) => (
              <li key={label}>
                {/* TODO: wire to frame navigation when available */}
                <button
                  type="button"
                  className="w-full text-left px-1 py-1 rounded-sm text-[11px] transition-opacity hover:opacity-70"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
