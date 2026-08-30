"use client"

import * as React from "react"
import type { StageNowBeatModel } from "./stageNowBeat"

function excerpt(text: string, max = 280): string {
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
        pointerEvents: "none",
        width: "min(40rem, 92%)",
        maxHeight: "42%",
        overflow: "hidden",
        padding: "8px 4px 0",
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
