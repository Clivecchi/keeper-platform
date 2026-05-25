import type { CSSProperties } from "react"
import type { PresentMotionValues } from "./types"

export function atmosphereMotionStyle(
  motion: PresentMotionValues,
): CSSProperties {
  return {
    opacity: motion.atmosphereOpacity,
    pointerEvents: "none",
  }
}

export function primaryMotionStyle(motion: PresentMotionValues): CSSProperties {
  return {
    opacity: motion.primaryOpacity,
    transform: `translateY(${motion.contentOffsetY}px)`,
  }
}

export function secondaryMotionStyle(
  motion: PresentMotionValues,
): CSSProperties {
  return { opacity: motion.secondaryOpacity }
}

export function contextMotionStyle(motion: PresentMotionValues): CSSProperties {
  return { opacity: motion.contextOpacity }
}

export function captionMotionStyle(motion: PresentMotionValues): CSSProperties {
  return { opacity: motion.captionOpacity }
}

export function mediaMotionStyle(motion: PresentMotionValues): CSSProperties {
  return {
    opacity: motion.primaryOpacity,
    transform: `scale(${motion.mediaScale})`,
    transformOrigin: "center center",
  }
}
