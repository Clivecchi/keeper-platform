"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useAuth } from "../../../context/AuthContext"
import type { PresenceBreadcrumb, PresenceMeta, RelatedSection } from "../presenceEnrichment"
import { PathChronicleBlocks } from "../integrationChronicle/PathChronicleBlocks"
import { PathConfigPresence } from "../integrationChronicle/PathConfigPresence"
import { EntityCoverPresence } from "./EntityCoverPresence"
import {
  resolvePathCoverContent,
  type PathCoverRecord,
} from "./schemas/pathCoverSchema"
import type { EntityCoverMode } from "./coverTypes"
import { coverFromRecord } from "./coverImageUtils"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"

export interface PathFocusPresenceProps {
  objectId: string
  domainId: string
  record: Record<string, unknown>
  meta?: PresenceMeta
  breadcrumb?: PresenceBreadcrumb
  relatedSections: RelatedSection[]
  onLabelResolved?: (label: string) => void
  onMomentSelect?: (id: string) => void
  onEngagementSuccess?: () => void
}

function resolveJourneyId(record: Record<string, unknown>): string | undefined {
  if (typeof record.journeyId === "string") return record.journeyId
  const journey = record.Journey as { id?: string } | undefined
  return typeof journey?.id === "string" ? journey.id : undefined
}

function resolveKeeperId(
  record: Record<string, unknown>,
  meta: PresenceMeta | undefined,
  boardKeeperId: string | null | undefined,
): string | undefined {
  return (
    boardKeeperId ??
    meta?.keeper?.id ??
    (typeof record.keeperId === "string" ? record.keeperId : undefined) ??
    ((record.Keeper as { id?: string } | undefined)?.id)
  )
}

function toPathCoverRecord(
  objectId: string,
  record: Record<string, unknown>,
  meta: PresenceMeta | undefined,
): PathCoverRecord {
  const moments = Array.isArray(record.Moment)
    ? record.Moment
    : Array.isArray(record.moment)
      ? record.moment
      : []
  const momentCount =
    meta?.momentCount ??
    (typeof record.momentCount === "number" ? record.momentCount : moments.length)

  return {
    id: String(record.id ?? objectId),
    name: typeof record.name === "string" ? record.name : undefined,
    prelude: typeof record.prelude === "string" ? record.prelude : undefined,
    journeyName:
      typeof record.journeyName === "string"
        ? record.journeyName
        : ((record.Journey as { name?: string } | undefined)?.name ?? undefined),
    keeperTitle:
      typeof record.keeperTitle === "string"
        ? record.keeperTitle
        : ((record.Keeper as { title?: string } | undefined)?.title ?? undefined),
    momentCount,
    coverImage: coverFromRecord(record).coverImage,
  }
}

export function PathFocusPresence({
  objectId,
  domainId,
  record,
  meta,
  breadcrumb,
  relatedSections,
  onLabelResolved,
  onMomentSelect,
  onEngagementSuccess,
}: PathFocusPresenceProps) {
  const boardCtx = useUniversalBoardOptional()
  const { isAuthenticated } = useAuth()
  const [coverMode, setCoverMode] = React.useState<EntityCoverMode>("cover")

  const journeyId = resolveJourneyId(record)
  const keeperId = resolveKeeperId(
    record,
    meta,
    boardCtx?.selection.selectedKeeperId,
  )

  const fieldValues = React.useMemo(
    () => ({
      name: typeof record.name === "string" ? record.name : "",
      prelude: typeof record.prelude === "string" ? record.prelude : "",
    }),
    [record.name, record.prelude],
  )

  const pathRecord = React.useMemo(
    () => toPathCoverRecord(objectId, record, meta),
    [objectId, record, meta],
  )

  React.useEffect(() => {
    setCoverMode("cover")
  }, [objectId])

  React.useEffect(() => {
    const label = fieldValues.name.trim()
    if (label) onLabelResolved?.(label)
  }, [fieldValues.name, onLabelResolved])

  const openEngagementAct = React.useCallback(
    (slug: string) => {
      if (!isAuthenticated || !boardCtx || !journeyId) return
      void boardCtx.actions.requestChronicleEngagement(slug, {
        entityType: "journey",
        entityId: journeyId,
        domainId,
        journeyId,
        pathId: objectId,
        keeperId,
      })
    },
    [boardCtx, domainId, isAuthenticated, journeyId, keeperId, objectId],
  )

  const coverContent = React.useMemo(
    () =>
      resolvePathCoverContent(
        pathRecord,
        fieldValues,
        { objectId },
        {
          onConfigure: () => setCoverMode("config"),
          onEngagementAct: isAuthenticated && journeyId ? openEngagementAct : undefined,
        },
      ),
    [pathRecord, fieldValues, objectId, isAuthenticated, journeyId, openEngagementAct],
  )

  if (coverMode === "config") {
    return (
      <PathConfigPresence
        pathId={objectId}
        domainId={domainId}
        name={fieldValues.name}
        prelude={fieldValues.prelude}
        record={record}
        onBack={() => {
          setCoverMode("cover")
          onEngagementSuccess?.()
        }}
        onRefresh={onEngagementSuccess}
        onLabelResolved={onLabelResolved}
        onDeleted={() => boardCtx?.actions.clearSelection()}
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
          <div className="px-4 pb-4">
            <PathChronicleBlocks
              prelude={fieldValues.prelude}
              breadcrumb={breadcrumb}
              sections={relatedSections}
              onMomentSelect={onMomentSelect}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
