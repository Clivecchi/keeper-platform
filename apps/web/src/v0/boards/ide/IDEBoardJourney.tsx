"use client"

import * as React from "react"
import { getApiBase } from "../../../lib/apiFetch"
import type { IDEBoardActiveContext } from "./IDEBoard"

interface IDEBoardJourneyProps {
  domainSlug: string
  activeContext: IDEBoardActiveContext
}

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

type LoadState = "idle" | "loading" | "ready" | "error"

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

export function IDEBoardJourney({ domainSlug, activeContext }: IDEBoardJourneyProps) {
  const [journey, setJourney] = React.useState<JourneyMeta | null>(null)
  const [moments, setMoments] = React.useState<JourneyMoment[]>([])
  const [loadState, setLoadState] = React.useState<LoadState>("idle")
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!domainSlug) return
    let cancelled = false

    if (activeContext && activeContext.type !== "journey") {
      setJourney(null)
      setMoments([])
      setLoadState("ready")
      setExpandedId(null)
      return
    }

    setLoadState("loading")

    const base = getApiBase()

    const loadJourney = async (jid: string) => {
      const res = await fetch(
        `${base}/api/public/${encodeURIComponent(domainSlug)}/journeys/${encodeURIComponent(jid)}`,
      )
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json() as {
        journey: JourneyMeta
        moments: JourneyMoment[]
      }
      if (cancelled) return
      setJourney(data.journey)
      setMoments(Array.isArray(data.moments) ? data.moments : [])
      setLoadState("ready")
    }

    const targetJourneyId = activeContext?.type === "journey" ? activeContext.id : undefined

    if (targetJourneyId) {
      loadJourney(targetJourneyId).catch(() => {
        if (!cancelled) setLoadState("error")
      })
    } else {
      // No selection — use first journey (same as previous default)
      fetch(`${base}/api/public/${encodeURIComponent(domainSlug)}/journeys`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((json: { journeys?: Array<{ id: string }> }) => {
          const first = json.journeys?.[0]
          if (!first) {
            if (!cancelled) {
              setJourney(null)
              setMoments([])
              setLoadState("ready")
            }
            return
          }
          return loadJourney(first.id)
        })
        .catch(() => {
          if (!cancelled) setLoadState("error")
        })
    }

    return () => {
      cancelled = true
    }
  }, [domainSlug, activeContext])

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const bannerTitle = journey?.name ?? (loadState === "loading" ? "Loading…" : "Journey")

  if (activeContext && activeContext.type !== "journey") {
    const typeLabel =
      activeContext.type === "moment" ? "Moment" : activeContext.type === "keeper" ? "Keeper" : "Draft"
    return (
      <div
        className="flex flex-col h-full min-h-0"
        style={{ color: "hsl(var(--theme-ink-primary))" }}
      >
        <div
          className="shrink-0 px-4 py-4 border-b"
          style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            View state
          </p>
          <p
            className="text-[14px] font-semibold mt-1"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {typeLabel}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 px-4 py-6 text-[12px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          <p>
            {typeLabel} view is not built yet. Active id: <span className="font-mono text-[11px]">{activeContext.id}</span>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col h-full min-h-0"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      {/* Banner */}
      <div
        className="shrink-0 px-4 py-4 border-b"
        style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
      >
        <p
          className="text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Journey
        </p>
        <p
          className="text-[14px] font-semibold mt-1 truncate"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {bannerTitle}
        </p>
        {loadState === "ready" && journey && (
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: "hsl(var(--theme-surface-elevated))",
                border: "1px solid hsl(var(--theme-line-hairline))",
                color: "hsl(var(--theme-ink-tertiary))",
              }}
            >
              {moments.length} {moments.length === 1 ? "Moment" : "Moments"}
            </span>
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{
                background: "hsl(var(--theme-surface-elevated))",
                border: "1px solid hsl(var(--theme-line-hairline))",
                color: "hsl(var(--theme-ink-tertiary))",
              }}
            >
              Updated {formatDate(journey.updatedAt)}
            </span>
          </div>
        )}
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loadState === "loading" && (
          <p
            className="px-4 py-6 text-[12px]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Loading Journey…
          </p>
        )}

        {loadState === "error" && (
          <p
            className="px-4 py-6 text-[12px]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Journey couldn&apos;t load.
          </p>
        )}

        {loadState === "ready" && !journey && (
          <p
            className="px-4 py-6 text-[12px]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            No Journey found for this domain.
          </p>
        )}

        {loadState === "ready" && journey && (
          <>
            {/* Journey header — name is shown in banner, so start with forward text */}
            <div
              className="px-4 py-4 border-b"
              style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
            >
              {journey.forward?.trim() ? (
                <p
                  className="text-[12px] leading-relaxed"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                >
                  {journey.forward.trim()}
                </p>
              ) : null}
              <p
                className="text-[11px] font-medium mt-2"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                {moments.length} {moments.length === 1 ? "Moment" : "Moments"}
              </p>
            </div>

            {/* Moment list */}
            {moments.length === 0 ? (
              <p
                className="px-4 py-6 text-[12px]"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                No Moments yet. Start building.
              </p>
            ) : (
              <ul className="py-2">
                {[...moments].reverse().map((m) => {
                  const isExpanded = expandedId === m.id
                  const preview = truncate(m.narrative, 100)
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => toggleExpand(m.id)}
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
                            <p
                              className="text-[10px] mt-0.5"
                              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                            >
                              {formatDate(m.createdAt)}
                            </p>
                            {!isExpanded && preview ? (
                              <p
                                className="text-[11px] mt-1 leading-relaxed"
                                style={{ color: "hsl(var(--theme-ink-secondary))" }}
                              >
                                {preview}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div
                            className="mt-2 pt-2 border-t"
                            style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
                          >
                            {m.narrative?.trim() ? (
                              <p
                                className="text-[12px] leading-relaxed whitespace-pre-wrap"
                                style={{ color: "hsl(var(--theme-ink-primary))" }}
                              >
                                {m.narrative.trim()}
                              </p>
                            ) : (
                              <p
                                className="text-[12px]"
                                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                              >
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
            )}
          </>
        )}
      </div>
    </div>
  )
}
