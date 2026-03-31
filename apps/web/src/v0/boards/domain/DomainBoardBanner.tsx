"use client"

import * as React from "react"
import type { DomainFrameJson } from "../../data/domain-frame.types"

function GridIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden>
      <rect x="1" y="1" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="7.5" y="1" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="1" y="7.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
      <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

function ChatIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 13 13" fill="none" aria-hidden>
      <path
        d="M2 2.5A1.5 1.5 0 013.5 1h6A1.5 1.5 0 0111 2.5v5A1.5 1.5 0 019.5 9H5L2.5 11.5V9H2A.5.5 0 012 8.5v-6z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 15a3 3 0 100-6 3 3 0 000 6z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

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

  const iconPill = (
    <div
      className="flex items-center rounded-md overflow-hidden shrink-0"
      style={{ border: "1px solid #d6d3d1", background: "#f5f2eb" }}
    >
      {[
        { label: "Grid view", Icon: GridIcon },
        { label: "Chat", Icon: ChatIcon },
        { label: "Settings", Icon: SettingsIcon },
      ].map(({ label, Icon }) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          disabled
          className="flex items-center justify-center opacity-60 cursor-not-allowed"
          style={{
            width: 32,
            height: 28,
            color: "#57534e",
            background: "transparent",
            boxShadow: "none",
          }}
        >
          <Icon />
        </button>
      ))}
    </div>
  )

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
      {iconPill}
    </div>
  )
}
