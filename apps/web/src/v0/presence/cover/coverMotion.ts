"use client"

import * as React from "react"
import {
  animate,
  useMotionValue,
  useTransform,
  useReducedMotion,
  type MotionValue,
} from "framer-motion"
import type { CoverMotionValues } from "./coverTypes"

const INITIAL: CoverMotionValues = {
  atmosphereOpacity: 0,
  nameReveal: 0,
  statusPulse: 0,
  heroEntrance: 0,
}

const SETTLED: CoverMotionValues = {
  atmosphereOpacity: 1,
  nameReveal: 1,
  statusPulse: 1,
  heroEntrance: 1,
}

export interface UseCoverMotionResult {
  /** Raw motion values for Framer Motion bindings */
  values: {
    atmosphereOpacity: MotionValue<number>
    nameReveal: MotionValue<number>
    statusPulse: MotionValue<number>
    heroEntrance: MotionValue<number>
  }
  /** Derived transforms */
  heroY: MotionValue<number>
  nameOpacity: MotionValue<number>
  glowScale: MotionValue<number>
}

function snapVisibleEntrance(
  atmosphereOpacity: MotionValue<number>,
  nameReveal: MotionValue<number>,
  heroEntrance: MotionValue<number>,
): void {
  atmosphereOpacity.set(SETTLED.atmosphereOpacity)
  nameReveal.set(SETTLED.nameReveal)
  heroEntrance.set(SETTLED.heroEntrance)
}

export function useCoverMotion(instanceKey: string): UseCoverMotionResult {
  const reducedMotion = useReducedMotion()
  const atmosphereOpacity = useMotionValue(INITIAL.atmosphereOpacity)
  const nameReveal = useMotionValue(INITIAL.nameReveal)
  const statusPulse = useMotionValue(INITIAL.statusPulse)
  const heroEntrance = useMotionValue(INITIAL.heroEntrance)

  const heroY = useTransform(heroEntrance, [0, 1], [12, 0])
  const nameOpacity = useTransform(nameReveal, [0, 1], [0, 1])
  const glowScale = useTransform(statusPulse, [0, 1], [0.92, 1.08])

  React.useEffect(() => {
    atmosphereOpacity.set(INITIAL.atmosphereOpacity)
    nameReveal.set(INITIAL.nameReveal)
    statusPulse.set(INITIAL.statusPulse)
    heroEntrance.set(INITIAL.heroEntrance)

    if (reducedMotion) {
      snapVisibleEntrance(atmosphereOpacity, nameReveal, heroEntrance)
      statusPulse.set(SETTLED.statusPulse)
      return
    }

    const controls = [
      animate(atmosphereOpacity, SETTLED.atmosphereOpacity, {
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }),
      animate(heroEntrance, SETTLED.heroEntrance, {
        duration: 0.65,
        delay: 0.08,
        ease: [0.22, 1, 0.36, 1],
      }),
      animate(nameReveal, SETTLED.nameReveal, {
        duration: 0.5,
        delay: 0.22,
        ease: [0.22, 1, 0.36, 1],
      }),
      animate(statusPulse, SETTLED.statusPulse, {
        duration: 1.4,
        delay: 0.35,
        ease: "easeInOut",
        repeat: Infinity,
        repeatType: "reverse",
      }),
    ]

    // If entrance animations are interrupted (remount, strict mode, panel refresh),
    // never leave the cover card stuck at opacity 0.
    const safetyTimer = window.setTimeout(() => {
      snapVisibleEntrance(atmosphereOpacity, nameReveal, heroEntrance)
    }, 900)

    return () => {
      window.clearTimeout(safetyTimer)
      controls.forEach((c) => c.stop())
    }
  }, [instanceKey, reducedMotion, atmosphereOpacity, heroEntrance, nameReveal, statusPulse])

  return {
    values: { atmosphereOpacity, nameReveal, statusPulse, heroEntrance },
    heroY,
    nameOpacity,
    glowScale,
  }
}
