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

type VercelDeployment = {
  id: string
  url?: string
  state?: string
  target?: string
  createdAt?: number
  meta?: { githubCommitRef?: string; githubCommitMessage?: string }
}

type VercelProject = { id: string; name: string; framework?: string | null }

function vercelGlow(state?: string): "healthy" | "building" | "degraded" {
  const s = (state ?? "").toUpperCase()
  if (["READY", "SUCCEEDED"].includes(s)) return "healthy"
  if (["BUILDING", "QUEUED", "INITIALIZING"].includes(s)) return "building"
  if (["ERROR", "FAILED", "CANCELED"].includes(s)) return "degraded"
  return "building"
}

export function VercelIntegrationChronicle({
  domainId,
  boardId = "ide",
  agentSlug = "cloud",
}: {
  domainId: string
  boardId?: string
  agentSlug?: string
}) {
  const conn = useIntegrationConnection("vercel", domainId)
  const capabilities = useResolvedCapabilities(agentSlug, boardId)
  const [project, setProject] = React.useState<VercelProject | null>(null)
  const [deployments, setDeployments] = React.useState<VercelDeployment[]>([])
  const [feedLoading, setFeedLoading] = React.useState(false)
  const [feedError, setFeedError] = React.useState<string | null>(null)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [buildLogs, setBuildLogs] = React.useState<Array<{ text?: string; message?: string }>>([])
  const [logsLoading, setLogsLoading] = React.useState(false)

  const loadFeed = React.useCallback(async () => {
    if (conn.status !== "connected") return
    setFeedLoading(true)
    setFeedError(null)
    const q = infraQuery(agentSlug, boardId)
    try {
      const [projRes, depRes] = await Promise.all([
        apiFetch(`/api/vercel/project?${q}`) as Promise<{ data?: VercelProject }>,
        apiFetch(`/api/vercel/deployments?limit=8&${q}`) as Promise<{ data?: VercelDeployment[] }>,
      ])
      setProject(projRes.data ?? null)
      setDeployments(Array.isArray(depRes.data) ? depRes.data : [])
    } catch (err) {
      setFeedError(err instanceof Error ? err.message : "Failed to load Vercel data")
      setProject(null)
      setDeployments([])
    } finally {
      setFeedLoading(false)
    }
  }, [agentSlug, boardId, conn.status])

  React.useEffect(() => {
    if (conn.status === "connected") void loadFeed()
  }, [conn.status, loadFeed])

  const loadBuildLogs = React.useCallback(
    async (deploymentId: string) => {
      setExpandedId(deploymentId)
      setLogsLoading(true)
      setBuildLogs([])
      try {
        const q = infraQuery(agentSlug, boardId)
        const res = (await apiFetch(
          `/api/vercel/deployments/${encodeURIComponent(deploymentId)}/logs?${q}`,
        )) as { data?: Array<{ text?: string; message?: string }> }
        setBuildLogs(Array.isArray(res.data) ? res.data : [])
      } catch (err) {
        setBuildLogs([{ text: err instanceof Error ? err.message : "Failed to load build logs" }])
      } finally {
        setLogsLoading(false)
      }
    },
    [agentSlug, boardId],
  )

  const handleRedeploy = React.useCallback(async () => {
    // incomplete — Vercel redeploy requires human confirmation gate
    const deploymentId = deployments[0]?.id
    if (!deploymentId) return
    const ok = await confirmDestructiveAction(
      "Redeploy this Vercel deployment? This will trigger a new build.",
    )
    if (!ok) return
    try {
      const q = infraQuery(agentSlug, boardId)
      await apiFetch(`/api/vercel/redeploy/${encodeURIComponent(deploymentId)}?${q}`, {
        method: "POST",
      })
      await loadFeed()
    } catch (err) {
      conn.setError(err instanceof Error ? err.message : "Redeploy failed")
    }
  }, [agentSlug, boardId, conn, deployments, loadFeed])

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
        serviceSlug="vercel"
        busy={conn.busy}
        error={conn.error}
        authConnectUrl={conn.authConnectUrl}
        onConnect={() => void conn.connect()}
      />
    )
  }

  const latest = deployments[0]
  const glow = vercelGlow(latest?.state)

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <HeroZone
        title="Vercel"
        subtitle={project?.name ?? "Project"}
        glow={glow}
      />

      {conn.integration?.connectedAt && (
        <StatusStrip>Connected {formatConnectedAt(conn.integration.connectedAt)}</StatusStrip>
      )}

      <StatusStrip>
        Latest · {latest?.target ?? "production"} · {latest?.state ?? "unknown"} ·{" "}
        {formatRelativeTime(latest?.createdAt)}
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
                  onClick={() => void loadBuildLogs(dep.id)}
                  className="w-full text-left rounded-md border px-3 py-2 text-[12px]"
                  style={{
                    borderColor: "hsl(var(--theme-border-soft) / 0.4)",
                    background:
                      expandedId === dep.id
                        ? "var(--treatment-color-alpha-08)"
                        : "hsl(var(--theme-surface-panel) / 0.35)",
                  }}
                >
                  <div className="flex justify-between gap-2">
                    <span
                      className="truncate"
                      style={{ color: "hsl(var(--theme-ink-primary))" }}
                    >
                      {dep.url ?? dep.id}
                    </span>
                    <span>{dep.state ?? "—"}</span>
                  </div>
                  <div
                    className="mt-1 flex justify-between gap-2 text-[11px]"
                    style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                  >
                    <span>{dep.target === "production" ? "Production" : "Preview"}</span>
                    <span>{dep.meta?.githubCommitRef ?? "—"}</span>
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
                    {logsLoading
                      ? "Loading build logs…"
                      : buildLogs.map((line, i) => (
                          <div key={i} className="py-0.5 whitespace-pre-wrap break-all">
                            {line.text ?? line.message ?? "—"}
                          </div>
                        ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {latest?.url && (
          <ActionButton
            label="Open Deployment"
            onClick={() => {
              window.open(latest.url, "_blank", "noopener,noreferrer")
            }}
          />
        )}
        <ActionButton
          label="View Build Logs"
          onClick={() => {
            if (latest) void loadBuildLogs(latest.id)
          }}
          disabled={!latest || logsLoading}
        />
        <ActionButton
          label="Redeploy"
          variant="danger"
          onClick={() => void handleRedeploy()}
          disabled={!latest}
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
