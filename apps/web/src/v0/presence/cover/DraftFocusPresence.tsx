"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { KipApi } from "../../../lib/kipApi"
import { useDraftPointAccept } from "../../../hooks/useDraftPointAccept"
import type { PresenceMeta } from "../presenceEnrichment"
import { Cdraft } from "../integrationChronicle/cdraft"
import { DraftConfigPresence } from "../integrationChronicle/DraftConfigPresence"
import { draftChronicleTitle } from "./schemas/draftCoverSchema"
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

  const dialogId =
    typeof record.dialog_id === "string"
      ? record.dialog_id
      : typeof record.dialogId === "string"
        ? record.dialogId
        : null

  const handleDiscussPoint = React.useCallback(
    (discussDraftId: string, pointId: string) => {
      boardCtx?.actions.requestDiscussDraftPoint(
        { entityKind: "draft", entityId: discussDraftId, nodeId: pointId },
        { dialogId },
      )
    },
    [boardCtx, dialogId],
  )

  const handleRewritePoint = React.useCallback(
    (rewriteDraftId: string, pointId: string, preview: string) => {
      boardCtx?.actions.requestRewriteDraftPoint(
        { entityKind: "draft", entityId: rewriteDraftId, nodeId: pointId },
        { dialogId, pointPreview: preview },
      )
    },
    [boardCtx, dialogId],
  )

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
            <Cdraft
              draftId={objectId}
              domainId={domainId}
              record={record}
              meta={meta}
              isSessionActive={isSessionActive}
              presenceRefreshKey={boardCtx?.selection.draftPresenceRevision ?? 0}
              dialogId={dialogId}
              onManage={() => setCoverMode("config")}
              onAcceptPoint={acceptDraftPoint}
              onDiscussPoint={handleDiscussPoint}
              onRewritePoint={handleRewritePoint}
              acceptingPointId={acceptingDraftPointId}
              acceptedPointIds={acceptedDraftPointIds}
              onDialogSelect={boardCtx?.actions.onDialogSelect}
              onSessionSelect={boardCtx?.actions.onSessionSelect}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </PresentMotionProvider>
  )
}
