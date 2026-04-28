"use client"

import * as React from "react"
import { getApiBase } from "../../../lib/apiFetch"
import { KipApi } from "../../../lib/kipApi"
import type { KipDraft, KipDraftSummary } from "../../../lib/kipApi"
import { apiFetch } from "../../../lib/api"
import type { KeptRow } from "../../frames/feed/FeedFrame"
import { MomentDetailPanel } from "../../frames/moment/MomentDetailPanel"
import { IDEDraftPanel } from "./IDEDraftPanel"
import { KeeperPanel } from "./components/KeeperPanel"
import { KeeperJourneyPanel } from "../../components/panels/KeeperJourneyPanel"

// ─── Props ─────────────────────────────────────────────────────────────────

interface IDEBoardContextProps {
  domainSlug: string
  domainId: string | null
  activeJourneyId: string | null
  selectedDraftId: string | null
  selectedMomentId: string | null
  /** Set when keeper was explicitly clicked in the left nav */
  selectedKeeperId?: string | null
  /** Resolved keeper display name */
  activeKeeperName?: string | null
  /** Navigate to a journey from the right panel (e.g. from KeeperPanel) */
  onJourneySelect?: (id: string) => void
  /** Open a draft in the right panel from the Drafts tab */
  onDraftSelect?: (id: string) => void
}

// ─── Data shapes ───────────────────────────────────────────────────────────

interface JourneyMeta {
  id: string
  name: string
  forward: string | null
  createdAt: string
  updatedAt: string
}

interface JourneyMoment {
  id: string
  title: string
  narrative: string | null
  createdAt: string
}

interface JourneyPath {
  id: string
  name: string
  prelude: string
  journeyId: string
}

type LoadState = "idle" | "loading" | "ready" | "error"
type JourneyTab = "paths" | "moments" | "drafts"

// ─── Helpers ──────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function truncate(text: string | null | undefined, max: number): string {
  if (!text) return ""
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return trimmed.slice(0, max) + "…"
}

// ─── InlineEditField ───────────────────────────────────────────────────────
//
// Click to edit, blur/Enter to save, Escape to cancel.

interface InlineEditFieldProps {
  value: string
  onSave: (next: string) => void
  placeholder?: string
  className?: string
  style?: React.CSSProperties
  multiline?: boolean
}

function InlineEditField({ value, onSave, placeholder, className, style, multiline }: InlineEditFieldProps) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)

  React.useEffect(() => {
    setDraft(value)
  }, [value])

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onSave(trimmed)
    else setDraft(value)
    setEditing(false)
  }

  const cancel = () => {
    setDraft(value)
    setEditing(false)
  }

  if (editing) {
    const shared: React.CSSProperties = {
      width: "100%",
      background: "hsl(var(--theme-surface-paper))",
      border: "1px solid hsl(var(--theme-ink-primary) / 0.2)",
      borderRadius: "6px",
      padding: "3px 6px",
      fontSize: "inherit",
      color: "inherit",
      outline: "none",
      lineHeight: "inherit",
      ...style,
    }
    const handleKey = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !multiline) { e.preventDefault(); commit() }
      if (e.key === "Escape") cancel()
    }
    if (multiline) {
      return (
        <textarea
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          value={draft}
          rows={2}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className={className}
          style={{ ...shared, resize: "none" }}
        />
      )
    }
    return (
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className={className}
        style={shared}
      />
    )
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setEditing(true) }}
      title="Click to edit"
      className={className}
      style={{
        cursor: "text",
        display: "block",
        borderRadius: "4px",
        padding: "2px 4px",
        margin: "-2px -4px",
        transition: "background 0.1s",
        ...style,
      }}
    >
      {value || <span style={{ color: "hsl(var(--theme-ink-tertiary))", fontStyle: "italic" }}>{placeholder}</span>}
    </span>
  )
}

// ─── StatusChip ─────────────────────────────────────────────────────────────

function StatusChip({ label, tone }: { label: string; tone: "active" | "planned" | "ref" }) {
  const colors: Record<typeof tone, { bg: string; fg: string; border: string }> = {
    active:  { bg: "hsl(142 40% 94%)", fg: "hsl(142 50% 30%)", border: "hsl(142 30% 82%)" },
    planned: { bg: "hsl(210 40% 94%)", fg: "hsl(210 50% 35%)", border: "hsl(210 30% 82%)" },
    ref:     { bg: "hsl(var(--theme-surface-elevated))", fg: "hsl(var(--theme-ink-tertiary))", border: "hsl(var(--theme-line-hairline))" },
  }
  const { bg, fg, border } = colors[tone]
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide shrink-0"
      style={{ background: bg, color: fg, border: `1px solid ${border}` }}
    >
      {label}
    </span>
  )
}

// ─── PathsTab ───────────────────────────────────────────────────────────────

interface PathsTabProps {
  paths: JourneyPath[]
  loadState: LoadState
  domainId: string | null
  onPathSaved: (id: string, updates: Partial<Pick<JourneyPath, "name" | "prelude">>) => void
}

function PathsTab({ paths, loadState, onPathSaved }: PathsTabProps) {
  const savePath = async (id: string, updates: Partial<Pick<JourneyPath, "name" | "prelude">>) => {
    try {
      await apiFetch(`/api/paths/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      })
      onPathSaved(id, updates)
    } catch {
      // silent — optimistic already applied by parent
    }
  }

  if (loadState === "loading") {
    return (
      <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        Loading paths…
      </p>
    )
  }

  if (loadState === "error") {
    return (
      <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        Couldn&apos;t load paths.
      </p>
    )
  }

  if (loadState === "ready" && paths.length === 0) {
    return (
      <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        No Paths yet. Ask Kip to define the spine of this Journey.
      </p>
    )
  }

  return (
    <ul className="py-3 space-y-2 px-3">
      {paths.map((path) => (
        <li
          key={path.id}
          className="rounded-xl border px-4 py-3"
          style={{
            background: "hsl(var(--theme-surface-paper) / 0.7)",
            borderColor: "hsl(var(--theme-line-hairline))",
          }}
        >
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <InlineEditField
                  value={path.name}
                  onSave={(v) => savePath(path.id, { name: v })}
                  placeholder="Path name"
                  className="text-[13px] font-semibold leading-snug flex-1"
                  style={{ color: "hsl(var(--theme-ink-primary))" }}
                />
                <StatusChip label="Active" tone="active" />
              </div>
              <InlineEditField
                value={path.prelude}
                onSave={(v) => savePath(path.id, { prelude: v })}
                placeholder="Add a description…"
                className="text-[11px] leading-relaxed"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
                multiline
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ─── MomentsTab ─────────────────────────────────────────────────────────────

interface MomentsTabProps {
  moments: JourneyMoment[]
  loadState: LoadState
  expandedId: string | null
  onToggle: (id: string) => void
}

function MomentsTab({ moments, loadState, expandedId, onToggle }: MomentsTabProps) {
  if (loadState === "loading") {
    return (
      <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        Loading Moments…
      </p>
    )
  }

  if (loadState === "error") {
    return (
      <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        Journey couldn&apos;t load.
      </p>
    )
  }

  if (loadState === "ready" && moments.length === 0) {
    return (
      <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        No Moments yet. Start building.
      </p>
    )
  }

  return (
    <ul className="py-2">
      {[...moments].reverse().map((m) => {
        const isExpanded = expandedId === m.id
        const preview = truncate(m.narrative, 100)
        return (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onToggle(m.id)}
              className="w-full text-left px-4 py-4 border-b transition-colors hover:opacity-80 group"
              style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
            >
              <div className="flex items-start gap-2">
                <div
                  className="shrink-0 w-0.5 self-stretch rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: "hsl(var(--theme-accent-fg, var(--theme-ink-tertiary)))" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className="text-[12px] font-medium leading-snug truncate"
                      style={{ color: "hsl(var(--theme-ink-primary))" }}
                    >
                      {m.title?.trim() || "Untitled Moment"}
                    </p>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      aria-hidden
                      className="shrink-0 mt-0.5 transition-transform"
                      style={{
                        color: "hsl(var(--theme-ink-tertiary))",
                        transform: isExpanded ? "rotate(90deg)" : "none",
                      }}
                    >
                      <path
                        d="M3 2l4 3-4 3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className="text-[10px] mt-0.5" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                    {formatDate(m.createdAt)}
                  </p>
                  {!isExpanded && preview ? (
                    <p className="text-[11px] mt-1 leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                      {preview}
                    </p>
                  ) : null}
                </div>
              </div>

              {isExpanded && (
                <div className="mt-2 pt-2 border-t" style={{ borderColor: "hsl(var(--theme-line-hairline))" }}>
                  {m.narrative?.trim() ? (
                    <p className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: "hsl(var(--theme-ink-primary))" }}>
                      {m.narrative.trim()}
                    </p>
                  ) : (
                    <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                      No content recorded.
                    </p>
                  )}
                </div>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

// ─── DraftsTab ──────────────────────────────────────────────────────────────

interface DraftsTabProps {
  drafts: KipDraftSummary[]
  loadState: LoadState
  onOpenDraft?: (id: string) => void
}

const DRAFT_STATUS_TONE: Record<string, "active" | "planned" | "ref"> = {
  promoted: "active",
  approved: "active",
  reviewed: "planned",
  draft: "ref",
  archived: "ref",
}

function DraftsTab({ drafts, loadState, onOpenDraft }: DraftsTabProps) {
  if (loadState === "loading") {
    return (
      <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        Loading Drafts…
      </p>
    )
  }

  if (loadState === "error") {
    return (
      <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        Couldn&apos;t load drafts.
      </p>
    )
  }

  if (loadState === "ready" && drafts.length === 0) {
    return (
      <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
        No Drafts yet. Ask Kip to create a reference document.
      </p>
    )
  }

  return (
    <ul className="py-3 space-y-2 px-3">
      {drafts.map((d) => {
        const tone = DRAFT_STATUS_TONE[d.status] ?? "ref"
        const updated = d.updatedAt ? formatDate(String(d.updatedAt)) : null
        return (
          <li
            key={d.id}
            className="rounded-xl border px-4 py-3 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onOpenDraft?.(d.id)}
            style={{
              background: "hsl(var(--theme-surface-paper) / 0.7)",
              borderColor: "hsl(var(--theme-line-hairline))",
            }}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p
                    className="text-[12px] font-semibold truncate flex-1"
                    style={{ color: "hsl(var(--theme-ink-primary))" }}
                  >
                    {d.title}
                  </p>
                  <StatusChip label={d.status} tone={tone} />
                </div>
                <p className="text-[10px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                  {d.kind}
                  {updated ? ` · ${updated}` : ""}
                </p>
                {d.summary && (
                  <p className="text-[11px] mt-1 leading-relaxed line-clamp-2" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                    {d.summary}
                  </p>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

// ─── JourneyTabBar ──────────────────────────────────────────────────────────

interface JourneyTabBarProps {
  active: JourneyTab
  pathCount: number
  momentCount: number
  draftCount: number
  onChange: (tab: JourneyTab) => void
}

function JourneyTabBar({ active, pathCount, momentCount, draftCount, onChange }: JourneyTabBarProps) {
  const tabs: Array<{ id: JourneyTab; label: string; count: number }> = [
    { id: "paths",   label: "Paths",   count: pathCount },
    { id: "moments", label: "Moments", count: momentCount },
    { id: "drafts",  label: "Drafts",  count: draftCount },
  ]

  return (
    <div
      className="flex shrink-0 border-b"
      style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-[11px] font-medium transition-colors relative"
          style={{
            color: active === tab.id
              ? "hsl(var(--theme-ink-primary))"
              : "hsl(var(--theme-ink-tertiary))",
            borderBottom: active === tab.id
              ? "2px solid hsl(var(--theme-ink-primary) / 0.7)"
              : "2px solid transparent",
            marginBottom: "-1px",
            background: "none",
          }}
        >
          {tab.label}
          {tab.count > 0 && (
            <span
              className="inline-flex items-center justify-center rounded-full text-[9px] font-semibold px-1.5 min-w-[16px] h-4"
              style={{
                background: active === tab.id
                  ? "hsl(var(--theme-ink-primary) / 0.12)"
                  : "hsl(var(--theme-surface-elevated))",
                color: active === tab.id
                  ? "hsl(var(--theme-ink-primary))"
                  : "hsl(var(--theme-ink-tertiary))",
              }}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function IDEBoardContext({
  domainSlug,
  domainId,
  activeJourneyId,
  selectedDraftId,
  selectedMomentId,
  selectedKeeperId,
  activeKeeperName,
  onJourneySelect,
  onDraftSelect,
}: IDEBoardContextProps) {
  // Journey meta + moments (public API)
  const [journey, setJourney] = React.useState<JourneyMeta | null>(null)
  const [moments, setMoments] = React.useState<JourneyMoment[]>([])
  const [loadState, setLoadState] = React.useState<LoadState>("idle")

  // Paths (authenticated API, journey-scoped)
  const [paths, setPaths] = React.useState<JourneyPath[]>([])
  const [pathsLoadState, setPathsLoadState] = React.useState<LoadState>("idle")

  // Domain drafts
  const [drafts, setDrafts] = React.useState<KipDraftSummary[]>([])
  const [draftsLoadState, setDraftsLoadState] = React.useState<LoadState>("idle")

  // Draft panel
  const [draftDetail, setDraftDetail] = React.useState<KipDraft | null>(null)
  const [draftLoadState, setDraftLoadState] = React.useState<LoadState>("idle")

  // Moment panel
  const [momentRow, setMomentRow] = React.useState<KeptRow | null>(null)
  const [momentLoadState, setMomentLoadState] = React.useState<LoadState>("idle")

  // Journey tab
  const [journeyTab, setJourneyTab] = React.useState<JourneyTab>("paths")
  const [expandedMomentId, setExpandedMomentId] = React.useState<string | null>(null)

  // ─── Draft detail ──────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!selectedDraftId || !domainId) {
      setDraftDetail(null)
      setDraftLoadState("idle")
      return
    }
    let cancelled = false
    setDraftLoadState("loading")
    KipApi.getDraft(domainId, selectedDraftId)
      .then((d) => {
        if (!cancelled) { setDraftDetail(d); setDraftLoadState("ready") }
      })
      .catch(() => {
        if (!cancelled) { setDraftDetail(null); setDraftLoadState("error") }
      })
    return () => { cancelled = true }
  }, [selectedDraftId, domainId])

  // ─── Moment detail ─────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!selectedMomentId || !domainSlug) {
      setMomentRow(null)
      setMomentLoadState("idle")
      return
    }
    let cancelled = false
    setMomentLoadState("loading")
    void (async () => {
      try {
        const json = (await apiFetch(
          `/api/v0/moments?domainSlug=${encodeURIComponent(domainSlug)}&status=kept&limit=500`,
        )) as { data?: KeptRow[] }
        const rows = Array.isArray(json?.data) ? json.data : []
        let row = rows.find((r) => r.id === selectedMomentId)
        if (!row) {
          const mjson = (await apiFetch(`/api/moments/${encodeURIComponent(selectedMomentId)}`)) as {
            moment?: {
              id: string
              title: string
              narrative: string
              keptAt?: string | Date | null
              createdAt: string | Date
              Journey?: { name?: string | null }
            }
          }
          const m = mjson.moment
          if (m) {
            row = {
              id: m.id,
              title: m.title,
              body: m.narrative,
              keptAt: m.keptAt != null ? String(m.keptAt) : null,
              createdAt: String(m.createdAt),
              journeyName: m.Journey?.name ?? null,
            }
          }
        }
        if (!cancelled) {
          setMomentRow(row ?? null)
          setMomentLoadState(row ? "ready" : "error")
        }
      } catch {
        if (!cancelled) { setMomentRow(null); setMomentLoadState("error") }
      }
    })()
    return () => { cancelled = true }
  }, [selectedMomentId, domainSlug])

  // ─── Journey + moments (public API) ────────────────────────────────────

  React.useEffect(() => {
    if (!domainSlug) return
    if (selectedDraftId || selectedMomentId) {
      setJourney(null); setMoments([]); setLoadState("idle")
      return
    }

    let cancelled = false
    const base = getApiBase()

    const loadJourney = async (jid: string) => {
      const res = await fetch(
        `${base}/api/public/${encodeURIComponent(domainSlug)}/journeys/${encodeURIComponent(jid)}`,
      )
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as { journey: JourneyMeta; moments: JourneyMoment[] }
      if (cancelled) return
      setJourney(data.journey)
      setMoments(Array.isArray(data.moments) ? data.moments : [])
      setLoadState("ready")
    }

    if (activeJourneyId) {
      setLoadState("loading")
      setExpandedMomentId(null)
      loadJourney(activeJourneyId).catch(() => { if (!cancelled) setLoadState("error") })
      return () => { cancelled = true }
    }

    setExpandedMomentId(null)
    setLoadState("loading")
    fetch(`${base}/api/public/${encodeURIComponent(domainSlug)}/journeys`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((json: { journeys?: Array<{ id: string }> }) => {
        const first = json.journeys?.[0]
        if (!first) {
          if (!cancelled) { setJourney(null); setMoments([]); setLoadState("ready") }
          return
        }
        return loadJourney(first.id)
      })
      .catch(() => { if (!cancelled) setLoadState("error") })

    return () => { cancelled = true }
  }, [domainSlug, activeJourneyId, selectedDraftId, selectedMomentId])

  // ─── Paths (journey-scoped) ─────────────────────────────────────────────

  React.useEffect(() => {
    const jid = activeJourneyId ?? journey?.id
    if (!jid || selectedDraftId || selectedMomentId) {
      setPaths([])
      setPathsLoadState("idle")
      return
    }
    let cancelled = false
    setPathsLoadState("loading")
    const pathsQuery = new URLSearchParams({ journeyId: jid, limit: "50" })
    if (domainId) pathsQuery.set("domainId", domainId)
    apiFetch(`/api/paths?${pathsQuery.toString()}`)
      .then((res: { paths?: JourneyPath[] }) => {
        if (!cancelled) {
          setPaths(Array.isArray(res?.paths) ? res.paths : [])
          setPathsLoadState("ready")
        }
      })
      .catch(() => {
        if (!cancelled) { setPaths([]); setPathsLoadState("error") }
      })
    return () => { cancelled = true }
  }, [activeJourneyId, journey?.id, domainId, selectedDraftId, selectedMomentId])

  // ─── Domain drafts ──────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!domainId || selectedDraftId || selectedMomentId) {
      setDrafts([])
      setDraftsLoadState("idle")
      return
    }
    let cancelled = false
    setDraftsLoadState("loading")
    KipApi.listDrafts(domainId)
      .then((list) => {
        if (!cancelled) { setDrafts(list); setDraftsLoadState("ready") }
      })
      .catch(() => {
        if (!cancelled) { setDrafts([]); setDraftsLoadState("error") }
      })
    return () => { cancelled = true }
  }, [domainId, selectedDraftId, selectedMomentId])

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handlePathSaved = (id: string, updates: Partial<Pick<JourneyPath, "name" | "prelude">>) => {
    setPaths((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)))
  }

  const toggleExpandMoment = (id: string) => {
    setExpandedMomentId((prev) => (prev === id ? null : id))
  }

  // ─── Priority: draft ────────────────────────────────────────────────────

  if (selectedDraftId) {
    return (
      <div className="flex flex-col h-full min-h-0" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        {draftLoadState === "loading" && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>Loading draft…</p>
          </div>
        )}
        {draftLoadState === "error" && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>Couldn&apos;t load this draft.</p>
          </div>
        )}
        {draftLoadState === "ready" && draftDetail && (
          <IDEDraftPanel draft={draftDetail} domainId={domainId} onSaved={(updated) => setDraftDetail(updated)} />
        )}
        {draftLoadState === "ready" && !draftDetail && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>Draft not found.</p>
          </div>
        )}
      </div>
    )
  }

  // ─── Priority: moment ───────────────────────────────────────────────────

  if (selectedMomentId) {
    return (
      <div className="flex flex-col h-full min-h-0" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        <div className="shrink-0 px-4 py-4 border-b" style={{ borderColor: "hsl(var(--theme-line-hairline))" }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            Moment
          </p>
          <p className="text-[14px] font-semibold mt-1 truncate" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            {momentLoadState === "loading" ? "Loading…" : momentRow?.title?.trim() || "Moment"}
          </p>
        </div>
        <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto">
          {momentLoadState === "loading" && (
            <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>Loading moment…</p>
          )}
          {momentLoadState === "error" && (
            <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>Couldn&apos;t load this moment.</p>
          )}
          {momentLoadState === "ready" && momentRow && <MomentDetailPanel moment={momentRow} />}
        </div>
      </div>
    )
  }

  // ─── Priority: keeper ───────────────────────────────────────────────────

  if (selectedKeeperId) {
    return (
      <KeeperPanel
        keeperId={selectedKeeperId}
        keeperName={activeKeeperName}
        domainId={domainId}
        onJourneySelect={onJourneySelect ?? (() => {})}
      />
    )
  }

  // ─── Default: Journey document view ────────────────────────────────────
  //
  // KeeperJourneyPanel is self-contained: it fetches the authenticated
  // /api/journeys/:id detail (with per-path Moments) and renders the living
  // document layout. The public-API journey fetch above still runs to resolve
  // journey?.id when no activeJourneyId is set (first-journey fallback).

  const resolvedJourneyId = activeJourneyId ?? journey?.id ?? ""

  return (
    <div className="flex flex-col h-full min-h-0" style={{ color: "hsl(var(--theme-ink-primary))" }}>
      {/* Show loading / error only while resolving the journey ID fallback */}
      {!resolvedJourneyId && loadState === "loading" && (
        <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Loading Journey…
        </p>
      )}
      {!resolvedJourneyId && loadState === "error" && (
        <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Journey couldn&apos;t load.
        </p>
      )}
      {!resolvedJourneyId && loadState === "ready" && !journey && (
        <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          No Journey found for this domain.
        </p>
      )}

      {resolvedJourneyId && (
        <KeeperJourneyPanel
          journeyId={resolvedJourneyId}
          domainId={domainId}
          onMomentSelect={() => {}}
          onPathSelect={() => {}}
        />
      )}
    </div>
  )
}
