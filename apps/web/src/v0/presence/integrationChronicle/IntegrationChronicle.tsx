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
import { DeclarationConnectedChronicle } from "./declarationChronicle"
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

  const chronicleBlocks = conn.integration?.chronicle_blocks ?? []
  const useDeclaration = chronicleBlocks.length > 0
  const displayLabel = useDeclaration
    ? (conn.integration?.display_label ?? config.label)
    : config.label
  const connectCopy = useDeclaration
    ? (conn.integration?.connect_copy ?? config.connectCopy)
    : config.connectCopy

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
        displayLabel={displayLabel}
        integrationType={conn.integrationType}
        busy={conn.busy}
        error={conn.error}
        authConnectUrl={conn.authConnectUrl}
        oauthTroubleshootingCopy={config.oauthTroubleshootingCopy}
        connectCopy={connectCopy}
        onConnect={() => void conn.connect()}
      />
    )
  }

  if (useDeclaration && conn.integration) {
    return (
      <DeclarationConnectedChronicle
        integration={conn.integration}
        integrationType={conn.integrationType}
        config={config}
        feed={feed}
        conn={conn}
        domainId={domainId}
        boardId={boardId}
        agentSlug={agentSlug}
        capabilities={capabilities}
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
