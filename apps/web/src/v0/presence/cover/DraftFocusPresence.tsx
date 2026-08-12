"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { KipApi } from "../../../lib/kipApi"
import { apiFetch } from "../../../lib/api"
import { useDraftPointAccept } from "../../../hooks/useDraftPointAccept"
import { useDraftPointPromote } from "../../../hooks/useDraftPointPromote"
import type { PresenceMeta } from "../presenceEnrichment"
import { Cdraft } from "../integrationChronicle/cdraft"
import { DraftAddToDocumentControl } from "../integrationChronicle/DraftAddToDocumentControl"
import { DraftConfigPresence } from "../integrationChronicle/DraftConfigPresence"
import { draftChronicleTitle } from "./schemas/draftCoverSchema"
import { parseTargetJourneyIdFromSpec } from "../integrationChronicle/draftManuscriptUtils"
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

  const selectedJourneyId = boardCtx?.selection.selectedJourneyId ?? null
  const draftSpec = record.spec ?? record.spec_json
  const targetJourneyIdFromSpec = React.useMemo(
    () => parseTargetJourneyIdFromSpec(draftSpec),
    [draftSpec],
  )
  const resolvedJourneyId = selectedJourneyId ?? targetJourneyIdFromSpec
  const [targetJourneyName, setTargetJourneyName] = React.useState<string | null>(null)
  const [promoteError, setPromoteError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!targetJourneyIdFromSpec) {
      setTargetJourneyName(null)
      return
    }
    let cancelled = false
    void apiFetch(`/api/journeys/${encodeURIComponent(targetJourneyIdFromSpec)}`)
      .then((res: unknown) => {
        if (cancelled) return
        const payload = res as { name?: string; data?: { name?: string; journey?: { name?: string } } }
        const name =
          payload.name?.trim() ||
          payload.data?.name?.trim() ||
          payload.data?.journey?.name?.trim() ||
          null
        setTargetJourneyName(name)
      })
      .catch(() => {
        if (!cancelled) setTargetJourneyName(null)
      })
    return () => {
      cancelled = true
    }
  }, [targetJourneyIdFromSpec])

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

  const {
    promotingDraftPointId,
    promotedDraftPointIds,
    promoteDraftPoint,
  } = useDraftPointPromote({
    domainId,
    journeyId: selectedJourneyId,
    resolveJourneyId: () => targetJourneyIdFromSpec,
    onDraftSelect: boardCtx?.actions.onDraftSelect,
    bumpDraftPresence: boardCtx?.actions.bumpDraftPresence,
    bumpDraftNav: boardCtx?.actions.bumpDraftNav,
    onJourneyRefresh: boardCtx?.actions.bumpJourneyNav,
    setError: setPromoteError,
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

  const draftKind = typeof record.kind === "string" ? record.kind : null

  if (coverMode === "config") {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 px-4 pt-3">
          <DraftAddToDocumentControl
            domainId={domainId}
            draftId={objectId}
            draftKind={draftKind}
            linkedDialogId={dialogId}
            onOpenDocument={boardCtx?.actions.onDialogSelect}
            defaultOpen
          />
        </div>
        <div className="min-h-0 flex-1">
          <DraftConfigPresence
            draftId={objectId}
            domainId={domainId}
            title={fieldValues.title}
            kind={draftKind}
            status={typeof record.status === "string" ? record.status : null}
            onBack={() => {
              setCoverMode("cover")
              onEngagementSuccess?.()
            }}
            onRefresh={onEngagementSuccess}
            onLabelResolved={onLabelResolved}
          />
        </div>
      </div>
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
              onPromotePoint={promoteDraftPoint}
              acceptingPointId={acceptingDraftPointId}
              acceptedPointIds={acceptedDraftPointIds}
              promotingPointId={promotingDraftPointId}
              promotedPointIds={promotedDraftPointIds}
              selectedJourneyId={resolvedJourneyId}
              targetJourneyId={targetJourneyIdFromSpec}
              targetJourneyName={targetJourneyName}
              promoteError={promoteError}
              onJourneySelect={boardCtx?.actions.onJourneySelect}
              onDialogSelect={boardCtx?.actions.onDialogSelect}
              onSessionSelect={boardCtx?.actions.onSessionSelect}
              documentControl={
                <DraftAddToDocumentControl
                  domainId={domainId}
                  draftId={objectId}
                  draftKind={draftKind}
                  linkedDialogId={dialogId}
                  onOpenDocument={boardCtx?.actions.onDialogSelect}
                />
              }
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </PresentMotionProvider>
  )
}
