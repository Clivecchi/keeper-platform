"use client"

import type React from "react"
import { CoverLens, type CoverLensItem } from "./cover-lens"

// Board Lens selects items; Cover Lens presents them; Cover Frame contains both.

const COVER_IMPRINT = "KE3P"
const COVER_TITLE = "Life Keeper"
const COVER_LINER =
  "A quiet cover for the keeper’s story—turn the page to the routes below to continue the journey."

const COVER_CONSTANTS = {
  pad: "clamp(1.5rem, 5vw, 3.25rem)",
  headerGap: "clamp(1.5rem, 3vw, 2.5rem)",
  imprintSize: "0.78rem",
  titleSize: "clamp(2rem, 4vw, 2.7rem)",
  linerSize: "1rem",
  ruleWidth: "3.25rem",
}

const COVER_ITEMS: CoverLensItem[] = [
  { title: "Moments", subtitle: "Captured pages, diary-first", affordance: "→" },
  { title: "Journeys", subtitle: "Connected arcs and threads", affordance: "→" },
  { title: "Paths", subtitle: "Waypoints with intent", affordance: "→" },
  { title: "Keeper", subtitle: "The vessel that holds it all", affordance: "→" },
]

export function CoverFrame() {
  return (
    <main
      className="min-h-screen text-foreground"
      style={{ backgroundColor: "hsl(var(--theme-surface-page))", color: "hsl(var(--theme-ink-primary))" }}
    >
      <div className="mx-auto w-full max-w-5xl space-y-10" style={{ padding: COVER_CONSTANTS.pad }}>
        {/* Cover Frame header */}
        <header className="space-y-4" aria-label="Cover Frame">
          <p
            className="uppercase tracking-[0.42em] text-center"
            style={{ fontSize: COVER_CONSTANTS.imprintSize, color: "hsl(var(--theme-ink-tertiary))" }}
          >
            {COVER_IMPRINT}
          </p>
          <div className="flex justify-center">
            <div
              className="h-px"
              style={{ width: COVER_CONSTANTS.ruleWidth, backgroundColor: "hsl(var(--theme-line-hairline))" }}
              aria-hidden
            />
          </div>
          <div className="space-y-3 text-center" style={{ gap: COVER_CONSTANTS.headerGap }}>
            <h1
              className="font-serif"
              style={{ fontSize: COVER_CONSTANTS.titleSize, letterSpacing: "0.01em", color: "hsl(var(--theme-ink-primary))" }}
            >
              {COVER_TITLE}
            </h1>
            <p
              className="leading-relaxed max-w-2xl mx-auto"
              style={{ fontSize: COVER_CONSTANTS.linerSize, color: "hsl(var(--theme-ink-secondary))" }}
            >
              {COVER_LINER}
            </p>
          </div>
        </header>

        {/* Cover Lens sits beneath header, single-column */}
        <section aria-label="Cover Lens">
          <CoverLens items={COVER_ITEMS} />
        </section>
      </div>
    </main>
  )
}

