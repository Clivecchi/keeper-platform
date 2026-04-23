"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"
import { getApiBase } from "../../../lib/apiFetch"
import { KipApi } from "../../../lib/kipApi"
import type { KipDraftSummary } from "../../../lib/kipApi"
import { useV0Shell, type V0FrameKey } from "../../shell/V0ShellContext"
import { SidebarCard, type SidebarCardItem } from "../../components/SidebarCard"
import type { IDEBoardActiveContext } from "./IDEBoard"

// ─── Props ────────────────────────────────────────────────────────────────────

interface IDEBoardNavProps {
  domainSlug: string
  setActiveContext: React.Dispatch<React.SetStateAction<IDEBoardActiveContext>>
  onSelectSession: (id: string) => void
}

// ─── Types ───────────────────────────────────────────────────────────────────

type JourneyItem = { id: string; name: string; createdAt: string }
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

// ─── Component ────────────────────────────────────────────────────────────────

export function IDEBoardNav({ domainSlug, setActiveContext, onSelectSession }: IDEBoardNavProps) {
  const { navigateToFrame } = useV0Shell()
  const [domainId, setDomainId] = React.useState<string | null>(null)
  const [journeys, setJourneys] = React.useState<JourneyItem[] | null>(null)
  const [drafts, setDrafts]     = React.useState<KipDraftSummary[] | null>(null)
  const [sessions, setSessions] = React.useState<SessionItem[] | null>(null)
  const [moreOpen, setMoreOpen] = React.useState(false)

  // Resolve domainId from domainSlug — needed for drafts
  React.useEffect(() => {
    if (!domainSlug) return
    let cancelled = false
    apiFetch(`/api/domains/by-slug/${encodeURIComponent(domainSlug)}`)
      .then((res: any) => {
        if (!cancelled && res?.id) setDomainId(res.id)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [domainSlug])

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

  // Drafts — same endpoint as AgentBoardFrame: /api/domains/{domainId}/kip/drafts
  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    KipApi.listDrafts(domainId)
      .then((list) => {
        if (!cancelled) setDrafts(list)
      })
      .catch(() => { if (!cancelled) setDrafts([]) })
    return () => { cancelled = true }
  }, [domainId])

  // Sessions — resolve Kip agent then fetch sessions (up to 50; display slices below)
  React.useEffect(() => {
    let cancelled = false
    KipApi.getLeadAgent("kip")
      .then((agent) => KipApi.getSessionsByAgentId(agent.id, { pageSize: 50 }))
      .then((raw) => {
        if (cancelled) return
        const items = (Array.isArray(raw) ? raw : []).map((s) => ({
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
    onClick: () => setActiveContext({ type: "journey", id: j.id }),
  }))

  const draftItems: SidebarCardItem[] = (drafts ?? []).slice(0, 5).map((d) => ({
    id: d.id,
    label: d.title?.trim() || "Untitled draft",
    onClick: () => navigateToFrame("moment" as V0FrameKey, { draftId: d.id }),
  }))

  const sessionItems: SidebarCardItem[] = (sessions ?? [])
    .slice(0, 50)
    .map((s) => ({
      id: s.id,
      label: s.title,
      onClick: () => onSelectSession(s.id),
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
