"use client"

/**
 * Reach in Chronicle — Composer tool, not Composer.
 * Back returns to the subject Chronicle was showing.
 */

import * as React from "react"
import { ArrowLeftIcon } from "@heroicons/react/24/outline"
import { ReachPalette } from "../composer/ReachPalette"

export function ReachChroniclePresence({
  domainId,
  onClose,
}: {
  domainId: string
  onClose: () => void
}) {
  return (
    <div className="flex h-full min-h-0 flex-col" data-cover-mode="config">
      <div
        className="flex shrink-0 items-center gap-3 px-3 py-2.5"
        style={{
          borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.4)",
          background: "hsl(var(--theme-surface-elevated) / 0.08)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 transition-opacity hover:opacity-75"
          style={{ color: "hsl(var(--theme-ink-secondary))" }}
          aria-label="Close Reach"
        >
          <ArrowLeftIcon className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p
            className="text-[11px] uppercase tracking-[0.08em]"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            Reach
          </p>
          <p
            className="truncate text-[14px] font-medium"
            style={{ color: "hsl(var(--theme-ink-primary))" }}
          >
            Bring who or what you need
          </p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-4 pt-3">
        <ReachPalette domainId={domainId} active />
      </div>
    </div>
  )
}
