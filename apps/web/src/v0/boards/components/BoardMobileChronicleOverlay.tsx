"use client"

import * as React from "react"

export interface BoardMobileChronicleOverlayProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

/**
 * Full-height Chronicle surface as an overlay — replaces the former Chronicle tab.
 */
export function BoardMobileChronicleOverlay({
  open,
  onClose,
  children,
}: BoardMobileChronicleOverlayProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="board-mobile-chronicle-overlay fixed inset-0 z-[70] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Chronicle"
    >
      <div
        className="board-mobile-chronicle-overlay__scrim absolute inset-0"
        aria-hidden
        onClick={onClose}
      />
      <div className="board-mobile-chronicle-overlay__panel relative z-10 flex min-h-0 flex-1 flex-col">
        <header className="board-mobile-chronicle-overlay__header shrink-0 flex items-center justify-between gap-3 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Chronicle
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium"
            style={{
              color: "hsl(var(--theme-ink-primary))",
              background: "hsl(var(--theme-surface-panel) / 0.7)",
            }}
            aria-label="Close Chronicle"
          >
            Done
          </button>
        </header>
        <div className="board-mobile-chronicle-overlay__body min-h-0 flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
