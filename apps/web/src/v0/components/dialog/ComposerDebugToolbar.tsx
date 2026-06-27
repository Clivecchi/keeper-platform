"use client"

import * as React from "react"
import { BugAntIcon } from "@heroicons/react/24/outline"

export interface ComposerDebugToolbarProps {
  active: boolean
  onToggle: () => void
}

/**
 * Right-aligned composer footer control — toggles the Diag stream in Thinking Space
 * while the agent is working. Copy lives in DialogDiagStream once the panel is open.
 */
export function ComposerDebugToolbar({ active, onToggle }: ComposerDebugToolbarProps) {
  return (
    <div className="dialog-composer-debug-toolbar" role="toolbar" aria-label="Debug tools">
      <button
        type="button"
        className={`dialog-composer-debug-btn${active ? " dialog-composer-debug-btn--active" : ""}`}
        onClick={onToggle}
        aria-pressed={active}
        aria-label={active ? "Hide diagnostic log" : "Show diagnostic log"}
        title={
          active
            ? "Hide console diagnostic log"
            : "Show console diagnostic log — copy from panel"
        }
      >
        <BugAntIcon className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
  )
}
