"use client"

import * as React from "react"
import { parseDraftPoints } from "@keeper/shared"
import { draftChronicleTitle } from "../cover/schemas/draftCoverSchema"
import { DraftChronicleBlocks } from "./DraftChronicleBlocks"
import {
  formatDraftKindLabel,
  parseDraftPathEmergence,
} from "./draftManuscriptUtils"

export interface CdraftProps {
  draftId: string
  domainId: string
  record: Record<string, unknown>
  meta?: { line?: string; keeper?: { title: string } }
  isSessionActive: boolean
  presenceRefreshKey?: number
  dialogId?: string | null
  onManage: () => void
  onAcceptPoint?: (draftId: string, pointId: string) => void
  onDiscussPoint?: (draftId: string, pointId: string) => void
  onRewritePoint?: (draftId: string, pointId: string, preview: string) => void
  onPromotePoint?: (draftId: string, pointId: string) => void
  acceptingPointId?: string | null
  acceptedPointIds?: Set<string>
  promotingPointId?: string | null
  promotedPointIds?: Set<string>
  selectedJourneyId?: string | null
  targetJourneyId?: string | null
  targetJourneyName?: string | null
  promoteError?: string | null
  onJourneySelect?: (journeyId: string) => void
  onDialogSelect?: (dialogId: string) => void
  onSessionSelect?: (sessionId: string) => void
  /** Quiet Document promote control — rendered under meta, not above the title. */
  documentControl?: React.ReactNode
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

function formatStatusLabel(status: string | undefined): string {
  const raw = status?.trim() || "draft"
  return raw.replace(/_/g, " ")
}

export function Cdraft({
  draftId,
  domainId,
  record,
  meta,
  isSessionActive,
  presenceRefreshKey = 0,
  dialogId = null,
  onManage,
  onAcceptPoint,
  onDiscussPoint,
  onRewritePoint,
  onPromotePoint,
  acceptingPointId,
  acceptedPointIds,
  promotingPointId,
  promotedPointIds,
  selectedJourneyId,
  targetJourneyId = null,
  targetJourneyName = null,
  promoteError = null,
  onJourneySelect,
  onDialogSelect,
  onSessionSelect,
  documentControl,
}: CdraftProps) {
  const title =
    typeof record.title === "string" && record.title.trim()
      ? record.title.trim()
      : draftChronicleTitle({ title: record.title as string, id: draftId })

  const kind = typeof record.kind === "string" ? record.kind : undefined
  const kindLabel = formatDraftKindLabel(kind)
  const status = typeof record.status === "string" ? record.status : "draft"
  const summary = typeof record.summary === "string" ? record.summary : null
  const spec = record.spec ?? record.spec_json

  const points = React.useMemo(() => parseDraftPoints(spec), [spec])
  const anchorCount = points.filter((p) => p.status === "accepted").length
  const queueCount = points.length - anchorCount
  const pathEmergence = React.useMemo(() => parseDraftPathEmergence(spec), [spec])

  const linkedJourneyId = targetJourneyId ?? selectedJourneyId ?? null
  const linkedJourneyLabel =
    targetJourneyName?.trim() ||
    (typeof record.journeyName === "string" ? record.journeyName.trim() : undefined) ||
    (typeof record.journey_name === "string" ? record.journey_name.trim() : undefined) ||
    (linkedJourneyId ? "Linked journey" : undefined)

  const breadcrumbParts: React.ReactNode[] = []
  if (linkedJourneyId && linkedJourneyLabel) {
    if (onJourneySelect) {
      breadcrumbParts.push(
        <button
          key="journey"
          type="button"
          className="cdraft-breadcrumb-link"
          onClick={() => onJourneySelect(linkedJourneyId)}
        >
          {linkedJourneyLabel}
        </button>,
      )
    } else {
      breadcrumbParts.push(<span key="journey">{linkedJourneyLabel}</span>)
    }
  }
  if (kindLabel) {
    breadcrumbParts.push(<span key="kind">{kindLabel}</span>)
  }

  const updatedLabel =
    meta?.line?.split("·").pop()?.trim() ||
    formatUpdatedLabel(record.updatedAt ?? record.updated_at)

  const [summaryFlashKey, setSummaryFlashKey] = React.useState(0)
  const prevSummary = React.useRef(summary)

  React.useEffect(() => {
    if (prevSummary.current !== summary) {
      prevSummary.current = summary
      setSummaryFlashKey((k) => k + 1)
    }
  }, [summary])

  return (
    <div className="cdraft min-h-full">
      <div className="cdraft-manage-bar">
        <button type="button" className="cdraft-manage-btn" onClick={onManage}>
          <span className="cdraft-manage-glyph" aria-hidden>⊕</span>
          Manage
        </button>
      </div>

      <header className="cdraft-header">
        <h1 className="cdraft-title">{title}</h1>

        {breadcrumbParts.length > 0 ? (
          <p className="cdraft-breadcrumb">
            {breadcrumbParts.map((part, index) => (
              <React.Fragment key={index}>
                {index > 0 ? <span aria-hidden> · </span> : null}
                {part}
              </React.Fragment>
            ))}
          </p>
        ) : null}

        {promoteError ? (
          <p className="cdraft-promote-error" role="alert">
            {promoteError}
          </p>
        ) : null}

        <div className="cdraft-meta-strip">
          {isSessionActive ? (
            <span className="cdraft-meta-item">In session</span>
          ) : null}
          <span className="cdraft-status-pill">{formatStatusLabel(status)}</span>
          <span className="cdraft-meta-item">{kindLabel}</span>
          <span className="cdraft-meta-item">
            {points.length} {points.length === 1 ? "point" : "points"}
          </span>
          {anchorCount > 0 ? (
            <span className="cdraft-meta-item">{anchorCount} anchor{anchorCount === 1 ? "" : "s"}</span>
          ) : null}
          {queueCount > 0 ? (
            <span className="cdraft-meta-item">{queueCount} in queue</span>
          ) : null}
          {updatedLabel ? (
            <span className="cdraft-meta-item">Updated {updatedLabel}</span>
          ) : null}
        </div>

        {documentControl ? (
          <div className="cdraft-document-control mt-2">{documentControl}</div>
        ) : null}
      </header>

      <div className="cdraft-body">
        <DraftChronicleBlocks
          domainId={domainId}
          draftId={draftId}
          spec={spec}
          summary={summary}
          pathEmergence={pathEmergence}
          summaryFlashKey={summaryFlashKey}
          dialogId={dialogId}
          presenceRefreshKey={presenceRefreshKey}
          onAcceptPoint={onAcceptPoint}
          onDiscussPoint={onDiscussPoint}
          onRewritePoint={onRewritePoint}
          onPromotePoint={onPromotePoint}
          acceptingPointId={acceptingPointId}
          acceptedPointIds={acceptedPointIds}
          promotingPointId={promotingPointId}
          promotedPointIds={promotedPointIds}
          draftKind={kind}
          selectedJourneyId={selectedJourneyId}
          onDialogSelect={onDialogSelect}
          onSessionSelect={onSessionSelect}
          manuscript
        />
      </div>
    </div>
  )
}
