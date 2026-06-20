"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { PresenceMeta, RelatedSection } from "../presenceEnrichment"
import { DialogChronicleBlocks } from "../integrationChronicle/DialogChronicleBlocks"
import { DialogConfigPresence } from "../integrationChronicle/DialogConfigPresence"
import { EntityCoverPresence } from "./EntityCoverPresence"
import {
  resolveDialogCoverContent,
  type DialogCoverRecord,
} from "./schemas/dialogCoverSchema"
import type { EntityCoverMode } from "./coverTypes"

export interface DialogFocusPresenceProps {
  objectId: string
  domainId: string
  record: Record<string, unknown>
  meta?: PresenceMeta
  relatedSections: RelatedSection[]
  onLabelResolved?: (label: string) => void
  onSessionSelect?: (id: string) => void
  onEngagementSuccess?: () => void
}

function formatAudience(availableTo: unknown): string | undefined {
  if (!Array.isArray(availableTo)) return undefined
  if (availableTo.includes("admin")) return "Domain"
  if (availableTo.includes("keeper")) return "Keeper"
  return undefined
}

function toDialogCoverRecord(
  objectId: string,
  record: Record<string, unknown>,
  meta: PresenceMeta | undefined,
): DialogCoverRecord {
  const sessionCount =
    typeof record.sessionCount === "number"
      ? record.sessionCount
      : Array.isArray(record.sessions)
        ? record.sessions.length
        : 0

  const contextSummary =
    typeof record.context === "string"
      ? record.context
      : undefined

  const updatedAt =
    typeof record.updated_at === "string"
      ? record.updated_at
      : typeof record.updatedAt === "string"
        ? record.updatedAt
        : undefined

  let updatedLabel: string | undefined
  if (updatedAt) {
    try {
      updatedLabel = new Date(updatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch {
      updatedLabel = updatedAt
    }
  }

  return {
    id: String(record.id ?? objectId),
    title: typeof record.title === "string" ? record.title : undefined,
    contextSummary,
    sessionCount,
    audienceLabel: formatAudience(record.available_to ?? record.availableTo),
    updatedLabel: meta?.line?.includes("·")
      ? meta.line.split("·").pop()?.trim()
      : updatedLabel,
  }
}

export function DialogFocusPresence({
  objectId,
  domainId,
  record,
  meta,
  relatedSections,
  onLabelResolved,
  onSessionSelect,
  onEngagementSuccess,
}: DialogFocusPresenceProps) {
  const [coverMode, setCoverMode] = React.useState<EntityCoverMode>("cover")

  const fieldValues = React.useMemo(
    () => ({
      title: typeof record.title === "string" ? record.title : "",
    }),
    [record.title],
  )

  const dialogRecord = React.useMemo(
    () => toDialogCoverRecord(objectId, record, meta),
    [objectId, record, meta],
  )

  const contextSummary =
    typeof record.context === "string" ? record.context : ""

  React.useEffect(() => {
    setCoverMode("cover")
  }, [objectId])

  React.useEffect(() => {
    const label = fieldValues.title.trim()
    if (label) onLabelResolved?.(label)
  }, [fieldValues.title, onLabelResolved])

  const coverContent = React.useMemo(
    () =>
      resolveDialogCoverContent(
        dialogRecord,
        fieldValues,
        { objectId },
        {
          onConfigure: () => setCoverMode("config"),
        },
      ),
    [dialogRecord, fieldValues, objectId],
  )

  if (coverMode === "config") {
    return (
      <DialogConfigPresence
        dialogId={objectId}
        domainId={domainId}
        title={fieldValues.title}
        contextSummary={contextSummary}
        onBack={() => {
          setCoverMode("cover")
          onEngagementSuccess?.()
        }}
        onRefresh={onEngagementSuccess}
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
          <div className="px-4 pb-4">
            <DialogChronicleBlocks
              sections={relatedSections}
              onSessionSelect={onSessionSelect}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
