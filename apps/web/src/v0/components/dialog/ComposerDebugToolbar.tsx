"use client"

import * as React from "react"
import { BugAntIcon } from "@heroicons/react/24/outline"

export interface ComposerDebugToolbarProps {
  active: boolean
  onToggle: () => void
}

/**
 * Right-aligned composer footer control — toggles the client-side console log panel.
 * Capture runs continuously; open the panel any time to review or copy logs.
 */
export function ComposerDebugToolbar({ active, onToggle }: ComposerDebugToolbarProps) {
  return (
    <div className="dialog-composer-debug-toolbar" role="toolbar" aria-label="Debug tools">
      <button
        type="button"
        className={`dialog-composer-debug-btn${active ? " dialog-composer-debug-btn--active" : ""}`}
        onClick={onToggle}
        aria-pressed={active}
        aria-label={active ? "Hide client console log" : "Show client console log"}
        title={
          active
            ? "Hide client console log panel"
            : "Open client console log — copy logs for debugging"
        }
      >
        <BugAntIcon className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}
