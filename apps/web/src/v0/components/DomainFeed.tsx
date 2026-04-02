"use client"

import * as React from "react"
import type { DomainFrameJson } from "../data/domain-frame.types"
import { apiFetch } from "../../lib/api"
import { getApiBase } from "../../lib/apiFetch"

const DEFAULT_EMPTY =
  "Nothing kept yet. Begin a Journey to start building."

export interface DomainFeedProps {
  domainSlug: string
  domainFrame: DomainFrameJson | null
}

type KeptRow = {
  id: string
  title: string
  keptAt: string | null
  createdAt: string
  journeyName?: string | null
}

type JourneyListItem = { id: string; name: string; createdAt: string }

type JourneyActivityRow = {
  id: string
  name: string
  lastMomentTitle: string | null
  pathCount: number
  momentCount: number
}

function emptyMessage(frame: DomainFrameJson | null): string {
  const fromCommons = frame?.commons?.messaging?.feed?.empty_detail?.trim()
  if (fromCommons) return fromCommons
  const fromTitle = frame?.commons?.messaging?.feed?.empty_title?.trim()
  if (fromTitle) return fromTitle
  return DEFAULT_EMPTY
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function DomainFeed({ domainSlug, domainFrame }: DomainFeedProps) {
  const [moments, setMoments] = React.useState<KeptRow[] | null>(null)
  const [journeys, setJourneys] = React.useState<JourneyActivityRow[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!domainSlug) return
    let cancelled = false

    const run = async () => {
      setError(null)
      try {
        const momentsJson = (await apiFetch(
          `/api/v0/moments?domainSlug=${encodeURIComponent(domainSlug)}&status=kept&limit=30`,
        )) as { success?: boolean; data?: KeptRow[] }

        const kept: KeptRow[] = Array.isArray(momentsJson?.data) ? momentsJson.data : []

        const base = getApiBase()
        const listRes = await fetch(
          `${base}/api/public/${encodeURIComponent(domainSlug)}/journeys`,
        )
        if (!listRes.ok) throw new Error(`journeys ${listRes.status}`)
        const listJson = (await listRes.json()) as { journeys?: JourneyListItem[] }
        const list = Array.isArray(listJson.journeys) ? listJson.journeys : []

        const sorted = [...list].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        const top = sorted.slice(0, 4)

        const detailRows = await Promise.all(
          top.map(async (j) => {
            try {
              const dRes = await fetch(
                `${base}/api/public/${encodeURIComponent(domainSlug)}/journeys/${encodeURIComponent(j.id)}`,
              )
              if (!dRes.ok) {
                return {
                  id: j.id,
                  name: j.name,
                  lastMomentTitle: null as string | null,
                  pathCount: 0,
                  momentCount: 0,
                }
              }
              const dJson = (await dRes.json()) as {
                paths?: { id: string }[]
                moments?: { title: string }[]
              }
              const paths = Array.isArray(dJson.paths) ? dJson.paths : []
              const mom = Array.isArray(dJson.moments) ? dJson.moments : []
              const lastMomentTitle =
                mom.length > 0 ? (mom[mom.length - 1]?.title?.trim() || null) : null
              return {
                id: j.id,
                name: j.name,
                lastMomentTitle,
                pathCount: paths.length,
                momentCount: mom.length,
              }
            } catch {
              return {
                id: j.id,
                name: j.name,
                lastMomentTitle: null as string | null,
                pathCount: 0,
                momentCount: 0,
              }
            }
          }),
        )

        if (!cancelled) {
          setMoments(kept)
          setJourneys(detailRows)
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load feed")
          setMoments([])
          setJourneys([])
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [domainSlug])

  const empty =
    moments &&
    journeys &&
    moments.length === 0 &&
    journeys.length === 0 &&
    !error

  const cardBase: React.CSSProperties = {
    borderColor: "hsl(var(--theme-line-hairline))",
    background: "hsl(var(--theme-surface-elevated))",
  }

  return (
    <div
      className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-4"
      style={{ background: "hsl(var(--theme-surface-page))" }}
    >
      {error ? (
        <p className="text-sm" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          {error}
        </p>
      ) : null}

      {!moments || !journeys ? (
        <p className="text-sm" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Loading activity…
        </p>
      ) : empty ? (
        <p className="text-sm text-center max-w-md mx-auto py-8" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          {emptyMessage(domainFrame)}
        </p>
      ) : null}

      {moments && moments.length > 0 ? (
        <section>
          <h3
            className="text-[10px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Recent moments
          </h3>
          <ul className="space-y-2">
            {moments.slice(0, 12).map((m) => (
              <li
                key={m.id}
                className="rounded-lg border px-3 py-2.5"
                style={cardBase}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className="text-[13px] font-medium leading-snug line-clamp-2 flex-1 min-w-0"
                    style={{ color: "hsl(var(--theme-ink-primary))" }}
                  >
                    {m.title?.trim() || "Untitled moment"}
                  </p>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide border"
                    style={{
                      borderColor: "hsl(var(--theme-border-soft))",
                      color: "hsl(var(--theme-ink-secondary))",
                    }}
                  >
                    Kept
                  </span>
                </div>
                <p className="text-[11px] mt-1 line-clamp-1" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                  {m.journeyName ? `${m.journeyName} · ` : ""}
                  {formatWhen(m.keptAt ?? m.createdAt)}
                </p>
                {/* Thumbnails: not returned by GET /api/v0/moments — future enhancement */}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {journeys && journeys.length > 0 ? (
        <section>
          <h3
            className="text-[10px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Journey activity
          </h3>
          <ul className="space-y-2">
            {journeys.map((j) => (
              <li
                key={j.id}
                className="rounded-lg border px-3 py-2.5"
                style={cardBase}
              >
                <p
                  className="text-[13px] font-medium leading-snug"
                  style={{ color: "hsl(var(--theme-ink-primary))" }}
                >
                  {j.name}
                </p>
                <p className="text-[11px] mt-1 line-clamp-2" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                  {j.lastMomentTitle
                    ? `Last moment: ${j.lastMomentTitle}`
                    : "No moments in journey yet"}
                  {j.pathCount > 0 || j.momentCount > 0
                    ? ` · ${j.pathCount} path${j.pathCount === 1 ? "" : "s"} · ${j.momentCount} moment${j.momentCount === 1 ? "" : "s"}`
                    : ""}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
