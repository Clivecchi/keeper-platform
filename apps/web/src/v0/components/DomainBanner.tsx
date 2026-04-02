"use client"

import * as React from "react"
import type { DomainFrameJson } from "../data/domain-frame.types"

export interface DomainBannerProps {
  domainFrame: DomainFrameJson | null
  /** Shown when theme wordmark is missing (e.g. domain slug). */
  fallbackWordmark?: string
  journeyCount: number | null
  momentCount: number | null
}

/**
 * Slim center-panel header for Domain Board: identity, live pulse, quick stats.
 * Styling uses `--theme-*` tokens from an ancestor `StyleScope`.
 */
export function DomainBanner({
  domainFrame,
  fallbackWordmark = "—",
  journeyCount,
  momentCount,
}: DomainBannerProps) {
  const wordmark = domainFrame?.theme?.wordmark?.trim() || fallbackWordmark
  const tagline = (() => {
    const card = domainFrame?.cover?.card as { tagLine?: string } | undefined
    return card?.tagLine?.trim() || domainFrame?.theme?.tagline?.trim() || ""
  })()

  const primaryAccent = domainFrame?.theme?.colors?.primary?.trim()
  const liveDotStyle: React.CSSProperties = primaryAccent
    ? {
        backgroundColor: primaryAccent,
        boxShadow: `0 0 0 2px color-mix(in srgb, ${primaryAccent} 35%, transparent)`,
      }
    : {
        backgroundColor: "hsl(var(--theme-border-strong))",
        boxShadow: "0 0 0 2px hsl(var(--theme-border-soft) / 0.6)",
      }

  const statJourneys = journeyCount === null ? "—" : String(journeyCount)
  const statMoments =
    momentCount === null ? "—" : momentCount >= 500 ? "500+" : String(momentCount)

  return (
    <header
      className="shrink-0 flex items-center justify-between gap-3 px-3 border-b min-h-0 overflow-hidden"
      style={{
        maxHeight: 80,
        borderColor: "hsl(var(--theme-line-hairline))",
        background: "hsl(var(--theme-surface-paper))",
      }}
    >
      <div className="min-w-0 flex-1 flex items-center gap-3">
        <div className="min-w-0">
          <p
            className="font-serif text-lg font-semibold leading-tight truncate"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {wordmark}
          </p>
          {tagline ? (
            <p
              className="text-xs leading-snug truncate mt-0.5"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {tagline}
            </p>
          ) : null}
        </div>
        <div
          className="shrink-0 flex items-center gap-1.5 pl-2 border-l"
          style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
        >
          <span className="h-2 w-2 rounded-full shrink-0" style={liveDotStyle} aria-hidden />
          <span
            className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            Live
          </span>
        </div>
      </div>
      <dl
        className="shrink-0 flex items-center gap-4 text-right"
        style={{ color: "hsl(var(--theme-ink-secondary))" }}
      >
        <div>
          <dt className="text-[9px] font-semibold uppercase tracking-widest">Journeys</dt>
          <dd className="text-sm font-medium tabular-nums" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            {statJourneys}
          </dd>
        </div>
        <div>
          <dt className="text-[9px] font-semibold uppercase tracking-widest">Moments</dt>
          <dd className="text-sm font-medium tabular-nums" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            {statMoments}
          </dd>
        </div>
      </dl>
    </header>
  )
}
