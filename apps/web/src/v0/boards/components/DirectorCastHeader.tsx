"use client"

import * as React from "react"
import type { BoardInstrumentChip } from "./BoardInstrumentsBar"

/**
 * Header cast strip — identity for every director board + Add for cross-domain
 * lead agents (Phase 1 membership). Invoke stays on BoardInstrumentsBar.
 */

export type CastCandidate = {
  homeDomainId: string
  homeDomainSlug: string
  homeDomainName: string
  agentId: string
  agentSlug: string
  agentName: string
}

export interface DirectorCastHeaderProps {
  instruments: ReadonlyArray<BoardInstrumentChip>
  /** Eyebrow — "Cast" on Realm, "Agents" elsewhere when preferred. */
  eyebrow?: string
  /** Right-aligned manage chrome (Realm Invite / Get key / Manage). */
  trailing?: React.ReactNode
  /**
   * Cross-domain addable lead agents (from domains the user administers).
   * When provided with onEnableCandidate, shows an Add control.
   */
  castCandidates?: ReadonlyArray<CastCandidate>
  onEnableCandidate?: (homeDomainId: string) => void | Promise<void>
  /** True while enable request is in flight. */
  enablingCast?: boolean
  /** When false, Add is disabled (no active Dialog yet). */
  castAddEnabled?: boolean
}

export function DirectorCastHeader({
  instruments,
  eyebrow = "Cast",
  trailing = null,
  castCandidates = [],
  onEnableCandidate,
  enablingCast = false,
  castAddEnabled = true,
}: DirectorCastHeaderProps) {
  const [pickerOpen, setPickerOpen] = React.useState(false)
  const showAdd = typeof onEnableCandidate === "function"

  if (instruments.length === 0 && !showAdd) return null

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
          position: "relative",
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
          {showAdd ? (
            <button
              type="button"
              className="text-[11px]"
              disabled={!castAddEnabled || enablingCast}
              aria-expanded={pickerOpen}
              aria-haspopup="listbox"
              title={
                !castAddEnabled
                  ? "Select a Dialog to add cast members"
                  : castCandidates.length === 0
                    ? "No lead agents available from domains you administer"
                    : "Add a lead agent from a domain you administer"
              }
              onClick={() => setPickerOpen((open) => !open)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "3px 8px",
                border: "1px dashed hsl(var(--theme-border-soft) / 0.55)",
                borderRadius: "999px",
                backgroundColor: "transparent",
                color: "hsl(var(--theme-ink-secondary))",
                cursor: !castAddEnabled || enablingCast ? "default" : "pointer",
                opacity: !castAddEnabled ? 0.45 : 1,
                flexShrink: 0,
              }}
            >
              Add
            </button>
          ) : null}
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

        {pickerOpen && showAdd ? (
          <div
            role="listbox"
            aria-label="Addable cast agents"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 4,
              zIndex: 40,
              minWidth: 220,
              maxWidth: 320,
              padding: 6,
              borderRadius: 8,
              border: "1px solid hsl(var(--theme-border-soft) / 0.5)",
              backgroundColor: "hsl(var(--theme-surface-elevated))",
              boxShadow: "0 8px 24px hsl(var(--theme-ink-primary) / 0.12)",
            }}
          >
            {castCandidates.length === 0 ? (
              <p
                className="text-[11px]"
                style={{
                  margin: 0,
                  padding: "8px 10px",
                  color: "hsl(var(--theme-ink-tertiary))",
                }}
              >
                No other domain leads available. You need Admin on another domain
                whose lead is not already on this board.
              </p>
            ) : (
              castCandidates.map((candidate) => (
                <button
                  key={`${candidate.homeDomainId}:${candidate.agentId}`}
                  type="button"
                  role="option"
                  disabled={enablingCast}
                  onClick={() => {
                    void Promise.resolve(onEnableCandidate?.(candidate.homeDomainId)).finally(
                      () => setPickerOpen(false),
                    )
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "8px 10px",
                    border: "none",
                    borderRadius: 6,
                    backgroundColor: "transparent",
                    cursor: enablingCast ? "default" : "pointer",
                    color: "var(--theme-ink-primary-color)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "hsl(var(--theme-surface-paper) / 0.8)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent"
                  }}
                >
                  <span className="text-xs" style={{ fontWeight: 600 }}>
                    {candidate.agentName}
                  </span>
                  <span
                    className="text-[10px]"
                    style={{
                      display: "block",
                      marginTop: 2,
                      color: "hsl(var(--theme-ink-tertiary))",
                    }}
                  >
                    from {candidate.homeDomainName}
                  </span>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function CastIdentityChip({ chip }: { chip: BoardInstrumentChip }) {
  const isLead = Boolean(chip.isDirector)
  const participation = chip.dialogParticipation ?? "voice"
  const participationLabel =
    participation === "support_only"
      ? "Support"
      : participation === "silent"
        ? "Silent"
        : null
  const title = isLead
    ? `${chip.label} — Lead`
    : participationLabel
      ? `${chip.label} — ${participationLabel}`
      : `${chip.label} — available`
  return (
    <span
      title={title}
      aria-label={title}
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
        ) : participationLabel ? (
          <span
            style={{
              marginLeft: 4,
              fontSize: "9px",
              letterSpacing: "0.04em",
              color: "hsl(var(--theme-ink-placeholder))",
              fontWeight: 500,
            }}
          >
            {participationLabel}
          </span>
        ) : null}
      </span>
    </span>
  )
}
