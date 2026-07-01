"use client"

import * as React from "react"
import type { DraftPoint } from "@keeper/shared"
import { resolveDraftPointStructure } from "@keeper/shared"

export interface DraftFilmStripProps {
  points: DraftPoint[]
  selectedId?: string | null
  onSelect?: (pointId: string) => void
  onDiscussPoint?: (draftId: string, pointId: string) => void
  draftId?: string
}

export function DraftFilmStrip({
  points,
  selectedId,
  onSelect,
  onDiscussPoint,
  draftId,
}: DraftFilmStripProps) {
  const [internalSelected, setInternalSelected] = React.useState<string | null>(
    points[0]?.id ?? null,
  )

  React.useEffect(() => {
    if (points.length === 0) {
      setInternalSelected(null)
      return
    }
    if (!points.some((p) => p.id === internalSelected)) {
      setInternalSelected(points[0]?.id ?? null)
    }
  }, [points, internalSelected])

  const activeId = selectedId ?? internalSelected
  const activePoint = points.find((p) => p.id === activeId) ?? points[0]
  const activeStructure = activePoint
    ? resolveDraftPointStructure(activePoint)
    : null

  if (points.length === 0) return null

  return (
    <div className="cdraft-film-strip">
      <div className="cdraft-film-track" role="tablist" aria-label="Accepted path frames">
        {points.map((point, index) => {
          const structure = resolveDraftPointStructure(point)
          const isActive = point.id === activeId
          const label =
            structure.prelude ||
            structure.pathSubtitle ||
            structure.pathName ||
            `Frame ${index + 1}`

          return (
            <button
              key={point.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`cdraft-film-frame${isActive ? " cdraft-film-frame--active" : ""}`}
              onClick={() => {
                setInternalSelected(point.id)
                onSelect?.(point.id)
              }}
            >
              <span className="cdraft-film-frame-index">{index + 1}</span>
              <span className="cdraft-film-frame-title">{label}</span>
              {structure.pathName ? (
                <span className="cdraft-film-frame-path">{structure.pathName}</span>
              ) : null}
              {structure.moments.length > 0 ? (
                <span className="cdraft-film-frame-count">
                  {structure.moments.length}{" "}
                  {structure.moments.length === 1 ? "moment" : "moments"}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      {activePoint && activeStructure ? (
        <div className="cdraft-film-focus" role="tabpanel">
          {activeStructure.pathName ? (
            <p className="cdraft-film-focus-path">
              {activeStructure.pathName}
              {activeStructure.pathSubtitle
                ? ` — ${activeStructure.pathSubtitle}`
                : null}
            </p>
          ) : null}

          {activeStructure.prelude ? (
            <p className="cdraft-film-focus-prelude">{activeStructure.prelude}</p>
          ) : null}

          {activeStructure.description ? (
            <p className="cdraft-film-focus-body">{activeStructure.description}</p>
          ) : null}

          {activeStructure.moments.length > 0 ? (
            <ul className="cdraft-moment-strip" aria-label="Moments in this path">
              {activeStructure.moments.map((moment, idx) => (
                <li key={`${activePoint.id}-moment-${idx}`} className="cdraft-moment-frame">
                  <span className="cdraft-moment-frame-index">{idx + 1}</span>
                  <span className="cdraft-moment-frame-title">{moment.title}</span>
                  {moment.narrative ? (
                    <span className="cdraft-moment-frame-narrative">{moment.narrative}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {activeStructure.closer ? (
            <p className="cdraft-film-focus-closer">{activeStructure.closer}</p>
          ) : null}

          {draftId && onDiscussPoint ? (
            <div className="cdraft-film-focus-actions">
              <button
                type="button"
                className="cdraft-ghost-btn"
                onClick={() => onDiscussPoint(draftId, activePoint.id)}
              >
                Discuss
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
