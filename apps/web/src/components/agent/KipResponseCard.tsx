/**
 * KipResponseCard
 *
 * Renders a structured keeper-card block from Kip's response content.
 * Replaces the fenced ```keeper-card ... ``` code block when the JSON
 * inside is valid and contains a "type" field.
 *
 * Props map directly to the JSON shape Kip emits inside the block.
 */

import * as React from "react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KipResponseCardProps {
  /** "status" | "summary" | "error" | "info" | "known_issue" | "chronicle_update" */
  type: string
  title: string
  body?: string
  meta?: string
  /** Optional list of lines rendered without bullet markers */
  items?: string[]
  /** Deep-link into Chronicle Document when provided (Known Issue / anchored cards). */
  onOpen?: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Visible type label — status suppressed by design */
function resolveTypeLabel(type: string): { text: string | null; isError: boolean } {
  switch (type) {
    case "status":
      return { text: null, isError: false }
    case "summary":
      return { text: "Summary", isError: false }
    case "error":
      return { text: "Error", isError: true }
    case "info":
      return { text: "Info", isError: false }
    case "known_issue":
      return { text: "Known issue", isError: false }
    case "chronicle_update":
      return { text: "Chronicle", isError: false }
    default:
      return { text: type, isError: false }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function KipResponseCard({
  type,
  title,
  body,
  meta,
  items,
  onOpen,
}: KipResponseCardProps) {
  const { text: typeLabel, isError } = resolveTypeLabel(type)
  const actionable = typeof onOpen === "function"
  const Tag = actionable ? "button" : "div"

  return (
    <Tag
      type={actionable ? "button" : undefined}
      onClick={actionable ? onOpen : undefined}
      className={actionable ? "kip-response-card kip-response-card--actionable" : "kip-response-card kip-response-card--static"}
      data-actionable={actionable ? "true" : "false"}
      style={{
        display: "flex",
        alignItems: "stretch",
        gap: 0,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        textAlign: "left",
        background: actionable
          ? "hsl(var(--theme-surface-paper) / 0.90)"
          : "hsl(var(--theme-surface-panel) / 0.45)",
        border: actionable
          ? "1px solid hsl(var(--theme-border-soft) / 0.45)"
          : "1px solid hsl(var(--theme-border-soft) / 0.28)",
        borderRadius: "8px",
        marginTop: "8px",
        overflow: "hidden",
        cursor: actionable ? "pointer" : "default",
        opacity: actionable ? 1 : 0.78,
      }}
      aria-label={actionable ? `Open in Chronicle — ${title}` : undefined}
    >
      <div
        aria-hidden
        style={{
          width: 3,
          flexShrink: 0,
          background: isError
            ? "hsl(0 60% 50%)"
            : "hsl(var(--theme-accent-primary, 42 55% 48%) / 0.9)",
        }}
      />
      <div style={{ flex: 1, minWidth: 0, padding: "12px 16px" }}>
      {/* Type label — hidden for "status" */}
      {typeLabel && (
        <p
          style={{
            fontSize: "10px",
            fontVariant: "small-caps",
            letterSpacing: "0.08em",
            textTransform: "lowercase",
            color: isError
              ? "hsl(0 60% 50%)"
              : "hsl(var(--theme-ink-tertiary))",
            margin: "0 0 4px",
            lineHeight: 1,
          }}
        >
          {typeLabel}
        </p>
      )}

      {/* Title */}
      <p
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "18px",
          fontWeight: 400,
          lineHeight: 1.3,
          color: "hsl(var(--theme-ink-primary))",
          margin: 0,
        }}
      >
        {title}
      </p>

      {/* Body */}
      {body && (
        <p
          style={{
            fontSize: "14px",
            color: "hsl(var(--muted-foreground, var(--theme-ink-secondary)))",
            lineHeight: 1.5,
            margin: "6px 0 0",
          }}
        >
          {body}
        </p>
      )}

      {/* Items — one per line, no bullets */}
      {items && items.length > 0 && (
        <div style={{ marginTop: "6px" }}>
          {items.map((item, idx) => (
            <p
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
              style={{
                fontSize: "14px",
                color: "hsl(var(--muted-foreground, var(--theme-ink-secondary)))",
                lineHeight: 1.5,
                margin: "2px 0 0",
              }}
            >
              {item}
            </p>
          ))}
        </div>
      )}

      {/* Meta */}
      {meta && (
        <p
          style={{
            fontSize: "12px",
            fontStyle: "italic",
            color: "hsl(var(--theme-ink-tertiary))",
            margin: "8px 0 0",
            lineHeight: 1.4,
          }}
        >
          {meta}
        </p>
      )}
      {actionable ? (
        <p
          style={{
            fontSize: "12px",
            color: "hsl(var(--theme-accent-primary))",
            margin: "8px 0 0",
            lineHeight: 1.4,
          }}
        >
          Open in Chronicle →
        </p>
      ) : null}
      </div>
    </Tag>
  )
}

export default KipResponseCard
