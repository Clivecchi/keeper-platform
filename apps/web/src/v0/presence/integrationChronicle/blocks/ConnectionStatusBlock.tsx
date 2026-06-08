"use client"

import { formatConnectedAt } from "../shared"
import { BlockBadge, BlockShell, BlockTitle } from "./blockShell"

export type ConnectionHealth = "connected" | "degraded" | "error" | "disconnected"

export type LayerHealthStatus = "live" | "degraded" | "inactive"

export type ConnectionLayerHealth = {
  label: string
  status: LayerHealthStatus
}

export type ConnectionStatusBlockProps = {
  connectedAt: string | null
  credentialSource: string
  health: ConnectionHealth
  layers?: ConnectionLayerHealth[]
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

const LAYER_DOT: Record<LayerHealthStatus, string> = {
  live: "hsl(var(--theme-status-success))",
  degraded: "hsl(var(--theme-status-warning))",
  inactive: "hsl(var(--theme-ink-tertiary) / 0.5)",
}

export function ConnectionStatusBlock({
  connectedAt,
  credentialSource,
  health,
  layers,
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
      {layers && layers.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {layers.map((layer) => (
            <span
              key={layer.label}
              className="inline-flex items-center gap-1.5 text-[11px]"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: LAYER_DOT[layer.status] }}
                aria-hidden
              />
              {layer.label}
            </span>
          ))}
        </div>
      ) : null}
    </BlockShell>
  )
}
