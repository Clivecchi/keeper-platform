"use client"

import * as React from "react"
import type { DraftPoint } from "@keeper/shared"
import { parseDraftPoints } from "@keeper/shared"
import { AnimatePresence } from "framer-motion"
import { DraftPointRow } from "./DraftPointRow"

export interface DraftPointsSectionProps {
  spec: unknown
  draftId?: string
  onAcceptPoint?: (draftId: string, pointId: string) => void
  onDiscussPoint?: (draftId: string, pointId: string) => void
  acceptingPointId?: string | null
  acceptedPointIds?: Set<string>
}

export function DraftPointsSection({
  spec,
  draftId,
  onAcceptPoint,
  onDiscussPoint,
  acceptingPointId = null,
  acceptedPointIds,
}: DraftPointsSectionProps) {
  const points = React.useMemo(() => parseDraftPoints(spec), [spec])
  const accepted = points.filter((p) => p.status === "accepted")
  const pending = points.filter((p) => p.status !== "accepted")

  if (!points.length) {
    return (
      <p className="text-[13px]" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
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
      />
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
