"use client"

import * as React from "react"
import type { KeptRow } from "../feed/FeedFrame"

interface MomentDetailPanelProps {
  moment: KeptRow
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function MomentDetailPanel({ moment }: MomentDetailPanelProps) {
  return (
    <div className="px-4 py-4 space-y-4">
      <div>
        <p
          className="text-[11px] uppercase tracking-widest font-semibold mb-1"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Moment
        </p>
        <p
          className="text-[14px] font-semibold leading-snug"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          {moment.title?.trim() || "Untitled moment"}
        </p>
      </div>
      {moment.journeyName ? (
        <div>
          <p
            className="text-[11px] uppercase tracking-widest font-semibold mb-1"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Journey
          </p>
          <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
            {moment.journeyName}
          </p>
        </div>
      ) : null}
      <div>
        <p
          className="text-[11px] uppercase tracking-widest font-semibold mb-1"
          style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        >
          Kept
        </p>
        <p className="text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
          {formatDate(moment.keptAt ?? moment.createdAt)}
        </p>
      </div>
      {moment.body?.trim() ? (
        <div>
          <p
            className="text-[11px] uppercase tracking-widest font-semibold mb-1"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            Content
          </p>
          <p
            className="text-[13px] leading-relaxed whitespace-pre-wrap"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            {moment.body}
          </p>
        </div>
      ) : null}
    </div>
  )
}
