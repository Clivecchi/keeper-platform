"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { apiFetch } from "../../../lib/api"
import type { DomainAccessKeyRecord, McpOAuthGrantRecord } from "@keeper/shared"
import { AccessKeyCreateForm } from "./AccessKeyCreateForm"
import {
  domainAccessKeyChronicleId,
  EXTERNAL_ACCESS_OVERVIEW_ID,
  parseDomainAccessKeyChronicleId,
} from "./externalAccessKeyIds"
import { formatScopeList, withDialogAndGlossScopes } from "./externalAccessScopes"

type AccessKeysResponse = { keys: DomainAccessKeyRecord[] }
type OauthGrantsResponse = { grants: McpOAuthGrantRecord[] }

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
  const [revokingGrantId, setRevokingGrantId] = React.useState<string | null>(null)
  const [updatingGrantId, setUpdatingGrantId] = React.useState<string | null>(null)
  const [copiedDomainId, setCopiedDomainId] = React.useState(false)
  const labelInputRef = React.useRef<HTMLInputElement>(null)

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

  const focusLabelInput = () => {
    labelInputRef.current?.focus()
    labelInputRef.current?.scrollIntoView({ block: "nearest" })
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
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="keeper-nav-section-title text-left min-w-0 flex-1"
            onClick={() => onManageKey?.(EXTERNAL_ACCESS_OVERVIEW_ID)}
          >
            External Access
          </button>
          <button
            type="button"
            onClick={focusLabelInput}
            className="inline-flex items-center justify-center rounded-full border p-1 shrink-0 transition-opacity hover:opacity-80"
            style={{
              borderColor: "hsl(var(--theme-border-soft))",
              color: "var(--theme-ink-secondary-color)",
              backgroundColor: "hsl(var(--theme-surface-paper) / 0.8)",
            }}
            aria-label="Add access key"
            title="Add access key"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
        <p
          className="text-[13px] mt-1 leading-snug"
          style={{ color: "var(--theme-ink-secondary-color, hsl(40 10% 78%))" }}
        >
          {!domainId
            ? "Loading…"
            : activeCount === 0 && activeGrants.length === 0
              ? "Create a key for TypeSafe, Cursor, Claude, or any MCP client"
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

      <div className="px-3 pb-3">
        <AccessKeyCreateForm
          domainId={domainId}
          inputRef={labelInputRef}
          onCreated={async () => {
            await reload()
          }}
        />
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

      {error ? (
        <p className="text-[12px] px-3 pt-2" style={{ color: "hsl(var(--destructive))" }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
