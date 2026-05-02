"use client"

/**
 * HomeViewPanel
 *
 * Top-level view state for IDE Board and Domain Board.
 * Shown when nothing is selected and no specific Keeper is in focus.
 * Orients the user across the whole platform: what is active, where to return.
 *
 * Two sections:
 *   1 — Platform identity (name + tagline)
 *   2 — Active Journeys (cross-domain, up to 5, with domain + keeper context)
 */

import * as React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HomeViewJourney {
  id: string
  title: string
  momentCount: number
  domain: string
  keeperName: string
}

export interface HomeViewPanelProps {
  platformName: string
  activeJourneys: HomeViewJourney[]
  onJourneySelect: (id: string) => void
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-3 text-[10px] font-semibold uppercase tracking-widest"
      style={{
        fontFamily: "'Cormorant Garamond', Georgia, serif",
        color: "hsl(var(--theme-ink-tertiary))",
      }}
    >
      {children}
    </p>
  )
}

function SectionRule() {
  return (
    <div
      className="my-5"
      style={{ height: 1, background: "hsl(var(--theme-line-hairline) / 0.45)" }}
    />
  )
}

function JourneyRow({
  journey,
  onSelect,
}: {
  journey: HomeViewJourney
  onSelect: () => void
}) {
  const [hovered, setHovered] = React.useState(false)
  const contextLine = [journey.domain, journey.keeperName].filter(Boolean).join(" · ")
  const countLabel =
    journey.momentCount === 1 ? "1 moment" : `${journey.momentCount} moments`

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left rounded-lg px-3 py-2.5 transition-colors"
      style={{
        background: hovered
          ? "hsl(var(--theme-surface-paper) / 0.85)"
          : "hsl(var(--theme-surface-paper) / 0.50)",
      }}
    >
      {/* Title row */}
      <div className="flex items-baseline justify-between gap-3">
        <span
          className="flex-1 min-w-0 leading-snug truncate"
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "15px",
            fontWeight: 600,
            color: "hsl(var(--theme-ink-primary))",
          }}
        >
          {journey.title}
        </span>
        <span
          className="shrink-0 text-[10px] whitespace-nowrap tabular-nums"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {countLabel}
        </span>
      </div>

      {/* Context line */}
      {contextLine ? (
        <p
          className="mt-0.5 text-[11px] truncate"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {contextLine}
        </p>
      ) : null}
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

const FALLBACK_TAGLINE = "cryptically designed, wonderfully unfolded"

export function HomeViewPanel({
  platformName,
  activeJourneys,
  onJourneySelect,
}: HomeViewPanelProps) {
  const capped = activeJourneys.slice(0, 5)

  return (
    <div
      className="keeper-panel-scroll flex flex-col h-full min-h-0 overflow-y-auto"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      {/* ── Section 1: Platform identity ──────────────────────────────────────── */}
      <div className="px-5 pt-6">
        <p
          style={{
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "28px",
            fontWeight: 600,
            lineHeight: 1.15,
            letterSpacing: "-0.01em",
            color: "hsl(var(--theme-ink-primary))",
          }}
        >
          {platformName}
        </p>
        <p
          className="mt-1.5 text-[13px] leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {FALLBACK_TAGLINE}
        </p>
        <SectionRule />
      </div>

      {/* ── Section 2: Active Journeys ────────────────────────────────────────── */}
      <div className="px-5 pb-8">
        <SectionLabel>Active Journeys</SectionLabel>

        {capped.length === 0 ? (
          <p
            className="text-[12px] italic"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            No active journeys
          </p>
        ) : (
          <ul className="space-y-1">
            {capped.map((j) => (
              <li key={j.id}>
                <JourneyRow
                  journey={j}
                  onSelect={() => onJourneySelect(j.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default HomeViewPanel
