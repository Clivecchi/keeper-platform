"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { EntityCoverPresence } from "./EntityCoverPresence"
import { DeclarationChronicleBlocks } from "../integrationChronicle/declarationChronicle"
import { KeeperConfigPresence } from "../integrationChronicle/KeeperConfigPresence"
import { resolveKeeperChronicleBlocks } from "../integrationChronicle/resolveChronicleDeclaration"
import { useKeeperFeedData } from "../integrationChronicle/feeds/KeeperFeed"
import { FeedError, FeedShimmer } from "../integrationChronicle/shared"
import { resolveKeeperCoverContent, type KeeperRecord } from "./schemas/keeperCoverSchema"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"
import type { AgentCoverMode } from "./coverTypes"

export interface KeeperFocusPresenceProps {
  objectId: string
  domainId: string
  record: Record<string, unknown>
  onLabelResolved?: (label: string) => void
}

function toKeeperRecord(objectId: string, src: Record<string, unknown>): KeeperRecord {
  return {
    id: String(src.id ?? objectId),
    title: src.title != null ? String(src.title) : undefined,
    display_label: src.display_label != null ? String(src.display_label) : null,
    description: src.description != null ? String(src.description) : null,
    keeperType: src.keeperType != null ? String(src.keeperType) : null,
    memoryPattern: src.memoryPattern != null ? String(src.memoryPattern) : null,
    stats:
      src.stats && typeof src.stats === "object" && !Array.isArray(src.stats)
        ? (src.stats as KeeperRecord["stats"])
        : undefined,
  }
}

export function KeeperFocusPresence({
  objectId,
  domainId,
  record,
  onLabelResolved,
}: KeeperFocusPresenceProps) {
  const boardCtx = useUniversalBoardOptional()
  const { data: feed, loading, error, reload } = useKeeperFeedData(objectId)
  const [coverMode, setCoverMode] = React.useState<AgentCoverMode>("cover")

  React.useEffect(() => {
    setCoverMode("cover")
  }, [objectId])

  React.useEffect(() => {
    const label = feed?.keeper.display_label?.trim()
    if (label) onLabelResolved?.(label)
  }, [feed?.keeper.display_label, onLabelResolved])

  const keeperRecord = React.useMemo(
    () => toKeeperRecord(objectId, feed?.keeper ?? record),
    [feed?.keeper, record, objectId],
  )

  const coverContent = React.useMemo(
    () =>
      resolveKeeperCoverContent(
        keeperRecord,
        { objectId },
        {
          onConfigure: () => setCoverMode("config"),
        },
      ),
    [keeperRecord, objectId],
  )

  const chronicleBlocks = React.useMemo(
    () => resolveKeeperChronicleBlocks(feed?.keeper.chronicle_blocks),
    [feed?.keeper.chronicle_blocks],
  )

  const onJourneySelect = boardCtx?.actions.onJourneySelect

  if (loading && !feed && !record.title) {
    return (
      <div className="px-4 py-5">
        <FeedShimmer rows={4} />
      </div>
    )
  }

  if (error && !feed && !record.title) {
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
      <KeeperConfigPresence
        keeperId={objectId}
        domainId={domainId}
        displayLabel={
          feed.keeper.display_label?.trim() ??
          keeperRecord.display_label ??
          feed.keeper.title
        }
        description={feed.keeper.description ?? feed.keeper.purpose}
        keeper={feed.keeper}
        onBack={() => {
          setCoverMode("cover")
          void reload()
        }}
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
                variant="keeper"
                blocks={chronicleBlocks}
                keeperFeed={feed}
                onJourneySelect={onJourneySelect}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
