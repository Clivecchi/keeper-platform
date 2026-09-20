// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  canReturnFromStageAttention,
  holdStageFrame,
  nextStageAttention,
  nextStageFrameIndex,
  resolveStageAttentionPose,
  restoreHeldStageIndex,
  STAGE_YIELD_MOTION,
  type StageAttentionState,
} from "./stageAttention"

function step(state: StageAttentionState, event: Parameters<typeof nextStageAttention>[0]["event"]) {
  return nextStageAttention({ state, onStage: true, event })
}

describe("Stage attention grammar", () => {
  it("walks Present → Engage → Yield → Perform → Resolve → Return", () => {
    const engage = step("present", "engage")
    const yieldState = step(engage, "yielded")
    const perform = step(yieldState, "working")
    const resolve = step(perform, "idle")
    const returned = step(resolve, "return")
    expect([engage, yieldState, perform, resolve, returned]).toEqual([
      "engage",
      "yield",
      "perform",
      "resolve",
      "present",
    ])
  })

  it("lets a Turn without focus enter Perform, then Resolve", () => {
    expect(step("present", "working")).toBe("perform")
    expect(step("perform", "idle")).toBe("resolve")
  })

  it("does not treat blur as Return", () => {
    expect(step("yield", "idle")).toBe("yield")
    expect(step("resolve", "idle")).toBe("resolve")
    expect(step("engage", "idle")).toBe("engage")
  })

  it("blocks Return during Perform", () => {
    expect(step("perform", "return")).toBe("perform")
    expect(canReturnFromStageAttention("perform", false)).toBe(false)
    expect(canReturnFromStageAttention("resolve", true)).toBe(false)
    expect(canReturnFromStageAttention("resolve", false)).toBe(true)
    expect(canReturnFromStageAttention("yield", false)).toBe(true)
  })

  it("clears to Present off Stage", () => {
    expect(nextStageAttention({ state: "resolve", onStage: false, event: "engage" })).toBe("present")
    expect(nextStageAttention({ state: "yield", onStage: true, event: "leave-stage" })).toBe("present")
  })

  it("does not re-enter Engage once attention has left Present", () => {
    expect(step("yield", "engage")).toBe("yield")
    expect(step("resolve", "engage")).toBe("resolve")
  })
})

describe("Theatre pose from attention", () => {
  it("writes the yield pose for every state except Present", () => {
    expect(resolveStageAttentionPose("present")).toBeNull()
    expect(resolveStageAttentionPose("engage")).toEqual(STAGE_YIELD_MOTION)
    expect(resolveStageAttentionPose("yield")).toEqual(STAGE_YIELD_MOTION)
    expect(resolveStageAttentionPose("perform")).toEqual(STAGE_YIELD_MOTION)
    expect(resolveStageAttentionPose("resolve")).toEqual(STAGE_YIELD_MOTION)
  })
})

describe("held Stage Frame", () => {
  it("restores the held slide id after the filmstrip changes", () => {
    const held = holdStageFrame({ id: "root" }, 0)
    expect(
      restoreHeldStageIndex(
        [
          { id: "root" },
          { id: "now" },
          { id: "laid-out" },
        ],
        held,
      ),
    ).toBe(0)
  })

  it("falls back to the held index when the id is gone", () => {
    expect(
      restoreHeldStageIndex([{ id: "a" }, { id: "b" }], { id: "missing", index: 1 }),
    ).toBe(1)
  })

  it("keeps the held Frame while attention is off Present", () => {
    const held = holdStageFrame({ id: "root" }, 0)
    expect(
      nextStageFrameIndex({
        attention: "perform",
        held,
        slides: [{ id: "root" }, { id: "beat-2" }, { id: "beat-3" }],
        followStory: true,
        last: 2,
        currentIndex: 0,
      }),
    ).toBe(0)
  })
})
