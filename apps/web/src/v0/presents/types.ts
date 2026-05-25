/**
 * Presents — named forms objects inhabit when surfacing to an audience.
 * PresentName is intentionally open; the catalog grows as content demands it.
 */

export type PresentName =
  | "cover"
  | "slide"
  | "media"
  | "journey"
  | "moment"
  | string

/** Where the object is appearing — distinct from Present (how it presents). */
export type RenderContext = "chronicle" | "feed" | "journey" | string

/** Values Theatre.js plays; KeeperPresence listens — never branches on present name. */
export interface PresentMotionValues {
  atmosphereOpacity: number
  primaryOpacity: number
  secondaryOpacity: number
  contextOpacity: number
  mediaScale: number
  contentOffsetY: number
  captionOpacity: number
}

export const DEFAULT_PRESENT_MOTION_VALUES: PresentMotionValues = {
  atmosphereOpacity: 1,
  primaryOpacity: 1,
  secondaryOpacity: 1,
  contextOpacity: 1,
  mediaScale: 1,
  contentOffsetY: 0,
  captionOpacity: 1,
}

export function resolvePresentForObject(
  objectType: string,
  present?: PresentName,
): PresentName {
  if (present) return present
  switch (objectType) {
    case "domain":
      return "cover"
    case "journey":
      return "journey"
    case "moment":
      return "moment"
    default:
      return "slide"
  }
}
