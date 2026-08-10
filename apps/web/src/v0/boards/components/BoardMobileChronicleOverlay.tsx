"use client"

import * as React from "react"
import { XMarkIcon } from "@heroicons/react/24/outline"

export interface BoardMobileChronicleOverlayProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

/**
 * Full-screen Chronicle takeover on mobile — owns the viewport; single X dismisses.
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
      <div className="board-mobile-chronicle-overlay__panel relative z-10 flex min-h-0 flex-1 flex-col">
        <header className="board-mobile-chronicle-overlay__header shrink-0 flex items-center justify-end px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            className="board-mobile-chronicle-overlay__close flex h-10 w-10 items-center justify-center rounded-full"
            style={{
              color: "hsl(var(--theme-ink-primary))",
              background: "hsl(var(--theme-surface-panel) / 0.7)",
            }}
            aria-label="Close Chronicle"
          >
            <XMarkIcon className="h-5 w-5" strokeWidth={2} />
          </button>
        </header>
        <div className="board-mobile-chronicle-overlay__body min-h-0 flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
