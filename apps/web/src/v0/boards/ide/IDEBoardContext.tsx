"use client"

import * as React from "react"
import { getApiBase } from "../../../lib/apiFetch"
import { KipApi } from "../../../lib/kipApi"
import type { KipDraft } from "../../../lib/kipApi"
import { apiFetch } from "../../../lib/api"
import type { KeptRow } from "../../frames/feed/FeedFrame"
import { MomentDetailPanel } from "../../frames/moment/MomentDetailPanel"

interface IDEBoardContextProps {
  domainSlug: string
  domainId: string | null
  activeJourneyId: string | null
  selectedDraftId: string | null
  selectedMomentId: string | null
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

function draftBodyText(draft: KipDraft): string {
  if (draft.summary?.trim()) return draft.summary.trim()
  const spec = draft.spec
  if (spec && typeof spec === "object")
    return JSON.stringify(spec, null, 2)
  if (typeof spec === "string") return spec
  return ""
}

export function IDEBoardContext({
  domainSlug,
  domainId,
  activeJourneyId,
  selectedDraftId,
  selectedMomentId,
}: IDEBoardContextProps) {
  const [journey, setJourney] = React.useState<JourneyMeta | null>(null)
  const [moments, setMoments] = React.useState<JourneyMoment[]>([])
  const [draftDetail, setDraftDetail] = React.useState<KipDraft | null>(null)
  const [loadState, setLoadState] = React.useState<LoadState>("idle")
  const [draftLoadState, setDraftLoadState] = React.useState<LoadState>("idle")
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [momentRow, setMomentRow] = React.useState<KeptRow | null>(null)
  const [momentLoadState, setMomentLoadState] = React.useState<LoadState>("idle")

  // Draft (context panel) — Kip API
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
        if (!cancelled) {
          setDraftDetail(d)
          setDraftLoadState("ready")
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDraftDetail(null)
          setDraftLoadState("error")
        }
      })
    return () => {
      cancelled = true
    }
  }, [selectedDraftId, domainId])

  // Moment — list API first (same pattern as FeedFrame), then authenticated single fetch
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
        if (!cancelled) {
          setMomentRow(null)
          setMomentLoadState("error")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedMomentId, domainSlug])

  // Journey — public API (when draft and moment are not the primary context focus)
  React.useEffect(() => {
    if (!domainSlug) return
    if (selectedDraftId) {
      setJourney(null)
      setMoments([])
      setLoadState("idle")
      return
    }
    if (selectedMomentId) {
      setJourney(null)
      setMoments([])
      setLoadState("idle")
      return
    }

    let cancelled = false
    const base = getApiBase()

    const loadJourney = async (jid: string) => {
      const res = await fetch(
        `${base}/api/public/${encodeURIComponent(domainSlug)}/journeys/${encodeURIComponent(jid)}`,
      )
      if (!res.ok) throw new Error(String(res.status))
      const data = (await res.json()) as {
        journey: JourneyMeta
        moments: JourneyMoment[]
      }
      if (cancelled) return
      setJourney(data.journey)
      setMoments(Array.isArray(data.moments) ? data.moments : [])
      setLoadState("ready")
    }

    if (activeJourneyId) {
      setLoadState("loading")
      setExpandedId(null)
      loadJourney(activeJourneyId).catch(() => {
        if (!cancelled) setLoadState("error")
      })
      return () => {
        cancelled = true
      }
    }

    setExpandedId(null)
    setLoadState("loading")
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

    return () => {
      cancelled = true
    }
  }, [domainSlug, activeJourneyId, selectedDraftId, selectedMomentId])

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  // Priority: draft → moment → journey
  if (selectedDraftId) {
    const title = draftDetail?.title?.trim() || "Draft"
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
            Draft
          </p>
          <p
            className="text-[14px] font-semibold mt-1 truncate"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {draftLoadState === "loading" ? "Loading…" : title}
          </p>
          {draftDetail && (
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize"
                style={{
                  background: "hsl(var(--theme-surface-elevated))",
                  border: "1px solid hsl(var(--theme-line-hairline))",
                  color: "hsl(var(--theme-ink-tertiary))",
                }}
              >
                {draftDetail.status}
              </span>
              {draftDetail.updatedAt && (
                <span
                  className="text-[10px]"
                  style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                >
                  Updated {formatDate(String(draftDetail.updatedAt))}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 py-4 text-[12px] leading-relaxed">
          {draftLoadState === "loading" && (
            <p style={{ color: "hsl(var(--theme-ink-tertiary))" }}>Loading draft…</p>
          )}
          {draftLoadState === "error" && (
            <p style={{ color: "hsl(var(--theme-ink-tertiary))" }}>Couldn&apos;t load this draft.</p>
          )}
          {draftLoadState === "ready" && draftDetail && (
            <pre
              className="whitespace-pre-wrap font-sans"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {draftBodyText(draftDetail)}
            </pre>
          )}
        </div>
      </div>
    )
  }

  if (selectedMomentId) {
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
            Moment
          </p>
          <p
            className="text-[14px] font-semibold mt-1 truncate"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {momentLoadState === "loading" ? "Loading…" : momentRow?.title?.trim() || "Moment"}
          </p>
        </div>
        <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto">
          {momentLoadState === "loading" && (
            <p
              className="px-4 py-6 text-[12px]"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              Loading moment…
            </p>
          )}
          {momentLoadState === "error" && (
            <p
              className="px-4 py-6 text-[12px]"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              Couldn&apos;t load this moment.
            </p>
          )}
          {momentLoadState === "ready" && momentRow && <MomentDetailPanel moment={momentRow} />}
        </div>
      </div>
    )
  }

  const bannerTitle = journey?.name ?? (loadState === "loading" ? "Loading…" : "Journey")

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

      <div className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto">
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
