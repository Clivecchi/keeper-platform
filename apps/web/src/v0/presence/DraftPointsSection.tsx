"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { DraftPoint } from "@keeper/shared"
import { parseDraftPoints } from "@keeper/shared"

export interface DraftPointsSectionProps {
  spec: unknown
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

export function DraftPointsSection({ spec }: DraftPointsSectionProps) {
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
    const isAccepted = point.status === "accepted"
    return (
      <motion.li
        key={point.id}
        layout
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="rounded-lg border px-3 py-2.5"
        style={{
          borderColor: pointBorder(point.status),
          background: pointBackground(point.status),
        }}
      >
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
            color: pointWeight(point.status),
            fontWeight: isAccepted ? 500 : 400,
          }}
        >
          {point.content}
        </p>
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
