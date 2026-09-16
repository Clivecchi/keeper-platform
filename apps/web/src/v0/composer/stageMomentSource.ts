/**
 * Render-time overlay: a filmstrip slide with source.kind === 'moment'
 * presents the live Moment row, not the copied title/body stored on Stage.
 * Does not write Stage composition.
 */

import type { StageStorySlide } from "@keeper/shared"

export const MOMENT_SOURCE_LOADING_TITLE = "Loading Moment…"
export const MOMENT_SOURCE_UNRESOLVED_TITLE = "Moment unavailable"
export const MOMENT_SOURCE_UNRESOLVED_BODY =
  "This Moment could not be found. The Stage still holds the reference."

export type StageSlideSourceResolve = "copied" | "live" | "loading" | "unresolved"

export type StageSlide = StageStorySlide & {
  sourceResolve?: StageSlideSourceResolve
}

export type CanonicalMomentContent = {
  id: string
  title: string
  narrative: string
}

export type MomentSourceLookup =
  | { status: "live"; moment: CanonicalMomentContent }
  | { status: "unresolved" }

export function momentSourceId(slide: Pick<StageStorySlide, "source">): string | null {
  if (slide.source?.kind !== "moment") return null
  const id = slide.source.id?.trim()
  return id ? id : null
}

export function collectMomentSourceIds(
  slides: ReadonlyArray<Pick<StageStorySlide, "source">> | null | undefined,
): string[] {
  if (!slides?.length) return []
  const ids: string[] = []
  const seen = new Set<string>()
  for (const slide of slides) {
    const id = momentSourceId(slide)
    if (!id || seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  return ids
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function readMomentRecord(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null
  if (isRecord(raw.moment)) return raw.moment
  if (isRecord(raw.data)) return raw.data
  return raw
}

/** Parse GET /api/moments/:id (and v0-shaped) into a lookup row. */
export function parseCanonicalMomentResponse(raw: unknown, expectedId: string): MomentSourceLookup {
  const id = expectedId.trim()
  if (!id) return { status: "unresolved" }
  const record = readMomentRecord(raw)
  if (!record) return { status: "unresolved" }
  const foundId = typeof record.id === "string" ? record.id.trim() : ""
  if (foundId !== id) return { status: "unresolved" }
  const title = typeof record.title === "string" ? record.title.trim() : ""
  const narrative =
    typeof record.narrative === "string"
      ? record.narrative
      : typeof record.body === "string"
        ? record.body
        : ""
  return {
    status: "live",
    moment: {
      id,
      title: title || "Untitled Moment",
      narrative,
    },
  }
}

function withSource(slide: StageStorySlide, id: string | null): StageStorySlide["source"] {
  if (slide.source?.kind === "moment") {
    return { kind: "moment", id: id ?? slide.source.id ?? null }
  }
  return slide.source
}

export function applyCanonicalMomentToSlide(
  slide: StageStorySlide,
  lookup: ReadonlyMap<string, MomentSourceLookup>,
  pending: boolean,
): StageSlide {
  if (slide.source?.kind !== "moment") {
    return slide
  }

  const id = momentSourceId(slide)
  if (!id) {
    return {
      ...slide,
      title: MOMENT_SOURCE_UNRESOLVED_TITLE,
      body: MOMENT_SOURCE_UNRESOLVED_BODY,
      source: withSource(slide, null),
      sourceResolve: "unresolved",
    }
  }

  const row = lookup.get(id)
  if (row?.status === "live") {
    return {
      ...slide,
      title: row.moment.title,
      body: row.moment.narrative,
      source: { kind: "moment", id },
      sourceResolve: "live",
    }
  }

  if (row?.status === "unresolved") {
    return {
      ...slide,
      title: MOMENT_SOURCE_UNRESOLVED_TITLE,
      body: MOMENT_SOURCE_UNRESOLVED_BODY,
      source: { kind: "moment", id },
      sourceResolve: "unresolved",
    }
  }

  if (pending) {
    return {
      ...slide,
      title: MOMENT_SOURCE_LOADING_TITLE,
      body: "",
      source: { kind: "moment", id },
      sourceResolve: "loading",
    }
  }

  return {
    ...slide,
    title: MOMENT_SOURCE_UNRESOLVED_TITLE,
    body: MOMENT_SOURCE_UNRESOLVED_BODY,
    source: { kind: "moment", id },
    sourceResolve: "unresolved",
  }
}

export function applyCanonicalMomentsToSlides(
  slides: ReadonlyArray<StageStorySlide>,
  lookup: ReadonlyMap<string, MomentSourceLookup>,
  pending: boolean,
): StageSlide[] {
  return slides.map((slide) => applyCanonicalMomentToSlide(slide, lookup, pending))
}
