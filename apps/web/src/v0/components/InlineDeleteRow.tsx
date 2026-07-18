"use client"

/**
 * Inline delete confirm — same pattern as IDE Drafts delete (no modal).
 * Structure/behavior only; visual tokens match the existing Draft destructive row.
 */

import * as React from "react"

export interface InlineDeleteRowProps {
  label: string
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function InlineDeleteRow({ label, onConfirm, onCancel }: InlineDeleteRowProps) {
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)

  const handleConfirm = async () => {
    setError(null)
    setBusy(true)
    try {
      await onConfirm()
    } catch (err) {
      const status = (err as { status?: number })?.status
      const code = (err as { code?: string; data?: { error?: string } })?.code
        ?? (err as { data?: { error?: string } })?.data?.error
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : status === 404
            ? "Already deleted or not found"
            : "Delete failed — try again"
      setError(typeof code === "string" && code && !message.includes(code) ? `${message} (${code})` : message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="rounded-xl border px-4 py-3 space-y-1.5"
      style={{
        background: "hsl(0 60% 50% / 0.06)",
        borderColor: "hsl(0 60% 50% / 0.25)",
      }}
    >
      <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        {label}
      </p>
      {error ? (
        <p className="text-[11px]" style={{ color: "hsl(0 70% 50%)" }}>
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={busy}
          className="text-[11px] px-2.5 py-1 rounded-md font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "hsl(0 60% 45%)", color: "#fff" }}
        >
          {busy ? "Deleting…" : "Confirm"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="text-[11px] px-2.5 py-1 rounded-md transition-opacity hover:opacity-70 disabled:opacity-50"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
