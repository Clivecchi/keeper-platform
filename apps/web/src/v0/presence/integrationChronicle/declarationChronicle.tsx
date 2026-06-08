"use client"

import * as React from "react"
import {
  ConnectionStatusBlock,
  DeploymentFeedBlock,
  KeyHealthBlock,
  LinkedAgentsBlock,
  ModelCatalogBlock,
  RepositoryActivityBlock,
  type ConnectionHealth,
  type DeploymentBlockItem,
  type KeySource,
  type KeyStatus,
} from "./blocks"
import type { AIModelFeedData, KeyHealthSource } from "./feeds/AIModelFeed"
import type { GitHubFeedData } from "./feeds/GitHubFeed"
import {
  ActionButton,
  CapabilityChips,
  FeedError,
  FeedShimmer,
  formatRelativeTime,
  HeroZone,
  type IntegrationDto,
  type IntegrationType,
} from "./shared"
import type {
  FeedDataState,
  RailwayFeedData,
  ServiceAction,
  ServiceConfig,
  VercelFeedData,
} from "./serviceConfig"
import { buildManageKeysHandler } from "./manageKeysNavigation"
import type { useIntegrationConnection } from "./shared"

type IntegrationConnection = ReturnType<typeof useIntegrationConnection>

const CHRONICLE_ACTION_LABELS: Record<string, string> = {
  view_logs: "View Logs",
  redeploy: "Redeploy",
  disconnect: "Disconnect",
  open_deployment: "Open Deployment",
  view_build_logs: "View Build Logs",
  view_on_github: "View on GitHub",
  create_branch: "Create Branch",
  open_pr: "Open PR",
  test_provider: "Test Provider",
  manage_keys: "Manage Keys",
  refresh_models: "Refresh Models",
}

const INTEGRATION_TYPE_LABELS: Record<IntegrationType, string> = {
  Services: "OAuth service",
  Custom: "Custom token",
  AI_Model: "AI model",
}

function glowToConnectionHealth(glow: ReturnType<ServiceConfig["glowFn"]>): ConnectionHealth {
  if (glow === "healthy") return "connected"
  if (glow === "degraded") return "degraded"
  if (glow === "building") return "degraded"
  return "disconnected"
}

function statusToConnectionHealth(status: IntegrationDto["status"]): ConnectionHealth {
  if (status === "connected") return "connected"
  if (status === "error") return "error"
  return "disconnected"
}

function mapKeySource(source: KeyHealthSource | undefined): KeySource {
  if (source === "env") return "ENV"
  if (source === "user") return "USER"
  if (source === "platform") return "PLATFORM"
  return "ENV"
}

function mapKeyStatus(status: "valid" | "invalid" | "missing" | undefined): KeyStatus {
  if (status === "valid") return "valid"
  if (status === "invalid") return "invalid"
  return "missing"
}

export function integrationKeyStatusLabel(
  keyStatus: "valid" | "invalid" | "missing" | undefined,
  integrationType: IntegrationType,
): string {
  if (keyStatus === "valid") return "Key valid"
  if (keyStatus === "invalid") return "Key invalid"
  if (keyStatus === "missing") return "Key required"
  return INTEGRATION_TYPE_LABELS[integrationType]
}

export function IntegrationAIModelConfigBlocks({ feed }: { feed: FeedDataState<unknown> }) {
  const d = feed.data as AIModelFeedData

  return (
    <div className="flex flex-col gap-4">
      <KeyHealthBlock
        keySource={mapKeySource(d.keyHealth?.source)}
        keyStatus={mapKeyStatus(d.keyHealth?.status)}
        lastVerified={d.keyHealth?.lastChecked ?? null}
        onKeyUpdate={(key) => d.saveKey(key)}
        keyUpdateBusy={d.keySaveBusy}
        keyUpdateError={d.keySaveError}
        errorMessage={d.keyHealth?.errorMessage ?? null}
      />
      <LinkedAgentsBlock
        agents={d.linkedAgents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          model: agent.model,
        }))}
      />
    </div>
  )
}

function infraCredentialSource(integrationType: IntegrationType): string {
  if (integrationType === "Services") return "OAuth"
  if (integrationType === "Custom") return "Platform env"
  return "Platform"
}

function aiCredentialSource(keyHealth: AIModelFeedData["keyHealth"]): string {
  const source = keyHealth?.source ?? "none"
  if (source === "env") return "ENV"
  if (source === "user") return "USER"
  if (source === "platform") return "PLATFORM"
  return "None"
}

function aiConnectionHealth(
  integrationStatus: IntegrationDto["status"],
  keyHealth: AIModelFeedData["keyHealth"],
): ConnectionHealth {
  if (integrationStatus === "error") return "error"
  if (integrationStatus !== "connected") return "disconnected"
  if (keyHealth?.status === "valid") return "connected"
  if (keyHealth?.status === "invalid") return "degraded"
  return "degraded"
}

export function IntegrationIdentityBlock({
  displayLabel,
  integrationType,
  description,
}: {
  displayLabel: string
  integrationType: IntegrationType
  description: string | null | undefined
}) {
  return (
    <div
      className="rounded-md border px-3 py-3"
      style={{ borderColor: "hsl(var(--theme-border-soft) / 0.45)" }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <h4 className="text-[14px] font-medium" style={{ color: "hsl(var(--theme-ink-primary))" }}>
          {displayLabel}
        </h4>
        <span
          className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide"
          style={{
            borderColor: "hsl(210 80% 55% / 0.2)",
            color: "hsl(var(--theme-ink-secondary))",
          }}
        >
          {INTEGRATION_TYPE_LABELS[integrationType]}
        </span>
      </div>
      {description && (
        <p className="text-[12px] leading-relaxed" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          {description}
        </p>
      )}
    </div>
  )
}

export function resolveDeclarationActions(
  chronicleActions: string[],
  config: ServiceConfig<unknown>,
  ctx: {
    conn: IntegrationConnection
    feed: FeedDataState<unknown>
    domainId: string
    boardId: string
    agentSlug: string
    serviceSlug: string
    openConfigMode?: () => void
    onKeySelect?: (keyId: string) => void
  },
): ServiceAction[] {
  const built = config.buildActions(ctx)
  const byLabel = new Map(built.map((action) => [action.label, action]))
  const aiData =
    ctx.feed.data && typeof ctx.feed.data === "object" && "refreshCatalog" in ctx.feed.data
      ? (ctx.feed.data as AIModelFeedData)
      : null

  const resolved: ServiceAction[] = []
  for (const slug of chronicleActions) {
    const label = CHRONICLE_ACTION_LABELS[slug]
    if (!label) continue

    if (slug === "manage_keys" && (ctx.onKeySelect || ctx.openConfigMode)) {
      const provider =
        ctx.serviceSlug ||
        ctx.conn.integration?.service ||
        ""
      resolved.push({
        label,
        onClick: buildManageKeysHandler({
          domainId: ctx.domainId,
          provider,
          onKeySelect: ctx.onKeySelect,
          openConfigMode: ctx.openConfigMode,
        }),
      })
      continue
    }

    const existing = byLabel.get(label)
    if (existing) {
      resolved.push(existing)
      continue
    }

    if (slug === "refresh_models" && aiData) {
      resolved.push({
        label,
        onClick: () => void aiData.refreshCatalog(),
        disabled: aiData.refreshBusy,
      })
    }
  }
  return resolved
}

function findActionBySlug(
  actions: ServiceAction[],
  slug: string,
): ServiceAction | undefined {
  const label = CHRONICLE_ACTION_LABELS[slug]
  return label ? actions.find((action) => action.label === label) : undefined
}

function buildRailwayDeployments(feed: FeedDataState<RailwayFeedData>): DeploymentBlockItem[] {
  const { services, deployments, expandedId, expandedLogs, logsLoading, loadLogsForDeployment } =
    feed.data
  return deployments.map((dep) => ({
    id: dep.id,
    title: services.find((s) => s.id === dep.serviceId)?.name ?? "Service",
    status: dep.status ?? "unknown",
    timestampLabel: formatRelativeTime(dep.createdAt),
    logs: expandedId === dep.id ? expandedLogs : undefined,
    logsLoading: expandedId === dep.id ? logsLoading : false,
    onRequestLogs: () => void loadLogsForDeployment(dep),
  }))
}

function buildVercelDeployments(feed: FeedDataState<VercelFeedData>): DeploymentBlockItem[] {
  const { deployments, expandedId, buildLogs, logsLoading, loadBuildLogs } = feed.data
  return deployments.map((dep) => ({
    id: dep.id,
    title: dep.url ?? dep.id,
    status: dep.state ?? "—",
    metaLeft: dep.target === "production" ? "Production" : "Preview",
    metaRight: dep.meta?.githubCommitRef ?? "—",
    logs: expandedId === dep.id ? buildLogs : undefined,
    logsLoading: expandedId === dep.id ? logsLoading : false,
    onRequestLogs: () => void loadBuildLogs(dep.id),
  }))
}

export function DeclarationChronicleBlocks({
  blocks,
  serviceSlug,
  integration,
  integrationType,
  config,
  feed,
  actions,
}: {
  blocks: string[]
  serviceSlug: string
  integration: IntegrationDto
  integrationType: IntegrationType
  config: ServiceConfig<unknown>
  feed: FeedDataState<unknown>
  actions: ServiceAction[]
}) {
  const redeployAction = findActionBySlug(actions, "redeploy")
  const glow = config.glowFn(feed.data)

  if (feed.loading && serviceSlug !== "github" && serviceSlug !== "railway" && serviceSlug !== "vercel") {
    const ai = feed.data as AIModelFeedData
    if (!ai.keyHealth) {
      return <FeedShimmer rows={4} />
    }
  }

  if (feed.error && blocks.some((b) => b !== "connection_status")) {
    const hasPrimaryData =
      serviceSlug === "github" ||
      serviceSlug === "railway" ||
      serviceSlug === "vercel" ||
      Boolean((feed.data as AIModelFeedData).keyHealth)
    if (!hasPrimaryData) {
      return <FeedError message={feed.error} onRetry={() => void feed.reload()} />
    }
  }

  return (
    <>
      {blocks.map((block) => {
        switch (block) {
          case "connection_status": {
            const isAi = integrationType === "AI_Model"
            const aiData = feed.data as AIModelFeedData
            return (
              <ConnectionStatusBlock
                key={block}
                connectedAt={integration.connectedAt}
                credentialSource={
                  isAi ? aiCredentialSource(aiData.keyHealth) : infraCredentialSource(integrationType)
                }
                health={
                  isAi
                    ? aiConnectionHealth(integration.status, aiData.keyHealth)
                    : integration.status === "connected"
                      ? glowToConnectionHealth(glow)
                      : statusToConnectionHealth(integration.status)
                }
              />
            )
          }
          case "key_health": {
            const d = feed.data as AIModelFeedData
            return (
              <KeyHealthBlock
                key={block}
                keySource={mapKeySource(d.keyHealth?.source)}
                keyStatus={mapKeyStatus(d.keyHealth?.status)}
                lastVerified={d.keyHealth?.lastChecked ?? null}
                onKeyUpdate={(key) => d.saveKey(key)}
                keyUpdateBusy={d.keySaveBusy}
                keyUpdateError={d.keySaveError}
                errorMessage={d.keyHealth?.errorMessage ?? null}
              />
            )
          }
          case "model_catalog": {
            const d = feed.data as AIModelFeedData
            const catalogMeta = d.integration?.metadata as
              | {
                  catalog?: {
                    items?: unknown[]
                    fetchedAt?: string
                    source?: "live" | "fallback"
                  }
                }
              | undefined
            const catalogItems = catalogMeta?.catalog?.items ?? []
            const catalogSource = catalogMeta?.catalog?.source
            return (
              <ModelCatalogBlock
                key={block}
                modelCount={catalogItems.length || d.staticModelCount}
                lastFetched={catalogMeta?.catalog?.fetchedAt ?? null}
                isFallback={catalogSource !== "live"}
                onRefresh={() => d.refreshCatalog()}
                refreshBusy={d.refreshBusy}
              />
            )
          }
          case "deployment_feed": {
            if (serviceSlug === "railway") {
              const railwayFeed = feed as FeedDataState<RailwayFeedData>
              if (railwayFeed.loading && railwayFeed.data.deployments.length === 0) {
                return <FeedShimmer key={block} rows={4} />
              }
              return (
                <DeploymentFeedBlock
                  key={block}
                  deployments={buildRailwayDeployments(railwayFeed)}
                  onRedeploy={() => redeployAction?.onClick()}
                  redeployDisabled={redeployAction?.disabled}
                />
              )
            }
            if (serviceSlug === "vercel") {
              const vercelFeed = feed as FeedDataState<VercelFeedData>
              if (vercelFeed.loading && vercelFeed.data.deployments.length === 0) {
                return <FeedShimmer key={block} rows={4} />
              }
              return (
                <DeploymentFeedBlock
                  key={block}
                  deployments={buildVercelDeployments(vercelFeed)}
                  onRedeploy={() => redeployAction?.onClick()}
                  redeployDisabled={redeployAction?.disabled}
                />
              )
            }
            return null
          }
          case "repository_activity": {
            const d = feed.data as GitHubFeedData
            if (feed.loading && d.commits.length === 0 && d.pulls.length === 0) {
              return <FeedShimmer key={block} rows={4} />
            }
            return (
              <RepositoryActivityBlock
                key={block}
                commits={d.commits}
                pullRequests={d.pulls.map((pr) => ({
                  number: pr.number,
                  title: pr.title,
                  state: pr.state,
                  updatedAt: pr.updated_at,
                }))}
                branches={d.branches}
              />
            )
          }
          case "linked_agents": {
            const d = feed.data as AIModelFeedData
            return (
              <LinkedAgentsBlock
                key={block}
                agents={d.linkedAgents.map((agent) => ({
                  id: agent.id,
                  name: agent.name,
                  model: agent.model,
                }))}
              />
            )
          }
          default:
            return null
        }
      })}
    </>
  )
}

export function DeclarationConnectedChronicle({
  integration,
  integrationType,
  config,
  feed,
  conn,
  domainId,
  boardId,
  agentSlug,
  capabilities,
  openConfigMode,
  onKeySelect,
}: {
  integration: IntegrationDto
  integrationType: IntegrationType
  config: ServiceConfig<unknown>
  feed: FeedDataState<unknown>
  conn: IntegrationConnection
  domainId: string
  boardId: string
  agentSlug: string
  capabilities: string[]
  openConfigMode?: () => void
  onKeySelect?: (keyId: string) => void
}) {
  const displayLabel = integration.display_label ?? config.label
  const description = integration.description
  const blocks = integration.chronicle_blocks ?? []
  const chronicleActions = integration.chronicle_actions ?? []
  const glow = config.glowFn(feed.data)

  const actionCtx = React.useMemo(
    () => ({
      conn,
      feed,
      domainId,
      boardId,
      agentSlug,
      serviceSlug: integration.service,
      openConfigMode,
      onKeySelect,
    }),
    [conn, feed, domainId, boardId, agentSlug, integration.service, openConfigMode, onKeySelect],
  )
  const actions = React.useMemo(
    () => resolveDeclarationActions(chronicleActions, config, actionCtx),
    [chronicleActions, config, actionCtx],
  )
  const testResult =
    feed.data && typeof feed.data === "object" && "testResult" in feed.data
      ? (feed.data as AIModelFeedData).testResult
      : null

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <HeroZone
        title={displayLabel}
        subtitle={config.heroSubtitle(feed.data)}
        glow={glow}
      />

      <IntegrationIdentityBlock
        displayLabel={displayLabel}
        integrationType={integrationType}
        description={description}
      />

      <DeclarationChronicleBlocks
        blocks={blocks}
        serviceSlug={integration.service}
        integration={integration}
        integrationType={integrationType}
        config={config}
        feed={feed}
        actions={actions}
      />

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <ActionButton
              key={action.label}
              label={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              variant={action.variant}
            />
          ))}
        </div>
      )}

      {conn.error && (
        <p className="text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
          {conn.error}
        </p>
      )}

      {testResult && (
        <p
          className="text-[12px] whitespace-pre-wrap"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
        >
          {testResult}
        </p>
      )}

      <CapabilityChips capabilities={capabilities} />
    </div>
  )
}
