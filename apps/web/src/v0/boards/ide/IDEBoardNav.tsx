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
  /** Provides the parent with the fetched sessions list for title derivation and recency */
  onSessionsLoaded?: (sessions: { id: string; title: string; updatedAt: string }[]) => void
  /** Called after a new journey is confirmed by the API — parent keeps its list in sync */
  onJourneyCreated?: (journey: { id: string; name: string }) => void
  /** Called after a new keeper is confirmed by the API — parent keeps its list in sync */
  onKeeperCreated?: (keeper: { id: string; title: string }) => void
}

// ─── Types ───────────────────────────────────────────────────────────────────

type JourneyItem = { id: string; name: string; momentCount?: number }
type KeeperItem = { id: string; title: string }
type SessionItem = { id: string; title: string; updatedAt: string }

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
  onJourneyCreated,
  onKeeperCreated,
}: IDEBoardNavProps) {
  const { navigateToFrame } = useV0Shell()
  const frameCtx = useFrameContextOptional()
  const activeKeeperId = frameCtx?.selection.activeKeeperId ?? null

  const [journeys, setJourneys] = React.useState<JourneyItem[] | null>(null)
  const [keepers, setKeepers] = React.useState<KeeperItem[] | null>(null)
  const [drafts, setDrafts] = React.useState<KipDraftSummary[] | null>(null)
  const [sessions, setSessions] = React.useState<SessionItem[] | null>(null)
  const [moreOpen, setMoreOpen] = React.useState(false)

  // Per-section error messages — shown below the relevant SidebarCard
  const [sectionErrors, setSectionErrors] = React.useState<Partial<Record<SectionKey, string>>>({})

  // Cached lead-agent id so creation doesn't need a fresh agent fetch
  const leadAgentIdRef = React.useRef<string | null>(null)

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
      .then((agent) => {
        leadAgentIdRef.current = agent.id
        return KipApi.getSessionsByAgentId(agent.id, { pageSize: 50 })
      })
      .then((raw) => {
        if (cancelled) return
        const items = (Array.isArray(raw) ? raw : []).map((s) => ({
          id: s.id,
          title:
            s.session_name?.trim() ||
            (s.topic as string | undefined)?.trim() ||
            `Session · ${formatDate(s.updated_at ? new Date(s.updated_at).toISOString() : undefined)}`,
          updatedAt: s.updated_at ? new Date(s.updated_at).toISOString() : "",
        }))
        setSessions(items)
        onSessionsLoaded?.(items)
      })
      .catch(() => { if (!cancelled) setSessions([]) })
    return () => { cancelled = true }
    // sessionListVersion triggers re-fetch when a session is renamed
  }, [sessionListVersion, onSessionsLoaded])

  // ── Creation handlers ─────────────────────────────────────────────────────

  const handleCreateSession = React.useCallback(async () => {
    const agentId = leadAgentIdRef.current
    if (!agentId) return
    setSectionErrors((prev) => ({ ...prev, sessions: undefined }))
    const tempId = `__opt_${Date.now()}`
    const now = new Date().toISOString()
    const optimistic: SessionItem = { id: tempId, title: "New Session", updatedAt: now }
    setSessions((prev) => [optimistic, ...(prev ?? [])])
    try {
      const session = await KipApi.createSession(agentId, undefined, "New Session")
      const confirmed: SessionItem = {
        id: session.id,
        title: session.session_name?.trim() || "New Session",
        updatedAt: session.updated_at ? new Date(session.updated_at).toISOString() : now,
      }
      setSessions((prev) => {
        const next = (prev ?? []).map((s) => (s.id === tempId ? confirmed : s))
        onSessionsLoaded?.(next)
        return next
      })
      onSessionSelect(session.id)
    } catch {
      setSessions((prev) => (prev ?? []).filter((s) => s.id !== tempId))
      setSectionErrors((prev) => ({ ...prev, sessions: "Failed to create session" }))
    }
  }, [onSessionSelect, onSessionsLoaded])

  const handleCreateJourney = React.useCallback(async () => {
    if (!domainId) return
    setSectionErrors((prev) => ({ ...prev, journeys: undefined }))
    const tempId = `__opt_${Date.now()}`
    const optimistic: JourneyItem = { id: tempId, name: "New Journey" }
    setJourneys((prev) => [optimistic, ...(prev ?? [])])
    try {
      const res = await apiFetch("/api/journeys", {
        method: "POST",
        body: JSON.stringify({ domainId, name: "New Journey" }),
      })
      const raw = (res as any)?.journey ?? (res as any)?.data?.journey ?? res
      const realId: string = raw?.id
      if (!realId || typeof realId !== "string") throw new Error("Invalid journey response")
      const confirmed: JourneyItem = { id: realId, name: raw?.name ?? "New Journey" }
      setJourneys((prev) => (prev ?? []).map((j) => (j.id === tempId ? confirmed : j)))
      onJourneyCreated?.(confirmed)
      onJourneySelect(realId)
    } catch {
      setJourneys((prev) => (prev ?? []).filter((j) => j.id !== tempId))
      setSectionErrors((prev) => ({ ...prev, journeys: "Failed to create journey" }))
    }
  }, [domainId, onJourneySelect, onJourneyCreated])

  const handleCreateKeeper = React.useCallback(async () => {
    if (!domainId) return
    setSectionErrors((prev) => ({ ...prev, keepers: undefined }))
    const tempId = `__opt_${Date.now()}`
    const optimistic: KeeperItem = { id: tempId, title: "New Keeper" }
    setKeepers((prev) => [optimistic, ...(prev ?? [])])
    try {
      const res = await apiFetch("/api/keepers", {
        method: "POST",
        body: JSON.stringify({ domainId, title: "New Keeper" }),
      })
      const raw = (res as any)?.keeper ?? (res as any)?.data?.keeper ?? res
      const realId: string = raw?.id
      if (!realId || typeof realId !== "string") throw new Error("Invalid keeper response")
      const confirmed: KeeperItem = { id: realId, title: raw?.title ?? "New Keeper" }
      setKeepers((prev) => (prev ?? []).map((k) => (k.id === tempId ? confirmed : k)))
      onKeeperCreated?.(confirmed)
      frameCtx?.setActiveKeeperId(realId)
      onKeeperSelect?.(realId)
    } catch {
      setKeepers((prev) => (prev ?? []).filter((k) => k.id !== tempId))
      setSectionErrors((prev) => ({ ...prev, keepers: "Failed to create keeper" }))
    }
  }, [domainId, frameCtx, onKeeperSelect, onKeeperCreated])

  const handleCreateDraft = React.useCallback(async () => {
    if (!domainId) return
    setSectionErrors((prev) => ({ ...prev, drafts: undefined }))
    const tempId = `__opt_${Date.now()}`
    const optimistic: KipDraftSummary = {
      id: tempId,
      kind: "draft",
      key: tempId,
      title: "New Draft",
      status: "draft",
      keeperId: activeKeeperId ?? null,
    }
    setDrafts((prev) => [optimistic, ...(prev ?? [])])
    try {
      const draft = await KipApi.createDraft(domainId, {
        kind: "draft",
        key: `draft-${Date.now()}`,
        title: "New Draft",
        keeperId: activeKeeperId ?? null,
      })
      setDrafts((prev) => (prev ?? []).map((d) => (d.id === tempId ? draft : d)))
      onDraftSelect(draft.id)
    } catch {
      setDrafts((prev) => (prev ?? []).filter((d) => d.id !== tempId))
      setSectionErrors((prev) => ({ ...prev, drafts: "Failed to create draft" }))
    }
  }, [domainId, activeKeeperId, onDraftSelect])

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

  const allSessionItems: SidebarCardItem[] = (sessions ?? []).map((s) => {
    // If the stored title matches a keeper name it's a keeper label, not a session title — fall back to date
    const keeperTitleSet = new Set((keepers ?? []).map((k) => k.title.toLowerCase().trim()))
    const isKeeperName = keeperTitleSet.has(s.title.toLowerCase().trim())
    const displayLabel = isKeeperName
      ? `Session · ${formatDate(s.updatedAt)}`
      : s.title
    return {
      id: s.id,
      label: displayLabel,
      isSelected: activeSessionId === s.id,
      onClick: () => onSessionSelect(s.id),
    }
  })

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
          onAdd={handleCreateDraft}
        />
        {sectionErrors.drafts && (
          <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
            {sectionErrors.drafts}
          </p>
        )}
        <SidebarCard
          title="Journeys"
          description={countLabel(journeys?.length ?? null, "journey")}
          items={journeyItems.length ? journeyItems : undefined}
          onTitleClick={() => toggleExpanded("journeys")}
          onAdd={handleCreateJourney}
        />
        {sectionErrors.journeys && (
          <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
            {sectionErrors.journeys}
          </p>
        )}
        <SidebarCard
          title="Keepers"
          description={countLabel(keepers?.length ?? null, "keeper")}
          items={keeperItems.length ? keeperItems : undefined}
          onTitleClick={() => toggleExpanded("keepers")}
          onAdd={handleCreateKeeper}
        />
        {sectionErrors.keepers && (
          <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
            {sectionErrors.keepers}
          </p>
        )}
        <SidebarCard
          title="Sessions"
          items={sessionItems.length ? sessionItems : undefined}
          onTitleClick={() => toggleExpanded("sessions")}
          onAdd={handleCreateSession}
        />
        {sectionErrors.sessions && (
          <p className="text-xs px-1 -mt-2" style={{ color: "hsl(var(--destructive))" }}>
            {sectionErrors.sessions}
          </p>
        )}
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
