"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"
import { getApiBase } from "../../../lib/apiFetch"
import { KipApi } from "../../../lib/kipApi"
import { useV0Shell, type V0FrameKey } from "../../shell/V0ShellContext"
import { SidebarCard, type SidebarCardItem } from "../../components/SidebarCard"

// ─── All registered boards ────────────────────────────────────────────────────
// Sourced from boardRegistry — kept static since the registry rarely changes.
const BOARDS: Array<{ key: string; label: string }> = [
  { key: "designer", label: "Design Board" },
  { key: "domain",   label: "Domain Board" },
  { key: "agent",    label: "Agent Board" },
  { key: "ide",      label: "IDE Board" },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface IDEBoardNavProps {
  domainSlug: string
  selectedJourneyId: string | null
  onSelectJourney: (id: string) => void
}

// ─── Types ───────────────────────────────────────────────────────────────────

type JourneyItem = { id: string; name: string; createdAt: string }
type DraftItem   = { id: string; title: string; createdAt: string }
type SessionItem = { id: string; title: string }

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

function navigateToBoard(key: string) {
  const url = new URL(window.location.href)
  url.searchParams.set("board", key)
  url.searchParams.delete("frame")
  window.location.href = url.toString()
}

// ─── Component ────────────────────────────────────────────────────────────────

export function IDEBoardNav({ domainSlug, selectedJourneyId, onSelectJourney }: IDEBoardNavProps) {
  const { navigateToFrame } = useV0Shell()
  const [journeys, setJourneys] = React.useState<JourneyItem[] | null>(null)
  const [drafts, setDrafts]     = React.useState<DraftItem[] | null>(null)
  const [sessions, setSessions] = React.useState<SessionItem[] | null>(null)
  const [moreOpen, setMoreOpen] = React.useState(false)

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

  // Drafts — auth-protected; degrade to empty on failure
  React.useEffect(() => {
    if (!domainSlug) return
    let cancelled = false
    apiFetch(`/api/v0/moments?domainSlug=${encodeURIComponent(domainSlug)}&status=draft&limit=10`)
      .then((res: unknown) => {
        if (cancelled) return
        const list = (res as { data?: unknown })?.data ?? []
        setDrafts(Array.isArray(list) ? (list as DraftItem[]) : [])
      })
      .catch(() => { if (!cancelled) setDrafts([]) })
    return () => { cancelled = true }
  }, [domainSlug])

  // Sessions — resolve Kip agent then fetch recent sessions
  React.useEffect(() => {
    let cancelled = false
    KipApi.getLeadAgent("kip")
      .then((agent) => KipApi.getSessionsByAgentId(agent.id))
      .then((raw) => {
        if (cancelled) return
        const items = (Array.isArray(raw) ? raw : [])
          .slice(0, 5)
          .map((s) => ({
            id: s.id,
            title:
              (s.topic as string | undefined)?.trim() ||
              s.session_name?.trim() ||
              `Session · ${formatDate(s.updated_at ? new Date(s.updated_at).toISOString() : undefined)}`,
          }))
        setSessions(items)
      })
      .catch(() => { if (!cancelled) setSessions([]) })
    return () => { cancelled = true }
  }, [])

  // ─── SidebarCard item arrays ─────────────────────────────────────────────────

  const journeyItems: SidebarCardItem[] = (journeys ?? []).slice(0, 5).map((j) => ({
    id: j.id,
    label: j.name?.trim() || "Untitled journey",
    onClick: () => onSelectJourney(j.id),
  }))

  const draftItems: SidebarCardItem[] = (drafts ?? []).slice(0, 5).map((d) => ({
    id: d.id,
    label: d.title?.trim() || "Untitled draft",
    onClick: () => navigateToFrame("moment" as V0FrameKey, { draftId: d.id }),
  }))

  const sessionItems: SidebarCardItem[] = (sessions ?? []).map((s) => ({
    id: s.id,
    label: s.title,
  }))

  const boardItems: SidebarCardItem[] = BOARDS.map((b) => ({
    id: b.key,
    label: b.label,
    onClick: () => navigateToBoard(b.key),
  }))

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      {/* Scrollable section cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        <SidebarCard
          title="Journeys"
          description={countLabel(journeys?.length ?? null, "journey")}
          items={journeyItems.length ? journeyItems : undefined}
        />
        <SidebarCard
          title="Drafts"
          description={countLabel(drafts?.length ?? null, "draft")}
          items={draftItems.length ? draftItems : undefined}
        />
        <SidebarCard
          title="Sessions"
          description={countLabel(sessions?.length ?? null, "session")}
          items={sessionItems.length ? sessionItems : undefined}
        />
        <SidebarCard
          title="Boards"
          description="Switch to another board"
          items={boardItems}
        />
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
