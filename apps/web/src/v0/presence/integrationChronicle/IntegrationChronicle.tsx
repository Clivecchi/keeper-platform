"use client"

import * as React from "react"
import {
  ActionButton,
  CapabilityChips,
  FeedShimmer,
  HeroZone,
  IntegrationUnconnectedState,
  StatusStrip,
  formatConnectedAt,
  useIntegrationConnection,
  useResolvedCapabilities,
} from "./shared"
import { getServiceConfig, useServiceFeedData } from "./serviceConfig"

export function IntegrationChronicle({
  serviceSlug,
  domainId,
  boardId = "ide",
  agentSlug = "cloud",
}: {
  serviceSlug: string
  domainId: string
  boardId?: string
  agentSlug?: string
}) {
  const config = getServiceConfig(serviceSlug)
  const conn = useIntegrationConnection(serviceSlug, domainId)
  const capabilities = useResolvedCapabilities(agentSlug, boardId)
  const connected = conn.status === "connected"

  const feedParams = React.useMemo(
    () => ({ domainId, boardId, agentSlug, connected }),
    [domainId, boardId, agentSlug, connected],
  )

  const feed = useServiceFeedData(serviceSlug, feedParams)

  if (!config) {
    return (
      <p className="px-4 py-6 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Unknown integration: {serviceSlug}
      </p>
    )
  }

  if (conn.loading) {
    return (
      <div className="px-4 py-5">
        <FeedShimmer rows={4} />
      </div>
    )
  }

  if (!connected) {
    return (
      <IntegrationUnconnectedState
        serviceSlug={serviceSlug}
        integrationType={conn.integrationType}
        busy={conn.busy}
        error={conn.error}
        authConnectUrl={conn.authConnectUrl}
        oauthTroubleshootingCopy={config.oauthTroubleshootingCopy}
        onConnect={() => void conn.connect()}
      />
    )
  }

  const glow = config.glowFn(feed.data)
  const FeedComponent = config.FeedComponent
  const actions = config.buildActions({
    conn,
    feed,
    domainId,
    boardId,
    agentSlug,
  })

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      <HeroZone
        title={config.label}
        subtitle={config.heroSubtitle(feed.data)}
        glow={glow}
      />

      {conn.integration?.connectedAt && (
        <StatusStrip>Connected {formatConnectedAt(conn.integration.connectedAt)}</StatusStrip>
      )}

      <StatusStrip>{config.statusLine(feed.data)}</StatusStrip>

      <FeedComponent
        feed={feed}
        domainId={domainId}
        boardId={boardId}
        agentSlug={agentSlug}
      />

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

      {conn.error && (
        <p className="text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
          {conn.error}
        </p>
      )}

      <CapabilityChips capabilities={capabilities} />
    </div>
  )
}
