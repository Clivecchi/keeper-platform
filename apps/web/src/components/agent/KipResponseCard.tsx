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
  /** "status" | "summary" | "error" | "info" */
  type: string
  title: string
  body?: string
  meta?: string
  /** Optional list of lines rendered without bullet markers */
  items?: string[]
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
}: KipResponseCardProps) {
  const { text: typeLabel, isError } = resolveTypeLabel(type)

  return (
    <div
      style={{
        background: "hsl(var(--theme-surface-paper) / 0.90)",
        border: "1px solid hsl(var(--theme-surface-paper) / 0.40)",
        borderRadius: "8px",
        padding: "12px 16px",
        marginTop: "8px",
      }}
    >
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
    </div>
  )
}

export default KipResponseCard
