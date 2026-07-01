"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"

export interface ChronicleRecordDeleteProps {
  entityLabel: string
  deleteEndpoint: string
  confirmMessage?: string
  disabled?: boolean
  onDeleted: () => void
}

export function ChronicleRecordDelete({
  entityLabel,
  deleteEndpoint,
  confirmMessage,
  disabled = false,
  onDeleted,
}: ChronicleRecordDeleteProps) {
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleDelete = async () => {
    const message =
      confirmMessage ??
      `Delete this ${entityLabel.toLowerCase()}? This cannot be undone.`
    if (!window.confirm(message)) return

    setBusy(true)
    setError(null)
    try {
      await apiFetch(deleteEndpoint, { method: "DELETE" })
      onDeleted()
    } catch (err: unknown) {
      const apiError =
        (err as { data?: { error?: string } })?.data?.error ??
        (err instanceof Error ? err.message : null)
      setError(apiError ?? `Could not delete ${entityLabel.toLowerCase()}.`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="mt-8 pt-6"
      style={{ borderTop: "1px solid hsl(var(--theme-border-soft) / 0.35)" }}
    >
      <p className="keeper-presence-field-label mb-1.5">Danger zone</p>
      <p
        className="text-[12px] mb-3 leading-relaxed"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        Permanently remove this {entityLabel.toLowerCase()} from the domain.
      </p>
      <button
        type="button"
        onClick={() => void handleDelete()}
        disabled={disabled || busy}
        className="rounded-lg px-3 py-2 text-[12px] font-semibold transition-opacity hover:opacity-85 disabled:opacity-50"
        style={{
          border: "1px solid hsl(var(--theme-status-error, 0 72% 51%) / 0.45)",
          color: "hsl(var(--theme-status-error, 0 72% 51%))",
          background: "hsl(var(--theme-status-error, 0 72% 51%) / 0.08)",
        }}
      >
        {busy ? "Deleting…" : `Delete ${entityLabel}`}
      </button>
      {error ? (
        <p
          className="text-[12px] mt-2"
          style={{ color: "hsl(var(--theme-status-error, 0 72% 51%))" }}
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
