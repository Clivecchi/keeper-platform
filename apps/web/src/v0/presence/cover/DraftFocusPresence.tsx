"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { parseDraftPoints } from "@keeper/shared"
import { KipApi } from "../../../lib/kipApi"
import { useDraftPointAccept } from "../../../hooks/useDraftPointAccept"
import type { PresenceMeta } from "../presenceEnrichment"
import { DraftChronicleBlocks } from "../integrationChronicle/DraftChronicleBlocks"
import { DraftConfigPresence } from "../integrationChronicle/DraftConfigPresence"
import { EntityCoverPresence } from "./EntityCoverPresence"
import {
  draftChronicleTitle,
  resolveDraftCoverContent,
  type DraftCoverRecord,
} from "./schemas/draftCoverSchema"
import { useUniversalBoardOptional } from "../../boards/UniversalBoardContext"
import type { EntityCoverMode } from "./coverTypes"
import { PresentMotionProvider } from "../../presents/usePresentMotion"

export interface DraftFocusPresenceProps {
  objectId: string
  domainId: string
  record: Record<string, unknown>
  meta?: PresenceMeta
  onLabelResolved?: (label: string) => void
  onEngagementSuccess?: () => void
}

function formatUpdatedLabel(value: unknown): string | undefined {
  if (typeof value !== "string" || !value) return undefined
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  } catch {
    return value
  }
}

function toDraftCoverRecord(
  objectId: string,
  record: Record<string, unknown>,
  meta: PresenceMeta | undefined,
  isSessionActive: boolean,
): DraftCoverRecord {
  const spec = record.spec ?? record.spec_json
  return {
    id: String(record.id ?? objectId),
    title: typeof record.title === "string" ? record.title : undefined,
    kind: typeof record.kind === "string" ? record.kind : undefined,
    status: typeof record.status === "string" ? record.status : undefined,
    keeperTitle: meta?.keeper?.title,
    updatedLabel:
      meta?.line?.split("·").pop()?.trim() ||
      formatUpdatedLabel(record.updatedAt ?? record.updated_at),
    points: parseDraftPoints(spec),
    isSessionActive,
  }
}

export function DraftFocusPresence({
  objectId,
  domainId,
  record,
  meta,
  onLabelResolved,
  onEngagementSuccess,
}: DraftFocusPresenceProps) {
  const boardCtx = useUniversalBoardOptional()
  const [coverMode, setCoverMode] = React.useState<EntityCoverMode>("cover")

  const activeSessionId = boardCtx?.selection.activeSessionId ?? null
  const [isSessionActive, setIsSessionActive] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    if (!activeSessionId) {
      setIsSessionActive(false)
      return
    }
    void KipApi.getSessionById(activeSessionId)
      .then((session) => {
        if (cancelled) return
        const activeDraftId =
          session.active_draft_id ?? session.activeDraftId ?? null
        setIsSessionActive(activeDraftId === objectId)
      })
      .catch(() => {
        if (!cancelled) setIsSessionActive(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeSessionId, objectId, boardCtx?.selection.draftPresenceRevision])

  const fieldValues = React.useMemo(
    () => ({
      title: typeof record.title === "string" ? record.title : "",
    }),
    [record.title],
  )

  const draftRecord = React.useMemo(
    () => toDraftCoverRecord(objectId, record, meta, isSessionActive),
    [objectId, record, meta, isSessionActive],
  )

  const {
    acceptedDraftPointIds,
    acceptingDraftPointId,
    acceptDraftPoint,
  } = useDraftPointAccept({
    domainId,
    onDraftSelect: boardCtx?.actions.onDraftSelect,
    bumpDraftPresence: boardCtx?.actions.bumpDraftPresence,
    bumpDraftNav: boardCtx?.actions.bumpDraftNav,
  })

  React.useEffect(() => {
    setCoverMode("cover")
  }, [objectId])

  React.useEffect(() => {
    const label = draftChronicleTitle({
      title: fieldValues.title,
      id: objectId,
    })
    if (label) onLabelResolved?.(label)
  }, [fieldValues.title, objectId, onLabelResolved])

  const handleSetActive = React.useCallback(() => {
    if (!activeSessionId) return
    void KipApi.setActiveDraft(domainId, activeSessionId, objectId).then(() => {
      setIsSessionActive(true)
      onEngagementSuccess?.()
    })
  }, [activeSessionId, domainId, objectId, onEngagementSuccess])

  const coverContent = React.useMemo(
    () =>
      resolveDraftCoverContent(
        draftRecord,
        fieldValues,
        { objectId },
        {
          onConfigure: () => setCoverMode("config"),
          onSetActive: activeSessionId ? handleSetActive : undefined,
        },
      ),
    [draftRecord, fieldValues, objectId, activeSessionId, handleSetActive],
  )

  const spec = record.spec ?? record.spec_json
  const dialogId =
    typeof record.dialog_id === "string"
      ? record.dialog_id
      : typeof record.dialogId === "string"
        ? record.dialogId
        : null

  if (coverMode === "config") {
    return (
      <DraftConfigPresence
        draftId={objectId}
        domainId={domainId}
        title={fieldValues.title}
        kind={typeof record.kind === "string" ? record.kind : null}
        status={typeof record.status === "string" ? record.status : null}
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
    <PresentMotionProvider present="slide" instanceKey={objectId} enabled>
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
              <DraftChronicleBlocks
                draftId={objectId}
                spec={spec}
                summary={typeof record.summary === "string" ? record.summary : null}
                onAcceptPoint={acceptDraftPoint}
                acceptingPointId={acceptingDraftPointId}
                acceptedPointIds={acceptedDraftPointIds}
                dialogId={dialogId}
                onDialogSelect={boardCtx?.actions.onDialogSelect}
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </PresentMotionProvider>
  )
}
