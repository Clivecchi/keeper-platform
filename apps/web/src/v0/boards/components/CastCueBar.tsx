"use client"

import * as React from "react"

/**
 * Composer invoke bar for directed-cueing boards.
 *
 * Header cast identity lives in DirectorCastHeader. This bar is the click target:
 * lead is always engaged (leadLocked); Cast members pin/toggle here.
 *
 * selectionMode:
 *   - "single" (IDE/Designer) — one active Cast member at a time (swap)
 *   - "multi" (Domain/Realm) — many non-lead Cast members may be cued together
 */

export type CastMemberChip = {
  slug: string
  label: string
  /** Director (Lead) — always shown as engaged; click is a no-op when leadLocked. */
  isDirector?: boolean
  /** Declared Dialog-voice mode from agent config.dialog_participation. */
  dialogParticipation?: "voice" | "support_only" | "silent"
}

export type CastCueSelectionMode = "single" | "multi"

export interface CastCueBarProps {
  /** Eyebrow label — "Agents" on director boards. */
  eyebrow?: string
  instruments: ReadonlyArray<CastMemberChip>
  /** Single-swap active pin (IDE/Designer). Ignored when selectionMode is "multi". */
  activeSlug?: string | null
  /** Multi-select cued Cast members (Domain/Realm). Ignored when selectionMode is "single". */
  activeSlugs?: ReadonlyArray<string>
  onInvoke?: (slug: string) => void
  selectionMode?: CastCueSelectionMode
  /** Lead chip stays engaged; clicking lead does not clear Cast members. Default true. */
  leadLocked?: boolean
  /** Lead-led domain: chips toggle support inclusion; lead stays in composer toolbar. */
  collaborationMode?: boolean
  /** Right-aligned actions (rarely used — Realm manage chrome prefers the header). */
  trailing?: React.ReactNode
  /** Extra sections after Cast chips (e.g. IDE Services). */
  after?: React.ReactNode
}

export function CastCueBar({
  eyebrow = "Agents",
  instruments,
  activeSlug = null,
  activeSlugs = [],
  onInvoke,
  selectionMode = "single",
  leadLocked = true,
  collaborationMode = false,
  trailing = null,
  after = null,
}: CastCueBarProps) {
  if (!onInvoke || instruments.length === 0) return null

  const [barHovered, setBarHovered] = React.useState(false)
  const activeSet = React.useMemo(
    () => new Set(activeSlugs.map((s) => s.trim()).filter(Boolean)),
    [activeSlugs],
  )

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
          {instruments.map(({ slug, label, isDirector }) => {
            const isActive = isDirector
              ? true
              : selectionMode === "multi"
                ? activeSet.has(slug)
                : activeSlug === slug
            return (
              <CastChipButton
                key={slug}
                slug={slug}
                label={label}
                isDirector={isDirector}
                isActive={isActive}
                leadLocked={leadLocked}
                onInvoke={onInvoke}
                selectionMode={selectionMode}
                collaborationMode={collaborationMode}
              />
            )
          })}
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

function CastChipButton({
  label,
  isActive,
  isDirector = false,
  leadLocked = true,
  onInvoke,
  slug,
  selectionMode,
  collaborationMode = false,
}: {
  slug: string
  label: string
  isDirector?: boolean
  isActive: boolean
  leadLocked?: boolean
  onInvoke: (slug: string) => void
  selectionMode: CastCueSelectionMode
  collaborationMode?: boolean
}) {
  const [hovered, setHovered] = React.useState(false)
  const leadIsLocked = Boolean(isDirector && leadLocked)

  const ariaLabel = collaborationMode
    ? isActive
      ? `Remove ${label} from this conversation`
      : `Include ${label} in this conversation`
    : leadIsLocked
      ? `${label} is Lead — always engaged`
      : selectionMode === "multi"
        ? isActive
          ? `Remove ${label} from collaboration`
          : `Include ${label} in collaboration`
        : isDirector
          ? `${label} is collaborating — click to clear Cast pin`
          : isActive
            ? `Unpin ${label} — stop delegating to ${label}`
            : `Pin ${label} for delegation`

  const title = collaborationMode
    ? isActive
      ? `${label} will chime in after the lead — click to exclude`
      : `${label} is excluded — click to include in collaboration`
    : leadIsLocked
      ? `${label} leads this board — always engaged`
      : selectionMode === "multi"
        ? isActive
          ? `${label} is collaborating — click to leave`
          : `Include ${label} alongside the Lead`
        : isDirector
          ? `${label} is collaborating — click when you want ${label} to answer alone`
          : isActive
            ? `Unpin ${label} — Kip keeps the composer`
            : `Pin ${label} — delegate turns to ${label}, Kip synthesizes`

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title}
      aria-pressed={isActive}
      disabled={leadIsLocked}
      onClick={(e) => {
        e.stopPropagation()
        if (leadIsLocked) return
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
          : hovered && !leadIsLocked
            ? "hsl(var(--theme-surface-paper) / 0.8)"
            : "hsl(var(--theme-surface-paper) / 0.35)",
        cursor: leadIsLocked ? "default" : "pointer",
        transition: "background-color 100ms ease, border-color 100ms ease",
        flexShrink: 0,
        opacity: leadIsLocked ? 1 : undefined,
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
