"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/api"
import type { DomainAccessKeyRecord } from "@keeper/shared"
import { ChronicleConfigShell } from "../chronicleConfig/ChronicleConfigShell"
import type { ChronicleSaveStatus } from "../chronicleConfig/types"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"
import {
  domainAccessKeyChronicleId,
  EXTERNAL_ACCESS_OVERVIEW_ID,
  parseDomainAccessKeyChronicleId,
} from "../../boards/domain/externalAccessKeyIds"

type AccessKeysResponse = { keys: DomainAccessKeyRecord[] }

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

function formatTimestamp(iso: string | null): string {
  if (!iso) return "Never"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-[10px] font-mono uppercase tracking-wider"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        {label}
      </span>
      <span className="text-[13px] leading-snug" style={{ color: "hsl(var(--theme-ink-primary))" }}>
        {value}
      </span>
    </div>
  )
}

export interface ExternalAccessKeyPresenceProps {
  chronicleKeyId: string
  domainId: string
  onLabelResolved?: (label: string) => void
  onKeySelect?: (chronicleKeyId: string) => void
}

export function ExternalAccessKeyPresence({
  chronicleKeyId,
  domainId,
  onLabelResolved,
  onKeySelect,
}: ExternalAccessKeyPresenceProps) {
  const board = useUniversalBoardOptional()
  const [keys, setKeys] = React.useState<DomainAccessKeyRecord[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [labelDraft, setLabelDraft] = React.useState("")
  const [saveStatus, setSaveStatus] = React.useState<ChronicleSaveStatus>("idle")
  const [revoking, setRevoking] = React.useState(false)
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null)

  const isOverview = chronicleKeyId === EXTERNAL_ACCESS_OVERVIEW_ID
  const keyId = parseDomainAccessKeyChronicleId(chronicleKeyId)

  const reload = React.useCallback(async () => {
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

  const selectedKey = React.useMemo(() => {
    if (!keyId || !keys) return null
    return keys.find((row) => row.id === keyId) ?? null
  }, [keyId, keys])

  React.useEffect(() => {
    if (isOverview) {
      onLabelResolved?.("External Access")
      return
    }
    const label = selectedKey?.label?.trim()
    if (label) onLabelResolved?.(label)
  }, [isOverview, onLabelResolved, selectedKey?.label])

  React.useEffect(() => {
    setLabelDraft(selectedKey?.label ?? "")
    setSaveMessage(null)
    setSaveStatus("idle")
  }, [selectedKey?.id, selectedKey?.label])

  const handleBack = () => {
    board?.actions.clearSelection()
  }

  const handleSaveLabel = async () => {
    if (!keyId || !labelDraft.trim()) return
    setSaveStatus("saving")
    setError(null)
    setSaveMessage(null)
    try {
      await apiFetch(
        `/api/domains/${encodeURIComponent(domainId)}/access-keys/${encodeURIComponent(keyId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ label: labelDraft.trim() }),
        },
      )
      setSaveStatus("saved")
      setSaveMessage("Label saved")
      await reload()
    } catch (err) {
      setSaveStatus("error")
      setError(err instanceof Error ? err.message : "Save failed")
      setSaveMessage(err instanceof Error ? err.message : "Save failed")
    }
  }

  const handleRevoke = async () => {
    if (!keyId || !selectedKey || selectedKey.status !== "active") return
    const confirmed = window.confirm(
      `Revoke "${selectedKey.label}"? External tools using this key will stop working immediately.`,
    )
    if (!confirmed) return

    setRevoking(true)
    setError(null)
    try {
      await apiFetch(
        `/api/domains/${encodeURIComponent(domainId)}/access-keys/${encodeURIComponent(keyId)}/revoke`,
        { method: "POST" },
      )
      await reload()
      handleBack()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed")
    } finally {
      setRevoking(false)
    }
  }

  const isDirty =
    !!selectedKey && labelDraft.trim() !== (selectedKey.label ?? "").trim() && labelDraft.trim().length > 0

  if (!keys) {
    return (
      <div className="px-4 py-5">
        <p className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Loading access keys…
        </p>
      </div>
    )
  }

  if (isOverview) {
    const activeKeys = keys.filter((row) => row.status === "active")

    return (
      <div className="keeper-panel-scroll flex flex-col h-full min-h-0 overflow-y-auto px-4 pt-4 pb-6 gap-5">
        <div>
          <p className="text-[18px] font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            External Access
          </p>
          <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Domain-bound keys for Cursor, Claude, and other MCP clients. Each key grants scoped
            Library access — never hand out your personal login token.
          </p>
        </div>

        <div
          className="rounded-md border px-3 py-3 flex flex-col gap-2"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.45)",
            background: "hsl(var(--theme-surface-panel) / 0.35)",
          }}
        >
          <p className="text-[12px] font-semibold" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            MCP connection
          </p>
          <ReadOnlyField label="MCP URL" value="https://api.ke3p.com/api/mcp" />
          <ReadOnlyField label="x-domain-id" value={domainId} />
          <p className="text-[12px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            Authorization: Bearer &lt;your key secret&gt; — shown once when you create a key in Nav.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <p
            className="text-[10px] font-mono uppercase tracking-wider"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Active keys ({activeKeys.length})
          </p>
          {activeKeys.length === 0 ? (
            <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
              No active keys yet. Create one from the External Access section in Nav.
            </p>
          ) : (
            activeKeys.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => onKeySelect?.(domainAccessKeyChronicleId(row.id))}
                className="text-left rounded-md border px-3 py-2.5 transition-opacity hover:opacity-90"
                style={{
                  borderColor: "hsl(var(--theme-border-soft) / 0.45)",
                  background: "hsl(var(--theme-surface-raised) / 0.25)",
                  color: "hsl(var(--theme-ink-primary))",
                }}
              >
                <span className="text-[14px] font-medium block truncate">{row.label}</span>
                <span
                  className="text-[12px] block mt-0.5 truncate"
                  style={{ color: "hsl(var(--theme-ink-secondary))" }}
                >
                  {row.key_prefix}… · {formatScopeList(row.scopes)}
                </span>
              </button>
            ))
          )}
        </div>

        {error ? (
          <p className="text-[12px]" style={{ color: "hsl(var(--destructive))" }}>
            {error}
          </p>
        ) : null}
      </div>
    )
  }

  if (!selectedKey) {
    return (
      <div className="px-4 py-5 flex flex-col gap-3">
        <p className="text-[14px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          Access key not found.
        </p>
        <button
          type="button"
          className="text-[13px] underline underline-offset-2 self-start"
          onClick={handleBack}
        >
          Back
        </button>
      </div>
    )
  }

  return (
    <ChronicleConfigShell
      identity={{
        name: selectedKey.label.trim() || "Access key",
        avatar: "🔑",
        status: selectedKey.status === "active" ? "Active" : "Revoked",
      }}
      onBack={handleBack}
      saveStatus={saveStatus}
      saveMessage={saveMessage}
      isDirty={isDirty}
      saveLabel="Save label"
      onSave={() => void handleSaveLabel()}
      onDismissError={() => {
        setSaveStatus("idle")
        setSaveMessage(null)
        setError(null)
      }}
    >
      <div className="flex flex-col gap-4 px-4 py-4">
        <label className="flex flex-col gap-1.5">
          <span
            className="text-[10px] font-mono uppercase tracking-wider"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Label
          </span>
          <input
            type="text"
            value={labelDraft}
            onChange={(event) => {
              setLabelDraft(event.target.value)
              setSaveStatus("idle")
              setSaveMessage(null)
            }}
            disabled={selectedKey.status !== "active"}
            className="w-full rounded-md border px-3 py-2 text-[14px]"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.6)",
              background: "hsl(var(--theme-surface-paper) / 0.5)",
              color: "hsl(var(--theme-ink-primary))",
            }}
          />
        </label>

        <ReadOnlyField label="Key prefix" value={`${selectedKey.key_prefix}…`} />
        <ReadOnlyField label="Scopes" value={formatScopeList(selectedKey.scopes)} />
        <ReadOnlyField label="Created" value={formatTimestamp(selectedKey.created_at)} />
        <ReadOnlyField label="Last used" value={formatTimestamp(selectedKey.last_used_at)} />

        {selectedKey.status === "active" ? (
          <div
            className="rounded-md border px-3 py-3 flex flex-col gap-2 mt-2"
            style={{
              borderColor: "hsl(var(--destructive) / 0.35)",
              background: "hsl(var(--destructive) / 0.06)",
            }}
          >
            <p className="text-[13px] font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
              Revoke key
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
              Permanently disables this key. You cannot recover the secret — create a new key if needed.
            </p>
            <button
              type="button"
              disabled={revoking}
              onClick={() => void handleRevoke()}
              className="text-[13px] font-medium self-start underline underline-offset-2 disabled:opacity-50"
              style={{ color: "hsl(var(--destructive))" }}
            >
              {revoking ? "Revoking…" : `Revoke "${selectedKey.label}"`}
            </button>
          </div>
        ) : null}

        {error && saveStatus !== "error" ? (
          <p className="text-[12px]" style={{ color: "hsl(var(--destructive))" }}>
            {error}
          </p>
        ) : null}
      </div>
    </ChronicleConfigShell>
  )
}
