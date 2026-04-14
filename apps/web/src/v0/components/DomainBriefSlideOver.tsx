"use client"

import * as React from "react"
import type { DomainFrameJson } from "../data/domain-frame.types"
import { DomainBrief } from "./DomainBrief"

interface DomainBriefSlideOverProps {
  domainFrame: DomainFrameJson
  onClose: () => void
}

export function DomainBriefSlideOver({ domainFrame, onClose }: DomainBriefSlideOverProps) {
  const domainName = domainFrame.theme?.wordmark?.trim() || domainFrame.domain || "Domain"

  // Close on Escape
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [onClose])

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "hsl(var(--theme-ink-primary) / 0.18)" }}
        aria-hidden
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 flex flex-col overflow-hidden"
        style={{
          width: 480,
          background: "hsl(var(--theme-surface-paper))",
          borderLeft: "1px solid hsl(var(--theme-line-hairline))",
          boxShadow: "-4px 0 24px hsl(var(--theme-ink-primary) / 0.08)",
          animation: "briefSlideIn 180ms ease-out both",
        }}
        role="dialog"
        aria-label="Domain Brief"
        aria-modal="true"
      >
        {/* Header */}
        <div
          className="shrink-0 flex items-start justify-between px-5 py-4 border-b"
          style={{ borderColor: "hsl(var(--theme-line-hairline))" }}
        >
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "hsl(var(--theme-ink-tertiary))" }}
            >
              Domain Brief
            </p>
            <p
              className="text-[15px] font-semibold mt-0.5"
              style={{ color: "hsl(var(--theme-ink-primary))" }}
            >
              {domainName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close domain brief"
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md transition-opacity hover:opacity-60 mt-0.5"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <DomainBrief domainFrame={domainFrame} />
        </div>
      </div>

      <style>{`
        @keyframes briefSlideIn {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  )
}
