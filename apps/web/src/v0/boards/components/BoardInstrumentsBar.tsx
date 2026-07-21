"use client"

import * as React from "react"

/**
 * Shared director-mode agent roster + invocation chips.
 *
 * Wins over DialogCastBar for presentation: pure props (no fetch), explicit
 * `isDirector` lead-vs-instrument distinction, and the composer-footer slot
 * every Universal Board already uses. Realm-specific access chrome (Invite /
 * Get key / Manage) is optional `trailing` — not a second invocation pattern.
 */

export type BoardInstrumentChip = {
  slug: string
  label: string
  /** Director (Lead) — always shown as invoked; clears delegation when clicked. */
  isDirector?: boolean
}

export interface BoardInstrumentsBarProps {
  /** Eyebrow label — "Agents" on director boards. */
  eyebrow?: string
  instruments: ReadonlyArray<BoardInstrumentChip>
  activeSlug?: string | null
  onInvoke?: (slug: string) => void
  /** Lead-led domain: chips toggle support inclusion; lead stays in composer toolbar. */
  collaborationMode?: boolean
  /** Right-aligned actions (e.g. Realm Invite / Get key / Manage). */
  trailing?: React.ReactNode
  /** Extra sections after agent chips (e.g. IDE Services). */
  after?: React.ReactNode
}

export function BoardInstrumentsBar({
  eyebrow = "Agents",
  instruments,
  activeSlug = null,
  onInvoke,
  collaborationMode = false,
  trailing = null,
  after = null,
}: BoardInstrumentsBarProps) {
  if (!onInvoke || instruments.length === 0) return null

  const [barHovered, setBarHovered] = React.useState(false)

  return (
    <div
      role="presentation"
      onMouseEnter={() => setBarHovered(true)}
      onMouseLeave={() => setBarHovered(false)}
      style={{
        userSelect: "none",
        flex: 1,
        minWidth: 0,
        backgroundColor: barHovered
          ? "hsl(var(--theme-surface-paper) / 0.5)"
          : "transparent",
        transition: "background-color 120ms ease",
      }}
    >
      <div
        className="dialog-services-bar-inner"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          padding: "5px 0 6px",
          flexWrap: "wrap",
          width: "100%",
        }}
      >
        <BarEyebrow label={eyebrow} />
        <BarRule />
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {instruments.map(({ slug, label, isDirector }) => (
            <InstrumentChip
              key={slug}
              slug={slug}
              label={label}
              isDirector={isDirector}
              isActive={isDirector ? true : activeSlug === slug}
              onInvoke={onInvoke}
              collaborationMode={collaborationMode}
            />
          ))}
        </div>
        {after}
        {trailing ? (
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              gap: 8,
              flexShrink: 0,
              alignItems: "center",
            }}
          >
            {trailing}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function BarEyebrow({ label }: { label: string }) {
  return (
    <span
      style={{
        fontSize: "10px",
        color: "hsl(var(--theme-ink-placeholder))",
        letterSpacing: "0.04em",
        flexShrink: 0,
        marginRight: "12px",
      }}
    >
      {label}
    </span>
  )
}

function BarRule() {
  return (
    <span
      style={{
        display: "inline-block",
        width: "1px",
        height: "12px",
        backgroundColor: "hsl(var(--theme-line-hairline))",
        flexShrink: 0,
        marginRight: "12px",
      }}
    />
  )
}

function InstrumentChip({
  label,
  isActive,
  isDirector = false,
  onInvoke,
  slug,
  collaborationMode = false,
}: {
  slug: string
  label: string
  isDirector?: boolean
  isActive: boolean
  onInvoke: (slug: string) => void
  collaborationMode?: boolean
}) {
  const [hovered, setHovered] = React.useState(false)

  const ariaLabel = collaborationMode
    ? isActive
      ? `Remove ${label} from this conversation`
      : `Include ${label} in this conversation`
    : isDirector
      ? isActive
        ? `${label} is collaborating — click to delegate only to ${label}`
        : `${label} is pinned for delegation — click to restore ${label} as collaborator`
      : isActive
        ? `Unpin ${label} — stop delegating to ${label}`
        : `Pin ${label} for delegation`

  const title = collaborationMode
    ? isActive
      ? `${label} will chime in after the lead — click to exclude`
      : `${label} is excluded — click to include in collaboration`
    : isDirector
      ? isActive
        ? `${label} is collaborating — click when you want ${label} to answer alone`
        : `${label} is leading this turn — click to restore ${label} as collaborator`
      : isActive
        ? `Unpin ${label} — Kip keeps the composer`
        : `Pin ${label} — delegate turns to ${label}, Kip synthesizes`

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title}
      aria-pressed={isActive}
      onClick={(e) => {
        e.stopPropagation()
        onInvoke(slug)
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 8px",
        border: `1px solid ${
          isDirector
            ? "hsl(var(--theme-ink-primary) / 0.45)"
            : isActive
              ? "hsl(var(--theme-ink-primary) / 0.35)"
              : "hsl(var(--theme-border-soft) / 0.4)"
        }`,
        borderRadius: "999px",
        backgroundColor: isActive
          ? "hsl(var(--theme-surface-elevated) / 0.9)"
          : hovered
            ? "hsl(var(--theme-surface-paper) / 0.8)"
            : "hsl(var(--theme-surface-paper) / 0.35)",
        cursor: "pointer",
        transition: "background-color 100ms ease, border-color 100ms ease",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: isDirector || isActive
            ? "hsl(var(--theme-ink-primary))"
            : "hsl(var(--theme-ink-tertiary))",
          flexShrink: 0,
        }}
      />
      <span
        className="text-xs"
        style={{
          color: isActive || isDirector
            ? "var(--theme-ink-primary-color)"
            : "var(--theme-ink-secondary-color)",
          fontWeight: isDirector || isActive ? 600 : 500,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </button>
  )
}
