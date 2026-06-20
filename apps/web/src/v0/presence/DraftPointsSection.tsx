"use client"

import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import type { DraftPoint } from "@keeper/shared"
import { parseDraftPoints } from "@keeper/shared"

export interface DraftPointsSectionProps {
  spec: unknown
  draftId?: string
  onAcceptPoint?: (draftId: string, pointId: string) => void
  acceptingPointId?: string | null
  acceptedPointIds?: Set<string>
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

const TYPE_LABELS: Record<DraftPoint["type"], string> = {
  moment: "Moment",
  decision: "Decision",
  context: "Context",
  general: "Point",
}

export function DraftPointsSection({
  spec,
  draftId,
  onAcceptPoint,
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
    const isAccepting = acceptingPointId === point.id

    return (
      <motion.li
        key={point.id}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="rounded-lg border px-3 py-2.5"
        data-point-id={point.id}
        data-gloss-anchor={draftId ? JSON.stringify({ entityKind: "draft", entityId: draftId, nodeId: point.id }) : undefined}
        style={{
          borderColor: pointBorder(isAccepted ? "accepted" : point.status),
          background: pointBackground(isAccepted ? "accepted" : point.status),
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
                color: pointWeight(isAccepted ? "accepted" : point.status),
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
        {canAccept && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => onAcceptPoint?.(draftId, point.id)}
              disabled={isAccepting}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "hsl(var(--theme-dialogue-user-bg, 14 60% 56%))" }}
            >
              {isAccepting ? "Accepting…" : "Accept"}
            </button>
          </div>
        )}
      </motion.li>
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
