// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  canReturnFromStageCompose,
  holdStageFrame,
  nextStageComposeForward,
  nextStageFrameIndex,
  resolveStageComposePose,
  restoreHeldStageIndex,
  STAGE_YIELD_MOTION,
} from "./stageComposeYield"

describe("nextStageComposeForward", () => {
  const idle = {
    currentlyForward: false,
    onStage: true,
    composerFocused: false,
    isWorking: false,
    returnRequested: false,
  }

  it("enters when Composer focuses on Stage", () => {
    expect(nextStageComposeForward({ ...idle, composerFocused: true })).toBe(true)
  })

  it("enters when a Turn is working on Stage", () => {
    expect(nextStageComposeForward({ ...idle, isWorking: true })).toBe(true)
  })

  it("does not enter off Stage", () => {
    expect(
      nextStageComposeForward({ ...idle, onStage: false, composerFocused: true }),
    ).toBe(false)
  })

  it("stays forward after blur", () => {
    expect(
      nextStageComposeForward({
        ...idle,
        currentlyForward: true,
        composerFocused: false,
        isWorking: false,
      }),
    ).toBe(true)
  })

  it("leaves only on intentional return", () => {
    expect(
      nextStageComposeForward({
        ...idle,
        currentlyForward: true,
        isWorking: true,
        returnRequested: true,
      }),
    ).toBe(false)
  })

  it("clears when the room is no longer Stage", () => {
    expect(
      nextStageComposeForward({
        ...idle,
        currentlyForward: true,
        onStage: false,
      }),
    ).toBe(false)
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
})

describe("resolveStageComposePose", () => {
  it("maps work-forward to the Theatre Presence yield pose", () => {
    expect(resolveStageComposePose(true)).toEqual(STAGE_YIELD_MOTION)
    expect(resolveStageComposePose(false)).toBeNull()
  })
})

describe("nextStageFrameIndex", () => {
  it("keeps the held Frame while yielded even when the story grows", () => {
    const held = holdStageFrame({ id: "root" }, 0)
    expect(
      nextStageFrameIndex({
        composeForward: true,
        held,
        slides: [{ id: "root" }, { id: "beat-2" }, { id: "beat-3" }],
        followStory: true,
        last: 2,
        currentIndex: 0,
      }),
    ).toBe(0)
  })
})

describe("canReturnFromStageCompose", () => {
  it("waits until the Turn is no longer working", () => {
    expect(canReturnFromStageCompose(true)).toBe(false)
    expect(canReturnFromStageCompose(false)).toBe(true)
  })
})
