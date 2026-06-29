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
  acceptingPointId?: string | null
  acceptedPointIds?: Set<string>
  onDialogSelect?: (dialogId: string) => void
  onSessionSelect?: (sessionId: string) => void
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
  acceptingPointId,
  acceptedPointIds,
  onDialogSelect,
  onSessionSelect,
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

  const journeyLabel =
    meta?.keeper?.title?.trim() ||
    (typeof record.journeyName === "string" ? record.journeyName : undefined) ||
    (typeof record.journey_name === "string" ? record.journey_name : undefined)

  const breadcrumb = [journeyLabel, kindLabel].filter(Boolean).join(" · ")

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
        {isSessionActive ? (
          <span className="cdraft-session-badge">Active in Session</span>
        ) : null}

        <h1 className="cdraft-title">{title}</h1>

        {breadcrumb ? (
          <p className="cdraft-breadcrumb">{breadcrumb}</p>
        ) : null}

        <div className="cdraft-meta-strip">
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
          acceptingPointId={acceptingPointId}
          acceptedPointIds={acceptedPointIds}
          onDialogSelect={onDialogSelect}
          onSessionSelect={onSessionSelect}
          manuscript
        />
      </div>
    </div>
  )
}
