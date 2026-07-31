/**
 * Compact in-stream Chronicle notification — replaces full Document cards in Dialog.
 */

import * as React from "react"
import type { ChronicleEventAnchor } from "@keeper/shared"

export interface ChronicleUpdateChipProps {
  actor: string
  dialogTitle: string
  meta?: string
  onOpen?: () => void
}

export function ChronicleUpdateChip({
  actor,
  dialogTitle,
  meta,
  onOpen,
}: ChronicleUpdateChipProps) {
  const label = `${actor} added to ${dialogTitle}`
  const Tag = onOpen ? "button" : "div"
  return (
    <Tag
      type={onOpen ? "button" : undefined}
      onClick={onOpen}
      className="chronicle-update-chip mt-2 flex w-full items-center gap-2 rounded-full px-3 py-2 text-left transition-opacity hover:opacity-90"
      style={{
        background: "hsl(var(--theme-surface-panel) / 0.55)",
        border: "1px solid hsl(var(--theme-border-soft) / 0.5)",
        color: "hsl(var(--theme-ink-primary))",
      }}
      aria-label={onOpen ? `Open Chronicle — ${label}` : label}
    >
      <span className="min-w-0 flex-1 truncate text-[13px]">
        <span className="font-semibold">{actor}</span>
        {" added to "}
        <em className="not-italic font-serif font-semibold">{dialogTitle}</em>
      </span>
      <span
        className="shrink-0 text-[13px]"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
        aria-hidden
      >
        →
      </span>
      {meta ? (
        <span className="sr-only">{meta}</span>
      ) : null}
    </Tag>
  )
}

export function resolveChronicleChipOpenTarget(chip: {
  dialogId?: string
  dialogTitle?: string
  actor?: string
  anchor?: ChronicleEventAnchor
} | null | undefined): {
  dialogId: string
  pointId?: string | null
  breadcrumb?: string[] | null
} | null {
  const dialogId = chip?.dialogId?.trim() || chip?.anchor?.dialogId?.trim()
  if (!dialogId) return null
  return {
    dialogId,
    pointId: chip?.anchor?.pointId ?? null,
    breadcrumb: chip?.anchor?.breadcrumb ?? null,
  }
}
