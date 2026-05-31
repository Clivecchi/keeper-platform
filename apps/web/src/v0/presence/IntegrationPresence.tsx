"use client"

/**
 * IntegrationPresence — Chronicle surface for IDE Board integration nav items.
 * Uses Nango Connect UI; credentials stay in Nango.
 * Step 3B: deployment status, logs, and capability chips from resolved capability set.
 */
import * as React from "react"
import { apiFetch } from "../../lib/apiFetch"
import { openIntegrationConnect } from "../../lib/nangoConnect"

export type IntegrationStatus = "connected" | "disconnected" | "error"

export interface IntegrationDto {
  id: string
  service: string
  nangoConnectionId: string | null
  status: IntegrationStatus
  tier: string
  connectedAt: string | null
}

export interface IntegrationPresenceProps {
  serviceSlug: string
  domainId: string
  /** Board id for capability ceiling intersection (e.g. "ide"). */
  boardId?: string
  /** Agent slug whose capabilities are shown — Cloud holds infra read caps. */
  agentSlug?: string
}

const DEFERRED_SERVICES = new Set(["github"])

type DeploymentRow = {
  id: string
  status?: string
  state?: string
  createdAt?: string | number
  url?: string
  serviceId?: string
}

function formatConnectedAt(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatDeploymentTime(value: string | number | undefined): string {
  if (value == null) return "—"
  const d = typeof value === "number" ? new Date(value) : new Date(value)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function serviceLabel(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

function deploymentStatus(row: DeploymentRow): string {
  return row.status ?? row.state ?? "unknown"
}

function infraQuery(agentSlug: string, boardId?: string): string {
  const params = new URLSearchParams({ agentSlug })
  if (boardId) params.set("boardId", boardId)
  return params.toString()
}

export function IntegrationPresence({
  serviceSlug,
  domainId,
  boardId = "ide",
  agentSlug = "cloud",
}: IntegrationPresenceProps) {
  const [integration, setIntegration] = React.useState<IntegrationDto | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [deployments, setDeployments] = React.useState<DeploymentRow[]>([])
  const [deploymentsLoading, setDeploymentsLoading] = React.useState(false)
  const [capabilities, setCapabilities] = React.useState<string[]>([])
  const [logsOpen, setLogsOpen] = React.useState(false)
  const [logsLoading, setLogsLoading] = React.useState(false)
  const [logs, setLogs] = React.useState<Array<{ message?: string; text?: string; timestamp?: string; created?: number }>>([])
  const [logsError, setLogsError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = (await apiFetch(
        `/api/integrations?domainId=${encodeURIComponent(domainId)}`,
      )) as IntegrationDto[]
      const match =
        list.find((row) => row.service === serviceSlug && row.tier === "platform") ??
        list.find((row) => row.service === serviceSlug) ??
        null
      setIntegration(match)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load integration status")
      setIntegration(null)
    } finally {
      setLoading(false)
    }
  }, [domainId, serviceSlug])

  const refreshCapabilities = React.useCallback(async () => {
    try {
      const res = (await apiFetch(
        `/api/capabilities/resolve?${infraQuery(agentSlug, boardId)}`,
      )) as { success?: boolean; data?: { capabilities?: string[] } }
      setCapabilities(Array.isArray(res.data?.capabilities) ? res.data!.capabilities! : [])
    } catch {
      setCapabilities([])
    }
  }, [agentSlug, boardId])

  const refreshDeployments = React.useCallback(async () => {
    if (serviceSlug !== "railway" && serviceSlug !== "vercel") return
    setDeploymentsLoading(true)
    try {
      const q = infraQuery(agentSlug, boardId)
      const path =
        serviceSlug === "railway"
          ? `/api/railway/deployments?limit=5&${q}`
          : `/api/vercel/deployments?limit=5&${q}`
      const res = (await apiFetch(path)) as { success?: boolean; data?: DeploymentRow[] }
      setDeployments(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setDeployments([])
      setError(err instanceof Error ? err.message : "Failed to load deployments")
    } finally {
      setDeploymentsLoading(false)
    }
  }, [agentSlug, boardId, serviceSlug])

  React.useEffect(() => {
    void refresh()
    void refreshCapabilities()
  }, [refresh, refreshCapabilities])

  const status: IntegrationStatus = integration?.status ?? "disconnected"
  const label = serviceLabel(serviceSlug)
  const latestDeployment = deployments[0]

  React.useEffect(() => {
    if (status === "connected" && (serviceSlug === "railway" || serviceSlug === "vercel")) {
      void refreshDeployments()
    }
  }, [status, serviceSlug, refreshDeployments])

  const handleConnect = React.useCallback(async () => {
    if (DEFERRED_SERVICES.has(serviceSlug)) {
      return
    }
    setBusy(true)
    setError(null)
    try {
      await openIntegrationConnect({
        service: serviceSlug,
        domainId,
        onConnected: () => {
          void refresh()
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connect failed")
    } finally {
      setBusy(false)
    }
  }, [domainId, refresh, serviceSlug])

  const handleDisconnect = React.useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      await apiFetch("/api/integrations/disconnect", {
        method: "POST",
        body: JSON.stringify({ service: serviceSlug, domainId }),
      })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Disconnect failed")
    } finally {
      setBusy(false)
    }
  }, [domainId, refresh, serviceSlug])

  const handleViewLogs = React.useCallback(async () => {
    setLogsOpen(true)
    setLogsLoading(true)
    setLogsError(null)
    try {
      const q = infraQuery(agentSlug, boardId)
      let path: string
      if (serviceSlug === "railway") {
        let serviceId = latestDeployment?.serviceId
        if (!serviceId) {
          const svcRes = (await apiFetch(`/api/railway/services?${q}`)) as {
            data?: Array<{ id: string }>
          }
          serviceId = svcRes.data?.[0]?.id
        }
        if (!serviceId) {
          setLogsError("No Railway service ID available for logs")
          setLogs([])
          return
        }
        path = `/api/railway/logs/${encodeURIComponent(serviceId)}?limit=30&${q}`
      } else {
        if (!latestDeployment?.id) {
          setLogsError("No deployment ID available for logs")
          setLogs([])
          return
        }
        path = `/api/vercel/deployments/${encodeURIComponent(latestDeployment.id)}/logs?${q}`
      }
      const res = (await apiFetch(path)) as { success?: boolean; data?: typeof logs }
      setLogs(Array.isArray(res.data) ? res.data : [])
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : "Failed to load logs")
      setLogs([])
    } finally {
      setLogsLoading(false)
    }
  }, [agentSlug, boardId, latestDeployment?.id, latestDeployment?.serviceId, serviceSlug])

  const infraCapabilityChips = capabilities.filter((c) => c.startsWith("infra."))

  if (loading) {
    return (
      <p className="px-4 py-6 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Loading {label}…
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <div>
        <h3
          className="text-[14px] font-medium"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {label}
        </h3>
        <p className="mt-1 text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          Platform integration via Nango
        </p>
      </div>

      <div
        className="rounded-md border px-3 py-2 text-[12px]"
        style={{
          borderColor: "hsl(var(--theme-border-soft) / 0.45)",
          color: "hsl(var(--theme-ink-secondary))",
        }}
      >
        <div className="flex justify-between gap-2 py-1">
          <span>Status</span>
          <span
            style={{
              color:
                status === "connected"
                  ? "rgb(16 185 129)"
                  : status === "error"
                    ? "hsl(var(--theme-accent-warning, var(--theme-ink-primary)))"
                    : "hsl(var(--theme-ink-tertiary))",
              fontWeight: status === "connected" ? 500 : 400,
            }}
          >
            {status === "connected"
              ? "Connected"
              : status === "error"
                ? "Error"
                : "Not connected"}
          </span>
        </div>
        {integration?.connectedAt && status === "connected" && (
          <div className="flex justify-between gap-2 py-1 border-t border-[hsl(var(--theme-line-hairline))]">
            <span>Connected</span>
            <span>{formatConnectedAt(integration.connectedAt)}</span>
          </div>
        )}
      </div>

      {status === "connected" && (serviceSlug === "railway" || serviceSlug === "vercel") && (
        <div
          className="rounded-md border px-3 py-2 text-[12px]"
          style={{
            borderColor: "hsl(var(--theme-border-soft) / 0.45)",
            color: "hsl(var(--theme-ink-secondary))",
          }}
        >
          <div className="font-medium mb-2" style={{ color: "hsl(var(--theme-ink-primary))" }}>
            Latest deployment
          </div>
          {deploymentsLoading ? (
            <p className="text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              Loading deployments…
            </p>
          ) : latestDeployment ? (
            <>
              <div className="flex justify-between gap-2 py-1">
                <span>Status</span>
                <span>{deploymentStatus(latestDeployment)}</span>
              </div>
              <div className="flex justify-between gap-2 py-1 border-t border-[hsl(var(--theme-line-hairline))]">
                <span>When</span>
                <span>{formatDeploymentTime(latestDeployment.createdAt)}</span>
              </div>
              {latestDeployment.url && (
                <div className="flex justify-between gap-2 py-1 border-t border-[hsl(var(--theme-line-hairline))]">
                  <span>URL</span>
                  <span className="truncate max-w-[160px]">{latestDeployment.url}</span>
                </div>
              )}
              <div className="mt-2">
                <ActionButton
                  label={logsOpen && logsLoading ? "Loading logs…" : "View Logs"}
                  onClick={handleViewLogs}
                  disabled={logsLoading || !latestDeployment.id}
                />
              </div>
              {logsOpen && (
                <div
                  className="mt-2 max-h-40 overflow-y-auto rounded border p-2 text-[11px] font-mono"
                  style={{
                    borderColor: "hsl(var(--theme-border-soft) / 0.35)",
                    color: "hsl(var(--theme-ink-tertiary))",
                  }}
                >
                  {logsLoading ? (
                    <span>Loading…</span>
                  ) : logsError ? (
                    <span>{logsError}</span>
                  ) : logs.length === 0 ? (
                    <span>No log lines returned.</span>
                  ) : (
                    logs.map((line, i) => (
                      <div key={i} className="py-0.5 whitespace-pre-wrap break-all">
                        {line.message ?? line.text ?? JSON.stringify(line)}
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              No deployments returned.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-[12px]" style={{ color: "hsl(var(--theme-accent-warning, #b45309))" }}>
          {error}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {status === "connected" ? (
          <ActionButton label="Disconnect" onClick={handleDisconnect} disabled={busy} />
        ) : status === "error" ? (
          <ActionButton
            label={busy ? "Reconnecting…" : "Reconnect"}
            onClick={handleConnect}
            disabled={busy || DEFERRED_SERVICES.has(serviceSlug)}
          />
        ) : (
          <ActionButton
            label={busy ? "Opening…" : `Connect ${label}`}
            onClick={handleConnect}
            disabled={busy || DEFERRED_SERVICES.has(serviceSlug)}
          />
        )}
      </div>

      {DEFERRED_SERVICES.has(serviceSlug) && (
        <p className="text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
          GitHub connection is not enabled in this step.
        </p>
      )}

      {infraCapabilityChips.length > 0 && (
        <div className="mt-2 pt-3 border-t border-[hsl(var(--theme-line-hairline))]">
          <p
            className="text-[10px] uppercase tracking-wide mb-2"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Active capabilities
          </p>
          <div className="flex flex-wrap gap-1.5">
            {infraCapabilityChips.map((cap) => (
              <span
                key={cap}
                className="rounded-full border px-2 py-0.5 text-[10px]"
                style={{
                  borderColor: "hsl(var(--theme-border-soft) / 0.5)",
                  color: "hsl(var(--theme-ink-secondary))",
                }}
              >
                {cap}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ActionButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => void onClick()}
      disabled={disabled}
      className="rounded-md border px-3 py-1.5 text-[12px] transition-opacity disabled:opacity-50"
      style={{
        borderColor: "hsl(var(--theme-border-soft))",
        color: "hsl(var(--theme-ink-secondary))",
      }}
    >
      {label}
    </button>
  )
}
