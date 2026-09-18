"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"
import { DEFAULT_NEW_DOMAIN_ACCESS_KEY_SCOPES, type DomainAccessKeyRecord } from "@keeper/shared"

export type CreatedAccessKey = DomainAccessKeyRecord & { secret: string }

type CreateKeyResponse = {
  key: CreatedAccessKey
}

export interface AccessKeyCreateFormProps {
  domainId: string | null
  autoFocus?: boolean
  inputRef?: React.Ref<HTMLInputElement>
  onCreated?: (created: CreatedAccessKey) => void
}

export function AccessKeyCreateForm({
  domainId,
  autoFocus = false,
  inputRef,
  onCreated,
}: AccessKeyCreateFormProps) {
  const [label, setLabel] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const handleCreate = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!domainId || !label.trim()) return
    setCreating(true)
    setError(null)
    setRevealedSecret(null)
    try {
      const data = (await apiFetch(
        `/api/domains/${encodeURIComponent(domainId)}/access-keys`,
        {
          method: "POST",
          body: JSON.stringify({
            label: label.trim(),
            scopes: [...DEFAULT_NEW_DOMAIN_ACCESS_KEY_SCOPES],
          }),
        },
      )) as CreateKeyResponse
      setRevealedSecret(data.key.secret)
      setLabel("")
      onCreated?.(data.key)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed")
    } finally {
      setCreating(false)
    }
  }

  const handleCopySecret = async () => {
    if (!revealedSecret) return
    try {
      await navigator.clipboard.writeText(revealedSecret)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Copy failed — select and copy manually")
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <form className="flex flex-col gap-2" onSubmit={(event) => void handleCreate(event)}>
        <input
          ref={inputRef}
          type="text"
          value={label}
          autoFocus={autoFocus}
          autoComplete="off"
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. TypeSafe, Claude — laptop)"
          aria-label="Access key label"
          className="w-full rounded-md border px-2 py-1.5 text-[13px]"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.6)",
            background: "hsl(var(--theme-surface-paper) / 0.5)",
            color: "hsl(var(--theme-ink-primary))",
          }}
        />
        <button
          type="submit"
          disabled={!domainId || creating || !label.trim()}
          className="text-[13px] font-medium self-start rounded-md border px-2.5 py-1 disabled:opacity-50"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.7)",
            color: "var(--theme-ink-primary-color, hsl(40 14% 92%))",
            background: "hsl(var(--theme-surface-raised) / 0.45)",
          }}
        >
          {creating ? "Creating…" : "Add key"}
        </button>
      </form>

      {revealedSecret ? (
        <div
          className="rounded-md border px-3 py-2 flex flex-col gap-2"
          style={{
            borderColor: "hsl(var(--theme-accent-primary) / 0.35)",
            background: "hsl(var(--theme-accent-primary) / 0.08)",
          }}
        >
          <p className="text-[12px] font-semibold" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            Your key — copy now (shown once)
          </p>
          <code
            className="text-[11px] break-all leading-relaxed"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {revealedSecret}
          </code>
          <button
            type="button"
            className="text-[12px] font-medium self-start underline underline-offset-2"
            onClick={() => void handleCopySecret()}
          >
            {copied ? "Copied" : "Copy key"}
          </button>
          <p
            className="text-[11px] leading-relaxed opacity-90"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            In Cursor MCP: Authorization Bearer = this key. Header x-domain-id = domain id above.
            MCP URL: https://api.ke3p.com/mcp
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="text-[12px]" style={{ color: "hsl(var(--destructive))" }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
