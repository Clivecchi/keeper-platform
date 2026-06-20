"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { DraftPoint } from "@keeper/shared"
import { buildGlossAnchorDataAttribute } from "@keeper/shared"

const TYPE_LABELS: Record<DraftPoint["type"], string> = {
  moment: "Moment",
  decision: "Decision",
  context: "Context",
  general: "Point",
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

export interface DraftPointRowProps {
  point: DraftPoint
  draftId?: string
  isAccepted: boolean
  canAccept: boolean
  isAccepting: boolean
  onAcceptPoint?: (draftId: string, pointId: string) => void
  onDiscussPoint?: (draftId: string, pointId: string) => void
}

export function DraftPointRow({
  point,
  draftId,
  isAccepted,
  canAccept,
  isAccepting,
  onAcceptPoint,
  onDiscussPoint,
}: DraftPointRowProps) {
  const displayStatus = isAccepted ? "accepted" : point.status

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
          <p
            className="text-[14px] leading-relaxed"
            style={{
              color: pointWeight(displayStatus),
              fontWeight: isAccepted ? 500 : 400,
            }}
          >
            {point.content}
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
      {(canAccept || onDiscussPoint) && draftId ? (
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
