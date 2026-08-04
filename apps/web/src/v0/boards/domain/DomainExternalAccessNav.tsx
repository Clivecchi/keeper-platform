"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"
import type { DomainAccessKeyRecord, McpOAuthGrantRecord } from "@keeper/shared"
import {
  domainAccessKeyChronicleId,
  EXTERNAL_ACCESS_OVERVIEW_ID,
  parseDomainAccessKeyChronicleId,
} from "./externalAccessKeyIds"

type AccessKeysResponse = { keys: DomainAccessKeyRecord[] }
type OauthGrantsResponse = { grants: McpOAuthGrantRecord[] }

type CreateKeyResponse = {
  key: DomainAccessKeyRecord & { secret: string }
}

async function fetchDomainAccessKeys(domainId: string): Promise<DomainAccessKeyRecord[]> {
  const data = (await apiFetch(
    `/api/domains/${encodeURIComponent(domainId)}/access-keys`,
  )) as AccessKeysResponse
  return data.keys ?? []
}

async function fetchOauthGrants(domainId: string): Promise<McpOAuthGrantRecord[]> {
  const data = (await apiFetch(
    `/api/domains/${encodeURIComponent(domainId)}/oauth-grants`,
  )) as OauthGrantsResponse
  return data.grants ?? []
}

function formatScopeList(scopes: string[]): string {
  if (!scopes.length) return "No scopes"
  return scopes
    .map((scope) => {
      if (scope === "library.ro") return "Library read"
      if (scope === "library.rw") return "Library read/write"
      if (scope === "dialog.ro") return "Dialog read"
      if (scope === "gloss.rw") return "Gloss write"
      return scope
    })
    .join(", ")
}

/** Library + Dialog Document read + Gloss write — Claude Document → Gloss chain. */
function withDialogAndGlossScopes(scopes: string[]): string[] {
  const next = new Set(scopes)
  if (!next.has("library.rw")) next.add("library.ro")
  next.add("dialog.ro")
  next.add("gloss.rw")
  return [...next]
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
  const [grants, setGrants] = React.useState<McpOAuthGrantRecord[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [label, setLabel] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [revokingGrantId, setRevokingGrantId] = React.useState<string | null>(null)
  const [updatingGrantId, setUpdatingGrantId] = React.useState<string | null>(null)
  const [revealedSecret, setRevealedSecret] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [copiedDomainId, setCopiedDomainId] = React.useState(false)

  const reload = React.useCallback(async () => {
    if (!domainId) return
    setError(null)
    try {
      const [rows, oauthRows] = await Promise.all([
        fetchDomainAccessKeys(domainId),
        fetchOauthGrants(domainId),
      ])
      setKeys(rows)
      setGrants(oauthRows)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Load failed")
      setKeys([])
      setGrants([])
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

  const handleRevokeGrant = async (grantId: string) => {
    if (!domainId) return
    setRevokingGrantId(grantId)
    setError(null)
    try {
      await apiFetch(
        `/api/domains/${encodeURIComponent(domainId)}/oauth-grants/${encodeURIComponent(grantId)}/revoke`,
        { method: "POST", body: JSON.stringify({}) },
      )
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed")
    } finally {
      setRevokingGrantId(null)
    }
  }

  const handleEnableDialogGloss = async (grant: McpOAuthGrantRecord) => {
    if (!domainId) return
    setUpdatingGrantId(grant.id)
    setError(null)
    try {
      await apiFetch(
        `/api/domains/${encodeURIComponent(domainId)}/oauth-grants/${encodeURIComponent(grant.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ scopes: withDialogAndGlossScopes(grant.scopes) }),
        },
      )
      await reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scope update failed")
    } finally {
      setUpdatingGrantId(null)
    }
  }

  const activeCount = keys?.filter((k) => k.status === "active").length ?? 0
  const activeKeys = keys?.filter((k) => k.status === "active") ?? []
  const activeGrants = grants?.filter((g) => g.status === "active") ?? []

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
            : activeCount === 0 && activeGrants.length === 0
              ? "Create a key for Cursor, or connect Claude via OAuth"
              : `${activeCount} key${activeCount === 1 ? "" : "s"} · ${activeGrants.length} OAuth grant${activeGrants.length === 1 ? "" : "s"}`}
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

      {activeGrants.length > 0 ? (
        <div className="px-2 pt-2">
          <p
            className="text-[11px] px-1 pb-1 uppercase tracking-wide opacity-70"
            style={{ color: "var(--theme-ink-secondary-color, hsl(40 8% 72%))" }}
          >
            OAuth grants
          </p>
          <ul className="flex flex-col gap-1">
            {activeGrants.map((grant) => {
              const needsDialogGloss =
                !grant.scopes.includes("dialog.ro") || !grant.scopes.includes("gloss.rw")
              return (
                <li
                  key={grant.id}
                  className="flex items-start justify-between gap-2 px-2 py-1.5 rounded-sm"
                  style={{ color: "var(--theme-ink-secondary-color, hsl(40 10% 84%))" }}
                >
                  <div className="min-w-0">
                    <span className="text-[14px] leading-snug block truncate">
                      {grant.client_name?.trim() || "OAuth client"}
                    </span>
                    <span className="text-[12px] leading-snug block opacity-80 truncate">
                      {formatScopeList(grant.scopes)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {needsDialogGloss ? (
                      <button
                        type="button"
                        disabled={updatingGrantId === grant.id}
                        onClick={() => void handleEnableDialogGloss(grant)}
                        className="text-[12px] underline underline-offset-2 disabled:opacity-50"
                      >
                        {updatingGrantId === grant.id ? "…" : "Add Dialog+Gloss"}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={revokingGrantId === grant.id}
                      onClick={() => void handleRevokeGrant(grant.id)}
                      className="text-[12px] underline underline-offset-2 disabled:opacity-50"
                    >
                      {revokingGrantId === grant.id ? "…" : "Revoke"}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
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
            MCP URL: https://api.ke3p.com/mcp
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
