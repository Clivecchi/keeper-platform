"use client"

import * as React from "react"
import type { DomainTierKeyPolicy } from "@keeper/shared"
import {
  summarizeDomainKeyAccess,
  type DomainProviderAccessLine,
} from "../../presence/integrationChronicle/domainKeyAccessSummary"
import {
  fetchDomainKeyAccess,
  type KeyNavRow,
} from "../../presence/integrationChronicle/keyNavUtils"

export interface DomainAiAccessNavProps {
  domainId: string | null
  onManageKey?: (keyId: string) => void
  onAddKey?: () => void
}

function AccessLine({
  line,
  onManage,
}: {
  line: DomainProviderAccessLine
  onManage?: (keyId: string) => void
}) {
  const hint = `${line.providerLabel} · ${line.accessLabel}`

  if (line.keyId && line.canManage && onManage) {
    return (
      <button
        type="button"
        onClick={() => onManage(line.keyId!)}
        className="w-full text-left px-2 py-1 rounded-sm transition-opacity hover:opacity-85"
        style={{ color: "var(--theme-ink-secondary-color, hsl(40 10% 84%))" }}
      >
        <span className="text-[11px] leading-snug">{hint}</span>
      </button>
    )
  }

  return (
    <p
      className="px-2 py-1 text-[11px] leading-snug"
      style={{ color: "var(--theme-ink-secondary-color, hsl(40 10% 84%))" }}
    >
      {hint}
    </p>
  )
}

export function DomainAiAccessNav({ domainId, onManageKey, onAddKey }: DomainAiAccessNavProps) {
  const [rows, setRows] = React.useState<KeyNavRow[] | null>(null)
  const [policy, setPolicy] = React.useState<DomainTierKeyPolicy | null>(null)
  const [tierLabel, setTierLabel] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!domainId) return
    let cancelled = false
    setRows(null)
    setPolicy(null)
    setTierLabel(null)
    setError(null)
    void fetchDomainKeyAccess(domainId)
      .then((payload) => {
        if (!cancelled) {
          setRows(payload.keys)
          setPolicy(payload.policy)
          setTierLabel(payload.tier.label)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load AI access")
          setRows([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [domainId])

  const summary = React.useMemo(
    () => (rows ? summarizeDomainKeyAccess(rows, policy ?? undefined) : null),
    [rows, policy],
  )

  const description = !domainId
    ? "Loading…"
    : summary
      ? summary.connectedCount === 0
        ? `${tierLabel ?? "Free"} · no providers connected yet`
        : `${tierLabel ?? "Free"} · ${summary.includedCount} included · ${summary.yoursCount} yours`
      : "Loading…"

  const firstAddCandidate = summary?.canAddOwnKeys
    ? summary.lines.find((line) => line.canManage && line.status !== "valid")
    : undefined

  return (
    <div
      className="keeper-sidebar-card rounded-md border px-0 py-2"
      style={{
        borderColor: "hsl(var(--theme-border-soft) / 0.5)",
        background: "hsl(var(--theme-surface-panel, var(--theme-surface-raised)) / 0.35)",
      }}
    >
      <div className="px-3 pb-1">
        <p className="keeper-nav-section-title text-[10px] font-semibold uppercase tracking-widest">
          AI Access
        </p>
        <p
          className="text-[10px] mt-0.5 leading-snug"
          style={{ color: "var(--theme-ink-secondary-color, hsl(40 10% 78%))" }}
        >
          {description}
        </p>
        <p
          className="text-[9px] mt-1 leading-snug opacity-80"
          style={{ color: "var(--theme-ink-secondary-color, hsl(40 8% 72%))" }}
        >
          {summary?.canAddOwnKeys
            ? "Included access is private to your realm — shared capacity, never revealed."
            : "Included access on your plan. Upgrade to add your own provider keys."}
        </p>
      </div>

      {summary ? (
        <div className="flex flex-col gap-0.5 mt-1">
          {summary.lines
            .filter((line) => line.status === "valid" || line.canManage)
            .map((line) => (
              <AccessLine key={line.provider} line={line} onManage={onManageKey} />
            ))}
        </div>
      ) : null}

      {firstAddCandidate && onAddKey ? (
        <div className="px-2 pt-2">
          <button
            type="button"
            onClick={onAddKey}
            className="text-[10px] font-medium underline underline-offset-2 transition-opacity hover:opacity-80"
            style={{ color: "var(--theme-ink-primary-color, hsl(40 14% 92%))" }}
          >
            Add your key
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="text-[10px] px-3 pt-1" style={{ color: "hsl(var(--destructive))" }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
