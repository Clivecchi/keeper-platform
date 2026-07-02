"use client"

import * as React from "react"
import type { DraftPoint } from "@keeper/shared"
import { parseDraftPoints } from "@keeper/shared"
import { AnimatePresence } from "framer-motion"
import { DraftPointRow } from "./DraftPointRow"
import { DraftFilmStrip } from "./integrationChronicle/DraftFilmStrip"
import {
  clusterDraftPoints,
  type DraftPathEmergence,
} from "./integrationChronicle/draftManuscriptUtils"

export interface DraftPointsSectionProps {
  spec: unknown
  draftId?: string
  draftKind?: string | null
  selectedJourneyId?: string | null
  pathEmergence?: DraftPathEmergence[]
  onAcceptPoint?: (draftId: string, pointId: string) => void
  onDiscussPoint?: (draftId: string, pointId: string) => void
  onRewritePoint?: (draftId: string, pointId: string, preview: string) => void
  onPromotePoint?: (draftId: string, pointId: string) => void
  acceptingPointId?: string | null
  acceptedPointIds?: Set<string>
  promotingPointId?: string | null
  promotedPointIds?: Set<string>
  manuscript?: boolean
}

export function DraftPointsSection({
  spec,
  draftId,
  draftKind,
  selectedJourneyId,
  pathEmergence = [],
  onAcceptPoint,
  onDiscussPoint,
  onRewritePoint,
  onPromotePoint,
  acceptingPointId = null,
  acceptedPointIds,
  promotingPointId = null,
  promotedPointIds,
  manuscript = false,
}: DraftPointsSectionProps) {
  const points = React.useMemo(() => parseDraftPoints(spec), [spec])
  const accepted = points.filter((p) => p.status === "accepted")
  const pending = points.filter((p) => p.status !== "accepted")

  if (!points.length) {
    return (
      <p
        className={manuscript ? "cdraft-empty" : "text-[13px]"}
        style={
          manuscript
            ? undefined
            : { color: "hsl(var(--theme-ink-tertiary))" }
        }
      >
        No points yet — proposed content will accumulate here.
      </p>
    )
  }

  function renderPoint(point: DraftPoint) {
    const isAccepted =
      point.status === "accepted" || acceptedPointIds?.has(point.id) === true
    const canAccept =
      !isAccepted && !!draftId && !!onAcceptPoint && point.status !== "accepted"

    const isPromoted =
      !!point.promotion?.promotedPathId || promotedPointIds?.has(point.id) === true

    return (
      <DraftPointRow
        key={point.id}
        point={point}
        draftId={draftId}
        draftKind={draftKind}
        selectedJourneyId={selectedJourneyId}
        isAccepted={isAccepted}
        canAccept={canAccept}
        isAccepting={acceptingPointId === point.id}
        onAcceptPoint={onAcceptPoint}
        onDiscussPoint={onDiscussPoint}
        onRewritePoint={onRewritePoint}
        onPromotePoint={onPromotePoint}
        isPromoting={promotingPointId === point.id}
        isPromoted={isPromoted}
        manuscript={manuscript}
      />
    )
  }

  function renderClustered(list: DraftPoint[]) {
    const clusters = clusterDraftPoints(list, pathEmergence)
    return clusters.map((cluster, index) => (
      <li
        key={`cluster-${index}`}
        className={
          cluster.points.length > 1 || cluster.pathPrelude
            ? "cdraft-point-cluster"
            : undefined
        }
      >
        {cluster.pathPrelude ? (
          <p className="cdraft-path-prelude">{cluster.pathPrelude}</p>
        ) : null}
        <ul className={manuscript ? "cdraft-point-list" : "space-y-2"}>
          {cluster.points.map(renderPoint)}
        </ul>
      </li>
    ))
  }

  if (manuscript) {
    return (
      <div className="cdraft-points-stack">
        {accepted.length > 0 && (
          <div className="cdraft-anchors-block">
            <p className="cdraft-section-label cdraft-section-label--nested">
              Story ({accepted.length})
            </p>
            <DraftFilmStrip
              points={accepted}
              draftId={draftId}
              onDiscussPoint={onDiscussPoint}
            />
          </div>
        )}
        {pending.length > 0 && (
          <div>
            <p className="cdraft-section-label cdraft-section-label--nested">
              Rewrite queue ({pending.length})
            </p>
            <AnimatePresence initial={false}>
              <ul className="cdraft-cluster-list">{renderClustered(pending)}</ul>
            </AnimatePresence>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {accepted.length > 0 && (
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Accepted
          </p>
          <ul className="space-y-2">{accepted.map(renderPoint)}</ul>
        </div>
      )}
      {pending.length > 0 && (
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-2"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Under consideration ({pending.length})
          </p>
          <AnimatePresence initial={false}>
            <ul className="space-y-2">{pending.map(renderPoint)}</ul>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
