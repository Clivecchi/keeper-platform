"use client"

import * as React from "react"
import type { StageSlide } from "./stageFilmstrip"

function SlideScene({ slide }: { slide: StageSlide }) {
  return (
    <article
      className="keeper-stage-slide"
      aria-label={`${slide.kind === "title" ? "Title" : "Beat"} slide`}
    >
      <p
        className="text-[11px] uppercase tracking-[0.1em]"
        style={{ color: "hsl(var(--theme-ink-secondary))", margin: 0 }}
      >
        {slide.slideType.replace("_", " ")}
        {slide.kind === "title" ? " · 1" : ""}
      </p>
      <h2
        className="keeper-treatment-title mt-3 text-[28px] leading-tight"
        style={{ color: "hsl(var(--theme-ink-primary))", margin: 0 }}
      >
        {slide.title}
      </h2>
      {slide.body ? (
        <p
          className="mt-4 whitespace-pre-wrap text-[17px] leading-relaxed"
          style={{ color: "hsl(var(--theme-ink-primary))", margin: 0 }}
        >
          {slide.body}
        </p>
      ) : null}
    </article>
  )
}

export function StageFilmstrip({ slides }: { slides: ReadonlyArray<StageSlide> }) {
  const last = Math.max(0, slides.length - 1)
  const [index, setIndex] = React.useState(last)
  const current = slides[Math.min(index, last)] ?? slides[0]

  React.useEffect(() => {
    setIndex(Math.max(0, slides.length - 1))
  }, [slides.length, slides[slides.length - 1]?.body])

  if (!current) return null

  return (
    <div className="flex w-full max-w-3xl flex-col items-center gap-4">
      <nav aria-label="Story filmstrip" className="flex flex-wrap items-center justify-center gap-2">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-current={i === index ? "true" : undefined}
            className="rounded-md px-3 py-2 text-left"
            style={{
              minWidth: 88,
              border:
                i === index
                  ? "1px solid hsl(var(--theme-accent-primary))"
                  : "1px solid hsl(var(--theme-border-soft) / 0.7)",
              background:
                i === index
                  ? "hsl(var(--theme-surface-paper) / 0.88)"
                  : "hsl(var(--theme-surface-paper) / 0.45)",
              color: "hsl(var(--theme-ink-primary))",
            }}
          >
            <span
              className="block text-[10px] uppercase tracking-[0.08em]"
              style={{ color: "hsl(var(--theme-ink-secondary))" }}
            >
              {i + 1}
            </span>
            <span className="block max-w-[9rem] truncate text-[13px]">{slide.title}</span>
          </button>
        ))}
      </nav>
      <SlideScene slide={current} />
    </div>
  )
}
