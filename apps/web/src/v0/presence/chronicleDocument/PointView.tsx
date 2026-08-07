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
  /** Opens Gloss for this Point's anchor. */
  onGloss?: () => void
  /** @deprecated Use onGloss */
  onDiscuss?: () => void
  /** Start expanded. Default false — title + short blurb only. */
  defaultExpanded?: boolean
  /** When true, Point stays collapsed (Document Gloss is the work surface). */
  forceCollapsed?: boolean
  /** Visual cue that Gloss is open on this Point. */
  glossActive?: boolean
  /** True when a Gloss thread already exists for this Point. */
  hasGlossThread?: boolean
  /** Message count on the existing Gloss thread (optional badge). */
  glossMessageCount?: number
}

function formatRevisedCue(iso: string | undefined): string | null {
  if (!iso?.trim()) return null
  const at = Date.parse(iso)
  if (!Number.isFinite(at)) return null
  const deltaMs = Date.now() - at
  if (deltaMs < 0) return "Updated just now"
  const minutes = Math.floor(deltaMs / 60_000)
  if (minutes < 1) return "Updated just now"
  if (minutes < 60) return `Updated ${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 36) return `Updated ${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 14) return `Updated ${days}d ago`
  try {
    return `Updated ${new Date(at).toLocaleDateString()}`
  } catch {
    return null
  }
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
        className="text-[12px] font-semibold uppercase tracking-[0.1em]"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        Voices on this Point
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
                className="text-[12px] font-semibold uppercase tracking-[0.06em]"
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
  forceCollapsed = false,
  glossActive = false,
  hasGlossThread = false,
  glossMessageCount,
}: PointViewProps) {
  const card = point ?? document
  if (!card) return null

  const handleGloss = onGloss ?? onDiscuss
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  React.useEffect(() => {
    if (forceCollapsed) {
      setExpanded(false)
      return
    }
    if (defaultExpanded) setExpanded(true)
  }, [defaultExpanded, forceCollapsed])
  const castNotes = card.cast?.notes ?? []
  const [castOpen, setCastOpen] = React.useState(false)
  const blurb = collapsedBlurb(card)
  const bodyText = card.body.text.trim()
  const ledeText = card.lede?.trim() ?? ""
  const showLede =
    Boolean(ledeText) &&
    ledeText !== bodyText &&
    !bodyText.startsWith(ledeText)
  const revisedCue = formatRevisedCue(card.revisedAt)
  const author = card.identity.voice?.trim() || card.identity.label.trim()
  const kindLabel = card.identity.subtitle?.trim()
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

  const showBody = expanded && !forceCollapsed

  return (
    <article
      className={[
        "keeper-chronicle-document document-point flex flex-col gap-2.5",
        pressing ? "opacity-90" : "",
      ].join(" ")}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      data-gloss-threaded={hasGlossThread ? "true" : undefined}
      data-gloss-active={glossActive ? "true" : undefined}
    >
      <header className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {author}
            {kindLabel ? ` · ${kindLabel}` : ""}
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
          {revisedCue ? (
            <span
              className="text-[11px] font-medium"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              title={card.revisedAt}
            >
              {revisedCue}
            </span>
          ) : null}
          {hasGlossThread ? (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]"
              style={{
                color: "hsl(var(--theme-accent-primary, 42 55% 48%))",
                background: "hsl(var(--theme-accent-primary, 42 55% 48%) / 0.14)",
                border: "1px solid hsl(var(--theme-accent-primary, 42 55% 48%) / 0.35)",
              }}
              title="This Point has a Gloss thread"
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "hsl(var(--theme-accent-primary, 42 55% 48%))" }}
                aria-hidden
              />
              Glossed
              {typeof glossMessageCount === "number" && glossMessageCount > 0
                ? ` · ${glossMessageCount}`
                : ""}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          className="document-point-title-btn text-left"
          onClick={() => {
            if (forceCollapsed) return
            setExpanded((open) => !open)
          }}
          aria-expanded={showBody}
          disabled={forceCollapsed}
        >
          <h2
            className="text-[20px] font-semibold leading-snug"
            style={{
              color: "hsl(var(--theme-ink-primary))",
              fontFamily: "var(--theme-font-display, 'Cormorant Garamond', Georgia, serif)",
            }}
          >
            {card.title}
          </h2>
        </button>
      </header>

      {!showBody ? (
        blurb ? (
          <p
            className="document-point-body text-[15px] leading-[1.65]"
            style={{
              color: "hsl(var(--theme-ink-secondary))",
              fontFamily: "var(--theme-font-ui, inherit)",
            }}
          >
            {blurb}
          </p>
        ) : null
      ) : (
        <>
          {showLede ? (
            <p
              className="document-point-body text-[15px] leading-[1.65]"
              style={{
                color: "hsl(var(--theme-ink-secondary))",
                fontFamily: "var(--theme-font-ui, inherit)",
              }}
            >
              {ledeText}
            </p>
          ) : null}
          {bodyText ? (
            <div
              className="document-point-body text-[15px] leading-[1.65] whitespace-pre-wrap"
              style={{
                color: "hsl(var(--theme-ink-secondary))",
                fontFamily: "var(--theme-font-ui, inherit)",
              }}
            >
              {bodyText}
            </div>
          ) : null}
        </>
      )}

      {castOpen && castNotes.length > 0 ? <CastNotesPanel notes={castNotes} /> : null}

      {/* Single action rail — no competing Open + Gloss text pair */}
      <div className="document-point-actions flex flex-wrap items-center gap-2 pt-0.5">
        {!forceCollapsed ? (
          <button
            type="button"
            className="rounded-md px-2 py-1 text-[12px] font-medium"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            onClick={() => setExpanded((open) => !open)}
            aria-expanded={showBody}
          >
            {showBody ? "Less" : "More"}
          </button>
        ) : null}
        {castNotes.length > 0 && !forceCollapsed ? (
          <button
            type="button"
            className="rounded-md px-2 py-1 text-[12px] font-semibold"
            style={{
              color: castOpen
                ? "hsl(var(--theme-accent-primary))"
                : "hsl(var(--theme-ink-secondary))",
            }}
            onClick={() => setCastOpen((open) => !open)}
            aria-expanded={castOpen}
            aria-label={
              castOpen
                ? "Hide voices"
                : `Voices on this Point (${castNotes.length})`
            }
          >
            {castOpen ? "Voices · Hide" : `Voices · ${castNotes.length}`}
          </button>
        ) : null}
        {handleGloss ? (
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold"
            style={{
              color: glossActive
                ? "hsl(var(--theme-surface-paper))"
                : "hsl(var(--theme-accent-primary, 42 55% 48%))",
              background: glossActive
                ? "hsl(var(--theme-accent-primary, 42 55% 48%))"
                : "hsl(var(--theme-accent-primary, 42 55% 48%) / 0.12)",
              border: "1px solid hsl(var(--theme-accent-primary, 42 55% 48%) / 0.4)",
            }}
            onClick={handleGloss}
            aria-label={glossActive ? "Gloss open" : "Open Gloss"}
            aria-pressed={glossActive}
            title="Gloss this Point (long-press on mobile)"
          >
            {glossActive ? "Glossing" : "Gloss"}
            {hasGlossThread && !glossActive ? (
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "currentColor" }}
                aria-hidden
              />
            ) : null}
          </button>
        ) : null}
      </div>
    </article>
  )
}
