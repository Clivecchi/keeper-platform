"use client"

import * as React from "react"
import { FeedError, FeedShimmer } from "../shared"

export type DeploymentFeedItem = {
  id: string
  title: string
  status: string
  timestampLabel?: string
  metaLeft?: string
  metaRight?: string
}

export type DeploymentLogLine = { message?: string; text?: string }

export type DeploymentFeedProps = {
  deployments: DeploymentFeedItem[]
  loading: boolean
  error: string | null
  onRetry: () => void
  expandedId: string | null
  logsLoading: boolean
  expandedLogs: DeploymentLogLine[]
  onExpand: (id: string) => void
  logsLoadingLabel?: string
  renderRow?: (
    item: DeploymentFeedItem,
    ctx: {
      expanded: boolean
      onExpand: () => void
    },
  ) => React.ReactNode
}

export function DeploymentFeed({
  deployments,
  loading,
  error,
  onRetry,
  expandedId,
  logsLoading,
  expandedLogs,
  onExpand,
  logsLoadingLabel = "Loading logs…",
  renderRow,
}: DeploymentFeedProps) {
  return (
    <div>
      <p
        className="text-[10px] uppercase tracking-wide mb-2"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        Deployments
      </p>
      {loading ? (
        <FeedShimmer rows={4} />
      ) : error ? (
        <FeedError message={error} onRetry={onRetry} />
      ) : deployments.length === 0 ? (
        <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          No deployments returned.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {deployments.map((dep) => {
            const expanded = expandedId === dep.id
            const row = renderRow?.(dep, {
              expanded,
              onExpand: () => onExpand(dep.id),
            })
            if (row) {
              return <li key={dep.id}>{row}</li>
            }
            return (
              <li key={dep.id}>
                <button
                  type="button"
                  onClick={() => onExpand(dep.id)}
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
                    <span style={{ color: "hsl(var(--theme-ink-primary))" }}>{dep.title}</span>
                    <span>{dep.status}</span>
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
                    {logsLoading
                      ? logsLoadingLabel
                      : expandedLogs.map((line, i) => (
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
    </div>
  )
}
