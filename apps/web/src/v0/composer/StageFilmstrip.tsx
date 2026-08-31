"use client"

import * as React from "react"
import { toPresentInstanceKey } from "../presents/presentInstanceKey"
import {
  captionMotionStyle,
  primaryMotionStyle,
  secondaryMotionStyle,
} from "../presents/presentMotionStyles"
import {
  PresentMotionProvider,
  usePresentMotionValues,
} from "../presents/usePresentMotion"
import { JourneyInvitationSlide } from "../slides/JourneyInvitationSlide"
import { useV0ShellOptional } from "../shell/V0ShellContext"
import { StageEngagementSurface, useStageCoverMedia } from "./StageEngagementSurface"
import type { StageSlide } from "./stageFilmstrip"
import { useStagePresentationOptional } from "./stagePresentation"

function SlideScene({
  slide,
  onForward,
  onContinue,
  forwardDisabled,
}: {
  slide: StageSlide
  onForward?: () => void
  onContinue?: () => void
  forwardDisabled?: boolean
}) {
  const motion = usePresentMotionValues()
  const shell = useV0ShellOptional()
  const cover = useStageCoverMedia()

  if (slide.kind === "root") {
    return (
      <StageEngagementSurface mediaUrl={cover.url} mediaMode={cover.mode}>
        <JourneyInvitationSlide
          wordmark={slide.title}
          tagline={slide.body}
          forwardLabel={shell?.domainFrame?.forward.label ?? "Forward"}
          onForward={() => onForward?.()}
          forwardDisabled={forwardDisabled}
        />
      </StageEngagementSurface>
    )
  }

  return (
    <StageEngagementSurface mediaUrl={cover.url} mediaMode={cover.mode}>
      <article aria-label="Story engagement">
        <p
          className="text-[11px] uppercase tracking-[0.1em]"
          style={{
            color: "hsl(var(--theme-ink-secondary))",
            margin: 0,
            ...captionMotionStyle(motion),
          }}
        >
          Engagement
        </p>
        <h2
          className="keeper-treatment-title mt-4 text-[32px] leading-tight"
          style={{
            color: "hsl(var(--theme-ink-primary))",
            margin: 0,
            ...primaryMotionStyle(motion),
          }}
        >
          {slide.title}
        </h2>
        {slide.body ? (
          <p
            className="mt-5 whitespace-pre-wrap text-[18px] leading-relaxed"
            style={{
              color: "hsl(var(--theme-ink-primary))",
              margin: 0,
              ...secondaryMotionStyle(motion),
            }}
          >
            {slide.body}
          </p>
        ) : null}
        {onContinue ? (
          <button
            type="button"
            onClick={onContinue}
            className="mt-8 rounded-full border px-5 py-2 text-[11px] font-medium uppercase tracking-[0.12em]"
            style={{
              borderColor: "var(--theme-border-soft)",
              backgroundColor: "hsl(var(--theme-surface-paper) / 0.7)",
              color: "var(--theme-ink-primary)",
            }}
          >
            Continue
          </button>
        ) : null}
      </article>
    </StageEngagementSurface>
  )
}

/** Big screen — current Slide only. Objects do not live here. */
export function StagePresentationScreen() {
  const story = useStagePresentationOptional()
  const current = story?.current
  if (!current) return null

  const canForward = Boolean(story && story.slides.length > 1)
  const canContinue = Boolean(story && story.index < story.slides.length - 1)

  return (
    <div className="h-full min-h-0 w-full" aria-label="Stage presentation">
      <PresentMotionProvider
        key={current.id}
        present="slide"
        instanceKey={toPresentInstanceKey("stage", current.id)}
        enabled
      >
        <SlideScene
          slide={current}
          onForward={current.kind === "root" && canForward ? () => story?.setIndex(1) : undefined}
          onContinue={
            current.kind === "beat" && canContinue
              ? () => story?.setIndex(story.index + 1)
              : undefined
          }
          forwardDisabled={!canForward}
        />
      </PresentMotionProvider>
    </div>
  )
}

/** Filmstrip cells — sit just above Composer. */
export function StageSlideStrip() {
  const story = useStagePresentationOptional()
  if (!story || story.slides.length === 0) return null

  return (
    <nav aria-label="Story filmstrip" className="flex flex-wrap items-center gap-2 px-1 pb-2">
      {story.slides.map((slide, i) => (
        <button
          key={slide.id}
          type="button"
          onClick={() => story.setIndex(i)}
          aria-current={i === story.index ? "true" : undefined}
          className="rounded-md px-3 py-2 text-left"
          style={{
            minWidth: 88,
            border:
              i === story.index
                ? "1px solid hsl(var(--theme-accent-primary))"
                : "1px solid hsl(var(--theme-border-soft) / 0.7)",
            background:
              i === story.index
                ? "hsl(var(--theme-surface-paper) / 0.88)"
                : "hsl(var(--theme-surface-paper) / 0.45)",
            color: "hsl(var(--theme-ink-primary))",
          }}
        >
          <span
            className="block text-[10px] uppercase tracking-[0.08em]"
            style={{ color: "hsl(var(--theme-ink-secondary))" }}
          >
            {slide.kind === "root" ? "Root" : String(i)}
          </span>
          <span className="block max-w-[9rem] truncate text-[13px]">{slide.title}</span>
        </button>
      ))}
    </nav>
  )
}
