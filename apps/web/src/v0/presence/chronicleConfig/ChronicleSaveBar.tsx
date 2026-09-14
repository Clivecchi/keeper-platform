"use client"

import * as React from "react"
import type { ChronicleSaveStatus } from "./types"

export interface ChronicleSaveBarProps {
  saveStatus: ChronicleSaveStatus
  saveMessage: string | null
  isDirty: boolean
  onSave: () => void | Promise<void>
  onDismissError?: () => void
  saveLabel?: string
}

/**
 * Persistent Chronicle Config save bar — green saved, red error, saving state.
 */
export function ChronicleSaveBar({
  saveStatus,
  saveMessage,
  isDirty,
  onSave,
  onDismissError,
  saveLabel = "Save",
}: ChronicleSaveBarProps) {
  return (
    <div
      className="shrink-0 flex items-center justify-between gap-3 px-4 py-3"
      style={{
        borderTop: "1px solid hsl(var(--theme-border-soft) / 0.4)",
        background: "var(--treatment-paper, hsl(var(--theme-surface-elevated)))",
      }}
    >
      <div className="min-w-0 flex items-center gap-2" aria-live="polite">
        {saveStatus === "saving" && (
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Saving…
          </p>
        )}
        {saveStatus === "saved" && saveMessage && (
          <p
            className="text-[12px] font-medium"
            style={{ color: "hsl(var(--theme-status-success, 152 69% 43%))" }}
          >
            {saveMessage}
          </p>
        )}
        {saveStatus === "error" && saveMessage && (
          <>
            <p
              className="text-[12px] font-medium"
              style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
            >
              {saveMessage}
            </p>
            {onDismissError && (
              <button
                type="button"
                onClick={onDismissError}
                className="shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded opacity-80 hover:opacity-100"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              >
                Dismiss
              </button>
            )}
          </>
        )}
        {saveStatus === "idle" && isDirty && (
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Unsaved changes
          </p>
        )}
        {saveStatus === "idle" && !isDirty && (
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            {saveMessage ?? "Ready to save"}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => void onSave()}
        disabled={saveStatus === "saving"}
        className="shrink-0 rounded-md px-4 py-2 text-[13px] font-semibold transition-opacity disabled:opacity-45"
        style={{
          background: "var(--treatment-action, hsl(var(--theme-accent-primary, var(--theme-ink-primary))))",
          color: "var(--treatment-action-ink, hsl(var(--theme-surface-base, 0 0% 100%)))",
        }}
      >
        {saveStatus === "saving" ? "Saving…" : saveLabel}
      </button>
    </div>
  )
}
