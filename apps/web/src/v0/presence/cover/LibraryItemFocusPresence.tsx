"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { EntityCoverPresence } from "./EntityCoverPresence"
import { DeclarationChronicleBlocks } from "../integrationChronicle/declarationChronicle"
import { LibraryItemConfigPresence } from "../integrationChronicle/LibraryItemConfigPresence"
import { resolveLibraryChronicleBlocks } from "../integrationChronicle/resolveChronicleDeclaration"
import { useLibraryItemFeedData } from "../integrationChronicle/feeds/LibraryItemFeed"
import { libraryItemChronicleTitle } from "../integrationChronicle/libraryNavUtils"
import { FeedError, FeedShimmer } from "../integrationChronicle/shared"
import {
  resolveLibraryItemCoverContent,
  type LibraryItemRecord,
} from "./schemas/libraryItemCoverSchema"
import type { AgentCoverMode } from "./coverTypes"

export interface LibraryItemFocusPresenceProps {
  objectId: string
  domainId: string
  record: Record<string, unknown>
  onLabelResolved?: (label: string) => void
}

function toLibraryItemRecord(objectId: string, src: Record<string, unknown>): LibraryItemRecord {
  return {
    id: String(src.id ?? objectId),
    source_type: String(src.source_type ?? "upload"),
    source_ref: String(src.source_ref ?? ""),
    display_label: src.display_label != null ? String(src.display_label) : null,
    description: src.description != null ? String(src.description) : null,
    assigned_keeper_name:
      src.assigned_keeper_name != null ? String(src.assigned_keeper_name) : null,
    assigned_agent_name:
      src.assigned_agent_name != null ? String(src.assigned_agent_name) : null,
  }
}

export function LibraryItemFocusPresence({
  objectId,
  domainId,
  record,
  onLabelResolved,
}: LibraryItemFocusPresenceProps) {
  const { data: feed, loading, error, reload } = useLibraryItemFeedData(objectId)
  const [coverMode, setCoverMode] = React.useState<AgentCoverMode>("cover")

  React.useEffect(() => {
    setCoverMode("cover")
  }, [objectId])

  React.useEffect(() => {
    if (!feed?.item) return
    onLabelResolved?.(libraryItemChronicleTitle(feed.item))
  }, [feed?.item, onLabelResolved])

  const handleConfigure = React.useCallback(() => {
    setCoverMode("config")
  }, [])

  const itemRecord = React.useMemo(
    () => toLibraryItemRecord(objectId, feed?.item ?? record),
    [feed?.item, record, objectId],
  )

  const coverContent = React.useMemo(
    () =>
      resolveLibraryItemCoverContent(
        itemRecord,
        {},
        { objectId },
        { onConfigure: handleConfigure },
      ),
    [itemRecord, objectId, handleConfigure],
  )

  const chronicleBlocks = React.useMemo(
    () => resolveLibraryChronicleBlocks(feed?.item.chronicle_blocks),
    [feed?.item.chronicle_blocks],
  )

  if (loading && !feed && !record.source_type) {
    return (
      <div className="px-4 py-5">
        <FeedShimmer rows={4} />
      </div>
    )
  }

  if (error && !feed && !record.source_type) {
    return <FeedError message={error} onRetry={() => void reload()} />
  }

  if (coverMode === "config") {
    if (!feed) {
      return (
        <div className="relative flex flex-col h-full min-h-0 px-4 py-5">
          <FeedShimmer rows={4} />
        </div>
      )
    }

    return (
      <div className="relative flex flex-col h-full min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key="config"
            className="flex flex-col h-full min-h-0"
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 12 }}
            transition={{ duration: 0.22 }}
          >
            <LibraryItemConfigPresence
              libraryItemId={feed.item.id}
              domainId={domainId}
              item={feed.item}
              onBack={() => {
                setCoverMode("cover")
                void reload()
              }}
              onRefresh={() => void reload()}
              onLabelResolved={onLabelResolved}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    )
  }

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

          {feed && chronicleBlocks.length > 0 && (
            <div className="mt-6 flex flex-col gap-4">
              <DeclarationChronicleBlocks
                variant="library"
                blocks={chronicleBlocks}
                libraryFeed={feed}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
