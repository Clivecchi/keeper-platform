"use client"

import { formatConnectedAt } from "../shared"
import { BlockBadge, BlockShell, BlockTitle } from "./blockShell"

export type ConnectionHealth = "connected" | "degraded" | "error" | "disconnected"

export type ConnectionStatusBlockProps = {
  connectedAt: string | null
  credentialSource: string
  health: ConnectionHealth
}

const HEALTH_DOT: Record<ConnectionHealth, string> = {
  connected: "hsl(var(--theme-status-success))",
  degraded: "hsl(var(--theme-status-warning))",
  error: "hsl(var(--theme-status-error))",
  disconnected: "hsl(var(--theme-ink-tertiary) / 0.5)",
}

const HEALTH_LABEL: Record<ConnectionHealth, string> = {
  connected: "Connected",
  degraded: "Degraded",
  error: "Error",
  disconnected: "Disconnected",
}

export function ConnectionStatusBlock({
  connectedAt,
  credentialSource,
  health,
}: ConnectionStatusBlockProps) {
  return (
    <BlockShell>
      <BlockTitle>Connection status</BlockTitle>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: HEALTH_DOT[health] }}
          aria-hidden
        />
        <BlockBadge label={HEALTH_LABEL[health]} tone={health === "connected" ? "success" : health === "degraded" ? "warning" : health === "error" ? "error" : "neutral"} />
        <BlockBadge label={credentialSource.toUpperCase()} tone="info" />
      </div>
      <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        {connectedAt ? `Connected ${formatConnectedAt(connectedAt)}` : "Not connected"}
      </p>
    </BlockShell>
  )
}
