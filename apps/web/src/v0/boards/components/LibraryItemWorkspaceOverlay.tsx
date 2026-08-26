"use client"

import * as React from "react"
import { XMarkIcon } from "@heroicons/react/24/outline"
import { LibraryItemFocusPresence } from "../../presence/cover/LibraryItemFocusPresence"

export interface LibraryItemWorkspaceOverlayProps {
  open: boolean
  domainId: string
  libraryItemId: string
  onClose: () => void
}

/**
 * Inspect a Library item over Workspace / Dialog.
 * Chronicle stays on the Document. One X dismisses.
 */
export function LibraryItemWorkspaceOverlay({
  open,
  domainId,
  libraryItemId,
  onClose,
}: LibraryItemWorkspaceOverlayProps) {
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
      className="absolute inset-0 z-[60] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Library item"
      style={{
        background: "hsl(var(--theme-surface-page) / 0.97)",
        backdropFilter: "blur(10px)",
      }}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-3 py-2">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.16em]"
          style={{ color: "hsl(var(--theme-accent-primary, 42 55% 48%))" }}
        >
          Now
        </p>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            color: "hsl(var(--theme-ink-primary))",
            background: "hsl(var(--theme-surface-panel) / 0.7)",
          }}
          aria-label="Close library item"
        >
          <XMarkIcon className="h-5 w-5" strokeWidth={2} />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">
        <LibraryItemFocusPresence
          objectId={libraryItemId}
          domainId={domainId}
          record={{}}
        />
      </div>
    </div>
  )
}
