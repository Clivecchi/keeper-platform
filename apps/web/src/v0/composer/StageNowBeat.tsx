"use client"

import * as React from "react"
import type { StageNowBeatModel } from "./stageNowBeat"

function excerpt(text: string, max = 520): string {
  if (text.length <= max) return text
  return `${text.slice(0, max).trimEnd()}…`
}

export function StageNowBeat({
  beat,
  waiting,
}: {
  beat: StageNowBeatModel
  waiting: boolean
}) {
  const hasStory = Boolean(beat.you || beat.answer)

  return (
    <section
      className="keeper-stage-now"
      aria-label="Now on Stage"
      style={{
        pointerEvents: "auto",
        width: "min(36rem, 86%)",
        maxHeight: "62%",
        overflow: "auto",
        borderRadius: 18,
        padding: "22px 26px 24px",
        background: "hsl(var(--theme-surface-paper) / 0.78)",
        border: "1px solid hsl(var(--theme-border-soft) / 0.55)",
        boxShadow: "0 18px 50px hsl(var(--theme-ink-primary) / 0.16)",
      }}
    >
      <p
        className="text-[11px] uppercase tracking-[0.1em]"
        style={{ color: "hsl(var(--theme-ink-secondary))", margin: 0 }}
      >
        Now
      </p>

      {!hasStory ? (
        <p
          className="keeper-treatment-title mt-3 text-[20px] leading-snug"
          style={{ color: "hsl(var(--theme-ink-primary))" }}
        >
          The story is not on yet. Speak from the lectern.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-5">
          {beat.you ? (
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.08em]"
                style={{ color: "hsl(var(--theme-ink-secondary))", margin: 0 }}
              >
                {beat.you.name}
              </p>
              <p
                className="mt-1 text-[17px] leading-relaxed"
                style={{ color: "hsl(var(--theme-ink-primary))", margin: 0 }}
              >
                {excerpt(beat.you.text)}
              </p>
            </div>
          ) : null}
          {waiting && !beat.answer ? (
            <p
              className="text-[15px] italic"
              style={{ color: "hsl(var(--theme-ink-secondary))", margin: 0 }}
            >
              The room is answering…
            </p>
          ) : beat.answer ? (
            <div>
              <p
                className="text-[11px] uppercase tracking-[0.08em]"
                style={{ color: "hsl(var(--theme-ink-secondary))", margin: 0 }}
              >
                {beat.answer.name}
              </p>
              <p
                className="keeper-treatment-title mt-1 text-[20px] leading-snug"
                style={{ color: "hsl(var(--theme-ink-primary))", margin: 0 }}
              >
                {excerpt(beat.answer.text)}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </section>
  )
}
