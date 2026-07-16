"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"
import type { DomainAccessKeyRecord } from "@keeper/shared"
import {
  domainAccessKeyChronicleId,
  EXTERNAL_ACCESS_OVERVIEW_ID,
  parseDomainAccessKeyChronicleId,
} from "./externalAccessKeyIds"

type AccessKeysResponse = { keys: DomainAccessKeyRecord[] }

type CreateKeyResponse = {
  key: DomainAccessKeyRecord & { secret: string }
}

async function fetchDomainAccessKeys(domainId: string): Promise<DomainAccessKeyRecord[]> {
  const data = (await apiFetch(
    `/api/domains/${encodeURIComponent(domainId)}/access-keys`,
  )) as AccessKeysResponse
  return data.keys ?? []
}

function formatScopeList(scopes: string[]): string {
  if (!scopes.length) return "No scopes"
  return scopes
    .map((scope) => {
      if (scope === "library.ro") return "Library read"
      if (scope === "library.rw") return "Library read/write"
      if (scope === "gloss.rw") return "Gloss write"
      return scope
    })
    .join(", ")
}

export interface DomainExternalAccessNavProps {
  domainId: string | null
  selectedKeyId?: string | null
  onManageKey?: (chronicleKeyId: string) => void
}

export function DomainExternalAccessNav({
  domainId,
  selectedKeyId,
  onManageKey,
}: DomainExternalAccessNavProps) {
  const [keys, setKeys] = React.useState<DomainAccessKeyRecord[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [label, setLabel] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [copiedDomainId, setCopiedDomainId] = React.useState(false)

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
      const data = (await apiFetch(
        `/api/domains/${encodeURIComponent(domainId)}/access-keys`,
        {
          method: "POST",
          body: JSON.stringify({ label: label.trim(), scopes: ["library.ro"] }),
        },
      )) as CreateKeyResponse
      setRevealedSecret(data.key.secret)
      setLabel("")
      await reload()
      onManageKey?.(domainAccessKeyChronicleId(data.key.id))
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

  const handleCopyDomainId = async () => {
    if (!domainId) return
    try {
      await navigator.clipboard.writeText(domainId)
      setCopiedDomainId(true)
      window.setTimeout(() => setCopiedDomainId(false), 2000)
    } catch {
      setError("Copy failed — select domain id manually")
    }
  }

  const activeCount = keys?.filter((k) => k.status === "active").length ?? 0
  const activeKeys = keys?.filter((k) => k.status === "active") ?? []

  return (
    <div
      className="keeper-sidebar-card rounded-md border px-0 py-2"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.5)",
        background: "hsl(var(--theme-surface-panel, var(--theme-surface-raised)) / 0.35)",
      }}
    >
      <div className="px-3 pb-2">
        <button
          type="button"
          className="keeper-nav-section-title text-left w-full"
          onClick={() => onManageKey?.(EXTERNAL_ACCESS_OVERVIEW_ID)}
        >
          External Access
        </button>
        <p
          className="text-[13px] mt-1 leading-snug"
          style={{ color: "var(--theme-ink-secondary-color, hsl(40 10% 78%))" }}
        >
          {!domainId
            ? "Loading…"
            : activeCount === 0
              ? "Create a key here for Cursor or Claude MCP"
              : `${activeCount} active key${activeCount === 1 ? "" : "s"} · Library read`}
        </p>
        {domainId ? (
          <p
            className="text-[11px] mt-1.5 leading-snug font-mono opacity-80 break-all"
            style={{ color: "var(--theme-ink-secondary-color, hsl(40 8% 72%))" }}
          >
            x-domain-id: {domainId}
            <button
              type="button"
              className="ml-2 underline underline-offset-2 font-sans not-italic"
              onClick={() => void handleCopyDomainId()}
            >
              {copiedDomainId ? "Copied" : "Copy"}
            </button>
          </p>
        ) : null}
      </div>

      {activeKeys.length > 0 ? (
        <ul className="flex flex-col gap-1 px-2">
          {activeKeys.map((key) => {
            const chronicleId = domainAccessKeyChronicleId(key.id)
            const isSelected =
              selectedKeyId === chronicleId ||
              parseDomainAccessKeyChronicleId(selectedKeyId ?? "") === key.id

            return (
              <li key={key.id}>
                <button
                  type="button"
                  onClick={() => onManageKey?.(chronicleId)}
                  className={`w-full text-left px-2 py-1.5 rounded-sm transition-opacity hover:opacity-85${
                    isSelected ? " keeper-nav-item-selected font-medium" : ""
                  }`}
                  style={{ color: "var(--theme-ink-secondary-color, hsl(40 10% 84%))" }}
                >
                  <span className="text-[14px] leading-snug block truncate">
                    {key.label.trim() || "Unlabeled key"}
                  </span>
                  <span className="text-[12px] leading-snug block opacity-80 truncate">
                    {key.key_prefix}… · {formatScopeList(key.scopes)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}

      <div className="px-3 pt-2 flex flex-col gap-2">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. Claude — Chuck laptop)"
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
          <p className="text-[11px] leading-relaxed opacity-90" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            In Cursor MCP: Authorization Bearer = this key. Header x-domain-id = domain id above.
            MCP URL: https://api.ke3p.com/api/mcp
          </p>
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
