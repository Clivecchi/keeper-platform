"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"
import { KipApi } from "../../../lib/kipApi"
import type { KipDraftSummary } from "../../../lib/kipApi"
import { useV0Shell, type V0FrameKey } from "../../shell/V0ShellContext"
import { useFrameContextOptional } from "../../shell/FrameContext"
import { SidebarCard, type SidebarCardItem } from "../../components/SidebarCard"

// ─── Props ────────────────────────────────────────────────────────────────────

interface IDEBoardNavProps {
  domainSlug: string
  /** Resolved domain id (parent fetches from slug) */
  domainId: string | null
  activeJourneyId: string | null
  onJourneySelect: (id: string) => void
  selectedDraftId: string | null
  onDraftSelect: (id: string) => void
  activeSessionId: string | null
  onSessionSelect: (id: string) => void
  /** Bumps when a new draft is created in-panel so the list can refresh */
  draftListVersion: number
  /** Bumps when a session is renamed so the list re-fetches */
  sessionListVersion?: number
  /** Called when a keeper is clicked in the nav */
  onKeeperSelect?: (id: string) => void
  /** Provides the parent with the fetched sessions list for title derivation */
  onSessionsLoaded?: (sessions: { id: string; title: string }[]) => void
}

// ─── Types ───────────────────────────────────────────────────────────────────

type JourneyItem = { id: string; name: string; momentCount?: number }
type KeeperItem = { id: string; title: string }
type SessionItem = { id: string; title: string }

type SectionKey = "drafts" | "journeys" | "keepers" | "sessions"

const PREVIEW_LIMIT: Record<SectionKey, number> = {
  drafts: 5,
  journeys: 4,
  keepers: 4,
  sessions: 5,
}

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

// ─── Component ────────────────────────────────────────────────────────────────

export function IDEBoardNav({
  domainSlug: _domainSlug,
  domainId,
  activeJourneyId,
  onJourneySelect,
  selectedDraftId,
  onDraftSelect,
  activeSessionId,
  onSessionSelect,
  draftListVersion,
  sessionListVersion,
  onKeeperSelect,
  onSessionsLoaded,
}: IDEBoardNavProps) {
  const { navigateToFrame } = useV0Shell()
  const frameCtx = useFrameContextOptional()
  const activeKeeperId = frameCtx?.selection.activeKeeperId ?? null

  const [journeys, setJourneys] = React.useState<JourneyItem[] | null>(null)
  const [keepers, setKeepers] = React.useState<KeeperItem[] | null>(null)
  const [drafts, setDrafts] = React.useState<KipDraftSummary[] | null>(null)
  const [sessions, setSessions] = React.useState<SessionItem[] | null>(null)
  const [moreOpen, setMoreOpen] = React.useState(false)

  // Which sections are expanded to show full list
  const [expanded, setExpanded] = React.useState<Set<SectionKey>>(new Set())
  const toggleExpanded = React.useCallback((section: SectionKey) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(section)) next.delete(section)
      else next.add(section)
      return next
    })
  }, [])

  // ── Journeys + Keepers ────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    Promise.all([
      apiFetch(`/api/journeys?domainId=${domainId}`).catch(() => null),
      apiFetch(`/api/keepers?domainId=${domainId}`).catch(() => null),
    ]).then(([journeysRes, keepersRes]) => {
      if (cancelled) return
      setJourneys(
        ((journeysRes as any)?.data?.journeys ?? (journeysRes as any)?.journeys ?? []) as JourneyItem[],
      )
      setKeepers(
        ((keepersRes as any)?.data?.keepers ?? (keepersRes as any)?.keepers ?? []) as KeeperItem[],
      )
    }).catch(() => {
      if (!cancelled) { setJourneys([]); setKeepers([]) }
    })
    return () => { cancelled = true }
  }, [domainId])

  // ── Drafts (filtered by active keeper, same as AgentBoardFrame) ───────────

  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    KipApi.listDrafts(domainId, activeKeeperId)
      .then((list) => { if (!cancelled) setDrafts(list) })
      .catch(() => { if (!cancelled) setDrafts([]) })
    return () => { cancelled = true }
  }, [domainId, activeKeeperId, draftListVersion])

  // ── Sessions ──────────────────────────────────────────────────────────────

  React.useEffect(() => {
    let cancelled = false
    KipApi.getLeadAgent("kip")
      .then((agent) => KipApi.getSessionsByAgentId(agent.id, { pageSize: 50 }))
      .then((raw) => {
        if (cancelled) return
        const items = (Array.isArray(raw) ? raw : []).map((s) => ({
          id: s.id,
          title:
            s.session_name?.trim() ||
            (s.topic as string | undefined)?.trim() ||
            `Session · ${formatDate(s.updated_at ? new Date(s.updated_at).toISOString() : undefined)}`,
        }))
        setSessions(items)
        onSessionsLoaded?.(items)
      })
      .catch(() => { if (!cancelled) setSessions([]) })
    return () => { cancelled = true }
    // sessionListVersion triggers re-fetch when a session is renamed
  }, [sessionListVersion, onSessionsLoaded])

  // ── Derived item arrays ───────────────────────────────────────────────────

  const allJourneyItems: SidebarCardItem[] = (journeys ?? []).map((j) => ({
    id: j.id,
    label: `${j.name?.trim() || "Untitled journey"}${j.momentCount != null ? ` · ${j.momentCount} moments` : ""}`,
    isSelected: activeJourneyId === j.id,
    onClick: () => onJourneySelect(j.id),
  }))

  const allKeeperItems: SidebarCardItem[] = (keepers ?? []).map((k) => ({
    id: k.id,
    label: k.title?.trim() || "Untitled keeper",
    isSelected: activeKeeperId === k.id,
    onClick: () => {
      frameCtx?.setActiveKeeperId(k.id)
      onKeeperSelect?.(k.id)
    },
  }))

  const allDraftItems: SidebarCardItem[] = (drafts ?? []).map((d) => {
    const keeperName = d.keeperId ? (keepers ?? []).find((k) => k.id === d.keeperId)?.title : null
    return {
      id: d.id,
      label: keeperName
        ? `${d.title?.trim() || "Untitled draft"} · ${keeperName}`
        : (d.title?.trim() || "Untitled draft"),
      isSelected: selectedDraftId === d.id,
      onClick: () => onDraftSelect(d.id),
    }
  })

  const allSessionItems: SidebarCardItem[] = (sessions ?? []).map((s) => ({
    id: s.id,
    label: s.title,
    isSelected: activeSessionId === s.id,
    onClick: () => onSessionSelect(s.id),
  }))

  // Apply preview slice unless section is expanded
  const slice = <T,>(section: SectionKey, items: T[]): T[] =>
    expanded.has(section) ? items : items.slice(0, PREVIEW_LIMIT[section])

  const journeyItems = slice("journeys", allJourneyItems)
  const keeperItems = slice("keepers", allKeeperItems)
  const draftItems = slice("drafts", allDraftItems)
  const sessionItems = slice("sessions", allSessionItems)

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ color: "var(--theme-ink-primary-color)" }}
    >
      {/* Scrollable section cards */}
      <div className="keeper-panel-scroll flex-1 min-h-0 space-y-3 overflow-y-auto p-3">
        <SidebarCard
          title="Drafts"
          description={countLabel(drafts?.length ?? null, "draft")}
          items={draftItems.length ? draftItems : undefined}
          onTitleClick={() => toggleExpanded("drafts")}
        />
        <SidebarCard
          title="Journeys"
          description={countLabel(journeys?.length ?? null, "journey")}
          items={journeyItems.length ? journeyItems : undefined}
          onTitleClick={() => toggleExpanded("journeys")}
        />
        <SidebarCard
          title="Keepers"
          description={countLabel(keepers?.length ?? null, "keeper")}
          items={keeperItems.length ? keeperItems : undefined}
          onTitleClick={() => toggleExpanded("keepers")}
        />
        <SidebarCard
          title="Sessions"
          description={countLabel(sessions?.length ?? null, "session")}
          items={sessionItems.length ? sessionItems : undefined}
          onTitleClick={() => toggleExpanded("sessions")}
        />
      </div>

      {/* ··· More — pinned to bottom */}
      <div
        className="shrink-0 border-t px-3 py-2"
        style={{ borderColor: "hsl(var(--theme-border-soft))" }}
      >
        <button
          type="button"
          onClick={() => setMoreOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-1 py-1 rounded-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--theme-ink-tertiary-color)" }}
          aria-expanded={moreOpen}
          aria-label="More frames"
        >
          <span className="text-[15px] leading-none tracking-widest select-none">···</span>
          <span className="text-[11px] font-medium">More</span>
        </button>
        {moreOpen && (
          <ul className="mt-1 space-y-0.5 pb-1">
            {(["Feed", "Admin", "Diagnostics"] as const).map((label) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => navigateToFrame(label.toLowerCase() as V0FrameKey)}
                  className="w-full text-left px-1 py-1 rounded-sm text-[11px] transition-opacity hover:opacity-70"
                  style={{ color: "var(--theme-ink-secondary-color)" }}
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
