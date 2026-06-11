"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { EntityCoverPresence } from "./EntityCoverPresence"
import { KeyConfigPresence } from "../integrationChronicle/KeyConfigPresence"
import { useKeyFeedData } from "../integrationChronicle/feeds/KeyFeed"
import { FeedError, FeedShimmer } from "../integrationChronicle/shared"
import { resolveKeyCoverContent, type KeyRecord } from "./schemas/keyCoverSchema"
import type { AgentCoverMode } from "./coverTypes"

export interface KeyFocusPresenceProps {
  objectId: string
  domainId: string
  record: Record<string, unknown>
  onLabelResolved?: (label: string) => void
}

function toKeyRecord(
  objectId: string,
  src: Record<string, unknown>,
  integrationCapabilities?: string[],
): KeyRecord {
  return {
    id: String(src.id ?? objectId),
    provider: String(src.provider ?? ""),
    key_source: String(src.key_source ?? "env"),
    status: String(src.status ?? "unknown"),
    scope: src.scope != null ? String(src.scope) : null,
    last_verified: src.last_verified != null ? String(src.last_verified) : null,
    expires_at: src.expires_at != null ? String(src.expires_at) : null,
    display_label: src.display_label != null ? String(src.display_label) : null,
    description: src.description != null ? String(src.description) : null,
    chronicle_actions: Array.isArray(src.chronicle_actions)
      ? (src.chronicle_actions as string[])
      : undefined,
    integration_capabilities: integrationCapabilities,
  }
}

/**
 * Key Chronicle — Cover Mode (default) and Config Mode.
 * Uses universal EntityCoverPresence slots filled by keyCoverSchema.
 */
export function KeyFocusPresence({
  objectId,
  domainId,
  record,
  onLabelResolved,
}: KeyFocusPresenceProps) {
  const { data: feed, loading, error, reload } = useKeyFeedData(objectId, domainId)
  const [coverMode, setCoverMode] = React.useState<AgentCoverMode>("cover")

  React.useEffect(() => {
    setCoverMode("cover")
  }, [objectId])

  React.useEffect(() => {
    const label = feed?.key.display_label?.trim()
    if (label) onLabelResolved?.(label)
  }, [feed?.key.display_label, onLabelResolved])

  const keyRecord = React.useMemo(
    () => toKeyRecord(objectId, feed?.key ?? record, feed?.integrationCapabilities),
    [feed?.key, feed?.integrationCapabilities, record, objectId],
  )

  const coverContent = React.useMemo(
    () =>
      resolveKeyCoverContent(
        keyRecord,
        {},
        { objectId },
        {
          onConfigure: () => setCoverMode("config"),
          onOpenSession: () => {
            if (feed) void feed.verify()
          },
        },
      ),
    [keyRecord, feed, objectId],
  )

  if (loading && !feed && !record.provider) {
    return (
      <div className="px-4 py-5">
        <FeedShimmer rows={4} />
      </div>
    )
  }

  if (error && !feed && !record.provider) {
    return <FeedError message={error} onRetry={() => void reload()} />
  }

  if (coverMode === "config" && feed) {
    const displayLabel =
      feed.key.display_label?.trim() ??
      keyRecord.display_label ??
      `${keyRecord.provider} Key`

    return (
      <KeyConfigPresence
        displayLabel={displayLabel}
        description={feed.key.description}
        feed={feed}
        onBack={() => setCoverMode("cover")}
      />
    )
  }

  const linkedAgents = feed?.linkedAgents ?? []

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
          <EntityCoverPresence content={coverContent} instanceKey={objectId} />

          {linkedAgents.length > 0 && (
            <div className="mt-6">
              <p
                className="text-[11px] font-semibold uppercase tracking-widest mb-2"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                Linked agents
              </p>
              {linkedAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="rounded-lg border px-3 py-2 mb-2"
                  style={{
                    borderColor: "hsl(var(--theme-border-soft) / 0.4)",
                    background: "hsl(var(--theme-surface-elevated) / 0.25)",
                  }}
                >
                  <p
                    className="text-[13px] font-medium"
                    style={{ color: "hsl(var(--theme-ink-primary))" }}
                  >
                    {agent.name}
                  </p>
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ color: "hsl(var(--theme-ink-tertiary))" }}
                  >
                    {agent.model}
                  </p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
