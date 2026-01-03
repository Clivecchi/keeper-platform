"use client"

import type { CSSProperties } from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { MessageSquare, X } from "lucide-react"

export function MomentFrame() {
  const navigate = useNavigate()
  const [content, setContent] = useState("")

  const lineHeight = 32 // px, keep in sync with ruled lines via --moment-line-step

  return (
    <main
      className="relative min-h-screen text-foreground flex items-center justify-center px-4 pt-6 pb-4"
      style={{ backgroundColor: "hsl(var(--theme-surface-page))", color: "hsl(var(--theme-ink-primary))" }}
    >
      <div className="relative w-full max-w-4xl">

        <button
          type="button"
          aria-label="Close moment"
          onClick={() => navigate({ pathname: "/v0", search: "?frame=cover" })}
          className="absolute -top-1 right-0 inline-flex items-center justify-center rounded-sm border border-transparent text-muted-foreground/60 hover:text-foreground hover:border-muted/60 bg-white/60 backdrop-blur transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary focus-visible:ring-offset-background p-2 shadow-sm"
        >
          <X className="w-4 h-4" strokeWidth={1.25} />
        </button>

        <div className="space-y-3 mt-6">
          <header
            className="px-1 pr-16 flex items-start justify-between text-[13px] gap-3 leading-snug"
            style={{ color: "hsl(var(--theme-ink-tertiary))" }}
          >
            <div className="space-y-1 min-w-0">
              <span className="block text-[11px] tracking-[0.22em] uppercase" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
                Moment Diary
              </span>
              <span className="block text-[12px]" style={{ color: "hsl(var(--theme-ink-secondary))" }}>
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <span className="text-[11px] tracking-[0.22em] uppercase leading-relaxed" style={{ color: "hsl(var(--theme-ink-tertiary))" }}>
              Keeper
            </span>
          </header>

          <div
            className="relative rounded-sm border bg-white/92 overflow-hidden flex flex-col"
            style={{
              backgroundColor: "hsl(var(--theme-surface-paper))",
              borderColor: "hsl(var(--theme-border-soft))",
              boxShadow: "var(--theme-shadow-soft)",
              color: "hsl(var(--theme-ink-primary))",
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.6) 0, transparent 45%), radial-gradient(circle at 80% 10%, rgba(255,255,255,0.35) 0, transparent 40%)",
            }}
          >
            <div
              className="flex-1 overflow-auto"
              style={
                {
                  "--moment-line-step": `${lineHeight}px`,
                  "--moment-rule-color": "hsl(var(--theme-line-ruled) / 0.18)",
                  backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent calc(var(--moment-line-step) - 1px), var(--moment-rule-color) calc(var(--moment-line-step) - 1px), var(--moment-rule-color) var(--moment-line-step))`,
                  backgroundAttachment: "local",
                } as CSSProperties
              }
            >
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Begin writing…"
                className="w-full h-full min-h-[520px] bg-transparent outline-none resize-none px-6 md:px-8 pb-10 text-[15.5px] text-[hsl(var(--theme-ink-primary))] placeholder:text-[hsl(var(--theme-ink-placeholder))] border-0"
                style={{
                  lineHeight: "var(--moment-line-step)",
                  paddingTop: "calc(var(--moment-line-step))",
                  paddingBottom: "calc(var(--moment-line-step))",
                  fontFamily: "var(--font-family-sans, Inter, system-ui, sans-serif)",
                }}
              />
            </div>

            <div
              className="flex items-center justify-end gap-3 px-6 md:px-8 py-4 text-[11px]"
              style={{ color: "hsl(var(--theme-ink-tertiary))", borderTop: `1px solid hsl(var(--theme-border-soft))` }}
            >
              <div className="flex flex-col items-end gap-2">
                <span
                  className="rounded-full px-4 py-2"
                  style={{
                    backgroundColor: "hsl(var(--theme-surface-paper) / 0.8)",
                    color: "hsl(var(--theme-ink-secondary))",
                    boxShadow: "var(--theme-shadow-soft)",
                  }}
                >
                  {content.trim().length ? `${content.trim().split(/\s+/).filter(Boolean).length} words kept` : "0 words kept"}
                </span>
                <span
                  className="rounded-full px-4 py-2 italic"
                  style={{
                    backgroundColor: "hsl(var(--theme-surface-paper) / 0.8)",
                    color: "hsl(var(--theme-ink-tertiary))",
                    boxShadow: "var(--theme-shadow-soft)",
                    fontSize: "10.5px",
                  }}
                >
                  Your words are being preserved
                </span>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border px-3 py-[6px] text-[12px] font-medium transition-colors"
                style={{
                  borderColor: "hsl(var(--theme-border-soft))",
                  color: "hsl(var(--theme-ink-secondary))",
                  backgroundColor: "hsl(var(--theme-surface-paper) / 0.75)",
                }}
                aria-label="Open Kip companion"
              >
                <MessageSquare className="h-4 w-4" strokeWidth={1.35} />
                <span>Kip</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

