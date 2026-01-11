"use client"

import type { CSSProperties } from "react"
import { useState } from "react"
import { X } from "lucide-react"

// Config for footer messages - ready for styling later
const momentCopy = {
  preserved: "Your words are being preserved",
  kipPlaceholder: "Kip will assist here.",
}

interface MomentBodyProps {
  /** Theme slug for ruled lines */
  themeSlug?: string | null
  /** Domain slug for navigation */
  domainSlug?: string
}

export function MomentBody({ themeSlug, domainSlug }: MomentBodyProps) {
  // Determine if we should show ruled lines (diary-paper theme or style)
  const shouldShowRuledLines = themeSlug === 'diary-paper'
  const [content, setContent] = useState("")
  const [isKipOpen, setIsKipOpen] = useState(false)

  const lineHeight = 32 // px, keep in sync with ruled lines via --moment-line-step

  return (
    <>
      {/* Main content area */}
      <div className="flex items-center justify-center">
        <div className="relative w-full max-w-4xl">
          <div className="space-y-3 mt-2">
            <div
              className="relative rounded-sm border bg-white/92 overflow-hidden flex flex-col"
              style={{
                backgroundColor: "var(--theme-surface-paper)",
                borderColor: "var(--theme-border-soft)",
                boxShadow: "var(--theme-shadow-soft)",
                color: "var(--theme-ink-primary)",
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6) 0, transparent 45%), radial-gradient(circle at 80% 10%, rgba(255,255,255,0.35) 0, transparent 40%)",
              }}
            >
            <div
              className="flex-1 overflow-auto"
              style={
                {
                  "--moment-line-step": `${lineHeight}px`,
                  backgroundImage: shouldShowRuledLines
                    ? `repeating-linear-gradient(0deg, transparent, transparent calc(var(--moment-line-step) - 1px), var(--theme-line-ruled) calc(var(--moment-line-step) - 1px), var(--theme-line-ruled) var(--moment-line-step))`
                    : undefined,
                  backgroundAttachment: "local",
                } as CSSProperties
              }
            >
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Begin writing…"
                className="w-full h-full min-h-[520px] bg-transparent outline-none resize-none px-6 md:px-8 pb-10 text-[15.5px] text-[var(--theme-ink-primary)] placeholder:text-[var(--theme-ink-placeholder)] border border-white"
                style={{
                  lineHeight: "var(--moment-line-step)",
                  paddingTop: "calc(var(--moment-line-step) / 2)",
                  paddingBottom: "calc(var(--moment-line-step))",
                  fontFamily: "var(--font-family-sans, Inter, system-ui, sans-serif)",
                }}
              />
            </div>

            {/* Media Bar */}
            <div
              className="px-6 md:px-8 py-3 border-t box-content"
              style={{
                borderTop: `1px solid rgba(222, 214, 211, 1)`,
                backgroundColor: "hsl(var(--theme-surface-paper) / 0.3)"
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--theme-ink-tertiary)" }}>
                  <span>kept</span>
                  <span className="text-[9px] opacity-60">(0)</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border px-2 py-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80"
                    style={{
                      borderColor: "var(--theme-border-soft)",
                      color: "var(--theme-ink-tertiary)",
                      backgroundColor: "var(--theme-surface-paper)",
                      boxShadow: "var(--theme-shadow-soft)",
                    }}
                    aria-label="Access Keeper platform"
                  >
                    <span>Keep</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border p-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80"
                    style={{
                      borderColor: "var(--theme-border-soft)",
                      color: "var(--theme-ink-tertiary)",
                      backgroundColor: "var(--theme-surface-paper)",
                      boxShadow: "var(--theme-shadow-soft)",
                    }}
                    aria-label="Upload media"
                  >
                    <span>+</span>
                  </button>
                </div>
              </div>
            </div>

            <div
              className="flex flex-col items-end gap-2 px-6 md:px-8 py-4 text-[11px]"
              style={{ color: "var(--theme-ink-tertiary)", borderTop: `1px solid rgba(210, 174, 162, 1)`, backgroundColor: "rgba(240, 240, 240, 1)" }}
            >
              <span
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: "var(--theme-surface-paper)",
                  color: "var(--theme-ink-secondary)",
                  boxShadow: "var(--theme-shadow-soft)",
                }}
              >
                {content.trim().length ? `${content.trim().split(/\s+/).filter(Boolean).length} words kept` : "0 words kept"}
              </span>
              <span
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: "var(--theme-surface-paper)",
                  color: "var(--theme-ink-tertiary)",
                  boxShadow: "var(--theme-shadow-soft)",
                }}
              >
                {momentCopy.preserved}
              </span>
              <button
                type="button"
                onClick={() => setIsKipOpen(!isKipOpen)}
                className="inline-flex items-center justify-center rounded-full border p-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80"
                style={{
                  borderColor: "var(--theme-border-soft)",
                  color: "var(--theme-ink-tertiary)",
                  backgroundColor: "var(--theme-surface-paper)",
                  boxShadow: "var(--theme-shadow-soft)",
                }}
                aria-label="Kip companion"
              >
                <span>Kip</span>
              </button>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Kip Companion Panel */}
      {isKipOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsKipOpen(false)}
          />

          {/* Kip Panel */}
          <div
            className="absolute bottom-20 right-6 z-50 w-64 p-4 rounded-md border shadow-lg"
            style={{
              backgroundColor: "var(--theme-surface-paper)",
              borderColor: "var(--theme-border-soft)",
              boxShadow: "var(--theme-shadow-soft)",
              color: "var(--theme-ink-primary)",
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "var(--theme-ink-secondary)" }}>
                Kip Companion
              </span>
              <button
                type="button"
                onClick={() => setIsKipOpen(false)}
                className="text-muted-foreground/60 hover:text-foreground p-1"
                aria-label="Close Kip panel"
              >
                <X className="w-3 h-3" strokeWidth={1.5} />
              </button>
            </div>
            <p className="text-xs" style={{ color: "var(--theme-ink-tertiary)" }}>
              {momentCopy.kipPlaceholder}
            </p>
          </div>
        </>
      )}
    </>
  )
}