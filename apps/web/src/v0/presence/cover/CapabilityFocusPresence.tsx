"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { EntityCoverPresence } from "./EntityCoverPresence"
import { DeclarationChronicleBlocks } from "../integrationChronicle/declarationChronicle"
import { CapabilityConfigPresence } from "../integrationChronicle/CapabilityConfigPresence"
import { resolveCapabilityChronicleBlocks } from "../integrationChronicle/resolveChronicleDeclaration"
import { useCapabilityFeedData } from "../integrationChronicle/feeds/CapabilityFeed"
import { FeedError, FeedShimmer } from "../integrationChronicle/shared"
import {
  resolveCapabilityCoverContent,
  type CapabilityRecord,
} from "./schemas/capabilityCoverSchema"
import type { CapabilityKind } from "../integrationChronicle/capabilityNavUtils"
import type { AgentCoverMode } from "./coverTypes"

export interface CapabilityFocusPresenceProps {
  objectId: string
  domainId: string
  record: Record<string, unknown>
  onLabelResolved?: (label: string) => void
}

function toCapabilityRecord(objectId: string, src: Record<string, unknown>): CapabilityRecord {
  return {
    id: String(src.id ?? objectId),
    slug: String(src.slug ?? ""),
    kind: String(src.kind ?? "tool") as CapabilityKind,
    display_label: src.display_label != null ? String(src.display_label) : null,
    description: src.description != null ? String(src.description) : null,
  }
}

export function CapabilityFocusPresence({
  objectId,
  domainId,
  record,
  onLabelResolved,
}: CapabilityFocusPresenceProps) {
  const { data: feed, loading, error, reload } = useCapabilityFeedData(objectId)
  const [coverMode, setCoverMode] = React.useState<AgentCoverMode>("cover")

  React.useEffect(() => {
    setCoverMode("cover")
  }, [objectId])

  React.useEffect(() => {
    const label = feed?.capability.display_label?.trim()
    if (label) onLabelResolved?.(label)
  }, [feed?.capability.display_label, onLabelResolved])

  const capabilityRecord = React.useMemo(
    () => toCapabilityRecord(objectId, feed?.capability ?? record),
    [feed?.capability, record, objectId],
  )

  const coverContent = React.useMemo(
    () =>
      resolveCapabilityCoverContent(
        capabilityRecord,
        { objectId },
        {
          onConfigure: () => setCoverMode("config"),
        },
      ),
    [capabilityRecord, objectId],
  )

  const chronicleBlocks = React.useMemo(
    () =>
      resolveCapabilityChronicleBlocks(
        capabilityRecord.kind,
        feed?.capability.chronicle_blocks,
      ),
    [capabilityRecord.kind, feed?.capability.chronicle_blocks],
  )

  if (loading && !feed && !record.slug) {
    return (
      <div className="px-4 py-5">
        <FeedShimmer rows={4} />
      </div>
    )
  }

  if (error && !feed && !record.slug) {
    return <FeedError message={error} onRetry={() => void reload()} />
  }

  if (coverMode === "config") {
    if (!feed) {
      return (
        <div className="px-4 py-5">
          <FeedShimmer rows={3} />
        </div>
      )
    }
    return (
      <CapabilityConfigPresence
        capabilityId={objectId}
        domainId={domainId}
        displayLabel={feed.capability.display_label ?? capabilityRecord.slug}
        description={feed.capability.description}
        capability={feed.capability}
        onBack={() => setCoverMode("cover")}
        onRefresh={() => void reload()}
        onLabelResolved={onLabelResolved}
      />
    )
  }

  return (
    <div className="relative flex flex-col h-full min-h-0">
      <AnimatePresence mode="wait">
        <motion.div
          key="cover"
          className="keeper-panel-scroll flex-1 min-h-0 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="px-4 pt-4 pb-2">
            <EntityCoverPresence content={coverContent} instanceKey={objectId} />
          </div>
          {feed && chronicleBlocks.length > 0 && (
            <div className="px-4 pb-4">
              <DeclarationChronicleBlocks
                variant="capability"
                blocks={chronicleBlocks}
                capabilityFeed={feed}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
