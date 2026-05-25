import { types } from "@theatre/core"
import type { PresentMotionValues } from "./types"

export const PRESENCE_OBJECT_KEY = "Presence"

const INITIAL_MOTION: PresentMotionValues = {
  atmosphereOpacity: 0,
  primaryOpacity: 0,
  secondaryOpacity: 0,
  contextOpacity: 0,
  mediaScale: 1,
  contentOffsetY: 8,
  captionOpacity: 0,
}

/** Theatre prop definitions — shared by every Present sheet. */
export const PRESENT_MOTION_PROPS = {
  atmosphereOpacity: types.number(INITIAL_MOTION.atmosphereOpacity, {
    range: [0, 1],
    label: "Atmosphere",
  }),
  primaryOpacity: types.number(INITIAL_MOTION.primaryOpacity, {
    range: [0, 1],
    label: "Primary",
  }),
  secondaryOpacity: types.number(INITIAL_MOTION.secondaryOpacity, {
    range: [0, 1],
    label: "Secondary",
  }),
  contextOpacity: types.number(INITIAL_MOTION.contextOpacity, {
    range: [0, 1],
    label: "Context",
  }),
  mediaScale: types.number(INITIAL_MOTION.mediaScale, {
    range: [0.5, 1.5],
    label: "Media scale",
  }),
  contentOffsetY: types.number(INITIAL_MOTION.contentOffsetY, {
    range: [-40, 40],
    label: "Content offset Y",
  }),
  captionOpacity: types.number(INITIAL_MOTION.captionOpacity, {
    range: [0, 1],
    label: "Caption",
  }),
} as const

export type PresentMotionProps = typeof PRESENT_MOTION_PROPS
