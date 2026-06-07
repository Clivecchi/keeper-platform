"use client"

import * as React from "react"
import { apiFetch } from "../../../lib/apiFetch"
import {
  confirmDestructiveAction,
  formatRelativeTime,
  infraQuery,
  type useIntegrationConnection,
} from "./shared"
import { DeploymentFeed, type DeploymentFeedItem } from "./feeds/DeploymentFeed"
import {
  GitHubFeed,
  useGitHubFeedData,
  type GitHubFeedData,
} from "./feeds/GitHubFeed"
import {
  AIModelFeed,
  useAIModelFeedData,
  type AIModelFeedData,
  type KeyHealth,
} from "./feeds/AIModelFeed"
import type { IntegrationType } from "./shared"

export type GlowState = "healthy" | "building" | "degraded" | "muted"

type IntegrationConnection = ReturnType<typeof useIntegrationConnection>

export type ServiceAction = {
  label: string
  onClick: () => void
  disabled?: boolean
  variant?: "default" | "danger"
}

export type FeedDataParams = {
  domainId: string
  boardId: string
  agentSlug: string
  connected: boolean
  enabled: boolean
}

export type FeedDataState<T> = {
  data: T
  loading: boolean
  error: string | null
  reload: () => void | Promise<void>
}

export type ServiceIconProps = { className?: string }

export type ServiceConfig<TData = unknown> = {
  label: string
  icon: React.ComponentType<ServiceIconProps>
  integrationType?: IntegrationType
  isGateway?: boolean
  connectCopy?: string
  useFeedData: (params: FeedDataParams) => FeedDataState<TData>
  heroSubtitle: (data: TData) => string
  glowFn: (data: TData) => GlowState
  statusLine: (data: TData) => string
  FeedComponent: React.ComponentType<{
    feed: FeedDataState<TData>
    domainId: string
    boardId: string
    agentSlug: string
  }>
  buildActions: (ctx: {
    conn: IntegrationConnection
    feed: FeedDataState<TData>
    domainId: string
    boardId: string
    agentSlug: string
    openConfigMode?: () => void
  }) => ServiceAction[]
  oauthTroubleshootingCopy?: React.ReactNode
}

function ServiceInitialIcon({ label, className }: ServiceIconProps & { label: string }) {
  return (
    <span
      className={className}
      aria-hidden
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "1.25rem",
        height: "1.25rem",
        borderRadius: "0.25rem",
        fontSize: "0.625rem",
        fontWeight: 600,
        background: "hsl(var(--theme-surface-elevated) / 0.5)",
        color: "hsl(var(--theme-ink-secondary))",
      }}
    >
      {label.charAt(0)}
    </span>
  )
}

// --- Railway ---

type RailwayDeployment = {
  id: string
  status?: string
  createdAt?: string
  serviceId?: string
}

type RailwayService = { id: string; name: string }

export type RailwayFeedData = {
  services: RailwayService[]
  deployments: RailwayDeployment[]
  expandedId: string | null
  expandedLogs: Array<{ message?: string }>
  logsLoading: boolean
  loadLogsForDeployment: (dep: RailwayDeployment) => Promise<void>
}

function healthFromDeployments(deployments: RailwayDeployment[]): GlowState {
  if (!deployments.length) return "building"
  const latest = deployments[0]?.status?.toUpperCase() ?? ""
  if (["SUCCESS", "SUCCEEDED", "ACTIVE", "COMPLETED"].some((s) => latest.includes(s))) return "healthy"
  if (["BUILDING", "DEPLOYING", "INITIALIZING", "QUEUED"].some((s) => latest.includes(s))) return "building"
  if (["FAILED", "CRASHED", "ERROR"].some((s) => latest.includes(s))) return "degraded"
  return "building"
}

function railwayHealthLabel(glow: GlowState): string {
  return glow === "healthy" ? "Healthy" : glow === "building" ? "Building" : "Degraded"
}

function useRailwayFeedData({
  boardId,
  agentSlug,
  connected,
  enabled,
}: FeedDataParams): FeedDataState<RailwayFeedData> {
  const active = connected && enabled
  const [services, setServices] = React.useState<RailwayService[]>([])
  const [deployments, setDeployments] = React.useState<RailwayDeployment[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [expandedLogs, setExpandedLogs] = React.useState<Array<{ message?: string }>>([])
  const [logsLoading, setLogsLoading] = React.useState(false)

  const reload = React.useCallback(async () => {
    if (!active) return
    setLoading(true)
    setError(null)
    const q = infraQuery(agentSlug, boardId)
    try {
      const [svcRes, depRes] = await Promise.all([
        apiFetch(`/api/railway/services?${q}`) as Promise<{ data?: RailwayService[] }>,
        apiFetch(`/api/railway/deployments?limit=8&${q}`) as Promise<{ data?: RailwayDeployment[] }>,
      ])
      setServices(Array.isArray(svcRes.data) ? svcRes.data : [])
      setDeployments(Array.isArray(depRes.data) ? depRes.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Railway data")
      setServices([])
      setDeployments([])
    } finally {
      setLoading(false)
    }
  }, [active, agentSlug, boardId])

  React.useEffect(() => {
    if (active) void reload()
  }, [active, reload])

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
        const resolvedServiceId = serviceId
        const res = (await apiFetch(
          `/api/railway/logs/${encodeURIComponent(resolvedServiceId)}?limit=40&${q}`,
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

  return {
    data: {
      services,
      deployments,
      expandedId,
      expandedLogs,
      logsLoading,
      loadLogsForDeployment,
    },
    loading,
    error,
    reload,
  }
}

function RailwayDeploymentFeed({
  feed,
}: {
  feed: FeedDataState<RailwayFeedData>
  domainId: string
  boardId: string
  agentSlug: string
}) {
  const { services, deployments, expandedId, expandedLogs, logsLoading, loadLogsForDeployment } =
    feed.data

  const items: DeploymentFeedItem[] = deployments.map((dep) => ({
    id: dep.id,
    title: services.find((s) => s.id === dep.serviceId)?.name ?? "Service",
    status: dep.status ?? "unknown",
    timestampLabel: formatRelativeTime(dep.createdAt),
  }))

  return (
    <DeploymentFeed
      deployments={items}
      loading={feed.loading}
      error={feed.error}
      onRetry={() => void feed.reload()}
      expandedId={expandedId}
      logsLoading={logsLoading}
      expandedLogs={expandedLogs}
      onExpand={(id) => {
        const dep = deployments.find((d) => d.id === id)
        if (dep) void loadLogsForDeployment(dep)
      }}
    />
  )
}

// --- Vercel ---

type VercelDeployment = {
  id: string
  url?: string
  state?: string
  target?: string
  createdAt?: number
  meta?: { githubCommitRef?: string; githubCommitMessage?: string }
}

type VercelProject = { id: string; name: string; framework?: string | null }

export type VercelFeedData = {
  project: VercelProject | null
  deployments: VercelDeployment[]
  expandedId: string | null
  buildLogs: Array<{ text?: string; message?: string }>
  logsLoading: boolean
  loadBuildLogs: (deploymentId: string) => Promise<void>
}

function vercelGlow(state?: string): GlowState {
  const s = (state ?? "").toUpperCase()
  if (["READY", "SUCCEEDED"].includes(s)) return "healthy"
  if (["BUILDING", "QUEUED", "INITIALIZING"].includes(s)) return "building"
  if (["ERROR", "FAILED", "CANCELED"].includes(s)) return "degraded"
  return "building"
}

function useVercelFeedData({
  boardId,
  agentSlug,
  connected,
  enabled,
}: FeedDataParams): FeedDataState<VercelFeedData> {
  const active = connected && enabled
  const [project, setProject] = React.useState<VercelProject | null>(null)
  const [deployments, setDeployments] = React.useState<VercelDeployment[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [buildLogs, setBuildLogs] = React.useState<Array<{ text?: string; message?: string }>>([])
  const [logsLoading, setLogsLoading] = React.useState(false)

  const reload = React.useCallback(async () => {
    if (!active) return
    setLoading(true)
    setError(null)
    const q = infraQuery(agentSlug, boardId)
    try {
      const [projRes, depRes] = await Promise.all([
        apiFetch(`/api/vercel/project?${q}`) as Promise<{ data?: VercelProject }>,
        apiFetch(`/api/vercel/deployments?limit=8&${q}`) as Promise<{ data?: VercelDeployment[] }>,
      ])
      setProject(projRes.data ?? null)
      setDeployments(Array.isArray(depRes.data) ? depRes.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Vercel data")
      setProject(null)
      setDeployments([])
    } finally {
      setLoading(false)
    }
  }, [active, agentSlug, boardId])

  React.useEffect(() => {
    if (active) void reload()
  }, [active, reload])

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

  return {
    data: {
      project,
      deployments,
      expandedId,
      buildLogs,
      logsLoading,
      loadBuildLogs,
    },
    loading,
    error,
    reload,
  }
}

function VercelDeploymentFeed({
  feed,
}: {
  feed: FeedDataState<VercelFeedData>
  domainId: string
  boardId: string
  agentSlug: string
}) {
  const { deployments, expandedId, buildLogs, logsLoading, loadBuildLogs } = feed.data

  const items: DeploymentFeedItem[] = deployments.map((dep) => ({
    id: dep.id,
    title: dep.url ?? dep.id,
    status: dep.state ?? "—",
    metaLeft: dep.target === "production" ? "Production" : "Preview",
    metaRight: dep.meta?.githubCommitRef ?? "—",
  }))

  return (
    <DeploymentFeed
      deployments={items}
      loading={feed.loading}
      error={feed.error}
      onRetry={() => void feed.reload()}
      expandedId={expandedId}
      logsLoading={logsLoading}
      expandedLogs={buildLogs}
      logsLoadingLabel="Loading build logs…"
      onExpand={(id) => void loadBuildLogs(id)}
      renderRow={(item, ctx) => (
        <>
          <button
            type="button"
            onClick={ctx.onExpand}
            className="w-full text-left rounded-md border px-3 py-2 text-[12px]"
            style={{
              borderColor: "hsl(var(--theme-border-soft) / 0.4)",
              background: ctx.expanded
                ? "var(--treatment-color-alpha-08)"
                : "hsl(var(--theme-surface-panel) / 0.35)",
            }}
          >
            <div className="flex justify-between gap-2">
              <span className="truncate" style={{ color: "hsl(var(--theme-ink-primary))" }}>
                {item.title}
              </span>
              <span>{item.status}</span>
            </div>
            <div
              className="mt-1 flex justify-between gap-2 text-[11px]"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              <span>{item.metaLeft}</span>
              <span>{item.metaRight}</span>
            </div>
          </button>
          {ctx.expanded && (
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
        </>
      )}
    />
  )
}

function GitHubFeedSlot({
  feed,
}: {
  feed: FeedDataState<GitHubFeedData>
  domainId: string
  boardId: string
  agentSlug: string
}) {
  return (
    <GitHubFeed
      data={feed.data}
      loading={feed.loading}
      error={feed.error}
      onRetry={() => void feed.reload()}
    />
  )
}

function useGitHubFeedDataSlot(params: FeedDataParams): FeedDataState<GitHubFeedData> {
  const active = params.connected && params.enabled
  const { data, loading, error, reload } = useGitHubFeedData(params.domainId, active)
  return { data, loading, error, reload }
}

function aiGlow(data: AIModelFeedData): GlowState {
  if (data.keyHealth?.status === "valid") return "healthy"
  if (data.keyHealth?.status === "invalid") return "degraded"
  return "muted"
}

function aiHeroSubtitle(data: AIModelFeedData): string {
  const source = data.keyHealth?.source ?? "none"
  if (data.keyHealth?.status === "valid") {
    return `Connected via ${source}`
  }
  if (data.keyHealth?.status === "invalid") {
    return "Key invalid — update required"
  }
  return "Key required"
}

function aiStatusLine(data: AIModelFeedData): string {
  if (data.isGateway) {
    const catalogMeta = data.integration?.metadata as
      | { catalog?: { items?: unknown[] } }
      | undefined
    const count = catalogMeta?.catalog?.items?.length ?? data.staticModelCount
    return `${count} models available`
  }
  return data.keyHealth?.status === "valid" ? "Ready" : "Key required"
}

function buildAIModelFeedSlot(serviceSlug: string) {
  return function AIModelFeedSlot({
    feed,
    domainId,
    boardId,
    agentSlug,
  }: {
    feed: FeedDataState<AIModelFeedData>
    domainId: string
    boardId: string
    agentSlug: string
  }) {
    return (
      <AIModelFeed
        feed={feed}
        domainId={domainId}
        boardId={boardId}
        agentSlug={agentSlug}
      />
    )
  }
}

function useAIModelFeedDataSlot(
  serviceSlug: string,
  params: FeedDataParams,
): FeedDataState<AIModelFeedData> {
  return useAIModelFeedData(serviceSlug, {
    domainId: params.domainId,
    connected: params.connected,
    enabled: params.enabled,
  })
}

function buildAiModelActions(serviceSlug: string) {
  return ({
    conn,
    feed,
    openConfigMode,
  }: {
    conn: IntegrationConnection
    feed: FeedDataState<AIModelFeedData>
    openConfigMode?: () => void
  }): ServiceAction[] => [
    {
      label: "Test Provider",
      onClick: () => {
        void (async () => {
          try {
            const body = (await apiFetch(
              `/api/integrations/${encodeURIComponent(serviceSlug)}/key-health`,
            )) as KeyHealth
            feed.data.setTestResult(
              `Status: ${body.status.toUpperCase()} · Source: ${body.source.toUpperCase()} · Checked ${formatRelativeTime(body.lastChecked)}`,
            )
            await feed.reload()
          } catch (err) {
            feed.data.setTestResult(
              err instanceof Error ? err.message : "Health check failed",
            )
          }
        })()
      },
    },
    {
      label: "Manage Keys",
      onClick: () => {
        openConfigMode?.()
      },
      disabled: !openConfigMode,
    },
    {
      label: "Disconnect",
      onClick: () => void conn.disconnect(),
      disabled: conn.busy,
    },
  ]
}

function createAIModelConfig(params: {
  slug: string
  label: string
  connectCopy: string
  isGateway?: boolean
}): ServiceConfig<AIModelFeedData> {
  return {
    label: params.label,
    icon: (iconProps) => <ServiceInitialIcon label={params.label} {...iconProps} />,
    integrationType: "AI_Model",
    isGateway: params.isGateway ?? false,
    connectCopy: params.connectCopy,
    useFeedData: (feedParams) =>
      useAIModelFeedDataSlot(params.slug, feedParams),
    heroSubtitle: aiHeroSubtitle,
    glowFn: aiGlow,
    statusLine: aiStatusLine,
    FeedComponent: buildAIModelFeedSlot(params.slug),
    buildActions: buildAiModelActions(params.slug),
  }
}

export const SERVICE_CONFIG: Record<string, ServiceConfig<unknown>> = {
  railway: {
    label: "Railway",
    icon: (props) => <ServiceInitialIcon label="Railway" {...props} />,
    useFeedData: useRailwayFeedData as (params: FeedDataParams) => FeedDataState<unknown>,
    heroSubtitle: (data) => {
      const d = data as RailwayFeedData
      const glow = healthFromDeployments(d.deployments)
      return `${d.services.length} service${d.services.length === 1 ? "" : "s"} · ${railwayHealthLabel(glow)}`
    },
    glowFn: (data) => healthFromDeployments((data as RailwayFeedData).deployments),
    statusLine: (data) => {
      const d = data as RailwayFeedData
      const glow = healthFromDeployments(d.deployments)
      return `${d.services.length} services · Last deploy ${formatRelativeTime(d.deployments[0]?.createdAt)} · ${railwayHealthLabel(glow)}`
    },
    FeedComponent: RailwayDeploymentFeed as React.ComponentType<{
      feed: FeedDataState<unknown>
      domainId: string
      boardId: string
      agentSlug: string
    }>,
    buildActions: ({ conn, feed, agentSlug, boardId }) => {
      const d = feed.data as RailwayFeedData
      return [
        {
          label: "View Logs",
          onClick: () => {
            const dep = d.deployments[0]
            if (dep) void d.loadLogsForDeployment(dep)
          },
          disabled: !d.deployments.length || d.logsLoading,
        },
        {
          label: "Redeploy",
          variant: "danger" as const,
          onClick: () => {
            void (async () => {
              const serviceId = d.services[0]?.id ?? d.deployments[0]?.serviceId
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
                await feed.reload()
              } catch (err) {
                conn.setError(err instanceof Error ? err.message : "Redeploy failed")
              }
            })()
          },
          disabled: !d.services.length && !d.deployments.length,
        },
        {
          label: "Disconnect",
          onClick: () => void conn.disconnect(),
          disabled: conn.busy,
        },
      ]
    },
  },
  vercel: {
    label: "Vercel",
    icon: (props) => <ServiceInitialIcon label="Vercel" {...props} />,
    useFeedData: useVercelFeedData as (params: FeedDataParams) => FeedDataState<unknown>,
    heroSubtitle: (data) => (data as VercelFeedData).project?.name ?? "Project",
    glowFn: (data) => vercelGlow((data as VercelFeedData).deployments[0]?.state),
    statusLine: (data) => {
      const latest = (data as VercelFeedData).deployments[0]
      return `Latest · ${latest?.target ?? "production"} · ${latest?.state ?? "unknown"} · ${formatRelativeTime(latest?.createdAt)}`
    },
    FeedComponent: VercelDeploymentFeed as React.ComponentType<{
      feed: FeedDataState<unknown>
      domainId: string
      boardId: string
      agentSlug: string
    }>,
    buildActions: ({ conn, feed, agentSlug, boardId }) => {
      const d = feed.data as VercelFeedData
      const latest = d.deployments[0]
      const actions: ServiceAction[] = []
      if (latest?.url) {
        actions.push({
          label: "Open Deployment",
          onClick: () => {
            window.open(latest.url, "_blank", "noopener,noreferrer")
          },
        })
      }
      actions.push(
        {
          label: "View Build Logs",
          onClick: () => {
            if (latest) void d.loadBuildLogs(latest.id)
          },
          disabled: !latest || d.logsLoading,
        },
        {
          label: "Redeploy",
          variant: "danger",
          onClick: () => {
            void (async () => {
              const deploymentId = latest?.id
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
                await feed.reload()
              } catch (err) {
                conn.setError(err instanceof Error ? err.message : "Redeploy failed")
              }
            })()
          },
          disabled: !latest,
        },
        {
          label: "Disconnect",
          onClick: () => void conn.disconnect(),
          disabled: conn.busy,
        },
      )
      return actions
    },
  },
  github: {
    label: "GitHub",
    icon: (props) => <ServiceInitialIcon label="GitHub" {...props} />,
    useFeedData: useGitHubFeedDataSlot as (params: FeedDataParams) => FeedDataState<unknown>,
    heroSubtitle: (data) => {
      const d = data as GitHubFeedData
      return `${d.repoName} · ${d.branch}`
    },
    glowFn: () => "healthy",
    statusLine: (data) => {
      const d = data as GitHubFeedData
      return `${d.repoName} · ${d.branch} · Last commit ${formatRelativeTime(d.commits[0]?.date)}`
    },
    FeedComponent: GitHubFeedSlot as React.ComponentType<{
      feed: FeedDataState<unknown>
      domainId: string
      boardId: string
      agentSlug: string
    }>,
    buildActions: ({ conn, feed }) => {
      const d = feed.data as GitHubFeedData
      return [
        {
          label: "View on GitHub",
          onClick: () => {
            window.open(`https://github.com/${d.repoName}`, "_blank", "noopener,noreferrer")
          },
        },
        {
          label: "Create Branch",
          onClick: () => {
            const name = window.prompt("New branch name:")
            if (!name?.trim()) return
            conn.setError("Create Branch is not yet wired — // incomplete")
          },
        },
        {
          label: "Open PR",
          variant: "danger",
          onClick: () => {
            void (async () => {
              const ok = await confirmDestructiveAction(
                "Open a pull request via Cloud? This action requires confirmation and is not fully wired yet.",
              )
              if (!ok) return
              conn.setError("Open PR is not yet wired — // incomplete")
            })()
          },
        },
        {
          label: "Disconnect",
          onClick: () => void conn.disconnect(),
          disabled: conn.busy,
        },
      ]
    },
    oauthTroubleshootingCopy: (
      <p className="mt-2">
        If the popup shows GitHub <strong>Settings → Installed GitHub Apps</strong> instead of an
        Install screen, the app is already installed but the connect handshake did not finish.
        Uninstall <em>Keeper Integration</em> from GitHub (Settings → Applications → Installed GitHub
        Apps), then use the link below to authorize again.
      </p>
    ),
  },
  anthropic: createAIModelConfig({
    slug: "anthropic",
    label: "Anthropic",
    connectCopy:
      "Connect your Anthropic account to power Kip and other agents with Claude.",
  }),
  openai: createAIModelConfig({
    slug: "openai",
    label: "OpenAI",
    connectCopy: "Connect OpenAI to use GPT models across your agents.",
  }),
  "together-ai": createAIModelConfig({
    slug: "together-ai",
    label: "Together AI",
    isGateway: true,
    connectCopy:
      "Connect Together AI to access 50+ open-source models including Llama and Mistral.",
  }),
  elevenlabs: createAIModelConfig({
    slug: "elevenlabs",
    label: "ElevenLabs",
    connectCopy: "Connect ElevenLabs to enable voice capabilities for your agents.",
  }),
}

export function getServiceConfig(serviceSlug: string): ServiceConfig<unknown> | null {
  return SERVICE_CONFIG[serviceSlug] ?? null
}

/** Calls all service feed hooks unconditionally; returns the active slug's state. */
export function useServiceFeedData(
  serviceSlug: string,
  params: Omit<FeedDataParams, "enabled">,
): FeedDataState<unknown> {
  const railway = useRailwayFeedData({ ...params, enabled: serviceSlug === "railway" })
  const vercel = useVercelFeedData({ ...params, enabled: serviceSlug === "vercel" })
  const github = useGitHubFeedDataSlot({ ...params, enabled: serviceSlug === "github" })
  const anthropic = useAIModelFeedDataSlot("anthropic", {
    ...params,
    enabled: serviceSlug === "anthropic",
  })
  const openai = useAIModelFeedDataSlot("openai", {
    ...params,
    enabled: serviceSlug === "openai",
  })
  const togetherAi = useAIModelFeedDataSlot("together-ai", {
    ...params,
    enabled: serviceSlug === "together-ai",
  })
  const elevenlabs = useAIModelFeedDataSlot("elevenlabs", {
    ...params,
    enabled: serviceSlug === "elevenlabs",
  })

  if (serviceSlug === "railway") return railway
  if (serviceSlug === "vercel") return vercel
  if (serviceSlug === "github") return github
  if (serviceSlug === "anthropic") return anthropic
  if (serviceSlug === "openai") return openai
  if (serviceSlug === "together-ai") return togetherAi
  if (serviceSlug === "elevenlabs") return elevenlabs

  return {
    data: {},
    loading: false,
    error: null,
    reload: () => {},
  }
}
