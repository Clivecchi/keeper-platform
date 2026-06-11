"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { EntityCoverPresence } from "./EntityCoverPresence"
import { resolveIntegrationCoverContent } from "./schemas/integrationCoverSchema"
import type { AIModelFeedData } from "../integrationChronicle/feeds/AIModelFeed"
import {
  DeclarationChronicleBlocks,
  resolveDeclarationActions,
} from "../integrationChronicle/declarationChronicle"
import { IntegrationConfigPresence } from "../integrationChronicle/IntegrationConfigPresence"
import { getServiceConfig, useServiceFeedData } from "../integrationChronicle/serviceConfig"
import {
  FeedShimmer,
  IntegrationUnconnectedState,
  useIntegrationConnection,
  useResolvedCapabilities,
} from "../integrationChronicle/shared"
import type { AgentCoverMode } from "./coverTypes"

const AGENT_SLUG = "cloud"

export interface IntegrationFocusPresenceProps {
  objectId: string
  domainId: string
  record: Record<string, unknown>
  boardId?: string
  onKeySelect?: (keyId: string) => void
  onLabelResolved?: (label: string) => void
}

/**
 * Integration Chronicle — Cover Mode (default) and Config Mode (AI Model).
 * Uses universal EntityCoverPresence slots filled by integrationCoverSchema.
 */
export function IntegrationFocusPresence({
  objectId,
  domainId,
  record: _record,
  boardId = "ide",
  onKeySelect,
  onLabelResolved,
}: IntegrationFocusPresenceProps) {
  const config = getServiceConfig(objectId)
  const conn = useIntegrationConnection(objectId, domainId)
  const capabilities = useResolvedCapabilities(AGENT_SLUG, boardId)
  const connected = conn.status === "connected"
  const [chronicleMode, setChronicleMode] = React.useState<AgentCoverMode>("cover")

  const feedParams = React.useMemo(
    () => ({ domainId, boardId, agentSlug: AGENT_SLUG, connected }),
    [domainId, boardId, connected],
  )

  const feed = useServiceFeedData(objectId, feedParams)

  React.useEffect(() => {
    setChronicleMode("cover")
  }, [objectId])

  const openConfigMode = React.useCallback(() => {
    setChronicleMode("config")
  }, [])

  const chronicleBlocks = conn.integration?.chronicle_blocks ?? []
  const useDeclaration = chronicleBlocks.length > 0
  const displayLabel = useDeclaration
    ? (conn.integration?.display_label ?? config?.label ?? objectId)
    : (config?.label ?? objectId)
  const connectCopy = useDeclaration
    ? (conn.integration?.connect_copy ?? config?.connectCopy)
    : config?.connectCopy

  React.useEffect(() => {
    if (displayLabel) onLabelResolved?.(displayLabel)
  }, [displayLabel, onLabelResolved])

  const actionCtx = React.useMemo(
    () => ({
      conn,
      feed,
      domainId,
      boardId,
      agentSlug: AGENT_SLUG,
      serviceSlug: objectId,
      openConfigMode,
      onKeySelect,
    }),
    [conn, feed, domainId, boardId, objectId, openConfigMode, onKeySelect],
  )

  const resolvedActions = React.useMemo(() => {
    if (!config) return []
    const chronicleActions = conn.integration?.chronicle_actions ?? []
    if (chronicleActions.length > 0) {
      return resolveDeclarationActions(chronicleActions, config, actionCtx)
    }
    return config.buildActions(actionCtx)
  }, [config, conn.integration?.chronicle_actions, actionCtx])

  const coverContent = React.useMemo(() => {
    if (!config) {
      return null
    }
    return resolveIntegrationCoverContent(
      {
        serviceSlug: objectId,
        integration: conn.integration,
        integrationType: conn.integrationType,
        config,
        feedData: feed.data,
        capabilities,
        connected,
        resolvedActions,
        onConfigure: openConfigMode,
        onConnect: () => void conn.connect(),
      },
      { objectId },
    )
  }, [
    config,
    objectId,
    conn.integration,
    conn.integrationType,
    conn.connect,
    feed.data,
    capabilities,
    connected,
    resolvedActions,
    openConfigMode,
  ])

  const testResult =
    feed.data && typeof feed.data === "object" && "testResult" in feed.data
      ? (feed.data as AIModelFeedData).testResult
      : null

  if (!config) {
    return (
      <p className="px-4 py-6 text-[13px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
        Unknown integration: {objectId}
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
        serviceSlug={objectId}
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

  if (chronicleMode === "config" && conn.integrationType === "AI_Model") {
    return (
      <div className="relative flex flex-col h-full min-h-0">
        <IntegrationConfigPresence
          displayLabel={displayLabel}
          integrationType={conn.integrationType}
          description={conn.integration?.description}
          feed={feed}
          onBack={() => setChronicleMode("cover")}
        />
      </div>
    )
  }

  const FeedComponent = config.FeedComponent

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <AnimatePresence mode="wait">
        <motion.div
          key="cover"
          className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {coverContent && (
            <EntityCoverPresence content={coverContent} instanceKey={objectId} />
          )}

          <div className="mt-6 flex flex-col gap-4">
            {useDeclaration && conn.integration ? (
              <DeclarationChronicleBlocks
                blocks={chronicleBlocks}
                serviceSlug={objectId}
                integration={conn.integration}
                integrationType={conn.integrationType}
                config={config}
                feed={feed}
                actions={resolvedActions}
              />
            ) : (
              <FeedComponent
                feed={feed}
                domainId={domainId}
                boardId={boardId}
                agentSlug={AGENT_SLUG}
              />
            )}

            {testResult && (
              <p
                className="text-[12px] whitespace-pre-wrap"
                style={{ color: "hsl(var(--theme-ink-secondary))" }}
              >
                {testResult}
              </p>
            )}

            {conn.error && (
              <p className="text-[12px]" style={{ color: "hsl(var(--theme-status-error))" }}>
                {conn.error}
              </p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
