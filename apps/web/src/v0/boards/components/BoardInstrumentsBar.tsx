"use client"

import * as React from "react"

export type BoardInstrumentChip = {
  slug: string
  label: string
}

export interface BoardInstrumentsBarProps {
  /** Eyebrow label — "Agents" on Domain board, "Tools" on IDE when used standalone. */
  eyebrow?: string
  instruments: ReadonlyArray<BoardInstrumentChip>
  activeSlug?: string | null
  onInvoke?: (slug: string) => void
}

export function BoardInstrumentsBar({
  eyebrow = "Agents",
  instruments,
  activeSlug = null,
  onInvoke,
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
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {instruments.map(({ slug, label }) => (
            <InstrumentChip
              key={slug}
              slug={slug}
              label={label}
              isActive={activeSlug === slug}
              onInvoke={onInvoke}
            />
          ))}
        </div>
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
  onInvoke,
  slug,
}: {
  slug: string
  label: string
  isActive: boolean
  onInvoke: (slug: string) => void
}) {
  const [hovered, setHovered] = React.useState(false)

  return (
    <button
      type="button"
      aria-label={
        isActive
          ? `Unpin ${label} — stop delegating to ${label}`
          : `Pin ${label} for delegation`
      }
      title={
        isActive
          ? `Unpin ${label} — Kip keeps the composer`
          : `Pin ${label} — delegate turns to ${label}, Kip synthesizes`
      }
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
        border: `1px solid ${isActive ? "hsl(var(--theme-ink-primary) / 0.35)" : "hsl(var(--theme-border-soft) / 0.4)"}`,
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
          backgroundColor: isActive
            ? "hsl(var(--theme-ink-primary))"
            : "hsl(var(--theme-ink-tertiary))",
          flexShrink: 0,
        }}
      />
      <span
        className="text-xs"
        style={{
          color: isActive
            ? "var(--theme-ink-primary-color)"
            : "var(--theme-ink-secondary-color)",
          fontWeight: isActive ? 600 : 500,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </button>
  )
}
