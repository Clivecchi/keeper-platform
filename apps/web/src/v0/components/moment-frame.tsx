"use client"

import type { CSSProperties } from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { X } from "lucide-react"
import type { StyleId } from "../styles/styles"
import { StyleScope } from "../styles/StyleScope"

// Config for footer messages - ready for styling later
const momentCopy = {
  preserved: "Your words are being preserved",
  kipPlaceholder: "Kip will assist here.",
}

export function MomentFrame({ styleId = 'neutral' }: { styleId?: StyleId }) {
  const navigate = useNavigate()
  const [content, setContent] = useState("")
  const [isKipOpen, setIsKipOpen] = useState(false)

  const lineHeight = 32 // px, keep in sync with ruled lines via --moment-line-step

  return (
    <StyleScope styleId={styleId}>
      <main
        className="relative min-h-screen text-foreground flex flex-col"
        style={{ backgroundColor: "var(--v0-surface-page)", color: "var(--v0-ink-primary)", borderWidth: "1px", borderColor: "rgba(214, 214, 214, 1)" }}
      >
      {/* Content wrapper with constrained width */}
      <div className="max-w-[860px] w-full mx-auto px-4 pt-3 pb-4 flex-1 flex flex-col">
        {/* Header with Moment Diary and Close button */}
        <div className="flex items-start justify-between mb-3">
          <div className="space-y-1">
          <span className="block text-[11px] tracking-[0.22em] uppercase" style={{ color: "var(--v0-ink-tertiary)" }}>
            Moment Diary
          </span>
          <span className="block text-[12px]" style={{ color: "var(--v0-ink-secondary)" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <div className="flex items-start gap-3">
            <button
              type="button"
              aria-label="Close moment"
              onClick={() => navigate({ pathname: "/v0", search: "?frame=cover" })}
              className="inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground/60 hover:text-foreground hover:border-muted/60 bg-white/60 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background p-1 shadow-sm"
            >
              <X className="w-4 h-4" strokeWidth={1.25} />
            </button>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative w-full" style={{ color: "rgba(104, 45, 3, 1)" }}>

          <div className="space-y-3 mt-2">
            <div
              className="relative rounded-sm border bg-white/92 overflow-hidden flex flex-col"
              style={{
                backgroundColor: "var(--v0-surface-paper)",
                borderColor: "var(--v0-border-soft)",
                boxShadow: "var(--v0-shadow-soft)",
                color: "var(--v0-ink-primary)",
                backgroundImage:
                  "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6) 0, transparent 45%), radial-gradient(circle at 80% 10%, rgba(255,255,255,0.35) 0, transparent 40%)",
              }}
            >
            <div
              className="flex-1 overflow-auto"
              style={
                {
                  "--moment-line-step": `${lineHeight}px`,
                  "--moment-rule-color": "var(--v0-line-ruled)",
                  backgroundImage: styleId === 'diary-paper'
                    ? `repeating-linear-gradient(0deg, transparent, transparent calc(var(--moment-line-step) - 1px), var(--moment-rule-color) calc(var(--moment-line-step) - 1px), var(--moment-rule-color) var(--moment-line-step))`
                    : undefined,
                  backgroundAttachment: "local",
                } as CSSProperties
              }
            >
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Begin writing…"
                className="w-full h-full min-h-[520px] bg-transparent outline-none resize-none px-6 md:px-8 pb-10 text-[15.5px] text-[var(--v0-ink-primary)] placeholder:text-[var(--v0-ink-placeholder)] border border-white"
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
                <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--v0-ink-tertiary)" }}>
                  <span>kept</span>
                  <span className="text-[9px] opacity-60">(0)</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border px-2 py-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80"
                    style={{
                      borderColor: "var(--v0-border-soft)",
                      color: "var(--v0-ink-tertiary)",
                      backgroundColor: "var(--v0-surface-paper)",
                      boxShadow: "var(--v0-shadow-soft)",
                    }}
                    aria-label="Access Keeper platform"
                  >
                    <span>Keep</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full border p-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80"
                    style={{
                      borderColor: "var(--v0-border-soft)",
                      color: "var(--v0-ink-tertiary)",
                      backgroundColor: "var(--v0-surface-paper)",
                      boxShadow: "var(--v0-shadow-soft)",
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
              style={{ color: "var(--v0-ink-tertiary)", borderTop: `1px solid rgba(210, 174, 162, 1)`, backgroundColor: "rgba(240, 240, 240, 1)" }}
            >
              <span
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: "var(--v0-surface-paper)",
                  color: "var(--v0-ink-secondary)",
                  boxShadow: "var(--v0-shadow-soft)",
                }}
              >
                {content.trim().length ? `${content.trim().split(/\s+/).filter(Boolean).length} words kept` : "0 words kept"}
              </span>
              <span
                className="rounded-full px-4 py-2"
                style={{
                  backgroundColor: "var(--v0-surface-paper)",
                  color: "var(--v0-ink-tertiary)",
                  boxShadow: "var(--v0-shadow-soft)",
                }}
              >
                {momentCopy.preserved}
              </span>
              <button
                type="button"
                onClick={() => setIsKipOpen(!isKipOpen)}
                className="inline-flex items-center justify-center rounded-full border p-1 text-[10px] font-medium transition-colors opacity-60 hover:opacity-80"
                style={{
                  borderColor: "var(--v0-border-soft)",
                  color: "var(--v0-ink-tertiary)",
                  backgroundColor: "var(--v0-surface-paper)",
                  boxShadow: "var(--v0-shadow-soft)",
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
              backgroundColor: "var(--v0-surface-paper)",
              borderColor: "var(--v0-border-soft)",
              boxShadow: "var(--v0-shadow-soft)",
              color: "var(--v0-ink-primary)",
            }}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "var(--v0-ink-secondary)" }}>
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
            <p className="text-xs" style={{ color: "var(--v0-ink-tertiary)" }}>
              {momentCopy.kipPlaceholder}
            </p>
          </div>
        </>
      )}
    </main>
    </StyleScope>
  )
}

