/**
 * Stage attention grammar — above Theatre, not a Scene model.
 *
 * Present → Engage → Yield → Perform → Resolve → Return
 *
 * Dialog is the first occupant. Other subjects can use the same states later.
 * Theatre performs bounded Presence props; this file only resolves attention.
 */

import { type PresentMotionValues } from "../presents/types"

export const STAGE_ATTENTION_STATES = [
  "present",
  "engage",
  "yield",
  "perform",
  "resolve",
] as const

export type StageAttentionState = (typeof STAGE_ATTENTION_STATES)[number]

export const STAGE_ATTENTION_SUBJECTS = ["dialog"] as const

export type StageAttentionSubject = (typeof STAGE_ATTENTION_SUBJECTS)[number]

export type StageAttentionEvent =
  | "engage"
  | "yielded"
  | "working"
  | "idle"
  | "return"
  | "leave-stage"

export type HeldStageFrame = {
  id: string
  index: number
}

/** Bounded Presence values Theatre performs once attention has left Present. */
export const STAGE_YIELD_MOTION: PresentMotionValues = {
  atmosphereOpacity: 0.42,
  primaryOpacity: 0.3,
  secondaryOpacity: 0.24,
  contextOpacity: 0.22,
  captionOpacity: 0.22,
  mediaScale: 0.94,
  contentOffsetY: 16,
}

export function isStageAttentionState(value: unknown): value is StageAttentionState {
  return typeof value === "string" && (STAGE_ATTENTION_STATES as readonly string[]).includes(value)
}

/** Theatre pose for every attention state except Present. */
export function resolveStageAttentionPose(
  state: StageAttentionState,
): PresentMotionValues | null {
  return state === "present" ? null : STAGE_YIELD_MOTION
}

export function stageAttentionHoldsFrame(state: StageAttentionState): boolean {
  return state !== "present"
}

export function stageAttentionShowsWork(state: StageAttentionState): boolean {
  return state !== "present"
}

export function canReturnFromStageAttention(
  state: StageAttentionState,
  isWorking: boolean,
): boolean {
  return state !== "present" && state !== "perform" && !isWorking
}

export function nextStageAttention(input: {
  state: StageAttentionState
  onStage: boolean
  event: StageAttentionEvent
}): StageAttentionState {
  if (!input.onStage || input.event === "leave-stage") return "present"

  switch (input.event) {
    case "engage":
      return input.state === "present" ? "engage" : input.state
    case "yielded":
      return input.state === "engage" ? "yield" : input.state
    case "working":
      if (input.state === "present" || input.state === "engage" || input.state === "yield" || input.state === "resolve") {
        return "perform"
      }
      return input.state
    case "idle":
      return input.state === "perform" ? "resolve" : input.state
    case "return":
      return input.state === "perform" ? "perform" : "present"
    default:
      return input.state
  }
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

/** Keep the held Frame while attention is off Present. Do not follow a new last slide. */
export function nextStageFrameIndex(input: {
  attention: StageAttentionState
  held: HeldStageFrame | null
  slides: ReadonlyArray<{ id: string }>
  followStory: boolean
  last: number
  currentIndex: number
}): number {
  if (stageAttentionHoldsFrame(input.attention)) {
    return restoreHeldStageIndex(input.slides, input.held) ?? Math.min(input.currentIndex, input.last)
  }
  if (input.followStory && input.last > 0) return input.last
  return Math.min(input.currentIndex, input.last)
}
