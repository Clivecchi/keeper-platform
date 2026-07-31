"use client"

import * as React from "react"
import type { Point, PointCastNote } from "@keeper/shared"

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
  const sentenceMatch = body.match(/^(.+?[.!?])(?:\s+(.+?[.!?]))?/)
  const preview = sentenceMatch
    ? [sentenceMatch[1], sentenceMatch[2]].filter(Boolean).join(" ")
    : body
  if (preview.length <= 200) return preview
  return `${preview.slice(0, 197).trimEnd()}…`
}

function CastNotesPanel({ notes }: { notes: readonly PointCastNote[] }) {
  return (
    <div
      className="document-point-cast-notes flex flex-col gap-2.5"
      role="region"
      aria-label="Cast notes"
    >
      <p
        className="text-[13px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        Cast Notes
      </p>
      {notes.map((note, index) => {
        const failed = note.status === "failed" || note.status === "empty"
        return (
          <div
            key={`${note.slug ?? note.attributedTo}-${index}`}
            className="dialog-voice-card"
            data-agent-variant={failed ? "delegation-failed" : "collaborator"}
          >
            <div className="dialog-voice-card__rail" aria-hidden />
            <div className="dialog-voice-card__body">
              <p
                className="text-[13px] font-semibold uppercase tracking-[0.06em]"
                style={{
                  color: failed
                    ? "hsl(38 70% 48%)"
                    : "hsl(var(--treatment-color, var(--theme-focus-ring, 152 45% 42%)) / 0.92)",
                }}
              >
                {note.attributedTo}
              </p>
              <div className="dialog-voice-card__content whitespace-pre-wrap">
                {note.content}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
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
  const castNotes = card.cast?.notes ?? []
  const [castOpen, setCastOpen] = React.useState(false)
  const blurb = collapsedBlurb(card)
  const bodyText = card.body.text.trim()
  const pressTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pressing, setPressing] = React.useState(false)

  const clearPressTimer = React.useCallback(() => {
    if (pressTimer.current != null) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }, [])

  React.useEffect(() => () => clearPressTimer(), [clearPressTimer])

  const touchStartY = React.useRef<number | null>(null)

  /** Long-press opens Gloss; cancel if the finger scrolls (common mobile failure mode). */
  const handleTouchStart = React.useCallback((event: React.TouchEvent) => {
    if (!handleGloss) return
    setPressing(true)
    touchStartY.current = event.touches[0]?.clientY ?? null
    clearPressTimer()
    pressTimer.current = setTimeout(() => {
      handleGloss()
      setPressing(false)
    }, 480)
  }, [handleGloss, clearPressTimer])

  const handleTouchMove = React.useCallback((event: React.TouchEvent) => {
    if (touchStartY.current == null) return
    const y = event.touches[0]?.clientY
    if (y == null) return
    if (Math.abs(y - touchStartY.current) > 10) {
      clearPressTimer()
      setPressing(false)
      touchStartY.current = null
    }
  }, [clearPressTimer])

  const handleTouchEnd = React.useCallback(() => {
    clearPressTimer()
    setPressing(false)
    touchStartY.current = null
  }, [clearPressTimer])

  return (
    <article
      className={[
        "keeper-chronicle-document flex flex-col gap-3",
        pressing ? "opacity-90" : "",
      ].join(" ")}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <p
            className="text-[14px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {card.identity.label}
            {card.identity.subtitle ? ` · ${card.identity.subtitle}` : ""}
          </p>
          {card.status ? (
            <span
              className="rounded px-2 py-0.5 text-[13px] font-semibold uppercase tracking-wide"
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
          className="text-[24px] font-semibold leading-snug"
          style={{
            color: "hsl(var(--theme-ink-primary))",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
          }}
        >
          {card.title}
        </h2>
      </header>

      {!expanded ? (
        blurb ? (
          <p
            className="text-[18px] leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {blurb}
          </p>
        ) : null
      ) : (
        <>
          {card.lede?.trim() && card.lede.trim() !== bodyText ? (
            <p
              className="text-[18px] leading-relaxed"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {card.lede.trim()}
            </p>
          ) : null}
          {bodyText ? (
            <div
              className="text-[18px] leading-relaxed whitespace-pre-wrap"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {bodyText}
            </div>
          ) : null}
        </>
      )}

      {castOpen && castNotes.length > 0 ? <CastNotesPanel notes={castNotes} /> : null}

      <div className="flex flex-wrap items-center gap-3 pt-0.5">
        <button
          type="button"
          className="text-[16px] font-semibold underline-offset-2 hover:underline"
          style={{ color: "hsl(var(--theme-accent-primary))" }}
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
        >
          {expanded ? "Close" : "Open"}
        </button>
        {castNotes.length > 0 ? (
          <button
            type="button"
            className="text-[16px] font-semibold underline-offset-2 hover:underline"
            style={{ color: "hsl(var(--theme-accent-primary))" }}
            onClick={() => setCastOpen((open) => !open)}
            aria-expanded={castOpen}
            aria-label={
              castOpen
                ? "Hide cast notes"
                : `Cast notes (${castNotes.length})`
            }
          >
            {castOpen ? "Cast · Hide" : `Cast · ${castNotes.length}`}
          </button>
        ) : null}
        {handleGloss ? (
          <button
            type="button"
            className="text-[16px] font-semibold rounded-md px-3 py-1.5"
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
