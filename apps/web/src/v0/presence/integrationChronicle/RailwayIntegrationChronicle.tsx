"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/apiFetch"
import {
  ActionButton,
  CapabilityChips,
  FeedError,
  FeedShimmer,
  HeroZone,
  StatusStrip,
  confirmDestructiveAction,
  formatRelativeTime,
  infraQuery,
  useIntegrationConnection,
  useResolvedCapabilities,
  IntegrationUnconnectedState,
  formatConnectedAt,
} from "./shared"

type RailwayDeployment = {
  id: string
  status?: string
  createdAt?: string
  serviceId?: string
}

type RailwayService = { id: string; name: string }

function healthFromDeployments(deployments: RailwayDeployment[]): "healthy" | "building" | "degraded" {
  if (!deployments.length) return "building"
  const latest = deployments[0]?.status?.toUpperCase() ?? ""
  if (["SUCCESS", "SUCCEEDED", "ACTIVE", "COMPLETED"].some((s) => latest.includes(s))) return "healthy"
  if (["BUILDING", "DEPLOYING", "INITIALIZING", "QUEUED"].some((s) => latest.includes(s))) return "building"
  if (["FAILED", "CRASHED", "ERROR"].some((s) => latest.includes(s))) return "degraded"
  return "building"
}

export function RailwayIntegrationChronicle({
  domainId,
  boardId = "ide",
  agentSlug = "cloud",
}: {
  domainId: string
  boardId?: string
  agentSlug?: string
}) {
  const conn = useIntegrationConnection("railway", domainId)
  const capabilities = useResolvedCapabilities(agentSlug, boardId)
  const [services, setServices] = React.useState<RailwayService[]>([])
  const [deployments, setDeployments] = React.useState<RailwayDeployment[]>([])
  const [feedLoading, setFeedLoading] = React.useState(false)
  const [feedError, setFeedError] = React.useState<string | null>(null)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [expandedLogs, setExpandedLogs] = React.useState<Array<{ message?: string }>>([])
  const [logsLoading, setLogsLoading] = React.useState(false)

  const loadFeed = React.useCallback(async () => {
    if (conn.status !== "connected") return
    setFeedLoading(true)
    setFeedError(null)
    const q = infraQuery(agentSlug, boardId)
    try {
      const [svcRes, depRes] = await Promise.all([
        apiFetch(`/api/railway/services?${q}`) as Promise<{ data?: RailwayService[] }>,
        apiFetch(`/api/railway/deployments?limit=8&${q}`) as Promise<{ data?: RailwayDeployment[] }>,
      ])
      setServices(Array.isArray(svcRes.data) ? svcRes.data : [])
      setDeployments(Array.isArray(depRes.data) ? depRes.data : [])
    } catch (err) {
      setFeedError(err instanceof Error ? err.message : "Failed to load Railway data")
      setServices([])
      setDeployments([])
    } finally {
      setFeedLoading(false)
    }
  }, [agentSlug, boardId, conn.status])

  React.useEffect(() => {
    if (conn.status === "connected") void loadFeed()
  }, [conn.status, loadFeed])

  const loadLogsForDeployment = React.useCallback(
    async (dep: RailwayDeployment) => {
      setExpandedId(dep.id)
      setLogsLoading(true)
      setExpandedLogs([])
      try {
        const q = infraQuery(agentSlug, boardId)
        let serviceId = dep.serviceId ?? services[0]?.id
        if (!serviceId) {
          const svcRes = (await apiFetch(`/api/railway/services?${q}`)) as { data?: RailwayService[] }
          serviceId = svcRes.data?.[0]?.id
        }
        if (!serviceId) {
          setExpandedLogs([{ message: "No service ID available for logs." }])
          return
        }
        const res = (await apiFetch(
          `/api/railway/logs/${encodeURIComponent(serviceId)}?limit=40&${q}`,
        )) as { data?: Array<{ message?: string }> }
        setExpandedLogs(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        setExpandedLogs([
          { message: err instanceof Error ? err.message : "Failed to load logs" },
        ])
      } finally {
        setLogsLoading(false)
      }
    },
    [agentSlug, boardId, services],
  )

  const handleRedeploy = React.useCallback(async () => {
    // incomplete — Railway redeploy requires human confirmation gate
    const serviceId = services[0]?.id ?? deployments[0]?.serviceId
    if (!serviceId) return
    const ok = await confirmDestructiveAction(
      "Redeploy the primary Railway service? This will trigger a new deployment.",
    )
    if (!ok) return
    try {
      const q = infraQuery(agentSlug, boardId)
      await apiFetch(`/api/railway/redeploy/${encodeURIComponent(serviceId)}?${q}`, {
        method: "POST",
      })
      await loadFeed()
    } catch (err) {
      conn.setError(err instanceof Error ? err.message : "Redeploy failed")
    }
  }, [agentSlug, boardId, conn, deployments, loadFeed, services])

  if (conn.loading) {
    return (
      <div className="px-4 py-5">
        <FeedShimmer rows={4} />
      </div>
    )
  }

  if (conn.status !== "connected") {
    return (
      <IntegrationUnconnectedState
        serviceSlug="railway"
        busy={conn.busy}
        error={conn.error}
        onConnect={() => void conn.connect()}
      />
    )
  }

  const glow = healthFromDeployments(deployments)
  const healthLabel =
    glow === "healthy" ? "Healthy" : glow === "building" ? "Building" : "Degraded"

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <HeroZone
        title="Railway"
        subtitle={`${services.length} service${services.length === 1 ? "" : "s"} · ${healthLabel}`}
        glow={glow}
      />

      {conn.integration?.connectedAt && (
        <StatusStrip>Connected {formatConnectedAt(conn.integration.connectedAt)}</StatusStrip>
      )}

      <StatusStrip>
        {services.length} services · Last deploy{" "}
        {formatRelativeTime(deployments[0]?.createdAt)} · {healthLabel}
      </StatusStrip>

      <div>
        <p
          className="text-[10px] uppercase tracking-wide mb-2"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Deployments
        </p>
        {feedLoading ? (
          <FeedShimmer rows={4} />
        ) : feedError ? (
          <FeedError message={feedError} onRetry={() => void loadFeed()} />
        ) : deployments.length === 0 ? (
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
            No deployments returned.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {deployments.map((dep) => (
              <li key={dep.id}>
                <button
                  type="button"
                  onClick={() => void loadLogsForDeployment(dep)}
                  className="w-full text-left rounded-md border px-3 py-2 text-[12px] transition-colors hover:opacity-90"
                  style={{
                    borderColor: "hsl(var(--theme-border-soft) / 0.4)",
                    color: "hsl(var(--theme-ink-secondary))",
                    background:
                      expandedId === dep.id
                        ? "var(--treatment-color-alpha-08)"
                        : "hsl(var(--theme-surface-panel) / 0.35)",
                  }}
                >
                  <div className="flex justify-between gap-2">
                    <span style={{ color: "hsl(var(--theme-ink-primary))" }}>
                      {services.find((s) => s.id === dep.serviceId)?.name ?? "Service"}
                    </span>
                    <span>{dep.status ?? "unknown"}</span>
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                    {formatRelativeTime(dep.createdAt)}
                  </div>
                </button>
                {expandedId === dep.id && (
                  <div
                    className="mt-1 max-h-36 overflow-y-auto rounded border p-2 font-mono text-[10px]"
                    style={{
                      borderColor: "hsl(var(--theme-border-soft) / 0.35)",
                      color: "hsl(var(--theme-ink-tertiary))",
                    }}
                  >
                    {logsLoading ? (
                      "Loading logs…"
                    ) : (
                      expandedLogs.map((line, i) => (
                        <div key={i} className="py-0.5 whitespace-pre-wrap break-all">
                          {line.message ?? "—"}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <ActionButton
          label="View Logs"
          onClick={() => {
            const dep = deployments[0]
            if (dep) void loadLogsForDeployment(dep)
          }}
          disabled={!deployments.length || logsLoading}
        />
        <ActionButton
          label="Redeploy"
          variant="danger"
          onClick={() => void handleRedeploy()}
          disabled={!services.length && !deployments.length}
        />
        <ActionButton label="Disconnect" onClick={() => void conn.disconnect()} disabled={conn.busy} />
      </div>

      {conn.error && (
        <p className="text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
          {conn.error}
        </p>
      )}

      <CapabilityChips capabilities={capabilities} />
    </div>
  )
}
