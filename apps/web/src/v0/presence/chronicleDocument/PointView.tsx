"use client"

import * as React from "react"
import type { Point } from "@keeper/shared"

export interface PointViewProps {
  /** Atomic card to render. */
  point?: Point
  /**
   * @deprecated Use `point`. Accepted so early call sites keep compiling during the split.
   */
  document?: Point
  /** Opens a Gloss exchange in Dialog for this point's anchor. */
  onGloss?: () => void
  /** @deprecated Use onGloss */
  onDiscuss?: () => void
}

export function PointView({ point, document, onGloss, onDiscuss }: PointViewProps) {
  const card = point ?? document
  if (!card) return null

  const handleGloss = onGloss ?? onDiscuss
  const [expanded, setExpanded] = React.useState(false)
  const clampLines = card.body.clampLines ?? 6
  const canExpand = card.body.expandable !== false && card.body.text.length > 280

  return (
    <article className="keeper-chronicle-document flex flex-col gap-2">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.12em]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {card.identity.label}
            {card.identity.subtitle ? ` · ${card.identity.subtitle}` : ""}
          </p>
          {card.status ? (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
              style={{
                color:
                  card.status.tone === "error"
                    ? "hsl(var(--theme-status-error))"
                    : card.status.tone === "active"
                      ? "hsl(var(--theme-status-success))"
                      : "hsl(var(--theme-ink-tertiary))",
                background:
                  card.status.tone === "error"
                    ? "hsl(var(--theme-status-error) / 0.12)"
                    : card.status.tone === "active"
                      ? "hsl(var(--theme-status-success) / 0.12)"
                      : "hsl(var(--theme-ink-tertiary) / 0.12)",
              }}
            >
              {card.status.label}
            </span>
          ) : null}
        </div>
        <h2
          className="text-[16px] font-semibold leading-snug"
          style={{
            color: "hsl(var(--theme-ink-primary))",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          {card.title}
        </h2>
        {card.lede ? (
          <p className="text-[13px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            {card.lede}
          </p>
        ) : null}
      </header>


      <div
        className="text-[14px] leading-relaxed whitespace-pre-wrap"
        style={{
          color: "hsl(var(--theme-ink-secondary))",
          ...(canExpand && !expanded
            ? {
                display: "-webkit-box",
                WebkitLineClamp: clampLines,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
              }
            : {}),
        }}
      >
        {card.body.text}
      </div>

      <div className="flex items-center gap-3">
        {canExpand ? (
          <button
            type="button"
            className="text-[12px] font-medium underline-offset-2 hover:underline"
            style={{ color: "hsl(var(--theme-accent-primary))" }}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : "Show more"}
          </button>
        ) : null}
        {handleGloss ? (
          <button
            type="button"
            className="text-[12px] font-semibold rounded-md px-2.5 py-1"
            style={{
              background: "hsl(var(--theme-accent-primary) / 0.12)",
              color: "hsl(var(--theme-accent-primary))",
            }}
            onClick={handleGloss}
            aria-label="Gloss"
          >
            Gloss
          </button>
        ) : null}
      </div>
    </article>
  )
}
