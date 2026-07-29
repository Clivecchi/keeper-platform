"use client"

/**
 * Ambient Chronicle tip — sits above the Composer on adaptive mobile boards.
 * Tap opens the full Chronicle overlay (not a bottom-tab destination).
 */

export interface BoardMobileChronicleStripProps {
  /** Primary tip — Dialog Document title, or Presence when idle. */
  title: string
  /** Optional secondary line (Forward tip, domain name). */
  subtitle?: string
  onExpand: () => void
}

export function BoardMobileChronicleStrip({
  title,
  subtitle,
  onExpand,
}: BoardMobileChronicleStripProps) {
  return (
    <button
      type="button"
      onClick={onExpand}
      className="board-mobile-chronicle-strip w-full text-left transition-opacity hover:opacity-95"
      aria-label={`Open Chronicle — ${title}`}
    >
      <div className="board-mobile-chronicle-strip__inner flex items-center gap-2.5 px-3 py-2">
        <div className="min-w-0 flex-1">
          <p className="board-mobile-chronicle-strip__eyebrow">Chronicle</p>
          <p className="board-mobile-chronicle-strip__title truncate">{title}</p>
          {subtitle ? (
            <p className="board-mobile-chronicle-strip__subtitle truncate">{subtitle}</p>
          ) : null}
        </div>
        <span className="board-mobile-chronicle-strip__chevron shrink-0" aria-hidden>
          ▴
        </span>
      </div>
    </button>
  )
}
