"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { PresenceBreadcrumb, PresenceMeta } from "../presenceEnrichment"
import { MomentChronicleBlocks } from "../integrationChronicle/MomentChronicleBlocks"
import { MomentConfigPresence } from "../integrationChronicle/MomentConfigPresence"
import { EntityCoverPresence } from "./EntityCoverPresence"
import {
  resolveMomentCoverContent,
  type MomentCoverRecord,
} from "./schemas/momentCoverSchema"
import type { EntityCoverMode } from "./coverTypes"
import { coverFromRecord } from "./coverImageUtils"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"

export interface MomentFocusPresenceProps {
  objectId: string
  domainId: string
  record: Record<string, unknown>
  meta?: PresenceMeta
  breadcrumb?: PresenceBreadcrumb
  onLabelResolved?: (label: string) => void
  onEngagementSuccess?: () => void
}

function toMomentCoverRecord(
  objectId: string,
  record: Record<string, unknown>,
  meta: PresenceMeta | undefined,
): MomentCoverRecord {
  const keptAt =
    typeof record.keptAt === "string"
      ? record.keptAt
      : typeof record.kept_at === "string"
        ? record.kept_at
        : null

  const updatedAt =
    typeof record.updatedAt === "string"
      ? record.updatedAt
      : typeof record.updated_at === "string"
        ? record.updated_at
        : undefined

  const createdAt =
    typeof record.createdAt === "string"
      ? record.createdAt
      : typeof record.created_at === "string"
        ? record.created_at
        : undefined

  return {
    id: String(record.id ?? objectId),
    title: typeof record.title === "string" ? record.title : undefined,
    narrative:
      typeof record.narrative === "string"
        ? record.narrative
        : typeof record.body === "string"
          ? record.body
          : undefined,
    journeyName:
      typeof record.journeyName === "string"
        ? record.journeyName
        : ((record.Journey as { name?: string } | undefined)?.name ?? undefined),
    pathName:
      typeof record.pathName === "string"
        ? record.pathName
        : ((record.Path as { name?: string } | undefined)?.name ?? undefined),
    keptAt,
    updatedAt,
    createdAt,
    keptLabel: meta?.line,
    coverImage: coverFromRecord(record).coverImage,
  }
}

export function MomentFocusPresence({
  objectId,
  domainId,
  record,
  meta,
  breadcrumb,
  onLabelResolved,
  onEngagementSuccess,
}: MomentFocusPresenceProps) {
  const boardCtx = useUniversalBoardOptional()
  const [coverMode, setCoverMode] = React.useState<EntityCoverMode>("cover")

  const fieldValues = React.useMemo(
    () => ({
      title: typeof record.title === "string" ? record.title : "",
      narrative:
        typeof record.narrative === "string"
          ? record.narrative
          : typeof record.body === "string"
            ? record.body
            : "",
    }),
    [record.title, record.narrative, record.body],
  )

  const momentRecord = React.useMemo(
    () => toMomentCoverRecord(objectId, record, meta),
    [objectId, record, meta],
  )

  React.useEffect(() => {
    setCoverMode("cover")
  }, [objectId])

  React.useEffect(() => {
    const label = fieldValues.title.trim()
    if (label) onLabelResolved?.(label)
  }, [fieldValues.title, onLabelResolved])

  const coverContent = React.useMemo(
    () =>
      resolveMomentCoverContent(
        momentRecord,
        fieldValues,
        { objectId },
        {
          onConfigure: () => setCoverMode("config"),
        },
      ),
    [momentRecord, fieldValues, objectId],
  )

  if (coverMode === "config") {
    return (
      <MomentConfigPresence
        momentId={objectId}
        domainId={domainId}
        title={fieldValues.title}
        narrative={fieldValues.narrative}
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
            <MomentChronicleBlocks
              narrative={fieldValues.narrative}
              breadcrumb={breadcrumb}
              metaLine={breadcrumb ? undefined : meta?.line}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
