/**
 * Surfaced-object look — overlay on the Domain atmosphere.
 *
 * Hierarchy:
 *   1. Domain cover image → Domain Treatment + theme colors (the floor)
 *   2. The Chronicle / Present subject overlays while it is surfaced
 *      (Library image → extracted palette + that image as atmosphere)
 *   3. Moment → Path → Journey → Keeper theme_id still walks over Domain tokens
 *   4. Cast / instruments never change atmosphere
 */

import type { ExtractedImagePalette } from "@keeper/shared"

export type SurfaceLookSource = "domain" | "library"

export type SurfaceLook = {
  source: SurfaceLookSource
  subjectId: string | null
  atmosphereUrl: string | null
  palette: ExtractedImagePalette | null
}

const DOMAIN_LOOK: SurfaceLook = {
  source: "domain",
  subjectId: null,
  atmosphereUrl: null,
  palette: null,
}

let current: SurfaceLook = DOMAIN_LOOK
let version = 0
const listeners = new Set<() => void>()

function emit(): void {
  version += 1
  for (const listener of listeners) listener()
}

export function getSurfaceLook(): SurfaceLook {
  return current
}

export function getSurfaceLookVersion(): number {
  return version
}

export function subscribeSurfaceLook(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setSurfaceLook(next: SurfaceLook): void {
  const same =
    current.source === next.source &&
    current.subjectId === next.subjectId &&
    current.atmosphereUrl === next.atmosphereUrl &&
    current.palette?.background === next.palette?.background &&
    current.palette?.accent === next.palette?.accent
  if (same) return
  current = next
  emit()
}

export function clearSurfaceLook(): void {
  if (current.source === "domain" && !current.atmosphereUrl) return
  current = DOMAIN_LOOK
  emit()
}
