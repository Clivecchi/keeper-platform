"use client"

import * as React from "react"
import {
  VOICE_PROMPT_SECTIONS,
  type VoicePromptSectionKey,
} from "./voicePromptSections"

export interface TrainingFilmStripProps {
  activeFrame: VoicePromptSectionKey
  onFrameSelect: (frame: VoicePromptSectionKey) => void
  /** Optional per-frame hint — e.g. has unsaved content */
  frameHints?: Partial<Record<VoicePromptSectionKey, boolean>>
}

export function TrainingFilmStrip({
  activeFrame,
  onFrameSelect,
  frameHints,
}: TrainingFilmStripProps) {
  const stripRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const node = stripRef.current?.querySelector<HTMLElement>(
      `[data-training-frame="${activeFrame}"]`,
    )
    node?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" })
  }, [activeFrame])

  return (
    <div
      className="shrink-0 px-3 pt-3 pb-2"
      style={{ borderBottom: "1px solid hsl(var(--theme-border-soft) / 0.35)" }}
    >
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.14em] mb-2 px-0.5"
        style={{ color: "hsl(var(--theme-ink-tertiary))" }}
      >
        Training storyboard
      </p>
      <div
        ref={stripRef}
        className="flex gap-2 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "thin" }}
        role="tablist"
        aria-label="Training frames"
      >
        {VOICE_PROMPT_SECTIONS.map((section, index) => {
          const isActive = section.key === activeFrame
          const hasContent = frameHints?.[section.key] === true
          return (
            <button
              key={section.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-training-frame={section.key}
              onClick={() => onFrameSelect(section.key)}
              className="shrink-0 flex flex-col items-start rounded-lg border px-3 py-2 min-w-[7.5rem] max-w-[9rem] text-left transition-all"
              style={{
                borderColor: isActive
                  ? "hsl(var(--theme-accent-primary, var(--theme-ink-primary)) / 0.55)"
                  : "hsl(var(--theme-border-soft) / 0.45)",
                background: isActive
                  ? "hsl(var(--theme-accent-primary, var(--theme-ink-primary)) / 0.12)"
                  : "hsl(var(--theme-surface-elevated) / 0.08)",
                boxShadow: isActive
                  ? "0 0 0 1px hsl(var(--theme-accent-primary, var(--theme-ink-primary)) / 0.2)"
                  : undefined,
              }}
            >
              <span
                className="text-[9px] font-mono uppercase tracking-widest mb-1"
                style={{ color: "hsl(var(--theme-ink-tertiary))" }}
              >
                Frame {index + 1}
              </span>
              <span
                className="text-[12px] font-semibold leading-tight"
                style={{
                  color: isActive
                    ? "hsl(var(--theme-ink-primary))"
                    : "hsl(var(--theme-ink-secondary))",
                }}
              >
                {section.stripLabel}
              </span>
              {hasContent && !isActive && (
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: "hsl(var(--theme-status-success, 152 69% 43%))" }}
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
