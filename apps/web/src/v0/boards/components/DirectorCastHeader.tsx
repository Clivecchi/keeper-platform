"use client"

import * as React from "react"
import type { BoardInstrumentChip } from "./BoardInstrumentsBar"

/**
 * Header cast strip — identity only for every director board.
 *
 * Design split (Chuck): "cast managed through the header. But invokeable at the composer."
 * This strip answers who is Lead and who is available. Click-to-engage lives on
 * BoardInstrumentsBar in the composer footer — not here.
 */

export interface DirectorCastHeaderProps {
  instruments: ReadonlyArray<BoardInstrumentChip>
  /** Eyebrow — "Cast" on Realm, "Agents" elsewhere when preferred. */
  eyebrow?: string
  /** Right-aligned manage chrome (Realm Invite / Get key / Manage). */
  trailing?: React.ReactNode
}

export function DirectorCastHeader({
  instruments,
  eyebrow = "Cast",
  trailing = null,
}: DirectorCastHeaderProps) {
  if (instruments.length === 0) return null

  return (
    <div
      className="dialog-header-cast"
      role="presentation"
      style={{
        padding: "0 12px",
        borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.35)",
        backgroundColor: "hsl(var(--theme-surface-paper) / 0.35)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          padding: "5px 0 6px",
          flexWrap: "wrap",
          width: "100%",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            color: "hsl(var(--theme-ink-placeholder))",
            letterSpacing: "0.04em",
            flexShrink: 0,
            marginRight: "12px",
          }}
        >
          {eyebrow}
        </span>
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
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          {instruments.map((chip) => (
            <CastIdentityChip key={chip.slug} chip={chip} />
          ))}
        </div>
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

function CastIdentityChip({ chip }: { chip: BoardInstrumentChip }) {
  const isLead = Boolean(chip.isDirector)
  return (
    <span
      title={isLead ? `${chip.label} — Lead` : `${chip.label} — available`}
      aria-label={isLead ? `${chip.label} — Lead` : `${chip.label} — available`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "3px 8px",
        border: `1px solid ${
          isLead
            ? "hsl(var(--theme-ink-primary) / 0.45)"
            : "hsl(var(--theme-border-soft) / 0.4)"
        }`,
        borderRadius: "999px",
        backgroundColor: isLead
          ? "hsl(var(--theme-surface-elevated) / 0.9)"
          : "hsl(var(--theme-surface-paper) / 0.35)",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          backgroundColor: isLead
            ? "hsl(var(--theme-ink-primary))"
            : "hsl(var(--theme-ink-tertiary))",
          flexShrink: 0,
        }}
      />
      <span
        className="text-xs"
        style={{
          color: isLead
            ? "var(--theme-ink-primary-color)"
            : "var(--theme-ink-secondary-color)",
          fontWeight: isLead ? 600 : 500,
          whiteSpace: "nowrap",
        }}
      >
        {chip.label}
        {isLead ? (
          <span
            style={{
              marginLeft: 4,
              fontSize: "9px",
              letterSpacing: "0.04em",
              color: "hsl(var(--theme-ink-placeholder))",
              fontWeight: 500,
            }}
          >
            Lead
          </span>
        ) : null}
      </span>
    </span>
  )
}
