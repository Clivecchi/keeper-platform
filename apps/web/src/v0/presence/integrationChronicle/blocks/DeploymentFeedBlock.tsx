"use client"

import * as React from "react"
import { ActionButton } from "../shared"
import { BlockShell, BlockTitle } from "./blockShell"

export type DeploymentBlockItem = {
  id: string
  title: string
  status: string
  timestampLabel?: string
  metaLeft?: string
  metaRight?: string
  logs?: Array<{ message?: string; text?: string }>
  logsLoading?: boolean
  onRequestLogs?: () => void
}

export type DeploymentFeedBlockProps = {
  deployments: DeploymentBlockItem[]
  onRedeploy: () => void | Promise<void>
  redeployBusy?: boolean
  redeployDisabled?: boolean
}

function statusTone(status: string): string {
  const s = status.toUpperCase()
  if (["SUCCESS", "SUCCEEDED", "ACTIVE", "READY", "COMPLETED"].some((v) => s.includes(v))) {
    return "hsl(var(--theme-status-success))"
  }
  if (["BUILDING", "DEPLOYING", "INITIALIZING", "QUEUED"].some((v) => s.includes(v))) {
    return "hsl(var(--theme-status-warning))"
  }
  if (["FAILED", "CRASHED", "ERROR", "CANCELED"].some((v) => s.includes(v))) {
    return "hsl(var(--theme-status-error))"
  }
  return "hsl(var(--theme-ink-tertiary))"
}

export function DeploymentFeedBlock({
  deployments,
  onRedeploy,
  redeployBusy = false,
  redeployDisabled = false,
}: DeploymentFeedBlockProps) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  const handleExpand = (dep: DeploymentBlockItem) => {
    const next = expandedId === dep.id ? null : dep.id
    setExpandedId(next)
    if (next && dep.onRequestLogs) {
      dep.onRequestLogs()
    }
  }

  return (
    <BlockShell>
      <BlockTitle>Deployments</BlockTitle>
      {deployments.length === 0 ? (
        <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          No deployments returned.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {deployments.map((dep) => {
            const expanded = expandedId === dep.id
            return (
              <li key={dep.id}>
                <button
                  type="button"
                  onClick={() => handleExpand(dep)}
                  className="w-full text-left rounded-md border px-3 py-2 text-[12px] transition-colors hover:opacity-90"
                  style={{
                    borderColor: "hsl(var(--theme-border-soft) / 0.4)",
                    color: "hsl(var(--theme-ink-secondary))",
                    background: expanded
                      ? "var(--treatment-color-alpha-08)"
                      : "hsl(var(--theme-surface-panel) / 0.35)",
                  }}
                >
                  <div className="flex justify-between gap-2">
                    <span className="truncate" style={{ color: "hsl(var(--theme-ink-primary))" }}>
                      {dep.title}
                    </span>
                    <span style={{ color: statusTone(dep.status) }}>{dep.status}</span>
                  </div>
                  {dep.timestampLabel && (
                    <div
                      className="mt-1 text-[11px]"
                      style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                    >
                      {dep.timestampLabel}
                    </div>
                  )}
                  {(dep.metaLeft || dep.metaRight) && (
                    <div
                      className="mt-1 flex justify-between gap-2 text-[11px]"
                      style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                    >
                      <span>{dep.metaLeft ?? ""}</span>
                      <span>{dep.metaRight ?? ""}</span>
                    </div>
                  )}
                </button>
                {expanded && (
                  <div
                    className="mt-1 max-h-36 overflow-y-auto rounded border p-2 font-mono text-[10px]"
                    style={{
                      borderColor: "hsl(var(--theme-border-soft) / 0.35)",
                      color: "hsl(var(--theme-ink-tertiary))",
                    }}
                  >
                    {dep.logsLoading
                      ? "Loading logs…"
                      : (dep.logs ?? []).map((line, i) => (
                          <div key={i} className="py-0.5 whitespace-pre-wrap break-all">
                            {line.text ?? line.message ?? "—"}
                          </div>
                        ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <div className="mt-3">
        <ActionButton
          label={redeployBusy ? "Redeploying…" : "Redeploy"}
          onClick={() => void onRedeploy()}
          disabled={redeployBusy || redeployDisabled || deployments.length === 0}
          variant="danger"
        />
      </div>
    </BlockShell>
  )
}
