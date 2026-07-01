"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { DraftPoint } from "@keeper/shared"
import { buildGlossAnchorDataAttribute, isDraftPointRewritable } from "@keeper/shared"
import { resolvePointBeats } from "./integrationChronicle/draftManuscriptUtils"

export interface DraftPointRowProps {
  point: DraftPoint
  draftId?: string
  isAccepted: boolean
  canAccept: boolean
  isAccepting: boolean
  onAcceptPoint?: (draftId: string, pointId: string) => void
  onDiscussPoint?: (draftId: string, pointId: string) => void
  onRewritePoint?: (draftId: string, pointId: string, preview: string) => void
  manuscript?: boolean
}

function pointWeight(status: DraftPoint["status"]): string {
  return status === "accepted"
    ? "hsl(var(--theme-ink-primary))"
    : "hsl(var(--theme-ink-secondary) / 0.85)"
}

function pointBackground(status: DraftPoint["status"]): string {
  return status === "accepted"
    ? "hsl(var(--theme-surface-elevated) / 0.55)"
    : "hsl(var(--theme-surface-elevated) / 0.28)"
}

function pointBorder(status: DraftPoint["status"]): string {
  return status === "accepted"
    ? "hsl(var(--theme-border-soft) / 0.65)"
    : "hsl(var(--theme-border-soft) / 0.35)"
}

export function DraftPointRow({
  point,
  draftId,
  isAccepted,
  canAccept,
  isAccepting,
  onAcceptPoint,
  onDiscussPoint,
  onRewritePoint,
  manuscript = false,
}: DraftPointRowProps) {
  const displayStatus = isAccepted ? "accepted" : point.status
  const canRewrite =
    !isAccepted && isDraftPointRewritable(point.status) && !!draftId && !!onRewritePoint
  const [expanded, setExpanded] = React.useState(false)
  const beats = resolvePointBeats(point)
  const { structure } = beats
  const prevContent = React.useRef(point.content)
  const prevUpdatedAt = React.useRef(point.updatedAt)
  const [flashKey, setFlashKey] = React.useState(0)

  React.useEffect(() => {
    if (
      prevContent.current !== point.content ||
      prevUpdatedAt.current !== point.updatedAt
    ) {
      prevContent.current = point.content
      prevUpdatedAt.current = point.updatedAt
      setFlashKey((k) => k + 1)
    }
  }, [point.content, point.updatedAt])

  if (manuscript) {
    const showFull = expanded || !beats.hasMore
    const pathLabel =
      structure.pathName && structure.pathSubtitle
        ? `${structure.pathName} — ${structure.pathSubtitle}`
        : structure.pathName || structure.pathSubtitle

    return (
      <motion.li
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="cdraft-point-card cdraft-point-card--frame"
        data-point-id={point.id}
        data-flash={flashKey}
        data-gloss-anchor={
          draftId
            ? buildGlossAnchorDataAttribute({
                entityKind: "draft",
                entityId: draftId,
                nodeId: point.id,
              })
            : undefined
        }
      >
        {isAccepted ? (
          <span className="cdraft-accepted-badge">Accepted</span>
        ) : null}

        {beats.prelude ? (
          <div className="cdraft-point-prelude">
            <span className="cdraft-beat-label">Prelude</span>
            <p className="cdraft-prelude-text">{beats.prelude}</p>
          </div>
        ) : null}

        {pathLabel ? (
          <p className="cdraft-path-label">{pathLabel}</p>
        ) : null}

        {(beats.opener || beats.fullContent) && (
          <div className="cdraft-point-opener">
            <p className="cdraft-opener-text">
              {showFull ? beats.fullContent : beats.opener}
              {beats.hasMore && !expanded ? (
                <>
                  {" "}
                  <button
                    type="button"
                    className="cdraft-more-link"
                    onClick={() => setExpanded(true)}
                  >
                    [more]
                  </button>
                </>
              ) : null}
            </p>
          </div>
        )}

        {structure.moments.length > 0 ? (
          <ul className="cdraft-moment-strip cdraft-moment-strip--inline" aria-label="Moments">
            {structure.moments.map((moment, idx) => (
              <li key={`${point.id}-m-${idx}`} className="cdraft-moment-frame">
                <span className="cdraft-moment-frame-index">{idx + 1}</span>
                <span className="cdraft-moment-frame-title">{moment.title}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {beats.closer ? (
          <p className="cdraft-closer-text">{beats.closer}</p>
        ) : null}

        {(canAccept || onDiscussPoint || canRewrite) && draftId ? (
          <div className="cdraft-point-actions">
            {canAccept && onAcceptPoint ? (
              <button
                type="button"
                onClick={() => onAcceptPoint(draftId, point.id)}
                disabled={isAccepting}
                className="cdraft-ghost-btn"
              >
                {isAccepting ? "Accepting…" : "Accept"}
              </button>
            ) : null}
            {canRewrite ? (
              <button
                type="button"
                onClick={() => onRewritePoint(draftId, point.id, point.content)}
                className="cdraft-ghost-btn cdraft-ghost-btn--rewrite"
              >
                Rewrite
              </button>
            ) : null}
            {onDiscussPoint ? (
              <button
                type="button"
                onClick={() => onDiscussPoint(draftId, point.id)}
                className="cdraft-ghost-btn"
              >
                Discuss
              </button>
            ) : null}
          </div>
        ) : null}
      </motion.li>
    )
  }

  const TYPE_LABELS: Record<DraftPoint["type"], string> = {
    moment: "Moment",
    decision: "Decision",
    context: "Context",
    general: "Point",
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="rounded-lg border px-3 py-2.5"
      data-point-id={point.id}
      data-gloss-anchor={
        draftId
          ? buildGlossAnchorDataAttribute({
              entityKind: "draft",
              entityId: draftId,
              nodeId: point.id,
            })
          : undefined
      }
      style={{
        borderColor: pointBorder(displayStatus),
        background: pointBackground(displayStatus),
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              {TYPE_LABELS[point.type]}
            </span>
            {!isAccepted && (
              <span
                className="text-[10px] font-medium capitalize"
                style={{ color: "hsl(var(--theme-ink-tertiary) / 0.9)" }}
              >
                {point.status}
              </span>
            )}
          </div>
          {beats.prelude ? (
            <p
              className="text-[13px] italic mb-1"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              {beats.prelude}
            </p>
          ) : null}
          <p
            className="text-[14px] leading-relaxed"
            style={{
              color: pointWeight(displayStatus),
              fontWeight: isAccepted ? 500 : 400,
            }}
          >
            {structure.description || point.content}
          </p>
        </div>
        {isAccepted && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              background: "hsl(142 40% 94%)",
              color: "hsl(142 50% 30%)",
              border: "1px solid hsl(142 30% 82%)",
            }}
          >
            Accepted
          </span>
        )}
      </div>
      {(canAccept || onDiscussPoint || canRewrite) && draftId ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {canAccept && onAcceptPoint ? (
            <button
              type="button"
              onClick={() => onAcceptPoint(draftId, point.id)}
              disabled={isAccepting}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))" }}
            >
              {isAccepting ? "Accepting…" : "Accept"}
            </button>
          ) : null}
          {canRewrite ? (
            <button
              type="button"
              onClick={() => onRewritePoint(draftId, point.id, point.content)}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-90"
              style={{
                borderColor: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))",
                color: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))",
              }}
            >
              Rewrite
            </button>
          ) : null}
          {onDiscussPoint ? (
            <button
              type="button"
              onClick={() => onDiscussPoint(draftId, point.id)}
              className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-90"
              style={{
                borderColor: "hsl(var(--theme-border-soft) / 0.55)",
                color: "hsl(var(--theme-ink-secondary))",
              }}
            >
              Discuss
            </button>
          ) : null}
        </div>
      ) : null}
    </motion.li>
  )
}
