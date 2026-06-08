"use client"

import * as React from "react"
import { ActionButton, formatRelativeTime } from "../shared"
import { BlockBadge, BlockShell, BlockTitle } from "./blockShell"

export type KeySource = "ENV" | "USER" | "PLATFORM"
export type KeyStatus = "valid" | "invalid" | "missing"

export type KeyHealthBlockProps = {
  keySource: KeySource
  keyStatus: KeyStatus
  lastVerified: string | null
  onKeyUpdate: (key: string) => void | Promise<void>
  keyUpdateBusy?: boolean
  keyUpdateError?: string | null
  errorMessage?: string | null
  /** When true, badges only — inline editor lives elsewhere (Key Chronicle). */
  readOnly?: boolean
}

export function KeyHealthBlock({
  keySource,
  keyStatus,
  lastVerified,
  onKeyUpdate,
  keyUpdateBusy = false,
  keyUpdateError = null,
  errorMessage = null,
  readOnly = false,
}: KeyHealthBlockProps) {
  const [keyInput, setKeyInput] = React.useState("")
  const showKeyInput =
    !readOnly && (keyStatus === "invalid" || keyStatus === "missing")

  const statusLabel =
    keyStatus === "valid" ? "Valid" : keyStatus === "invalid" ? "Invalid" : "Missing"
  const statusTone =
    keyStatus === "valid" ? "success" : keyStatus === "invalid" ? "error" : "warning"

  return (
    <BlockShell>
      <BlockTitle>Key health</BlockTitle>
      <div className="flex flex-wrap gap-2 mb-2">
        <BlockBadge label={keySource} tone="info" />
        <BlockBadge label={statusLabel} tone={statusTone} />
      </div>
      <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Last verified {formatRelativeTime(lastVerified ?? undefined)}
      </p>
      {errorMessage && (
        <p className="mt-1 text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
          {errorMessage}
        </p>
      )}

      {showKeyInput && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            This key is not working. Paste a valid key to reconnect.
          </p>
          <input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste API key"
            className="w-full rounded-md border px-2.5 py-1.5 text-[12px] bg-transparent"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.55)",
              color: "hsl(var(--theme-ink-primary))",
            }}
          />
          <ActionButton
            label={keyUpdateBusy ? "Verifying…" : "Verify and Save"}
            onClick={() => void onKeyUpdate(keyInput)}
            disabled={keyUpdateBusy || !keyInput.trim()}
          />
          {keyUpdateError && (
            <p className="text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
              {keyUpdateError}
            </p>
          )}
        </div>
      )}
    </BlockShell>
  )
}
