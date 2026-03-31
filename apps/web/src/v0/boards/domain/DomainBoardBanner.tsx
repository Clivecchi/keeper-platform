"use client"

import * as React from "react"
import type { DomainFrameJson } from "../../data/domain-frame.types"

export function DomainBoardBanner({
  domainSlug,
  liveDomainFrame,
}: {
  domainSlug: string
  liveDomainFrame: DomainFrameJson | null
}) {
  const wordmark = liveDomainFrame?.theme?.wordmark?.trim() || domainSlug
  const tagline = (() => {
    const card = liveDomainFrame?.cover?.card as { tagLine?: string } | undefined
    return card?.tagLine?.trim() || liveDomainFrame?.theme?.tagline?.trim() || ""
  })()

  return (
    <div
      className="shrink-0 flex items-center justify-between px-5 gap-3"
      style={{
        height: 56,
        borderBottom: "1px solid #e7e5e4",
        background: "#faf8f5",
        boxShadow: "0 1px 2px rgba(28,25,23,0.06)",
      }}
    >
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="min-w-0">
          <p className="font-serif text-[20px] font-semibold leading-tight truncate" style={{ color: "#1c1917" }}>
            {wordmark}
          </p>
          {tagline ? (
            <p className="text-[12px] leading-snug truncate mt-0.5" style={{ color: "#57534e" }}>
              {tagline}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.25)]" />
          <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "#047857" }}>
            Live
          </span>
        </div>
      </div>
    </div>
  )
}
