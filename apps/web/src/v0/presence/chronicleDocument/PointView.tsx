"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
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
  /** Start expanded. Default false — older-eye readability: title + short blurb only. */
  defaultExpanded?: boolean
}

/** ~two sentences for collapsed preview — not a wall of body text. */
function collapsedBlurb(point: Point): string {
  const lede = point.lede?.trim()
  if (lede) return lede
  const body = point.body.text.trim()
  if (!body) return ""
  // Prefer first 1–2 sentences, then hard-cap length.
  const sentenceMatch = body.match(/^(.+?[.!?])(?:\s+(.+?[.!?]))?/)
  const preview = sentenceMatch
    ? [sentenceMatch[1], sentenceMatch[2]].filter(Boolean).join(" ")
    : body
  if (preview.length <= 180) return preview
  return `${preview.slice(0, 177).trimEnd()}…`
}

export function PointView({
  point,
  document,
  onGloss,
  onDiscuss,
  defaultExpanded = false,
}: PointViewProps) {
  const card = point ?? document
  if (!card) return null

  const handleGloss = onGloss ?? onDiscuss
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  const blurb = collapsedBlurb(card)
  const bodyText = card.body.text.trim()

  return (
    <article className="keeper-chronicle-document flex flex-col gap-2.5">
      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className="text-[13px] font-semibold uppercase tracking-[0.1em]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {card.identity.label}
            {card.identity.subtitle ? ` · ${card.identity.subtitle}` : ""}
          </p>
          {card.status ? (
            <span
              className="rounded px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide"
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
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="group flex w-full items-start gap-2 text-left"
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse point" : "Expand point"}
        >
          <h2
            className="min-w-0 flex-1 text-[22px] font-semibold leading-snug"
            style={{
              color: "hsl(var(--theme-ink-primary))",
              fontFamily: "'Cormorant Garamond', Georgia, serif",
            }}
          >
            {card.title}
          </h2>
          <ChevronDown
            className={`mt-1.5 h-5 w-5 shrink-0 transition-transform ${expanded ? "" : "-rotate-90"}`}
            strokeWidth={2}
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            aria-hidden
          />
        </button>
      </header>

      {!expanded ? (
        blurb ? (
          <p
            className="text-[17px] leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {blurb}
          </p>
        ) : null
      ) : (
        <>
          {card.lede?.trim() && card.lede.trim() !== bodyText ? (
            <p
              className="text-[17px] leading-relaxed"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {card.lede.trim()}
            </p>
          ) : null}
          {bodyText ? (
            <div
              className="text-[17px] leading-relaxed whitespace-pre-wrap"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {bodyText}
            </div>
          ) : null}
        </>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="text-[15px] font-medium underline-offset-2 hover:underline"
          style={{ color: "hsl(var(--theme-accent-primary))" }}
          onClick={() => setExpanded((open) => !open)}
        >
          {expanded ? "Close" : "Open"}
        </button>
        {handleGloss ? (
          <button
            type="button"
            className="text-[15px] font-semibold rounded-md px-3 py-1.5"
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
