/**
 * A promoted Frame.
 * Dialog and Stage are placements of the same telling.
 * Beats replace each other inside this viewport. Theatre plays the layers.
 * The conversation turn stays in the transcript.
 */

import * as React from "react"
import type { FrameCueAction, FramePerformance } from "@keeper/shared"
import { toPresentInstanceKey } from "../presents/presentInstanceKey"
import {
  captionMotionStyle,
  contextMotionStyle,
  primaryMotionStyle,
  secondaryMotionStyle,
} from "../presents/presentMotionStyles"
import {
  PresentMotionProvider,
  usePresentMotionValues,
} from "../presents/usePresentMotion"
import { useFrameCueHandlers } from "./frameCue"
import { loadSpatialFrameHost } from "./spatial/loadSpatialFrameHost"

export type FramePerformancePlacement = "dialog" | "stage"

export type FrameCastVoice = {
  slug?: string
  attributedTo?: string
  content: string
}

function voiceAccent(slug: string): string {
  let hash = 0
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const hue = hash % 360
  return `hsl(${hue} 38% 46%)`
}

function contextLine(performance: FramePerformance): string | null {
  const documentTitle = performance.context?.documentTitle?.trim()
  const sectionTitle = performance.context?.sectionTitle?.trim()
  if (documentTitle && sectionTitle) return `${documentTitle} › ${sectionTitle}`
  if (documentTitle) return documentTitle
  return null
}

function FrameBeat({
  performance,
  index,
  placement,
}: {
  performance: FramePerformance
  index: number
  placement: FramePerformancePlacement
}) {
  const motion = usePresentMotionValues()
  const beat = performance.beats[index]
  const context = contextLine(performance)
  if (!beat) return null
  const titleSize = placement === "stage" ? "text-[40px]" : "text-[34px]"
  const bodySize = placement === "stage" ? "text-[20px]" : "text-[18px]"

  return (
    <div className={placement === "stage" ? "px-2 py-6" : "px-2 py-4"}>
      {context ? (
        <p
          className="text-[11px] uppercase tracking-[0.14em]"
          style={{
            color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))",
            margin: 0,
            ...contextMotionStyle(motion),
          }}
        >
          {context}
        </p>
      ) : null}
      <h2
        className={`keeper-treatment-title mt-3 leading-tight ${titleSize}`}
        style={{
          color: "hsl(var(--theme-ink-primary))",
          marginTop: context ? undefined : 0,
          ...primaryMotionStyle(motion),
        }}
      >
        {beat.title}
      </h2>
      <p
        className={`mt-4 whitespace-pre-wrap leading-relaxed ${bodySize}`}
        style={{
          color: "hsl(var(--theme-ink-primary))",
          ...secondaryMotionStyle(motion),
        }}
      >
        {beat.body}
      </p>
      {beat.voice ? (
        <blockquote
          className="mt-5 border-l-2 pl-4 text-[15px] leading-relaxed"
          style={{
            borderColor: voiceAccent(beat.voice.slug),
            color: "hsl(var(--theme-ink-primary))",
            margin: 0,
            marginTop: "1.25rem",
            ...captionMotionStyle(motion),
          }}
        >
          <p style={{ margin: 0 }}>“{beat.voice.text}”</p>
          <footer
            className="mt-2 text-[12px]"
            style={{ color: voiceAccent(beat.voice.slug) }}
          >
            {beat.voice.attributedTo}
          </footer>
        </blockquote>
      ) : null}
    </div>
  )
}

export function FramePerformanceView({
  performance,
  placement,
  messageId,
  castVoices = [],
  spatial = false,
}: {
  performance: FramePerformance
  placement: FramePerformancePlacement
  messageId: string
  castVoices?: readonly FrameCastVoice[]
  /** Loads Three only when a composition opts in. The first frames leave this off. */
  spatial?: boolean
}) {
  const cues = useFrameCueHandlers()
  const [SpatialHost, setSpatialHost] = React.useState<React.ComponentType | null>(null)

  React.useEffect(() => {
    if (!spatial) return
    let cancelled = false
    void loadSpatialFrameHost().then((Host) => {
      if (!cancelled) setSpatialHost(() => Host)
    })
    return () => {
      cancelled = true
    }
  }, [spatial])
  const [index, setIndex] = React.useState(0)
  const [reviewingCast, setReviewingCast] = React.useState(false)
  const beatCount = performance.beats.length
  const beat = performance.beats[Math.min(index, beatCount - 1)]
  const beatKey = beat ? `${messageId}:${index}:${beat.title}` : messageId

  const runCue = (action: FrameCueAction) => {
    if (action.kind === "review_cast") {
      setReviewingCast((open) => !open)
      return
    }
    if (action.kind === "open_stage") {
      cues.onOpenStagePerformance?.(messageId, performance)
      return
    }
    if (action.kind === "keep" && action.pointId && action.draftId) {
      cues.onAcceptDraftPoint?.(action.draftId, action.pointId)
      return
    }
    if (action.kind === "open_point" && action.pointId && action.draftId) {
      cues.onOpenPoint?.({
        draftId: action.draftId,
        pointId: action.pointId,
        kind: "document_manuscript",
        dialogId: action.dialogId ?? null,
      })
    }
  }

  return (
    <section
      aria-label={performance.title}
      data-frame-performance={placement}
      data-frame-point={performance.title}
      className={
        placement === "dialog"
          ? "flex h-full min-h-0 w-full flex-col justify-center px-[8%] py-16"
          : "flex h-full min-h-[28rem] w-full flex-col justify-center px-8 py-10"
      }
    >
      <PresentMotionProvider
        key={beatKey}
        present="frame"
        instanceKey={toPresentInstanceKey("frame", beatKey)}
        enabled
      >
        <FrameBeat performance={performance} index={Math.min(index, beatCount - 1)} placement={placement} />
      </PresentMotionProvider>

      {beatCount > 1 ? (
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            aria-label="Previous beat"
            disabled={index <= 0}
            onClick={() => setIndex((current) => Math.max(0, current - 1))}
            className="text-[12px] disabled:opacity-30"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            Back
          </button>
          <p
            className="text-[11px] tabular-nums tracking-[0.08em]"
            style={{ color: "hsl(var(--theme-ink-tertiary, var(--theme-ink-secondary)))", margin: 0 }}
          >
            {Math.min(index, beatCount - 1) + 1} / {beatCount}
          </p>
          <button
            type="button"
            aria-label="Next beat"
            disabled={index >= beatCount - 1}
            onClick={() => setIndex((current) => Math.min(beatCount - 1, current + 1))}
            className="text-[12px] disabled:opacity-30"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            Forward
          </button>
        </div>
      ) : null}

      {performance.cue ? (
        <div className="mt-5 border-t pt-3" style={{ borderColor: "hsl(var(--theme-border-soft))" }}>
          <p
            className="text-[13px]"
            style={{ color: "hsl(var(--theme-ink-secondary))", margin: 0 }}
          >
            {performance.cue.prompt}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {performance.cue.actions.map((action) => (
              <button
                key={action.kind}
                type="button"
                className="text-[12px] underline-offset-4 hover:underline"
                style={{ color: "hsl(var(--theme-ink-primary))" }}
                onClick={() => runCue(action)}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {SpatialHost ? <SpatialHost /> : null}

      {reviewingCast && castVoices.length > 0 ? (
        <div className="mt-4 space-y-3" aria-label="Cast contributions">
          {castVoices.map((voice, voiceIndex) => (
            <p
              key={`${voice.slug ?? voice.attributedTo ?? "voice"}-${voiceIndex}`}
              className="text-[13px] leading-relaxed"
              style={{ color: "hsl(var(--theme-ink-secondary))", margin: 0 }}
            >
              <span style={{ color: voiceAccent(voice.slug ?? "cast") }}>
                {voice.attributedTo ?? "Cast"}
              </span>
              {" — "}
              {voice.content}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  )
}
