/**
 * Compose-on-Stage yield — interaction state above Theatre.
 *
 * Scene stays experiential. This is not a persisted Scene model.
 * Theatre performs Presence props; this file only resolves the pose.
 */

import { type PresentMotionValues } from "../presents/types"

export type StageComposePose = "present" | "yield"

export type HeldStageFrame = {
  id: string
  index: number
}

/** Bounded Presence values Theatre performs when Composer is the working context. */
export const STAGE_YIELD_MOTION: PresentMotionValues = {
  atmosphereOpacity: 0.42,
  primaryOpacity: 0.3,
  secondaryOpacity: 0.24,
  contextOpacity: 0.22,
  captionOpacity: 0.22,
  mediaScale: 0.94,
  contentOffsetY: 16,
}

export function resolveStageComposePose(forward: boolean): PresentMotionValues | null {
  return forward ? STAGE_YIELD_MOTION : null
}

export function holdStageFrame(
  current: { id: string } | null,
  index: number,
): HeldStageFrame | null {
  if (!current?.id) return null
  return { id: current.id, index }
}

export function restoreHeldStageIndex(
  slides: ReadonlyArray<{ id: string }>,
  held: HeldStageFrame | null,
): number | null {
  if (!held || slides.length === 0) return null
  const byId = slides.findIndex((slide) => slide.id === held.id)
  if (byId >= 0) return byId
  return Math.min(Math.max(0, held.index), slides.length - 1)
}

/** Keep the held Frame while yielded. Do not follow a newly laid-out last slide. */
export function nextStageFrameIndex(input: {
  composeForward: boolean
  held: HeldStageFrame | null
  slides: ReadonlyArray<{ id: string }>
  followStory: boolean
  last: number
  currentIndex: number
}): number {
  if (input.composeForward) {
    return restoreHeldStageIndex(input.slides, input.held) ?? Math.min(input.currentIndex, input.last)
  }
  if (input.followStory && input.last > 0) return input.last
  return Math.min(input.currentIndex, input.last)
}

/** Return is intentional and waits until the Turn is no longer working. */
export function canReturnFromStageCompose(isWorking: boolean): boolean {
  return !isWorking
}

/**
 * Sticky work-forward on Stage.
 * Focus or working may enter. Blur does not exit. Return is intentional.
 */
export function nextStageComposeForward(input: {
  currentlyForward: boolean
  onStage: boolean
  composerFocused: boolean
  isWorking: boolean
  returnRequested: boolean
}): boolean {
  if (!input.onStage || input.returnRequested) return false
  if (input.currentlyForward) return true
  return input.composerFocused || input.isWorking
}

