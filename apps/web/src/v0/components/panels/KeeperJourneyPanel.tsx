"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"

// ─── Types ─────────────────────────────────────────────────────────────────

interface PanelMoment {
  id: string
  title: string
  narrative: string | null
  createdAt?: string | null
}

interface PanelPath {
  id: string
  name: string
  prelude: string | null
  /** Prisma relation — capital M matches the API response shape */
  Moment: PanelMoment[]
}

interface JourneyDetail {
  id: string
  name: string
  forward: string | null
  paths: PanelPath[]
  stats?: {
    totalPaths: number
    totalMoments: number
  }
}

export interface KeeperJourneyPanelProps {
  journeyId: string
  domainId?: string | null
  onMomentSelect?: (momentId: string) => void
  onPathSelect?: (pathId: string) => void
}

type LoadState = "idle" | "loading" | "ready" | "error"

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

// ─── StatusBadge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const s = (status ?? "active").toLowerCase()
  const map: Record<string, { label: string; bg: string; fg: string; border: string }> = {
    active: {
      label: "Active",
      bg: "hsl(172 60% 92%)",
      fg: "hsl(172 55% 28%)",
      border: "hsl(172 40% 78%)",
    },
    complete: {
      label: "Complete",
      bg: "hsl(142 40% 92%)",
      fg: "hsl(142 50% 28%)",
      border: "hsl(142 30% 78%)",
    },
    paused: {
      label: "Paused",
      bg: "hsl(var(--theme-surface-elevated))",
      fg: "hsl(var(--theme-ink-tertiary))",
      border: "hsl(var(--theme-line-hairline))",
    },
  }
  const style = map[s] ?? map["active"]!
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide shrink-0"
      style={{ background: style.bg, color: style.fg, border: `1px solid ${style.border}` }}
    >
      {style.label}
    </span>
  )
}

// ─── AddPathForm ───────────────────────────────────────────────────────────

function AddPathForm({ onAdd }: { onAdd: (name: string, prelude: string) => void }) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState("")
  const [prelude, setPrelude] = React.useState("")

  const submit = () => {
    const n = name.trim()
    if (!n) return
    onAdd(n, prelude.trim())
    setName("")
    setPrelude("")
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-3 text-[12px] transition-opacity hover:opacity-70"
        style={{ color: "hsl(172 55% 35%)" }}
      >
        <span className="text-[14px] leading-none" aria-hidden>+</span>
        Add Path
      </button>
    )
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        type="text"
        placeholder="Path name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit()
          if (e.key === "Escape") setOpen(false)
        }}
        className="w-full text-[13px] rounded-md px-3 py-1.5 outline-none"
        style={{
          background: "hsl(var(--theme-surface-paper))",
          border: "1px solid hsl(var(--theme-ink-primary) / 0.15)",
          color: "hsl(var(--theme-ink-primary))",
        }}
      />
      <input
        type="text"
        placeholder="Optional prelude…"
        value={prelude}
        onChange={(e) => setPrelude(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit()
          if (e.key === "Escape") setOpen(false)
        }}
        className="w-full text-[12px] rounded-md px-3 py-1.5 outline-none"
        style={{
          background: "hsl(var(--theme-surface-paper))",
          border: "1px solid hsl(var(--theme-ink-primary) / 0.15)",
          color: "hsl(var(--theme-ink-primary))",
        }}
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          className="text-[11px] px-3 py-1 rounded-md font-medium"
          style={{ background: "hsl(172 55% 35%)", color: "#fff" }}
        >
          Add
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11px] px-3 py-1 rounded-md"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── PathSection ────────────────────────────────────────────────────────────

interface PathSectionProps {
  path: PanelPath
  onMomentSelect?: (id: string) => void
  onPathSelect?: (id: string) => void
}

function PathSection({ path, onMomentSelect, onPathSelect }: PathSectionProps) {
  const [collapsed, setCollapsed] = React.useState(false)

  const handleHeaderClick = () => {
    setCollapsed((c) => !c)
    onPathSelect?.(path.id)
  }

  return (
    <div>
      {/* Path title row */}
      <button
        type="button"
        onClick={handleHeaderClick}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left transition-opacity hover:opacity-70"
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 9 9"
          fill="none"
          aria-hidden
          className="shrink-0 transition-transform"
          style={{
            color: "hsl(var(--theme-ink-tertiary))",
            transform: collapsed ? "rotate(-90deg)" : "none",
          }}
        >
          <path
            d="M1 2l3.5 3.5L8 2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <p
          className="text-[11px] font-semibold uppercase tracking-widest truncate flex-1"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {path.name}
        </p>
        {path.Moment.length > 0 && (
          <span
            className="shrink-0 text-[10px]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {path.Moment.length}
          </span>
        )}
      </button>

      {!collapsed && (
        <>
          {/* Prelude — max 2 lines */}
          {path.prelude?.trim() && (
            <p
              className="px-4 pb-1.5"
              style={{
                fontSize: "11px",
                fontStyle: "italic",
                color: "hsl(var(--theme-ink-tertiary))",
                lineHeight: 1.4,
                marginBottom: "8px",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {path.prelude.trim()}
            </p>
          )}

          {/* Moment rows */}
          <ul>
            {path.Moment.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onMomentSelect?.(m.id)}
                  className="w-full flex items-center gap-3 px-3 py-[6px] text-left group transition-colors"
                  style={{ background: "transparent" }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background =
                      "hsl(var(--theme-surface-paper) / 0.6)"
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.background = "transparent"
                  }}
                >
                  <span
                    className="shrink-0 rounded-full"
                    style={{
                      width: 5,
                      height: 5,
                      minWidth: 5,
                      background: "hsl(var(--theme-ink-tertiary) / 0.5)",
                    }}
                    aria-hidden
                  />
                  <p
                    className="flex-1 text-[12px] truncate leading-snug"
                    style={{ color: "hsl(var(--theme-ink-primary))" }}
                  >
                    {m.title?.trim() || "Untitled Moment"}
                  </p>
                  {m.createdAt && (
                    <span
                      className="shrink-0 text-[10px]"
                      style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                    >
                      {formatDate(m.createdAt)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          {/* + Add Moment */}
          <button
            type="button"
            className="flex items-center gap-1.5 px-4 py-1.5 mb-1 text-[11px] transition-opacity hover:opacity-70"
            style={{ color: "hsl(172 55% 35%)" }}
          >
            <span className="text-[13px] leading-none" aria-hidden>+</span>
            Add Moment
          </button>
        </>
      )}
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export function KeeperJourneyPanel({
  journeyId,
  onMomentSelect,
  onPathSelect,
}: KeeperJourneyPanelProps) {
  const [journey, setJourney] = React.useState<JourneyDetail | null>(null)
  const [loadState, setLoadState] = React.useState<LoadState>("idle")

  React.useEffect(() => {
    if (!journeyId) {
      setJourney(null)
      setLoadState("idle")
      return
    }
    let cancelled = false
    setLoadState("loading")
    setJourney(null)
    void apiFetch(`/api/journeys/${encodeURIComponent(journeyId)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const data = res as JourneyDetail
        // Normalise — API returns paths[].Moment; guard against missing
        const normalised: JourneyDetail = {
          ...data,
          paths: Array.isArray(data.paths)
            ? data.paths.map((p) => ({ ...p, Moment: Array.isArray(p.Moment) ? p.Moment : [] }))
            : [],
        }
        setJourney(normalised)
        setLoadState("ready")
      })
      .catch(() => {
        if (!cancelled) setLoadState("error")
      })
    return () => {
      cancelled = true
    }
  }, [journeyId])

  const handleAddPath = async (name: string, prelude: string) => {
    if (!journey) return
    try {
      const result = (await apiFetch("/api/paths", {
        method: "POST",
        body: JSON.stringify({ name, prelude, journeyId: journey.id }),
      })) as { path?: PanelPath }
      if (result?.path) {
        const newPath: PanelPath = { ...result.path, Moment: [] }
        setJourney((prev) => (prev ? { ...prev, paths: [...prev.paths, newPath] } : prev))
      }
    } catch {
      // silent — optimistic UI not applied; form closes normally
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loadState === "loading") {
    return (
      <div className="flex flex-col h-full min-h-0">
        <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Loading Journey…
        </p>
      </div>
    )
  }

  if (loadState === "error") {
    return (
      <div className="flex flex-col h-full min-h-0">
        <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Journey couldn&apos;t load.
        </p>
      </div>
    )
  }

  if (!journey) {
    return (
      <div className="flex flex-col h-full min-h-0">
        <p className="px-4 py-6 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Select a Journey to begin.
        </p>
      </div>
    )
  }

  // ─── Resolved ─────────────────────────────────────────────────────────────

  const totalMoments =
    journey.stats?.totalMoments ??
    journey.paths.reduce((sum, p) => sum + p.Moment.length, 0)

  return (
    <div
      className="flex flex-col h-full min-h-0"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      {/* Journey header */}
      <div
        className="shrink-0 px-4 py-4 border-b"
        style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
      >
        <p
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "22px",
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
            color: "hsl(var(--theme-ink-primary))",
          }}
        >
          {journey.name}
        </p>
        {journey.forward?.trim() && (
          <p
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: "14px",
              fontStyle: "italic",
              color: "hsl(var(--theme-ink-secondary))",
              lineHeight: 1.5,
              marginTop: "4px",
            }}
          >
            {journey.forward.trim()}
          </p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <StatusBadge />
          <span
            className="text-[11px]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {totalMoments} {totalMoments === 1 ? "moment" : "moments"}
          </span>
        </div>
      </div>

      {/* Paths + Moments scrollable body */}
      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto">
        {journey.paths.length === 0 && (
          <p
            className="px-4 py-6 text-[12px]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            No Paths yet. Ask Kip to define the spine of this Journey.
          </p>
        )}

        {journey.paths.map((path, i) => (
          <React.Fragment key={path.id}>
            {i > 0 && (
              <div
                className="mx-4"
                style={{
                  height: 1,
                  background: "hsl(var(--theme-line-hairline) / 0.4)",
                }}
              />
            )}
            <PathSection
              path={path}
              onMomentSelect={onMomentSelect}
              onPathSelect={onPathSelect}
            />
          </React.Fragment>
        ))}

        {/* + Add Path */}
        <div
          className="border-t mt-1"
          style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
        >
          <AddPathForm onAdd={handleAddPath} />
        </div>
      </div>
    </div>
  )
}
