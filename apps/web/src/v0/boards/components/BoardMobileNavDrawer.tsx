"use client"

import * as React from "react"
import { BoardMobileNavAccount } from "./BoardMobileNavAccount"

export interface BoardMobileNavDrawerProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

/**
 * Left Nav as a drawer — replaces the former Nav bottom-tab destination.
 * Account (avatar / profile / sign out) lives at the bottom — Top Bar right slot is Chronicle.
 */
export function BoardMobileNavDrawer({
  open,
  onClose,
  children,
}: BoardMobileNavDrawerProps) {
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
    <div className="board-mobile-nav-drawer fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Navigation">
      <div
        className="board-mobile-nav-drawer__scrim absolute inset-0"
        aria-hidden
        onClick={onClose}
      />
      <div className="board-mobile-nav-drawer__panel absolute inset-y-0 left-0 z-10 flex w-[min(20rem,88vw)] flex-col overflow-hidden">
        <header className="shrink-0 flex items-center justify-between gap-2 px-3 py-2.5 border-b"
          style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Nav
          </p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-[13px] font-medium"
            style={{
              color: "hsl(var(--theme-ink-primary))",
              background: "hsl(var(--theme-surface-panel) / 0.7)",
            }}
            aria-label="Close navigation"
          >
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        <BoardMobileNavAccount />
      </div>
    </div>
  )
}
