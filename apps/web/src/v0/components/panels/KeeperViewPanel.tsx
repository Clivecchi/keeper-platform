"use client"

/**
 * KeeperViewPanel
 *
 * Default right-panel view state for IDE Board and Domain Board.
 * Surfaces when no Journey, Draft, Moment, or Keeper is explicitly selected.
 * This is the session resumption surface: where you are, what you were doing,
 * where you can return to.
 *
 * Three sections:
 *   1 — Keeper identity (name + description)
 *   2 — Recent Sessions (top 3, tappable)
 *   3 — Active Journeys (tappable, shows moment count)
 */

import * as React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KeeperViewSession {
  id: string
  title: string
  updatedAt: string
}

export interface KeeperViewJourney {
  id: string
  title: string
  momentCount: number
}

export interface KeeperViewPanelProps {
  keeper: { name: string; description?: string | null }
  recentSessions: KeeperViewSession[]
  activeJourneys: KeeperViewJourney[]
  onSessionSelect: (id: string) => void
  onJourneySelect: (id: string) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const diffMs = Date.now() - d.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  if (diffMins < 2) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours === 1 ? "1h" : `${diffHours}h`} ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return "yesterday"
  if (diffDays < 14) return `${diffDays}d ago`
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
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

interface RowButtonProps {
  onClick: () => void
  left: React.ReactNode
  right?: React.ReactNode
}

function RowButton({ onClick, left, right }: RowButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-baseline justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
      style={{ background: "hsl(var(--theme-surface-paper) / 0.50)" }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.background =
          "hsl(var(--theme-surface-paper) / 0.85)"
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.background =
          "hsl(var(--theme-surface-paper) / 0.50)"
      }}
    >
      <span
        className="flex-1 min-w-0 text-[13px] font-medium leading-snug truncate"
        style={{ color: "hsl(var(--theme-ink-primary))" }}
      >
        {left}
      </span>
      {right != null && (
        <span
          className="shrink-0 text-[10px] whitespace-nowrap tabular-nums"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          {right}
        </span>
      )}
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KeeperViewPanel({
  keeper,
  recentSessions,
  activeJourneys,
  onSessionSelect,
  onJourneySelect,
}: KeeperViewPanelProps) {
  const top3 = recentSessions.slice(0, 3)

  return (
    <div
      className="keeper-panel-scroll flex flex-col h-full min-h-0 overflow-y-auto"
      style={{ color: "hsl(var(--theme-ink-primary))" }}
    >
      {/* ── Section 1: Keeper identity ──────────────────────────────────────── */}
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
          {keeper.name}
        </p>
        {keeper.description?.trim() ? (
          <p
            className="mt-1.5 text-[13px] leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {keeper.description.trim()}
          </p>
        ) : null}
        <SectionRule />
      </div>

      {/* ── Section 2: Recent Sessions ──────────────────────────────────────── */}
      <div className="px-5">
        <SectionLabel>Recent Sessions</SectionLabel>

        {top3.length === 0 ? (
          <p
            className="text-[12px] italic"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            No sessions yet
          </p>
        ) : (
          <ul className="space-y-1">
            {top3.map((s) => {
              const when = relativeTime(s.updatedAt)
              return (
                <li key={s.id}>
                  <RowButton
                    onClick={() => onSessionSelect(s.id)}
                    left={s.title}
                    right={when || undefined}
                  />
                </li>
              )
            })}
          </ul>
        )}

        <SectionRule />
      </div>

      {/* ── Section 3: Active Journeys ──────────────────────────────────────── */}
      <div className="px-5 pb-8">
        <SectionLabel>Journeys</SectionLabel>

        {activeJourneys.length === 0 ? (
          <p
            className="text-[12px] italic"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            No journeys yet
          </p>
        ) : (
          <ul className="space-y-1">
            {activeJourneys.map((j) => (
              <li key={j.id}>
                <RowButton
                  onClick={() => onJourneySelect(j.id)}
                  left={j.title}
                  right={
                    `${j.momentCount} ${j.momentCount === 1 ? "moment" : "moments"}`
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default KeeperViewPanel
