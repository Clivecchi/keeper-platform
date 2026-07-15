"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"
import type { DomainAccessKeyRecord } from "@keeper/shared"

type AccessKeysResponse = { keys: DomainAccessKeyRecord[] }

type CreateKeyResponse = {
  key: DomainAccessKeyRecord & { secret: string }
}

async function fetchDomainAccessKeys(domainId: string): Promise<DomainAccessKeyRecord[]> {
  const res = await apiFetch(`/api/domains/${encodeURIComponent(domainId)}/access-keys`)
  if (!res.ok) throw new Error("Could not load external access keys")
  const data = (await res.json()) as AccessKeysResponse
  return data.keys ?? []
}

export interface DomainExternalAccessNavProps {
  domainId: string | null
}

export function DomainExternalAccessNav({ domainId }: DomainExternalAccessNavProps) {
  const [keys, setKeys] = React.useState<DomainAccessKeyRecord[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [label, setLabel] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const reload = React.useCallback(async () => {
    if (!domainId) return
    setError(null)
    try {
      const rows = await fetchDomainAccessKeys(domainId)
      setKeys(rows)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed")
      setKeys([])
    }
  }, [domainId])

  React.useEffect(() => {
    void reload()
  }, [reload])

  const handleCreate = async () => {
    if (!domainId || !label.trim()) return
    setCreating(true)
    setError(null)
    setRevealedSecret(null)
    try {
      const res = await apiFetch(`/api/domains/${encodeURIComponent(domainId)}/access-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim(), scopes: ["library.ro"] }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? "Create failed")
      }
      const data = (await res.json()) as CreateKeyResponse
      setRevealedSecret(data.key.secret)
      setLabel("")
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed")
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!domainId) return
    setError(null)
    try {
      const res = await apiFetch(
        `/api/domains/${encodeURIComponent(domainId)}/access-keys/${encodeURIComponent(id)}/revoke`,
        { method: "POST" },
      )
      if (!res.ok) throw new Error("Revoke failed")
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed")
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

  const activeCount = keys?.filter((k) => k.status === "active").length ?? 0

  return (
    <div
      className="keeper-sidebar-card rounded-md border px-0 py-2"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.5)",
        background: "hsl(var(--theme-surface-panel, var(--theme-surface-raised)) / 0.35)",
      }}
    >
      <div className="px-3 pb-2">
        <p className="keeper-nav-section-title">External Access</p>
        <p
          className="text-[13px] mt-1 leading-snug"
          style={{ color: "var(--theme-ink-secondary-color, hsl(40 10% 78%))" }}
        >
          {!domainId
            ? "Loading…"
            : activeCount === 0
              ? "MCP keys for Cursor & external tools"
              : `${activeCount} active key${activeCount === 1 ? "" : "s"} · Library read`}
        </p>
        <p
          className="text-[12px] mt-1.5 leading-snug opacity-85"
          style={{ color: "var(--theme-ink-secondary-color, hsl(40 8% 72%))" }}
        >
          Domain-bound tokens. Use with x-domain-id and Authorization Bearer.
        </p>
      </div>

      {keys && keys.length > 0 ? (
        <ul className="flex flex-col gap-1 px-2">
          {keys.map((key) => (
            <li
              key={key.id}
              className="flex items-start justify-between gap-2 px-1 py-1.5 rounded-sm"
              style={{ color: "var(--theme-ink-secondary-color, hsl(40 10% 84%))" }}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] leading-snug truncate">{key.label}</p>
                <p className="text-[12px] opacity-80 truncate">
                  {key.key_prefix}… · {key.status}
                  {key.scopes.length ? ` · ${key.scopes.join(", ")}` : ""}
                </p>
              </div>
              {key.status === "active" ? (
                <button
                  type="button"
                  className="text-[12px] shrink-0 underline underline-offset-2"
                  onClick={() => void handleRevoke(key.id)}
                >
                  Revoke
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="px-3 pt-2 flex flex-col gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. Cursor — Chuck laptop)"
          className="w-full rounded-md border px-2 py-1.5 text-[13px]"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.6)",
            background: "hsl(var(--theme-surface-paper) / 0.5)",
            color: "hsl(var(--theme-ink-primary))",
          }}
        />
        <button
          type="button"
          disabled={!domainId || creating || !label.trim()}
          onClick={() => void handleCreate()}
          className="text-[13px] font-medium text-left underline underline-offset-2 disabled:opacity-50"
          style={{ color: "var(--theme-ink-primary-color, hsl(40 14% 92%))" }}
        >
          {creating ? "Creating…" : "Create access key"}
        </button>
      </div>

      {revealedSecret ? (
        <div
          className="mx-3 mt-3 mb-1 rounded-md border px-3 py-2 flex flex-col gap-2"
          style={{
            borderColor: "hsl(var(--theme-accent-primary) / 0.35)",
            background: "hsl(var(--theme-accent-primary) / 0.08)",
          }}
        >
          <p className="text-[12px] font-semibold" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            Copy this key now — it won&apos;t be shown again
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
            {copied ? "Copied" : "Copy to clipboard"}
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-[12px] px-3 pt-2" style={{ color: "hsl(var(--destructive))" }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
