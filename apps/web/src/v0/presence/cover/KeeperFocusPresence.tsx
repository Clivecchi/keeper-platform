"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { EntityCoverPresence } from "./EntityCoverPresence"
import { DeclarationChronicleBlocks } from "../integrationChronicle/declarationChronicle"
import { KeeperConfigPresence } from "../integrationChronicle/KeeperConfigPresence"
import { resolveKeeperChronicleBlocks } from "../integrationChronicle/resolveChronicleDeclaration"
import {
  recordToKeeperDto,
  useKeeperFeedData,
  type KeeperFeedData,
} from "../integrationChronicle/feeds/KeeperFeed"
import { FeedError, FeedShimmer } from "../integrationChronicle/shared"
import { resolveKeeperCoverContent, type KeeperRecord } from "./schemas/keeperCoverSchema"
import { avatarFromRecord } from "./coverImageUtils"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"
import type { AgentCoverMode } from "./coverTypes"

export interface KeeperFocusPresenceProps {
  objectId: string
  domainId: string
  record: Record<string, unknown>
  onLabelResolved?: (label: string) => void
}

function toKeeperRecord(objectId: string, src: Record<string, unknown>): KeeperRecord {
  const { avatar } = avatarFromRecord(src)
  return {
    id: String(src.id ?? objectId),
    title: src.title != null ? String(src.title) : undefined,
    display_label: src.display_label != null ? String(src.display_label) : null,
    description: src.description != null ? String(src.description) : null,
    keeperType: src.keeperType != null ? String(src.keeperType) : null,
    memoryPattern: src.memoryPattern != null ? String(src.memoryPattern) : null,
    avatar,
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
  const { data: feed, loading, error, reload } = useKeeperFeedData(objectId, domainId)
  const [coverMode, setCoverMode] = React.useState<AgentCoverMode>("cover")

  const fallbackKeeper = React.useMemo(
    () => recordToKeeperDto(objectId, record),
    [objectId, record],
  )

  const effectiveFeed = React.useMemo((): KeeperFeedData | null => {
    if (feed) return feed
    if (!fallbackKeeper.title && !fallbackKeeper.display_label) return null
    return { keeper: fallbackKeeper, reload }
  }, [feed, fallbackKeeper, reload])

  React.useEffect(() => {
    setCoverMode("cover")
  }, [objectId])

  React.useEffect(() => {
    const label = feed?.keeper.display_label?.trim()
    if (label) onLabelResolved?.(label)
  }, [feed?.keeper.display_label, onLabelResolved])

  const keeperRecord = React.useMemo(
    () => toKeeperRecord(objectId, effectiveFeed?.keeper ?? record),
    [effectiveFeed?.keeper, record, objectId],
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
    () => resolveKeeperChronicleBlocks(effectiveFeed?.keeper.chronicle_blocks),
    [effectiveFeed?.keeper.chronicle_blocks],
  )

  const onJourneySelect = boardCtx?.actions.onJourneySelect

  if (loading && !effectiveFeed && !record.title) {
    return (
      <div className="px-4 py-5">
        <FeedShimmer rows={4} />
      </div>
    )
  }

  if (error && !effectiveFeed && !record.title) {
    return <FeedError message={error} onRetry={() => void reload()} />
  }

  if (coverMode === "config") {
    if (loading && !effectiveFeed) {
      return (
        <div className="px-4 py-5">
          <FeedShimmer rows={3} />
        </div>
      )
    }
    if (!effectiveFeed) {
      return <FeedError message={error ?? "Keeper not found"} onRetry={() => void reload()} />
    }
    return (
      <KeeperConfigPresence
        keeperId={objectId}
        domainId={domainId}
        displayLabel={
          effectiveFeed.keeper.display_label?.trim() ??
          keeperRecord.display_label ??
          effectiveFeed.keeper.title
        }
        description={effectiveFeed.keeper.description ?? effectiveFeed.keeper.purpose}
        keeper={effectiveFeed.keeper}
        record={{
          ...record,
          presenceSchema: effectiveFeed.keeper.presenceSchema ?? record.presenceSchema,
        }}
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
          {effectiveFeed && chronicleBlocks.length > 0 && (
            <div className="px-4 pb-4">
              <DeclarationChronicleBlocks
                variant="keeper"
                blocks={chronicleBlocks}
                keeperFeed={effectiveFeed}
                onJourneySelect={onJourneySelect}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
