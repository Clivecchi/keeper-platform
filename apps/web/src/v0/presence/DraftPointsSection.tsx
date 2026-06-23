"use client"

import * as React from "react"
import type { DraftPoint } from "@keeper/shared"
import { parseDraftPoints } from "@keeper/shared"
import { AnimatePresence } from "framer-motion"
import { DraftPointRow } from "./DraftPointRow"
import {
  clusterDraftPoints,
  type DraftPathEmergence,
} from "./integrationChronicle/draftManuscriptUtils"

export interface DraftPointsSectionProps {
  spec: unknown
  draftId?: string
  pathEmergence?: DraftPathEmergence[]
  onAcceptPoint?: (draftId: string, pointId: string) => void
  onDiscussPoint?: (draftId: string, pointId: string) => void
  acceptingPointId?: string | null
  acceptedPointIds?: Set<string>
  manuscript?: boolean
}

export function DraftPointsSection({
  spec,
  draftId,
  pathEmergence = [],
  onAcceptPoint,
  onDiscussPoint,
  acceptingPointId = null,
  acceptedPointIds,
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

    return (
      <DraftPointRow
        key={point.id}
        point={point}
        draftId={draftId}
        isAccepted={isAccepted}
        canAccept={canAccept}
        isAccepting={acceptingPointId === point.id}
        onAcceptPoint={onAcceptPoint}
        onDiscussPoint={onDiscussPoint}
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
          <div>
            <p className="cdraft-section-label cdraft-section-label--nested">Accepted</p>
            <ul className="cdraft-cluster-list">{renderClustered(accepted)}</ul>
          </div>
        )}
        {pending.length > 0 && (
          <div>
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
            Under consideration
          </p>
          <AnimatePresence initial={false}>
            <ul className="space-y-2">{pending.map(renderPoint)}</ul>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
