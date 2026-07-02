"use client"

import * as React from "react"

export interface GuidedArrivalBannerProps {
  agentName: string
  greeting: string
  dismissed: boolean
  onDismiss: () => void
  onAcknowledge: () => void
}

export function GuidedArrivalBanner({
  agentName,
  greeting,
  dismissed,
  onDismiss,
  onAcknowledge,
}: GuidedArrivalBannerProps) {
  if (dismissed) return null

  return (
    <div
      className="mx-4 mt-3 mb-1 shrink-0 rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.45)",
        background: "hsl(var(--theme-surface-elevated) / 0.55)",
      }}
      role="status"
      aria-live="polite"
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-[11px] font-semibold uppercase tracking-widest mb-1"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Welcome · {agentName}
        </p>
        <p
          className="text-[13px] leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {greeting}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onDismiss}
          className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity hover:opacity-80"
          style={{
            color: "hsl(var(--theme-ink-secondary))",
            background: "hsl(var(--theme-surface-panel) / 0.6)",
            border: "1px solid hsl(var(--theme-border-soft) / 0.35)",
          }}
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={onAcknowledge}
          className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-opacity hover:opacity-90"
          style={{
            background: "hsl(var(--theme-ink-primary))",
            color: "hsl(var(--theme-surface-paper))",
          }}
        >
          Got it
        </button>
      </div>
    </div>
  )
}
