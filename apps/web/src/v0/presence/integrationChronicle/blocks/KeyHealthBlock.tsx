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
  /** When true, badges only — inline editor lives on cover elsewhere. */
  readOnly?: boolean
  /**
   * Config/manage surfaces — allow rotating credentials when status is already valid.
   * Cover feed blocks stay readOnly or omit this flag.
   */
  allowValidRotate?: boolean
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
  allowValidRotate = false,
}: KeyHealthBlockProps) {
  const [keyInput, setKeyInput] = React.useState("")
  const [showRotateForm, setShowRotateForm] = React.useState(false)
  const isEnv = keySource === "ENV"

  React.useEffect(() => {
    setKeyInput("")
    setShowRotateForm(false)
  }, [keySource, keyStatus])

  const canEditCredential = !readOnly && !isEnv
  const needsCredential = keyStatus !== "valid"
  const showKeyInput =
    canEditCredential && (needsCredential || (allowValidRotate && showRotateForm))

  const statusLabel =
    keyStatus === "valid" ? "Valid" : keyStatus === "invalid" ? "Invalid" : "Missing"
  const statusTone =
    keyStatus === "valid" ? "success" : keyStatus === "invalid" ? "error" : "warning"

  return (
    <BlockShell>
      <div className="flex items-start justify-between gap-2 mb-2">
        <BlockTitle>Key health</BlockTitle>
        {canEditCredential && keyStatus === "valid" && allowValidRotate && (
          <button
            type="button"
            onClick={() => setShowRotateForm((open) => !open)}
            className="text-[11px] underline-offset-2 hover:underline shrink-0"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {showRotateForm ? "Cancel" : "Update key"}
          </button>
        )}
      </div>
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

      {isEnv && (
        <p
          className="mt-3 text-[12px] leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {keyStatus === "valid"
            ? "This key is set via environment variable. Update it in Railway to rotate, then verify."
            : "This provider expects an environment variable. Add the API key in Railway, then verify."}
        </p>
      )}

      {canEditCredential && keyStatus === "valid" && allowValidRotate && !showRotateForm && (
        <p className="mt-3 text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Key is connected. Use Update key to rotate the credential.
        </p>
      )}

      {showKeyInput && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            {needsCredential
              ? "Paste a valid API key to connect."
              : "Paste a new API key to rotate the credential."}
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
            label={
              keyUpdateBusy
                ? "Saving…"
                : needsCredential
                  ? "Save and verify"
                  : "Save key"
            }
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
